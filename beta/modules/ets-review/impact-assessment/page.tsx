'use client';

/**
 * ETS Review — Inside the impact assessment (beta submodule page under M·37).
 *
 * A companion to the interactive least-cost model at /beta/ets-review. Where the
 * parent module drives the *cost* question, this page opens up the *evidence*: it
 * extracts the technical assumptions behind the Commission's 17 July 2026 package
 * from the underlying impact assessment SWD(2026) 616 (5 parts, 958 pp) and its
 * supplementary Technology Assumptions workbook (E3Modelling/PRIMES), and — the
 * point of the page — flags every load-bearing uncertainty and ambiguity.
 *
 * Two areas, as requested:
 *   1. The electrification goal — what the IA actually assumes about electrifying
 *      demand (and the honest caveat that the "46%" headline is NOT in this IA).
 *   2. The ETS reform itself — cap, removals, MSR, free allocation/CBAM, aviation,
 *      maritime, waste, the 20 MW threshold, and the Industrial Decarbonisation Bank.
 *
 * Every figure is sourced to a page of SWD(2026) 616 (pNN = printed page of the
 * cited part) or to the technology workbook. The uncertainty register at the foot
 * is filterable by area and by type of uncertainty. Charts are static, directly
 * labelled inline SVG in the house style; the register is the interactive element.
 *
 * NOT a model — a structured reading of the Commission's own evidence base. Numbers
 * are transcribed from the IA; where the IA gives a range (model spread, cost band)
 * the range is shown, not a false point estimate.
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

/* --------------------------------------------------------------- palette */
// CVD-validated categorical set on white (light surface). Navy is text/axis only.
const C_RED = '#B83230';
const C_BLUE = '#2F6FB0';
const C_AMBER = '#C77D11';
const C_TEAL = '#0D9488';
const C_PURPLE = '#8A4B9E';
const C_NAVY = '#2E3E4C';
const INK = '#5d6f6e';
const GRID = '#eef3f2';

/* =========================================================== uncertainty tags */
type TagKey = 'range' | 'data-gap' | 'contested' | 'attribution' | 'definitional' | 'assumption' | 'unquantified';
const TAGS: Record<TagKey, { label: string; color: string; blurb: string }> = {
  range: { label: 'Model spread', color: C_BLUE, blurb: 'Two models (PRIMES / POTEnCIA) or a cost band disagree; the IA shows a range, not a point.' },
  assumption: { label: 'Load-bearing assumption', color: C_AMBER, blurb: 'A result hinges on an input the IA sets by assumption (cost fall, price path, compliance).' },
  attribution: { label: 'Attribution', color: C_RED, blurb: 'The effect cannot be cleanly attributed to the ETS versus other drivers.' },
  'data-gap': { label: 'Data gap', color: C_PURPLE, blurb: 'Missing, proxied or buffered data; the estimate is built on partial evidence.' },
  definitional: { label: 'Definitional / scope', color: C_TEAL, blurb: 'The number moves with a definition or scope choice (denominator, net vs gross).' },
  contested: { label: 'Contested', color: '#9a6a00', blurb: 'Stakeholders openly disagree; the IA records division, not consensus.' },
  unquantified: { label: 'Could not quantify', color: C_NAVY, blurb: 'The IA states a quantity it could not compute or monetise.' },
};

/* =============================================================== data: charts */

// Cap trajectory — EEA gross cap, Mt (Annex 8 Pt I). The cap is IDENTICAL across
// PO1/PO2/PO3 (all use the 85%-by-2040 trajectory); what differs is the scenario
// FAMILY the co-legislators could pick, and the model band around it.
const CAP_YEARS = [2030, 2035, 2040];
const CAP_SERIES = [
  { key: 'Legal default (LRF −4.4%)', color: C_RED, pts: [975, 485, 69], src: 'Pt I p8' },
  { key: '85% by 2040 (PRIMES · chosen)', color: C_TEAL, pts: [911, 580, 330], band: [[911, 911], [560, 670], [330, 375]] as [number, number][], src: 'Pt I p11' },
  { key: '90% domestic (PRIMES)', color: C_BLUE, pts: [847, 485, 155], src: 'Pt I p13' },
];

// Policy-option cumulative carbon budget 2031–40, Mt (range = model spread)
const PO_BUDGET = [
  { po: 'PO1', label: 'Least change', lo: 5120, hi: 5775, color: C_TEAL },
  { po: 'PO2', label: '+ scope (waste MWI)', lo: 5890, hi: 6330, color: C_AMBER },
  { po: 'PO3', label: '+ full scope', lo: 6715, hi: 7335, color: C_RED },
];

// CDR removal-unit cost in 2040, €/t — avg with lower–upper band (Annex 8 Pt II)
const CDR_2040 = [
  { name: 'BioCCS', lo: 160, avg: 176, hi: 192, color: C_TEAL },
  { name: 'DACCS', lo: 185, avg: 278, hi: 370, color: C_RED },
  { name: 'Biochar', lo: 37, avg: 88, hi: 138, color: C_AMBER },
];

// Electrification, % of final energy in 2040, across 90%-consistent scenarios
const ELEC_BENCH = [
  { name: 'PAC 2.0 (CAN Europe)', v: 70, color: C_BLUE },
  { name: 'SP90 (Strategic Persp.)', v: 57, color: C_BLUE },
  { name: 'CLEVER / REMIND (PIK)', v: 51, color: C_BLUE },
  { name: 'EC impact assessment', v: 47, color: C_PURPLE },
  { name: 'Action Plan target (46%)', v: 46, color: C_AMBER, hi: true },
  { name: 'Agora / TYNDP24-DE', v: 46, color: C_BLUE },
];

// Technology learning curves — overnight cost indexed to 2020 = 100 (workbook)
const LEARN_YEARS = [2020, 2030, 2040, 2050];
const LEARN = [
  { key: 'H₂ PEM electrolyser', color: C_TEAL, raw: [2195, 1155, 825, 590], idx: [100, 53, 38, 27] },
  { key: 'Battery (utility, €/kWh)', color: C_PURPLE, raw: [450, 250, 221, 206], idx: [100, 56, 49, 46] },
  { key: 'Offshore wind (floating)', color: C_BLUE, raw: [4380, 3650, 2305, 2255], idx: [100, 83, 53, 51] },
  { key: 'Solar PV (utility)', color: C_AMBER, raw: [757, 485, 435, 370], idx: [100, 64, 57, 49] },
  { key: 'Gas CCGT (fossil ref.)', color: C_RED, raw: [900, 820, 755, 698], idx: [100, 91, 84, 78] },
];

// 20 MW threshold — coverage gained by lowering the threshold (Annex 12 Table 31)
const MW20 = [
  { th: '≤ 15 MW', mt: 5, inst: 5005 },
  { th: '≤ 10 MW', mt: 10, inst: 11615 },
  { th: '≤ 5 MW', mt: 18, inst: 26345 },
  { th: 'No threshold', mt: 28, inst: 94428 },
];

/* =============================================================== register data */
interface Unc { area: 'elec' | 'ets'; tag: TagKey; title: string; detail: string; src: string; }
const REGISTER: Unc[] = [
  // — ETS reform —
  { area: 'ets', tag: 'unquantified', title: 'Costs & benefits could not be monetised', detail: 'The Regulatory Scrutiny Board and the IA state it was “not possible to monetise the aggregated costs and benefits of the preferred option” — too heterogeneous, and dependent on future MRV design.', src: 'Annex 1–2, p8' },
  { area: 'ets', tag: 'attribution', title: 'Reductions may not be the ETS at all', detail: 'The evaluation finds industrial cuts were “primarily driven by a decline in levels of activity … unrelated to the ETS” — energy-crisis prices, not the carbon price. Decoupling could not be shown.', src: 'Annex 15, p29' },
  { area: 'ets', tag: 'attribution', title: 'MSR effect cannot be isolated', detail: 'Price rises “mainly explained by the increased Linear Reduction Factor, with the MSR having only a small effect”; “the individual effect of the MSR on confidence cannot be assessed.” No clean 2014 baseline exists.', src: 'Annex 15, p20/70' },
  { area: 'ets', tag: 'definitional', title: '“Carbon-leakage formula not relevant”', detail: 'EU27 ETS emissions rise from baseline in every scenario (+7.7 to +45.8 Mt), so the conventional leakage rate (foreign rise ÷ domestic fall) simply cannot be computed for this reform.', src: 'Annex 12, p58' },
  { area: 'ets', tag: 'range', title: 'The cap depends on which model', detail: 'PRIMES and POTEnCIA put the 2035 cap anywhere from 560 to 670 Mt for the same 85% target — “the intrinsic uncertainties involved in assessments on the longer-term technological future.”', src: 'Annex 8 I, p11' },
  { area: 'ets', tag: 'range', title: 'CDR cost “highly variable and uncertain”', detail: '“Reliable cost estimates are only available for BECCS”; DACCS spans €185–370/t in 2040. The IA “tries to withhold judgement on cost-competitiveness”, and assumes BECCS cost = BioCCS cost.', src: 'Annex 8 II, p37/46' },
  { area: 'ets', tag: 'assumption', title: 'Removal target “may simply not be met”', detail: 'Under PO3 “as long as removals are not cost competitive … the EU ETS [misses] its net objective. The risk … is that the modelled assumptions would simply not be met.” DACCS never reaches competitiveness in-period.', src: 'Part 1, p30–31' },
  { area: 'ets', tag: 'assumption', title: 'Cost falls “significantly shape the results”', detail: 'Removals fiscal cost “strongly depends on … ETS prices, the ratio of BioCCS to DACCS and timing” and “cannot be fully optimised.” A “conservative approach … would be advisable.”', src: 'Annex 8 II, p46' },
  { area: 'ets', tag: 'data-gap', title: '20 MW figure rests on two countries', detail: 'The headline “up to 28 MtCO₂e / 94,428 installations” comes from French + Polish registries only, “applied as a representative curve for the entire EU” and “driven primarily by the Polish dataset.”', src: 'Annex 12, p62/68' },
  { area: 'ets', tag: 'data-gap', title: 'Waste emissions “complex to estimate”', detail: 'Municipal, hazardous and landfill caps are built on “a buffer for underestimation” and “limited availability of measurement-based data … constraints on harmonised, robust and verified data.”', src: 'Annex 8 I, p18' },
  { area: 'ets', tag: 'contested', title: 'Removals integration is “very divisive”', detail: 'Temporary removals drew “the highest level of strong disagreement”; ~12% of consultation respondents (mainly NGOs) oppose integration outright on environmental-integrity grounds.', src: 'Annex 8 II, p64' },
  { area: 'ets', tag: 'contested', title: 'Free allocation: industry vs NGOs', detail: 'Business favours keeping and improving free allocation; NGOs favour phase-out on “polluter pays”. On the 20 MW threshold and CORSIA quality, groups are “strongly divided”.', src: 'Annex 2 (consultation)' },
  { area: 'ets', tag: 'assumption', title: 'Aviation cap addition “is uncertain”', detail: 'The +148 Mt added for incoming/outgoing international aviation in 2027 rests on a PRIMES estimate the IA calls “uncertain, but it gives an indication.” Small maritime extensions were “ignored”.', src: 'Annex 8 I, p8' },
  { area: 'ets', tag: 'assumption', title: 'Price volatility “cannot be assessed”', detail: 'Modelled prices “rely on uncertain assumptions and may not capture actual short-term price movements”; “within-year price volatility cannot be assessed quantitatively.” “Reality will lie between these two extremes.”', src: 'Part 1, p52–53' },
  { area: 'ets', tag: 'assumption', title: 'IDB abatement is “illustrative”', detail: 'The Bank’s 1,630 Mt figure “will depend on the final IDB design … demand for low-carbon products and project delivery risks”, and the ETS price feeding it “is an assumption … derived from 2040 climate-target modelling.”', src: 'Part 1, p34–35' },
  { area: 'ets', tag: 'assumption', title: 'Refinery output held constant', detail: 'The free-allocation calculation “assumes refinery output remains constant over time”, while “in reality it is expected to decline” — an explicit simplification affecting the leakage budget.', src: 'Annex 12, p21' },
  { area: 'ets', tag: 'definitional', title: 'Net vs gross removals ambiguity', detail: 'CR2 gross outcome is “uncertain and unlimited”; CR3 has “a maximum level of removals … but not a minimum,” so the net can silently equal the gross and miss the target.', src: 'Annex 8 II, p29/53' },
  // — Electrification —
  { area: 'elec', tag: 'definitional', title: 'The 46% target is NOT in this IA', detail: 'SWD(2026) 616 never states “46%” nor names the “Electrification Action Plan.” The ETS IA models electrification only as a consequence (industrial electricity demand, ICC, the IDB) — the headline goal lives in a separate document.', src: 'Part 1 (grep-confirmed absent)' },
  { area: 'elec', tag: 'definitional', title: '“46%” is direct-electricity only', detail: 'The rate counts electricity’s share of final energy; hydrogen and e-fuels (“electrons in disguise”) are additive. The full electron-derived share of 2040 demand is nearer 55–70%.', src: 'Companion analysis' },
  { area: 'elec', tag: 'definitional', title: 'The denominator moves 5–15 points', detail: 'Whether international aviation/shipping and non-energy feedstocks sit in the denominator swings the electrification share by 5–15 pp. Much of the gap between “46 / 47 / 50%” is definitional, not ambition.', src: 'Companion analysis' },
  { area: 'elec', tag: 'range', title: '46% sits below the models', detail: 'The Commission’s own PRIMES run gives ~47–50% for 2040 and the Board’s advice 50–54%. 46% is the floor of the 90%-consistent range, not a stretch — set at the bottom of what the models produce.', src: 'Companion analysis' },
  { area: 'elec', tag: 'assumption', title: 'Electrolyser cost assumed to fall 73%', detail: 'The workbook takes PEM electrolysers from €2,195 to €590/kW to “ultimate” (date unspecified) — the single largest downward assumption enabling indirect electrification. Learning is “policy-driven,” not fixed.', src: 'Tech workbook · Clean_fuels' },
  { area: 'elec', tag: 'assumption', title: 'Industrial heat: “up to 90% by 2035”', detail: 'The IA cites a potential for electrified tech to supply “up to 90% of Europe’s industrial heat demand by 2035” — a technical potential quoted as context, not a modelled projection.', src: 'Part 1, p44' },
  { area: 'elec', tag: 'data-gap', title: 'Demand-growth surprises inflate the ratio', detail: 'Data-centre / AI load could add ~100–300 TWh by 2040, raising the electrification ratio’s denominator without adding any decarbonisation — a surprise the target leaves no margin for.', src: 'Companion analysis' },
];

/* ===================================================================== helpers */
// Deterministic thousands separator (avoids locale-dependent hydration mismatch).
const thou = (n: number) => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const fmt = (n: number) => thou(Math.round(n));

function TagChip({ tag, onClick, active }: { tag: TagKey; onClick?: () => void; active?: boolean }) {
  const t = TAGS[tag];
  const cls = `inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10.5px] font-semibold transition ${active === false ? 'opacity-40' : ''}`;
  const style = { borderColor: t.color, color: t.color, background: active ? `${t.color}12` : 'transparent' };
  const inner = <><span className="inline-block h-1.5 w-1.5 rounded-full" style={{ background: t.color }} />{t.label}</>;
  if (!onClick) return <span className={cls} style={style}>{inner}</span>;
  return <button type="button" onClick={onClick} className={cls} style={style}>{inner}</button>;
}

/* ============================================================ chart: cap lines */
function CapChart() {
  const W = 720, H = 340, M = { l: 46, r: 120, t: 16, b: 34 };
  const PX = W - M.l - M.r, PY = H - M.t - M.b, YMAX = 1000;
  const xs = [M.l, M.l + PX / 2, M.l + PX];
  const x = (i: number) => xs[i];
  const y = (v: number) => M.t + (1 - v / YMAX) * PY;
  const yTicks = [0, 250, 500, 750, 1000];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="EU ETS cap trajectories to 2040 by scenario, million tonnes CO2">
      {yTicks.map((t) => (
        <g key={t}>
          <line x1={M.l} y1={y(t)} x2={M.l + PX} y2={y(t)} stroke={GRID} />
          <text x={M.l - 7} y={y(t) + 3} textAnchor="end" fontSize={10.5} fill="#8fa1a0" className="tabular-nums">{t}</text>
        </g>
      ))}
      {CAP_YEARS.map((yr, i) => (
        <text key={yr} x={x(i)} y={H - M.b + 16} textAnchor="middle" fontSize={11} fill={INK} className="tabular-nums">{yr}</text>
      ))}
      <text transform={`translate(12 ${M.t + PY / 2}) rotate(-90)`} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={INK}>Cap · Mt CO₂ (EEA, gross)</text>
      {/* model band for the chosen 85% trajectory */}
      {(() => {
        const s = CAP_SERIES[1]; if (!s.band) return null;
        const up = s.band.map((b, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(b[1])}`).join(' ');
        const dn = s.band.slice().reverse().map((b, i) => `L${x(s.band!.length - 1 - i)} ${y(b[0])}`).join(' ');
        return <path d={`${up} ${dn} Z`} fill={C_TEAL} opacity={0.1} />;
      })()}
      {CAP_SERIES.map((s) => (
        <g key={s.key}>
          <path d={s.pts.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.5} />
          {s.pts.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={3.6} fill={s.color} stroke="#fff" strokeWidth={1.5} />)}
          <text x={x(2) + 8} y={y(s.pts[2]) + 3.5} fontSize={10.5} fontWeight={700} fill={s.color}>{s.pts[2]}</text>
          <text x={x(2) + 8} y={y(s.pts[2]) + 15} fontSize={9} fill={INK} className="whitespace-pre">{s.key.split(' (')[0]}</text>
        </g>
      ))}
    </svg>
  );
}

/* ================================================= chart: horizontal range bars */
function RangeBars({ rows, max, unit, fmtV }: { rows: { name: string; lo: number; hi: number; avg?: number; color: string; sub?: string }[]; max: number; unit: string; fmtV?: (n: number) => string }) {
  const f = fmtV ?? ((n: number) => fmt(n));
  return (
    <div className="space-y-2.5">
      {rows.map((r) => {
        const lp = (r.lo / max) * 100, wp = ((r.hi - r.lo) / max) * 100;
        const rightEnd = lp + wp;
        const labelLeft = rightEnd > 58; // bar sits far right → put label to its left
        const label = `${f(r.lo)}–${f(r.hi)}${r.avg !== undefined ? ` (${f(r.avg)})` : ''} ${unit}`;
        return (
          <div key={r.name} className="grid grid-cols-[128px_1fr] items-center gap-3">
            <div className="text-[11.5px] leading-tight text-tertiary-dark">{r.name}{r.sub && <span className="block text-[10px] text-tertiary">{r.sub}</span>}</div>
            <div className="relative h-5">
              <div className="absolute inset-y-0 left-0 right-0 top-1/2 h-px -translate-y-1/2 bg-grey-200" />
              <div className="absolute top-1/2 h-2 -translate-y-1/2 rounded-full" style={{ left: `${lp}%`, width: `${Math.max(wp, 0.5)}%`, background: `${r.color}` }} />
              {r.avg !== undefined && <span className="absolute top-1/2 h-3.5 w-[2px] -translate-y-1/2 bg-white" style={{ left: `${(r.avg / max) * 100}%` }} />}
              <span className="absolute top-1/2 -translate-y-1/2 whitespace-nowrap font-mono text-[10px] font-semibold tabular-nums"
                style={labelLeft ? { right: `${100 - lp + 1.5}%`, color: r.color } : { left: `${rightEnd + 1.5}%`, color: r.color }}>
                {label}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ============================================================ chart: value bars */
function ValueBars({ rows, max, unit, refs }: { rows: { name: string; v: number; color: string; hi?: boolean }[]; max: number; unit: string; refs?: { at: number; label: string }[] }) {
  return (
    <div className="relative space-y-1.5">
      {rows.map((r) => (
        <div key={r.name} className="grid grid-cols-[168px_1fr] items-center gap-3">
          <div className={`text-[11.5px] leading-tight ${r.hi ? 'font-bold text-tertiary-dark' : 'text-tertiary-dark'}`}>{r.name}</div>
          <div className="relative h-4">
            <div className="absolute inset-y-0 left-0 rounded-r-[3px]" style={{ width: `${(r.v / max) * 100}%`, background: r.color, opacity: r.hi ? 1 : 0.82 }} />
            <span className="absolute top-1/2 -translate-y-1/2 pl-1.5 font-mono text-[10px] font-semibold tabular-nums text-tertiary-dark" style={{ left: `${(r.v / max) * 100}%` }}>{r.v}{unit}</span>
            {refs?.map((rf) => (
              <span key={rf.label} className="absolute inset-y-0 w-px bg-tertiary/40" style={{ left: `${(rf.at / max) * 100}%` }} title={rf.label} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================================================ chart: learning curves */
function LearnChart() {
  const W = 720, H = 320, M = { l: 40, r: 150, t: 14, b: 30 };
  const PX = W - M.l - M.r, PY = H - M.t - M.b, YMAX = 100;
  const xs = LEARN_YEARS.map((_, i) => M.l + (i / (LEARN_YEARS.length - 1)) * PX);
  const y = (v: number) => M.t + (1 - v / YMAX) * PY;
  // Declutter right-edge labels: enforce a minimum vertical gap.
  const labelY = (() => {
    const items = LEARN.map((s, i) => ({ i, y: y(s.idx[s.idx.length - 1]) })).sort((a, b) => a.y - b.y);
    const GAP = 13;
    for (let k = 1; k < items.length; k++) if (items[k].y - items[k - 1].y < GAP) items[k].y = items[k - 1].y + GAP;
    const out: number[] = [];
    for (const it of items) out[it.i] = it.y;
    return out;
  })();
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Technology overnight cost indexed to 2020, to 2050">
      {[0, 25, 50, 75, 100].map((t) => (
        <g key={t}>
          <line x1={M.l} y1={y(t)} x2={M.l + PX} y2={y(t)} stroke={GRID} />
          <text x={M.l - 6} y={y(t) + 3} textAnchor="end" fontSize={10} fill="#8fa1a0" className="tabular-nums">{t}</text>
        </g>
      ))}
      {LEARN_YEARS.map((yr, i) => <text key={yr} x={xs[i]} y={H - M.b + 15} textAnchor="middle" fontSize={10.5} fill={INK} className="tabular-nums">{yr}</text>)}
      <text transform={`translate(11 ${M.t + PY / 2}) rotate(-90)`} textAnchor="middle" fontSize={10} fontWeight={600} fill={INK}>Cost index (2020 = 100)</text>
      {LEARN.map((s) => (
        <g key={s.key}>
          <path d={s.idx.map((v, i) => `${i === 0 ? 'M' : 'L'}${xs[i]} ${y(v)}`).join(' ')} fill="none" stroke={s.color} strokeWidth={2.2} />
          {s.idx.map((v, i) => <circle key={i} cx={xs[i]} cy={y(v)} r={2.8} fill={s.color} />)}
          <text x={xs[xs.length - 1] + 7} y={labelY[LEARN.indexOf(s)] + 3.5} fontSize={9.5} fontWeight={600} fill={s.color}>{s.key}</text>
        </g>
      ))}
    </svg>
  );
}

/* ==================================================================== sections */
function AreaTag({ children }: { children: React.ReactNode }) {
  return <span className="rounded bg-surface-blue px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-tertiary">{children}</span>;
}
function Src({ children }: { children: React.ReactNode }) {
  return <span className="ml-1 rounded bg-grey-100 px-1 py-px font-mono text-[9.5px] text-tertiary">{children}</span>;
}
function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-grey-200 bg-white p-4 ${className}`}>{children}</div>;
}
function StatCard({ v, u, l, s, c = C_NAVY }: { v: string; u?: string; l: string; s?: string; c?: string }) {
  return (
    <Card className="p-3">
      <p className="font-mono text-lg font-bold tabular-nums" style={{ color: c }}>{v}{u && <span className="text-[11px] font-normal text-tertiary"> {u}</span>}</p>
      <p className="mt-1 text-[11px] leading-snug text-tertiary-dark">{l}</p>
      {s && <p className="mt-0.5 text-[10px] text-tertiary">{s}</p>}
    </Card>
  );
}

/* ======================================================================== page */
export default function ImpactAssessmentPage() {
  const [areaFilter, setAreaFilter] = useState<'all' | 'elec' | 'ets'>('all');
  const [tagFilter, setTagFilter] = useState<TagKey | null>(null);

  const register = useMemo(
    () => REGISTER.filter((r) => (areaFilter === 'all' || r.area === areaFilter) && (tagFilter === null || r.tag === tagFilter)),
    [areaFilter, tagFilter],
  );
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of REGISTER) c[r.tag] = (c[r.tag] ?? 0) + 1;
    return c;
  }, []);

  const nav = [
    { id: 'electrification', label: 'Electrification goal' },
    { id: 'ets-reform', label: 'ETS reform' },
    { id: 'technology', label: 'Technology assumptions' },
    { id: 'register', label: 'Uncertainty register' },
  ];

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 37 · ETS Review · <a href="/beta/ets-review" className="underline hover:text-primary">← least-cost model</a>
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">Inside the impact assessment — assumptions &amp; uncertainty</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            The technical assumptions behind the Commission&apos;s 17 July 2026 package, read out of the underlying impact
            assessment <strong>SWD(2026) 616</strong> and its <strong>technology-assumptions workbook</strong> — split into the
            two areas the Board asked about: the <strong>electrification goal</strong> and the <strong>ETS reform itself</strong>.
            Every figure is page-sourced; the point of the page is the <strong>uncertainty and ambiguity</strong>, flagged
            throughout and collected in a filterable register at the foot.
          </p>
          {/* source strip */}
          <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
            {[
              ['SWD(2026) 616', '5 parts · 958 pp'],
              ['Tech workbook', 'E3Modelling / PRIMES · WSP'],
              ['Published', '17 Jul 2026 · DG CLIMA'],
              ['RSB opinion', 'Positive with comments'],
            ].map(([a, b]) => (
              <span key={a} className="inline-flex items-center gap-1.5 rounded-md border border-grey-200 bg-white px-2 py-1">
                <span className="font-semibold text-tertiary-dark">{a}</span><span className="text-tertiary">{b}</span>
              </span>
            ))}
          </div>
        </section>

        {/* sticky in-page nav */}
        <nav className="sticky top-0 z-10 -mx-4 mb-6 border-y border-grey-200 bg-white/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-lg sm:border">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
            {nav.map((n) => <a key={n.id} href={`#${n.id}`} className="font-semibold text-tertiary hover:text-primary">{n.label}</a>)}
            <span className="ml-auto text-tertiary">{REGISTER.length} flagged uncertainties</span>
          </div>
        </nav>

        {/* uncertainty legend */}
        <section className="mb-8">
          <Card>
            <p className="mb-2 text-[12px] font-bold text-tertiary-dark">How uncertainty is tagged</p>
            <div className="grid gap-x-5 gap-y-1.5 sm:grid-cols-2 lg:grid-cols-3">
              {(Object.keys(TAGS) as TagKey[]).map((k) => (
                <div key={k} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: TAGS[k].color }} />
                  <p className="text-[11px] leading-snug text-tertiary"><span className="font-semibold text-tertiary-dark">{TAGS[k].label}.</span> {TAGS[k].blurb}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* ============================== AREA 1 · ELECTRIFICATION ============================== */}
        <section id="electrification" className="mb-10 scroll-mt-16">
          <div className="mb-1 flex items-center gap-2"><AreaTag>Area 1</AreaTag><h2 className="text-lg font-bold text-tertiary-dark">The electrification goal</h2></div>
          <p className="mb-4 max-w-3xl text-[13px] text-tertiary">
            The honest starting point: the ETS-review IA <strong>does not contain the &ldquo;46% by 2040&rdquo; headline</strong> — that
            target lives in the separate Electrification Action Plan. What SWD(2026) 616 <em>does</em> assume is electrification as a
            <em> consequence</em> of the reform: rising industrial electricity demand, indirect-cost compensation that protects the
            switch, and the Industrial Decarbonisation Bank paying for process-heat electrification.
          </p>

          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Where 46% sits against the 2040 modelling · electricity as % of final energy</p>
              <p className="mb-3 text-[11px] text-tertiary">Historic rate has been flat at ~23%. The Board&apos;s advice is 50–54%. The target is set at the floor of the 90%-consistent range — below the Commission&apos;s own model.</p>
              <ValueBars rows={ELEC_BENCH} max={75} unit="%" refs={[{ at: 23, label: 'historic ~23%' }, { at: 50, label: 'ESABCC 50–54%' }]} />
              <div className="mt-2 flex gap-4 text-[10px] text-tertiary"><span>▏ historic ~23%</span><span>▏ ESABCC advice 50–54%</span></div>
            </Card>
            <div className="grid grid-cols-2 gap-2 self-start">
              <StatCard v="46" u="%" l="Direct-electricity share target (2040)" s="not stated in this IA" c={C_AMBER} />
              <StatCard v="~90" u="%" l="Industrial heat electrifiable by 2035" s="potential, not projection · p44" c={C_TEAL} />
              <StatCard v="−73" u="%" l="Assumed PEM electrolyser cost fall" s="€2,195 → €590/kW · workbook" c={C_TEAL} />
              <StatCard v="55–70" u="%" l="Electron-derived share incl. H₂ / e-fuels" s="indirect is additive" c={C_BLUE} />
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { tag: 'definitional' as TagKey, h: 'Direct-only measure', b: '46% counts electricity at the socket. Hydrogen and e-fuels — “electrons in disguise” — are additive, lifting the true electron share to ~55–70%.' },
              { tag: 'definitional' as TagKey, h: 'The denominator moves', b: 'Include international aviation/shipping and feedstocks and the share falls 5–15 pp. Much of the 46 / 47 / 50% gap is definitional, not ambition.' },
              { tag: 'assumption' as TagKey, h: 'Learning is policy-driven', b: 'The workbook’s steep electrolyser and heat-pump cost falls are “driven by policy assumptions,” not fixed — the enabling cost path is scenario-dependent.' },
            ].map((f) => (
              <Card key={f.h}>
                <div className="mb-1.5"><TagChip tag={f.tag} /></div>
                <p className="text-[12.5px] font-bold text-tertiary-dark">{f.h}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{f.b}</p>
              </Card>
            ))}
          </div>
        </section>

        {/* ============================== AREA 2 · ETS REFORM ============================== */}
        <section id="ets-reform" className="mb-10 scroll-mt-16">
          <div className="mb-1 flex items-center gap-2"><AreaTag>Area 2</AreaTag><h2 className="text-lg font-bold text-tertiary-dark">The ETS reform itself</h2></div>
          <p className="mb-4 max-w-3xl text-[13px] text-tertiary">
            Three policy options share an <strong>identical cap</strong> (85% domestic reduction by 2040) and differ on <em>scope and
            incentives</em>: removals integration, the MSR, free allocation &amp; CBAM, aviation, maritime, waste and the 20 MW
            threshold. The load-bearing numbers — and where the IA hedges them — follow.
          </p>

          {/* cap + budgets */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Cap trajectory to 2040 · the scenario choice</p>
              <p className="mb-2 text-[11px] text-tertiary">Chosen: PRIMES 85% (shaded = PRIMES–POTEnCIA model band). All three policy options run on this cap.</p>
              <CapChart />
            </Card>
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Cumulative carbon budget 2031–40 · Mt</p>
              <p className="mb-3 text-[11px] text-tertiary">Range per option = PRIMES–POTEnCIA spread. Wider scope (PO3) = a bigger budget because more sectors are inside the cap.</p>
              <RangeBars rows={PO_BUDGET.map((p) => ({ name: `${p.po} · ${p.label}`, lo: p.lo, hi: p.hi, color: p.color }))} max={7500} unit="Mt" />
              <div className="mt-4 grid grid-cols-3 gap-2">
                <StatCard v="−4.4→−2.1" u="%" l="LRF range across trajectories" c={C_NAVY} />
                <StatCard v="175–330" u="Mt" l="Removals cap 2031–40" s="15–18% of 2040 gross" c={C_TEAL} />
                <StatCard v="2044" l="Year baseline cap hits zero" c={C_RED} />
              </div>
            </Card>
          </div>

          {/* removals cost */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Carbon-removal unit cost in 2040 · €/t</p>
              <p className="mb-3 text-[11px] text-tertiary">Bar = lower–upper estimate; tick = mid-point. BECCS turns cost-competitive with the allowance price around <strong>2036–2038</strong>; <strong>DACCS does not</strong> within the period.</p>
              <RangeBars rows={CDR_2040} max={400} unit="€/t" />
              <p className="mt-3 text-[11px] leading-snug text-tertiary"><span className="font-semibold text-tertiary-dark">Only BECCS has “reliable cost estimates”</span> — the IA assumes BECCS cost = BioCCS cost and “withholds judgement” on the rest.</p>
            </Card>
            <div className="grid grid-cols-2 gap-2 self-start">
              <StatCard v="€100" u="bn" l="Industrial Decarbonisation Bank" s="10 × €10bn rounds" c={C_BLUE} />
              <StatCard v="1,630" u="Mt" l="IDB cumulative abatement (illustrative)" s="~€60/t avg support · p34" c={C_BLUE} />
              <StatCard v="€4.1→16.8" u="bn" l="Indirect-cost compensation" s="2021–23 avg → 2040, all factors · p32" c={C_AMBER} />
              <StatCard v="€169" u="bn" l="Auction revenue over eval period" s=">€250bn cumulative · p42" c={C_TEAL} />
            </div>
          </div>

          {/* reform building blocks */}
          <div className="mt-4">
            <p className="mb-2 text-[12px] font-bold text-tertiary-dark">Reform building blocks · what changes across PO1 → PO3</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { h: 'Removals', b: 'PO1 = CR4 (public authority buys 170–330 Mt under the cap); PO2 = CR1 (on top of cap); PO3 = CR3 (one-in-one-out).', s: 'Part 1 p23' },
                { h: 'Market Stability Reserve', b: 'PO1 = MSR1 (static, lower thresholds + buffer); PO2/PO3 = MSR3 (dynamic — parameters decline at a fixed rate from 2028).', s: 'Part 1 p23' },
                { h: 'Free allocation & CBAM', b: 'CSCF falls 0.55 (2034) → 0 by 2040; annual budget 316 → 0 M EUAs. PO3 = full phase-out for non-CBAM by 2034.', s: 'Annex 12 p20' },
                { h: 'Aviation', b: 'Baseline 690 Mt (2024). CORSIA structurally exempts ~500 Mt/yr and ends 2035 (coverage then assumed zero). SAF abatement $600–800/t vs offsets $10–40/t.', s: 'Part 1 p36–40' },
                { h: 'Maritime', b: 'PO2 SMAP support = 46 M EUAs over 2031–40; derogations cut ~5 Mt/yr; smaller-vessel inclusion adds +11–15 Mt scope.', s: 'Part 1 p55' },
                { h: '20 MW threshold', b: 'Lowering to zero would add up to 28 Mt / 94,428 installations — but the curve is a French + Polish proxy applied EU-wide.', s: 'Annex 12 p66–69' },
              ].map((b) => (
                <Card key={b.h}>
                  <p className="text-[12.5px] font-bold text-tertiary-dark">{b.h}</p>
                  <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{b.b}</p>
                  <p className="mt-1.5"><Src>{b.s}</Src></p>
                </Card>
              ))}
            </div>
          </div>

          {/* 20MW coverage mini */}
          <div className="mt-4">
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Lowering the 20 MW threshold · coverage gained</p>
              <p className="mb-3 text-[11px] text-tertiary">Emissions brought into scope vs the number of installations it pulls in — a steep administrative trade-off, and the estimate rests on two countries&apos; data.</p>
              <div className="grid gap-2 sm:grid-cols-4">
                {MW20.map((m) => (
                  <div key={m.th} className="rounded-md border border-grey-200 p-2.5">
                    <p className="text-[11px] font-semibold text-tertiary-dark">{m.th}</p>
                    <p className="mt-1 font-mono text-base font-bold tabular-nums" style={{ color: C_AMBER }}>{m.mt}<span className="text-[10px] font-normal text-tertiary"> Mt</span></p>
                    <p className="text-[10px] text-tertiary">{thou(m.inst)} installations</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* ============================== TECHNOLOGY ASSUMPTIONS ============================== */}
        <section id="technology" className="mb-10 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">Technology cost assumptions</h2>
          <p className="mb-4 max-w-3xl text-[13px] text-tertiary">
            The engine under both areas is the <strong>E3Modelling technology workbook</strong> — the cost and efficiency inputs the
            PRIMES modelling runs on. Costs fall by <em>assumption</em> through “learning-by-doing and economies of scale”; the workbook
            itself carries <strong>“From/To” ranges</strong> that are explicit uncertainty bands, and the “ultimate” column has no fixed date.
          </p>
          <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
            <Card>
              <p className="mb-1 text-[12px] font-bold text-tertiary-dark">Assumed cost decline · overnight cost indexed to 2020 = 100</p>
              <LearnChart />
              <p className="mt-1 text-[11px] text-tertiary">Electrolysers (−73%) and batteries (−54%) carry the steepest assumed falls; the fossil reference (gas CCGT) barely moves.</p>
            </Card>
            <div className="space-y-2 self-start">
              <StatCard v="695–1,837" u="€/kW" l="Residential air-water heat pump" s="“ultimate” cost band (From/To) · workbook" c={C_TEAL} />
              <StatCard v="3.8 → 4.9" l="Ground heat-pump efficiency (COP)" s="current → ultimate" c={C_TEAL} />
              <StatCard v="€570–640" u="/t" l="Direct air capture cost by 2040" s="absorption route · workbook" c={C_RED} />
              <StatCard v="4 techs" l="Categories collapsed to one summary row" s="ordinary → advanced → future" c={C_NAVY} />
            </div>
          </div>
        </section>

        {/* ============================== UNCERTAINTY REGISTER ============================== */}
        <section id="register" className="mb-8 scroll-mt-16">
          <h2 className="text-lg font-bold text-tertiary-dark">The uncertainty &amp; ambiguity register</h2>
          <p className="mb-3 max-w-3xl text-[13px] text-tertiary">
            Every load-bearing hedge, range, data gap, contested point and unquantifiable in the package, in one place — filter by area
            and by type. This is where the &ldquo;highlight all the uncertainty&rdquo; brief lands.
          </p>

          {/* filters */}
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <div className="flex gap-1 rounded-md border border-grey-200 p-0.5">
              {(['all', 'elec', 'ets'] as const).map((a) => (
                <button key={a} type="button" onClick={() => setAreaFilter(a)}
                  className={`rounded px-2.5 py-1 text-[11.5px] font-semibold ${areaFilter === a ? 'bg-tertiary-dark text-white' : 'text-tertiary hover:text-primary'}`}>
                  {a === 'all' ? 'All areas' : a === 'elec' ? 'Electrification' : 'ETS reform'}
                </button>
              ))}
            </div>
            <span className="text-tertiary">·</span>
            {(Object.keys(TAGS) as TagKey[]).map((k) => (
              <TagChip key={k} tag={k} onClick={() => setTagFilter(tagFilter === k ? null : k)} active={tagFilter === null ? undefined : tagFilter === k} />
            ))}
            {(tagFilter || areaFilter !== 'all') && (
              <button type="button" onClick={() => { setTagFilter(null); setAreaFilter('all'); }} className="text-[11px] font-semibold text-accent-orange hover:underline">↺ clear</button>
            )}
            <span className="ml-auto text-[11px] text-tertiary">{register.length} of {REGISTER.length}</span>
          </div>

          <div className="grid gap-2.5 md:grid-cols-2">
            {register.map((r) => (
              <div key={r.title} className="rounded-lg border-l-[3px] border border-grey-200 bg-white p-3.5" style={{ borderLeftColor: TAGS[r.tag].color }}>
                <div className="mb-1 flex items-center justify-between gap-2">
                  <TagChip tag={r.tag} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">{r.area === 'elec' ? 'Electrification' : 'ETS reform'}</span>
                </div>
                <p className="text-[13px] font-bold text-tertiary-dark">{r.title}</p>
                <p className="mt-1 text-[12px] leading-relaxed text-tertiary">{r.detail}</p>
                <p className="mt-1.5"><Src>{r.src}</Src></p>
              </div>
            ))}
          </div>
          {register.length === 0 && <p className="py-6 text-center text-[13px] text-tertiary">No entries for this filter.</p>}

          {/* tag counts */}
          <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-tertiary">
            {(Object.keys(TAGS) as TagKey[]).map((k) => (
              <span key={k} className="inline-flex items-center gap-1.5"><span className="inline-block h-2 w-2 rounded-full" style={{ background: TAGS[k].color }} />{TAGS[k].label} · {counts[k] ?? 0}</span>
            ))}
          </div>
        </section>

        {/* method + sources */}
        <section className="mb-4">
          <div className="rounded-md bg-surface-blue px-4 py-3 text-[12px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Method &amp; sources.</strong> A structured reading — not a model — of the Commission&apos;s
            own evidence base: impact assessment <strong>SWD(2026) 616</strong> (5 parts: main body; procedural &amp; consultation
            annexes; Annex 8 cap &amp; removals; Annex 12 stationary installations; Annex 15 evaluation) and the supplementary
            <strong> technology-assumptions workbook</strong> (E3Modelling / PRIMES, WSP). Page references (pNN) point to the printed page
            of the cited part. Where the IA gives a range, the range is shown. The electrification benchmark and the direct/indirect
            framing draw on the companion analysis in <code className="rounded bg-white px-1 py-0.5">ets-review/electrification-46-percent.md</code>.
            For the cost question itself, see the interactive model at <a href="/beta/ets-review" className="underline hover:text-primary">M·37 — ETS Review</a>.
            Published 17 July 2026 by DG CLIMA; RSB positive opinion with comments (17 April 2026).
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
