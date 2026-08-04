'use client';

/**
 * A4 — Hindcast attribution. UI.
 *
 * Exhibits over `./model.ts`:
 *   1. The fire-drag series 2006-2025 — burnt area bars with the modelled
 *      drag line, default and severe band.
 *   2. The attribution split — the observed ~70 Mt decline decomposed into
 *      "fire" (a range) and "everything else".
 *   3. What this does and does not validate.
 */

import { useMemo } from 'react';
import { fmt, ha as haFmt, mt, SINK_HISTORY } from '../../model';
import { AnalysisShell, ANALYSES, C, Caveat, Finding, R, Section, Stat } from '../lib';
import { OBSERVED_DECLINE, PRODUCT_MEAN, attribution, dragSeries, summary } from './model';

const meta = ANALYSES.find((a) => a.slug === 'hindcast')!;

function DragChart({ rows }: { rows: ReturnType<typeof dragSeries> }) {
  const W = 860;
  const H = 360;
  const m = { l: 56, r: 60, t: 20, b: 56 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;

  const baMax = Math.max(...rows.map((r) => r.ba)) * 1.06;
  const dLo = Math.min(...rows.map((r) => r.drag), 0) - 4;
  const dHi = Math.max(...rows.map((r) => r.dragSevere)) * 1.1;

  const bw = iw / rows.length;
  const sx = (i: number) => R(m.l + i * bw);
  const syBa = (v: number) => R(m.t + ih - (v / baMax) * ih);
  const syD = (v: number) => R(m.t + ih - ((v - dLo) / (dHi - dLo)) * ih);

  const dragPath = rows.map((r, i) => `${sx(i) + bw / 2},${syD(r.drag)}`).join(' ');
  const sevPath = rows.map((r, i) => `${sx(i) + bw / 2},${syD(r.dragSevere)}`).join(' ');

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="EU burnt area 2006-2025 with the modelled fire drag on the sink">
      {/* burnt-area bars, muted */}
      {rows.map((r, i) => (
        <rect key={r.year} x={sx(i) + bw * 0.18} y={syBa(r.ba)} width={bw * 0.64}
          height={Math.max(0, m.t + ih - syBa(r.ba))} rx={1} fill={C.fireLight} fillOpacity={0.55} />
      ))}

      {/* zero line for the drag scale */}
      <line x1={m.l} x2={m.l + iw} y1={syD(0)} y2={syD(0)} stroke={C.axis} strokeWidth={1} strokeDasharray="4 3" />
      <text x={m.l + iw + 6} y={syD(0) + 3} fontSize={9} fill={C.axis}>0 Mt</text>

      {/* severe band line */}
      <polyline points={sevPath} fill="none" stroke={C.ember} strokeWidth={1.4} strokeDasharray="5 3" />
      {/* default drag line */}
      <polyline points={dragPath} fill="none" stroke={C.fire} strokeWidth={2.4} />

      {rows.map((r, i) =>
        r.year % 2 === 0 ? (
          <text key={r.year} x={sx(i) + bw / 2} y={H - 36} textAnchor="middle" fontSize={8.5} fill={C.axis}>
            {r.year}
          </text>
        ) : null
      )}

      {/* callouts */}
      {(() => {
        const i17 = rows.findIndex((r) => r.year === 2017);
        const i25 = rows.findIndex((r) => r.year === 2025);
        return (
          <g>
            <text x={sx(i17) + bw / 2} y={syD(rows[i17].drag) - 8} textAnchor="middle" fontSize={9} fontWeight={700} fill={C.fire}>
              2017 · {mt(rows[i17].drag, 0)}
            </text>
            <text x={sx(i25) + bw / 2 - 6} y={syD(rows[i25].drag) - 8} textAnchor="end" fontSize={9} fontWeight={700} fill={C.fire}>
              2025 · {mt(rows[i25].drag, 0)}
            </text>
          </g>
        );
      })()}

      <g transform={`translate(${m.l}, ${H - 22})`}>
        <rect width={11} height={11} rx={2} fill={C.fireLight} fillOpacity={0.55} />
        <text x={16} y={9.5} fontSize={10} fill={C.ink}>burnt area (EFFIS weekly product)</text>
        <line x1={250} x2={272} y1={5.5} y2={5.5} stroke={C.fire} strokeWidth={2.4} />
        <text x={278} y={9.5} fontSize={10} fill={C.ink}>fire drag on the sink, default params</text>
        <line x1={520} x2={542} y1={5.5} y2={5.5} stroke={C.ember} strokeWidth={1.4} strokeDasharray="5 3" />
        <text x={548} y={9.5} fontSize={10} fill={C.ink}>severe params (upper band)</text>
      </g>
      <text x={m.l} y={11} fontSize={9} fill={C.axis}>
        drag = modelled sink loss vs a counterfactual held at the product&apos;s own 2006-24 mean ({haFmt(PRODUCT_MEAN)}/yr) — quiet years are negative
      </text>
    </svg>
  );
}

function AttributionChart({ deltaLo, deltaHi }: { deltaLo: number; deltaHi: number }) {
  const W = 860;
  const H = 150;
  const m = { l: 56, r: 40, t: 34, b: 40 };
  const iw = W - m.l - m.r;
  const total = OBSERVED_DECLINE;
  const sx = (v: number) => R(m.l + (v / total) * iw);
  const y = m.t;
  const barH = 40;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
      aria-label="Decomposition of the observed sink decline into fire and everything else">
      <rect x={m.l} y={y} width={iw} height={barH} rx={3} fill={C.planLight} fillOpacity={0.35} />
      {/* fire share range */}
      <rect x={m.l} y={y} width={Math.max(3, sx(deltaLo) - m.l)} height={barH} rx={3} fill={C.fire} />
      <rect x={sx(deltaLo)} y={y} width={Math.max(0, sx(deltaHi) - sx(deltaLo))} height={barH} fill={C.fire} fillOpacity={0.35} />

      <text x={m.l} y={y - 10} fontSize={10} fontWeight={700} fill={C.fire}>
        fire: {mt(deltaLo, 1)}–{mt(deltaHi, 1)}
      </text>
      <text x={m.l + iw} y={y - 10} textAnchor="end" fontSize={10} fontWeight={700} fill={C.plan}>
        harvest, ageing, drought, beetles, land-use: the rest
      </text>
      <text x={m.l + iw / 2} y={y + barH + 24} textAnchor="middle" fontSize={10} fill={C.axis}>
        the observed decline: {mt(total, 0)} — EU sink 2016-18 average ({SINK_HISTORY[0].mt} Mt) → 2023 inventory ({SINK_HISTORY[1].mt} Mt)
      </text>
    </svg>
  );
}

export default function HindcastPage() {
  const rows = useMemo(() => dragSeries(), []);
  const a = useMemo(() => attribution(), []);
  const s = useMemo(() => summary(), []);

  return (
    <AnalysisShell
      meta={meta}
      headline={
        <>
          Fire did <span className="text-accent-red">not</span> shrink the sink — yet. That is exactly why the model
          can be trusted about what comes next.
        </>
      }
      lede={
        <>
          The EU sink fell about {mt(OBSERVED_DECLINE, 0)} between 2016-18 and 2023. If the module&apos;s forward
          arithmetic were quietly attributing that decline to fire, its projections would be double-counting a change
          driven mostly by harvest and forest ageing. So this analysis runs the cohort machinery backward over the
          full EFFIS record and reports what fire actually explains: a small share, honestly bounded — and a 2025
          fire drag that is suddenly the largest in the record.
        </>
      }
    >
      <Section
        eyebrow="The finding"
        title="Fire explains roughly 2-18% of the sink decline to date — and the range is a feature, not a dodge"
        lede=""
      >
        <Finding>
          At default parameters, excess fire accounts for <strong>{mt(a.deltaMt, 1)}</strong> of the{' '}
          {mt(OBSERVED_DECLINE, 0)} decline — about <strong>{fmt(a.sharePct, 0)}%</strong>. But the 2016-18 reference
          window itself contains 2017, the worst fire year of the pre-2021 record, which suppresses the attribution;
          excluding it, fire&apos;s share rises to <strong>{fmt(a.shareExcl2017Pct, 0)}%</strong>{' '}
          ({fmt(s.shareSeverePct, 0)}% with severe parameters). Either way, most of the decline is harvest, ageing and
          drought — fire is not the story of the sink&apos;s past. It is the story of its exposure: the modelled fire
          drag in 2025 is <strong>{mt(a.drag2025, 0)}</strong> ({mt(s.drag2025Severe, 0)} severe), the largest in the
          twenty-year record, and the parent module&apos;s projections start from there.
        </Finding>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Stat value={`${fmt(a.sharePct, 0)}–${fmt(a.shareExcl2017Pct, 0)}`} unit="%" label="of the decline attributable to fire" sub="default params; range = with/without 2017 in the reference window" />
          <Stat value={mt(a.deltaMt, 1)} label="fire's contribution, central" sub={`of the ${mt(OBSERVED_DECLINE, 0)} observed decline 2016-18 → 2023`} />
          <Stat value={mt(a.drag2025, 0)} label="fire drag in 2025 — record" sub="the hindcast's endpoint is the projection's starting point" tone="fire" />
          <Stat value={mt(-Math.min(...rows.map((r) => r.drag)), 1)} label="the best year's negative drag" sub="quiet years genuinely helped the sink vs the long-run mean — the model shows both signs" tone="sink" />
        </div>
      </Section>

      <Section
        eyebrow="Exhibit 1"
        title="Twenty years of fire drag, both signs"
        lede="Bars are the EFFIS weekly-product burnt area; the line is the cohort model's sink drag against a counterfactual held at the product's own 2006-24 mean. The 2010s mostly sit below zero — fire was quieter than its long-run load, and the accounts benefited. 2017, 2022 and 2025 are what the other direction looks like."
      >
        <DragChart rows={rows} />
      </Section>

      <Section
        eyebrow="Exhibit 2"
        title="Attributing the observed decline"
        lede="The solid red segment is the default attribution; the faded extension is the honest upper end (2017 excluded from the reference, severe parameters). Everything right of it needs a different explanation — and has one: harvest rates up, stands ageing past peak uptake, drought and bark-beetle mortality."
      >
        <AttributionChart deltaLo={a.deltaMt} deltaHi={Math.max(a.deltaExcl2017Mt, s.shareSeverePct * OBSERVED_DECLINE / 100)} />
      </Section>

      <Section eyebrow="What it validates" title="Three things this hindcast buys the module" lede="">
        <div className="grid gap-4 md:grid-cols-3">
          <Caveat title="The baseline subtraction is real">
            The counterfactual-at-mean machinery produces negative drag in quiet years and record drag in 2025 —
            behaviour a double-counting model could not show. The module&apos;s claim that it charges only{' '}
            <em>excess</em> fire against the targets survives its own history.
          </Caveat>
          <Caveat title="The projections are not backfilled">
            Because fire explains little of the 2016-23 decline, the parent module&apos;s forward numbers are not
            smuggling in a trend that harvest and ageing actually caused. The 47 Mt loss at 5%/yr in 2040 is
            additional to — not a relabelling of — the sink&apos;s existing problems.
          </Caveat>
          <Caveat title="And a warning label for the report">
            The sink declined ~70 Mt <em>without</em> fire being the driver. The 310 Mt target requires reversing that
            decline <em>while</em> absorbing a fire regime whose drag just set a record. The two pressures are
            additive, which is precisely why a fire-risk margin belongs in the LULUCF chapter of the report.
          </Caveat>
        </div>
        <p className="mt-6 max-w-text text-[12.5px] leading-relaxed text-tertiary">
          <strong className="text-tertiary-dark">Product note.</strong> This page uses the EFFIS weekly-statistics
          product end-to-end (2006-24 mean {haFmt(PRODUCT_MEAN)}/yr), which sits below the ~550k ha/yr JRC-report
          figure the parent module embeds. A differenced hindcast needs one internally consistent series, not the
          largest one; using the lower mean makes the 2025 drag larger, and the attribution result is insensitive to
          the choice because both the reference window and 2023 move together. The parent module&apos;s numbers remain
          the headline series everywhere else.
        </p>
      </Section>
    </AnalysisShell>
  );
}
