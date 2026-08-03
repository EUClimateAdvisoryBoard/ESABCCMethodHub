import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { ESABCC_REPORTS } from '@/data/esabcc-reports';

/**
 * Per-report traction summary. For each ESABCC report we return:
 *   - press_count / press_reach: articles tagged with the report slug
 *   - last_press_at: freshness
 *
 * Used by the Reports tab on the media-monitoring dashboard so board members
 * can see at a glance which publication is currently driving the most
 * coverage. Counts span the whole pool — alert and RSS feeds plus the weekly
 * Newton Media import — since all of it lands in `media_articles`.
 *
 * Query params:
 *   ?days=180          optional cut-off (default: all time)
 *
 * Rows are fetched with keyset/offset paging (1000 rows/page, hard safety
 * cap of 20000 rows) instead of a single `.limit()`, so windows with more
 * rows than one page aren't silently under-reported. If the cap is hit,
 * `truncated` is set on the response so the client can surface a warning. The queries no longer filter
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
        last_press_at: null,
      })),
      truncated: false,
    });
  }

  type ArticleRow = { matched_report_slugs: string[] | null; estimated_reach: number | null; published_at: string | null };

  const buildPressPage = (from: number, to: number) => {
    let q = supabase
      .from('media_articles')
      .select('matched_report_slugs,estimated_reach,published_at')
      .range(from, to);
    if (since) q = q.gte('published_at', since);
    return q as unknown as PromiseLike<PageResult<ArticleRow>>;
  };

  let articles: ArticleRow[];
  let truncated = false;
  try {
    const pressResult = await fetchAllPaged(buildPressPage);
    articles = pressResult.rows;
    truncated = pressResult.truncated;
  } catch (error) {
    console.error('[media-monitoring] reports error', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }

  type Bucket = {
    press_count: number;
    press_reach: number;
    last_press_at: string | null;
  };
  const buckets = new Map<string, Bucket>();
  const ensure = (slug: string): Bucket => {
    let b = buckets.get(slug);
    if (!b) {
      b = { press_count: 0, press_reach: 0, last_press_at: null };
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
  const reports = ESABCC_REPORTS.map((r) => {
    const b = buckets.get(r.slug) ?? {
      press_count: 0,
      press_reach: 0,
      last_press_at: null,
    };
    return { ...r, ...b };
  }).sort((a, b) => b.published_on.localeCompare(a.published_on));

  return NextResponse.json({ reports, days: days || null, truncated });
}
