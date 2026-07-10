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
 *   • a direction-aware read of whether the sector improved or slipped.
 *
 * All numbers come straight from src/data/esabcc-indicators.ts — the
 * `afterReport` flag marks which points are newer than the report. Nothing is
 * invented here; the module only computes deltas and draws the series.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import SummerPrepGate from '@/components/SummerPrepGate';
import { ESABCC_REPORT_INDICATORS } from '@/data/esabcc-indicators';
import type { Indicator, IndicatorCategory } from '@/data/ecno-indicators';

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

const MAJOR_MOVE_PCT = 4; // |Δ| ≥ 4% since the report counts as a "major update"

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
  improving: boolean | null; // direction-aware
  major: boolean;
}

function readIndicator(ind: Indicator): IndicatorRead {
  const data = [...ind.data].sort((a, b) => a.year - b.year);
  const pre = data.filter((d) => !d.afterReport);
  const post = data.filter((d) => d.afterReport);
  const baseline = pre.length ? pre[pre.length - 1] : null;
  const latest = data.length ? data[data.length - 1] : null;
  const hasUpdate = post.length > 0;

  let pctChange: number | null = null;
  let improving: boolean | null = null;
  if (baseline && latest && baseline.value !== 0 && hasUpdate) {
    pctChange = ((latest.value - baseline.value) / Math.abs(baseline.value)) * 100;
    const delta = latest.value - baseline.value;
    improving = ind.direction === 'down' ? delta < 0 : delta > 0;
  }
  const major = pctChange !== null && Math.abs(pctChange) >= MAJOR_MOVE_PCT;

  return {
    ind,
    baseline: baseline ? { year: baseline.year, value: baseline.value } : null,
    latest: latest ? { year: latest.year, value: latest.value } : null,
    post: post.map((p) => ({ year: p.year, value: p.value })),
    hasUpdate,
    pctChange,
    improving,
    major,
  };
}

function fmtNum(v: number): string {
  const abs = Math.abs(v);
  const digits = abs >= 100 ? 0 : abs >= 10 ? 1 : 2;
  return v.toLocaleString('en-GB', { maximumFractionDigits: digits });
}

/** Small inline sparkline; post-report points drawn as filled dots. */
function Sparkline({ ind, improving }: { ind: Indicator; improving: boolean | null }) {
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
  const stroke =
    improving === null ? '#54728C' : improving ? '#007B6C' : '#B83230';
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
      <polyline points={line} fill="none" stroke={stroke} strokeWidth={1.6} />
      {pts.map((p, i) =>
        p.after ? (
          <circle key={i} cx={p.x} cy={p.y} r={2.4} fill={stroke} />
        ) : null,
      )}
    </svg>
  );
}

type SortKey = 'move' | 'sector' | 'code';

function IndicatorCheckInner() {
  const reads = useMemo(
    () => ESABCC_REPORT_INDICATORS.map(readIndicator),
    [],
  );

  const [onlyUpdates, setOnlyUpdates] = useState(true);
  const [sectorFilter, setSectorFilter] = useState<string>('all');
  const [sortKey, setSortKey] = useState<SortKey>('move');

  const sectorsPresent = useMemo(() => {
    const set = new Set<IndicatorCategory>();
    reads.forEach((r) => set.add(r.ind.category));
    return Array.from(set);
  }, [reads]);

  const summary = useMemo(() => {
    const updated = reads.filter((r) => r.hasUpdate);
    return {
      total: reads.length,
      updated: updated.length,
      improving: updated.filter((r) => r.improving === true).length,
      worsening: updated.filter((r) => r.improving === false).length,
      major: updated.filter((r) => r.major).length,
    };
  }, [reads]);

  const rows = useMemo(() => {
    let list = reads.slice();
    if (onlyUpdates) list = list.filter((r) => r.hasUpdate);
    if (sectorFilter !== 'all') list = list.filter((r) => r.ind.category === sectorFilter);
    list.sort((a, b) => {
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
  }, [reads, onlyUpdates, sectorFilter, sortKey]);

  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Indicator Check — since the last report"
        subtitle={
          <>
            The old report’s progress indicators, read for movement. For every indicator that has
            gained data since January 2024, this shows the report baseline, the newest two–three
            points, and whether the sector has improved or slipped. Click an indicator to open its
            full series in the Policy Gap 2.0 Project Workspace. Data:{' '}
            <span className="font-mono text-[12px]">esabcc-indicators.ts</span>.
          </>
        }
      />

      <main className="mx-auto max-w-[1180px] px-4 py-6 sm:px-6 sm:py-8">
        {/* Summary tiles */}
        <section
          aria-label="Summary"
          className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
        >
          {[
            { label: 'Indicators tracked', value: summary.total, color: '#3D5265' },
            { label: 'With new data since report', value: summary.updated, color: '#004B7F' },
            { label: 'Improving', value: summary.improving, color: '#007B6C' },
            { label: 'Slipping', value: summary.worsening, color: '#B83230' },
            { label: `Major moves (≥${MAJOR_MOVE_PCT}%)`, value: summary.major, color: '#FF9933' },
          ].map((t) => (
            <div
              key={t.label}
              className="rounded-lg border border-[#E6E7E8] p-3 dark:border-[var(--mh-border)]"
            >
              <div className="text-[24px] font-bold" style={{ color: t.color }}>
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
          <label className="inline-flex items-center gap-2 rounded-md border border-[#D6DAE0] px-3 py-2 text-[13px] dark:border-[var(--mh-border)]">
            <input
              type="checkbox"
              checked={onlyUpdates}
              onChange={(e) => setOnlyUpdates(e.target.checked)}
              className="accent-[#00928F]"
            />
            Only indicators with data since the report
          </label>
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
            const moveColor =
              r.improving === null ? '#54728C' : r.improving ? '#007B6C' : '#B83230';
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
                    {r.major && (
                      <span className="ml-1.5 rounded-full bg-[#FF9933]/20 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-[#B26A00] dark:text-[#FF9933]">
                        Major
                      </span>
                    )}
                  </div>
                  <Sparkline ind={r.ind} improving={r.improving} />
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
                        <div
                          className="text-[14px] font-bold tabular-nums"
                          style={{ color: moveColor }}
                        >
                          {arrow} {r.pctChange !== null ? `${Math.abs(r.pctChange).toFixed(1)}%` : '—'}
                        </div>
                        <div className="text-[10px] uppercase tracking-wide" style={{ color: moveColor }}>
                          {r.improving === null ? 'no read' : r.improving ? 'improving' : 'slipping'}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 text-[11px] text-[#3D5265]/65 dark:text-[var(--mh-muted)]">
                      New since report:{' '}
                      {r.post.map((p, i) => (
                        <span key={p.year}>
                          {i > 0 && ' · '}
                          <span className="tabular-nums font-medium">
                            {p.year}: {fmtNum(p.value)}
                          </span>
                        </span>
                      ))}{' '}
                      <span className="text-[#3D5265]/45">{r.ind.unit}</span>
                    </div>
                  </>
                ) : (
                  <div className="mt-3 text-[12px] text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
                    No data added since the report
                    {r.latest ? ` (report figure ${r.latest.year}: ${fmtNum(r.latest.value)} ${r.ind.unit})` : ''}
                    .
                  </div>
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

        {rows.length === 0 && (
          <div className="rounded-lg border border-[#E6E7E8] p-8 text-center text-[13px] text-[#3D5265]/60 dark:border-[var(--mh-border)]">
            No indicators match the current filter.
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center gap-4 text-[11px] text-[#3D5265]/60 dark:text-[var(--mh-muted)]">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#007B6C]" /> improving vs report
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#B83230]" /> slipping vs report
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-3 w-[1px] bg-[#D6DAE0]" /> dashed line on a sparkline = report publication
          </span>
        </div>

        <p className="mt-4 max-w-3xl text-[12px] leading-relaxed text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          Provenance: every value is taken verbatim from the report’s underlying indicator series
          (<span className="font-mono">esabcc-indicators.ts</span>). Points flagged{' '}
          <span className="font-mono">afterReport</span> are figures the primary publisher (Eurostat
          / EEA / EAFO / IRENA / EHPA) released after the January-2024 report; the “improving /
          slipping” read is direction-aware (for a lower-is-better indicator, a fall counts as
          improvement). A “major” move is a change of at least {MAJOR_MOVE_PCT}% from the report
          baseline — a screen for attention, not a formal significance test.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}

export default function IndicatorCheckPage() {
  return (
    <SummerPrepGate>
      <IndicatorCheckInner />
    </SummerPrepGate>
  );
}
