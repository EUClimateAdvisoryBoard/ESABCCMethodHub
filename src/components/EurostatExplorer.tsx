'use client';

/**
 * EurostatExplorer — dedicated UI for the "Statistics" mode of the Data &
 * Scenario Explorer.
 *
 * Unlike the scenario projection picker (database → preset → variables),
 * the statistics mode is structured around two grouped pickers:
 *
 *   1. Variables — grouped by topic (Climate, Energy, Economy, …) so users
 *      can drill from the broad aggregate down to a sectoral metric.
 *   2. Regions — grouped by tier (EU aggregates, member states, EFTA, …).
 *
 * After both selections, the user clicks "Load data" to fetch every
 * (variable × region) combination from the Eurostat REST API and renders
 * one ScenarioChart per variable, with one line per region.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';

const ScenarioChart = dynamic(() => import('@/components/ScenarioChart'), { ssr: false });

interface EurostatVariableInfo {
  name: string;
  label: string;
  unit: string;
  description?: string;
  eurostatDoi?: string;
  eurostatUrl?: string;
}

interface GroupedVariables {
  group: string;
  variables: EurostatVariableInfo[];
}

interface TieredRegions {
  tier: string;
  regions: { name: string; code: string }[];
}

interface Datapoint {
  year: number;
  value: number;
  region: string;
  variable: string;
  unit: string;
}

interface ChartBundle {
  variable: string;
  unit: string;
  series: { label: string; points: { year: number; value: number }[] }[];
  /** Eurostat DOI link for the underlying dataset */
  eurostatDoi?: string;
  /** Direct Eurostat database browser link */
  eurostatUrl?: string;
}

const DEFAULT_REGIONS = ['EU27 (2020)', 'Germany', 'France'];
const DEFAULT_VARIABLES = ['Emissions|Kyoto Gases'];

export default function EurostatExplorer() {
  const [grouped, setGrouped] = useState<GroupedVariables[]>([]);
  const [tiered, setTiered] = useState<TieredRegions[]>([]);
  const [activeGroup, setActiveGroup] = useState<string>('Climate & emissions');
  const [activeTier, setActiveTier] = useState<string>('EU member states');

  const [selVariables, setSelVariables] = useState<string[]>(DEFAULT_VARIABLES);
  const [selRegions, setSelRegions] = useState<string[]>(DEFAULT_REGIONS);
  const [variableFilter, setVariableFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const [charts, setCharts] = useState<ChartBundle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // ── Load metadata once ──────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [g, r] = await Promise.all([
          fetch('/api/scenarios?db=eurostat&action=grouped-variables').then(r => r.json()),
          fetch('/api/scenarios?db=eurostat&action=tiered-regions').then(r => r.json()),
        ]);
        if (cancelled) return;
        if (Array.isArray(g)) setGrouped(g);
        if (Array.isArray(r)) setTiered(r);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load metadata');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // ── Variable → URL lookup ─────────────────────────────────────────
  const variableUrlMap = useMemo(() => {
    const map: Record<string, { eurostatDoi?: string; eurostatUrl?: string }> = {};
    for (const g of grouped) {
      for (const v of g.variables) {
        map[v.name] = { eurostatDoi: v.eurostatDoi, eurostatUrl: v.eurostatUrl };
      }
    }
    return map;
  }, [grouped]);

  // ── Derived lists ──────────────────────────────────────────────────
  const activeGroupVariables = useMemo(() => {
    const g = grouped.find(x => x.group === activeGroup);
    if (!g) return [];
    if (!variableFilter) return g.variables;
    const q = variableFilter.toLowerCase();
    return g.variables.filter(v => v.name.toLowerCase().includes(q) || v.label.toLowerCase().includes(q));
  }, [grouped, activeGroup, variableFilter]);

  const activeTierRegions = useMemo(() => {
    const t = tiered.find(x => x.tier === activeTier);
    if (!t) return [];
    if (!regionFilter) return t.regions;
    const q = regionFilter.toLowerCase();
    return t.regions.filter(r => r.name.toLowerCase().includes(q));
  }, [tiered, activeTier, regionFilter]);

  // ── Selection helpers ──────────────────────────────────────────────
  const toggleVariable = useCallback((name: string) => {
    setSelVariables(prev => prev.includes(name) ? prev.filter(v => v !== name) : [...prev, name]);
  }, []);

  const toggleRegion = useCallback((name: string) => {
    setSelRegions(prev => prev.includes(name) ? prev.filter(r => r !== name) : [...prev, name]);
  }, []);

  const clearVariables = useCallback(() => setSelVariables([]), []);
  const clearRegions = useCallback(() => setSelRegions([]), []);

  // ── Data fetching ──────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    if (selVariables.length === 0 || selRegions.length === 0) {
      setError('Pick at least one variable and one region.');
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;

    setLoading(true);
    setError(null);
    setProgress({ done: 0, total: selVariables.length * selRegions.length });

    const results: Record<string, ChartBundle> = {};
    let done = 0;

    try {
      for (const variable of selVariables) {
        for (const region of selRegions) {
          const params = new URLSearchParams({
            db: 'eurostat',
            action: 'datapoints',
            variables: variable,
            regions: region,
          });
          try {
            const res = await fetch(`/api/scenarios?${params.toString()}`, { signal: ac.signal });
            if (!res.ok) throw new Error(`${res.status}`);
            const json = await res.json();
            const points: Datapoint[] = Array.isArray(json?.data) ? json.data : [];
            if (points.length === 0) {
              done += 1;
              setProgress({ done, total: selVariables.length * selRegions.length });
              continue;
            }
            const unit = points[0]?.unit || '';
            const urls = variableUrlMap[variable] || {};
            const bundle = results[variable] || {
              variable,
              unit,
              series: [],
              eurostatDoi: json.eurostatDoi || urls.eurostatDoi,
              eurostatUrl: json.eurostatUrl || urls.eurostatUrl,
            };
            bundle.unit = unit;
            // Filter to the requested region label so multi-region requests work
            const filtered = points.filter(p => p.region === region || normaliseRegion(p.region) === region);
            const usePoints = filtered.length > 0 ? filtered : points;
            bundle.series.push({
              label: region,
              points: usePoints
                .map(p => ({ year: p.year, value: p.value }))
                .sort((a, b) => a.year - b.year),
            });
            results[variable] = bundle;
          } catch (innerErr) {
            if ((innerErr as Error).name === 'AbortError') throw innerErr;
            // Swallow per-cell errors so one bad variable doesn't kill the whole load
            console.warn(`Eurostat load failed for ${variable} / ${region}:`, innerErr);
          }
          done += 1;
          setProgress({ done, total: selVariables.length * selRegions.length });
        }
      }
      setCharts(Object.values(results));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError(err instanceof Error ? err.message : 'Failed to load data');
      }
    } finally {
      setLoading(false);
      setProgress(null);
    }
  }, [selVariables, selRegions, variableUrlMap]);

  // ── Render ─────────────────────────────────────────────────────────
  const totalSelected = selVariables.length + selRegions.length;

  return (
    <div className="space-y-4">
      {/* Pickers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Variable picker */}
        <div className="bg-white border border-grey-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">
              Variable {selVariables.length > 0 && <span className="text-primary">({selVariables.length})</span>}
            </h3>
            {selVariables.length > 0 && (
              <button onClick={clearVariables} className="text-[10px] text-tertiary hover:text-primary underline">
                Clear
              </button>
            )}
          </div>
          {/* Group tabs */}
          <div className="flex flex-wrap gap-1 mb-2">
            {grouped.map(g => (
              <button
                key={g.group}
                onClick={() => setActiveGroup(g.group)}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                  activeGroup === g.group
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary hover:text-primary'
                }`}>
                {g.group}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={variableFilter}
            onChange={e => setVariableFilter(e.target.value)}
            placeholder="Filter variables…"
            className="w-full px-2 py-1 text-xs border border-grey-200 rounded mb-2 focus:outline-none focus:border-primary"
          />
          <div className="max-h-64 overflow-y-auto pr-1 space-y-1">
            {activeGroupVariables.length === 0 ? (
              <div className="text-[11px] text-tertiary italic py-2">No variables match in this group.</div>
            ) : (
              activeGroupVariables.map(v => {
                const checked = selVariables.includes(v.name);
                return (
                  <label
                    key={v.name}
                    className={`flex items-start gap-2 p-1.5 rounded text-[11px] cursor-pointer transition ${
                      checked ? 'bg-primary/5 border border-primary/20' : 'hover:bg-grey-50 border border-transparent'
                    }`}
                    title={v.description || v.label}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleVariable(v.name)}
                      className="mt-0.5 accent-primary"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-tertiary-dark truncate">{v.name}</div>
                      <div className="text-[10px] text-tertiary truncate">{v.label} · {v.unit}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        </div>

        {/* Region picker */}
        <div className="bg-white border border-grey-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold text-tertiary uppercase tracking-wider">
              Region {selRegions.length > 0 && <span className="text-primary">({selRegions.length})</span>}
            </h3>
            {selRegions.length > 0 && (
              <button onClick={clearRegions} className="text-[10px] text-tertiary hover:text-primary underline">
                Clear
              </button>
            )}
          </div>
          {/* Tier tabs */}
          <div className="flex flex-wrap gap-1 mb-2">
            {tiered.map(t => (
              <button
                key={t.tier}
                onClick={() => setActiveTier(t.tier)}
                className={`px-2 py-1 rounded text-[11px] font-medium border transition ${
                  activeTier === t.tier
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-white text-tertiary-dark border-grey-200 hover:border-secondary hover:text-secondary'
                }`}>
                {t.tier}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={regionFilter}
            onChange={e => setRegionFilter(e.target.value)}
            placeholder="Filter regions…"
            className="w-full px-2 py-1 text-xs border border-grey-200 rounded mb-2 focus:outline-none focus:border-secondary"
          />
          <div className="max-h-64 overflow-y-auto pr-1 grid grid-cols-2 gap-1">
            {activeTierRegions.length === 0 ? (
              <div className="text-[11px] text-tertiary italic py-2 col-span-2">No regions in this tier.</div>
            ) : (
              activeTierRegions.map(r => {
                const checked = selRegions.includes(r.name);
                return (
                  <label
                    key={r.name}
                    className={`flex items-center gap-2 p-1.5 rounded text-[11px] cursor-pointer transition ${
                      checked ? 'bg-secondary/5 border border-secondary/20' : 'hover:bg-grey-50 border border-transparent'
                    }`}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRegion(r.name)}
                      className="accent-secondary"
                    />
                    <span className="text-tertiary-dark truncate">{r.name}</span>
                  </label>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Selection summary + load button */}
      <div className="bg-grey-50 border border-grey-200 rounded-lg px-3 py-2 flex flex-wrap items-center gap-3">
        <div className="text-[11px] text-tertiary flex-1 min-w-0">
          {totalSelected === 0 ? (
            <span className="italic">Pick variables and regions, then click <strong>Load data</strong>.</span>
          ) : (
            <span>
              <strong className="text-tertiary-dark">{selVariables.length}</strong> variable{selVariables.length === 1 ? '' : 's'}
              {' · '}
              <strong className="text-tertiary-dark">{selRegions.length}</strong> region{selRegions.length === 1 ? '' : 's'}
              {' = '}
              <strong className="text-tertiary-dark">{selVariables.length * selRegions.length}</strong> series
            </span>
          )}
        </div>
        <button
          onClick={loadData}
          disabled={loading || selVariables.length === 0 || selRegions.length === 0}
          className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition">
          {loading ? `Loading… ${progress ? `${progress.done}/${progress.total}` : ''}` : 'Load data'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 text-xs rounded px-3 py-2">
          {error}
        </div>
      )}

      {/* Charts */}
      {charts.length > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
          {charts.map(chart => (
            <div key={chart.variable} className="bg-white rounded-lg shadow-sm border border-grey-200 p-2 sm:p-3">
              <div className="text-xs font-bold text-tertiary-dark mb-1.5 truncate" title={chart.variable}>
                {chart.variable}
              </div>
              <ScenarioChart
                series={chart.series}
                unit={chart.unit}
                variable={chart.variable}
                region={chart.series.map(s => s.label).join(', ')}
                historical
                compact
              />
              {/* Eurostat source link */}
              <div className="mt-1.5 flex items-center gap-2 text-[10px] text-tertiary">
                <span>Source:</span>
                {chart.eurostatDoi ? (
                  <a
                    href={chart.eurostatDoi}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                    title="Eurostat DOI (persistent link)"
                  >
                    Eurostat (DOI)
                  </a>
                ) : chart.eurostatUrl ? (
                  <a
                    href={chart.eurostatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Eurostat
                  </a>
                ) : (
                  <span>Eurostat</span>
                )}
                {chart.eurostatUrl && (
                  <a
                    href={chart.eurostatUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-tertiary hover:text-primary hover:underline"
                    title="View dataset in Eurostat database browser"
                  >
                    [database]
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && charts.length === 0 && !error && (
        <div className="bg-white border border-dashed border-grey-200 rounded-lg p-8 text-center">
          <p className="text-sm text-tertiary">Pick variables and regions above, then click <strong>Load data</strong> to see Eurostat statistics.</p>
        </div>
      )}
    </div>
  );
}

/**
 * Eurostat returns regions either as ISO codes ("DE") or our display names
 * ("Germany"). The fetch loop already passes the display name in, so this
 * helper just normalises a couple of common labels for safety.
 */
function normaliseRegion(s: string): string {
  if (!s) return '';
  return s.replace(/\s*\(.*\)\s*/g, '').trim();
}
