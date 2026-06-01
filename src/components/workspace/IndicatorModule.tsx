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

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { pwApi } from '@/lib/project-workspace/client';

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

interface Props {
  projectId: string;
  initial: Indicator[];
}

export default function IndicatorModule({ projectId, initial }: Props) {
  const router = useRouter();
  const [indicators, setIndicators] = useState<Indicator[]>(initial);
  const [selectedId, setSelectedId] = useState<string>(initial[0]?.id ?? '');
  const [chartType, setChartType] = useState<'line' | 'bar'>('line');
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refreshStatus, setRefreshStatus] = useState<
    { kind: 'ok' | 'err'; message: string } | null
  >(null);

  const selected = indicators.find(i => i.id === selectedId) ?? indicators[0];

  function patchLocal(id: string, patch: Partial<Indicator>) {
    setIndicators(prev => prev.map(i => (i.id === id ? { ...i, ...patch } : i)));
  }

  async function handleAddPoint(id: string, point: IndicatorDataPoint) {
    setBusy(true);
    try {
      await pwApi.upsertPoint({ indicatorId: id, year: point.year, value: point.value });
      patchLocal(id, {
        data: [...indicators.find(i => i.id === id)!.data.filter(d => d.year !== point.year), point].sort(
          (a, b) => a.year - b.year
        ),
      });
    } finally {
      setBusy(false);
    }
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

  const chartData = {
    labels: selected.data.map(d => d.year),
    datasets: [
      {
        label: `${selected.name} (${selected.unit})`,
        data: selected.data.map(d => d.value),
        borderColor: '#0065A4',
        backgroundColor: 'rgba(0, 101, 164, 0.25)',
        tension: 0.25,
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
            EU-level progress indicators based on the ECNO framework. Seed
            values are the latest publicly available figures from EEA /
            Eurostat; you can override them, add data points, or define
            entirely new indicators. Everything is stored in Postgres.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark"
        >
          + Add indicator
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[280px,1fr] gap-6">
        <aside className="bg-white rounded-xl border border-grey-200 p-3 max-h-[520px] overflow-y-auto">
          {INDICATOR_CATEGORIES.map(cat => {
            const inCat = indicators.filter(i => i.category === cat.id);
            if (inCat.length === 0) return null;
            return (
              <div key={cat.id} className="mb-3">
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
                        {i.name}
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
                  onClick={() => setEditing(selected.id)}
                  className="px-2 py-1 text-[10px] rounded border border-grey-200 text-tertiary"
                  disabled={busy}
                >
                  Add data
                </button>
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
            <div className="h-72">
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
                  <tr key={d.year} className="border-t border-grey-100">
                    <td className="px-3 py-1.5">{d.year}</td>
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
        </div>
      </div>

      {adding && (
        <AddIndicatorDialog onClose={() => setAdding(false)} onSave={handleAddIndicator} />
      )}
      {editing && (
        <EditDataDialog
          indicator={indicators.find(i => i.id === editing)!}
          onClose={() => setEditing(null)}
          onAddPoint={p => handleAddPoint(editing, p)}
          busy={busy}
        />
      )}
    </div>
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

function EditDataDialog({
  indicator,
  onClose,
  onAddPoint,
  busy,
}: {
  indicator: Indicator;
  onClose: () => void;
  onAddPoint: (p: IndicatorDataPoint) => Promise<void> | void;
  busy: boolean;
}) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [value, setValue] = useState('');

  return (
    <DialogShell title={`Add / update data — ${indicator.name}`} onClose={onClose}>
      <p className="text-xs text-tertiary mb-3">
        Existing entry for the same year will be replaced.
      </p>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Field label="Year">
          <input
            type="number"
            className={inputCls}
            value={year}
            onChange={e => setYear(parseInt(e.target.value, 10) || year)}
          />
        </Field>
        <Field label={`Value (${indicator.unit})`}>
          <input
            type="number"
            step="any"
            className={inputCls}
            value={value}
            onChange={e => setValue(e.target.value)}
          />
        </Field>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Close
        </button>
        <button
          type="button"
          disabled={!value || busy}
          onClick={async () => {
            const v = parseFloat(value);
            if (Number.isFinite(v)) {
              await onAddPoint({ year, value: v });
              setValue('');
            }
          }}
          className={btnPrimary}
        >
          {busy ? 'Saving…' : 'Add point'}
        </button>
      </div>
    </DialogShell>
  );
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
