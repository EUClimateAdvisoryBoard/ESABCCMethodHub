'use client';

/**
 * A6 — The protected land burns first. UI.
 *
 * Exhibits over `./model.ts`:
 *   1. The burn-rate comparison — inside vs outside the network, 2025.
 *   2. The cumulative exposure track — how much of the network burns by 2040
 *      at the chosen dials, against the Nature Restoration Regulation's
 *      milestones.
 *   3. The implementation-gap framing.
 */

import { useMemo, useState } from 'react';
import { DEFAULTS, fmt, ha, mt } from '../../model';
import { AnalysisShell, ANALYSES, C, Caveat, ControlGroup, Finding, R, Section, Slider, Stat } from '../lib';
import {
  N2K_AREA_MHA,
  N2K_BURNT_2025_HA,
  N2K_DEFAULTS,
  NRL_MILESTONES,
  TOTAL_BURNT_2025_HA,
  burnRateRatio2025,
  n2k,
} from './model';

const meta = ANALYSES.find((a) => a.slug === 'natura2000')!;

function RateChart() {
  const r = burnRateRatio2025();
  const W = 860;
  const H = 190;
  const m = { l: 260, r: 120, t: 30, b: 40 };
  const iw = W - m.l - m.r;
  const max = r.inside * 1.15;
  const sx = (v: number) => R((v / max) * iw);
  const rows = [
    { label: 'Inside Natura 2000', v: r.inside, color: C.fire, note: `${fmt(N2K_BURNT_2025_HA)} ha on ~${N2K_AREA_MHA} Mha` },
    { label: 'Outside the network', v: r.outside, color: C.planLight, note: `${fmt(TOTAL_BURNT_2025_HA - N2K_BURNT_2025_HA)} ha on the remaining land` },
  ];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Share of land burnt in 2025, inside versus outside Natura 2000">
      {rows.map((row, i) => {
        const y = m.t + i * 52;
        return (
          <g key={row.label}>
            <text x={m.l - 12} y={y + 17} textAnchor="end" fontSize={11.5} fontWeight={600} fill={C.ink}>{row.label}</text>
            <rect x={m.l} y={y} width={Math.max(3, sx(row.v))} height={26} rx={3} fill={row.color} />
            <text x={m.l + sx(row.v) + 8} y={y + 17} fontSize={11} fontWeight={700} fill={row.color} className="tabular-nums">
              {fmt(row.v * 100, 2)}% burnt
            </text>
            <text x={m.l - 12} y={y + 32} textAnchor="end" fontSize={9} fill={C.axis}>{row.note}</text>
          </g>
        );
      })}
      <text x={m.l} y={H - 10} fontSize={9} fill={C.axis}>
        share of land area burnt in 2025 — the network burnt at ≈{fmt(r.ratio, 1)}× the rate of unprotected land
      </text>
    </svg>
  );
}

function ExposureChart({ growthPct, sharePct }: { growthPct: number; sharePct: number }) {
  const W = 860;
  const H = 300;
  const m = { l: 60, r: 230, t: 20, b: 40 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const years: number[] = [];
  for (let y = 2026; y <= 2050; y++) years.push(y);
  const vals = years.map((y) => n2k(y, growthPct, sharePct).cumShareOfNetworkPct);
  const yMax = Math.max(...vals, 10) * 1.1;
  const sx = (y: number) => R(m.l + ((y - 2026) / (2050 - 2026)) * iw);
  const sy = (v: number) => R(m.t + ih - (v / yMax) * ih);
  const path = years.map((y, i) => `${sx(y)},${sy(vals[i])}`).join(' ');
  const v2040 = vals[years.indexOf(2040)];

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Cumulative share of the Natura 2000 network burnt since 2026, at the chosen dials">
      {[0, 5, 10, 15, 20, 25].filter((t) => t <= yMax).map((t) => (
        <g key={t}>
          <line x1={m.l} x2={m.l + iw} y1={sy(t)} y2={sy(t)} stroke={C.grid} strokeWidth={1} />
          <text x={m.l - 7} y={sy(t) + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">{t}%</text>
        </g>
      ))}
      {[2026, 2030, 2035, 2040, 2045, 2050].map((y) => (
        <text key={y} x={sx(y)} y={H - 18} textAnchor="middle" fontSize={9} fill={C.axis}>{y}</text>
      ))}

      {/* NRL milestone markers */}
      {NRL_MILESTONES.filter((ms) => ms.year <= 2050).map((ms) => (
        <g key={ms.year}>
          <line x1={sx(ms.year)} x2={sx(ms.year)} y1={m.t} y2={m.t + ih} stroke={C.sink} strokeWidth={1} strokeDasharray="3 3" strokeOpacity={0.6} />
          <text x={sx(ms.year)} y={m.t + 10} textAnchor="middle" fontSize={8.5} fill={C.sink} fontWeight={700}>
            NRL {ms.year}
          </text>
        </g>
      ))}

      <polyline points={path} fill="none" stroke={C.fire} strokeWidth={2.4} />
      <circle cx={sx(2040)} cy={sy(v2040)} r={4.5} fill={C.fire} stroke="#fff" strokeWidth={1.5} />
      <text x={sx(2040) + 8} y={sy(v2040) - 6} fontSize={10} fontWeight={700} fill={C.fire} className="tabular-nums">
        {fmt(v2040, 1)}% of the network by 2040
      </text>

      <line x1={m.l} x2={m.l + iw} y1={m.t + ih} y2={m.t + ih} stroke={C.axis} strokeWidth={1} />
      <text x={m.l} y={11} fontSize={9} fill={C.axis}>
        cumulative burnt area inside Natura 2000 since 2026, as % of the ~{N2K_AREA_MHA} Mha terrestrial network (repeat burns counted)
      </text>
      <text x={m.l + iw + 8} y={m.t + ih / 2} fontSize={9.5} fill={C.sink} fontWeight={700}>
        green lines: Nature Restoration
      </text>
      <text x={m.l + iw + 8} y={m.t + ih / 2 + 13} fontSize={9} fill={C.axis}>
        Regulation milestones — restoration
      </text>
      <text x={m.l + iw + 8} y={m.t + ih / 2 + 25} fontSize={9} fill={C.axis}>
        obligations rising on land that is
      </text>
      <text x={m.l + iw + 8} y={m.t + ih / 2 + 37} fontSize={9} fill={C.axis}>
        burning at the red line&apos;s pace
      </text>
    </svg>
  );
}

export default function Natura2000Page() {
  const [growthPct, setGrowthPct] = useState(DEFAULTS.growthPct);
  const [sharePct, setSharePct] = useState(N2K_DEFAULTS.sharePct);
  const [recMult, setRecMult] = useState(N2K_DEFAULTS.recoveryMultiplier);

  const r = useMemo(() => burnRateRatio2025(), []);
  const res40 = useMemo(() => n2k(2040, growthPct, sharePct, recMult), [growthPct, sharePct, recMult]);
  const res30 = useMemo(() => n2k(2030, growthPct, sharePct, recMult), [growthPct, sharePct, recMult]);

  return (
    <AnalysisShell
      meta={meta}
      headline={
        <>
          In 2025, protected land burnt at <span className="text-accent-red">{fmt(r.ratio, 1)}× the rate</span> of
          everywhere else. The restoration law is betting on that land.
        </>
      }
      lede={
        <>
          The parent module records that 39% of the 2025 burnt area — {ha(N2K_BURNT_2025_HA)} — fell inside Natura
          2000, and does nothing with the number. This analysis does: the network covers only ~19% of EU land, so its
          2025 burn rate was nearly three times the rate outside. The same sites carry the Nature Restoration
          Regulation&apos;s rising obligations and a disproportionate share of the sink strategy. This is the
          implementation-gap story of the module: the EU&apos;s most protected land is its least protected from fire.
        </>
      }
    >
      <Section
        eyebrow="The finding"
        title="Restoration obligations and fire exposure are being assigned to the same hectares"
        lede=""
      >
        <Finding>
          At {fmt(growthPct, 1)}%/yr and the observed 39% Natura share, <strong>{ha(res40.cumN2kBurntHa)}</strong> of
          protected land burns cumulatively between 2026 and 2040 — <strong>{fmt(res40.cumShareOfNetworkPct, 1)}% of the
          entire terrestrial network</strong> (repeat burns included), carrying{' '}
          <strong>{mt(res40.lossOnN2kMt)}</strong> of the 2040 excess sink loss ({mt(res40.lossOnN2kSlowMt)} if
          protected habitats recover {fmt(recMult, 1)}× slower). Over the same window the Nature Restoration Regulation
          requires restoration measures on ≥20% of EU land by 2030 and 60% of poor-condition habitats restored by 2040 —
          obligations that concentrate on exactly these sites. Neither the LULUCF Regulation nor the NRL requires a
          site&apos;s restoration plan to address fire risk. Two laws are writing cheques on the same burning land, and
          no instrument reconciles them.
        </Finding>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={`${fmt(r.ratio, 1)}×`} label="2025 burn rate, inside vs outside" sub={`${fmt(r.inside * 100, 2)}% of the network vs ${fmt(r.outside * 100, 2)}% of unprotected land`} tone="fire" />
          <Stat value={ha(res30.cumN2kBurntHa)} label="protected land burnt 2026-30" sub="cumulative at your dials" tone="fire" />
          <Stat value={fmt(res40.cumShareOfNetworkPct, 1) + '%'} label="of the network burnt by 2040" sub="repeat burns counted — some sites burn twice" tone="fire" />
          <Stat value={mt(res40.lossOnN2kMt)} label="of the 2040 sink loss on protected land" sub={`rises to ${mt(res40.lossOnN2kSlowMt)} with slower habitat recovery`} />
        </div>
      </Section>

      <Section eyebrow="Exhibit 1" title="The 2025 burn-rate gap" lede="One year, one product, one division. The asymmetry is not subtle.">
        <RateChart />
      </Section>

      <Section
        eyebrow="The dials"
        title="Share, growth, recovery"
        lede="The Natura share dial defaults to the observed 2025 value; only one year of this statistic has been published at EU level, which is itself worth noting in the report."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <ControlGroup title="Fire scenario" accent>
            <Slider label="Burnt-area growth after 2025" hint="The parent module's shared dial."
              value={growthPct} min={0} max={15} step={0.5} unit="%/yr" std={DEFAULTS.growthPct} onChange={setGrowthPct} />
          </ControlGroup>
          <ControlGroup title="Exposure">
            <Slider label="Natura 2000 share of burnt area" hint="2025 observed: 39%. No EU-level series exists yet."
              value={sharePct} min={20} max={55} step={1} unit="%" std={N2K_DEFAULTS.sharePct} onChange={setSharePct} />
          </ControlGroup>
          <ControlGroup title="Recovery">
            <Slider label="Recovery multiplier on protected habitats" hint="High-nature-value systems (old growth, priority habitats) return slowest."
              value={recMult} min={1} max={3} step={0.1} unit="×" std={N2K_DEFAULTS.recoveryMultiplier} onChange={setRecMult} />
          </ControlGroup>
        </div>
      </Section>

      <Section
        eyebrow="Exhibit 2"
        title="Cumulative network exposure vs the restoration timetable"
        lede="The red line is how much of the network burns; the green verticals are when the Nature Restoration Regulation's obligations bite. The two schedules are converging on the same hectares from opposite directions."
      >
        <ExposureChart growthPct={growthPct} sharePct={sharePct} />
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {NRL_MILESTONES.map((ms) => (
            <div key={ms.year} className="rounded-lg border border-secondary/30 bg-surface-teal p-3">
              <div className="font-mono text-[15px] font-bold text-secondary-dark">{ms.year}</div>
              <div className="mt-1 text-[11.5px] leading-snug text-tertiary-dark">{ms.text}</div>
            </div>
          ))}
        </div>
      </Section>

      <Section eyebrow="Honesty" title="Weight-bearing assumptions" lede="">
        <div className="grid gap-4 md:grid-cols-2">
          <Caveat title="One observed year">
            The 39% share is a single season&apos;s statistic (2025, JRC). It was an Iberian-dominated year, and Iberia
            is Natura-dense, so the share could regress in other years — or worsen, since fire-prone habitat types are
            over-represented in the network by design. Treat the dial's default as observed, not as a trend; the report
            recommendation is precisely that this statistic be published as a series.
          </Caveat>
          <Caveat title="Repeat burns are counted">
            The cumulative exposure track counts hectares burnt, not unique hectares — Mediterranean sites can burn
            twice in the window, and repeat burns are ecologically worse, not better, for both restoration and carbon.
            The network share should be read as fire pressure, not as a map fraction.
          </Caveat>
          <Caveat title="Management constraint, not management blame">
            The point is not that protection causes fire. It is that protection concentrates fuel-management
            constraints (permitting for grazing, clearing, prescribed burning — the A3 toolkit) on the land with the
            highest fire pressure, and that neither the NRL nor the LULUCF Regulation closes that loop. That is an
            implementation gap in the report's own taxonomy.
          </Caveat>
          <Caveat title="Area figures to one significant figure">
            The network area (~76.6 Mha terrestrial) and EU land area (~410 Mha) are EEA-barometer-scale figures used
            to one significant figure; the burn-rate ratio is robust to their uncertainty (it stays between 2.5× and
            3× for any plausible values).
          </Caveat>
        </div>
      </Section>
    </AnalysisShell>
  );
}
