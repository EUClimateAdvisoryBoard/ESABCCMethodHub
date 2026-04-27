#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Prefetch EUR-Lex bodies for every policy missing a shipped `full_text`.
//
// Reads `src/data/policies.ts` (regex-based, no runtime), tries the
// EUR-Lex HTML then PDF endpoints for each CELEX, strips tags, and
// writes the result to `src/data/policy-bodies.generated.ts`.
//
// Idempotent: run as often as needed. Already-fetched policies are
// skipped unless `--force` is passed. Rate-limited to 1.2s per request
// to stay polite with EUR-Lex.
//
// Usage:
//   node scripts/prefetch-eurlex-bodies.mjs            # fill missing
//   node scripts/prefetch-eurlex-bodies.mjs --force    # refetch all
//   node scripts/prefetch-eurlex-bodies.mjs --only=ID  # one policy
// ---------------------------------------------------------------------------

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const POLICIES_FILE = path.join(ROOT, 'src/data/policies.ts');
// Static JSON under public/ so the ~15 MB corpus is fetched lazily as a
// cacheable asset rather than bundled into the client JS.
const OUTPUT_FILE = path.join(ROOT, 'public/content-analysis/policy-bodies.json');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36';
const HEADERS = {
  'User-Agent': UA,
  Accept: 'text/html,application/pdf,*/*;q=0.8',
  'Accept-Language': 'en-GB,en-US;q=0.9,en;q=0.8',
  Referer: 'https://eur-lex.europa.eu/',
};
const REQUEST_GAP_MS = 1200;
const MIN_BODY_CHARS = 400;

// Attempt trail for the most recent fetchOne call — read by main() to
// write the diagnostic log so workflow users can see what EUR-Lex is
// actually returning for each policy.
let globalAttempts = [];

const args = new Set(process.argv.slice(2));
const force = args.has('--force');
const onlyArg = [...args].find(a => a.startsWith('--only='));
const onlyId = onlyArg ? onlyArg.slice('--only='.length) : null;

async function main() {
  const policies = await parsePolicies(POLICIES_FILE);
  const existing = await loadExisting(OUTPUT_FILE);

  // Candidates: policies without full_text (or with a stub) — plus any
  // policy explicitly requested via --only.
  const pending = policies.filter(p => {
    if (onlyId) return p.id === onlyId;
    if (!p.celexNumber) return false;
    if (p.hasFullText) return false;
    if (!force && existing[p.id]) return false;
    return true;
  });

  console.log(`policies total:          ${policies.length}`);
  console.log(`with shipped full_text:  ${policies.filter(p => p.hasFullText).length}`);
  console.log(`already in generated:    ${Object.keys(existing).length}`);
  console.log(`to fetch now:            ${pending.length}`);
  if (pending.length === 0) {
    console.log('Nothing to do.');
    return;
  }

  const next = { ...existing };
  let ok = 0;
  let failed = 0;
  const failureLog = [];

  for (let i = 0; i < pending.length; i++) {
    const p = pending[i];
    process.stdout.write(`[${i + 1}/${pending.length}] ${p.id} ${p.celexNumber} … `);
    try {
      const result = await fetchOne(p.celexNumber);
      if (result) {
        next[p.id] = {
          text: result.text,
          fetchedAt: new Date().toISOString(),
          sourceUrl: result.sourceUrl,
          source: result.source,
        };
        ok++;
        console.log(`✓ ${result.text.length} chars (${result.source})`);
      } else {
        failed++;
        console.log('× no body recovered');
        failureLog.push({ id: p.id, celex: p.celexNumber, attempts: globalAttempts });
      }
    } catch (err) {
      failed++;
      console.log(`× ${err?.message ?? err}`);
      failureLog.push({ id: p.id, celex: p.celexNumber, error: String(err?.message ?? err) });
    }
    if (i < pending.length - 1) await sleep(REQUEST_GAP_MS);
  }

  await writeOutput(OUTPUT_FILE, next);
  // Diagnostic log for the workflow — written even on 100% failure so we
  // can see what EUR-Lex is actually returning from the runner.
  const logPath = path.join(ROOT, '.prefetch-diagnostics.log');
  await fs.writeFile(
    logPath,
    [
      `Prefetch run @ ${new Date().toISOString()}`,
      `Pending: ${pending.length} · ok: ${ok} · failed: ${failed}`,
      '',
      ...failureLog.map(e => e.error
        ? `× ${e.id} [${e.celex}] — error: ${e.error}`
        : `× ${e.id} [${e.celex}] — ${(e.attempts ?? []).join(' | ')}`),
    ].join('\n'),
  );
  console.log(`\n→ wrote ${Object.keys(next).length} entries to ${path.relative(ROOT, OUTPUT_FILE)}`);
  console.log(`   ok: ${ok}, failed: ${failed}`);
  console.log(`   diagnostics: ${path.relative(ROOT, logPath)}`);
}

// ── Policy parser (regex-based, avoids importing the TS module) ──────────
async function parsePolicies(file) {
  const src = await fs.readFile(file, 'utf-8');
  // Locate every id: '…' then read a window ahead to find the
  // matching celex_number and look for full_text within that window.
  // Window ends at the next `id: '…'` or the closing `];`.
  const idRe = /^\s*id:\s*'([^']+)',\s*$/gm;
  const ids = [];
  let m;
  while ((m = idRe.exec(src)) != null) ids.push({ id: m[1], start: m.index });
  const items = [];
  for (let i = 0; i < ids.length; i++) {
    const entryStart = ids[i].start;
    const entryEnd = i + 1 < ids.length ? ids[i + 1].start : src.length;
    const entry = src.slice(entryStart, entryEnd);
    const celexMatch = entry.match(/celex_number:\s*(?:'([^']+)'|null)/);
    const celexNumber = celexMatch ? (celexMatch[1] ?? null) : null;
    const hasFullText = /full_text:\s*`/.test(entry);
    items.push({ id: ids[i].id, celexNumber, hasFullText });
  }
  return items;
}

// ── Existing generated loader ────────────────────────────────────────────
// Reads the previous JSON so re-runs are idempotent. Silently returns
// an empty map when the file is absent or unreadable.
async function loadExisting(file) {
  try {
    const raw = await fs.readFile(file, 'utf-8');
    return JSON.parse(raw) ?? {};
  } catch {
    return {};
  }
}

// ── EUR-Lex fetcher (HTML preferred, PDF fallback) ───────────────────────
async function fetchOne(celex) {
  const attempts = [];
  globalAttempts = attempts;
  const htmlCandidates = [
    `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}&from=EN`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:${celex}&qid=1`,
  ];
  for (const url of htmlCandidates) {
    const res = await tryHtml(url);
    attempts.push(res.tag);
    if (res.ok) return { text: res.text, sourceUrl: url, source: 'eurlex-html', attempts };
  }
  // PDF fallback — only fire if every HTML candidate gave up.
  const pdfCandidates = [
    `https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:${celex}`,
    `https://eur-lex.europa.eu/legal-content/EN/TXT/PDF/?uri=CELEX:${celex}&from=EN`,
  ];
  for (const url of pdfCandidates) {
    const res = await tryPdf(url);
    attempts.push(res.tag);
    if (res.ok) return { text: res.text, sourceUrl: url, source: 'eurlex-pdf', attempts };
  }
  console.log(`      attempts: ${attempts.join(' | ')}`);
  return null;
}

async function tryHtml(url) {
  try {
    const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
    const ct = resp.headers.get('content-type') ?? '';
    if (!resp.ok) return { ok: false, tag: `html ${resp.status}` };
    if (!ct.includes('html')) return { ok: false, tag: `html non-html(${ct.split(';')[0]})` };
    const html = await resp.text();
    if (html.length < 2000) return { ok: false, tag: `html too-short(${html.length})` };
    const text = htmlToText(html);
    if (text.length < MIN_BODY_CHARS) {
      return { ok: false, tag: `html stripped-too-short(${text.length})` };
    }
    return { ok: true, tag: `html ok(${text.length})`, text };
  } catch (err) {
    return { ok: false, tag: `html err(${err?.message?.slice(0, 60) ?? err})` };
  }
}

async function tryPdf(url) {
  try {
    const resp = await fetch(url, { headers: HEADERS, redirect: 'follow' });
    const ct = resp.headers.get('content-type') ?? '';
    if (!resp.ok) return { ok: false, tag: `pdf ${resp.status}` };
    const buf = new Uint8Array(await resp.arrayBuffer());
    // PDFs start with %PDF-
    const isPdf = buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d;
    if (!isPdf && !ct.includes('pdf')) return { ok: false, tag: `pdf non-pdf(${ct.split(';')[0]})` };
    // Dynamic-import pdfjs only when actually needed — keeps Node cold-start
    // snappy for the common HTML-success case.
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: buf,
      disableFontFace: true,
      useSystemFonts: false,
      isEvalSupported: false,
      ...({ disableWorker: true }),
    });
    const pdf = await loadingTask.promise;
    const pages = [];
    for (let p = 1; p <= Math.min(pdf.numPages, 400); p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      const text = content.items.map(it => ('str' in it ? it.str : '')).join(' ');
      if (text.trim()) pages.push(text.replace(/\s+/g, ' ').trim());
    }
    const text = pages.join('\n\n');
    if (text.length < MIN_BODY_CHARS) return { ok: false, tag: `pdf too-short(${text.length})` };
    return { ok: true, tag: `pdf ok(${text.length}, ${pdf.numPages}p)`, text };
  } catch (err) {
    return { ok: false, tag: `pdf err(${err?.message?.slice(0, 60) ?? err})` };
  }
}

function htmlToText(html) {
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, ' ')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, ' ')
    .replace(/<head\b[^<]*(?:(?!<\/head>)<[^<]*)*<\/head>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
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

// ── Writer ────────────────────────────────────────────────────────────────
// Writes a sorted JSON asset under public/ — served lazily to the
// browser and kept out of the client bundle.
async function writeOutput(file, entries) {
  const keys = Object.keys(entries).sort();
  const sorted = {};
  for (const k of keys) sorted[k] = entries[k];
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(sorted));
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
