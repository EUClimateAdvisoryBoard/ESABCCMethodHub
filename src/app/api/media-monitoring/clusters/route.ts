import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';
import { BOARD_MEMBERS } from '@/data/esabcc-board';
import { ESABCC_REPORTS } from '@/data/esabcc-reports';

/**
 * Aggregated coverage per report, per board member and per country.
 *
 * Powers the Reports / Members / Countries lenses, which are three views of
 * one pool — feed coverage plus the weekly Newton Media import — rather than
 * three separate datasets. All three are computed in a single pass over the
 * rows so the numbers can never disagree between tabs.
 *
 * Query params:
 *   ?days=90     rolling window (default 90, 0 = all time)
 *   ?dimension=  optionally limit to 'report' | 'member' | 'country'
 */

// Without this Next prerenders the route at build time and every request
// then serves the pool as it looked when the site was built.
export const dynamic = 'force-dynamic';

const PAGE_SIZE = 1000;
const HARD_CAP = 20000;

interface ArticleRow {
  id: string;
  title: string;
  url: string;
  published_at: string | null;
  country: string | null;
  outlet_domain: string | null;
  source_name: string | null;
  estimated_reach: number | null;
  discovery_source: string | null;
  media_type: string | null;
  matched_report_slugs: string[] | null;
  matched_member_slugs: string[] | null;
}

interface Bucket {
  key: string;
  label: string;
  count: number;
  reach: number;
  countries: Set<string>;
  outlets: Set<string>;
  last_at: string | null;
  top: { title: string; url: string; outlet: string | null; reach: number; published_at: string | null }[];
}

function newBucket(key: string, label: string): Bucket {
  return {
    key,
    label,
    count: 0,
    reach: 0,
    countries: new Set(),
    outlets: new Set(),
    last_at: null,
    top: [],
  };
}

function addToBucket(bucket: Bucket, row: ArticleRow) {
  bucket.count += 1;
  bucket.reach += row.estimated_reach ?? 0;
  if (row.country) bucket.countries.add(row.country);
  if (row.outlet_domain) bucket.outlets.add(row.outlet_domain);
  if (row.published_at && (!bucket.last_at || row.published_at > bucket.last_at)) {
    bucket.last_at = row.published_at;
  }
  bucket.top.push({
    title: row.title,
    url: row.url,
    outlet: row.outlet_domain ?? row.source_name,
    reach: row.estimated_reach ?? 0,
    published_at: row.published_at,
  });
}

/** Trim each bucket's article list to the highest-reach handful. */
function finaliseBucket(bucket: Bucket) {
  return {
    key: bucket.key,
    label: bucket.label,
    count: bucket.count,
    reach: bucket.reach,
    countries: bucket.countries.size,
    outlets: bucket.outlets.size,
    last_at: bucket.last_at,
    top: bucket.top.sort((a, b) => b.reach - a.reach).slice(0, 5),
  };
}

const COUNTRY_NAMES: Record<string, string> = {
  AT: 'Austria', BE: 'Belgium', BG: 'Bulgaria', CH: 'Switzerland', CY: 'Cyprus',
  CZ: 'Czechia', DE: 'Germany', DK: 'Denmark', EE: 'Estonia', ES: 'Spain',
  FI: 'Finland', FR: 'France', GB: 'United Kingdom', GR: 'Greece', HR: 'Croatia',
  HU: 'Hungary', IE: 'Ireland', IT: 'Italy', LT: 'Lithuania', LU: 'Luxembourg',
  LV: 'Latvia', MT: 'Malta', NL: 'Netherlands', NO: 'Norway', PL: 'Poland',
  PT: 'Portugal', RO: 'Romania', RS: 'Serbia', SE: 'Sweden', SI: 'Slovenia',
  SK: 'Slovakia', TR: 'Turkey', UA: 'Ukraine', US: 'United States',
};

export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) {
    return NextResponse.json({ reports: [], members: [], countries: [] });
  }

  const url = new URL(request.url);
  const daysParam = url.searchParams.get('days');
  const days = daysParam === null ? 90 : Math.max(Number(daysParam) || 0, 0);
  const since =
    days > 0 ? new Date(Date.now() - days * 24 * 3600 * 1000).toISOString() : null;

  const rows: ArticleRow[] = [];
  let truncated = false;

  try {
    for (let from = 0; from < HARD_CAP; from += PAGE_SIZE) {
      const to = Math.min(from + PAGE_SIZE, HARD_CAP) - 1;
      let query = supabase
        .from('media_articles')
        .select(
          'id,title,url,published_at,country,outlet_domain,source_name,estimated_reach,discovery_source,media_type,matched_report_slugs,matched_member_slugs',
        )
        .order('published_at', { ascending: false, nullsFirst: false })
        .range(from, to);
      if (since) query = query.gte('published_at', since);

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      const page = (data ?? []) as ArticleRow[];
      rows.push(...page);
      if (page.length < to - from + 1) break;
      if (rows.length >= HARD_CAP) {
        truncated = true;
        break;
      }
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  const reportBuckets = new Map<string, Bucket>();
  const memberBuckets = new Map<string, Bucket>();
  const countryBuckets = new Map<string, Bucket>();

  const reportLabel = new Map(ESABCC_REPORTS.map((r) => [r.slug, r.short_title]));
  const memberLabel = new Map(BOARD_MEMBERS.map((m) => [m.slug, m.name]));

  // One pass over the pool fills all three lenses, so the tabs can never
  // disagree about the same underlying rows.
  for (const row of rows) {
    for (const slug of row.matched_report_slugs ?? []) {
      const bucket =
        reportBuckets.get(slug) ??
        newBucket(slug, reportLabel.get(slug) ?? slug);
      addToBucket(bucket, row);
      reportBuckets.set(slug, bucket);
    }
    for (const slug of row.matched_member_slugs ?? []) {
      const bucket =
        memberBuckets.get(slug) ?? newBucket(slug, memberLabel.get(slug) ?? slug);
      addToBucket(bucket, row);
      memberBuckets.set(slug, bucket);
    }
    if (row.country) {
      const bucket =
        countryBuckets.get(row.country) ??
        newBucket(row.country, COUNTRY_NAMES[row.country] ?? row.country);
      addToBucket(bucket, row);
      countryBuckets.set(row.country, bucket);
    }
  }

  const byReach = (a: { reach: number }, b: { reach: number }) => b.reach - a.reach;

  // Reports and members are listed even at zero coverage: "no coverage yet"
  // is itself the answer someone opens these tabs to get.
  const reports = ESABCC_REPORTS.map((r) =>
    finaliseBucket(reportBuckets.get(r.slug) ?? newBucket(r.slug, r.short_title)),
  ).sort(byReach);

  const members = BOARD_MEMBERS.map((m) =>
    finaliseBucket(memberBuckets.get(m.slug) ?? newBucket(m.slug, m.name)),
  ).sort(byReach);

  const countries = Array.from(countryBuckets.values())
    .map(finaliseBucket)
    .sort(byReach);

  const dimension = url.searchParams.get('dimension');

  return NextResponse.json({
    days,
    total_articles: rows.length,
    truncated,
    by_discovery_source: rows.reduce<Record<string, number>>((acc, r) => {
      const key = r.discovery_source ?? 'unknown';
      acc[key] = (acc[key] ?? 0) + 1;
      return acc;
    }, {}),
    reports: !dimension || dimension === 'report' ? reports : [],
    members: !dimension || dimension === 'member' ? members : [],
    countries: !dimension || dimension === 'country' ? countries : [],
  });
}
