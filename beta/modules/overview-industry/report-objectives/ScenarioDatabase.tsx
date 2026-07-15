'use client';

/**
 * Industry report — WHOLE-INDUSTRY SCENARIO DATABASE + NACE-C SUBSECTOR DRILL-DOWN.
 * ----------------------------------------------------------------------------
 * Three client pieces layered onto the report-objectives page:
 *
 *   1. MultiScenarioFigure  — every sourced industry pathway on one indexed
 *                             (base year = 100) line plot, with the ensemble
 *                             MEDIAN computed and drawn bold, and the European
 *                             Commission's 2040 Impact-Assessment scenarios
 *                             (S1/S2/S3) + the ESABCC 2040 advice highlighted.
 *   2. SubsectorDrilldown   — the whole-industry curve as a stacked area of its
 *                             NACE Section-C subsectors; click a band (or a chip)
 *                             to open that subsector's own emission pathway and
 *                             decarbonisation characterisation.
 *   3. ScenarioDatabaseTable — the full scenario + ensemble database as a
 *                             filterable browser table (also in the workbook).
 *
 * Every value resolves to a linked source via `scenarioSourceById`.
 */

import { useMemo, useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { usePreferences } from '@/lib/preferences-context';
import {
  SCENARIOS,
  SUBSECTORS,
  ENSEMBLE_FAMILIES,
  MEDIAN_YEARS,
  SUBSECTOR_YEARS,
  ensembleMedian,
  indexedValueAt,
  subsectorValueAt,
  scenarioSourceById,
  type IndustryScenario,
  type Subsector,
} from '@/data/industry-scenario-db';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

/* Highlight palette for the special (EU 2040) scenarios; muted grey for the
   rest of the ensemble so the highlighted lines and the median read clearly.
   Kept fixed across light/dark — only the chrome (grid/tick/median/point
   border) needs to adapt, per the dataviz theme-aware-palette guidance. */
const HIGHLIGHT_COLORS: Record<string, string> = {
  'sc-ec-ia-s1': '#7367C9',
  'sc-ec-ia-s2': '#E08020',
  'sc-ec-ia-s3': '#C0392B',
  'sc-esabcc-2040': '#00976B',
};
const MUTED = '#AEB6C2';

/* 9-way categorical palette for the subsector stack (validated for light UI;
   kept fixed across themes — same rationale as HIGHLIGHT_COLORS above). */
const SUB_COLORS = [
  '#2E5FCC', // steel
  '#C0392B', // cement & lime
  '#00976B', // chemicals
  '#7367C9', // non-ferrous
  '#E08020', // glass/ceramics
  '#0E9AA7', // food
  '#8E44AD', // paper
  '#5B7083', // f-gases
  '#B0782A', // other manufacturing
];

/* ── Theme-aware chart chrome ──────────────────────────────────────────
   Grid lines, ticks, the ensemble-median line and the hover point-border
   are tuned for a white chart card and go illegible the moment the card
   goes dark (near-white gridlines vanish; the near-black median line
   disappears). This hook resolves the *live* preference-context theme —
   not a one-shot read — so every chart consuming it re-renders on toggle.
   Shared with `report-objectives/page.tsx` (imported from there). */
export interface ChartTheme {
  isDark: boolean;
  grid: string;
  tick: string;
  median: string;
  pointBorder: string;
}

export function useChartTheme(): ChartTheme {
  const { resolvedTheme } = usePreferences();
  const isDark = resolvedTheme === 'dark';
  return useMemo(
    () => ({
      isDark,
      grid: isDark ? '#2A3644' : '#EDEEF0',
      tick: isDark ? '#8FA1B3' : '#54728C',
      median: isDark ? '#E6EBF0' : '#111827',
      // Hover-point border should match the card background so points read
      // as "cut out" of the card, in both themes (var(--mh-card)).
      pointBorder: isDark ? '#18222E' : '#FFFFFF',
    }),
    [isDark],
  );
}

/** Chart.js scale defaults (grid/border/ticks) for the given resolved theme. */
function baseScale(theme: ChartTheme) {
  return {
    grid: { color: theme.grid, drawTicks: false },
    border: { color: theme.grid },
    ticks: { color: theme.tick, font: { size: 11 } },
  };
}

function SourceLink({ sourceId, children }: { sourceId: string; children?: React.ReactNode }) {
  const s = scenarioSourceById(sourceId);
  if (!s) return children ? <>{children}</> : null;
  return (
    <a
      href={s.url}
      target="_blank"
      rel="noopener noreferrer"
      className="underline decoration-secondary-light underline-offset-2 hover:text-secondary-light"
      title={s.cite}
    >
      {children ?? s.short}
    </a>
  );
}

/* ═══════════════════════════ 1 · Multi-scenario figure ═══════════════════ */

const PLOT_YEARS = [2015, 2020, 2025, 2030, 2035, 2040, 2045, 2050, 2060, 2070];

export function MultiScenarioFigure() {
  const theme = useChartTheme();
  const median = useMemo(() => ensembleMedian(SCENARIOS), []);

  const data = useMemo<ChartData<'line'>>(() => {
    const scenarioSets = SCENARIOS.map((sc) => {
      const highlight = !!sc.highlight;
      const color = highlight ? HIGHLIGHT_COLORS[sc.id] ?? '#C0392B' : MUTED;
      return {
        label: sc.label,
        data: PLOT_YEARS.map((y) => {
          const v = indexedValueAt(sc, y);
          return { x: y, y: v == null ? null : Math.round(v * 10) / 10 };
        }),
        borderColor: color,
        backgroundColor: color,
        borderWidth: highlight ? 2.5 : 1.25,
        borderDash: highlight ? [] : [],
        pointRadius: highlight ? 3 : 0,
        pointHoverRadius: 6,
        pointBorderColor: theme.pointBorder,
        pointBorderWidth: 1.5,
        tension: 0.15,
        order: highlight ? 1 : 3,
        spanGaps: true,
      };
    });

    const medianSet = {
      label: 'Ensemble median',
      data: median.map((m) => ({ x: m.year, y: m.index })),
      borderColor: theme.median,
      backgroundColor: theme.median,
      borderWidth: 3.5,
      borderDash: [7, 4],
      pointRadius: 4,
      pointHoverRadius: 7,
      pointStyle: 'rectRot' as const,
      pointBackgroundColor: theme.median,
      tension: 0,
      order: 0,
      spanGaps: true,
    };

    return { datasets: [...scenarioSets, medianSet] };
  }, [median, theme]);

  const options = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Year ${items[0]?.parsed.x ?? ''}`,
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} (base = 100)`,
          },
        },
      },
      scales: {
        y: {
          ...baseScale(theme),
          title: { display: true, text: 'Index (base year = 100)', color: theme.tick, font: { size: 11 } },
          min: 0,
          suggestedMax: 105,
        },
        x: {
          ...baseScale(theme),
          type: 'linear' as const,
          min: 2015,
          max: 2072,
          grid: { display: false },
          ticks: { ...baseScale(theme).ticks, stepSize: 5, callback: (v) => String(v) },
        },
      },
    }),
    [theme],
  );

  const highlighted = SCENARIOS.filter((s) => s.highlight);
  const others = SCENARIOS.filter((s) => !s.highlight);

  return (
    <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm sm:p-5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
      <div className="text-[10px] font-bold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">Figure 6</div>
      <h3 className="text-[15px] font-bold text-grey-900 dark:text-[var(--mh-fg)]">
        Whole-industry emission pathways — the scenario ensemble &amp; its median
      </h3>
      <p className="mb-3 mt-0.5 text-xs leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">
        Every sourced industry pathway indexed to 100 in its own base year, so the pace of decline
        is comparable across scopes that must never be summed (global vs EU; direct vs direct+indirect).
        The <span className="font-semibold" style={{ color: theme.median }}>ensemble median</span> is
        computed across the pathways at each year. The European Commission&apos;s 2040 Impact-Assessment
        scenarios and the ESABCC 2040 advice are highlighted — they are the EU&apos;s own 2040 target
        pathways. Hover any line for its value; absolute tonnages and source links are in the table
        and the workbook.
      </p>

      <div className="relative h-[380px]">
        <Line data={data} options={options} />
      </div>

      {/* Custom legend — highlighted pathways + median called out; ensemble muted */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px]">
        <span className="flex items-center gap-1.5 font-semibold text-grey-800 dark:text-[var(--mh-fg)]">
          <span className="inline-block h-0.5 w-5" style={{ backgroundColor: theme.median, borderTop: `2px dashed ${theme.median}` }} />
          Ensemble median
        </span>
        {highlighted.map((s) => (
          <span key={s.id} className="flex items-center gap-1.5 text-grey-700">
            <span className="inline-block h-0.5 w-5" style={{ backgroundColor: HIGHLIGHT_COLORS[s.id] }} />
            {s.label}
          </span>
        ))}
        <span className="flex items-center gap-1.5 text-grey-500 dark:text-[var(--mh-muted)]">
          <span className="inline-block h-0.5 w-5" style={{ backgroundColor: MUTED }} />
          {others.length} further pathways (ensemble)
        </span>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-semibold text-secondary-light hover:underline">
          Figure data as table (indexed values, median &amp; sources)
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-grey-200 text-left text-grey-600 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)]">
                <th className="py-1.5 pr-3 font-semibold">Pathway</th>
                <th className="py-1.5 pr-3 font-semibold">Scope</th>
                {MEDIAN_YEARS.map((y) => (
                  <th key={y} className="py-1.5 pr-3 font-semibold tabular-nums">
                    {y}
                  </th>
                ))}
                <th className="py-1.5 pr-3 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((s) => (
                <tr key={s.id} className="border-b border-grey-100 text-grey-700 dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]">
                  <td className="py-1.5 pr-3">
                    {s.highlight && <span aria-hidden>★ </span>}
                    {s.label}
                  </td>
                  <td className="py-1.5 pr-3 text-grey-500 dark:text-[var(--mh-muted)]">{s.scope}</td>
                  {MEDIAN_YEARS.map((y) => {
                    const v = indexedValueAt(s, y);
                    return (
                      <td key={y} className="py-1.5 pr-3 tabular-nums">
                        {v == null ? '—' : Math.round(v)}
                      </td>
                    );
                  })}
                  <td className="py-1.5 pr-3">
                    <SourceLink sourceId={s.sourceId} />
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-grey-300 font-semibold text-grey-900 dark:border-[var(--mh-border)] dark:text-[var(--mh-fg)]">
                <td className="py-1.5 pr-3">Ensemble median</td>
                <td className="py-1.5 pr-3 text-grey-500 dark:text-[var(--mh-muted)]">indexed</td>
                {MEDIAN_YEARS.map((y) => {
                  const m = median.find((p) => p.year === y);
                  return (
                    <td key={y} className="py-1.5 pr-3 tabular-nums">
                      {m ? Math.round(m.index) : '—'}
                    </td>
                  );
                })}
                <td className="py-1.5 pr-3 text-grey-500 dark:text-[var(--mh-muted)]">computed</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

/* ═══════════════════════════ 2 · Subsector drill-down ════════════════════ */

export function SubsectorDrilldown() {
  const theme = useChartTheme();
  const [selected, setSelected] = useState<string | null>(null);
  const sub = SUBSECTORS.find((s) => s.id === selected) ?? null;

  const stackData = useMemo<ChartData<'line'>>(
    () => ({
      datasets: SUBSECTORS.map((s, i) => {
        const active = selected == null || selected === s.id;
        const base = SUB_COLORS[i % SUB_COLORS.length];
        return {
          label: s.label,
          data: SUBSECTOR_YEARS.map((y) => ({ x: y, y: subsectorValueAt(s, y) })),
          borderColor: base,
          backgroundColor: active ? `${base}D9` : `${base}33`,
          borderWidth: 1,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.2,
          order: i,
        };
      }),
    }),
    [selected],
  );

  const stackOptions = useMemo<ChartOptions<'line'>>(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      onClick: (_evt, elements) => {
        if (elements && elements.length > 0) {
          const idx = elements[0].datasetIndex;
          const s = SUBSECTORS[idx];
          if (s) setSelected((cur) => (cur === s.id ? null : s.id));
        }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Year ${items[0]?.parsed.x ?? ''}`,
            label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} Mt CO₂e`,
          },
        },
      },
      scales: {
        y: {
          ...baseScale(theme),
          stacked: true,
          title: { display: true, text: 'EU-27 industry GHG (Mt CO₂e)', color: theme.tick, font: { size: 11 } },
          min: 0,
        },
        x: {
          ...baseScale(theme),
          type: 'linear' as const,
          min: 2019,
          max: 2050,
          grid: { display: false },
          ticks: { ...baseScale(theme).ticks, stepSize: 5, callback: (v) => String(v) },
        },
      },
    }),
    [theme],
  );

  return (
    <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm sm:p-5 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
      <div className="text-[10px] font-bold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">Figure 7</div>
      <h3 className="text-[15px] font-bold text-grey-900 dark:text-[var(--mh-fg)]">
        Inside the curve — NACE Section-C subsectors &amp; their pathways
      </h3>
      <p className="mb-3 mt-0.5 text-xs leading-relaxed text-grey-600 dark:text-[var(--mh-muted)]">
        The whole-industry curve decomposed into its manufacturing subsectors, sized by 2019 EU-27
        emissions (reconciled to the 760 Mt CO₂e industry total) and carried forward on each
        subsector&apos;s own sourced decarbonisation pathway. <span className="font-semibold">Click a
        band</span> — or a chip below — to open that subsector&apos;s emission pathway, levers and the
        inventory categories behind it. The bands are indicative net-zero-2050 shapes from the cited
        sector roadmaps, indexed to 2019; they are not modelled tonnages.
      </p>

      <div className="grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        <div>
          <div className="relative h-[320px]">
            <Line data={stackData} options={stackOptions} />
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {SUBSECTORS.map((s, i) => {
              const active = selected === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => setSelected((cur) => (cur === s.id ? null : s.id))}
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                    active
                      ? 'border-grey-800 bg-grey-900 text-white dark:border-[var(--mh-fg)] dark:bg-[var(--mh-fg)] dark:text-[var(--mh-bg)]'
                      : 'border-grey-300 text-grey-600 hover:bg-grey-100 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)] dark:hover:bg-[var(--mh-bg)]'
                  }`}
                >
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SUB_COLORS[i % SUB_COLORS.length] }}
                  />
                  {s.label}
                  <span className="tabular-nums text-grey-400 dark:text-[var(--mh-muted)]">{Math.round(s.ghg2019)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Detail panel */}
        <div className="rounded-lg border border-grey-200 bg-grey-50 p-4 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)]">
          {sub ? (
            <SubsectorDetail sub={sub} onClose={() => setSelected(null)} />
          ) : (
            <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center text-sm text-grey-500 dark:text-[var(--mh-muted)]">
              <span className="mb-2 text-2xl" aria-hidden>
                ◔
              </span>
              <p className="max-w-[26ch]">
                Click a band or a chip to drill into a subsector&apos;s emission pathway and
                decarbonisation story.
              </p>
              <p className="mt-3 text-[11px] text-grey-400 dark:text-[var(--mh-muted)]">
                9 subsectors · {Math.round(SUBSECTORS.reduce((a, s) => a + s.ghg2019, 0))} Mt CO₂e in
                2019
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function SubsectorDetail({ sub, onClose }: { sub: Subsector; onClose: () => void }) {
  const theme = useChartTheme();
  const pathData = useMemo<ChartData<'line'>>(
    () => ({
      datasets: [
        {
          label: sub.label,
          data: (sub.pathway ?? []).map((p) => ({ x: p.year, y: p.index })),
          borderColor: '#C0392B',
          backgroundColor: '#C0392B22',
          borderWidth: 2.5,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          tension: 0.2,
        },
      ],
    }),
    [sub],
  );

  const share = ((sub.ghg2019 / SUBSECTORS.reduce((a, s) => a + s.ghg2019, 0)) * 100).toFixed(1);

  return (
    <div>
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <h4 className="text-[15px] font-bold leading-tight text-grey-900 dark:text-[var(--mh-fg)]">{sub.label}</h4>
          <div className="mt-0.5 flex flex-wrap gap-1 text-[10px] font-semibold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">
            <span className="rounded bg-grey-200 px-1.5 py-0.5 dark:bg-[var(--mh-border)]">
              NACE {sub.naceDivisions.join(', ')}
            </span>
            <span className="rounded bg-grey-200 px-1.5 py-0.5 tabular-nums dark:bg-[var(--mh-border)]">
              {sub.ghg2019} Mt · {share}%
            </span>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-grey-400 hover:bg-grey-200 hover:text-grey-700 dark:text-[var(--mh-muted)] dark:hover:bg-[var(--mh-border)] dark:hover:text-[var(--mh-fg)]"
          aria-label="Close subsector detail"
        >
          ✕
        </button>
      </div>

      <div className="relative mb-2 h-[130px]">
        <Line
          data={pathData}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => ` index ${c.parsed.y} (2019 = 100)` } } },
            scales: {
              y: { ...baseScale(theme), min: 0, suggestedMax: 105, title: { display: true, text: 'Index (2019 = 100)', color: theme.tick, font: { size: 10 } } },
              x: { ...baseScale(theme), type: 'linear' as const, min: 2019, max: 2050, grid: { display: false }, ticks: { ...baseScale(theme).ticks, stepSize: 10 } },
            },
          }}
        />
      </div>

      <p className="text-[12.5px] leading-relaxed text-grey-700 dark:text-[var(--mh-muted)]">{sub.characterisedBy}</p>

      <div className="mt-2.5">
        <div className="text-[10px] font-bold uppercase tracking-wide text-grey-500 dark:text-[var(--mh-muted)]">Near-zero levers</div>
        <div className="mt-1 flex flex-wrap gap-1">
          {sub.levers.map((l) => (
            <span key={l} className="rounded-full border border-grey-300 px-2 py-0.5 text-[11px] text-grey-600 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)]">
              {l}
            </span>
          ))}
        </div>
      </div>

      <dl className="mt-2.5 space-y-1 text-[11.5px] text-grey-600 dark:text-[var(--mh-muted)]">
        {sub.processShare && (
          <div className="flex gap-1.5">
            <dt className="font-semibold text-grey-800 dark:text-[var(--mh-fg)]">Emission type:</dt>
            <dd>{sub.processShare}</dd>
          </div>
        )}
        <div className="flex gap-1.5">
          <dt className="font-semibold text-grey-800 dark:text-[var(--mh-fg)]">Inventory (CRF):</dt>
          <dd>{sub.crfCategories}</dd>
        </div>
      </dl>

      <p className="mt-2.5 rounded border-l-2 border-grey-300 pl-2 text-[11.5px] leading-relaxed text-grey-600 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)]">
        {sub.pathwayNote} <SourceLink sourceId={sub.sourceId}>Source ↗</SourceLink>
      </p>
    </div>
  );
}

/* ═══════════════════════════ 3 · Scenario database table ═════════════════ */

export function ScenarioDatabaseTable() {
  const [view, setView] = useState<'scenarios' | 'ensembles'>('scenarios');

  return (
    <section>
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setView('scenarios')}
          aria-pressed={view === 'scenarios'}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            view === 'scenarios'
              ? 'border-primary bg-primary text-white'
              : 'border-grey-300 text-grey-600 hover:bg-grey-100 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)] dark:hover:bg-[var(--mh-bg)]'
          }`}
        >
          Scenarios ({SCENARIOS.length})
        </button>
        <button
          onClick={() => setView('ensembles')}
          aria-pressed={view === 'ensembles'}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${
            view === 'ensembles'
              ? 'border-primary bg-primary text-white'
              : 'border-grey-300 text-grey-600 hover:bg-grey-100 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)] dark:hover:bg-[var(--mh-bg)]'
          }`}
        >
          Ensembles &amp; databases ({ENSEMBLE_FAMILIES.length})
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-grey-200 bg-white shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]">
        {view === 'scenarios' ? (
          <table className="w-full min-w-[860px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-grey-200 bg-grey-50 text-left text-grey-600 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]">
                <th className="px-3 py-2 font-semibold">Scenario</th>
                <th className="px-3 py-2 font-semibold">Ensemble</th>
                <th className="px-3 py-2 font-semibold">Scope</th>
                <th className="px-3 py-2 font-semibold">Characterised by / how it differs</th>
                <th className="px-3 py-2 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {SCENARIOS.map((s) => (
                <tr key={s.id} className="border-b border-grey-100 align-top text-grey-700 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)]">
                  <td className="px-3 py-2 font-semibold text-grey-900 dark:text-[var(--mh-fg)]">
                    {s.highlight && <span className="mr-1 text-accent-orange" aria-hidden>★</span>}
                    {s.label}
                    {s.net2040 && <span className="block text-[10px] font-normal text-grey-500 dark:text-[var(--mh-muted)]">{s.net2040}</span>}
                  </td>
                  <td className="px-3 py-2">{s.ensemble}</td>
                  <td className="px-3 py-2 text-grey-500 dark:text-[var(--mh-muted)]">{s.scope}</td>
                  <td className="px-3 py-2">
                    <span className="text-grey-700 dark:text-[var(--mh-fg)]">{s.characterisedBy}</span>
                    <span className="mt-1 block text-[11px] italic text-grey-500 dark:text-[var(--mh-muted)]">Differs: {s.differsBy}</span>
                  </td>
                  <td className="px-3 py-2">
                    <SourceLink sourceId={s.sourceId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[860px] border-collapse text-xs">
            <thead>
              <tr className="border-b border-grey-200 bg-grey-50 text-left text-grey-600 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-muted)]">
                <th className="px-3 py-2 font-semibold">Ensemble / database</th>
                <th className="px-3 py-2 font-semibold">Operator</th>
                <th className="px-3 py-2 font-semibold">Scope</th>
                <th className="px-3 py-2 font-semibold">Characterised by / axis of variation</th>
                <th className="px-3 py-2 font-semibold">Plotted</th>
                <th className="px-3 py-2 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {ENSEMBLE_FAMILIES.map((e) => (
                <tr key={e.id} className="border-b border-grey-100 align-top text-grey-700 dark:border-[var(--mh-border)] dark:text-[var(--mh-muted)]">
                  <td className="px-3 py-2 font-semibold text-grey-900 dark:text-[var(--mh-fg)]">{e.name}</td>
                  <td className="px-3 py-2">{e.operator}</td>
                  <td className="px-3 py-2 text-grey-500 dark:text-[var(--mh-muted)]">{e.scope}</td>
                  <td className="px-3 py-2">
                    <span className="text-grey-700 dark:text-[var(--mh-fg)]">{e.characterisedBy}</span>
                    <span className="mt-1 block text-[11px] italic text-grey-500 dark:text-[var(--mh-muted)]">Differs: {e.differsBy}</span>
                  </td>
                  <td className="px-3 py-2">{e.plotted ? '✓' : '—'}</td>
                  <td className="px-3 py-2">
                    <SourceLink sourceId={e.sourceId} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
