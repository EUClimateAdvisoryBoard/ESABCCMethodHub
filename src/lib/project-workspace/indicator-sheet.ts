/**
 * Indicator data-grid model — pure, client-safe (no exceljs, no server-only).
 * ---------------------------------------------------------------------------
 * Shared between the server-side Excel round-trip (indicator-excel.ts) and the
 * in-app calc editor (client component). Defines the per-indicator grid:
 *
 *   • columns[0] is always the plotted "Value" (final data) column.
 *   • columns[1+] are user-defined helper columns (raw inputs, multipliers …).
 *   • a column may carry a per-column `source`, and may be `formula`-derived
 *     from other columns (e.g. Value = Raw × Multiplier).
 */

/** A single cell: a primitive, or a spreadsheet formula with its last result. */
export type SheetCell = number | string | null | { f: string; v?: number | string | null };

/** Arithmetic operator for a derived (computed) column. */
export type ColumnOp = '+' | '-' | '*' | '/';

/**
 * A derived-column rule, authored in the in-app calc editor: this column is
 * `a (op) b`, recomputed live. `a` references another column by header; `b`
 * is either another column header or a numeric constant.
 */
export interface ColumnFormula {
  a: string;
  op: ColumnOp;
  b: string | number;
}

/**
 * One column of an indicator's data grid, after the `Year` column.
 * columns[0] is always the plotted "Value" (final data) column.
 */
export interface IndicatorSheetColumn {
  header: string;
  /** Provenance for this specific column (per-column source field). */
  source?: string;
  /** When set, the column is computed from other columns rather than typed. */
  formula?: ColumnFormula;
}

/**
 * The part of an indicator's tab that is NOT the canonical plotted series:
 * the columns after `Year` (columns[0] is always the `Value` column, with
 * its per-column source / derivation) and, per year, the cells under those
 * columns (preserving any spreadsheet formulas).
 */
export interface IndicatorSheetLayout {
  columns: IndicatorSheetColumn[];
  rows: { year: number; cells: SheetCell[] }[];
}

export function isColumnFormula(v: unknown): v is ColumnFormula {
  if (!v || typeof v !== 'object') return false;
  const f = v as Record<string, unknown>;
  return (
    typeof f.a === 'string' &&
    (f.op === '+' || f.op === '-' || f.op === '*' || f.op === '/') &&
    (typeof f.b === 'string' || typeof f.b === 'number')
  );
}

/** Applies an operator to two numbers; returns null for undefined results. */
export function applyOp(a: number, op: ColumnOp, b: number): number | null {
  let r: number;
  switch (op) {
    case '+':
      r = a + b;
      break;
    case '-':
      r = a - b;
      break;
    case '*':
      r = a * b;
      break;
    case '/':
      if (b === 0) return null;
      r = a / b;
      break;
    default:
      return null;
  }
  return Number.isFinite(r) ? r : null;
}

/**
 * Older stored layouts used a bare `headers: string[]`. Normalises either
 * shape to the current `columns` model; returns null for anything unusable.
 */
export function normalizeLayout(raw: unknown): IndicatorSheetLayout | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (!Array.isArray(obj.rows)) return null;
  let columns: IndicatorSheetColumn[] | null = null;
  if (Array.isArray(obj.columns)) {
    columns = (obj.columns as unknown[]).map(c => {
      if (typeof c === 'string') return { header: c };
      const cc = c as Record<string, unknown>;
      return {
        header: String(cc.header ?? ''),
        source: typeof cc.source === 'string' ? cc.source : undefined,
        formula: isColumnFormula(cc.formula) ? cc.formula : undefined,
      };
    });
  } else if (Array.isArray(obj.headers)) {
    columns = (obj.headers as unknown[]).map(h => ({ header: String(h) }));
  }
  if (!columns || columns.length === 0) return null;
  const rows = (obj.rows as unknown[])
    .map(r => {
      const rr = r as Record<string, unknown>;
      const year = Number(rr.year);
      if (!Number.isInteger(year)) return null;
      const cells = Array.isArray(rr.cells) ? (rr.cells as SheetCell[]) : [];
      return { year, cells };
    })
    .filter((r): r is { year: number; cells: SheetCell[] } => r !== null);
  return { columns, rows };
}

/** Numeric value of a stored cell (resolving a formula cell to its result). */
export function cellValue(cell: SheetCell | undefined): number | null {
  if (cell === null || cell === undefined) return null;
  if (typeof cell === 'number') return Number.isFinite(cell) ? cell : null;
  if (typeof cell === 'string') {
    const n = parseFloat(cell.replace(/[, ]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  // formula cell { f, v }
  const v = cell.v;
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}
