import { NextRequest, NextResponse } from 'next/server';
import {
  fetchAllProjections,
  fetchIndicatorProjections,
  getProjectionMapping,
  hasProjectionMapping,
} from '@/lib/scenarios/eea-projections';

/**
 * EEA GHG Projections API route.
 *
 * Fetches WEM (With Existing Measures) and WAM (With Additional Measures)
 * projections from the EEA Discodata SQL API, with a static fallback
 * derived from the EEA "Trends and Projections in Europe 2024" report.
 *
 * Query params:
 *   - indicator: fetch projections for a single indicator (e.g. "o1-total-ghg")
 *   - (none):    fetch projections for all mapped indicators
 */

// Server-side cache (30 min TTL)
let cache: { data: unknown; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const indicator = sp.get('indicator');

  try {
    if (indicator) {
      // Single indicator
      if (!hasProjectionMapping(indicator)) {
        return NextResponse.json(
          { error: `No projection mapping for indicator "${indicator}"` },
          { status: 404 },
        );
      }
      const mapping = getProjectionMapping(indicator)!;
      const data = await fetchIndicatorProjections(mapping);
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
      });
    }

    // All indicators — use cache
    if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
      return NextResponse.json(cache.data, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
      });
    }

    const data = await fetchAllProjections();
    cache = { data, timestamp: Date.now() };

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  } catch (err) {
    console.error('EEA projections error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
