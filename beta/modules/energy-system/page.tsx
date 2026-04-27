'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import Chart from 'chart.js/auto';
import CommentSection from '@/components/CommentSection';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import { EU_INTERCONNECTORS } from '@/lib/eu-countries';

// Leaflet touches `window` on mount, so the interactive geospatial map
// has to be loaded client-side only.
const PypsaLeafletMap = dynamic(() => import('@/components/PypsaLeafletMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: 560,
        background: '#eef2f7',
        borderRadius: 6,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#64748b',
        fontSize: 12,
      }}
    >
      Loading interactive map…
    </div>
  ),
});

/**
 * Energy System Modelling
 *
 * User toggles a set of assumptions, then POSTs a job to the built-in
 * Python optimization service (pypsa-service). The UI polls for progress,
 * renders dispatch / capacity / cost charts, and offers a PDF report
 * download once the optimization has finished.
 */

type Assumptions = {
  scenario_name: string;
  year: number;
  co2_price_eur_per_t: number;
  renewable_share_target: number;
  co2_cap_mt: number | null;
  allow_nuclear: boolean;
  phase_out_coal: boolean;
  allow_storage: boolean;
  allow_hydrogen: boolean;
  grid_expansion_factor: number;
  demand_growth: number;
  discount_rate: number;
  snapshots: number;
};

type Result = {
  solver: string;
  status: string;
  total_cost_beur: number;
  lcoe_eur_per_mwh: number;
  co2_mt: number;
  data_source: string;
  data_citation: string;
  capacity_gw: Record<string, Record<string, number>>;
  dispatch_twh: Record<string, number>;
  hourly_by_tech: Record<string, number[]>;
  hourly_load: number[];
  flows_twh: Record<string, number>;
};

const PRESETS: { label: string; desc: string; patch: Partial<Assumptions> }[] = [
  {
    label: 'Current EU Policy (Fit-for-55)',
    desc: 'RED III 42.5% RES, ETS ~€75/t (EEX/ICE range 2025–early 2026: €65–85/t), coal phase-out not mandated, nuclear allowed, 2030',
    patch: {
      scenario_name: 'Fit-for-55 / RED III (2030)',
      year: 2030,
      co2_price_eur_per_t: 90,
      renewable_share_target: 0.425,
      co2_cap_mt: 1020,
      allow_nuclear: true,
      phase_out_coal: false,
      allow_storage: true,
      allow_hydrogen: false,
      grid_expansion_factor: 1.1,
      demand_growth: 0.05,
      discount_rate: 0.06,
      snapshots: 48,
    },
  },
  {
    label: '90% reduction by 2040',
    desc: 'EU 2040 Climate Target (Reg. 2026/667): -90% vs 1990, ETS ~€220/t, 75% RES, full coal phase-out, grid ×1.5',
    patch: {
      scenario_name: '90% by 2040',
      year: 2040,
      co2_price_eur_per_t: 220,
      renewable_share_target: 0.75,
      co2_cap_mt: 280,
      allow_nuclear: true,
      phase_out_coal: true,
      allow_storage: true,
      allow_hydrogen: true,
      grid_expansion_factor: 1.5,
      demand_growth: 0.20,
      discount_rate: 0.05,
      snapshots: 72,
    },
  },
  {
    label: 'Carbon neutrality 2050',
    desc: 'European Climate Law: net-zero 2050, ETS ~€350/t, 95% RES, grid ×2.0, full electrification',
    patch: {
      scenario_name: 'Net-Zero 2050',
      year: 2050,
      co2_price_eur_per_t: 350,
      renewable_share_target: 0.95,
      co2_cap_mt: 40,
      allow_nuclear: true,
      phase_out_coal: true,
      allow_storage: true,
      allow_hydrogen: true,
      grid_expansion_factor: 2.0,
      demand_growth: 0.40,
      discount_rate: 0.05,
      snapshots: 72,
    },
  },
];

// ---- Reference data ----------------------------------------------------
// Lifecycle CO2 intensity at today's commercial technology mix (gCO2eq/kWh).
// Values are IPCC AR6 WG3 Annex III medians (Table A.III.2) for power
// generation technologies, rounded to the nearest 5 g.
const STATIC_CO2_INTENSITY_G_PER_KWH: Record<string, number> = {
  'Onshore Wind': 11,
  'Offshore Wind': 12,
  'Solar PV': 45,
  'Nuclear': 12,
  'Hydro Reservoir': 24,
  'Gas OCGT': 560,
  'Gas CCGT': 490,
  'Coal': 820,
  'Battery (4h)': 30,        // storage: upstream manufacturing only
  'Hydrogen Turbine': 50,    // green-H2 assumed, includes electrolyser losses
};

// EU-27 installed capacity 2024 (GW). Source: EMBER European Electricity
// Review 2024 / IRENA IRENASTAT. Used as the "current" baseline for
// build-out-gap analysis.
const CURRENT_EU_CAPACITY_GW: Record<string, number> = {
  'Onshore Wind': 194,
  'Offshore Wind': 17,
  'Solar PV': 259,
  'Nuclear': 98,
  'Hydro Reservoir': 150,
  'Gas OCGT': 65,
  'Gas CCGT': 130,
  'Coal': 90,
  'Battery (4h)': 18,
  'Hydrogen Turbine': 0,
};

const DEFAULTS: Assumptions = {
  scenario_name: 'Custom',
  year: 2030,
  co2_price_eur_per_t: 100,
  renewable_share_target: 0.65,
  co2_cap_mt: null,
  allow_nuclear: true,
  phase_out_coal: true,
  allow_storage: true,
  allow_hydrogen: true,
  grid_expansion_factor: 1.2,
  demand_growth: 0.1,
  discount_rate: 0.05,
  snapshots: 48,
};

const COLORS: Record<string, string> = {
  'Onshore Wind': '#1F77B4',
  'Offshore Wind': '#005F8A',
  'Solar PV': '#FFBB33',
  'Nuclear': '#8B5CF6',
  'Hydro Reservoir': '#0EA5E9',
  'Gas OCGT': '#F97316',
  'Gas CCGT': '#EA580C',
  'Coal': '#404040',
  'Battery (4h)': '#22C55E',
  'Hydrogen Turbine': '#10B981',
};

export default function EnergySystemPage() {
  const [assumptions, setAssumptions] = useState<Assumptions>(DEFAULTS);
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);
  const [serviceHealth, setServiceHealth] = useState<any>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const dispatchChartRef = useRef<HTMLCanvasElement>(null);
  const mixChartRef = useRef<HTMLCanvasElement>(null);
  const capChartRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<Chart[]>([]);

  // Health check on mount
  useEffect(() => {
    fetch('/api/energy-optimization')
      .then(r => r.json())
      .then(d => {
        setServiceOnline(d.status === 'ok');
        setServiceHealth(d);
      })
      .catch(() => setServiceOnline(false));
  }, []);

  // Live Electricity Maps carbon intensity widget is intentionally disabled:
  // the free-tier Home Assistant token is scoped to a single zone, so showing
  // multi-zone live data would require a paid or academic license. The
  // PyPSA-Eur optimization above does not depend on this.

  const update = <K extends keyof Assumptions>(k: K, v: Assumptions[K]) => {
    setAssumptions(prev => ({ ...prev, [k]: v }));
  };

  const applyPreset = (patch: Partial<Assumptions>) => {
    setAssumptions({ ...DEFAULTS, ...patch });
  };

  const runOptimization = useCallback(async () => {
    setBusy(true);
    setError(null);
    setResult(null);
    setJobStatus('submitting');
    setProgress(0.05);

    try {
      const r = await fetch('/api/energy-optimization', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(assumptions),
      });
      const json = await r.json();
      if (!r.ok) {
        setError(json.hint || json.error || 'Failed to submit job');
        setBusy(false);
        setJobStatus(null);
        return;
      }
      setJobId(json.job_id);
      setJobStatus('queued');
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
      setJobStatus(null);
    }
  }, [assumptions]);

  // Poll job status
  useEffect(() => {
    if (!jobId || !busy) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const r = await fetch(`/api/energy-optimization?job=${jobId}`);
        const d = await r.json();
        setJobStatus(d.status);
        setProgress(d.progress ?? 0);
        if (d.status === 'done') {
          const rr = await fetch(`/api/energy-optimization?job=${jobId}&kind=result`);
          const data = await rr.json();
          setResult(data.result);
          setBusy(false);
          return;
        }
        if (d.status === 'error') {
          setError(d.error || 'optimization failed');
          setBusy(false);
          return;
        }
      } catch (e) {
        setError((e as Error).message);
        setBusy(false);
        return;
      }
      if (!cancelled) setTimeout(tick, 1500);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [jobId, busy]);

  // Render charts when result arrives
  useEffect(() => {
    charts.current.forEach(c => c.destroy());
    charts.current = [];
    if (!result) return;

    // Dispatch (stacked area) ----------------------------------------------
    if (dispatchChartRef.current && result.hourly_by_tech) {
      const techs = Object.keys(result.hourly_by_tech);
      const T = result.hourly_load.length;
      const labels = Array.from({ length: T }, (_, i) => `h${i + 1}`);
      const datasets = techs.map(tech => ({
        label: tech,
        data: result.hourly_by_tech[tech].map(v => v / 1000), // MW → GW
        backgroundColor: (COLORS[tech] || '#888') + 'CC',
        borderColor: COLORS[tech] || '#888',
        fill: true,
        tension: 0.2,
        pointRadius: 0,
        stack: 'gen',
      }));
      datasets.push({
        label: 'Load',
        data: result.hourly_load.map(v => v / 1000),
        backgroundColor: 'transparent' as any,
        borderColor: '#000',
        fill: false as any,
        tension: 0.2,
        pointRadius: 0,
        stack: 'load' as any,
      } as any);
      const c = new Chart(dispatchChartRef.current, {
        type: 'line',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          interaction: { mode: 'index', intersect: false },
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 10 } } },
            title: { display: true, text: 'Dispatch over representative window (GW)' },
          },
          scales: {
            y: { stacked: true, title: { display: true, text: 'GW' } },
            x: { title: { display: true, text: 'Snapshot' } },
          },
        },
      });
      charts.current.push(c);
    }

    // Annual mix (doughnut) -------------------------------------------------
    if (mixChartRef.current && result.dispatch_twh) {
      const labels = Object.keys(result.dispatch_twh);
      const data = Object.values(result.dispatch_twh);
      const bg = labels.map(l => COLORS[l] || '#888');
      const c = new Chart(mixChartRef.current, {
        type: 'doughnut',
        data: { labels, datasets: [{ data, backgroundColor: bg }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'right', labels: { font: { size: 10 } } },
            title: { display: true, text: 'Annual generation mix (TWh/yr)' },
          },
        },
      });
      charts.current.push(c);
    }

    // Capacity per country (stacked bar, top 15 + Others) -------------------
    if (capChartRef.current && result.capacity_gw) {
      // Sort countries by total capacity descending, show top 15
      const allBuses = Object.keys(result.capacity_gw);
      const busTotals = allBuses.map(b => ({
        bus: b,
        total: Object.values(result.capacity_gw[b]).reduce((s, v) => s + v, 0),
      })).sort((a, b) => b.total - a.total);

      const TOP_N = 15;
      const topBuses = busTotals.slice(0, TOP_N).map(b => b.bus);
      const otherBuses = busTotals.slice(TOP_N).map(b => b.bus);
      const labels = [...topBuses, ...(otherBuses.length ? ['Others'] : [])];

      const allTechs = Array.from(
        new Set(allBuses.flatMap(b => Object.keys(result.capacity_gw[b]))),
      );

      // Aggregate "Others"
      const othersMix: Record<string, number> = {};
      for (const b of otherBuses) {
        for (const [tech, gw] of Object.entries(result.capacity_gw[b])) {
          othersMix[tech] = (othersMix[tech] || 0) + gw;
        }
      }

      const datasets = allTechs.map(tech => ({
        label: tech,
        data: [
          ...topBuses.map(b => result.capacity_gw[b][tech] || 0),
          ...(otherBuses.length ? [othersMix[tech] || 0] : []),
        ],
        backgroundColor: COLORS[tech] || '#888',
      }));
      const c = new Chart(capChartRef.current, {
        type: 'bar',
        data: { labels, datasets },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { font: { size: 10 } } },
            title: { display: true, text: 'Installed capacity by country (GW)' },
          },
          scales: {
            x: { stacked: true },
            y: { stacked: true, title: { display: true, text: 'GW' } },
          },
        },
      });
      charts.current.push(c);
    }

    return () => {
      charts.current.forEach(c => c.destroy());
      charts.current = [];
    };
  }, [result]);

  const downloadReport = async () => {
    if (!jobId) return;
    const r = await fetch(`/api/energy-optimization?job=${jobId}&kind=report`);
    if (!r.ok) {
      setError('report download failed');
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `energy_system_${jobId.slice(0, 8)}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Energy System Modelling"
        subtitle={<>Run a simplified EU electricity system linear programme (capacity expansion and dispatch). Results include dispatch, capacity, costs, CO<sub>2</sub> and a PDF report.</>}
      >
        <p className="text-[11px] text-[#3D5265]/70">
          Service:{' '}
          {serviceOnline === null ? 'checking…' :
            serviceOnline ? <span className="text-[#00928F]">online</span> :
              <span className="text-[#B83230]">offline — deploy pypsa-service and set PYPSA_SERVICE_URL</span>}
          {serviceHealth && serviceOnline && (
            <>
              {' · '}
              <span>
                PyPSA {serviceHealth.pypsa_available
                  ? `v${serviceHealth.pypsa_version || '?'}`
                  : <span className="text-[#B83230]">not installed</span>}
              </span>
              {serviceHealth.pypsa_eur_network && (
                <span className="text-[#00928F]"> · PyPSA-Eur network loaded</span>
              )}
            </>
          )}
        </p>
      </PageHero>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[320px,1fr] gap-6">
        {/* Assumption panel */}
        <aside className="bg-white rounded-xl border border-grey-200 p-4 h-fit lg:sticky lg:top-[88px]">
          <h2 className="text-sm font-bold text-tertiary-dark mb-3">Scenario presets</h2>
          <div className="space-y-2 mb-4">
            {PRESETS.map(p => {
              const active = assumptions.scenario_name === p.patch.scenario_name;
              return (
                <button
                  key={p.label}
                  onClick={() => applyPreset(p.patch)}
                  className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                    active
                      ? 'bg-secondary-lightest border-secondary text-tertiary-dark'
                      : 'bg-grey-50 hover:bg-secondary-lightest border-grey-200 text-tertiary-dark'
                  }`}
                >
                  <div className="text-[12px] font-semibold">{p.label}</div>
                  <div className="text-[10px] text-tertiary mt-0.5 leading-snug">{p.desc}</div>
                </button>
              );
            })}
            <button
              onClick={() => applyPreset({ ...DEFAULTS, scenario_name: 'Custom' })}
              className={`w-full text-left px-3 py-2 rounded border transition-colors ${
                assumptions.scenario_name === 'Custom'
                  ? 'bg-secondary-lightest border-secondary'
                  : 'bg-grey-50 hover:bg-secondary-lightest border-grey-200'
              }`}
            >
              <div className="text-[12px] font-semibold text-tertiary-dark">Custom</div>
              <div className="text-[10px] text-tertiary mt-0.5 leading-snug">
                Take full control of every lever below.
              </div>
            </button>
          </div>

          <div className="border-t border-grey-200 pt-3">
            <button
              onClick={() => setShowAdvanced(v => !v)}
              className="w-full flex items-center justify-between text-sm font-bold text-tertiary-dark mb-3"
            >
              Custom assumptions
              <span className="text-[10px] text-tertiary">{showAdvanced ? '▾ hide' : '▸ show'}</span>
            </button>
          </div>

          {showAdvanced && (
            <>
          <label className="block text-[11px] text-tertiary mb-1">Scenario name</label>
          <input
            type="text"
            value={assumptions.scenario_name}
            onChange={e => update('scenario_name', e.target.value)}
            className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm mb-3"
          />

          <label className="block text-[11px] text-tertiary mb-1">
            Target year: <b>{assumptions.year}</b>
          </label>
          <div className="grid grid-cols-6 gap-1 mb-3">
            {[2025, 2030, 2035, 2040, 2045, 2050].map(y => (
              <button
                key={y}
                onClick={() => update('year', y)}
                className={`text-[10px] py-1 rounded border ${
                  assumptions.year === y
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-grey-50 text-tertiary border-grey-200 hover:bg-secondary-lightest'
                }`}
              >
                {y}
              </button>
            ))}
          </div>

          <label className="block text-[11px] text-tertiary mb-1">
            CO<sub>2</sub> price (ETS): <b>{assumptions.co2_price_eur_per_t} €/t</b>
          </label>
          <input type="range" min={0} max={500} step={10}
            value={assumptions.co2_price_eur_per_t}
            onChange={e => update('co2_price_eur_per_t', +e.target.value)}
            className="w-full mb-3" />

          <label className="block text-[11px] text-tertiary mb-1">
            Renewable share target: <b>{(assumptions.renewable_share_target * 100).toFixed(0)}%</b>
          </label>
          <input type="range" min={0} max={98} step={1}
            value={assumptions.renewable_share_target * 100}
            onChange={e => update('renewable_share_target', +e.target.value / 100)}
            className="w-full mb-3" />

          <label className="block text-[11px] text-tertiary mb-1">
            Hard CO<sub>2</sub> cap: <b>{
              assumptions.co2_cap_mt === null
                ? 'none'
                : `${assumptions.co2_cap_mt} Mt/yr`
            }</b>
          </label>
          <input type="range" min={0} max={1500} step={20}
            value={assumptions.co2_cap_mt ?? 1500}
            onChange={e => {
              const v = +e.target.value;
              update('co2_cap_mt', v >= 1500 ? null : v);
            }}
            className="w-full mb-1" />
          <p className="text-[9px] text-tertiary-light mb-3">
            Drag to 1500 Mt for "no cap". The EU-27 power sector emitted ≈620 Mt
            in 2023 (Ember); the 2040 impact assessment's -90% scenario implies ≈280 Mt power-sector emissions by 2040, net-zero ≈0–50 Mt by 2050.
          </p>

          <label className="block text-[11px] text-tertiary mb-1">
            Grid expansion factor: <b>{assumptions.grid_expansion_factor.toFixed(1)}×</b>
          </label>
          <input type="range" min={0.5} max={3} step={0.1}
            value={assumptions.grid_expansion_factor}
            onChange={e => update('grid_expansion_factor', +e.target.value)}
            className="w-full mb-3" />

          <label className="block text-[11px] text-tertiary mb-1">
            Demand growth (vs 2023): <b>{(assumptions.demand_growth * 100).toFixed(0)}%</b>
          </label>
          <input type="range" min={-20} max={80} step={5}
            value={assumptions.demand_growth * 100}
            onChange={e => update('demand_growth', +e.target.value / 100)}
            className="w-full mb-3" />

          <label className="block text-[11px] text-tertiary mb-1">
            Social discount rate: <b>{(assumptions.discount_rate * 100).toFixed(1)}%</b>
          </label>
          <input type="range" min={1} max={12} step={0.5}
            value={assumptions.discount_rate * 100}
            onChange={e => update('discount_rate', +e.target.value / 100)}
            className="w-full mb-3" />

          <label className="block text-[11px] text-tertiary mb-1">
            Representative snapshots (hours): <b>{assumptions.snapshots}</b>
          </label>
          <input type="range" min={24} max={168} step={12}
            value={assumptions.snapshots}
            onChange={e => update('snapshots', +e.target.value)}
            className="w-full mb-1" />
          <p className="text-[9px] text-tertiary-light mb-3">
            Higher = more accurate but slower (HF free tier solves ~72 h in 3-10 s).
          </p>

          <p className="text-[11px] font-semibold text-tertiary-dark mb-2">
            Technology availability
          </p>
          <div className="space-y-2 mb-4">
            {([
              ['allow_nuclear', 'Allow nuclear'],
              ['phase_out_coal', 'Phase out coal'],
              ['allow_storage', 'Battery storage (4 h)'],
              ['allow_hydrogen', 'Hydrogen turbines'],
            ] as [keyof Assumptions, string][]).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-[12px] text-tertiary-dark">
                <input
                  type="checkbox"
                  checked={assumptions[k] as boolean}
                  onChange={e => update(k, e.target.checked as any)}
                />
                {label}
              </label>
            ))}
          </div>
            </>
          )}

          <button
            onClick={runOptimization}
            disabled={busy || serviceOnline === false}
            className="w-full px-3 py-2.5 bg-primary hover:bg-primary-dark text-white rounded font-medium text-sm disabled:opacity-50"
          >
            {busy ? 'Running…' : 'Run optimization'}
          </button>

          {busy && (
            <div className="mt-3">
              <p className="text-[11px] text-tertiary mb-1">
                Status: <b>{jobStatus}</b>
              </p>
              <div className="w-full bg-grey-100 rounded h-2 overflow-hidden">
                <div
                  className="bg-secondary h-full transition-all"
                  style={{ width: `${progress * 100}%` }}
                />
              </div>
            </div>
          )}

          {error && (
            <div className="mt-3 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}
        </aside>

        {/* Results */}
        <main className="space-y-4">
          {!result && !busy && (
            <div className="bg-white rounded-xl border border-grey-200 p-8 text-center text-tertiary">
              <p className="text-sm">
                Configure assumptions on the left and click <b>Run optimization</b>.
                A job is submitted to the hosted PyPSA backend
                (<code>pypsa.Network.optimize()</code> with HiGHS, the same
                stack PyPSA-Eur uses). Solve time is typically 2–10 seconds for
                48–72 snapshots.
              </p>
            </div>
          )}

          {result && (
            <>
              <div className="bg-white rounded-xl border border-grey-200 p-4">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-sm font-bold text-tertiary-dark">
                    Headline results
                  </h2>
                  <button
                    onClick={downloadReport}
                    className="text-[11px] px-3 py-1.5 bg-secondary hover:bg-secondary-dark text-white rounded font-medium"
                  >
                    ⭳ Download PDF report
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <Kpi label="Total cost" value={`${result.total_cost_beur} B€/yr`} />
                  <Kpi label="System LCOE" value={`${result.lcoe_eur_per_mwh} €/MWh`} />
                  <Kpi label="CO₂ emissions" value={`${result.co2_mt} Mt/yr`} />
                  <Kpi label="Solver" value={result.solver} small />
                </div>
                {result.data_source && (
                  <p className="text-[10px] text-tertiary mt-2">
                    Data source: <b>{result.data_source}</b>
                    {result.data_citation && (
                      <span className="text-tertiary-light"> — {result.data_citation}</span>
                    )}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-xl border border-grey-200 p-4">
                <div className="h-72">
                  <canvas ref={dispatchChartRef} />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-grey-200 p-4">
                  <div className="h-72">
                    <canvas ref={mixChartRef} />
                  </div>
                </div>
                <div className="bg-white rounded-xl border border-grey-200 p-4">
                  <div className="h-72">
                    <canvas ref={capChartRef} />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl border border-grey-200 p-4">
                <h2 className="text-sm font-bold text-tertiary-dark mb-2">
                  Network map — per-country capacity &amp; cross-border flows
                  <span className="text-[10px] text-tertiary-light ml-2 font-normal">
                    (interactive · Leaflet + OpenStreetMap)
                  </span>
                </h2>
                <PypsaLeafletMap result={result} colors={COLORS} height={520} />
                <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-1 text-[10px] mt-3 max-h-48 overflow-y-auto">
                  {Object.entries(result.flows_twh)
                    .filter(([, v]) => Math.abs(v) > 0.1)
                    .sort(([, a], [, b]) => Math.abs(b) - Math.abs(a))
                    .map(([k, v]) => (
                    <div key={k} className="bg-grey-50 rounded px-1.5 py-0.5 flex justify-between gap-1">
                      <span className="text-tertiary">{k}</span>
                      <span className={v >= 0 ? 'text-secondary-dark font-medium' : 'text-orange-600 font-medium'}>
                        {v > 0 ? '+' : ''}{v.toFixed(1)}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-tertiary-light mt-2">
                  Circles sized by total installed capacity per country; colours
                  show the dominant technology. Line width proportional to
                  cross-border flow magnitude. 30-country network with {EU_INTERCONNECTORS.length} bilateral
                  interconnectors from ENTSO-E TYNDP 2022.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-grey-200 p-4">
                <h2 className="text-sm font-bold text-tertiary-dark mb-2">
                  Infrastructure &amp; build-out gap
                </h2>
                <p className="text-[11px] text-tertiary mb-3">
                  Compares the scenario's optimal EU-27 capacity against what is
                  actually installed today (Ember 2024). Positive Δ = still to
                  build; negative = existing plants retired / idled. "Annual
                  build-out" assumes linear deployment between now and{' '}
                  <b>{assumptions.year}</b>.
                </p>

                <div className="mb-4">
                  <h3 className="text-[12px] font-semibold text-tertiary-dark mb-2">
                    Continental power-system map
                    <span className="text-[10px] text-tertiary-light ml-2 font-normal">
                      (interactive — zoom, pan, hover corridors, click nodes)
                    </span>
                  </h3>
                  <PypsaLeafletMap result={result} colors={COLORS} height={560} />
                  <p className="text-[10px] text-tertiary-light mt-2">
                    Real geospatial map (Leaflet + OpenStreetMap / CARTO tiles).
                    Same visual language as{' '}
                    <a
                      href="https://github.com/PyPSA/pypsa-eur"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      PyPSA-Eur
                    </a>
                    : orange = AC corridors, blue dashed = HVDC links (width
                    scales with cross-border flow); pie charts = per-country
                    technology mix (size scales with total capacity). Each of
                    the 30 countries is an individual bus with country-specific
                    demand, wind/solar capacity factors, and technology potentials.
                    Hover a line for the net flow, click a country for its full
                    capacity breakdown.
                  </p>
                </div>

                <InfrastructureGap result={result} targetYear={assumptions.year} />
              </div>

              <div className="bg-white rounded-xl border border-grey-200 p-4">
                <h2 className="text-sm font-bold text-tertiary-dark mb-2">
                  Static CO<sub>2</sub> intensity by technology
                  <span className="text-[10px] text-tertiary-light ml-2 font-normal">
                    (lifecycle gCO₂eq/kWh, IPCC AR6 WG3)
                  </span>
                </h2>
                <CO2IntensityTable result={result} />
              </div>
            </>
          )}

          <div className="bg-white rounded-xl border border-grey-200 p-4">
            <h2 className="text-sm font-bold text-tertiary-dark mb-2">
              About the model
            </h2>
            <p className="text-[12px] text-tertiary leading-relaxed mb-2">
              The optimizer uses a <b>30-country EU network</b> (EU-27 + Norway,
              Switzerland, UK) where each country is an individual bus with
              country-specific demand, wind/solar capacity factors, hydro
              resources, and technology potentials. Technologies include
              onshore &amp; offshore wind, solar, nuclear, hydro, gas OCGT/CCGT,
              coal, battery and hydrogen turbines. Cross-border transmission
              uses {EU_INTERCONNECTORS.length} bilateral interconnectors with
              NTC capacities from ENTSO-E TYNDP 2022. Capacity expansion and
              dispatch are solved jointly as a single linear programme using
              the real{' '}
              <a href="https://github.com/PyPSA/pypsa-eur" target="_blank"
                 rel="noopener noreferrer" className="underline">PyPSA</a>{' '}
              library via <code>pypsa.Network.optimize()</code> with HiGHS —
              the same stack and call PyPSA-Eur's snakemake workflow uses.
              Technology costs are loaded directly from{' '}
              <a href="https://github.com/PyPSA/technology-data" target="_blank"
                 rel="noopener noreferrer" className="underline">
                PyPSA/technology-data v0.14.0
              </a>{' '}
              (<code>costs_YYYY.csv</code>).
            </p>
            <p className="text-[12px] text-tertiary leading-relaxed mb-2">
              <b>Real open-source data.</b> The backend tries, in order:{' '}
              (1) a pre-built PyPSA-Eur network if{' '}
              <code>PYPSA_EUR_NETWORK</code> is set; (2) per-country load and
              wind / solar profiles from <b>Open Power System Data</b> 2019;
              (3) atlite + ERA5 cutouts if the <code>atlite</code> library
              and a cutout file are configured.
            </p>
            <p className="text-[11px] text-tertiary-light">
              Sources: PyPSA / PyPSA-Eur (Hörsch et&nbsp;al. 2018),
              PyPSA/technology-data v0.14.0, Open Power System Data,
              renewables.ninja (Pfenninger &amp; Staffell 2016),
              atlite + ERA5 (Hofmann et&nbsp;al. 2021), JRC ENSPRESO, EC Impact
              Assessment for the 2040 Climate Target, IEA World Energy Outlook,
              EMBER European Electricity Review 2024, IPCC AR6 WG3 Annex III.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-grey-200 p-4">
            <CommentSection policyId="energy-system" />
          </div>
        </main>
      </div>
    </div>
  );
}

function Kpi({ label, value, small }: { label: string; value: string; small?: boolean }) {
  return (
    <div className="bg-grey-50 rounded-lg p-3">
      <p className="text-[10px] text-tertiary uppercase tracking-wide">{label}</p>
      <p className={`font-bold text-tertiary-dark ${small ? 'text-xs' : 'text-lg'}`}>{value}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Infrastructure build-out gap
// ---------------------------------------------------------------------------

function InfrastructureGap({ result, targetYear }: { result: Result; targetYear: number }) {
  // Aggregate scenario capacity across all country buses
  const scenario: Record<string, number> = {};
  for (const mix of Object.values(result.capacity_gw)) {
    for (const [tech, gw] of Object.entries(mix)) {
      scenario[tech] = (scenario[tech] || 0) + gw;
    }
  }
  const today = new Date().getFullYear();
  const yearsLeft = Math.max(1, targetYear - today);
  const techs = Array.from(
    new Set([...Object.keys(scenario), ...Object.keys(CURRENT_EU_CAPACITY_GW)]),
  ).sort((a, b) => {
    const da = (scenario[a] || 0) - (CURRENT_EU_CAPACITY_GW[a] || 0);
    const db = (scenario[b] || 0) - (CURRENT_EU_CAPACITY_GW[b] || 0);
    return db - da;
  });
  const biggestGap = techs.reduce(
    (acc, t) => {
      const delta = (scenario[t] || 0) - (CURRENT_EU_CAPACITY_GW[t] || 0);
      return delta > acc.delta ? { tech: t, delta } : acc;
    },
    { tech: '', delta: 0 },
  );

  return (
    <>
      <div className="responsive-table overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-tertiary-light border-b border-grey-200">
              <th className="py-1.5 pr-2">Technology</th>
              <th className="py-1.5 pr-2 text-right">Today (2024)</th>
              <th className="py-1.5 pr-2 text-right">Scenario {targetYear}</th>
              <th className="py-1.5 pr-2 text-right">Δ to build</th>
              <th className="py-1.5 pr-2 text-right">Annual rate</th>
            </tr>
          </thead>
          <tbody>
            {techs.map(tech => {
              const cur = CURRENT_EU_CAPACITY_GW[tech] || 0;
              const sc = scenario[tech] || 0;
              const delta = sc - cur;
              const annual = delta / yearsLeft;
              const swatch = COLORS[tech] || '#888';
              return (
                <tr key={tech} className="border-b border-grey-100">
                  <td data-label="Technology" className="py-1.5 pr-2 text-tertiary-dark flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ background: swatch }}
                    />
                    {tech}
                  </td>
                  <td data-label="Today (2024)" className="py-1.5 pr-2 text-right text-tertiary">{cur.toFixed(0)}</td>
                  <td data-label={`Scenario ${targetYear}`} className="py-1.5 pr-2 text-right text-tertiary-dark font-medium">
                    {sc.toFixed(0)}
                  </td>
                  <td
                    data-label="Δ to build"
                    className={`py-1.5 pr-2 text-right font-semibold ${
                      delta > 0
                        ? 'text-secondary-dark'
                        : delta < 0
                          ? 'text-orange-600'
                          : 'text-tertiary-light'
                    }`}
                  >
                    {delta > 0 ? '+' : ''}
                    {delta.toFixed(0)} GW
                  </td>
                  <td data-label="Annual rate" className="py-1.5 pr-2 text-right text-tertiary">
                    {annual >= 0 ? '+' : ''}
                    {annual.toFixed(1)} GW/yr
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {biggestGap.tech && biggestGap.delta > 0 && (
        <div className="mt-3 bg-secondary-lightest border border-secondary rounded-lg p-3 text-[11px]">
          <p className="text-tertiary-dark">
            <b>Biggest build-out challenge:</b> {biggestGap.tech} —{' '}
            <b>+{biggestGap.delta.toFixed(0)} GW</b> by {targetYear}, i.e.{' '}
            <b>{(biggestGap.delta / yearsLeft).toFixed(1)} GW/yr</b> for the
            next {yearsLeft} years. For comparison, in 2023 the EU added ~56 GW of solar (SolarPower Europe) and ~16 GW of wind (WindEurope).
          </p>
        </div>
      )}
    </>
  );
}

// ---------------------------------------------------------------------------
// Static CO2-intensity reference + scenario-weighted average
// ---------------------------------------------------------------------------

function CO2IntensityTable({ result }: { result: Result }) {
  const totalTwh = Object.values(result.dispatch_twh).reduce((s, v) => s + v, 0);
  const weightedCi = totalTwh > 0
    ? Object.entries(result.dispatch_twh).reduce((s, [tech, twh]) => {
        const ci = STATIC_CO2_INTENSITY_G_PER_KWH[tech] ?? 0;
        return s + (ci * twh) / totalTwh;
      }, 0)
    : 0;

  // Sort technologies by their share in the scenario, intensive ones first
  const rows = Object.keys(STATIC_CO2_INTENSITY_G_PER_KWH)
    .map(tech => ({
      tech,
      ci: STATIC_CO2_INTENSITY_G_PER_KWH[tech],
      twh: result.dispatch_twh[tech] || 0,
    }))
    .sort((a, b) => b.ci - a.ci);

  return (
    <>
      <div className="responsive-table overflow-x-auto">
        <table className="w-full text-[11px]">
          <thead>
            <tr className="text-left text-tertiary-light border-b border-grey-200">
              <th className="py-1.5 pr-2">Technology</th>
              <th className="py-1.5 pr-2 text-right">CI (gCO₂eq/kWh)</th>
              <th className="py-1.5 pr-2 text-right">Scenario TWh</th>
              <th className="py-1.5 pr-2 text-right">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ tech, ci, twh }) => {
              const share = totalTwh > 0 ? (twh / totalTwh) * 100 : 0;
              const swatch = COLORS[tech] || '#888';
              return (
                <tr key={tech} className="border-b border-grey-100">
                  <td data-label="Technology" className="py-1.5 pr-2 text-tertiary-dark flex items-center gap-2">
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-sm"
                      style={{ background: swatch }}
                    />
                    {tech}
                  </td>
                  <td
                    data-label="CI (gCO₂eq/kWh)"
                    className="py-1.5 pr-2 text-right font-medium"
                    style={{
                      color: ci > 400 ? '#b91c1c' : ci > 100 ? '#d97706' : '#15803d',
                    }}
                  >
                    {ci}
                  </td>
                  <td data-label="Scenario TWh" className="py-1.5 pr-2 text-right text-tertiary">
                    {twh.toFixed(1)}
                  </td>
                  <td data-label="Share" className="py-1.5 pr-2 text-right text-tertiary">
                    {share.toFixed(1)}%
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="bg-grey-50 rounded p-2">
          <p className="text-tertiary uppercase text-[9px]">Scenario weighted avg.</p>
          <p className="font-bold text-tertiary-dark text-base">
            {weightedCi.toFixed(0)}{' '}
            <span className="text-[9px] font-normal text-tertiary">gCO₂/kWh</span>
          </p>
        </div>
        <div className="bg-grey-50 rounded p-2">
          <p className="text-tertiary uppercase text-[9px]">EU-27 grid average 2023</p>
          <p className="font-bold text-tertiary-dark text-base">
            242{' '}
            <span className="text-[9px] font-normal text-tertiary">
              gCO₂/kWh (Ember)
            </span>
          </p>
        </div>
      </div>
      <p className="text-[9px] text-tertiary-light mt-2">
        Lifecycle median values (manufacturing + operation + decommissioning),
        IPCC AR6 WG3 Annex III Table A.III.2. Hydrogen turbine assumes 100%
        green-H2 from PEM electrolysis with grid-average electricity input.
      </p>
    </>
  );
}

// ---------------------------------------------------------------------------
// The continental power-system map is now rendered by `PypsaLeafletMap`
// (see `src/components/PypsaLeafletMap.tsx`) on a real geospatial basemap
// via Leaflet + OpenStreetMap / CARTO tiles. It consumes the same
// `result.capacity_gw` / `result.flows_twh` payload and the same COLORS
// palette used throughout this page.
// ---------------------------------------------------------------------------
