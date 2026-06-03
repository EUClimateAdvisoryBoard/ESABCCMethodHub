// ---------------------------------------------------------------------------
// Manual PDF upload for the content-analysis ingestion pipeline.
//
// POST /api/content-analysis/ingest-upload?celex=32021R1119
//   Body: multipart/form-data with a `file` field containing the PDF, or
//         raw `application/pdf` bytes.
//
// Runs the same pdfjs-dist extraction as the EUR-Lex fetch path so the
// resulting blocks are interchangeable. Caches under the shared
// `.cache/content-analysis/<celex>.{json,pdf}` paths — a subsequent
// `GET /api/content-analysis/ingest?celex=…` will return the upload.
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Block, BlockKind } from '@/lib/content-analysis/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const CACHE_DIR = path.join(process.cwd(), '.cache', 'content-analysis');
const MAX_BYTES = 40 * 1024 * 1024;
const MAX_PAGES = 600;

// Hosts we will fetch a `?url=` PDF from server-side. Mirrors the references
// PDF proxy allow-list so this can't be turned into an open SSRF gateway —
// reference PDFs live in the public Supabase `reference-pdfs` bucket.
const ALLOWED_PDF_HOSTS = ['supabase.co', 'supabase.in'];

function isAllowedPdfHost(url: string): boolean {
  try {
    const u = new URL(url);
    return ALLOWED_PDF_HOSTS.some(h => u.hostname === h || u.hostname.endsWith('.' + h));
  } catch {
    return false;
  }
}

export async function POST(req: NextRequest) {
  const celexRaw = req.nextUrl.searchParams.get('celex') ?? '';
  const celex = celexRaw.trim().toUpperCase() || `UPLOAD-${Date.now().toString(36)}`;
  if (celexRaw && !/^[0-9A-Z]{8,20}$/.test(celex)) {
    return NextResponse.json({ error: 'invalid celex format' }, { status: 400 });
  }

  // Optional server-side fetch: when a `url` is supplied (and there is no
  // uploaded body) the route pulls the PDF itself. This is how reference PDFs
  // already stored in the library are ingested — the bytes never round-trip
  // through the browser, sidestepping cross-origin fetch / truncation issues.
  const sourceUrl = req.nextUrl.searchParams.get('url');

  let pdfBytes: Uint8Array | null = null;
  const contentType = req.headers.get('content-type') ?? '';
  try {
    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData();
      const file = form.get('file');
      if (!file || typeof file === 'string') {
        return NextResponse.json({ error: 'missing file field' }, { status: 400 });
      }
      const buf = await (file as File).arrayBuffer();
      pdfBytes = new Uint8Array(buf);
    } else if (contentType.includes('application/pdf')) {
      const buf = await req.arrayBuffer();
      pdfBytes = new Uint8Array(buf);
    } else if (sourceUrl) {
      if (!isAllowedPdfHost(sourceUrl)) {
        return NextResponse.json(
          { error: 'PDF host not allowed', detail: (() => { try { return new URL(sourceUrl).hostname; } catch { return sourceUrl; } })() },
          { status: 400 },
        );
      }
      let upstream: Response;
      try {
        upstream = await fetch(sourceUrl, {
          cache: 'no-store',
          redirect: 'follow',
          headers: {
            'User-Agent': 'ESABCC-ContentAnalysis/1.0',
            Accept: 'application/pdf,*/*;q=0.8',
          },
        });
      } catch (err) {
        return NextResponse.json({ error: 'could not fetch source PDF', detail: String(err) }, { status: 502 });
      }
      if (!upstream.ok) {
        const body = await upstream.text().catch(() => '');
        return NextResponse.json(
          { error: `source PDF HTTP ${upstream.status}`, detail: body.slice(0, 200) },
          { status: 502 },
        );
      }
      pdfBytes = new Uint8Array(await upstream.arrayBuffer());
    } else {
      return NextResponse.json(
        { error: 'expected multipart/form-data (field "file"), application/pdf body, or a ?url= source' },
        { status: 400 },
      );
    }
  } catch (err) {
    return NextResponse.json({ error: 'read failed', detail: String(err) }, { status: 400 });
  }

  if (!pdfBytes || pdfBytes.byteLength < 100) {
    return NextResponse.json({ error: 'empty PDF' }, { status: 400 });
  }
  if (pdfBytes.byteLength > MAX_BYTES) {
    return NextResponse.json({ error: `PDF too large (${pdfBytes.byteLength} bytes)` }, { status: 413 });
  }
  // Validate magic bytes — we don't want to run pdfjs on arbitrary data.
  if (!(pdfBytes[0] === 0x25 && pdfBytes[1] === 0x50 && pdfBytes[2] === 0x44 && pdfBytes[3] === 0x46)) {
    return NextResponse.json({ error: 'not a PDF (missing %PDF- header)' }, { status: 400 });
  }

  let extracted;
  try {
    extracted = await extractBlocks(pdfBytes, celex);
  } catch (err) {
    return NextResponse.json({ error: 'pdf extraction failed', detail: String(err) }, { status: 500 });
  }

  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(path.join(CACHE_DIR, `${celex}.json`), JSON.stringify(extracted));
    await fs.writeFile(path.join(CACHE_DIR, `${celex}.pdf`), Buffer.from(pdfBytes));
  } catch {
    // cache-write failures are non-fatal
  }

  return NextResponse.json({ source: 'manual-upload', ...extracted });
}

// ── Extraction (kept in sync with the fetch ingest route) ────────────────
// Duplicated here on purpose to keep the two routes independent — the fetch
// route fails closed when EUR-Lex is unreachable, this route never touches
// the network at all.

interface RawItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  hasEOL: boolean;
}

interface IngestResult {
  celex: string;
  pdfUrl: string;
  pageCount: number;
  blocks: Block[];
  text: string;
  ingestedAt: string;
  pdfBytes: number;
}

async function extractBlocks(data: Uint8Array, celex: string): Promise<IngestResult> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjsLib.getDocument({
    data,
    disableFontFace: true,
    useSystemFonts: false,
    isEvalSupported: false,
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
      const x = transform[4];
      const y = pageHeight - transform[5];
      const width = typeof raw.width === 'number' ? raw.width : 0;
      const height = typeof raw.height === 'number' ? raw.height : fontSize;
      items.push({ str, x, y, width, height, fontSize, hasEOL: raw.hasEOL === true });
    }

    items.sort((a, b) => {
      const dy = a.y - b.y;
      if (Math.abs(dy) > 1.5) return dy;
      return a.x - b.x;
    });

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

    interface WorkingBlock { lines: Line[]; }
    const workingBlocks: WorkingBlock[] = [];
    let cur: WorkingBlock | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prev = lines[i - 1];
      const gap = prev ? line.y - prev.bottom : 0;
      const breakByGap = prev && gap > Math.max(prev.fontSize, line.fontSize) * 1.15;
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
      const bboxes = wb.lines.map(l => {
        const minX = Math.min(...l.items.map(i => i.x));
        const maxX = Math.max(...l.items.map(i => i.x + i.width));
        const topY = l.y - l.fontSize;
        return [minX, topY, maxX - minX, l.fontSize + 2];
      });
      const kind = inferKind(text, wb.lines[0].fontSize);
      const blockText = lineTexts.join('\n').trim();
      blocks.push({ id: `block-${celex}-${order}`, page: p, order: order++, bboxes, kind, text: blockText });
      fullText.push(blockText);
    }
  }

  return {
    celex,
    pdfUrl: '',
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
  if (fontSize >= 12 && text.length < 80 && text === text.toUpperCase() && /[A-Z]/.test(text)) return 'heading';
  if (text.length < 90 && /^\d+\s*\/\s*\d+\s*$/.test(text.trim())) return 'footer';
  if (/^Page\s+\d+/i.test(text) || /^OJ\b/.test(text)) return 'footer';
  return 'paragraph';
}
