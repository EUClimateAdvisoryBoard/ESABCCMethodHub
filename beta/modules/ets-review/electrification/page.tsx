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
 *
 * Also hosts the FINAL-ENERGY FALLACY section (after M. Liebreich, via Euractiv
 * reporting, July 2026): a device-stock identity that translates the 46%
 * final-energy target into the heat-pump and EV adoption it implies. Because
 * electric devices need ~3× less input energy for the same service, every
 * fossil→electric switch shrinks the final-energy denominator, so the share is
 * a non-linear, lagging read on device adoption — one gas boiler plus one heat
 * pump delivering the same heat is only a "25% electrification rate". The
 * closed-form iso-target inversion is exact (verified round-trip): hitting 46%
 * with no help from other sectors needs ≈¾ of building heat from heat pumps
 * and ≈4 in 5 car-km electric, exactly Liebreich's numbers.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
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
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/* ------------------------------------------------------------ presets/URL */
// Slider ranges, reused for clamping both preset construction and URL parsing.
const RANGE = {
  target: [40, 60] as const, baseline: [20, 32] as const, barrierMult: [0.6, 1.6] as const,
  reform: [0, 60] as const, strength: [0, 100] as const,
};

const PRESETS: { name: string; a: Assumptions }[] = [
  { name: 'Action Plan default', a: DEFAULTS },
  { name: 'ESABCC advice (52%)', a: { ...DEFAULTS, target: 52 } },
  { name: 'High-barrier stress', a: { ...DEFAULTS, barrierMult: 1.25 } },
  { name: 'Weak package', a: { ...DEFAULTS, reform: 15, strength: { buildings: 35, transport: 35, industry: 35 } } },
];

function sameAssumptions(x: Assumptions, y: Assumptions): boolean {
  return x.target === y.target && x.baseline === y.baseline && x.barrierMult === y.barrierMult &&
    x.reform === y.reform && x.strength.buildings === y.strength.buildings &&
    x.strength.transport === y.strength.transport && x.strength.industry === y.strength.industry;
}

// Cap a possibly-unreachable target price at PMAX for display/plotting; flag it so callers can mark "≥".
function capPrice(p: number | null): { v: number; capped: boolean } {
  return p == null ? { v: PMAX, capped: true } : { v: p, capped: false };
}
function computeOnlyPrice(aa: Assumptions): number | null {
  return priceForTarget(buildTranches(aa, false), aa.baseline, aa.target);
}
function computeMeasPrice(aa: Assumptions): number | null {
  return priceForTarget(buildTranches(aa, true), aa.baseline, aa.target);
}

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
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverP, setHoverP] = useState<number | null>(null);
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
  const onPointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const localX = ((e.clientX - rect.left) / rect.width) * W;
    setHoverP(clamp(((localX - M.l) / PX) * PMAX, 0, PMAX));
  };
  const onPointerLeave = () => setHoverP(null);
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
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
      {/* ESABCC 2040 advice band, 50–54% */}
      <rect x={M.l} y={yPx(54)} width={PX} height={yPx(50) - yPx(54)} fill={C_NAVY} opacity={0.08} />
      <text x={W - M.r - 4} y={yPx(54) + 11} textAnchor="end" fontSize={10} fill={C_NAVY} opacity={0.75}>ESABCC advice 50–54%</text>
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
      {/* pointer readout */}
      {hoverP != null && (() => {
        const x = xPx(hoverP);
        const rOnly = rateAt(trOnly, baseline, hoverP);
        const rMeas = rateAt(trMeas, baseline, hoverP);
        const boxW = 128, boxH = 54;
        const bx = clamp(x + 10, M.l, W - M.r - boxW);
        const by = M.t + 6;
        return (
          <g pointerEvents="none">
            <line x1={x} y1={M.t} x2={x} y2={M.t + PY} stroke={C_NAVY} strokeWidth={1} opacity={0.55} />
            <circle cx={x} cy={yPx(rOnly)} r={3.5} fill={C_ONLY} stroke="white" strokeWidth={1.5} />
            <circle cx={x} cy={yPx(rMeas)} r={3.5} fill={C_MEAS} stroke="white" strokeWidth={1.5} />
            <rect x={bx} y={by} width={boxW} height={boxH} rx={4} fill="white" stroke="#d8e0df" />
            <text x={bx + 8} y={by + 16} fontSize={11.5} fontWeight={700} fill={C_NAVY} className="font-mono tabular-nums">€{Math.round(hoverP)}/t</text>
            <text x={bx + 8} y={by + 31} fontSize={10.5} fill={C_ONLY} className="font-mono tabular-nums">only {rOnly.toFixed(1)}%</text>
            <text x={bx + 8} y={by + 45} fontSize={10.5} fill={C_MEAS} className="font-mono tabular-nums">meas {rMeas.toFixed(1)}%</text>
          </g>
        );
      })()}
      {/* transparent capture layer, kept topmost for reliable pointer tracking */}
      <rect x={M.l} y={M.t} width={PX} height={PY} fill="transparent"
        onPointerMove={onPointerMove} onPointerLeave={onPointerLeave} style={{ cursor: 'crosshair', touchAction: 'none' }} />
    </svg>
  );
}

/* ------------------------------------------------------------- Tornado SVG */
interface TornadoRow { label: string; lo: number; hi: number; loCapped: boolean; hiCapped: boolean }

function TornadoChart({ rows, center, color }: { rows: TornadoRow[]; center: number; color: string }) {
  const W = 640, rowH = 30, M = { l: 168, r: 54, t: 6, b: 6 };
  const H = M.t + M.b + rows.length * rowH;
  const PXw = W - M.l - M.r;
  const vals = rows.flatMap((r) => [r.lo, r.hi]).concat([center]);
  const vMin = Math.min(...vals), vMax = Math.max(...vals);
  const pad = Math.max((vMax - vMin) * 0.15, 5);
  const d0 = vMin - pad, d1 = vMax + pad;
  const xPx = (v: number) => M.l + ((v - d0) / (d1 - d0 || 1)) * PXw;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Tornado sensitivity chart">
      <line x1={xPx(center)} y1={0} x2={xPx(center)} y2={H} stroke={C_NAVY} strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
      {rows.map((r, i) => {
        const y = M.t + i * rowH;
        const loIsBarLo = r.lo <= r.hi;
        const barLo = loIsBarLo ? r.lo : r.hi, barHi = loIsBarLo ? r.hi : r.lo;
        const barLoCapped = loIsBarLo ? r.loCapped : r.hiCapped;
        const barHiCapped = loIsBarLo ? r.hiCapped : r.loCapped;
        const x1 = xPx(barLo), x2 = xPx(barHi);
        return (
          <g key={r.label}>
            <text x={M.l - 8} y={y + rowH / 2 + 4} textAnchor="end" fontSize={11} fill="#5d6f6e">{r.label}</text>
            <rect x={x1} y={y + 6} width={Math.max(x2 - x1, 1)} height={rowH - 14} fill={color} opacity={0.32} rx={2} />
            <line x1={x1} y1={y + 3} x2={x1} y2={y + rowH - 3} stroke={color} strokeWidth={2} />
            <line x1={x2} y1={y + 3} x2={x2} y2={y + rowH - 3} stroke={color} strokeWidth={2} />
            <text x={x1 - 4} y={y + rowH / 2 + 4} textAnchor="end" fontSize={10} fontWeight={600} fill={color} className="font-mono tabular-nums">
              {barLoCapped ? '≥' : ''}€{Math.round(barLo)}
            </text>
            <text x={x2 + 4} y={y + rowH / 2 + 4} textAnchor="start" fontSize={10} fontWeight={600} fill={color} className="font-mono tabular-nums">
              {barHiCapped ? '≥' : ''}€{Math.round(barHi)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------ final-energy fallacy (model) */
// Liebreich's 'final energy fallacy': the 46% target is a share of FINAL
// energy, but electric devices need far less input energy for the same
// service — so every switch shrinks the denominator the share is measured
// against, and the metric badly lags device adoption. Buildings heat and
// cars are modelled in fixed useful-service terms with device efficiencies;
// everything else is one aggregate with an optional electrification lever.

interface FalAssumptions {
  hp: number;    // % of building heat delivered by heat pumps
  ev: number;    // % of car-km driven electric
  other: number; // % of other fossil final energy electrified
  cop: number;   // heat-pump seasonal COP
  eta: number;   // fossil boiler efficiency
  rEv: number;   // ICE:EV final-energy ratio per km
}
const FAL_DEFAULTS: FalAssumptions = { hp: 13, ev: 4, other: 0, cop: 3.0, eta: 0.9, rEv: 3.3 };

// Stylised EU calibration (TWh), consistent with FE_TWH at today's ~23% share.
const HEAT_FE_NOW = 2500; // buildings space & water heat, final energy today
const CARS_FE_NOW = 1700; // passenger cars, final energy today
const SHARE_NOW = 23;     // electricity share of final energy today, %
const R_OTHER = 1.8;      // fossil:electric final-energy ratio, aggregated rest
// Fixed service demands, backed out from today's stock at the default techs;
// holding these fixed is what isolates the metric's arithmetic from demand.
const U_HEAT = HEAT_FE_NOW / (0.13 / FAL_DEFAULTS.cop + 0.87 / FAL_DEFAULTS.eta);
const A_CARS = CARS_FE_NOW / (0.96 + 0.04 / FAL_DEFAULTS.rEv);
const OTHER_ELEC = (FE_TWH * SHARE_NOW) / 100 - (U_HEAT * 0.13) / FAL_DEFAULTS.cop - (A_CARS * 0.04) / FAL_DEFAULTS.rEv;
const OTHER_FOSSIL = FE_TWH - HEAT_FE_NOW - CARS_FE_NOW - OTHER_ELEC;

function falOther(f: FalAssumptions) {
  const x = f.other / 100;
  const e = OTHER_ELEC + (OTHER_FOSSIL * x) / R_OTHER;
  return { e, f: e + OTHER_FOSSIL * (1 - x) };
}
function falPoint(f: FalAssumptions) {
  const hp = f.hp / 100, ev = f.ev / 100;
  const eHeat = (U_HEAT * hp) / f.cop;
  const fHeat = eHeat + (U_HEAT * (1 - hp)) / f.eta;
  const eCars = (A_CARS * ev) / f.rEv;
  const fCars = eCars + A_CARS * (1 - ev);
  const o = falOther(f);
  const E = eHeat + eCars + o.e, F = fHeat + fCars + o.f;
  return { rate: (100 * E) / F, E, F, eHeat, fHeat };
}
// Closed-form inversions of rate == target (exact — rate is a ratio of two
// expressions linear in the adoption share). Results can leave [0, 100]:
// >100 means the target is unreachable on this axis alone, <0 already met.
function evNeeded(f: FalAssumptions, hpPct: number, targetPct: number): number {
  const T = targetPct / 100, hp = hpPct / 100;
  const eHeat = (U_HEAT * hp) / f.cop;
  const fHeat = eHeat + (U_HEAT * (1 - hp)) / f.eta;
  const o = falOther(f);
  const num = T * (fHeat + o.f + A_CARS) - eHeat - o.e;
  const den = A_CARS * (1 / f.rEv + T * (1 - 1 / f.rEv));
  return (100 * num) / den;
}
function hpNeeded(f: FalAssumptions, evPct: number, targetPct: number): number {
  const T = targetPct / 100, ev = evPct / 100;
  const eCars = (A_CARS * ev) / f.rEv;
  const fCars = eCars + A_CARS * (1 - ev);
  const o = falOther(f);
  const num = T * (U_HEAT / f.eta + fCars + o.f) - eCars - o.e;
  const den = U_HEAT * ((1 - T) / f.cop + T / f.eta);
  return (100 * num) / den;
}

const FAL_PRESETS: { name: string; f: FalAssumptions }[] = [
  { name: 'Today (~23%)', f: FAL_DEFAULTS },
  { name: 'Liebreich 46% point', f: { ...FAL_DEFAULTS, hp: 75, ev: 80 } },
  { name: 'Other sectors help', f: { ...FAL_DEFAULTS, hp: 60, ev: 65, other: 25 } },
];
function sameFal(x: FalAssumptions, y: FalAssumptions): boolean {
  return x.hp === y.hp && x.ev === y.ev && x.other === y.other &&
    x.cop === y.cop && x.eta === y.eta && x.rEv === y.rEv;
}

/* ---------------------------------------------------- Fallacy iso-target SVG */
function FallacyChart({ fal, target, met }: { fal: FalAssumptions; target: number; met: boolean }) {
  const W = 720, H = 400, M = { l: 56, r: 18, t: 18, b: 46 };
  const PX = W - M.l - M.r, PY = H - M.t - M.b;
  const xPx = (hp: number) => M.l + (hp / 100) * PX;
  const yPx = (ev: number) => M.t + (1 - ev / 100) * PY;
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ hp: number; ev: number } | null>(null);

  // Iso-target boundary: the EV share needed at each heat-pump share, clamped
  // into the plot; everything above/right of it meets the target.
  const boundary: { hp: number; ev: number }[] = [];
  for (let hp = 0; hp <= 100; hp += 0.5) {
    const ev = evNeeded(fal, hp, target);
    if (ev <= 100) boundary.push({ hp, ev: Math.max(ev, 0) });
  }
  const curveD = boundary.map((p, i) => `${i ? 'L' : 'M'}${xPx(p.hp).toFixed(1)} ${yPx(p.ev).toFixed(1)}`).join('');
  const regionD = boundary.length
    ? `${curveD}L${xPx(100).toFixed(1)} ${M.t}L${xPx(boundary[0].hp).toFixed(1)} ${M.t}Z`
    : '';
  const ticks = [0, 20, 40, 60, 80, 100];

  const onPointerMove = (e: ReactPointerEvent<SVGRectElement>) => {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const lx = ((e.clientX - rect.left) / rect.width) * W;
    const ly = ((e.clientY - rect.top) / rect.height) * H;
    setHover({
      hp: clamp(((lx - M.l) / PX) * 100, 0, 100),
      ev: clamp((1 - (ly - M.t) / PY) * 100, 0, 100),
    });
  };
  const pointMark = (hp: number, ev: number, color: string, label: string, r = 5, above = true) => (
    <g>
      <circle cx={xPx(hp)} cy={yPx(ev)} r={r} fill={color} stroke="white" strokeWidth={2} />
      <text x={xPx(hp)} y={yPx(ev) + (above ? -10 : 16)} textAnchor="middle" fontSize={10.5} fontWeight={700} fill={color}>{label}</text>
    </g>
  );
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Heat-pump and EV adoption combinations that reach the electrification target">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={M.l} y1={yPx(v)} x2={W - M.r} y2={yPx(v)} stroke="#eef3f2" strokeWidth={1} />
          <line x1={xPx(v)} y1={M.t} x2={xPx(v)} y2={M.t + PY} stroke="#eef3f2" strokeWidth={1} />
          <text x={M.l - 8} y={yPx(v) + 3} textAnchor="end" fontSize={11} fill="#8fa1a0" className="tabular-nums">{v}%</text>
          <text x={xPx(v)} y={H - M.b + 16} textAnchor="middle" fontSize={11} fill="#8fa1a0" className="tabular-nums">{v}%</text>
        </g>
      ))}
      <text x={M.l + PX / 2} y={H - 4} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="#5d6f6e">Heat pumps — share of building heat delivered</text>
      <text transform={`translate(14 ${M.t + PY / 2}) rotate(-90)`} textAnchor="middle" fontSize={11.5} fontWeight={600} fill="#5d6f6e">Fully-electric share of car-km</text>
      {regionD && <path d={regionD} fill={C_MEAS} opacity={0.07} />}
      {boundary.length > 0 && <path d={curveD} fill="none" stroke={C_MEAS} strokeWidth={2.5} />}
      {boundary.length > 0 && (
        <text x={xPx(Math.min(boundary[0].hp + 4, 92))} y={M.t + 14} fontSize={10.5} fontWeight={600} fill={C_MEAS}>
          meets {target}% ↗
        </text>
      )}
      {pointMark(13, 4, '#9aa7a6', 'today', 4.5, false)}
      {pointMark(75, 80, C_NAVY, 'Liebreich ¾ · ⅘', 4.5)}
      {pointMark(fal.hp, fal.ev, met ? C_MEAS : C_ONLY, 'your scenario', 6, fal.ev < 90)}
      {hover && (() => {
        const r = falPoint({ ...fal, hp: hover.hp, ev: hover.ev }).rate;
        const boxW = 148, boxH = 40;
        const bx = clamp(xPx(hover.hp) + 10, M.l, W - M.r - boxW);
        const by = clamp(yPx(hover.ev) - boxH - 8, M.t, M.t + PY - boxH);
        return (
          <g pointerEvents="none">
            <rect x={bx} y={by} width={boxW} height={boxH} rx={4} fill="white" stroke="#d8e0df" />
            <text x={bx + 8} y={by + 16} fontSize={10.5} fill="#5d6f6e" className="font-mono tabular-nums">
              HP {hover.hp.toFixed(0)}% · EV {hover.ev.toFixed(0)}%
            </text>
            <text x={bx + 8} y={by + 31} fontSize={11.5} fontWeight={700} fill={r >= target ? C_MEAS : C_ONLY} className="font-mono tabular-nums">
              → {r.toFixed(1)}% of final energy
            </text>
          </g>
        );
      })()}
      <rect x={M.l} y={M.t} width={PX} height={PY} fill="transparent"
        onPointerMove={onPointerMove} onPointerLeave={() => setHover(null)} style={{ cursor: 'crosshair', touchAction: 'none' }} />
    </svg>
  );
}

/* ------------------------------------------------------------------ page */
export default function EtsReviewModule() {
  // Initial render always uses DEFAULTS (server and client match); the URL is
  // only consulted after mount, in an effect — see hydration-safety note above.
  const [a, setA] = useState<Assumptions>(DEFAULTS);
  const [fal, setFal] = useState<FalAssumptions>(FAL_DEFAULTS);
  const [copied, setCopied] = useState(false);
  const setF = (patch: Partial<FalAssumptions>) => setFal((prev) => ({ ...prev, ...patch }));
  const set = (patch: Partial<Assumptions>) => setA((prev) => ({ ...prev, ...patch }));
  const setStrength = (s: Sector, v: number) => setA((prev) => ({ ...prev, strength: { ...prev.strength, [s]: v } }));

  // Read a shared scenario from the URL query string, once, after mount.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (![...params.keys()].length) return;
    const num = (key: string, [min, max]: readonly [number, number], fallback: number) => {
      const raw = params.get(key);
      if (raw == null) return fallback;
      const n = Number(raw);
      return Number.isFinite(n) ? clamp(n, min, max) : fallback;
    };
    setA((prev) => ({
      target: num('t', RANGE.target, prev.target),
      baseline: num('b', RANGE.baseline, prev.baseline),
      barrierMult: num('m', RANGE.barrierMult, prev.barrierMult),
      reform: num('r', RANGE.reform, prev.reform),
      strength: {
        buildings: num('sb', RANGE.strength, prev.strength.buildings),
        transport: num('st', RANGE.strength, prev.strength.transport),
        industry: num('si', RANGE.strength, prev.strength.industry),
      },
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync with the current scenario (debounced), via
  // history.replaceState so this never adds navigation entries.
  useEffect(() => {
    const id = setTimeout(() => {
      const params = new URLSearchParams({
        t: String(a.target), b: String(a.baseline), m: String(a.barrierMult), r: String(a.reform),
        sb: String(a.strength.buildings), st: String(a.strength.transport), si: String(a.strength.industry),
      });
      window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
    }, 300);
    return () => clearTimeout(id);
  }, [a]);

  const activePreset = PRESETS.find((p) => sameAssumptions(p.a, a))?.name ?? 'Custom';

  const copyLink = () => {
    const params = new URLSearchParams({
      t: String(a.target), b: String(a.baseline), m: String(a.barrierMult), r: String(a.reform),
      sb: String(a.strength.buildings), st: String(a.strength.transport), si: String(a.strength.industry),
    });
    const url = `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    navigator.clipboard.writeText(url).then(
      () => { setCopied(true); setTimeout(() => setCopied(false), 1500); },
      () => {},
    );
  };

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

  // Sensitivity tornado: one-at-a-time perturbations from the current settings,
  // mirroring the Python reference's --sensitivity barrier-multiplier tornado
  // but extended to every demand-side lever. Perturbing strength/reform only
  // moves the with-measures curve; perturbing barrierMult moves both curves.
  const tornadoRows = useMemo(() => {
    type Spec = { label: string; lowA: Assumptions; highA: Assumptions; onlyChanges: boolean };
    const specs: Spec[] = [
      {
        label: 'Barrier-cost multiplier (±25%)', onlyChanges: true,
        lowA: { ...a, barrierMult: clamp(a.barrierMult * 0.75, ...RANGE.barrierMult) },
        highA: { ...a, barrierMult: clamp(a.barrierMult * 1.25, ...RANGE.barrierMult) },
      },
      {
        label: 'Electricity-price reform (±€10/t)', onlyChanges: false,
        lowA: { ...a, reform: clamp(a.reform - 10, ...RANGE.reform) },
        highA: { ...a, reform: clamp(a.reform + 10, ...RANGE.reform) },
      },
      ...SECTORS.map((s) => ({
        label: `${s[0].toUpperCase()}${s.slice(1)} measures (±15pp)`, onlyChanges: false,
        lowA: { ...a, strength: { ...a.strength, [s]: clamp(a.strength[s] - 15, ...RANGE.strength) } },
        highA: { ...a, strength: { ...a.strength, [s]: clamp(a.strength[s] + 15, ...RANGE.strength) } },
      })),
    ];
    const rows = specs.map((spec) => {
      const lowMeas = capPrice(computeMeasPrice(spec.lowA));
      const highMeas = capPrice(computeMeasPrice(spec.highA));
      const lowOnly = capPrice(spec.onlyChanges ? computeOnlyPrice(spec.lowA) : m.pOnly);
      const highOnly = capPrice(spec.onlyChanges ? computeOnlyPrice(spec.highA) : m.pOnly);
      return {
        label: spec.label,
        meas: { lo: lowMeas.v, hi: highMeas.v, loCapped: lowMeas.capped, hiCapped: highMeas.capped },
        gap: {
          lo: lowOnly.v - lowMeas.v, hi: highOnly.v - highMeas.v,
          loCapped: lowOnly.capped || lowMeas.capped, hiCapped: highOnly.capped || highMeas.capped,
        },
        impact: Math.abs(highMeas.v - lowMeas.v),
      };
    });
    rows.sort((x, y) => y.impact - x.impact);
    return rows;
  }, [a, m.pOnly]);

  // Final-energy fallacy: the identity itself is cheap; recompute per change.
  const fx = useMemo(() => {
    const pt = falPoint(fal);
    const met = pt.rate >= a.target;
    return {
      ...pt, met,
      evReq: evNeeded(fal, fal.hp, a.target),
      hpReq: hpNeeded(fal, fal.ev, a.target),
      toy: (100 * (1 / fal.cop)) / (1 / fal.cop + 1 / fal.eta),
      heatShare: (100 * pt.eHeat) / pt.fHeat,
      dF: (100 * (pt.F - FE_TWH)) / FE_TWH,
    };
  }, [fal, a.target]);
  const activeFalPreset = FAL_PRESETS.find((p) => sameFal(p.f, fal))?.name ?? 'Custom';
  const reqLabel = (v: number) => (v > 100 ? 'not reachable' : v < 0 ? 'already met' : null);

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
              <p className="mb-3 flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">
                Assumptions
                <span className="normal-case tracking-normal text-tertiary/80">
                  scenario: <span className={activePreset === 'Custom' ? 'text-accent-orange' : 'text-primary'}>{activePreset}</span>
                </span>
              </p>
              <div className="mb-3.5 flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => setA(p.a)}
                    className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${activePreset === p.name
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-grey-200 text-tertiary hover:border-primary hover:text-primary'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
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
                <div className="mt-1 flex gap-2">
                  <button type="button" onClick={() => setA(DEFAULTS)}
                    className="flex-1 rounded-md border border-grey-200 px-3 py-1.5 text-[12px] font-semibold text-tertiary hover:border-primary hover:text-primary">
                    ↺ Reset to defaults
                  </button>
                  <button type="button" onClick={copyLink}
                    className="flex-1 rounded-md border border-grey-200 px-3 py-1.5 text-[12px] font-semibold text-tertiary hover:border-primary hover:text-primary">
                    {copied ? 'Copied' : 'Copy link to this scenario'}
                  </button>
                </div>
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

        {/* sensitivity tornado */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">Sensitivity — what moves the price</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            One-at-a-time perturbations from the current settings above — mirrors the Python reference's
            <code className="rounded bg-surface-blue px-1 py-0.5">--sensitivity</code> tornado, extended to every
            demand-side lever: barrier-cost multiplier ±25%, each sector's measure strength ±15pp (clamped 0–100),
            and the electricity-price reform ±€10/t. Bars are sorted by impact on the with-measures price; the dashed
            line marks the current value. A price at the €{PMAX}/t sweep ceiling (target unreachable) is capped and
            marked <span className="font-mono">≥</span>.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="mb-3 text-[12px] font-bold text-tertiary-dark">
                With-measures price
                <span className="ml-1.5 font-mono font-normal text-tertiary">
                  · current {m.pMeas != null ? `€${m.pMeas}` : `≥€${PMAX}`}/t
                </span>
              </p>
              <TornadoChart rows={tornadoRows.map((r) => ({ label: r.label, ...r.meas }))} center={m.pMeas ?? PMAX} color={C_MEAS} />
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="mb-3 text-[12px] font-bold text-tertiary-dark">
                Gap (shadow value)
                <span className="ml-1.5 font-mono font-normal text-tertiary">
                  · current {m.gap != null ? `€${m.gap}` : '—'}/t
                </span>
              </p>
              <TornadoChart rows={tornadoRows.map((r) => ({ label: r.label, ...r.gap }))} center={m.gap ?? 0} color={C_NAVY} />
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

        {/* final-energy fallacy */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">The final-energy fallacy — what 46% means in devices</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Michael Liebreich (BloombergNEF founder) calls the 46% target <em>&ldquo;mathematically
            unachievable&rdquo;</em> — his <strong>&lsquo;final energy fallacy&rsquo;</strong>: the target is a share
            of <em>final energy</em>, but electric devices need ~3× less input energy for the same service, so every
            fossil→electric switch <strong>shrinks the denominator</strong> the share is measured against. A country
            of one gas boiler and one heat pump delivering the same heat has an electrification rate of just{' '}
            <span className="font-mono tabular-nums">{fx.toy.toFixed(0)}%</span> at the boiler efficiency and COP set
            below (25% with a perfect boiler) — from a 50% device share. This section rebuilds his arithmetic as a
            device-stock identity calibrated to today&rsquo;s ~23%: drag the adoption sliders and see what the{' '}
            {a.target}% target set above actually demands.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[320px_1fr]">
            {/* controls */}
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="mb-3 flex items-baseline justify-between gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">
                Device stock 2040
                <span className="normal-case tracking-normal text-tertiary/80">
                  scenario: <span className={activeFalPreset === 'Custom' ? 'text-accent-orange' : 'text-primary'}>{activeFalPreset}</span>
                </span>
              </p>
              <div className="mb-3.5 flex flex-wrap gap-1.5">
                {FAL_PRESETS.map((p) => (
                  <button key={p.name} type="button" onClick={() => setFal(p.f)}
                    className={`rounded-full border px-2.5 py-1 text-[10.5px] font-semibold ${activeFalPreset === p.name
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-grey-200 text-tertiary hover:border-primary hover:text-primary'}`}>
                    {p.name}
                  </button>
                ))}
              </div>
              <div className="space-y-3.5">
                <Slider label="Heat pumps — share of building heat" hint="~13% of delivered heat today" value={fal.hp} min={0} max={100} step={1} unit="%" std={13} onChange={(v) => setF({ hp: v })} />
                <Slider label="Fully-electric share of car-km" hint="Low single digits of the fleet today" value={fal.ev} min={0} max={100} step={1} unit="%" std={4} onChange={(v) => setF({ ev: v })} />
                <Slider label="Other sectors electrified" hint="Industry heat, trucks… of today's other fossil use" value={fal.other} min={0} max={60} step={1} unit="%" std={0} onChange={(v) => setF({ other: v })} />
                <div className="border-t border-grey-200 pt-3">
                  <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-tertiary">Device efficiencies</p>
                  <div className="space-y-3.5">
                    <Slider label="Heat-pump seasonal COP" hint="≥3 kWh heat per kWh electricity" value={fal.cop} min={2} max={5} step={0.1} unit="×" std={3} onChange={(v) => setF({ cop: v })} />
                    <Slider label="Fossil boiler efficiency" hint="Even the best gas boilers stay below 1" value={fal.eta} min={0.7} max={1} step={0.01} unit="×" std={0.9} onChange={(v) => setF({ eta: v })} />
                    <Slider label="ICE ÷ EV energy per km" hint="How much more final energy an ICE car uses" value={fal.rEv} min={2} max={4.5} step={0.1} unit="×" std={3.3} onChange={(v) => setF({ rEv: v })} />
                  </div>
                </div>
                <p className="rounded-md bg-surface-blue px-3 py-2 text-[11.5px] leading-relaxed text-tertiary">
                  At these settings <strong className="text-tertiary-dark">{fal.hp}%</strong> of heat is heat-pump
                  delivered, yet electricity is only{' '}
                  <strong className="text-tertiary-dark">{fx.heatShare.toFixed(0)}%</strong> of heating{' '}
                  <em>final energy</em> — the fallacy in one number.
                </p>
              </div>
            </div>
            {/* chart */}
            <div className="rounded-lg border border-grey-200 bg-white p-3">
              <FallacyChart fal={fal} target={a.target} met={fx.met} />
              <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 px-1 text-[11px] text-tertiary">
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-[2px]" style={{ background: C_MEAS }} />adoption mixes reaching the target (frontier + shaded region)</span>
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: C_NAVY }} />Liebreich&rsquo;s ¾ heat pumps · ⅘ EVs</span>
                <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full bg-[#9aa7a6]" />today</span>
              </div>
            </div>
          </div>

          {/* readouts */}
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              { k: 'Electrification rate', v: `${fx.rate.toFixed(1)}%`, u: `target ${a.target}%`, c: fx.met ? C_MEAS : C_ONLY },
              { k: 'Final energy (the denominator)', v: thou(Math.round(fx.F)), u: `TWh · ${fx.dF <= -0.5 ? `${fx.dF.toFixed(0)}% vs today` : '≈ today'}`, c: C_NAVY },
              { k: 'EVs needed at this heat-pump share', v: reqLabel(fx.evReq) ?? `${fx.evReq.toFixed(0)}%`, u: 'of car-km', c: C_NAVY },
              { k: 'Heat pumps needed at this EV share', v: reqLabel(fx.hpReq) ?? `${fx.hpReq.toFixed(0)}%`, u: 'of heat', c: C_NAVY },
            ].map((k) => (
              <div key={k.k} className="rounded-lg border border-grey-200 bg-white p-3">
                <p className="text-[11px] text-tertiary">{k.k}</p>
                <p className="mt-1 font-mono text-lg font-bold tabular-nums" style={{ color: k.c }}>
                  {k.v}<span className="text-[11px] font-normal text-tertiary"> {k.u}</span>
                </p>
              </div>
            ))}
          </div>

          {/* findings */}
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {[
              { h: 'The denominator shrinks', b: 'Each boiler or engine replaced deletes ~2–3 kWh of fossil final energy per kWh of electricity added — the share is measured against a total that falls as you succeed. At Liebreich’s point, EU final energy is ~26% below today with identical heat and mobility.' },
              { h: 'Devices, not shares', b: 'With no help from other sectors, 46% needs ≈¾ of building heat from heat pumps (~13% today) and ~4 in 5 car-km electric. With a ~15-year fleet life that means near-all-electric sales starting now — while the 2035 ICE-ban is being dismantled. “We need a course correction” (Liebreich).' },
              { h: 'Other sectors buy slack', b: 'Electrifying industrial heat and trucks relieves the burden: with a quarter of other fossil use switched, ~60% heat pumps and ~65% EVs suffice (the “Other sectors help” preset). The fallacy is about where 46% must come from, not whether electrification is right.' },
              { h: 'A contested metric', b: 'Of five Commission officials involved in the target, one points to “further work until the end of this year in terms of analytical basis”, another concedes no good solution exists yet; others had not heard of the fallacy. Bruce Douglas (Global Renewables Alliance) counters it is the “best metric we have” and a “powerful market signal”. Electrification could enter the 2040 target architecture as early as 2027.' },
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
            {' '}The <strong className="text-tertiary-dark">final-energy fallacy</strong> section is a separate
            device-stock <em>identity</em> (no optimisation): fixed useful-service demand for buildings heat and
            car-km, device efficiencies as sliders, stylised calibration to today&rsquo;s ~23% share; the iso-target
            frontier is the exact closed-form inversion. Source: Euractiv reporting on Michael Liebreich&rsquo;s
            &lsquo;final energy fallacy&rsquo; analysis (July 2026), incl. the quoted Commission and Global
            Renewables Alliance positions. It shows the metric&rsquo;s arithmetic, not a demand scenario — the
            least-cost model above remains the module&rsquo;s cost engine.
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
