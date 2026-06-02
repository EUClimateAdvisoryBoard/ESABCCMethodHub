/**
 * In-app calc / edit-data surface for one indicator — an Excel-like grid.
 * ----------------------------------------------------------------------
 * Lets the Secretariat work entirely in the app (no Excel round-trip needed):
 *
 *   • A real spreadsheet grid with column letters (A = Year, B = Value, C …),
 *     a formula bar, keyboard navigation (arrows / Tab / Enter) and paste from
 *     Excel or any tab/comma-separated clipboard.
 *   • Add / remove rows (years) and helper columns; give every column its own
 *     source field.
 *   • Derive any column from the others with a free-form formula referencing
 *     other columns by name or letter — e.g.  = [Raw] * [Multiplier],
 *     = (B - C) / B * 100,  = ROUND([GDP] / [Pop], 2). Formulas apply to the
 *     whole column, recompute live, and the cells become read-only.
 *   • columns[0] is always "Value" — the FINAL series that gets plotted.
 *
 * On save the Value series is written to pw_indicator_points and the full grid
 * (helper columns, sources, derivations, computed cells) to pw_indicator_sheets.
 */
'use client';

import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { pwApi } from '@/lib/project-workspace/client';
import {
  computeColumns,
  formulaExpr,
  resolveRef,
  type ColumnFormula,
  type IndicatorSheetLayout,
  type SheetCell,
  cellValue,
} from '@/lib/project-workspace/indicator-sheet';
import { parseFormula, FUNCTIONS } from '@/lib/project-workspace/formula';
import type { Indicator } from '@/data/ecno-indicators';

interface ECol {
  id: string;
  header: string;
  source: string;
  /** When set, the column is computed via `formula.expr` (no leading "="). */
  formula?: ColumnFormula;
}
interface ERow {
  year: number;
  /** Raw text input keyed by column id (ignored for derived columns). */
  cells: Record<string, string>;
}

const VALUE_ID = 'col-value';

let colSeq = 0;
const nextColId = () => `col-${Date.now().toString(36)}-${colSeq++}`;

/** Spreadsheet column letter for a grid column index (0 = A = Year). */
function colLetter(gridCol: number): string {
  let n = gridCol + 1;
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

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
  const [rows, setRows] = useState<ERow[]>(() => initRows(indicator, layout, columns));
  const [newYear, setNewYear] = useState<string>(String(new Date().getFullYear()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [showInfo, setShowInfo] = useState(false);

  // Active cell over the full grid: col 0 = Year, col k = columns[k-1].
  const [sel, setSel] = useState<{ r: number; c: number }>({ r: 0, c: 1 });
  const [bar, setBar] = useState(''); // formula-bar text
  const [barFocused, setBarFocused] = useState(false);
  // Excel-style fill-handle drag: copy the source cell's value down/up the column.
  const [fillDrag, setFillDrag] = useState<{ startR: number; col: number; endR: number } | null>(
    null
  );

  const cellRefs = useRef(new Map<string, HTMLElement>());
  const setCellRef = (key: string) => (el: HTMLElement | null) => {
    if (el) cellRefs.current.set(key, el);
    else cellRefs.current.delete(key);
  };

  const headers = useMemo(() => columns.map(c => c.header), [columns]);
  const years = useMemo(() => rows.map(r => r.year), [rows]);

  // Live computed value per (column, row) — resolves derived columns.
  const computed = useMemo(
    () =>
      computeColumns({
        headers,
        formulas: columns.map(c => c.formula),
        years,
        raw: (col, row) => {
          const raw = (rows[row]?.cells[columns[col].id] ?? '').trim();
          if (raw === '' || raw.startsWith('=')) return null;
          const n = Number(raw);
          return Number.isFinite(n) ? n : null;
        },
      }),
    [headers, columns, years, rows]
  );

  // Per-column formula diagnostics (parse errors / unknown references).
  const issues = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of columns) {
      if (!c.formula) continue;
      const expr = formulaExpr(c.formula);
      const parsed = parseFormula(expr);
      if (parsed.error) {
        m.set(c.id, parsed.error);
        continue;
      }
      const bad = parsed.refs.find(ref => !resolveRef(ref, headers));
      if (bad) m.set(c.id, `Unknown column “${bad}”.`);
    }
    return m;
  }, [columns, headers]);

  // ── selection / formula bar sync ───────────────────────────────────────────
  const activeCol = sel.c === 0 ? null : columns[sel.c - 1];
  const activeIsFormula = !!activeCol?.formula;

  // Reflect the active cell into the formula bar (unless the user is editing it).
  useEffect(() => {
    if (barFocused) return;
    if (sel.c === 0) {
      setBar(rows[sel.r] ? String(rows[sel.r].year) : '');
    } else if (activeCol?.formula) {
      setBar('=' + formulaExpr(activeCol.formula));
    } else {
      setBar(rows[sel.r]?.cells[activeCol?.id ?? ''] ?? '');
    }
  }, [sel, columns, rows, barFocused, activeCol]);

  const focusCell = useCallback((r: number, c: number) => {
    const el = cellRefs.current.get(`${r}:${c}`);
    if (el) {
      el.focus();
      if (el instanceof HTMLInputElement) el.select();
    }
  }, []);

  // ── column ops ─────────────────────────────────────────────────────────────
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
    setColumns(prev => prev.filter(c => c.id !== id));
    setRows(prev =>
      prev.map(r => {
        const { [id]: _drop, ...rest } = r.cells;
        return { ...r, cells: rest };
      })
    );
    setSel(s => ({ r: s.r, c: Math.max(1, s.c - (s.c > 0 ? 1 : 0)) }));
  }

  function setColumnFormula(id: string, exprRaw: string): boolean {
    const expr = exprRaw.replace(/^\s*=/, '').trim();
    if (expr === '') {
      clearFormula(columns.find(c => c.id === id)!);
      return true;
    }
    const parsed = parseFormula(expr);
    if (parsed.error) {
      setError(`Formula error: ${parsed.error}`);
      return false;
    }
    setError(null);
    patchColumn(id, { formula: { expr } });
    return true;
  }

  function clearFormula(col: ECol) {
    // Freeze the currently-computed values into editable raw cells.
    const ci = columns.findIndex(c => c.id === col.id);
    setRows(prev =>
      prev.map((r, ri) => {
        const v = computed[ci]?.[ri];
        return { ...r, cells: { ...r.cells, [col.id]: v === null || v === undefined ? '' : String(v) } };
      })
    );
    patchColumn(col.id, { formula: undefined });
  }

  // ── row ops ────────────────────────────────────────────────────────────────
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
    setNewYear(String(year + 1));
  }

  function removeRow(year: number) {
    setRows(prev => prev.filter(r => r.year !== year));
  }

  function setCell(rowIdx: number, colId: string, value: string) {
    setRows(prev => prev.map((r, i) => (i === rowIdx ? { ...r, cells: { ...r.cells, [colId]: value } } : r)));
  }

  function setYear(rowIdx: number, value: string) {
    const y = parseInt(value, 10);
    if (!Number.isInteger(y)) return;
    setRows(prev => {
      if (prev.some((r, i) => i !== rowIdx && r.year === y)) return prev; // keep years unique
      return prev.map((r, i) => (i === rowIdx ? { ...r, year: y } : r));
    });
  }

  /** Commit a data-cell input: a leading "=" turns the whole column into a formula. */
  function commitCell(rowIdx: number, col: ECol, value: string) {
    if (value.trim().startsWith('=')) {
      if (setColumnFormula(col.id, value)) setCell(rowIdx, col.id, ''); // drop the typed "="
    }
  }

  // ── fill-handle drag (Excel-style copy down) ───────────────────────────────
  useEffect(() => {
    if (!fillDrag) return;
    function onMove(e: PointerEvent) {
      const el = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement | null;
      const cell = el?.closest('[data-fill-row]') as HTMLElement | null;
      if (!cell) return;
      const r = Number(cell.dataset.fillRow);
      if (Number.isInteger(r)) setFillDrag(prev => (prev ? { ...prev, endR: r } : prev));
    }
    function onUp() {
      setFillDrag(curr => {
        if (curr) applyFill(curr);
        return null;
      });
    }
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    // applyFill closes over rows/columns, but reading the latest via setRows
    // means we don't need it in the deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fillDrag !== null]);

  function applyFill(d: { startR: number; col: number; endR: number }) {
    const from = Math.min(d.startR, d.endR);
    const to = Math.max(d.startR, d.endR);
    if (from === to) return;
    if (d.col === 0) {
      // Year column: continue the year sequence (+1 per row away from source).
      setRows(prev => {
        const baseYear = prev[d.startR]?.year;
        if (baseYear === undefined) return prev;
        const next = prev.map(r => ({ ...r, cells: { ...r.cells } }));
        const used = new Set<number>();
        for (let i = 0; i < next.length; i++) {
          if (i < from || i > to) used.add(next[i].year);
        }
        used.add(baseYear);
        for (let i = from; i <= to; i++) {
          if (i === d.startR) continue;
          let y = baseYear + (i - d.startR);
          while (used.has(y)) y += i >= d.startR ? 1 : -1;
          used.add(y);
          next[i] = { ...next[i], year: y };
        }
        next.sort((a, b) => a.year - b.year);
        return next;
      });
      return;
    }
    const colIdx = d.col - 1;
    setRows(prev => {
      const col = columns[colIdx];
      if (!col || col.formula) return prev;
      const source = prev[d.startR]?.cells[col.id] ?? '';
      return prev.map((r, i) =>
        i >= from && i <= to && i !== d.startR
          ? { ...r, cells: { ...r.cells, [col.id]: source } }
          : r
      );
    });
  }

  // ── clipboard paste (Excel / TSV / CSV) ────────────────────────────────────
  const pasteMatrix = useCallback(
    (text: string, atR: number, atC: number) => {
      const matrix = text
        .replace(/\r\n/g, '\n')
        .replace(/\r/g, '\n')
        .split('\n')
        .filter((line, i, arr) => !(i === arr.length - 1 && line === ''))
        .map(line => (line.includes('\t') ? line.split('\t') : line.split(',')).map(s => s.trim()));
      if (matrix.length === 0) return;

      setError(null);
      setRows(prevRows => {
        let next = prevRows.map(r => ({ ...r, cells: { ...r.cells } }));
        const usedYears = new Set(next.map(r => r.year));
        let nextYear = next.length ? Math.max(...next.map(r => r.year)) + 1 : new Date().getFullYear();

        matrix.forEach((line, i) => {
          const ri = atR + i;
          // Grow the grid with fresh year rows when the paste runs past the end.
          if (ri >= next.length) {
            // If the Year column is part of this paste, use its value; else auto-increment.
            let year: number | null = null;
            if (atC === 0) {
              const y = parseInt(line[0], 10);
              if (Number.isInteger(y) && !usedYears.has(y)) year = y;
            }
            if (year === null) {
              while (usedYears.has(nextYear)) nextYear++;
              year = nextYear;
            }
            usedYears.add(year);
            next.push({ year, cells: {} });
          }
          const row = next[ri];
          line.forEach((raw, j) => {
            const gc = atC + j;
            if (gc === 0) {
              const y = parseInt(raw, 10);
              if (Number.isInteger(y) && !next.some((r, k) => k !== ri && r.year === y)) row.year = y;
              return;
            }
            const col = columns[gc - 1];
            if (!col || col.formula) return; // skip out-of-range / computed columns
            row.cells[col.id] = raw;
          });
        });
        next.sort((a, b) => a.year - b.year);
        return next;
      });
    },
    [columns]
  );

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      if (text) pasteMatrix(text, sel.r, sel.c);
      else setError('Clipboard is empty.');
    } catch {
      setError('Could not read the clipboard — use Ctrl/Cmd+V inside the grid instead.');
    }
  }

  // ── keyboard navigation ────────────────────────────────────────────────────
  const totalCols = columns.length + 1; // +1 for Year
  function onCellKeyDown(e: React.KeyboardEvent, r: number, c: number) {
    const target = e.target as HTMLElement;
    const input = target instanceof HTMLInputElement ? target : null;
    // For inputs, only hop columns when the caret is at the matching edge so
    // arrow keys still move within the text; read-only cells always hop.
    const atStart = !input || input.selectionStart === 0;
    const atEnd = !input || input.selectionEnd === (input.value?.length ?? 0);
    let nr = r;
    let nc = c;
    if (e.key === 'ArrowUp') nr = Math.max(0, r - 1);
    else if (e.key === 'ArrowDown' || e.key === 'Enter') nr = Math.min(rows.length - 1, r + 1);
    else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        nc = c - 1;
        if (nc < 0) {
          nc = totalCols - 1;
          nr = Math.max(0, r - 1);
        }
      } else {
        nc = c + 1;
        if (nc >= totalCols) {
          nc = 0;
          nr = Math.min(rows.length - 1, r + 1);
        }
      }
    } else if (e.key === 'ArrowLeft' && atStart) {
      nc = Math.max(0, c - 1);
    } else if (e.key === 'ArrowRight' && atEnd) {
      nc = Math.min(totalCols - 1, c + 1);
    } else {
      return;
    }
    if (e.key !== 'Tab') e.preventDefault();
    setSel({ r: nr, c: nc });
    requestAnimationFrame(() => focusCell(nr, nc));
  }

  // ── formula bar commit ─────────────────────────────────────────────────────
  function commitBar() {
    if (sel.c === 0) {
      if (rows[sel.r]) setYear(sel.r, bar);
      setBarFocused(false);
      return;
    }
    const col = columns[sel.c - 1];
    if (!col) return;
    if (col.formula) {
      // Formula column: bar always represents the column formula.
      setColumnFormula(col.id, bar);
    } else if (bar.trim().startsWith('=')) {
      setColumnFormula(col.id, bar);
    } else if (rows[sel.r]) {
      setCell(sel.r, col.id, bar);
    }
    setBarFocused(false);
  }

  // ── save ───────────────────────────────────────────────────────────────────
  async function handleSave() {
    const trimmed = columns.map(c => c.header.trim());
    if (trimmed.some(h => h === '')) {
      setError('Every column needs a header.');
      return;
    }
    if (new Set(trimmed).size !== trimmed.length) {
      setError('Column headers must be unique.');
      return;
    }
    if (issues.size > 0) {
      const [, msg] = [...issues][0];
      setError(`Fix the formula before saving: ${msg}`);
      return;
    }

    const layoutColumns = columns.map(c => ({
      header: c.header.trim(),
      source: c.source.trim() || undefined,
      formula: c.formula,
    }));
    const layoutRows: IndicatorSheetLayout['rows'] = rows.map((row, ri) => ({
      year: row.year,
      cells: columns.map((_c, ci) => {
        const v = computed[ci]?.[ri];
        return (v === null || v === undefined ? null : v) as SheetCell;
      }),
    }));
    const nextLayout: IndicatorSheetLayout = { columns: layoutColumns, rows: layoutRows };

    const points = rows
      .map((row, ri) => ({ year: row.year, value: computed[0]?.[ri] ?? null }))
      .filter((p): p is { year: number; value: number } => p.value !== null);

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

  // ── render ─────────────────────────────────────────────────────────────────
  const activeRef = sel.c === 0 ? `${colLetter(0)}${sel.r + 1}` : `${colLetter(sel.c)}${sel.r + 1}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 w-full max-w-6xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-grey-200">
          <div>
            <h3 className="text-sm font-bold text-tertiary-dark">
              Edit data / calc — {indicator.name}
            </h3>
            <p className="text-[11px] text-tertiary mt-0.5">
              <span className="font-semibold text-primary">Value</span> (column B) is the final
              series that gets plotted. Add helper columns and derive any column from the others.
              Unit: {indicator.unit}.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {layout?.derivation && (
              <button
                type="button"
                onClick={() => setShowInfo(true)}
                className="shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-secondary border border-secondary/40 rounded px-2 py-1 hover:bg-secondary/5"
                title="Step-by-step overview of how this indicator is derived"
              >
                ⓘ Derivation
              </button>
            )}
            <button type="button" onClick={onClose} className="text-tertiary text-sm" aria-label="Close">
              ✕
            </button>
          </div>
        </div>

        {/* Derivation overview — how the Value column is built from raw inputs */}
        {showInfo && layout?.derivation && (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
            onClick={() => setShowInfo(false)}
          >
            <div
              className="bg-white rounded-xl shadow-xl border border-grey-200 w-full max-w-2xl max-h-[85vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-5 py-3 border-b border-grey-200">
                <h3 className="text-sm font-bold text-tertiary-dark">
                  How “{indicator.name}” is derived
                </h3>
                <button
                  type="button"
                  onClick={() => setShowInfo(false)}
                  className="text-tertiary text-sm"
                  aria-label="Close"
                >
                  ✕
                </button>
              </div>
              <div className="overflow-auto px-5 py-4">
                <pre className="whitespace-pre-wrap font-sans text-[12px] leading-relaxed text-tertiary-dark">
                  {layout.derivation}
                </pre>
              </div>
            </div>
          </div>
        )}

        {/* Formula bar */}
        <div className="px-5 py-2 border-b border-grey-100 flex items-center gap-2 bg-white">
          <span
            className="shrink-0 w-14 text-center text-[11px] font-mono font-semibold text-tertiary-dark bg-grey-50 border border-grey-200 rounded px-1 py-1"
            title="Active cell"
          >
            {activeRef}
          </span>
          <span className="shrink-0 text-secondary font-serif italic text-sm w-5 text-center" title="Formula">
            ƒx
          </span>
          <input
            id="pw-formula-bar-input"
            value={bar}
            onChange={e => setBar(e.target.value)}
            onFocus={() => setBarFocused(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault();
                commitBar();
              } else if (e.key === 'Escape') {
                setBarFocused(false);
                (e.target as HTMLInputElement).blur();
              }
            }}
            onBlur={commitBar}
            placeholder={
              sel.c === 0
                ? 'Year…'
                : activeIsFormula
                  ? '= formula for this column'
                  : 'Value, or type = to make this a formula column (e.g. =B*C)'
            }
            className={`flex-1 px-2 py-1 border rounded text-xs font-mono ${
              bar.trim().startsWith('=') ? 'border-secondary/50 bg-secondary/5' : 'border-grey-200'
            }`}
          />
          <button
            type="button"
            onClick={() => setShowHelp(v => !v)}
            className="shrink-0 text-[11px] text-secondary underline"
          >
            {showHelp ? 'hide help' : 'formula help'}
          </button>
        </div>

        {showHelp && <FormulaHelp columns={columns} />}

        {/* Toolbar */}
        <div className="px-5 py-2 flex items-center gap-2 flex-wrap border-b border-grey-100 bg-grey-50">
          <button type="button" onClick={addColumn} className={btnSecondary}>
            + Column
          </button>
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={newYear}
              onChange={e => setNewYear(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addRow()}
              className="w-20 px-2 py-1.5 border border-grey-200 rounded text-xs"
              placeholder="Year"
            />
            <button type="button" onClick={addRow} className={btnSecondary}>
              + Row
            </button>
          </div>
          <button type="button" onClick={pasteFromClipboard} className={btnSecondary} title="Paste tab/comma-separated data from the clipboard at the selected cell">
            ⧉ Paste
          </button>
          <span className="text-[11px] text-tertiary-light ml-auto">
            {rows.length} row{rows.length === 1 ? '' : 's'} · {columns.length} data column
            {columns.length === 1 ? '' : 's'} · paste from Excel with Ctrl/Cmd+V
          </span>
        </div>

        {/* Grid */}
        <div
          className="overflow-auto flex-1 px-5 py-3"
          onPaste={e => {
            const text = e.clipboardData.getData('text');
            if (text && text.includes('\t')) {
              e.preventDefault();
              pasteMatrix(text, sel.r, sel.c);
            }
          }}
        >
          <table className="text-xs border-separate border-spacing-0">
            <thead>
              {/* Letter row */}
              <tr>
                <th className="sticky left-0 z-20 bg-grey-100 border border-grey-200 w-10" />
                {columns.map((_c, ci) => (
                  <th
                    key={`L${ci}`}
                    className="bg-grey-100 border border-grey-200 text-center text-[10px] font-mono text-tertiary-light px-1 py-0.5 min-w-[140px]"
                  >
                    {colLetter(ci + 1)}
                  </th>
                ))}
                <th className="bg-grey-100 border border-grey-200" />
              </tr>
              {/* Header / name / source / formula row */}
              <tr>
                <th className="sticky left-0 z-20 bg-grey-50 border border-grey-200 px-2 py-1 text-center text-[10px] font-mono text-tertiary-light align-middle">
                  A<div className="font-sans font-semibold text-tertiary-dark">Year</div>
                </th>
                {columns.map((c, ci) => (
                  <th
                    key={c.id}
                    className={`border border-grey-200 px-2 py-1 text-left align-top ${
                      sel.c === ci + 1 ? 'bg-primary/5' : 'bg-white'
                    }`}
                  >
                    <ColumnHeader
                      col={c}
                      isValue={ci === 0}
                      issue={issues.get(c.id)}
                      onPatch={patch => patchColumn(c.id, patch)}
                      onRemove={() => removeColumn(c.id)}
                      onEditFormula={() => {
                        setSel({ r: Math.min(sel.r, Math.max(0, rows.length - 1)), c: ci + 1 });
                        setBar('=' + formulaExpr(c.formula));
                        setBarFocused(true);
                        requestAnimationFrame(() => {
                          const el = document.getElementById('pw-formula-bar-input');
                          el?.focus();
                        });
                      }}
                      onClearFormula={() => clearFormula(c)}
                    />
                  </th>
                ))}
                <th className="border border-grey-200 bg-white" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr>
                  <td colSpan={columns.length + 2} className="px-2 py-6 text-center text-tertiary-light border border-grey-200">
                    No rows yet — add a year above, or paste a block from Excel.
                  </td>
                </tr>
              )}
              {rows.map((row, ri) => {
                const inFillRange = (gc: number) =>
                  !!fillDrag &&
                  fillDrag.col === gc &&
                  ri >= Math.min(fillDrag.startR, fillDrag.endR) &&
                  ri <= Math.max(fillDrag.startR, fillDrag.endR);
                return (
                <tr key={row.year}>
                  {/* Year cell */}
                  <td
                    data-fill-row={ri}
                    className={`sticky left-0 z-10 bg-white border border-grey-200 p-0 relative ${
                      inFillRange(0) ? 'bg-primary/10' : ''
                    }`}
                  >
                    <input
                      ref={setCellRef(`${ri}:0`)}
                      type="number"
                      value={row.year}
                      onFocus={() => setSel({ r: ri, c: 0 })}
                      onChange={e => setYear(ri, e.target.value)}
                      onKeyDown={e => onCellKeyDown(e, ri, 0)}
                      className={`w-16 px-2 py-1 text-center font-mono bg-transparent outline-none ${
                        sel.r === ri && sel.c === 0 ? 'ring-2 ring-primary ring-inset' : ''
                      }`}
                    />
                    {sel.r === ri && sel.c === 0 && !fillDrag && (
                      <FillHandle
                        onStart={() => setFillDrag({ startR: ri, col: 0, endR: ri })}
                      />
                    )}
                  </td>
                  {columns.map((c, ci) => {
                    const gc = ci + 1;
                    const derived = !!c.formula;
                    const val = computed[ci]?.[ri];
                    const selected = sel.r === ri && sel.c === gc;
                    const filling = inFillRange(gc);
                    return (
                      <td
                        key={c.id}
                        data-fill-row={ri}
                        className={`border border-grey-200 p-0 relative ${
                          filling ? 'bg-primary/10' : ''
                        }`}
                      >
                        {derived ? (
                          <div
                            ref={setCellRef(`${ri}:${gc}`)}
                            tabIndex={0}
                            onFocus={() => setSel({ r: ri, c: gc })}
                            onClick={() => setSel({ r: ri, c: gc })}
                            onKeyDown={e => onCellKeyDown(e, ri, gc)}
                            className={`px-2 py-1 font-mono text-right cursor-default outline-none ${
                              ci === 0 ? 'bg-primary/5 text-primary' : 'bg-grey-50 text-tertiary'
                            } ${selected ? 'ring-2 ring-secondary ring-inset' : ''}`}
                            title="Computed column (read-only) — edit the formula in the bar above"
                          >
                            {val === null || val === undefined ? '—' : round(val)}
                          </div>
                        ) : (
                          <input
                            ref={setCellRef(`${ri}:${gc}`)}
                            type="text"
                            inputMode="decimal"
                            value={row.cells[c.id] ?? ''}
                            onFocus={() => setSel({ r: ri, c: gc })}
                            onChange={e => setCell(ri, c.id, e.target.value)}
                            onBlur={e => commitCell(ri, c, e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitCell(ri, c, (e.target as HTMLInputElement).value);
                              onCellKeyDown(e, ri, gc);
                            }}
                            className={`w-full px-2 py-1 text-right font-mono bg-transparent outline-none ${
                              ci === 0 ? 'bg-primary/5' : ''
                            } ${selected ? 'ring-2 ring-primary ring-inset' : ''}`}
                          />
                        )}
                        {selected && !derived && !fillDrag && (
                          <FillHandle
                            onStart={() => setFillDrag({ startR: ri, col: gc, endR: ri })}
                          />
                        )}
                      </td>
                    );
                  })}
                  <td className="border border-grey-200 px-1 text-center bg-white">
                    <button
                      type="button"
                      onClick={() => removeRow(row.year)}
                      className="text-[10px] text-tertiary hover:text-red-600"
                      title="Remove row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-grey-200 flex items-center justify-between gap-3">
          <div className="text-[11px] text-red-700 min-h-[1rem] flex-1">{error}</div>
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

// Give the formula-bar input a stable id so header "edit formula" can focus it.
// (Applied via the element below — kept here to document the contract.)

function FillHandle({ onStart }: { onStart: () => void }) {
  return (
    <div
      onPointerDown={e => {
        e.preventDefault();
        e.stopPropagation();
        onStart();
      }}
      className="absolute -bottom-[3px] -right-[3px] w-[7px] h-[7px] bg-primary border border-white cursor-crosshair z-20"
      title="Drag down to fill the column with this value"
    />
  );
}

function ColumnHeader({
  col,
  isValue,
  issue,
  onPatch,
  onRemove,
  onEditFormula,
  onClearFormula,
}: {
  col: ECol;
  isValue: boolean;
  issue?: string;
  onPatch: (patch: Partial<ECol>) => void;
  onRemove: () => void;
  onEditFormula: () => void;
  onClearFormula: () => void;
}) {
  return (
    <div className="space-y-1 min-w-[140px]">
      <div className="flex items-center gap-1">
        {isValue ? (
          <span className="font-bold text-primary text-xs">Value</span>
        ) : (
          <input
            value={col.header}
            onChange={e => onPatch({ header: e.target.value })}
            className="w-full px-1 py-0.5 border border-grey-200 rounded font-semibold text-tertiary-dark text-xs"
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
        <div className="flex items-center gap-1 text-[10px] font-normal flex-wrap">
          <button
            type="button"
            onClick={onEditFormula}
            className={`font-mono px-1 rounded truncate max-w-[120px] ${
              issue ? 'bg-red-100 text-red-700' : 'bg-secondary/10 text-secondary'
            }`}
            title={issue ?? 'Edit formula'}
          >
            ={formulaExpr(col.formula)}
          </button>
          <button type="button" onClick={onClearFormula} className="underline text-tertiary" title="Convert to plain values">
            clear
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={onEditFormula}
          className="text-[10px] text-secondary underline font-normal"
        >
          ƒ add formula
        </button>
      )}
      {issue && <p className="text-[9px] text-red-600 leading-tight">{issue}</p>}
    </div>
  );
}

function FormulaHelp({ columns }: { columns: ECol[] }) {
  const example =
    columns.length >= 2
      ? `= [${columns[1]?.header || 'Helper'}] * [${columns[0]?.header || 'Value'}]`
      : '= B * C';
  return (
    <div className="px-5 py-2 bg-secondary/5 border-b border-secondary/20 text-[11px] text-tertiary leading-relaxed">
      <p className="mb-1">
        <strong className="text-tertiary-dark">Formulas</strong> apply to a whole column and
        recompute live. Reference other columns by{' '}
        <span className="font-mono bg-white border border-grey-200 rounded px-1">[Column name]</span>{' '}
        or by letter (<span className="font-mono">A</span>=Year,{' '}
        <span className="font-mono">B</span>=Value, <span className="font-mono">C</span>…). Example:{' '}
        <span className="font-mono bg-white border border-grey-200 rounded px-1">{example}</span>
      </p>
      <p>
        <strong className="text-tertiary-dark">Operators</strong>{' '}
        <span className="font-mono">+ - * / ^</span> &nbsp;·&nbsp;{' '}
        <strong className="text-tertiary-dark">Functions</strong>{' '}
        <span className="font-mono">{FUNCTIONS.join(', ')}</span> &nbsp;·&nbsp; aggregates like{' '}
        <span className="font-mono">SUM(C)</span>, <span className="font-mono">AVG(C)</span> run down
        a whole column.
      </p>
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
      // Normalise any legacy {a,op,b} formula to the expression form.
      formula: c.formula ? { expr: formulaExpr(c.formula) } : undefined,
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
