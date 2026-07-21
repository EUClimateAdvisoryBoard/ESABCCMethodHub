'use client';

/**
 * ETS Review — 46% Electrification (beta module).
 *
 * The interactive companion to the ETS Review analysis (ets-review/ in the
 * repo, and the /docs note). It answers the Board's cost question — what carbon
 * price is needed to reach a given EU electrification rate in 2040, with and
 * without demand-side measures — with a stylised LEAST-COST model you can drive.
 *
 * The model (ported from ets-review/model/electrification_lcm.py, kept in exact
 * numerical parity): final energy in the three electrifiable end-use sectors
 * (buildings heat, road transport, industry heat) is split into adoption
 * tranches ordered by their barrier-adjusted marginal abatement cost. For a
 * uniform carbon price P the model electrifies every tranche whose switching
 * cost sits below P — the merit-order optimum of a separable per-tranche cost
 * minimisation, so the argmin per tranche IS the LP solution. Sweeping P traces
 * the electrification supply curve and the price that reaches the target, for a
 * price-only path vs a demand-side package. Default run reproduces the note:
 * ~€166/t price-only, ~€55/t with measures, €111/t gap.
 *
 * Stylised policy-analysis model — NOT PyPSA-Eur, no hourly dispatch, ETS1+ETS2
 * collapsed to one price. Treat the gap and the ordering as robust and absolute
 * price levels as indicative. For a full power-system solve see pypsa-service/.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* --------------------------------------------------------------- palette */
// Two series, natural polarity, CVD-validated on white:
const C_ONLY = '#B83230'; // price-only — the costly path (accent-red)
const C_MEAS = '#0D9488'; // with demand-side measures — the efficient path (teal)
const C_NAVY = '#2E3E4C';

/* ----------------------------------------------------------------- model */
type Sector = 'buildings' | 'transport' | 'industry';
const SECTORS: Sector[] = ['buildings', 'transport', 'industry'];

interface Assumptions {
  target: number;
  baseline: number;
  barrierMult: number;
  reform: number;
  strength: Record<Sector, number>; // 0..100
}

const DEFAULTS: Assumptions = {
  target: 46,
  baseline: 26,
  barrierMult: 1.0,
  reform: 28,
  strength: { buildings: 65, transport: 70, industry: 55 },
};

// Fixed model constants (mirror the Python reference).
const POTENTIAL: Record<Sector, number> = { buildings: 14, transport: 13, industry: 7 };
const BASE_C: Record<Sector, number> = { buildings: 40, transport: 28, industry: 62 };
const SPREAD: Record<Sector, number> = { buildings: 385, transport: 265, industry: 300 };
const GAMMA: Record<Sector, number> = { buildings: 1.7, transport: 1.6, industry: 1.9 };
const N = 40;
const PMAX = 500;
const FE_TWH = 8100;
const MT_PP = 43.5;

interface Tranche { sector: Sector; size: number; c: number }

function buildTranches(a: Assumptions, withMeasures: boolean): Tranche[] {
  const out: Tranche[] = [];
  for (const s of SECTORS) {
    const size = POTENTIAL[s] / N;
    let spread = SPREAD[s] * a.barrierMult;
    let base = BASE_C[s];
    if (withMeasures) {
      spread *= 1 - a.strength[s] / 100;
      base -= a.reform;
    }
    for (let i = 0; i < N; i++) {
      const f = (i + 0.5) / N;
      out.push({ sector: s, size, c: base + spread * Math.pow(f, GAMMA[s]) });
    }
  }
  out.sort((x, y) => x.c - y.c);
  return out;
}
function rateAt(tr: Tranche[], baseline: number, price: number): number {
  let r = baseline;
  for (const t of tr) if (t.c <= price) r += t.size;
  return r;
}
function priceForTarget(tr: Tranche[], baseline: number, target: number): number | null {
  for (let p = 0; p <= PMAX; p += 1) if (rateAt(tr, baseline, p) >= target) return p;
  return null;
}
function breakdown(tr: Tranche[], price: number): Record<Sector, number> {
  const by: Record<Sector, number> = { buildings: 0, transport: 0, industry: 0 };
  for (const t of tr) if (t.c <= price) by[t.sector] += t.size;
  return by;
}

const fmt = (v: number) => (Math.abs(v) >= 100 ? Math.round(v).toString() : v.toFixed(v % 1 ? 2 : 0));
// Deterministic thousands separator (avoids locale-dependent hydration mismatch).
const thou = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/* ------------------------------------------------------------- Slider UI */
function Slider(props: {
  label: string; hint?: string; value: number; min: number; max: number;
  step: number; unit?: string; std?: number; onChange: (v: number) => void;
}) {
  const { label, hint, value, min, max, step, unit, std, onChange } = props;
  const modified = std !== undefined && Math.abs(value - std) > step / 2;
  const stdPct = std !== undefined ? ((std - min) / (max - min)) * 100 : null;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">{label}</span>
        <span className={`font-mono text-[12px] tabular-nums ${modified ? 'text-accent-orange' : 'text-primary'}`}>
          {fmt(value)}{unit ? <span className="text-tertiary"> {unit}</span> : null}
        </span>
      </div>
      <div className="relative mt-1.5">
        <input type="range" min={min} max={max} step={step} value={value}
          onChange={(e) => onChange(Number(e.target.value))} className="w-full accent-primary" />
        {stdPct !== null && (
          <span aria-hidden title={`Preset: ${fmt(std!)}`}
            className="pointer-events-none absolute -bottom-0.5 h-2 w-px bg-tertiary/50"
            style={{ left: `calc(${stdPct}%)` }} />
        )}
      </div>
      <div className="mt-0.5 flex items-start justify-between gap-2">
        {hint ? <p className="text-[10.5px] leading-snug text-tertiary">{hint}</p> : <span />}
        {std !== undefined && modified && (
          <button type="button" onClick={() => onChange(std)}
            className="shrink-0 whitespace-nowrap text-[10px] font-semibold text-accent-orange hover:underline">
            ↺ preset {fmt(std)}
          </button>
        )}
      </div>
    </label>
  );
}

/* -------------------------------------------------------- Supply-curve SVG */
function SupplyCurveChart({ trOnly, trMeas, baseline, target, pOnly, pMeas }: {
  trOnly: Tranche[]; trMeas: Tranche[]; baseline: number; target: number;
  pOnly: number | null; pMeas: number | null;
}) {
  const W = 720, H = 380, M = { l: 52, r: 18, t: 18, b: 44 };
  const PX = W - M.l - M.r, PY = H - M.t - M.b, YMAX = 66;
  const xPx = (p: number) => M.l + (p / PMAX) * PX;
  const yPx = (r: number) => M.t + (1 - r / YMAX) * PY;
  const path = (tr: Tranche[]) => {
    let d = '';
    for (let p = 0; p <= PMAX; p += 2) d += (p === 0 ? 'M' : 'L') + xPx(p).toFixed(1) + ' ' + yPx(rateAt(tr, baseline, p)).toFixed(1);
    return d;
  };
  const yTicks = [0, 15, 30, 45, 60];
  const xTicks = [0, 100, 200, 300, 400, 500];
  const marker = (p: number | null, color: string, below: boolean) => {
    if (p == null) return null;
    const x = xPx(p), y = yPx(target);
    return (
      <g key={color}>
        <line x1={x} y1={y} x2={x} y2={M.t + PY} stroke={color} strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
        <circle cx={x} cy={y} r={5.5} fill={color} stroke="white" strokeWidth={2} />
        <text x={x} y={M.t + PY + (below ? -8 : -22)} textAnchor="middle" className="font-mono" fontSize={12} fontWeight={700} fill={color}>€{p}</text>
      </g>
    );
  };
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Electrification rate versus carbon price, price-only vs with demand-side measures">
      {yTicks.map((r) => (
        <g key={r}>
          <line x1={M.l} y1={yPx(r)} x2={W - M.r} y2={yPx(r)} stroke="#eef3f2" strokeWidth={1} />
          <text x={M.l - 8} y={yPx(r) + 3} textAnchor="end" fontSize={11} fill="#8fa1a0" className="tabular-nums">{r}%</text>
        </g>
      ))}
      {xTicks.map((p) => (
        <text key={p} x={xPx(p)} y={H - M.b + 16} textAnchor="middle" fontSize={11} fill="#8fa1a0" className="tabular-nums">{p}</text>
      ))}
      <text x={M.l + PX / 2} y={H - 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="#5d6f6e">Carbon price €/tCO₂ (ETS1+ETS2)</text>
      <text transform={`translate(14 ${M.t + PY / 2}) rotate(-90)`} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="#5d6f6e">Electrification rate</text>
      {/* trigger + target reference lines */}
      <line x1={xPx(45)} y1={M.t} x2={xPx(45)} y2={M.t + PY} stroke="#9aa7a6" strokeWidth={1.5} strokeDasharray="5 4" />
      <text x={xPx(45) + 4} y={M.t + 11} fontSize={10.5} fill="#5d6f6e">€45 trigger</text>
      <line x1={M.l} y1={yPx(target)} x2={W - M.r} y2={yPx(target)} stroke={C_NAVY} strokeWidth={1.5} strokeDasharray="2 4" />
      <text x={W - M.r} y={yPx(target) - 5} textAnchor="end" fontSize={10.5} fill="#5d6f6e">target {target}%</text>
      {/* series */}
      <path d={path(trOnly)} fill="none" stroke={C_ONLY} strokeWidth={2.5} />
      <path d={path(trMeas)} fill="none" stroke={C_MEAS} strokeWidth={2.5} />
      {marker(pMeas, C_MEAS, false)}
      {marker(pOnly, C_ONLY, true)}
    </svg>
  );
}

/* ------------------------------------------------------------------ page */
export default function EtsReviewModule() {
  const [a, setA] = useState<Assumptions>(DEFAULTS);
  const set = (patch: Partial<Assumptions>) => setA((prev) => ({ ...prev, ...patch }));
  const setStrength = (s: Sector, v: number) => setA((prev) => ({ ...prev, strength: { ...prev.strength, [s]: v } }));

  const m = useMemo(() => {
    const trOnly = buildTranches(a, false);
    const trMeas = buildTranches(a, true);
    const pOnly = priceForTarget(trOnly, a.baseline, a.target);
    const pMeas = priceForTarget(trMeas, a.baseline, a.target);
    const gap = pOnly != null && pMeas != null ? Math.round(pOnly - pMeas) : null;
    const addedPP = a.target - a.baseline;
    return {
      trOnly, trMeas, pOnly, pMeas, gap, addedPP,
      twh: Math.round((FE_TWH * addedPP) / 100),
      mt: Math.round(addedPP * MT_PP),
      bOnly: breakdown(trOnly, pOnly ?? PMAX),
      bMeas: breakdown(trMeas, pMeas ?? PMAX),
    };
  }, [a]);

  const cards: { k: string; v: string; u: string; c: string }[] = [
    { k: 'Price only', v: m.pOnly != null ? `€${m.pOnly}` : '—', u: '/t', c: C_ONLY },
    { k: 'With measures', v: m.pMeas != null ? `€${m.pMeas}` : '—', u: '/t', c: C_MEAS },
    { k: 'Shadow value (gap)', v: m.gap != null ? `€${m.gap}` : '—', u: '/t', c: C_NAVY },
    { k: 'Price-only vs trigger', v: m.pOnly != null ? (m.pOnly / 45).toFixed(1) : '—', u: '× €45', c: C_NAVY },
  ];

  const maxPot = Math.max(...Object.values(POTENTIAL));

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 37 · <a href="/beta/ets-review" className="underline hover:text-primary">ETS Review</a> · Electrification submodule · least-cost model
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            ETS Review — what does 46% electrification cost?
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            The Commission's <strong>Electrification Action Plan</strong> (17 July 2026) sets an indicative
            target of a <strong>46% electricity share of final energy by 2040</strong> — double today's stalled
            ~23%. This module drives the cost question with a stylised <strong>least-cost model</strong>: the carbon
            price needed to reach the target on a <strong>price-only</strong> path versus with a
            <strong> demand-side package</strong>. The gap between the two is the <em>shadow value of demand-side
            policy</em>. Move the sliders to test the assumptions.
          </p>
          <a href="/beta/ets-review/reform"
            className="mt-3 inline-flex items-center gap-2 rounded-md border border-grey-200 bg-white px-3 py-1.5 text-[12px] font-semibold text-tertiary-dark hover:border-primary hover:text-primary">
            Companion submodule — the ETS reform itself
            <span aria-hidden className="text-tertiary">what&apos;s proposed · links to the communication · uncertainty register →</span>
          </a>
        </section>

        {/* headline result cards */}
        <section className="mb-8 grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cards.map((k) => (
            <div key={k.k} className="rounded-lg border border-grey-200 bg-white p-3">
              <p className="flex items-center gap-1.5 text-[11px] text-tertiary">
                <span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: k.c }} />{k.k}
              </p>
              <p className="mt-1 font-mono text-xl font-bold tabular-nums" style={{ color: k.c }}>
                {k.v}<span className="text-[11px] font-normal text-tertiary"> {k.u}</span>
              </p>
            </div>
          ))}
        </section>

        {/* interactive model */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">The least-cost model</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            End-use demand is split into adoption tranches ordered by barrier-adjusted marginal abatement cost;
            at a uniform carbon price the model electrifies every tranche priced below it (the merit-order optimum).
            The price-only curve reaches 46% only far above the <strong>€45/t ETS2 price-stability trigger</strong> —
            which the ETS2 releases allowances to defend — so a price-only path is not just costly but foreclosed by
            design.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[320px_1fr]">
            {/* controls */}
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">Assumptions</p>
              <div className="space-y-3.5">
                <Slider label="Electrification target (2040)" hint="Action Plan indicative target: 46%" value={a.target} min={40} max={60} step={1} unit="%" std={46} onChange={(v) => set({ target: v })} />
                <Slider label="Baseline rate, no new policy" hint="Autonomous 2040 electrification" value={a.baseline} min={20} max={32} step={1} unit="%" std={26} onChange={(v) => set({ baseline: v })} />
                <Slider label="Barrier-cost multiplier" hint="Uncertainty band on hidden costs (±25%)" value={a.barrierMult} min={0.6} max={1.6} step={0.05} unit="×" std={1} onChange={(v) => set({ barrierMult: v })} />
                <div className="border-t border-grey-200 pt-3">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: C_MEAS }}>Demand-side package</p>
                  <div className="space-y-3.5">
                    <Slider label="Electricity-price reform" hint="Lowers electricity/gas running-cost ratio (Pillar 1)" value={a.reform} min={0} max={60} step={1} unit="€/t" std={28} onChange={(v) => set({ reform: v })} />
                    <Slider label="Buildings measures" hint="Boiler phase-out, retrofit support, Social Climate Fund" value={a.strength.buildings} min={0} max={100} step={5} unit="%" std={65} onChange={(v) => setStrength('buildings', v)} />
                    <Slider label="Transport measures" hint="Vehicle CO₂ standards, AFIR charging" value={a.strength.transport} min={0} max={100} step={5} unit="%" std={70} onChange={(v) => setStrength('transport', v)} />
                    <Slider label="Industry measures" hint="CCfDs for electrified heat, fast grid connections" value={a.strength.industry} min={0} max={100} step={5} unit="%" std={55} onChange={(v) => setStrength('industry', v)} />
                  </div>
                </div>
                <button type="button" onClick={() => setA(DEFAULTS)}
                  className="mt-1 w-full rounded-md border border-grey-200 px-3 py-1.5 text-[12px] font-semibold text-tertiary hover:border-primary hover:text-primary">
                  ↺ Reset to defaults
                </button>
              </div>
            </div>
            {/* chart */}
            <div className="rounded-lg border border-grey-200 bg-white p-3">
              <SupplyCurveChart trOnly={m.trOnly} trMeas={m.trMeas} baseline={a.baseline} target={a.target} pOnly={m.pOnly} pMeas={m.pMeas} />
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-tertiary">
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: C_ONLY }} />Carbon price only</span>
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: C_MEAS }} />With demand-side package</span>
                <span style={{ color: C_NAVY }}>– – target</span>
                <span style={{ color: '#9aa7a6' }}>– – €45 ETS2 trigger</span>
              </div>
            </div>
          </div>

          {/* sector breakdown + physical outputs */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="mb-3 text-[12px] font-bold text-tertiary-dark">Electrification by sector at the target · pp of final energy</p>
              <div className="space-y-2.5">
                {SECTORS.map((s) => (
                  <div key={s} className="grid grid-cols-[76px_1fr] items-center gap-3">
                    <span className="text-[12px] capitalize text-tertiary-dark">{s}</span>
                    <div className="space-y-1">
                      <div className="relative h-3.5 overflow-hidden rounded-sm border border-grey-200 bg-grey-50">
                        <div className="absolute inset-y-0 left-0" style={{ width: `${(m.bOnly[s] / maxPot) * 100}%`, background: C_ONLY }} />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold tabular-nums text-tertiary-dark">{m.bOnly[s].toFixed(1)}</span>
                      </div>
                      <div className="relative h-3.5 overflow-hidden rounded-sm border border-grey-200 bg-grey-50">
                        <div className="absolute inset-y-0 left-0" style={{ width: `${(m.bMeas[s] / maxPot) * 100}%`, background: C_MEAS }} />
                        <span className="absolute right-1.5 top-1/2 -translate-y-1/2 font-mono text-[10px] font-semibold tabular-nums text-tertiary-dark">{m.bMeas[s].toFixed(1)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 self-start">
              {[
                { v: thou(m.twh), u: 'TWh', l: 'New electricity at target' },
                { v: thou(m.mt), u: 'Mt/yr', l: 'CO₂ abated at target' },
                { v: m.addedPP.toFixed(0), u: 'pp', l: 'Added electrification' },
                { v: '60', u: '%', l: 'Direct-electrification ceiling' },
              ].map((k) => (
                <div key={k.l} className="rounded-lg border border-grey-200 bg-white p-3">
                  <p className="font-mono text-lg font-bold tabular-nums text-tertiary-dark">{k.v}<span className="text-[11px] font-normal text-tertiary"> {k.u}</span></p>
                  <p className="mt-1 text-[11px] leading-snug text-tertiary">{k.l}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* four findings */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">Four findings from the analysis</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {[
              { h: '46% is direct-only', b: 'The rate is electricity’s share of final energy. Indirect electrification via hydrogen and e-fuels is additive — the total electron-derived share reaches ~55–70% by 2040.' },
              { h: 'Feasible, with a hard tail', b: 'The direct-electrification ceiling is ~60% (Eurelectric). The residual ~40% — high-temp heat, feedstocks, aviation, shipping — needs hydrogen, e-fuels and biomass.' },
              { h: '46% is on the low side', b: 'The Board’s own 2040 advice reaches 50–54%; the Commission’s impact assessment models ~47–50%. 46% sits at the floor of the 90%-by-2040 range, not a stretch.' },
              { h: 'The price gap is the point', b: 'Price-only needs ~€150–200/t (Ariadne/PIK: 175–350/t for ETS2 sectors); with measures ~€55/t. The ~€100+/t gap is the shadow value of demand-side policy.' },
            ].map((f) => (
              <div key={f.h} className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[13px] font-bold text-tertiary-dark">{f.h}</p>
                <p className="mt-1 text-[12.5px] leading-relaxed text-tertiary">{f.b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* method + caveat */}
        <section className="mb-4">
          <div className="rounded-md bg-surface-blue px-4 py-3 text-[12px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Method &amp; scope.</strong> A stylised least-cost technology-choice
            model — the merit-order sweep is the exact optimum of a separable per-tranche cost minimisation, so no
            external solver is needed. It mirrors the Python reference model <code className="rounded bg-white px-1 py-0.5">ets-review/model/electrification_lcm.py</code> in
            exact parity and is calibrated to the hidden-cost literature and this repo&apos;s PyPSA sector MACs. It is
            <strong> not</strong> PyPSA-Eur, an IAM, or hourly dispatch, and collapses ETS1 and ETS2 into one price —
            so treat the <em>gap</em> and the <em>ordering</em> (price-only ≫ €45 trigger ≫ price-with-measures) as
            robust and absolute price levels as indicative. For a full power-system solve, see{' '}
            <code className="rounded bg-white px-1 py-0.5">pypsa-service/</code>.
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
