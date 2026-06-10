/**
 * Server-side fetcher + store for the National Level Climate Policies module.
 *
 * `refreshFromClimateLaws()` pages through Climate Policy Radar's public
 * REST API (the backend of climate-laws.org), keeps every law/policy family
 * belonging to an EU-27 member state, maps it to the module schema and
 * persists the dataset as a single jsonb row in Supabase
 * (`public.national_climate_policies_snapshot`, migration 066).
 *
 * `getStoredDataset()` returns that row, or null when no refresh has run
 * yet — the client then falls back to the committed snapshot in
 * `public/data/national-climate-policies.json`.
 *
 * The same mapping exists as a standalone CLI in
 * `scripts/fetch-climate-laws.mjs` (writes the committed snapshot instead
 * of Supabase). If the API schema drifts, fix both.
 *
 * Data licence: CC-BY 4.0 — Grantham Research Institute at LSE / Climate
 * Policy Radar.
 */

import { getServerSupabase } from './supabase-server';
import type { ClimatePolicy, PolicyDataset } from './climate-laws-types';

const API_BASE = 'https://api.climatepolicyradar.org';
const CCLW_CORPUS = 'CCLW.corpus.i00000001.n0000';
const PAGE_SIZE = 100;
const CONCURRENCY = 4; // parallel pages — keep the whole refresh under ~30s

// ISO-3166 alpha-3 (used by the API) → alpha-2 + display name.
const EU27: Record<string, [string, string]> = {
  AUT: ['AT', 'Austria'],     BEL: ['BE', 'Belgium'],     BGR: ['BG', 'Bulgaria'],
  HRV: ['HR', 'Croatia'],     CYP: ['CY', 'Cyprus'],      CZE: ['CZ', 'Czechia'],
  DNK: ['DK', 'Denmark'],     EST: ['EE', 'Estonia'],     FIN: ['FI', 'Finland'],
  FRA: ['FR', 'France'],      DEU: ['DE', 'Germany'],     GRC: ['GR', 'Greece'],
  HUN: ['HU', 'Hungary'],     IRL: ['IE', 'Ireland'],     ITA: ['IT', 'Italy'],
  LVA: ['LV', 'Latvia'],      LTU: ['LT', 'Lithuania'],   LUX: ['LU', 'Luxembourg'],
  MLT: ['MT', 'Malta'],       NLD: ['NL', 'Netherlands'], POL: ['PL', 'Poland'],
  PRT: ['PT', 'Portugal'],    ROU: ['RO', 'Romania'],     SVK: ['SK', 'Slovakia'],
  SVN: ['SI', 'Slovenia'],    ESP: ['ES', 'Spain'],       SWE: ['SE', 'Sweden'],
};

/* eslint-disable @typescript-eslint/no-explicit-any -- external API payload */
type ApiFamily = any;

function stripHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

// Metadata values arrive as string, array, or array of "Name|Group" pairs
// depending on taxonomy field and API version.
function asList(v: unknown): string[] {
  if (v == null) return [];
  const items = Array.isArray(v) ? v : String(v).split(';');
  return [...new Set(items.map((x) => String(x).split('|')[0].trim()).filter(Boolean))].sort();
}

async function fetchJson(url: string): Promise<any> {
  let lastErr: unknown;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      await new Promise((r) => setTimeout(r, 500 * 2 ** attempt));
    }
  }
  throw lastErr;
}

// Geography entries appear either as plain ISO3 strings or objects.
function familyGeographies(fam: ApiFamily): string[] {
  const geos = fam.geographies ?? fam.geography ?? [];
  const list = Array.isArray(geos) ? geos : [geos];
  return list
    .map((g: any) => (typeof g === 'string' ? g : g?.alpha_3 ?? g?.value ?? g?.code ?? ''))
    .map((g: any) => String(g).toUpperCase())
    .filter(Boolean);
}

// Earliest dated event marks when the law/policy entered into force; fall
// back to `published_date` / `created`.
function familyDate(fam: ApiFamily): string {
  const events = Array.isArray(fam.events) ? fam.events : [];
  const dates = events
    .map((e: any) => e?.date ?? e?.event_date ?? '')
    .filter(Boolean)
    .sort();
  const raw = dates[0] ?? fam.published_date ?? fam.created ?? '';
  const m = String(raw).match(/\d{4}-\d{2}-\d{2}/);
  return m ? m[0] : '';
}

function mapFamily(fam: ApiFamily, iso3: string): ClimatePolicy {
  const [iso2, countryName] = EU27[iso3];
  const meta = fam.metadata ?? {};
  const slug: string = fam.slug ?? fam.slugs?.[0] ?? '';
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
/* eslint-enable @typescript-eslint/no-explicit-any */

async function fetchAllFamilies(): Promise<{ families: ApiFamily[]; pagesFetched: number }> {
  const pageUrl = (page: number) =>
    `${API_BASE}/families/?corpus.import_id=${CCLW_CORPUS}&page=${page}&page_size=${PAGE_SIZE}`;

  // The API's `total` field is unreliable — the upstream router returns
  // `total = len(page items)` (see navigator-backend families-api/app/
  // router.py), so it can never be used to compute the page count. Fetch
  // waves of pages until one comes back short or empty.
  const MAX_PAGES = 400; // runaway guard (~40k families)
  const families: ApiFamily[] = [];
  let page = 1;
  let done = false;
  let pagesFetched = 0;
  let prevPageFirstId = '';

  while (!done && page <= MAX_PAGES) {
    const pages: number[] = [];
    for (let p = page; p < page + CONCURRENCY && p <= MAX_PAGES; p++) pages.push(p);
    const batches = await Promise.all(pages.map((p) => fetchJson(pageUrl(p))));
    for (const b of batches) {
      const batch = b.data ?? b.families ?? [];
      // If the service ever ignores the page parameter we would loop over
      // identical pages until MAX_PAGES — detect and bail instead.
      const firstId = String(batch[0]?.import_id ?? '');
      if (firstId && firstId === prevPageFirstId) {
        done = true;
        break;
      }
      prevPageFirstId = firstId;
      families.push(...batch);
      pagesFetched += 1;
      if (batch.length < PAGE_SIZE) done = true;
    }
    page += CONCURRENCY;
  }

  // Pages are ordered by last_modified, which can shift mid-crawl — dedupe.
  const seen = new Set<string>();
  const deduped = families.filter((f) => {
    const id = String(f.import_id ?? f.slug ?? '');
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  return { families: deduped, pagesFetched };
}

export interface RefreshResult {
  dataset: PolicyDataset;
  persisted: boolean;
}

export async function refreshFromClimateLaws(): Promise<RefreshResult> {
  const { families, pagesFetched } = await fetchAllFamilies();

  const policies: ClimatePolicy[] = [];
  for (const fam of families) {
    const iso3 = familyGeographies(fam).find((g) => EU27[g]);
    if (!iso3) continue;
    policies.push(mapFamily(fam, iso3));
  }
  policies.sort(
    (a, b) =>
      a.countryName.localeCompare(b.countryName) ||
      a.date.localeCompare(b.date) ||
      a.title.localeCompare(b.title),
  );

  // Sanity gate: a schema drift upstream must not replace a good snapshot
  // with an empty or untitled one.
  const untitled = policies.filter((p) => !p.title).length;
  if (policies.length < 200 || untitled > policies.length / 10) {
    // Diagnostic shape of the message matters: "1 page" → the deployment
    // is running code that trusted the API's broken `total` field;
    // "many pages, few EU policies" → the geography mapping broke.
    throw new Error(
      `Refresh aborted: result looks broken (${policies.length} EU policies, ${untitled} untitled, ` +
        `from ${families.length} families across ${pagesFetched} pages). ` +
        'The climatepolicyradar.org API schema may have changed.',
    );
  }

  const dataset: PolicyDataset = {
    snapshotDate: new Date().toISOString().slice(0, 10),
    generatedFrom: `${API_BASE}/families/ (corpus ${CCLW_CORPUS})`,
    source: {
      name: 'Climate Change Laws of the World',
      publisher: 'Grantham Research Institute at LSE / Climate Policy Radar',
      url: 'https://climate-laws.org/',
      license: 'CC-BY 4.0',
      licenseUrl: 'https://www.lse.ac.uk/granthaminstitute/cclw-terms-and-conditions/',
    },
    refresh: 'POST /api/national-climate-policies (module Refresh button)',
    policies,
  };

  const sb = getServerSupabase();
  let persisted = false;
  if (sb) {
    const { error } = await sb.from('national_climate_policies_snapshot').upsert(
      {
        id: 'eu27',
        data: dataset,
        snapshot_date: dataset.snapshotDate,
        policy_count: policies.length,
        refreshed_at: new Date().toISOString(),
      },
      { onConflict: 'id' },
    );
    persisted = !error;
  }
  return { dataset, persisted };
}

export async function getStoredDataset(): Promise<PolicyDataset | null> {
  const sb = getServerSupabase();
  if (!sb) return null;
  const { data, error } = await sb
    .from('national_climate_policies_snapshot')
    .select('data')
    .eq('id', 'eu27')
    .maybeSingle();
  if (error || !data?.data) return null;
  return data.data as PolicyDataset;
}
