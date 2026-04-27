import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
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
 * Invoked manually from the dashboard (POST) or on a schedule
 * (GET with ?secret=<MEDIA_MONITORING_SECRET>).
 */
async function runFetch(trigger: 'manual' | 'cron') {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Supabase not configured on server' },
    };
  }

  const { data: runRow } = await supabase
    .from('media_fetch_runs')
    .insert({ trigger, status: 'running', channel: 'social' })
    .select()
    .single();
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

export async function POST() {
  const result = await runFetch('manual');
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: NextRequest) {
  const secret = new URL(request.url).searchParams.get('secret');
  const expected = process.env.MEDIA_MONITORING_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runFetch('cron');
  return NextResponse.json(result.body, { status: result.status });
}
