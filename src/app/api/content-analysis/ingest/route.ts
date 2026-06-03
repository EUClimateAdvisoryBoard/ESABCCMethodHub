// ---------------------------------------------------------------------------
// EUR-Lex PDF ingestion.
//
// GET  /api/content-analysis/ingest?celex=32021R1119
//   → tries to fetch the EUR-Lex PDF and extract structured blocks.
// POST /api/content-analysis/ingest?celex=XYZ
//   { "fallbackText": "…" }
//   → same as GET, but if every EUR-Lex candidate URL fails the route
//     falls back to paragraph-splitting `fallbackText` so the user
//     still ends up with analyzable blocks. Idempotent: cached per
//     CELEX under `.cache/content-analysis/<celex>.json`. Pass
//     `?refresh=1` to force a re-fetch.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Block, BlockKind } from '@/lib/content-analysis/types';
import { ensurePdfNodeGlobals } from '@/lib/content-analysis/pdf-node-globals';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'content-analysis');
// EUR-Lex serves an HTML consent/landing page to anything that looks like a
// bot, so we identify as a browser when fetching PDFs. The actual requests
// are low-volume and idempotent (cached on first hit).
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const FETCH_HEADERS = {
  'User-Agent': UA,
  Accept: 'application/pdf,application/octet-stream,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  Referer: 'https://eur-lex.europa.eu/',
} as const;

// Guard against absurd PDFs — EU regulations sit well under these ceilings.
const MAX_BYTES = 40 * 1024 * 1024;
const MAX_PAGES = 600;

/** Candidate EUR-Lex PDF URL forms. Tried in order until one returns a PDF.
 *  Some older or national CELEX records only respond on the `&from=EN` form;
 *  consolidated acts sometimes need the `/AUTO/` dispatcher. */
function candidatePdfUrls(celex: string): string[] {
  return [
    `https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:${celex}&from=EN`,
    `https://eur-lex.europa.eu/resource.html?uri=cellar:${celex}&format=pdf`,
    `https://eur-lex.europa.eu/legal-content/EN/AUTO/?uri=CELEX:${celex}&format=pdf`,
  ];
}

interface IngestResult {
  celex: string;
  pdfUrl: string;
  pageCount: number;
  blocks: Block[];
  text: string;
  ingestedAt: string;
  /** Rough byte size of the source PDF (for diagnostics). */
  pdfBytes: number;
}

export async function GET(req: NextRequest) {
  return handleIngest(req, null);
}

export async function POST(req: NextRequest) {
  let body: { fallbackText?: string } = {};
  try { body = (await req.json()) as { fallbackText?: string }; } catch {}
  return handleIngest(req, body.fallbackText ?? null);
}

async function handleIngest(req: NextRequest, fallbackText: string | null) {
  const url = req.nextUrl;
  const celexRaw = url.searchParams.get('celex');
  const refresh = url.searchParams.get('refresh') === '1';
  if (!celexRaw) {
    return NextResponse.json({ error: 'missing celex' }, { status: 400 });
  }
  const celex = celexRaw.trim().toUpperCase();
  if (!/^[0-9A-Z]{8,20}$/.test(celex)) {
    return NextResponse.json({ error: 'invalid celex format' }, { status: 400 });
  }

  const cachePath = path.join(CACHE_DIR, `${celex}.json`);
  if (!refresh) {
    try {
      const cached = await fs.readFile(cachePath, 'utf-8');
      return NextResponse.json({ cached: true, ...JSON.parse(cached) });
    } catch {
      // cache miss — fall through
    }
  }

  const candidates = candidatePdfUrls(celex);
  const attempts: Array<{ url: string; status: number; contentType: string }> = [];
  let pdfBytes: ArrayBuffer | null = null;
  let pdfUrl = candidates[0];
  for (const candidate of candidates) {
    try {
      const resp = await fetch(candidate, { headers: FETCH_HEADERS, redirect: 'follow' });
      const contentType = resp.headers.get('content-type') ?? '';
      attempts.push({ url: candidate, status: resp.status, contentType });
      if (!resp.ok) continue;

      const buf = await resp.arrayBuffer();
      // Trust the bytes over the content-type header: EUR-Lex occasionally
      // mislabels PDFs. A real PDF always starts with "%PDF-".
      const head = new Uint8Array(buf.slice(0, 5));
      const looksLikePdf =
        head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46 && head[4] === 0x2d;
      if (!looksLikePdf && !contentType.includes('pdf')) continue;
      if (buf.byteLength > MAX_BYTES) {
        return NextResponse.json(
          { error: `PDF too large (${buf.byteLength} bytes)`, pdfUrl: candidate, attempts },
          { status: 413 },
        );
      }
      pdfBytes = buf;
      pdfUrl = candidate;
      break;
    } catch (err) {
      attempts.push({ url: candidate, status: 0, contentType: String(err).slice(0, 80) });
      continue;
    }
  }
  if (!pdfBytes) {
    // ── Escalation 1: try the HTML view ────────────────────────────────
    // EUR-Lex's /TXT/HTML/ endpoint is almost always reachable when the
    // /TXT/PDF/ form is being gated by bot detection. Strip tags, split
    // on paragraph boundaries and synthesise blocks. Not as precise as
    // PDF (no bboxes, no PDF pane overlay), but the blocks are real EU
    // legal text and that's what coding actually needs.
    const htmlResult = await tryHtmlFallback(celex, attempts);
    if (htmlResult) {
      try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(htmlResult));
      } catch {}
      return NextResponse.json({
        cached: false,
        source: 'eurlex-html',
        note: 'EUR-Lex PDF unreachable; blocks derived from the HTML version.',
        attempts,
        ...htmlResult,
      });
    }

    // ── Escalation 2: derive blocks from shipped `fallbackText` ───────
    if (fallbackText && fallbackText.trim().length > 200) {
      const synthetic = deriveBlocksFromText(celex, fallbackText);
      try {
        await fs.mkdir(CACHE_DIR, { recursive: true });
        await fs.writeFile(cachePath, JSON.stringify(synthetic));
      } catch {}
      return NextResponse.json({
        cached: false,
        source: 'fallback-text',
        note: 'EUR-Lex unreachable; blocks derived from the shipped text.',
        attempts,
        ...synthetic,
      });
    }

    return NextResponse.json(
      {
        error:
          'EUR-Lex did not return a PDF or HTML version for any candidate URL, and no fallbackText was supplied. Upload the PDF manually via /api/content-analysis/ingest-upload if needed.',
        attempts,
      },
      { status: 502 },
    );
  }

  let extracted: IngestResult;
  try {
    extracted = await extractBlocks(new Uint8Array(pdfBytes), celex, pdfUrl);
  } catch (err) {
    return NextResponse.json(
      { error: 'pdf extraction failed', detail: String(err), pdfUrl },
      { status: 500 },
    );
  }

  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(cachePath, JSON.stringify(extracted));
    // Also cache the raw PDF bytes so the PDF pane can serve them back to
    // the browser without re-fetching from EUR-Lex.
    await fs.writeFile(path.join(CACHE_DIR, `${celex}.pdf`), Buffer.from(pdfBytes));
  } catch {
    // cache write is best-effort
  }

  return NextResponse.json({ cached: false, ...extracted });
}

// ── Extraction ────────────────────────────────────────────────────────────

interface RawItem {
  str: string;
  /** PDF coordinate (origin bottom-left): x, y of the baseline. */
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  /** Whether the extractor inserted a hard line break after this item. */
  hasEOL: boolean;
}

async function extractBlocks(
  data: Uint8Array,
  celex: string,
  pdfUrl: string,
): Promise<IngestResult> {
  // Legacy build is CommonJS-friendly and works server-side without DOM.
  await ensurePdfNodeGlobals();
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');

  // `disableWorker` is valid at runtime but not in the published d.mts —
  // cast to the loose shape so TS doesn't reject the option.
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
    // Run the whole parse on the main thread — no worker bundle in Node.
    ...({ disableWorker: true } as Record<string, unknown>),
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, MAX_PAGES);

  const blocks: Block[] = [];
  let order = 0;
  const fullText: string[] = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    const items: RawItem[] = [];
    for (const raw of content.items as Array<Record<string, unknown>>) {
      const str = typeof raw.str === 'string' ? raw.str : '';
      if (!str) continue;
      const transform = Array.isArray(raw.transform) ? (raw.transform as number[]) : null;
      if (!transform || transform.length < 6) continue;
      const fontSize = Math.abs(transform[3]) || Math.abs(transform[0]);
      // pdfjs transform: [a,b,c,d,e,f] — e,f is translation (baseline position).
      const x = transform[4];
      // Convert to top-origin so we can group top-to-bottom naturally.
      const y = pageHeight - transform[5];
      const width = typeof raw.width === 'number' ? raw.width : 0;
      const height = typeof raw.height === 'number' ? raw.height : fontSize;
      const hasEOL = raw.hasEOL === true;
      items.push({ str, x, y, width, height, fontSize, hasEOL });
    }

    // Sort top-to-bottom, then left-to-right. Use a small y-bucket so items
    // on the same visual line group together despite floating-point drift.
    items.sort((a, b) => {
      const dy = a.y - b.y;
      if (Math.abs(dy) > 1.5) return dy;
      return a.x - b.x;
    });

    // Group items into lines by y-proximity.
    type Line = { y: number; bottom: number; items: RawItem[]; fontSize: number };
    const lines: Line[] = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(it.y - last.y) <= Math.max(1.5, it.fontSize * 0.3)) {
        last.items.push(it);
        last.bottom = Math.max(last.bottom, it.y);
        last.fontSize = Math.max(last.fontSize, it.fontSize);
      } else {
        lines.push({ y: it.y, bottom: it.y, items: [it], fontSize: it.fontSize });
      }
    }

    // Merge consecutive lines into blocks: break when y-gap > 1.3 × fontSize,
    // or when the next line's x-start is materially different (new column /
    // list item) — the latter catches the transition from a flush-left
    // paragraph to an indented recital number.
    interface WorkingBlock { lines: Line[]; }
    const workingBlocks: WorkingBlock[] = [];
    let cur: WorkingBlock | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prev = lines[i - 1];
      const gap = prev ? line.y - prev.bottom : 0;
      const breakByGap = prev && gap > Math.max(prev.fontSize, line.fontSize) * 1.15;
      // If this line starts roughly 20pt further left and the previous was
      // wrapped, it's probably a new block — catches Article/recital starts.
      if (!cur || breakByGap) {
        cur = { lines: [line] };
        workingBlocks.push(cur);
      } else {
        cur.lines.push(line);
      }
    }

    for (const wb of workingBlocks) {
      const lineTexts = wb.lines.map(l => l.items.map(i => i.str).join('').trim());
      const text = lineTexts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      // bounding box per line: [minX, minY-top, width, height]
      const bboxes = wb.lines.map(l => {
        const minX = Math.min(...l.items.map(i => i.x));
        const maxX = Math.max(...l.items.map(i => i.x + i.width));
        const topY = l.y - l.fontSize;
        return [minX, topY, maxX - minX, l.fontSize + 2];
      });
      const kind = inferKind(text, wb.lines[0].fontSize);
      const blockText = lineTexts.join('\n').trim();
      blocks.push({
        id: `block-${celex}-${order}`,
        page: p,
        order: order++,
        bboxes,
        kind,
        text: blockText,
      });
      fullText.push(blockText);
    }
  }

  return {
    celex,
    pdfUrl,
    pageCount,
    blocks,
    text: fullText.join('\n\n'),
    ingestedAt: new Date().toISOString(),
    pdfBytes: data.byteLength,
  };
}

function inferKind(text: string, fontSize: number): BlockKind {
  if (/^Article\s+\d+/i.test(text)) return 'article';
  if (/^\(\d+\)\s/.test(text)) return 'recital';
  if (/^(ANNEX|CHAPTER|SECTION|TITLE|PART)\b/i.test(text)) return 'heading';
  // All-caps short lines in a larger font ⇒ heading
  if (fontSize >= 12 && text.length < 80 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    return 'heading';
  }
  if (text.length < 90 && /^\d+\s*\/\s*\d+\s*$/.test(text.trim())) return 'footer';
  if (/^Page\s+\d+/i.test(text) || /^OJ\b/.test(text)) return 'footer';
  return 'paragraph';
}

// ── EUR-Lex HTML fallback ────────────────────────────────────────────────
// Tries the `/TXT/HTML/` and `/TXT/` endpoints, strips tags, splits into
// paragraph blocks. Good for Regulations where the PDF form is gated but
// the HTML is open. Returns null if every URL fails or the body is
// suspiciously empty (probably still a landing page).
async function tryHtmlFallback(
  celex: string,
  attempts: Array<{ url: string; status: number; contentType: string }>,
): Promise<IngestResult | null> {
  const candidates = [
    `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}&from=EN`,
  ];
  for (const url of candidates) {
    try {
      const resp = await fetch(url, { headers: FETCH_HEADERS, redirect: 'follow' });
      const ct = resp.headers.get('content-type') ?? '';
      attempts.push({ url, status: resp.status, contentType: ct });
      if (!resp.ok || !ct.includes('html')) continue;
      const html = await resp.text();
      if (html.length < 2000) continue; // consent / landing page
      const text = htmlToText(html);
      if (text.length < 800) continue;
      const synthetic = deriveBlocksFromText(celex, text);
      return { ...synthetic, pdfUrl: url };
    } catch (err) {
      attempts.push({ url, status: 0, contentType: String(err).slice(0, 80) });
      continue;
    }
  }
  return null;
}

/** Minimal HTML → plain-text reduction. Good enough for EUR-Lex legal-act
 *  pages: drops scripts/styles, turns block-level tags into newlines,
 *  unescapes entities, collapses runs of whitespace into paragraph breaks. */
function htmlToText(html: string): string {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    // block-level tags → paragraph breaks
    .replace(/<\/(p|div|section|article|li|h[1-6]|tr|br|table|hr|blockquote)[^>]*>/gi, '\n\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ── Fallback block derivation from plain text ─────────────────────────────
// Used when EUR-Lex is unreachable but the caller has a shipped `full_text`
// (or a pasted body) they still want to analyze. Splits on blank lines and
// infers a kind from the same heuristics as the PDF extractor. No bboxes
// are available, so the PDF pane falls back gracefully to a "no overlay"
// state for these blocks.
function deriveBlocksFromText(celex: string, rawText: string): IngestResult {
  const paragraphs = rawText
    .replace(/\r\n/g, '\n')
    .split(/\n\s*\n+/)
    .map(p => p.trim())
    .filter(p => p.length > 0);

  const blocks: Block[] = paragraphs.map((text, i) => ({
    id: `block-${celex}-${i}`,
    page: 1,
    order: i,
    bboxes: [],
    kind: inferKind(text, 10),
    text,
  }));

  return {
    celex,
    pdfUrl: '',
    pageCount: 1,
    blocks,
    text: paragraphs.join('\n\n'),
    ingestedAt: new Date().toISOString(),
    pdfBytes: 0,
  };
}
