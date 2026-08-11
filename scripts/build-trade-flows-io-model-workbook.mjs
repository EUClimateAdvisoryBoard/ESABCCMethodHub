/**
 * Build the Trade Flows IO-MODEL MASTERFILE (.xlsx) — the full input–output
 * modelling workbook for /beta/overview-industry/trade-flows.
 * ---------------------------------------------------------------------------
 * AI-compiled — pending Secretariat verification.
 *
 * This goes well beyond the in-page handover export (trade-flows/export.ts):
 * it rebuilds the ENTIRE input–output model inside the workbook, as live,
 * editable Excel formulas, so a colleague can change any underlying cell and
 * watch every derived figure recalculate — and can audit every derivation
 * cell by cell.
 *
 *   MODEL SHEETS (reference year 2023, EU-27 as one economy, € million)
 *     IO model            — per-industry output x, value-added components,
 *                           extra-EU exports, and the row-vs-column balance
 *                           check (all formulas over the Z sheets).
 *     Z total             — the 70×69 use matrix, all origins summed
 *                           (64 A*64 industries + 6 VA rows × 64 industries
 *                           + 5 final-demand columns). VALUES (the model input).
 *     Z domestic          — the intra-EU (EU27 origin) block, incl. VA rows.
 *     Z imported          — the extra-EU block (sum of the 23 partner areas).
 *     A domestic          — technical coefficients a_ij = Z_dom(i,j)/x_j. FORMULAS.
 *     A import            — import coefficients m_ij = Z_imp(i,j)/x_j. FORMULAS.
 *     I minus A           — (I − A_domestic). FORMULAS.
 *     Leontief inverse    — L = (I − A_d)⁻¹ via a MINVERSE array formula.
 *     Import requirements — A_m · L via a MMULT array formula (total imports
 *                           required, direct + indirect, per € of final demand).
 *     Multipliers         — output multipliers, import content, VA content,
 *                           the accounting-identity check, imports embodied in
 *                           extra-EU exports, and the cross-check against the
 *                           published FIGARO foreign-value-added shares.
 *
 *   DASHBOARD + DATA SHEETS
 *     Dashboard           — formula-driven KPIs and aggregations (by NACE
 *                           division, by supplier country, model top-10s):
 *                           recalculates when any data sheet is edited.
 *     Trade backbone      — ext_tec01 flows, balances as formulas, 2023+2024.
 *     FIGARO partners / Foreign value added / Imported inputs — the published
 *                           statistical layers, as in the module.
 *     Critical materials / Product dependencies / Strategic dependencies /
 *     Energy dependency / Risk map / Critical inputs — the curated layers.
 *     Read me, Methodology, Sources, Change log — full explanations, every
 *                           formula written out, every source with URL, and a
 *                           change-log template for tracked edits.
 *
 * Data inputs (all in-repo, all regenerable):
 *   - public/data/figaro/figaro-io-eu27.json      (naio_10_fcp_ii4 condensed;
 *     regenerate: node scripts/fetch-figaro-io-dataset.mjs)
 *   - public/data/figaro/figaro-global-flows.json (extra-EU exports by industry)
 *   - beta/modules/overview-industry/trade-flows/trade-data.ts and
 *     eurostat-io.generated.ts (transpiled on the fly; regenerate the latter:
 *     node scripts/fetch-trade-flows-io-data.mjs)
 *
 * Output: public/data/trade-flows-io-model-masterfile.xlsx  (IO-model
 * masterfile v1 — version label carried in the Read me sheet and the UI link).
 *
 * Every formula cell also carries its computed value (calculated here in JS,
 * including the 64×64 matrix inversion), so the workbook shows correct
 * numbers even before Excel's first recalculation; fullCalcOnLoad is set so
 * Excel recalculates everything on open.
 *
 * Run:  node scripts/build-trade-flows-io-model-workbook.mjs
 */

import { createRequire } from 'module';
import { readFileSync, writeFileSync, mkdtempSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import os from 'os';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const ExcelJS = require('exceljs');

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const MODULE_DIR = join(ROOT, 'beta/modules/overview-industry/trade-flows');
const OUT_PATH = join(ROOT, 'public/data/trade-flows-io-model-masterfile.xlsx');
const YEAR = '2023';

/* ------------------------------------------------------------------ TS import */

/**
 * The curated data lives in TypeScript modules; transpile them on the fly so
 * the workbook is always generated from the same single source of truth as
 * the web module (no duplicated data in this script).
 */
async function importTradeData() {
  const tmp = mkdtempSync(join(os.tmpdir(), 'tf-workbook-'));
  const transpile = (srcPath, outName) => {
    const out = ts.transpileModule(readFileSync(srcPath, 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.ES2020, target: ts.ScriptTarget.ES2020 },
    }).outputText.replace(/from '\.\/eurostat-io\.generated'/g, "from './eurostat-io.generated.mjs'");
    writeFileSync(join(tmp, outName), out);
  };
  transpile(join(MODULE_DIR, 'eurostat-io.generated.ts'), 'eurostat-io.generated.mjs');
  transpile(join(MODULE_DIR, 'trade-data.ts'), 'trade-data.mjs');
  const gen = await import(pathToFileURL(join(tmp, 'eurostat-io.generated.mjs')).href);
  const curated = await import(pathToFileURL(join(tmp, 'trade-data.mjs')).href);
  return { ...gen, ...curated };
}

/* --------------------------------------------------------------- matrix maths */

/** Invert a square matrix by Gauss-Jordan elimination with partial pivoting. */
function invert(mat) {
  const n = mat.length;
  const a = mat.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let col = 0; col < n; col++) {
    let pivot = col;
    for (let r = col + 1; r < n; r++) if (Math.abs(a[r][col]) > Math.abs(a[pivot][col])) pivot = r;
    if (Math.abs(a[pivot][col]) < 1e-12) throw new Error(`Singular matrix at column ${col}`);
    [a[col], a[pivot]] = [a[pivot], a[col]];
    const d = a[col][col];
    for (let j = 0; j < 2 * n; j++) a[col][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === col) continue;
      const f = a[r][col];
      if (f === 0) continue;
      for (let j = 0; j < 2 * n; j++) a[r][j] -= f * a[col][j];
    }
  }
  return a.map((row) => row.slice(n));
}

function matMul(A, B) {
  const n = A.length, m = B[0].length, k = B.length;
  const out = Array.from({ length: n }, () => new Array(m).fill(0));
  for (let i = 0; i < n; i++)
    for (let p = 0; p < k; p++) {
      const v = A[i][p];
      if (v === 0) continue;
      for (let j = 0; j < m; j++) out[i][j] += v * B[p][j];
    }
  return out;
}

/* ------------------------------------------------------------------- helpers */

/** 1-based column index → Excel letters (1 → A, 66 → BN). */
function colLetter(n) {
  let s = '';
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

const NAVY = 'FF004B7F';
const TEAL = 'FF007B6C';
const ORANGE = 'FFFF9933';
const VIOLET = 'FF6667AB';
const GREY = 'FF54728C';
const RED = 'FFB83230';

function styleHeaderRow(ws, argb, rowN = 1) {
  const header = ws.getRow(rowN);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 30;
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  });
  ws.views = [{ state: 'frozen', ySplit: rowN }];
}

function wrapAll(ws, fromRow = 2) {
  ws.eachRow((row, n) => {
    if (n < fromRow) return;
    row.alignment = { vertical: 'top', wrapText: true };
  });
}

function linkCell(cell, url) {
  cell.value = { text: url, hyperlink: url };
  cell.font = { color: { argb: 'FF0065A4' }, underline: true, size: 10 };
}

const cite = (s) => (s ? `${s.org} — ${s.title}${s.year ? ` (${s.year})` : ''}` : '');

/** Curated short labels for the non-industry axes of the FIGARO account. */
const VA_ROW_LABELS = {
  B2A3G: 'Gross operating surplus & mixed income',
  D1: 'Compensation of employees',
  D21X31: 'Taxes less subsidies on products',
  D29X39: 'Other taxes less subsidies on production',
  OP_RES: 'Purchases by residents abroad',
  OP_NRES: 'Purchases by non-residents in the EU',
};
const FINAL_DEMAND_LABELS = {
  P3_S13: 'Government consumption',
  P3_S14: 'Household consumption',
  P3_S15: 'NPISH consumption',
  P51G: 'Gross fixed capital formation',
  P5M: 'Changes in inventories & valuables',
};

/* ============================================================== build model */

async function main() {
  const td = await importTradeData();
  const io = JSON.parse(readFileSync(join(ROOT, 'public/data/figaro/figaro-io-eu27.json'), 'utf8'));
  const glob = JSON.parse(readFileSync(join(ROOT, 'public/data/figaro/figaro-global-flows.json'), 'utf8'));

  const N = io.nIndustries; // 64
  const inds = io.indAva.slice(0, N);
  const vaRows = io.indAva.slice(N); // 6
  const fdCols = io.indUse.slice(N); // 5
  const nRows = io.indAva.length; // 70
  const nCols = io.indUse.length; // 69
  if (JSON.stringify(glob.industries) !== JSON.stringify(inds)) {
    throw new Error('Industry axes of figaro-io-eu27.json and figaro-global-flows.json differ');
  }
  const label = (code) => {
    const curated = VA_ROW_LABELS[code] ?? FINAL_DEMAND_LABELS[code];
    if (curated) return curated;
    const raw = io.industries[code] ?? code;
    const cut = raw.split(/[;(]/)[0].trim();
    return cut.length > 70 ? `${cut.slice(0, 69)}…` : cut;
  };

  /* --- assemble the three Z matrices (€ million) --- */
  const zeros = () => Array.from({ length: nRows }, () => new Array(nCols).fill(0));
  const ZT = zeros();
  const ZD = io.matrix[YEAR]['EU27'].map((r) => [...r]);
  const ZM = zeros();
  for (const o of io.origins) {
    const m = io.matrix[YEAR][o];
    for (let r = 0; r < nRows; r++)
      for (let c = 0; c < nCols; c++) {
        ZT[r][c] += m[r][c];
        if (o !== 'EU27') ZM[r][c] += m[r][c];
      }
  }
  // VA rows exist only in the EU27 origin — verify, then drop them from ZM.
  for (let r = N; r < nRows; r++)
    for (let c = 0; c < nCols; c++)
      if (ZM[r][c] !== 0) throw new Error('Unexpected value-added entries in a non-EU origin');
  ZM.length = N;

  /* --- output, exports, checks --- */
  const x = inds.map((_, j) => {
    let s = 0;
    for (let r = 0; r < nRows; r++) s += ZT[r][j];
    return s;
  });
  const expInt = inds.map((_, i) => glob.euExportsByIndustry[YEAR].int[i].reduce((a, b) => a + b, 0));
  const expFin = inds.map((_, i) => glob.euExportsByIndustry[YEAR].fin[i].reduce((a, b) => a + b, 0));
  // Row identity uses the DOMESTIC block: EU industry i's output = its
  // deliveries to EU intermediate and final use (EU origin only — the Z total
  // rows additionally contain imported supply of the same products) + exports.
  const rowOut = inds.map((_, i) => {
    let s = 0;
    for (let c = 0; c < nCols; c++) s += ZD[i][c];
    return s + expInt[i] + expFin[i];
  });
  const worstResidual = Math.max(
    ...inds.map((_, i) => (x[i] > 0 ? Math.abs(rowOut[i] - x[i]) / x[i] : 0)),
  );

  /* --- coefficients, Leontief inverse, requirements --- */
  const Ad = Array.from({ length: N }, (_, i) => inds.map((_, j) => (x[j] > 0 ? ZD[i][j] / x[j] : 0)));
  const Am = Array.from({ length: N }, (_, i) => inds.map((_, j) => (x[j] > 0 ? ZM[i][j] / x[j] : 0)));
  const IA = Array.from({ length: N }, (_, i) => inds.map((_, j) => (i === j ? 1 : 0) - Ad[i][j]));
  const L = invert(IA);
  const AmL = matMul(Am, L);
  const colSum = (M, j) => M.reduce((s, row) => s + row[j], 0);
  const vtot = inds.map((_, j) => {
    let s = 0;
    for (let r = N; r < nRows; r++) s += ZD[r][j];
    return x[j] > 0 ? s / x[j] : 0;
  });
  const outputMult = inds.map((_, j) => colSum(L, j));
  const importContent = inds.map((_, j) => colSum(AmL, j));
  const vaContent = inds.map((_, j) => L.reduce((s, _row, i) => s + vtot[i] * L[i][j], 0));
  const identityErr = Math.max(
    ...inds.map((_, j) => (x[j] > 0 ? Math.abs(importContent[j] + vaContent[j] - 1) : 0)),
  );
  const exportsTotal = inds.map((_, i) => expInt[i] + expFin[i]);
  const xForExports = L.map((row) => row.reduce((s, v, j) => s + v * exportsTotal[j], 0));

  console.log(`Model built for ${YEAR}: ${N} industries.`);
  console.log(`  worst row-vs-column output residual: ${(worstResidual * 100).toFixed(3)} %`);
  console.log(`  worst accounting-identity error (import + VA content − 1): ${identityErr.toExponential(2)}`);

  /* ============================================================ workbook */

  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESABCC MethodHub — Overview Industry / Trade flows';
  wb.created = new Date();
  wb.calcProperties = { fullCalcOnLoad: true };
  const today = new Date().toISOString().slice(0, 10);

  /* Source collector (dedup by URL) for the Sources sheet. */
  const sources = new Map();
  const addSrc = (src, usedFor) => {
    if (!src?.url) return;
    const entry = sources.get(src.url) ?? { src, usedFor: new Set() };
    entry.usedFor.add(usedFor);
    sources.set(src.url, entry);
  };
  const FIGARO_TABLE_SOURCE = {
    org: 'Eurostat (FIGARO)',
    title: 'EU inter-country input–output table at basic prices, industry by industry (naio_10_fcp_ii4)',
    url: io.meta.source,
    year: YEAR,
  };
  addSrc(FIGARO_TABLE_SOURCE, 'Z matrices, IO model, coefficients, Leontief inverse, multipliers');
  addSrc(td.EUROSTAT_TEC, 'Trade backbone (ext_tec01, 2023+2024)');
  addSrc(td.EUROSTAT_USE_TABLE, 'Imported inputs (use table, 2023)');
  addSrc(td.EUROSTAT_FIGARO_IMPORTS, 'FIGARO import origins (2023)');
  addSrc(td.EUROSTAT_FIGARO_EXPORTS, 'FIGARO export destinations (2023)');
  addSrc(td.EUROSTAT_FIGARO_FVA, 'Published foreign value added (2023); model cross-check');
  addSrc(td.EUROSTAT_ENERGY_DEP, 'Energy import dependency (nrg_ind_id)');
  addSrc(td.CRMA_SOURCE, 'Critical Raw Materials Act framing');
  addSrc(td.SWD_2021_352, 'Strategic-dependency review');
  addSrc(td.OECD_TIVA_EU, 'OECD TiVA cross-check of FVA levels');

  /* ---------- generic matrix-sheet writer ----------
   * Layout (identical on every matrix sheet so formulas can be audited by eye):
   *   row 1: column codes (from col C)   row 2: column labels
   *   col A: row codes   col B: row labels        data: C3 …
   */
  function matrixSheet(name, tabColor, rowCodes, colCodes, opts) {
    const ws = wb.addWorksheet(name, { properties: { tabColor: { argb: tabColor } } });
    ws.getCell('A1').value = opts.corner;
    ws.getCell('A1').font = { bold: true, size: 9, color: { argb: GREY } };
    ws.getCell('A1').alignment = { wrapText: true, vertical: 'top' };
    ws.mergeCells(1, 1, 2, 2);
    colCodes.forEach((c, j) => {
      const col = 3 + j;
      ws.getCell(1, col).value = c;
      ws.getCell(2, col).value = label(c);
      ws.getCell(1, col).font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
      ws.getCell(1, col).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: tabColor } };
      ws.getCell(2, col).font = { size: 8, color: { argb: GREY } };
      ws.getCell(2, col).alignment = { wrapText: true, vertical: 'top' };
    });
    ws.getRow(2).height = 46;
    rowCodes.forEach((c, i) => {
      const r = 3 + i;
      ws.getCell(r, 1).value = c;
      ws.getCell(r, 1).font = { bold: true, size: 9 };
      ws.getCell(r, 2).value = label(c);
      ws.getCell(r, 2).font = { size: 8, color: { argb: GREY } };
    });
    ws.getColumn(1).width = 10;
    ws.getColumn(2).width = 34;
    for (let j = 0; j < colCodes.length; j++) ws.getColumn(3 + j).width = opts.colWidth ?? 11;
    ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];

    if (opts.values) {
      opts.values.forEach((row, i) => {
        row.forEach((v, j) => {
          const cell = ws.getCell(3 + i, 3 + j);
          cell.value = v;
          cell.numFmt = opts.numFmt;
        });
      });
    } else if (opts.formula) {
      rowCodes.forEach((_, i) => {
        colCodes.forEach((_, j) => {
          const cell = ws.getCell(3 + i, 3 + j);
          cell.value = { formula: opts.formula(i, j), result: opts.results[i][j] };
          cell.numFmt = opts.numFmt;
        });
      });
    } else if (opts.arrayFormula) {
      const ref = `C3:${colLetter(2 + colCodes.length)}${2 + rowCodes.length}`;
      const master = ws.getCell(3, 3);
      master.value = { formula: opts.arrayFormula, ref, shareType: 'array', result: opts.results[0][0] };
      rowCodes.forEach((_, i) => {
        colCodes.forEach((_, j) => {
          const cell = ws.getCell(3 + i, 3 + j);
          if (i === 0 && j === 0) return;
          cell.value = opts.results[i][j];
        });
      });
      rowCodes.forEach((_, i) =>
        colCodes.forEach((_, j) => {
          ws.getCell(3 + i, 3 + j).numFmt = opts.numFmt;
        }),
      );
    }
    return ws;
  }

  /* Cell address inside a matrix sheet for (row i, col j), 0-based. */
  const mCell = (sheet, i, j) => `'${sheet}'!${colLetter(3 + j)}${3 + i}`;

  /* ---------- 1 · Read me ---------- */
  const rm = wb.addWorksheet('Read me', { properties: { tabColor: { argb: NAVY } } });
  rm.columns = [{ width: 30 }, { width: 118 }];
  const rmRows = [
    ['Workbook', 'Trade flows — IO-model masterfile v1 (EU-27 manufacturing input–output model, dashboard, underlying data and sources)'],
    ['Compiled', today],
    ['Status', 'AI-compiled — pending Secretariat verification. Every statistical value is fetched from the public Eurostat API by the scripts named below; every curated figure carries its source on its own sheet and in the Sources sheet.'],
    ['What this is', 'The COMPLETE input–output modelling behind /beta/overview-industry/trade-flows, rebuilt inside one workbook: the FIGARO use matrices (total / domestic / imported), the technical and import coefficient matrices, the Leontief inverse, the import-requirements matrix, multipliers, the import and value-added content of final demand and of extra-EU exports — plus the dashboard, the Eurostat trade backbone, the published FIGARO layers and every curated dependency register. It is a superset of the in-page "handover workbook" download, which only carries the result tables.'],
    ['Live formulas', 'Everything derived is an Excel formula: the coefficient sheets divide the Z sheets by output, the Leontief inverse is one MINVERSE array formula over (I − A), the import-requirements sheet is one MMULT array formula, and the Multipliers and Dashboard sheets are built from SUM / SUMPRODUCT / INDEX / MATCH / COUNTIF over the data sheets. Change any underlying cell (a Z-matrix value, a backbone flow, a curated register row) and every dependent figure — up to and including the Dashboard — recalculates. Full recalculation on open is switched on.'],
    ['How to make changes', '1) Edit the underlying cell (Z sheets, Trade backbone, or a curated register). 2) Let Excel recalculate (F9 / on open). 3) Record the edit in the Change log sheet (date, cell, old → new, reason, source). 4) For changes that should persist, carry them back to the repository — the canonical data lives in trade-data.ts / the generated extracts, and this file is regenerated from them; a hand-edited copy of this workbook is a working copy, not the source of truth.'],
    ['Model scope', `Reference year ${YEAR}; EU-27 treated as one economy ("imported" = from outside the EU). 64 A*64 industries (the whole economy, not only manufacturing — a manufacturing-only model would misstate the chains through energy, mining and services). € million, current basic prices. Matrices condensed from Eurostat FIGARO naio_10_fcp_ii4 (~11 M cells) by scripts/fetch-figaro-io-dataset.mjs; aggregation choices are documented in that script's header.`],
    ['Three data layers', 'Layer 1 — trade backbone: ext_tec01, all 24 Section C divisions, 2023 + 2024, enterprise attribution. Layer 2 — input–output: the FIGARO matrices modelled here, plus the published application datasets (use-table input mixes, import origins, export destinations, foreign value added). Layer 3 — curated dependency registers: EC/JRC critical raw materials, SWD(2021) 352 strategic families, manufactured-product dependencies, energy dependency — "as reported by <source>", NOT derivable from official statistics and never arithmetically combined with the statistical layers.'],
    ['Sheet map', 'Dashboard → Methodology → IO model → Z total / Z domestic / Z imported → A domestic / A import → I minus A → Leontief inverse → Import requirements → Multipliers → Trade backbone → FIGARO partners → Foreign value added → Imported inputs → Critical materials → Product dependencies → Strategic dependencies → Energy dependency → Risk map → Critical inputs → Sources → Change log. The Methodology sheet states, for every derived sheet, the formula it implements and the exact cell references.'],
    ['Reproducible', 'node scripts/build-trade-flows-io-model-workbook.mjs rebuilds this file. Upstream: node scripts/fetch-figaro-io-dataset.mjs (FIGARO matrices), node scripts/fetch-trade-flows-io-data.mjs (backbone + published IO layers). Curated registers: beta/modules/overview-industry/trade-flows/trade-data.ts.'],
    ['Live module', '/beta/overview-industry/trade-flows on the MethodHub — same data, with the FIGARO table viewer and analysis dashboard at /trade-flows/figaro.'],
  ];
  rmRows.forEach(([k, v]) => {
    const row = rm.addRow([k, v]);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: GREY } };
    row.getCell(1).alignment = { vertical: 'top', wrapText: true };
    row.getCell(2).alignment = { vertical: 'top', wrapText: true };
  });
  rm.spliceRows(1, 0, []);
  rm.getCell('A1').value = 'Trade flows — the input–output model of EU-27 manufacturing · IO-model masterfile v1';
  rm.getCell('A1').font = { bold: true, size: 14, color: { argb: NAVY } };
  rm.mergeCells('A1:B1');

  /* ---------- 2 · Dashboard (all formulas — filled in after the data sheets exist) ---------- */
  const dash = wb.addWorksheet('Dashboard', { properties: { tabColor: { argb: TEAL } } });

  /* ---------- 3 · Methodology ---------- */
  const me = wb.addWorksheet('Methodology', { properties: { tabColor: { argb: NAVY } } });
  me.columns = [{ width: 34 }, { width: 130 }];
  const meRows = [
    ['1 · The accounting identity', 'An input–output table reads each industry twice: each ROW is an industry as a seller, each COLUMN the same industry as a buyer. Reading a column down gives the industry\'s input recipe. Every euro of output is bought either as another industry\'s intermediate input or as final demand:   x = A·x + f   (output = intermediate demand + final demand). In this workbook the identity is checked per industry on the IO model sheet: column-based output (everything industry j buys, incl. value added — Z total column sums) against row-based output (everything EU industry i sells: its DOMESTIC deliveries to EU intermediate use and final demand — Z domestic rows, because the Z total rows additionally contain imported supply of the same products — plus extra-EU exports). The residual column should stay near zero (rounding and the FIGARO balancing item only) — if an edit breaks it, the edit broke the balance.'],
    ['2 · Technical coefficients (A domestic)', 'a_ij = Z_domestic(i,j) / x_j — the euros of DOMESTIC (intra-EU) product i needed per euro of output of industry j. Sheet "A domestic", each cell an explicit division of the Z domestic sheet by output on the IO model sheet (e.g. cell C3 = \'Z domestic\'!C3 / \'IO model\'!$D$4). The import coefficients m_ij = Z_imported(i,j) / x_j are the same construction on sheet "A import" — the extra-EU input recipe.'],
    ['3 · Leontief inverse', 'Solving x = A·x + f for output gives x = (I − A)⁻¹ · f. The matrix L = (I − A_domestic)⁻¹ (sheet "Leontief inverse", one MINVERSE array formula over the "I minus A" sheet) converts a bill of final demand into the TOTAL output every industry must produce — direct plus indirect: one euro of car demand pulls in steel, the steel pulls in iron ore and electricity, and so on; L sums the whole regress (I + A + A² + …). Column sums of L are the output multipliers on the Multipliers sheet.'],
    ['4 · Import requirements', 'M = A_import · L (sheet "Import requirements", one MMULT array formula): cell (i,j) is the euros of extra-EU imports of product i required — directly and through all domestic supply chains — per euro of final demand for industry j\'s output. Column sums are the IMPORT CONTENT of final demand (Multipliers sheet): what one euro spent on industry j\'s output pulls in from outside the EU.'],
    ['5 · Value-added content and the model check', 'v_j = (all six value-added and adjustment rows) / x_j on the IO model sheet. The value-added content of final demand is v′·L (SUMPRODUCT of the v vector with each L column). Accounting identity: import content + value-added content = 1 exactly (every euro of final demand is ultimately either extra-EU imports or EU value added, taxes included). The Multipliers sheet carries the check column; the Dashboard surfaces its worst deviation.'],
    ['6 · Imports embodied in exports', 'Applying the same requirements to extra-EU exports e (IO model sheet, from the FIGARO inter-country accounts): imports embodied in industry j\'s exports = import content_j × e_j; the output needed economy-wide to produce the EU\'s exports is L·e (an MMULT column on the Multipliers sheet). This is the workbook\'s own derivation of what Eurostat publishes as "foreign value added in exports".'],
    ['7 · Cross-check vs the published FVA', 'The Multipliers sheet compares the model\'s import content of exports with the PUBLISHED FIGARO foreign-value-added shares (naio_10_fgfoee, on the Foreign value added sheet). The two are close but conceptually distinct and are NOT expected to be identical: import content counts gross imported inputs (which contain the partner\'s own imported inputs, and re-imported EU value), while FVA counts only foreign value added, computed by Eurostat from the full 46-country inter-country model rather than this condensed EU-vs-rest account. Differences of a few percentage points are the method, not an error. OECD TiVA offers an independent series for level checks.'],
    ['8 · Enterprise vs product attribution', '"Imports of division X" is not one number. The Trade backbone (ext_tec01) books trade to the NACE code of the trading ENTERPRISE; the IO layer follows the PRODUCT. C19 is the worked example: refiners import ~€218 bn of crude (enterprise view, backbone sheet), but crude is a MINING product, so the product view (FIGARO partners sheet) shows only ~€62 bn of refined-product imports — and the crude reappears on the model sheets as imported intermediate input INTO refining (row B of the Z imported column for C19). All three lenses are kept, each labelled; each answers a different question: who imports (enterprise), what crosses the border (product), what does an industry depend on (input–output).'],
    ['9 · Grouped industries', 'FIGARO and the use table publish some divisions only as groups: C10-12 (food, beverages & tobacco), C13-15 (textiles, apparel & leather), C31_32 (furniture & other manufacturing). Those divisions inherit group-level figures. Known within-group skews: ' + Object.entries(td.IO_GROUP_SKEW_NOTES).map(([c, n]) => `${c}: ${n}`).join(' | ')],
    ['10 · Curated-layer definitions', 'Import reliance (critical materials, risk map x-axis): IR = (imports − exports) / (domestic production + imports − exports) — the EC criticality methodology; it nets out re-exports, so it differs from customs shares. Supplier concentration (y-axis): the largest single supplier\'s share of EU supply — a first-moment proxy for the HHI; it understates concentration when suppliers two and three are also non-diversified and says nothing about substitutability, stocks or recyclability. Product-dependency shares are customs-based ("largest supplier\'s share of extra-EU imports") unless the Share basis column says otherwise. All curated figures are quoted "as reported by <source>" and must not be arithmetically combined with the statistical layers.'],
    ['11 · Known limits', 'Modelled statistics: FIGARO balances supply and use across countries and can differ from raw customs data (CIF/FOB, re-exports, balancing). Proportionality: every euro of an industry\'s output is assumed to use the same input recipe (no scale effects, no substitution). Current prices: year-on-year changes mix price and volume. Named partners: FIGARO names 23 partner areas — Taiwan is inside "Rest of the world", so the semiconductor dependency is invisible in the named-partner shares and appears only in the curated layer. The Section C aggregate of ext_tec01 does not equal the sum of its 24 divisions (non-allocable trade; both are shown on the Trade backbone sheet).'],
    ['12 · Where every derivation lives', [
      'IO model: x_j = SUM of Z total column j (rows 3–72); exports from FIGARO inter-country accounts; residual check per industry.',
      'A domestic C3 = \'Z domestic\'!C3/\'IO model\'!$D$4 (and so on cell by cell).',
      'A import C3 = \'Z imported\'!C3/\'IO model\'!$D$4.',
      'I minus A C3 = 1−\'A domestic\'!C3 on the diagonal, else −\'A domestic\'!C3.',
      `Leontief inverse: {=MINVERSE('I minus A'!C3:${colLetter(2 + N)}${2 + N})}.`,
      `Import requirements: {=MMULT('A import'!C3:${colLetter(2 + N)}${2 + N},'Leontief inverse'!C3:${colLetter(2 + N)}${2 + N})}.`,
      'Multipliers: output multiplier = SUM(L column); import content = SUM(Import requirements column); VA content = SUMPRODUCT(v vector, L column); check = import + VA content − 1; embodied imports = import content × exports; output for exports = {=MMULT(L, exports)}.',
      'Dashboard: INDEX/MATCH on the backbone and published sheets; COUNTIF/SUMPRODUCT over the curated registers; LARGE/INDEX/MATCH for the top-10 tables.',
    ].join('\n')],
  ];
  meRows.forEach(([k, v]) => {
    const row = me.addRow([k, v]);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: NAVY } };
    row.getCell(1).alignment = { vertical: 'top', wrapText: true };
    row.getCell(2).alignment = { vertical: 'top', wrapText: true };
    row.getCell(2).font = { size: 10 };
  });
  me.spliceRows(1, 0, []);
  me.getCell('A1').value = 'Methodology & derivations — how every number in this workbook is computed';
  me.getCell('A1').font = { bold: true, size: 13, color: { argb: NAVY } };
  me.mergeCells('A1:B1');

  /* ---------- 4 · IO model (per-industry accounts; formulas over Z sheets) ---------- */
  const im = wb.addWorksheet('IO model', { properties: { tabColor: { argb: TEAL } } });
  im.getCell('A1').value =
    `IO model — per-industry accounts, ${YEAR}, € million, EU-27 as one economy. ` +
    'Output, value added and intermediate totals are formulas over the Z sheets; extra-EU exports are values from the FIGARO inter-country accounts ' +
    '(euExportsByIndustry, figaro-global-flows.json). The residual column checks column-based against row-based output — keep it near zero.';
  im.getCell('A1').font = { size: 9, color: { argb: GREY } };
  im.getCell('A1').alignment = { wrapText: true };
  im.mergeCells('A1:N1');
  im.getRow(1).height = 44;
  const imHeader = [
    'Code', 'Industry', 'NACE section',
    'Total output x (col sum incl. VA)', 'Intermediate inputs (all origins)', 'Value added + taxes + adj.',
    'of which: compensation (D1)', 'of which: operating surplus (B2A3G)', 'of which: taxes less subsidies',
    'VA coefficient v = VA/x', 'Domestic deliveries to EU intermediate use (row sum)', 'Domestic deliveries to EU final demand (row sum)',
    'Extra-EU exports (interm. + final)', 'Row-based output', 'Residual (row − col, % of x)',
  ];
  im.getRow(2).values = imHeader;
  styleHeaderRow(im, TEAL, 2);
  im.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  const zLast = colLetter(2 + N); // BN — last industry column on matrix sheets
  const fdFirst = colLetter(3 + N); // BO — first final-demand column
  const fdLast = colLetter(2 + N + fdCols.length); // BS
  const IM0 = 3; // first data row of the IO model sheet
  inds.forEach((code, j) => {
    const r = IM0 + j;
    const col = colLetter(3 + j); // this industry's column on the matrix sheets
    const vaTaxes = ZD[N + 2][j] + ZD[N + 3][j];
    const interAll = inds.reduce((s, _c, i) => s + ZT[i][j], 0);
    const vaAll = x[j] - interAll;
    const rowInter = inds.reduce((s, _c, c) => s + ZD[j][c], 0);
    const rowFd = fdCols.reduce((s, _c, k) => s + ZD[j][N + k], 0);
    im.getRow(r).values = [
      code, label(code), code[0],
      { formula: `SUM('Z total'!${col}3:${col}${2 + nRows})`, result: x[j] },
      { formula: `SUM('Z total'!${col}3:${col}${2 + N})`, result: interAll },
      { formula: `SUM('Z domestic'!${col}${3 + N}:${col}${2 + nRows})`, result: vaAll },
      { formula: `'Z domestic'!${col}${3 + N + 1}`, result: ZD[N + 1][j] },
      { formula: `'Z domestic'!${col}${3 + N}`, result: ZD[N][j] },
      { formula: `'Z domestic'!${col}${3 + N + 2}+'Z domestic'!${col}${3 + N + 3}`, result: vaTaxes },
      { formula: `IF(D${r}=0,0,F${r}/D${r})`, result: x[j] > 0 ? vaAll / x[j] : 0 },
      { formula: `SUM('Z domestic'!C${r}:${zLast}${r})`, result: rowInter },
      { formula: `SUM('Z domestic'!${fdFirst}${r}:${fdLast}${r})`, result: rowFd },
      exportsTotal[j],
      { formula: `K${r}+L${r}+M${r}`, result: rowInter + rowFd + exportsTotal[j] },
      { formula: `IF(D${r}=0,0,100*(N${r}-D${r})/D${r})`, result: x[j] > 0 ? (100 * (rowOut[j] - x[j])) / x[j] : 0 },
    ];
  });
  im.getColumn(1).width = 10;
  im.getColumn(2).width = 40;
  im.getColumn(3).width = 8;
  for (let c = 4; c <= 14; c++) im.getColumn(c).width = 14;
  im.getColumn(15).width = 12;
  for (let c = 4; c <= 14; c++)
    for (let r = IM0; r < IM0 + N; r++) im.getCell(r, c).numFmt = c === 10 ? '0.0000' : '#,##0.0';
  for (let r = IM0; r < IM0 + N; r++) im.getCell(r, 15).numFmt = '0.000';

  /* ---------- 5–7 · Z matrices (values) ---------- */
  matrixSheet('Z total', NAVY, io.indAva, io.indUse, {
    corner: `Use matrix, ALL origins summed — ${YEAR}, € million. Rows: 64 industries + 6 VA/adjustment rows (a row is TOTAL supply of that product to EU-27 use, domestic + imported). Columns: 64 industries + 5 final-demand categories. Source: ${io.meta.dataset}.`,
    values: ZT, numFmt: '#,##0.0',
  });
  matrixSheet('Z domestic', NAVY, io.indAva, io.indUse, {
    corner: `Intra-EU (domestic) block, origin EU27 incl. value-added rows — ${YEAR}, € million.`,
    values: ZD, numFmt: '#,##0.0',
  });
  matrixSheet('Z imported', NAVY, inds, io.indUse, {
    corner: `Extra-EU (imported) block, 23 partner areas summed — ${YEAR}, € million. Value-added rows are zero by construction and omitted.`,
    values: ZM, numFmt: '#,##0.0',
  });

  /* ---------- 8–9 · coefficient matrices (formulas) ---------- */
  matrixSheet('A domestic', VIOLET, inds, inds, {
    corner: 'Technical coefficients a_ij = Z_domestic(i,j) / x_j — € of domestic product i per € of output of industry j. Every cell is a live division.',
    formula: (i, j) => `IF('IO model'!$D$${IM0 + j}=0,0,${mCell('Z domestic', i, j)}/'IO model'!$D$${IM0 + j})`,
    results: Ad, numFmt: '0.00000', colWidth: 10,
  });
  matrixSheet('A import', VIOLET, inds, inds, {
    corner: 'Import coefficients m_ij = Z_imported(i,j) / x_j — € of extra-EU imports of product i per € of output of industry j.',
    formula: (i, j) => `IF('IO model'!$D$${IM0 + j}=0,0,${mCell('Z imported', i, j)}/'IO model'!$D$${IM0 + j})`,
    results: Am, numFmt: '0.00000', colWidth: 10,
  });

  /* ---------- 10 · I − A ---------- */
  matrixSheet('I minus A', VIOLET, inds, inds, {
    corner: 'I − A_domestic — the matrix inverted by the Leontief sheet.',
    formula: (i, j) => (i === j ? `1-${mCell('A domestic', i, j)}` : `-${mCell('A domestic', i, j)}`),
    results: IA, numFmt: '0.00000', colWidth: 10,
  });

  /* ---------- 11 · Leontief inverse (array formula) ---------- */
  matrixSheet('Leontief inverse', ORANGE, inds, inds, {
    corner: 'L = (I − A_domestic)⁻¹ — one MINVERSE array formula. Cell (i,j): total output of industry i required per € of final demand for industry j (direct + indirect). Column sums = output multipliers.',
    arrayFormula: `MINVERSE('I minus A'!C3:${colLetter(2 + N)}${2 + N})`,
    results: L, numFmt: '0.00000', colWidth: 10,
  });

  /* ---------- 12 · Import requirements (array formula) ---------- */
  matrixSheet('Import requirements', ORANGE, inds, inds, {
    corner: 'M = A_import · L — one MMULT array formula. Cell (i,j): € of extra-EU imports of product i required, directly and through all domestic chains, per € of final demand for industry j. Column sums = import content of final demand.',
    arrayFormula: `MMULT('A import'!C3:${colLetter(2 + N)}${2 + N},'Leontief inverse'!C3:${colLetter(2 + N)}${2 + N})`,
    results: AmL, numFmt: '0.00000', colWidth: 10,
  });

  /* ---------- 13 · Multipliers ---------- */
  const mu = wb.addWorksheet('Multipliers', { properties: { tabColor: { argb: ORANGE } } });
  mu.getCell('A1').value =
    'Multipliers & content of final demand — all formulas over the model sheets. Import content + VA content must sum to 100 % (check column). ' +
    'The published-FVA column is Eurostat naio_10_fgfoee (Foreign value added sheet): conceptually close to, but not identical with, the model\'s import content — see Methodology §7.';
  mu.getCell('A1').font = { size: 9, color: { argb: GREY } };
  mu.getCell('A1').alignment = { wrapText: true };
  mu.mergeCells('A1:L1');
  mu.getRow(1).height = 40;
  mu.getRow(2).values = [
    'Code', 'Industry', 'NACE section',
    'Output multiplier (col sum of L)', 'Import content of final demand %', 'VA content of final demand %',
    'Check: import + VA − 100', 'Extra-EU exports € m', 'Imports embodied in exports € m',
    'Output required for EU exports € m (L·e)', 'Published FVA % of exports (FIGARO)', 'Model − published (pp)',
  ];
  styleHeaderRow(mu, ORANGE, 2);
  mu.views = [{ state: 'frozen', xSplit: 2, ySplit: 2 }];
  /* Published FVA, keyed by the A64 code spelling used on the matrix sheets. */
  const fvaByA64 = new Map(
    td.FIGARO_FVA.map((f) => [
      f.industry.replace('C10-C12', 'C10-12').replace('C13-C15', 'C13-15').replace('C31_C32', 'C31_32'),
      f,
    ]),
  );
  const MU0 = 3;
  inds.forEach((code, j) => {
    const r = MU0 + j;
    const col = colLetter(3 + j);
    const pub = fvaByA64.get(code);
    mu.getRow(r).values = [
      code, label(code), code[0],
      { formula: `SUM('Leontief inverse'!${col}3:${col}${2 + N})`, result: outputMult[j] },
      { formula: `100*SUM('Import requirements'!${col}3:${col}${2 + N})`, result: 100 * importContent[j] },
      { formula: `100*SUMPRODUCT('IO model'!$J$${IM0}:$J$${IM0 + N - 1},'Leontief inverse'!${col}3:${col}${2 + N})`, result: 100 * vaContent[j] },
      { formula: `E${r}+F${r}-100`, result: 100 * (importContent[j] + vaContent[j] - 1) },
      { formula: `'IO model'!M${IM0 + j}`, result: exportsTotal[j] },
      { formula: `E${r}/100*H${r}`, result: importContent[j] * exportsTotal[j] },
      null, // filled by the MMULT array below
      pub ? pub.fvaPct : '',
      pub ? { formula: `E${r}-K${r}`, result: 100 * importContent[j] - pub.fvaPct } : '',
    ];
  });
  {
    const ref = `J${MU0}:J${MU0 + N - 1}`;
    mu.getCell(`J${MU0}`).value = {
      formula: `MMULT('Leontief inverse'!C3:${colLetter(2 + N)}${2 + N},'IO model'!M${IM0}:M${IM0 + N - 1})`,
      ref, shareType: 'array', result: xForExports[0],
    };
    for (let j = 1; j < N; j++) mu.getCell(`J${MU0 + j}`).value = xForExports[j];
  }
  mu.getColumn(1).width = 10;
  mu.getColumn(2).width = 40;
  mu.getColumn(3).width = 8;
  for (let c = 4; c <= 12; c++) mu.getColumn(c).width = 14;
  for (let j = 0; j < N; j++) {
    const r = MU0 + j;
    mu.getCell(r, 4).numFmt = '0.000';
    for (const c of [5, 6, 11, 12]) mu.getCell(r, c).numFmt = '0.0';
    mu.getCell(r, 7).numFmt = '0.000';
    for (const c of [8, 9, 10]) mu.getCell(r, c).numFmt = '#,##0.0';
  }

  /* ---------- 14 · Trade backbone (balances as formulas) ---------- */
  const tb = wb.addWorksheet('Trade backbone', { properties: { tabColor: { argb: NAVY } } });
  tb.columns = [
    { header: 'Division', key: 'code', width: 9 },
    { header: 'Label', key: 'label', width: 40 },
    { header: 'Branch', key: 'branch', width: 28 },
    { header: '2023 extra-EU imports €bn', key: 'impExt23', width: 13 },
    { header: '2023 extra-EU exports €bn', key: 'expExt23', width: 13 },
    { header: '2023 extra-EU balance €bn', key: 'bal23', width: 13 },
    { header: '2023 intra-EU imports €bn', key: 'impInt23', width: 13 },
    { header: '2023 intra-EU exports €bn', key: 'expInt23', width: 13 },
    { header: '2024 extra-EU imports €bn', key: 'impExt24', width: 13 },
    { header: '2024 extra-EU exports €bn', key: 'expExt24', width: 13 },
    { header: '2024 extra-EU balance €bn', key: 'bal24', width: 13 },
    { header: '2024 intra-EU imports €bn', key: 'impInt24', width: 13 },
    { header: '2024 intra-EU exports €bn', key: 'expInt24', width: 13 },
    { header: 'Trade / dependency story', key: 'note', width: 85 },
  ];
  td.DIVISION_TRADE.forEach((d, i) => {
    const r = 2 + i;
    const f23 = d.flows['2023'];
    const f24 = d.flows['2024'];
    tb.addRow({
      code: d.code, label: d.label, branch: d.branch,
      impExt23: f23.impExt, expExt23: f23.expExt,
      bal23: { formula: `E${r}-D${r}`, result: Math.round((f23.expExt - f23.impExt) * 10) / 10 },
      impInt23: f23.impInt, expInt23: f23.expInt,
      impExt24: f24.impExt, expExt24: f24.expExt,
      bal24: { formula: `J${r}-I${r}`, result: Math.round((f24.expExt - f24.impExt) * 10) / 10 },
      impInt24: f24.impInt, expInt24: f24.expInt,
      note: d.note,
    });
  });
  const cAggRow = 2 + td.DIVISION_TRADE.length; // 26
  const c23 = td.SECTION_C_TEC['2023'];
  const c24 = td.SECTION_C_TEC['2024'];
  tb.addRow({
    code: 'C', label: 'Section C aggregate row (incl. non-allocable trade)', branch: '',
    impExt23: c23.impExt, expExt23: c23.expExt,
    bal23: { formula: `E${cAggRow}-D${cAggRow}`, result: Math.round((c23.expExt - c23.impExt) * 10) / 10 },
    impInt23: c23.impInt, expInt23: c23.expInt,
    impExt24: c24.impExt, expExt24: c24.expExt,
    bal24: { formula: `J${cAggRow}-I${cAggRow}`, result: Math.round((c24.expExt - c24.impExt) * 10) / 10 },
    impInt24: c24.impInt, expInt24: c24.expInt,
    note: `Source: ${cite(td.EUROSTAT_TEC)} — enterprise-based attribution; € bn current prices. The aggregate does NOT equal the division sum below (non-allocable trade).`,
  }).font = { bold: true, size: 10 };
  const sumRow = cAggRow + 1;
  const sumF = (colL) => ({ formula: `SUM(${colL}2:${colL}${cAggRow - 1})`, result: null });
  const s23 = td.SECTION_C_DIVISION_SUM['2023'];
  const s24 = td.SECTION_C_DIVISION_SUM['2024'];
  const withRes = (f, v) => ({ ...f, result: v });
  tb.addRow({
    code: 'Σ C10–C33', label: 'Sum of the 24 published divisions (formula)', branch: '',
    impExt23: withRes(sumF('D'), s23.impExt), expExt23: withRes(sumF('E'), s23.expExt),
    bal23: { formula: `E${sumRow}-D${sumRow}`, result: Math.round((s23.expExt - s23.impExt) * 10) / 10 },
    impInt23: withRes(sumF('G'), s23.impInt), expInt23: withRes(sumF('H'), s23.expInt),
    impExt24: withRes(sumF('I'), s24.impExt), expExt24: withRes(sumF('J'), s24.expExt),
    bal24: { formula: `J${sumRow}-I${sumRow}`, result: Math.round((s24.expExt - s24.impExt) * 10) / 10 },
    impInt24: withRes(sumF('L'), s24.impInt), expInt24: withRes(sumF('M'), s24.expInt),
    note: 'Aggregation-gap check: compare with the aggregate row above. Recalculates if any division flow is edited.',
  }).font = { italic: true, size: 10 };
  styleHeaderRow(tb, NAVY);
  wrapAll(tb);
  for (let r = 2; r <= sumRow; r++) for (let c = 4; c <= 13; c++) tb.getCell(r, c).numFmt = '#,##0.0';

  /* ---------- 15 · FIGARO partners ---------- */
  const fp = wb.addWorksheet('FIGARO partners', { properties: { tabColor: { argb: TEAL } } });
  fp.columns = [
    { header: 'Flow', key: 'flow', width: 20 },
    { header: 'Industry', key: 'industry', width: 12 },
    { header: 'Industry label', key: 'label', width: 42 },
    { header: 'Total €bn', key: 'totalBn', width: 11 },
    { header: 'Intra-EU €bn', key: 'intraBn', width: 11 },
    { header: 'Extra-EU €bn', key: 'extraBn', width: 11 },
    { header: 'Partner', key: 'partner', width: 26 },
    { header: 'Partner €bn', key: 'valueBn', width: 11 },
    { header: '% of extra-EU flow', key: 'pct', width: 13 },
  ];
  const industryLabel = (code) => {
    if (code === 'C') return 'Section C — total manufacturing';
    const grouped = td.IO_GROUP_LABELS[code];
    if (grouped) return grouped;
    const norm = code.replace('C10-12', 'C10-C12').replace('C13-15', 'C13-C15').replace('C31_32', 'C31_C32');
    if (td.IO_GROUP_LABELS[norm]) return td.IO_GROUP_LABELS[norm];
    return td.DIVISION_TRADE.find((d) => d.code === code)?.label ?? code;
  };
  [
    ['Import origins', td.FIGARO_IMPORT_ORIGINS, td.EUROSTAT_FIGARO_IMPORTS],
    ['Export destinations', td.FIGARO_EXPORT_DESTINATIONS, td.EUROSTAT_FIGARO_EXPORTS],
  ].forEach(([flow, rows]) => {
    rows.forEach((ind) => {
      ind.partners.forEach((p, i) => {
        fp.addRow({
          flow, industry: ind.industry, label: industryLabel(ind.industry),
          ...(i === 0 ? { totalBn: ind.totalBn, intraBn: ind.intraBn, extraBn: ind.extraBn } : {}),
          partner: `${p.name} (${p.code})`, valueBn: p.valueBn, pct: p.pctOfExtra,
        });
      });
    });
  });
  styleHeaderRow(fp, TEAL);
  wrapAll(fp);

  /* ---------- 16 · Foreign value added (published) ---------- */
  const fv = wb.addWorksheet('Foreign value added', { properties: { tabColor: { argb: TEAL } } });
  fv.columns = [
    { header: 'Industry', key: 'industry', width: 12 },
    { header: 'Industry label', key: 'label', width: 42 },
    { header: 'Gross extra-EU exports €bn', key: 'grossExportsBn', width: 14 },
    { header: 'Foreign value added €bn', key: 'fvaBn', width: 13 },
    { header: 'FVA % of exports', key: 'fvaPct', width: 11 },
    { header: 'Origin of the foreign value', key: 'origin', width: 28 },
    { header: 'Origin €bn', key: 'valueBn', width: 11 },
    { header: 'Origin % of exports', key: 'pct', width: 12 },
  ];
  td.FIGARO_FVA.forEach((f) => {
    if (f.origins.length === 0) {
      fv.addRow({ industry: f.industry, label: industryLabel(f.industry), grossExportsBn: f.grossExportsBn, fvaBn: f.fvaBn, fvaPct: f.fvaPct });
      return;
    }
    f.origins.forEach((o, i) => {
      fv.addRow({
        industry: f.industry, label: industryLabel(f.industry),
        ...(i === 0 ? { grossExportsBn: f.grossExportsBn, fvaBn: f.fvaBn, fvaPct: f.fvaPct } : {}),
        origin: `${o.name} (${o.code})`, valueBn: o.valueBn, pct: o.pctOfExports,
      });
    });
  });
  styleHeaderRow(fv, TEAL);
  wrapAll(fv);

  /* ---------- 17 · Imported inputs (published use-table mixes) ---------- */
  const ii = wb.addWorksheet('Imported inputs', { properties: { tabColor: { argb: VIOLET } } });
  ii.columns = [
    { header: 'Industry', key: 'industry', width: 12 },
    { header: 'Industry label', key: 'label', width: 42 },
    { header: 'Intermediate inputs €bn', key: 'totalBn', width: 13 },
    { header: 'Imported inputs €bn', key: 'importedBn', width: 12 },
    { header: 'Imported share %', key: 'share', width: 11 },
    { header: 'Top imported product (CPA)', key: 'product', width: 14 },
    { header: 'Product name', key: 'productName', width: 55 },
    { header: 'Product €bn', key: 'valueBn', width: 11 },
    { header: '% of imported inputs', key: 'pct', width: 13 },
  ];
  ii.addRow({
    industry: 'C', label: 'Section C — total manufacturing',
    totalBn: td.INPUT_MIX_TOTAL_C.totalBn, importedBn: td.INPUT_MIX_TOTAL_C.importedBn, share: td.INPUT_MIX_TOTAL_C.importedShare,
    productName: `Source: ${cite(td.EUROSTAT_USE_TABLE)} — EU-27 use table at basic prices, 2023.`,
  }).font = { bold: true, size: 10 };
  td.INDUSTRY_INPUT_MIX.forEach((m) => {
    m.topImported.forEach((p, i) => {
      ii.addRow({
        industry: m.industry, label: industryLabel(m.industry),
        ...(i === 0 ? { totalBn: m.intermediateInputsBn, importedBn: m.importedInputsBn, share: m.importedShare } : {}),
        product: p.product, productName: p.name, valueBn: p.valueBn, pct: p.pctOfImportedInputs,
      });
    });
  });
  styleHeaderRow(ii, VIOLET);
  wrapAll(ii);

  /* ---------- 18 · Critical materials ---------- */
  const cm = wb.addWorksheet('Critical materials', { properties: { tabColor: { argb: RED } } });
  cm.columns = [
    { header: 'Material', key: 'material', width: 30 },
    { header: 'CRMA status', key: 'strategic', width: 16 },
    { header: 'EU import reliance %', key: 'ir', width: 13 },
    { header: 'Top supplier', key: 'topSupplier', width: 22 },
    { header: 'Supplier share of EU supply %', key: 'share', width: 15 },
    { header: 'Used in', key: 'usedIn', width: 52 },
    { header: 'Note', key: 'note', width: 65 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  td.CRITICAL_MATERIALS.forEach((m) => {
    cm.addRow({
      material: m.material,
      strategic: m.strategic ? 'Strategic (Annex I)' : 'Critical (Annex II)',
      ir: m.euImportReliance ?? 'n/a',
      topSupplier: m.topSupplier,
      share: m.supplierShare ?? 'n/a',
      usedIn: m.usedIn, note: m.note, source: cite(m.src),
    });
    addSrc(m.src, `Critical material: ${m.material}`);
  });
  styleHeaderRow(cm, RED);
  wrapAll(cm);

  /* ---------- 19 · Product dependencies ---------- */
  const pd = wb.addWorksheet('Product dependencies', { properties: { tabColor: { argb: RED } } });
  pd.columns = [
    { header: 'Product', key: 'product', width: 40 },
    { header: 'Category', key: 'category', width: 26 },
    { header: 'NACE division(s)', key: 'naceDivision', width: 15 },
    { header: 'EU import reliance %', key: 'ir', width: 13 },
    { header: 'Largest supplier', key: 'topSupplier', width: 20 },
    { header: 'Supplier share %', key: 'share', width: 12 },
    { header: 'Share basis', key: 'shareBasis', width: 34 },
    { header: 'Note', key: 'note', width: 80 },
    { header: 'Source', key: 'source', width: 50 },
  ];
  td.PRODUCT_DEPENDENCIES.forEach((p) => {
    pd.addRow({
      product: p.product, category: p.category, naceDivision: p.naceDivision,
      ir: p.euImportReliance ?? 'n/a', topSupplier: p.topSupplier, share: p.supplierShare ?? 'n/a',
      shareBasis: p.shareBasis, note: p.note, source: cite(p.src),
    });
    addSrc(p.src, `Product dependency: ${p.product}`);
  });
  styleHeaderRow(pd, RED);
  wrapAll(pd);

  /* ---------- 20 · Strategic dependencies ---------- */
  const sd = wb.addWorksheet('Strategic dependencies', { properties: { tabColor: { argb: NAVY } } });
  sd.columns = [
    { header: 'Product family', key: 'family', width: 36 },
    { header: 'NACE division(s)', key: 'naceDivision', width: 14 },
    { header: 'Ecosystem', key: 'ecosystem', width: 28 },
    { header: 'EU import reliance %', key: 'ir', width: 13 },
    { header: 'Top supplier', key: 'topSupplier', width: 20 },
    { header: 'Supplier share %', key: 'share', width: 11 },
    { header: 'Vulnerability', key: 'vulnerability', width: 90 },
    { header: 'Source', key: 'source', width: 50 },
  ];
  td.STRATEGIC_DEPENDENCIES.forEach((d) => {
    sd.addRow({
      family: d.family, naceDivision: d.naceDivision, ecosystem: d.ecosystem,
      ir: d.euImportReliance ?? 'n/a', topSupplier: d.topSupplier, share: d.supplierShare ?? 'n/a',
      vulnerability: d.vulnerability, source: cite(d.src),
    });
    addSrc(d.src, `Strategic dependency: ${d.family}`);
  });
  styleHeaderRow(sd, NAVY);
  wrapAll(sd);

  /* ---------- 21 · Energy dependency ---------- */
  const en = wb.addWorksheet('Energy dependency', { properties: { tabColor: { argb: ORANGE } } });
  en.columns = [
    { header: 'Item', key: 'item', width: 42 },
    { header: 'NACE relevance', key: 'naceRelevance', width: 26 },
    { header: 'Import dependency %', key: 'pct', width: 13 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Note', key: 'note', width: 85 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  td.ENERGY_FEEDSTOCK_DEPENDENCY.forEach((e) => {
    en.addRow({ item: e.item, naceRelevance: e.naceRelevance, pct: e.dependencyPct ?? 'n/a', year: e.year, note: e.note, source: cite(e.src) });
    addSrc(e.src, `Energy dependency: ${e.item}`);
  });
  en.addRow({});
  Object.entries(td.ENERGY_IMPORT_DEPENDENCY).forEach(([siec, row]) => {
    Object.entries(row.byYear).forEach(([yr, v]) => {
      en.addRow({ item: `${row.label} (${siec})`, naceRelevance: 'Full nrg_ind_id series', pct: v, year: yr, note: 'Live Eurostat series behind the headline rows above.', source: cite(td.EUROSTAT_ENERGY_DEP) });
    });
  });
  styleHeaderRow(en, ORANGE);
  wrapAll(en);

  /* ---------- 22 · Risk map (materials + mappable products) ---------- */
  const rh = wb.addWorksheet('Risk map', { properties: { tabColor: { argb: RED } } });
  rh.columns = [
    { header: 'Kind', key: 'kind', width: 14 },
    { header: 'Dependency', key: 'label', width: 36 },
    { header: 'NACE division(s)', key: 'naceDivision', width: 15 },
    { header: 'Import reliance %', key: 'ir', width: 12 },
    { header: 'Supplier concentration %', key: 'conc', width: 14 },
    { header: 'Dominant supplier', key: 'supplier', width: 24 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  td.RISK_HOTSPOTS.forEach((h) => {
    rh.addRow({
      kind: 'Raw material', label: h.label, naceDivision: h.naceDivision,
      ir: Math.round(h.importReliance * 100), conc: Math.round(h.supplierConcentration * 100),
      supplier: h.supplier, source: cite(h.src),
    });
    addSrc(h.src, `Risk hotspot: ${h.label}`);
  });
  td.productMapPoints().forEach((h) => {
    rh.addRow({
      kind: 'Product', label: h.label, naceDivision: h.naceDivision,
      ir: Math.round(h.importReliance * 100), conc: Math.round(h.supplierConcentration * 100),
      supplier: h.supplier, source: cite(h.src),
    });
  });
  rh.addRow({});
  rh.addRow({
    kind: 'HOW TO READ',
    label: 'Two 0–100 axes: import reliance × single-largest-supplier share. The top-right corner is where one foreign supplier can choke an EU value chain. EC criticality-methodology figures, "as reported by <source>" — not customs arithmetic (Methodology §10).',
  });
  styleHeaderRow(rh, RED);
  wrapAll(rh);

  /* ---------- 23 · Critical inputs ---------- */
  const ci = wb.addWorksheet('Critical inputs', { properties: { tabColor: { argb: VIOLET } } });
  ci.columns = [
    { header: 'Division', key: 'code', width: 9 },
    { header: 'Label', key: 'label', width: 34 },
    { header: 'Critical imported input', key: 'name', width: 44 },
    { header: 'Suppliers (as reported)', key: 'suppliers', width: 85 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  td.SECTOR_IO_INPUTS.forEach((s) =>
    s.inputs.forEach((inp, i) => {
      ci.addRow({
        ...(i === 0 ? { code: s.code, label: s.label } : { code: s.code }),
        name: inp.name, suppliers: inp.suppliers, source: cite(inp.src),
      });
      addSrc(inp.src, `Critical input: ${s.code} ${inp.name}`);
    }),
  );
  styleHeaderRow(ci, VIOLET);
  wrapAll(ci);

  /* ---------- 2 (deferred) · Dashboard ---------- */
  buildDashboard();

  function buildDashboard() {
    dash.columns = [{ width: 46 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 16 }, { width: 60 }];
    dash.getCell('A1').value = 'Dashboard — every figure below is an Excel formula over the data sheets and recalculates when they are edited';
    dash.getCell('A1').font = { bold: true, size: 13, color: { argb: TEAL } };
    dash.mergeCells('A1:F1');
    let r = 3;
    const section = (t) => {
      dash.getCell(`A${r}`).value = t;
      dash.getCell(`A${r}`).font = { bold: true, size: 11, color: { argb: NAVY } };
      r += 1;
    };
    const kpi = (labelTxt, formula, result, note, numFmt = '#,##0.0') => {
      dash.getCell(`A${r}`).value = labelTxt;
      const c = dash.getCell(`B${r}`);
      c.value = { formula, result };
      c.numFmt = numFmt;
      c.font = { bold: true, size: 11 };
      dash.getCell(`F${r}`).value = note;
      dash.getCell(`F${r}`).font = { size: 9, color: { argb: GREY } };
      dash.getCell(`F${r}`).alignment = { wrapText: true };
      r += 1;
    };

    section(`Headline — Section C manufacturing, reference year ${YEAR} (Trade backbone, published IO layers, model)`);
    const b = (col) => `INDEX('Trade backbone'!${col}:${col},MATCH("C",'Trade backbone'!A:A,0))`;
    kpi('Extra-EU exports € bn (aggregate row)', b('E'), c23.expExt, 'ext_tec01 Section C aggregate; enterprise attribution.');
    kpi('Extra-EU imports € bn (aggregate row)', b('D'), c23.impExt, 'Includes trade not allocable to a division.');
    kpi('Extra-EU trade balance € bn', `${b('E')}-${b('D')}`, Math.round((c23.expExt - c23.impExt) * 10) / 10, 'A large surplus that masks acute input dependencies.');
    const fvaC = td.FIGARO_FVA.find((f) => f.industry === 'C');
    kpi('Foreign value added in exports % (published)', `INDEX('Foreign value added'!E:E,MATCH("C",'Foreign value added'!A:A,0))`, fvaC?.fvaPct ?? null, 'FIGARO naio_10_fgfoee, EU-27 as one economy.', '0.0');
    kpi('Imported share of intermediate inputs % (use table)', `INDEX('Imported inputs'!E:E,MATCH("C",'Imported inputs'!A:A,0))`, td.INPUT_MIX_TOTAL_C.importedShare, 'EU-27 use table at basic prices.', '0.0');
    const cFlag = `('Multipliers'!$C$${MU0}:$C$${MU0 + N - 1}="C")`;
    const cExp = `'Multipliers'!$H$${MU0}:$H$${MU0 + N - 1}`;
    const wImp = inds.reduce((s, c2, j) => (c2[0] === 'C' ? s + importContent[j] * exportsTotal[j] : s), 0);
    const wExp = inds.reduce((s, c2, j) => (c2[0] === 'C' ? s + exportsTotal[j] : s), 0);
    kpi('Model: import content of manufacturing exports % (export-weighted)',
      `SUMPRODUCT(${cFlag}*'Multipliers'!$E$${MU0}:$E$${MU0 + N - 1},${cExp})/SUMPRODUCT(${cFlag}*1,${cExp})`,
      (100 * wImp) / wExp,
      'This workbook\'s own Leontief derivation (Multipliers sheet), weighted by extra-EU exports across the C industries.', '0.0');
    kpi('Model health: worst accounting-identity error (pp)',
      `MAX(ABS('Multipliers'!G${MU0}:G${MU0 + N - 1}))`, 100 * identityErr,
      'Import content + VA content − 100, worst industry. Near zero when the model is consistent; grows if an edit breaks the balance. Array-entered (Ctrl+Shift+Enter) in older Excel.', '0.0000');
    r += 1;

    section('Curated dependency registers — counts (COUNTIF over the register sheets)');
    const nMat = td.CRITICAL_MATERIALS.length;
    const nProd = td.PRODUCT_DEPENDENCIES.length;
    const nStrat = td.STRATEGIC_DEPENDENCIES.length;
    kpi('Critical raw materials tracked', `COUNTA('Critical materials'!A2:A${1 + nMat})`, nMat, 'CRMA Annex I/II designations with EC/JRC reliance figures.', '0');
    kpi('— of which Strategic (CRMA Annex I)', `COUNTIF('Critical materials'!B2:B${1 + nMat},"Strategic*")`, td.CRITICAL_MATERIALS.filter((m) => m.strategic).length, '', '0');
    kpi('Manufactured-product dependencies tracked', `COUNTA('Product dependencies'!A2:A${1 + nProd})`, nProd, 'The "not just raw materials" register.', '0');
    kpi('Strategic product families (SWD(2021) 352)', `COUNTA('Strategic dependencies'!A2:A${1 + nStrat})`, nStrat, '', '0');
    const chinaCount =
      td.CRITICAL_MATERIALS.filter((m) => /china/i.test(m.topSupplier)).length +
      td.PRODUCT_DEPENDENCIES.filter((p) => /china/i.test(p.topSupplier)).length;
    kpi('Dependencies with China as largest supplier (materials + products)',
      `COUNTIF('Critical materials'!D2:D${1 + nMat},"*China*")+COUNTIF('Product dependencies'!E2:E${1 + nProd},"*China*")`,
      chinaCount, 'Largest single supplier, as reported by each source.', '0');
    kpi('Materials with 100 % import reliance',
      `COUNTIF('Critical materials'!C2:C${1 + nMat},100)`,
      td.CRITICAL_MATERIALS.filter((m) => m.euImportReliance === 100).length, '', '0');
    kpi('Overall EU energy import dependency %', `'Energy dependency'!C2`,
      td.ENERGY_FEEDSTOCK_DEPENDENCY[0].dependencyPct, 'Live nrg_ind_id headline row.', '0.0');
    r += 1;

    section('Dependencies by supplier country (COUNTIF across the three curated registers)');
    dash.getRow(r).values = ['Supplier (as recorded)', 'Materials', 'Products', 'Strategic families', 'Total', ''];
    dash.getRow(r).font = { bold: true, size: 9 };
    r += 1;
    const suppliers = [...new Set([
      ...td.CRITICAL_MATERIALS.map((m) => m.topSupplier),
      ...td.PRODUCT_DEPENDENCIES.map((p) => p.topSupplier),
      ...td.STRATEGIC_DEPENDENCIES.map((d) => d.topSupplier),
    ])].sort();
    suppliers.forEach((s) => {
      const cnt = (arr, key) => arr.filter((e) => e[key] === s).length;
      const m = cnt(td.CRITICAL_MATERIALS, 'topSupplier');
      const p = cnt(td.PRODUCT_DEPENDENCIES, 'topSupplier');
      const st = cnt(td.STRATEGIC_DEPENDENCIES, 'topSupplier');
      const esc = s.replace(/"/g, '""');
      dash.getRow(r).values = [
        s,
        { formula: `COUNTIF('Critical materials'!D2:D${1 + nMat},"${esc}")`, result: m },
        { formula: `COUNTIF('Product dependencies'!E2:E${1 + nProd},"${esc}")`, result: p },
        { formula: `COUNTIF('Strategic dependencies'!E2:E${1 + nStrat},"${esc}")`, result: st },
        { formula: `SUM(B${r}:D${r})`, result: m + p + st },
        '',
      ];
      r += 1;
    });
    r += 1;

    section('By NACE division — balance, input mix, dependency count (INDEX/MATCH + COUNTIF)');
    dash.getRow(r).values = ['Division', `Extra-EU balance ${YEAR} €bn`, 'Imported-input share %', 'Curated dependency mentions', '', 'Label / note'];
    dash.getRow(r).font = { bold: true, size: 9 };
    r += 1;
    td.DIVISION_TRADE.forEach((d) => {
      const useCode = td.useTableIndustryFor(d.code);
      const f23 = d.flows['2023'];
      const mix = td.INDUSTRY_INPUT_MIX.find((m2) => m2.industry === useCode);
      const depCount =
        td.CRITICAL_MATERIALS.filter((m2) => new RegExp(`\\b${d.code}\\b`).test(m2.usedIn)).length +
        td.PRODUCT_DEPENDENCIES.filter((p2) => new RegExp(`\\b${d.code}\\b`).test(p2.naceDivision)).length +
        td.STRATEGIC_DEPENDENCIES.filter((s2) => new RegExp(`\\b${d.code}\\b`).test(s2.naceDivision)).length +
        (td.SECTOR_IO_INPUTS.find((s2) => s2.code === d.code)?.inputs.length ?? 0);
      dash.getRow(r).values = [
        d.code,
        { formula: `INDEX('Trade backbone'!F:F,MATCH("${d.code}",'Trade backbone'!A:A,0))`, result: Math.round((f23.expExt - f23.impExt) * 10) / 10 },
        { formula: `INDEX('Imported inputs'!E:E,MATCH("${useCode}",'Imported inputs'!A:A,0))`, result: mix?.importedShare ?? null },
        {
          formula:
            `COUNTIF('Critical materials'!F2:F${1 + nMat},"*${d.code}*")` +
            `+COUNTIF('Product dependencies'!C2:C${1 + nProd},"*${d.code}*")` +
            `+COUNTIF('Strategic dependencies'!B2:B${1 + nStrat},"*${d.code}*")` +
            `+COUNTIF('Critical inputs'!A:A,"${d.code}")`,
          result: depCount,
        },
        '',
        d.label + (td.isGroupedInIO(d.code) ? ` — input mix is the ${useCode} group figure` : ''),
      ];
      dash.getCell(`B${r}`).numFmt = '#,##0.0';
      dash.getCell(`C${r}`).numFmt = '0.0';
      r += 1;
    });
    r += 1;

    section('Model top 10 — import content of final demand % (LARGE + INDEX/MATCH over the Multipliers sheet)');
    const muE = `'Multipliers'!$E$${MU0}:$E$${MU0 + N - 1}`;
    const muB = `'Multipliers'!$B$${MU0}:$B$${MU0 + N - 1}`;
    const rankedImp = inds
      .map((code, j) => ({ code, name: label(code), v: 100 * importContent[j] }))
      .sort((a2, b2) => b2.v - a2.v);
    for (let k = 1; k <= 10; k++) {
      dash.getRow(r).values = [
        { formula: `INDEX(${muB},MATCH(LARGE(${muE},${k}),${muE},0))`, result: rankedImp[k - 1].name },
        { formula: `LARGE(${muE},${k})`, result: rankedImp[k - 1].v },
      ];
      dash.getCell(`B${r}`).numFmt = '0.0';
      r += 1;
    }
    r += 1;
    section('Model top 10 — output multipliers (total output per € of final demand)');
    const muD = `'Multipliers'!$D$${MU0}:$D$${MU0 + N - 1}`;
    const rankedMult = inds
      .map((code, j) => ({ name: label(code), v: outputMult[j] }))
      .sort((a2, b2) => b2.v - a2.v);
    for (let k = 1; k <= 10; k++) {
      dash.getRow(r).values = [
        { formula: `INDEX(${muB},MATCH(LARGE(${muD},${k}),${muD},0))`, result: rankedMult[k - 1].name },
        { formula: `LARGE(${muD},${k})`, result: rankedMult[k - 1].v },
      ];
      dash.getCell(`B${r}`).numFmt = '0.000';
      r += 1;
    }
    wrapAll(dash, 2);
  }

  /* ---------- 24 · Sources ---------- */
  const srcWs = wb.addWorksheet('Sources', { properties: { tabColor: { argb: VIOLET } } });
  srcWs.columns = [
    { header: 'Organisation', key: 'org', width: 40 },
    { header: 'Title', key: 'title', width: 75 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Used for', key: 'usedFor', width: 70 },
    { header: 'URL', key: 'url', width: 80 },
  ];
  [...sources.values()]
    .sort((a, b2) => a.src.org.localeCompare(b2.src.org) || a.src.title.localeCompare(b2.src.title))
    .forEach(({ src: s, usedFor }) => {
      const uses = [...usedFor];
      const row = srcWs.addRow({
        org: s.org, title: s.title, year: s.year ?? '',
        usedFor: uses.slice(0, 6).join(' · ') + (uses.length > 6 ? ` · +${uses.length - 6} more` : ''),
        url: '',
      });
      linkCell(row.getCell(5), s.url);
    });
  styleHeaderRow(srcWs, VIOLET);
  wrapAll(srcWs);

  /* ---------- 25 · Change log ---------- */
  const cl = wb.addWorksheet('Change log', { properties: { tabColor: { argb: GREY } } });
  cl.columns = [
    { header: 'Date', key: 'date', width: 12 },
    { header: 'Sheet', key: 'sheet', width: 22 },
    { header: 'Cell / row', key: 'cell', width: 14 },
    { header: 'Field', key: 'field', width: 26 },
    { header: 'Old value', key: 'old', width: 20 },
    { header: 'New value', key: 'new', width: 20 },
    { header: 'Reason', key: 'reason', width: 60 },
    { header: 'Source for the new value (URL)', key: 'src', width: 60 },
    { header: 'Who', key: 'who', width: 16 },
  ];
  cl.addRow({
    date: today, sheet: '(all)', cell: '—', field: '—', old: '—', new: '—',
    reason: 'Workbook generated from the repository data (IO-model masterfile v1). Record every subsequent manual edit here — one row per change — so edits can be carried back to the repository as tracked corrections.',
    src: 'scripts/build-trade-flows-io-model-workbook.mjs', who: 'build script',
  });
  styleHeaderRow(cl, GREY);
  wrapAll(cl);

  await wb.xlsx.writeFile(OUT_PATH);
  const sheetCount = wb.worksheets.length;
  console.log(`Wrote ${OUT_PATH}`);
  console.log(`  ${sheetCount} sheets; ${sources.size} deduplicated sources; ${N} industries; year ${YEAR}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
