'use client';
/**
 * Excel handover workbook for the Downstream sub-module.
 * ------------------------------------------------------
 * Built for handover (parental-leave cover): everything the module shows,
 * in one self-contained .xlsx a colleague can work from without the site.
 *
 * Sheets:
 *   1. "Read me"             — purpose, scope, method, what to watch, provenance.
 *   2. "Criteria notes"      — one row per lead-market policy × the five Better
 *                              Regulation criteria (a factual note each; no
 *                              rating scale).
 *   3. "Data"                — the key data points behind each policy.
 *   4. "Sources"             — every source with clickable URL.
 *   5. "Downstream standards"— the definitions / labels / product-standards layer.
 *
 * Uses ExcelJS (existing project dep), same pattern as the Funding Sources
 * module export.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  DOWNSTREAM_META,
  BR_CRITERIA,
  BR_CRITERIA_META,
  LEAD_MARKET_POLICIES,
  POLICY_CATEGORY_META,
  POLICY_STATUS_META,
  DOWNSTREAM_STANDARDS,
  STANDARD_TYPE_META,
  WATCH_TIMELINE,
} from '@/data/downstream-lead-markets';

const NAVY = 'FF004B7F';
const TEAL = 'FF007B6C';
const ORANGE = 'FFFF9933';
const VIOLET = 'FF6667AB';
const GREY = 'FF54728C';

function styleHeaderRow(ws: ExcelJS.Worksheet, argb: string) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10 };
  header.alignment = { vertical: 'middle', wrapText: true };
  header.height = 30;
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb } };
  });
  ws.views = [{ state: 'frozen', ySplit: 1 }];
}

function wrapAll(ws: ExcelJS.Worksheet, fromRow = 2) {
  ws.eachRow((row, n) => {
    if (n < fromRow) return;
    row.alignment = { vertical: 'top', wrapText: true };
  });
}

export async function exportDownstreamWorkbook(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESABCC MethodHub — Overview Industry / Downstream';
  wb.created = new Date();

  /* ── 1 · Read me ──────────────────────────────────────────────────── */
  const rm = wb.addWorksheet('Read me', { properties: { tabColor: { argb: NAVY } } });
  rm.columns = [{ width: 28 }, { width: 110 }];
  const rmRows: [string, string][] = [
    ['Workbook', 'Downstream — lead-market policies review & downstream standards (handover copy)'],
    ['Status date', `${DOWNSTREAM_META.asOf} (compiled ${DOWNSTREAM_META.compiled})`],
    ['Purpose', 'Handover pack: a review of the EU demand-side ("lead market") instruments for low-carbon industrial products, documented along the five Better Regulation evaluation criteria, plus the downstream standards they depend on. Built so the cover during parental leave can pick up the file without the MethodHub.'],
    ['Scope', DOWNSTREAM_META.scope],
    ['Method', DOWNSTREAM_META.frameworkNote],
    ['Framework reference', DOWNSTREAM_META.frameworkUrl],
    ['How to read the notes', 'The five criteria are used as a reading grid only — each policy carries a factual note per criterion, with the data points and sources behind it. No rating scale (no strong/moderate/weak) is applied.'],
    ['Sheet guide', 'Criteria notes = one row per policy, five criteria with a factual note each, plus handover notes. Data = the data points cited in the notes. Sources = all links. Downstream standards = the definitions/label/product-standard layer (the part that usually bites last but binds first).'],
    ['Live module', '/beta/overview-industry/downstream on the MethodHub (this workbook is generated from the same data file: src/data/downstream-lead-markets.ts).'],
    ['Provenance / caveat', 'AI-compiled working notes (web-verified July 2026), pending verification by the industry lead. Largely ex-ante. Not a Board position.'],
    ['', ''],
    ['WHAT TO WATCH', 'Timeline of the decisions that will change the facts in this workbook:'],
    ...WATCH_TIMELINE.map((w): [string, string] => {
      const p = LEAD_MARKET_POLICIES.find((x) => x.id === w.policyId);
      return [w.when, `${w.what}${p ? `  [${p.shortName}]` : ''}`];
    }),
  ];
  rmRows.forEach(([k, v]) => {
    const row = rm.addRow([k, v]);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: GREY } };
    row.getCell(2).alignment = { vertical: 'top', wrapText: true };
    row.getCell(1).alignment = { vertical: 'top', wrapText: true };
  });
  rm.spliceRows(1, 0, []);
  const title = rm.getCell('A1');
  title.value = 'Downstream — lead markets & downstream standards · handover workbook';
  title.font = { bold: true, size: 14, color: { argb: NAVY } };
  rm.mergeCells('A1:B1');

  /* ── 2 · Criteria notes ───────────────────────────────────────────── */
  const as = wb.addWorksheet('Criteria notes', { properties: { tabColor: { argb: TEAL } } });
  const critCols = BR_CRITERIA.map((c) => ({
    header: `${BR_CRITERIA_META[c].label} — note`,
    key: `${c}Note`,
    width: 55,
  }));
  as.columns = [
    { header: 'Policy', key: 'name', width: 42 },
    { header: 'Instrument family', key: 'category', width: 18 },
    { header: 'Status', key: 'status', width: 22 },
    { header: 'Legal reference', key: 'reference', width: 34 },
    { header: 'Sectors', key: 'sectors', width: 30 },
    { header: 'Lead-market mechanism', key: 'mechanism', width: 55 },
    ...critCols,
    { header: 'Handover notes — what to do / watch', key: 'notes', width: 60 },
  ];
  LEAD_MARKET_POLICIES.forEach((p) => {
    const row: Record<string, string> = {
      name: p.name,
      category: POLICY_CATEGORY_META[p.category].label,
      status: `${POLICY_STATUS_META[p.status].label} — ${p.statusDetail}`,
      reference: p.reference,
      sectors: p.sectors,
      mechanism: p.leadMarketMechanism,
      notes: p.handoverNotes,
    };
    BR_CRITERIA.forEach((c) => {
      row[`${c}Note`] = p.assessment[c].rationale;
    });
    as.addRow(row);
  });
  styleHeaderRow(as, TEAL);
  wrapAll(as);

  /* ── 3 · Data ─────────────────────────────────────────────────────── */
  const dt = wb.addWorksheet('Data', { properties: { tabColor: { argb: ORANGE } } });
  dt.columns = [
    { header: 'Policy', key: 'policy', width: 36 },
    { header: 'Data point', key: 'label', width: 36 },
    { header: 'Value', key: 'value', width: 70 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  LEAD_MARKET_POLICIES.forEach((p) =>
    p.keyData.forEach((d) =>
      dt.addRow({ policy: p.shortName, label: d.label, value: d.value, source: d.source }),
    ),
  );
  styleHeaderRow(dt, ORANGE);
  wrapAll(dt);

  /* ── 4 · Sources ──────────────────────────────────────────────────── */
  const src = wb.addWorksheet('Sources', { properties: { tabColor: { argb: VIOLET } } });
  src.columns = [
    { header: 'Item', key: 'item', width: 36 },
    { header: 'Source', key: 'label', width: 60 },
    { header: 'URL', key: 'url', width: 90 },
  ];
  LEAD_MARKET_POLICIES.forEach((p) =>
    p.sources.forEach((s) => {
      const row = src.addRow({ item: p.shortName, label: s.label, url: s.url });
      row.getCell(3).value = { text: s.url, hyperlink: s.url };
      row.getCell(3).font = { color: { argb: 'FF0065A4' }, underline: true, size: 10 };
    }),
  );
  DOWNSTREAM_STANDARDS.forEach((st) =>
    st.sources.forEach((s) => {
      const row = src.addRow({ item: `[standard] ${st.name}`, label: s.label, url: s.url });
      row.getCell(3).value = { text: s.url, hyperlink: s.url };
      row.getCell(3).font = { color: { argb: 'FF0065A4' }, underline: true, size: 10 };
    }),
  );
  styleHeaderRow(src, VIOLET);
  wrapAll(src);

  /* ── 5 · Downstream standards ─────────────────────────────────────── */
  const ds = wb.addWorksheet('Downstream standards', {
    properties: { tabColor: { argb: NAVY } },
  });
  ds.columns = [
    { header: 'Standard / instrument', key: 'name', width: 46 },
    { header: 'Type', key: 'type', width: 24 },
    { header: 'Status', key: 'status', width: 36 },
    { header: 'What it is', key: 'description', width: 70 },
    { header: 'Why it matters for lead markets', key: 'why', width: 70 },
    { header: 'Watch points', key: 'watch', width: 70 },
  ];
  DOWNSTREAM_STANDARDS.forEach((st) =>
    ds.addRow({
      name: st.name,
      type: STANDARD_TYPE_META[st.type].label,
      status: st.status,
      description: st.description,
      why: st.whyItMatters,
      watch: st.watchPoints,
    }),
  );
  styleHeaderRow(ds, NAVY);
  wrapAll(ds);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `downstream-lead-markets-handover-${DOWNSTREAM_META.compiled}.xlsx`,
  );
}
