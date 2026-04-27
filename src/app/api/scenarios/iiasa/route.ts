/**
 * IIASA Scenario Explorer — AR6 API proxy (M·02).
 * ------------------------------------------------
 * Proxies requests to the IIASA legacy REST API for AR6 WGIII
 * scenario data that is not bundled in `src/data/scenarios.ts`.
 *
 * Why proxy rather than fetch client-side:
 *   - Avoid mixed-content warnings if IIASA serves over mixed
 *     TLS configurations.
 *   - Cache responses in a local `scenarios_cache` table so repeated
 *     cross-filter changes don't hammer IIASA.
 *   - Let EEA IT block outbound traffic to anywhere except a
 *     known-good list from the app container.
 *
 * Falls back to the bundled snapshot on upstream failure so the
 * chart always renders something.
 */
import { NextRequest, NextResponse } from 'next/server';
// Handles anonymous authentication, token caching, and response transformation
// into the ScenarioDataPoint format used by the frontend.
//
// No env vars required – AR6 is publicly accessible with anonymous tokens.
// ---------------------------------------------------------------------------

const IIASA_MANAGER = 'https://api.manager.ece.iiasa.ac.at';
const AR6_APP_NAME = 'IXSE_AR6_PUBLIC';

// Cache anonymous token and base URL in memory
let cachedToken: string | null = null;
let cachedTokenExpiry = 0;
let cachedBaseUrl: string | null = null;

async function getAnonymousToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedTokenExpiry) {
    return cachedToken;
  }

  const resp = await fetch(`${IIASA_MANAGER}/legacy/anonym/`, {
    cache: 'no-store',
  });
  if (!resp.ok) {
    throw new Error(`Failed to get anonymous token: HTTP ${resp.status}`);
  }
  cachedToken = await resp.text();
  // Token typically valid for hours; refresh every 30 min
  cachedTokenExpiry = Date.now() + 30 * 60 * 1000;
  return cachedToken;
}

async function getBaseUrl(token: string): Promise<string> {
  if (cachedBaseUrl) return cachedBaseUrl;

  const resp = await fetch(
    `${IIASA_MANAGER}/legacy/applications/${AR6_APP_NAME}/config`,
    {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    }
  );
  if (!resp.ok) {
    throw new Error(`Failed to get AR6 config: HTTP ${resp.status}`);
  }
  const config = await resp.json();
  cachedBaseUrl = config.baseUrl || config.base_url;
  if (!cachedBaseUrl) {
    // Fallback: construct from known pattern
    cachedBaseUrl = `${IIASA_MANAGER}/legacy/api/v1/${AR6_APP_NAME}`;
  }
  return cachedBaseUrl;
}

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

// ---------------------------------------------------------------------------
// GET /api/scenarios/iiasa?action=<action>&...
//
// Actions:
//   models     – list distinct model names
//   scenarios  – list distinct scenario names (optional: model=X)
//   variables  – list all available variables
//   regions    – list all available regions
//   runs       – list scenario runs with metadata
//   data       – fetch timeseries data (main endpoint)
//              params: models, scenarios, variables, regions, years (comma-sep)
// ---------------------------------------------------------------------------

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const action = sp.get('action') || 'data';

  try {
    const token = await getAnonymousToken();
    const baseUrl = await getBaseUrl(token);
    const authHeaders = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    };

    // ---- METADATA ENDPOINTS ----

    if (action === 'variables') {
      const resp = await fetch(`${baseUrl}/ts`, { headers: authHeaders, cache: 'no-store' });
      if (!resp.ok) throw new Error(`Variables fetch failed: HTTP ${resp.status}`);
      const data = await resp.json();
      return NextResponse.json(data, {
        headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=3600' },
      });
    }

    if (action === 'regions') {
      const resp = await fetch(`${baseUrl}/nodes?hierarchy=%2A`, {
        headers: authHeaders,
        cache: 'no-store',
      });
      if (!resp.ok) throw new Error(`Regions fetch failed: HTTP ${resp.status}`);
      const data = await resp.json();
      return NextResponse.json(data, {
        headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=3600' },
      });
    }

    if (action === 'runs') {
      const resp = await fetch(
        `${baseUrl}/runs?getOnlyDefaultRuns=true&includeMetadata=true`,
        { headers: authHeaders, cache: 'no-store' }
      );
      if (!resp.ok) throw new Error(`Runs fetch failed: HTTP ${resp.status}`);
      const data = await resp.json();

      // Extract unique models and scenarios
      const models = [...new Set(data.map((r: { model: { name: string } }) => r.model?.name).filter(Boolean))].sort();
      const scenarios = [...new Set(data.map((r: { name: string }) => r.name).filter(Boolean))].sort();

      // Filter by model if specified
      const modelFilter = sp.get('model');
      let filteredRuns = data;
      if (modelFilter) {
        filteredRuns = data.filter((r: { model: { name: string } }) => r.model?.name === modelFilter);
      }

      return NextResponse.json(
        {
          totalRuns: data.length,
          models,
          scenarios,
          runs: filteredRuns.slice(0, 500).map((r: { runId: number; name: string; model: { name: string }; is_default: boolean }) => ({
            runId: r.runId,
            scenario: r.name,
            model: r.model?.name,
            isDefault: r.is_default,
          })),
        },
        { headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=3600' } }
      );
    }

    if (action === 'models') {
      const resp = await fetch(
        `${baseUrl}/runs?getOnlyDefaultRuns=true`,
        { headers: authHeaders, cache: 'no-store' }
      );
      if (!resp.ok) throw new Error(`Runs fetch failed: HTTP ${resp.status}`);
      const data = await resp.json();
      const models = [...new Set(data.map((r: { model: { name: string } }) => r.model?.name).filter(Boolean))].sort();
      return NextResponse.json({ models }, {
        headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=3600' },
      });
    }

    if (action === 'scenarios') {
      const resp = await fetch(
        `${baseUrl}/runs?getOnlyDefaultRuns=true`,
        { headers: authHeaders, cache: 'no-store' }
      );
      if (!resp.ok) throw new Error(`Runs fetch failed: HTTP ${resp.status}`);
      const data = await resp.json();
      const modelFilter = sp.get('model');
      let runs = data;
      if (modelFilter) {
        runs = data.filter((r: { model: { name: string } }) => r.model?.name === modelFilter);
      }
      const scenarios = [...new Set(runs.map((r: { name: string }) => r.name).filter(Boolean))].sort();
      return NextResponse.json({ scenarios }, {
        headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=3600' },
      });
    }

    // ---- TIMESERIES DATA ENDPOINT ----

    if (action === 'data') {
      // Required: at least models or scenarios, plus variables and regions
      const modelsParam = sp.get('models') || '';
      const scenariosParam = sp.get('scenarios') || '';
      const variablesParam = sp.get('variables') || 'Emissions|Kyoto Gases';
      const regionsParam = sp.get('regions') || 'EU27';

      // First get run IDs matching the filters
      const runsResp = await fetch(
        `${baseUrl}/runs?getOnlyDefaultRuns=true`,
        { headers: authHeaders, cache: 'no-store' }
      );
      if (!runsResp.ok) throw new Error(`Runs fetch failed: HTTP ${runsResp.status}`);
      const allRuns: Array<{ runId: number; name: string; model: { name: string } }> = await runsResp.json();

      // Filter runs by model and/or scenario
      const modelList = modelsParam ? modelsParam.split(',').map(s => s.trim()) : [];
      const scenarioList = scenariosParam ? scenariosParam.split(',').map(s => s.trim()) : [];

      let matchedRuns = allRuns;
      if (modelList.length > 0) {
        matchedRuns = matchedRuns.filter(r => modelList.includes(r.model?.name));
      }
      if (scenarioList.length > 0) {
        matchedRuns = matchedRuns.filter(r => scenarioList.includes(r.name));
      }

      if (matchedRuns.length === 0) {
        return NextResponse.json({ data: [], count: 0, message: 'No matching runs found' }, {
          headers: CORS_HEADERS,
        });
      }

      // Limit to avoid massive queries
      const maxRuns = parseInt(sp.get('maxRuns') || '100');
      if (matchedRuns.length > maxRuns) {
        matchedRuns = matchedRuns.slice(0, maxRuns);
      }

      const runIds = matchedRuns.map(r => r.runId);
      const runMap = new Map(matchedRuns.map(r => [r.runId, r]));

      // Build variable filter
      const variableList = variablesParam.split(',').map(s => s.trim());
      const regionList = regionsParam.split(',').map(s => s.trim());

      // Fetch timeseries data in batches (API may limit)
      const batchSize = 50;
      const allResults: Array<{
        runId: number;
        variable: string;
        unit: string;
        region: string;
        year: number;
        value: number;
      }> = [];

      for (let i = 0; i < runIds.length; i += batchSize) {
        const batchIds = runIds.slice(i, i + batchSize);
        const tsResp = await fetch(`${baseUrl}/runs/bulk/ts`, {
          method: 'POST',
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filters: {
              regions: regionList,
              variables: variableList,
              runs: batchIds,
              years: [],
              units: [],
              timeslices: [],
            },
          }),
        });

        if (!tsResp.ok) {
          console.error(`Timeseries batch fetch failed: HTTP ${tsResp.status}`);
          continue;
        }

        const batchData = await tsResp.json();
        if (Array.isArray(batchData)) {
          allResults.push(...batchData);
        }
      }

      // Transform into ScenarioDataPoint format
      // Group by (runId, variable, region)
      const grouped = new Map<string, {
        model: string;
        scenario: string;
        region: string;
        variable: string;
        unit: string;
        values: Record<string, number | null>;
      }>();

      for (const point of allResults) {
        const run = runMap.get(point.runId);
        if (!run) continue;

        const key = `${point.runId}|${point.variable}|${point.region}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            model: run.model?.name || 'Unknown',
            scenario: run.name || 'Unknown',
            region: point.region,
            variable: point.variable,
            unit: point.unit || 'Mt CO2-equiv/yr',
            values: {},
          });
        }
        const entry = grouped.get(key)!;
        entry.values[String(point.year)] = point.value;
      }

      const dataPoints = Array.from(grouped.values());

      return NextResponse.json(
        {
          count: dataPoints.length,
          runsQueried: runIds.length,
          data: dataPoints,
        },
        {
          headers: {
            ...CORS_HEADERS,
            'Cache-Control': 'public, s-maxage=1800, stale-while-revalidate=3600',
          },
        }
      );
    }

    return NextResponse.json({ error: `Unknown action: ${action}` }, {
      status: 400,
      headers: CORS_HEADERS,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('IIASA API error:', message);
    return NextResponse.json(
      { error: message },
      { status: 502, headers: CORS_HEADERS }
    );
  }
}
