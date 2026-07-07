'use client';

/**
 * Electricity Prices — Why Europe Pays More (EU · US · China) — beta module.
 *
 * A scientific, first-principles explainer of the transatlantic (and
 * trans-Pacific) electricity price gap, built around three surfaces:
 *
 *   1. HISTORY — annual average wholesale power prices 2015–2025 for the EU
 *      (German day-ahead as the liquid EU reference), the US (EIA-tracked
 *      major trading hubs, demand-weighted) and China (administered /
 *      band-limited coal-anchored tariffs), plus the underlying fuel costs
 *      (TTF gas vs Henry Hub gas vs Chinese steam coal, all in €/MWh thermal).
 *
 *   2. MECHANISM — an interactive merit-order model. European day-ahead
 *      markets clear as uniform-price auctions: plants bid ≈ short-run
 *      marginal cost, are stacked cheapest-first, and the LAST plant needed
 *      to meet demand sets the price every generator receives. The model
 *      lets you move the physical inputs (gas price, coal price, CO₂ price,
 *      demand, wind+solar output) and watch the clearing price respond —
 *      with region presets showing that the SAME mechanism fed with US fuel
 *      costs produces US price levels.
 *
 *   3. DIAGNOSIS — the causal decomposition: (i) marginal pricing makes the
 *      most expensive needed plant — in Europe usually a gas plant — set the
 *      price in the majority of hours; (ii) Europe's gas is structurally
 *      3–5× US gas because the US sits on its own shale resource while
 *      Europe imports the marginal molecule as LNG (liquefaction + shipping
 *      + regas ≈ a $4–6/MMBtu wedge, and competition with Asian buyers sets
 *      the rest); (iii) the EU ETS adds ≈ €25–30/MWh to gas power and
 *      ≈ €60–80/MWh to coal power — a deliberate internalisation of the
 *      climate externality that US/Chinese prices mostly do not carry;
 *      (iv) retail bills stack network charges and taxes/levies on top —
 *      ≈ half of an EU household bill never touches the wholesale market;
 *      (v) China is cheap for a different reason: administered,
 *      average-cost pricing anchored to abundant domestic coal, with
 *      households cross-subsidised by industry — cheap at the meter, paid
 *      for in carbon intensity.
 *
 * Data are order-of-magnitude reconstructions from public statistics
 * (Bundesnetzagentur/SMARD, ENTSO-E, EIA, Eurostat, ACER/JRC, NDRC/RMI,
 * IEA), converted at annual-average exchange rates and clearly flagged as
 * approximate. The merit-order model is a stylised teaching tool, not a
 * dispatch simulation.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* ------------------------------------------------------------- palette */
// Region colours (fixed order EU → US → CN; CVD-validated on white):
const REGION_C = {
  eu: '#0065A4', // primary-light
  us: '#B83230', // accent-red
  cn: '#6667AB', // accent-violet
};

/* ---------------------------------------------------------- price data */

const YEARS = [2015, 2016, 2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025];

/**
 * Annual average WHOLESALE electricity prices, €/MWh.
 *  eu — German EPEX day-ahead annual mean (Bundesnetzagentur/SMARD; the most
 *       liquid EU reference; the EU-27 demand-weighted average tracks it closely).
 *  us — EIA-tracked major ICE hubs (PJM West, ERCOT North, Mass Hub, Mid-C…),
 *       rough demand-weighted mean, converted at annual USD→EUR. Approximate.
 *  cn — administered coal-benchmark on-grid tariff (≈ CNY 0.37–0.39/kWh) until
 *       the Oct 2021 reform, then provincial market-transacted averages inside
 *       the ±20% band around the benchmark, converted at annual CNY→EUR.
 *       NOT a spot market price — China dispatches mostly by plan/contract.
 */
const WHOLESALE: { year: number; eu: number; us: number; cn: number }[] = [
  { year: 2015, eu: 31.6, us: 30, cn: 47 },
  { year: 2016, eu: 29.0, us: 24, cn: 46 },
  { year: 2017, eu: 34.2, us: 27, cn: 47 },
  { year: 2018, eu: 44.5, us: 30, cn: 47 },
  { year: 2019, eu: 37.7, us: 24, cn: 46 },
  { year: 2020, eu: 30.5, us: 19, cn: 45 },
  { year: 2021, eu: 96.8, us: 34, cn: 50 },
  { year: 2022, eu: 235.4, us: 59, cn: 60 },
  { year: 2023, eu: 95.2, us: 28, cn: 58 },
  { year: 2024, eu: 78.5, us: 33, cn: 53 },
  { year: 2025, eu: 89.3, us: 36, cn: 48 },
];

/**
 * Annual average FUEL costs, €/MWh THERMAL (lower heating value).
 *  ttf — Dutch TTF month-ahead gas (the EU benchmark).
 *  hh  — Henry Hub spot ($/MMBtu ÷ 0.29307 → $/MWhth, annual USD→EUR).
 *  coalCn — Qinhuangdao 5 500 kcal steam coal (CNY/t ÷ 6.4 MWhth/t, CNY→EUR).
 */
const FUEL: { year: number; ttf: number; hh: number; coalCn: number }[] = [
  { year: 2015, ttf: 19.8, hh: 8.0, coalCn: 9.2 },
  { year: 2016, ttf: 14.0, hh: 7.8, coalCn: 10.2 },
  { year: 2017, ttf: 17.3, hh: 9.0, coalCn: 13.0 },
  { year: 2018, ttf: 22.8, hh: 9.1, coalCn: 12.8 },
  { year: 2019, ttf: 13.6, hh: 7.8, coalCn: 12.0 },
  { year: 2020, ttf: 9.4, hh: 6.1, coalCn: 11.4 },
  { year: 2021, ttf: 46.9, hh: 11.2, coalCn: 21.0 },
  { year: 2022, ttf: 123.1, hh: 20.8, coalCn: 27.0 },
  { year: 2023, ttf: 40.6, hh: 8.0, coalCn: 19.7 },
  { year: 2024, ttf: 34.4, hh: 6.9, coalCn: 17.1 },
  { year: 2025, ttf: 38.0, hh: 10.9, coalCn: 13.0 },
];

/**
 * RETAIL prices 2024, €-cent/kWh, all taxes included (household band DC /
 * medium industry, excl. recoverable VAT for industry).
 * Sources: Eurostat nrg_pc_204/205 (H2 2024), EIA (2024 annual, at 0.924 €/$),
 * NDRC provincial price schedules (≈ CNY 0.52–0.53/kWh residential,
 * ≈ CNY 0.62/kWh general industry & commerce, at 0.128 €/CNY).
 */
const RETAIL = [
  { region: 'EU-27', household: 28.7, industry: 19.0, c: REGION_C.eu },
  { region: 'Germany', household: 39.4, industry: 20.3, c: '#3D5265' },
  { region: 'United States', household: 15.2, industry: 7.5, c: REGION_C.us },
  { region: 'China', household: 6.8, industry: 7.9, c: REGION_C.cn },
];

/**
 * Household bill decomposition (share of final price, 2024, approximate).
 * EU/DE from Eurostat price components; US from EIA/utility rate structures
 * (supply vs delivery; taxes small); China: administered single tariff —
 * generation/T&D split per NDRC cost surveys, residential held BELOW cost
 * recovery via cross-subsidy from industrial & commercial users.
 */
const BILL_SPLIT = [
  { region: 'EU-27 household', energy: 49, network: 27, taxes: 24 },
  { region: 'Germany household', energy: 50, network: 28, taxes: 22 },
  { region: 'US household', energy: 55, network: 40, taxes: 5 },
  { region: 'China household', energy: 60, network: 35, taxes: 5 },
];

/* ------------------------------------------------------ merit-order model */

type Tech = {
  id: string;
  label: string;
  color: string;
  cap: number; // GW available
  // marginal cost €/MWh_el = fuel(€/MWhth)/eff + ef(tCO2/MWhth)/eff · co2 + vom
  fuel: 'gas' | 'coal' | 'vre' | 'fixed';
  eff: number;
  ef: number; // tCO2 per MWh thermal
  vom: number; // €/MWh, incl. fixed fuel cost for nuclear/biomass/oil
};

type Region = {
  id: string;
  label: string;
  blurb: string;
  gas: number; // €/MWh thermal
  coal: number; // €/MWh thermal
  co2: number; // €/tCO2 effectively paid by generators
  demand: number; // GW
  vre: number; // GW wind+solar+RoR-hydro actually producing
  techs: Tech[];
};

const EF_GAS = 0.202; // tCO2/MWh thermal
const EF_COAL = 0.34;
const EF_LIGNITE = 0.4;

// Stylised available capacities (GW). Not a dispatch model: no grid, no
// storage, no imports, availability folded into `cap`.
const euTechs = (): Tech[] => [
  { id: 'vre', label: 'Wind + solar + run-of-river', color: '#74CBC8', cap: 0, fuel: 'vre', eff: 1, ef: 0, vom: 0 },
  { id: 'nuclear', label: 'Nuclear', color: '#ACCAE5', cap: 78, fuel: 'fixed', eff: 1, ef: 0, vom: 10 },
  { id: 'lignite', label: 'Lignite', color: '#8A6E4B', cap: 28, fuel: 'fixed', eff: 0.4, ef: EF_LIGNITE, vom: 12 },
  { id: 'biomass', label: 'Biomass + waste', color: '#7495B2', cap: 20, fuel: 'fixed', eff: 1, ef: 0, vom: 45 },
  { id: 'coal', label: 'Hard coal', color: '#54728C', cap: 38, fuel: 'coal', eff: 0.42, ef: EF_COAL, vom: 3 },
  { id: 'ccgt', label: 'Gas — CCGT', color: '#FF9933', cap: 145, fuel: 'gas', eff: 0.56, ef: EF_GAS, vom: 2 },
  { id: 'ocgt', label: 'Gas — peakers (OCGT)', color: '#E0701A', cap: 45, fuel: 'gas', eff: 0.38, ef: EF_GAS, vom: 3 },
  { id: 'oil', label: 'Oil peakers', color: '#B83230', cap: 12, fuel: 'fixed', eff: 1, ef: 0, vom: 160 },
];

const usTechs = (): Tech[] => [
  { id: 'vre', label: 'Wind + solar + run-of-river', color: '#74CBC8', cap: 0, fuel: 'vre', eff: 1, ef: 0, vom: 0 },
  { id: 'nuclear', label: 'Nuclear', color: '#ACCAE5', cap: 90, fuel: 'fixed', eff: 1, ef: 0, vom: 10 },
  { id: 'biomass', label: 'Biomass + waste', color: '#7495B2', cap: 12, fuel: 'fixed', eff: 1, ef: 0, vom: 45 },
  { id: 'coal', label: 'Coal', color: '#54728C', cap: 165, fuel: 'coal', eff: 0.38, ef: EF_COAL, vom: 3 },
  { id: 'ccgt', label: 'Gas — CCGT', color: '#FF9933', cap: 280, fuel: 'gas', eff: 0.56, ef: EF_GAS, vom: 2 },
  { id: 'ocgt', label: 'Gas — peakers (OCGT/steam)', color: '#E0701A', cap: 150, fuel: 'gas', eff: 0.36, ef: EF_GAS, vom: 3 },
  { id: 'oil', label: 'Oil peakers', color: '#B83230', cap: 30, fuel: 'fixed', eff: 1, ef: 0, vom: 150 },
];

const cnTechs = (): Tech[] => [
  { id: 'vre', label: 'Wind + solar + run-of-river', color: '#74CBC8', cap: 0, fuel: 'vre', eff: 1, ef: 0, vom: 0 },
  { id: 'nuclear', label: 'Nuclear', color: '#ACCAE5', cap: 55, fuel: 'fixed', eff: 1, ef: 0, vom: 10 },
  { id: 'hydro', label: 'Dispatchable hydro', color: '#75C9DB', cap: 180, fuel: 'fixed', eff: 1, ef: 0, vom: 5 },
  { id: 'biomass', label: 'Biomass + waste', color: '#7495B2', cap: 30, fuel: 'fixed', eff: 1, ef: 0, vom: 40 },
  { id: 'coal', label: 'Coal', color: '#54728C', cap: 1080, fuel: 'coal', eff: 0.41, ef: EF_COAL, vom: 3 },
  { id: 'ccgt', label: 'Gas — CCGT', color: '#FF9933', cap: 110, fuel: 'gas', eff: 0.55, ef: EF_GAS, vom: 2 },
  { id: 'oil', label: 'Oil peakers', color: '#B83230', cap: 8, fuel: 'fixed', eff: 1, ef: 0, vom: 150 },
];

const REGIONS: Region[] = [
  {
    id: 'eu2025',
    label: 'EU 2025',
    blurb: 'TTF ≈ €38/MWhth, ETS ≈ €70/t. A CCGT needs ≈ €95/MWh to break even — and it is the marginal plant in most hours.',
    gas: 38, coal: 13, co2: 70, demand: 350, vre: 105, techs: euTechs(),
  },
  {
    id: 'eu2019',
    label: 'EU 2019 (pre-crisis)',
    blurb: 'TTF ≈ €14/MWhth, ETS ≈ €25/t: the same system cleared near €38/MWh. The machines have not changed since — the fuel bill has.',
    gas: 14, coal: 10, co2: 25, demand: 355, vre: 70, techs: euTechs(),
  },
  {
    id: 'eu2022',
    label: 'EU Aug 2022 (crisis)',
    blurb: 'Russian pipeline flows cut, TTF ≈ €235/MWhth, half the French nuclear fleet offline, drought-hit hydro: the marginal CCGT alone cost > €450/MWh.',
    gas: 235, coal: 40, co2: 85, demand: 340, vre: 75,
    techs: euTechs().map((t) => (t.id === 'nuclear' ? { ...t, cap: 48 } : t)),
  },
  {
    id: 'us2025',
    label: 'US 2025',
    blurb: 'Same auction logic in PJM/ERCOT/MISO — but Henry Hub gas costs ≈ €11/MWhth and there is no federal carbon price. The marginal CCGT clears near €25/MWh.',
    gas: 11, coal: 8, co2: 0, demand: 500, vre: 90, techs: usTechs(),
  },
  {
    id: 'cn2025',
    label: 'China 2025 (hypothetical spot)',
    blurb: 'China does not run a full merit-order market — most volume moves at administered/contract prices near the coal benchmark. IF it dispatched by marginal cost, cheap domestic coal (≈ €13/MWhth) with a near-zero effective carbon cost would clear around €35–40/MWh.',
    gas: 42, coal: 13, co2: 2, demand: 1150, vre: 290, techs: cnTechs(),
  },
];

type Block = { tech: Tech; mc: number; from: number; to: number };

const TECH_SHORT: Record<string, string> = {
  vre: 'VRE',
  nuclear: 'Nuclear',
  hydro: 'Hydro',
  lignite: 'Lignite',
  biomass: 'Bio',
  coal: 'Coal',
  ccgt: 'CCGT',
  ocgt: 'OCGT',
  oil: 'Oil',
};

function marginalCost(t: Tech, gas: number, coal: number, co2: number): number {
  if (t.fuel === 'vre') return 0;
  const fuelPrice = t.fuel === 'gas' ? gas : t.fuel === 'coal' ? coal : 0;
  return fuelPrice / t.eff + (t.ef / t.eff) * co2 + t.vom;
}

function buildStack(techs: Tech[], vre: number, gas: number, coal: number, co2: number): Block[] {
  const withMc = techs.map((t) => ({
    tech: t.id === 'vre' ? { ...t, cap: vre } : t,
    mc: t.id === 'vre' ? 0 : marginalCost(t, gas, coal, co2),
  }));
  withMc.sort((a, b) => a.mc - b.mc);
  let x = 0;
  return withMc.map(({ tech, mc }) => {
    const from = x;
    x += tech.cap;
    return { tech, mc, from, to: x };
  });
}

function clearing(stack: Block[], demand: number): { price: number; marginal: Block | null; unserved: boolean } {
  for (const b of stack) {
    if (demand <= b.to) return { price: b.mc, marginal: b, unserved: false };
  }
  return { price: 3000, marginal: null, unserved: true }; // scarcity: administrative price cap
}

/* ------------------------------------------------------------ UI helpers */

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

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
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmt(value)}
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
            title={`Preset: ${fmt(std!)}`}
            className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50"
            style={{ left: `calc(${stdPct}%)` }}
          />
        )}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        {hint ? <p className="text-[10.5px] leading-snug text-tertiary">{hint}</p> : <span />}
        {std !== undefined && modified && (
          <button
            type="button"
            onClick={() => onChange(std)}
            className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-accent-orange hover:underline"
          >
            ↺ preset {fmt(std)}
          </button>
        )}
      </div>
    </label>
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

/* Multi-series annual line chart (2015–2025) ---------------------------- */

type Series = { label: string; short: string; color: string; dash?: boolean; values: number[] };

function YearLineChart(props: {
  series: Series[];
  yMax: number;
  yLabel: string;
  height?: number;
  annotate?: { year: number; label: string };
}) {
  const { series, yMax, yLabel, height = 280, annotate } = props;
  const [hover, setHover] = useState<number | null>(null);
  const W = 720;
  const H = height;
  const m = { l: 48, r: 70, t: 16, b: 26 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const sx = (i: number) => m.l + (i / (YEARS.length - 1)) * iw;
  const sy = (v: number) => m.t + ih - (Math.min(v, yMax) / yMax) * ih;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={yLabel}
      onMouseLeave={() => setHover(null)}
      onMouseMove={(e) => {
        const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
        const px = ((e.clientX - rect.left) / rect.width) * W;
        const i = Math.round(((px - m.l) / iw) * (YEARS.length - 1));
        setHover(i >= 0 && i < YEARS.length ? i : null);
      }}
    >
      {Array.from({ length: 5 }, (_, i) => {
        const v = (yMax / 4) * i;
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
      {YEARS.map((yr, i) =>
        yr % 2 === 1 ? (
          <text key={yr} x={sx(i)} y={H - 8} textAnchor="middle" className="fill-grey-500" fontSize={10}>
            {yr}
          </text>
        ) : null,
      )}
      <text x={m.l} y={m.t - 4} className="fill-tertiary" fontSize={10}>
        {yLabel}
      </text>
      {annotate && (
        <g>
          <line
            x1={sx(YEARS.indexOf(annotate.year))}
            x2={sx(YEARS.indexOf(annotate.year))}
            y1={m.t}
            y2={m.t + ih}
            stroke="#BCBEC0"
            strokeWidth={1}
            strokeDasharray="3 3"
          />
          <text x={sx(YEARS.indexOf(annotate.year)) - 4} y={m.t + 9} textAnchor="end" className="fill-grey-500" fontSize={9}>
            {annotate.label}
          </text>
        </g>
      )}
      {hover !== null && (
        <line x1={sx(hover)} x2={sx(hover)} y1={m.t} y2={m.t + ih} stroke="#3D5265" strokeWidth={1} opacity={0.35} />
      )}
      {series.map((s) => (
        <path
          key={s.label}
          d={s.values.map((v, i) => `${i === 0 ? 'M' : 'L'} ${sx(i).toFixed(1)} ${sy(v).toFixed(1)}`).join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth={2.25}
          strokeDasharray={s.dash ? '5 4' : undefined}
          strokeLinejoin="round"
        />
      ))}
      {/* direct end labels, nudged apart when series end close together */}
      {(() => {
        const pos = series
          .map((s) => ({ s, y: sy(s.values[s.values.length - 1]) + 3.5 }))
          .sort((a, b) => a.y - b.y);
        for (let i = 1; i < pos.length; i++) {
          if (pos[i].y - pos[i - 1].y < 12) pos[i].y = pos[i - 1].y + 12;
        }
        return pos.map(({ s, y }) => (
          <text key={s.label} x={sx(YEARS.length - 1) + 6} y={y} fontSize={10} fontWeight={600} fill={s.color}>
            {s.short}
          </text>
        ));
      })()}
      {hover !== null && (
        <g>
          {series.map((s) => (
            <circle key={s.label} cx={sx(hover)} cy={sy(s.values[hover])} r={3.5} fill={s.color} stroke="#fff" strokeWidth={1.5} />
          ))}
          {(() => {
            const bw = 128;
            const bx = Math.min(Math.max(sx(hover) + 8, m.l), W - m.r - bw);
            const by = m.t + 4;
            return (
              <g>
                <rect x={bx} y={by} width={bw} height={16 + series.length * 13} rx={4} fill="#2E3E4C" opacity={0.93} />
                <text x={bx + 8} y={by + 12} fontSize={9.5} fontWeight={700} fill="#fff">
                  {YEARS[hover]}
                </text>
                {series.map((s, si) => (
                  <text key={s.label} x={bx + 8} y={by + 25 + si * 13} fontSize={9.5} fill="#fff">
                    <tspan fill={s.color === '#0065A4' ? '#75C9DB' : s.color === '#B83230' ? '#FF9C9A' : '#C9CAEF'}>●</tspan>
                    {'  '}
                    {s.label}: {fmt(s.values[hover], s.values[hover] < 20 ? 1 : 0)}
                  </text>
                ))}
              </g>
            );
          })()}
        </g>
      )}
    </svg>
  );
}

/* Merit-order stack chart ------------------------------------------------ */

function MeritOrderChart(props: { stack: Block[]; demand: number; price: number; unserved: boolean }) {
  const { stack, demand, price, unserved } = props;
  const [hover, setHover] = useState<Block | null>(null);
  const W = 720;
  const H = 320;
  const m = { l: 50, r: 16, t: 18, b: 34 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const totalCap = stack[stack.length - 1]?.to ?? 1;
  const xMax = Math.max(totalCap, demand) * 1.04;
  const yMax = Math.max(60, Math.ceil((Math.max(...stack.map((b) => b.mc), unserved ? 0 : price) * 1.25) / 20) * 20);
  const sx = (gw: number) => m.l + (gw / xMax) * iw;
  const sy = (v: number) => m.t + ih - (Math.min(v, yMax) / yMax) * ih;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Merit order: marginal cost vs cumulative capacity" onMouseLeave={() => setHover(null)}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (yMax / 4) * i;
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={sy(v)} y2={sy(v)} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={sy(v) + 3} textAnchor="end" className="fill-grey-500" fontSize={10}>
              {fmt(v)}
            </text>
          </g>
        );
      })}
      <text x={m.l} y={m.t - 6} className="fill-tertiary" fontSize={10}>
        Short-run marginal cost (€/MWh)
      </text>
      <text x={W - m.r} y={H - 6} textAnchor="end" className="fill-grey-500" fontSize={10}>
        Cumulative available capacity (GW)
      </text>
      {/* capacity blocks */}
      {stack.map((b) => {
        const barH = Math.max(2.5, sy(0) - sy(b.mc));
        const served = Math.min(Math.max(demand - b.from, 0), b.tech.cap);
        return (
          <g key={b.tech.id} onMouseEnter={() => setHover(b)}>
            <rect
              x={sx(b.from) + 1}
              y={sy(b.mc) - (b.mc === 0 ? 3 : 0)}
              width={Math.max(0, sx(b.to) - sx(b.from) - 2)}
              height={barH + (b.mc === 0 ? 3 : 0)}
              fill={b.tech.color}
              opacity={served > 0 ? 0.95 : 0.35}
              rx={2}
            />
            {b.tech.cap / xMax > 0.07 && (
              <text
                x={(sx(b.from) + sx(b.to)) / 2}
                y={sy(0) + 12}
                textAnchor="middle"
                fontSize={9}
                className="fill-tertiary"
              >
                {TECH_SHORT[b.tech.id] ?? b.tech.label}
              </text>
            )}
          </g>
        );
      })}
      {/* demand line */}
      <line x1={sx(demand)} x2={sx(demand)} y1={m.t} y2={sy(0)} stroke="#2E3E4C" strokeWidth={2} />
      <text x={sx(demand) + 4} y={m.t + 10} fontSize={10} fontWeight={700} className="fill-tertiary-dark">
        demand {fmt(demand)} GW
      </text>
      {/* clearing price line */}
      {!unserved && (
        <g>
          <line x1={m.l} x2={sx(demand)} y1={sy(price)} y2={sy(price)} stroke="#2E3E4C" strokeWidth={1.5} strokeDasharray="6 4" />
          <text x={m.l + 4} y={sy(price) - 5} fontSize={11} fontWeight={700} className="fill-tertiary-dark">
            clearing price ≈ €{fmt(price)}/MWh — paid to EVERY dispatched plant
          </text>
        </g>
      )}
      {unserved && (
        <text x={m.l + 4} y={m.t + 12} fontSize={11} fontWeight={700} fill="#B83230">
          Demand exceeds available capacity — scarcity pricing / load shedding
        </text>
      )}
      {hover && (
        <g>
          <rect x={m.l + 2} y={sy(0) - 40} width={310} height={32} rx={4} fill="#2E3E4C" opacity={0.93} />
          <text x={m.l + 10} y={sy(0) - 27} fontSize={10} fontWeight={700} fill="#fff">
            {hover.tech.label} — {fmt(hover.tech.cap)} GW
          </text>
          <text x={m.l + 10} y={sy(0) - 14} fontSize={10} fill="#fff">
            marginal cost ≈ €{fmt(hover.mc)}/MWh {hover.to <= (props.demand as number) ? '· fully dispatched' : hover.from < props.demand ? '· PRICE-SETTING' : '· not needed'}
          </text>
        </g>
      )}
    </svg>
  );
}

/* Horizontal stacked bars (bill decomposition, CCGT cost) ---------------- */

function HBar(props: {
  label: string;
  total: string;
  segments: { label: string; value: number; color: string }[];
  max: number;
}) {
  const { label, total, segments, max } = props;
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className="font-mono text-[12px] text-primary">{total}</span>
      </div>
      <div className="mt-1 flex h-5 w-full overflow-hidden rounded">
        {segments.map((s) => (
          <div
            key={s.label}
            title={`${s.label}: ${fmt(s.value, 1)}`}
            className="h-full first:rounded-l last:rounded-r"
            style={{ width: `${(s.value / max) * 100}%`, background: s.color, marginRight: 2 }}
          />
        ))}
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- content */

const CAUSES: { n: string; title: string; body: string }[] = [
  {
    n: '1',
    title: 'Marginal pricing: the last plant sets the price for all',
    body:
      'EU day-ahead markets are uniform-price auctions. Plants bid ≈ short-run marginal cost, the cheapest run first, and the most expensive plant still needed sets the price every generator receives. This is deliberate and economically efficient — it minimises total dispatch cost and rewards cheap plants with the margin that finances them (infra-marginal rent). But it means the AVERAGE cost of the fleet is irrelevant to the price: only the marginal machine matters. In Europe that machine is a gas plant in well over half of all hours (JRC puts fossil gas as price-setter in ≈ 55–65% of hours across 2019–2022; ACER: “more than half”), even though gas supplies < 20% of EU electricity. Hence the 2021–22 paradox: wind, solar, nuclear and hydro costs were unchanged, yet power prices rose ~8-fold — because the marginal gas plant’s costs did.',
  },
  {
    n: '2',
    title: 'The gas wedge: Europe imports its marginal molecule, the US drills it',
    body:
      'The US sits on the Appalachian and Permian shale resource: Henry Hub gas has averaged $2–4/MMBtu (≈ €6–12/MWhth) for a decade because supply is domestic, elastic and pipeline-delivered. Europe’s own production (Groningen, North Sea) has collapsed, and since 2022 the Russian pipeline supply that once anchored prices is gone — so Europe’s marginal molecule arrives as LNG. Physics and logistics put a hard wedge on that molecule: liquefaction (≈ $2.5–3.5), shipping (≈ $0.5–1.5) and regasification (≈ $0.3–0.6) mean US gas landed in Rotterdam can never cost what it costs in Louisiana. On top, the marginal LNG cargo is auctioned between Europe and Asia, so TTF must track Asian JKM willingness-to-pay, not US production cost. Result: TTF has settled at a structural 3–5× Henry Hub (≈ €34 vs €7 in 2024). Divide by a CCGT efficiency of ~0.56 and the fuel term alone separates EU and US power prices by €50–60/MWh.',
  },
  {
    n: '3',
    title: 'Carbon pricing: Europe deliberately internalises the externality',
    body:
      'The EU ETS charged €60–85/tCO₂ across 2023–2025. Through the merit order that adds ≈ (0.202/0.56)·P ≈ €22–31/MWh to the marginal CCGT and ≈ €50–80/MWh to coal — and because the marginal plant is fossil, the carbon price passes through to nearly every hour’s power price. This is the policy working as designed: the price signal that pushed EU power-sector emissions down ~40% since 2015 and re-ordered coal behind gas. The US has no federal carbon price (RGGI and California together price a small slice at far lower levels), and China’s national ETS is intensity-based with free allocation calibrated so that an average coal plant pays roughly nothing at the margin (allowance price ≈ CNY 70–100/t ≈ €9–13, effective cost near zero). Comparing bare price tags therefore compares an EU price that contains the climate externality with US/Chinese prices that mostly do not.',
  },
  {
    n: '4',
    title: 'The retail stack: half the EU bill never touches the wholesale market',
    body:
      'A household in the EU paid ≈ 28.7 ct/kWh in 2024, of which only ≈ half is energy: ≈ 27% is network charges (Europe’s grids are being rebuilt for renewables, and TSO/DSO capex is rising) and ≈ 24% taxes and levies (energy taxes, VAT at full rate in most member states, legacy renewable-support surcharges, capacity and social levies). The US household pays ≈ 15.2 ct/kWh with taxes typically < 5% of the bill and lighter grid fees spread over much higher per-capita consumption (~2× EU) and, in half the country, regulated cost-of-service utilities that pass through AVERAGE — not marginal — generation cost. So even where US wholesale is only €40 cheaper, the retail gap widens further through the fiscal and network layers.',
  },
  {
    n: '5',
    title: 'China is cheap by administration, not by auction',
    body:
      'China does not (yet) clear most power through a merit-order market. On-grid prices are anchored to a coal benchmark (≈ CNY 0.38/kWh ≈ €48/MWh) and may float only ±20% around it; since 2024 coal plants also receive a separate capacity payment. The anchor itself is cheap because China mines half the world’s coal — domestic 5 500 kcal steam coal at ≈ CNY 700/t is ≈ €13/MWh thermal. Households are then charged BELOW cost (≈ CNY 0.52/kWh ≈ 6.8 ct€) via an explicit cross-subsidy from industrial and commercial users — the inverse of the EU, where households pay ~1.5× industry. The meter price omits the externality: China’s grid emits ≈ 550–600 gCO₂/kWh against ≈ 230 in the EU — the cheapness is paid in carbon, and increasingly in curtailed solar as administered prices struggle to absorb a record renewables build-out (the Feb 2025 pricing reform moves new renewables to market-based contracts-for-difference for exactly this reason).',
  },
  {
    n: '6',
    title: 'What it is NOT: renewables are not the wholesale culprit',
    body:
      'Within the merit order, wind and solar bid ≈ €0 and can only DISPLACE expensive marginal plants — the “merit-order effect” lowers the clearing price whenever they run (visible in the model above: push VRE output up and the price falls; 2024–25 even saw record hours of zero/negative prices). What renewables do add appears elsewhere: grid-expansion capex in the network tariff, legacy support schemes in the levies, balancing/backup costs, and — as their share grows — a redistribution of when prices are high (scarce, dark-calm evenings) versus zero (sunny middays). The 2021–25 EU price level, however, is overwhelmingly a fossil-gas-cost story plus deliberate carbon pricing — not a renewables story. The structural fix both ACER and the Draghi report point to is the same: less gas at the margin (more clean firm capacity, storage, demand response, interconnection) and retail/fiscal reform, not abandoning marginal pricing.',
  },
];

const SOURCES: { label: string; url: string }[] = [
  { label: 'Bundesnetzagentur / SMARD — German day-ahead market data 2024–2025', url: 'https://www.bundesnetzagentur.de/SharedDocs/Pressemitteilungen/EN/2026/20260104_SMARD.html' },
  { label: 'EIA — Wholesale electricity market data (ICE hubs)', url: 'https://www.eia.gov/electricity/wholesale/' },
  { label: 'EIA — Average retail price of electricity (2024)', url: 'https://www.eia.gov/electricity/sales_revenue_price/' },
  { label: 'EIA — Henry Hub natural gas spot price (annual)', url: 'https://www.eia.gov/dnav/ng/hist/rngwhhdm.htm' },
  { label: 'Eurostat — Electricity price statistics (nrg_pc_204/205, H2 2024)', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Electricity_price_statistics' },
  { label: 'JRC (2023) — The merit order and price-setting dynamics in European electricity markets', url: 'https://publications.jrc.ec.europa.eu/repository/bitstream/JRC134300/JRC134300_01.pdf' },
  { label: 'ACER — Key developments in European electricity and gas markets', url: 'https://www.acer.europa.eu/monitoring/electricity-gas-key-developments-2026' },
  { label: 'ACER — Assessment of Europe’s high energy prices and wholesale market design (2021–22)', url: 'https://acer.europa.eu/en/The_agency/Organisation/Documents/Energy%20Prices_Final.pdf' },
  { label: 'RMI — China Power Market Outlook (benchmark ±20% band, capacity tariff, reforms)', url: 'https://rmi.org/insight/2024-china-power-market-outlook/' },
  { label: 'NDRC via china-briefing — China industrial power rates & cross-subsidy structure', url: 'https://www.china-briefing.com/news/chinas-industrial-power-rates-category-electricity-usage-region-classification/' },
  { label: 'IEA — Electricity 2026 / Mid-Year Update 2025 (regional wholesale price trends)', url: 'https://www.iea.org/reports/electricity-2026/prices' },
  { label: 'Draghi report (2024) — The future of European competitiveness (energy-cost chapter)', url: 'https://commission.europa.eu/topics/eu-competitiveness/draghi-report_en' },
];

/* ------------------------------------------------------------------ page */

export default function ElectricityPricesPage() {
  const [regionId, setRegionId] = useState('eu2025');
  const region = REGIONS.find((r) => r.id === regionId)!;

  const [gas, setGas] = useState(region.gas);
  const [coal, setCoal] = useState(region.coal);
  const [co2, setCo2] = useState(region.co2);
  const [demand, setDemand] = useState(region.demand);
  const [vre, setVre] = useState(region.vre);

  const pickRegion = (r: Region) => {
    setRegionId(r.id);
    setGas(r.gas);
    setCoal(r.coal);
    setCo2(r.co2);
    setDemand(r.demand);
    setVre(r.vre);
  };

  const stack = useMemo(() => buildStack(region.techs, vre, gas, coal, co2), [region, vre, gas, coal, co2]);
  const clr = useMemo(() => clearing(stack, demand), [stack, demand]);

  const maxCap = stack[stack.length - 1]?.to ?? 1;

  // CCGT vs coal unit-economics comparison (fixed illustrative 2025 inputs)
  const ccgtEu = { fuel: 38 / 0.56, co2: (EF_GAS / 0.56) * 70, vom: 2 };
  const ccgtUs = { fuel: 11 / 0.56, co2: 0, vom: 2 };
  const coalCn = { fuel: 13 / 0.41, co2: (EF_COAL / 0.41) * 2, vom: 3 };
  const ccgtMax = ccgtEu.fuel + ccgtEu.co2 + ccgtEu.vom;

  const wholesaleSeries: Series[] = [
    { label: 'EU (DE day-ahead)', short: 'EU', color: REGION_C.eu, values: WHOLESALE.map((d) => d.eu) },
    { label: 'US (major hubs)', short: 'US', color: REGION_C.us, values: WHOLESALE.map((d) => d.us) },
    { label: 'China (admin.)', short: 'CN', color: REGION_C.cn, dash: true, values: WHOLESALE.map((d) => d.cn) },
  ];
  const fuelSeries: Series[] = [
    { label: 'TTF gas (EU)', short: 'TTF', color: REGION_C.eu, values: FUEL.map((d) => d.ttf) },
    { label: 'Henry Hub (US)', short: 'HH', color: REGION_C.us, values: FUEL.map((d) => d.hh) },
    { label: 'Steam coal (CN)', short: 'Coal', color: REGION_C.cn, dash: true, values: FUEL.map((d) => d.coalCn) },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · Historic data 2015–2025 · interactive merit-order model · EU vs US vs China
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Electricity Prices — Why Europe Pays More
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            A European household pays ≈ <strong>29 ct/kWh</strong>; an American ≈ <strong>15</strong>; a Chinese
            household ≈ <strong>7</strong>. This module takes the question apart scientifically: the historic price
            record, the <strong>merit-order mechanism</strong> that sets the wholesale price hour by hour, the fuel
            and carbon inputs that mechanism eats, and the network-and-tax stack on top. Short version: Europe’s
            price is set most hours by a <strong>gas plant burning imported LNG at 3–5× US gas cost</strong>, plus a
            deliberate <strong>carbon price</strong>, plus the EU’s heavier retail levies — while China is cheap by
            <strong> administered coal-anchored pricing</strong> that leaves the carbon bill off the meter.
          </p>
        </section>

        {/* headline stats */}
        <section className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            { v: '€89', s: '/MWh', l: 'EU wholesale 2025 (German day-ahead avg.)', c: REGION_C.eu },
            { v: '≈ €36', s: '/MWh', l: 'US wholesale 2025 (major hubs, demand-wtd.)', c: REGION_C.us },
            { v: '3–5×', s: '', l: 'TTF gas vs Henry Hub, structural ratio since 2022', c: '#2E3E4C' },
            { v: '> 50%', s: 'of hours', l: 'gas plants set the EU power price (JRC/ACER)', c: '#2E3E4C' },
          ].map((k) => (
            <div key={k.l} className="rounded-lg border border-grey-200 bg-white p-3">
              <p className="font-mono text-xl font-bold" style={{ color: k.c }}>
                {k.v}
                <span className="text-[11px] font-normal text-tertiary"> {k.s}</span>
              </p>
              <p className="mt-1 text-[11px] leading-snug text-tertiary">{k.l}</p>
            </div>
          ))}
        </section>

        {/* 1 — history */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · The historic record, 2015–2025</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Until 2020 the three systems were within ~€25/MWh of each other. Then Europe’s marginal fuel repriced:
            the 2021 global gas squeeze, the 2022 cut-off of Russian pipeline supply (and a simultaneous French
            nuclear + hydro drought), and the permanent switch to LNG as Europe’s marginal supply. US prices barely
            moved — Henry Hub is set by domestic shale, not by the world market. China’s administered price hardly
            can move — it is a regulated band around the coal benchmark, not an auction.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-3">
              <p className="text-[12px] font-bold text-tertiary-dark">Wholesale electricity, annual average (€/MWh)</p>
              <YearLineChart series={wholesaleSeries} yMax={250} yLabel="€/MWh" annotate={{ year: 2022, label: 'RU pipeline cut-off' }} />
              <Legend
                items={[
                  { label: 'EU — German day-ahead (SMARD)', color: REGION_C.eu },
                  { label: 'US — EIA major hubs (approx.)', color: REGION_C.us },
                  { label: 'China — administered/band (approx.)', color: REGION_C.cn, dash: true },
                ]}
              />
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-3">
              <p className="text-[12px] font-bold text-tertiary-dark">The input that explains it: fuel cost (€/MWh thermal)</p>
              <YearLineChart series={fuelSeries} yMax={130} yLabel="€/MWh thermal" annotate={{ year: 2022, label: 'TTF peak month ≈ €236' }} />
              <Legend
                items={[
                  { label: 'TTF gas — EU benchmark', color: REGION_C.eu },
                  { label: 'Henry Hub gas — US benchmark', color: REGION_C.us },
                  { label: 'Qinhuangdao steam coal — China', color: REGION_C.cn, dash: true },
                ]}
              />
            </div>
          </div>
          <p className="mt-2 text-[11px] text-tertiary">
            EU wholesale correlates with TTF at CCGT pass-through (≈ fuel ÷ 0.56 + carbon): 2019 gas €14 → power €38;
            2022 gas €123 → power €235; 2025 gas €38 → power €89. The US line sits where €7–11 gas puts it. China’s
            line follows the administered coal benchmark, not hourly scarcity. US and China series are approximate
            reconstructions (currency-converted, hub/province-averaged) — see caveats below.
          </p>
        </section>

        {/* 2 — merit order */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · The mechanism: a merit-order model you can drive</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Every plant bids ≈ its short-run marginal cost: <span className="font-mono text-[12px]">MC = fuel/η + (EF/η)·CO₂ + O&amp;M</span>.
            Bids are stacked cheapest-first; where cumulative capacity meets demand, the <strong>last accepted bid sets the
            uniform clearing price</strong> paid to all. Switch region presets to see that the price gap is an
            <strong> input</strong> gap, not a mechanism gap — then drag the sliders: push wind+solar up (price falls — the
            merit-order effect), or replay August 2022.
          </p>

          <div className="mt-3 flex flex-wrap gap-2">
            {REGIONS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => pickRegion(r)}
                className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold ${
                  regionId === r.id
                    ? 'border-primary bg-primary text-white'
                    : 'border-grey-300 bg-white text-tertiary hover:border-primary hover:text-primary'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
          <p className="mt-2 max-w-3xl rounded-md bg-surface-blue px-3 py-2 text-[12px] leading-relaxed text-tertiary">
            {region.blurb}
          </p>

          <div className="mt-4 grid gap-4 lg:grid-cols-[300px_1fr]">
            <div className="space-y-4 rounded-lg border border-grey-200 bg-white p-4">
              <Slider label="Gas price" hint="TTF / Henry Hub / city-gate, thermal" value={gas} min={5} max={250} step={1} unit="€/MWhth" std={region.gas} onChange={setGas} />
              <Slider label="Coal price" hint="Hard coal / steam coal, thermal" value={coal} min={4} max={60} step={1} unit="€/MWhth" std={region.coal} onChange={setCoal} />
              <Slider label="Carbon price (effective)" hint="EU ETS ≈ €70; US ≈ 0 federally; CN ETS ≈ 0 at the margin" value={co2} min={0} max={150} step={1} unit="€/tCO₂" std={region.co2} onChange={setCo2} />
              <Slider label="Demand" hint="System load this hour" value={demand} min={Math.round(region.demand * 0.55)} max={Math.round(region.demand * 1.45)} step={5} unit="GW" std={region.demand} onChange={setDemand} />
              <Slider label="Wind + solar + RoR output" hint="Weather-dependent, bids at ≈ €0" value={vre} min={0} max={Math.round(region.demand * 0.95)} step={5} unit="GW" std={region.vre} onChange={setVre} />
            </div>

            <div className="rounded-lg border border-grey-200 bg-white p-3">
              <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
                <p className="text-[12px] font-bold text-tertiary-dark">Supply stack, sorted by marginal cost</p>
                <p className="font-mono text-sm font-bold text-primary">
                  {clr.unserved ? 'scarcity' : `€${fmt(clr.price)}/MWh`}
                  {!clr.unserved && clr.marginal && (
                    <span className="ml-2 text-[11px] font-normal text-tertiary">
                      marginal: {clr.marginal.tech.label}
                    </span>
                  )}
                </p>
              </div>
              <MeritOrderChart stack={stack} demand={Math.min(demand, maxCap * 1.02)} price={clr.price} unserved={clr.unserved} />
              <Legend
                items={stack
                  .filter((b) => b.tech.cap > 0)
                  .map((b) => ({ label: `${b.tech.label} (€${fmt(b.mc)})`, color: b.tech.color }))}
              />
              <p className="mt-2 text-[10.5px] text-tertiary">
                Stylised single-node model: availability-derated capacities, no grid constraints, storage, imports or
                start-up costs; China preset is a hypothetical — most Chinese volume trades at administered/contract
                prices, not hourly auctions.
              </p>
            </div>
          </div>

          {/* same machine, three fuel bills */}
          <div className="mt-4 rounded-lg border border-grey-200 bg-white p-4">
            <p className="text-[12px] font-bold text-tertiary-dark">
              The decisive comparison: the SAME machine, three fuel bills (2025 inputs)
            </p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              {[
                { l: 'CCGT in the EU', d: ccgtEu, note: 'TTF €38/MWhth · ETS €70/t' },
                { l: 'CCGT in the US', d: ccgtUs, note: 'Henry Hub ≈ €11/MWhth · no carbon price' },
                { l: 'Coal unit in China', d: coalCn, note: 'Domestic coal ≈ €13/MWhth · ETS ≈ €0 effective' },
              ].map((x) => (
                <div key={x.l}>
                  <HBar
                    label={x.l}
                    total={`≈ €${fmt(x.d.fuel + x.d.co2 + x.d.vom)}/MWh`}
                    max={ccgtMax}
                    segments={[
                      { label: 'Fuel', value: x.d.fuel, color: '#54728C' },
                      { label: 'CO₂ cost', value: x.d.co2, color: '#B83230' },
                      { label: 'O&M', value: x.d.vom, color: '#BCBEC0' },
                    ]}
                  />
                  <p className="mt-1 text-[10.5px] text-tertiary">{x.note}</p>
                </div>
              ))}
            </div>
            <div className="mt-2">
              <Legend items={[{ label: 'Fuel ÷ efficiency', color: '#54728C' }, { label: 'Carbon cost', color: '#B83230' }, { label: 'Variable O&M', color: '#BCBEC0' }]} />
            </div>
            <p className="mt-2 max-w-3xl text-[12px] text-tertiary">
              Of the ≈ €73/MWh gap between the EU and US marginal generator, ≈ <strong>€48 is fuel</strong> (the LNG
              wedge + world-market pricing) and ≈ <strong>€25 is the carbon price</strong> — one part geology and
              logistics, one part deliberate policy.
            </p>
          </div>
        </section>

        {/* 3 — retail */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · From wholesale to the meter: the retail stack</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            The wholesale price is only ≈ half of a European bill. Network charges and taxes/levies do the rest — and
            they are where EU, US and Chinese systems differ philosophically: the EU loads climate-and-grid policy
            onto the bill, the US keeps taxes minimal, China administers a single tariff and holds households
            <em> below</em> cost by charging industry more (the exact inverse of Europe).
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[12px] font-bold text-tertiary-dark">Retail prices 2024 (€-cent/kWh, taxes included)</p>
              <div className="mt-3 space-y-3">
                {RETAIL.map((r) => (
                  <div key={r.region}>
                    <p className="mb-1 text-[11px] font-semibold text-tertiary">{r.region}</p>
                    {[
                      { l: 'household', v: r.household },
                      { l: 'industry', v: r.industry },
                    ].map((row) => (
                      <div key={row.l} className="mb-1 flex items-center gap-2">
                        <span className="w-16 text-[10px] text-tertiary">{row.l}</span>
                        <div className="h-4 rounded-r" style={{ width: `${(row.v / 40) * 100}%`, background: r.c, opacity: row.l === 'industry' ? 0.55 : 0.95 }} />
                        <span className="font-mono text-[11px] text-tertiary-dark">{fmt(row.v, 1)}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p className="mt-2 text-[10.5px] text-tertiary">
                Eurostat H2 2024 (band DC household / medium industry excl. recoverable taxes); EIA 2024 at 0.924 €/$;
                NDRC schedules at 0.128 €/CNY. Note China: industry pays MORE than households.
              </p>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[12px] font-bold text-tertiary-dark">What a household bill is made of (share of final price)</p>
              <div className="mt-3 space-y-3">
                {BILL_SPLIT.map((b) => (
                  <HBar
                    key={b.region}
                    label={b.region}
                    total={`${b.energy} / ${b.network} / ${b.taxes} %`}
                    max={100}
                    segments={[
                      { label: 'Energy & supply', value: b.energy, color: '#0065A4' },
                      { label: 'Network', value: b.network, color: '#7495B2' },
                      { label: 'Taxes & levies', value: b.taxes, color: '#FF9933' },
                    ]}
                  />
                ))}
              </div>
              <div className="mt-2">
                <Legend items={[{ label: 'Energy & supply', color: '#0065A4' }, { label: 'Network charges', color: '#7495B2' }, { label: 'Taxes & levies', color: '#FF9933' }]} />
              </div>
              <p className="mt-2 text-[10.5px] text-tertiary">
                Approximate 2024 shares. China’s “taxes” row is government funds/surcharges; its household energy share
                is priced below cost via cross-subsidy, so shares do not reflect cost causation.
              </p>
            </div>
          </div>
        </section>

        {/* 4 — diagnosis */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">4 · The diagnosis — six findings</h2>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {CAUSES.map((c) => (
              <div key={c.n} className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-primary">
                  {c.n} · {c.title}
                </p>
                <p className="mt-1.5 text-[12.5px] leading-relaxed text-tertiary">{c.body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            This is an order-of-magnitude reconstruction for method discussion, not a market study. German day-ahead
            prices stand in for “EU wholesale” (the EU-27 demand-weighted average tracks them closely, with Iberia and
            the Nordics cheaper); the US series averages heterogeneous hubs across very different market designs
            (RTO auctions vs regulated cost-of-service); the China series converts administered tariffs that are not
            price signals in the European sense; currency conversion at annual averages adds noise; retail comparisons
            ignore purchasing power and per-capita consumption. The merit-order model is a stylised single-node
            teaching tool. All figures should be re-verified against the primary sources before any external use.
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
