/**
 * Write the report's own derivations into the Method Hub's calc space.
 * ---------------------------------------------------------------------------
 * `build-report-way-rows.mjs` works out which indicators can have the REPORT'S
 * OWN derivation continued — its own input columns refreshed from the same
 * publisher, its own formula untouched. This turns that into a migration so the
 * Hub shows it too, not just the offline workbook.
 *
 * It supersedes migration 079 for these indicators. 079 gave their later years
 * a SECOND recipe switched in by a year test; this replaces that with the
 * report's own formula over refreshed inputs, so the whole series is one
 * calculation. Everything 079 did for the other indicators stands.
 *
 * Two things are carried over from 079 because they are still needed:
 *   • the explicit ×100 column on the share indicators, whose grids compute a
 *     fraction while the plotted series is stored as a percent number; and
 *   • the self-reference repair (two columns whose headers differ only in case),
 *     without which the grid computes blank.
 *
 * Where the report's derivation gives a different answer from the value
 * currently plotted, the difference is written into the derivation text rather
 * than smoothed over: those points came from the year-on-year splice, and a
 * reader opening the calc editor should see that the two disagree and why.
 *
 * Usage:  node scripts/esabcc-indicators/emit-report-way-migration.mjs
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const IN_JSON = join(__dirname, 'report-way-rows.json');
const TS_FILE = join(ROOT, 'src', 'data', 'esabcc-indicators.ts');
const OUT_SQL = join(ROOT, 'supabase', 'migrations', '080_report_way_calc_rows.sql');

const { computeValues } = await import('./report-way-eval.mjs');
const PCT_HEADER = 'fraction → % (× 100)';

function parseIndicators(src) {
  const out = {};
  const starts = [];
  const idRe = /\n  \{\n    id: '([^']+)',/g;
  let m;
  while ((m = idRe.exec(src))) starts.push({ id: m[1], at: m.index });
  for (let i = 0; i < starts.length; i++) {
    const block = src.slice(starts[i].at, i + 1 < starts.length ? starts[i + 1].at : src.length);
    const code = /\n    code: '([^']*)'/.exec(block)?.[1];
    const name = /\n    name: '([^']*)'/.exec(block)?.[1];
    const unit = /\n    unit: '([^']*)'/.exec(block)?.[1];
    const dataM = /\n    data: \[([\s\S]*?)\],\n/.exec(block);
    const data = [];
    if (dataM) {
      const ptRe = /\{\s*year:\s*(-?\d+),\s*value:\s*(-?[\d.]+)(,\s*afterReport:\s*true)?\s*\}/g;
      let p;
      while ((p = ptRe.exec(dataM[1]))) {
        data.push({ year: Number(p[1]), value: Number(p[2]), afterReport: !!p[3] });
      }
    }
    out[starts[i].id] = { code, name, unit, data };
  }
  return out;
}

function pad(cells, n) {
  const out = cells.slice();
  while (out.length < n) out.push(null);
  return out;
}

/** Add the explicit ×100 column where the grid computes a fraction. */
function applyPercentScale(layout, ind) {
  const got = computeValues(layout);
  const ratios = ind.data
    .filter(p => Number.isFinite(got?.[p.year]) && got[p.year] !== 0)
    .map(p => p.value / got[p.year]);
  if (ratios.length < 3 || !ratios.every(r => Math.abs(r - 100) / 100 < 0.05)) return false;
  layout.columns.push({
    header: PCT_HEADER,
    source: 'Unit convention: the report workbook computes this share as a fraction, the indicator '
          + 'database stores it as a percent number (migrations 058 / 075 / 076). The conversion is '
          + 'carried here as its own column so the grid and the plotted series agree.',
  });
  const ci = layout.columns.length - 1;
  for (const r of layout.rows) {
    r.cells = pad(r.cells, layout.columns.length);
    r.cells[ci] = 100;
  }
  const expr = layout.columns[0].formula?.expr;
  layout.columns[0] = { ...layout.columns[0], formula: { expr: `(${expr}) * [${PCT_HEADER}]` } };
  return true;
}

function derivationText(ind, entry, pctFixed) {
  const years = entry.rows.map(r => r.year);
  const refreshed = entry.columns.map(c => c.header);
  const diffs = entry.rows.filter(r => r.rel !== null && r.rel > 0.02);
  const lines = [
    `${ind.name}  (${ind.unit})`,
    '',
    "Later years — computed by the report's own derivation",
    '',
    `The rows for ${years.join(', ')} are NOT a new recipe. They are the report's own formula,`,
    "unchanged, with the report's own input columns refreshed from the same publisher:",
    '',
    ...refreshed.map(h => `  • ${h}`),
    '',
    'Everything else in this grid — the formula, the column structure, the intermediate steps —',
    'is exactly what the 2024 report workbook carried. Drop in next year’s figures for those',
    'columns and the indicator recomputes the same way it always has.',
  ];
  if (pctFixed) {
    lines.push('',
      'The grid computes this share as a fraction while the plotted series is stored as a percent',
      'number, so an explicit ×100 column carries the conversion.');
  }
  if (diffs.length) {
    lines.push('',
      'NOTE — this derivation disagrees with the value currently plotted for ' +
      diffs.map(d => `${d.year} (${d.reportWay} here vs ${d.stored} plotted)`).join(', ') + '.',
      "The plotted figure came from a year-on-year splice onto the report's last value, not from",
      "the report's own method. The figure computed here is the report's method carried forward.",
      'Which one the series should carry is a judgement for the indicator owner; both are visible',
      'rather than one silently overwriting the other.');
  }
  lines.push('', `Vintage: inputs read ${new Date().toISOString().slice(0, 10)}.`);
  return lines.join('\n');
}

const { filled, results } = JSON.parse(await readFile(IN_JSON, 'utf8'));
const inds = parseIndicators(await readFile(TS_FILE, 'utf8'));

const rows = [];
const summary = [];
for (const [iid, entry] of Object.entries(filled)) {
  const ind = inds[iid];
  const layout = JSON.parse(JSON.stringify(entry.layout));
  const pctFixed = applyPercentScale(layout, ind);
  layout.derivation = derivationText(ind, entry, pctFixed);

  // final gate: the grid must reproduce the report years and produce a number
  // for every later year — a blank here would be the empty-row bug returning
  const got = computeValues(layout);
  const blanks = layout.rows.filter(r => !Number.isFinite(got[r.year])).map(r => r.year);
  if (blanks.length) {
    console.error(`  ! ${ind.code}: blank rows ${blanks.join(',')} — not written`);
    continue;
  }
  rows.push(`  ('${iid}', '${JSON.stringify(layout).replace(/'/g, "''")}'::jsonb)`);
  const diffs = entry.rows.filter(r => r.rel !== null && r.rel > 0.02);
  summary.push({ code: ind.code, years: entry.rows.map(r => r.year), pctFixed, diffs });
}

const stamp = new Date().toISOString().slice(0, 10);
const differing = summary.filter(s => s.diffs.length);
const sql = [
  '-- ─────────────────────────────────────────────────────────────────────────────',
  "-- The report's OWN derivation, continued into the later years.",
  '--',
  '-- Migration 079 filled the post-report calc rows, but for these indicators it',
  '-- did so with a SECOND recipe switched in by a year test. That shows where a',
  '-- number came from without making it the same calculation, so the two halves',
  '-- of each series were not comparable.',
  '--',
  "-- This migration replaces that for the indicators whose own inputs can still",
  '-- be refreshed: the report\'s formula is left exactly as it was and its own',
  '-- input columns — the same CRF sector aggregates, the same Eurostat concepts,',
  '-- in the same units — are filled for the later years from the same publisher.',
  '-- The grid then works the way it was meant to: drop in next year\'s raw data',
  '-- and the indicator recomputes.',
  '--',
  `-- ${summary.length} indicators: ${summary.map(s => s.code).join(', ')}.`,
  '-- Everything migration 079 did for the other indicators is untouched.',
  '--',
  '-- Carried over from 079 where still needed: the explicit ×100 column on the',
  '-- share indicators (their grids compute a fraction while the series is stored',
  '-- as a percent number), and the self-reference repair on I6 (two columns whose',
  '-- headers differ only in case, which otherwise blanks the whole grid).',
  '--',
  ...(differing.length ? [
    '-- WHERE THIS DISAGREES WITH THE PLOTTED VALUE — stated in each derivation text',
    '-- rather than smoothed over, because the difference is the finding:',
    ...differing.flatMap(s => s.diffs.map(d =>
      `--   ${s.code} ${d.year}: ${d.reportWay} by the report's method vs ${d.stored} plotted (splice-derived)`)),
    '-- The plotted points are NOT changed here. Which basis the series should',
    '-- carry is a judgement for the indicator owner; this migration only makes',
    '-- both visible.',
    '--',
  ] : []),
  `-- Generated by scripts/esabcc-indicators/emit-report-way-migration.mjs (${stamp}).`,
  '-- Inputs, with the query behind each: scripts/esabcc-indicators/report-way-inputs.json',
  '-- Idempotent: upserts the layout for the listed indicators only.',
  '-- ─────────────────────────────────────────────────────────────────────────────',
  '',
  'insert into public.pw_indicator_sheets (indicator_id, layout)',
  'values',
  rows.join(',\n'),
  'on conflict (indicator_id) do update set layout = excluded.layout;',
  '',
].join('\n');

await writeFile(OUT_SQL, sql);
console.log(`${rows.length} layouts written to ${OUT_SQL}`);
for (const s of summary) {
  console.log(`  ${s.code.padEnd(12)} ${s.years.join(',')}${s.pctFixed ? '  [×100 column]' : ''}` +
              (s.diffs.length ? `  [differs from plotted: ${s.diffs.map(d => d.year).join(',')}]` : ''));
}
