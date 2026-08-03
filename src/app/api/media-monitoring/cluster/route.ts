import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { authoriseMediaMutation } from '@/lib/media-auth';
import { clusterArticle, type ClusterableArticle } from '@/lib/media-clustering';

/**
 * Re-cluster the coverage pool into reports, board members and countries.
 *
 * Runs as its own pass rather than at ingest time because the rules change:
 * a new report adds match-terms, a new board member adds aliases, and both
 * need applying to coverage that is already stored. `?full=true` re-clusters
 * everything; the default only touches rows never clustered under the
 * current pass.
 *
 * Invoked by the daily GitHub Action (GET with the shared secret) or from the
 * dashboard (POST).
 */

export const maxDuration = 300;

/** Rows per page. Bounded so a large pool cannot exhaust server memory. */
const PAGE_SIZE = 500;

/** Safety stop, so a pathological loop cannot run unbounded. */
const MAX_PAGES = 200;

interface ClusterRunResult {
  ok: boolean;
  status: number;
  body: Record<string, unknown>;
}

async function runClustering(full: boolean): Promise<ClusterRunResult> {
  const supabase = getServerSupabase();
  if (!supabase) {
    return {
      ok: false,
      status: 500,
      body: { error: 'Supabase not configured on server' },
    };
  }

  let scanned = 0;
  let updated = 0;
  let page = 0;
  const reportCounts: Record<string, number> = {};
  const memberCounts: Record<string, number> = {};
  const countryCounts: Record<string, number> = {};

  while (page < MAX_PAGES) {
    let query = supabase
      .from('media_articles')
      .select(
        'id,title,summary,full_text,country,outlet_domain,matched_keywords,matched_report_slugs,matched_member_slugs',
      )
      .order('id', { ascending: true })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    // Incremental mode walks only unclustered rows. Because clustering sets
    // `clustered_at`, those rows leave the filter as they are processed — so
    // this always reads page 0, and paging would skip rows. Full mode pages
    // normally, since it does not narrow the set it is walking.
    if (!full) {
      query = supabase
        .from('media_articles')
        .select(
          'id,title,summary,full_text,country,outlet_domain,matched_keywords,matched_report_slugs,matched_member_slugs',
        )
        .is('clustered_at', null)
        .order('id', { ascending: true })
        .limit(PAGE_SIZE);
    }

    const { data, error } = await query;
    if (error) {
      return { ok: false, status: 500, body: { error: error.message } };
    }
    const rows = (data ?? []) as (ClusterableArticle & {
      matched_report_slugs: string[] | null;
      matched_member_slugs: string[] | null;
    })[];
    if (rows.length === 0) break;

    scanned += rows.length;
    const now = new Date().toISOString();

    // Only write rows whose clustering actually changed. On a full re-run
    // over a mostly-unchanged pool this turns thousands of writes into a
    // handful.
    const changed = rows.filter((row) => {
      const cluster = clusterArticle(row);
      cluster.report_slugs.forEach((s) => {
        reportCounts[s] = (reportCounts[s] ?? 0) + 1;
      });
      cluster.member_slugs.forEach((s) => {
        memberCounts[s] = (memberCounts[s] ?? 0) + 1;
      });
      if (cluster.country) {
        countryCounts[cluster.country] = (countryCounts[cluster.country] ?? 0) + 1;
      }

      const sameReports = setsEqual(row.matched_report_slugs ?? [], cluster.report_slugs);
      const sameMembers = setsEqual(row.matched_member_slugs ?? [], cluster.member_slugs);
      const sameCountry = (row.country ?? null) === cluster.country;

      (row as { _cluster?: unknown })._cluster = cluster;
      return !(sameReports && sameMembers && sameCountry);
    });

    await Promise.all(
      changed.map((row) => {
        const cluster = (row as unknown as { _cluster: ReturnType<typeof clusterArticle> })
          ._cluster;
        return supabase
          .from('media_articles')
          .update({
            matched_report_slugs: cluster.report_slugs,
            matched_member_slugs: cluster.member_slugs,
            country: cluster.country,
            clustered_at: now,
          })
          .eq('id', row.id);
      }),
    );
    updated += changed.length;

    // Unchanged rows still need stamping, or incremental mode would return
    // the same rows forever and never terminate.
    const unchangedIds = rows.filter((r) => !changed.includes(r)).map((r) => r.id);
    if (unchangedIds.length > 0) {
      await supabase
        .from('media_articles')
        .update({ clustered_at: now })
        .in('id', unchangedIds);
    }

    if (rows.length < PAGE_SIZE) break;
    page += 1;
  }

  return {
    ok: true,
    status: 200,
    body: {
      success: true,
      mode: full ? 'full' : 'incremental',
      scanned,
      updated,
      by_report: reportCounts,
      by_member: memberCounts,
      by_country: countryCounts,
    },
  };
}

function setsEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  const setB = new Set(b);
  return a.every((x) => setB.has(x));
}

export async function POST(request: NextRequest) {
  const auth = await authoriseMediaMutation(request);
  if (!auth.ok) {
    return NextResponse.json(
      { error: auth.error ?? 'Unauthorized.' },
      { status: auth.status ?? 401 },
    );
  }
  const full = new URL(request.url).searchParams.get('full') === 'true';
  const result = await runClustering(full);
  return NextResponse.json(result.body, { status: result.status });
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const expected = process.env.MEDIA_MONITORING_SECRET;
  if (expected && url.searchParams.get('secret') !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const result = await runClustering(url.searchParams.get('full') === 'true');
  return NextResponse.json(result.body, { status: result.status });
}
