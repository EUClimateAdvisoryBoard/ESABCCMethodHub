'use client';

/**
 * A5 — Certified today, burnt tomorrow. UI.
 *
 * Exhibits over `./model.ts`:
 *   1. The buffer curve — expected fire-reversed share of credited units
 *      across growth rates, against the registry-practice buffer band.
 *   2. The portfolio dials and their consequences in tonnes.
 *   3. The connection to the policy-gap tracker and the CRCF's own liability
 *      requirement.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DEFAULTS, fmt, mt } from '../../model';
import { AnalysisShell, ANALYSES, C, Caveat, ControlGroup, Finding, R, Section, Slider, Stat } from '../lib';
import { CRCF_DEFAULTS, TYPICAL_BUFFER_PCT, buffer } from './model';

const meta = ANALYSES.find((a) => a.slug === 'crcf-reversal')!;

function BufferCurve({ current, portfolioMha, targeting, horizonYears, severity }: {
  current: number; portfolioMha: number; targeting: number; horizonYears: number; severity: number;
}) {
  const W = 860;
  const H = 320;
  const m = { l: 60, r: 210, t: 20, b: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const gMax = 15;
  const yMax = Math.max(40, buffer(gMax, portfolioMha, targeting, horizonYears, severity).reversedSharePct * 1.1);
  const sx = (g: number) => R(m.l + (g / gMax) * iw);
  const sy = (v: number) => R(m.t + ih - (v / yMax) * ih);

  const pts: string[] = [];
  for (let g = 0; g <= gMax; g += 0.25) {
    pts.push(`${sx(g)},${sy(buffer(g, portfolioMha, targeting, horizonYears, severity).reversedSharePct)}`);
  }
  const cur = buffer(current, portfolioMha, targeting, horizonYears, severity);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Expected fire-reversed share of credited carbon-farming units across burnt-area growth rates">
      {[0, 10, 20, 30, 40].filter((t) => t <= yMax).map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
          <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">{t}%</text>
        </g>
      ))}
      {[0, 2.5, 5, 7.5, 10, 12.5, 15].map((g) => (
        <text key={g} x={sx(g)} y={H - 18} textAnchor="middle" fontSize={9} fill={C.axis}>{g}%</text>
      ))}

      {/* registry practice band */}
      <rect x={m.l} y={sy(TYPICAL_BUFFER_PCT[1])} width={iw}
        height={R(sy(TYPICAL_BUFFER_PCT[0]) - sy(TYPICAL_BUFFER_PCT[1]))} fill={C.plan} fillOpacity={0.1} />
      <text x={m.l + iw + 8} y={sy((TYPICAL_BUFFER_PCT[0] + TYPICAL_BUFFER_PCT[1]) / 2) + 3} fontSize={9.5} fill={C.plan} fontWeight={700}>
        registry buffer practice
      </text>
      <text x={m.l + iw + 8} y={sy((TYPICAL_BUFFER_PCT[0] + TYPICAL_BUFFER_PCT[1]) / 2) + 15} fontSize={9} fill={C.axis}>
        ~{TYPICAL_BUFFER_PCT[0]}-{TYPICAL_BUFFER_PCT[1]}% of issued units
      </text>

      <polyline points={pts.join(' ')} fill="none" stroke={C.fire} strokeWidth={2.4} />

      <circle cx={sx(current)} cy={sy(cur.reversedSharePct)} r={5} fill={C.fire} stroke="#fff" strokeWidth={1.5} />
      <text x={sx(current)} y={sy(cur.reversedSharePct) - 10} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.fire} className="tabular-nums">
        {fmt(current, 1)}%/yr → {fmt(cur.reversedSharePct, 0)}% reversed
      </text>

      <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={11} fontSize={9} fill={C.axis}>
        expected fire-reversed share of credited units over the crediting horizon, % — fire risk ONLY, before any other reversal cause
      </text>
    </svg>
  );
}

export default function CrcfReversalPage() {
  const [growthPct, setGrowthPct] = useState(DEFAULTS.growthPct);
  const [portfolioMha, setPortfolioMha] = useState(CRCF_DEFAULTS.portfolioMha);
  const [targeting, setTargeting] = useState(CRCF_DEFAULTS.targeting);
  const [horizonYears, setHorizonYears] = useState(CRCF_DEFAULTS.horizonYears);
  const [severity, setSeverity] = useState(CRCF_DEFAULTS.severity);

  const b = useMemo(
    () => buffer(growthPct, portfolioMha, targeting, horizonYears, severity),
    [growthPct, portfolioMha, targeting, horizonYears, severity]
  );

  return (
    <AnalysisShell
      meta={meta}
      headline={
        <>
          The certificates are permanent paperwork on <span className="text-accent-red">flammable land.</span>
        </>
      }
      lede={
        <>
          The Carbon Removals and Carbon Farming framework (Regulation (EU) 2024/3012) is how the EU intends to scale
          the land removals its 2030 and 2040 sink assumptions depend on — and it requires reversal risk to be covered
          by liability mechanisms such as collective buffer pools. This analysis sizes that buffer for fire alone,
          using the parent module&apos;s burnt-area scenarios: what fraction of certified units does fire destroy in
          expectation before drought, beetles or practice failure claim a single tonne?
        </>
      }
    >
      <Section
        eyebrow="The finding"
        title="At the default scenario, fire alone consumes most of a standard buffer pool"
        lede=""
      >
        <Finding>
          A {fmt(portfolioMha, 0)} Mha certified forest portfolio credited over {fmt(horizonYears, 0)} years loses{' '}
          <strong>{fmt(b.reversedSharePct, 0)}% of its credited units to fire in expectation</strong> at{' '}
          {fmt(growthPct, 1)}%/yr burnt-area growth — <strong>{mt(b.reversedMt)}</strong> of the {mt(b.creditedMt, 0)}{' '}
          credited. Registry practice holds buffers on the order of {TYPICAL_BUFFER_PCT[0]}-{TYPICAL_BUFFER_PCT[1]}% for{' '}
          <em>all</em> reversal causes combined; fire alone claims most of that band at the module&apos;s default
          scenario and exceeds it entirely at the high-growth presets. Buffer pools sized on the fire regime of the
          2010s will be quietly under-provisioned for the regime the certificates are being issued into — and every
          under-provisioned reversal lands back on the same 310 Mt target the certificates were meant to serve.
        </Finding>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={`${fmt(b.reversedSharePct, 0)}%`} label="expected units reversed by fire" sub="over the crediting horizon, at your dials" tone="fire" />
          <Stat value={mt(b.reversedMt)} label="tonnes that come back" sub={`of ${mt(b.creditedMt, 0)} credited on the portfolio`} tone="fire" />
          <Stat value={`${fmt(b.pFirstPct, 2)}→${fmt(b.pLastPct, 2)}%`} label="annual burn probability, first → last year" sub="portfolio-weighted, rises with the growth dial" />
          <Stat value={`${TYPICAL_BUFFER_PCT[0]}-${TYPICAL_BUFFER_PCT[1]}%`} label="registry buffer practice (all causes)" sub="order-of-magnitude scale reference — see caveats" tone="plan" />
        </div>
      </Section>

      <Section
        eyebrow="The dials"
        title="Portfolio, exposure, horizon, severity"
        lede="Every assumption is a slider. The defaults are stated in the model file with their reasoning; none is an empirical EU statistic, because the empirical statistic does not exist yet — that absence is itself the policy point."
      >
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ControlGroup title="Fire scenario" accent>
            <Slider label="Burnt-area growth after 2025" hint="The parent module's shared dial."
              value={growthPct} min={0} max={15} step={0.5} unit="%/yr" std={DEFAULTS.growthPct} onChange={setGrowthPct} />
          </ControlGroup>
          <ControlGroup title="Portfolio">
            <Slider label="Certified forest area" hint="EU carbon-farming forest portfolio being credited."
              value={portfolioMha} min={0.5} max={20} step={0.5} unit="Mha" std={CRCF_DEFAULTS.portfolioMha} onChange={setPortfolioMha} />
            <Slider label="Crediting horizon" hint="Years of monitoring/liability per unit."
              value={horizonYears} min={5} max={30} step={1} unit="yr" std={CRCF_DEFAULTS.horizonYears} onChange={setHorizonYears} />
          </ControlGroup>
          <ControlGroup title="Risk shape">
            <Slider label="Siting factor vs EU average" hint="1.0 = certified land burns like average EU forest. Mediterranean afforestation suggests higher."
              value={targeting} min={0.5} max={3} step={0.1} unit="×" std={CRCF_DEFAULTS.targeting} onChange={setTargeting} />
            <Slider label="Reversal severity when burnt" hint="Share of credited stock actually lost in a burn (partial combustion, salvage, soils)."
              value={severity} min={0.3} max={1} step={0.05} display={(v) => `${Math.round(v * 100)}%`} std={CRCF_DEFAULTS.severity} onChange={setSeverity} />
          </ControlGroup>
        </div>
      </Section>

      <Section
        eyebrow="Exhibit"
        title="The buffer curve against registry practice"
        lede="The red curve is the expected fire-reversed share of credited units at each growth rate, with your portfolio dials. The blue band is what buffer pools typically hold — for every reversal cause combined. Where the curve enters the band, fire is consuming the whole insurance; where it exits the top, the insurance is arithmetically insufficient before any other risk is counted."
      >
        <BufferCurve current={growthPct} portfolioMha={portfolioMha} targeting={targeting} horizonYears={horizonYears} severity={severity} />
      </Section>

      <Section eyebrow="The policy connection" title="Why this belongs in the Policy Gap report" lede="">
        <div className="grid gap-4 md:grid-cols-2">
          <Caveat title="It connects two existing findings">
            The Method Hub&apos;s policy-gap tracker already carries{' '}
            <Link href="/beta/policy-gaps" className="font-semibold text-primary hover:underline">
              lulucf-carbon-farming-uptake
            </Link>{' '}
            (carbon-farming uptake too slow) — and this module carries the fire exposure. Put together: the instrument
            meant to rebuild the sink is being deployed slowest, on the land where what is deployed burns fastest. That
            is a policy-gap finding neither piece shows alone.
          </Caveat>
          <Caveat title="The CRCF's liability rules are the lever">
            Regulation (EU) 2024/3012 requires reversal liability but leaves buffer sizing to certification
            methodologies now being written. Sizing them on backward-looking fire statistics embeds the 2010s fire
            regime into 2040s certificates. A forward-looking, scenario-based buffer — exactly what this page computes —
            is a concrete, technical recommendation the report can make.
          </Caveat>
          <Caveat title="Expectation, not tail">
            These are portfolio expectations. Fire years are correlated continent-wide (2017, 2022, 2025), so a real
            buffer needs variance margin on top: in a 2025-like season the portfolio loses several years of expected
            reversals at once. Every number on this page is therefore a floor.
          </Caveat>
          <Caveat title="What would falsify it">
            If certified carbon farming concentrates in low-risk Atlantic and continental forests (siting factor
            &lt; 1), fire's buffer claim halves — at the price of conceding that the sink strategy avoids the
            Mediterranean, where the restoration need is greatest. The dial lets you make that trade explicitly.
          </Caveat>
        </div>
      </Section>
    </AnalysisShell>
  );
}
