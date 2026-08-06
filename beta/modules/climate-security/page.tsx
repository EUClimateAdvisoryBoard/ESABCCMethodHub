'use client';

/**
 * Climate Security Ledger — Avoided Fossil Imports (beta module M · 45).
 *
 * What EU climate policy has already bought in energy security, and what
 * the remaining 2030 delivery gaps cost in the same currency — bcm of gas,
 * Mt of oil and coal, and euros sent abroad.
 *
 * Surfaces:
 *   1. THE COUNTERFACTUAL — frozen-structure baseline (frozen-2015 /
 *      frozen-2019, switchable), scaled by actual EU activity, against
 *      actual fossil demand 2015–2024; the gap × import share is the
 *      avoided import volume per fuel and year.
 *   2. THE AVOIDED BILL — valuation under three switchable price scenarios
 *      (2019 average / 2022 crisis / recent forward), € total and € per
 *      EU citizen.
 *   3. SUPPLIER DECOMPOSITION — the avoided volume at the pre-2022
 *      supplier mix (the "avoided Russian imports" line), alongside the
 *      post-2022 reality: the US LNG share tripled — a new dependency,
 *      recorded for even-handedness.
 *   4. FORWARD LEG — the 2030 delivery shortfalls (WEM vs WAM vs the
 *      advised path) as extra import volume and bill, with a 2022-style
 *      price-shock stress slider.
 *
 * Epistemic status: mixed, and the page says which is which. Since the
 * 2026-08 fact-check the BACKWARD leg runs on live Eurostat observations
 * and published World Bank price averages; the FORWARD leg still runs on
 * AI-inferred 2030 per-fuel levels and is pending Secretariat verification.
 * The arithmetic (model.ts) is deterministic and exact throughout.
 * This is NOT an attribution study: the frozen-structure counterfactual
 * cannot separate the effect of climate policy from the effect of the 2022
 * price shock itself. Not citable as a quantitative finding.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  DEMAND,
  EU_POPULATION_M,
  FUELS,
  FUEL_META,
  GAS_SUPPLIER_MIX,
  IMPORT_SHARE,
  PRICES,
  PRICE_SCENARIO_META,
  PROJ_2030,
  RUSSIAN_SHARE_2024,
  RUSSIAN_SHARE_PRE2022,
  YEARS,
  type Fuel,
  type PathKey,
  type PriceScenario,
} from './data.generated';
import {
  BASELINE_YEAR,
  avoidedImportSeries,
  baseIndex,
  billSeries,
  counterfactual,
  forwardLeg,
  perCitizen,
  stressedPrice,
  totalAvoidedVolume,
  totalBill,
  type BaselineKey,
} from './model';

/* ------------------------------------------------------------- palette */
// All raw hex in this module lives in this block (chart series only; the
// rest of the page uses the Tailwind semantic tokens). Colour-vision-
// deficiency note: the three fuel series are blue / orange / near-black —
// distinct in hue AND lightness; the supplier and pathway sets likewise
// pair hue differences with strong lightness differences, so no pair
// relies on red–green separation alone.
const FUEL_C: Record<Fuel, string> = { gas: '#0065A4', oil: '#E0701A', coal: '#3B3B3B' };
const MIX_C: Record<string, string> = {
  'Russia (pipeline + LNG)': '#B83230',
  Norway: '#6667AB',
  'United States (LNG)': '#1F8F63',
  'North Africa': '#E0701A',
  'Other (UK, Azerbaijan, other LNG)': '#BCBEC0',
};
const PATH_C: Record<PathKey, string> = { wem: '#B83230', wam: '#E0701A', advised: '#1F8F63' };
const GRID = '#E6E7E8';
const AXIS = '#BCBEC0';
const LABEL = '#808285';
const INK = '#2E3E4C';

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
const signed = (n: number, d = 0) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${fmt(Math.abs(n), d)}`;

/* ------------------------------------------------------------ UI bits */

function Slider(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  std?: number;
  onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, onChange } = props;
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmt(value, step < 0.1 ? 2 : step < 1 ? 1 : 0)}
          {unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-primary"
      />
      <div className="mt-0.5 flex items-start justify-between gap-2">
        {hint ? <p className="text-[10.5px] leading-snug text-tertiary">{hint}</p> : <span />}
        {std !== undefined && modified && (
          <button
            type="button"
            onClick={() => onChange(std)}
            className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-accent-orange hover:underline"
          >
            ↺ default {fmt(std, 2)}
          </button>
        )}
      </div>
    </label>
  );
}

function ChoiceRow<T extends string>(props: {
  label: string;
  options: { key: T; label: string; hint?: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <p className="text-[12px] font-semibold text-tertiary-dark">{props.label}</p>
      <div className="mt-1.5 flex flex-wrap gap-1.5">
        {props.options.map((o) => {
          const active = o.key === props.value;
          return (
            <button
              key={o.key}
              type="button"
              title={o.hint}
              onClick={() => props.onChange(o.key)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-grey-300 bg-white text-tertiary hover:bg-grey-100'
              }`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
          <svg width="22" height="8" className="shrink-0" aria-hidden>
            <line x1="0" y1="4" x2="22" y2="4" stroke={it.color} strokeWidth="3" strokeDasharray={it.dash ? '4 3' : undefined} />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------ actual vs counterfactual chart */

function DemandChart(props: {
  fuel: Fuel;
  baseline: BaselineKey;
  coupling: number;
}) {
  const { fuel, baseline, coupling } = props;
  const actual = DEMAND[fuel].series;
  const j = baseIndex(baseline);
  const cf = YEARS.map((_, i) => counterfactual(fuel, i, baseline, coupling));
  const color = FUEL_C[fuel];

  const W = 340;
  const H = 190;
  const m = { l: 40, r: 10, t: 14, b: 22 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const yMax = Math.max(...actual, ...cf.filter((v) => !Number.isNaN(v))) * 1.08;
  const yMin = Math.min(...actual) * 0.6;
  const sx = (i: number) => m.l + (i / (YEARS.length - 1)) * iw;
  const sy = (v: number) => m.t + ((yMax - v) / (yMax - yMin)) * ih;

  const cfPts = cf.map((v, i) => ({ v, i })).filter((p) => !Number.isNaN(p.v));
  const bandPath =
    cfPts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${sx(p.i).toFixed(1)} ${sy(p.v).toFixed(1)}`).join(' ') +
    [...cfPts].reverse().map((p) => ` L ${sx(p.i).toFixed(1)} ${sy(actual[p.i]).toFixed(1)}`).join('') +
    ' Z';

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`${FUEL_META[fuel].label}: actual demand versus the frozen-structure counterfactual, ${FUEL_META[fuel].unit}`}
    >
      {[yMin, (yMin + yMax) / 2, yMax].map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke={GRID} strokeWidth={1} />
          <text x={m.l - 4} y={sy(v) + 3} textAnchor="end" fill={LABEL} fontSize={9}>
            {fmt(v)}
          </text>
        </g>
      ))}
      {[2015, 2019, 2024].map((yr) => (
        <text key={yr} x={sx(yr - 2015)} y={H - 6} textAnchor="middle" fill={LABEL} fontSize={9}>
          {yr}
        </text>
      ))}
      <text x={m.l} y={m.t - 4} fill={LABEL} fontSize={9}>
        {FUEL_META[fuel].unit}
      </text>
      <path d={bandPath} fill={color} opacity={0.13} />
      <line x1={sx(j)} x2={sx(j)} y1={m.t} y2={m.t + ih} stroke={AXIS} strokeWidth={1} strokeDasharray="2 3" />
      <path
        d={cfPts.map((p, k) => `${k === 0 ? 'M' : 'L'} ${sx(p.i).toFixed(1)} ${sy(p.v).toFixed(1)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeDasharray="5 4"
      />
      <path
        d={actual.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
      />
      <text x={sx(j) + 3} y={m.t + 9} fill={LABEL} fontSize={8.5}>
        baseline {BASELINE_YEAR[props.baseline]}
      </text>
    </svg>
  );
}

/* --------------------------------------------- avoided bill stacked bars */

function BillBars(props: { bills: Record<Fuel, number[]>; unitLabel: string }) {
  const { bills, unitLabel } = props;
  const W = 720;
  const H = 250;
  const m = { l: 48, r: 12, t: 16, b: 24 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  // Per-year positive and negative stack extents, in €bn.
  const posTot = YEARS.map((_, i) => FUELS.reduce((a, f) => a + Math.max(bills[f][i], 0) / 1000, 0));
  const negTot = YEARS.map((_, i) => FUELS.reduce((a, f) => a + Math.min(bills[f][i], 0) / 1000, 0));
  const yMax = Math.max(...posTot, 1) * 1.1;
  const yMin = Math.min(...negTot, 0) * 1.3 - 0.5;
  const sy = (v: number) => m.t + ((yMax - v) / (yMax - yMin)) * ih;
  const bw = (iw / YEARS.length) * 0.62;
  const bx = (i: number) => m.l + (i + 0.5) * (iw / YEARS.length) - bw / 2;

  const gridVals = [yMax, yMax / 2, 0];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={`Avoided fossil-import bill per year by fuel, ${unitLabel}`}>
      {gridVals.map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? AXIS : GRID} strokeWidth={1} />
          <text x={m.l - 5} y={sy(v) + 3} textAnchor="end" fill={LABEL} fontSize={10}>
            {fmt(v, 0)}
          </text>
        </g>
      ))}
      <text x={m.l} y={m.t - 5} fill={LABEL} fontSize={9.5}>
        {unitLabel}
      </text>
      {YEARS.map((yr, i) => (
        <text key={yr} x={bx(i) + bw / 2} y={H - 8} textAnchor="middle" fill={LABEL} fontSize={9.5}>
          {yr}
        </text>
      ))}
      {YEARS.map((_, i) => {
        let up = 0;
        let down = 0;
        return (
          <g key={i}>
            {FUELS.map((f) => {
              const v = bills[f][i] / 1000;
              if (Math.abs(v) < 1e-6) return null;
              let y: number;
              let h: number;
              if (v >= 0) {
                y = sy(up + v);
                h = sy(up) - sy(up + v);
                up += v;
              } else {
                y = sy(down);
                h = sy(down + v) - sy(down);
                down += v;
              }
              return (
                <rect key={f} x={bx(i)} y={y} width={bw} height={Math.max(h, 0.5)} fill={FUEL_C[f]} opacity={v >= 0 ? 0.9 : 0.45}>
                  <title>{`${YEARS[i]} · ${FUEL_META[f].label}: ${signed(v, 1)} €bn`}</title>
                </rect>
              );
            })}
            <text x={bx(i) + bw / 2} y={sy(up) - 4} textAnchor="middle" fill={INK} fontSize={9} fontWeight={700}>
              {fmt(up + down, 0)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* -------------------------------------------------- supplier mix bars */

function MixBars() {
  const rows = GAS_SUPPLIER_MIX.rows;
  const W = 680;
  const barH = 30;
  const H = 2 * (barH + 34) + 6;
  const m = { l: 44, r: 10 };
  const iw = W - m.l - m.r;
  const years: { label: string; key: 'share2021' | 'share2024' }[] = [
    { label: '2021', key: 'share2021' },
    { label: '2024', key: 'share2024' },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="EU gas-import supplier mix, 2021 versus 2024, percent of extra-EU imports">
      {years.map((yr, r) => {
        const y0 = r * (barH + 34) + 16;
        let x = m.l;
        return (
          <g key={yr.label}>
            <text x={m.l - 6} y={y0 + barH / 2 + 4} textAnchor="end" fill={INK} fontSize={11} fontWeight={700}>
              {yr.label}
            </text>
            {rows.map((row) => {
              const w = (row[yr.key] / 100) * iw;
              const seg = (
                <g key={row.name}>
                  <rect x={x} y={y0} width={w} height={barH} fill={MIX_C[row.name]} opacity={0.9}>
                    <title>{`${yr.label} · ${row.name}: ${row[yr.key]} %`}</title>
                  </rect>
                  {w > 34 && (
                    <text x={x + w / 2} y={y0 + barH / 2 + 3.5} textAnchor="middle" fill="#FFFFFF" fontSize={9.5} fontWeight={700}>
                      {row[yr.key]} %
                    </text>
                  )}
                </g>
              );
              x += w;
              return seg;
            })}
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------- forward-leg bars */

function ExposureBars(props: { rows: { path: PathKey; exposure: number; extraBill: number }[] }) {
  const W = 340;
  const H = 210;
  const m = { l: 46, r: 10, t: 18, b: 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const labels: Record<PathKey, string> = { wem: 'WEM', wam: 'WAM', advised: 'Advised' };
  const yMax = Math.max(...props.rows.map((r) => r.exposure / 1000)) * 1.15;
  const sy = (v: number) => m.t + ((yMax - v) / yMax) * ih;
  const bw = (iw / 3) * 0.55;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="2030 fossil-import bill exposure per pathway, billion euro per year">
      {[yMax, yMax / 2, 0].map((v) => (
        <g key={v}>
          <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke={v === 0 ? AXIS : GRID} strokeWidth={1} />
          <text x={m.l - 4} y={sy(v) + 3} textAnchor="end" fill={LABEL} fontSize={9}>
            {fmt(v, 0)}
          </text>
        </g>
      ))}
      <text x={m.l} y={m.t - 6} fill={LABEL} fontSize={9}>
        €bn / yr
      </text>
      {props.rows.map((r, k) => {
        const x = m.l + (k + 0.5) * (iw / 3) - bw / 2;
        const v = r.exposure / 1000;
        return (
          <g key={r.path}>
            <rect x={x} y={sy(v)} width={bw} height={sy(0) - sy(v)} fill={PATH_C[r.path]} opacity={0.88}>
              <title>{`${labels[r.path]}: ${fmt(v, 0)} €bn/yr import bill in 2030`}</title>
            </rect>
            <text x={x + bw / 2} y={sy(v) - 5} textAnchor="middle" fill={INK} fontSize={10} fontWeight={700}>
              {fmt(v, 0)}
            </text>
            <text x={x + bw / 2} y={H - 20} textAnchor="middle" fill={INK} fontSize={10} fontWeight={700}>
              {labels[r.path]}
            </text>
            <text x={x + bw / 2} y={H - 8} textAnchor="middle" fill={LABEL} fontSize={8.5}>
              {r.path === 'advised' ? 'reference' : `+${fmt(r.extraBill / 1000, 0)} bn vs advised`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------------------------- static copy */

const SOURCES: { label: string; url: string }[] = [
  { label: 'Eurostat — Energy balances (nrg_bal_c): EU-27 demand per fuel', url: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_bal_c/default/table' },
  { label: 'Eurostat — Natural-gas imports by partner (nrg_ti_gas)', url: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_gas/default/table' },
  { label: 'Eurostat — Oil imports by partner (nrg_ti_oil)', url: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_oil/default/table' },
  { label: 'Eurostat — Solid-fuel imports by partner (nrg_ti_sff)', url: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ti_sff/default/table' },
  { label: 'Eurostat — Energy import dependency (nrg_ind_id)', url: 'https://ec.europa.eu/eurostat/databrowser/view/nrg_ind_id/default/table' },
  { label: 'Eurostat — GDP chain-linked volumes (nama_10_gdp) · population (demo_pjan)', url: 'https://ec.europa.eu/eurostat/databrowser/view/nama_10_gdp/default/table' },
  { label: 'EEA — Trends and projections in Europe 2024 (WEM / WAM aggregates)', url: 'https://www.eea.europa.eu/en/analysis/publications/trends-and-projections-in-europe-2024' },
  { label: 'European Commission — REPowerEU, COM(2022) 230 (2021 Russian supply shares; gas-demand cuts)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52022DC0230' },
  { label: 'European Commission — Fit-for-55 impact assessment, SWD(2020) 176 (MIX scenario)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A52020SC0176' },
  { label: 'Council Regulation (EU) 2022/576 — Russian coal embargo', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX%3A32022R0576' },
  { label: 'ACER — Wholesale electricity and gas market monitoring (TTF price averages)', url: 'https://www.acer.europa.eu/monitoring/MMR' },
  { label: 'Bruegel — European natural-gas imports tracker (supplier mix cross-check)', url: 'https://www.bruegel.org/dataset/european-natural-gas-imports' },
  { label: 'ESABCC — Towards EU climate neutrality: progress, policy gaps and opportunities (2024)', url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities' },
];

/* ------------------------------------------------------------------ page */

export default function ClimateSecurityPage() {
  const [baseline, setBaseline] = useState<BaselineKey>('frozen2019');
  const [coupling, setCoupling] = useState(1.0);
  const [scenario, setScenario] = useState<PriceScenario>('avg2019');
  const [stress, setStress] = useState(0);

  const resetAll = () => {
    setBaseline('frozen2019');
    setCoupling(1.0);
    setScenario('avg2019');
    setStress(0);
  };

  const vols = useMemo(() => totalAvoidedVolume(baseline, coupling), [baseline, coupling]);
  const bills = useMemo(() => billSeries(baseline, coupling, scenario), [baseline, coupling, scenario]);
  const bill = useMemo(() => totalBill(baseline, coupling, scenario), [baseline, coupling, scenario]);
  const perHead = perCitizen(bill.value);
  const russianGas = (vols.gas * RUSSIAN_SHARE_PRE2022.gas.value) / 100;
  const fwd = useMemo(() => forwardLeg(stress), [stress]);
  const fwdWem = fwd.find((r) => r.path === 'wem')!;
  const fwdWam = fwd.find((r) => r.path === 'wam')!;
  const series = useMemo(() => avoidedImportSeries(baseline, coupling), [baseline, coupling]);
  const negYears = YEARS.filter((_, i) => FUELS.some((f) => series[f][i] < -0.5));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 45 · climate security ledger · EU-27 · 2015–2024 backward · 2030 forward
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Climate Security Ledger — avoided fossil imports
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            What has EU climate policy already done for energy security, and what does each remaining 2030 delivery
            gap cost in the same currency? This module re-reads the decarbonisation record in the language the Council
            currently speaks: bcm of gas, Mt of oil and coal, and euros sent abroad. A frozen-structure counterfactual
            says how much fossil fuel the EU would have imported had demand structure stopped evolving in the baseline
            year; the gap to actual demand, times the import share, is the avoided import volume — valued under three
            switchable price worlds.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="mt-3 rounded border border-grey-300 px-2.5 py-1 text-[11px] font-semibold text-tertiary hover:bg-grey-100"
          >
            ↺ reset all controls to defaults
          </button>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ Forward leg AI-compiled — pending Secretariat verification · read this first
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            This is a <strong>reconstruction, not an attribution study</strong>. The frozen-structure
            counterfactual <strong>cannot separate the effect of climate policy from the effect of the 2022 price
            shock itself</strong> — the post-2022 demand fall mixes efficiency, renewables, fuel switching, demand
            destruction and mild winters, and this module makes no attempt to disentangle them. That is why the
            baseline choice sits as the most prominent control on the page: the choice of counterfactual{' '}
            <em>is</em> the result. On the inputs, the two legs differ and the difference matters: the{' '}
            <strong>backward leg is built from live Eurostat observations</strong> (demand, import dependency, GDP,
            supplier mix; refreshed 6 August 2026) priced with <strong>published World Bank annual averages</strong>,
            while the <strong>2030 per-fuel levels of the forward leg remain AI-inferred</strong> from GHG
            aggregates and are the softest numbers here — see{' '}
            <code className="rounded bg-white/60 px-1 text-[11px]">data.generated.ts</code>. Treat the forward leg as
            indicative pending Secretariat verification.
          </p>
        </section>

        {/* 1 — counterfactual */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · The counterfactual — pick your baseline, own the result</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Counterfactual demand = baseline-year demand × (activity index ÷ baseline activity)
            <sup>coupling</sup>. Frozen-2015 credits the whole decade of policy; frozen-2019 credits only the
            post-Green-Deal, post-crisis years and is the conservative choice. The shaded gap, times each year&apos;s
            import share, is the avoided import volume.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4 rounded-lg border border-grey-200 bg-white p-4">
              <ChoiceRow<BaselineKey>
                label="Counterfactual baseline"
                value={baseline}
                onChange={setBaseline}
                options={[
                  { key: 'frozen2015', label: 'Frozen 2015', hint: 'structure frozen at 2015 — the generous reading' },
                  { key: 'frozen2019', label: 'Frozen 2019', hint: 'structure frozen at 2019 — the conservative reading' },
                ]}
              />
              <Slider
                label="Activity coupling"
                value={coupling}
                min={0}
                max={1}
                step={0.05}
                std={1.0}
                onChange={setCoupling}
                hint="1 = frozen fuel intensity per unit of GDP (the method as proposed); 0 = demand frozen outright. Real fuel demand is less than proportional to GDP, so 1 is an upper-bound counterfactual."
              />
              <ChoiceRow<PriceScenario>
                label="Price scenario (valuation)"
                value={scenario}
                onChange={setScenario}
                options={(Object.keys(PRICE_SCENARIO_META) as PriceScenario[]).map((k) => ({
                  key: k,
                  label: PRICE_SCENARIO_META[k].label,
                  hint: PRICE_SCENARIO_META[k].hint,
                }))}
              />
              <p className="text-[10.5px] leading-snug text-tertiary">
                Prices at these settings: gas €{fmt(PRICES.gas[scenario].value)}m/bcm · oil €
                {fmt(PRICES.oil[scenario].value)}/t · coal €{fmt(PRICES.coal[scenario].value)}/t — each with a stated
                source range (see panel 2).
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {FUELS.map((f) => (
                <div key={f} className="rounded-lg border border-grey-200 bg-white p-3">
                  <p className="text-[11.5px] font-bold text-tertiary-dark">
                    <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-sm" style={{ background: FUEL_C[f] }} />
                    {FUEL_META[f].label}
                  </p>
                  <DemandChart fuel={f} baseline={baseline} coupling={coupling} />
                  <p className="mt-1 text-[10px] leading-snug text-tertiary">
                    solid = actual · dashed = counterfactual · {DEMAND[f].tolerance}. Import share{' '}
                    {IMPORT_SHARE[f].series[0]} → {IMPORT_SHARE[f].series[YEARS.length - 1]} %.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2 — avoided bill */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · The avoided import bill</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Avoided import volumes valued at the selected price world. The 2019-average scenario answers &ldquo;what
            would this have cost in normal times&rdquo;; the 2022-crisis scenario answers &ldquo;what did avoiding it
            spare us at the worst moment&rdquo;; the forward scenario is today&apos;s market view.
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={`Avoided import bill · ${PRICE_SCENARIO_META[scenario].label}`}
              value={`€${fmt(bill.value / 1000)} bn`}
              sub={`price-range spread: €${fmt(bill.lo / 1000)}–${fmt(bill.hi / 1000)} bn, cumulative ${BASELINE_YEAR[baseline]}–2024`}
            />
            <StatTile
              label="Per EU citizen"
              value={`€${fmt(perHead)}`}
              sub={`cumulative, over ${fmt(EU_POPULATION_M.value, 1)} m people (demo_pjan 2024)`}
            />
            <StatTile
              label="Avoided gas imports"
              value={`${fmt(vols.gas)} bcm`}
              sub={`plus ${fmt(vols.oil)} Mt oil and ${fmt(vols.coal)} Mt hard coal, cumulative`}
            />
            <StatTile
              label="Of which Russian-mix gas"
              value={`${fmt(russianGas)} bcm`}
              sub={`at the pre-2022 supplier mix (Russia ${RUSSIAN_SHARE_PRE2022.gas.lo}–${RUSSIAN_SHARE_PRE2022.gas.hi} % of imports) — see panel 3`}
            />
          </div>
          <div className="mt-3 rounded-lg border border-grey-200 bg-white p-4">
            <BillBars bills={bills} unitLabel={`€bn per year · ${PRICE_SCENARIO_META[scenario].label} prices`} />
            <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
              <Legend
                items={FUELS.map((f) => ({ label: FUEL_META[f].label, color: FUEL_C[f] }))}
              />
              <p className="text-[10.5px] text-tertiary">
                {negYears.length > 0
                  ? `Negative segments (${negYears.join(', ')}) are years where actual demand sat above the counterfactual — kept in the sums, not dropped.`
                  : 'No negative years at these settings.'}
              </p>
            </div>
          </div>
        </section>

        {/* 3 — supplier decomposition */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · Whose imports were avoided — and what replaced them</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            At the pre-2022 supplier mix, roughly {RUSSIAN_SHARE_PRE2022.gas.lo}–{RUSSIAN_SHARE_PRE2022.gas.hi} % of
            every avoided bcm of gas would have been Russian ({RUSSIAN_SHARE_PRE2022.oil.lo}–
            {RUSSIAN_SHARE_PRE2022.oil.hi} % of oil, {RUSSIAN_SHARE_PRE2022.coal.lo}–{RUSSIAN_SHARE_PRE2022.coal.hi} %
            of hard coal). Recorded with equal prominence: what replaced Russian pipeline gas is to a large extent US
            LNG — the US share of EU gas imports roughly tripled. Diversification is not independence; it is a
            different dependency, with different price and political risk.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[12px] font-bold text-tertiary-dark">EU gas-import supplier mix, % of extra-EU imports</p>
              <MixBars />
              <Legend
                items={GAS_SUPPLIER_MIX.rows.map((r) => ({ label: r.name, color: MIX_C[r.name] }))}
              />
              <p className="mt-2 text-[10.5px] leading-snug text-tertiary">
                {GAS_SUPPLIER_MIX.tolerance}. The 2024 Russian share is genuinely contested between trackers
                ({RUSSIAN_SHARE_2024.gas.lo}–{RUSSIAN_SHARE_2024.gas.hi} %, depending on LNG trans-shipment
                treatment) — the disagreement is shown, not resolved.
              </p>
            </div>
            <div className="space-y-3">
              <StatTile
                label="Russian gas share, 2021 → 2024"
                value={`${GAS_SUPPLIER_MIX.rows[0].share2021} → ${GAS_SUPPLIER_MIX.rows[0].share2024} %`}
                sub="pipeline + LNG, % of extra-EU imports"
              />
              <StatTile
                label="US LNG share, 2021 → 2024"
                value={`${GAS_SUPPLIER_MIX.rows[2].share2021} → ${GAS_SUPPLIER_MIX.rows[2].share2024} %`}
                sub="the new dependency, recorded for even-handedness"
              />
              <StatTile
                label="Russian oil · coal, 2024"
                value={`${RUSSIAN_SHARE_2024.oil.value} % · ${RUSSIAN_SHARE_2024.coal.value} %`}
                sub="after the 2022–23 embargoes (coal: Reg. (EU) 2022/576); pipeline-oil exemptions remain"
              />
            </div>
          </div>
        </section>

        {/* 4 — forward leg */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">4 · Forward leg — the security cost of the 2030 delivery gap</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The same arithmetic pointed forwards: 2030 fossil-demand levels under existing measures (WEM), additional
            measures (WAM) and a −55 %-consistent advised path, times assumed 2030 import shares, times a price. The
            stress slider replays a 2022-style shock — each fuel&apos;s price interpolates from the recent forward
            level to its 2022 crisis average. The difference in exposure between the bars is the security value of
            closing the gaps.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4 rounded-lg border border-grey-200 bg-white p-4">
              <Slider
                label="2022-style price-shock stress"
                value={stress}
                min={0}
                max={1}
                step={0.05}
                std={0}
                onChange={setStress}
                hint="0 = recent forward prices · 1 = full replay of 2022 full-year crisis averages on the 2030 volumes."
              />
              <p className="text-[10.5px] leading-snug text-tertiary">
                Stressed prices: gas €{fmt(stressedPrice('gas', stress))}m/bcm · oil €{fmt(stressedPrice('oil', stress))}/t
                · coal €{fmt(stressedPrice('coal', stress))}/t.
              </p>
              <div className="space-y-3 border-t border-grey-200 pt-3">
                <StatTile
                  label="WEM vs advised, extra bill 2030"
                  value={`€${fmt(fwdWem.extraBill / 1000)} bn/yr`}
                  sub={`extra imports: ${fmt(fwdWem.extraVolume.gas)} bcm gas · ${fmt(fwdWem.extraVolume.oil)} Mt oil · ${fmt(fwdWem.extraVolume.coal)} Mt coal`}
                />
                <StatTile
                  label="WAM vs advised, extra bill 2030"
                  value={`€${fmt(fwdWam.extraBill / 1000)} bn/yr`}
                  sub={`extra imports: ${fmt(fwdWam.extraVolume.gas)} bcm gas · ${fmt(fwdWam.extraVolume.oil)} Mt oil · ${fmt(fwdWam.extraVolume.coal)} Mt coal`}
                />
              </div>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[12px] font-bold text-tertiary-dark">2030 fossil-import bill exposure per pathway</p>
              <ExposureBars rows={fwd} />
              <p className="mt-1 text-[10.5px] leading-snug text-tertiary">
                Pathway levels (gas, bcm): WEM {PROJ_2030.levels.wem.gas.lo}–{PROJ_2030.levels.wem.gas.hi} · WAM{' '}
                {PROJ_2030.levels.wam.gas.lo}–{PROJ_2030.levels.wam.gas.hi} · advised{' '}
                {PROJ_2030.levels.advised.gas.lo}–{PROJ_2030.levels.advised.gas.hi}. EEA publishes GHG aggregates
                (WEM ≈ −47 %, WAM ≈ −54 % net vs 1990, November 2025 update), not per-fuel demand — the per-fuel
                split here is AI-inferred from Commission scenario material, was inferred against the older
                −43 %/−49 % aggregates, and therefore understates 2030 progress on both projected pathways. These are
                the widest ranges and the softest numbers in this module. The per-gap join onto the Policy Gap
                Tracker is deferred (see caveats).
              </p>
            </div>
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            Refreshed 6 August 2026. The arithmetic is deterministic and reproducible from{' '}
            <code className="rounded bg-white/70 px-1 text-[11px]">model.ts</code>; every value in{' '}
            <code className="rounded bg-white/70 px-1 text-[11px]">data.generated.ts</code> carries a source locator.
            Demand, import dependency, activity and supplier mix are regenerated by{' '}
            <code className="rounded bg-white/70 px-1 text-[11px]">scripts/refresh-climate-security-eurostat.mjs</code>{' '}
            and prices by{' '}
            <code className="rounded bg-white/70 px-1 text-[11px]">scripts/refresh-climate-security-prices.mjs</code>,
            with the raw pulls kept under{' '}
            <code className="rounded bg-white/70 px-1 text-[11px]">public/data/climate-security/</code>. Known limits,
            stated rather than hidden: (1) the counterfactual attributes the whole demand fall to
            &ldquo;structure&rdquo;, so climate policy, the price shock, demand destruction and warm winters are
            inseparable here; (2) the headline lo–hi band propagates only the published price bands — the
            within-year monthly spread for gas and oil, the gap between the two steam-coal markers for coal — and is
            a cheapest-month/dearest-month bracket, not a confidence interval; (3) the 2030 per-fuel splits are
            AI-inferred from GHG aggregates and remain the softest numbers on the page; (4) gas supplier shares are
            attributed by country of dispatch, so LNG trans-shipment can sit under the wrong flag and trackers that
            reallocate it report a higher Russian share than Eurostat does. Deferred backlog, deliberately not in
            this round: the per-gap security-cost join onto{' '}
            <code className="rounded bg-white/70 px-1 text-[11px]">beta/modules/policy-gaps/</code> by gap id; a
            heating-degree-day correction of household demand; replacing the AI-inferred 2030 per-fuel levels with a
            published Commission scenario table; a COMEXT unit-value series so the border price is the EU&apos;s own
            paid price rather than a world marker.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {s.label} ↗
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
