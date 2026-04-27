import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

/**
 * Aggregate analytics for the media monitoring dashboard.
 *
 * Returns:
 *   - summary: totals, unique outlets, weighted reach, avg reach
 *   - timeline: daily counts + reach for the selected window
 *   - byCountry: per-country coverage + reach (drives the world map)
 *   - byOutlet: top outlets by count and reach
 *   - byKeyword: keyword frequency
 *   - byTier: counts per outlet tier
 *   - byLanguage: counts per language
 *   - recentRuns: last 10 fetch runs (for the "last updated" widget)
 *
 * Query params: ?days=90 (default 90), ?keyword=<text>
 *
 * All aggregation happens in-process because Supabase's JS client can't run
 * group-by queries; the volumes involved (thousands of rows per month) are
 * well within limits.
 */
export async function GET(request: NextRequest) {
  const supabase = getServerSupabase();
  const url = new URL(request.url);
  const days = Math.min(Math.max(Number(url.searchParams.get('days')) || 90, 7), 365);
  const keyword = url.searchParams.get('keyword');
  const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();

  if (!supabase) {
    return NextResponse.json(emptyPayload(days));
  }

  let query = supabase
    .from('media_articles')
    .select('id,title,url,outlet_domain,country,language,published_at,estimated_reach,matched_keywords,source_name')
    .gte('published_at', since)
    .order('published_at', { ascending: false })
    .limit(5000);

  if (keyword) query = query.contains('matched_keywords', [keyword]);

  const { data: articles, error } = await query;
  if (error) {
    console.error('[media-monitoring] analytics error', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = articles ?? [];

  // Outlets lookup (for tier + coordinates)
  const { data: outlets } = await supabase
    .from('media_outlets')
    .select('domain,name,country,country_name,tier,latitude,longitude,estimated_readership');

  const outletByDomain = new Map<string, NonNullable<typeof outlets>[number]>();
  (outlets ?? []).forEach((o) => outletByDomain.set(o.domain, o));

  const summary = {
    total_articles: rows.length,
    unique_outlets: new Set(rows.map((r) => r.outlet_domain).filter(Boolean)).size,
    total_reach: rows.reduce((s, r) => s + (Number(r.estimated_reach) || 0), 0),
    avg_reach:
      rows.length > 0
        ? Math.round(
            rows.reduce((s, r) => s + (Number(r.estimated_reach) || 0), 0) / rows.length,
          )
        : 0,
    countries_covered: new Set(rows.map((r) => r.country).filter(Boolean)).size,
  };

  // Timeline (daily)
  const dayMap = new Map<string, { date: string; count: number; reach: number }>();
  for (let i = days; i >= 0; i--) {
    const d = new Date(Date.now() - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    dayMap.set(d, { date: d, count: 0, reach: 0 });
  }
  rows.forEach((r) => {
    if (!r.published_at) return;
    const d = r.published_at.slice(0, 10);
    const bucket = dayMap.get(d);
    if (bucket) {
      bucket.count += 1;
      bucket.reach += Number(r.estimated_reach) || 0;
    }
  });
  const timeline = Array.from(dayMap.values());

  // By country
  const countryMap = new Map<string, { country: string; country_name: string; count: number; reach: number }>();
  rows.forEach((r) => {
    const code = r.country || 'UNK';
    const outlet = r.outlet_domain ? outletByDomain.get(r.outlet_domain) : undefined;
    const name = outlet?.country_name || code;
    const entry = countryMap.get(code) || { country: code, country_name: name, count: 0, reach: 0 };
    entry.count += 1;
    entry.reach += Number(r.estimated_reach) || 0;
    countryMap.set(code, entry);
  });
  const byCountry = Array.from(countryMap.values()).sort((a, b) => b.count - a.count);

  // By outlet
  const outletMap = new Map<
    string,
    { domain: string; name: string; country: string; tier: string; count: number; reach: number; latitude?: number; longitude?: number }
  >();
  rows.forEach((r) => {
    const domain = r.outlet_domain;
    if (!domain) return;
    const outlet = outletByDomain.get(domain);
    const entry =
      outletMap.get(domain) ||
      {
        domain,
        name: outlet?.name || r.source_name || domain,
        country: outlet?.country || r.country || 'UNK',
        tier: outlet?.tier || 'regional',
        count: 0,
        reach: 0,
        latitude: outlet?.latitude,
        longitude: outlet?.longitude,
      };
    entry.count += 1;
    entry.reach += Number(r.estimated_reach) || 0;
    outletMap.set(domain, entry);
  });
  const byOutlet = Array.from(outletMap.values()).sort((a, b) => b.count - a.count);

  // By keyword
  const kwMap = new Map<string, number>();
  rows.forEach((r) => {
    (r.matched_keywords || []).forEach((k: string) => {
      kwMap.set(k, (kwMap.get(k) || 0) + 1);
    });
  });
  const byKeyword = Array.from(kwMap.entries())
    .map(([keyword, count]) => ({ keyword, count }))
    .sort((a, b) => b.count - a.count);

  // By tier
  const tierMap = new Map<string, number>();
  rows.forEach((r) => {
    const outlet = r.outlet_domain ? outletByDomain.get(r.outlet_domain) : undefined;
    const tier = outlet?.tier || 'unknown';
    tierMap.set(tier, (tierMap.get(tier) || 0) + 1);
  });
  const byTier = Array.from(tierMap.entries()).map(([tier, count]) => ({ tier, count }));

  // By language
  const langMap = new Map<string, number>();
  rows.forEach((r) => {
    const lang = r.language || 'unknown';
    langMap.set(lang, (langMap.get(lang) || 0) + 1);
  });
  const byLanguage = Array.from(langMap.entries())
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count);

  // Recent fetch runs
  const { data: recentRuns } = await supabase
    .from('media_fetch_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(10);

  return NextResponse.json({
    summary,
    timeline,
    byCountry,
    byOutlet,
    byKeyword,
    byTier,
    byLanguage,
    recentRuns: recentRuns ?? [],
    window_days: days,
  });
}

function emptyPayload(days: number) {
  return {
    summary: {
      total_articles: 0,
      unique_outlets: 0,
      total_reach: 0,
      avg_reach: 0,
      countries_covered: 0,
    },
    timeline: [],
    byCountry: [],
    byOutlet: [],
    byKeyword: [],
    byTier: [],
    byLanguage: [],
    recentRuns: [],
    window_days: days,
  };
}
