import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  fetchArticlesForKeywords,
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
 *   - manually from the dashboard (POST)
 *   - from a scheduler / cron (GET with ?secret=<MEDIA_MONITORING_SECRET>)
 *
 * On first run it also seeds `media_outlets` from OUTLET_REGISTRY so the
 * dashboard has outlet metadata even without a manual import step.
 */

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

async function runFetch(trigger: 'manual' | 'cron') {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Supabase not configured on server' },
    };
  }

  await seedOutletsIfEmpty(supabase);

  // Start an audit row
  const { data: runRow, error: runErr } = await supabase
    .from('media_fetch_runs')
    .insert({ trigger, status: 'running', channel: 'press' })
    .select()
    .single();

  if (runErr) {
    console.error('[media-monitoring] failed to open fetch run', runErr);
  }
  const runId: string | null = runRow?.id ?? null;

  // Read active keywords
  const { data: kwData, error: kwErr } = await supabase
    .from('media_keywords')
    .select('*')
    .eq('is_active', true);
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
  try {
    articles = await fetchArticlesForKeywords(keywords, { sinceIso: since });
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
    // Count how many were already known so the run log is informative
    const { count: existing } = await supabase
      .from('media_articles')
      .select('id', { count: 'exact', head: true })
      .in(
        'canonical_url',
        rows.map((r) => r.canonical_url),
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
    },
  };
}

export async function POST() {
  const result = await runFetch('manual');
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: NextRequest) {
  // Allow cron invocation with a shared secret
  const secret = new URL(request.url).searchParams.get('secret');
  const expected = process.env.MEDIA_MONITORING_SECRET;
  if (expected && secret !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runFetch('cron');
  return NextResponse.json(result.body, { status: result.status });
}
