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
 *   - geo:       ISO-2 Member State code (e.g. "DE") for country-level projections.
 *               Omit for EU-27 aggregate.
 *   - (none):   fetch projections for all mapped indicators at EU-27 level
 */

// Server-side cache (30 min TTL) — keyed by geo so MS and EU caches are separate
const cacheMap = new Map<string, { data: unknown; timestamp: number }>();
const CACHE_TTL = 30 * 60 * 1000;

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const indicator = sp.get('indicator');
  // null = EU-27 aggregate; ISO-2 string = Member State
  const geo = sp.get('geo') || null;
  const cacheKey = `${geo ?? 'EU27'}:${indicator ?? 'all'}`;

  try {
    if (indicator) {
      // Single indicator — no server-side cache for per-indicator requests
      if (!hasProjectionMapping(indicator)) {
        return NextResponse.json(
          { error: `No projection mapping for indicator "${indicator}"` },
          { status: 404 },
        );
      }
      const mapping = getProjectionMapping(indicator)!;
      const data = await fetchIndicatorProjections(mapping, undefined, geo);
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
      });
    }

    // All indicators — use per-geo cache
    const cached = cacheMap.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return NextResponse.json(cached.data, {
        headers: { 'X-Cache': 'HIT', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
      });
    }

    const data = await fetchAllProjections(undefined, geo);
    cacheMap.set(cacheKey, { data, timestamp: Date.now() });

    return NextResponse.json(data, {
      headers: { 'X-Cache': 'MISS', 'Cache-Control': 'public, max-age=1800, s-maxage=1800' },
    });
  } catch (err) {
    console.error('EEA projections error:', err);
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
