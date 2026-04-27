import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * Paginated list of social posts (LinkedIn by default).
 *
 * Query params:
 *   ?platform=linkedin    filter by platform
 *   ?keyword=ESABCC       filter by matched keyword
 *   ?report=<slug>        filter by ESABCC report cluster
 *   ?author=<handle>      filter by author handle
 *   ?board_only=1         only posts from sources flagged is_board_member
 *   ?since=2024-01-01     lower bound on posted_at
 *   ?limit=50&offset=0
 *   ?sort=recent|reach    default recent
 */
export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) return NextResponse.json({ items: [], total: 0 });

  const url = new URL(request.url);
  const platform = url.searchParams.get('platform');
  const keyword = url.searchParams.get('keyword');
  const report = url.searchParams.get('report');
  const author = url.searchParams.get('author');
  const boardOnly = url.searchParams.get('board_only') === '1';
  const since = url.searchParams.get('since');
  const sort = url.searchParams.get('sort') || 'recent';
  const limit = Math.min(Number(url.searchParams.get('limit')) || 50, 500);
  const offset = Math.max(Number(url.searchParams.get('offset')) || 0, 0);

  let query = supabase
    .from('media_social_posts')
    .select('*', { count: 'exact' });

  if (platform) query = query.eq('platform', platform);
  if (keyword) query = query.contains('matched_keywords', [keyword]);
  if (report) query = query.contains('matched_report_slugs', [report]);
  if (author) query = query.eq('author_handle', author);
  if (since) query = query.gte('posted_at', since);

  // "Board only" requires a join into media_social_sources
  if (boardOnly) {
    const { data: boardSources } = await supabase
      .from('media_social_sources')
      .select('id')
      .eq('is_board_member', true);
    const ids = (boardSources ?? []).map((r) => r.id);
    if (ids.length === 0) return NextResponse.json({ items: [], total: 0 });
    query = query.in('source_id', ids);
  }

  const primary = sort === 'reach' ? 'estimated_reach' : 'posted_at';
  query = query
    .order(primary, { ascending: false, nullsFirst: false })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('[media-monitoring] social GET error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Attach source metadata in one batched query
  const sourceIds = Array.from(
    new Set((data ?? []).map((p) => p.source_id).filter(Boolean) as string[]),
  );
  const sourceById: Record<string, { display_name: string | null; profile_url: string | null; is_board_member: boolean }> = {};
  if (sourceIds.length > 0) {
    const { data: sources } = await supabase
      .from('media_social_sources')
      .select('id,display_name,profile_url,is_board_member')
      .in('id', sourceIds);
    for (const s of sources ?? []) {
      sourceById[s.id] = {
        display_name: s.display_name,
        profile_url: s.profile_url,
        is_board_member: !!s.is_board_member,
      };
    }
  }

  const items = (data ?? []).map((p) => ({
    ...p,
    source: p.source_id ? sourceById[p.source_id] ?? null : null,
  }));

  return NextResponse.json({
    items,
    total: count ?? 0,
    limit,
    offset,
  });
}
