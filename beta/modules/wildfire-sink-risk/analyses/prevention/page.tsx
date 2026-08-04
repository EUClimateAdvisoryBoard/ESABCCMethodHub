'use client';

/**
 * A3 — The cheapest removal not being bought. UI.
 *
 * Two framings over `./model.ts`:
 *   1. Marginal — €/tCO2 implied by (cost per treated hectare × leverage)
 *      divided by the lifecycle carbon of an avoided hectare.
 *   2. Programme — hold growth at 0% instead of 5% with fuel treatment, and
 *      compare the bill against buying the same tonnes as engineered removals.
 */

import { useMemo, useState } from 'react';
import { ENGINEERED_COST_EUR_T, fmt, ha, mt } from '../../model';
import { AnalysisShell, ANALYSES, C, Caveat, ControlGroup, Finding, R, Section, Slider, Stat } from '../lib';
import {
  COST_ANCHORS,
  DEFAULT_COST_PER_HA,
  DEFAULT_LEVERAGE,
  lifecycleTco2PerHa,
  marginal,
  programme,
} from './model';

const meta = ANALYSES.find((a) => a.slug === 'prevention')!;

/** The comparison chart: implied prevention €/t against the removals band. */
function CostChart({ eurPerT }: { eurPerT: number }) {
  const W = 860;
  const H = 220;
  const m = { l: 60, r: 40, t: 30, b: 46 };
  const iw = W - m.l - m.r;
  const max = 700;
  const sx = (v: number) => R(m.l + (Math.min(v, max) / max) * iw);

  const rows = [
    { label: 'Prevention (your dials)', lo: eurPerT, hi: eurPerT, color: C.sink, solid: true },
    { label: 'Engineered removals, 2040-50 projections', lo: 200, hi: 600, color: C.fire, solid: false },
  ];
  const rowH = 54;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Implied cost of prevention per tonne of CO2 compared with engineered removals">
      {[0, 100, 200, 300, 400, 500, 600, 700].map((t) => (
        <g key={t}>
          <line x1={sx(t)} x2={sx(t)} y1={m.t} y2={H - m.b} stroke={C.grid} strokeWidth={1} />
          <text x={sx(t)} y={H - 28} textAnchor="middle" fontSize={9} fill={C.axis} className="tabular-nums">€{t}</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const y = m.t + i * rowH + 8;
        return (
          <g key={r.label}>
            <text x={m.l} y={y - 4} fontSize={10.5} fontWeight={600} fill={C.ink}>{r.label}</text>
            {r.solid ? (
              <>
                <rect x={m.l} y={y} width={Math.max(3, sx(r.lo) - m.l)} height={16} rx={2} fill={r.color} />
                <text x={sx(r.lo) + 8} y={y + 12} fontSize={10.5} fontWeight={700} fill={r.color} className="tabular-nums">
                  €{fmt(r.lo, 0)}/t
                </text>
              </>
            ) : (
              <>
                <rect x={sx(r.lo)} y={y} width={Math.max(3, sx(r.hi) - sx(r.lo))} height={16} rx={2} fill={r.color} fillOpacity={0.35} />
                <line x1={sx(ENGINEERED_COST_EUR_T)} x2={sx(ENGINEERED_COST_EUR_T)} y1={y - 3} y2={y + 19} stroke={r.color} strokeWidth={2.5} />
                <text x={sx(r.hi) + 8} y={y + 12} fontSize={10.5} fill={r.color} className="tabular-nums">
                  €200-600/t · module uses €{ENGINEERED_COST_EUR_T}
                </text>
              </>
            )}
          </g>
        );
      })}
      <text x={m.l} y={H - 8} fontSize={9} fill={C.axis}>
        €/tCO₂ — prevention cost is (€/treated ha × leverage) ÷ {fmt(lifecycleTco2PerHa(), 1)} tCO₂ lifecycle carbon per avoided hectare
      </text>
    </svg>
  );
}

export default function PreventionPage() {
  const [costPerHa, setCostPerHa] = useState(DEFAULT_COST_PER_HA);
  const [leverage, setLeverage] = useState(DEFAULT_LEVERAGE);

  const perHa = lifecycleTco2PerHa();
  const marg = useMemo(() => marginal(costPerHa, leverage), [costPerHa, leverage]);
  const prog = useMemo(() => programme(costPerHa, leverage), [costPerHa, leverage]);

  return (
    <AnalysisShell
      meta={meta}
      headline={
        <>
          Every avoided hectare keeps ~{fmt(perHa, 0)} tonnes in the ground.{' '}
          <span className="text-accent-red">Nobody is pricing that.</span>
        </>
      }
      lede={
        <>
          The parent module prices the carbon a burnt hectare costs and prices engineered removals at
          €{ENGINEERED_COST_EUR_T}/t. This analysis supplies the missing third number — what it costs to keep the
          hectare from burning — from published European fuel-management costs, and divides. Even with leverage
          assumptions deliberately chosen against the result, prevention comes out an order of magnitude cheaper per
          tonne than the removals the EU would otherwise have to buy. Under Article 13b of the amended LULUCF
          Regulation, vulnerability reduction is already a legal precondition for disturbance flexibility; no EU
          instrument funds it as climate mitigation.
        </>
      }
    >
      <Section
        eyebrow="The finding"
        title="At defaults, prevention costs a tenth of engineered removals per tonne"
        lede=""
      >
        <Finding>
          One hectare kept unburnt avoids <strong>{fmt(perHa, 1)} tCO₂</strong> over the fire-and-recovery cycle
          (combustion {fmt(42, 0)} + decomposition {fmt(10.5, 1)} + foregone removals {fmt(25, 0)}). At
          €{fmt(costPerHa, 0)}/ha of treatment and {fmt(leverage, 0)} treated hectares per avoided burnt hectare, the
          implied abatement cost is <strong>€{fmt(marg.eurPerT, 0)}/tCO₂ — {fmt(marg.cheaperThanRemovalsBy, 1)}×
          cheaper</strong> than the €{ENGINEERED_COST_EUR_T}/t engineered removals the parent module prices the 2050
          gap with. As a programme: holding burnt-area growth at 0% instead of 5% saves{' '}
          <strong>{mt(prog.sinkSavedMt)}</strong> of sink in 2040 for <strong>€{fmt(prog.costBnYr, 1)} bn/yr</strong> of
          treatment — against <strong>€{fmt(prog.removalsCostBnYr, 0)} bn/yr</strong> to buy the same tonnes back as
          removals. Prevention is the cheapest carbon removal the EU is not buying.
        </Finding>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={`€${fmt(marg.eurPerT, 0)}`} unit="/tCO₂" label="implied cost of prevention" sub="at your dials, lifecycle carbon basis" tone="sink" />
          <Stat value={`${fmt(marg.cheaperThanRemovalsBy, 1)}×`} label="cheaper than engineered removals" sub={`vs the module's €${ENGINEERED_COST_EUR_T}/t (2040-50 projections span €200-600/t)`} tone="sink" />
          <Stat value={`€${fmt(prog.costBnYr, 1)} bn`} unit="/yr" label="programme cost in 2040" sub={`treating ${ha(prog.treatedHa2040)} to avoid ${ha(prog.avoidedHa2040)} of burn`} />
          <Stat value={`€${fmt(prog.removalsCostBnYr, 0)} bn`} unit="/yr" label="the removals alternative" sub={`buying the same ${mt(prog.sinkSavedMt)} back with DACCS-class removals`} tone="fire" />
        </div>
      </Section>

      <Section
        eyebrow="The dials"
        title="Both assumptions, exposed"
        lede="Treatment cost comes from published European sources. Leverage — treated hectares per avoided burnt hectare — is the honest weak link of the whole analysis, so it is the biggest dial, defaulted against the finding."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <ControlGroup title="Cost side" accent>
            <Slider
              label="Treatment cost"
              hint="Grazing €60-80/ha (LIFE LANDSCAPE FIRE); prescribed burning sits low; mechanical clearing ~€1,000/ha."
              value={costPerHa} min={50} max={1500} step={25} unit="€/ha/yr" std={DEFAULT_COST_PER_HA}
              onChange={setCostPerHa}
            />
          </ControlGroup>
          <ControlGroup title="Effectiveness side" accent>
            <Slider
              label="Leverage — treated ha per avoided burnt ha"
              hint="Treatments are strategic, decay over time, and some fires overrun them. 1:1 would be heroic; 10:1 is deliberately conservative; push it to 30:1 and see if the story dies."
              value={leverage} min={2} max={40} step={1} unit=": 1" std={DEFAULT_LEVERAGE}
              onChange={setLeverage}
            />
          </ControlGroup>
        </div>
        <div className="mt-4 overflow-x-auto rounded-lg border border-grey-200">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-grey-200 bg-grey-50 text-left text-[10px] uppercase tracking-wide text-tertiary">
                <th className="px-3 py-2">Published cost anchor</th>
                <th className="px-3 py-2 text-right">€/ha/yr</th>
                <th className="px-3 py-2">Source</th>
                <th className="px-3 py-2 text-right">Implied €/t at your leverage</th>
              </tr>
            </thead>
            <tbody>
              {COST_ANCHORS.map((a) => (
                <tr key={a.label} className="border-b border-grey-100 last:border-0">
                  <td className="px-3 py-1.5 font-semibold text-tertiary-dark">{a.label}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{a.low}–{a.high}</td>
                  <td className="px-3 py-1.5 text-tertiary">{a.source}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums text-secondary-dark">
                    €{fmt((a.low * leverage) / perHa, 0)}–{fmt((a.high * leverage) / perHa, 0)}/t
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section
        eyebrow="The comparison"
        title="Prevention vs the alternative the module already prices"
        lede="The parent module closes the 2050 gap with €400/t engineered removals because at net zero there is no cheaper option left. There is — a decade earlier, on the fire side of the ledger."
      >
        <CostChart eurPerT={marg.eurPerT} />
        <p className="mt-4 max-w-text text-[12.5px] leading-relaxed text-tertiary">
          Even the most expensive corner of the dials — €1,500/ha at 40:1 leverage — lands near
          €{fmt((1500 * 40) / perHa, 0)}/t, inside the engineered-removals band. The default corner is
          €{fmt(marg.eurPerT, 0)}/t. The asymmetry survives every assumption this page can produce, which is the point:
          the ranking, not the exact number, is the finding.
        </p>
      </Section>

      <Section eyebrow="Honesty" title="What this analysis is not claiming" lede="">
        <div className="grid gap-4 md:grid-cols-2">
          <Caveat title="Leverage is not a measured quantity">
            No EU-wide empirical estimate exists for hectares-treated-per-hectare-saved; it varies by landscape, fire
            weather and placement. That is why it is a slider spanning 2-40 rather than a number, and why the finding
            is stated as an order-of-magnitude ranking. A real programme design would need region-level effectiveness
            evidence — which is itself a research gap worth naming in the report.
          </Caveat>
          <Caveat title="Prevention buys more than carbon">
            The €/t here counts only the sink. The same hectares protect homes, lives, air quality and habitats —
            benefits that dwarf the carbon term in bad years (Spain's 2026 firefighting bill alone has been reported
            at up to €3.3 bn). Counting carbon only biases the comparison against prevention, and it still wins.
          </Caveat>
          <Caveat title="Not every hectare can be treated">
            The programme framing treats ~{ha(prog.treatedHa2040)} in 2040 — a large but not absurd share of the EU's
            ~160 Mha of forest, concentrated where fire is. Scaling grazing and prescribed burning to that level has
            real constraints (labour, smoke windows, Natura 2000 permitting) that a €/ha number does not capture.
          </Caveat>
          <Caveat title="Undiscounted carbon">
            The {fmt(perHa, 1)} t/ha lifecycle figure adds carbon over two decades without discounting, consistent
            with the parent model. Discounting future foregone removals at 3-5% would trim the figure by roughly a
            quarter — nowhere near enough to close a 10× gap.
          </Caveat>
        </div>
      </Section>
    </AnalysisShell>
  );
}
