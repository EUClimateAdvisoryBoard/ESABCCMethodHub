import { NextRequest, NextResponse } from 'next/server';
import { scenarios as staticScenarios, ScenarioDataPoint } from '@/data/scenarios';

// ---------------------------------------------------------------------------
// AR6 Scenario Data API – combines static data with live IIASA queries
//
// GET /api/scenarios/ar6
//   Returns the local static dataset by default.
//   Add ?source=iiasa to proxy a live query to IIASA (slower, more data).
//   Add ?models=X,Y&regions=Z to filter.
//
// This endpoint lets the frontend work fast with static data while
// optionally pulling fresh AR6 data from IIASA on demand.
// ---------------------------------------------------------------------------

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET',
};

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const source = sp.get('source') || 'static';
  const modelsFilter = sp.get('models')?.split(',').map(s => s.trim()) || [];
  const searchFilter = sp.get('q')?.toLowerCase() || '';
  const regionFilter = sp.get('regions') || '';

  // ---- STATIC DATA (default, fast) ----
  if (source === 'static') {
    let data: ScenarioDataPoint[] = staticScenarios;

    if (modelsFilter.length > 0) {
      data = data.filter(d => modelsFilter.includes(d.model));
    }
    if (searchFilter) {
      data = data.filter(d =>
        d.model.toLowerCase().includes(searchFilter) ||
        d.scenario.toLowerCase().includes(searchFilter)
      );
    }

    const models = [...new Set(data.map(d => d.model))].sort();
    const years = data.length > 0 ? Object.keys(data[0].values).sort() : [];

    return NextResponse.json({
      source: 'static',
      count: data.length,
      models,
      years,
      data,
    }, {
      headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=600' },
    });
  }

  // ---- LIVE IIASA DATA ----
  if (source === 'iiasa') {
    try {
      // Build the proxy URL to our own IIASA endpoint
      const baseUrl = request.nextUrl.origin || process.env.VERCEL_URL
        ? `https://${process.env.VERCEL_URL}`
        : 'http://localhost:3000';

      const params = new URLSearchParams({ action: 'data' });
      if (modelsFilter.length > 0) params.set('models', modelsFilter.join(','));
      if (regionFilter) params.set('regions', regionFilter);

      // Default to EU27 Kyoto Gases if not specified
      if (!sp.get('variables')) {
        params.set('variables', 'Emissions|Kyoto Gases');
      } else {
        params.set('variables', sp.get('variables')!);
      }

      const scenariosParam = sp.get('scenarios');
      if (scenariosParam) params.set('scenarios', scenariosParam);
      if (sp.get('maxRuns')) params.set('maxRuns', sp.get('maxRuns')!);

      const iiasaResp = await fetch(`${baseUrl}/api/scenarios/iiasa?${params}`, {
        cache: 'no-store',
      });

      if (!iiasaResp.ok) {
        const errText = await iiasaResp.text();
        throw new Error(`IIASA proxy returned ${iiasaResp.status}: ${errText}`);
      }

      const iiasaData = await iiasaResp.json();

      return NextResponse.json({
        source: 'iiasa',
        count: iiasaData.count || 0,
        runsQueried: iiasaData.runsQueried || 0,
        models: [...new Set((iiasaData.data || []).map((d: ScenarioDataPoint) => d.model))].sort(),
        data: iiasaData.data || [],
      }, {
        headers: { ...CORS_HEADERS, 'Cache-Control': 'public, s-maxage=1800' },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return NextResponse.json({
        source: 'iiasa',
        error: message,
        fallback: 'static',
        count: staticScenarios.length,
        data: staticScenarios,
      }, {
        status: 200, // Return static as fallback, don't fail
        headers: CORS_HEADERS,
      });
    }
  }

  return NextResponse.json(
    { error: 'Invalid source. Use "static" or "iiasa".' },
    { status: 400, headers: CORS_HEADERS }
  );
}
