import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ESABCC_REPORT_BY_SLUG } from '@/data/esabcc-reports';

/**
 * Per-report detail endpoint.
 *
 * Returns the report metadata plus the press articles and social posts that
 * have been tagged with this slug, so the /media-monitoring/reports/[slug]
 * page can render a combined timeline board members can share.
 *
 * Query params:
 *   ?limit=100   max items per channel (default 500, capped at 2000)
 *   ?days=180    optional cut-off — only items published/posted in the last N days
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } },
) {
  const report = ESABCC_REPORT_BY_SLUG.get(params.slug);
  if (!report) {
    return NextResponse.json({ error: 'Unknown report' }, { status: 404 });
  }

  const supabase = getServerSupabase();
  const url = new URL(request.url);
  const limit = Math.min(Number(url.searchParams.get('limit')) || 500, 2000);
  const daysParam = url.searchParams.get('days');
  const days = daysParam ? Math.max(Number(daysParam) || 0, 0) : 0;
  const since = days > 0
    ? new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
    : null;

  if (!supabase) {
    return NextResponse.json({ report, articles: [], posts: [] });
  }

  let articlesQuery = supabase
    .from('media_articles')
    .select('*')
    .contains('matched_report_slugs', [report.slug])
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (since) articlesQuery = articlesQuery.gte('published_at', since);

  let postsQuery = supabase
    .from('media_social_posts')
    .select('*')
    .contains('matched_report_slugs', [report.slug])
    .order('posted_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (since) postsQuery = postsQuery.gte('posted_at', since);

  const [{ data: articles }, { data: posts }] = await Promise.all([
    articlesQuery,
    postsQuery,
  ]);

  // Daily timeline across both channels for a combined chart
  const dailyMap = new Map<
    string,
    { date: string; press: number; social: number }
  >();
  const addToDay = (
    raw: string | null,
    key: 'press' | 'social',
  ) => {
    if (!raw) return;
    const d = raw.slice(0, 10);
    const bucket = dailyMap.get(d) ?? { date: d, press: 0, social: 0 };
    bucket[key] += 1;
    dailyMap.set(d, bucket);
  };
  (articles ?? []).forEach((a) => addToDay(a.published_at, 'press'));
  (posts ?? []).forEach((p) => addToDay(p.posted_at, 'social'));
  const timeline = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return NextResponse.json({
    report,
    articles: articles ?? [],
    posts: posts ?? [],
    timeline,
    summary: {
      press_count: articles?.length ?? 0,
      social_count: posts?.length ?? 0,
      press_reach:
        (articles ?? []).reduce(
          (s, a) => s + (Number(a.estimated_reach) || 0),
          0,
        ),
      social_reach:
        (posts ?? []).reduce(
          (s, p) => s + (Number(p.estimated_reach) || 0),
          0,
        ),
    },
  });
}
