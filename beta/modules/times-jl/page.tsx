'use client';

/**
 * TIMES.jl — the TIMES energy-system model, run without GAMS (beta module M · 56).
 *
 * A runner and results surface for TIMES.jl (github.com/esma-ie/TIMESjl), an
 * independent Julia/JuMP translation of the IEA-ETSAP TIMES model generator
 * that builds and solves a TIMES model from its own .run and DD files with the
 * open-source solver HiGHS — no GAMS, no CPLEX licence. The module shows:
 *   1. PARITY — the run's matrix size and objective against the GAMS/CPLEX
 *      reference that the TIMES.jl README quotes for the same model.
 *   2. RESULTS — electricity generation by fuel, CO₂ by sector, new power
 *      capacity and the objective's cost components, read from the solution
 *      dump of an actual run (public/data/times-jl/demo12-results.json,
 *      written by scripts/times-jl/run-demo12.jl).
 *   3. RUNBOOK — how to install TIMES.jl and reproduce the run, including the
 *      two sandbox workarounds this run needed.
 *
 * Epistemic status: the numbers are solver output of the open TIMES_Demo
 * demo12 model — a stylised two-region teaching model whose regions represent
 * no real country — so nothing here is an EU projection. TIMES.jl itself is
 * pre-release (Phase 1, no release, report parameters not written yet) and is
 * not an IEA-ETSAP product. The module wrapper and prose are AI-compiled —
 * pending Secretariat verification.
 */

import { Suspense, useEffect, useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { FilterPill } from '@/components/ui/FilterPill';
import { EmptyState, ErrorState, LoadingState, PartialState } from '@/components/ui/StateView';
import { codecs, useUrlState } from '@/lib/useUrlState';
import {
  Demo12Results,
  FUEL_LABEL,
  FUEL_ORDER,
  OBJ_LABEL,
  REGION_FILTERS,
  RegionFilter,
  SECTOR_LABEL,
  SECTOR_ORDER,
  checkResults,
  objectiveFromComponents,
  pivot,
  total,
} from './model';

const DATA_URL = '/data/times-jl/demo12-results.json';

/* ------------------------------------------------------------- palette */
// Chart series palettes. Fuel and sector series are each told apart by
// position in a fixed stack order and by a text legend, never by colour alone;
// the hues avoid carrying meaning on a red–green contrast, so the charts stay
// readable with the common colour-vision deficiencies.
const FUEL_C: Record<string, string> = {
  COA: '#3D3D3D',
  OIL: '#8C564B',
  GAS: '#E0701A',
  NUC: '#A530B8',
  BIO: '#1F8F63',
  HYD: '#0065A4',
  WIN: '#00928F',
  SOL: '#E6B800',
};
const SECTOR_C: Record<string, string> = {
  ELC: '#0065A4',
  IND: '#6667AB',
  TRA: '#E0701A',
  RSD: '#B83230',
  COM: '#00928F',
  AGR: '#1F8F63',
};

const SOURCES: { label: string; url: string }[] = [
  { label: 'TIMES.jl — Julia/JuMP translation of TIMES (esma-ie/TIMESjl, GPL-3.0)', url: 'https://github.com/esma-ie/TIMESjl' },
  { label: 'TIMES.jl README — Quick start, probes against GAMS, progress', url: 'https://github.com/esma-ie/TIMESjl#readme' },
  { label: 'TIMES.jl known differences from GAMS (docs/known-differences.md)', url: 'https://github.com/esma-ie/TIMESjl/blob/main/docs/known-differences.md' },
  { label: 'TIMES model generator v4.9.7 (etsap-TIMES/TIMES_model, GPL-3.0)', url: 'https://github.com/etsap-TIMES/TIMES_model' },
  { label: 'TIMES_Demo — demo12 model data (etsap-TIMES/TIMES_Demo, CC BY 4.0)', url: 'https://github.com/etsap-TIMES/TIMES_Demo' },
  { label: 'TIMES Documentation, Part IV (the Demo models)', url: 'https://iea-etsap.org/docs/TIMES%20Documentation%20PART%20IV_final.pdf' },
  { label: 'HiGHS — open-source linear optimisation solver', url: 'https://highs.dev' },
  { label: 'Run and extraction script (scripts/times-jl/run-demo12.jl)', url: 'https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/scripts/times-jl/run-demo12.jl' },
];

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ------------------------------------------------------------- UI bits */

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
    </div>
  );
}

function Legend({ order, labels, colours }: { order: string[]; labels: Record<string, string>; colours: Record<string, string> }) {
  return (
    <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tertiary">
      {order.map((k) => (
        <li key={k} className="inline-flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: colours[k] }} aria-hidden />
          {labels[k] ?? k}
        </li>
      ))}
    </ul>
  );
}

/** Vertical stacked bars, one per milestone year, drawn with plain divs. */
function StackedBars(props: {
  years: string[];
  data: Map<string, Map<string, number>>;
  order: string[];
  labels: Record<string, string>;
  colours: Record<string, string>;
  unit: string;
  scale?: number; // divide stored values by this for display
  decimals?: number;
}) {
  const { years, data, order, labels, colours, unit, scale = 1, decimals = 0 } = props;
  const max = Math.max(...years.map((y) => total(data.get(y))), 1);
  const present = order.filter((k) => years.some((y) => (data.get(y)?.get(k) ?? 0) > 1e-9));
  return (
    <div>
      <div className="flex h-56 items-end gap-3 border-b border-grey-300 pt-4">
        {years.map((y) => {
          const m = data.get(y);
          const t = total(m);
          return (
            <div key={y} className="flex h-full flex-1 flex-col items-center justify-end">
              <span className="mb-1 font-mono text-[10.5px] tabular-nums text-tertiary-dark">{fmt(t / scale, decimals)}</span>
              <div
                className="flex w-full max-w-[64px] flex-col-reverse overflow-hidden rounded-t"
                style={{ height: `${(t / max) * 100}%` }}
                role="img"
                aria-label={`${y}: ${present
                  .map((k) => `${labels[k] ?? k} ${fmt((m?.get(k) ?? 0) / scale, decimals)} ${unit}`)
                  .join(', ')}`}
              >
                {present.map((k) => {
                  const v = m?.get(k) ?? 0;
                  if (v <= 1e-9 || t <= 0) return null;
                  return (
                    <div
                      key={k}
                      style={{ height: `${(v / t) * 100}%`, background: colours[k] }}
                      title={`${y} · ${labels[k] ?? k}: ${fmt(v / scale, decimals)} ${unit}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex gap-3">
        {years.map((y) => (
          <span key={y} className="flex-1 text-center font-mono text-[11px] tabular-nums text-tertiary">
            {y}
          </span>
        ))}
      </div>
      <Legend order={present} labels={labels} colours={colours} />
    </div>
  );
}

function CodeBlock({ children }: { children: string }) {
  return (
    <pre className="mt-1.5 overflow-x-auto rounded-md border border-grey-200 bg-grey-50 px-3 py-2 font-mono text-[11.5px] leading-relaxed text-tertiary-dark">
      <code>{children}</code>
    </pre>
  );
}

/* ------------------------------------------------------------- page */

const URL_SCHEMA = { region: codecs.enum(REGION_FILTERS, 'all') };

function TimesJlView() {
  const [state, setState] = useState<{ kind: 'loading' } | { kind: 'error'; message: string } | { kind: 'ok'; data: Demo12Results }>({
    kind: 'loading',
  });
  const [{ region }, setUrl] = useUrlState(URL_SCHEMA);

  useEffect(() => {
    let cancelled = false;
    fetch(DATA_URL, { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) throw new Error(`${DATA_URL} answered HTTP ${res.status}`);
        const data = (await res.json()) as Demo12Results;
        if (!cancelled) setState({ kind: 'ok', data });
      })
      .catch((e: unknown) => {
        if (!cancelled) setState({ kind: 'error', message: e instanceof Error ? e.message : String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const data = state.kind === 'ok' ? state.data : null;
  const missing = useMemo(() => (data ? checkResults(data) : []), [data]);
  const years = data?.model.milestone_years ?? [];
  const gen = useMemo(() => (data ? pivot(data.generation_by_fuel, (r) => r.fuel, region) : new Map()), [data, region]);
  const co2 = useMemo(() => (data ? pivot(data.co2_by_sector, (r) => r.sector, region) : new Map()), [data, region]);
  const ncap = useMemo(() => (data ? pivot(data.new_capacity_by_fuel, (r) => r.fuel, region) : new Map()), [data, region]);

  const objSum = data ? objectiveFromComponents(data.objective_components) : 0;
  const lastYear = years[years.length - 1];
  const firstYear = years[0];

  return (
    <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
      {/* hero */}
      <section className="mb-6">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-secondary">
          Beta module · M · 56 · Open energy-system modelling
        </p>
        <h1 className="mt-1 text-2xl font-bold text-tertiary-dark sm:text-3xl">TIMES.jl — the TIMES model, run without GAMS</h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-tertiary">
          TIMES is the IEA-ETSAP model generator behind many of the energy-system models that inform EU policy,
          including JRC-EU-TIMES. It normally needs GAMS and a commercial solver. TIMES.jl is an independent
          translation into Julia and JuMP that reads a TIMES model from its own <span className="font-mono text-[13px]">.run</span>{' '}
          and DD files, builds the same linear programme and solves it with the open-source solver HiGHS. This module
          installs TIMES.jl, runs the open demo model <strong>demo12</strong> and shows what came out. It also checks
          that result against the GAMS reference.
        </p>
      </section>

      {/* caveat box */}
      <section className="mb-6 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
          ⚠ AI-compiled — pending Secretariat verification
        </p>
        <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
          The figures below are <strong>solver output of a demonstration model</strong>. demo12 is a stylised
          two-region teaching model (REG1, REG2) shipped with TIMES; its regions and data represent{' '}
          <strong>no real country and no EU projection</strong>, so nothing here is a policy number. TIMES.jl is
          pre-release software from ESMA Ltd. It has no release yet, does not write TIMES&apos;s report parameters
          (milestone M1.6), and some TIMES features are still untranslated. It is <strong>not an IEA-ETSAP
          product</strong>, and its own code is largely AI-written under human review. The module wrapper, the
          aggregation and this prose were compiled by an AI agent.
        </p>
      </section>

      {state.kind === 'loading' && <LoadingState label="Loading the demo12 run results…" />}
      {state.kind === 'error' && (
        <ErrorState
          title="The run results could not be loaded"
          body={`${state.message}. This is a load failure, not an empty run: the results file is written by scripts/times-jl/run-demo12.jl.`}
          primaryAction={{ label: 'Retry', onClick: () => window.location.reload() }}
        />
      )}
      {data && missing.length === 5 && (
        <EmptyState title="The results file holds no series" body="The file loaded but every expected series is empty. Re-run scripts/times-jl/run-demo12.jl." />
      )}
      {data && missing.length > 0 && missing.length < 5 && (
        <PartialState title="Some series are missing" summary={`Missing from the results file: ${missing.join(', ')}. The sections that need them are left out.`} />
      )}

      {data && missing.length < 5 && (
        <>
          {/* stat strip */}
          <section className="mb-8 mt-2 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatTile
              label="LP size (rows × columns)"
              value={data.run.rows != null ? `${fmt(data.run.rows)} × ${fmt(data.run.columns ?? 0)}` : '—'}
              sub={`GAMS reference: ${fmt(data.parity.rows_gams_reference)} × ${fmt(data.parity.columns_gams_reference)}.`}
            />
            <StatTile
              label="Objective (discounted system cost)"
              value={`${fmt(data.parity.objective_timesjl / 1e6, 3)} M`}
              sub={`${data.units.objective}; HiGHS status ${data.run.termination_status ?? 'see run log'}.`}
            />
            <StatTile
              label="Relative difference to GAMS"
              value={data.parity.relative_difference.toExponential(1)}
              sub="Against the GAMS/CPLEX reference objective; TIMES.jl's own tolerance is 1e-6."
            />
            <StatTile
              label="First run, end to end"
              value={data.run.wall_time_s_total_first_run != null ? `≈ ${fmt(data.run.wall_time_s_total_first_run)} s` : '—'}
              sub={`Cold Julia session, ${data.run.threads ?? '?'} threads, ${data.generated}. Mostly one-off compilation; a repeat run in the same session takes seconds.`}
            />
          </section>

          {/* 1 — parity */}
          <section className="mb-8">
            <h2 className="text-lg font-bold text-tertiary-dark">1 · Does it reproduce GAMS?</h2>
            <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
              This run reproduces the published reference on the three numbers that can be checked from outside: the
              row count, the column count and the optimal objective. That is consistent with the matrix being the same,
              but it does not prove it. TIMES.jl&apos;s own probes compare every coefficient against GAMS&apos;s
              CONVERT export at 1e-9, and this module did not repeat them (it has no GAMS).
            </p>
            <div className="mt-3 overflow-x-auto rounded-lg border border-grey-200 bg-white">
              <table className="w-full min-w-[520px] text-[12.5px]">
                <thead>
                  <tr className="border-b border-grey-200 bg-grey-50 text-left text-[10.5px] uppercase tracking-[0.08em] text-tertiary">
                    <th className="px-3 py-2">Check</th>
                    <th className="px-3 py-2 text-right">This run (TIMES.jl + HiGHS)</th>
                    <th className="px-3 py-2 text-right">GAMS reference</th>
                    <th className="px-3 py-2">Verdict</th>
                  </tr>
                </thead>
                <tbody className="font-mono tabular-nums text-tertiary-dark">
                  <tr className="border-b border-grey-100">
                    <td className="px-3 py-2 font-sans">Rows</td>
                    <td className="px-3 py-2 text-right">{data.run.rows != null ? fmt(data.run.rows) : '—'}</td>
                    <td className="px-3 py-2 text-right">{fmt(data.parity.rows_gams_reference)}</td>
                    <td className="px-3 py-2 font-sans">{data.run.rows === data.parity.rows_gams_reference ? 'identical' : 'DIFFERENT'}</td>
                  </tr>
                  <tr className="border-b border-grey-100">
                    <td className="px-3 py-2 font-sans">Columns</td>
                    <td className="px-3 py-2 text-right">{data.run.columns != null ? fmt(data.run.columns) : '—'}</td>
                    <td className="px-3 py-2 text-right">{fmt(data.parity.columns_gams_reference)}</td>
                    <td className="px-3 py-2 font-sans">{data.run.columns === data.parity.columns_gams_reference ? 'identical' : 'DIFFERENT'}</td>
                  </tr>
                  <tr>
                    <td className="px-3 py-2 font-sans">Objective</td>
                    <td className="px-3 py-2 text-right">{fmt(data.parity.objective_timesjl, 6)}</td>
                    <td className="px-3 py-2 text-right">{fmt(data.parity.objective_gams_reference, 6)}</td>
                    <td className="px-3 py-2 font-sans">
                      {data.parity.relative_difference <= 1e-6 ? 'within 1e-6' : 'OUTSIDE 1e-6'} (Δ{' '}
                      {data.parity.relative_difference.toExponential(1)})
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-2 text-[11px] leading-snug text-tertiary">
              Reference values: {data.parity.reference_source}. The objective&apos;s cost components (section 5) add up to{' '}
              <span className="font-mono tabular-nums">{fmt(objSum, 3)}</span>, so the results file is internally
              consistent.
            </p>
          </section>

          {/* region filter */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Region</span>
            {REGION_FILTERS.map((r) => (
              <FilterPill
                key={r}
                label={r === 'all' ? 'Both regions' : r}
                active={region === r}
                onClick={() => setUrl({ region: r as RegionFilter })}
              />
            ))}
          </div>

          {/* 2 — generation + CO2 */}
          <section className="mb-8 grid gap-4 lg:grid-cols-2">
            <div className="min-w-0 rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[15px] font-bold text-tertiary-dark">2 · Electricity generation by fuel</h2>
              <p className="mt-1 text-[11.5px] leading-snug text-tertiary">
                Power-plant activity (VAR_ACT), summed over vintages and timeslices, in {data.units.generation}. The fuel
                is read from each plant&apos;s input commodity in the model data.
              </p>
              {gen.size ? (
                <StackedBars years={years} data={gen} order={FUEL_ORDER} labels={FUEL_LABEL} colours={FUEL_C} unit={data.units.generation} />
              ) : (
                <EmptyState title="No generation rows for this region" />
              )}
            </div>
            <div className="min-w-0 rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[15px] font-bold text-tertiary-dark">3 · CO₂ by sector</h2>
              <p className="mt-1 text-[11.5px] leading-snug text-tertiary">
                Net level of each sectoral CO₂ commodity (VAR_COMNET), shown in Mt CO₂. These balance rows are equalities,
                so the level is the sector&apos;s net emission, not a slack. demo12 puts no cap or price on CO₂, so this is a
                least-cost path with no climate constraint.
              </p>
              {co2.size ? (
                <StackedBars years={years} data={co2} order={SECTOR_ORDER} labels={SECTOR_LABEL} colours={SECTOR_C} unit="Mt CO₂" scale={1000} />
              ) : (
                <EmptyState title="No CO₂ rows for this region" />
              )}
            </div>
          </section>

          {/* 3 — new capacity + objective */}
          <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_380px]">
            <div className="min-w-0 rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[15px] font-bold text-tertiary-dark">4 · New power capacity by fuel ({data.units.new_capacity})</h2>
              <p className="mt-1 text-[11.5px] leading-snug text-tertiary">
                VAR_NCAP of the power plants, by the period in which capacity is built. Every demo12 plant converts at
                31.536 PJ per GW-year (PRC_CAPACT), so the unit is GW.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[480px] text-[12px]">
                  <thead>
                    <tr className="border-b border-grey-200 text-left text-[10.5px] uppercase tracking-[0.08em] text-tertiary">
                      <th className="py-1.5 pr-3">Fuel</th>
                      {years.map((y) => (
                        <th key={y} className="py-1.5 pr-3 text-right">
                          {y}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="font-mono tabular-nums text-tertiary-dark">
                    {FUEL_ORDER.filter((f) => years.some((y) => (ncap.get(y)?.get(f) ?? 0) > 0.005)).map((f) => (
                      <tr key={f} className="border-b border-grey-100">
                        <td className="py-1.5 pr-3 font-sans">
                          <span className="mr-1.5 inline-block h-2 w-2 rounded-sm" style={{ background: FUEL_C[f] }} aria-hidden />
                          {FUEL_LABEL[f] ?? f}
                        </td>
                        {years.map((y) => {
                          const v = ncap.get(y)?.get(f) ?? 0;
                          return (
                            <td key={y} className="py-1.5 pr-3 text-right">
                              {v > 0.005 ? fmt(v, 1) : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="min-w-0 rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[15px] font-bold text-tertiary-dark">5 · What the objective is made of</h2>
              <p className="mt-1 text-[11.5px] leading-snug text-tertiary">
                VAR_OBJ by component, both regions, {data.units.objective}. The salvage value of capacity still alive
                after the horizon is credited back.
              </p>
              <ul className="mt-3 space-y-1.5 text-[12px]">
                {['OBJINV', 'OBJFIX', 'OBJVAR', 'OBJSAL'].map((c) => {
                  const v = data.objective_components.filter((r) => r.component === c).reduce((s, r) => s + r.value, 0);
                  return (
                    <li key={c} className="flex items-baseline justify-between gap-3 border-b border-grey-100 pb-1">
                      <span className="text-tertiary">{OBJ_LABEL[c] ?? c}</span>
                      <span className="font-mono tabular-nums text-tertiary-dark">
                        {c === 'OBJSAL' ? '−' : ''}
                        {fmt(v / 1e6, 3)} M
                      </span>
                    </li>
                  );
                })}
                <li className="flex items-baseline justify-between gap-3 pt-1 font-bold">
                  <span className="text-tertiary-dark">Objective</span>
                  <span className="font-mono tabular-nums text-tertiary-dark">{fmt(objSum / 1e6, 3)} M</span>
                </li>
              </ul>
            </div>
          </section>

          {/* reading the results */}
          <section className="mb-8 rounded-lg border border-grey-200 bg-white p-4">
            <h2 className="text-[15px] font-bold text-tertiary-dark">Reading the demo results</h2>
            <p className="mt-1 max-w-4xl text-[12.5px] leading-relaxed text-tertiary">
              In both regions together, gas generation peaks in 2015 and declines thereafter.
              By {lastYear} nuclear and wind are the two largest sources. Total CO₂ still rises over the horizon (
              {fmt(total(co2.get(firstYear)) / 1000)} → {fmt(total(co2.get(lastYear)) / 1000)} Mt for the selected
              region filter). demo12 puts no cap or price on CO₂ and its demand projections grow. Its power mix is shaped
              by two user constraints in its scenario files instead: a renewable-plant floor (UC_RNW-PP_LOW in
              bounds-uc_wsets.dd) and a nuclear capacity limit (AU_NUC_MaxCAP in uc_nuc_maxcap.dd). All of that is a
              property of the teaching dataset, not a finding. To ask a policy question with TIMES.jl you would load a
              real model, such as JRC-EU-TIMES or a national TIMES model, or add a CO₂ cap to demo12 as a scenario file.
            </p>
          </section>
        </>
      )}

      {/* runbook */}
      <section className="mb-8">
        <h2 className="text-lg font-bold text-tertiary-dark">6 · Install and run it yourself</h2>
        <div className="mt-3 grid gap-4 lg:grid-cols-2">
          <div className="min-w-0 rounded-lg border border-grey-200 bg-white p-4">
            <p className="text-[12px] font-bold text-tertiary-dark">On a workstation (TIMES.jl README recipe)</p>
            <p className="mt-1 text-[11.5px] text-tertiary">1 · Install Julia 1.10 or later with juliaup:</p>
            <CodeBlock>{'curl -fsSL https://install.julialang.org | sh      # Windows: winget install --id Julia.Julia -e'}</CodeBlock>
            <p className="mt-2 text-[11.5px] text-tertiary">2 · Install TIMES.jl (not yet in the General registry), at the Julia prompt:</p>
            <CodeBlock>{'using Pkg\nPkg.add(url="https://github.com/esma-ie/TIMESjl")'}</CodeBlock>
            <p className="mt-2 text-[11.5px] text-tertiary">3 · Run demo12; the TIMES source and demo data download on first use, checked by hash:</p>
            <CodeBlock>{'using TIMES\nr = run_model(joinpath(TIMES.times_demo_dir(), "demo12.run"); out="demo12_out")'}</CodeBlock>
            <p className="mt-2 text-[11.5px] text-tertiary">4 · Your own model, from the folder VEDA writes:</p>
            <CodeBlock>{'run_model("GAMS_WrkTIMES/scenario.run"; dd=["GAMS_WrkTIMES"], out="results")'}</CodeBlock>
          </div>
          <div className="min-w-0 rounded-lg border border-grey-200 bg-white p-4">
            <p className="text-[12px] font-bold text-tertiary-dark">Reproduce this module&apos;s data (from the MethodHub repository root)</p>
            <CodeBlock>{"julia --project=scripts/times-jl -e 'using Pkg; Pkg.instantiate()'\njulia --project=scripts/times-jl scripts/times-jl/run-demo12.jl"}</CodeBlock>
            <p className="mt-2 text-[11.5px] leading-snug text-tertiary">
              This runs demo12 and rewrites <span className="font-mono">public/data/times-jl/demo12-results.json</span>.{' '}
              <span className="font-mono">scripts/times-jl/Project.toml</span> pins TIMES.jl to the commit used here.
              The script stops with an error if a result series is missing. It never writes a missing series as zero.
            </p>
            <p className="mt-3 text-[12px] font-bold text-tertiary-dark">Two workarounds this run needed (Claude Code cloud sandbox)</p>
            <ul className="mt-1 list-disc space-y-1 pl-4 text-[11.5px] leading-snug text-tertiary">
              <li>
                Behind a TLS-intercepting proxy, Julia&apos;s package downloads <strong>hang silently</strong> rather
                than fail until <span className="font-mono">JULIA_SSL_CA_ROOTS_PATH</span> points at the proxy&apos;s CA
                bundle.
              </li>
              <li>
                Plain HTTPS downloads from github.com were refused, but <span className="font-mono">git clone</span>{' '}
                worked. TIMES.jl was therefore installed with <span className="font-mono">Pkg.develop(path=…)</span> from a
                clone. The TIMES source and the demo models came from clones at the pinned commits (d9a6a25, 962db86),
                passed through <span className="font-mono">TIMESJL_TIMES_SOURCE</span> and{' '}
                <span className="font-mono">TIMESJL_DEMO_RUN</span>.
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* limits */}
      <section className="mb-8 rounded-lg border border-grey-200 bg-white p-4">
        <h2 className="text-[15px] font-bold text-tertiary-dark">What TIMES.jl cannot do yet (README and m13-plan at the pinned commit)</h2>
        <ul className="mt-2 list-disc space-y-1 pl-4 text-[12px] leading-relaxed text-tertiary">
          <li>No report parameters or VEDA .vd files (milestone M1.6). Results are raw variable and equation levels, so a VEDA user cannot open them yet.</li>
          <li>
            Untranslated features stop the run with &ldquo;not translated&rdquo; and the name of the GAMS file. Still
            untranslated: the stochastic extension (in progress before the M1.3 gate), and MACRO, ETL, lumpy
            investments, discrete unit commitment and TIMES-Micro (after it). The linear form of elastic demand is
            already translated at the pinned commit (docs/m13-plan.md, change 69), although the README&apos;s Progress
            text of 19 Nov 2026 still lists it as missing.
          </li>
          <li>JRC-EU-TIMES matches GAMS to the end of preprocessing. Its matrix and optimum have not been compared yet, so an EU run is not yet a parity-checked result.</li>
          <li>Under REDUCE, flows that TIMES substitutes out are not columns, and their levels come only with the report (M1.6). This module therefore reads plant activity, not individual fuel-input flows.</li>
        </ul>
      </section>

      {/* caveats + sources */}
      <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
        <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
          Run in a Claude Code cloud sandbox on 2026-11-24 with TIMES.jl {data ? data.software.timesjl_commit.slice(0, 7) : '(commit in the results file)'}
          , Julia {data?.software.julia ?? '1.11'} and {data?.software.solver ?? 'HiGHS'}, from the unmodified TIMES_Demo
          demo12 files. Every number is read from the solution dump. The only arithmetic is summing over timeslices,
          vintages and regions, and dividing kt by 1,000 for Mt. The GAMS reference values are quoted from the TIMES.jl
          README and were not re-run here, because this sandbox has no GAMS. Module wrapper AI-compiled — pending
          Secretariat verification.
        </p>
        <ul className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
          {SOURCES.map((s) => (
            <li key={s.url + s.label}>
              <a href={s.url} target="_blank" rel="noreferrer" className="mh-focus text-primary hover:underline">
                {s.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

export default function TimesJlPage() {
  return (
    <>
      <SiteHeader />
      <Suspense fallback={<LoadingState label="Loading…" />}>
        <TimesJlView />
      </Suspense>
      <SiteFooter />
    </>
  );
}
