'use client';

/**
 * Overview Industry — Industry report: objectives & evidence base.
 * -----------------------------------------------------------------
 * The objectives page for the next progress report's industry work:
 *
 *   1. OBJECTIVES  — what the industry report sets out to do.
 *   2. FIGURES     — key overview figures aggregating the pathway, scenario
 *                    (incl. the IIASA-hosted AR6 ensemble) and investment
 *                    evidence, each with a table-view twin.
 *   3. ROADMAPS    — a synthesis of industrial decarbonisation pathways /
 *                    roadmaps (incl. investment timelines) and of the clean-
 *                    tech industry's role in economy-wide decarbonisation.
 *   4. DATA        — every extracted data point, filterable, with the exact
 *                    link to the scientific paper / source behind it.
 *
 * One Excel download carries all four layers. All values live in
 * `src/data/industry-report-objectives.ts`; nothing on this page is unsourced.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { downloadTableWorkbook, type SheetSpec, type CellValue } from '@/lib/exports/excel';
import {
  IR_META,
  OBJECTIVES,
  SOURCES,
  ROADMAPS,
  DATA_POINTS,
  TRAJECTORIES,
  ELECTRIFICATION_BENCHMARKS,
  INVESTMENT_INDUSTRY,
  INVESTMENT_ECONOMY,
  FUNDING_CHANNELS,
  TOPIC_META,
  sourceById,
  type IrTopic,
  type IrFigureBar,
} from '@/data/industry-report-objectives';
import { SCENARIO_SOURCES } from '@/data/industry-scenario-db';
import { MultiScenarioFigure, SubsectorDrilldown, ScenarioDatabaseTable } from './ScenarioDatabase';
import { scenarioSheets } from './scenario-export';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

/* ── Chart palette — categorical, fixed assignment order, validated
      (dataviz six-checks, light surface #FFFFFF/#F9FAFB) ─────────────── */
const CAT = ['#2E5FCC', '#00976B', '#E08020', '#7367C9', '#C0392B'];
const GRID = '#EDEEF0';
const TICK = '#54728C';

const BASE_SCALE_OPTS = {
  grid: { color: GRID, drawTicks: false },
  border: { color: GRID },
  ticks: { color: TICK, font: { size: 11 } },
};

/** Wrap a category label onto multiple tick lines so it never truncates. */
function wrapLabel(label: string, width = 26): string[] {
  const words = label.split(' ');
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    if (line && (line + ' ' + w).length > width) {
      lines.push(line);
      line = w;
    } else {
      line = line ? `${line} ${w}` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/* ── Small building blocks ─────────────────────────────────────────── */

function SourceLink({ sourceId, children }: { sourceId: string; children?: React.ReactNode }) {
  const s = sourceById(sourceId);
  if (!s) return null;
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

/** Table-view twin for a figure — every charted value, readable without color. */
function FigureTable({
  headers,
  rows,
}: {
  headers: string[];
  rows: (string | number | { sourceId: string })[][];
}) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-xs font-semibold text-secondary-light hover:underline">
        Figure data as table (with sources)
      </summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[540px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-grey-200 text-left text-grey-600">
              {headers.map((h) => (
                <th key={h} className="py-1.5 pr-4 font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-grey-100 text-grey-700">
                {r.map((c, j) => (
                  <td key={j} className="py-1.5 pr-4 tabular-nums">
                    {typeof c === 'object' ? <SourceLink sourceId={c.sourceId} /> : c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function FigureCard({
  number,
  title,
  subtitle,
  children,
}: {
  number: number;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-grey-500">
        Figure {number}
      </div>
      <h3 className="text-[15px] font-bold text-grey-900">{title}</h3>
      <p className="mb-3 mt-0.5 text-xs leading-relaxed text-grey-600">{subtitle}</p>
      {children}
    </section>
  );
}

/* ── Figure 1: pathway trajectories (indexed to a common base) ─────── */

function TrajectoriesFigure() {
  const years = useMemo(() => {
    const ys = new Set<number>();
    TRAJECTORIES.forEach((t) => t.series.forEach((p) => ys.add(p.year)));
    return Array.from(ys).sort((a, b) => a - b);
  }, []);

  const data = useMemo(
    () => ({
      datasets: TRAJECTORIES.map((t, i) => {
        const base = t.series[0].value;
        return {
          label: t.label,
          data: t.series.map((p) => ({
            x: p.year,
            y: Math.round((p.value / base) * 1000) / 10,
          })),
          borderColor: CAT[i % CAT.length],
          backgroundColor: CAT[i % CAT.length],
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBorderColor: '#FFFFFF',
          pointBorderWidth: 2,
          tension: 0.15,
        };
      }),
    }),
    [],
  );

  return (
    <FigureCard
      number={1}
      title="Industry emissions under net-zero pathways"
      subtitle="Each pathway indexed to 100 in its own base year (scopes differ — EU vs global, sector coverage varies — so levels are not directly comparable; the common index makes the pace comparable). Hover for values; exact tonnages, scopes and links sit in the table and the Excel."
    >
      <div className="relative h-[320px]">
        <Line
          data={data}
          options={{
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'nearest', intersect: false },
            plugins: {
              legend: {
                position: 'bottom',
                labels: { boxWidth: 14, boxHeight: 3, color: TICK, font: { size: 11 } },
              },
              tooltip: {
                callbacks: {
                  title: (items) => String(items[0]?.parsed.x ?? ''),
                  label: (ctx) => ` ${ctx.dataset.label}: ${ctx.parsed.y} (base = 100)`,
                },
              },
            },
            scales: {
              y: {
                ...BASE_SCALE_OPTS,
                title: { display: true, text: 'Index (base year = 100)', color: TICK, font: { size: 11 } },
                min: 0,
              },
              x: {
                ...BASE_SCALE_OPTS,
                type: 'linear' as const,
                min: 2015,
                max: 2070,
                grid: { display: false },
                ticks: {
                  ...BASE_SCALE_OPTS.ticks,
                  stepSize: 5,
                  callback: (v) => String(v),
                },
              },
            },
          }}
        />
      </div>
      <FigureTable
        headers={['Pathway', 'Scope', 'Unit', ...years.map(String), 'Source']}
        rows={TRAJECTORIES.map((t) => [
          t.label,
          t.scope,
          t.unit,
          ...years.map((y) => {
            const p = t.series.find((s) => s.year === y);
            return p ? p.value : '—';
          }),
          { sourceId: t.sourceId },
        ])}
      />
    </FigureCard>
  );
}

/* ── Figures 2 & 3: benchmark bars (single series → one color) ─────── */

function BenchmarkFigure({
  number,
  title,
  subtitle,
  items,
  color,
  axisLabel,
  suggestedMax,
}: {
  number: number;
  title: string;
  subtitle: string;
  items: IrFigureBar[];
  color: string;
  axisLabel: string;
  suggestedMax?: number;
}) {
  const data = useMemo(
    () => ({
      labels: items.map((b) => b.label),
      datasets: [
        {
          label: axisLabel,
          data: items.map((b) => (Array.isArray(b.value) ? b.value : [0, b.value])) as [
            number,
            number,
          ][],
          backgroundColor: color,
          borderColor: color,
          borderWidth: 0,
          borderRadius: { topRight: 4, bottomRight: 4 },
          borderSkipped: false as const,
          barThickness: 18,
          categoryPercentage: 0.7,
        },
      ],
    }),
    [items, axisLabel, color],
  );

  return (
    <FigureCard number={number} title={title} subtitle={subtitle}>
      <div className="relative" style={{ height: `${64 + items.length * 56}px` }}>
        <Bar
          data={data}
          options={{
            indexAxis: 'y' as const,
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (ctx) => {
                    const b = items[ctx.dataIndex];
                    const v = Array.isArray(b.value) ? `${b.value[0]}–${b.value[1]}` : b.value;
                    return ` ${v} ${b.unit}${b.note ? ` — ${b.note}` : ''}`;
                  },
                },
              },
            },
            scales: {
              x: {
                ...BASE_SCALE_OPTS,
                suggestedMax,
                title: { display: true, text: axisLabel, color: TICK, font: { size: 11 } },
              },
              y: {
                ...BASE_SCALE_OPTS,
                grid: { display: false },
                ticks: {
                  ...BASE_SCALE_OPTS.ticks,
                  autoSkip: false,
                  font: { size: 10.5 },
                  callback: (_v, i) => wrapLabel(items[i].label),
                },
              },
            },
          }}
        />
      </div>
      <FigureTable
        headers={['Estimate', 'Value', 'Unit', 'Scope / note', 'Source']}
        rows={items.map((b) => [
          b.label,
          Array.isArray(b.value) ? `${b.value[0]}–${b.value[1]}` : b.value,
          b.unit,
          b.note ?? '',
          { sourceId: b.sourceId },
        ])}
      />
    </FigureCard>
  );
}

/* ── Excel export — data, objectives, scenarios, source link per row ── */

function exportWorkbook() {
  const link = (sourceId: string): CellValue => {
    const s = sourceById(sourceId);
    return s ? { text: s.url, hyperlink: s.url } : '';
  };
  const cite = (sourceId: string) => sourceById(sourceId)?.cite ?? '';

  const sheets: SheetSpec[] = [
    {
      name: 'Objectives',
      title: 'Industry report — objectives',
      subtitle: `${IR_META.title} · compiled ${IR_META.compiledOn} · working draft, not a Board position`,
      headers: ['#', 'Objective', 'What it covers', 'Deliverables'],
      rows: OBJECTIVES.map((o, i) => [i + 1, o.title, o.description, o.deliverables.join(' • ')]),
    },
    {
      name: 'Roadmap synthesis',
      title: 'Synthesis of industrial decarbonisation pathways, roadmaps and clean-tech evidence',
      subtitle: 'One row per roadmap/study — summary, levers, investment timeline, milestones, source link',
      headers: [
        'Theme',
        'Roadmap / study',
        'Publisher',
        'Year',
        'Region',
        'Type',
        'Synthesis',
        'Main levers',
        'Investment timeline',
        'Milestones',
        'Full citation',
        'Source link',
      ],
      rows: ROADMAPS.map((r) => {
        const s = sourceById(r.sourceId);
        return [
          r.theme === 'pathways' ? 'Decarbonisation pathways / roadmaps' : 'Clean-tech industry role',
          r.name,
          r.publisher,
          r.year,
          r.region,
          s?.type ?? '',
          r.summary,
          r.levers.join(' • '),
          r.investmentTimeline,
          r.milestones.map((m) => `${m.period}: ${m.milestone}`).join(' • '),
          cite(r.sourceId),
          link(r.sourceId),
        ];
      }),
    },
    {
      name: 'Data points',
      title: 'All extracted data points',
      subtitle:
        'Every value with its scenario, region, year and the exact link to the scientific paper / source it was extracted from',
      headers: [
        'Topic',
        'Variable',
        'Value',
        'Unit',
        'Region',
        'Scenario / pathway',
        'Year',
        'Note',
        'Full citation',
        'Source link',
      ],
      rows: DATA_POINTS.map((d) => [
        TOPIC_META[d.topic].label,
        d.variable,
        d.value,
        d.unit,
        d.region,
        d.scenario,
        d.year,
        d.note ?? '',
        cite(d.sourceId),
        link(d.sourceId),
      ]),
    },
    {
      name: 'Scenario series',
      title: 'Figure 1 — pathway trajectories (original units)',
      subtitle: 'Long format: one row per pathway-year, with the source link per row',
      headers: ['Pathway', 'Scenario', 'Scope', 'Year', 'Value', 'Unit', 'Full citation', 'Source link'],
      rows: TRAJECTORIES.flatMap((t) =>
        t.series.map((p) => [
          t.label,
          t.scenario,
          t.scope,
          p.year,
          p.value,
          t.unit,
          cite(t.sourceId),
          link(t.sourceId),
        ]),
      ),
    },
    {
      name: 'Figure benchmarks',
      title: 'Figures 2–5 — benchmark bars (electrification & investment)',
      subtitle: 'One row per bar, with scope note and the source link per row',
      headers: ['Figure', 'Estimate', 'Value', 'Unit', 'Scope / note', 'Full citation', 'Source link'],
      rows: [
        ...ELECTRIFICATION_BENCHMARKS.map((b): CellValue[] => [
          'Fig 2 — electrification',
          b.label,
          Array.isArray(b.value) ? `${b.value[0]}–${b.value[1]}` : b.value,
          b.unit,
          b.note ?? '',
          cite(b.sourceId),
          link(b.sourceId),
        ]),
        ...INVESTMENT_INDUSTRY.map((b): CellValue[] => [
          'Fig 3 — investment, EU heavy industry',
          b.label,
          Array.isArray(b.value) ? `${b.value[0]}–${b.value[1]}` : b.value,
          b.unit,
          b.note ?? '',
          cite(b.sourceId),
          link(b.sourceId),
        ]),
        ...INVESTMENT_ECONOMY.map((b): CellValue[] => [
          'Fig 4 — investment, EU economy-wide',
          b.label,
          Array.isArray(b.value) ? `${b.value[0]}–${b.value[1]}` : b.value,
          b.unit,
          b.note ?? '',
          cite(b.sourceId),
          link(b.sourceId),
        ]),
        ...FUNDING_CHANNELS.map((b): CellValue[] => [
          'Fig 5 — funding channels (totals)',
          b.label,
          Array.isArray(b.value) ? `${b.value[0]}–${b.value[1]}` : b.value,
          b.unit,
          b.note ?? '',
          cite(b.sourceId),
          link(b.sourceId),
        ]),
      ],
    },
    ...scenarioSheets(),
    {
      name: 'Sources',
      title: 'Source register',
      subtitle: 'Every source used, with type and link (DOI where available)',
      headers: ['ID', 'Type', 'Full citation', 'DOI', 'Link'],
      rows: [
        ...SOURCES.map((s): CellValue[] => [
          s.id,
          s.type,
          s.cite,
          s.doi ?? '',
          { text: s.url, hyperlink: s.url },
        ]),
        ...SCENARIO_SOURCES.map((s): CellValue[] => [
          s.id,
          s.family,
          s.cite,
          s.doi ?? '',
          { text: s.url, hyperlink: s.url },
        ]),
      ],
    },
  ];

  void downloadTableWorkbook('industry-report-objectives-evidence-base.xlsx', sheets);
}

/* ── Page ───────────────────────────────────────────────────────────── */

const TOPIC_KEYS = Object.keys(TOPIC_META) as IrTopic[];

export default function ReportObjectivesPage() {
  const [topicFilter, setTopicFilter] = useState<IrTopic | 'all'>('all');

  const filteredPoints = useMemo(
    () => DATA_POINTS.filter((d) => topicFilter === 'all' || d.topic === topicFilter),
    [topicFilter],
  );

  const pathwayRoadmaps = ROADMAPS.filter((r) => r.theme === 'pathways');
  const cleantechRoadmaps = ROADMAPS.filter((r) => r.theme === 'cleantech');

  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-content px-4 py-8">
        <nav className="mb-4 text-sm text-grey-500">
          <Link href="/beta/overview-industry" className="hover:underline">
            Overview Industry
          </Link>
          <span className="mx-1">/</span>
          <span className="text-grey-700">Industry report — objectives</span>
        </nav>

        <header className="mb-8">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded border border-primary-lighter bg-surface-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              Working draft · not a Board position
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900">
            Industry report — objectives &amp; evidence base
          </h1>
          <p className="mt-2 max-w-text text-grey-700">
            What the next report&apos;s industry work sets out to do, and the evidence it stands
            on: a synthesis of industrial decarbonisation pathways and roadmaps (including their
            investment timelines), a synthesis of the clean-tech industry&apos;s role in
            economy-wide decarbonisation, key overview figures aggregating pathway, scenario and
            investment data — and one Excel download in which every data point carries the exact
            link to the paper or database it came from.
          </p>
          <button
            onClick={exportWorkbook}
            className="mt-4 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
          >
            ⬇ Download the full workbook (Excel)
          </button>
          <p className="mt-1.5 text-xs text-grey-500">
            12 sheets: objectives · roadmap synthesis · all data points · scenario series · figure
            benchmarks · scenario database · scenario pathways · scenario ensembles · NACE-C
            subsectors · subsector pathways · industry history · source register — a clickable
            source link on every data row.
          </p>
        </header>

        {/* 1 ── Objectives */}
        <section aria-labelledby="objectives-h" className="mb-10">
          <h2 id="objectives-h" className="mb-1 text-lg font-bold text-grey-900">
            1 · Overview of objectives
          </h2>
          <p className="mb-4 max-w-text text-sm text-grey-600">
            Three objectives frame the industry report; each maps to a section of this page and a
            sheet of the workbook.
          </p>
          <div className="grid gap-4 lg:grid-cols-3">
            {OBJECTIVES.map((o, i) => (
              <article
                key={o.id}
                className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm"
                style={{ borderTop: `3px solid ${CAT[i % CAT.length]}` }}
              >
                <div className="text-[10px] font-bold uppercase tracking-wide text-grey-500">
                  Objective {i + 1}
                </div>
                <h3 className="text-[15px] font-bold leading-snug text-grey-900">{o.title}</h3>
                <p className="mt-1.5 text-[13px] leading-relaxed text-grey-600">{o.description}</p>
                <ul className="mt-2.5 space-y-1">
                  {o.deliverables.map((d) => (
                    <li key={d} className="flex gap-1.5 text-xs leading-snug text-grey-600">
                      <span aria-hidden className="mt-0.5 text-secondary">
                        ✓
                      </span>
                      {d}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* 2 ── Figures */}
        <section aria-labelledby="figures-h" className="mb-10">
          <h2 id="figures-h" className="mb-1 text-lg font-bold text-grey-900">
            2 · Key overview figures
          </h2>
          <p className="mb-4 max-w-text text-sm text-grey-600">
            Aggregated from the roadmaps, the peer-reviewed pathway literature and the
            IIASA-hosted AR6 scenario ensemble. Figure&nbsp;6 puts every sourced pathway on one
            indexed plot with the computed ensemble median and the EU&apos;s own 2040 scenarios
            highlighted; Figure&nbsp;7 opens the whole-industry curve into its NACE Section-C
            subsectors. Every figure has a table-view twin, and every underlying value is in the
            workbook with its source link.
          </p>
          <div className="space-y-5">
            <TrajectoriesFigure />
            <BenchmarkFigure
              number={2}
              title="How far industry electrifies"
              subtitle="Electricity's share of final energy — where the scenario ensembles land, what the technical-potential literature says is electrifiable, and the EU's near-term economy-wide marker. Scopes differ by row (industry vs economy-wide — see each row's note in the tooltip and table); ranges shown as floating bars."
              items={ELECTRIFICATION_BENCHMARKS}
              color={CAT[0]}
              axisLabel="% of final energy"
              suggestedMax={100}
            />
            {/* Investment: three scopes at three different scales — separate
                charts instead of one misleading shared axis. */}
            <div className="grid gap-5 lg:grid-cols-2 xl:grid-cols-3">
              <BenchmarkFigure
                number={3}
                title="Investment per year — EU heavy industry"
                subtitle="Annualised additional investment behind the Material Economics net-zero pathways (steel, chemicals, ammonia, cement)."
                items={INVESTMENT_INDUSTRY}
                color={CAT[1]}
                axisLabel="bn EUR per year"
              />
              <BenchmarkFigure
                number={4}
                title="Investment per year — EU economy-wide"
                subtitle="System-level annual investment estimates for context — a different scale and scope than Figure 3, hence a separate axis."
                items={INVESTMENT_ECONOMY}
                color={CAT[2]}
                axisLabel="bn EUR per year"
              />
              <BenchmarkFigure
                number={5}
                title="Funding channels & programmes"
                subtitle="Programme and sector-need totals (bn EUR, not per year): the EU funding channels against the steel sector's stated need to 2030."
                items={FUNDING_CHANNELS}
                color={CAT[3]}
                axisLabel="bn EUR (total)"
              />
            </div>
            <MultiScenarioFigure />
            <SubsectorDrilldown />
          </div>
        </section>

        {/* 2b ── Scenario database */}
        <section aria-labelledby="scenariodb-h" className="mb-10">
          <h2 id="scenariodb-h" className="mb-1 text-lg font-bold text-grey-900">
            3 · The scenario database
          </h2>
          <p className="mb-4 max-w-text text-sm text-grey-600">
            The widened evidence base behind Figure 6: a browsable database of every industry
            emission pathway — from the IIASA-hosted AR6 ensemble, PIK (REMIND / Ariadne), the
            European Commission&apos;s 2040 Impact Assessment (S1/S2/S3, highlighted), the IEA, the
            ECEMF multi-model EU ensemble and the ESABCC&apos;s own work — each with what it is
            characterised by and how it differs, plus the scenario infrastructure the report draws
            on. The same tables are in the workbook, with a source link on every row.
          </p>
          <ScenarioDatabaseTable />
        </section>

        {/* 3 ── Roadmap synthesis */}
        <section aria-labelledby="roadmaps-h" className="mb-10">
          <h2 id="roadmaps-h" className="mb-1 text-lg font-bold text-grey-900">
            4 · Synthesis of pathways, roadmaps &amp; the clean-tech evidence
          </h2>
          <p className="mb-4 max-w-text text-sm text-grey-600">
            One card per roadmap or study — its core finding, main levers, investment timeline and
            milestones. Grouped into the two syntheses the report objectives call for.
          </p>

          {[
            {
              key: 'pathways',
              heading: 'Industrial decarbonisation pathways & roadmaps (incl. investment timelines)',
              items: pathwayRoadmaps,
            },
            {
              key: 'cleantech',
              heading: 'The clean-tech industry in economy-wide decarbonisation',
              items: cleantechRoadmaps,
            },
          ].map((g) => (
            <div key={g.key} className="mb-6">
              <div className="mb-3 flex items-center gap-2">
                <h3 className="text-[13px] font-bold uppercase tracking-wide text-grey-600">
                  {g.heading}
                </h3>
                <span className="h-px flex-1 bg-grey-200" />
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                {g.items.map((r) => (
                  <article
                    key={r.id}
                    className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-grey-500">
                      <span className="rounded bg-grey-100 px-1.5 py-0.5">{r.publisher}</span>
                      <span className="rounded bg-grey-100 px-1.5 py-0.5">{r.year}</span>
                      <span className="rounded bg-grey-100 px-1.5 py-0.5">{r.region}</span>
                      <span className="rounded bg-surface-blue px-1.5 py-0.5 text-primary">
                        {sourceById(r.sourceId)?.type}
                      </span>
                    </div>
                    <h4 className="mt-1.5 text-[15px] font-bold leading-snug text-grey-900">
                      <SourceLink sourceId={r.sourceId}>{r.name}</SourceLink>
                    </h4>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-grey-700">{r.summary}</p>
                    <div className="mt-2.5 flex flex-wrap gap-1.5">
                      {r.levers.map((l) => (
                        <span
                          key={l}
                          className="rounded-full border border-grey-200 px-2 py-0.5 text-[11px] text-grey-600"
                        >
                          {l}
                        </span>
                      ))}
                    </div>
                    <p className="mt-2.5 text-[12.5px] leading-relaxed text-grey-700">
                      <span className="font-semibold text-grey-900">Investment timeline: </span>
                      {r.investmentTimeline}
                    </p>
                    {r.milestones.length > 0 && (
                      <ol className="mt-2.5 space-y-1 border-l-2 border-grey-200 pl-3">
                        {r.milestones.map((m) => (
                          <li key={m.period} className="text-xs leading-snug text-grey-600">
                            <span className="font-bold text-grey-900">{m.period}</span> —{' '}
                            {m.milestone}
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                ))}
              </div>
            </div>
          ))}
        </section>

        {/* 4 ── Data points */}
        <section aria-labelledby="data-h" className="mb-10">
          <h2 id="data-h" className="mb-1 text-lg font-bold text-grey-900">
            5 · All extracted data points
          </h2>
          <p className="mb-4 max-w-text text-sm text-grey-600">
            The full extraction behind the figures and syntheses — every value with its scenario,
            region, year and the exact source link. The workbook carries the same table.
          </p>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              onClick={() => setTopicFilter('all')}
              aria-pressed={topicFilter === 'all'}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                topicFilter === 'all'
                  ? 'border-primary bg-primary text-white'
                  : 'border-grey-300 text-grey-600 hover:bg-grey-100'
              }`}
            >
              All ({DATA_POINTS.length})
            </button>
            {TOPIC_KEYS.map((t) => {
              const active = topicFilter === t;
              const n = DATA_POINTS.filter((d) => d.topic === t).length;
              return (
                <button
                  key={t}
                  onClick={() => setTopicFilter(t)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold ${
                    active
                      ? 'border-primary bg-primary text-white'
                      : 'border-grey-300 text-grey-600 hover:bg-grey-100'
                  }`}
                >
                  {TOPIC_META[t].label} ({n})
                </button>
              );
            })}
          </div>

          <div className="overflow-x-auto rounded-xl border border-grey-200 bg-white shadow-sm">
            <table className="w-full min-w-[900px] border-collapse text-xs">
              <thead>
                <tr className="border-b border-grey-200 bg-grey-50 text-left text-grey-600">
                  <th className="px-3 py-2 font-semibold">Topic</th>
                  <th className="px-3 py-2 font-semibold">Variable</th>
                  <th className="px-3 py-2 font-semibold">Value</th>
                  <th className="px-3 py-2 font-semibold">Region</th>
                  <th className="px-3 py-2 font-semibold">Scenario / pathway</th>
                  <th className="px-3 py-2 font-semibold">Year</th>
                  <th className="px-3 py-2 font-semibold">Source</th>
                </tr>
              </thead>
              <tbody>
                {filteredPoints.map((d) => (
                  <tr key={d.id} className="border-b border-grey-100 align-top text-grey-700">
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className="inline-block rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{
                          backgroundColor: `${TOPIC_META[d.topic].color}1A`,
                          color: TOPIC_META[d.topic].color,
                        }}
                      >
                        {TOPIC_META[d.topic].label}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {d.variable}
                      {d.note && <span className="block text-[11px] text-grey-500">{d.note}</span>}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-semibold tabular-nums text-grey-900">
                      {d.value} {d.unit}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">{d.region}</td>
                    <td className="px-3 py-2">{d.scenario}</td>
                    <td className="whitespace-nowrap px-3 py-2 tabular-nums">{d.year}</td>
                    <td className="px-3 py-2">
                      <SourceLink sourceId={d.sourceId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="max-w-text text-xs leading-relaxed text-grey-500">
          Provenance: every number on this page was extracted from the cited roadmap, paper,
          policy document or the AR6 scenario database hosted by IIASA, and each carries its exact
          source link (DOI where one exists) here and in the workbook. Scope differences between
          sources (EU vs global; heavy industry vs whole industry vs energy system) are flagged
          per row and are why figures index or annotate rather than sum across sources. The
          selection of sources and the synthesis wording are AI-compiled working judgements
          pending sector-lead sign-off ({IR_META.compiledOn}). Nothing here is a Board position.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
