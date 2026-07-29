'use client';

/**
 * Summer Prep · Note 1 — Indicator Check (all sectors).
 * -----------------------------------------------------
 * "What has moved, data-wise, since the last report?" A dashboard over the
 * OLD report's progress indicators (the same series that back the Policy Gap
 * 2.0 indicator database). For every indicator that has gained data points
 * AFTER the January-2024 report, it shows:
 *   • the report baseline value (the latest figure the report itself carried);
 *   • the two–three newer points added since publication; and
 *   • the arithmetic change between the two (no better/worse read is applied —
 *     the page shows the numbers and leaves the judgement to the reader).
 *
 * The indicator series are NOT bundled here: the server wrapper
 * (src/app/beta/summer-prep/indicator-check/page.tsx) reads them from the
 * Policy Gap 2.0 Project Workspace indicator database (`listIndicators`) and
 * passes them in as a prop. That is the same read the workspace's own
 * Indicator Database tab renders from, so this dashboard can only ever show
 * data that is also visible in the Project Workspace — nothing is invented
 * or added on top; the module only computes deltas and draws the series.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import type { Indicator, IndicatorCategory } from '@/data/ecno-indicators';
import { INDICATOR_BLOCKERS, BLOCKER_META } from '@/data/indicator-blockers';

const CATEGORY_META: Record<IndicatorCategory, { label: string; color: string }> = {
  emissions: { label: 'Emissions', color: '#2E3E4C' },
  'energy-supply': { label: 'Energy supply', color: '#004B7F' },
  'energy-demand': { label: 'Energy demand', color: '#0065A4' },
  transport: { label: 'Transport', color: '#6667AB' },
  buildings: { label: 'Buildings', color: '#00928F' },
  industry: { label: 'Industry', color: '#B83230' },
  agriculture: { label: 'Agriculture', color: '#6E8B1F' },
  lulucf: { label: 'LULUCF', color: '#007B6C' },
  finance: { label: 'Finance', color: '#A530B8' },
  fairness: { label: 'Fairness', color: '#FF9933' },
  adaptation: { label: 'Adaptation', color: '#478EA5' },
};

/**
 * Deep link into the Policy Gap 2.0 Project Workspace: opens the Indicator
 * Database module with this indicator pre-selected (the workspace seeds the
 * same `esabcc-*` indicator ids as `esabcc-indicators.ts`).
 */
const WORKSPACE_PROJECT_ID = 'policy-gap-2-0';
function workspaceIndicatorHref(indicatorId: string): string {
  return `/project-workspace/${WORKSPACE_PROJECT_ID}?module=indicators&indicator=${encodeURIComponent(indicatorId)}`;
}

interface IndicatorRead {
  ind: Indicator;
  baseline: { year: number; value: number } | null;
  latest: { year: number; value: number } | null;
  /** Post-report points (afterReport === true), chronological. */
  post: { year: number; value: number }[];
  hasUpdate: boolean;
  pctChange: number | null; // baseline → latest, signed
  /**
   * Set only when the report baseline is a pandemic-depressed year, i.e. the
   * last figure the report carried is 2020/2021 and sits materially BELOW the
   * last pre-2020 reading. For those indicators `pctChange` measures the
   * recovery off a collapsed base and reads far larger than the real move
   * (intra-EU aviation: +258% off 2020, but only +9% off 2019), so the card
   * also shows the change against the last normal year.
   */
  preCovid: { year: number; value: number; pctChange: number } | null;
}

/** A baseline this far below the last pre-2020 reading is treated as a COVID trough. */
const COVID_TROUGH_THRESHOLD = 0.1;

function readIndicator(ind: Indicator): IndicatorRead {
  const data = [...ind.data].sort((a, b) => a.year - b.year);
  const pre = data.filter((d) => !d.afterReport);
  const post = data.filter((d) => d.afterReport);
  const baseline = pre.length ? pre[pre.length - 1] : null;
  const latest = data.length ? data[data.length - 1] : null;
  const hasUpdate = post.length > 0;

  let pctChange: number | null = null;
  if (baseline && latest && baseline.value !== 0 && hasUpdate) {
    pctChange = ((latest.value - baseline.value) / Math.abs(baseline.value)) * 100;
  }

  // Only flag a *trough* (baseline below the pre-2020 level). A 2021 baseline
  // that sits above 2019 — renewables additions, say — is genuine growth, and
  // re-basing it on 2019 would overstate the move rather than correct it.
  let preCovid: IndicatorRead['preCovid'] = null;
  if (baseline && latest && hasUpdate && (baseline.year === 2020 || baseline.year === 2021)) {
    const normal = [...data].reverse().find((d) => d.year < 2020);
    if (
      normal &&
      normal.value !== 0 &&
      (baseline.value - normal.value) / Math.abs(normal.value) < -COVID_TROUGH_THRESHOLD
    ) {
      preCovid = {
        year: normal.year,
        value: normal.value,
        pctChange: ((latest.value - normal.value) / Math.abs(normal.value)) * 100,
      };
    }
  }

  return {
    ind,
    baseline: baseline ? { year: baseline.year, value: baseline.value } : null,
    latest: latest ? { year: latest.year, value: latest.value } : null,
    post: post.map((p) => ({ year: p.year, value: p.value })),
    hasUpdate,
    pctChange,
    preCovid,
  };
}

function fmtNum(v: number): string {
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return v.toLocaleString('en-GB', { maximumFractionDigits: digits });
}

/** Small inline sparkline; post-report points drawn as filled dots. */
function Sparkline({ ind }: { ind: Indicator }) {
  const data = [...ind.data].sort((a, b) => a.year - b.year).slice(-10);
  if (data.length < 2) return null;
  const w = 132;
  const h = 34;
  const pad = 3;
  const ys = data.map((d) => d.value);
  const min = Math.min(...ys);
  const max = Math.max(...ys);
  const span = max - min || 1;
  const xStep = (w - pad * 2) / (data.length - 1);
  const pts = data.map((d, i) => {
    const x = pad + i * xStep;
    const y = pad + (1 - (d.value - min) / span) * (h - pad * 2);
    return { x, y, after: !!d.afterReport };
  });
  const line = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  // index of first post-report point (where the "since report" tail begins)
  const firstAfter = pts.findIndex((p) => p.after);
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      {firstAfter > 0 && (
        <line
          x1={pts[firstAfter].x}
          y1={pad - 1}
          x2={pts[firstAfter].x}
          y2={h - pad + 1}
          stroke="#D6DAE0"
          strokeDasharray="2 2"
        />
      )}
      <polyline
        points={line}
        fill="none"
        strokeWidth={1.6}
        className="stroke-[#004B7F] dark:stroke-[#5B9BD5]"
      />
      {pts.map((p, i) =>
        p.after ? (
          <circle key={i} cx={p.x} cy={p.y} r={2.4} className="fill-[#004B7F] dark:fill-[#5B9BD5]" />
        ) : null,
      )}
    </svg>
  );
}

type SortKey = 'status' | 'move' | 'sector' | 'code';

/** Chip colours per blocker tone. */
const TONE_CLASS: Record<'amber' | 'slate' | 'red', string> = {
  amber: 'bg-[#FDF3E3] text-[#8A5A00] dark:bg-transparent dark:text-[#E0A94A] dark:border dark:border-[#E0A94A]/40',
  slate: 'bg-[#EEF1F4] text-[#54728C] dark:bg-transparent dark:text-[var(--mh-muted)] dark:border dark:border-[var(--mh-border)]',
  red: 'bg-[#FDF3F2] text-[#B83230] dark:bg-transparent dark:text-[#E08A88] dark:border dark:border-[#E08A88]/40',
};

/** Cap on the inline "new since report" points shown per card, for visual
 * consistency with the Sparkline's own `slice(-10)` cap. */
const MAX_INLINE_POST_POINTS = 3;

function IndicatorCheckInner({ indicators, error }: { indicators: Indicator[]; error?: boolean }) {
  const reads = useMemo(
    () => indicators.map(readIndicator),
    [indicators],
  );

  // Default to the full picture: all 97 report indicators, the ones with new
  // data first, each of the rest carrying the reason it has none.
  const [dataFilter, setDataFilter] = useState<'all' | 'updated' | 'stale'>('all');
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('status');

  const sectorsPresent = useMemo(() => {
    const set = new Set<IndicatorCategory>();
    reads.forEach((r) => set.add(r.ind.category));
    return Array.from(set);
  }, [reads]);

  const summary = useMemo(() => {
    const updated = reads.filter((r) => r.hasUpdate);
    const stale = reads.filter((r) => !r.hasUpdate);
    return {
      total: reads.length,
      updated: updated.length,
      stale: stale.length,
      // Of the series with no new data, how many are simply waiting on a
      // publication rather than needing anyone to go and find something.
      awaiting: stale.filter(
        (r) => INDICATOR_BLOCKERS[r.ind.id]?.status === 'awaiting-publication',
      ).length,
      rose: updated.filter((r) => r.pctChange !== null && r.pctChange > 0).length,
      fell: updated.filter((r) => r.pctChange !== null && r.pctChange < 0).length,
    };
  }, [reads]);

  const rows = useMemo(() => {
    let list = reads.slice();
    if (dataFilter === 'updated') list = list.filter((r) => r.hasUpdate);
    if (dataFilter === 'stale') list = list.filter((r) => !r.hasUpdate);
    if (sectorFilter !== 'all') list = list.filter((r) => r.ind.category === sectorFilter);
    list.sort((a, b) => {
      // Indicators with new data first, biggest mover at the top; then the
      // ones without, grouped by why they have none so the reasons read together.
      if (sortKey === 'status') {
        if (a.hasUpdate !== b.hasUpdate) return a.hasUpdate ? -1 : 1;
        if (a.hasUpdate) return Math.abs(b.pctChange ?? -1) - Math.abs(a.pctChange ?? -1);
        const sa = INDICATOR_BLOCKERS[a.ind.id]?.status ?? 'zzz';
        const sb = INDICATOR_BLOCKERS[b.ind.id]?.status ?? 'zzz';
        return sa.localeCompare(sb) || (a.ind.code ?? '').localeCompare(b.ind.code ?? '');
      }
      if (sortKey === 'move') {
        return Math.abs(b.pctChange ?? -1) - Math.abs(a.pctChange ?? -1);
      }
      if (sortKey === 'sector') {
        return (
          CATEGORY_META[a.ind.category].label.localeCompare(
            CATEGORY_META[b.ind.category].label,
          ) || (a.ind.code ?? '').localeCompare(b.ind.code ?? '')
        );
      }
      return (a.ind.code ?? '').localeCompare(b.ind.code ?? '', undefined, { numeric: true });
    });
    return list;
  }, [reads, dataFilter, sectorFilter, sortKey]);

  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Indicator Check — since the last report"
        subtitle={
          <>
            All of the old report’s progress indicators, read for movement. Where an indicator has
            gained data since January 2024, this shows the report baseline, the newest two–three
            points, and the arithmetic change between the two. Where it has not, the card says so
            and gives the reason — a source that stopped publishing, one with no machine-readable
            export, or data that simply is not out yet. Click an indicator to open its full series
            in the Policy Gap 2.0 Project Workspace — every value shown here is read from that
            workspace’s indicator database, so the two views always match.
          </>
        }
      />

      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Summary tiles */}
        <section
          aria-label="Summary"
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4"
        >
          {[
            {
              label: 'Indicators tracked',
              value: summary.total,
              className: 'text-[#3D5265] dark:text-[var(--mh-fg)]',
            },
            {
              label: 'With new data since report',
              value: summary.updated,
              className: 'text-[#004B7F] dark:text-[#5B9BD5]',
            },
            {
              label: 'No new data (reason shown)',
              value: summary.stale,
              className: 'text-[#54728C] dark:text-[var(--mh-muted)]',
            },
            {
              label: 'Of those, awaiting publication',
              value: summary.awaiting,
              className: 'text-[#8A5A00] dark:text-[#E0A94A]',
            },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-lg border border-[#E6E7E8] p-3 dark:border-[var(--mh-border)]"
            >
              <div className={`text-[24px] font-bold ${t.className}`}>
                {t.value}
              </div>
              <div className="text-[11px] uppercase tracking-wide text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
                {t.label}
              </div>
            </div>
          ))}
        </section>

        {/* Controls */}
        <section className="mb-4 flex flex-wrap items-center gap-2">
          <select
            value={dataFilter}
            onChange={(e) => setDataFilter(e.target.value as 'all' | 'updated' | 'stale')}
            className="rounded-md border border-[#D6DAE0] bg-white px-2 py-2 text-[13px] dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
          >
            <option value="all">All indicators</option>
            <option value="updated">With new data since the report</option>
            <option value="stale">Without new data (and why)</option>
          </select>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className="rounded-md border border-[#D6DAE0] bg-white px-2 py-2 text-[13px] dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
          >
            <option value="all">All sectors</option>
            {sectorsPresent
              .sort((a, b) => CATEGORY_META[a].label.localeCompare(CATEGORY_META[b].label))
              .map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_META[c].label}
                </option>
              ))}
          </select>
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="rounded-md border border-[#D6DAE0] bg-white px-2 py-2 text-[13px] dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
          >
            <option value="status">Sort: new data first</option>
            <option value="move">Sort: biggest move</option>
            <option value="sector">Sort: sector</option>
            <option value="code">Sort: indicator code</option>
          </select>
          <span className="ml-auto text-[12px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
            {rows.length} shown
          </span>
        </section>

        {/* Cards */}
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const cat = CATEGORY_META[r.ind.category];
            const arrow =
              r.pctChange === null ? '' : r.pctChange > 0 ? '▲' : r.pctChange < 0 ? '▼' : '▬';
            return (
              <article
                key={r.ind.id}
                className="flex flex-col rounded-xl border border-[#E6E7E8] bg-white p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span
                      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                      style={{ backgroundColor: cat.color }}
                    >
                      {cat.label}
                    </span>
                    {r.ind.code && (
                      <span className="ml-1.5 font-mono text-[11px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
                        {r.ind.code}
                      </span>
                    )}
                  </div>
                  <Sparkline ind={r.ind} />
                </div>

                <h3 className="mt-2 text-[13px] font-semibold leading-snug">
                  <Link
                    href={workspaceIndicatorHref(r.ind.id)}
                    title="Open this indicator's full series in the Policy Gap 2.0 Project Workspace"
                    className="hover:text-[#00928F] hover:underline decoration-[#00928F] underline-offset-2"
                  >
                    {r.ind.name}
                  </Link>
                </h3>

                {r.hasUpdate && r.baseline && r.latest ? (
                  <>
                    <div className="mt-3 flex items-end gap-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                          Report ({r.baseline.year})
                        </div>
                        <div className="text-[15px] font-semibold tabular-nums">
                          {fmtNum(r.baseline.value)}
                        </div>
                      </div>
                      <div className="pb-0.5 text-[#3D5265]/40">→</div>
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                          Latest ({r.latest.year})
                        </div>
                        <div className="text-[15px] font-semibold tabular-nums">
                          {fmtNum(r.latest.value)}
                        </div>
                      </div>
                      <div className="ml-auto pb-0.5 text-right">
                        <div className="text-[14px] font-bold tabular-nums text-[#3D5265] dark:text-[var(--mh-fg)]">
                          {arrow} {r.pctChange !== null ? `${Math.abs(r.pctChange).toFixed(1)}%` : '—'}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                          change vs report
                        </div>
                      </div>
                    </div>

                    {r.preCovid && (
                      <div className="mt-2 rounded border border-[#E6E7E8] bg-[#F7F8F9] px-2 py-1.5 text-[10px] leading-snug text-[#3D5265]/70 dark:border-[var(--mh-border)] dark:bg-transparent dark:text-[var(--mh-muted)]">
                        The report baseline ({r.baseline.year}) is a pandemic-depressed year. Against
                        the last normal year,{' '}
                        <span className="font-semibold tabular-nums">
                          {r.preCovid.year}: {fmtNum(r.preCovid.value)}
                        </span>
                        , the change is{' '}
                        <span className="font-semibold tabular-nums">
                          {r.preCovid.pctChange > 0 ? '▲' : r.preCovid.pctChange < 0 ? '▼' : '▬'}{' '}
                          {Math.abs(r.preCovid.pctChange).toFixed(1)}%
                        </span>
                        .
                      </div>
                    )}

                    <div className="mt-2 text-[11px] text-[#3D5265]/65 dark:text-[var(--mh-muted)]">
                      New since report:{' '}
                      {r.post.slice(0, MAX_INLINE_POST_POINTS).map((p, i) => (
                        <span key={p.year}>
                          {i > 0 && ' · '}
                          <span className="tabular-nums font-medium">
                            {p.year}: {fmtNum(p.value)}
                          </span>
                        </span>
                      ))}
                      {r.post.length > MAX_INLINE_POST_POINTS && (
                        <span className="font-medium">
                          {' '}
                          +{r.post.length - MAX_INLINE_POST_POINTS} more
                        </span>
                      )}{' '}
                      <span className="text-[#3D5265]/45">{r.ind.unit}</span>
                    </div>
                  </>
                ) : (
                  (() => {
                    const b = INDICATOR_BLOCKERS[r.ind.id];
                    return (
                      <div className="mt-3">
                        <div className="text-[12px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
                          No data since the report
                          {r.latest
                            ? ` — still at ${r.latest.year}: ${fmtNum(r.latest.value)} ${r.ind.unit}`
                            : ''}
                          .
                        </div>
                        {b ? (
                          <>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${TONE_CLASS[BLOCKER_META[b.status].tone]}`}
                              >
                                {BLOCKER_META[b.status].label}
                              </span>
                              <span className="text-[11px] font-medium text-[#3D5265]/75 dark:text-[var(--mh-fg)]">
                                {b.summary}
                              </span>
                            </div>
                            <details className="mt-1.5 text-[11px] leading-relaxed text-[#3D5265]/65 dark:text-[var(--mh-muted)]">
                              <summary className="cursor-pointer select-none text-[#00928F] hover:underline">
                                Why, and what would unblock it
                              </summary>
                              <p className="mt-1">{b.detail}</p>
                            </details>
                          </>
                        ) : (
                          <div className="mt-2 text-[11px] italic text-[#3D5265]/50 dark:text-[var(--mh-muted)]">
                            Reason not yet recorded.
                          </div>
                        )}
                      </div>
                    );
                  })()
                )}

                <div className="mt-auto pt-3 text-[11px] text-[#3D5265]/50 dark:text-[var(--mh-muted)]">
                  <a
                    href={r.ind.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="underline decoration-[#00928F] underline-offset-2 hover:text-[#00928F]"
                  >
                    {r.ind.source}
                  </a>
                  {r.ind.targetValue !== undefined && (
                    <span>
                      {' '}
                      · target {fmtNum(r.ind.targetValue)}
                      {r.ind.targetYear ? ` by ${r.ind.targetYear}` : ''}
                    </span>
                  )}
                  <span> · </span>
                  <Link
                    href={workspaceIndicatorHref(r.ind.id)}
                    className="font-semibold text-[#00928F] hover:underline"
                  >
                    Open in Project Workspace →
                  </Link>
                </div>
              </article>
            );
          })}
        </section>

        {error ? (
          <div className="rounded-lg border border-[#E6B8B6] bg-[#FDF3F2] p-8 text-center text-[13px] text-[#B83230] dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)]">
            Couldn’t load the indicator database — try again later.
          </div>
        ) : (
          rows.length === 0 && (
            <div className="rounded-lg border border-[#E6E7E8] p-8 text-center text-[13px] text-[#3D5265]/60 dark:border-[var(--mh-border)]">
              No indicators match the current filter.
            </div>
          )
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-[1px] bg-[#D6DAE0]" /> dashed line on a sparkline = report publication
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#004B7F]" /> filled dot = data point added since the report
          </span>
        </div>

        <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          Provenance: every value is read verbatim from the Policy Gap 2.0 Project Workspace
          indicator database — the same series the workspace’s Indicator Database tab shows, so
          nothing appears here that is not also in the workspace. Post-report points are figures
          the primary publisher (Eurostat / EEA / EAFO / IRENA / EHPA) released after the
          January-2024 report. The percentage shown is the arithmetic change from the report
          baseline to the latest value (▲ = the value rose, ▼ = it fell); no better/worse
          interpretation is applied. Where the report’s last figure is a 2020/2021 year that sits
          more than 10% below the last pre-2020 reading, the change is measured off a
          pandemic-depressed base and overstates the real move — those cards also carry the change
          against the last normal year. Indicators with no post-report data are shown too rather
          than hidden, each with the tested reason it has none: “not published yet” means the data
          is expected and nothing needs doing, the other labels mean someone has to go and get it.
          Reasons and what would unblock each one are recorded in
          docs-internal/indicator-check-source-refresh-2026-07-29.md.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function IndicatorCheckPage({
  indicators,
  error,
}: {
  indicators: Indicator[];
  error?: boolean;
}) {
  return <IndicatorCheckInner indicators={indicators} error={error} />;
}
