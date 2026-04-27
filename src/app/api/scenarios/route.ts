import { NextRequest, NextResponse } from 'next/server';
import {
  eurostatModels,
  eurostatScenarios,
  eurostatVariables,
  eurostatRegions,
  eurostatGroupedVariables,
  eurostatTieredRegions,
  eurostatRuns,
  fetchEurostatVariable,
  EUROSTAT_RUN_ID,
} from '@/lib/scenarios/eurostat';
import {
  eeaModels,
  eeaScenarios,
  eeaVariables,
  eeaRegions,
  eeaRuns,
  fetchEeaVariable,
  EEA_RUN_ID,
} from '@/lib/scenarios/eea';

/**
 * IIASA Scenario Explorer API proxy.
 *
 * Connects to the same REST backend that pyam uses:
 *   - Manager API:  https://api.manager.ece.iiasa.ac.at
 *   - Legacy SE:    GET /runs, /ts, /nodes, POST /runs/bulk/ts
 *   - New ixmp4:    POST /iamc/datapoints/, /runs/, /models/, etc.
 *
 * Step 1: list platforms via the Manager API
 * Step 2: get the base URL for a specific platform/database
 * Step 3: query data using that platform's REST API
 */

const MANAGER_URL = 'https://api.manager.ece.iiasa.ac.at';

// ── Database registry ──────────────────────────────────────────────────────
// Maps our keys to the IIASA legacy application names (used in /legacy/applications/{name}/config)
// and new ixmp4 platform names (used via the manager).

interface DbEntry {
  label: string;
  description: string;
  legacyApp?: string;
  ixmp4Platform?: string;
  // Direct fallback API URL if Manager resolution fails
  directUrl?: string;
  // 'legacy' or 'ixmp4' — determines which endpoint paths to use
  apiType: 'legacy' | 'ixmp4';
}

// NOTE: Eurostat and EEA are no longer listed as scenario "databases" — they
// live behind the dedicated "Statistics" mode in the explorer UI and are
// handled by their own special branches below. Keeping the entries here would
// only confuse the scenario picker.
const DATABASES: Record<string, DbEntry> = {
  'eu-cab': {
    label: 'EU Climate Advisory Board',
    description: 'European Scientific Advisory Board on Climate Change scenario database',
    legacyApp: 'IXSE_EU_CLIMATE_ADVISORY_BOARD',
    apiType: 'legacy',
  },
  ar6: {
    label: 'IPCC AR6 Scenarios',
    description: 'Scenarios from the IPCC Sixth Assessment Report (WGIII)',
    legacyApp: 'IXSE_AR6_PUBLIC',
    apiType: 'legacy',
  },
  sr15: {
    label: 'IPCC SR1.5',
    description: 'Special Report on Global Warming of 1.5°C',
    legacyApp: 'IXSE_SR15',
    apiType: 'legacy',
  },
  ngfs5: {
    label: 'NGFS Phase 5',
    description: 'Network for Greening the Financial System climate scenarios',
    legacyApp: 'IXSE_NGFS_PHASE_5_SHORT_TERM',
    apiType: 'legacy',
  },
  ngfs4: {
    label: 'NGFS Phase 4',
    description: 'Network for Greening the Financial System (Phase 4)',
    legacyApp: 'IXSE_NGFS_PHASE_4',
    apiType: 'legacy',
  },
  ngfs3: {
    label: 'NGFS Phase 3',
    description: 'Network for Greening the Financial System (Phase 3)',
    legacyApp: 'IXSE_NGFS_PHASE_3',
    apiType: 'legacy',
  },
  ecemf: {
    label: 'ECEMF',
    description: 'European Climate and Energy Modelling Forum',
    legacyApp: 'IXSE_ECEMF',
    apiType: 'legacy',
  },
  ssp: {
    label: 'SSP',
    description: 'Shared Socioeconomic Pathways',
    legacyApp: 'IXSE_SSP',
    apiType: 'legacy',
  },
  engage: {
    label: 'ENGAGE',
    description: 'Exploring National and Global Actions to reduce GHG Emissions',
    legacyApp: 'IXSE_ENGAGE',
    apiType: 'legacy',
  },
  nca5: {
    label: 'NCA5',
    description: 'US National Climate Assessment scenarios',
    legacyApp: 'IXSE_NCA5',
    apiType: 'legacy',
  },
};

// ── Helpers ─────────────────────────────────────────────────────────────────

async function apiFetch(url: string, options?: RequestInit) {
  const res = await fetch(url, {
    ...options,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(options?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

// Cache resolved base URLs and auth tokens for the server process lifetime
const baseUrlCache: Record<string, string> = {};
let anonToken: string | null = null;

// Server-side metadata cache: avoids re-fetching models/scenarios/variables/regions/runs
// from IIASA on every request. Cached for 30 minutes.
const CACHE_TTL = 30 * 60 * 1000; // 30 min
const metadataCache: Record<string, { data: unknown; timestamp: number }> = {};

function getCached(key: string): unknown | null {
  const entry = metadataCache[key];
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) return entry.data;
  return null;
}

function setCache(key: string, data: unknown) {
  metadataCache[key] = { data, timestamp: Date.now() };
}

// Auth endpoints to try (new manager + legacy)
const AUTH_URLS = [
  'https://api.manager.ece.iiasa.ac.at',
  'https://db1.ene.iiasa.ac.at/EneAuth/config/v1',
];

/**
 * Get an anonymous JWT token from the IIASA auth service.
 * Tries both the new Manager API and legacy EneAuth.
 */
async function getAnonToken(): Promise<string> {
  if (anonToken) return anonToken;

  for (const base of AUTH_URLS) {
    try {
      const res = await fetch(`${base}/legacy/anonym/`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        anonToken = data.token || data.access_token || (typeof data === 'string' ? data : '') || '';
        if (anonToken) return anonToken;
      }
    } catch { /* try next */ }

    // Try alternate path pattern (legacy EneAuth uses /anonym directly)
    try {
      const res = await fetch(`${base}/anonym`, {
        headers: { Accept: 'application/json' },
      });
      if (res.ok) {
        const text = await res.text();
        // Token might be returned as plain text or JSON
        try {
          const data = JSON.parse(text);
          anonToken = data.token || data.access_token || '';
        } catch {
          anonToken = text.trim();
        }
        if (anonToken) return anonToken;
      }
    } catch { /* try next */ }
  }

  console.warn('Could not get anon token from any IIASA auth endpoint');
  return '';
}

/** Fetch with Bearer auth */
async function authedFetch(url: string, options?: RequestInit) {
  const token = await getAnonToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

/**
 * Resolve the REST API base URL for a database.
 * Tries multiple auth endpoints (new Manager + legacy EneAuth) and
 * falls back to direct URL if Manager resolution fails entirely.
 */
async function resolveBaseUrl(dbKey: string): Promise<{ url: string; isIxmp4: boolean }> {
  if (baseUrlCache[dbKey]) {
    const isIxmp4 = DATABASES[dbKey]?.apiType === 'ixmp4';
    return { url: baseUrlCache[dbKey], isIxmp4 };
  }

  const db = DATABASES[dbKey];
  if (!db) throw new Error(`Unknown database: ${dbKey}`);
  const isIxmp4 = db.apiType === 'ixmp4';

  // Try resolving via each auth endpoint
  const errors: string[] = [];

  for (const authBase of AUTH_URLS) {
    try {
      if (isIxmp4 && db.ixmp4Platform) {
        // ixmp4 platform — list via /v1/platforms/
        const platforms = await apiFetch(`${authBase}/v1/platforms/`);
        const list = Array.isArray(platforms) ? platforms : (platforms.results || platforms.data || []);
        const match = list.find((p: Record<string, string>) =>
          p.name === db.ixmp4Platform || p.name?.includes(db.ixmp4Platform!)
        );
        if (match?.url) {
          baseUrlCache[dbKey] = match.url;
          return { url: match.url, isIxmp4: true };
        }
        errors.push(`${authBase}: platform "${db.ixmp4Platform}" not in list: ${list.map((p: Record<string,string>) => p.name).join(', ')}`);
      }

      if (!isIxmp4 && db.legacyApp) {
        // Legacy app — resolve via /legacy/applications/{name}/config
        const config = await authedFetch(`${authBase}/legacy/applications/${db.legacyApp}/config`);
        let baseUrl: string | undefined;
        if (Array.isArray(config)) {
          const entry = config.find((c: Record<string, string>) =>
            c.path === 'baseUrl' || c.key === 'baseUrl'
          );
          baseUrl = entry?.value;
        } else {
          baseUrl = config.baseUrl || config.base_url;
        }
        if (baseUrl) {
          baseUrlCache[dbKey] = baseUrl;
          return { url: baseUrl, isIxmp4: false };
        }
        errors.push(`${authBase}: no baseUrl in config: ${JSON.stringify(config).slice(0, 200)}`);
      }
    } catch (err) {
      errors.push(`${authBase}: ${(err as Error).message}`);
    }
  }

  // If we have a direct fallback URL, use it
  if (db.directUrl) {
    baseUrlCache[dbKey] = db.directUrl;
    return { url: db.directUrl, isIxmp4 };
  }

  throw new Error(`Could not resolve URL for "${dbKey}". Tried: ${errors.join(' | ')}`);
}

// ── Legacy Scenario Explorer API ────────────────────────────────────────────

async function legacyRuns(baseUrl: string) {
  return authedFetch(`${baseUrl}/runs?getOnlyDefaultRuns=false&includeMetadata=true`);
}

async function legacyVariables(baseUrl: string) {
  return authedFetch(`${baseUrl}/ts`);
}

async function legacyRegions(baseUrl: string) {
  return authedFetch(`${baseUrl}/nodes?hierarchy=%2A`);
}

async function legacyDatapoints(
  baseUrl: string,
  filters: { runs: number[]; variables: string[]; regions: string[] }
) {
  return authedFetch(`${baseUrl}/runs/bulk/ts`, {
    method: 'POST',
    body: JSON.stringify({
      filters: {
        runs: filters.runs,
        variables: filters.variables,
        regions: filters.regions,
        years: [],
        units: [],
        timeslices: [],
      },
    }),
  });
}

// ── ixmp4 Platform API ──────────────────────────────────────────────────────

async function ixmp4Runs(baseUrl: string) {
  return apiFetch(`${baseUrl}/runs/`, {
    method: 'POST',
    body: JSON.stringify({ table: true, default_only: true }),
  });
}

async function ixmp4Models(baseUrl: string) {
  return apiFetch(`${baseUrl}/models/`, {
    method: 'GET',
  });
}

async function ixmp4Scenarios(baseUrl: string) {
  return apiFetch(`${baseUrl}/scenarios/`, {
    method: 'GET',
  });
}

async function ixmp4Variables(baseUrl: string) {
  return apiFetch(`${baseUrl}/iamc/variables/`, {
    method: 'GET',
  });
}

async function ixmp4Regions(baseUrl: string) {
  return apiFetch(`${baseUrl}/regions/`, {
    method: 'GET',
  });
}

async function ixmp4Datapoints(
  baseUrl: string,
  filters: { runs: number[]; variables: string[]; regions: string[] }
) {
  return apiFetch(`${baseUrl}/iamc/datapoints/`, {
    method: 'POST',
    body: JSON.stringify({
      table: true,
      join_parameters: true,
      run: { id: { in: filters.runs }, default_only: false },
      variable: { name: { in: filters.variables } },
      region: { name: { in: filters.regions } },
    }),
  });
}

// ── Parse helpers ───────────────────────────────────────────────────────────

function parseNames(data: unknown, context?: string): string[] {
  if (!data || !Array.isArray(data)) {
    // Could be paginated: { results: [...] }
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (obj.results && Array.isArray(obj.results)) return parseNames(obj.results, context);
      if (obj.data && Array.isArray(obj.data)) return parseNames(obj.data, context);
    }
    console.log(`[parseNames] ${context || ''} non-array data:`, String(JSON.stringify(data) ?? '').slice(0, 300));
    return [];
  }
  const names = data
    .map((x: unknown) => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') {
        const obj = x as Record<string, string>;
        // Handle various IIASA API field names
        return obj.name || obj.variable || obj.region || obj.node || obj.model || obj.scenario || '';
      }
      return '';
    })
    .filter(Boolean);
  // Deduplicate and sort
  return [...new Set(names)].sort();
}

interface LegacyRun {
  run_id?: number;
  id?: number;
  model?: string | { name: string };
  scenario?: string | { name: string };
  is_default?: boolean;
  // Metadata fields (available with includeMetadata=true)
  meta?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  category?: string;
  Category?: string;
  climate_category?: string;
  [key: string]: unknown;
}

interface ParsedRun {
  id: number;
  model: string;
  scenario: string;
  category: string;  // C1-C8 or '' if not available
  meta: Record<string, string>;
}

function parseRuns(data: unknown): ParsedRun[] {
  let list: LegacyRun[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else {
    const obj = data as Record<string, unknown>;
    if (obj.results && Array.isArray(obj.results)) list = obj.results;
    else if (obj.data && Array.isArray(obj.data)) list = obj.data;
  }
  return list
    .map((r) => {
      // Extract category from various possible metadata locations
      const meta = (r.meta || r.metadata || {}) as Record<string, unknown>;
      const category = String(
        r.category || r.Category || r.climate_category ||
        meta.category || meta.Category || meta.climate_category ||
        meta['Category'] || meta['Vetting'] || meta['Category_name'] || ''
      );

      // Extract all string metadata for potential future use
      const metaStrings: Record<string, string> = {};
      for (const [k, v] of Object.entries(meta)) {
        if (typeof v === 'string' || typeof v === 'number') metaStrings[k] = String(v);
      }

      return {
        id: r.run_id ?? r.id ?? 0,
        model: typeof r.model === 'string' ? r.model : r.model?.name || '',
        scenario: typeof r.scenario === 'string' ? r.scenario : r.scenario?.name || '',
        category,
        meta: metaStrings,
      };
    })
    .filter((r) => r.id && r.model && r.scenario);
}

// ── Route handler ───────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const action = sp.get('action') || 'databases';
  const dbKey = sp.get('db') || 'ar6';

  // List available databases — no external API call needed
  if (action === 'databases') {
    return NextResponse.json(
      Object.entries(DATABASES).map(([key, v]) => ({
        key,
        label: v.label,
        description: v.description,
      }))
    );
  }

  // Debug endpoint — list what the IIASA manager sees
  if (action === 'debug') {
    const results: Record<string, unknown> = {};
    const token = await getAnonToken();
    results.anonToken = token ? `obtained (${token.slice(0, 20)}...)` : 'FAILED';

    for (const authBase of AUTH_URLS) {
      const key = authBase.replace('https://', '');
      try {
        const apps = await authedFetch(`${authBase}/legacy/applications`);
        results[`${key}/legacy/applications`] = Array.isArray(apps)
          ? apps.map((a: Record<string, unknown>) => a.name || a.alias || a).slice(0, 30)
          : apps;
      } catch (err) {
        results[`${key}/legacy/applications`] = `ERROR: ${(err as Error).message}`;
      }
      try {
        const plats = await apiFetch(`${authBase}/v1/platforms/`);
        results[`${key}/v1/platforms`] = Array.isArray(plats)
          ? plats.map((p: Record<string, unknown>) => ({ name: p.name, url: p.url })).slice(0, 20)
          : plats;
      } catch (err) {
        results[`${key}/v1/platforms`] = `ERROR: ${(err as Error).message}`;
      }
    }

    // Also try resolving the requested db
    try {
      const resolved = await resolveBaseUrl(dbKey);
      results[`resolved_${dbKey}`] = resolved;
    } catch (err) {
      results[`resolved_${dbKey}`] = `ERROR: ${(err as Error).message}`;
    }

    return NextResponse.json(results);
  }

  // ── EEA handler (no IIASA proxy needed) ─────────────────────────────────
  if (dbKey === 'eea-ghg') {
    try {
      switch (action) {
        case 'models':
          return NextResponse.json(eeaModels());
        case 'scenarios':
          return NextResponse.json(eeaScenarios());
        case 'variables':
          return NextResponse.json(eeaVariables());
        case 'regions':
          return NextResponse.json(eeaRegions());
        case 'runs':
          return NextResponse.json(eeaRuns());
        case 'datapoints': {
          const variableParam = sp.get('variables') || sp.get('variable') || '';
          const regionParam = sp.get('regions') || sp.get('region') || '';
          const runIds = sp.get('runs')?.split(',').map(Number).filter(Boolean) || [];
          if (!variableParam) {
            return NextResponse.json(
              { error: 'EEA: variables param is required' },
              { status: 400 },
            );
          }
          if (runIds.length > 0 && !runIds.includes(EEA_RUN_ID)) {
            return NextResponse.json({ data: [] });
          }
          const points = await fetchEeaVariable(variableParam, regionParam);
          return NextResponse.json({ data: points, source: 'EEA', historical: true });
        }
        default:
          return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
    } catch (err) {
      console.error('EEA proxy error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  // ── Eurostat handler (no IIASA proxy needed) ────────────────────────────
  if (dbKey === 'eurostat') {
    try {
      switch (action) {
        case 'models':
          return NextResponse.json(eurostatModels());
        case 'scenarios':
          return NextResponse.json(eurostatScenarios());
        case 'variables':
          return NextResponse.json(eurostatVariables());
        case 'grouped-variables':
          return NextResponse.json(eurostatGroupedVariables());
        case 'regions':
          return NextResponse.json(eurostatRegions());
        case 'tiered-regions':
          return NextResponse.json(eurostatTieredRegions());
        case 'runs':
          return NextResponse.json(eurostatRuns());
        case 'datapoints': {
          const variableParam = sp.get('variables') || sp.get('variable') || '';
          const regionParam = sp.get('regions') || sp.get('region') || '';
          const runIds = sp.get('runs')?.split(',').map(Number).filter(Boolean) || [];
          if (!variableParam) {
            return NextResponse.json(
              { error: 'Eurostat: variables param is required' },
              { status: 400 },
            );
          }
          // Eurostat has a single synthetic run; if the caller filtered by run id,
          // make sure that id is allowed (otherwise return empty so the chart hides).
          if (runIds.length > 0 && !runIds.includes(EUROSTAT_RUN_ID)) {
            return NextResponse.json({ data: [] });
          }
          const points = await fetchEurostatVariable(variableParam, regionParam);
          const eurostatDoi = points[0]?.eurostatDoi ?? null;
          const eurostatUrl = points[0]?.eurostatUrl ?? null;
          return NextResponse.json({ data: points, source: 'Eurostat', historical: true, eurostatDoi, eurostatUrl });
        }
        default:
          return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
      }
    } catch (err) {
      console.error('Eurostat proxy error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({ error: msg }, { status: 502 });
    }
  }

  try {
    const { url: baseUrl, isIxmp4 } = await resolveBaseUrl(dbKey);

    // Cacheable metadata actions (models, scenarios, variables, regions, runs)
    const cacheKey = `${dbKey}:${action}`;
    const cached = getCached(cacheKey);
    if (cached && ['models', 'scenarios', 'variables', 'regions', 'runs'].includes(action)) {
      return NextResponse.json(cached, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
      });
    }

    switch (action) {
      case 'models': {
        let result;
        if (isIxmp4) {
          const data = await ixmp4Models(baseUrl);
          result = parseNames(data);
        } else {
          const runs = parseRuns(await legacyRuns(baseUrl));
          result = [...new Set(runs.map((r) => r.model))].sort();
        }
        setCache(cacheKey, result);
        return NextResponse.json(result, {
          headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
        });
      }

      case 'scenarios': {
        let result;
        if (isIxmp4) {
          const data = await ixmp4Scenarios(baseUrl);
          result = parseNames(data);
        } else {
          const runs = parseRuns(await legacyRuns(baseUrl));
          result = [...new Set(runs.map((r) => r.scenario))].sort();
        }
        setCache(cacheKey, result);
        return NextResponse.json(result, {
          headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
        });
      }

      case 'variables': {
        let result;
        if (isIxmp4) {
          const data = await ixmp4Variables(baseUrl);
          result = parseNames(data, 'variables-ixmp4');
        } else {
          const data = await legacyVariables(baseUrl);
          result = parseNames(data, 'variables-legacy');
        }
        setCache(cacheKey, result);
        return NextResponse.json(result, {
          headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
        });
      }

      case 'regions': {
        let result;
        if (isIxmp4) {
          const data = await ixmp4Regions(baseUrl);
          result = parseNames(data, 'regions-ixmp4');
        } else {
          const data = await legacyRegions(baseUrl);
          result = parseNames(data);
        }
        setCache(cacheKey, result);
        return NextResponse.json(result, {
          headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
        });
      }

      case 'runs': {
        let result;
        if (isIxmp4) {
          const data = await ixmp4Runs(baseUrl);
          result = parseRuns(data);
        } else {
          const data = await legacyRuns(baseUrl);
          result = parseRuns(data);
        }
        setCache(cacheKey, result);
        return NextResponse.json(result, {
          headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
        });
      }

      case 'datapoints': {
        const runIds = sp.get('runs')?.split(',').map(Number).filter(Boolean) || [];
        // Variables and regions can contain commas (e.g. "Eastern and Western Europe (i.e., the EU28)")
        // so read them as single values, not comma-separated
        const variableParam = sp.get('variables') || sp.get('variable') || '';
        const regionParam = sp.get('regions') || sp.get('region') || '';
        const variables = variableParam ? [variableParam] : [];
        const regions = regionParam ? [regionParam] : [];

        if (!runIds.length || !variables.length) {
          return NextResponse.json(
            { error: 'Required query params: runs (comma-separated IDs) and variables' },
            { status: 400 }
          );
        }

        if (isIxmp4) {
          const data = await ixmp4Datapoints(baseUrl, { runs: runIds, variables, regions });
          return NextResponse.json(data);
        }
        const data = await legacyDatapoints(baseUrl, { runs: runIds, variables, regions });
        return NextResponse.json(data);
      }

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }
  } catch (err) {
    console.error('IIASA proxy error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
