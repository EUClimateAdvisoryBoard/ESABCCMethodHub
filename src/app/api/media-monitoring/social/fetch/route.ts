import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import { fetchSocialPosts, type SocialSource } from '@/lib/media-social';
import type { MediaKeyword } from '@/lib/media-monitoring';

/**
 * Trigger a social-media monitoring fetch run.
 *
 * We no longer search LinkedIn from the server — `media-social.ts` only
 * pulls sources with an explicit `feed_url` (typically RSS.app bridges
 * to LinkedIn profiles). Sources without a feed URL are skipped: posts
 * for those arrive via the browser extension or manual-paste form,
 * which POST to /api/media-monitoring/social/ingest.
 *
 * Invoked manually from the dashboard (POST, requires `authoriseMediaMutation`)
 * or on a schedule (GET with ?secret=<MEDIA_MONITORING_SECRET>).
 *
 * Both entry points share an overlap/rate guard (`checkFetchRunGuard`) so
 * a slow run can't be triggered twice concurrently and the dashboard can't
 * be used to hammer the configured feeds: a 'social' run already `running`
 * within the last 15 minutes returns 409, and a channel that completed a
 * run less than 3 minutes ago returns 429 unless the request is the cron
 * path with a valid secret and `?force=true`.
 */

const FETCH_CHANNEL = 'social';
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

  const { data: runRow, error: runErr } = await supabase
    .from('media_fetch_runs')
    .insert({ trigger, status: 'running', channel: FETCH_CHANNEL })
    .select()
    .single();
  if (runErr) {
    console.error('[media-monitoring] failed to open social fetch run', runErr);
  }
  const runId: string | null = runRow?.id ?? null;

  const { data: sourceRows, error: srcErr } = await supabase
    .from('media_social_sources')
    .select('*')
    .eq('is_active', true);
  if (srcErr) {
    return { ok: false, status: 500, body: { error: srcErr.message } };
  }
  const sources = (sourceRows ?? []) as unknown as SocialSource[];

  const { data: kwRows } = await supabase
    .from('media_keywords')
    .select('*')
    .eq('is_active', true);
  const keywords = (kwRows ?? []) as MediaKeyword[];

  const since = new Date(Date.now() - 90 * 24 * 3600 * 1000).toISOString();

  let posts: Awaited<ReturnType<typeof fetchSocialPosts>> = [];
  let errorMessage: string | null = null;
  try {
    posts = await fetchSocialPosts(sources, keywords, { sinceIso: since });
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
    console.error('[media-monitoring] social fetch error', e);
  }

  let inserted = 0;
  if (posts.length > 0) {
    const rows = posts.map((p) => ({
      platform: p.platform,
      post_url: p.post_url,
      external_id: p.external_id,
      author_handle: p.author_handle,
      author_name: p.author_name,
      author_profile_url: p.author_profile_url,
      source_id: p.source_id,
      content: p.content,
      excerpt: p.excerpt,
      language: p.language,
      country: p.country,
      posted_at: p.posted_at,
      estimated_reach: p.estimated_reach,
      link_url: p.link_url,
      matched_keyword_ids: p.matched_keyword_ids,
      matched_keywords: p.matched_keywords,
      matched_report_slugs: p.matched_report_slugs,
      fetched_at: new Date().toISOString(),
    }));

    const { count: existing } = await supabase
      .from('media_social_posts')
      .select('id', { count: 'exact', head: true })
      .in('post_url', rows.map((r) => r.post_url));

    const { error: upErr } = await supabase
      .from('media_social_posts')
      .upsert(rows, { onConflict: 'post_url', ignoreDuplicates: false });
    if (upErr) {
      errorMessage = upErr.message;
      console.error('[media-monitoring] social upsert error', upErr);
    }
    inserted = rows.length - (existing ?? 0);
  }

  if (runId) {
    await supabase
      .from('media_fetch_runs')
      .update({
        finished_at: new Date().toISOString(),
        status: errorMessage ? 'error' : 'success',
        keywords_count: sources.length,
        articles_found: posts.length,
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
      sources_count: sources.length,
      posts_found: posts.length,
      posts_new: Math.max(inserted, 0),
      error: errorMessage,
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
