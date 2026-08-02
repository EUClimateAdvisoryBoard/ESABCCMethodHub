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
 *
 * Press and social rows are fetched with keyset/offset paging (1000
 * rows/page, hard safety cap of 20000 rows each) instead of a single
 * `.limit()`, so windows with more rows than one page aren't silently
 * under-reported. If either channel hits the cap, `truncated` is set on the
 * response so the client can surface a warning. The queries no longer filter
 * `matched_report_slugs <> '{}'` server-side (that comparison can't use the
 * GIN index and forces a sequential scan) — rows with no matched slugs are
 * simply a no-op in the app-side bucketing loop below, so skipping the
 * filter is correctness-neutral.
 */
const PAGE_SIZE = 1000;
const HARD_CAP = 20000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

/** Pages through a Supabase query via `.range()` until a short page or the hard cap. */
async function fetchAllPaged<T>(
  fetchPage: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ rows: T[]; truncated: boolean }> {
  const rows: T[] = [];
  let truncated = false;
  for (let from = 0; from < HARD_CAP; from += PAGE_SIZE) {
    const to = Math.min(from + PAGE_SIZE, HARD_CAP) - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) throw new Error(error.message);
    const page = data ?? [];
    rows.push(...page);
    if (page.length < to - from + 1) break; // short page — reached the end
    if (rows.length >= HARD_CAP) {
      truncated = true;
      break;
    }
  }
  return { rows, truncated };
}

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
      truncated: false,
    });
  }

  type ArticleRow = { matched_report_slugs: string[] | null; estimated_reach: number | null; published_at: string | null };
  type PostRow = { matched_report_slugs: string[] | null; estimated_reach: number | null; posted_at: string | null };

  const buildPressPage = (from: number, to: number) => {
    let q = supabase
      .from('media_articles')
      .select('matched_report_slugs,estimated_reach,published_at')
      .range(from, to);
    if (since) q = q.gte('published_at', since);
    return q as unknown as PromiseLike<PageResult<ArticleRow>>;
  };

  const buildSocialPage = (from: number, to: number) => {
    let q = supabase
      .from('media_social_posts')
      .select('matched_report_slugs,estimated_reach,posted_at')
      .range(from, to);
    if (since) q = q.gte('posted_at', since);
    return q as unknown as PromiseLike<PageResult<PostRow>>;
  };

  let articles: ArticleRow[];
  let posts: PostRow[];
  let truncated = false;
  try {
    const [pressResult, socialResult] = await Promise.all([
      fetchAllPaged(buildPressPage),
      fetchAllPaged(buildSocialPage),
    ]);
    articles = pressResult.rows;
    posts = socialResult.rows;
    truncated = pressResult.truncated || socialResult.truncated;
  } catch (error) {
    console.error('[media-monitoring] reports error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

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

  return NextResponse.json({ reports, days: days || null, truncated });
}
