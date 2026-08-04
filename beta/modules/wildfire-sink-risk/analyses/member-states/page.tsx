'use client';

/**
 * A1 — Whose sink burns? UI.
 *
 * Thin layer over `./model.ts`. Three exhibits:
 *   1. The asymmetry chart — each country's share of EU fire vs its share of
 *      the EU's 310 Mt Annex IIa obligation. The whole analysis in one image.
 *   2. Per-country feasibility cards — the Annex IIa target, the fire loss at
 *      the dial, and the loss as a share of the required improvement.
 *   3. The full 27-row table, because a per-country claim must be checkable
 *      per country.
 */

import { useMemo, useState } from 'react';
import { DEFAULTS, fmt, ha, mt } from '../../model';
import { AnalysisShell, ANALYSES, C, Caveat, ControlGroup, Finding, R, Section, Slider, Stat } from '../lib';
import { countryRows, summary } from './model';

const meta = ANALYSES.find((a) => a.slug === 'member-states')!;

/** Countries shown in the charts/cards — every state with meaningful fire. */
const CHART_MIN_SHARE = 0.4; // % of EU fire

function AsymmetryChart({ rows }: { rows: ReturnType<typeof countryRows> }) {
  const shown = rows
    .filter((r) => r.fireSharePct >= CHART_MIN_SHARE || ['SWE', 'FIN', 'POL', 'DEU', 'FRA'].includes(r.c.iso3))
    .sort((a, b) => b.fireSharePct - a.fireSharePct);
  const W = 860;
  const rowH = 26;
  const m = { l: 92, r: 60, t: 30, b: 30 };
  const H = shown.length * rowH + m.t + m.b;
  const cw = (W - m.l - m.r) / 2 - 30; // width of each half
  const cx = m.l + cw + 30; // divider
  const maxPct = Math.max(...shown.map((r) => Math.max(r.fireSharePct, r.sinkSharePct)), 30);
  const sw = (v: number) => R((v / maxPct) * cw);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Each country's share of EU wildfire versus its share of the EU 2030 sink obligation">
      <text x={cx - 30 - cw} y={16} fontSize={10} fontWeight={700} fill={C.fire}>
        share of EU-27 burnt area, 2021-25 →
      </text>
      <text x={cx + 30 + cw} y={16} textAnchor="end" fontSize={10} fontWeight={700} fill={C.plan}>
        ← share of the 310 Mt Annex IIa obligation, 2030
      </text>
      {shown.map((r, i) => {
        const y = m.t + i * rowH;
        const sinkNeg = r.sinkSharePct < 0;
        return (
          <g key={r.c.iso3}>
            <text x={cx} y={y + rowH / 2 + 3.5} textAnchor="middle" fontSize={10.5} fontWeight={600} fill={C.ink}>
              {r.c.iso3}
            </text>
            {/* fire share grows leftwards from the divider */}
            <rect x={cx - 26 - sw(r.fireSharePct)} y={y + 6} width={sw(r.fireSharePct)} height={rowH - 12} rx={2} fill={C.fire} />
            <text x={cx - 30 - sw(r.fireSharePct)} y={y + rowH / 2 + 3} textAnchor="end" fontSize={9} fill={C.axis} className="tabular-nums">
              {r.fireSharePct.toFixed(1)}%
            </text>
            {/* sink share grows rightwards */}
            <rect x={cx + 26} y={y + 6} width={sw(Math.max(0, r.sinkSharePct))} height={rowH - 12} rx={2}
              fill={sinkNeg ? C.ember : C.plan} fillOpacity={sinkNeg ? 0.7 : 1} />
            <text x={cx + 30 + sw(Math.max(0, r.sinkSharePct))} y={y + rowH / 2 + 3} fontSize={9} fill={C.axis} className="tabular-nums">
              {sinkNeg ? 'net source allowed' : `${r.sinkSharePct.toFixed(1)}%`}
            </text>
          </g>
        );
      })}
      <line x1={cx - 26} x2={cx - 26} y1={m.t} y2={H - m.b} stroke={C.grid} strokeWidth={1} />
      <line x1={cx + 26} x2={cx + 26} y1={m.t} y2={H - m.b} stroke={C.grid} strokeWidth={1} />
      <text x={m.l - 80} y={H - 8} fontSize={9} fill={C.axis}>
        fire: EFFIS per-country estimates, 2021-25 mean · obligation: Annex IIa, Reg. (EU) 2023/839 · countries above {CHART_MIN_SHARE}% of EU fire, plus SWE FIN POL DEU FRA for contrast
      </text>
    </svg>
  );
}

function LossChart({ rows }: { rows: ReturnType<typeof countryRows> }) {
  const shown = rows.filter((r) => Math.abs(r.loss2030) > 0.05).sort((a, b) => b.loss2030 - a.loss2030).slice(0, 12);
  const W = 860;
  const rowH = 28;
  const m = { l: 92, r: 210, t: 24, b: 30 };
  const H = shown.length * rowH + m.t + m.b;
  const iw = W - m.l - m.r;
  const max = Math.max(...shown.map((r) => r.loss2030), 0.1);
  const sx = (v: number) => R((Math.max(0, v) / max) * iw);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Excess sink loss in 2030 by member state at the chosen growth rate">
      {shown.map((r, i) => {
        const y = m.t + i * rowH;
        return (
          <g key={r.c.iso3}>
            <text x={m.l - 8} y={y + rowH / 2 + 3} textAnchor="end" fontSize={10.5} fill={C.ink}>{r.c.name}</text>
            <rect x={m.l} y={y + 6} width={Math.max(1.5, sx(r.loss2030))} height={rowH - 12} rx={2} fill={C.fire} />
            <text x={m.l + sx(r.loss2030) + 7} y={y + rowH / 2 + 3} fontSize={9.5} fill={C.axis} className="tabular-nums">
              {mt(r.loss2030)} {r.improvementMt > 0.05 ? `· ${fmt(r.lossPctOfImprovement, 0)}% of its required improvement` : ''}
            </text>
          </g>
        );
      })}
      <text x={m.l} y={14} fontSize={9} fill={C.axis}>
        excess sink loss in 2030, MtCO₂e, above each country&apos;s own 2006-24 fire load — charged against its Annex IIa numbers
      </text>
    </svg>
  );
}

export default function MemberStatesPage() {
  const [growthPct, setGrowthPct] = useState(DEFAULTS.growthPct);
  const rows = useMemo(() => countryRows(growthPct), [growthPct]);
  const s = useMemo(() => summary(), []);

  const cards = rows
    .filter((r) => r.improvementMt > 0.05 && r.loss2030 > 0.05)
    .sort((a, b) => b.lossPctOfImprovement - a.lossPctOfImprovement)
    .slice(0, 8);

  const euLoss30 = rows.reduce((sum, r) => sum + r.loss2030, 0);
  const top4 = [...rows].sort((a, b) => b.fireSharePct - a.fireSharePct).slice(0, 4);

  return (
    <AnalysisShell
      meta={meta}
      headline={
        <>
          The fire is in the south. <span className="text-accent-red">The sink obligation is not.</span>
        </>
      }
      lede={
        <>
          The parent module treats the EU as one carbon pool — its own documentation calls that the model&apos;s top
          structural limitation. Here the same cohort machinery runs 27 times, once per Member State on that country&apos;s
          own EFFIS fire record, and the result is charged against the country&apos;s legally-binding 2030 LULUCF number
          from Annex IIa of Regulation (EU) 2023/839. Four countries carry {fmt(top4.reduce((x, r) => x + r.fireSharePct, 0), 0)}%
          of the EU&apos;s fire but only {fmt(top4.reduce((x, r) => x + r.sinkSharePct, 0), 0)}% of its sink obligation —
          and because the 2040 target is EU-wide and net, the shortfall they cannot stop lands on everyone.
        </>
      }
    >
      <Section
        eyebrow="The finding"
        title="At 5%/yr, wildfire alone consumes Spain's entire required sink improvement — one and a half times over"
        lede="Every number below moves with the growth dial. The Annex IIa targets do not: they are law."
      >
        <Finding>
          At the parent module&apos;s default 5%/yr worsening, excess fire costs <strong>Spain ≈ {mt(rows.find((r) => r.c.iso3 === 'ESP')!.loss2030)}</strong> of
          sink in 2030 — about <strong>{fmt(rows.find((r) => r.c.iso3 === 'ESP')!.lossPctOfImprovement, 0)}%</strong> of
          the entire improvement Annex IIa requires of it — while <strong>Portugal&apos;s loss is roughly three times its
          required improvement</strong> and exceeds its whole 2030 target. Meanwhile Sweden, holding{' '}
          {fmt(s.swedenSinkSharePct, 0)}% of the EU obligation, sees {fmt(s.swedenFireSharePct, 1)}% of the fire.
          The risk and the obligation live in different countries — which is exactly why an EU-wide net target quietly
          redistributes the cost of southern fire seasons to every other sector and every other Member State.
        </Finding>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={fmt(s.top4FireSharePct, 0)} unit="%" label="of EU fire in just four countries" sub="Spain, Portugal, Italy, Greece — 2021-25 mean, EFFIS" tone="fire" />
          <Stat value={fmt(s.top4SinkSharePct, 0)} unit="%" label="of the 310 Mt obligation held by those four" sub="Annex IIa, Regulation (EU) 2023/839" tone="plan" />
          <Stat value={mt(euLoss30)} label={`summed 2030 loss at ${fmt(growthPct, 1)}%/yr`} sub="sum of the 27 per-country runs (per-country EFFIS product)" tone="fire" />
          <Stat value={fmt(s.worst.pctOfImprovement, 0)} unit="%" label={`of ${s.worst.name}'s required improvement, burnt`} sub="the single worst ratio at 5%/yr" tone="fire" />
        </div>
      </Section>

      <Section
        eyebrow="One dial"
        title="Growth in burnt area — shared across all 27 runs"
        lede="The same honest dial as the parent module: nobody knows the number, so it is a slider, not a footnote."
      >
        <div className="max-w-md">
          <ControlGroup title="Projection" accent>
            <Slider
              label="Burnt-area growth after 2025"
              hint="0% = every country's fire stays at its 2021-25 mean. The parent module's default is 5%/yr."
              value={growthPct} min={0} max={15} step={0.5} unit="%/yr" std={DEFAULTS.growthPct}
              onChange={setGrowthPct}
            />
          </ControlGroup>
        </div>
      </Section>

      <Section
        eyebrow="Exhibit 1"
        title="The asymmetry, in one chart"
        lede="Left of the divider: where the EU's fire is. Right: where its 2030 sink obligation sits. If the two sides mirrored each other, fire risk would at least be borne where it burns. They do not."
      >
        <AsymmetryChart rows={rows} />
      </Section>

      <Section
        eyebrow="Exhibit 2"
        title="Fire-adjusted feasibility, country by country"
        lede={`Each card charges the country's excess fire loss in 2030 (at ${fmt(growthPct, 1)}%/yr) against its Annex IIa arithmetic. "Improvement consumed" is the share of the legally-required 2016-18 → 2030 sink improvement that fire takes back.`}
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((r) => (
            <div key={r.c.iso3} className="rounded-lg border border-grey-200 bg-white p-4">
              <div className="flex items-baseline justify-between">
                <span className="text-[13px] font-bold text-tertiary-dark">{r.c.name}</span>
                <span className="font-mono text-[10px] text-tertiary">{r.c.iso3}</span>
              </div>
              <div className="mt-3 space-y-1.5 text-[11.5px]">
                <div className="flex justify-between">
                  <span className="text-tertiary">Annex IIa 2030 target</span>
                  <span className="font-mono tabular-nums text-primary">{mt(r.target2030Mt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Required improvement</span>
                  <span className="font-mono tabular-nums text-primary">{mt(r.improvementMt)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-tertiary">Fire loss 2030</span>
                  <span className="font-mono tabular-nums text-accent-red">{mt(r.loss2030)}</span>
                </div>
                <div className="flex justify-between border-t border-grey-200 pt-1.5">
                  <span className="font-semibold text-tertiary-dark">Improvement consumed</span>
                  <span className="font-mono font-bold tabular-nums text-accent-red">{fmt(r.lossPctOfImprovement, 0)}%</span>
                </div>
              </div>
              <div className="mt-2.5 h-2 overflow-hidden rounded bg-grey-100">
                <div
                  className="h-full rounded bg-accent-red"
                  style={{ width: `${Math.min(100, r.lossPctOfImprovement)}%` }}
                />
              </div>
              {r.lossPctOfImprovement > 100 && (
                <div className="mt-1 text-[10px] font-semibold text-accent-red">
                  exceeds the whole required improvement
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Section
        eyebrow="Exhibit 3"
        title="Who loses how much"
        lede="Countries ranked by 2030 excess sink loss at the chosen growth rate."
      >
        <LossChart rows={rows} />
      </Section>

      <Section
        eyebrow="The full ledger"
        title="All 27 Member States"
        lede="A per-country claim must be checkable per country. Negative losses are real: a country whose recent fires sit below its own 2006-24 average (Sweden, Croatia in mild settings) gains ground against the baseline."
      >
        <div className="overflow-x-auto rounded-lg border border-grey-200">
          <table className="w-full text-[11.5px]">
            <thead>
              <tr className="border-b border-grey-200 bg-grey-50 text-left text-[10px] uppercase tracking-wide text-tertiary">
                <th className="px-3 py-2">Country</th>
                <th className="px-3 py-2 text-right">Fire 2021-25 mean</th>
                <th className="px-3 py-2 text-right">Fire 2006-24 mean</th>
                <th className="px-3 py-2 text-right">Share of EU fire</th>
                <th className="px-3 py-2 text-right">Annex IIa 2030</th>
                <th className="px-3 py-2 text-right">Required improvement</th>
                <th className="px-3 py-2 text-right">Loss 2030</th>
                <th className="px-3 py-2 text-right">Loss 2040</th>
                <th className="px-3 py-2 text-right">% of improvement</th>
              </tr>
            </thead>
            <tbody>
              {[...rows].sort((a, b) => b.loss2030 - a.loss2030).map((r) => (
                <tr key={r.c.iso3} className="border-b border-grey-100 last:border-0">
                  <td className="px-3 py-1.5 font-semibold text-tertiary-dark">{r.c.name}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{ha(r.anchorHa)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{ha(r.embeddedHa)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{r.fireSharePct.toFixed(1)}%</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{mt(r.target2030Mt)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{mt(r.improvementMt)}</td>
                  <td className={`px-3 py-1.5 text-right font-mono tabular-nums ${r.loss2030 > 0.05 ? 'text-accent-red' : ''}`}>{mt(r.loss2030)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">{mt(r.loss2040)}</td>
                  <td className="px-3 py-1.5 text-right font-mono tabular-nums">
                    {r.improvementMt > 0.05 ? `${fmt(r.lossPctOfImprovement, 0)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      <Section eyebrow="Honesty" title="What would break this analysis" lede="">
        <div className="grid gap-4 md:grid-cols-2">
          <Caveat title="Uniform per-hectare carbon">
            All 27 runs use the parent module&apos;s EU-average fuel load (42 tCO₂/ha), forest share (50%) and removal
            rate (2.5 tCO₂/ha/yr). Mediterranean shrubland carries less fuel per hectare than the EU average, which
            overstates southern combustion somewhat; repeat burns and slower Mediterranean recovery push the other way.
            The per-country ranking is robust to this; the per-country Mt values are order-of-magnitude.
          </Caveat>
          <Caveat title="One product, consistently">
            Per-country figures are the EFFIS rapid-damage-assessment annual estimates, which sum to within ~5% of the
            EU-wide product and differ slightly from the JRC-report figures the parent module quotes (see the provenance
            note in <code className="text-[10.5px]">analyses/data.ts</code>). No cross-product arithmetic is performed.
          </Caveat>
          <Caveat title="Annex IIa is the accounting target, not the atmosphere">
            The Annex IIa comparison shows the pressure on each country&apos;s legal position. Actual compliance also
            involves the natural-disturbance mechanism and flexibilities — which is precisely the subject of analysis A2.
          </Caveat>
          <Caveat title="Uniform growth">
            One growth dial is applied to every country. In reality fire growth will itself be geographically skewed
            toward the south — which would sharpen, not soften, the asymmetry shown here.
          </Caveat>
        </div>
      </Section>
    </AnalysisShell>
  );
}
