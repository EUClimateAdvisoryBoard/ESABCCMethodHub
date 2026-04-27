'use client';
/**
 * Funding Sources — beta module.
 * ------------------------------
 * Tracks EU research funding flowing into the topics the Board reports on.
 * Two upstream feeds are wired in so we can talk to DG RTD with concrete
 * numbers:
 *
 *   1. Horizon Dashboard — DG R&I project portfolio (CC-BY 4.0).
 *      https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/horizon-dashboard
 *   2. DG DIGIT QlikSense — broader tender / contract dashboard.
 *      https://dashboard.tech.ec.europa.eu/qs_digit_dashboard_mt/public/sense/app/3744499f-670f-42f8-9ef3-0d98f6cd586f/sheet/4c9ea8df-f0f9-4c0d-b26b-99fc0218d9d9/state/analysis
 *
 * The dashboards do not expose a stable JSON endpoint we can hit from the
 * browser, so the prototype reads a curated `public/data/funding-sources.json`
 * snapshot. A scheduled scraper (TODO scripts/fetch-funding-sources.py) will
 * replace the snapshot with a refreshed copy on a weekly cadence — design
 * is in beta/README.md.
 */
import { useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import { exportFundingToExcel } from './export';

interface FundingSource {
  id: string;
  name: string;
  url: string;
  publisher: string;
  license: string;
  refresh: string;
}

interface FundingProject {
  id: string;
  source: string;
  acronym: string;
  title: string;
  programme: string;
  pillar?: string;
  cluster?: string;
  topic?: string;
  coordinator: string;
  country: string;
  consortiumCountries: string[];
  startDate: string;
  endDate: string;
  ecContribution: number;
  totalCost: number;
  status: 'ongoing' | 'closing' | 'closed';
  keywords: string[];
  callDg: string;
}

interface FundingDataset {
  lastUpdated: string;
  sources: FundingSource[];
  projects: FundingProject[];
}

const fmtEUR = (n: number) =>
  n >= 1_000_000
    ? `€${(n / 1_000_000).toFixed(1)} M`
    : `€${(n / 1000).toFixed(0)} k`;

export default function FundingSourcesPage() {
  const [data, setData] = useState<FundingDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [dgFilter, setDgFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetch('/data/funding-sources.json', { cache: 'no-store' })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d: FundingDataset) => setData(d))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.trim().toLowerCase();
    return data.projects.filter(p => {
      if (dgFilter !== 'all' && p.callDg !== dgFilter) return false;
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (!q) return true;
      const hay = `${p.acronym} ${p.title} ${p.coordinator} ${p.keywords.join(' ')}`.toLowerCase();
      return hay.includes(q);
    });
  }, [data, search, dgFilter, statusFilter]);

  const totals = useMemo(() => {
    const ec = filtered.reduce((s, p) => s + p.ecContribution, 0);
    const tot = filtered.reduce((s, p) => s + p.totalCost, 0);
    const byDg = new Map<string, number>();
    for (const p of filtered) byDg.set(p.callDg, (byDg.get(p.callDg) || 0) + p.ecContribution);
    return {
      count: filtered.length,
      ec,
      tot,
      byDg: [...byDg.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [filtered]);

  const dgOptions = useMemo(() => {
    if (!data) return [];
    return [...new Set(data.projects.map(p => p.callDg))].sort();
  }, [data]);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Funding Sources"
        subtitle={
          <>
            EU research funding portfolio relevant to the Board, drawn from the{' '}
            <a className="underline" href="https://ec.europa.eu/info/funding-tenders/opportunities/portal/screen/opportunities/horizon-dashboard" target="_blank" rel="noopener noreferrer">Horizon Dashboard</a>{' '}
            and the{' '}
            <a className="underline" href="https://dashboard.tech.ec.europa.eu/qs_digit_dashboard_mt/public/sense/app/3744499f-670f-42f8-9ef3-0d98f6cd586f/sheet/4c9ea8df-f0f9-4c0d-b26b-99fc0218d9d9/state/analysis" target="_blank" rel="noopener noreferrer">DG DIGIT QlikSense dashboard</a>.
            Used to brief DG&nbsp;RTD and to estimate the EU-funded share of literature in our reports.
          </>
        }
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 space-y-8">
        {loading && <p className="text-sm text-tertiary">Loading funding portfolio…</p>}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded p-3 text-sm text-accent-red">
            Could not load <code>/data/funding-sources.json</code>: {error}
          </div>
        )}

        {data && (
          <>
            {/* Headline tiles */}
            <section className="grid grid-cols-1 sm:grid-cols-4 gap-3">
              <div className="bg-white border border-grey-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-[#007B6C]">{totals.count}</p>
                <p className="text-xs text-tertiary-dark font-semibold">Projects in view</p>
                <p className="text-[10px] text-tertiary">After current filters</p>
              </div>
              <div className="bg-white border border-grey-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-[#003399]">{fmtEUR(totals.ec)}</p>
                <p className="text-xs text-tertiary-dark font-semibold">EC contribution</p>
                <p className="text-[10px] text-tertiary">Sum of EU funding</p>
              </div>
              <div className="bg-white border border-grey-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-[#6667AB]">{fmtEUR(totals.tot)}</p>
                <p className="text-xs text-tertiary-dark font-semibold">Total project cost</p>
                <p className="text-[10px] text-tertiary">Including co-funding</p>
              </div>
              <div className="bg-white border border-grey-200 rounded-lg p-4">
                <p className="text-2xl font-bold text-[#E87722]">{data.lastUpdated}</p>
                <p className="text-xs text-tertiary-dark font-semibold">Snapshot date</p>
                <p className="text-[10px] text-tertiary">Updated weekly from upstream</p>
              </div>
            </section>

            {/* Filters */}
            <section className="bg-white border border-grey-200 rounded-lg p-4 flex flex-wrap items-end gap-3">
              <div className="flex-1 min-w-[220px]">
                <label className="block text-[11px] uppercase tracking-wide text-tertiary mb-1">Search</label>
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="acronym, title, coordinator, keyword…"
                  className="w-full bg-grey-100 border border-grey-200 rounded px-3 py-2 text-sm text-tertiary-dark"
                />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-tertiary mb-1">Lead DG</label>
                <select
                  value={dgFilter}
                  onChange={e => setDgFilter(e.target.value)}
                  className="bg-grey-100 border border-grey-200 rounded px-3 py-2 text-sm text-tertiary-dark"
                >
                  <option value="all">All</option>
                  {dgOptions.map(dg => <option key={dg} value={dg}>DG {dg}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-wide text-tertiary mb-1">Status</label>
                <select
                  value={statusFilter}
                  onChange={e => setStatusFilter(e.target.value)}
                  className="bg-grey-100 border border-grey-200 rounded px-3 py-2 text-sm text-tertiary-dark"
                >
                  <option value="all">All</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="closing">Closing</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
              <button
                disabled={exporting || filtered.length === 0}
                onClick={async () => {
                  if (!data) return;
                  setExporting(true);
                  try {
                    const filterParts: string[] = [];
                    if (search.trim())          filterParts.push(`search="${search.trim()}"`);
                    if (dgFilter !== 'all')     filterParts.push(`DG=${dgFilter}`);
                    if (statusFilter !== 'all') filterParts.push(`status=${statusFilter}`);
                    await exportFundingToExcel(filtered, {
                      snapshotDate: data.lastUpdated,
                      filterSummary: filterParts.join(' · '),
                    });
                  } finally {
                    setExporting(false);
                  }
                }}
                className="px-4 py-2 bg-primary hover:bg-primary-dark disabled:bg-grey-200 disabled:text-tertiary text-white rounded text-sm"
              >
                {exporting ? 'Exporting…' : 'Export to Excel'}
              </button>
            </section>

            {/* By-DG breakdown */}
            <section>
              <h2 className="text-lg font-bold text-tertiary-dark mb-2">EC contribution by lead DG</h2>
              <div className="bg-white border border-grey-200 rounded-lg p-4 space-y-2">
                {totals.byDg.length === 0 && <p className="text-sm text-tertiary">No projects match the filters.</p>}
                {totals.byDg.map(([dg, sum]) => {
                  const pct = totals.ec > 0 ? (sum / totals.ec) * 100 : 0;
                  return (
                    <div key={dg} className="flex items-center gap-3">
                      <span className="w-20 text-xs font-semibold text-tertiary-dark">DG {dg}</span>
                      <div className="flex-1 bg-grey-100 rounded h-3 overflow-hidden">
                        <div className="h-full bg-[#007B6C]" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="w-24 text-right text-xs text-tertiary-dark">{fmtEUR(sum)}</span>
                      <span className="w-12 text-right text-[10px] text-tertiary">{pct.toFixed(0)}%</span>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Project table */}
            <section>
              <h2 className="text-lg font-bold text-tertiary-dark mb-2">Projects ({filtered.length})</h2>
              <div className="overflow-x-auto bg-white border border-grey-200 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="bg-grey-50 text-tertiary-dark">
                    <tr>
                      <th className="text-left px-3 py-2 font-semibold">Acronym</th>
                      <th className="text-left px-3 py-2 font-semibold">Title</th>
                      <th className="text-left px-3 py-2 font-semibold">Coordinator</th>
                      <th className="text-left px-3 py-2 font-semibold">DG</th>
                      <th className="text-left px-3 py-2 font-semibold">Period</th>
                      <th className="text-right px-3 py-2 font-semibold">EC contribution</th>
                      <th className="text-left px-3 py-2 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map(p => (
                      <tr key={p.id} className="border-t border-grey-100 hover:bg-grey-50">
                        <td className="px-3 py-2 font-mono">{p.acronym}</td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-tertiary-dark">{p.title}</div>
                          <div className="text-[10px] text-tertiary">{p.programme} · {p.topic}</div>
                        </td>
                        <td className="px-3 py-2">
                          {p.coordinator}
                          <span className="ml-1 text-[10px] text-tertiary">({p.country})</span>
                        </td>
                        <td className="px-3 py-2">{p.callDg}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          {p.startDate.slice(0, 7)} → {p.endDate.slice(0, 7)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono">{fmtEUR(p.ecContribution)}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            p.status === 'ongoing' ? 'bg-green-50 text-green-700' :
                            p.status === 'closing' ? 'bg-amber-50 text-amber-700' :
                            'bg-grey-100 text-tertiary'
                          }`}>{p.status}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Sources */}
            <section className="bg-surface-blue rounded-lg p-5">
              <h2 className="text-sm font-bold text-tertiary-dark mb-3">Upstream feeds</h2>
              <div className="space-y-2 text-xs text-tertiary">
                {data.sources.map(s => (
                  <div key={s.id} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3">
                    <a className="font-semibold text-tertiary-dark underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
                    <span>{s.publisher} · {s.license} · refresh: {s.refresh}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-tertiary">
                The current snapshot is curated. A scheduled scraper will refresh it weekly once the upstream feeds are available headlessly.
              </p>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
