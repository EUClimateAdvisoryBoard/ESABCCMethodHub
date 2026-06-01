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

import { parseFormula, evaluate, type EvalContext } from './formula';

/** A single cell: a primitive, or a spreadsheet formula with its last result. */
export type SheetCell = number | string | null | { f: string; v?: number | string | null };

/** Arithmetic operator for the legacy single-op derived column. */
export type ColumnOp = '+' | '-' | '*' | '/';

/**
 * A derived-column rule, authored in the in-app calc editor. The column is
 * computed for every row and recomputed live.
 *
 * Current form — a free-form spreadsheet expression referencing other columns
 * by header (`[Raw] * [Multiplier]`) or by column letter (`B * C`). See
 * `formula.ts` for the grammar.
 *
 * Legacy form (still read for backward-compat) — a single binary op
 * `a (op) b`, where `a` is a column header and `b` a column header or
 * numeric constant. `formulaExpr()` converts it to the expression form.
 */
export interface ColumnFormula {
  /** Free-form expression (without a leading "="). Preferred. */
  expr?: string;
  /** Legacy single-op fields. */
  a?: string;
  op?: ColumnOp;
  b?: string | number;
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
  // New expression form.
  if (typeof f.expr === 'string' && f.expr.trim() !== '') return true;
  // Legacy single-op form.
  return (
    typeof f.a === 'string' &&
    (f.op === '+' || f.op === '-' || f.op === '*' || f.op === '/') &&
    (typeof f.b === 'string' || typeof f.b === 'number')
  );
}

/** Wrap a header in [brackets] if it isn't a plain single-letter/word token. */
function refToken(header: string): string {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(header) ? header : `[${header}]`;
}

/**
 * The expression text for a column formula, without a leading "=".
 * Converts the legacy `{a, op, b}` shape to expression form on the fly so the
 * rest of the app only ever deals with one representation.
 */
export function formulaExpr(f: ColumnFormula | undefined): string {
  if (!f) return '';
  if (typeof f.expr === 'string' && f.expr.trim() !== '') return f.expr.trim();
  if (typeof f.a === 'string' && f.op) {
    const b = typeof f.b === 'number' ? String(f.b) : refToken(String(f.b ?? ''));
    return `${refToken(f.a)} ${f.op} ${b}`;
  }
  return '';
}

// ── Reference resolution + grid computation ──────────────────────────────────
/** A1-style column letters → 1-based number. "A"→1, "B"→2, "AA"→27. */
function lettersToNumber(s: string): number | null {
  if (!/^[A-Za-z]+$/.test(s)) return null;
  let n = 0;
  for (const ch of s.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n;
}

/**
 * Resolves a formula reference (header text or column letter) against the data
 * columns (header list, index 0 = "Value"). Column A is the Year column, B the
 * first data column, C the next, etc. Returns the target, or null if unknown.
 */
export function resolveRef(
  ref: string,
  headers: string[]
): { kind: 'year' } | { kind: 'col'; index: number } | null {
  const r = ref.trim();
  const byHeader = headers.findIndex(h => h.trim().toLowerCase() === r.toLowerCase());
  if (byHeader >= 0) return { kind: 'col', index: byHeader };
  const num = lettersToNumber(r);
  if (num === 1) return { kind: 'year' };
  if (num !== null && num >= 2 && num - 2 < headers.length) return { kind: 'col', index: num - 2 };
  return null;
}

export interface ComputeInput {
  /** Data-column headers, parallel to `formulas`. headers[0] is "Value". */
  headers: string[];
  formulas: (ColumnFormula | undefined)[];
  /** Row years (column A / aggregate axis). */
  years: number[];
  /** Raw numeric input for non-formula cells: (colIndex, rowIndex) → number|null. */
  raw: (col: number, row: number) => number | null;
}

/**
 * Computes every data column for every row, resolving derived-column formulas
 * (live, with cycle protection). Returns `values[colIndex][rowIndex]`. Shared
 * by the in-app calc editor and the Excel exporter so both agree exactly.
 */
export function computeColumns(input: ComputeInput): (number | null)[][] {
  const { headers, formulas, years, raw } = input;
  const nCols = headers.length;
  const cache: ((number | null)[] | undefined)[] = new Array(nCols);
  const visiting = new Set<number>();
  const asts = formulas.map(f => {
    const expr = formulaExpr(f);
    return expr ? parseFormula(expr).ast : null;
  });

  function column(col: number): (number | null)[] {
    if (cache[col]) return cache[col]!;
    if (visiting.has(col)) return years.map(() => null); // cycle guard
    visiting.add(col);
    let out: (number | null)[];
    const ast = asts[col];
    if (formulas[col] && ast) {
      out = years.map((year, ri) => {
        const ctx: EvalContext = {
          cell: ref => {
            const t = resolveRef(ref, headers);
            if (!t) return null;
            return t.kind === 'year' ? year : column(t.index)[ri];
          },
          column: ref => {
            const t = resolveRef(ref, headers);
            if (!t) return [];
            return t.kind === 'year' ? years.slice() : column(t.index);
          },
        };
        return evaluate(ast, ctx);
      });
    } else {
      out = years.map((_y, ri) => raw(col, ri));
    }
    visiting.delete(col);
    cache[col] = out;
    return out;
  }

  return headers.map((_h, c) => column(c));
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
