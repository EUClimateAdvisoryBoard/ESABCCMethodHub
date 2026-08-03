/**
 * Export the indicator CALC GRIDS that the Summer Prep workbooks are built on.
 * ---------------------------------------------------------------------------
 * `build_indicator_check.py` / `build_indicator_overview.py` /
 * `build_indicator_combined.py` all take the calc grid as JSON on the command
 * line (`calc.json`, `calc_excel.json`, `reportway.json`). Until now those three
 * files were produced by hand from a live database, which meant the workbooks
 * could not actually be rebuilt from a clean checkout — the README's rebuild
 * recipe had a hole in the middle of it.
 *
 * This script closes that hole. The calc space is seeded from migrations, so
 * the migrations are the source of truth here too: the layouts are read
 * straight out of them, in migration order, exactly as Postgres would apply
 * them (each file upserts a WHOLE layout, so a later file simply replaces an
 * earlier one for the indicators it names).
 *
 *   045 → the report's own derivations, reverse-engineered from Ch3–Ch9
 *   052 → the same grids with their derivation text
 *   079 → the post-report years filled in (live recipe switched in by year)
 *   080 → the report's own derivation continued instead, where it can be
 *
 * The three outputs differ only in how the formulas are expressed:
 *
 *   calc.json       columns[].formula as expression text — what the "Where the
 *                   data comes from" sheet and the chapter tabs read.
 *   calc_excel.json columns[].expr plus rows[].formulas, the per-row A1
 *                   formulas for the Derivations sheet. Emitted through the
 *                   app's OWN translator (src/lib/project-workspace/formula.ts,
 *                   the one behind "download this indicator"), so the workbook
 *                   and the Hub cannot drift apart.
 *   reportway.json  the same entries, narrowed to the indicators whose report
 *                   derivation was successfully continued, with the refreshed
 *                   input columns and the years that were added.
 *
 * Usage:
 *   node --experimental-strip-types scripts/summer-prep-background/export_calc_grids.mjs \
 *     calc.json calc_excel.json reportway.json
 */

import { register } from 'node:module';
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// The app's modules import each other without file extensions; teach Node's
// resolver to follow that before importing any of them.
register('./ts-resolve-hook.mjs', import.meta.url);

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const LIB = join(ROOT, 'src', 'lib', 'project-workspace');

const { parseFormula, toExcelFormula } = await import(join(LIB, 'formula.ts'));
const { formulaExpr, resolveRef } = await import(join(LIB, 'indicator-sheet.ts'));

/** In migration order. Every one of these upserts a complete layout. */
const LAYOUT_SQL = [
  '045_seed_indicator_derivations.sql',
  '052_indicator_derivation_descriptions.sql',
  '079_post_report_calc_rows.sql',
  '080_report_way_calc_rows.sql',
].map(f => join(ROOT, 'supabase', 'migrations', f));

const REPORT_WAY = join(ROOT, 'scripts', 'esabcc-indicators', 'report-way-rows.json');

/**
 * Pull `('<indicator-id>', '<layout json>'::jsonb)` tuples out of a migration.
 * Same reader as build-postreport-calc-rows.mjs, including its rule that a
 * layout which will not parse is treated as absent rather than half-read.
 */
function parseLayouts(sql) {
  const out = {};
  const re = /\('([A-Za-z0-9_-]+)', '(\{[\s\S]*?\})'::jsonb\)/g;
  let m;
  while ((m = re.exec(sql))) {
    try {
      out[m[1]] = JSON.parse(m[2].replace(/''/g, "'"));
    } catch {
      /* a layout we cannot parse is treated as absent */
    }
  }
  return out;
}

/** A1 column letters, 1-based. Mirrors indicator-excel.ts's excelColLetter. */
function excelColLetter(n) {
  let s = '';
  let i = n;
  while (i > 0) {
    const r = (i - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    i = Math.floor((i - 1) / 26);
  }
  return s;
}

const cellNumber = c => (c && typeof c === 'object' ? (c.v ?? null) : c ?? null);

/** calc.json shape: formula flattened to its expression text. */
function toCalcEntry(layout) {
  return {
    columns: layout.columns.map(c => ({
      header: c.header,
      source: c.source ?? '',
      formula: formulaExpr(c.formula) || null,
    })),
    rows: layout.rows.map(r => ({ year: r.year, cells: r.cells })),
    ...(layout.derivation ? { derivation: layout.derivation } : {}),
  };
}

/**
 * calc_excel.json shape: the same grid, with each derived cell re-emitted as
 * the Excel formula for its row. Row i of the grid is addressed as sheet row
 * i + 2 (row 1 being the header); build_indicator_overview.py shifts those
 * references onto wherever the indicator's block actually lands.
 */
function toExcelEntry(layout) {
  const headers = layout.columns.map(c => c.header);
  const letterOf = ref => {
    const t = resolveRef(ref, headers);
    if (!t) return null;
    return t.kind === 'year' ? 'A' : excelColLetter(t.index + 2);
  };
  const asts = layout.columns.map(c => {
    const expr = formulaExpr(c.formula);
    return expr ? parseFormula(expr).ast : null;
  });
  return {
    columns: layout.columns.map((c, i) => ({
      header: c.header,
      source: c.source ?? '',
      expr: formulaExpr(c.formula) || null,
      derived: asts[i] !== null,
    })),
    rows: layout.rows.map((r, i) => ({
      year: r.year,
      cells: r.cells.map(cellNumber),
      // null where the column is a raw input — the builder then writes the
      // stored number instead of a formula.
      formulas: layout.columns.map((_c, ci) =>
        asts[ci] ? toExcelFormula(asts[ci], i + 2, letterOf) : null),
    })),
    ...(layout.derivation ? { derivation: layout.derivation } : {}),
  };
}

// ── Read the layouts, in migration order ─────────────────────────────────────
const layouts = {};
const perFile = [];
for (const f of LAYOUT_SQL) {
  const found = parseLayouts(readFileSync(f, 'utf8'));
  perFile.push([f.split('/').pop(), Object.keys(found).length]);
  Object.assign(layouts, found);
}

const calc = {};
const calcExcel = {};
for (const [id, layout] of Object.entries(layouts)) {
  if (!layout?.columns?.length || !Array.isArray(layout.rows)) continue;
  calc[id] = toCalcEntry(layout);
  calcExcel[id] = toExcelEntry(layout);
}

// ── reportway.json — the indicators whose own derivation was continued ───────
const rw = JSON.parse(readFileSync(REPORT_WAY, 'utf8'));
const filled = {};
for (const [id, entry] of Object.entries(rw.filled ?? {})) {
  const base = calcExcel[id];
  if (!base) continue;
  filled[id] = {
    ...base,
    // the report's own input columns that were refreshed, and for which years
    refreshed: (entry.columns ?? []).map(c => ({ header: c.header, scale: c.scale })),
    addedYears: (entry.rows ?? []).map(r => r.year),
  };
}

const [calcPath, excelPath, rwPath] = process.argv.slice(2);
writeFileSync(resolve(calcPath ?? 'calc.json'), JSON.stringify(calc, null, 1));
writeFileSync(resolve(excelPath ?? 'calc_excel.json'), JSON.stringify(calcExcel, null, 1));
writeFileSync(resolve(rwPath ?? 'reportway.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  source: rw.generatedAt ?? null,
  filled,
}, null, 1));

const withFormula = Object.values(calcExcel)
  .filter(e => e.rows.some(r => r.formulas.some(Boolean))).length;
console.log(perFile.map(([f, n]) => `${f}: ${n}`).join(' | '));
console.log(
  `→ ${Object.keys(calc).length} calc grids, ${withFormula} with live formulas, ` +
  `${Object.keys(filled).length} report-way`);
