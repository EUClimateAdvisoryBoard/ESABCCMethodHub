import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import {
  fetchArticlesForKeywords,
  emptyFetchStats,
  OUTLET_REGISTRY,
  type MediaKeyword,
} from '@/lib/media-monitoring';
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

  // seedOutletsIfEmpty, opening the audit row, and reading active keywords
  // are all independent of one another — run them concurrently.
  const [, auditResult, kwResult] = await Promise.all([
    seedOutletsIfEmpty(supabase),
    supabase
      .from('media_fetch_runs')
      .insert({ trigger, status: 'running', channel: FETCH_CHANNEL })
      .select()
      .single(),
    supabase.from('media_keywords').select('*').eq('is_active', true),
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

  // Look back 90 days so we build a meaningful archive of coverage.
  // Google News RSS typically only returns articles from the last ~30 days
  // anyway, but a wider window ensures we don't discard edge cases.
  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  console.log(`[media-monitoring] starting fetch: ${keywords.length} active keywords`);

  let articles: Awaited<ReturnType<typeof fetchArticlesForKeywords>> = [];
  let errorMessage: string | null = null;
  const stats = emptyFetchStats();
  try {
    articles = await fetchArticlesForKeywords(keywords, { sinceIso: since, stats });
    console.log(`[media-monitoring] fetched ${articles.length} unique articles`);
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[media-monitoring] fetch error', e);
  }

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
        articles_found: articles.length,
        articles_new: Math.max(inserted, 0),
        error_message: errorMessage,
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
      articles_found: articles.length,
      articles_new: Math.max(inserted, 0),
      error: errorMessage,
      // Returned so a zero-article run can be diagnosed from the response
      // alone: it distinguishes "Google returned nothing" from "everything
      // was filtered out", and shows how many feed requests failed.
      diagnostics: stats,
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
