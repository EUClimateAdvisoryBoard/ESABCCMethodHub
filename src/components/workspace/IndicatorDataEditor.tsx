/**
 * In-app calc / edit-data surface for one indicator.
 * --------------------------------------------------
 * A spreadsheet-style grid that lets the Secretariat work entirely in the
 * app (no Excel round-trip needed):
 *
 *   • Add / remove rows (years) and helper columns.
 *   • Give every column its own source field.
 *   • Derive a column from others — e.g. Value = Raw × Multiplier — via a
 *     per-column formula (A op B, where B is a column or a constant). Derived
 *     columns recompute live and are read-only.
 *   • columns[0] is always "Value" — the FINAL series that gets plotted.
 *
 * On save the Value series is written to pw_indicator_points and the full
 * grid (helper columns, sources, derivations, cells) to pw_indicator_sheets.
 */
'use client';

import { useMemo, useState } from 'react';
import { pwApi } from '@/lib/project-workspace/client';
import {
  applyOp,
  cellValue,
  type ColumnOp,
  type ColumnFormula,
  type IndicatorSheetLayout,
  type SheetCell,
} from '@/lib/project-workspace/indicator-sheet';
import type { Indicator } from '@/data/ecno-indicators';

interface ECol {
  id: string;
  header: string;
  source: string;
  formula?: ColumnFormula;
}
interface ERow {
  year: number;
  /** Raw text input keyed by column id (ignored for derived columns). */
  cells: Record<string, string>;
}

const VALUE_ID = 'col-value';
const OPS: ColumnOp[] = ['*', '/', '+', '-'];

let colSeq = 0;
const nextColId = () => `col-${Date.now().toString(36)}-${colSeq++}`;

interface Props {
  indicator: Indicator;
  layout?: IndicatorSheetLayout;
  onClose: () => void;
  onSaved: (
    points: { year: number; value: number }[],
    layout: IndicatorSheetLayout,
    source: string
  ) => void;
}

export default function IndicatorDataEditor({ indicator, layout, onClose, onSaved }: Props) {
  const [columns, setColumns] = useState<ECol[]>(() => initColumns(indicator, layout));
  // `columns` (above) is already resolved here, so rows reuse the same column ids.
  const [rows, setRows] = useState<ERow[]>(() => initRows(indicator, layout, columns));
  const [newYear, setNewYear] = useState<string>(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const colsByHeader = useMemo(() => {
    const m = new Map<string, ECol>();
    for (const c of columns) if (c.header) m.set(c.header, c);
    return m;
  }, [columns]);

  // Live computed value per (row, column), resolving derived columns.
  const computed = useMemo(() => {
    return rows.map(row => {
      const cache = new Map<string, number | null>();
      const visiting = new Set<string>();
      const valueOf = (col: ECol): number | null => {
        if (cache.has(col.id)) return cache.get(col.id) ?? null;
        if (visiting.has(col.id)) return null; // cycle guard
        visiting.add(col.id);
        let res: number | null;
        if (col.formula) {
          const a = operand(col.formula.a);
          const b = operand(col.formula.b);
          res = a === null || b === null ? null : applyOp(a, col.formula.op, b);
        } else {
          const raw = (row.cells[col.id] ?? '').trim();
          const n = raw === '' ? null : Number(raw);
          res = n !== null && Number.isFinite(n) ? n : null;
        }
        visiting.delete(col.id);
        cache.set(col.id, res);
        return res;
      };
      const operand = (ref: string | number): number | null => {
        if (typeof ref === 'number') return ref;
        const c = colsByHeader.get(ref);
        return c ? valueOf(c) : null;
      };
      const values: Record<string, number | null> = {};
      for (const c of columns) values[c.id] = valueOf(c);
      return { year: row.year, values };
    });
  }, [rows, columns, colsByHeader]);

  function patchColumn(id: string, patch: Partial<ECol>) {
    setColumns(prev => prev.map(c => (c.id === id ? { ...c, ...patch } : c)));
  }

  function addColumn() {
    const base = 'Helper';
    let name = base;
    let n = 2;
    const taken = new Set(columns.map(c => c.header));
    while (taken.has(name)) name = `${base} ${n++}`;
    setColumns(prev => [...prev, { id: nextColId(), header: name, source: '' }]);
  }

  function removeColumn(id: string) {
    if (id === VALUE_ID) return;
    const col = columns.find(c => c.id === id);
    setColumns(prev =>
      prev
        .filter(c => c.id !== id)
        // Drop formulas that referenced the removed column.
        .map(c =>
          c.formula && col && (c.formula.a === col.header || c.formula.b === col.header)
            ? { ...c, formula: undefined }
            : c
        )
    );
    setRows(prev =>
      prev.map(r => {
        const { [id]: _drop, ...rest } = r.cells;
        return { ...r, cells: rest };
      })
    );
  }

  function addRow() {
    const year = parseInt(newYear, 10);
    if (!Number.isInteger(year)) {
      setError('Enter a valid year to add.');
      return;
    }
    if (rows.some(r => r.year === year)) {
      setError(`Year ${year} already exists.`);
      return;
    }
    setError(null);
    setRows(prev => [...prev, { year, cells: {} }].sort((a, b) => a.year - b.year));
  }

  function removeRow(year: number) {
    setRows(prev => prev.filter(r => r.year !== year));
  }

  function setCell(year: number, colId: string, value: string) {
    setRows(prev =>
      prev.map(r => (r.year === year ? { ...r, cells: { ...r.cells, [colId]: value } } : r))
    );
  }

  function clearFormula(col: ECol) {
    // Freeze the currently-computed values into editable raw cells.
    setRows(prev =>
      prev.map(r => {
        const v = computed.find(c => c.year === r.year)?.values[col.id];
        return { ...r, cells: { ...r.cells, [col.id]: v === null || v === undefined ? '' : String(v) } };
      })
    );
    patchColumn(col.id, { formula: undefined });
  }

  async function handleSave() {
    // Validate headers.
    const headers = columns.map(c => c.header.trim());
    if (headers.some(h => h === '')) {
      setError('Every column needs a header.');
      return;
    }
    if (new Set(headers).size !== headers.length) {
      setError('Column headers must be unique.');
      return;
    }

    const layoutColumns = columns.map(c => ({
      header: c.header.trim(),
      source: c.source.trim() || undefined,
      formula: c.formula,
    }));
    const layoutRows: IndicatorSheetLayout['rows'] = computed.map(rc => ({
      year: rc.year,
      cells: columns.map(c => {
        const v = rc.values[c.id];
        return (v === null || v === undefined ? null : v) as SheetCell;
      }),
    }));
    const nextLayout: IndicatorSheetLayout = { columns: layoutColumns, rows: layoutRows };

    const points = computed
      .map(rc => ({ year: rc.year, value: rc.values[VALUE_ID] }))
      .filter((p): p is { year: number; value: number } => p.value !== null && p.value !== undefined);

    // Guard against accidentally wiping an indicator that already has data:
    // saving treats the grid as the source of truth, so an empty Value series
    // deletes every stored point.
    if (points.length === 0 && indicator.data.length > 0) {
      const ok = window.confirm(
        `This will delete all ${indicator.data.length} data point` +
          `${indicator.data.length === 1 ? '' : 's'} for “${indicator.name}”, ` +
          `because no row has a Value. Continue?`
      );
      if (!ok) {
        setError('Save cancelled — no data points were changed.');
        return;
      }
    }

    const valueSource = (columns[0]?.source ?? '').trim();

    setBusy(true);
    setError(null);
    try {
      const res = await pwApi.saveIndicatorSheet(indicator.id, {
        layout: nextLayout,
        points,
        source: valueSource || undefined,
      });
      onSaved(res.points, nextLayout, valueSource || indicator.source);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 w-full max-w-5xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-grey-200">
          <div>
            <h3 className="text-sm font-bold text-tertiary-dark">
              Edit data / calc — {indicator.name}
            </h3>
            <p className="text-[11px] text-tertiary mt-0.5">
              <span className="font-semibold text-primary">Value</span> is the final
              series that gets plotted. Add helper columns and derive Value (or any
              column) from them. Unit: {indicator.unit}.
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-tertiary text-sm">
            ✕
          </button>
        </div>

        <div className="px-5 py-3 flex items-center gap-2 flex-wrap border-b border-grey-100 bg-grey-50">
          <button type="button" onClick={addColumn} className={btnSecondary}>
            + Add column
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={newYear}
              onChange={e => setNewYear(e.target.value)}
              className="w-24 px-2 py-1.5 border border-grey-200 rounded text-xs"
              placeholder="Year"
            />
            <button type="button" onClick={addRow} className={btnSecondary}>
              + Add row
            </button>
          </div>
          <span className="text-[11px] text-tertiary-light">
            {rows.length} row{rows.length === 1 ? '' : 's'} · {columns.length} column
            {columns.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="overflow-auto flex-1 px-5 py-3">
          <table className="text-xs border-collapse">
            <thead>
              <tr>
                <th className="sticky left-0 bg-white px-2 py-1 text-left border-b border-grey-200 align-top">
                  Year
                </th>
                {columns.map((c, ci) => (
                  <th
                    key={c.id}
                    className="px-2 py-1 text-left border-b border-grey-200 align-top min-w-[150px]"
                  >
                    <ColumnHeader
                      col={c}
                      isValue={ci === 0}
                      allColumns={columns}
                      onPatch={patch => patchColumn(c.id, patch)}
                      onRemove={() => removeColumn(c.id)}
                      onClearFormula={() => clearFormula(c)}
                    />
                  </th>
                ))}
                <th className="px-2 py-1 border-b border-grey-200"></th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-2 py-4 text-center text-tertiary-light">
                    No rows yet — add a year above.
                  </td>
                </tr>
              )}
              {rows.map(row => {
                const rc = computed.find(c => c.year === row.year);
                return (
                  <tr key={row.year} className="border-b border-grey-100">
                    <td className="sticky left-0 bg-white px-2 py-1 font-mono">{row.year}</td>
                    {columns.map((c, ci) => {
                      const derived = !!c.formula;
                      const val = rc?.values[c.id];
                      return (
                        <td key={c.id} className="px-1 py-1">
                          {derived ? (
                            <span
                              className={`block px-2 py-1 rounded font-mono text-right ${
                                ci === 0 ? 'bg-primary/5 text-primary' : 'bg-grey-50 text-tertiary'
                              }`}
                              title="Computed column"
                            >
                              {val === null || val === undefined ? '—' : round(val)}
                            </span>
                          ) : (
                            <input
                              type="number"
                              step="any"
                              value={row.cells[c.id] ?? ''}
                              onChange={e => setCell(row.year, c.id, e.target.value)}
                              className={`w-full px-2 py-1 border rounded text-right font-mono ${
                                ci === 0
                                  ? 'border-primary/40 bg-primary/5'
                                  : 'border-grey-200'
                              }`}
                            />
                          )}
                        </td>
                      );
                    })}
                    <td className="px-1 py-1 text-right">
                      <button
                        type="button"
                        onClick={() => removeRow(row.year)}
                        className="text-[10px] text-tertiary hover:text-red-600"
                      >
                        remove
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="px-5 py-3 border-t border-grey-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-red-700 min-h-[1rem]">{error}</div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className={btnSecondary}>
              Cancel
            </button>
            <button type="button" onClick={handleSave} disabled={busy} className={btnPrimary}>
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ColumnHeader({
  col,
  isValue,
  allColumns,
  onPatch,
  onRemove,
  onClearFormula,
}: {
  col: ECol;
  isValue: boolean;
  allColumns: ECol[];
  onPatch: (patch: Partial<ECol>) => void;
  onRemove: () => void;
  onClearFormula: () => void;
}) {
  const [showCalc, setShowCalc] = useState(false);
  const others = allColumns.filter(c => c.id !== col.id && c.header.trim() !== '');

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1">
        {isValue ? (
          <span className="font-bold text-primary">Value</span>
        ) : (
          <input
            value={col.header}
            onChange={e => onPatch({ header: e.target.value })}
            className="w-full px-1 py-0.5 border border-grey-200 rounded font-semibold text-tertiary-dark"
            placeholder="Column name"
          />
        )}
        {!isValue && (
          <button
            type="button"
            onClick={onRemove}
            className="text-[10px] text-tertiary hover:text-red-600 shrink-0"
            title="Remove column"
          >
            ✕
          </button>
        )}
      </div>
      <input
        value={col.source}
        onChange={e => onPatch({ source: e.target.value })}
        className="w-full px-1 py-0.5 border border-grey-100 rounded text-[10px] text-tertiary font-normal"
        placeholder="Source…"
      />
      {col.formula ? (
        <div className="flex items-center gap-1 text-[10px] text-secondary font-normal">
          <span className="font-mono bg-secondary/10 px-1 rounded">
            = {col.formula.a} {col.formula.op} {col.formula.b}
          </span>
          <button type="button" onClick={() => setShowCalc(v => !v)} className="underline">
            edit
          </button>
          <button type="button" onClick={onClearFormula} className="underline">
            clear
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCalc(v => !v)}
          className="text-[10px] text-secondary underline font-normal"
        >
          ƒ derive from columns
        </button>
      )}
      {showCalc && (
        <CalcEditor
          others={others}
          initial={col.formula}
          onApply={f => {
            onPatch({ formula: f });
            setShowCalc(false);
          }}
          onCancel={() => setShowCalc(false)}
        />
      )}
    </div>
  );
}

function CalcEditor({
  others,
  initial,
  onApply,
  onCancel,
}: {
  others: ECol[];
  initial?: ColumnFormula;
  onApply: (f: ColumnFormula) => void;
  onCancel: () => void;
}) {
  const [a, setA] = useState(initial?.a ?? others[0]?.header ?? '');
  const [op, setOp] = useState<ColumnOp>(initial?.op ?? '*');
  const [bMode, setBMode] = useState<'column' | 'const'>(
    typeof initial?.b === 'number' ? 'const' : 'column'
  );
  const [bCol, setBCol] = useState(typeof initial?.b === 'string' ? initial.b : others[0]?.header ?? '');
  const [bConst, setBConst] = useState(typeof initial?.b === 'number' ? String(initial.b) : '1');

  const selCls = 'px-1 py-0.5 border border-grey-200 rounded text-[10px] font-normal';

  return (
    <div className="border border-secondary/30 rounded p-1.5 bg-secondary/5 space-y-1 font-normal">
      <div className="flex items-center gap-1 flex-wrap">
        <select value={a} onChange={e => setA(e.target.value)} className={selCls}>
          {others.map(c => (
            <option key={c.id} value={c.header}>
              {c.header}
            </option>
          ))}
        </select>
        <select value={op} onChange={e => setOp(e.target.value as ColumnOp)} className={selCls}>
          {OPS.map(o => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
        {bMode === 'column' ? (
          <select value={bCol} onChange={e => setBCol(e.target.value)} className={selCls}>
            {others.map(c => (
              <option key={c.id} value={c.header}>
                {c.header}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="number"
            step="any"
            value={bConst}
            onChange={e => setBConst(e.target.value)}
            className={selCls + ' w-16'}
          />
        )}
        <button
          type="button"
          onClick={() => setBMode(m => (m === 'column' ? 'const' : 'column'))}
          className="text-[10px] underline text-secondary"
        >
          {bMode === 'column' ? 'use number' : 'use column'}
        </button>
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="text-[10px] text-tertiary underline">
          cancel
        </button>
        <button
          type="button"
          disabled={!a || (bMode === 'column' && !bCol)}
          onClick={() =>
            onApply({
              a,
              op,
              b: bMode === 'const' ? Number(bConst) || 0 : bCol,
            })
          }
          className="text-[10px] text-white bg-secondary px-2 py-0.5 rounded disabled:opacity-50"
        >
          apply
        </button>
      </div>
    </div>
  );
}

// ── init helpers ─────────────────────────────────────────────────────────────
function initColumns(indicator: Indicator, layout?: IndicatorSheetLayout): ECol[] {
  if (layout && layout.columns.length > 0) {
    return layout.columns.map((c, i) => ({
      id: i === 0 ? VALUE_ID : nextColId(),
      header: i === 0 ? 'Value' : c.header,
      source: c.source ?? (i === 0 ? indicator.source : ''),
      formula: c.formula,
    }));
  }
  return [{ id: VALUE_ID, header: 'Value', source: indicator.source }];
}

function initRows(
  indicator: Indicator,
  layout: IndicatorSheetLayout | undefined,
  columns: ECol[]
): ERow[] {
  const pointByYear = new Map(indicator.data.map(p => [p.year, p.value]));
  const layoutByYear = new Map((layout?.rows ?? []).map(r => [r.year, r.cells]));
  const years = Array.from(new Set([...pointByYear.keys(), ...layoutByYear.keys()])).sort(
    (a, b) => a - b
  );
  return years.map(year => {
    const layoutCells = layoutByYear.get(year) ?? [];
    const cells: Record<string, string> = {};
    columns.forEach((col, i) => {
      if (col.formula) return; // derived — recomputed, not stored as raw
      if (i === 0) {
        // Value column: prefer the canonical point value.
        const pv = pointByYear.get(year);
        const lv = cellValue(layoutCells[0]);
        const v = pv ?? lv;
        cells[col.id] = v === null || v === undefined ? '' : String(v);
      } else {
        const v = cellValue(layoutCells[i]);
        cells[col.id] = v === null || v === undefined ? '' : String(v);
      }
    });
    return { year, cells };
  });
}

function round(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 1e6) / 1e6);
}

const btnPrimary =
  'px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50';
const btnSecondary =
  'px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50';
