'use client';

/**
 * A7 — Which growth rate is climate-consistent? UI.
 *
 * One exhibit does the work: the parent module's growth dial drawn as an
 * axis, with the climate-consistent band (from Turco et al. 2018, mapped
 * carefully to the 2025-2050 window), the module presets, and the observed
 * 2021-25 trend all placed on it. The gap between the bands IS the finding.
 */

import { useMemo, useState } from 'react';
import { GROWTH_SCENARIOS, fmt } from '../../model';
import { AnalysisShell, ANALYSES, C, Caveat, ControlGroup, Finding, R, Section, Slider, Stat } from '../lib';
import {
  DEFAULT_GWL_2050,
  GWL_NOW,
  RECENT_TREND_PCT,
  TURCO_POINTS,
  impliedGrowth,
} from './model';

const meta = ANALYSES.find((a) => a.slug === 'fwi-scenarios')!;

function DialChart({ gwl2050 }: { gwl2050: number }) {
  const g = impliedGrowth(gwl2050);
  const W = 860;
  const H = 260;
  const m = { l: 40, r: 40, t: 56, b: 70 };
  const iw = W - m.l - m.r;
  const gMax = 15;
  const sx = (v: number) => R(m.l + (Math.min(v, gMax) / gMax) * iw);
  const axisY = H - m.b;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="The module's growth dial with the climate-consistent range, the presets and the recent trend marked on it">
      {/* the dial axis */}
      <line x1={m.l} x2={m.l + iw} y1={axisY} y2={axisY} stroke={C.axis} strokeWidth={1.5} />
      {[0, 2.5, 5, 7.5, 10, 12.5, 15].map((v) => (
        <g key={v}>
          <line x1={sx(v)} x2={sx(v)} y1={axisY} y2={axisY + 6} stroke={C.axis} strokeWidth={1} />
          <text x={sx(v)} y={axisY + 18} textAnchor="middle" fontSize={9} fill={C.axis} className="tabular-nums">{v}%</text>
        </g>
      ))}
      <text x={m.l + iw / 2} y={axisY + 36} textAnchor="middle" fontSize={9.5} fill={C.axis}>
        burnt-area growth, %/yr — the parent module&apos;s central dial
      </text>

      {/* climate-consistent band */}
      <rect x={sx(g.loPct)} y={axisY - 46} width={Math.max(3, sx(g.hiPct) - sx(g.loPct))} height={46}
        fill={C.sink} fillOpacity={0.25} />
      <line x1={sx(g.loPct)} x2={sx(g.loPct)} y1={axisY - 46} y2={axisY} stroke={C.sink} strokeWidth={1.5} />
      <line x1={sx(g.hiPct)} x2={sx(g.hiPct)} y1={axisY - 46} y2={axisY} stroke={C.sink} strokeWidth={1.5} />
      <text x={sx((g.loPct + g.hiPct) / 2)} y={axisY - 52} textAnchor="middle" fontSize={10} fontWeight={700} fill={C.sink}>
        mean climate signal at {fmt(gwl2050, 1)} °C by 2050: {fmt(g.loPct, 1)}–{fmt(g.hiPct, 1)}%/yr
      </text>

      {/* module presets */}
      {GROWTH_SCENARIOS.map((s) => (
        <g key={s.pct}>
          <circle cx={sx(s.pct)} cy={axisY - 8} r={3.5} fill={C.plan} />
        </g>
      ))}
      <text x={sx(5)} y={m.t - 28} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.plan}>
        module default 5%/yr
      </text>
      <line x1={sx(5)} x2={sx(5)} y1={m.t - 22} y2={axisY - 12} stroke={C.plan} strokeWidth={1} strokeDasharray="3 3" />

      {/* recent trend */}
      <line x1={sx(RECENT_TREND_PCT)} x2={sx(RECENT_TREND_PCT)} y1={m.t - 22} y2={axisY} stroke={C.fire} strokeWidth={2} />
      <text x={sx(RECENT_TREND_PCT)} y={m.t - 28} textAnchor="middle" fontSize={9.5} fontWeight={700} fill={C.fire}>
        2021-25 OLS trend ≈ {fmt(RECENT_TREND_PCT, 1)}%/yr
      </text>

      {/* preset labels below */}
      <text x={sx(0)} y={axisY - 14} textAnchor="middle" fontSize={8} fill={C.plan}>0</text>
      <text x={sx(2.5)} y={axisY - 14} textAnchor="middle" fontSize={8} fill={C.plan}>2.5</text>
      <text x={sx(8)} y={axisY - 14} textAnchor="middle" fontSize={8} fill={C.plan}>8</text>
      <text x={sx(12)} y={axisY - 14} textAnchor="middle" fontSize={8} fill={C.plan}>12</text>
    </svg>
  );
}

export default function FwiScenariosPage() {
  const [gwl2050, setGwl2050] = useState(DEFAULT_GWL_2050);
  const g = useMemo(() => impliedGrowth(gwl2050), [gwl2050]);

  return (
    <AnalysisShell
      meta={meta}
      headline={
        <>
          The climate signal says <span className="text-accent-red">{fmt(g.loPct, 1)}–{fmt(g.hiPct, 1)}%/yr.</span> The
          last five years say {fmt(RECENT_TREND_PCT, 0)}%. The dial's default sits between — on purpose, and now with
          receipts.
        </>
      }
      lede={
        <>
          The parent module refuses to bless a growth rate, and it is right to — but the sceptic&apos;s question
          (&quot;which setting does the science support?&quot;) deserves a sourced answer. This analysis maps the
          published Mediterranean climate-fire projections (Turco et al. 2018, Nature Communications) onto the
          module&apos;s own dial, adjusting for the warming already realised, and places every preset on the resulting
          scale. The result calibrates the dial in both directions: the mean climate signal alone supports the low
          presets, and rules out the &quot;fires stop getting worse&quot; case as anything but a management triumph.
        </>
      }
    >
      <Section
        eyebrow="The finding"
        title="The default is defensible only as climate-plus-society; the zero preset needs active success"
        lede=""
      >
        <Finding>
          Converting the Turco et al. projections to the module&apos;s 2025-2050 window — after crediting the warming
          the fire regime has already absorbed — the <strong>mean climate signal implies
          ≈{fmt(g.loPct, 1)}–{fmt(g.hiPct, 1)}%/yr</strong> at {fmt(gwl2050, 1)} °C-by-2050 (up to
          ≈{fmt(impliedGrowth(3).hiPct, 1)}%/yr on a 3 °C path). Three consequences for the module: the{' '}
          <strong>2.5%/yr preset is the climate-consistent central case</strong>, not the conservative one; the{' '}
          <strong>default 5%/yr implicitly assumes fuel accumulation, abandonment and ignition trends amplify the
          climate signal</strong> — which the 2021-25 record ({fmt(RECENT_TREND_PCT, 0)}%/yr trend) suggests they do;
          and the <strong>0%/yr preset is not a neutral baseline but a claim that management fully cancels
          warming</strong>. The gap between ~1.5% and ~13% is the honest uncertainty, and naming it is the
          calibration the report needs.
        </Finding>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={`${fmt(g.loPct, 1)}–${fmt(g.hiPct, 1)}`} unit="%/yr" label="climate-consistent dial range" sub={`mean signal only, at ${fmt(gwl2050, 1)} °C by 2050`} tone="sink" />
          <Stat value="5" unit="%/yr" label="the module's default" sub="climate signal + socio-ecological amplification" tone="plan" />
          <Stat value={fmt(RECENT_TREND_PCT, 1)} unit="%/yr" label="the 2021-25 trend" sub="five noisy points, one record — the module calls it a stress case, correctly" tone="fire" />
          <Stat value={`+${fmt((multiplierRatioDisplay(gwl2050) - 1) * 100, 0)}%`} label="burnt area 2050 vs today" sub="the remaining climb of the Turco curve at your warming dial (upper bound)" />
        </div>
      </Section>

      <Section
        eyebrow="One dial"
        title="Warming reached by 2050"
        lede="The only new assumption this page adds. Everything else is the published band and arithmetic."
      >
        <div className="max-w-md">
          <ControlGroup title="Warming path" accent>
            <Slider
              label="Global warming level in 2050"
              hint={`Current level ≈ ${GWL_NOW} °C. A 1.5 °C-consistent path and a current-policies path (~2 °C+ by mid-century at the high end) bracket the dial.`}
              value={gwl2050} min={1.4} max={3} step={0.1} unit="°C" std={DEFAULT_GWL_2050}
              onChange={setGwl2050}
            />
          </ControlGroup>
        </div>
      </Section>

      <Section
        eyebrow="The exhibit"
        title="Every number this module uses, on one axis"
        lede="Green band: what the mean climate signal supports at your warming dial. Blue dots: the module's presets. Red line: the observed 2021-25 trend. The dial's honest range is the distance between green and red."
      >
        <DialChart gwl2050={gwl2050} />
      </Section>

      <Section
        eyebrow="The sources"
        title="The anchor, and the careful part of the mapping"
        lede=""
      >
        <div className="overflow-x-auto rounded-lg border border-grey-200">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-grey-200 bg-grey-50 text-left text-[10px] uppercase tracking-wide text-tertiary">
                <th className="px-3 py-2">Global warming level</th>
                <th className="px-3 py-2 text-right">Burned-area change vs 1971-2000</th>
                <th className="px-3 py-2">Source</th>
              </tr>
            </thead>
            <tbody>
              {TURCO_POINTS.filter((p) => p.gwl >= 1.5).map((p) => (
                <tr key={p.gwl} className="border-b border-grey-100 last:border-0">
                  <td className="px-3 py-1.5 font-semibold text-tertiary-dark">{p.gwl} °C</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    +{Math.round((p.lo - 1) * 100)}% to +{Math.round((p.hi - 1) * 100)}%
                  </td>
                  <td className="px-3 py-1.5 text-tertiary">
                    Turco et al. 2018, Nat. Commun. 9:3821 — Mediterranean Europe, model variants with/without
                    antecedent-climate (fuel) effects
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-4 max-w-text text-[12.5px] leading-relaxed text-tertiary">
          The mapping credits the warming already absorbed: the Turco baseline period (1971-2000) sits ~0.35 °C above
          pre-industrial and today&apos;s regime at ~{GWL_NOW} °C, so only the multiplier <em>remaining</em> between
          now and 2050 is converted to a compound rate. Skipping that step — comparing the full percentage against
          today — would roughly double the implied dial setting, and is the standard way such comparisons go wrong.
          The JRC&apos;s PESETA IV wildfire study points the same direction qualitatively: fire danger rises across
          Europe under all warming levels, most strongly in the south, with more high-danger days even under 1.5 °C.
        </p>
      </Section>

      <Section eyebrow="Honesty" title="Limits of the calibration" lede="">
        <div className="grid gap-4 md:grid-cols-2">
          <Caveat title="Mediterranean numbers, EU-wide dial">
            The Turco projections cover Mediterranean Europe. Most EU burnt area is Mediterranean, so the mapping is
            serviceable for the EU aggregate — but it understates relative growth in the newly flammable centre and
            north (Germany&apos;s and Sweden&apos;s 2018 seasons), where small bases can grow fast.
          </Caveat>
          <Caveat title="Mean signal, not variance">
            Climate-fire models project the mean regime. The module&apos;s targets arithmetic is damaged by bad
            <em> years</em>, and variance is rising faster than means. A climate-consistent mean of 1.5%/yr is fully
            compatible with another 2025 every few years — which is what the parent module&apos;s live tracker is for.
          </Caveat>
          <Caveat title="The residual is the finding, not an error">
            The distance between the climate band and the 13%/yr observed trend is not model disagreement to be
            averaged away: it measures how much of the recent worsening is fuel, abandonment, ignition and noise
            rather than mean climate. Naming that residual as a research gap — who owns fuel-load trend data for the
            EU? — is a concrete recommendation for the report.
          </Caveat>
          <Caveat title="Clamped beyond 3 °C">
            The multiplier band is not extrapolated past the last published point; the dial simply clamps. Nothing on
            this page should be read as a projection of extreme warming paths.
          </Caveat>
        </div>
      </Section>
    </AnalysisShell>
  );
}

/** Upper-bound remaining multiplier for the stat card. */
function multiplierRatioDisplay(gwl2050: number): number {
  return impliedGrowth(gwl2050).ratioHi;
}
