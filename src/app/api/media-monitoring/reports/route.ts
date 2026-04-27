import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ESABCC_REPORTS } from '@/data/esabcc-reports';

/**
 * Per-report traction summary. For each ESABCC report we return:
 *   - press_count / press_reach: articles tagged with the report slug
 *   - social_count / social_reach: LinkedIn (and other) posts tagged likewise
 *   - last_press_at / last_social_at: freshness
 *
 * Used by the Reports tab on the media-monitoring dashboard so board members
 * can see at a glance which publication is currently driving the most
 * coverage across press and social channels.
 *
 * Query params:
 *   ?days=180          optional cut-off (default: all time)
 */
export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  const url = new URL(request.url);
  const daysParam = url.searchParams.get('days');
  const days = daysParam ? Math.max(Number(daysParam) || 0, 0) : 0;
  const since = days > 0
    ? new Date(Date.now() - days * 24 * 3600 * 1000).toISOString()
    : null;

  if (!supabase) {
    return NextResponse.json({
      reports: ESABCC_REPORTS.map((r) => ({
        ...r,
        press_count: 0,
        press_reach: 0,
        social_count: 0,
        social_reach: 0,
        last_press_at: null,
        last_social_at: null,
      })),
    });
  }

  // Press articles
  let pressQuery = supabase
    .from('media_articles')
    .select('matched_report_slugs,estimated_reach,published_at')
    .not('matched_report_slugs', 'eq', '{}')
    .limit(10000);
  if (since) pressQuery = pressQuery.gte('published_at', since);
  const { data: articles } = await pressQuery;

  // Social posts
  let socialQuery = supabase
    .from('media_social_posts')
    .select('matched_report_slugs,estimated_reach,posted_at')
    .not('matched_report_slugs', 'eq', '{}')
    .limit(10000);
  if (since) socialQuery = socialQuery.gte('posted_at', since);
  const { data: posts } = await socialQuery;

  type Bucket = {
    press_count: number;
    press_reach: number;
    social_count: number;
    social_reach: number;
    last_press_at: string | null;
    last_social_at: string | null;
  };
  const buckets = new Map<string, Bucket>();
  const ensure = (slug: string): Bucket => {
    let b = buckets.get(slug);
    if (!b) {
      b = {
        press_count: 0,
        press_reach: 0,
        social_count: 0,
        social_reach: 0,
        last_press_at: null,
        last_social_at: null,
      };
      buckets.set(slug, b);
    }
    return b;
  };

  for (const a of articles ?? []) {
    for (const slug of a.matched_report_slugs ?? []) {
      const b = ensure(slug);
      b.press_count += 1;
      b.press_reach += Number(a.estimated_reach) || 0;
      if (a.published_at && (!b.last_press_at || a.published_at > b.last_press_at)) {
        b.last_press_at = a.published_at;
      }
    }
  }
  for (const p of posts ?? []) {
    for (const slug of p.matched_report_slugs ?? []) {
      const b = ensure(slug);
      b.social_count += 1;
      b.social_reach += Number(p.estimated_reach) || 0;
      if (p.posted_at && (!b.last_social_at || p.posted_at > b.last_social_at)) {
        b.last_social_at = p.posted_at;
      }
    }
  }

  const reports = ESABCC_REPORTS.map((r) => {
    const b = buckets.get(r.slug) ?? {
      press_count: 0,
      press_reach: 0,
      social_count: 0,
      social_reach: 0,
      last_press_at: null,
      last_social_at: null,
    };
    return { ...r, ...b };
  }).sort((a, b) => b.published_on.localeCompare(a.published_on));

  return NextResponse.json({ reports, days: days || null });
}
