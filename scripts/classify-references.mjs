#!/usr/bin/env node
/**
 * Reference classification batch generator.
 * -----------------------------------------
 * Walks the *entire* reference manager corpus — the bundled static library
 * (`src/data/references.ts`, ~2,600 entries) plus the custom / live stack
 * (`public/data/custom-references.json`, synced from the Word VBA add-in and
 * the web ingestion flows) — and classifies every reference into the two
 * literature tiers used by the Content Analysis source filter:
 *
 *   - `scientific` — peer-reviewed literature (journal / conference articles,
 *                    books, book chapters).
 *   - `grey`       — institutional reports, web pages, legislation, theses,
 *                    datasets and anything not peer-reviewed.
 *
 * The classification rule MIRRORS the single source of truth in
 * `src/lib/content-analysis/useLiveReferences.ts` (`normaliseRefType` +
 * `isScientificLiterature`) and `src/lib/content-analysis/source-tier.ts`
 * (`sourceTierOf`). Keep the two in sync — this script exists so the batch can
 * be regenerated deterministically and reviewed, not as a second rule.
 *
 * Outputs (both committed to the repo):
 *   - public/data/reference-classification-batch.json  (machine-readable batch)
 *   - docs/reference/classification-batch.md            (human-readable report)
 *
 * Run with:  node scripts/classify-references.mjs
 *
 * Note: this is a pure, offline pass over data already in the repo — it makes
 * no network calls, so it runs anywhere (including air-gapped / restricted
 * network environments).
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── Classification rule (mirror of the TS single source of truth) ──────────

/** CSL / legacy type → closed reference-type union. Mirror of
 *  `normaliseRefType` in src/lib/content-analysis/useLiveReferences.ts. */
function normaliseRefType(t) {
  switch (t) {
    case 'article':
    case 'report':
    case 'web':
    case 'chapter':
    case 'legislation':
    case 'book':
      return t;
    case 'article-journal':
    case 'paper-conference':
      return 'article';
    case 'entry-encyclopedia':
      return 'chapter';
    case 'webpage':
    case 'article-newspaper':
    case 'article-magazine':
      return 'web';
    case 'thesis':
    case 'dataset':
    case 'manuscript':
      return 'report';
    default:
      return 'report';
  }
}

const SCIENTIFIC_TYPES = new Set(['article', 'book', 'chapter']);

/** Closed-union type → source tier. Mirror of `isScientificLiterature` +
 *  `sourceTierOf` (references always have sourceKind === 'reference'). */
function tierOf(closedType) {
  return SCIENTIFIC_TYPES.has(closedType) ? 'scientific' : 'grey';
}

/** PDF availability buckets used to seed the "upload the PDF" workflow:
 *   - 'pdf'  : an explicit PDF URL is attached (ready to load directly).
 *   - 'link' : a DOI / landing-page URL is present — the in-app fetch-pdf
 *              proxy can try to resolve a PDF from it.
 *   - 'none' : no link at all; the PDF must be sourced manually. */
function pdfStatus({ pdfUrl, url, doi }) {
  if (pdfUrl && pdfUrl.trim()) return 'pdf';
  if ((url && url.trim()) || (doi && doi.trim())) return 'link';
  return 'none';
}

// ── Parse the bundled static library (src/data/references.ts) ──────────────

function parseStaticReferences() {
  const text = readFileSync(join(ROOT, 'src/data/references.ts'), 'utf8');
  // Each record is a `{ … }` block beginning with `id: '…'`. Values never
  // contain `}` so a non-greedy block match is safe on this generated file.
  // The trailing comma is optional so the final array element (which has no
  // comma before `];`) is captured too.
  const blockRe = /\{\s*id:\s*'([^']+)'[\s\S]*?\n\s{2}\},?/g;
  const field = (block, name) => {
    const m = block.match(new RegExp(`\\b${name}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
    return m ? m[1] : '';
  };
  const out = [];
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const block = m[0];
    out.push({
      id: m[1],
      source: 'static',
      rawType: field(block, 'type'),
      title: field(block, 'title'),
      doi: field(block, 'doi'),
      url: field(block, 'url'),
      pdfUrl: '',
    });
  }
  return out;
}

// ── Parse the custom / live stack (public/data/custom-references.json) ─────

function parseCustomReferences() {
  const raw = JSON.parse(
    readFileSync(join(ROOT, 'public/data/custom-references.json'), 'utf8'),
  );
  return raw.map((r) => ({
    id: r.id,
    source: r.source === 'vba' ? 'vba' : r.source ? 'web' : 'custom',
    rawType: r.type || '',
    title: r.title || '',
    doi: r.doi || '',
    url: r.url || '',
    pdfUrl: r.pdfUrl || '',
  }));
}

// ── Classify + aggregate ───────────────────────────────────────────────────

function classify(records) {
  return records.map((r) => {
    const normalisedType = normaliseRefType(r.rawType);
    return {
      id: r.id,
      source: r.source,
      rawType: r.rawType || '(none)',
      normalisedType,
      tier: tierOf(normalisedType),
      pdf: pdfStatus(r),
      title: r.title.length > 100 ? r.title.slice(0, 99) + '…' : r.title,
    };
  });
}

function tally(entries) {
  const inc = (obj, key) => (obj[key] = (obj[key] || 0) + 1);
  const byTier = {};
  const byRawType = {};
  const byNormalisedType = {};
  const pdf = {};
  const bySource = {};
  for (const e of entries) {
    inc(byTier, e.tier);
    inc(byRawType, e.rawType);
    inc(byNormalisedType, e.normalisedType);
    inc(pdf, e.pdf);
    bySource[e.source] = bySource[e.source] || { scientific: 0, grey: 0 };
    inc(bySource[e.source], e.tier);
  }
  return { byTier, byRawType, byNormalisedType, pdf, bySource };
}

// ── Main ───────────────────────────────────────────────────────────────────

const records = [...parseStaticReferences(), ...parseCustomReferences()];
const entries = classify(records);
const stats = tally(entries);

const summary = {
  total: entries.length,
  byTier: stats.byTier,
  byRawType: stats.byRawType,
  byNormalisedType: stats.byNormalisedType,
  pdf: stats.pdf,
  bySource: stats.bySource,
};

const batch = {
  generatedAt: new Date().toISOString(),
  description:
    'Classification of every reference in the ESABCC reference manager into ' +
    'scientific (peer-reviewed) vs grey literature, plus PDF availability. ' +
    'Drives the Content Analysis source filter. Regenerate with ' +
    'node scripts/classify-references.mjs.',
  rule: {
    scientific: 'normalised type ∈ { article, book, chapter }',
    grey: 'everything else (report, web, legislation, thesis, dataset, …)',
    source: 'src/lib/content-analysis/source-tier.ts + useLiveReferences.ts',
  },
  summary,
  references: entries,
};

const jsonPath = join(ROOT, 'public/data/reference-classification-batch.json');
writeFileSync(jsonPath, JSON.stringify(batch, null, 2) + '\n');

// ── Human-readable markdown report ─────────────────────────────────────────

const pct = (n) => ((n / summary.total) * 100).toFixed(1) + '%';
const row = (k, v) => `| ${k} | ${v} | ${pct(v)} |`;

const md = `# Reference classification batch

> Auto-generated by \`scripts/classify-references.mjs\` — do not edit by hand.
> Regenerate after the bibliography export changes.

This batch classifies **every reference in the reference manager** into the two
literature tiers used by the **Content Analysis** source filter, and records
whether a PDF (or a link a PDF can be pulled from) is available for each.

- **Scientific** — peer-reviewed literature: journal & conference articles,
  books, book chapters.
- **Grey** — institutional reports, web pages, legislation, theses, datasets
  and anything not peer-reviewed.

The split is the single source of truth shared by both Content Analysis
surfaces (the standalone \`/content-analysis\` route and the in-workspace
module) via \`sourceTierOf\` → \`isScientificLiterature\`.

## Corpus

- **Total references:** ${summary.total}
- **Static bundled library** (\`src/data/references.ts\`): ${entries.filter((e) => e.source === 'static').length}
- **Custom / live stack** (\`public/data/custom-references.json\`, VBA + web): ${entries.filter((e) => e.source !== 'static').length}

## By tier

| Tier | Count | Share |
| --- | --- | --- |
${row('Scientific (peer-reviewed)', summary.byTier.scientific || 0)}
${row('Grey literature', summary.byTier.grey || 0)}

## By source type (as stored)

| Reference type | Count | Share |
| --- | --- | --- |
${Object.entries(summary.byRawType)
  .sort((a, b) => b[1] - a[1])
  .map(([k, v]) => row(k, v))
  .join('\n')}

## PDF availability

When you click into a tier in Content Analysis you can upload the source PDF to
code it line by line. This is where each reference stands:

| PDF status | Count | Share |
| --- | --- | --- |
${row('Explicit PDF attached', summary.pdf.pdf || 0)}
${row('Link present (DOI / landing page → fetch-pdf proxy can try)', summary.pdf.link || 0)}
${row('No link — needs manual sourcing', summary.pdf.none || 0)}

> The app's \`/api/references/fetch-pdf\` proxy + the Content Analysis upload
> flow resolve and store PDFs at runtime (from a DOI / landing page) when the
> hosting environment has outbound network access. References in the **Link
> present** bucket are the ones that flow can target automatically.

## Tier by source

| Source | Scientific | Grey |
| --- | --- | --- |
${Object.entries(summary.bySource)
  .map(([k, v]) => `| ${k} | ${v.scientific || 0} | ${v.grey || 0} |`)
  .join('\n')}

The full per-reference batch (one row per reference, with id, type, tier and
PDF status) is at \`public/data/reference-classification-batch.json\`.
`;

const mdPath = join(ROOT, 'docs/reference/classification-batch.md');
mkdirSync(dirname(mdPath), { recursive: true });
writeFileSync(mdPath, md);

// ── Console summary ────────────────────────────────────────────────────────
console.log(`Classified ${summary.total} references:`);
console.log(`  scientific: ${summary.byTier.scientific || 0}`);
console.log(`  grey:       ${summary.byTier.grey || 0}`);
console.log(`PDF status:`, summary.pdf);
console.log(`Wrote ${jsonPath}`);
console.log(`Wrote ${mdPath}`);
