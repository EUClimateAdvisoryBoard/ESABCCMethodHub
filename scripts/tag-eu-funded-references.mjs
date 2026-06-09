#!/usr/bin/env node
/**
 * EU-funding reference tagger.
 * ----------------------------
 * Walks every reference in the reference manager that carries a DOI and asks
 * CrossRef for its `funder[]` metadata — the structured form of the funding
 * acknowledgment publishers deposit ("This work was supported by the European
 * Union's Horizon Europe research and innovation programme under grant
 * agreement No 101081244"). Any reference funded by an EU research programme
 * is tagged so it can be filtered in the Reference Manager.
 *
 * Corpus (same two stores as scripts/classify-references.mjs):
 *   - the bundled static library   src/data/references.ts            (~2,600)
 *   - the custom / live stack       public/data/custom-references.json
 *
 * What counts as "EU funded" mirrors the single source of truth in
 * src/lib/references/types.ts (EU_FUNDER_DOI_PREFIXES + the name hints used by
 * isEuFunder). Each matched programme also gets a specific tag so the library
 * can be narrowed to, say, just Horizon Europe:
 *
 *   eu-funded          — any of the EU funders below (always added on a match)
 *   horizon-europe     — Horizon Europe            (10.13039/100018693)
 *   horizon-2020       — Horizon 2020              (10.13039/100010661)
 *   erc                — European Research Council  (10.13039/501100007601)
 *   european-commission— European Commission        (10.13039/501100000780)
 *   erdf               — European Regional Development Fund (…008530)
 *   life               — LIFE Programme             (10.13039/501100002347)
 *
 * Outputs:
 *   - src/data/reference-funding-tags.json   (imported by the Reference Manager
 *                                             so the tags render in the UI)
 *   - docs/reference/eu-funding-tags.md       (human-readable report)
 *
 * NETWORK: this script calls api.crossref.org and therefore must run where
 * CrossRef is reachable (Vercel, a developer machine, or a CI job) — NOT inside
 * the restricted Claude Code sandbox, whose network policy blocks it. Results
 * are cached to scripts/.cache/crossref-funders.json so re-runs are cheap and
 * resumable; delete that file (or pass --no-cache) to force a refetch.
 *
 * Usage:
 *   node scripts/tag-eu-funded-references.mjs               # full run
 *   node scripts/tag-eu-funded-references.mjs --limit 50    # first 50 DOIs (smoke test)
 *   node scripts/tag-eu-funded-references.mjs --no-cache    # ignore the cache
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

// ── EU funder definitions (mirror of src/lib/references/types.ts) ────────────
// Map each EU funder DOI prefix to the specific programme tag it should add.
const EU_FUNDER_DOI_TAGS = new Map([
  ['10.13039/501100000780', 'european-commission'], // European Commission
  ['10.13039/100010661', 'horizon-2020'], // Horizon 2020
  ['10.13039/100018693', 'horizon-europe'], // Horizon Europe
  ['10.13039/501100007601', 'erc'], // European Research Council
  ['10.13039/501100008530', 'erdf'], // European Regional Development Fund
  ['10.13039/501100002347', 'life'], // LIFE Programme
]);

// Loose name match for funders that may not carry a DOI prefix in CrossRef.
// Ordered so the most specific programme name wins the tag.
const EU_FUNDER_NAME_TAGS = [
  ['horizon europe', 'horizon-europe'],
  ['horizon 2020', 'horizon-2020'],
  ['h2020', 'horizon-2020'],
  ['european research council', 'erc'],
  ['erc executive agency', 'erc'],
  ['life programme', 'life'],
  ['european regional development fund', 'erdf'],
  ['digital europe programme', 'eu-funded'],
  ['cinea', 'eu-funded'],
  ['european commission', 'european-commission'],
];

/**
 * Classify a single CrossRef funder entry. Returns the specific programme tag
 * (e.g. 'horizon-europe') if it's an EU research funder, otherwise null.
 */
function euTagForFunder(funder) {
  const doi = (funder.DOI || '').trim().toLowerCase();
  if (doi && EU_FUNDER_DOI_TAGS.has(doi)) return EU_FUNDER_DOI_TAGS.get(doi);
  const name = (funder.name || '').toLowerCase();
  for (const [hint, tag] of EU_FUNDER_NAME_TAGS) {
    if (name.includes(hint)) return tag;
  }
  return null;
}

// ── Parse the bundled static library (src/data/references.ts) ────────────────
// Same block regex used by scripts/classify-references.mjs.
function parseStaticReferences() {
  const text = readFileSync(join(ROOT, 'src/data/references.ts'), 'utf8');
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
      title: field(block, 'title'),
      doi: field(block, 'doi'),
    });
  }
  return out;
}

// ── Parse the custom / live stack (public/data/custom-references.json) ───────
function parseCustomReferences() {
  const path = join(ROOT, 'public/data/custom-references.json');
  if (!existsSync(path)) return [];
  const raw = JSON.parse(readFileSync(path, 'utf8'));
  return raw.map((r) => ({
    id: r.id,
    source: r.source === 'vba' ? 'vba' : r.source ? 'web' : 'custom',
    title: r.title || '',
    doi: r.doi || '',
  }));
}

function normalizeDoi(d) {
  return (d || '')
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\/(dx\.)?doi\.org\//, '')
    .replace(/^doi:\s*/, '')
    .trim();
}

// ── CrossRef fetch (polite pool, retry with backoff) ─────────────────────────
const CROSSREF_BASE = 'https://api.crossref.org/works/';
const POLITE_UA =
  'ESABCC-ReferenceManager/1.0 (mailto:refs@climate-advisory-board.europa.eu)';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function fetchFunders(doi) {
  // Returns { ok, funders, status }. funders is the raw CrossRef funder[].
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const resp = await fetch(`${CROSSREF_BASE}${encodeURIComponent(doi)}`, {
        headers: { 'User-Agent': POLITE_UA, Accept: 'application/json' },
      });
      if (resp.status === 404) return { ok: true, funders: [], status: 404 };
      if (resp.status === 429 || resp.status >= 500) {
        await sleep(1000 * 2 ** attempt); // 1s, 2s, 4s, 8s
        continue;
      }
      if (!resp.ok) return { ok: false, funders: [], status: resp.status };
      const data = await resp.json();
      const funders = Array.isArray(data?.message?.funder)
        ? data.message.funder
        : [];
      return { ok: true, funders, status: 200 };
    } catch (e) {
      // Network error (likely a blocked host in a restricted sandbox).
      if (attempt === 3) {
        return { ok: false, funders: [], status: 0, error: String(e) };
      }
      await sleep(1000 * 2 ** attempt);
    }
  }
  return { ok: false, funders: [], status: 0 };
}

// ── Cache (resumable) ────────────────────────────────────────────────────────
const CACHE_DIR = join(ROOT, 'scripts/.cache');
const CACHE_PATH = join(CACHE_DIR, 'crossref-funders.json');
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
  writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 0) + '\n');
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const records = [...parseStaticReferences(), ...parseCustomReferences()];
  const withDoi = records.filter((r) => normalizeDoi(r.doi));
  const targets = LIMIT ? withDoi.slice(0, LIMIT) : withDoi;

  console.log(
    `Reference corpus: ${records.length} total, ${withDoi.length} with a DOI` +
      (LIMIT ? ` (limited to first ${targets.length})` : ''),
  );

  const cache = loadCache();
  const tagsById = {}; // id -> string[]
  const fundersById = {}; // id -> [{ name, doi, awards, tag }]
  let euFunded = 0;
  let networkFailures = 0;
  let processed = 0;

  for (const ref of targets) {
    const doi = normalizeDoi(ref.doi);

    let funders = cache[doi];
    if (funders === undefined) {
      const result = await fetchFunders(doi);
      if (!result.ok) {
        networkFailures++;
        // Bail out early with a clear message if the very first calls all fail
        // — that's the "host blocked" signature, and there's no point grinding
        // through 1,000 DOIs that will all fail.
        if (networkFailures <= 3 && processed === networkFailures - 1) {
          console.error(
            `\n  CrossRef request for ${doi} failed` +
              (result.error ? ` (${result.error})` : ` (HTTP ${result.status})`),
          );
        }
        if (networkFailures === 5 && euFunded === 0 && processed < 5) {
          console.error(
            '\nAborting: the first CrossRef requests all failed. This environment',
          );
          console.error(
            'cannot reach api.crossref.org. Run this script where CrossRef is',
          );
          console.error('reachable (Vercel / a developer machine / CI).');
          process.exitCode = 1;
          break;
        }
        continue;
      }
      funders = result.funders;
      cache[doi] = funders;
      // Persist the cache periodically so a long run is resumable.
      if (processed % 25 === 0) saveCache(cache);
      // Be polite to the shared API.
      await sleep(50);
    }

    processed++;

    const matched = [];
    const tagSet = new Set();
    for (const f of funders) {
      const tag = euTagForFunder(f);
      if (!tag) continue;
      tagSet.add('eu-funded');
      tagSet.add(tag);
      matched.push({
        name: f.name || '',
        doi: f.DOI || '',
        awards: Array.isArray(f.award) ? f.award.filter(Boolean) : [],
        tag,
      });
    }

    if (tagSet.size > 0) {
      euFunded++;
      tagsById[ref.id] = [...tagSet];
      fundersById[ref.id] = matched;
    }

    if (processed % 100 === 0) {
      console.log(`  …${processed}/${targets.length} processed, ${euFunded} EU-funded so far`);
    }
  }

  saveCache(cache);

  // ── Per-programme tally for the report ──
  const byTag = {};
  for (const tags of Object.values(tagsById)) {
    for (const t of tags) byTag[t] = (byTag[t] || 0) + 1;
  }

  const summary = {
    total: records.length,
    withDoi: withDoi.length,
    scanned: processed,
    euFunded,
    networkFailures,
    byTag,
  };

  // ── Write the importable tag sidecar ──
  const sidecar = {
    generatedAt: new Date().toISOString(),
    source: 'scripts/tag-eu-funded-references.mjs',
    description:
      'Maps reference id -> funding tags, derived from CrossRef funder[] ' +
      'metadata (the structured form of each paper\'s funding acknowledgment). ' +
      'Regenerate with: node scripts/tag-eu-funded-references.mjs',
    summary,
    tags: tagsById,
    funders: fundersById,
  };
  const jsonPath = join(ROOT, 'src/data/reference-funding-tags.json');
  writeFileSync(jsonPath, JSON.stringify(sidecar, null, 2) + '\n');

  // ── Write the human-readable report ──
  const tagRows = Object.entries(byTag)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `| \`${k}\` | ${v} |`)
    .join('\n');

  const examples = Object.entries(fundersById)
    .slice(0, 25)
    .map(([id, fs]) => {
      const f = fs
        .map(
          (x) =>
            `${x.name || x.tag}${x.awards.length ? ` (${x.awards.join(', ')})` : ''}`,
        )
        .join('; ');
      return `| \`${id}\` | ${tagsById[id].join(', ')} | ${f} |`;
    })
    .join('\n');

  const md = `# EU-funded references

> Auto-generated by \`scripts/tag-eu-funded-references.mjs\` — do not edit by hand.
> Regenerate after the bibliography export changes or to refresh from CrossRef.

Every reference in the Reference Manager that carries a DOI is checked against
CrossRef's \`funder[]\` metadata — the structured form of the paper's funding
acknowledgment. References funded by an EU research programme are tagged so the
library can be filtered (e.g. to just Horizon Europe).

## Corpus

- **Total references:** ${summary.total}
- **With a DOI (checkable against CrossRef):** ${summary.withDoi}
- **Scanned this run:** ${summary.scanned}
- **EU-funded (tagged):** ${summary.euFunded}
${summary.networkFailures ? `- **CrossRef request failures:** ${summary.networkFailures}` : ''}

## Tags applied

\`eu-funded\` is added to any reference with a matching EU funder; a specific
programme tag is added alongside it.

| Tag | References |
| --- | --- |
${tagRows || '| _(none yet — run the script with CrossRef reachable)_ | 0 |'}

## Sample of tagged references

| Reference | Tags | Funder (award) |
| --- | --- | --- |
${examples || '| _(none yet)_ | | |'}

The full per-reference map is in \`src/data/reference-funding-tags.json\`, which
the Reference Manager imports so the tags render in the UI.
`;

  const mdPath = join(ROOT, 'docs/reference/eu-funding-tags.md');
  mkdirSync(dirname(mdPath), { recursive: true });
  writeFileSync(mdPath, md);

  // ── Console summary ──
  console.log('');
  console.log(`Scanned ${summary.scanned} DOIs, tagged ${summary.euFunded} EU-funded references.`);
  console.log('By tag:', byTag);
  console.log(`Wrote ${jsonPath}`);
  console.log(`Wrote ${mdPath}`);
  if (summary.euFunded === 0 && summary.networkFailures > 0) {
    console.log(
      '\nNo references tagged and CrossRef requests failed — was the host reachable?',
    );
  }
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
