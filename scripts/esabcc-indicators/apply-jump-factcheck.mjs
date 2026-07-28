/**
 * Apply the boundary-jump fact-check to BOTH places a value lives.
 * ---------------------------------------------------------------------------
 * The indicator series exists twice: in `src/data/esabcc-indicators.ts` (what
 * the Indicator Check module renders and what the background workbooks are
 * built from) and in `pw_indicator_points` (what the Project Workspace plots).
 * Correcting one and not the other is how the two drifted apart in the first
 * place, so this script does both from one input and refuses to do half.
 *
 * Input: corrections.json — the applied subset of the multi-agent fact-check.
 *
 *   {
 *     "generatedAt": "...",
 *     "points":  [ {id, code, year, from, to, classification, reason} ],
 *     "deletes": [ {id, code, year, reason} ],
 *     "fields":  [ {id, code, field, from, to, reason} ]
 *   }
 *
 * Every edit is anchored INSIDE its own indicator's block and matched on the
 * exact year AND the exact current value. An anchored replace that matched the
 * first similar-looking line in the file once landed a target value on the
 * wrong indicator, so a mismatch here is a hard error rather than a skip: if
 * the file does not look the way the fact-check saw it, nothing is written.
 *
 * Usage:
 *   node scripts/esabcc-indicators/apply-jump-factcheck.mjs corrections.json
 *   node scripts/esabcc-indicators/apply-jump-factcheck.mjs corrections.json --dry
 */

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..', '..');
const TS_FILE = join(ROOT, 'src', 'data', 'esabcc-indicators.ts');
const OUT_SQL = join(ROOT, 'supabase', 'migrations', '081_indicator_jump_factcheck.sql');

const inPath = resolve(process.argv[2] ?? 'corrections.json');
const dry = process.argv.includes('--dry');
const corr = JSON.parse(await readFile(inPath, 'utf8'));
const points = corr.points ?? [];
const deletes = corr.deletes ?? [];
const fields = corr.fields ?? [];

let src = await readFile(TS_FILE, 'utf8');

/** Locate one indicator's block so an edit cannot escape into its neighbour. */
function blockRange(id) {
  const start = src.indexOf(`\n  {\n    id: '${id}',`);
  if (start < 0) throw new Error(`indicator not found: ${id}`);
  const next = src.indexOf('\n  {\n    id: ', start + 10);
  return [start, next < 0 ? src.length : next];
}

function num(v) {
  // match how the file writes numbers: 3118.0 stays 3118.0, 40.01 stays 40.01
  return String(v);
}

const applied = [];
const failures = [];

for (const p of points) {
  try {
    const [a, b] = blockRange(p.id);
    const block = src.slice(a, b);
    // year + value must BOTH match, so a stale corrections file cannot silently
    // overwrite a number someone else already changed.
    const re = new RegExp(
      `\\{ year: ${p.year}, value: ${String(p.from).replace('.', '\\.')}(0*)?(, afterReport: true)? \\}`);
    const m = re.exec(block);
    if (!m) {
      failures.push(`${p.code} ${p.year}: expected value ${p.from} not found in block`);
      continue;
    }
    const after = m[2] ?? '';
    const next = `{ year: ${p.year}, value: ${num(p.to)}${after} }`;
    src = src.slice(0, a) + block.replace(m[0], next) + src.slice(b);
    applied.push({ ...p, kind: 'point' });
  } catch (e) {
    failures.push(`${p.code} ${p.year}: ${e.message}`);
  }
}

for (const d of deletes) {
  try {
    const [a, b] = blockRange(d.id);
    const block = src.slice(a, b);
    const re = new RegExp(
      `, \\{ year: ${d.year}, value: -?[\\d.]+(, afterReport: true)? \\}`);
    const m = re.exec(block);
    if (!m) { failures.push(`${d.code} ${d.year}: point to delete not found`); continue; }
    src = src.slice(0, a) + block.replace(m[0], '') + src.slice(b);
    applied.push({ ...d, kind: 'delete' });
  } catch (e) {
    failures.push(`${d.code} ${d.year}: ${e.message}`);
  }
}

for (const f of fields) {
  try {
    const [a, b] = blockRange(f.id);
    const block = src.slice(a, b);
    const re = new RegExp(`\\n    ${f.field}: '([^']*)'`);
    const m = re.exec(block);
    if (!m) { failures.push(`${f.code}: field ${f.field} not found`); continue; }
    if (f.from != null && m[1] !== f.from) {
      failures.push(`${f.code}.${f.field}: expected "${f.from}", found "${m[1]}"`);
      continue;
    }
    const esc = String(f.to).replace(/'/g, "\\'");
    src = src.slice(0, a) + block.replace(m[0], `\n    ${f.field}: '${esc}'`) + src.slice(b);
    applied.push({ ...f, kind: 'field' });
  } catch (e) {
    failures.push(`${f.code}: ${e.message}`);
  }
}

if (failures.length) {
  console.error('REFUSING TO WRITE — the data file does not match what the fact-check saw:');
  for (const f of failures) console.error('  ! ' + f);
  process.exit(1);
}

// ── the Project Workspace half ───────────────────────────────────────────────
const byClass = {};
for (const p of points) (byClass[p.classification] ??= []).push(p);

const stamp = new Date().toISOString().slice(0, 10);
const wrap = (text, indent = '--     ') =>
  text.replace(/\s+/g, ' ').replace(/(.{1,72})(\s|$)/g, (_, s) => indent + s.trim() + '\n').trimEnd();

const sql = [
  '-- ─────────────────────────────────────────────────────────────────────────────',
  '-- Boundary-jump fact-check: put the Project Workspace on the same basis as',
  '-- the report-era values it is plotted against.',
  '--',
  '-- The series carry a per-indicator break where the post-report points were',
  '-- appended: 27 of 147 post-report steps moved more than 3x the series own',
  '-- historical year-on-year movement. A multi-agent re-derivation against the',
  '-- primary publishers separated the jumps that are real from the ones that are',
  '-- an artefact of appending a value computed a different way.',
  '--',
  '-- Only the artefacts are corrected here. Real movements are left alone --',
  '-- a genuine 2023 collapse in fossil generation is a finding, not a defect.',
  '--',
  ...Object.entries(byClass).flatMap(([k, ps]) => [
    `--   ${k}: ${ps.length} point${ps.length === 1 ? '' : 's'} -- ` +
      [...new Set(ps.map(p => p.code))].join(', '),
  ]),
  '--',
  ...(deletes.length ? [
    '-- Removed (no published figure on the report basis for that year):',
    ...deletes.map(d => `--   ${d.code} ${d.year} -- ${d.reason}`),
    '--',
  ] : []),
  `-- Full findings: docs-internal/indicator-boundary-jump-factcheck-${stamp}.md`,
  '-- Generated by scripts/esabcc-indicators/apply-jump-factcheck.mjs.',
  '-- Idempotent: explicit target values via ON CONFLICT DO UPDATE.',
  '-- ─────────────────────────────────────────────────────────────────────────────',
  '',
];

if (points.length) {
  sql.push(
    'insert into public.pw_indicator_points (indicator_id, year, value)',
    'values',
    points.map(p => `  ('${p.id}', ${p.year}, ${num(p.to)})`).join(',\n'),
    'on conflict (indicator_id, year) do update set value = excluded.value;',
    '');
}
for (const d of deletes) {
  sql.push(
    'delete from public.pw_indicator_points',
    `where indicator_id = '${d.id}' and year = ${d.year};`,
    '');
}
for (const f of fields.filter(f => ['source', 'sourceUrl', 'unit', 'name'].includes(f.field))) {
  const col = { sourceUrl: 'source_url', targetValue: 'target_value' }[f.field] ?? f.field;
  sql.push(
    'update public.pw_indicators',
    `set ${col} = '${String(f.to).replace(/'/g, "''")}'`,
    `where id = '${f.id}';`,
    '');
}

if (dry) {
  console.log('— dry run, nothing written —');
} else {
  await writeFile(TS_FILE, src);
  await writeFile(OUT_SQL, sql.join('\n'));
}

console.log(`${applied.filter(a => a.kind === 'point').length} values corrected, ` +
            `${applied.filter(a => a.kind === 'delete').length} removed, ` +
            `${applied.filter(a => a.kind === 'field').length} fields updated`);
for (const a of applied) {
  console.log(`  ${String(a.code).padEnd(26)} ${a.kind === 'field' ? a.field : a.year}  ` +
              (a.kind === 'point' ? `${a.from} -> ${a.to}  [${a.classification}]` :
               a.kind === 'delete' ? 'removed' : `${a.from} -> ${a.to}`));
}
if (!dry) console.log(`\n${TS_FILE}\n${OUT_SQL}`);
