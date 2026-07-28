/**
 * Translate every calc grid into live Excel formulas, once, for the workbook
 * builders.
 * ---------------------------------------------------------------------------
 * The "Derivations" sheet claims its formulas are the Method Hub's own. That is
 * only true if they come from the Hub's translator rather than a
 * re-implementation that drifts from it, so this imports
 * `src/lib/project-workspace/formula.ts` and `indicator-sheet.ts` directly and
 * mirrors what `indicator-excel.ts` does when a user exports a grid: same
 * reference resolution, same A = Year column mapping, same row addressing
 * (data starts at row 2, under the header).
 *
 * Output, per indicator id:
 *
 *   { columns: [{header, source, expr}],
 *     rows:    [{year, cells: [...], formulas: [<excel formula>|null, ...]}] }
 *
 * `expr` is flattened up from `{formula: {expr}}` because the builders read it
 * at the top level, and `formulas[i]` is null wherever the column has no
 * derivation — the builder then writes the stored number instead.
 *
 * Usage:
 *   node --experimental-strip-types scripts/esabcc-indicators/export-calc-excel.mjs \
 *     calc.json calc_excel.json
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIB = join(__dirname, '..', '..', 'src', 'lib', 'project-workspace');

const { parseFormula, toExcelFormula } = await import(join(LIB, 'formula.ts'));
const { resolveRef, formulaExpr, cellValue } = await import(join(LIB, 'indicator-sheet.ts'));

/** 1-based column number → Excel letter (1→A, 2→B, 27→AA). */
function excelColLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const inPath = resolve(process.argv[2] ?? 'calc.json');
const outPath = resolve(process.argv[3] ?? 'calc_excel.json');
const layouts = JSON.parse(await readFile(inPath, 'utf8'));

const out = {};
let nFormulas = 0, nUntranslatable = 0;
const untranslatable = [];

for (const [id, layout] of Object.entries(layouts)) {
  const cols = layout.columns?.length ? layout.columns : [{ header: 'Value' }];
  const headers = cols.map(c => c.header);

  // A = Year, B = first column (the Value), C = first helper, …
  const letterOf = ref => {
    const t = resolveRef(ref, headers);
    if (!t) return null;
    return t.kind === 'year' ? 'A' : excelColLetter(t.index + 2);
  };

  const asts = cols.map(c => {
    const expr = formulaExpr(c.formula);
    return expr ? parseFormula(expr).ast : null;
  });

  const rows = (layout.rows ?? []).map((r, ri) => {
    const excelRow = ri + 2; // row 1 is the header
    const formulas = cols.map((_c, ci) => {
      if (!asts[ci]) return null;
      const f = toExcelFormula(asts[ci], excelRow, letterOf);
      // toExcelFormula returns null for anything Excel cannot express as a
      // per-row formula (an aggregate over the whole column, an unresolvable
      // header). Recording it keeps the builder writing the stored number
      // rather than a broken "=#REF" that looks authoritative.
      if (f) nFormulas++;
      else { nUntranslatable++; untranslatable.push(`${id} · ${headers[ci]}`); }
      return f;
    });
    return {
      year: r.year,
      cells: (r.cells ?? []).map(c => (c && typeof c === 'object' ? cellValue(c) : c)),
      formulas,
    };
  });

  out[id] = {
    columns: cols.map(c => ({
      header: c.header,
      source: c.source ?? null,
      expr: formulaExpr(c.formula) || null,
    })),
    rows,
    derivation: layout.derivation ?? null,
  };
}

await writeFile(outPath, JSON.stringify(out, null, 1));

console.log(`${Object.keys(out).length} layouts → ${outPath}`);
console.log(`  ${nFormulas} live Excel formulas`);
if (nUntranslatable) {
  console.log(`  ${nUntranslatable} column-rows Excel cannot express (stored value written instead):`);
  for (const u of [...new Set(untranslatable)]) console.log(`    ${u}`);
}
