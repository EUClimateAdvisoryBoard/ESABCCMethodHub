'use client';

/**
 * ETS Endgame & CDR Safety Valve — beta module page.
 *
 * An interactive, transparent reconstruction of the modelling behind two
 * companion publications on how carbon dioxide removal (CDR) interacts with
 * the EU Emissions Trading System (EU ETS) as the cap approaches zero:
 *
 *   1. Ariadne dossier — "A Safety Valve for the EU ETS Endgame: Containing
 *      Prices through Carbon Dioxide Removal" (Kopernikus-Projekt Ariadne).
 *      https://ariadneprojekt.de/en/publication/dossier-containing-prices-through-carbon-dioxide-removal/
 *
 *   2. Sultani, Osorio, Günther, Pahle, Sievert, Schmidt, Steffen & Edenhofer,
 *      "Sequencing Carbon Dioxide Removal into the EU ETS" / "How the EU can
 *      utilise its carbon market to scale up Carbon Dioxide Removal", Joule
 *      (2026), built on the LIMES-EU model (PIK Potsdam).
 *      https://www.cell.com/joule/fulltext/S2542-4351(26)00079-6
 *
 * IMPORTANT — this is NOT the original LIMES-EU model. LIMES-EU is a
 * bottom-up, intertemporal partial-equilibrium model of the European power
 * and industry sectors. What runs in the browser here is a deliberately
 * STYLISED, reduced-form re-implementation of the same economic mechanism so
 * the assumptions can be turned into sliders and explored live:
 *
 *   • the EU ETS price is set by intertemporal (Hotelling) arbitrage of a
 *     banked allowance budget — the price rises at roughly the discount rate
 *     while the bank is positive, which is what produces the characteristic
 *     smooth ~€200 (2030) → ~€350 (2040) climb the papers report;
 *   • conventional abatement follows a convex marginal-abatement-cost curve
 *     that cannot exceed a technical ceiling (φmax) — so once the cap nears
 *     zero, residual hard-to-abate emissions push the price towards the
 *     penalty backstop (the "endgame" spike);
 *   • permanent CDR (BECCS + DACCS) enters as a price-responsive backstop
 *     gated by a sequencing policy (start year, admitted volume, integrity
 *     haircut), capping the endgame spike — the "safety valve".
 *
 * Defaults are calibrated so the central (with-CDR) run lands near the
 * published anchors: ≈€195/tCO₂ in 2030, ≈€336/tCO₂ in 2040, and ≈90 Mt/yr of
 * CDR by 2050 (the paper reports 68–86 Mt/yr BECCS+DACCS combined). Numbers
 * are illustrative reconstructions, not forecasts.
 */

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* ------------------------------------------------------------------ model */

const START = 2025;
const END = 2050;
const YEARS: number[] = Array.from({ length: END - START + 1 }, (_, i) => START + i);

type Params = {
  // cap & 2040 target
  cap2025: number;       // Mt CO2 — ETS1 cap in 2025
  netZeroYear: number;   // year the cap reaches zero
  bank0: number;         // Mt CO2 — cumulative budget headroom (banked surplus)
  // real-economy abatement
  bau2025: number;       // Mt — counterfactual (no carbon price) emissions in 2025
  bau2050: number;       // Mt — counterfactual emissions in 2050 (autonomous decarbonisation)
  phiMax: number;        // 0..1 — max share of emissions abatable WITHOUT removals
  pscale: number;        // €/t — steepness of the marginal abatement cost curve
  r: number;             // 1/yr — intertemporal (Hotelling/discount) rate
  // CDR techno-economics
  cfloor: number;        // €/t — cheapest removal cost (BECCS floor)
  cslope: number;        // €/t per Mt — how fast removal cost rises with volume
  cdrRmax: number;       // Mt/yr — physical CDR availability ceiling by 2050
  cdrRampStart: number;  // year CDR physical capacity starts ramping
  // policy — sequencing proposal
  admStart: number;      // year CDR is first admitted into the ETS
  admMax: number;        // Mt/yr — admitted-volume ceiling by 2050 ("limited volume")
  haircut: number;       // 0..1 — integrity discount on certificates
  Pceil: number;         // €/t — price ceiling / non-compliance backstop
};

const DEFAULTS: Params = {
  cap2025: 1340,
  netZeroYear: 2040,
  bank0: 1500,
  bau2025: 1200,
  bau2050: 560,
  phiMax: 0.81,
  pscale: 235,
  r: 0.056,
  cfloor: 70,
  cslope: 1.0,
  cdrRmax: 165,
  cdrRampStart: 2030,
  admStart: 2031,
  admMax: 90,
  haircut: 0.1,
  Pceil: 1500,
};

const BECCS_CEILING = 90; // €/t — removal cost below which deployment is counted as BECCS-like

type YearRow = {
  t: number;
  price: number;
  capped: boolean;
  removals: number;   // gross Mt deployed
  beccs: number;
  daccs: number;
  aConv: number;      // Mt conventionally abated
  gross: number;      // Mt emitted (bau − conventional abatement)
  net: number;        // Mt (gross − effective removals)
  cap: number;        // Mt annual cap
  bau: number;        // Mt counterfactual emissions
};

type Run = { path: YearRow[]; P0: number; capped: boolean };

const lin = (x: number, x0: number, y0: number, x1: number, y1: number) =>
  y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);

function buildModel(p: Params) {
  const cap = (t: number) =>
    Math.max(0, (p.cap2025 * (p.netZeroYear - t)) / (p.netZeroYear - START));
  const bau = (t: number) => Math.max(0, lin(t, START, p.bau2025, END, p.bau2050));
  // convex MACC: abatement share = phiMax · P/(P+pscale); cost → ∞ as share → phiMax
  const aConv = (P: number, t: number) =>
    bau(t) * p.phiMax * (Math.max(0, P) / (Math.max(0, P) + p.pscale));
  const Rmax = (t: number) =>
    Math.max(0, p.cdrRmax * Math.min(1, Math.max(0, (t - p.cdrRampStart) / (END - p.cdrRampStart))));
  const Qadm = (t: number) =>
    t < p.admStart ? 0 : p.admMax * Math.min(1, (t - p.admStart) / Math.max(1, END - p.admStart));
  const qCdr = (P: number) => Math.max(0, (P - p.cfloor) / p.cslope);
  const removals = (P: number, t: number, withCDR: boolean) =>
    !withCDR || t < p.admStart ? 0 : Math.min(qCdr(P), Rmax(t), Qadm(t));

  const rowFor = (P0: number, t: number, withCDR: boolean): YearRow => {
    const price = Math.min(p.Pceil, P0 * Math.pow(1 + p.r, t - START));
    const rv = removals(price, t, withCDR);
    const beccsCap = Math.max(0, (BECCS_CEILING - p.cfloor) / p.cslope);
    const beccs = Math.min(rv, beccsCap);
    const daccs = Math.max(0, rv - beccs);
    const ab = aConv(price, t);
    const gross = bau(t) - ab;
    const net = gross - rv * (1 - p.haircut);
    return { t, price, capped: price >= p.Pceil - 1e-6, removals: rv, beccs, daccs, aConv: ab, gross, net, cap: cap(t), bau: bau(t) };
  };

  const pathFor = (P0: number, withCDR: boolean) => YEARS.map((t) => rowFor(P0, t, withCDR));

  const budgetGap = (P0: number, withCDR: boolean) => {
    const netSum = pathFor(P0, withCDR).reduce((s, x) => s + x.net, 0);
    const capSum = YEARS.reduce((s, t) => s + cap(t), 0) + p.bank0;
    return netSum - capSum; // >0 ⇒ emitting more than the budget ⇒ price must rise
  };

  const run = (withCDR: boolean): Run => {
    let lo = 1;
    let hi = p.Pceil;
    if (budgetGap(hi, withCDR) > 0) return { path: pathFor(hi, withCDR), P0: hi, capped: true };
    for (let i = 0; i < 100; i++) {
      const mid = (lo + hi) / 2;
      if (budgetGap(mid, withCDR) > 0) lo = mid;
      else hi = mid;
    }
    const P0 = (lo + hi) / 2;
    return { path: pathFor(P0, withCDR), P0, capped: false };
  };

  return { run };
}

const at = (run: Run, y: number) => run.path.find((r) => r.t === y)!;

/* --------------------------------------------------------------- presets */

type Preset = { id: string; label: string; blurb: string; over: Partial<Params> };

const PRESETS: Preset[] = [
  {
    id: 'base',
    label: 'Paper base case',
    blurb: 'Central calibration: CDR sequenced in from 2031, moderate admitted volume. Tracks the published ≈€200 (2030) → ≈€350 (2040) path.',
    over: {},
  },
  {
    id: 'proposal',
    label: 'Cautious sequencing (the proposal)',
    blurb: 'The authors’ recommendation: gradual, integrity-gated entry — later start, small admitted volume, a heavy 20% integrity haircut, conservative supply.',
    over: { admStart: 2033, admMax: 60, haircut: 0.2, cdrRmax: 130, cslope: 1.2 },
  },
  {
    id: 'nocdr',
    label: 'No CDR (cap only)',
    blurb: 'The counterfactual: removals are never admitted. Shows the unmitigated endgame price spike as the cap reaches zero.',
    over: { admMax: 0, admStart: 2099 },
  },
  {
    id: 'aggressive',
    label: 'Aggressive / near-unlimited CDR',
    blurb: 'Early entry, large admitted volume, no integrity haircut, cheap and abundant supply. Strong price containment — but maximal abatement-deterrence and biomass risk.',
    over: { admStart: 2029, admMax: 260, haircut: 0, cslope: 0.6, cdrRmax: 360, cfloor: 60 },
  },
  {
    id: 'delayed',
    label: 'Delayed CDR (act late)',
    blurb: 'Removals admitted only in 2038, once the spike is already underway. Illustrates the cost of waiting.',
    over: { admStart: 2038, admMax: 90 },
  },
  {
    id: 'weak',
    label: 'Weak real-economy abatement',
    blurb: 'Slow infrastructure roll-out: lower abatement ceiling and a steeper cost curve. The endgame spike is far larger, so the safety valve matters more.',
    over: { phiMax: 0.7, pscale: 360 },
  },
];

/* -------------------------------------------------------------- UI helpers */

function fmt(n: number, d = 0) {
  return n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function Slider(props: {
  label: string;
  hint?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  std?: number;
  display?: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, display, onChange } = props;
  const fmtVal = (v: number) => (display ? display(v) : fmt(v));
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmtVal(value)}
          {unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-primary"
        />
        {stdPct !== null && (
          <span
            aria-hidden
            title={`Standard: ${fmtVal(std!)}`}
            className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50"
            style={{ left: `calc(${stdPct}% )` }}
          />
        )}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        {hint ? <p className="text-[10.5px] leading-snug text-tertiary">{hint}</p> : <span />}
        {std !== undefined && (
          modified ? (
            <button
              type="button"
              onClick={() => onChange(std)}
              className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-accent-orange hover:underline"
            >
              ↺ standard {fmtVal(std)}
            </button>
          ) : (
            <span className="shrink-0 whitespace-nowrap text-[10px] text-tertiary/70">standard</span>
          )
        )}
      </div>
    </label>
  );
}

/* SVG line chart -------------------------------------------------------- */

type Series = { label: string; color: string; dash?: boolean; points: { x: number; y: number }[] };

function LineChart(props: {
  series: Series[];
  yMax: number;
  yLabel: string;
  yUnit?: string;
  height?: number;
  markers?: { x: number; label: string }[];
}) {
  const { series, yMax, yLabel, height = 300 } = props;
  const W = 720;
  const H = height;
  const m = { l: 52, r: 16, t: 14, b: 30 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const x0 = START;
  const x1 = END;
  const sx = (x: number) => m.l + ((x - x0) / (x1 - x0)) * iw;
  const sy = (y: number) => m.t + ih - (Math.min(y, yMax) / yMax) * ih;
  const yTicks = 5;
  const xTickYears = [2025, 2030, 2035, 2040, 2045, 2050];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel}>
      {/* y grid + labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v = (yMax / yTicks) * i;
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={y + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {/* x labels */}
      {xTickYears.map((yr) => (
        <text key={yr} x={sx(yr)} y={H - 10} textAnchor="middle" className="fill-grey-500" fontSize={10}>
          {yr}
        </text>
      ))}
      {/* markers (e.g. cap = 0) */}
      {(props.markers ?? []).map((mk, i) => (
        <g key={i}>
          <line x1={sx(mk.x)} x2={sx(mk.x)} y1={m.t} y2={m.t + ih} stroke="#BCBEC0" strokeWidth={1} strokeDasharray="3 3" />
          <text x={sx(mk.x) + 3} y={m.t + 10} className="fill-grey-500" fontSize={9}>
            {mk.label}
          </text>
        </g>
      ))}
      {/* axis title */}
      <text x={m.l} y={m.t - 2} className="fill-tertiary" fontSize={10}>
        {yLabel}
        {props.yUnit ? ` (${props.yUnit})` : ''}
      </text>
      {/* series */}
      {series.map((s) => (
        <path
          key={s.label}
          d={s.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth={2.25}
          strokeDasharray={s.dash ? '5 4' : undefined}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

/* SVG stacked area (CDR deployment) ------------------------------------ */

function StackedArea(props: {
  years: number[];
  layers: { label: string; color: string; values: number[] }[];
  yMax: number;
  yLabel: string;
  height?: number;
}) {
  const { years, layers, yMax, yLabel, height = 240 } = props;
  const W = 720;
  const H = height;
  const m = { l: 52, r: 16, t: 14, b: 30 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const sx = (i: number) => m.l + (i / (years.length - 1)) * iw;
  const sy = (y: number) => m.t + ih - (Math.min(y, yMax) / yMax) * ih;
  const cum = years.map(() => 0);
  const xTickYears = [2025, 2030, 2035, 2040, 2045, 2050];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (yMax / 4) * i;
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={y + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {xTickYears.map((yr) => {
        const i = yr - years[0];
        return (
          <text key={yr} x={sx(i)} y={H - 10} textAnchor="middle" className="fill-grey-500" fontSize={10}>
            {yr}
          </text>
        );
      })}
      <text x={m.l} y={m.t - 2} className="fill-tertiary" fontSize={10}>
        {yLabel}
      </text>
      {layers.map((layer) => {
        const top = layer.values.map((v, i) => cum[i] + v);
        const d =
          layer.values.map((_, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(cum[i]).toFixed(1)}`).join(' ') +
          ' ' +
          top
            .map((v, i) => `L ${sx(years.length - 1 - i).toFixed(1)} ${sy(top[years.length - 1 - i]).toFixed(1)}`)
            .join(' ') +
          ' Z';
        layer.values.forEach((v, i) => (cum[i] += v));
        return <path key={layer.label} d={d} fill={layer.color} fillOpacity={0.85} stroke="none" />;
      })}
    </svg>
  );
}

function Legend({ items }: { items: { label: string; color: string; dash?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
          <svg width="22" height="8" className="shrink-0">
            <line
              x1="0"
              y1="4"
              x2="22"
              y2="4"
              stroke={it.color}
              strokeWidth="3"
              strokeDasharray={it.dash ? '4 3' : undefined}
            />
          </svg>
          {it.label}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------- page */

const C = {
  withCDR: '#007B6C',
  noCDR: '#B83230',
  cap: '#3D5265',
  gross: '#FF9933',
  net: '#004B7F',
  beccs: '#74CBC8',
  daccs: '#478EA5',
};

export default function EtsCdrPricePage() {
  const [p, setP] = useState<Params>(DEFAULTS);
  const [activePreset, setActivePreset] = useState('base');

  const set = (k: keyof Params) => (v: number) => {
    setP((prev) => ({ ...prev, [k]: v }));
    setActivePreset('custom');
  };

  const applyPreset = (pr: Preset) => {
    setP({ ...DEFAULTS, ...pr.over });
    setActivePreset(pr.id);
  };

  const { withRun, noRun } = useMemo(() => {
    const model = buildModel(p);
    return { withRun: model.run(true), noRun: model.run(false) };
  }, [p]);

  // KPIs
  const k = (y: number) => ({ with: at(withRun, y), no: at(noRun, y) });
  const k30 = k(2030);
  const k40 = k(2040);
  const k50 = k(2050);
  const cumRem = withRun.path.reduce((s, r) => s + r.removals, 0);
  const rem50 = at(withRun, 2050).removals;
  const peakWith = Math.max(...withRun.path.map((r) => r.price));
  const peakNo = Math.max(...noRun.path.map((r) => r.price));
  const maxRelief = Math.max(...withRun.path.map((r, i) => noRun.path[i].price - r.price));
  const reliefYear = withRun.path.reduce(
    (best, r, i) => {
      const d = noRun.path[i].price - r.price;
      return d > best.d ? { d, t: r.t } : best;
    },
    { d: -Infinity, t: START },
  ).t;

  const priceMax = Math.max(
    50,
    Math.ceil(Math.max(peakWith, peakNo) / 100) * 100,
  );
  const emMax = Math.ceil(Math.max(p.bau2025, p.cap2025) / 100) * 100;
  const remMax = Math.max(20, Math.ceil(Math.max(...withRun.path.map((r) => r.removals)) / 20) * 20 || 20);

  const priceSeries: Series[] = [
    { label: 'EU ETS price — your settings', color: C.withCDR, points: withRun.path.map((r) => ({ x: r.t, y: r.price })) },
    { label: 'EU ETS price — cap only (no CDR)', color: C.noCDR, dash: true, points: noRun.path.map((r) => ({ x: r.t, y: r.price })) },
  ];
  const emSeries: Series[] = [
    { label: 'Cap (annual allowances)', color: C.cap, points: withRun.path.map((r) => ({ x: r.t, y: r.cap })) },
    { label: 'Gross emissions', color: C.gross, points: withRun.path.map((r) => ({ x: r.t, y: Math.max(0, r.gross) })) },
    { label: 'Net emissions (gross − removals)', color: C.net, points: withRun.path.map((r) => ({ x: r.t, y: Math.max(0, r.net) })) },
  ];

  const capZeroYear = p.netZeroYear <= END ? p.netZeroYear : null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · Ariadne dossier × PIK LIMES-EU (Joule 2026) · interactive reconstruction
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            ETS Endgame &amp; the CDR Safety Valve
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            As the EU ETS cap falls towards zero around 2040, the price of allowances can spike hard. Two
            companion studies argue that admitting permanent <strong>carbon dioxide removal</strong> (BECCS and
            DACCS) into the system can act as a <strong>safety valve</strong> — containing prices for hard-to-abate
            industry without abandoning the climate target, provided removals are <em>sequenced</em> in gradually
            and with integrity safeguards. This module rebuilds that mechanism so you can move the assumptions and
            watch the future ETS price, the removals deployed, and the emissions balance respond live.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Link
              href="/beta/ets-cdr-price/status"
              className="inline-flex items-center gap-1.5 rounded-md border border-primary bg-surface-blue px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary hover:text-white"
            >
              Reality check: the status quo of CDR in the EU →
            </Link>
            <span className="inline-flex items-center text-[11px] text-tertiary">
              How big is the gap between today&rsquo;s pipeline and the 68–86 Mt/yr the valve needs?
            </span>
          </div>
        </section>

        {/* anchors / provenance */}
        <section className="mb-6 grid gap-2 sm:grid-cols-3">
          {[
            { h: 'What the papers find', b: 'Direct CDR integration could draw in 68–86 Mt/yr of BECCS+DACCS by 2050, cutting allowance prices once scarcity bites post-2040.' },
            { h: 'Published price anchors', b: 'Base-case allowance price ≈ €203/tCO₂ in 2030 and ≈ €353/tCO₂ in 2040. By 2050 allowances barely trade — the price tracks removal cost.' },
            { h: 'Removal cost range used', b: 'BECCS ≈ €61–86/tCO₂ and DACCS ≈ €109–155/tCO₂ (optimistic). These set the height of the safety valve.' },
          ].map((c) => (
            <div key={c.h} className="rounded-lg border border-grey-200 bg-white p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">{c.h}</p>
              <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{c.b}</p>
            </div>
          ))}
        </section>

        {/* presets */}
        <section className="mb-5">
          <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Scenarios</p>
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((pr) => (
              <button
                key={pr.id}
                onClick={() => applyPreset(pr)}
                className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${
                  activePreset === pr.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey-300 bg-white text-tertiary-dark hover:border-primary hover:text-primary'
                }`}
              >
                {pr.label}
              </button>
            ))}
            {activePreset === 'custom' && (
              <span className="inline-flex items-center rounded-full border border-dashed border-grey-400 px-3 py-1.5 text-[12px] font-semibold text-tertiary">
                Custom
              </span>
            )}
          </div>
          <p className="mt-2 max-w-3xl text-[11.5px] leading-relaxed text-tertiary">
            {PRESETS.find((x) => x.id === activePreset)?.blurb ??
              'You have moved the assumptions away from a named scenario. Use the buttons above to return to a calibrated starting point.'}
          </p>
        </section>

        {/* KPI strip */}
        <section className="mb-6 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { label: 'ETS price 2030', v: `€${fmt(k30.with.price)}`, sub: `cap-only €${fmt(k30.no.price)}` },
            { label: 'ETS price 2040', v: `€${fmt(k40.with.price)}`, sub: `cap-only €${fmt(k40.no.price)}` },
            { label: 'ETS price 2050', v: `€${fmt(k50.with.price)}`, sub: `cap-only €${fmt(k50.no.price)}` },
            { label: 'CDR deployed 2050', v: `${fmt(rem50)} Mt`, sub: `${fmt(cumRem)} Mt cumulative` },
          ].map((c) => (
            <div key={c.label} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">{c.label}</p>
              <p className="mt-0.5 font-mono text-xl font-bold text-tertiary-dark tabular-nums">{c.v}</p>
              <p className="text-[10.5px] text-tertiary">{c.sub}</p>
            </div>
          ))}
        </section>

        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          {/* charts column */}
          <div className="space-y-6 lg:order-1">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[13px] font-bold text-tertiary-dark">Future EU ETS allowance price</h2>
              <p className="mb-1 text-[11px] text-tertiary">
                The gap between the two lines is the safety-valve effect: how much CDR shaves off the endgame spike.
                {peakNo >= p.Pceil - 1 && ' Without removals the price hits the penalty backstop — the cap can no longer be met by abatement alone.'}
              </p>
              <LineChart
                series={priceSeries}
                yMax={priceMax}
                yLabel="Allowance price"
                yUnit="€/tCO₂"
                markers={capZeroYear ? [{ x: capZeroYear, label: 'cap = 0' }] : []}
              />
              <Legend
                items={[
                  { label: 'Your settings', color: C.withCDR },
                  { label: 'Cap only — no CDR', color: C.noCDR, dash: true },
                ]}
              />
              <p className="mt-1 text-[10.5px] text-tertiary">
                Peak: €{fmt(peakWith)} with your settings vs €{fmt(peakNo)} cap-only. Largest annual price relief from
                CDR: €{fmt(maxRelief)}/tCO₂ (around {reliefYear}).
              </p>
            </div>

            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[13px] font-bold text-tertiary-dark">Carbon dioxide removal deployed</h2>
              <p className="mb-1 text-[11px] text-tertiary">
                Removals enter once admitted by the sequencing policy and the price clears their marginal cost. The
                cheaper tranche is treated as BECCS-like, the rest as DACCS-like.
              </p>
              <StackedArea
                years={YEARS}
                layers={[
                  { label: 'BECCS', color: C.beccs, values: withRun.path.map((r) => r.beccs) },
                  { label: 'DACCS', color: C.daccs, values: withRun.path.map((r) => r.daccs) },
                ]}
                yMax={remMax}
                yLabel="Mt CO₂ removed / yr"
              />
              <Legend
                items={[
                  { label: 'BECCS-like', color: C.beccs },
                  { label: 'DACCS-like', color: C.daccs },
                ]}
              />
            </div>

            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <h2 className="text-[13px] font-bold text-tertiary-dark">Emissions, cap and removals</h2>
              <p className="mb-1 text-[11px] text-tertiary">
                Net emissions track the cumulative budget; removals open a wedge that lets gross emissions from
                hard-to-abate sources stay above the shrinking cap while net stays on the climate path.
              </p>
              <LineChart
                series={emSeries}
                yMax={emMax}
                yLabel="Emissions"
                yUnit="Mt CO₂/yr"
                markers={capZeroYear ? [{ x: capZeroYear, label: 'cap = 0' }] : []}
              />
              <Legend
                items={[
                  { label: 'Cap', color: C.cap },
                  { label: 'Gross emissions', color: C.gross },
                  { label: 'Net emissions', color: C.net },
                ]}
              />
            </div>
          </div>

          {/* controls column */}
          <aside className="space-y-5 lg:order-2">
            <div className="rounded-lg border border-grey-200 bg-grey-50 p-3 text-[11px] leading-relaxed text-tertiary">
              <p>
                <span className="font-bold text-tertiary-dark">Standard settings.</span> Every slider opens on the{' '}
                <strong>Paper base case</strong> — the calibrated, recommended starting point. A small tick under each
                track marks that standard value; any slider you move turns{' '}
                <span className="font-semibold text-accent-orange">orange</span> with a{' '}
                <span className="font-semibold text-accent-orange">↺ standard</span> button to snap it back. Use{' '}
                <em>Reset to paper base case</em> below to restore everything at once.
              </p>
            </div>
            <ControlGroup title="Cap & 2040 target">
              <Slider label="Year the cap reaches zero" hint="Current law: ETS1 cap hits zero ≈2039 (LRF 4.3→4.4%/yr). The 2040 target debate may soften this." value={p.netZeroYear} std={DEFAULTS.netZeroYear} min={2037} max={2046} step={1} display={(v) => `${v}`} onChange={set('netZeroYear')} />
              <Slider label="ETS1 cap in 2025" unit="Mt" value={p.cap2025} std={DEFAULTS.cap2025} min={1100} max={1500} step={10} onChange={set('cap2025')} />
              <Slider label="Banked budget headroom" hint="Cumulative surplus/bank that intertemporal trading can draw on. More headroom = flatter, lower price path." unit="Mt" value={p.bank0} std={DEFAULTS.bank0} min={0} max={3000} step={50} onChange={set('bank0')} />
            </ControlGroup>

            <ControlGroup title="Real-economy abatement">
              <Slider label="Counterfactual emissions 2025" hint="Emissions if the carbon price were zero." unit="Mt" value={p.bau2025} std={DEFAULTS.bau2025} min={1000} max={1400} step={10} onChange={set('bau2025')} />
              <Slider label="Counterfactual emissions 2050" hint="How far emissions fall on their own (cheap renewables, efficiency) without a price." unit="Mt" value={p.bau2050} std={DEFAULTS.bau2050} min={300} max={900} step={10} onChange={set('bau2050')} />
              <Slider label="Max abatement without removals" hint="Technical ceiling on conventional cuts. The lower this is, the bigger the endgame spike." value={p.phiMax} std={DEFAULTS.phiMax} min={0.6} max={0.98} step={0.01} display={(v) => `${Math.round(v * 100)}%`} onChange={set('phiMax')} />
              <Slider label="Abatement cost steepness" hint="Scale of the marginal abatement cost curve (€/t). Higher = pricier abatement." unit="€/t" value={p.pscale} std={DEFAULTS.pscale} min={100} max={600} step={5} onChange={set('pscale')} />
              <Slider label="Intertemporal price rise" hint="Hotelling/discount rate — the speed allowance prices climb while the bank lasts." value={p.r} std={DEFAULTS.r} min={0.02} max={0.1} step={0.002} display={(v) => `${(v * 100).toFixed(1)}%`} onChange={set('r')} />
            </ControlGroup>

            <ControlGroup title="CDR techno-economics">
              <Slider label="Cheapest removal cost (BECCS floor)" unit="€/t" value={p.cfloor} std={DEFAULTS.cfloor} min={40} max={160} step={5} onChange={set('cfloor')} />
              <Slider label="Cost rise per Mt deployed" hint="Slope of the removal supply curve — scarcity of biomass/storage/DAC." unit="€/t·Mt" value={p.cslope} std={DEFAULTS.cslope} min={0.3} max={2.5} step={0.1} display={(v) => v.toFixed(1)} onChange={set('cslope')} />
              <Slider label="Physical CDR availability by 2050" unit="Mt" value={p.cdrRmax} std={DEFAULTS.cdrRmax} min={50} max={400} step={10} onChange={set('cdrRmax')} />
              <Slider label="CDR capacity ramp starts" value={p.cdrRampStart} std={DEFAULTS.cdrRampStart} min={2028} max={2040} step={1} display={(v) => `${v}`} onChange={set('cdrRampStart')} />
            </ControlGroup>

            <ControlGroup title="Policy — the sequencing proposal" accent>
              <Slider label="Year CDR is admitted to the ETS" hint="Stage 1 of the sequencing path. Earlier entry contains prices sooner but raises integrity risk." value={p.admStart} std={DEFAULTS.admStart} min={2028} max={2042} step={1} display={(v) => `${v}`} onChange={set('admStart')} />
              <Slider label="Admitted volume ceiling by 2050" hint="The 'limited volume' lever — caps how many removal certificates may be surrendered each year." unit="Mt" value={p.admMax} std={DEFAULTS.admMax} min={0} max={300} step={5} onChange={set('admMax')} />
              <Slider label="Integrity haircut on certificates" hint="Governance discount: 1 certificate counts as less than 1 t of compliance, to hedge non-permanence/MRV risk." value={p.haircut} std={DEFAULTS.haircut} min={0} max={0.5} step={0.02} display={(v) => `${Math.round(v * 100)}%`} onChange={set('haircut')} />
              <Slider label="Price ceiling / penalty backstop" unit="€/t" value={p.Pceil} std={DEFAULTS.Pceil} min={300} max={2000} step={50} onChange={set('Pceil')} />
            </ControlGroup>

            <button
              onClick={() => applyPreset(PRESETS[0])}
              className="w-full rounded-md border border-grey-300 bg-white py-2 text-[12px] font-semibold text-tertiary-dark hover:border-primary hover:text-primary"
            >
              Reset to paper base case
            </button>
          </aside>
        </div>

        {/* the proposal, explained */}
        <section className="mt-10 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-grey-200 bg-surface-teal p-4">
            <h2 className="text-[13px] font-bold text-tertiary-dark">What the proposal actually is</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
              Both publications reject a sudden, unlimited opening of the ETS to removals. Instead they recommend a{' '}
              <strong>three-stage sequencing</strong> in which each stage is unlocked only once risk-reduction
              preconditions are met — keeping the door to scale-up open while guarding the system&rsquo;s integrity:
            </p>
            <ol className="mt-2 space-y-2 text-[12px] leading-relaxed text-tertiary">
              <li>
                <span className="font-bold text-tertiary-dark">① Prepare &amp; signal.</span> Build MRV, certification
                (EU CRCF) and a credible long-term commitment so investors see a market — without yet letting removals
                substitute for abatement. <span className="italic">Lever here: a later “admitted” year, small volume.</span>
              </li>
              <li>
                <span className="font-bold text-tertiary-dark">② Limited admission via the MSR.</span> Admit a{' '}
                <strong>capped</strong> volume of high-integrity permanent removals, ideally docked onto the Market
                Stability Reserve so quantities stay governable. <span className="italic">Levers: admitted-volume
                ceiling, integrity haircut.</span>
              </li>
              <li>
                <span className="font-bold text-tertiary-dark">③ Full backstop.</span> Once costs, permanence and
                governance are proven, removals act as the genuine endgame backstop that sets the price as the cap
                reaches zero. <span className="italic">Lever: larger volume, lower haircut.</span>
              </li>
            </ol>
          </div>

          <div className="rounded-lg border border-grey-200 bg-surface-yellow p-4">
            <h2 className="text-[13px] font-bold text-tertiary-dark">…and how you can change it</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-tertiary">
              The four policy sliders are the dials a regulator actually controls. Try these moves and watch the price
              and removal charts:
            </p>
            <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-tertiary">
              <li>• <strong>Admit earlier</strong> (lower start year) → prices contained sooner, but more risk that
                cheap removals deter real abatement.</li>
              <li>• <strong>Raise the volume ceiling</strong> → stronger price relief for industry, larger biomass/storage
                footprint.</li>
              <li>• <strong>Increase the integrity haircut</strong> → safer against non-permanence, but weaker price
                relief (each certificate buys less compliance).</li>
              <li>• <strong>Delay admission to 2038</strong> → the spike runs first; the valve opens too late to help much.</li>
              <li>• <strong>Soften the cap</strong> (later zero year) → smaller spike, but a weaker climate target.</li>
            </ul>
            <p className="mt-2 text-[11px] leading-relaxed text-tertiary">
              The tension the papers stress: the same removals that contain prices can also <em>deter</em> conventional
              abatement and lean too hard on scarce sustainable biomass. Sequencing — limited volume, integrity haircut,
              MSR docking — is how they keep the upside while bounding that downside.
            </p>
          </div>
        </section>

        {/* method note + sources */}
        <section className="mt-8 max-w-3xl space-y-2 border-t border-grey-200 pt-4 text-[11px] leading-relaxed text-tertiary">
          <p className="text-[12px] font-bold text-tertiary-dark">Method &amp; honest limits</p>
          <p>
            This is a <strong>stylised reduced-form reconstruction</strong>, not the original LIMES-EU model. The price
            is generated by intertemporal (Hotelling) arbitrage of a banked allowance budget: the model solves for the
            2025 price level at which cumulative net emissions over 2025–2050 equal the cumulative cap plus the banked
            headroom, with the price then rising at the chosen intertemporal rate while the bank lasts. Conventional
            abatement follows a convex marginal-cost curve capped at a technical ceiling; permanent CDR enters as a
            price-responsive backstop gated by the sequencing policy. Defaults are calibrated so the central run lands
            near the published anchors (≈€195/2030, ≈€336/2040, ≈90 Mt CDR/yr by 2050). It deliberately abstracts from
            the present allowance surplus, free allocation, CBAM, ETS2, and the full sectoral detail of LIMES-EU, so it
            is a teaching and what-if tool — not a forecast and not investment advice.
          </p>
          <p className="text-[12px] font-bold text-tertiary-dark">Sources</p>
          <ul className="space-y-1">
            <li>
              Ariadne dossier — <em>A Safety Valve for the EU ETS Endgame: Containing Prices through Carbon Dioxide
              Removal</em>:{' '}
              <a className="text-primary underline" href="https://ariadneprojekt.de/en/publication/dossier-containing-prices-through-carbon-dioxide-removal/" target="_blank" rel="noreferrer">
                ariadneprojekt.de
              </a>
            </li>
            <li>
              Sultani, Osorio, Günther, Pahle, Sievert, Schmidt, Steffen &amp; Edenhofer — <em>How the EU can utilise
              its carbon market to scale up Carbon Dioxide Removal / Sequencing CDR into the EU ETS</em>, Joule (2026),
              LIMES-EU (PIK):{' '}
              <a className="text-primary underline" href="https://www.cell.com/joule/fulltext/S2542-4351(26)00079-6" target="_blank" rel="noreferrer">
                cell.com/joule
              </a>{' '}
              · working paper:{' '}
              <a className="text-primary underline" href="https://papers.ssrn.com/sol3/papers.cfm?abstract_id=4875550" target="_blank" rel="noreferrer">
                SSRN 4875550
              </a>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}

function ControlGroup({ title, accent, children }: { title: string; accent?: boolean; children: ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-primary/40 bg-surface-blue' : 'border-grey-200 bg-white'}`}>
      <h3 className={`mb-3 text-[11px] font-bold uppercase tracking-[0.1em] ${accent ? 'text-primary' : 'text-tertiary'}`}>
        {title}
      </h3>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}
