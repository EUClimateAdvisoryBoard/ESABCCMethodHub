'use client';

/**
 * Critical Raw Materials × 2040 Pathway Stress Test (beta module M · 48).
 *
 * Does the decarbonisation pathway break on materials? The module joins the
 * advised −90 % 2040 deployment pathway to published material-intensity
 * coefficient RANGES for eight strategic raw materials, sets the resulting
 * 2030/2040 demand against EU supply at current shares and at the CRMA
 * (Reg. (EU) 2024/1252, Art. 5(1)) 2030 benchmarks, and expresses the gap
 * as a deterministic exposure figure — months of deployment at risk if the
 * top supplier restricts exports. A both-directions panel records where
 * more climate ambition reduces import dependency alongside where it
 * increases it, with the net sign per pathway flagged as an analytical
 * judgement.
 *
 * Epistemic status: AI-compiled — pending Secretariat verification.
 * Material-intensity coefficients vary by a factor of 2–3 across sources;
 * all ranges are shown and never averaged; uncertain shares are flagged.
 * Not citable until the coefficient set and the share data are
 * human-reviewed. Model: `model.ts` (deterministic); data:
 * `data.generated.ts` (compiled 2026-08, provenance block at the top).
 */

import { useMemo, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  ALL_SOURCES,
  CRMA,
  CRMA_BENCHMARKS,
  INCREASES_DEPENDENCY,
  MATERIALS,
  NET_SIGN_STATEMENTS,
  REDUCES_DEPENDENCY,
  TECH_DEPLOYMENT,
  type Range,
} from './data.generated';
import {
  benchmarkDistances,
  stressTable,
  thriftFactor,
  type MaterialStress,
} from './model';

/* ------------------------------------------------------------- palette */
// Chart series palette (named const). CVD-validated on white with the
// dataviz six-checks validator: lightness band, chroma floor and contrast
// all pass; the orange↔green adjacent pair clears the deuteranopia floor
// and every series is additionally identified by direct labels and a
// legend, never by colour alone. Identity is fixed across all charts:
// blue = projected demand, orange = at current EU shares, green = with the
// CRMA benchmarks met, red = the 65 % single-supplier cap.
const PALETTE = {
  demand: '#0065A4',
  current: '#E0701A',
  benchmark: '#1F8F63',
  cap: '#B83230',
  neutral: '#808285',
} as const;

/* ------------------------------------------------------------ helpers */

const fmt = (n: number, d = 0) =>
  n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Format a kt/yr range without averaging it. Small ranges get a decimal. */
const fmtRange = (r: Range) => {
  const d = r.hi < 20 ? 1 : 0;
  return `${fmt(r.lo, d)}–${fmt(r.hi, d)}`;
};

const pctLabel = (v: number | null, uncertain: boolean) =>
  v === null ? 'n/a' : `${uncertain ? '≈' : ''}${fmt(v)} %`;

/* ------------------------------------------------------------- UI bits */

function StatTile(props: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{props.label}</p>
      <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">{props.value}</p>
      {props.sub && <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">{props.sub}</p>}
    </div>
  );
}

function Legend({ items }: { items: { label: string; color: string; light?: boolean }[] }) {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5">
      {items.map((it) => (
        <span key={it.label} className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
          <span
            className="inline-block h-2.5 w-4 rounded-sm"
            style={{ background: it.color, opacity: it.light ? 0.35 : 1 }}
            aria-hidden
          />
          {it.label}
        </span>
      ))}
    </div>
  );
}

function ThriftSlider(props: { value: number; onChange: (v: number) => void }) {
  const { value, onChange } = props;
  return (
    <label className="block">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold text-tertiary-dark">
          Thrifting / intensity trend
        </span>
        <span className="font-mono text-[12px] tabular-nums text-primary">
          −{fmt(value, 1)} %/yr
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={3}
        step={0.1}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-primary"
      />
      <p className="mt-0.5 text-[10.5px] leading-snug text-tertiary">
        Annual decline in material intensity from the 2024 coefficients (chemistry shifts,
        thinner wafers, magnet thrifting). At −{fmt(value, 1)} %/yr the coefficients scale by ×
        {fmt(thriftFactor(value, 2030), 2)} in 2030 and ×{fmt(thriftFactor(value, 2040), 2)} in
        2040. Default 0 = published coefficients unadjusted — the trend is a slider, not a
        baked-in assumption.
      </p>
    </label>
  );
}

/* ----------------------- per-material demand vs supply mini chart (SVG) */

function DemandSupplyMini({ row }: { row: MaterialStress }) {
  const W = 330;
  const rowH = 52;
  const m = { l: 40, r: 76, t: 6, b: 4 };
  const iw = W - m.l - m.r;
  const H = m.t + rowH * 2 + m.b;
  const maxV = Math.max(row.demand2040.hi, row.demand2030.hi, 0.001);
  const sx = (v: number) => (v / maxV) * iw;

  const years: { label: string; demand: Range }[] = [
    { label: '2030', demand: row.demand2030 },
    { label: '2040', demand: row.demand2040 },
  ];

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`Projected EU demand for ${row.material.name} in 2030 and 2040 (range), with the domestically-secured portion at current shares and with the CRMA benchmarks met`}
    >
      {years.map((y, i) => {
        const top = m.t + i * rowH;
        const dLo = sx(y.demand.lo);
        const dHi = sx(y.demand.hi);
        const curLo = sx(y.demand.lo * row.domesticCurrent);
        const curHi = sx(y.demand.hi * row.domesticCurrent);
        const benLo = sx(y.demand.lo * row.domesticBenchmark);
        const benHi = sx(y.demand.hi * row.domesticBenchmark);
        return (
          <g key={y.label}>
            <text x={0} y={top + 12} fontSize={10} fontWeight={700} className="fill-tertiary">
              {y.label}
            </text>
            {/* demand range: solid to lo, translucent lo→hi */}
            <rect x={m.l} y={top + 3} width={Math.max(dLo, 1)} height={10} rx={2} fill={PALETTE.demand}>
              <title>{`Demand ${y.label}: at least ${fmtRange(y.demand)} kt/yr (coefficient range)`}</title>
            </rect>
            {dHi > dLo && (
              <rect x={m.l + dLo} y={top + 3} width={dHi - dLo} height={10} rx={2} fill={PALETTE.demand} opacity={0.35}>
                <title>{`Upper end of the coefficient range: ${fmt(y.demand.hi, y.demand.hi < 20 ? 1 : 0)} kt/yr`}</title>
              </rect>
            )}
            {/* domestically-secured portion, current shares */}
            <rect x={m.l} y={top + 17} width={Math.max(curLo, row.domesticCurrent > 0 ? 1 : 0)} height={5} rx={1} fill={PALETTE.current}>
              <title>{`Domestically secured at current shares: ${fmtRange({ lo: y.demand.lo * row.domesticCurrent, hi: y.demand.hi * row.domesticCurrent })} kt/yr (${fmt(row.domesticCurrent * 100)} % of demand)`}</title>
            </rect>
            {curHi > curLo && (
              <rect x={m.l + curLo} y={top + 17} width={curHi - curLo} height={5} rx={1} fill={PALETTE.current} opacity={0.35} />
            )}
            {/* domestically-secured portion, benchmarks met */}
            <rect x={m.l} y={top + 25} width={Math.max(benLo, 1)} height={5} rx={1} fill={PALETTE.benchmark}>
              <title>{`Domestically secured with CRMA benchmarks met: ${fmtRange({ lo: y.demand.lo * row.domesticBenchmark, hi: y.demand.hi * row.domesticBenchmark })} kt/yr (${fmt(row.domesticBenchmark * 100)} % of demand)`}</title>
            </rect>
            {benHi > benLo && (
              <rect x={m.l + benLo} y={top + 25} width={benHi - benLo} height={5} rx={1} fill={PALETTE.benchmark} opacity={0.35} />
            )}
            <text
              x={W - m.r + 6}
              y={top + 12}
              fontSize={10}
              className="fill-tertiary-dark"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              {fmtRange(y.demand)}
            </text>
            <text x={W - m.r + 6} y={top + 23} fontSize={8.5} className="fill-grey-500">
              kt/yr
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* --------------------------------------- exposure chart (months, paired) */

function ExposureChart({ rows }: { rows: MaterialStress[] }) {
  const W = 740;
  const rowH = 42;
  const m = { l: 168, r: 56, t: 26, b: 22 };
  const H = m.t + rows.length * rowH + m.b;
  const iw = W - m.l - m.r;
  const sx = (months: number) => m.l + (months / 12) * iw;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label="Months of deployment at risk per material if the top supplier restricts exports for a year, at current shares and with the CRMA benchmarks met"
    >
      {/* grid: months 0..12 */}
      {[0, 3, 6, 9, 12].map((mo) => (
        <g key={mo}>
          <line x1={sx(mo)} x2={sx(mo)} y1={m.t - 6} y2={H - m.b} stroke={mo === 0 ? '#BCBEC0' : '#E6E7E8'} strokeWidth={1} />
          <text x={sx(mo)} y={H - 8} textAnchor="middle" fontSize={10} className="fill-grey-500">
            {mo}
          </text>
        </g>
      ))}
      <text x={W - m.r} y={H - 8} textAnchor="start" fontSize={10} className="fill-grey-500">
        {'  '}months
      </text>
      {/* 65 % cap reference: 12 × 0.65 = 7.8 months */}
      <line x1={sx(7.8)} x2={sx(7.8)} y1={m.t - 6} y2={H - m.b} stroke={PALETTE.cap} strokeWidth={1} strokeDasharray="3 3" />
      <text x={sx(7.8) + 4} y={m.t + 2} fontSize={9} fill={PALETTE.cap}>
        65 % cap ⇒ ≤ 7.8 months
      </text>
      {rows.map((r, i) => {
        const top = m.t + i * rowH;
        const cur = r.monthsCurrent;
        const ben = r.monthsBenchmark;
        return (
          <g key={r.material.id}>
            <text x={m.l - 8} y={top + 15} textAnchor="end" fontSize={11} className="fill-tertiary-dark">
              {r.material.name}
            </text>
            <text x={m.l - 8} y={top + 27} textAnchor="end" fontSize={8.5} className="fill-grey-500">
              {r.material.topSupplier.uncertain ? '≈' : ''}
              {r.material.topSupplier.name}
            </text>
            <rect x={m.l} y={top + 4} width={Math.max(sx(cur) - m.l, 1)} height={12} rx={2} fill={PALETTE.current}>
              <title>{`${r.material.name}, current shares: ${fmt(cur, 1)} months of deployment at risk (top supplier: ${r.material.topSupplier.name}, ${r.material.topSupplier.stage})`}</title>
            </rect>
            <text
              x={sx(cur) + 5}
              y={top + 14}
              fontSize={9.5}
              className="fill-tertiary-dark"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              {fmt(cur, 1)}
            </text>
            <rect x={m.l} y={top + 19} width={Math.max(sx(ben) - m.l, 1)} height={12} rx={2} fill={PALETTE.benchmark}>
              <title>{`${r.material.name}, CRMA benchmarks met: ${fmt(ben, 1)} months of deployment at risk`}</title>
            </rect>
            <text
              x={sx(ben) + 5}
              y={top + 29}
              fontSize={9.5}
              className="fill-tertiary-dark"
              style={{ fontFamily: 'ui-monospace, monospace' }}
            >
              {fmt(ben, 1)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------- benchmark distance bar (per axis) */

function DistanceBar(props: { current: number | null; target: number; uncertain: boolean; invert?: boolean }) {
  const { current, target, uncertain, invert = false } = props;
  const max = 100;
  if (current === null) {
    return <span className="text-[10px] text-grey-500">n/a</span>;
  }
  const met = invert ? current <= target : current >= target;
  const fill = invert ? (met ? PALETTE.neutral : PALETTE.cap) : met ? PALETTE.benchmark : PALETTE.current;
  return (
    <div
      className="relative h-3 w-full rounded bg-grey-200"
      title={`${uncertain ? '≈' : ''}${fmt(current)} % vs ${invert ? 'cap' : 'benchmark'} ${fmt(target)} % — ${met ? (invert ? 'within cap' : 'benchmark met') : invert ? 'cap exceeded' : `${fmt(Math.max(0, target - current))} pts short`}`}
    >
      <div
        className="absolute inset-y-0 left-0 rounded"
        style={{ width: `${Math.min(current, max)}%`, background: fill, opacity: 0.9 }}
      />
      <div
        className="absolute inset-y-0 w-px bg-tertiary-dark"
        style={{ left: `${Math.min(target, max)}%` }}
        aria-hidden
      />
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function CrmPathwayStressPage() {
  const [thrift, setThrift] = useState(0);

  const rows = useMemo(() => stressTable(thrift), [thrift]);
  const rowsByExposure = useMemo(
    () => [...rows].sort((a, b) => b.monthsCurrent - a.monthsCurrent),
    [rows],
  );

  const worst = rowsByExposure[0];
  const overCap = rows.filter((r) => benchmarkDistances(r.material).singleSupplier.exceeded);
  const graphite = rows.find((r) => r.material.id === 'graphite');

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* hero */}
        <section className="mb-5">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module M · 48 · critical raw materials · 2040 pathway stress test · deterministic exposure model
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
            Critical Raw Materials × 2040 Pathway Stress Test
          </h1>
          <p className="mt-2 max-w-3xl text-[13.5px] leading-relaxed text-tertiary">
            Does the decarbonisation pathway break on materials? Eight strategic raw materials, the
            advised −90 % deployment pathway, published material-intensity coefficient ranges, and
            the CRMA 2030 benchmarks — joined into one deterministic stress test: projected 2030/2040
            demand, against EU supply at current shares and at benchmarks met, with the gap expressed
            as months of deployment at risk if the top supplier restricts exports.
          </p>
        </section>

        {/* caveat box */}
        <section className="mb-8 rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
            ⚠ AI-compiled — pending Secretariat verification
          </p>
          <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
            Material-intensity coefficients vary by a factor of <strong>2–3 across sources</strong>{' '}
            (chemistry mixes, drive-trains, vintages). Every coefficient on this page is therefore a{' '}
            <strong>range, shown lo–hi and never averaged</strong>; current EU shares and top-supplier
            shares the compiler could not pin to a specific published table are marked ≈ and flagged
            uncertain. Deployment rates are stylised annualised additions consistent with the advised
            pathway, not scenario extractions with locators. <strong>Nothing on this page is citable
            until the coefficient set and the share data are human-reviewed</strong> against the named
            sources (compiled 2026-08).
          </p>
        </section>

        {/* stat strip */}
        <section className="mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatTile
            label="Materials tracked"
            value={`${MATERIALS.length}`}
            sub="All listed as strategic raw materials in CRMA Annex I, Section 1."
          />
          <StatTile
            label="Worst exposure at current shares"
            value={`${fmt(worst.monthsCurrent, 1)} mo`}
            sub={`${worst.material.name} — top supplier ${worst.material.topSupplier.name} (${worst.material.topSupplier.stage}). Exposure measure, not a probability.`}
          />
          <StatTile
            label="Above the 65 % single-supplier cap"
            value={`${overCap.length} of ${MATERIALS.length}`}
            sub={`${overCap.map((r) => r.material.name.split(' ')[0]).join(', ')} — top supplier above the Art. 5(1)(b) cap today.`}
          />
          <StatTile
            label="Graphite demand 2030"
            value={graphite ? `${fmtRange(graphite.demand2030)} kt` : '—'}
            sub="Per year, coefficient range at the current thrifting setting; needed by every Li-ion chemistry."
          />
        </section>

        {/* 1 — the material bill */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">1 · The pathway’s material bill — demand vs supply, per material</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Demand = deployment volumes × material-intensity coefficients. Blue bars are projected EU
            demand (solid = lower end of the coefficient range, translucent = up to the upper end).
            Beneath each: the domestically-secured portion — extraction + recycling — at current
            shares (orange) and with the CRMA benchmarks met (green). Processing is deliberately not
            counted as domestic origin, because EU processing capacity can run on imported ore.
          </p>
          <div className="mt-3 grid gap-4 lg:grid-cols-[290px_1fr]">
            <div className="space-y-3">
              <div className="rounded-lg border border-grey-200 bg-white p-4">
                <ThriftSlider value={thrift} onChange={setThrift} />
              </div>
              <div className="rounded-lg border border-grey-200 bg-white p-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">
                  Deployment rates (advised pathway, stylised)
                </p>
                <table className="mt-2 w-full text-[11px]">
                  <thead>
                    <tr className="text-left text-[9.5px] uppercase tracking-wide text-grey-500">
                      <th className="pb-1 font-semibold">Technology</th>
                      <th className="pb-1 text-right font-semibold">2030</th>
                      <th className="pb-1 text-right font-semibold">2040</th>
                    </tr>
                  </thead>
                  <tbody>
                    {TECH_DEPLOYMENT.map((t) => (
                      <tr key={t.key} className="border-t border-grey-100" title={`${t.note} Source: ${t.source.label}.`}>
                        <td className="py-1 text-tertiary">{t.label}</td>
                        <td className="py-1 text-right font-mono tabular-nums text-tertiary-dark">
                          {fmt(t.rate2030)}
                        </td>
                        <td className="py-1 text-right font-mono tabular-nums text-tertiary-dark">
                          {fmt(t.rate2040)} <span className="text-grey-500">{t.unit}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-2 text-[10px] leading-snug text-tertiary">
                  Annualised EU-27 additions around each year, rounded — the demand-side lever of the
                  model. Hover a row for the basis and source.
                </p>
              </div>
              <div className="rounded-lg border border-grey-200 bg-white p-3">
                <Legend
                  items={[
                    { label: 'demand (lower end)', color: PALETTE.demand },
                    { label: 'demand (up to upper end)', color: PALETTE.demand, light: true },
                    { label: 'domestic at current shares', color: PALETTE.current },
                    { label: 'domestic at benchmarks met', color: PALETTE.benchmark },
                  ]}
                />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {rows.map((r) => (
                <div key={r.material.id} className="rounded-lg border border-grey-200 bg-white p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[12px] font-bold text-tertiary-dark">{r.material.name}</p>
                    <span className="shrink-0 rounded bg-surface-blue px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-primary">
                      strategic
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] leading-snug text-tertiary">{r.material.usedFor}</p>
                  <DemandSupplyMini row={r} />
                  <p className="text-[10px] leading-snug text-tertiary">
                    Import requirement 2030:{' '}
                    <span className="font-mono tabular-nums text-tertiary-dark">
                      {fmtRange(r.importsCurrent2030)}
                    </span>{' '}
                    kt/yr at current shares ·{' '}
                    <span className="font-mono tabular-nums text-tertiary-dark">
                      {fmtRange(r.importsBenchmark2030)}
                    </span>{' '}
                    at benchmarks met.
                  </p>
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-[10px] font-semibold text-primary">
                      Coefficients &amp; sources ({r.material.coefficients.length})
                    </summary>
                    <ul className="mt-1 space-y-1">
                      {r.material.coefficients.map((c) => {
                        const tech = TECH_DEPLOYMENT.find((t) => t.key === c.tech);
                        return (
                          <li key={`${r.material.id}-${c.tech}`} className="text-[10px] leading-snug text-tertiary">
                            <span className="font-semibold text-tertiary-dark">{tech?.label}:</span>{' '}
                            <span className="font-mono tabular-nums">
                              {fmt(c.range.lo, c.range.lo < 1 ? 2 : 0)}–{fmt(c.range.hi, c.range.hi < 1 ? 2 : 0)} {c.unit}
                            </span>
                            {c.confidence === 'low' && (
                              <span className="ml-1 rounded bg-surface-orange px-1 text-[9px] font-semibold text-tertiary-dark">
                                low confidence
                              </span>
                            )}{' '}
                            — {c.basis}{' '}
                            <a href={c.source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                              {c.source.label.split('—')[0].trim()} ↗
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </details>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2 — CRMA benchmarks */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">2 · The CRMA 2030 benchmarks — and each material’s distance to them</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            Regulation (EU) 2024/1252 sets four capacity benchmarks for 2030, per strategic raw
            material, in Article 5(1). They are benchmarks the Union is to reach, not binding quotas
            on any actor.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {CRMA_BENCHMARKS.map((b) => (
              <div key={b.key} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">{b.title}</p>
                <p className="mt-1 font-mono text-xl font-bold tabular-nums text-tertiary-dark">
                  {b.key === 'singleSupplier' ? '≤ ' : '≥ '}
                  {fmt(b.targetPct)} %
                </p>
                <p className="mt-1 text-[10.5px] leading-snug text-tertiary">
                  “{b.quotedFragment}” — {b.paraphrase}
                </p>
                <p className="mt-1.5 text-[10px] text-tertiary">
                  <a href={CRMA.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                    Reg. (EU) 2024/1252, {b.locator} ↗
                  </a>
                </p>
              </div>
            ))}
          </div>
          <div className="mt-4 overflow-x-auto rounded-lg border border-grey-200 bg-white p-4">
            <table className="w-full min-w-[760px] text-[11.5px]">
              <thead>
                <tr className="text-left text-[10px] uppercase tracking-wide text-grey-500">
                  <th className="pb-2 pr-3 font-semibold">Material</th>
                  <th className="w-[16%] pb-2 pr-3 font-semibold">Extraction vs ≥ 10 %</th>
                  <th className="w-[16%] pb-2 pr-3 font-semibold">Processing vs ≥ 40 %</th>
                  <th className="w-[16%] pb-2 pr-3 font-semibold">Recycling vs ≥ 25 %</th>
                  <th className="w-[20%] pb-2 pr-3 font-semibold">Top supplier vs ≤ 65 % cap</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const d = benchmarkDistances(r.material);
                  const sh = r.material.shares;
                  return (
                    <tr key={r.material.id} className="border-t border-grey-100 align-top">
                      <td className="py-2.5 pr-3">
                        <p className="font-semibold text-tertiary-dark">{r.material.name}</p>
                        <p className="mt-0.5 text-[10px] leading-snug text-tertiary">
                          {sh.uncertain && (
                            <span className="mr-1 rounded bg-surface-orange px-1 text-[9px] font-semibold text-tertiary-dark">
                              ≈ uncertain
                            </span>
                          )}
                          <a href={sh.source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                            {sh.source.label.split('—')[0].trim()} ↗
                          </a>
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <DistanceBar current={d.extraction.current} target={10} uncertain={sh.uncertain} />
                        <p className="mt-1 font-mono text-[10px] tabular-nums text-tertiary">
                          {pctLabel(d.extraction.current, sh.uncertain)}
                          {d.extraction.gapPts !== null && d.extraction.gapPts > 0 && ` · ${fmt(d.extraction.gapPts)} pts short`}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <DistanceBar current={d.processing.current} target={40} uncertain={sh.uncertain} />
                        <p className="mt-1 font-mono text-[10px] tabular-nums text-tertiary">
                          {pctLabel(d.processing.current, sh.uncertain)}
                          {d.processing.gapPts !== null && d.processing.gapPts > 0 && ` · ${fmt(d.processing.gapPts)} pts short`}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <DistanceBar current={d.recycling.current} target={25} uncertain={sh.uncertain} />
                        <p className="mt-1 font-mono text-[10px] tabular-nums text-tertiary">
                          {pctLabel(d.recycling.current, sh.uncertain)}
                          {d.recycling.gapPts !== null && d.recycling.gapPts > 0 && ` · ${fmt(d.recycling.gapPts)} pts short`}
                        </p>
                      </td>
                      <td className="py-2.5 pr-3">
                        <DistanceBar current={d.singleSupplier.current} target={65} uncertain={r.material.topSupplier.uncertain} invert />
                        <p className="mt-1 text-[10px] leading-snug text-tertiary">
                          <span className="font-mono tabular-nums text-tertiary-dark">
                            {r.material.topSupplier.uncertain ? '≈' : ''}
                            {fmt(d.singleSupplier.current)} %
                          </span>{' '}
                          {r.material.topSupplier.name} · {r.material.topSupplier.stage}
                          {d.singleSupplier.exceeded && (
                            <span className="ml-1 font-semibold" style={{ color: PALETTE.cap }}>
                              cap exceeded
                            </span>
                          )}
                        </p>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="mt-2 max-w-4xl text-[10.5px] text-tertiary">
              Shares are % of EU annual consumption of the material; ≈ marks values the compiler
              could not pin to a specific published table (order-of-magnitude, pending verification —
              flagged, not dropped). The dark tick on each bar is the benchmark; global-supply-based
              top-supplier figures are proxies for import exposure, converted as documented in{' '}
              <code className="rounded bg-grey-100 px-1">model.ts</code>. Copper is the even-handed
              counter-example: it already clears all three capacity benchmarks.
            </p>
          </div>
        </section>

        {/* 3 — the stress metric */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">3 · The stress metric — months of deployment at risk</h2>
          <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_300px]">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <ExposureChart rows={rowsByExposure} />
              <div className="mt-1">
                <Legend
                  items={[
                    { label: 'at current EU shares', color: PALETTE.current },
                    { label: 'with CRMA benchmarks met', color: PALETTE.benchmark },
                  ]}
                />
              </div>
            </div>
            <div className="space-y-3">
              <div className="rounded-lg border border-grey-200 bg-surface-blue p-4">
                <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
                  What this figure is — and is not
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-tertiary">
                  <strong>Is:</strong> a deterministic exposure measure. If the top supplier restricted
                  exports for twelve months and its share of EU supply passed through pro rata to
                  deployment — no stockpiles, no short-run substitution, no re-routing — this many
                  months of the year’s deployment would lack the material. 12 × (top supplier’s share
                  of EU supply), nothing more.
                </p>
                <p className="mt-1.5 text-[11.5px] leading-relaxed text-tertiary">
                  <strong>Is not:</strong> a probability, a forecast that any supplier will restrict
                  exports, or a claim about how markets would actually clear. Stockpiles (a CRMA
                  Chapter 4 instrument), substitution and re-routing would all soften the realised
                  impact; the figure deliberately excludes them so it stays reproducible arithmetic.
                </p>
              </div>
              <div className="rounded-lg border border-grey-200 bg-grey-50 p-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-tertiary">Reading the chart</p>
                <p className="mt-1 text-[11px] leading-relaxed text-tertiary">
                  The benchmark case lifts extraction to ≥ 10 % and recycling to ≥ 25 %, keeps the top
                  supplier’s current share of the (smaller) import requirement, and applies the
                  Art. 5(1)(b) cap — so no bar can exceed 12 × 0.65 = 7.8 months by construction. The
                  ordering, not the decimals, is the finding: magnet rare earths, PV silicon, anode
                  graphite and battery-grade manganese carry the pathway’s concentrated exposure;
                  copper carries almost none.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4 — both directions */}
        <section className="mb-8">
          <h2 className="text-lg font-bold text-tertiary-dark">4 · Both directions — what ambition does to dependency</h2>
          <p className="mt-1 max-w-3xl text-[13px] text-tertiary">
            An even-handed stress test records both signs. More climate ambition reduces some import
            dependencies and increases others; both registers below carry sources, and the net-sign
            statement is labelled for what it is.
          </p>
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: PALETTE.benchmark }}>
                Ambition reduces dependency
              </p>
              <ul className="mt-2 space-y-3">
                {REDUCES_DEPENDENCY.map((e) => (
                  <li key={e.title}>
                    <p className="text-[12px] font-semibold text-tertiary-dark">{e.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-tertiary">
                      {e.mechanism}{' '}
                      <a href={e.source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {e.source.label.split('—')[0].trim()} ↗
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg border border-grey-200 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-[0.1em]" style={{ color: PALETTE.cap }}>
                Ambition increases dependency
              </p>
              <ul className="mt-2 space-y-3">
                {INCREASES_DEPENDENCY.map((e) => (
                  <li key={e.title}>
                    <p className="text-[12px] font-semibold text-tertiary-dark">{e.title}</p>
                    <p className="mt-0.5 text-[11.5px] leading-relaxed text-tertiary">
                      {e.mechanism}{' '}
                      <a href={e.source.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                        {e.source.label.split('—')[0].trim()} ↗
                      </a>
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-grey-200 bg-surface-blue p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
              Net sign per pathway — analytical judgement, not a computed quantity and not an ESABCC position
            </p>
            <div className="mt-2 grid gap-3 lg:grid-cols-2">
              {NET_SIGN_STATEMENTS.map((n) => (
                <div key={n.pathway}>
                  <p className="text-[12px] font-semibold text-tertiary-dark">{n.pathway}</p>
                  <p className="text-[10.5px] font-semibold uppercase tracking-wide text-tertiary">{n.sign}</p>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-tertiary">{n.statement}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* caveats + sources */}
        <section className="mb-10 rounded-lg border border-grey-200 bg-surface-blue p-4">
          <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">Caveats &amp; sources</p>
          <p className="mt-1.5 max-w-4xl text-[12px] leading-relaxed text-tertiary">
            AI-compiled 2026-08, pending Secretariat verification; no live source pull was possible
            from this environment, so every figure needs re-checking against its named source.
            Known coverage gaps, accepted rather than filled: grid-network copper (transmission and
            distribution build-out), heat pumps, platinum-group metals for PEM electrolysers and
            fuel cells, steel-route manganese, and aluminium. Two coefficients are vehicle-linked
            proxies routed through battery-GWh at ≈ 60 kWh/pack (EV copper, EV NdPr) and are marked
            low-confidence. Deployment rates are stylised annualised additions consistent with the
            advised −90 % pathway, not extractions from a named scenario table. Exposure figures are
            deterministic what-if magnitudes, not probabilities. The supply counterfactuals count
            extraction + recycling as domestic origin and exclude processing (it can run on imported
            ore); top-supplier figures compiled on a global-supply basis are proxies for import
            exposure and are flagged. The CRMA text cited is the original 2024 act (CELEX
            32024R1252); the module should move to the consolidated version if the act is amended.
          </p>
          <ul className="mt-3 grid gap-x-6 gap-y-1 text-[12px] sm:grid-cols-2">
            {ALL_SOURCES.map((s) => (
              <li key={s.url}>
                <a href={s.url} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                  {s.label} ↗
                </a>
                {s.locator && <span className="text-tertiary"> — {s.locator}</span>}
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
