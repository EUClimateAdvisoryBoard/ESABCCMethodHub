import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * Paginated list of media articles.
 *
 * Query params:
 *   ?keyword=ESABCC          — filter by matched keyword text
 *   ?country=DE              — ISO-3166 alpha-2 country
 *   ?since=2024-01-01        — lower bound on published_at
 *   ?until=2024-12-31        — upper bound
 *   ?outlet=politico.eu      — outlet domain
 *   ?min_reach=1000000       — only outlets with >= N estimated readers
 *   ?tier=global,national    — comma-separated tiers to include
 *   ?known_only=1            — only articles from outlets in media_outlets
 *   ?limit=50&offset=0       — pagination
 *   ?sort=reach|published    — default 'reach' so reputable outlets rank first
 */
export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ items: [], total: 0 });
  }
  const url = new URL(request.url);
  const keyword = url.searchParams.get('keyword');
  const country = url.searchParams.get('country');
  const since = url.searchParams.get('since');
  const until = url.searchParams.get('until');
  const outlet = url.searchParams.get('outlet');
  const minReach = Number(url.searchParams.get('min_reach')) || 0;
  const tierParam = url.searchParams.get('tier');
  const tiers = tierParam
    ? tierParam.split(',').map((t) => t.trim()).filter(Boolean)
    : null;
  const knownOnly = url.searchParams.get('known_only') === '1';
  const sort = url.searchParams.get('sort') || 'reach';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

  let query = supabase
    .from('media_articles')
    .select('*', { count: 'exact' });

  if (keyword) query = query.contains('matched_keywords', [keyword]);
  if (country) query = query.eq('country', country);
  if (outlet) query = query.eq('outlet_domain', outlet);
  if (since) query = query.gte('published_at', since);
  if (until) query = query.lte('published_at', until);
  if (minReach > 0) query = query.gte('estimated_reach', minReach);
  if (knownOnly) query = query.not('outlet_id', 'is', null);

  // Tier filtering requires a join — do it via the FK to media_outlets
  if (tiers && tiers.length > 0) {
    const { data: outletRows } = await supabase
      .from('media_outlets')
      .select('id,tier')
      .in('tier', tiers);
    const allowedIds = (outletRows ?? []).map((r) => r.id);
    if (allowedIds.length === 0) {
      return NextResponse.json({ items: [], total: 0, limit, offset });
    }
    query = query.in('outlet_id', allowedIds);
  }

  const primarySort = sort === 'published' ? 'published_at' : 'estimated_reach';
  const secondarySort = sort === 'published' ? 'estimated_reach' : 'published_at';
  query = query
    .order(primarySort, { ascending: false, nullsFirst: false })
    .order(secondarySort, { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[media-monitoring] articles GET error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    items: data ?? [],
    total: count ?? 0,
    limit,
    offset,
  });
}
