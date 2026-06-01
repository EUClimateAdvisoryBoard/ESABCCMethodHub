/**
 * Indicator Database ⇄ Excel round-trip.
 * --------------------------------------
 * Builds (and parses) a single workbook for the whole indicator database:
 *
 *   • One "Indicators" sheet — the editable metadata table (one row per
 *     indicator: id, tab name, name, category, unit, direction, target,
 *     source, description …). The ID column is the join key on re-upload.
 *   • One "How to use" sheet — a short contract reminder.
 *   • One data tab per indicator. Row 1 is the header (`Year`, `Value`, then
 *     any number of user-defined helper columns). Row 2+ is the data.
 *
 * Contract
 * --------
 *   - Column A is always `Year`.
 *   - Column B is always `Value` — the FINAL number that gets plotted on the
 *     website. It may be a literal, or a formula referencing helper columns
 *     (e.g. `=C2*D2`); on import we read its computed result.
 *   - Columns C+ are HELPER columns. They are never plotted, but they (and
 *     their formulas) are stored server-side so the next download reproduces
 *     them. They are the "calc / edit mode" surface — hidden from the normal
 *     chart + table viewer.
 *
 * The plotted series lives in `pw_indicator_points`; the helper columns and
 * formulas live in `pw_indicator_sheets.layout` (see migration 042).
 *
 * Server-only: pulls in the (heavy) exceljs dependency and must not ship to
 * the browser.
 */
import 'server-only';
import ExcelJS from 'exceljs';
import type {
  Indicator,
  IndicatorCategory,
  IndicatorDataPoint,
} from '@/data/ecno-indicators';
import type {
  SheetCell,
  IndicatorSheetColumn,
  IndicatorSheetLayout,
} from './indicator-sheet';

export const CATEGORY_IDS: IndicatorCategory[] = [
  'emissions',
  'energy-supply',
  'energy-demand',
  'transport',
  'buildings',
  'industry',
  'agriculture',
  'lulucf',
  'finance',
  'fairness',
];

// Re-export the pure grid model so existing importers of this module keep
// working; the definitions live in the client-safe indicator-sheet module.
export type {
  SheetCell,
  ColumnOp,
  ColumnFormula,
  IndicatorSheetColumn,
  IndicatorSheetLayout,
} from './indicator-sheet';
export { normalizeLayout } from './indicator-sheet';

export interface ParsedIndicator {
  id: string;
  metadata: Partial<{
    name: string;
    category: IndicatorCategory;
    unit: string;
    direction: 'up' | 'down';
    targetValue: number | null;
    targetYear: number | null;
    source: string;
    sourceUrl: string;
    description: string;
  }>;
  /** null = the tab was missing / had no usable rows, so leave the series untouched. */
  points: IndicatorDataPoint[] | null;
  layout: IndicatorSheetLayout | null;
  warnings: string[];
}

export interface ParseResult {
  indicators: ParsedIndicator[];
  warnings: string[];
}

const METADATA_SHEET = 'Indicators';
const HOWTO_SHEET = 'How to use';
const YEAR_HEADER = 'Year';
const VALUE_HEADER = 'Value';

const HEADER_FILL = 'FF003399';
const VALUE_FILL = 'FF0065A4';

// ── Tab names ────────────────────────────────────────────────────────────────
// Excel sheet names are ≤31 chars, must be unique and cannot contain []:*?/\.
function sanitizeTabName(raw: string): string {
  return (
    raw
      .replace(/[[\]:*?/\\]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 31) || 'Sheet'
  );
}

function buildTabNames(indicators: Indicator[]): Map<string, string> {
  const used = new Set<string>([METADATA_SHEET.toLowerCase(), HOWTO_SHEET.toLowerCase()]);
  const byId = new Map<string, string>();
  for (const ind of indicators) {
    const base = sanitizeTabName(ind.code ? `${ind.code} ${ind.name}` : ind.name);
    let name = base;
    let n = 2;
    while (used.has(name.toLowerCase())) {
      const suffix = ` (${n++})`;
      name = base.slice(0, 31 - suffix.length) + suffix;
    }
    used.add(name.toLowerCase());
    byId.set(ind.id, name);
  }
  return byId;
}

// ── Build ──────────────────────────────────────────────────────────────────
export interface BuildInput {
  projectName: string;
  indicators: Indicator[];
  layouts: Record<string, IndicatorSheetLayout>;
}

export async function buildIndicatorsWorkbook(input: BuildInput): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESABCC MethodHub';
  wb.created = new Date();

  const tabNames = buildTabNames(input.indicators);

  buildHowToSheet(wb);
  buildMetadataSheet(wb, input.indicators, tabNames);

  for (const ind of input.indicators) {
    buildIndicatorSheet(wb, ind, tabNames.get(ind.id)!, input.layouts[ind.id]);
  }

  return wb.xlsx.writeBuffer();
}

function buildHowToSheet(wb: ExcelJS.Workbook) {
  const ws = wb.addWorksheet(HOWTO_SHEET, { properties: { tabColor: { argb: HEADER_FILL } } });
  ws.columns = [{ width: 110 }];
  const lines: [string, boolean][] = [
    ['Indicator database — Excel workbook', true],
    ['', false],
    ['Edit this file and upload it back on the website to update the indicator database.', false],
    ['', false],
    ['Each indicator has its own tab. On every tab:', true],
    ['  • Column A "Year"  — the year of the data point.', false],
    ['  • Column B "Value" — the FINAL number plotted on the website. It can be a', false],
    ['        plain number or a formula referencing helper columns, e.g. =C2*D2.', false],
    ['  • Columns C onward — your own HELPER columns (raw inputs, multipliers,', false],
    ['        intermediate workings). They are never plotted, but they are saved', false],
    ['        and reappear next time you download. Add as many as you like.', false],
    ['  • Per-column source — add a cell note (comment) on any header cell like', false],
    ['        "Source: …" to record where that column comes from. It round-trips', false],
    ['        and shows next to the column in the app’s edit / calc mode.', false],
    ['', false],
    ['You can also do all of this in the app: open an indicator and click', false],
    ['"Edit data / calc" to add rows, helper columns, per-column sources and', false],
    ['derive columns (e.g. Value = Raw × Multiplier) without leaving the site.', false],
    ['', false],
    ['The "Indicators" tab holds editable metadata (name, unit, target, source …).', false],
    ['Do NOT change the ID column or rename tabs — those are how rows are matched', false],
    ['on upload. Adding rows for new years is fine; deleting a row removes that', false],
    ['year from the plotted series.', false],
  ];
  lines.forEach(([text, bold], i) => {
    const cell = ws.getCell(i + 1, 1);
    cell.value = text;
    if (bold) cell.font = { bold: true, size: i === 0 ? 14 : 11 };
  });
}

function buildMetadataSheet(
  wb: ExcelJS.Workbook,
  indicators: Indicator[],
  tabNames: Map<string, string>
) {
  const ws = wb.addWorksheet(METADATA_SHEET, {
    properties: { tabColor: { argb: HEADER_FILL } },
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  ws.columns = [
    { header: 'ID', key: 'id', width: 26 },
    { header: 'Tab', key: 'tab', width: 28 },
    { header: 'Group', key: 'group', width: 12 },
    { header: 'Code', key: 'code', width: 8 },
    { header: 'Name', key: 'name', width: 42 },
    { header: 'Category', key: 'category', width: 16 },
    { header: 'Unit', key: 'unit', width: 14 },
    { header: 'Direction', key: 'direction', width: 11 },
    { header: 'Target value', key: 'targetValue', width: 13 },
    { header: 'Target year', key: 'targetYear', width: 12 },
    { header: 'Source', key: 'source', width: 28 },
    { header: 'Source URL', key: 'sourceUrl', width: 40 },
    { header: 'Description', key: 'description', width: 60 },
  ];
  styleHeaderRow(ws.getRow(1), HEADER_FILL);
  for (const ind of indicators) {
    ws.addRow({
      id: ind.id,
      tab: tabNames.get(ind.id),
      group: ind.group ?? (ind.id.startsWith('esabcc-') ? 'esabcc' : 'additional'),
      code: ind.code ?? '',
      name: ind.name,
      category: ind.category,
      unit: ind.unit,
      direction: ind.direction,
      targetValue: ind.targetValue ?? null,
      targetYear: ind.targetYear ?? null,
      source: ind.source,
      sourceUrl: ind.sourceUrl,
      description: ind.description,
    });
  }
}

function buildIndicatorSheet(
  wb: ExcelJS.Workbook,
  ind: Indicator,
  tabName: string,
  layout: IndicatorSheetLayout | undefined
) {
  const ws = wb.addWorksheet(tabName, { views: [{ state: 'frozen', ySplit: 1 }] });

  // Columns after Year: always start with "Value", then any stored helpers.
  const helperCols =
    layout && layout.columns.length > 0 ? layout.columns.slice(1) : [];
  const helperHeaders = helperCols.map(c => c.header);
  const headerRow = [YEAR_HEADER, VALUE_HEADER, ...helperHeaders];
  ws.addRow(headerRow);
  styleHeaderRow(ws.getRow(1), HEADER_FILL);
  // Tint the Value header so the "this is what gets plotted" column stands out.
  const valueHeaderCell = ws.getCell(1, 2);
  valueHeaderCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: VALUE_FILL } };
  // Record each column's source as a header-cell note so it round-trips.
  const valueSource = layout?.columns[0]?.source;
  if (valueSource) valueHeaderCell.note = `Source: ${valueSource}`;
  helperCols.forEach((c, i) => {
    if (c.source) ws.getCell(1, 3 + i).note = `Source: ${c.source}`;
  });

  const pointByYear = new Map(ind.data.map(p => [p.year, p.value]));
  const layoutByYear = new Map((layout?.rows ?? []).map(r => [r.year, r.cells]));
  const years = Array.from(
    new Set([...pointByYear.keys(), ...layoutByYear.keys()])
  ).sort((a, b) => a - b);

  for (const year of years) {
    const cells = layoutByYear.get(year) ?? [];
    const row = ws.addRow([]);
    row.getCell(1).value = year;

    // Value column (B): keep a stored formula, but otherwise use the canonical
    // point value so UI edits made since the last upload aren't overwritten.
    const stored = cells[0];
    const point = pointByYear.get(year);
    if (isFormula(stored)) {
      row.getCell(2).value = { formula: stored.f, result: point ?? coerceResult(stored.v) };
    } else {
      row.getCell(2).value = point ?? (typeof stored === 'number' ? stored : null);
    }

    // Helper columns (C+).
    helperHeaders.forEach((_h, i) => {
      writeCell(row.getCell(3 + i), cells[i + 1] ?? null);
    });
  }

  ws.getColumn(1).width = 10;
  ws.getColumn(2).width = 16;
  helperHeaders.forEach((_h, i) => {
    ws.getColumn(3 + i).width = 16;
  });
}

function writeCell(cell: ExcelJS.Cell, model: SheetCell) {
  if (isFormula(model)) {
    cell.value = { formula: model.f, result: coerceResult(model.v) };
  } else {
    cell.value = model;
  }
}

function styleHeaderRow(row: ExcelJS.Row, argb: string) {
  row.eachCell(cell => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  });
}

// ── Parse ────────────────────────────────────────────────────────────────────
export async function parseIndicatorsWorkbook(
  buf: ArrayBuffer,
  knownIds: Set<string>
): Promise<ParseResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);

  const warnings: string[] = [];
  const meta = wb.getWorksheet(METADATA_SHEET);
  if (!meta) {
    return {
      indicators: [],
      warnings: [`Workbook has no "${METADATA_SHEET}" sheet — cannot match indicators.`],
    };
  }

  const headerIndex = readHeaderIndex(meta.getRow(1));
  const idCol = headerIndex['id'];
  if (!idCol) {
    return { indicators: [], warnings: [`"${METADATA_SHEET}" sheet has no "ID" column.`] };
  }

  const out: ParsedIndicator[] = [];
  const seen = new Set<string>();

  meta.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const id = cellText(row.getCell(idCol)).trim();
    if (!id) return;
    if (!knownIds.has(id)) {
      warnings.push(`Skipped unknown indicator ID "${id}" (use the website to add new indicators).`);
      return;
    }
    if (seen.has(id)) {
      warnings.push(`Duplicate row for indicator "${id}" — only the first was used.`);
      return;
    }
    seen.add(id);

    const metadata = readMetadata(row, headerIndex);
    const tabName = headerIndex['tab'] ? cellText(row.getCell(headerIndex['tab'])).trim() : '';
    const ws = findDataSheet(wb, tabName);
    const indWarnings: string[] = [];
    let points: IndicatorDataPoint[] | null = null;
    let layout: IndicatorSheetLayout | null = null;

    if (!ws) {
      indWarnings.push(`No data tab found for "${id}" (expected tab "${tabName}") — series left unchanged.`);
    } else {
      const parsed = parseDataSheet(ws);
      points = parsed.points.length > 0 ? parsed.points : null;
      layout = parsed.layout;
      if (parsed.points.length === 0) {
        indWarnings.push(`Tab "${ws.name}" had no usable Year/Value rows — series left unchanged.`);
      }
      indWarnings.push(...parsed.warnings);
    }

    out.push({ id, metadata, points, layout, warnings: indWarnings });
  });

  return { indicators: out, warnings };
}

function readMetadata(
  row: ExcelJS.Row,
  idx: Record<string, number>
): ParsedIndicator['metadata'] {
  const m: ParsedIndicator['metadata'] = {};
  const text = (key: string) => (idx[key] ? cellText(row.getCell(idx[key])).trim() : '');
  const num = (key: string) => {
    if (!idx[key]) return undefined;
    const v = cellNumber(row.getCell(idx[key]));
    return v;
  };

  if (idx['name']) m.name = text('name') || undefined;
  if (idx['unit']) m.unit = text('unit') || undefined;
  if (idx['source']) m.source = text('source');
  if (idx['source url']) m.sourceUrl = text('source url');
  if (idx['description']) m.description = text('description');

  const cat = text('category').toLowerCase();
  if (cat && (CATEGORY_IDS as string[]).includes(cat)) m.category = cat as IndicatorCategory;

  const dir = text('direction').toLowerCase();
  if (dir === 'up' || dir === 'down') m.direction = dir;

  if (idx['target value']) m.targetValue = num('target value') ?? null;
  if (idx['target year']) {
    const ty = num('target year');
    m.targetYear = ty === undefined ? null : Math.round(ty);
  }
  return m;
}

function parseDataSheet(ws: ExcelJS.Worksheet): {
  points: IndicatorDataPoint[];
  layout: IndicatorSheetLayout;
  warnings: string[];
} {
  const warnings: string[] = [];
  const headerRow = ws.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col] = cellText(cell).trim();
  });

  // Locate the Year column and the Value column.
  let yearCol = headers.findIndex(h => h?.toLowerCase() === YEAR_HEADER.toLowerCase());
  if (yearCol < 1) yearCol = 1;
  let valueCol = headers.findIndex(h => h?.toLowerCase() === VALUE_HEADER.toLowerCase());
  if (valueCol < 1) valueCol = yearCol + 1;

  // Columns that form the layout (Value first, then helpers), in sheet order,
  // skipping the Year column.
  const layoutCols: number[] = [valueCol];
  for (let c = 1; c < headers.length; c++) {
    if (c === yearCol || c === valueCol) continue;
    if (headers[c] === undefined || headers[c] === '') continue;
    layoutCols.push(c);
  }
  const columns: IndicatorSheetColumn[] = layoutCols.map((c, i) => ({
    header: i === 0 ? VALUE_HEADER : headers[c] || `Column ${c}`,
    source: noteSource(headerRow.getCell(c)),
  }));

  const points: IndicatorDataPoint[] = [];
  const rows: IndicatorSheetLayout['rows'] = [];
  const seenYears = new Set<number>();

  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    const year = cellNumber(row.getCell(yearCol));
    if (year === undefined || !Number.isInteger(year)) return;
    if (seenYears.has(year)) {
      warnings.push(`Duplicate year ${year} in tab "${ws.name}" — only the first was used.`);
      return;
    }
    seenYears.add(year);

    const cells: SheetCell[] = layoutCols.map(c => cellToModel(row.getCell(c)).model);
    rows.push({ year, cells });

    const value = cellToModel(row.getCell(valueCol)).computed;
    if (value !== null) points.push({ year, value });
  });

  return { points, layout: { columns, rows }, warnings };
}

/** Reads a "Source: …" header-cell note back into a plain source string. */
function noteSource(cell: ExcelJS.Cell): string | undefined {
  const note = cell.note as unknown;
  let text = '';
  if (typeof note === 'string') text = note;
  else if (note && typeof note === 'object') {
    const texts = (note as { texts?: { text?: string }[] }).texts;
    if (Array.isArray(texts)) text = texts.map(t => t.text ?? '').join('');
  }
  text = text.trim();
  if (!text) return undefined;
  return text.replace(/^source:\s*/i, '').trim() || undefined;
}

// ── Cell helpers ─────────────────────────────────────────────────────────────
function readHeaderIndex(row: ExcelJS.Row): Record<string, number> {
  const idx: Record<string, number> = {};
  row.eachCell({ includeEmpty: false }, (cell, col) => {
    const key = cellText(cell).trim().toLowerCase();
    if (key) idx[key] = col;
  });
  return idx;
}

function findDataSheet(wb: ExcelJS.Workbook, tabName: string): ExcelJS.Worksheet | undefined {
  if (tabName) {
    const exact = wb.getWorksheet(tabName);
    if (exact) return exact;
    const ci = wb.worksheets.find(w => w.name.toLowerCase() === tabName.toLowerCase());
    if (ci) return ci;
  }
  return undefined;
}

function cellToModel(cell: ExcelJS.Cell): { model: SheetCell; computed: number | null } {
  const v = cell.value as unknown;
  if (v === null || v === undefined) return { model: null, computed: null };

  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if ('formula' in obj || 'sharedFormula' in obj) {
      const f = String(obj.formula ?? obj.sharedFormula ?? '');
      const result = obj.result;
      const resultNum = toFiniteNumber(result);
      return {
        model: { f, v: (result as number | string | undefined) ?? null },
        computed: resultNum,
      };
    }
    if ('result' in obj) {
      const resultNum = toFiniteNumber(obj.result);
      return { model: resultNum ?? null, computed: resultNum };
    }
    if ('text' in obj) {
      // hyperlink / rich text
      return { model: String(obj.text), computed: null };
    }
    return { model: null, computed: null };
  }

  if (typeof v === 'number') return { model: v, computed: Number.isFinite(v) ? v : null };
  if (typeof v === 'boolean') return { model: v ? 1 : 0, computed: v ? 1 : 0 };
  if (typeof v === 'string') {
    const n = toFiniteNumber(v);
    return { model: v, computed: n };
  }
  return { model: null, computed: null };
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value as unknown;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object') {
    const obj = v as Record<string, unknown>;
    if ('text' in obj) return String(obj.text);
    if ('result' in obj) return String(obj.result ?? '');
    if ('richText' in obj && Array.isArray(obj.richText)) {
      return (obj.richText as { text?: string }[]).map(t => t.text ?? '').join('');
    }
    return '';
  }
  return String(v);
}

function cellNumber(cell: ExcelJS.Cell): number | undefined {
  return cellToModel(cell).computed ?? undefined;
}

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'string') {
    const n = parseFloat(v.replace(/[, ]/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function isFormula(c: SheetCell | undefined): c is { f: string; v?: number | string | null } {
  return !!c && typeof c === 'object' && 'f' in c;
}

function coerceResult(v: number | string | null | undefined): number | string | undefined {
  if (v === null || v === undefined) return undefined;
  return v;
}
