#!/usr/bin/env node
// ---------------------------------------------------------------------------
// Refresh the National Climate Policies snapshot from Climate Change Laws
// of the World (climate-laws.org).
//
// climate-laws.org is powered by Climate Policy Radar's public, token-free
// REST API. This script pages through the CCLW laws-and-policies corpus on
//
//   https://api.climatepolicyradar.org/families/
//       ?corpus.import_id=CCLW.corpus.i00000001.n0000&page=N&page_size=100
//
// keeps every family whose geography is an EU-27 member state, maps it to
// the module's snapshot schema and writes
// `public/data/national-climate-policies.json` (read by the beta module
// `beta/modules/national-climate-policies/page.tsx`).
//
// Data licence: CC-BY 4.0 — Grantham Research Institute at LSE / Climate
// Policy Radar. Attribution is embedded in the output's `source` block.
//
// Usage:
//   node scripts/fetch-climate-laws.mjs              # refresh the snapshot
//   node scripts/fetch-climate-laws.mjs --dry-run    # fetch + report, no write
//
// NOTE: the API is unauthenticated but its response schema is still
// evolving (the service is maintained by Climate Policy Radar). The mapper
// below reads every field defensively; if a refresh ever produces empty
// titles/dates, diff the raw payload (saved with --debug) against
// `mapFamily()` and adjust.
// ---------------------------------------------------------------------------

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'public/data/national-climate-policies.json');

const API_BASE = 'https://api.climatepolicyradar.org';
const CCLW_CORPUS = 'CCLW.corpus.i00000001.n0000';
const PAGE_SIZE = 100;
const THROTTLE_MS = 400; // be polite — one page every 0.4s

const DRY_RUN = process.argv.includes('--dry-run');
const DEBUG = process.argv.includes('--debug');

// ISO-3166 alpha-3 (used by the API) → alpha-2 + display name (used by the
// MethodHub, see src/data/eu-member-states.ts).
const EU27 = {
  AUT: ['AT', 'Austria'],     BEL: ['BE', 'Belgium'],    BGR: ['BG', 'Bulgaria'],
  HRV: ['HR', 'Croatia'],     CYP: ['CY', 'Cyprus'],     CZE: ['CZ', 'Czechia'],
  DNK: ['DK', 'Denmark'],     EST: ['EE', 'Estonia'],    FIN: ['FI', 'Finland'],
  FRA: ['FR', 'France'],      DEU: ['DE', 'Germany'],    GRC: ['GR', 'Greece'],
  HUN: ['HU', 'Hungary'],     IRL: ['IE', 'Ireland'],    ITA: ['IT', 'Italy'],
  LVA: ['LV', 'Latvia'],      LTU: ['LT', 'Lithuania'],  LUX: ['LU', 'Luxembourg'],
  MLT: ['MT', 'Malta'],       NLD: ['NL', 'Netherlands'], POL: ['PL', 'Poland'],
  PRT: ['PT', 'Portugal'],    ROU: ['RO', 'Romania'],    SVK: ['SK', 'Slovakia'],
  SVN: ['SI', 'Slovenia'],    ESP: ['ES', 'Spain'],      SWE: ['SE', 'Sweden'],
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const stripHtml = (s) =>
  String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();

// Metadata values arrive as string, array, or array of "Name|Group" pairs
// depending on taxonomy field and API version.
const asList = (v) => {
  if (v == null) return [];
  const items = Array.isArray(v) ? v : String(v).split(';');
  return [...new Set(
    items.map((x) => String(x).split('|')[0].trim()).filter(Boolean),
  )].sort();
};

async function fetchJson(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      if (attempt === 4) throw err;
      await sleep(1000 * 2 ** attempt);
    }
  }
}

// Geography entries appear either as plain ISO3 strings or objects.
function familyGeographies(fam) {
  const geos = fam.geographies ?? fam.geography ?? [];
  const list = Array.isArray(geos) ? geos : [geos];
  return list
    .map((g) => (typeof g === 'string' ? g : g?.alpha_3 ?? g?.value ?? g?.code ?? ''))
    .map((g) => String(g).toUpperCase())
    .filter(Boolean);
}

// Earliest dated event marks when the law/policy entered into force; fall
// back to `published_date` / `created`.
function familyDate(fam) {
  const events = Array.isArray(fam.events) ? fam.events : [];
  const dates = events
    .map((e) => e?.date ?? e?.event_date ?? '')
    .filter(Boolean)
    .sort();
  const raw = dates[0] ?? fam.published_date ?? fam.created ?? '';
  const m = String(raw).match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

function mapFamily(fam, iso3) {
  const [iso2, countryName] = EU27[iso3];
  const meta = fam.metadata ?? {};
  const slug = fam.slug ?? fam.slugs?.[0] ?? '';
  const title = stripHtml(fam.title);
  const date = familyDate(fam);
  const documents = Array.isArray(fam.documents) ? fam.documents : [];
  const firstDoc = documents[0] ?? {};
  const category = String(fam.family_category ?? fam.category ?? '');

  return {
    id: `${iso2.toLowerCase()}-${String(fam.import_id ?? slug).replace(/[^a-zA-Z0-9.-]+/g, '-')}`,
    countryCode: iso2,
    countryName,
    title,
    summary: stripHtml(fam.description ?? fam.summary ?? ''),
    // CCLW categorises families as Legislative (passed by parliament) or
    // Executive (government policy) — keep the module's Law/Policy labels.
    category: /legislative/i.test(category) ? 'Law'
      : /executive|policy/i.test(category) ? 'Policy'
      : category || 'Policy',
    type: stripHtml(firstDoc?.valid_metadata?.type ?? firstDoc?.document_type ?? meta.document_type ?? ''),
    date,
    year: date ? Number(date.slice(0, 4)) : null,
    sectors: asList(meta.sector),
    instruments: asList(meta.instrument),
    frameworks: asList(meta.framework),
    responses: asList(meta.topic ?? meta.response),
    keywords: asList(meta.keyword),
    hazards: asList(meta.hazard),
    language: '',
    documentUrl: firstDoc?.source_url ?? firstDoc?.cdn_object ?? '',
    climateLawsUrl: slug
      ? `https://climate-laws.org/document/${slug}`
      : `https://climate-laws.org/search?q=${encodeURIComponent(title)}`,
  };
}

async function main() {
  // NOTE: the API's `total` field is unreliable — the upstream router
  // returns `total = len(page items)`, so the only way to know we're done
  // is a page that comes back short or empty.
  const MAX_PAGES = 400; // runaway guard
  const families = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    const url = `${API_BASE}/families/?corpus.import_id=${CCLW_CORPUS}&page=${page}&page_size=${PAGE_SIZE}`;
    const json = await fetchJson(url);
    const batch = json.data ?? json.families ?? [];
    families.push(...batch);
    process.stdout.write(`\rpage ${page} — ${families.length} families`);
    if (batch.length < PAGE_SIZE) break;
    page += 1;
    await sleep(THROTTLE_MS);
  }
  console.log();

  // Pages are ordered by last_modified, which can shift mid-crawl — dedupe.
  const seenIds = new Set();
  const deduped = families.filter((f) => {
    const id = String(f.import_id ?? f.slug ?? '');
    if (!id || seenIds.has(id)) return false;
    seenIds.add(id);
    return true;
  });
  families.length = 0;
  families.push(...deduped);

  if (DEBUG) {
    await fs.writeFile(path.join(ROOT, 'families-raw.json'), JSON.stringify(families, null, 1));
    console.log('debug: raw payload saved to families-raw.json');
  }

  const policies = [];
  for (const fam of families) {
    const iso3 = familyGeographies(fam).find((g) => EU27[g]);
    if (!iso3) continue;
    policies.push(mapFamily(fam, iso3));
  }
  policies.sort((a, b) =>
    a.countryName.localeCompare(b.countryName) || a.date.localeCompare(b.date) || a.title.localeCompare(b.title));

  const byCountry = {};
  for (const p of policies) byCountry[p.countryName] = (byCountry[p.countryName] ?? 0) + 1;
  console.log(`EU-27 laws & policies: ${policies.length}`);
  console.table(byCountry);

  const untitled = policies.filter((p) => !p.title).length;
  if (policies.length < 200 || untitled > policies.length / 10) {
    throw new Error(
      `Refusing to write: result looks broken (${policies.length} policies, ${untitled} untitled). ` +
      'The API schema may have changed — rerun with --debug and adjust mapFamily().',
    );
  }

  const dataset = {
    snapshotDate: new Date().toISOString().slice(0, 10),
    generatedFrom: `${API_BASE}/families/ (corpus ${CCLW_CORPUS})`,
    source: {
      name: 'Climate Change Laws of the World',
      publisher: 'Grantham Research Institute at LSE / Climate Policy Radar',
      url: 'https://climate-laws.org/',
      license: 'CC-BY 4.0',
      licenseUrl: 'https://www.lse.ac.uk/granthaminstitute/cclw-terms-and-conditions/',
    },
    refresh: 'node scripts/fetch-climate-laws.mjs',
    policies,
  };

  if (DRY_RUN) {
    console.log('dry run — nothing written');
    return;
  }
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(dataset, null, 1));
  console.log(`wrote ${path.relative(ROOT, OUTPUT_FILE)}`);
}

main().catch((err) => {
  console.error(`\nfetch-climate-laws failed: ${err.message}`);
  process.exit(1);
});
