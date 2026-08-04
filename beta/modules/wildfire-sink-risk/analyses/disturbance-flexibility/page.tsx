'use client';

/**
 * A2 — The paper wedge. UI.
 *
 * Three exhibits over `./model.ts`:
 *   1. The two ledgers — what the atmosphere sees vs what compliance can be
 *      relieved of, at the chosen growth rate.
 *   2. The availability chart — the modelled 2030 Union sink against the
 *      310 Mt condition and the 20 Mt evidence valve, across growth rates.
 *   3. The fine print — six verified provisions that define the mechanism.
 */

import { useMemo, useState } from 'react';
import { DEFAULTS, fmt, mt, SINK_TARGET_2030 } from '../../model';
import { AnalysisShell, ANALYSES, C, Caveat, ControlGroup, Finding, R, Section, Slider, Stat } from '../lib';
import { FINE_PRINT, MECHANISM_CAP_MT, SURPLUS_CARVE_MT, summary, voidThresholdPct, wedge } from './model';

const meta = ANALYSES.find((a) => a.slug === 'disturbance-flexibility')!;

/** Exhibit 1 — the two ledgers, side by side. */
function LedgersChart({ compensable, never }: { compensable: number; never: number }) {
  const W = 860;
  const H = 300;
  const m = { l: 60, r: 30, t: 40, b: 46 };
  const ih = H - m.t - m.b;
  const total = compensable + never;
  const max = Math.max(total, 1) * 1.15;
  const sy = (v: number) => R(m.t + ih - (v / max) * ih);
  const barW = 150;
  const x1 = m.l + 110; // atmosphere bar
  const x2 = m.l + 470; // compliance bar

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Cumulative 2026-2030 excess fire impact: the atmosphere's ledger versus what the compliance ledger can be relieved of">
      {/* atmosphere: everything, stacked */}
      <text x={x1 + barW / 2} y={m.t - 18} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>
        The atmosphere&apos;s ledger
      </text>
      <rect x={x1} y={sy(total)} width={barW} height={R(sy(never) - sy(total))} fill={C.fire} />
      <rect x={x1} y={sy(never)} width={barW} height={R(sy(0) - sy(never))} fill={C.planLight} />
      <text x={x1 + barW / 2} y={sy(total) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.fire} className="tabular-nums">
        {mt(total)}
      </text>

      {/* compliance: only the emission terms can leave */}
      <text x={x2 + barW / 2} y={m.t - 18} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.ink}>
        What compliance can shed
      </text>
      <rect x={x2} y={sy(compensable)} width={barW} height={R(sy(0) - sy(compensable))} fill={C.fire} fillOpacity={0.85} />
      <text x={x2 + barW / 2} y={sy(compensable) - 6} textAnchor="middle" fontSize={11} fontWeight={700} fill={C.fire} className="tabular-nums">
        {mt(compensable)}
      </text>

      {/* the wedge that has no exit */}
      <line x1={x1 + barW + 12} x2={x2 - 12} y1={sy(never / 2)} y2={sy(never / 2)} stroke={C.plan} strokeWidth={1.2} strokeDasharray="5 3" />
      <text x={(x1 + barW + x2) / 2} y={sy(never / 2) - 8} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.plan}>
        foregone removals: no exclusion route
      </text>
      <text x={(x1 + barW + x2) / 2} y={sy(never / 2) + 14} textAnchor="middle" fontSize={9.5} fill={C.axis} className="tabular-nums">
        {mt(never)} stays in the accounts — and in the air
      </text>

      {/* legend */}
      <g transform={`translate(${m.l}, ${H - 26})`}>
        <rect width={11} height={11} rx={2} fill={C.fire} />
        <text x={16} y={9.5} fontSize={10} fill={C.ink}>combustion + decomposition — excludable above the Annex VI background, with evidence</text>
      </g>
      <g transform={`translate(${m.l}, ${H - 10})`}>
        <rect width={11} height={11} rx={2} fill={C.planLight} />
        <text x={16} y={9.5} fontSize={10} fill={C.ink}>foregone removals — not an emission, so no Annex VI route exists for it</text>
      </g>
    </svg>
  );
}

/** Exhibit 2 — availability of Article 13b across growth rates. */
function AvailabilityChart({ current }: { current: number }) {
  const W = 860;
  const H = 320;
  const m = { l: 60, r: 220, t: 20, b: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const gMax = 15;
  const lo = 270;
  const hi = 315;
  const sx = (g: number) => R(m.l + (g / gMax) * iw);
  const sy = (v: number) => R(m.t + ih - ((v - lo) / (hi - lo)) * ih);

  const pts: { g: number; sink: number }[] = [];
  for (let g = 0; g <= gMax; g += 0.25) pts.push({ g, sink: wedge(g).sink2030Mt });
  const path = pts.map((p) => `${sx(p.g)},${sy(Math.max(lo, p.sink))}`).join(' ');
  const cur = wedge(current);
  const voidG = pts.find((p) => SINK_TARGET_2030 - p.sink > SURPLUS_CARVE_MT)?.g;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Modelled 2030 Union sink against the Article 13b availability conditions, across growth rates">
      {[270, 280, 290, 300, 310].map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
          <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">{t}</text>
        </g>
      ))}
      {[0, 2.5, 5, 7.5, 10, 12.5, 15].map((g) => (
        <text key={g} x={sx(g)} y={H - 18} textAnchor="middle" fontSize={9} fill={C.axis}>{g}%</text>
      ))}

      {/* zones */}
      <rect x={m.l} y={sy(SINK_TARGET_2030)} width={iw} height={R(sy(SINK_TARGET_2030 - SURPLUS_CARVE_MT) - sy(SINK_TARGET_2030))}
        fill={C.ember} fillOpacity={0.12} />
      <rect x={m.l} y={sy(SINK_TARGET_2030 - SURPLUS_CARVE_MT)} width={iw} height={R(sy(lo) - sy(SINK_TARGET_2030 - SURPLUS_CARVE_MT))}
        fill={C.fire} fillOpacity={0.1} />

      <line x1={m.l} x2={m.l + iw} y1={sy(SINK_TARGET_2030)} y2={sy(SINK_TARGET_2030)} stroke={C.plan} strokeWidth={1.5} strokeDasharray="6 3" />
      <text x={m.l + iw + 8} y={sy(SINK_TARGET_2030) + 3} fontSize={9.5} fill={C.plan} fontWeight={700}>
        310 Mt — condition (c) intact
      </text>
      <line x1={m.l} x2={m.l + iw} y1={sy(SINK_TARGET_2030 - SURPLUS_CARVE_MT)} y2={sy(SINK_TARGET_2030 - SURPLUS_CARVE_MT)}
        stroke={C.fire} strokeWidth={1.5} strokeDasharray="6 3" />
      <text x={m.l + iw + 8} y={sy(SINK_TARGET_2030 - SURPLUS_CARVE_MT) + 3} fontSize={9.5} fill={C.fire} fontWeight={700}>
        290 Mt — 20 Mt valve exhausted
      </text>

      <polyline points={path} fill="none" stroke={C.ink} strokeWidth={2.2} />

      {/* current dial */}
      <circle cx={sx(cur.growthPct)} cy={sy(Math.max(lo, cur.sink2030Mt))} r={5} fill={C.fire} stroke="#fff" strokeWidth={1.5} />
      <text x={sx(cur.growthPct)} y={sy(Math.max(lo, cur.sink2030Mt)) - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.fire} className="tabular-nums">
        {fmt(cur.growthPct, 1)}%/yr → {fmt(cur.sink2030Mt, 0)} Mt
      </text>

      {voidG !== undefined && (
        <text x={sx(voidG)} y={m.t + 12} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.fire}>
          void above ≈{fmt(voidG, 1)}%/yr
        </text>
      )}

      <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={11} fontSize={9} fill={C.axis}>
        modelled 2030 Union sink (MtCO₂e) vs burnt-area growth — on the reference path that reaches 310 Mt absent excess fire
      </text>
    </svg>
  );
}

export default function DisturbanceFlexibilityPage() {
  const [growthPct, setGrowthPct] = useState(DEFAULTS.growthPct);
  const w = useMemo(() => wedge(growthPct), [growthPct]);
  const s = useMemo(() => summary(), []);
  const voidG = useMemo(() => voidThresholdPct(), []);

  const mechanismLabel =
    w.mechanism === 'available' ? 'available' : w.mechanism === 'evidence-dependent' ? 'depends on the 20 Mt valve' : 'void';

  return (
    <AnalysisShell
      meta={meta}
      headline={
        <>
          A bad fire year can be neutralised on paper. <span className="text-accent-red">The atmosphere keeps the
          carbon either way.</span>
        </>
      }
      lede={
        <>
          The LULUCF Regulation lets Member States exclude natural-disturbance emissions above a 2001-2020 background
          level, and — for 2026-30 — draw on a 178 Mt compensation mechanism. This analysis runs the module&apos;s
          arithmetic through that legal machinery, quoted provision by provision from the Official Journal, and finds
          two structural problems: the part of the fire loss that compounds has no exclusion route at all, and the
          compensation mechanism switches itself off in exactly the scenarios where fire is the reason it is needed.
        </>
      }
    >
      <Section
        eyebrow="The finding"
        title="Relief for the visible loss, silence on the compounding one — and a self-cancelling insurance policy"
        lede=""
      >
        <Finding>
          At the default 5%/yr, the 2026-30 window contains <strong>{mt(s.compensableAt5)}</strong> of excess fire
          emissions that could, with evidence, leave the compliance accounts — none of which leaves the atmosphere —
          while <strong>{mt(s.neverCompensableAt5)}</strong> of foregone removals has no exclusion route and simply
          erodes the accounts from inside. Meanwhile the same fire pushes the modelled Union sink{' '}
          <strong>{mt(s.shortfallAt5)}</strong> below the 310 Mt condition that Article 13b requires for its own
          availability: on the reference path the mechanism is already <strong>{s.mechanismAt5 === 'void' ? 'void' : 'hanging on the 20 Mt evidence valve'}</strong> at
          5%/yr, and void outright above ≈{voidG !== null ? fmt(voidG, 1) : '—'}%/yr. An accounting flexibility
          designed for fire, that fire itself disables — and that in no scenario removes a single tonne from the air.
        </Finding>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={mt(w.compensableMt)} label="excludable with evidence, 2026-30" sub="excess combustion + decomposition above the Annex VI background" tone="fire" />
          <Stat value={mt(w.neverCompensableMt)} label="no exclusion route, 2026-30" sub="foregone removals — not an emission, so Annex VI never sees it" tone="plan" />
          <Stat value={fmt(w.shareOfMechanismPct, 0)} unit="%" label="of the 178 Mt mechanism" sub="that the excludable amount alone would claim" />
          <Stat value={mechanismLabel} label="Article 13b on the reference path" sub={`Union shortfall ${mt(w.unionShortfallMt)} vs the 20 Mt valve`} tone={w.mechanism === 'available' ? 'sink' : 'fire'} />
        </div>

        <div className="mt-6 max-w-md">
          <ControlGroup title="Projection" accent>
            <Slider
              label="Burnt-area growth after 2025"
              hint="The parent module's dial. Everything on this page moves with it."
              value={growthPct} min={0} max={15} step={0.5} unit="%/yr" std={DEFAULTS.growthPct}
              onChange={setGrowthPct}
            />
          </ControlGroup>
        </div>
      </Section>

      <Section
        eyebrow="Exhibit 1"
        title="Two ledgers, one fire"
        lede="Cumulative excess fire impact 2026-30 at the chosen growth rate. The left bar is physical reality. The right bar is the maximum the compliance ledger could be relieved of — if every Member State clears every Annex VI evidence hurdle. The difference between the bars never had a legal exit; the right bar's contents never left the air."
      >
        <LedgersChart compensable={w.compensableMt} never={w.neverCompensableMt} />
      </Section>

      <Section
        eyebrow="Exhibit 2"
        title="The mechanism voids itself"
        lede={`Article 13b's condition (c) requires the Union-wide 310 Mt target to be met in 2030 for any compensation to flow, with at most a ${SURPLUS_CARVE_MT} Mt evidence-based carve-in from unused 2021-25 surplus. On the module's reference path — which reaches 310 Mt exactly when fire stays at its long-run load — any excess fire eats the condition, and the mechanism dies before the worst scenarios arrive.`}
      >
        <AvailabilityChart current={growthPct} />
        <p className="mt-4 max-w-text text-[12.5px] leading-relaxed text-tertiary">
          Read the chart honestly: the void threshold is a property of the reference path, not a prediction. If
          afforestation and harvest trends overachieve, the Union can absorb more fire before condition (c) breaks; the
          2023-24 inventory outturns (198-212 Mt against a path needing 310 by 2030) point the other way. What the
          chart shows is structural: the mechanism&apos;s availability is anti-correlated with the need for it.
        </p>
      </Section>

      <Section
        eyebrow="Exhibit 3"
        title="The fine print, verified"
        lede="Each provision below was checked against the Official Journal text of Regulation (EU) 2023/839 (OJ L 107, 21.4.2023). References are to the amended Regulation (EU) 2018/841."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {FINE_PRINT.map((f) => (
            <div key={f.ref} className="rounded-lg border border-grey-200 bg-white p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h3 className="text-[13px] font-bold text-tertiary-dark">{f.title}</h3>
                <span className="shrink-0 rounded bg-grey-100 px-1.5 py-0.5 font-mono text-[9.5px] text-tertiary">{f.ref}</span>
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-tertiary">{f.body}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Why it matters" title="From arithmetic to a Policy Gap finding" lede="">
        <div className="grid gap-4 md:grid-cols-2">
          <Caveat title="The inconsistency, stated plainly">
            The Regulation treats above-background fire as an act of God to be accounted away, while the target it
            protects is a physical quantity of carbon. Every tonne excluded under Annex VI or compensated under
            Article 13b widens the gap between the ledger the EU reports and the atmosphere the 2040 target is written
            against — the same gap this module prices in its parent page.
          </Caveat>
          <Caveat title="What this is not">
            This is not an argument against disturbance provisions — without them, Member States would carry unlimited
            liability for weather. It is an argument that the provisions transfer risk rather than reduce it, and that
            nothing in the Regulation converts the (mandatory!) vulnerability-reduction precondition into funded
            prevention. Analysis A3 prices what that prevention would cost.
          </Caveat>
        </div>
      </Section>
    </AnalysisShell>
  );
}
