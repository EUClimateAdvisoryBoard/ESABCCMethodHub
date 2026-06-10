// ---------------------------------------------------------------------------
// Export the master tag taxonomy to an Excel workbook for team review.
//
//   npx tsx scripts/export-tag-workbook.ts [output.xlsx]
//
// One row per master code (the pool the overall-tag picker draws from), in
// hierarchical order, with usage counts from the seeded policy baseline and
// blank "Decision / New name / Notes" columns for the team to fill in. The
// filled-in workbook is the input for a follow-up taxonomy update.
//
// Not included: analyst-coined custom tags and manually-applied overall tags
// — those live in the shared Supabase table, not in the repo.
// ---------------------------------------------------------------------------

import ExcelJS from 'exceljs';
import { buildSeedSnapshot } from '../src/lib/content-analysis/seed';
import type { CodeNode } from '../src/lib/content-analysis/types';

const OUT = process.argv[2] ?? 'project-documents/tag-taxonomy-review.xlsx';

const snap = buildSeedSnapshot();
const codes = snap.codes.filter(c => c.scope === 'master');
const byId = new Map(codes.map(c => [c.id, c]));

// How many policy documents carry each code in their seeded AI baseline.
const usage = new Map<string, number>();
for (const doc of snap.documents) {
  for (const id of doc.aiCodeIds ?? []) {
    usage.set(id, (usage.get(id) ?? 0) + 1);
  }
}

// Where each code comes from, so the team knows what a deletion would touch.
function originOf(c: CodeNode): string {
  if (c.id.startsWith('root-')) return 'Root category';
  if (c.id.startsWith('domain-')) return 'Auto from policy domain';
  return 'Curated sub-code';
}

// Depth-first order so children sit under their parents.
const children = new Map<string | null, CodeNode[]>();
for (const c of codes) {
  const list = children.get(c.parentId) ?? [];
  list.push(c);
  children.set(c.parentId, list);
}
const ordered: Array<{ code: CodeNode; depth: number; path: string[] }> = [];
function walk(parentId: string | null, depth: number, path: string[]) {
  for (const c of children.get(parentId) ?? []) {
    ordered.push({ code: c, depth, path });
    walk(c.id, depth + 1, [...path, c.name]);
  }
}
walk(null, 0, []);
// Orphans (parent id not in the master pool) — none expected, but never drop rows.
const placed = new Set(ordered.map(o => o.code.id));
for (const c of codes) {
  if (!placed.has(c.id)) ordered.push({ code: c, depth: 0, path: ['(unparented)'] });
}

// Duplicate display names (e.g. root "Finance" vs domain-derived "Finance").
const idsByName = new Map<string, string[]>();
for (const c of codes) {
  const key = c.name.trim().toLowerCase();
  idsByName.set(key, [...(idsByName.get(key) ?? []), c.id]);
}

const wb = new ExcelJS.Workbook();
wb.creator = 'ESABCC MethodHub';
wb.created = new Date();

// ── Sheet 1: the full taxonomy ─────────────────────────────────────────────
const ws = wb.addWorksheet('Tags', { views: [{ state: 'frozen', ySplit: 1 }] });
ws.columns = [
  { header: 'Level', key: 'level', width: 6 },
  { header: 'Tag name', key: 'name', width: 34 },
  { header: 'Parent path', key: 'path', width: 40 },
  { header: 'Tag id', key: 'id', width: 24 },
  { header: 'Origin', key: 'origin', width: 24 },
  { header: 'Description', key: 'desc', width: 58 },
  { header: 'Colour', key: 'color', width: 10 },
  { header: 'Policy docs tagged', key: 'docs', width: 18 },
  { header: 'Duplicate name of', key: 'dup', width: 22 },
  { header: 'Decision', key: 'decision', width: 14 },
  { header: 'New name / merge into', key: 'newname', width: 26 },
  { header: 'Team notes', key: 'notes', width: 40 },
];

for (const { code, depth, path } of ordered) {
  const dupIds = (idsByName.get(code.name.trim().toLowerCase()) ?? []).filter(id => id !== code.id);
  const row = ws.addRow({
    level: depth + 1,
    name: `${'    '.repeat(depth)}${code.name}`,
    path: path.join(' › '),
    id: code.id,
    origin: originOf(code),
    desc: code.description ?? '',
    color: code.color,
    docs: usage.get(code.id) ?? 0,
    dup: dupIds.join(', '),
    decision: '',
    newname: '',
    notes: '',
  });
  // Paint the colour cell with the tag's actual colour.
  const argb = `FF${code.color.replace('#', '').toUpperCase()}`;
  row.getCell('color').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  row.getCell('color').font = { color: { argb }, size: 9 };
  if (dupIds.length > 0) {
    row.getCell('dup').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFE8A3' } };
  }
  if (depth === 0) row.font = { bold: true };
  // Dropdown for the team's verdict.
  row.getCell('decision').dataValidation = {
    type: 'list',
    allowBlank: true,
    formulae: ['"Keep,Rename,Merge,Delete,New parent"'],
  };
}
ws.getRow(1).font = { bold: true };
ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE8EEF4' } };
ws.autoFilter = 'A1:L1';

// ── Sheet 2: duplicate names, spelled out ──────────────────────────────────
const wsDup = wb.addWorksheet('Duplicates');
wsDup.columns = [
  { header: 'Tag name', key: 'name', width: 24 },
  { header: 'Tag ids sharing the name', key: 'ids', width: 44 },
  { header: 'Policy docs tagged (per id)', key: 'docs', width: 28 },
];
for (const [, ids] of idsByName) {
  if (ids.length < 2) continue;
  wsDup.addRow({
    name: byId.get(ids[0])!.name,
    ids: ids.join(', '),
    docs: ids.map(id => `${id}: ${usage.get(id) ?? 0}`).join(', '),
  });
}
wsDup.getRow(1).font = { bold: true };

// ── Sheet 3: how to use ────────────────────────────────────────────────────
const wsHow = wb.addWorksheet('How to use');
wsHow.getColumn(1).width = 110;
const lines = [
  'TAG TAXONOMY REVIEW — how to use this workbook',
  '',
  '1. The "Tags" sheet lists every master tag in hierarchical order (indentation = depth).',
  '2. "Policy docs tagged" counts how many policy documents carry the tag in the seeded baseline —',
  '   a non-zero count means deleting the tag will detach it from those documents.',
  '3. Rows highlighted in the "Duplicate name of" column share their display name with another id;',
  '   the app already collapses these into one entry in the tag picker.',
  '4. Fill in the "Decision" column (Keep / Rename / Merge / Delete / New parent) and, where relevant,',
  '   "New name / merge into" and "Team notes".',
  '5. Hand the filled-in workbook back and the taxonomy will be updated from it.',
  '',
  'Not listed here: custom tags coined by analysts in the picker and manually-applied overall tags —',
  'those live in the shared database, not in the code, and are unaffected by taxonomy edits.',
];
for (const l of lines) wsHow.addRow([l]);
wsHow.getRow(1).font = { bold: true, size: 13 };

async function main() {
  await wb.xlsx.writeFile(OUT);
  console.log(`Wrote ${ordered.length} tags (${[...idsByName.values()].filter(v => v.length > 1).length} duplicate names) to ${OUT}`);
}
void main();
