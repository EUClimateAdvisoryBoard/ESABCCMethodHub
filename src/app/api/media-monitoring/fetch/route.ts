import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import {
  fetchArticlesForKeywords,
  emptyFetchStats,
  mergeArticleSets,
  OUTLET_REGISTRY,
  type FetchedArticle,
  type MediaKeyword,
} from '@/lib/media-monitoring';
import {
  fetchPressFeeds,
  emptyPressFetchStats,
  type PressSource,
} from '@/lib/media-press-feeds';
import {
  matchReportsFromKeywords,
  matchReportsInText,
} from '@/data/esabcc-reports';

/**
 * Trigger a media monitoring fetch run.
 *
 * - Reads active keywords from `media_keywords`
 * - Pulls Google News RSS for each
 * - Upserts articles into `media_articles` (deduped on canonical URL)
 * - Writes an audit entry into `media_fetch_runs`
 *
 * Can be invoked:
 *   - manually from the dashboard (POST, requires `authoriseMediaMutation`)
 *   - from a scheduler / cron (GET with ?secret=<MEDIA_MONITORING_SECRET>)
 *
 * Both entry points share an overlap/rate guard (`checkFetchRunGuard`) so
 * a slow run can't be triggered twice concurrently and the dashboard can't
 * be used to hammer Google News: a 'press' run already `running` within
 * the last 15 minutes returns 409, and a channel that completed a run
 * less than 3 minutes ago returns 429 unless the request is the cron path
 * with a valid secret and `?force=true`.
 *
 * On first run it also seeds `media_outlets` from OUTLET_REGISTRY so the
 * dashboard has outlet metadata even without a manual import step.
 */

const FETCH_CHANNEL = 'press';
const RUNNING_OVERLAP_WINDOW_MS = 15 * 60 * 1000;
const COMPLETED_RATE_LIMIT_MS = 3 * 60 * 1000;

type RunGuardResult =
  | { ok: true }
  | { ok: false; status: number; body: { error: string } };

/**
 * Overlap/rate guard shared by the POST (dashboard) and GET (cron) paths.
 *  - 409 if a run for this channel is already `running` and started within
 *    the last 15 minutes (guards against overlapping/duplicate runs).
 *  - 429 if the most recent completed run for this channel finished less
 *    than 3 minutes ago, unless `allowForce` is set (only ever true for the
 *    cron path, after the shared secret has already been verified).
 */
async function checkFetchRunGuard(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
  channel: string,
  allowForce: boolean,
): Promise<RunGuardResult> {
  const overlapSince = new Date(Date.now() - RUNNING_OVERLAP_WINDOW_MS).toISOString();
  const { data: runningRow } = await supabase
    .from('media_fetch_runs')
    .select('id')
    .eq('channel', channel)
    .eq('status', 'running')
    .gte('started_at', overlapSince)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (runningRow) {
    return {
      ok: false,
      status: 409,
      body: { error: 'A fetch run is already in progress.' },
    };
  }

  if (!allowForce) {
    const { data: lastRun } = await supabase
      .from('media_fetch_runs')
      .select('finished_at')
      .eq('channel', channel)
      .not('finished_at', 'is', null)
      .order('finished_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (lastRun?.finished_at) {
      const elapsed = Date.now() - new Date(lastRun.finished_at).getTime();
      if (elapsed < COMPLETED_RATE_LIMIT_MS) {
        return {
          ok: false,
          status: 429,
          body: {
            error: 'Rate limited: this channel completed a fetch less than 3 minutes ago.',
          },
        };
      }
    }
  }

  return { ok: true };
}

async function seedOutletsIfEmpty(
  supabase: NonNullable<ReturnType<typeof getServerSupabase>>,
) {
  const { count } = await supabase
    .from('media_outlets')
    .select('id', { count: 'exact', head: true });
  if ((count ?? 0) > 0) return;

  const rows = OUTLET_REGISTRY.map((o) => ({
    domain: o.domain,
    name: o.name,
    country: o.country,
    country_name: o.country_name,
    tier: o.tier,
    language: o.language,
    estimated_readership: o.estimated_readership,
    reach_score: o.reach_score,
    latitude: o.latitude,
    longitude: o.longitude,
  }));
  const { error } = await supabase.from('media_outlets').insert(rows);
  if (error) console.warn('[media-monitoring] outlet seed error', error.message);
}

async function runFetch(trigger: 'manual' | 'cron', options: { force?: boolean } = {}) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Supabase not configured on server' },
    };
  }

  // `force` only ever has an effect for the cron trigger, and the GET
  // handler only sets `trigger: 'cron'` after the shared secret has
  // already been validated — so reaching here with `trigger === 'cron'`
  // already implies the request was authorised via the secret path.
  const guard = await checkFetchRunGuard(
    supabase,
    FETCH_CHANNEL,
    trigger === 'cron' && !!options.force,
  );
  if (!guard.ok) return guard;

  // seedOutletsIfEmpty, opening the audit row, reading active keywords and
  // reading the registered feed sources are all independent — run them
  // concurrently.
  const [, auditResult, kwResult, srcResult] = await Promise.all([
    seedOutletsIfEmpty(supabase),
    supabase
      .from('media_fetch_runs')
      .insert({ trigger, status: 'running', channel: FETCH_CHANNEL })
      .select()
      .single(),
    supabase.from('media_keywords').select('*').eq('is_active', true),
    supabase.from('media_press_sources').select('*').eq('is_active', true),
  ]);

  const { data: runRow, error: runErr } = auditResult;
  if (runErr) {
    console.error('[media-monitoring] failed to open fetch run', runErr);
  }
  const runId: string | null = runRow?.id ?? null;

  const { data: kwData, error: kwErr } = kwResult;
  if (kwErr) {
    return { ok: false, status: 500, body: { error: kwErr.message } };
  }
  const keywords = (kwData ?? []) as MediaKeyword[];

  // A missing `media_press_sources` table (migration 086 not yet applied)
  // must not fail the run — the Google News channel still works without it.
  if (srcResult.error) {
    console.warn(
      '[media-monitoring] press sources unavailable, continuing with Google News only:',
      srcResult.error.message,
    );
  }
  const pressSources = (srcResult.data ?? []) as PressSource[];

  // Look back 90 days so we build a meaningful archive of coverage.
  // Google News RSS typically only returns articles from the last ~30 days
  // anyway, but a wider window ensures we don't discard edge cases.
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  console.log(
    `[media-monitoring] starting fetch: ${keywords.length} active keywords, ${pressSources.length} feed sources`,
  );

  let articles: FetchedArticle[] = [];
  let errorMessage: string | null = null;
  const stats = emptyFetchStats();
  const pressStats = emptyPressFetchStats();

  // The two channels are independent: Google News being rate-limited must
  // not cost us the alert feeds, and vice versa. Run both, and only fail the
  // run if *both* threw.
  const [newsOutcome, feedOutcome] = await Promise.allSettled([
    fetchArticlesForKeywords(keywords, { sinceIso: since, stats }),
    fetchPressFeeds(pressSources, keywords, { sinceIso: since, stats: pressStats }),
  ]);

  const newsArticles = newsOutcome.status === 'fulfilled' ? newsOutcome.value : [];
  const feedArticles = feedOutcome.status === 'fulfilled' ? feedOutcome.value : [];

  const failures: string[] = [];
  if (newsOutcome.status === 'rejected') {
    const message =
      newsOutcome.reason instanceof Error
        ? newsOutcome.reason.message
        : String(newsOutcome.reason);
    failures.push(`Google News: ${message}`);
    console.error('[media-monitoring] google news fetch error', newsOutcome.reason);
  }
  if (feedOutcome.status === 'rejected') {
    const message =
      feedOutcome.reason instanceof Error
        ? feedOutcome.reason.message
        : String(feedOutcome.reason);
    failures.push(`Press feeds: ${message}`);
    console.error('[media-monitoring] press feed fetch error', feedOutcome.reason);
  }
  // A single channel failing is a degraded run, not a failed one — it is
  // reported, but whatever the other channel found is still stored.
  if (failures.length === 2) {
    errorMessage = failures.join('; ');
  } else if (failures.length === 1) {
    console.warn(`[media-monitoring] degraded run — ${failures[0]}`);
  }

  // Cross-channel dedup: the same story arrives from Google News as an
  // opaque redirect and from an alert feed as the real publisher URL.
  articles = mergeArticleSets(newsArticles, feedArticles);
  console.log(
    `[media-monitoring] fetched ${articles.length} unique articles ` +
      `(${newsArticles.length} google news + ${feedArticles.length} feeds before dedup)`,
  );

  // Record per-feed health so a quietly dead alert is visible in the
  // dashboard instead of just contributing nothing.
  await Promise.all(
    pressStats.perSource.map((s) =>
      supabase
        .from('media_press_sources')
        .update({
          last_fetched_at: new Date().toISOString(),
          last_status: s.status,
          last_error: s.error,
          last_item_count: s.items,
        })
        .eq('id', s.source_id),
    ),
  );

  // Resolve outlet_id for each article from the DB so relations stay clean.
  // We do one batched query on distinct outlet_domains then build a lookup.
  const domains = Array.from(
    new Set(articles.map((a) => a.outlet_domain).filter(Boolean) as string[]),
  );
  const outletIdByDomain = new Map<string, string>();
  if (domains.length > 0) {
    const { data: outletRows } = await supabase
      .from('media_outlets')
      .select('id,domain')
      .in('domain', domains);
    (outletRows ?? []).forEach((r: { id: string; domain: string }) => {
      outletIdByDomain.set(r.domain, r.id);
    });
  }

  // Build rows to upsert. Report clustering is derived from matched keywords
  // + the article title/summary so board members can see which of their
  // publications a piece of coverage belongs to.
  const rows = articles.map((a) => {
    const reportSlugs = Array.from(
      new Set([
        ...matchReportsFromKeywords(a.matched_keywords),
        ...matchReportsInText(`${a.title} ${a.summary}`),
      ]),
    );
    return {
      url: a.url,
      canonical_url: a.canonical_url,
      title: a.title.slice(0, 500),
      summary: a.summary,
      source_name: a.source_name.slice(0, 200),
      outlet_id: a.outlet_domain ? outletIdByDomain.get(a.outlet_domain) ?? null : null,
      outlet_domain: a.outlet_domain,
      published_at: a.published_at,
      language: a.language,
      country: a.country,
      estimated_reach: a.estimated_reach,
      matched_keyword_ids: a.matched_keyword_ids,
      matched_keywords: a.matched_keywords,
      matched_report_slugs: reportSlugs,
      discovery_source: a.discovery_source ?? 'google_news',
      press_source_id: a.press_source_id ?? null,
      fetched_at: new Date().toISOString(),
    };
  });

  let inserted = 0;
  if (rows.length > 0) {
    // Count how many were already known so the run log is informative.
    // The upsert conflicts on `url` (the DB unique column), so the
    // pre-count must match on the same column, not `canonical_url`.
    const { count: existing } = await supabase
      .from('media_articles')
      .select('id', { count: 'exact', head: true })
      .in(
        'url',
        rows.map((r) => r.url),
      );

    const { error: upErr } = await supabase
      .from('media_articles')
      .upsert(rows, { onConflict: 'url', ignoreDuplicates: false });
    if (upErr) {
      errorMessage = upErr.message;
      console.error('[media-monitoring] upsert error', upErr);
    }
    inserted = rows.length - (existing ?? 0);
  }

  // Finalise audit row
  if (runId) {
    await supabase
      .from('media_fetch_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: errorMessage ? 'error' : 'success',
        keywords_count: keywords.length,
        sources_count: pressSources.length,
        items_seen: stats.itemsSeen + pressStats.itemsSeen,
        articles_found: articles.length,
        articles_new: Math.max(inserted, 0),
        error_message: errorMessage ?? (failures.length === 1 ? failures[0] : null),
        diagnostics: { google_news: stats, press_feeds: pressStats },
      })
      .eq('id', runId);
  }

  return {
    ok: !errorMessage,
    status: errorMessage ? 500 : 200,
    body: {
      success: !errorMessage,
      run_id: runId,
      keywords_count: keywords.length,
      sources_count: pressSources.length,
      articles_found: articles.length,
      articles_new: Math.max(inserted, 0),
      error: errorMessage,
      // Reported when exactly one channel failed: the run still succeeded
      // on the other, so this is a warning rather than an error.
      degraded: failures.length === 1 ? failures[0] : null,
      // Returned so a zero-article run can be diagnosed from the response
      // alone: it distinguishes "upstream returned nothing" from
      // "everything was filtered out", and names any feed that failed.
      diagnostics: { google_news: stats, press_feeds: pressStats },
    },
  };
}

export async function POST(request: NextRequest) {
  const auth = await authoriseMediaMutation(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? 'Unauthorized.' },
      { status: auth.status ?? 401 },
    );
  }
  const result = await runFetch('manual');
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: NextRequest) {
  // Allow cron invocation with a shared secret
  const url = new URL(request.url);
  const secret = url.searchParams.get('secret');
  const expected = process.env.MEDIA_MONITORING_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const force = url.searchParams.get('force') === 'true';
  const result = await runFetch('cron', { force });
  return NextResponse.json(result.body, { status: result.status });
}
