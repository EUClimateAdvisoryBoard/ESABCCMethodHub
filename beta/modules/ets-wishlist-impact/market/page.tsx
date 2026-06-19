'use client';

/**
 * ETS Wishlist — Market Model (beta module, subpage).
 *
 * The companion to the accounting model. Instead of adding up per-demand
 * volumes, this page SOLVES a reduced-form intertemporal equilibrium of the
 * EU ETS allowance market and compares two worlds:
 *
 *   • BASELINE  — the legislated cap (LRF 4.3% → 4.4%), the current Market
 *     Stability Reserve, no extra offsets.
 *   • WISHLIST  — a slower LRF from 2031, a weakened MSR, and admitted
 *     removal + international credits (the EPP demands that change the cap or
 *     add fungible supply).
 *
 * For each world it finds the allowance-price path and the banking trajectory
 * consistent with intertemporal arbitrage, then reads off cumulative
 * emissions. The difference is the GHG setback — derived endogenously rather
 * than assumed, and it captures a channel the accounting model cannot: a
 * looser cap lowers the carbon PRICE, so abatement falls everywhere.
 *
 * THE ECONOMICS (all cited in the methodology section)
 * ----------------------------------------------------
 *  • Hotelling (1931): a storable, scarce asset is arbitraged so its scarcity
 *    rent — here the allowance price — rises at the discount rate while a
 *    positive bank is held: P(t) = P0·(1+r)^(t−t0).
 *  • Rubin (1996) & Schennach (2000): with banking and a no-borrowing /
 *    transversality condition, the equilibrium is pinned down by the
 *    intertemporal supply = demand identity — cumulative emissions equal
 *    cumulative supply net of the terminal bank. So over the full horizon the
 *    extra emissions equal the extra effective allowance supply (this both
 *    validates and refines the accounting model).
 *  • Perino & Willner (2016) and Perino (2018): the post-2023 MSR cancels
 *    surplus allowances, so the "waterbed" is partly punctured — some extra
 *    supply is removed before it can be emitted; a weaker MSR cancels less.
 *
 * Firms abate along a convex marginal-abatement-cost curve until MAC = price.
 * We solve for the initial price P0 by bisection so the bank is just drawn
 * down to ~0 over the horizon (the transversality condition). This is a
 * reduced-form TEACHING reconstruction with perfect banking — not LIMES-EU
 * or PRIMES — so read the levels as illustrative and the baseline-vs-wishlist
 * DIFFERENCE as the point.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* ====================================================================== model */

const START = 2025;
const END = 2050;
const YEARS: number[] = Array.from({ length: END - START + 1 }, (_, i) => START + i);

function fmt(n: number, d = 0): string {
  return n.toLocaleString('en-GB', { maximumFractionDigits: d, minimumFractionDigits: d });
}

type Params = {
  /* cap & baseline LRF */
  cap2025: number; // Mt — ETS1 cap in 2025
  lrfRedEarly: number; // Mt/yr — baseline annual linear reduction 2025–2027 (4.3% ≈ 84)
  lrfRedLate: number; // Mt/yr — baseline annual linear reduction 2028+ (4.4% ≈ 86)
  bank0: number; // Mt — allowances in circulation (TNAC) at the start

  /* real-economy abatement (shared by both worlds) */
  bau2025: number; // Mt — counterfactual (no-price) covered emissions, 2025
  bau2050: number; // Mt — counterfactual emissions, 2050 (autonomous decline)
  phiMax: number; // 0..1 — max abatable share at any finite price
  pscale: number; // €/t — steepness of the convex MAC curve
  r: number; // 1/yr — intertemporal (Hotelling) discount rate
  Pceil: number; // €/t — price ceiling / backstop

  /* MSR — surplus cancellation strength (the waterbed puncture) */
  msrCancelBase: number; // 0..1 — share of the starting surplus the current MSR cancels over the period
  msrCancelWish: number; // 0..1 — share a weakened MSR cancels

  /* WISHLIST levers */
  lrfDelta3135: number; // pp — LRF slowdown 2031–2035
  lrfDeltaPost35: number; // pp/yr — additional LRF slowdown accumulating after 2035
  lrfPctLate: number; // % — baseline LRF rate the pp-slowdown is relative to (4.4)
  offsetMax: number; // Mt/yr — admitted removal + international credits by 2040
  offsetStart: number; // year offsets first admitted
};

const DEFAULTS: Params = {
  cap2025: 1320,
  lrfRedEarly: 84,
  lrfRedLate: 86,
  bank0: 1150,

  bau2025: 1230,
  bau2050: 560,
  phiMax: 0.9,
  pscale: 170,
  r: 0.05,
  Pceil: 1500,

  msrCancelBase: 0.45,
  msrCancelWish: 0.15,

  lrfDelta3135: 1.0,
  lrfDeltaPost35: 0.3,
  lrfPctLate: 4.4,
  offsetMax: 70,
  offsetStart: 2031,
};

type YearRow = { t: number; price: number; emissions: number; capBase: number; capWish: number; supply: number; bank: number };

type Run = { rows: YearRow[]; P0: number; slack: boolean; spike: boolean; cumEmissions: number; bankDepletes: number | null };

function lin(x: number, x0: number, y0: number, x1: number, y1: number) {
  return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
}

function buildModel(p: Params) {
  const bau = (t: number) => Math.max(0, lin(t, START, p.bau2025, END, p.bau2050));
  // convex MACC: abated share = phiMax · P/(P + pscale); marginal cost → ∞ as share → phiMax
  const abated = (P: number, t: number) => bau(t) * p.phiMax * (Math.max(0, P) / (Math.max(0, P) + p.pscale));

  const baseRed = (t: number) => (t <= 2027 ? p.lrfRedEarly : p.lrfRedLate);
  // Wishlist's slower LRF as a Mt/yr shortfall in the annual reduction. The
  // 2031–2035 slowdown persists; after 2035 an extra pp accumulates each year
  // ("a more moderate decline"). pp → Mt via the baseline rate.
  const foregone = (t: number) => {
    if (t < 2031) return 0;
    const pp = p.lrfDelta3135 + (t > 2035 ? (t - 2035) * p.lrfDeltaPost35 : 0);
    return (baseRed(t) * pp) / p.lrfPctLate;
  };
  // cap path — reduction is floored at 0 so the cap can never rise
  const caps = (wishlist: boolean): number[] => {
    const out: number[] = [];
    let cap = p.cap2025;
    for (const t of YEARS) {
      if (t > START) cap = Math.max(0, cap - Math.max(0, baseRed(t) - (wishlist ? foregone(t) : 0)));
      out.push(cap);
    }
    return out;
  };
  const capBaseArr = caps(false);
  const capWishArr = caps(true);

  const offsets = (t: number, wishlist: boolean) =>
    !wishlist || t < p.offsetStart ? 0 : p.offsetMax * Math.min(1, (t - p.offsetStart) / Math.max(1, 2040 - p.offsetStart));

  // The MSR cancels a fixed share of the starting surplus over the period
  // (price-independent and bounded — calibrated to the real ~400–600 Mt of
  // cumulative invalidation, e.g. the 381 Mt cancelled in 2024).
  const cancellation = (wishlist: boolean) => (wishlist ? p.msrCancelWish : p.msrCancelBase) * p.bank0;

  const simulate = (P0: number, wishlist: boolean) => {
    const cap = wishlist ? capWishArr : capBaseArr;
    let bank = p.bank0 - cancellation(wishlist);
    let cumE = 0;
    const rows: YearRow[] = [];
    YEARS.forEach((t, i) => {
      const price = Math.min(p.Pceil, P0 * Math.pow(1 + p.r, t - START));
      const e = Math.max(0, bau(t) - abated(price, t));
      const supply = cap[i] + offsets(t, wishlist);
      bank += supply - e;
      cumE += e;
      rows.push({ t, price, emissions: e, capBase: capBaseArr[i], capWish: capWishArr[i], supply, bank: Math.max(0, bank) });
    });
    return { rows, bankEnd: bank, cumE };
  };

  // Solve P0 so the terminal bank ≈ 0 (transversality). bankEnd is increasing
  // in P0 (higher price → more abatement → larger leftover). If even the
  // lowest price leaves a positive bank, the market is slack → price floor.
  const run = (wishlist: boolean): Run => {
    let lo = 1, hi = p.Pceil;
    const f = (P0: number) => simulate(P0, wishlist).bankEnd;
    const slack = f(1) > 0;
    const spike = f(p.Pceil) < 0;
    for (let k = 0; k < 90; k++) {
      const mid = (lo + hi) / 2;
      if (f(mid) > 0) hi = mid; else lo = mid;
    }
    const P0 = slack ? 1 : (lo + hi) / 2;
    const sim = simulate(P0, wishlist);
    return { rows: sim.rows, P0, slack, spike, cumEmissions: sim.cumE, bankDepletes: sim.rows.find((r) => r.bank <= 1)?.t ?? null };
  };

  // price-independent decomposition of the extra EFFECTIVE supply (= the
  // full-horizon extra emissions, by the banking identity)
  const decomposition = () => {
    const dCap = YEARS.reduce((s, _t, i) => s + (capWishArr[i] - capBaseArr[i]), 0);
    const dOff = YEARS.reduce((s, t) => s + offsets(t, true), 0);
    const dMSR = cancellation(false) - cancellation(true);
    return { dCap, dOff, dMSR, total: dCap + dOff + dMSR };
  };

  return { run, decomposition };
}

const priceAt = (run: Run, y: number) => run.rows.find((r) => r.t === y)!.price;
const cumTo = (run: Run, y: number) => run.rows.filter((r) => r.t <= y).reduce((s, r) => s + r.emissions, 0);

/* ====================================================================== scenarios */

type Scenario = { id: string; label: string; blurb: string; over: Partial<Params> };

const SCENARIOS: Scenario[] = [
  { id: 'central', label: 'Central', blurb: 'A 1 pp LRF slowdown then a moderate post-2035 decline, a noticeably weaker MSR and ~70 Mt/yr of admitted credits by 2040. The carbon price erodes by roughly half — but does not collapse. Baseline calibrated to ≈ €130/t in 2025.', over: { ...DEFAULTS } },
  { id: 'mild', label: 'Mild wishlist', blurb: 'The gentlest reading: a 1 pp slowdown only, an MSR only modestly weakened, and small offset inflows. The price gap and the extra emissions stay limited.', over: { lrfDeltaPost35: 0.2, msrCancelWish: 0.32, offsetMax: 45 } },
  { id: 'strong', label: 'Strong wishlist', blurb: 'A deeper, longer LRF slowdown, an MSR that barely cancels, and large credit inflows re-create the oversupply that crashed the ETS price into single digits in the mid-2010s — abatement stalls and the bank lasts for years.', over: { lrfDelta3135: 1.5, lrfDeltaPost35: 0.6, msrCancelWish: 0.05, offsetMax: 150 } },
  { id: 'tight', label: 'Hard-to-abate world', blurb: 'A steeper MAC curve and a lower abatement ceiling: prices are higher and the wishlist’s extra supply translates almost fully into emissions rather than into a price drop.', over: { pscale: 320, phiMax: 0.78 } },
];

/* ====================================================================== UI */

function Slider(props: {
  label: string; hint?: string; value: number; min: number; max: number; step: number;
  unit?: string; std?: number; display?: (v: number) => string; onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, display, onChange } = props;
  const fmtVal = (v: number) => (display ? display(v) : fmt(v, step < 1 ? 2 : 0));
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmtVal(value)}{unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
        {stdPct !== null && <span aria-hidden className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50" style={{ left: `calc(${stdPct}% )` }} />}
      </div>
      {hint ? <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{hint}</p> : null}
    </label>
  );
}

function ControlGroup({ title, accent, children }: { title: string; accent?: boolean; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border p-4 ${accent ? 'border-primary/40 bg-surface-blue' : 'border-grey-200 bg-white'}`}>
      <h3 className={`mb-3 text-[11px] font-bold uppercase tracking-[0.1em] ${accent ? 'text-primary' : 'text-tertiary'}`}>{title}</h3>
      <div className="space-y-3.5">{children}</div>
    </div>
  );
}

type Series = { label: string; color: string; dash?: boolean; pts: number[] };

function LineChart({ years, series, yLabel }: { years: number[]; series: Series[]; yLabel: string }) {
  const W = 760, H = 250;
  const m = { l: 52, r: 14, t: 14, b: 26 };
  const iw = W - m.l - m.r, ih = H - m.t - m.b;
  const yMax = Math.max(1, ...series.flatMap((s) => s.pts));
  const sx = (i: number) => m.l + (i / (years.length - 1)) * iw;
  const sy = (v: number) => m.t + ih - (v / yMax) * ih;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel}>
      {Array.from({ length: 5 }, (_, i) => {
        const v = (yMax * i) / 4; const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="#E6E7E8" strokeWidth={1} />
            <text x={m.l - 6} y={y + 3} textAnchor="end" fontSize={9} className="fill-grey-500 tabular-nums">{fmt(v)}</text>
          </g>
        );
      })}
      {years.map((yr, i) => (yr % 5 === 0 ? <text key={yr} x={sx(i)} y={H - 8} textAnchor="middle" fontSize={9} className="fill-grey-500">{yr}</text> : null))}
      {series.map((s) => (
        <path key={s.label} d={s.pts.map((v, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(v).toFixed(1)}`).join(' ')}
          fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dash ? '5 4' : undefined} />
      ))}
      <text x={m.l} y={m.t - 3} fontSize={9} className="fill-grey-500">{yLabel}</text>
    </svg>
  );
}

function Legend({ series }: { series: Series[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
      {series.map((s) => (
        <span key={s.label} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
          <span className="inline-block h-0.5 w-4" style={{ background: s.color, borderTop: s.dash ? `2px dashed ${s.color}` : undefined }} />
          {s.label}
        </span>
      ))}
    </div>
  );
}

function Stat({ h, v, sub, accent }: { h: string; v: string; sub: string; accent?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-white p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">{h}</p>
      <p className="mt-0.5 font-mono text-lg font-bold tabular-nums" style={{ color: accent ?? '#2E3E4C' }}>{v}</p>
      <p className="text-[10px] leading-snug text-tertiary">{sub}</p>
    </div>
  );
}

/* ====================================================================== page */

export default function EtsWishlistMarketPage() {
  const [p, setP] = useState<Params>(DEFAULTS);
  const [active, setActive] = useState<string>('central');
  const [horizon, setHorizon] = useState<number>(2050);

  const set = <K extends keyof Params>(k: K, v: Params[K]) => { setP((prev) => ({ ...prev, [k]: v })); setActive('custom'); };
  const apply = (s: Scenario) => { setP({ ...DEFAULTS, ...s.over }); setActive(s.id); };

  const model = useMemo(() => buildModel(p), [p]);
  const base = useMemo(() => model.run(false), [model]);
  const wish = useMemo(() => model.run(true), [model]);
  const decomp = useMemo(() => model.decomposition(), [model]);

  const setback = cumTo(wish, horizon) - cumTo(base, horizon);
  const priceDrop2040 = priceAt(base, 2040) - priceAt(wish, 2040);
  const yearsLost = setback / 130;
  const budgetPct = (setback / 12500) * 100;

  const priceSeries: Series[] = [
    { label: 'Baseline price', color: '#004B7F', pts: base.rows.map((r) => r.price) },
    { label: 'Wishlist price', color: '#B83230', dash: true, pts: wish.rows.map((r) => r.price) },
  ];
  const emSeries: Series[] = [
    { label: 'Baseline emissions', color: '#004B7F', pts: base.rows.map((r) => r.emissions) },
    { label: 'Wishlist emissions', color: '#B83230', dash: true, pts: wish.rows.map((r) => r.emissions) },
    { label: 'Baseline cap', color: '#7495B2', pts: base.rows.map((r) => r.capBase) },
    { label: 'Wishlist cap', color: '#FF9933', pts: wish.rows.map((r) => r.capWish) },
  ];
  const bankSeries: Series[] = [
    { label: 'Baseline bank (TNAC)', color: '#004B7F', pts: base.rows.map((r) => r.bank) },
    { label: 'Wishlist bank (TNAC)', color: '#B83230', dash: true, pts: wish.rows.map((r) => r.bank) },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-6">
          <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            <span>Beta module · ETS policy · intertemporal market model</span>
            <span className="rounded-full bg-surface-yellow px-2 py-0.5 text-[10px] font-bold text-tertiary-dark">BETA</span>
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">The ETS Wishlist — solving the market</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            The accounting model adds up volumes. This one <strong>solves</strong>: it finds the allowance-price path and
            banking trajectory that satisfy intertemporal arbitrage, for the <strong>legislated</strong> cap and for the
            <strong> wishlist</strong> cap (slower LRF + weaker MSR + admitted credits), then reads off cumulative
            emissions in each. The gap is the GHG setback — and it captures what a volume count cannot: a looser cap
            lowers the <em>carbon price</em>, so abatement weakens across the whole economy, not just where the extra
            allowances land.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/beta/ets-wishlist-impact" className="inline-flex items-center rounded-md border border-secondary-light px-3 py-1.5 text-[12px] font-semibold text-secondary hover:bg-surface-teal">← Accounting model (per-demand volumes)</Link>
            <span className="inline-flex items-center rounded-md bg-secondary-light px-3 py-1.5 text-[12px] font-semibold text-white">Market model (this page)</span>
          </div>
        </section>

        {/* headline */}
        <section className="mb-6 rounded-xl border border-accent-red/30 bg-surface-blue p-5">
          <div className="grid gap-5 sm:grid-cols-[auto,1fr] sm:items-center">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Extra cumulative emissions to {horizon}</p>
              <p className="mt-1 font-mono text-4xl font-bold tabular-nums text-accent-red sm:text-5xl">+{fmt(setback)} <span className="text-2xl">Mt CO₂e</span></p>
              <p className="mt-1 text-[12px] text-tertiary">wishlist minus baseline, solved endogenously{base.spike || wish.spike ? ' · price hit the ceiling (endgame)' : ''}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              <Stat h="Carbon-price drop, 2040" accent="#B83230" v={`−€${fmt(priceDrop2040)}`} sub={`€${fmt(priceAt(base, 2040))} → €${fmt(priceAt(wish, 2040))}/t`} />
              <Stat h="Bank depletes (base → wish)" v={`${base.bankDepletes ?? '>2050'} → ${wish.bankDepletes ?? '>2050'}`} sub="a longer-lived bank is extra emissions" />
              <Stat h="≈ Years of EU progress" v={`${fmt(yearsLost, 1)} yr`} sub={`≈ ${fmt(budgetPct, 1)}% of the 2030–50 budget`} />
              <Stat h="Of which (to 2050)" v={`${fmt(decomp.total)} Mt`} sub={`LRF ${fmt(decomp.dCap)} · credits ${fmt(decomp.dOff)} · MSR ${fmt(decomp.dMSR)}`} />
            </div>
          </div>
          <p className="mt-3 text-[11px] leading-relaxed text-tertiary">
            By the banking identity, the <strong>full-horizon</strong> extra emissions equal the extra <em>effective</em>
            {' '}allowance supply (the decomposition above) — this is the robust number and it reconciles with the
            accounting model. Figures for earlier years are larger relative to supply because the lower price brings
            abatement <em>forward</em>: emissions rise now and the bank is drawn down faster.
          </p>
        </section>

        {/* scenarios + horizon */}
        <section className="mb-6 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Scenario</p>
            <div className="flex flex-wrap gap-2">
              {SCENARIOS.map((s) => (
                <button key={s.id} onClick={() => apply(s)} className={`rounded-full border px-3 py-1.5 text-[12px] font-semibold transition-colors ${active === s.id ? 'border-primary bg-primary text-white' : 'border-grey-300 bg-white text-tertiary-dark hover:border-primary hover:text-primary'}`}>{s.label}</button>
              ))}
              {active === 'custom' && <span className="inline-flex items-center rounded-full border border-dashed border-grey-400 px-3 py-1.5 text-[12px] font-semibold text-tertiary">Custom</span>}
            </div>
          </div>
          <div>
            <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary">Sum emissions to</p>
            <div className="flex gap-2">
              {[2035, 2040, 2050].map((y) => (
                <button key={y} onClick={() => setHorizon(y)} className={`rounded-md border px-3 py-1.5 text-[12px] font-semibold transition-colors ${horizon === y ? 'border-secondary-light bg-secondary-light text-white' : 'border-grey-300 bg-white text-tertiary-dark hover:border-secondary-light'}`}>{y}</button>
              ))}
            </div>
          </div>
        </section>
        <p className="-mt-3 mb-6 max-w-3xl text-[11.5px] leading-relaxed text-tertiary">{SCENARIOS.find((s) => s.id === active)?.blurb ?? 'Custom assumptions — pick a scenario to return to a calibrated starting point.'}</p>

        {/* charts */}
        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <h2 className="text-[13px] font-bold text-tertiary-dark">Allowance price path</h2>
            <p className="mb-1 text-[11px] text-tertiary">The wishlist loosens supply, so the equilibrium price falls — a weaker abatement incentive everywhere.</p>
            <LineChart years={YEARS} series={priceSeries} yLabel="€ / tCO₂e" />
            <Legend series={priceSeries} />
          </div>
          <div className="rounded-lg border border-grey-200 bg-white p-4">
            <h2 className="text-[13px] font-bold text-tertiary-dark">Covered emissions vs the cap</h2>
            <p className="mb-1 text-[11px] text-tertiary">The wishlist cap (orange) stays well above the baseline cap (which nears zero by ~2040); emissions follow.</p>
            <LineChart years={YEARS} series={emSeries} yLabel="Mt CO₂e / yr" />
            <Legend series={emSeries} />
          </div>
          <div className="rounded-lg border border-grey-200 bg-white p-4 lg:col-span-2">
            <h2 className="text-[13px] font-bold text-tertiary-dark">The bank (allowances in circulation, TNAC)</h2>
            <p className="mb-1 text-[11px] text-tertiary">
              A slower LRF and admitted credits keep the bank alive longer
              ({wish.bankDepletes ? `wishlist bank ≈ 0 by ${wish.bankDepletes}` : 'wishlist bank still positive at 2050'};
              {base.bankDepletes ? ` baseline by ${base.bankDepletes}` : ' baseline still positive at 2050'}). A higher, longer-lived bank is exactly extra cumulative emissions.
            </p>
            <LineChart years={YEARS} series={bankSeries} yLabel="Mt CO₂e" />
            <Legend series={bankSeries} />
          </div>
        </section>

        {/* controls */}
        <section className="mb-8 grid gap-4 lg:grid-cols-3">
          <ControlGroup title="Wishlist levers" accent>
            <Slider label="LRF slowdown 2031–2035" unit="pp" value={p.lrfDelta3135} min={0} max={2} step={0.1} std={DEFAULTS.lrfDelta3135} onChange={(v) => set('lrfDelta3135', v)} hint="≈19.5 Mt/yr of cap per pp." />
            <Slider label="LRF slowdown after 2035" unit="pp/yr" value={p.lrfDeltaPost35} min={0} max={1} step={0.05} std={DEFAULTS.lrfDeltaPost35} onChange={(v) => set('lrfDeltaPost35', v)} hint="Extra slowdown accumulating each year." />
            <Slider label="Admitted credits by 2040" unit="Mt/yr" value={p.offsetMax} min={0} max={250} step={10} std={DEFAULTS.offsetMax} onChange={(v) => set('offsetMax', v)} hint="CDR + international credits added as supply." />
            <Slider label="Weakened-MSR cancellation" value={p.msrCancelWish} min={0} max={0.6} step={0.05} std={DEFAULTS.msrCancelWish} display={(v) => `${fmt(v * 100)}%`} onChange={(v) => set('msrCancelWish', v)} hint="Share of the starting surplus the reformed MSR still cancels." />
          </ControlGroup>
          <ControlGroup title="Cap, MSR & market">
            <Slider label="ETS1 cap, 2025" unit="Mt" value={p.cap2025} min={1100} max={1450} step={10} std={DEFAULTS.cap2025} onChange={(v) => set('cap2025', v)} />
            <Slider label="Baseline reduction 2028+" unit="Mt/yr" value={p.lrfRedLate} min={70} max={100} step={1} std={DEFAULTS.lrfRedLate} onChange={(v) => set('lrfRedLate', v)} hint="4.4% of the 2008–2012 base ≈ 86 Mt." />
            <Slider label="Starting bank (TNAC)" unit="Mt" value={p.bank0} min={600} max={1600} step={50} std={DEFAULTS.bank0} onChange={(v) => set('bank0', v)} />
            <Slider label="Baseline MSR cancellation" value={p.msrCancelBase} min={0} max={0.8} step={0.05} std={DEFAULTS.msrCancelBase} display={(v) => `${fmt(v * 100)}%`} onChange={(v) => set('msrCancelBase', v)} hint="Share of the starting surplus the current MSR cancels." />
          </ControlGroup>
          <ControlGroup title="Abatement economics">
            <Slider label="Counterfactual emissions 2025" unit="Mt" value={p.bau2025} min={1100} max={1500} step={10} std={DEFAULTS.bau2025} onChange={(v) => set('bau2025', v)} />
            <Slider label="MAC curve steepness" unit="€/t" value={p.pscale} min={80} max={400} step={10} std={DEFAULTS.pscale} onChange={(v) => set('pscale', v)} hint="Higher = abatement is dearer → higher price, fuller pass-through." />
            <Slider label="Max abatable share" value={p.phiMax} min={0.6} max={0.95} step={0.01} std={DEFAULTS.phiMax} display={(v) => `${fmt(v * 100)}%`} onChange={(v) => set('phiMax', v)} />
            <Slider label="Discount / Hotelling rate" value={p.r} min={0.02} max={0.09} step={0.005} std={DEFAULTS.r} display={(v) => `${fmt(v * 100, 1)}%`} onChange={(v) => set('r', v)} />
          </ControlGroup>
        </section>

        {/* methodology */}
        <section className="mb-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
            <p className="mb-2 text-[12px] font-bold text-tertiary-dark">How the model is solved</p>
            <ol className="list-decimal space-y-1.5 pl-4 text-[11.5px] leading-relaxed text-tertiary">
              <li>Firms abate along a convex MAC curve until marginal cost = price: <span className="font-mono">a(t) = φ·BAU·P/(P+k)</span>.</li>
              <li>While a positive bank is held, no-arbitrage forces the price to rise at the discount rate (Hotelling): <span className="font-mono">P(t) = P₀(1+r)^(t−2025)</span>.</li>
              <li>The bank updates each year: <span className="font-mono">B(t) = B(t−1) + cap + credits − emissions</span>. The MSR removes a fixed share of the starting surplus (the waterbed puncture); a weaker MSR removes less.</li>
              <li>We bisect on the single unknown P₀ until the bank is just drawn to ~0 over the horizon — the transversality / no-borrowing condition (Rubin 1996; Schennach 2000). If even the lowest price leaves a surplus, the market is slack and the price falls to the floor.</li>
              <li>Cumulative emissions follow; baseline vs wishlist gives the setback, which over the full horizon equals the extra effective supply — decomposed into the LRF, credits and MSR terms shown above.</li>
            </ol>
          </div>
          <div className="rounded-lg border border-grey-200 bg-grey-50 p-4">
            <p className="mb-2 text-[12px] font-bold text-tertiary-dark">Methodology papers &amp; honest limits</p>
            <ul className="space-y-1.5 text-[11.5px] leading-relaxed text-tertiary">
              {[
                ['Hotelling (1931) — The Economics of Exhaustible Resources (JPE)', 'https://www.jstor.org/stable/1822328'],
                ['Rubin (1996) — Intertemporal emission trading, banking & borrowing (JEEM)', 'https://doi.org/10.1006/jeem.1996.0044'],
                ['Schennach (2000) — Economics of permit banking under Title IV (JEEM)', 'https://doi.org/10.1006/jeem.1999.1119'],
                ['Perino & Willner (2016) — Procrastinating reform: the MSR (JEEM)', 'https://doi.org/10.1016/j.jeem.2016.08.004'],
                ['Perino (2018) — Phase-4 rules temporarily puncture the waterbed (NCC)', 'https://www.nature.com/articles/s41558-018-0120-2'],
                ['Quemin & Pahle (2023) — Financials & the functioning of emissions markets (NCC)', 'https://doi.org/10.1038/s41558-023-01691-8'],
                ['Sultani et al. (2026) — Sequencing CDR into the EU ETS (Joule)', 'https://www.cell.com/joule/fulltext/S2542-4351(26)00079-6'],
                ['Dir. (EU) 2023/959 & Dec. (EU) 2015/1814 — cap, LRF, MSR', 'https://eur-lex.europa.eu/eli/dir/2023/959/oj'],
              ].map(([label, url]) => (
                <li key={url}><a href={url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{label} ↗</a></li>
              ))}
            </ul>
            <p className="mt-2 text-[10.5px] leading-snug text-tertiary">
              Reduced-form teaching model with perfect foresight, perfect banking and a single representative MAC curve —
              not LIMES-EU or PRIMES. It abstracts from risk, myopia, free-allocation detail and sectoral structure, and
              (like its published cousins) allows smooth banking rather than a hard no-borrowing kink, so interim-year
              figures overstate front-loading. Defaults are calibrated to a ≈ €130/t (2025) baseline price; treat levels
              as illustrative and the baseline-vs-wishlist difference as the point. See also the sibling{' '}
              <Link href="/beta/ets-cdr-price" className="text-primary hover:underline">ETS Endgame &amp; CDR Safety Valve</Link>.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
