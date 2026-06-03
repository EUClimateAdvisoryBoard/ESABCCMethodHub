/**
 * Indicator database module for the Project Workspace.
 * -----------------------------------------------------
 * Combines seed ECNO indicators with user-added ones into a single
 * table + chart surface. All persistence is via the Supabase-backed
 * API under /api/project-workspace.
 *
 * Initial data is rendered server-side and passed in as `initial`; the
 * component then mutates locally on each successful write so the chart
 * and table update without a full reload.
 */
'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { saveAs } from 'file-saver';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';
import {
  INDICATOR_CATEGORIES,
  LIVE_REFRESHABLE_INDICATORS,
  type Indicator,
  type IndicatorCategory,
  type IndicatorDataPoint,
} from '@/data/ecno-indicators';
import { pwApi, type IndicatorImportSummary } from '@/lib/project-workspace/client';
import type { IndicatorSheetLayout } from '@/lib/project-workspace/indicator-sheet';
import IndicatorDataEditor from './IndicatorDataEditor';
import IndicatorHistory from './IndicatorHistory';
import DownloadMenu from './DownloadMenu';
import CollaborationPanel from './CollaborationPanel';
import FrameworkBoard from './FrameworkBoard';
import { buildExportProvenance, type SheetSpec, type DocBlock } from '@/lib/exports';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * Two top-level groups in the sidebar. ESABCC indicators (rebuilt from
 * the 2024 progress report's underlying-data workbook) are listed first
 * as the "existing" set; everything else (ECNO mapping + user-added)
 * follows as additional.
 */
const GROUPS = [
  {
    id: 'esabcc' as const,
    label: 'Existing indicators',
    help: 'Rebuilt from the 2024 ESABCC progress report (Towards EU climate neutrality).',
  },
  {
    id: 'additional' as const,
    label: 'Additional indicators',
    help: 'ECNO progress-tracker mapping plus any user-added indicators.',
  },
];

function groupOf(i: Indicator): 'esabcc' | 'additional' {
  return i.group ?? (i.id.startsWith('esabcc-') ? 'esabcc' : 'additional');
}

interface Props {
  projectId: string;
  initial: Indicator[];
  initialLayouts: Record<string, IndicatorSheetLayout>;
}

export default function IndicatorModule({ projectId, initial, initialLayouts }: Props) {
  const router = useRouter();
  const chartRef = useRef<HTMLDivElement>(null);
  const [indicators, setIndicators] = useState<Indicator[]>(initial);
  const [layouts, setLayouts] = useState<Record<string, IndicatorSheetLayout>>(initialLayouts);
  const [selectedId, setSelectedId] = useState<string>(initial[0]?.id ?? '');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  // Show the sector flow-chart view wherever the indicator database contains
  // the ESABCC report cluster (ids prefixed `esabcc-`) — i.e. the report
  // workspace — regardless of the project's exact id. (Gating on a hard-coded
  // project id broke when the project was created with a different id.)
  const showFrameworks = initial.some((i) => i.id.startsWith('esabcc-'));
  // The flow-chart overview is the landing view — the frameworks are what
  // motivate the indicators, so users see them first.
  const [view, setView] = useState<'indicators' | 'flowcharts'>(
    showFrameworks ? 'flowcharts' : 'indicators'
  );
  const [editorOpen, setEditorOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<
    { kind: 'ok' | 'err'; message: string } | null
  >(null);

  const selected = indicators.find(i => i.id === selectedId) ?? indicators[0];
  const duplicateCounterpart = selected?.duplicateOf
    ? indicators.find(i => i.id === selected.duplicateOf)
    : undefined;

  function patchLocal(id: string, patch: Partial<Indicator>) {
    setIndicators(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }

  function handleSheetSaved(
    id: string,
    points: IndicatorDataPoint[],
    layout: IndicatorSheetLayout,
    source: string
  ) {
    patchLocal(id, {
      data: [...points].sort((a, b) => a.year - b.year),
      source: source || indicators.find(i => i.id === id)?.source,
    });
    setLayouts(prev => ({ ...prev, [id]: layout }));
    setEditorOpen(false);
  }

  async function handleRemovePoint(id: string, year: number) {
    setBusy(true);
    try {
      await pwApi.deletePoint(id, year);
      patchLocal(id, {
        data: indicators.find(i => i.id === id)!.data.filter(d => d.year !== year),
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddIndicator(
    input: Omit<Indicator, 'id' | 'data' | 'isSeed'>,
    points: IndicatorDataPoint[] = []
  ) {
    setBusy(true);
    try {
      const { indicator } = await pwApi.createIndicator({
        projectId,
        name: input.name,
        category: input.category,
        unit: input.unit,
        description: input.description,
        source: input.source,
        sourceUrl: input.sourceUrl,
        direction: input.direction,
        targetValue: input.targetValue,
        targetYear: input.targetYear,
      });
      const saved: IndicatorDataPoint[] = [];
      for (const p of points) {
        await pwApi.upsertPoint({ indicatorId: indicator.id, year: p.year, value: p.value });
        saved.push(p);
      }
      const next: Indicator = {
        ...input,
        id: indicator.id,
        data: saved.sort((a, b) => a.year - b.year),
        isSeed: false,
      };
      setIndicators(prev => [...prev, next]);
      setSelectedId(indicator.id);
      setAdding(false);
    } finally {
      setBusy(false);
    }
  }

  async function handleRefreshFromSource(id: string) {
    setBusy(true);
    setRefreshStatus(null);
    try {
      const res = await pwApi.refreshIndicator(id);
      patchLocal(id, { data: res.points });
      setRefreshStatus({
        kind: 'ok',
        message: `Pulled ${res.pointsFetched} point${res.pointsFetched === 1 ? '' : 's'} from ${res.source}.`,
      });
    } catch (e) {
      setRefreshStatus({ kind: 'err', message: (e as Error).message });
    } finally {
      setBusy(false);
    }
  }

  async function handleDeleteIndicator(id: string) {
    if (!confirm('Delete this user-added indicator and all its data points?')) return;
    setBusy(true);
    try {
      await pwApi.deleteIndicator(id);
      setIndicators(prev => prev.filter(i => i.id !== id));
      if (selectedId === id) setSelectedId(indicators[0]?.id ?? '');
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function handleDownloadExcel() {
    setBusy(true);
    setRefreshStatus(null);
    try {
      const blob = await pwApi.downloadIndicatorsWorkbook(projectId);
      const date = new Date().toISOString().slice(0, 10);
      saveAs(blob, `indicator-database-${projectId}-${date}.xlsx`);
    } catch (e) {
      setRefreshStatus({ kind: 'err', message: `Download failed: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  if (!selected) {
    return (
      <div className="text-sm text-tertiary">
        No indicators yet.{' '}
        <button onClick={() => setAdding(true)} className="text-primary underline">
          Add one
        </button>
        .
        {adding && (
          <AddIndicatorDialog onClose={() => setAdding(false)} onSave={handleAddIndicator} />
        )}
      </div>
    );
  }

  // Highlight points added after the 2024 ESABCC report so reviewers can
  // see at a glance which values are the latest updates (orange, larger)
  // versus the original report figures (blue).
  const hasAfterReport = selected.data.some(d => d.afterReport);
  const POST_REPORT_COLOR = '#E8702A';
  const REPORT_COLOR = '#0065A4';
  const chartData = {
    labels: selected.data.map(d => d.year),
    datasets: [
      {
        label: `${selected.name} (${selected.unit})`,
        data: selected.data.map(d => d.value),
        borderColor: REPORT_COLOR,
        backgroundColor: 'rgba(0, 101, 164, 0.25)',
        tension: 0.25,
        pointRadius: selected.data.map(d => (d.afterReport ? 5 : 3)),
        pointBackgroundColor: selected.data.map(d =>
          d.afterReport ? POST_REPORT_COLOR : REPORT_COLOR
        ),
        pointBorderColor: selected.data.map(d =>
          d.afterReport ? POST_REPORT_COLOR : REPORT_COLOR
        ),
        // Draw the segment that extends past the report as a dashed orange
        // line so the post-report extension is visually distinct.
        segment: {
          borderColor: (ctx: { p1DataIndex: number }) =>
            selected.data[ctx.p1DataIndex]?.afterReport
              ? POST_REPORT_COLOR
              : REPORT_COLOR,
          borderDash: (ctx: { p1DataIndex: number }) =>
            selected.data[ctx.p1DataIndex]?.afterReport ? [5, 4] : undefined,
        },
      },
      ...(selected.targetValue !== undefined && selected.targetYear !== undefined
        ? [
            {
              label: `Target (${selected.targetYear})`,
              data: selected.data.map(() => selected.targetValue!),
              borderColor: '#C8102E',
              borderDash: [4, 4],
              backgroundColor: 'transparent',
              pointRadius: 0,
            },
          ]
        : []),
    ],
  };

  const ChartCmp = chartType === 'line' ? Line : Bar;

  return (
    <div className="space-y-6">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-bold text-tertiary-dark">Indicator database</h2>
          <p className="text-sm text-tertiary mt-1 max-w-2xl">
            Two clusters: <strong>existing indicators</strong> rebuilt
            from the 2024 ESABCC progress report (Towards EU climate
            neutrality) underlying-data workbook, and{' '}
            <strong>additional indicators</strong> covering the ECNO
            building blocks plus anything user-added. Use{' '}
            <em>Refresh from source</em> on supported entries to pull
            updates from Eurostat / EEA / EAFO / IRENA / EHPA.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadExcel}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border border-grey-200 text-tertiary-dark text-xs font-semibold hover:bg-grey-50 disabled:opacity-50"
            title="Download the whole indicator database as one Excel workbook — one tab per indicator"
          >
            ↓ Download all (Excel)
          </button>
          <button
            type="button"
            onClick={() => setImportOpen(true)}
            disabled={busy}
            className="px-3 py-1.5 rounded-md border border-grey-200 text-tertiary-dark text-xs font-semibold hover:bg-grey-50 disabled:opacity-50"
            title="Upload an edited workbook to update the indicator database"
          >
            ↑ Upload Excel
          </button>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark"
          >
            + Add indicator
          </button>
        </div>
      </header>

      {showFrameworks && (
        <div className="flex items-center gap-1 border border-grey-200 rounded-lg p-0.5 w-fit">
          <button
            type="button"
            onClick={() => setView('indicators')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              view === 'indicators' ? 'bg-primary text-white' : 'text-tertiary-dark hover:bg-grey-50'
            }`}
          >
            List of indicators
          </button>
          <button
            type="button"
            onClick={() => setView('flowcharts')}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold ${
              view === 'flowcharts' ? 'bg-primary text-white' : 'text-tertiary-dark hover:bg-grey-50'
            }`}
          >
            Flow charts
          </button>
        </div>
      )}

      {showFrameworks && view === 'flowcharts' ? (
        <FrameworkBoard
          projectId={projectId}
          allIndicators={indicators}
          onOpenInList={(id) => {
            setSelectedId(id);
            setView('indicators');
          }}
        />
      ) : (
      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <aside className="bg-white rounded-xl border border-grey-200 p-3 max-h-[640px] overflow-y-auto">
          {GROUPS.map(g => {
            const inGroup = indicators.filter(i => groupOf(i) === g.id);
            if (inGroup.length === 0) return null;
            return (
              <div key={g.id} className="mb-4">
                <p className="text-[11px] uppercase tracking-wide text-tertiary-dark font-bold mb-1 pb-1 border-b border-grey-200">
                  {g.label}{' '}
                  <span className="text-tertiary-light font-normal">
                    ({inGroup.length})
                  </span>
                </p>
                <p className="text-[10px] text-tertiary-light mb-2 leading-snug">
                  {g.help}
                </p>
                {INDICATOR_CATEGORIES.map(cat => {
                  const inCat = inGroup.filter(i => i.category === cat.id);
                  if (inCat.length === 0) return null;
                  return (
                    <div key={cat.id} className="mb-2">
                      <p className="text-[10px] uppercase tracking-wide text-tertiary-light font-semibold mb-1">
                        {cat.label}
                      </p>
                      <ul className="space-y-0.5">
                        {inCat.map(i => (
                          <li key={i.id}>
                            <button
                              type="button"
                              onClick={() => setSelectedId(i.id)}
                              className={`w-full text-left px-2 py-1.5 rounded text-xs leading-snug ${
                                selectedId === i.id
                                  ? 'bg-primary/10 text-primary font-medium'
                                  : 'text-tertiary-dark hover:bg-grey-50'
                              }`}
                            >
                              {i.code && (
                                <span className="font-mono text-tertiary-light mr-1">
                                  {i.code}
                                </span>
                              )}
                              {i.name}
                              {i.duplicateOf && (
                                <span
                                  className="ml-1 text-[9px] uppercase text-amber-700"
                                  title="Duplicate of indicator in the other group"
                                >
                                  ↔ dup
                                </span>
                              )}
                              {!i.isSeed && (
                                <span className="ml-1 text-[9px] uppercase text-secondary">
                                  custom
                                </span>
                              )}
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </aside>

        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-grey-200 p-4">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h3 className="text-sm font-bold text-tertiary-dark">{selected.name}</h3>
                <p className="text-xs text-tertiary mt-0.5 max-w-xl">
                  {selected.description}
                </p>
                <p className="text-[10px] text-tertiary-light mt-1">
                  Source:{' '}
                  {selected.sourceUrl ? (
                    <a
                      href={selected.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="underline hover:text-primary"
                    >
                      {selected.source}
                    </a>
                  ) : (
                    selected.source
                  )}
                  {' · '}Unit: {selected.unit}
                  {selected.targetValue !== undefined && selected.targetYear !== undefined && (
                    <>
                      {' · '}Target {selected.targetValue} {selected.unit} by{' '}
                      {selected.targetYear}
                    </>
                  )}
                </p>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setChartType('line')}
                  className={`px-2 py-1 text-[10px] rounded border ${
                    chartType === 'line'
                      ? 'bg-primary text-white border-primary'
                      : 'border-grey-200 text-tertiary'
                  }`}
                >
                  Line
                </button>
                <button
                  type="button"
                  onClick={() => setChartType('bar')}
                  className={`px-2 py-1 text-[10px] rounded border ${
                    chartType === 'bar'
                      ? 'bg-primary text-white border-primary'
                      : 'border-grey-200 text-tertiary'
                  }`}
                >
                  Bar
                </button>
                <button
                  type="button"
                  onClick={() => setEditorOpen(true)}
                  className="px-2 py-1 text-[10px] rounded border border-grey-200 text-tertiary"
                  disabled={busy}
                  title="Open the spreadsheet editor: add data, helper columns and derive columns with Excel-like formulas (e.g. =B*C)"
                >
                  Edit data / calc
                </button>
                <button
                  type="button"
                  onClick={() => setHistoryOpen(true)}
                  className="px-2 py-1 text-[10px] rounded border border-grey-200 text-tertiary"
                  disabled={busy}
                  title="View the change log (who changed what, and when) and restore a previous version"
                >
                  History
                </button>
                <DownloadMenu
                  size="sm"
                  filename={`indicator-${selected.id}`}
                  provenance={buildExportProvenance([selected.source, selected.name])}
                  chart={{ getContainer: () => chartRef.current }}
                  data={{ getSheets: () => [buildIndicatorSheet(selected)] }}
                  text={{ getBlocks: () => buildIndicatorDoc(selected) }}
                />
                {LIVE_REFRESHABLE_INDICATORS.has(selected.id) && (
                  <button
                    type="button"
                    onClick={() => handleRefreshFromSource(selected.id)}
                    disabled={busy}
                    className="px-2 py-1 text-[10px] rounded border border-primary text-primary disabled:opacity-50"
                    title="Pull the latest values from the public source (Eurostat / EEA)"
                  >
                    {busy ? 'Refreshing…' : 'Refresh from source'}
                  </button>
                )}
                {!selected.isSeed && (
                  <button
                    type="button"
                    onClick={() => handleDeleteIndicator(selected.id)}
                    className="px-2 py-1 text-[10px] rounded border border-red-200 text-red-700"
                    disabled={busy}
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
            {duplicateCounterpart && (
              <div className="text-[11px] px-2 py-1.5 rounded mb-2 bg-amber-50 border border-amber-200 text-amber-900">
                Duplicate of{' '}
                <button
                  type="button"
                  className="underline font-medium"
                  onClick={() => setSelectedId(duplicateCounterpart.id)}
                >
                  {duplicateCounterpart.code ? `${duplicateCounterpart.code} — ` : ''}
                  {duplicateCounterpart.name}
                </button>{' '}
                in the {groupOf(duplicateCounterpart) === 'esabcc' ? 'existing' : 'additional'}{' '}
                group. Check source / units before merging.
              </div>
            )}
            {refreshStatus && (
              <div
                className={`text-[11px] px-2 py-1.5 rounded mb-2 ${
                  refreshStatus.kind === 'ok'
                    ? 'bg-green-50 text-green-800 border border-green-200'
                    : 'bg-red-50 text-red-800 border border-red-200'
                }`}
                role="status"
              >
                {refreshStatus.message}
              </div>
            )}
            <div className="h-72" ref={chartRef}>
              {selected.data.length > 0 ? (
                <ChartCmp
                  data={chartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' as const } },
                  }}
                />
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-tertiary-light">
                  No data points yet — click “Add data” to record one.
                </div>
              )}
            </div>
            {hasAfterReport && (
              <p className="mt-2 text-[11px] text-tertiary flex items-center gap-1.5">
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: POST_REPORT_COLOR }}
                  aria-hidden
                />
                Orange points (dashed segment) are the latest updates pulled
                from the primary source <strong>after</strong> the 2024 ESABCC
                report — not part of the original report figures.
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-grey-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-grey-50 text-tertiary uppercase tracking-wide text-[10px]">
                <tr>
                  <th className="px-3 py-2 text-left">Year</th>
                  <th className="px-3 py-2 text-right">Value ({selected.unit})</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {selected.data.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-3 text-center text-tertiary-light">
                      No data points.
                    </td>
                  </tr>
                )}
                {selected.data.map(d => (
                  <tr
                    key={d.year}
                    className={`border-t border-grey-100 ${
                      d.afterReport ? 'bg-orange-50' : ''
                    }`}
                  >
                    <td className="px-3 py-1.5">
                      {d.year}
                      {d.afterReport && (
                        <span
                          className="ml-2 align-middle text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded text-white"
                          style={{ backgroundColor: '#E8702A' }}
                          title="Added after the 2024 ESABCC report — latest update from the primary source"
                        >
                          new
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-1.5 text-right font-mono">{d.value}</td>
                    <td className="px-3 py-1.5 text-right">
                      <button
                        type="button"
                        className="text-[10px] text-tertiary hover:text-red-600 disabled:opacity-50"
                        disabled={busy}
                        onClick={() => handleRemovePoint(selected.id, d.year)}
                      >
                        remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="bg-white rounded-xl border border-grey-200 p-4">
            <CollaborationPanel
              projectId={projectId}
              target={{ kind: 'indicator', id: selected.id }}
              heading={`Review & discussion — ${selected.name}`}
            />
          </div>
        </div>
      </div>
      )}

      {adding && (
        <AddIndicatorDialog onClose={() => setAdding(false)} onSave={handleAddIndicator} />
      )}
      {editorOpen && selected && (
        <IndicatorDataEditor
          indicator={selected}
          layout={layouts[selected.id]}
          onClose={() => setEditorOpen(false)}
          onSaved={(points, layout, source) =>
            handleSheetSaved(selected.id, points, layout, source)
          }
        />
      )}
      {importOpen && (
        <ImportExcelDialog
          projectId={projectId}
          onClose={() => setImportOpen(false)}
        />
      )}
      {historyOpen && selected && (
        <IndicatorHistory
          indicatorId={selected.id}
          indicatorName={selected.name}
          onClose={() => setHistoryOpen(false)}
          onRestored={() => router.refresh()}
        />
      )}
    </div>
  );
}

function ImportExcelDialog({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<IndicatorImportSummary | null>(null);

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const res = await pwApi.importIndicatorsWorkbook(projectId, file);
      setResult(res);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  // Once changes are applied the in-page chart/table won't reflect them until
  // the server component re-renders, so reload on close after a successful run.
  function done() {
    if (result) window.location.reload();
    else onClose();
  }

  const totalPoints = result?.summary.reduce((n, s) => n + s.pointsWritten, 0) ?? 0;
  const totalDeleted = result?.summary.reduce((n, s) => n + s.pointsDeleted, 0) ?? 0;
  const metaCount = result?.summary.filter(s => s.metadataUpdated).length ?? 0;
  const perIndicatorWarnings =
    result?.summary.flatMap(s => s.warnings.map(w => `${s.id}: ${w}`)) ?? [];
  const allWarnings = [...(result?.warnings ?? []), ...perIndicatorWarnings];

  return (
    <DialogShell title="Upload indicator workbook" onClose={done}>
      {!result ? (
        <div className="text-sm">
          <p className="text-xs text-tertiary mb-3">
            Upload an edited copy of the indicator-database workbook. Indicators
            are matched by the <strong>ID</strong> column on the “Indicators”
            tab; each tab’s <strong>Year</strong> / <strong>Value</strong> rows
            replace that indicator’s plotted series, and any helper columns you
            added are saved for next time. New IDs are ignored — add new
            indicators with “+ Add indicator”.
          </p>
          <input
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="block w-full text-xs text-tertiary file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-grey-200 file:bg-grey-50 file:text-tertiary-dark file:text-xs hover:file:bg-grey-100"
            onChange={e => {
              setFile(e.target.files?.[0] ?? null);
              setError(null);
            }}
          />
          {error && <p className="mt-2 text-[11px] text-red-700">{error}</p>}
          <div className="mt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button
              type="button"
              disabled={!file || busy}
              onClick={handleUpload}
              className={btnPrimary}
            >
              {busy ? 'Uploading…' : 'Upload & apply'}
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm">
          <div className="rounded-md bg-green-50 border border-green-200 text-green-800 text-xs px-3 py-2 mb-3">
            Processed <strong>{result.indicatorsProcessed}</strong> indicator
            {result.indicatorsProcessed === 1 ? '' : 's'}: wrote{' '}
            <strong>{totalPoints}</strong> data point{totalPoints === 1 ? '' : 's'}
            {totalDeleted > 0 && <> · removed {totalDeleted}</>}
            {metaCount > 0 && <> · updated metadata on {metaCount}</>}.
          </div>
          {allWarnings.length > 0 && (
            <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-900 text-[11px] px-3 py-2 mb-3 max-h-48 overflow-y-auto">
              <p className="font-semibold mb-1">
                {allWarnings.length} note{allWarnings.length === 1 ? '' : 's'}:
              </p>
              <ul className="list-disc pl-4 space-y-0.5">
                {allWarnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            </div>
          )}
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={done} className={btnPrimary}>
              Done
            </button>
          </div>
        </div>
      )}
    </DialogShell>
  );
}

function AddIndicatorDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (i: Omit<Indicator, 'id' | 'data' | 'isSeed'>, points: IndicatorDataPoint[]) => void;
}) {
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('');
  const [category, setCategory] = useState<IndicatorCategory>('emissions');
  const [direction, setDirection] = useState<'up' | 'down'>('down');
  const [source, setSource] = useState('User-added');
  const [sourceUrl, setSourceUrl] = useState('');
  const [description, setDescription] = useState('');
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvPoints, setCsvPoints] = useState<IndicatorDataPoint[]>([]);
  const [csvError, setCsvError] = useState<string | null>(null);

  function handleCsvFile(file: File) {
    setCsvError(null);
    setCsvFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const points = parseCsvPoints(String(reader.result ?? ''));
        if (points.length === 0) {
          setCsvError('No valid year,value rows found.');
          setCsvPoints([]);
          return;
        }
        setCsvPoints(points);
      } catch (e) {
        setCsvError((e as Error).message);
        setCsvPoints([]);
      }
    };
    reader.onerror = () => setCsvError('Could not read file.');
    reader.readAsText(file);
  }

  return (
    <DialogShell title="Add indicator" onClose={onClose}>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Name">
          <input className={inputCls} value={name} onChange={e => setName(e.target.value)} />
        </Field>
        <Field label="Unit">
          <input className={inputCls} value={unit} onChange={e => setUnit(e.target.value)} />
        </Field>
        <Field label="Category">
          <select
            className={inputCls}
            value={category}
            onChange={e => setCategory(e.target.value as IndicatorCategory)}
          >
            {INDICATOR_CATEGORIES.map(c => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Direction (better = ?)">
          <select
            className={inputCls}
            value={direction}
            onChange={e => setDirection(e.target.value as 'up' | 'down')}
          >
            <option value="down">Lower is better</option>
            <option value="up">Higher is better</option>
          </select>
        </Field>
        <Field label="Source name">
          <input
            className={inputCls}
            value={source}
            onChange={e => setSource(e.target.value)}
          />
        </Field>
        <Field label="Source URL">
          <input
            className={inputCls}
            value={sourceUrl}
            onChange={e => setSourceUrl(e.target.value)}
          />
        </Field>
        <Field label="Description" full>
          <textarea
            className={inputCls + ' h-20'}
            value={description}
            onChange={e => setDescription(e.target.value)}
          />
        </Field>
        <Field label="Data points (CSV)" full>
          <input
            type="file"
            accept=".csv,text/csv"
            className="block w-full text-xs text-tertiary file:mr-2 file:py-1 file:px-2 file:rounded file:border file:border-grey-200 file:bg-grey-50 file:text-tertiary-dark file:text-xs hover:file:bg-grey-100"
            onChange={e => {
              const f = e.target.files?.[0];
              if (f) handleCsvFile(f);
            }}
          />
          <p className="mt-1 text-[10px] text-tertiary-light">
            Two columns: <code>year,value</code>. Header row optional. Example: <code>2020,3500</code>
          </p>
          {csvFileName && !csvError && csvPoints.length > 0 && (
            <p className="mt-1 text-[10px] text-green-700">
              {csvFileName}: {csvPoints.length} row{csvPoints.length === 1 ? '' : 's'} ready (
              {csvPoints[0].year}–{csvPoints[csvPoints.length - 1].year}).
            </p>
          )}
          {csvError && (
            <p className="mt-1 text-[10px] text-red-700">{csvError}</p>
          )}
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!name || !unit}
          onClick={() =>
            onSave(
              {
                name,
                unit,
                category,
                direction,
                source,
                sourceUrl,
                description,
              },
              csvPoints
            )
          }
          className={btnPrimary}
        >
          Save
        </button>
      </div>
    </DialogShell>
  );
}

function parseCsvPoints(text: string): IndicatorDataPoint[] {
  const points: IndicatorDataPoint[] = [];
  const seen = new Set<number>();
  const lines = text.split(/\r?\n/);
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const cells = line.split(/[,;\t]/).map(c => c.trim().replace(/^"|"$/g, ''));
    if (cells.length < 2) continue;
    const year = parseInt(cells[0], 10);
    const value = parseFloat(cells[1]);
    if (!Number.isFinite(year) || !Number.isFinite(value)) continue;
    if (seen.has(year)) continue;
    seen.add(year);
    points.push({ year, value });
  }
  return points.sort((a, b) => a.year - b.year);
}

/** Build a single-sheet workbook spec for one indicator's plotted series. */
function buildIndicatorSheet(ind: Indicator): SheetSpec {
  return {
    name: (ind.code ? `${ind.code} ` : '') + ind.name,
    title: ind.name,
    subtitle: `Unit: ${ind.unit}${ind.source ? ` · Source: ${ind.source}` : ''}`,
    headers: ['Year', `Value (${ind.unit})`],
    rows: ind.data.map(d => [d.year, d.value]),
  };
}

/** Build a Word document describing one indicator (metadata + data table). */
function buildIndicatorDoc(ind: Indicator): DocBlock[] {
  const blocks: DocBlock[] = [
    { type: 'heading', level: 1, text: ind.name },
  ];
  if (ind.description) blocks.push({ type: 'paragraph', text: ind.description });
  const meta: string[] = [`Unit: ${ind.unit}`];
  if (ind.source) meta.push(`Source: ${ind.source}`);
  if (ind.sourceUrl) meta.push(ind.sourceUrl);
  if (ind.targetValue !== undefined && ind.targetYear !== undefined) {
    meta.push(`Target: ${ind.targetValue} ${ind.unit} by ${ind.targetYear}`);
  }
  blocks.push({ type: 'paragraph', text: meta.join('  ·  '), italic: true });
  blocks.push({ type: 'heading', level: 2, text: 'Data' });
  if (ind.data.length > 0) {
    blocks.push({
      type: 'table',
      headers: ['Year', `Value (${ind.unit})`],
      rows: ind.data.map(d => [d.year, d.value]),
    });
  } else {
    blocks.push({ type: 'paragraph', text: 'No data points recorded yet.', italic: true });
  }
  return blocks;
}

function DialogShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-xl w-full p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-tertiary-dark">{title}</h3>
          <button type="button" onClick={onClose} className="text-tertiary text-sm">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <label className={`text-xs text-tertiary ${full ? 'col-span-2' : ''}`}>
      <span className="block mb-1 font-medium text-tertiary-dark">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'w-full px-2 py-1.5 border border-grey-200 rounded text-sm bg-white focus:outline-none focus:border-primary';
const btnPrimary =
  'px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50';
const btnSecondary =
  'px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50';
