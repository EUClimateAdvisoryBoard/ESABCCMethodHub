import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ESABCC_REPORT_BY_SLUG } from '@/data/esabcc-reports';

/**
 * Per-report detail endpoint.
 *
 * Returns the report metadata plus every article tagged with this slug, so
 * the /media-monitoring/reports/[slug] page can render a timeline board
 * members can share. Coverage spans the whole pool — alert and RSS feeds
 * plus the weekly Newton Media import.
 *
 * Query params:
 *   ?limit=100   max items (default 500, capped at 2000)
 *   ?days=180    optional cut-off — only items published in the last N days
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
    return NextResponse.json({ report, articles: [] });
  }

  let articlesQuery = supabase
    .from('media_articles')
    .select('*')
    .contains('matched_report_slugs', [report.slug])
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(limit);
  if (since) articlesQuery = articlesQuery.gte('published_at', since);

  const { data: articles } = await articlesQuery;

  // Daily timeline for the chart.
  const dailyMap = new Map<string, { date: string; press: number }>();
  (articles ?? []).forEach((a) => {
    if (!a.published_at) return;
    const d = a.published_at.slice(0, 10);
    const bucket = dailyMap.get(d) ?? { date: d, press: 0 };
    bucket.press += 1;
    dailyMap.set(d, bucket);
  });
  const timeline = Array.from(dailyMap.values()).sort((a, b) =>
    a.date.localeCompare(b.date),
  );

  return NextResponse.json({
    report,
    articles: articles ?? [],
    timeline,
    summary: {
      press_count: articles?.length ?? 0,
      press_reach:
        (articles ?? []).reduce(
          (s, a) => s + (Number(a.estimated_reach) || 0),
          0,
        ),
    },
  });
}
