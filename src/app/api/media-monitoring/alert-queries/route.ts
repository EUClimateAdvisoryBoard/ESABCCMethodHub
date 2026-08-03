import { NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import {
  buildAlertQueries,
  uncoveredKeywords,
  type PressSource,
} from '@/lib/media-press-feeds';
import type { MediaKeyword } from '@/lib/media-monitoring';

/**
 * Generate ready-to-paste Google Alerts / Talkwalker Alerts queries from the
 * active keywords defined in the Method Hub.
 *
 * Neither provider exposes an API for creating alerts, so the alerts
 * themselves are still set up by hand — but nothing here needs to be typed
 * by hand. This endpoint turns the keyword rows into the exact query
 * strings, and reports which keywords no registered alert covers yet, so
 * the setup stays in step with the keyword list as it grows.
 *
 * Read-only, and keyword names are not sensitive, so this mirrors the
 * public-read posture of the other media-monitoring GET endpoints.
 */

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({
      queries: [],
      uncovered: [],
      sources: [],
      error: 'Supabase not configured on server',
    });
  }

  const [kwResult, srcResult] = await Promise.all([
    supabase.from('media_keywords').select('*').eq('is_active', true),
    supabase.from('media_press_sources').select('*'),
  ]);

  if (kwResult.error) {
    return NextResponse.json({ error: kwResult.error.message }, { status: 500 });
  }

  const keywords = (kwResult.data ?? []) as MediaKeyword[];
  // A missing press-sources table (migration 086 not yet applied) should not
  // break query generation — the queries are useful before any alert exists.
  const sources = (srcResult.data ?? []) as PressSource[];

  const queries = buildAlertQueries(keywords);

  return NextResponse.json({
    keywords_count: keywords.length,
    queries,
    uncovered: uncoveredKeywords(keywords, sources),
    sources_count: sources.filter((s) => s.is_active).length,
  });
}
