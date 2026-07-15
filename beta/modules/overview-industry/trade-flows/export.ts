'use client';
/**
 * Excel handover workbook for the Trade Flows sub-module.
 * -------------------------------------------------------
 * Everything the input–output map shows, in one self-contained .xlsx a
 * colleague can work from without the site: the Eurostat trade backbone for
 * all 24 Section C divisions (2023 + 2024), the FIGARO import origins /
 * export destinations / foreign value added, the imported-input mix from the
 * EU-27 use table, the curated critical-materials, strategic-dependency and
 * energy-dependency layers, the risk-hotspot matrix, the named critical
 * inputs per division, and every source with a clickable URL.
 *
 * Sheets:
 *    1. "Read me"               — purpose, three-layer architecture, caveats.
 *    2. "Headline facts"        — summary strip + Section C totals & the
 *                                 aggregation-gap note.
 *    3. "Trade backbone"        — ext_tec01 flows per division, 2023 + 2024.
 *    4. "FIGARO partners"       — import origins & export destinations by
 *                                 counterpart country (2023).
 *    5. "Foreign value added"   — FVA in extra-EU exports by origin (2023).
 *    6. "Imported inputs"       — use-table imported-intermediate-input mix.
 *    7. "Critical materials"    — CRMA critical/strategic raw-materials layer.
 *    8. "Strategic dependencies"— SWD(2021) 352 product-family layer.
 *    9. "Energy dependency"     — live nrg_ind_id rows + Russia-share row.
 *   10. "Risk hotspots"         — import reliance × supplier concentration.
 *   11. "Critical inputs"       — named imported inputs per division.
 *   12. "Sources"               — every source deduplicated, clickable URL.
 *
 * Uses ExcelJS (existing project dep), same pattern as the Downstream
 * sub-module handover export (../downstream/export.ts).
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import {
  DIVISION_TRADE,
  SECTION_C_TEC,
  SECTION_C_DIVISION_SUM,
  TEC_YEARS,
  REFERENCE_YEAR,
  HEADLINE_FACTS,
  CRITICAL_MATERIALS,
  STRATEGIC_DEPENDENCIES,
  ENERGY_FEEDSTOCK_DEPENDENCY,
  RISK_HOTSPOTS,
  SECTOR_IO_INPUTS,
  IO_GROUP_LABELS,
  IO_GROUP_SKEW_NOTES,
  INPUT_MIX_TOTAL_C,
  EUROSTAT_TEC,
  EUROSTAT_USE_TABLE,
  EUROSTAT_FIGARO_IMPORTS,
  EUROSTAT_FIGARO_EXPORTS,
  EUROSTAT_FIGARO_FVA,
  EUROSTAT_ENERGY_DEP,
  CRMA_SOURCE,
  SWD_2021_352,
  type Source,
  type TecFlows,
} from './trade-data';
import {
  FIGARO_IMPORT_ORIGINS,
  FIGARO_EXPORT_DESTINATIONS,
  FIGARO_FVA,
  INDUSTRY_INPUT_MIX,
} from './eurostat-io.generated';

const NAVY = 'FF004B7F';
const TEAL = 'FF007B6C';
const ORANGE = 'FFFF9933';
const VIOLET = 'FF6667AB';
const GREY = 'FF54728C';
const RED = 'FFB83230';

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

function linkCell(cell: ExcelJS.Cell, url: string) {
  cell.value = { text: url, hyperlink: url };
  cell.font = { color: { argb: 'FF0065A4' }, underline: true, size: 10 };
}

/** Inline citation text for a source ("org — title (year)"). URLs live in Sources. */
const cite = (s?: Source): string => (s ? `${s.org} — ${s.title}${s.year ? ` (${s.year})` : ''}` : '');

/** Human label for a FIGARO / use-table industry code. */
function industryLabel(code: string): string {
  if (code === 'C') return 'Section C — total manufacturing';
  const grouped = IO_GROUP_LABELS[code];
  if (grouped) return grouped;
  const norm = code.replace('C10-12', 'C10-C12').replace('C13-15', 'C13-C15').replace('C31_32', 'C31_C32');
  if (IO_GROUP_LABELS[norm]) return IO_GROUP_LABELS[norm];
  return DIVISION_TRADE.find((d) => d.code === code)?.label ?? code;
}

const bal = (f: TecFlows) => Math.round((f.expExt - f.impExt) * 10) / 10;

export async function exportTradeFlowsWorkbook(): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESABCC MethodHub — Overview Industry / Trade Flows';
  wb.created = new Date();
  const today = new Date().toISOString().slice(0, 10);

  /* Source collector for the dedicated Sources sheet (dedup by URL). */
  const sources = new Map<string, { src: Source; usedFor: Set<string> }>();
  const addSrc = (src: Source | undefined, usedFor: string) => {
    if (!src?.url) return;
    const entry = sources.get(src.url) ?? { src, usedFor: new Set<string>() };
    entry.usedFor.add(usedFor);
    sources.set(src.url, entry);
  };
  addSrc(EUROSTAT_TEC, 'Trade backbone (ext_tec01, 2023+2024)');
  addSrc(EUROSTAT_USE_TABLE, 'Imported-input mix (use table, 2023)');
  addSrc(EUROSTAT_FIGARO_IMPORTS, 'FIGARO import origins (2023)');
  addSrc(EUROSTAT_FIGARO_EXPORTS, 'FIGARO export destinations (2023)');
  addSrc(EUROSTAT_FIGARO_FVA, 'FIGARO foreign value added (2023)');
  addSrc(EUROSTAT_ENERGY_DEP, 'Energy import dependency (nrg_ind_id)');
  addSrc(CRMA_SOURCE, 'Critical Raw Materials Act framing');
  addSrc(SWD_2021_352, 'Strategic-dependency review');

  /* ── 1 · Read me ──────────────────────────────────────────────────── */
  const rm = wb.addWorksheet('Read me', { properties: { tabColor: { argb: NAVY } } });
  rm.columns = [{ width: 30 }, { width: 112 }];
  const rmRows: [string, string][] = [
    ['Workbook', 'Trade flows — the input–output map of EU-27 manufacturing (handover copy)'],
    ['Compiled', today],
    ['Purpose', 'Handover pack: EU-27 manufacturing trade across all 24 NACE Rev. 2 Section C divisions — where EU manufacturing sells, what it must import and from where, and where imports are both large and concentrated in a single supplier (the carbon-leakage / CBAM / CRMA front line). Built so a colleague can work from the file without the MethodHub.'],
    ['Layer 1 — trade backbone', `Eurostat ext_tec01, EU-27, 2023 + 2024 (€ bn): extra-/intra-EU imports and exports by the NACE activity of the trading ENTERPRISE. Statistical, covers all 24 divisions. Reference year for the cross-layer views: ${REFERENCE_YEAR}.`],
    ['Layer 2 — input–output layer', 'EU-27 use table at basic prices (naio_10_cp1610): each industry\'s intermediate inputs by product, split domestic vs imported. FIGARO application datasets (naio_10_fgti / naio_10_fgte / naio_10_fgfoee): import origins, export destinations and foreign value added by counterpart country, 2023, EU-27 treated as one economy. PRODUCT-based.'],
    ['Layer 3 — dependency layer', 'Curated, "as reported by <source>": critical-raw-materials shares (EC/JRC, CRMA), strategic-dependency reviews (SWD(2021) 352) and named per-sector inputs. NOT derivable from official statistics at this granularity; every figure carries its source.'],
    ['Enterprise vs product', '"Imports of division X" is not one number: the backbone books trade to the enterprise\'s NACE code, the IO layer follows the product. C19 is the worked example — refiners import crude (enterprise view), but crude is a MINING product, so the IO view shows it as an imported input INTO refining. The two layers deliberately differ.'],
    ['Aggregation gap', `The official Section C aggregate row of ext_tec01 does NOT equal the sum of the 24 published divisions (2023 extra-EU imports: €${SECTION_C_TEC['2023'].impExt} bn aggregate vs €${SECTION_C_DIVISION_SUM['2023'].impExt} bn summed) — the aggregate additionally covers trade that cannot be allocated to a division (enterprise-register gaps, confidentiality). Both are in the Headline facts sheet.`],
    ['Grouped IO industries', 'FIGARO and the use table publish some divisions only as groups: C10–C12 (food, beverages & tobacco), C13–C15 (textiles, apparel & leather), C31–C32 (furniture & other manufacturing). Known skews inside the groups: ' + Object.entries(IO_GROUP_SKEW_NOTES).map(([c, n]) => `${c}: ${n}`).join(' | ')],
    ['Risk figures', 'Import-reliance and supplier-concentration figures follow the EC criticality methodology (IR = (imports − exports) / (domestic production + imports − exports); supplier share = EC/JRC "share of EU supply"), not customs arithmetic — read each as "as reported by <source>".'],
    ['Full FIGARO table', 'The full FIGARO inter-country input–output table (naio_10_fcp_ii4, ~11 M cells, 2022–2023) lives on the MethodHub at /beta/overview-industry/trade-flows/figaro (table viewer + analysis dashboard + CSV/JSON export). It is too large for this workbook and is deliberately not embedded.'],
    ['Reproducible', 'node scripts/fetch-trade-flows-io-data.mjs regenerates every statistical number from the public Eurostat API; node scripts/fetch-figaro-io-dataset.mjs re-imports the full FIGARO table.'],
    ['Live module', '/beta/overview-industry/trade-flows on the MethodHub (this workbook is generated from the same data files: trade-data.ts + eurostat-io.generated.ts).'],
  ];
  rmRows.forEach(([k, v]) => {
    const row = rm.addRow([k, v]);
    row.getCell(1).font = { bold: true, size: 10, color: { argb: GREY } };
    row.getCell(1).alignment = { vertical: 'top', wrapText: true };
    row.getCell(2).alignment = { vertical: 'top', wrapText: true };
  });
  rm.spliceRows(1, 0, []);
  const title = rm.getCell('A1');
  title.value = 'Trade flows — EU-27 manufacturing input–output map · handover workbook';
  title.font = { bold: true, size: 14, color: { argb: NAVY } };
  rm.mergeCells('A1:B1');

  /* ── 2 · Headline facts ───────────────────────────────────────────── */
  const hf = wb.addWorksheet('Headline facts', { properties: { tabColor: { argb: TEAL } } });
  hf.columns = [
    { header: 'Item', key: 'label', width: 42 },
    { header: 'Value', key: 'value', width: 20 },
    { header: 'Detail', key: 'detail', width: 105 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  HEADLINE_FACTS.forEach((f) => {
    hf.addRow({ label: f.label, value: f.value, detail: f.detail, source: cite(f.src) });
    addSrc(f.src, `Headline fact: ${f.label}`);
  });
  TEC_YEARS.forEach((y) => {
    const agg = SECTION_C_TEC[y];
    const sum = SECTION_C_DIVISION_SUM[y];
    hf.addRow({
      label: `Section C aggregate row (ext_tec01), ${y}`,
      value: `€${bal(agg)} bn extra-EU balance`,
      detail: `Extra-EU imports €${agg.impExt} bn · extra-EU exports €${agg.expExt} bn · intra-EU imports €${agg.impInt} bn · intra-EU exports €${agg.expInt} bn.`,
      source: cite(EUROSTAT_TEC),
    });
    hf.addRow({
      label: `Sum of the 24 published divisions, ${y}`,
      value: `€${bal(sum)} bn extra-EU balance`,
      detail: `Extra-EU imports €${sum.impExt} bn · extra-EU exports €${sum.expExt} bn · intra-EU imports €${sum.impInt} bn · intra-EU exports €${sum.expInt} bn. Differs from the aggregate row — see the aggregation-gap note in the Read me.`,
      source: cite(EUROSTAT_TEC),
    });
  });
  styleHeaderRow(hf, TEAL);
  wrapAll(hf);

  /* ── 3 · Trade backbone ───────────────────────────────────────────── */
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
  DIVISION_TRADE.forEach((d) => {
    const f23 = d.flows['2023'];
    const f24 = d.flows['2024'];
    tb.addRow({
      code: d.code,
      label: d.label,
      branch: d.branch,
      impExt23: f23.impExt, expExt23: f23.expExt, bal23: bal(f23), impInt23: f23.impInt, expInt23: f23.expInt,
      impExt24: f24.impExt, expExt24: f24.expExt, bal24: bal(f24), impInt24: f24.impInt, expInt24: f24.expInt,
      note: d.note,
    });
  });
  const aggRow = tb.addRow({
    code: 'C',
    label: 'Section C aggregate row (incl. non-allocable trade)',
    branch: '',
    impExt23: SECTION_C_TEC['2023'].impExt, expExt23: SECTION_C_TEC['2023'].expExt, bal23: bal(SECTION_C_TEC['2023']),
    impInt23: SECTION_C_TEC['2023'].impInt, expInt23: SECTION_C_TEC['2023'].expInt,
    impExt24: SECTION_C_TEC['2024'].impExt, expExt24: SECTION_C_TEC['2024'].expExt, bal24: bal(SECTION_C_TEC['2024']),
    impInt24: SECTION_C_TEC['2024'].impInt, expInt24: SECTION_C_TEC['2024'].expInt,
    note: `Source: ${cite(EUROSTAT_TEC)} — enterprise-based attribution; € bn current prices.`,
  });
  aggRow.font = { bold: true, size: 10 };
  styleHeaderRow(tb, NAVY);
  wrapAll(tb);

  /* ── 4 · FIGARO partners ──────────────────────────────────────────── */
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
  ([
    ['Import origins', FIGARO_IMPORT_ORIGINS, EUROSTAT_FIGARO_IMPORTS],
    ['Export destinations', FIGARO_EXPORT_DESTINATIONS, EUROSTAT_FIGARO_EXPORTS],
  ] as const).forEach(([flow, rows, dataset]) => {
    rows.forEach((ind) => {
      ind.partners.forEach((p, i) => {
        fp.addRow({
          flow,
          industry: ind.industry,
          label: industryLabel(ind.industry),
          ...(i === 0 ? { totalBn: ind.totalBn, intraBn: ind.intraBn, extraBn: ind.extraBn } : {}),
          partner: `${p.name} (${p.code})`,
          valueBn: p.valueBn,
          pct: p.pctOfExtra,
        });
      });
    });
    addSrc(dataset, `FIGARO ${flow.toLowerCase()} (2023)`);
  });
  styleHeaderRow(fp, TEAL);
  wrapAll(fp);

  /* ── 5 · Foreign value added ──────────────────────────────────────── */
  const fv = wb.addWorksheet('Foreign value added', { properties: { tabColor: { argb: ORANGE } } });
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
  FIGARO_FVA.forEach((f) => {
    if (f.origins.length === 0) {
      fv.addRow({
        industry: f.industry, label: industryLabel(f.industry),
        grossExportsBn: f.grossExportsBn, fvaBn: f.fvaBn, fvaPct: f.fvaPct,
      });
      return;
    }
    f.origins.forEach((o, i) => {
      fv.addRow({
        industry: f.industry,
        label: industryLabel(f.industry),
        ...(i === 0 ? { grossExportsBn: f.grossExportsBn, fvaBn: f.fvaBn, fvaPct: f.fvaPct } : {}),
        origin: `${o.name} (${o.code})`,
        valueBn: o.valueBn,
        pct: o.pctOfExports,
      });
    });
  });
  styleHeaderRow(fv, ORANGE);
  wrapAll(fv);

  /* ── 6 · Imported inputs ──────────────────────────────────────────── */
  const im = wb.addWorksheet('Imported inputs', { properties: { tabColor: { argb: VIOLET } } });
  im.columns = [
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
  im.addRow({
    industry: 'C',
    label: 'Section C — total manufacturing',
    totalBn: INPUT_MIX_TOTAL_C.totalBn,
    importedBn: INPUT_MIX_TOTAL_C.importedBn,
    share: INPUT_MIX_TOTAL_C.importedShare,
    productName: `Source: ${cite(EUROSTAT_USE_TABLE)} — EU-27 use table at basic prices, 2023.`,
  }).font = { bold: true, size: 10 };
  INDUSTRY_INPUT_MIX.forEach((m) => {
    m.topImported.forEach((p, i) => {
      im.addRow({
        industry: m.industry,
        label: industryLabel(m.industry),
        ...(i === 0
          ? { totalBn: m.intermediateInputsBn, importedBn: m.importedInputsBn, share: m.importedShare }
          : {}),
        product: p.product,
        productName: p.name,
        valueBn: p.valueBn,
        pct: p.pctOfImportedInputs,
      });
    });
  });
  styleHeaderRow(im, VIOLET);
  wrapAll(im);

  /* ── 7 · Critical materials ───────────────────────────────────────── */
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
  CRITICAL_MATERIALS.forEach((m) => {
    cm.addRow({
      material: m.material,
      strategic: m.strategic ? 'Strategic (Annex I)' : 'Critical (Annex II)',
      ir: m.euImportReliance ?? 'n/a',
      topSupplier: m.topSupplier,
      share: m.supplierShare ?? 'n/a',
      usedIn: m.usedIn,
      note: m.note,
      source: cite(m.src),
    });
    addSrc(m.src, `Critical material: ${m.material}`);
  });
  styleHeaderRow(cm, RED);
  wrapAll(cm);

  /* ── 8 · Strategic dependencies ───────────────────────────────────── */
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
  STRATEGIC_DEPENDENCIES.forEach((d) => {
    sd.addRow({
      family: d.family,
      naceDivision: d.naceDivision,
      ecosystem: d.ecosystem,
      ir: d.euImportReliance ?? 'n/a',
      topSupplier: d.topSupplier,
      share: d.supplierShare ?? 'n/a',
      vulnerability: d.vulnerability,
      source: cite(d.src),
    });
    addSrc(d.src, `Strategic dependency: ${d.family}`);
  });
  styleHeaderRow(sd, NAVY);
  wrapAll(sd);

  /* ── 9 · Energy dependency ────────────────────────────────────────── */
  const en = wb.addWorksheet('Energy dependency', { properties: { tabColor: { argb: ORANGE } } });
  en.columns = [
    { header: 'Item', key: 'item', width: 42 },
    { header: 'NACE relevance', key: 'naceRelevance', width: 26 },
    { header: 'Import dependency %', key: 'pct', width: 13 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Note', key: 'note', width: 85 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  ENERGY_FEEDSTOCK_DEPENDENCY.forEach((e) => {
    en.addRow({
      item: e.item,
      naceRelevance: e.naceRelevance,
      pct: e.dependencyPct ?? 'n/a',
      year: e.year,
      note: e.note,
      source: cite(e.src),
    });
    addSrc(e.src, `Energy dependency: ${e.item}`);
  });
  styleHeaderRow(en, ORANGE);
  wrapAll(en);

  /* ── 10 · Risk hotspots ───────────────────────────────────────────── */
  const rh = wb.addWorksheet('Risk hotspots', { properties: { tabColor: { argb: RED } } });
  rh.columns = [
    { header: 'Hotspot', key: 'label', width: 36 },
    { header: 'NACE division(s)', key: 'naceDivision', width: 15 },
    { header: 'Import reliance %', key: 'ir', width: 12 },
    { header: 'Supplier concentration %', key: 'conc', width: 14 },
    { header: 'Dominant supplier', key: 'supplier', width: 24 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  RISK_HOTSPOTS.forEach((h) => {
    rh.addRow({
      label: h.label,
      naceDivision: h.naceDivision,
      ir: Math.round(h.importReliance * 100),
      conc: Math.round(h.supplierConcentration * 100),
      supplier: h.supplier,
      source: cite(h.src),
    });
    addSrc(h.src, `Risk hotspot: ${h.label}`);
  });
  rh.addRow({});
  rh.addRow({
    label: 'HOW TO READ',
    supplier:
      'Two 0–100 axes: import reliance × single-largest-supplier share. The top-right corner (high on both) is where one foreign supplier can choke an EU value chain. EC criticality-methodology figures, "as reported by <source>" — not customs arithmetic.',
  });
  styleHeaderRow(rh, RED);
  wrapAll(rh);

  /* ── 11 · Critical inputs ─────────────────────────────────────────── */
  const ci = wb.addWorksheet('Critical inputs', { properties: { tabColor: { argb: VIOLET } } });
  ci.columns = [
    { header: 'Division', key: 'code', width: 9 },
    { header: 'Label', key: 'label', width: 34 },
    { header: 'Critical imported input', key: 'name', width: 44 },
    { header: 'Suppliers (as reported)', key: 'suppliers', width: 85 },
    { header: 'Source', key: 'source', width: 55 },
  ];
  SECTOR_IO_INPUTS.forEach((s) =>
    s.inputs.forEach((inp, i) => {
      ci.addRow({
        ...(i === 0 ? { code: s.code, label: s.label } : { code: s.code }),
        name: inp.name,
        suppliers: inp.suppliers,
        source: cite(inp.src),
      });
      addSrc(inp.src, `Critical input: ${s.code} ${inp.name}`);
    }),
  );
  styleHeaderRow(ci, VIOLET);
  wrapAll(ci);

  /* ── 12 · Sources ─────────────────────────────────────────────────── */
  const src = wb.addWorksheet('Sources', { properties: { tabColor: { argb: VIOLET } } });
  src.columns = [
    { header: 'Organisation', key: 'org', width: 40 },
    { header: 'Title', key: 'title', width: 75 },
    { header: 'Year', key: 'year', width: 8 },
    { header: 'Used for', key: 'usedFor', width: 70 },
    { header: 'URL', key: 'url', width: 80 },
  ];
  [...sources.values()]
    .sort((a, b) => a.src.org.localeCompare(b.src.org) || a.src.title.localeCompare(b.src.title))
    .forEach(({ src: s, usedFor }) => {
      const uses = [...usedFor];
      const row = src.addRow({
        org: s.org,
        title: s.title,
        year: s.year ?? '',
        usedFor: uses.slice(0, 6).join(' · ') + (uses.length > 6 ? ` · +${uses.length - 6} more` : ''),
        url: '',
      });
      linkCell(row.getCell(5), s.url);
    });
  styleHeaderRow(src, VIOLET);
  wrapAll(src);

  const buf = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buf], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    `trade-flows-io-handover-${today}.xlsx`,
  );
}
