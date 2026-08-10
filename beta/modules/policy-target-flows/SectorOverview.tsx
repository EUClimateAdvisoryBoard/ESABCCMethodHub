'use client';
/**
 * The one-figure overview of M·53 — the whole ledger on a single spine chart,
 * from which any one sector expands into its full flow chart below.
 *
 * Every sector is one row and every bar shares one scale (targets). The spine
 * is the boundary between measured and not yet measured: the curated-series
 * count grows leftward, the measurement gap (specified + milestone) grows
 * rightward, and rows are sorted by gap size — so the right-hand side reads as
 * a ranked list of the gaps the Policy Gap report needs to name. The figure
 * leads with the one number the ledger supports: the share of all column
 * entries in view that a curated series already measures.
 *
 * The first-order / second-order / procedural split deliberately does not
 * appear here — it answers a different question and has its home in the rung
 * bands of the expanded sector chart. Every bar carries its number, so colour
 * never carries the meaning alone.
 */
import { ROUTE_META, type FlowColumnKey } from '@/data/target-indicators';
import type { ColumnOverview } from './model';

const fmt = (n: number) => n.toLocaleString('en-GB');

/**
 * The measured side of the spine, split by whether the matched series sits in
 * the Policy Gap report's own indicator set. Two steps of the series blue —
 * checked (with the amber/purple route colours adjacent) for colour-vision-
 * deficiency-safe separation and ≥3:1 contrast on white; the split also
 * carries its numbers, so colour never carries the meaning alone.
 */
const MEASURED_SPLIT = {
  reportSet: ROUTE_META.series.color,
  other: '#4899D2',
} as const;

interface Props {
  overview: ColumnOverview[];
  selected: FlowColumnKey;
  onSelect: (key: FlowColumnKey) => void;
  /** True when a filter is narrowing the figure, so it can say so. */
  filtered: boolean;
}

/** Targets with no curated series yet — the right-hand side of the spine. */
const gapOf = (o: ColumnOverview) => o.routes.dataset + o.routes.milestone;

const tickStep = (max: number) => (max > 80 ? 50 : max > 30 ? 25 : 10);
const ticksUpTo = (max: number) => {
  const step = tickStep(max);
  const out: number[] = [];
  for (let t = step; t <= max; t += step) out.push(t);
  return out;
};

export default function SectorOverview({ overview, selected, onSelect, filtered }: Props) {
  // Ledger-wide totals for the hero figure (respect the active filters, like
  // the columns themselves do).
  const shown = overview.reduce((n, o) => n + o.total, 0);
  const all = overview.reduce((n, o) => n + o.unfilteredTotal, 0);
  const seriesSum = overview.reduce((n, o) => n + o.routes.series, 0);
  const reportSum = overview.reduce((n, o) => n + o.routes.reportSet, 0);
  const datasetSum = overview.reduce((n, o) => n + o.routes.dataset, 0);
  const milestoneSum = overview.reduce((n, o) => n + o.routes.milestone, 0);
  const weakSum = overview.reduce((n, o) => n + o.weak, 0);
  const overallShare = shown ? (seriesSum / shown) * 100 : 0;

  // One shared scale for every row: measured targets to the left of the spine,
  // the gap to the right, plus headroom on the right for the outboard label.
  const maxSeries = Math.max(...overview.map((o) => o.routes.series), 1);
  const maxGap = Math.max(...overview.map(gapOf), 1);
  const left = maxSeries;
  const right = maxGap + Math.max(12, Math.round(maxGap * 0.25));
  const units = left + right;
  const x = (n: number) => (n / units) * 100;
  const spine = x(left);
  const leftTicks = ticksUpTo(maxSeries);
  const rightTicks = ticksUpTo(maxGap);

  // Biggest measurement gap first — the ranking is the point of the figure.
  const rows = [...overview].sort((a, b) => gapOf(b) - gapOf(a) || b.total - a.total);

  const grid = 'grid grid-cols-[172px_1fr_112px] items-center gap-x-4';

  return (
    <div className="rounded-xl border border-grey-200 bg-white p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h2 className="text-[13.5px] font-semibold text-tertiary-dark">
            The whole ledger, one figure
          </h2>
          <p className="mt-0.5 max-w-3xl text-[11.5px] leading-snug text-tertiary">
            All nine sector columns on one scale: measured targets grow left from the spine, the
            measurement gap grows right, biggest gap first. Pick a row to expand that sector&apos;s
            flow chart below.
          </p>
        </div>
        <p className="font-mono text-[11px] tabular-nums text-tertiary-light">
          {filtered ? `${fmt(shown)} of ${fmt(all)} column entries in view` : `${fmt(all)} column entries`}
        </p>
      </div>

      {/* ── Hero: the ledger-wide share ─────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="font-mono text-[30px] font-semibold leading-none tabular-nums text-tertiary-dark">
          {shown ? `${overallShare.toFixed(0)} %` : '—'}
          <span className="ml-1.5 font-sans text-[13px] font-medium text-tertiary-light">measured</span>
        </p>
        <p className="text-[11.5px] text-tertiary">
          {fmt(seriesSum)} of {fmt(shown)} column entries tracked by a curated series
          {' — '}{fmt(reportSum)} of them by the Policy Gap report&apos;s own indicator set
          {' · '}{fmt(datasetSum)} specified, not yet built
          {' · '}{fmt(milestoneSum)} milestone{milestoneSum === 1 ? '' : 's'}
          {weakSum > 0 && (
            <>
              {' · '}
              <span className="rounded bg-surface-orange px-1 text-[10px] font-semibold text-tertiary-dark">
                {fmt(weakSum)} weak match{weakSum === 1 ? '' : 'es'} to check
              </span>
            </>
          )}
        </p>
      </div>
      {shown > 0 && (
        <div className="mt-2 flex h-2.5 gap-[2px] overflow-hidden rounded" aria-hidden="true">
          {reportSum > 0 && (
            <span style={{ width: `${(reportSum / shown) * 100}%`, background: MEASURED_SPLIT.reportSet }} />
          )}
          {seriesSum - reportSum > 0 && (
            <span style={{ width: `${((seriesSum - reportSum) / shown) * 100}%`, background: MEASURED_SPLIT.other }} />
          )}
          {datasetSum > 0 && (
            <span style={{ width: `${(datasetSum / shown) * 100}%`, background: ROUTE_META.dataset.color }} />
          )}
          {milestoneSum > 0 && (
            <span style={{ width: `${(milestoneSum / shown) * 100}%`, background: ROUTE_META.milestone.color }} />
          )}
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-tertiary">
        <span
          className="flex items-center gap-1.5"
          title={`${ROUTE_META.series.description} The matched series is one of the Policy Gap report's own progress indicators (or its declared ECNO duplicate), so the report can track it with its existing framework.`}
        >
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MEASURED_SPLIT.reportSet }} />
          Measured — in the Policy Gap report&apos;s indicator set
        </span>
        <span
          className="flex items-center gap-1.5"
          title={`${ROUTE_META.series.description} The matched series is curated in MethodHub but is not part of the report's own indicator set.`}
        >
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: MEASURED_SPLIT.other }} />
          Measured — other curated series
        </span>
        {(['dataset', 'milestone'] as const).map((r) => (
          <span key={r} className="flex items-center gap-1.5" title={ROUTE_META[r].description}>
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: ROUTE_META[r].color }} />
            {ROUTE_META[r].label}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="rounded bg-surface-orange px-1 text-[10px] font-semibold text-tertiary-dark">
            n to check
          </span>
          = weak matches
        </span>
      </div>

      {/* ── The spine chart ─────────────────────────────────────────────── */}
      <div className="mt-3 overflow-x-auto pb-1">
        <div className="min-w-[860px]">
          {rows.map((ov) => {
            const gap = gapOf(ov);
            const active = ov.column.key === selected;
            const dim = ov.total === 0;
            const otherSeries = ov.routes.series - ov.routes.reportSet;
            const serW = x(ov.routes.series);
            const repW = x(ov.routes.reportSet);
            const othW = x(otherSeries);
            const datW = x(ov.routes.dataset);
            const milW = x(ov.routes.milestone);
            return (
              <button
                key={ov.column.key}
                type="button"
                onClick={() => onSelect(ov.column.key)}
                aria-pressed={active}
                title={`${ov.column.label} — ${fmt(ov.total)} targets, ${ov.acts} acts. Measured ${
                  fmt(ov.routes.series)} (${fmt(ov.routes.reportSet)} in the Policy Gap report's indicator set) · specified ${
                  fmt(ov.routes.dataset)} · milestone ${
                  fmt(ov.routes.milestone)}. ${ov.topActs.map((a) => `${a.short} (${a.count})`).join(', ')}`}
                className={`mh-focus mh-motion-fast ${grid} w-full rounded-lg border px-2 py-1 text-left ${
                  active ? 'border-primary bg-surface-blue ring-1 ring-primary' : 'border-transparent hover:bg-grey-50'
                } ${dim ? 'opacity-55' : ''}`}
              >
                <span className="min-w-0">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: ov.column.color }} />
                    <span className="truncate text-[12px] font-semibold text-tertiary-dark">
                      {ov.column.short}
                    </span>
                  </span>
                  <span className="block pl-3.5 text-[10.5px] text-tertiary-light">
                    {ov.total === ov.unfilteredTotal
                      ? `${fmt(ov.total)} targets · ${ov.acts} acts`
                      : `${fmt(ov.total)} of ${fmt(ov.unfilteredTotal)} in view`}
                  </span>
                </span>

                <span className="relative h-[30px]">
                  {/* shared gridlines, drawn per row so they read as columns */}
                  {leftTicks.map((t) => (
                    <span key={`l${t}`} className="absolute inset-y-0 w-px bg-grey-100" style={{ left: `${x(left - t)}%` }} />
                  ))}
                  <span className="absolute inset-y-0 w-px bg-grey-400" style={{ left: `${spine}%` }} />
                  {rightTicks.map((t) => (
                    <span key={`r${t}`} className="absolute inset-y-0 w-px bg-grey-100" style={{ left: `${spine + x(t)}%` }} />
                  ))}

                  {/* measured, growing left from the spine: the report's own
                      indicator set outermost, other curated series at the spine */}
                  {ov.routes.series > 0 && (
                    <span
                      className="absolute top-1.5 flex h-[18px] gap-[2px]"
                      style={{ left: `${spine - serW}%`, width: `${serW}%` }}
                    >
                      {ov.routes.reportSet > 0 && (
                        <span
                          className="flex items-center overflow-hidden rounded-l"
                          style={{ flex: `${ov.routes.reportSet} 0 0`, background: MEASURED_SPLIT.reportSet }}
                        >
                          {repW > 5 && (
                            <span className="pl-1.5 font-mono text-[10px] tabular-nums text-white">
                              {fmt(ov.routes.reportSet)}
                            </span>
                          )}
                        </span>
                      )}
                      {otherSeries > 0 && (
                        <span
                          className={`flex items-center overflow-hidden ${ov.routes.reportSet > 0 ? '' : 'rounded-l'}`}
                          style={{ flex: `${otherSeries} 0 0`, background: MEASURED_SPLIT.other }}
                        >
                          {othW > 5 && (
                            <span className="pl-1.5 font-mono text-[10px] tabular-nums text-white">
                              {fmt(otherSeries)}
                            </span>
                          )}
                        </span>
                      )}
                    </span>
                  )}

                  {/* the gap, growing right from the spine */}
                  {gap > 0 && (
                    <span
                      className="absolute top-1.5 flex h-[18px] gap-[2px]"
                      style={{ left: `${spine}%`, width: `${datW + milW}%` }}
                    >
                      {ov.routes.dataset > 0 && (
                        <span
                          className={ov.routes.milestone > 0 ? '' : 'rounded-r'}
                          style={{ flex: `${ov.routes.dataset} 0 0`, background: ROUTE_META.dataset.color }}
                        />
                      )}
                      {ov.routes.milestone > 0 && (
                        <span
                          className="rounded-r"
                          style={{ flex: `${ov.routes.milestone} 0 0`, background: ROUTE_META.milestone.color }}
                        />
                      )}
                    </span>
                  )}
                  {gap > 0 && (
                    <span
                      className="absolute top-1.5 flex h-[18px] items-center whitespace-nowrap font-mono text-[10px] tabular-nums text-tertiary-light"
                      style={{ left: `${spine + datW + milW + 0.7}%` }}
                    >
                      {fmt(gap)} unmeasured
                    </span>
                  )}
                </span>

                <span className="flex flex-col items-end gap-0.5">
                  <span className="font-mono text-[12.5px] tabular-nums text-tertiary-dark">
                    <span className="font-semibold">{ov.total ? `${ov.seriesShare.toFixed(0)} %` : '—'}</span>{' '}
                    <span className="font-sans text-[10.5px] font-normal text-tertiary-light">measured</span>
                  </span>
                  {ov.weak > 0 ? (
                    <span className="rounded bg-surface-orange px-1 text-[9.5px] font-semibold text-tertiary-dark">
                      {ov.weak} to check
                    </span>
                  ) : (
                    <span className="text-[9.5px] text-tertiary-light">—</span>
                  )}
                </span>
              </button>
            );
          })}

          {/* ── Axis ──────────────────────────────────────────────────── */}
          <div className={`${grid} mt-1 px-2`}>
            <span />
            <span className="relative h-4 text-[9.5px] text-grey-500">
              {leftTicks.map((t) => (
                <span key={`l${t}`} className="absolute -translate-x-1/2 font-mono tabular-nums" style={{ left: `${x(left - t)}%` }}>
                  {t}
                </span>
              ))}
              <span className="absolute -translate-x-1/2 font-mono tabular-nums" style={{ left: `${spine}%` }}>0</span>
              {rightTicks.map((t) => (
                <span key={`r${t}`} className="absolute -translate-x-1/2 font-mono tabular-nums" style={{ left: `${spine + x(t)}%` }}>
                  {t}
                </span>
              ))}
              <span className="absolute" style={{ right: `${100 - spine + 1.5}%` }}>← measured</span>
              <span
                className="absolute"
                style={{ left: `${spine + x(rightTicks[rightTicks.length - 1] ?? 0) + 2}%` }}
              >
                gap →
              </span>
            </span>
            <span />
          </div>
        </div>
      </div>

      <p className="mt-2 text-[10.5px] leading-snug text-tertiary-light">
        A target bearing on several sectors appears in each of their columns, so the column entries
        sum to more than the number of targets. Percentages are the share of a column&apos;s targets a
        curated series already measures; &quot;in the Policy Gap report&apos;s indicator set&quot; means
        the matched series is one of the 2024 report&apos;s progress indicators (or its declared ECNO
        duplicate), so the report could track that target with its existing framework today. The
        first-order / second-order / procedural split lives in the expanded chart below.
      </p>
    </div>
  );
}
