'use client';
/**
 * Policy Targets → Indicators (beta module M · 53).
 *
 * The measurement layer of the Policy Gap report. M·36 established what EU
 * climate law actually requires — 819 verbatim targets from 61 acts, 544 of them
 * relevant to the transition. This module answers the question that follows:
 * for every one of those relevant targets, HOW do we measure whether it is being
 * met, and where can we not?
 *
 * Three views, all over the same ledger (src/data/target-indicators.ts):
 *   1. FLOW CHARTS — an overview figure carrying all nine sector columns at
 *      once (SectorOverview), from which any column expands into its own chart,
 *      drawn in the visual language of the Policy Gap 2.0 boards in the Project
 *      Workspace: dark sector goal at the top, first-order targets below it,
 *      second-order targets below those, and a procedural band at the foot.
 *      Acts start collapsed so a sector stays one figure; opening one turns it
 *      into target cards, and the white boxes beneath each card are its
 *      indicators.
 *   2. LEDGER — the whole assessment as a table, exportable as CSV, which is the
 *      artefact the report cites when it claims systematic coverage.
 *   3. MEASUREMENT GAPS — the targets no curated series measures yet, ranked by
 *      how many targets each missing indicator would cover, each with the named
 *      public dataset that would close it.
 *
 * Epistemic status: AI-compiled — pending Secretariat verification. The mapping
 * from a legal target to a measurement family is produced by a deterministic
 * vocabulary (scripts/target-indicator-catalogue.mjs), not by judgement at read
 * time, and every row carries the terms that fired plus a match-confidence flag.
 * The module asserts no values: what it asserts is that a given series (or a
 * given dataset, or the act's own deadline) is the right way to measure a given
 * target — and that is what a reviewer should challenge. Corrections belong in
 * scripts/target-indicators-overrides.json, never in the generated file.
 */
import { useCallback, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { FilterPill } from '@/components/ui/FilterPill';
import ModeSwitcher from '@/components/ui/ModeSwitcher';
import {
  CONFIDENCE_META,
  FAMILY_BY_KEY,
  ORPHANED_ASSESSMENTS,
  ROUTE_META,
  RUNG_META,
  UNASSESSED_TARGETS,
  computeCoverage,
  targetAssessments,
  type AssessmentRoute,
  type FlowColumnKey,
  type TargetAssessment,
} from '@/data/target-indicators';
import {
  EMPTY_FILTERS,
  applyFilters,
  buildFlowChart,
  columnCoverage,
  gapFamilies,
  ledgerCsv,
  overviewColumns,
  resolveIndicators,
  type Filters,
} from './model';
import SectorOverview from './SectorOverview';
import TargetFlow, { type FlowDensity } from './TargetFlow';

type View = 'flow' | 'ledger' | 'gaps';

/** Where the module's claims come from. */
const SOURCES: { label: string; url: string }[] = [
  { label: 'M·36 Policy Targets Register — the verbatim targets this module measures', url: '/beta/policy-targets' },
  { label: 'EUR-Lex — consolidated texts of every act cited', url: 'https://eur-lex.europa.eu/homepage.html' },
  { label: 'Eurostat dissemination database', url: 'https://ec.europa.eu/eurostat/data/database' },
  { label: 'EEA datahub and indicator catalogue', url: 'https://www.eea.europa.eu/en/datahub' },
  { label: 'European Alternative Fuels Observatory (EAFO)', url: 'https://alternative-fuels-observatory.ec.europa.eu/' },
  { label: 'EU Building Stock Observatory', url: 'https://building-stock-observatory.energy.ec.europa.eu/' },
  { label: 'Copernicus Climate Change Service (C3S)', url: 'https://climate.copernicus.eu/' },
  { label: 'ESABCC (2024) Towards EU climate neutrality — the sector assessment frameworks these charts follow', url: 'https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities' },
];

const fmt = (n: number) => n.toLocaleString('en-GB');
const pct = (n: number) => `${n.toFixed(0)} %`;

function StatTile({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-grey-200 bg-grey-50 px-3 py-2.5">
      <p className="text-[10.5px] uppercase tracking-wide text-tertiary-light">{label}</p>
      <p className="mt-0.5 font-mono text-lg tabular-nums text-tertiary-dark">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] leading-snug text-tertiary">{sub}</p>}
    </div>
  );
}

/** The detail panel for one card — the verbatim target and the whole audit trail. */
function TargetDetail({ row, onClose }: { row: TargetAssessment; onClose: () => void }) {
  const meta = ROUTE_META[row.route];
  const indicators = resolveIndicators(row.indicator_ids);
  return (
    <aside className="rounded-xl border border-grey-200 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-wide text-tertiary-light">
            {row.target.policy_short} · {row.target.article}
          </p>
          <h3 className="mt-0.5 text-base font-semibold text-tertiary-dark">{row.label}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="mh-focus shrink-0 rounded border border-grey-300 px-2 py-1 text-[11px] text-tertiary hover:bg-grey-50"
        >
          Close
        </button>
      </div>

      <blockquote className="mt-3 border-l-2 border-grey-300 pl-3 text-[13px] leading-relaxed text-tertiary">
        “{row.target.target_text}”
      </blockquote>
      <p className="mt-1.5 text-[11px] text-tertiary-light">
        Verbatim from the enacting terms; timeline as the act states it:{' '}
        <span className="font-medium text-tertiary">{row.target.timeline || 'unspecified'}</span>.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg p-3" style={{ background: meta.bg }}>
          <p className="text-[11px] font-semibold" style={{ color: meta.color }}>{meta.label}</p>
          <p className="mt-1 text-[11.5px] leading-snug text-tertiary">{meta.description}</p>
        </div>
        <div className="rounded-lg border border-grey-200 p-3">
          <p className="text-[11px] font-semibold text-tertiary-dark">
            {CONFIDENCE_META[row.confidence].label}
          </p>
          <p className="mt-1 text-[11.5px] leading-snug text-tertiary">
            {CONFIDENCE_META[row.confidence].note}
          </p>
        </div>
      </div>

      <div className="mt-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary-light">
          Measurement families
        </p>
        <ul className="mt-1 space-y-2">
          {row.families.map((k) => {
            const fam = FAMILY_BY_KEY[k];
            if (!fam) return null;
            return (
              <li key={k} className="rounded-lg border border-grey-200 p-2.5">
                <p className="text-[12.5px] font-medium text-tertiary-dark">{fam.label}</p>
                <p className="mt-0.5 text-[11px] text-tertiary">
                  Unit: <span className="font-mono tabular-nums">{fam.unit}</span>
                  {' · '}
                  {fam.indicator_ids.length
                    ? `${fam.indicator_ids.length} curated series`
                    : 'no curated series yet'}
                </p>
                <p className="mt-0.5 text-[11px] text-tertiary">
                  Dataset:{' '}
                  <a href={fam.dataset.url} target="_blank" rel="noopener noreferrer" className="text-primary-light underline">
                    {fam.dataset.name} ↗
                  </a>
                </p>
                <p className="mt-0.5 text-[10.5px] text-tertiary-light">
                  Matched on: {(row.evidence[k] ?? []).join(', ') || '—'}
                </p>
              </li>
            );
          })}
        </ul>
      </div>

      {indicators.length > 0 && (
        <div className="mt-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary-light">
            Curated series measuring this target
          </p>
          <ul className="mt-1 space-y-1">
            {indicators.map((ind) => (
              <li key={ind.id} className="flex flex-wrap items-baseline gap-x-2 text-[12px] text-tertiary">
                <span className="font-medium text-tertiary-dark">{ind.name}</span>
                <span className="font-mono tabular-nums text-[11px]">{ind.unit}</span>
                <a href={ind.sourceUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-primary-light underline">
                  {ind.source} ↗
                </a>
                {ind.beta && <span className="rounded bg-surface-yellow px-1 text-[10px] text-tertiary-dark">β provisional</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {row.override_reason && (
        <p className="mt-3 rounded-lg bg-surface-blue p-2.5 text-[11.5px] text-tertiary">
          Reviewed: {row.override_reason}
        </p>
      )}

      <p className="mt-3 text-[11px]">
        <a href={row.target.eurlex_url} target="_blank" rel="noopener noreferrer" className="text-primary-light underline">
          {row.target.policy_name} on EUR-Lex ↗
        </a>
      </p>
    </aside>
  );
}

export default function PolicyTargetFlowsPage() {
  const [view, setView] = useState<View>('flow');
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Act groups start collapsed: the chart is a figure first, a card wall second.
  const [density, setDensity] = useState<FlowDensity>('compact');
  const chartRef = useRef<HTMLDivElement | null>(null);

  const coverage = useMemo(() => computeCoverage(targetAssessments), []);
  const chart = useMemo(() => buildFlowChart(targetAssessments, filters), [filters]);
  const overview = useMemo(() => overviewColumns(targetAssessments, filters), [filters]);
  const chartGroups = useMemo(
    () => [...chart.outcomes, ...chart.levers, ...chart.enabling],
    [chart],
  );
  const chartTotal = chartGroups.reduce((n, g) => n + g.rows.length, 0);
  const chartActs = new Set(chartGroups.map((g) => g.policyId)).size;
  const perColumn = useMemo(() => columnCoverage(targetAssessments), []);
  const gaps = useMemo(() => gapFamilies(targetAssessments), []);
  const ledgerRows = useMemo(
    () => applyFilters(targetAssessments, filters, false)
      .sort((a, b) => a.target.policy_short.localeCompare(b.target.policy_short)
        || a.target.target_number - b.target.target_number),
    [filters],
  );
  const selected = useMemo(
    () => targetAssessments.find((r) => r.id === selectedId) ?? null,
    [selectedId],
  );

  const patch = (p: Partial<Filters>) => {
    setFilters((f) => ({ ...f, ...p }));
    setSelectedId(null);
  };

  /** Expand one column of the overview figure into its chart, and take the
   *  reader there — the figure is above the fold, the chart it opens is not. */
  const openColumn = useCallback((key: FlowColumnKey, selectId: string | null = null) => {
    setFilters((f) => ({ ...f, column: key }));
    setSelectedId(selectId);
    const reduced = typeof window !== 'undefined'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => {
      chartRef.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
    });
  }, []);

  const downloadCsv = () => {
    const blob = new Blob([`﻿${ledgerCsv(ledgerRows)}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policy-target-indicator-ledger.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const integrityBroken = ORPHANED_ASSESSMENTS.length > 0 || UNASSESSED_TARGETS.length > 0;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1280px] px-4 py-6 sm:px-6 sm:py-8">
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-tertiary-light">
          Beta module · M · 53 · Policy Gap 2.0 · Measurement layer
        </p>
        <h1 className="mt-1 text-2xl font-semibold text-tertiary-dark sm:text-3xl">
          Policy Targets → Indicators
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-tertiary">
          Every EU climate target the{' '}
          <Link href="/beta/policy-targets" className="text-primary-light underline">
            Policy Targets Register (M·36)
          </Link>{' '}
          judges relevant to the transition, placed on a sector flow chart and matched to the
          indicator that measures it. {fmt(coverage.total)} relevant targets across{' '}
          {coverage.policies} acts, none left unassessed: {fmt(coverage.byRoute.series)} are measured
          by a series MethodHub already curates, {fmt(coverage.byRoute.dataset)} have an indicator
          specified against a named public dataset that is not yet built here, and{' '}
          {fmt(coverage.byRoute.milestone)} name no measurable state of the world and are assessed
          as compliance milestones instead.
        </p>

        <div className="mt-4 rounded-lg border-l-4 border-accent-orange bg-surface-orange p-3">
          <p className="text-[13px] leading-relaxed text-tertiary-dark">
            <span className="font-semibold">AI-compiled — pending Secretariat verification.</span>{' '}
            The target texts are verbatim and human-reviewed in M·36; what is new here is the{' '}
            <em>mapping</em> from a target to a way of measuring it. That mapping is produced by a
            deterministic vocabulary, not by judgement at read time, and each card records the terms
            that fired. {fmt(coverage.byConfidence.weak)} rows are flagged{' '}
            <span className="font-semibold">weak</span> because the match rests on the provision
            heading or the act&apos;s title rather than the target&apos;s own wording — start there.
            A &ldquo;specified&rdquo; route means the dataset is named, not that it has been pulled:
            no values are asserted anywhere on this page.
          </p>
        </div>

        {integrityBroken && (
          <div className="mt-4 rounded-lg border-l-4 border-accent-red bg-surface-orange p-3">
            <p className="text-[13px] font-semibold text-accent-red">Ledger integrity failure</p>
            <p className="mt-1 text-[12.5px] text-tertiary-dark">
              {UNASSESSED_TARGETS.length > 0 && (
                <>{UNASSESSED_TARGETS.length} relevant M·36 target(s) carry no assessment row. </>
              )}
              {ORPHANED_ASSESSMENTS.length > 0 && (
                <>{ORPHANED_ASSESSMENTS.length} assessment row(s) point at a target that no longer
                  exists in the register. </>
              )}
              The register has been rebuilt without rebuilding this dataset — run{' '}
              <code className="rounded bg-white px-1 font-mono text-[11px]">npm run build:target-indicators</code>.
              The counts on this page are incomplete until that is done.
            </p>
          </div>
        )}

        {/* ── Stat strip ───────────────────────────────────────────────── */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Relevant targets assessed" value={fmt(coverage.total)} sub={`across ${coverage.policies} acts`} />
          <StatTile
            label="Measured by a series"
            value={`${fmt(coverage.byRoute.series)}`}
            sub={`${pct((coverage.byRoute.series / coverage.total) * 100)} of relevant targets`}
          />
          <StatTile
            label="Indicator specified only"
            value={`${fmt(coverage.byRoute.dataset)}`}
            sub="dataset named, series to build"
          />
          <StatTile label="Compliance milestones" value={fmt(coverage.byRoute.milestone)} sub="no measurable state of the world" />
          <StatTile label="Curated series in use" value={fmt(coverage.indicators)} sub={`${coverage.families} measurement families`} />
        </div>

        {/* ── View switcher ────────────────────────────────────────────── */}
        <div className="mt-6">
          <ModeSwitcher
            modes={[
              { id: 'flow', label: 'Trace the flow charts', subtitle: 'Targets and their indicators, sector by sector' },
              { id: 'ledger', label: 'Audit the ledger', subtitle: 'Every row, with its evidence — exportable' },
              { id: 'gaps', label: 'Close the gaps', subtitle: 'What is not measured, and the dataset that would fix it' },
            ] as const}
            value={view}
            onChange={(id) => setView(id as View)}
          />
        </div>

        {/* ── Filters ──────────────────────────────────────────────────── */}
        <div className="mt-4 rounded-xl border border-grey-200 bg-white p-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="search"
              value={filters.query}
              onChange={(e) => patch({ query: e.target.value })}
              placeholder="Search target text, act or family…"
              className="mh-focus w-full max-w-xs rounded-md border border-grey-300 px-2.5 py-1.5 text-[13px] sm:w-64"
            />
            <select
              value={filters.policy}
              onChange={(e) => patch({ policy: e.target.value })}
              className="mh-focus rounded-md border border-grey-300 px-2 py-1.5 text-[12.5px] text-tertiary"
            >
              <option value="">All acts</option>
              {chart.policies.map((p) => (
                <option key={p.id} value={p.id}>{p.short} ({p.count})</option>
              ))}
            </select>
            {(['series', 'dataset', 'milestone'] as AssessmentRoute[]).map((r) => (
              <FilterPill
                key={r}
                label={ROUTE_META[r].short}
                count={coverage.byRoute[r]}
                active={filters.route === r}
                onClick={() => patch({ route: filters.route === r ? '' : r })}
              />
            ))}
            <FilterPill
              label="Measurement gaps only"
              active={filters.gapsOnly}
              onClick={() => patch({ gapsOnly: !filters.gapsOnly })}
            />
            <FilterPill
              label="Weak matches only"
              count={coverage.byConfidence.weak}
              active={filters.weakOnly}
              onClick={() => patch({ weakOnly: !filters.weakOnly })}
            />
            {(filters.query || filters.policy || filters.route || filters.gapsOnly || filters.weakOnly) && (
              <button
                type="button"
                onClick={() => patch({ query: '', policy: '', route: '', gapsOnly: false, weakOnly: false })}
                className="mh-focus rounded-md px-2 py-1 text-[12px] text-primary-light underline"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* ── Flow charts ──────────────────────────────────────────────── */}
        {view === 'flow' && (
          <section className="mt-5 space-y-4">
            <SectorOverview
              overview={overview}
              selected={filters.column}
              onSelect={openColumn}
              filtered={Boolean(filters.query || filters.policy || filters.route || filters.gapsOnly || filters.weakOnly)}
            />

            <div ref={chartRef} className="scroll-mt-4 rounded-xl border border-grey-200 bg-white p-3">
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-grey-200 pb-2">
                <div>
                  <h2 className="text-[13.5px] font-semibold text-tertiary-dark">
                    {chart.column.label}
                  </h2>
                  <p className="mt-0.5 text-[11.5px] text-tertiary">
                    {fmt(chartTotal)} target{chartTotal === 1 ? '' : 's'} in view across{' '}
                    {chartActs} act{chartActs === 1 ? '' : 's'} — expand an act to read its targets.
                  </p>
                </div>
                <FilterPill
                  label={density === 'full' ? 'Cards open' : 'Open every act'}
                  active={density === 'full'}
                  onClick={() => setDensity(density === 'full' ? 'compact' : 'full')}
                  ariaLabel={density === 'full'
                    ? 'Collapse every act group back to the compact figure'
                    : 'Open every act group to show its target cards'}
                />
              </div>
              <TargetFlow
                chart={chart}
                selectedId={selectedId}
                onSelect={(row) => setSelectedId(row.id === selectedId ? null : row.id)}
                density={density}
              />
            </div>
            {selected && <TargetDetail row={selected} onClose={() => setSelectedId(null)} />}
            <div className="rounded-xl border border-grey-200 bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-tertiary-light">
                How to read the rows
              </p>
              <ul className="mt-1.5 grid gap-2 sm:grid-cols-3">
                {(['outcome', 'lever', 'enabling'] as const).map((k) => (
                  <li key={k} className="rounded-lg border border-grey-200 p-2.5">
                    <span className="inline-block h-2 w-6 rounded" style={{ background: RUNG_META[k].color }} />
                    <p className="mt-1 text-[12.5px] font-medium text-tertiary-dark">{RUNG_META[k].label}</p>
                    <p className="text-[11.5px] leading-snug text-tertiary">{RUNG_META[k].description}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-[11px] text-tertiary-light">
                A target that bears on several sectors is drawn in each of their columns; the ledger
                counts it once. Sector membership and first/second order come from M·36, not from
                this module.
              </p>
            </div>
          </section>
        )}

        {/* ── Ledger ───────────────────────────────────────────────────── */}
        {view === 'ledger' && (
          <section className="mt-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[12.5px] text-tertiary">
                {fmt(ledgerRows.length)} of {fmt(coverage.total)} rows shown — every relevant target,
                its verbatim requirement and how it is measured.
              </p>
              <button
                type="button"
                onClick={downloadCsv}
                className="mh-focus rounded-md bg-primary px-3 py-1.5 text-[12.5px] font-semibold text-white hover:bg-primary-dark"
              >
                Download ledger (CSV)
              </button>
            </div>
            <div className="overflow-x-auto rounded-xl border border-grey-200 bg-white">
              <table className="min-w-[1100px] w-full text-left text-[12px]">
                <thead className="bg-grey-50 text-[11px] uppercase tracking-wide text-tertiary-light">
                  <tr>
                    <th className="px-3 py-2 font-semibold">Act</th>
                    <th className="px-3 py-2 font-semibold">Target</th>
                    <th className="px-3 py-2 font-semibold">Row</th>
                    <th className="px-3 py-2 font-semibold">Route</th>
                    <th className="px-3 py-2 font-semibold">Measured by</th>
                    <th className="px-3 py-2 font-semibold">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.slice(0, 400).map((r) => (
                    <tr key={r.id} className="border-t border-grey-200 align-top hover:bg-grey-50">
                      <td className="px-3 py-2 text-tertiary">
                        <span className="font-medium text-tertiary-dark">{r.target.policy_short}</span>
                        <span className="block text-[10.5px] text-tertiary-light">{r.target.article}</span>
                      </td>
                      <td className="max-w-[380px] px-3 py-2">
                        <button
                          type="button"
                          onClick={() => { setView('flow'); openColumn(r.columns[0], r.id); }}
                          className="mh-focus text-left text-tertiary-dark underline decoration-grey-300 underline-offset-2"
                        >
                          {r.label}
                        </button>
                        <span className="block text-[10.5px] text-tertiary-light">
                          {r.target.timeline || 'No date in the quote'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-tertiary">{RUNG_META[r.rung].label}</td>
                      <td className="px-3 py-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10.5px] font-semibold"
                          style={{ color: ROUTE_META[r.route].color, background: ROUTE_META[r.route].bg }}
                        >
                          {ROUTE_META[r.route].short}
                        </span>
                      </td>
                      <td className="max-w-[300px] px-3 py-2 text-tertiary">
                        {r.families.map((k) => FAMILY_BY_KEY[k]?.label ?? k).join('; ')}
                      </td>
                      <td className="px-3 py-2 text-tertiary-light">{CONFIDENCE_META[r.confidence].label}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {ledgerRows.length > 400 && (
              <p className="text-[11.5px] text-tertiary-light">
                Showing the first 400 rows to keep the table responsive — the CSV export contains all{' '}
                {fmt(ledgerRows.length)} filtered rows.
              </p>
            )}
            {ledgerRows.length === 0 && (
              <p className="rounded-lg border border-dashed border-grey-300 bg-grey-50 px-4 py-8 text-center text-sm text-tertiary">
                No target matches the current filters.
              </p>
            )}
          </section>
        )}

        {/* ── Gaps ─────────────────────────────────────────────────────── */}
        {view === 'gaps' && (
          <section className="mt-5 space-y-4">
            <div className="rounded-xl border border-grey-200 bg-white p-4">
              <h2 className="text-base font-semibold text-tertiary-dark">
                Indicators worth building first
              </h2>
              <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-tertiary">
                Measurement families that no curated MethodHub series covers, ranked by how many
                relevant targets each one would measure. Every row names the public dataset the
                series would be built from, so closing a gap is a data pull with a known source
                rather than an open research question.
              </p>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-[12.5px]">
                  <thead className="bg-grey-50 text-[11px] uppercase tracking-wide text-tertiary-light">
                    <tr>
                      <th className="px-3 py-2 font-semibold">Indicator to build</th>
                      <th className="px-3 py-2 font-semibold">Unit</th>
                      <th className="px-3 py-2 font-semibold">Targets covered</th>
                      <th className="px-3 py-2 font-semibold">Acts</th>
                      <th className="px-3 py-2 font-semibold">Dataset to pull</th>
                    </tr>
                  </thead>
                  <tbody>
                    {gaps.map((g) => (
                      <tr key={g.family.key} className="border-t border-grey-200 align-top">
                        <td className="px-3 py-2 font-medium text-tertiary-dark">{g.family.label}</td>
                        <td className="px-3 py-2 font-mono text-[11.5px] tabular-nums text-tertiary">{g.family.unit}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-tertiary">{g.targets}</td>
                        <td className="px-3 py-2 font-mono tabular-nums text-tertiary">{g.policies}</td>
                        <td className="px-3 py-2">
                          <a href={g.family.dataset.url} target="_blank" rel="noopener noreferrer" className="text-primary-light underline">
                            {g.family.dataset.name} ↗
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-xl border border-grey-200 bg-white p-4">
              <h2 className="text-base font-semibold text-tertiary-dark">Coverage by sector</h2>
              <div className="mt-3 space-y-2">
                {perColumn.map((c) => (
                  <div key={c.column.key} className="flex flex-wrap items-center gap-3">
                    <span className="w-44 shrink-0 text-[12.5px] text-tertiary-dark">{c.column.short}</span>
                    <span className="w-20 shrink-0 font-mono text-[12px] tabular-nums text-tertiary">
                      {fmt(c.total)}
                    </span>
                    <span className="flex h-3 min-w-[220px] flex-1 overflow-hidden rounded" title={`${c.series} series · ${c.dataset} specified · ${c.milestone} milestones`}>
                      {(['series', 'dataset', 'milestone'] as AssessmentRoute[]).map((r) => {
                        const n = r === 'series' ? c.series : r === 'dataset' ? c.dataset : c.milestone;
                        if (!n || !c.total) return null;
                        return (
                          <span
                            key={r}
                            style={{ width: `${(n / c.total) * 100}%`, background: ROUTE_META[r].color }}
                          />
                        );
                      })}
                    </span>
                    <span className="w-28 shrink-0 text-right font-mono text-[12px] tabular-nums text-tertiary">
                      {pct(c.seriesShare)} series
                    </span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-tertiary-light">
                Columns count a multi-sector target once per sector it bears on, so the column totals
                sum to more than {fmt(coverage.total)}.
              </p>
            </div>

            {coverage.unusedFamilies.length > 0 && (
              <div className="rounded-xl border border-grey-200 bg-white p-4">
                <h2 className="text-base font-semibold text-tertiary-dark">
                  Measurement capacity with no legal target attached
                </h2>
                <p className="mt-1 max-w-3xl text-[12.5px] leading-relaxed text-tertiary">
                  The mirror image of a measurement gap: {coverage.unusedFamilies.length} families in
                  the catalogue matched no target in the register at all. Either EU law sets no target
                  on them — which is itself a finding for the Policy Gap report — or the register is
                  missing the act that does.
                </p>
                <p className="mt-2 flex flex-wrap gap-1.5">
                  {coverage.unusedFamilies.map((k) => (
                    <span key={k} className="rounded border border-grey-300 bg-grey-50 px-2 py-0.5 text-[11.5px] text-tertiary">
                      {FAMILY_BY_KEY[k]?.label ?? k}
                    </span>
                  ))}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ── Caveats & sources ────────────────────────────────────────── */}
        <section className="mt-8 rounded-xl border border-grey-200 bg-grey-50 p-4">
          <h2 className="text-base font-semibold text-tertiary-dark">Caveats &amp; sources</h2>
          <ul className="mt-2 space-y-1.5 text-[12.5px] leading-relaxed text-tertiary">
            <li>
              <span className="font-medium text-tertiary-dark">What is claimed.</span> Every target
              M·36 marks relevant has been assigned an assessment route — the build fails if one has
              not. That is a claim about coverage of the <em>assessment</em>, not that every target is
              currently measured: {fmt(coverage.byRoute.dataset)} rows are specified against a dataset
              that has not been pulled into MethodHub.
            </li>
            <li>
              <span className="font-medium text-tertiary-dark">What is not claimed.</span> Nothing
              here says a target is met, missed or on track, and no numeric value is asserted. The
              module maps targets to measurements; reading progress off those measurements is the
              indicator database&apos;s job.
            </li>
            <li>
              <span className="font-medium text-tertiary-dark">The 275 peripheral targets.</span> Rows
              M·36 classifies as peripheral to the transition are deliberately out of scope. That
              relevance call is inherited from the register, not re-made here.
            </li>
            <li>
              <span className="font-medium text-tertiary-dark">Match quality.</span>{' '}
              {fmt(coverage.byConfidence.strong)} strong, {fmt(coverage.byConfidence.moderate)}{' '}
              moderate and {fmt(coverage.byConfidence.weak)} weak matches; {coverage.overridden} rows
              carry a recorded reviewer correction. A family can be right in subject and still be the
              wrong measure of a particular target — that is the review this module is waiting for.
            </li>
            <li>
              <span className="font-medium text-tertiary-dark">Sector goal statements</span> in the
              dark band are compiled from the provisions cited beneath them and are the only prose on
              this page not quoted from the register.
            </li>
          </ul>
          <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
            {SOURCES.map((s) => (
              <li key={s.url} className="text-[12px]">
                <a
                  href={s.url}
                  target={s.url.startsWith('http') ? '_blank' : undefined}
                  rel={s.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                  className="text-primary-light underline"
                >
                  {s.label} {s.url.startsWith('http') ? '↗' : ''}
                </a>
              </li>
            ))}
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
