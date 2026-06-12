'use client';

/**
 * National Level Climate Policies — beta module.
 * -----------------------------------------------
 * Catalogue of the national climate laws and policies of all EU-27 member
 * states, sourced from Climate Change Laws of the World (climate-laws.org,
 * Grantham Research Institute at LSE / Climate Policy Radar, CC-BY 4.0).
 *
 * Data loading order:
 *   1. `/api/national-climate-policies` — the last refresh persisted in
 *      Supabase (migration 066);
 *   2. fallback: the committed snapshot in
 *      `public/data/national-climate-policies.json`.
 *
 * Signed-in users can press "Refresh" to have the server pull the current
 * corpus from Climate Policy Radar's public REST API (15–30 s) and persist
 * it — no local tooling needed. The same refresh exists as a CLI for
 * development: `node scripts/fetch-climate-laws.mjs`.
 *
 * Features: EU-27 choropleth (framework-law status, catalogue depth,
 * legislative share, adaptation attention, recency) with click-to-filter,
 * an EU-level instrument layer (MethodHub Policy Navigator + supplement,
 * shown as the "European Union" geography alongside the member states),
 * a solution-space gap matrix flagging areas where the EU and/or member
 * states are silent, a "deep insights" panel computed live from the
 * catalogue, a cluster-analysis section (pre-computed K-Means policy
 * families + Ward country typology, see `analysis/`; clicking a family
 * filters the catalogue), chart.js illustrations (adoption timeline, geography mix,
 * sector coverage, instrument types), per-country coverage grid, search,
 * country / category / sector / response filters, sortable list grouped
 * by geography, and deep links to the source document PDF and
 * climate-laws.org / EUR-Lex.
 */

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import NationalClimatePoliciesCharts from '@/components/NationalClimatePoliciesCharts';
import ClimateSolutionSpace from '@/components/ClimateSolutionSpace';
import { useAuth } from '@/lib/auth-context';
import type { ClimatePolicy, PolicyDataset } from '@/lib/climate-laws-types';
import { computeCountryMetrics, computeInsights, PolicyInsight } from '@/lib/climate-policy-insights';
import { euLevelPolicies, EU_GEOGRAPHY_NAME } from '@/lib/eu-climate-policies';
import ClusterAnalysisPanel, { ClusterDataset } from './ClusterAnalysisPanel';

const NationalClimatePoliciesMap = dynamic(
  () => import('@/components/NationalClimatePoliciesMap'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[540px] rounded-lg border border-grey-200 bg-grey-50 flex items-center justify-center text-tertiary text-sm">
        Loading map…
      </div>
    ),
  },
);

const CATEGORY_COLORS: Record<string, string> = {
  Law: '#1B5E20',    // legislative — passed by parliament
  Policy: '#00928F', // executive — government strategy/decree/plan
};

const RESPONSE_LABELS: Record<string, string> = {
  Mitigation: 'Mitigation',
  Adaptation: 'Adaptation',
  'Disaster Risk Management': 'Disaster risk',
  'Loss And Damage': 'Loss & damage',
};

type SortKey = 'newest' | 'oldest' | 'title';

export default function NationalClimatePoliciesPage() {
  const { user, requireAuth } = useAuth();
  const [data, setData] = useState<PolicyDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshMsg, setRefreshMsg] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [sector, setSector] = useState<string>('all');
  const [response, setResponse] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [visible, setVisible] = useState(80);

  // Pre-computed cluster analysis (committed artifact; see analysis/).
  // Absence of the file just hides the section — the module works without it.
  const [clusterData, setClusterData] = useState<ClusterDataset | null>(null);
  const [cluster, setCluster] = useState<number | 'all'>('all');

  const load = useCallback(async () => {
    // Prefer the server-side refresh stored in Supabase; fall back to the
    // committed snapshot so the page also works without a database.
    try {
      const res = await fetch('/api/national-climate-policies', { cache: 'no-store' });
      if (res.ok) {
        const json = (await res.json()) as { dataset: PolicyDataset | null };
        if (json.dataset?.policies?.length) {
          setData(json.dataset);
          return;
        }
      }
    } catch {
      // API unavailable (e.g. static preview) — use the snapshot below.
    }
    const res = await fetch('/data/national-climate-policies.json', { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    setData((await res.json()) as PolicyDataset);
  }, []);

  useEffect(() => {
    load()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
    fetch('/data/national-climate-policies-clusters.json')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => setClusterData(json as ClusterDataset | null))
      .catch(() => setClusterData(null));
  }, [load]);

  const handleRefresh = useCallback(async () => {
    if (!user) {
      requireAuth('Sign in to refresh the catalogue from climate-laws.org.');
      return;
    }
    setRefreshing(true);
    setRefreshMsg(null);
    try {
      const res = await fetch('/api/national-climate-policies', { method: 'POST' });
      const json = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        policyCount?: number;
        snapshotDate?: string;
        dataset?: PolicyDataset;
      };
      if (!res.ok || !json.ok) throw new Error(json.error || `HTTP ${res.status}`);
      if (json.dataset) setData(json.dataset); // Supabase absent — session-only result
      else await load();
      setRefreshMsg(`Refreshed: ${json.policyCount} laws & policies as of ${json.snapshotDate}.`);
    } catch (e) {
      setRefreshMsg(
        `Refresh failed: ${e instanceof Error ? e.message : 'unknown error'}`,
      );
    } finally {
      setRefreshing(false);
    }
  }, [user, requireAuth, load]);

  // Member-state catalogue (climate-laws.org) + the in-repo EU-level layer,
  // merged so the EU shows up as a 28th geography in the list and filters.
  const policies = useMemo(() => data?.policies ?? [], [data]);
  const euPolicies = useMemo(() => euLevelPolicies(), []);
  const allPolicies = useMemo(() => [...euPolicies, ...policies], [euPolicies, policies]);

  const countries = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    allPolicies.forEach((p) => {
      const cur = map.get(p.countryCode);
      if (cur) cur.count += 1;
      else map.set(p.countryCode, { name: p.countryName, count: 1 });
    });
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) =>
        a.name === EU_GEOGRAPHY_NAME ? -1 : b.name === EU_GEOGRAPHY_NAME ? 1 : a.name.localeCompare(b.name),
      );
  }, [allPolicies]);

  const sectors = useMemo(
    () => Array.from(new Set(allPolicies.flatMap((p) => p.sectors))).sort(),
    [allPolicies],
  );
  const responses = useMemo(
    () => Array.from(new Set(allPolicies.flatMap((p) => p.responses))).sort(),
    [allPolicies],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = allPolicies.filter((p) => {
      if (country !== 'all' && p.countryCode !== country) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (sector !== 'all' && !p.sectors.includes(sector)) return false;
      if (response !== 'all' && !p.responses.includes(response)) return false;
      // Cluster assignments only exist for the committed snapshot; entries
      // unknown to the analysis (EU layer, post-refresh additions) drop out
      // of a cluster-filtered view.
      if (cluster !== 'all' && clusterData?.assignments[p.id] !== cluster) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.summary.toLowerCase().includes(q) ||
        p.countryName.toLowerCase().includes(q) ||
        p.keywords.some((k) => k.toLowerCase().includes(q)) ||
        p.sectors.some((s) => s.toLowerCase().includes(q))
      );
    });
    const byDate = (a: ClimatePolicy, b: ClimatePolicy) =>
      (a.date || '0000').localeCompare(b.date || '0000');
    if (sortKey === 'newest') list.sort((a, b) => byDate(b, a));
    if (sortKey === 'oldest') list.sort(byDate);
    if (sortKey === 'title') list.sort((a, b) => a.title.localeCompare(b.title));
    return list;
  }, [allPolicies, search, country, category, sector, response, sortKey, cluster, clusterData]);

  const stats = useMemo(() => {
    const laws = allPolicies.filter((p) => p.category === 'Law').length;
    const pols = allPolicies.filter((p) => p.category === 'Policy').length;
    const msCountries = countries.filter((c) => c.code !== 'EU').length;
    return { total: allPolicies.length, laws, policies: pols, countries: msCountries };
  }, [allPolicies, countries]);

  // Per-country metrics drive the choropleth; the narrative insights are
  // recomputed from the live catalogue so they survive every refresh.
  const countryMetrics = useMemo(() => computeCountryMetrics(policies), [policies]);
  const insights = useMemo(
    () => computeInsights(policies, countryMetrics),
    [policies, countryMetrics],
  );

  const scopeLabel =
    country === 'all'
      ? 'EU-27'
      : countries.find((c) => c.code === country)?.name ?? country;

  // Group the visible slice by member state so the list reads country by
  // country (mirrors the EU Climate Councils module).
  const grouped = useMemo(() => {
    const slice = filtered.slice(0, visible);
    const groups = new Map<string, ClimatePolicy[]>();
    slice.forEach((p) => {
      if (!groups.has(p.countryName)) groups.set(p.countryName, []);
      groups.get(p.countryName)!.push(p);
    });
    return Array.from(groups.entries());
  }, [filtered, visible]);

  const resetPaging = () => setVisible(80);

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Hero */}
        <section className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · Climate Change Laws of the World
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">
            National Level Climate Policies
          </h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            The climate laws and policies of all 27 EU member states — from
            framework climate acts to sectoral strategies and decrees — side
            by side with the EU-level instruments that frame them, plus a
            solution-space gap analysis showing where the EU and/or member
            states are silent. Member-state data:{' '}
            <a
              href="https://climate-laws.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              Climate Change Laws of the World
            </a>{' '}
            (Grantham Research Institute at LSE / Climate Policy Radar,{' '}
            <a
              href={data?.source.licenseUrl ?? 'https://www.lse.ac.uk/granthaminstitute/cclw-terms-and-conditions/'}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              CC-BY 4.0
            </a>
            ).
          </p>
          {data && (
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="text-xs text-tertiary">
                Snapshot of {data.snapshotDate}
              </span>
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary rounded hover:bg-primary-dark disabled:opacity-50"
              >
                {refreshing ? 'Refreshing from climate-laws.org… (~30 s)' : '↻ Refresh from climate-laws.org'}
              </button>
              {refreshMsg && (
                <span
                  className={`text-xs ${refreshMsg.startsWith('Refresh failed') ? 'text-red-700' : 'text-primary'}`}
                >
                  {refreshMsg}
                </span>
              )}
            </div>
          )}
        </section>

        {loading && <p className="text-sm text-tertiary mb-4">Loading catalogue…</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded mb-4">
            Could not load <code>/data/national-climate-policies.json</code>: {error}
          </div>
        )}

        {!loading && !error && (
          <>
            {/* Summary cards — clicking Laws / Policies toggles the category filter */}
            <section className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              <StatCard
                label="Laws & policies"
                value={stats.total.toString()}
                sub={`${stats.countries} member states + EU level`}
                active={category === 'all'}
                onClick={() => { setCategory('all'); resetPaging(); }}
              />
              <StatCard
                label="Legislative acts"
                value={stats.laws.toString()}
                sub="Passed by parliament"
                tone="green"
                active={category === 'Law'}
                onClick={() => { setCategory(category === 'Law' ? 'all' : 'Law'); resetPaging(); }}
              />
              <StatCard
                label="Executive policies"
                value={stats.policies.toString()}
                sub="Strategies, plans, decrees"
                active={category === 'Policy'}
                onClick={() => { setCategory(category === 'Policy' ? 'all' : 'Policy'); resetPaging(); }}
              />
              <StatCard
                label="Matching filters"
                value={filtered.length.toString()}
                sub={country === 'all' ? 'All countries' : countries.find(c => c.code === country)?.name ?? country}
              />
            </section>

            {/* Choropleth — one polygon per member state, metric switchable */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-tertiary-dark mb-2">Map</h2>
              <NationalClimatePoliciesMap
                metrics={countryMetrics}
                selected={country}
                onSelect={(code) => { setCountry(code); resetPaging(); }}
              />
            </section>

            {/* Deep insights — recomputed from the catalogue on every load */}
            <section className="mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-lg font-semibold text-tertiary-dark">Deep insights</h2>
                <span className="text-[11px] text-tertiary">
                  Computed live from the {stats.total}-instrument catalogue — click a country chip to filter
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                {insights.map((ins) => (
                  <InsightCard
                    key={ins.id}
                    insight={ins}
                    onCountryClick={(code) => { setCountry(code); resetPaging(); }}
                  />
                ))}
              </div>
            </section>

            {/* Solution space — EU vs member-state gap matrix */}
            <section className="mb-6">
              <div className="flex items-baseline justify-between mb-2">
                <h2 className="text-lg font-semibold text-tertiary-dark">
                  Solution space &amp; policy gaps
                </h2>
                <span className="text-[11px] text-tertiary">
                  Where the EU and the member states act — and where nobody does
                </span>
              </div>
              <ClimateSolutionSpace
                msPolicies={policies}
                euPolicies={euPolicies}
                onSelectCountry={(code) => { setCountry(code); resetPaging(); }}
              />
            </section>

            {/* Cluster analysis — pre-computed K-Means/Ward artifact */}
            {clusterData && (
              <section className="mb-6">
                <div className="flex items-baseline justify-between mb-2">
                  <h2 className="text-lg font-semibold text-tertiary-dark">
                    Cluster analysis
                  </h2>
                  <span className="text-[11px] text-tertiary">
                    Unsupervised structure of the {clusterData.snapshotDate} snapshot — 12
                    policy families, {clusterData.countryGroups.length} country types
                  </span>
                </div>
                <ClusterAnalysisPanel
                  data={clusterData}
                  selectedCluster={cluster}
                  onSelectCluster={(id) => { setCluster(id); resetPaging(); }}
                  onSelectCountry={(code) => { setCountry(code); resetPaging(); }}
                />
              </section>
            )}

            {/* Coverage grid — one chip per geography */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-tertiary-dark mb-2">
                Coverage by member state &amp; EU level
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {countries.map((c) => (
                  <button
                    key={c.code}
                    onClick={() => { setCountry(country === c.code ? 'all' : c.code); resetPaging(); }}
                    className={`px-2.5 py-1.5 text-xs rounded border transition ${
                      country === c.code
                        ? 'bg-primary text-white border-primary'
                        : 'bg-white text-tertiary border-grey-200 hover:border-primary'
                    }`}
                  >
                    {c.name}
                    <span className={country === c.code ? 'ml-1.5 opacity-80' : 'ml-1.5 text-tertiary/60'}>
                      {c.count}
                    </span>
                  </button>
                ))}
              </div>
            </section>

            {/* Filters */}
            <section className="mb-5 flex flex-wrap gap-2 items-center">
              <input
                type="search"
                placeholder="Search title, summary, keyword…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); resetPaging(); }}
                className="flex-1 min-w-[200px] px-3 py-2 text-sm border border-grey-300 rounded focus:outline-none focus:border-primary"
              />
              <select
                value={country}
                onChange={(e) => { setCountry(e.target.value); resetPaging(); }}
                className="px-3 py-2 text-sm border border-grey-300 rounded bg-white"
              >
                <option value="all">All countries</option>
                {countries.map((c) => (
                  <option key={c.code} value={c.code}>{c.name} ({c.count})</option>
                ))}
              </select>
              <select
                value={sector}
                onChange={(e) => { setSector(e.target.value); resetPaging(); }}
                className="px-3 py-2 text-sm border border-grey-300 rounded bg-white"
              >
                <option value="all">All sectors</option>
                {sectors.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={response}
                onChange={(e) => { setResponse(e.target.value); resetPaging(); }}
                className="px-3 py-2 text-sm border border-grey-300 rounded bg-white"
              >
                <option value="all">Mitigation & adaptation</option>
                {responses.map((r) => (
                  <option key={r} value={r}>{RESPONSE_LABELS[r] ?? r}</option>
                ))}
              </select>
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="px-3 py-2 text-sm border border-grey-300 rounded bg-white"
              >
                <option value="newest">Newest first</option>
                <option value="oldest">Oldest first</option>
                <option value="title">Title A–Z</option>
              </select>
              {cluster !== 'all' && clusterData && (
                <button
                  onClick={() => { setCluster('all'); resetPaging(); }}
                  title="Clear the cluster filter"
                  className="px-3 py-2 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/20 transition"
                >
                  Family: {clusterData.clusters.find((c) => c.id === cluster)?.label ?? cluster} ✕
                </button>
              )}
            </section>

            {/* Illustrations — follow the active filters (except the
                member-state mix, which keeps the EU-27 reference) */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-tertiary-dark mb-2">
                Illustrations
                <span className="ml-2 text-xs font-normal text-tertiary">
                  {scopeLabel} · {filtered.length} instruments in scope
                </span>
              </h2>
              <NationalClimatePoliciesCharts
                policies={allPolicies}
                filtered={filtered}
                scopeLabel={scopeLabel}
              />
            </section>

            {/* List grouped by country */}
            <section className="space-y-5">
              {grouped.length === 0 && (
                <div className="text-sm text-tertiary p-6 text-center bg-grey-50 rounded">
                  No laws or policies match the current filters.
                </div>
              )}
              {grouped.map(([countryName, items]) => (
                <div key={countryName}>
                  <h3 className="text-sm font-semibold text-tertiary-dark mb-2 sticky top-[60px] sm:top-[72px] bg-white/95 backdrop-blur py-1 border-b border-grey-100">
                    {countryName}
                    <span className="ml-2 text-xs font-normal text-tertiary">
                      {items.length} shown
                    </span>
                  </h3>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((p) => <PolicyCard key={p.id} policy={p} />)}
                  </ul>
                </div>
              ))}
            </section>

            {filtered.length > visible && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setVisible((v) => v + 120)}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary rounded hover:bg-primary-dark"
                >
                  Show more ({filtered.length - visible} remaining)
                </button>
              </div>
            )}

            <p className="mt-8 text-[11px] text-tertiary border-t border-grey-100 pt-3">
              Source: {data?.source.name}, {data?.source.publisher}. Licensed{' '}
              {data?.source.license}. Sourced via the Climate Policy Radar open
              database; verify the current status of any instrument on{' '}
              <a
                href="https://climate-laws.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                climate-laws.org
              </a>{' '}
              before citing. EU-level instruments are curated in-repo (MethodHub
              Policy Navigator + supplement) and link to the authoritative
              EUR-Lex record.
            </p>
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}

// ───────────────────────────────────────────────────────────────────────────
// Sub-components
// ───────────────────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, tone, active, onClick,
}: {
  label: string;
  value: string;
  sub: string;
  tone?: 'green';
  active?: boolean;
  onClick?: () => void;
}) {
  const accent = tone === 'green' ? 'border-l-[#1B5E20]' : 'border-l-primary';
  const ring = active ? 'ring-2 ring-primary/40' : '';
  const cursor = onClick ? 'cursor-pointer hover:shadow-md hover:border-grey-300' : '';
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!onClick}
      className={`text-left w-full bg-white border border-grey-200 border-l-4 ${accent} ${ring} ${cursor} rounded p-3 transition disabled:cursor-default`}
    >
      <div className="text-[11px] uppercase tracking-wide text-tertiary">{label}</div>
      <div className="text-2xl font-bold text-tertiary-dark mt-0.5">{value}</div>
      <div className="text-[11px] text-tertiary mt-1 leading-tight">{sub}</div>
    </button>
  );
}

const INSIGHT_TONE_ACCENTS: Record<PolicyInsight['tone'], string> = {
  green: 'border-l-[#1B5E20]',
  amber: 'border-l-[#F9A825]',
  red: 'border-l-[#C62828]',
  neutral: 'border-l-primary',
};

function InsightCard({
  insight: ins,
  onCountryClick,
}: {
  insight: PolicyInsight;
  onCountryClick: (code: string) => void;
}) {
  const shown = ins.countries?.slice(0, 8) ?? [];
  const more = (ins.countries?.length ?? 0) - shown.length;
  return (
    <div
      className={`bg-white border border-grey-200 border-l-4 ${INSIGHT_TONE_ACCENTS[ins.tone]} rounded p-3`}
    >
      <div className="text-2xl font-bold text-tertiary-dark">{ins.headline}</div>
      <div className="text-xs font-semibold text-tertiary-dark mt-0.5">{ins.title}</div>
      <p className="text-[12px] text-tertiary leading-snug mt-1.5">{ins.body}</p>
      {shown.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {shown.map((c) => (
            <button
              key={c.code}
              onClick={() => onCountryClick(c.code)}
              title={`Filter the catalogue to ${c.name}`}
              className="text-[10px] px-1.5 py-0.5 rounded-full border border-grey-200 text-tertiary hover:border-primary hover:text-primary transition"
            >
              {c.name}
            </button>
          ))}
          {more > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 text-tertiary">+{more} more</span>
          )}
        </div>
      )}
    </div>
  );
}

function PolicyCard({ policy: p }: { policy: ClimatePolicy }) {
  const dot = CATEGORY_COLORS[p.category] ?? '#9E9E9E';
  return (
    <li className="bg-white border border-grey-200 hover:border-grey-300 rounded p-3 transition">
      <div className="flex items-start gap-2 mb-1.5">
        <span
          className="mt-1 inline-block w-2.5 h-2.5 rounded-full shrink-0"
          style={{ backgroundColor: dot }}
          title={p.category}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-wide text-tertiary">
            {p.category === 'Law' ? 'Legislative' : 'Executive'}
            {p.type && ` · ${p.type}`}
            {p.year && ` · ${p.year}`}
          </div>
          <div className="text-sm font-semibold text-tertiary-dark leading-snug">
            {p.title}
          </div>
        </div>
      </div>

      {(p.sectors.length > 0 || p.responses.length > 0) && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {p.responses.map((r) => (
            <span
              key={r}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary"
            >
              {RESPONSE_LABELS[r] ?? r}
            </span>
          ))}
          {p.sectors.slice(0, 4).map((s) => (
            <span
              key={s}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-grey-100 text-tertiary"
            >
              {s}
            </span>
          ))}
          {p.sectors.length > 4 && (
            <span className="text-[10px] px-1.5 py-0.5 text-tertiary">
              +{p.sectors.length - 4}
            </span>
          )}
        </div>
      )}

      {p.summary && (
        <p className="text-[12px] text-tertiary leading-snug line-clamp-3 mb-2">
          {p.summary}
        </p>
      )}

      <div className="flex flex-wrap gap-3 items-center text-[11px]">
        {p.documentUrl && p.documentUrl !== p.climateLawsUrl && (
          <a
            href={p.documentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Document ↗
          </a>
        )}
        <a
          href={p.climateLawsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          {p.climateLawsUrl.includes('climate-laws.org') ? 'climate-laws.org' : 'EUR-Lex'} ↗
        </a>
        {p.instruments.length > 0 && (
          <span className="ml-auto text-tertiary/70 truncate max-w-[50%]" title={p.instruments.join(', ')}>
            {p.instruments[0]}{p.instruments.length > 1 ? ` +${p.instruments.length - 1}` : ''}
          </span>
        )}
      </div>
    </li>
  );
}
