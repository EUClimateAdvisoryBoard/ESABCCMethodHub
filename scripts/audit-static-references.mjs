#!/usr/bin/env node
/**
 * Static-library reference auditor.
 * ---------------------------------
 * Walks the bundled static library (src/data/references.ts, ~2,600 refs of
 * which ~1,055 carry a DOI) and, for every DOI-carrying reference:
 *
 *   1. fetches the CrossRef record and compares title / year / journal /
 *      volume / issue / pages against the stored fields;
 *   2. asks Unpaywall (then OpenAlex) for a legal open-access PDF URL.
 *
 * The static library is auto-generated ("do not edit by hand"), so this
 * script never rewrites references.ts. Instead it emits sidecar files that
 * the Reference Manager merges at render time — the same pattern as the
 * EU-funding tagger (src/data/reference-funding-tags.json):
 *
 *   - src/data/reference-pdf-links.json    id → open-access PDF URL
 *   - src/data/reference-corrections.json  id → safe field fills (volume /
 *     issue / pages that are EMPTY locally but present in CrossRef, applied
 *     only when title+year match confidently — conflicts are never
 *     auto-resolved, they go to the report)
 *   - docs/reference/static-library-audit.md  human-readable discrepancy
 *     report (title/year/journal conflicts, fill counts, OA coverage)
 *
 * NETWORK: must run where api.crossref.org / api.unpaywall.org are reachable
 * (GitHub Actions via .github/workflows/audit-static-references.yml, or a
 * developer machine) — NOT the restricted Claude Code sandbox. Responses are
 * cached to scripts/.cache/static-audit.json so re-runs are cheap and
 * resumable.
 *
 * Usage:
 *   node scripts/audit-static-references.mjs               # full run
 *   node scripts/audit-static-references.mjs --limit 50    # smoke test
 *   node scripts/audit-static-references.mjs --no-cache    # force refetch
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  existsSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// ── CLI flags ───────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  return i !== -1 && argv[i + 1] ? argv[i + 1] : dflt;
};
const LIMIT = parseInt(opt('--limit', '0'), 10) || 0; // 0 = no limit
const USE_CACHE = !flag('--no-cache');

const POLITE_UA =
  'ESABCC-ReferenceManager/1.0 (mailto:refs@climate-advisory-board.europa.eu)';
const UNPAYWALL_EMAIL =
  process.env.UNPAYWALL_EMAIL || 'refs@climate-advisory-board.europa.eu';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Parse the bundled static library (same regex as the funding tagger) ─────
function parseStaticReferences() {
  const text = readFileSync(join(ROOT, 'src/data/references.ts'), 'utf8');
  const blockRe = /\{\s*id:\s*'([^']+)'[\s\S]*?\n\s{2}\},?/g;
  const field = (block, name) => {
    const m = block.match(new RegExp(`\\b${name}:\\s*'((?:[^'\\\\]|\\\\.)*)'`));
    return m ? m[1].replace(/\\'/g, "'") : '';
  };
  const out = [];
  let m;
  while ((m = blockRe.exec(text)) !== null) {
    const block = m[0];
    out.push({
      id: m[1],
      title: field(block, 'title'),
      authors: field(block, 'authors'),
      year: field(block, 'year'),
      journal: field(block, 'journal'),
      volume: field(block, 'volume'),
      issue: field(block, 'issue'),
      pages: field(block, 'pages'),
      doi: field(block, 'doi'),
    });
  }
  return out;
}

// ── Normalisation + fuzzy comparison helpers ─────────────────────────────────
function normText(s) {
  return String(s || '')
    .replace(/<[^>]+>/g, ' ') // CrossRef titles can carry <i>/<sub> markup
    .replace(/&amp;/g, '&')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip diacritics
    .toLowerCase()
    .replace(/[‘’‚`]/g, "'")
    .replace(/[“”„]/g, '"')
    .replace(/[–—−]/g, '-')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Dice coefficient on word bigrams — robust to subtitle truncation and
// punctuation noise without pulling in a dependency.
function similarity(a, b) {
  const grams = (s) => {
    const words = normText(s).split(' ').filter(Boolean);
    if (words.length < 2) return new Set(words);
    const out = new Set();
    for (let i = 0; i < words.length - 1; i++) out.add(words[i] + ' ' + words[i + 1]);
    return out;
  };
  const A = grams(a);
  const B = grams(b);
  if (A.size === 0 || B.size === 0) return normText(a) === normText(b) ? 1 : 0;
  let inter = 0;
  for (const g of A) if (B.has(g)) inter++;
  return (2 * inter) / (A.size + B.size);
}

function normPages(p) {
  // "721-736", "721 - 736", "pp. 721-736" → "721-736"; article numbers pass through.
  return String(p || '').toLowerCase().replace(/pp?\.?\s*/g, '').replace(/\s+/g, '').replace(/[–—−]/g, '-');
}

// ── CrossRef + Unpaywall + OpenAlex fetchers (cached, retried) ───────────────
async function fetchJson(url, attempts = 3) {
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const resp = await fetch(url, {
        headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
      });
      if (resp.status === 404) return { status: 404, data: null };
      if (resp.status === 429 || resp.status >= 500) {
        await sleep(1000 * 2 ** attempt);
        continue;
      }
      if (!resp.ok) return { status: resp.status, data: null };
      return { status: 200, data: await resp.json() };
    } catch (e) {
      if (attempt === attempts - 1) return { status: 0, data: null, error: String(e) };
      await sleep(1000 * 2 ** attempt);
    }
  }
  return { status: 0, data: null };
}

const CACHE_DIR = join(ROOT, 'scripts/.cache');
const CACHE_PATH = join(CACHE_DIR, 'static-audit.json');
function loadCache() {
  if (!USE_CACHE || !existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(readFileSync(CACHE_PATH, 'utf8'));
  } catch {
    return {};
  }
}
function saveCache(cache) {
  mkdirSync(CACHE_DIR, { recursive: true });
  writeFileSync(CACHE_PATH, JSON.stringify(cache));
}

async function lookupDoi(doi, cache) {
  const key = doi.toLowerCase();
  if (USE_CACHE && cache[key]) return cache[key];

  const entry = { crossref: null, oaPdf: null, status: 'ok' };

  const cr = await fetchJson(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
  if (cr.status === 200 && cr.data?.message) {
    const msg = cr.data.message;
    entry.crossref = {
      title: Array.isArray(msg.title) ? msg.title[0] : msg.title || '',
      journal: Array.isArray(msg['container-title'])
        ? msg['container-title'][0]
        : msg['container-title'] || '',
      year:
        msg.issued?.['date-parts']?.[0]?.[0] ??
        msg['published-print']?.['date-parts']?.[0]?.[0] ??
        msg['published-online']?.['date-parts']?.[0]?.[0] ??
        null,
      volume: msg.volume || '',
      issue: msg.issue || '',
      pages: msg.page || msg['article-number'] || '',
    };
  } else if (cr.status === 404) {
    entry.status = 'doi-not-found';
  } else {
    entry.status = `crossref-http-${cr.status}`;
  }

  const up = await fetchJson(
    `https://api.unpaywall.org/v2/${encodeURIComponent(doi)}?email=${encodeURIComponent(UNPAYWALL_EMAIL)}`,
  );
  if (up.status === 200 && up.data?.is_oa) {
    const locs = [up.data.best_oa_location, ...(up.data.oa_locations || [])].filter(Boolean);
    entry.oaPdf = locs.find((l) => l.url_for_pdf)?.url_for_pdf || null;
  }
  if (!entry.oaPdf) {
    const oa = await fetchJson(
      `https://api.openalex.org/works/doi:${encodeURIComponent(doi)}?mailto=${encodeURIComponent(UNPAYWALL_EMAIL)}`,
    );
    entry.oaPdf =
      oa.data?.best_oa_location?.pdf_url ||
      (oa.data?.locations || []).find((l) => l?.pdf_url)?.pdf_url ||
      null;
  }

  // Only cache definitive answers — transient errors (rate limits, network
  // blips) must stay retryable on the next run.
  if (entry.status === 'ok' || entry.status === 'doi-not-found') {
    cache[key] = entry;
  }
  return entry;
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const refs = parseStaticReferences();
  const withDoi = refs.filter((r) => r.doi);
  const targets = LIMIT ? withDoi.slice(0, LIMIT) : withDoi;
  console.log(
    `audit-static-references: ${refs.length} refs in library, ` +
      `${withDoi.length} with a DOI, auditing ${targets.length}`,
  );

  const cache = loadCache();
  const pdfLinks = {};
  const fills = {};
  const conflicts = []; // { id, field, stored, crossref }
  const titleMismatches = []; // { id, sim, stored, crossref }
  const deadDois = [];
  const fetchErrors = [];

  let processed = 0;
  let consecutiveErrors = 0;
  for (const ref of targets) {
    const entry = await lookupDoi(ref.doi, cache);
    processed++;
    if (processed % 100 === 0) {
      saveCache(cache);
      console.log(`  …${processed}/${targets.length}`);
    }

    if (entry.status === 'doi-not-found') {
      deadDois.push(ref);
      consecutiveErrors = 0;
      continue;
    }
    if (!entry.crossref) {
      fetchErrors.push({ id: ref.id, status: entry.status });
      // If the very first requests all fail, the environment can't reach
      // CrossRef at all — bail out instead of producing an empty report.
      if (++consecutiveErrors >= 10 && processed === consecutiveErrors) {
        console.error(
          '\nAborting: the first CrossRef requests all failed. Run this where',
          'api.crossref.org is reachable (GitHub Actions / dev machine).',
        );
        process.exit(1);
      }
      continue;
    }
    consecutiveErrors = 0;

    const cr = entry.crossref;
    const sim = similarity(ref.title, cr.title);
    const yearDiff =
      ref.year && cr.year ? Math.abs(parseInt(ref.year, 10) - cr.year) : 0;
    // Only trust CrossRef enough to fill gaps / flag conflicts when the
    // title clearly matches — a low score usually means a mis-keyed DOI.
    const confident = sim >= 0.5 || (sim >= 0.3 && yearDiff === 0);

    if (sim < 0.3) {
      titleMismatches.push({ id: ref.id, sim, stored: ref.title, crossref: cr.title });
    }

    if (confident) {
      if (yearDiff > 1) {
        conflicts.push({ id: ref.id, field: 'year', stored: ref.year, crossref: String(cr.year) });
      }
      const fill = {};
      for (const [field, crVal] of [
        ['volume', cr.volume],
        ['issue', cr.issue],
        ['pages', cr.pages],
      ]) {
        const stored = ref[field];
        if (!stored && crVal) {
          fill[field] = String(crVal);
        } else if (stored && crVal) {
          const differs =
            field === 'pages'
              ? normPages(stored) !== normPages(crVal) &&
                !normPages(crVal).startsWith(normPages(stored).split('-')[0])
              : stored !== String(crVal);
          if (differs) {
            conflicts.push({ id: ref.id, field, stored, crossref: String(crVal) });
          }
        }
      }
      if (Object.keys(fill).length > 0) fills[ref.id] = fill;
      if (entry.oaPdf) pdfLinks[ref.id] = entry.oaPdf;
    }

    await sleep(100); // polite pacing across CrossRef/Unpaywall/OpenAlex
  }
  saveCache(cache);

  // ── Sidecars ───────────────────────────────────────────────────────────────
  const generated = new Date().toISOString().slice(0, 10);
  writeFileSync(
    join(ROOT, 'src/data/reference-pdf-links.json'),
    JSON.stringify(
      {
        _comment:
          'Open-access PDF URLs for the bundled static library, resolved via ' +
          'Unpaywall/OpenAlex by scripts/audit-static-references.mjs. Merged ' +
          'into /references at render time. Do not edit by hand.',
        generated,
        links: pdfLinks,
      },
      null,
      2,
    ) + '\n',
  );
  writeFileSync(
    join(ROOT, 'src/data/reference-corrections.json'),
    JSON.stringify(
      {
        _comment:
          'Safe metadata fills for the bundled static library: volume/issue/' +
          'pages that are empty locally but present in CrossRef (title+year ' +
          'verified). Generated by scripts/audit-static-references.mjs; ' +
          'merged at render time so they survive bibliography re-exports. ' +
          'Conflicting values are NEVER auto-applied — see the audit report.',
        generated,
        fills,
      },
      null,
      2,
    ) + '\n',
  );

  // ── Report ─────────────────────────────────────────────────────────────────
  const lines = [
    '# Static reference library — CrossRef audit',
    '',
    `Generated by \`scripts/audit-static-references.mjs\` on ${generated}.`,
    '',
    `- Library size: **${refs.length}** references, **${withDoi.length}** with a DOI`,
    `- Audited against CrossRef: **${targets.length}**`,
    `- Open-access PDF found: **${Object.keys(pdfLinks).length}** → \`src/data/reference-pdf-links.json\``,
    `- Safe field fills (empty volume/issue/pages): **${Object.keys(fills).length}** → \`src/data/reference-corrections.json\``,
    `- Field conflicts needing a human: **${conflicts.length}**`,
    `- Title mismatches (possible mis-keyed DOI): **${titleMismatches.length}**`,
    `- DOIs not found in CrossRef: **${deadDois.length}**`,
    `- Fetch errors (transient / non-CrossRef DOIs e.g. DataCite): **${fetchErrors.length}**`,
    '',
    'References without a DOI cannot be machine-verified and are not listed.',
    '',
  ];

  if (titleMismatches.length) {
    lines.push('## Title mismatches — check these DOIs by hand', '');
    lines.push('| Ref | Stored title | CrossRef title |', '|---|---|---|');
    for (const t of titleMismatches) {
      lines.push(`| ${t.id} | ${t.stored.slice(0, 90)} | ${String(t.crossref).slice(0, 90)} |`);
    }
    lines.push('');
  }
  if (conflicts.length) {
    lines.push('## Field conflicts (stored vs CrossRef — not auto-applied)', '');
    lines.push('| Ref | Field | Stored | CrossRef |', '|---|---|---|---|');
    for (const c of conflicts) {
      lines.push(`| ${c.id} | ${c.field} | ${c.stored} | ${c.crossref} |`);
    }
    lines.push('');
  }
  if (deadDois.length) {
    lines.push('## DOIs not found in CrossRef', '');
    for (const d of deadDois) lines.push(`- ${d.id} — \`${d.doi}\` (${d.title.slice(0, 80)})`);
    lines.push('');
  }

  mkdirSync(join(ROOT, 'docs/reference'), { recursive: true });
  writeFileSync(join(ROOT, 'docs/reference/static-library-audit.md'), lines.join('\n'));

  console.log(
    `done: ${Object.keys(pdfLinks).length} OA PDFs, ${Object.keys(fills).length} fills, ` +
      `${conflicts.length} conflicts, ${titleMismatches.length} title mismatches, ` +
      `${deadDois.length} dead DOIs`,
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
