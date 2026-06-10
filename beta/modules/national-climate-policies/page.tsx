'use client';

/**
 * National Level Climate Policies — beta module.
 * -----------------------------------------------
 * Catalogue of the national climate laws and policies of all EU-27 member
 * states, sourced from Climate Change Laws of the World (climate-laws.org,
 * Grantham Research Institute at LSE / Climate Policy Radar, CC-BY 4.0).
 *
 * The page reads a committed snapshot from
 * `public/data/national-climate-policies.json`. The snapshot is refreshed
 * from Climate Policy Radar's public REST API with:
 *
 *   node scripts/fetch-climate-laws.mjs
 *
 * (The current snapshot was derived from CPR's open-data release because
 * the API host is not reachable from the build sandbox; the script hits
 * the live API and overwrites it with current data when run on a normal
 * network.)
 *
 * Features: per-country coverage grid, search, country / category /
 * sector / response filters, sortable list grouped by member state, and
 * deep links to the source document PDF and climate-laws.org.
 */

import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

interface ClimatePolicy {
  id: string;
  countryCode: string;
  countryName: string;
  title: string;
  summary: string;
  category: string; // 'Law' (legislative) | 'Policy' (executive)
  type: string;
  date: string;
  year: number | null;
  sectors: string[];
  instruments: string[];
  frameworks: string[];
  responses: string[];
  keywords: string[];
  hazards: string[];
  language: string;
  documentUrl: string;
  climateLawsUrl: string;
}

interface PolicyDataset {
  snapshotDate: string;
  generatedFrom: string;
  source: {
    name: string;
    publisher: string;
    url: string;
    license: string;
    licenseUrl: string;
  };
  refresh: string;
  policies: ClimatePolicy[];
}

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
  const [data, setData] = useState<PolicyDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [country, setCountry] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [sector, setSector] = useState<string>('all');
  const [response, setResponse] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('newest');
  const [visible, setVisible] = useState(80);

  useEffect(() => {
    fetch('/data/national-climate-policies.json', { cache: 'no-store' })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<PolicyDataset>;
      })
      .then(setData)
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load'))
      .finally(() => setLoading(false));
  }, []);

  const policies = useMemo(() => data?.policies ?? [], [data]);

  const countries = useMemo(() => {
    const map = new Map<string, { name: string; count: number }>();
    policies.forEach((p) => {
      const cur = map.get(p.countryCode);
      if (cur) cur.count += 1;
      else map.set(p.countryCode, { name: p.countryName, count: 1 });
    });
    return Array.from(map.entries())
      .map(([code, v]) => ({ code, ...v }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [policies]);

  const sectors = useMemo(
    () => Array.from(new Set(policies.flatMap((p) => p.sectors))).sort(),
    [policies],
  );
  const responses = useMemo(
    () => Array.from(new Set(policies.flatMap((p) => p.responses))).sort(),
    [policies],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = policies.filter((p) => {
      if (country !== 'all' && p.countryCode !== country) return false;
      if (category !== 'all' && p.category !== category) return false;
      if (sector !== 'all' && !p.sectors.includes(sector)) return false;
      if (response !== 'all' && !p.responses.includes(response)) return false;
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
  }, [policies, search, country, category, sector, response, sortKey]);

  const stats = useMemo(() => {
    const laws = policies.filter((p) => p.category === 'Law').length;
    const pols = policies.filter((p) => p.category === 'Policy').length;
    return { total: policies.length, laws, policies: pols, countries: countries.length };
  }, [policies, countries]);

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
            The national climate laws and policies of all 27 EU member states,
            from framework climate acts to sectoral strategies and decrees.
            Data:{' '}
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
            <p className="mt-1 text-xs text-tertiary">
              Snapshot of {data.snapshotDate} — refresh with{' '}
              <code className="bg-grey-50 border border-grey-200 rounded px-1">
                node scripts/fetch-climate-laws.mjs
              </code>
            </p>
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
                sub={`Across ${stats.countries} member states`}
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

            {/* Coverage grid — one chip per member state */}
            <section className="mb-6">
              <h2 className="text-lg font-semibold text-tertiary-dark mb-2">
                Coverage by member state
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
              before citing.
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
        {p.documentUrl && (
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
          climate-laws.org ↗
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
