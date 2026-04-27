'use client';
/**
 * Excel export for the Funding Sources module.
 * ---------------------------------------------
 * Two sheets:
 *   - "Projects" — one row per project with all upstream fields.
 *   - "Summary"  — totals + breakdown by lead DG, ready to paste into a
 *     DG RTD briefing.
 *
 * Uses ExcelJS (already a project dep) so styling / column widths / number
 * formats survive the round-trip.
 */
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export interface FundingProjectRow {
  id: string;
  source: string;
  acronym: string;
  title: string;
  programme: string;
  pillar?: string;
  cluster?: string;
  topic?: string;
  coordinator: string;
  country: string;
  consortiumCountries: string[];
  startDate: string;
  endDate: string;
  ecContribution: number;
  totalCost: number;
  status: string;
  keywords: string[];
  callDg: string;
}

const ESABCC_NAVY = 'FF003399';
const ESABCC_TEAL = 'FF007B6C';

export async function exportFundingToExcel(
  projects: FundingProjectRow[],
  meta: { snapshotDate: string; filterSummary: string },
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESABCC MethodHub — Funding Sources';
  wb.created = new Date();

  // ── Projects sheet ────────────────────────────────────────────────────
  const ws = wb.addWorksheet('Projects', { properties: { tabColor: { argb: ESABCC_NAVY } } });
  ws.columns = [
    { header: 'Acronym',           key: 'acronym',     width: 16 },
    { header: 'Title',             key: 'title',       width: 60 },
    { header: 'Project ID',        key: 'id',          width: 14 },
    { header: 'Programme',         key: 'programme',   width: 22 },
    { header: 'Pillar',            key: 'pillar',      width: 24 },
    { header: 'Cluster',           key: 'cluster',     width: 38 },
    { header: 'Topic',             key: 'topic',       width: 32 },
    { header: 'Lead DG',           key: 'callDg',      width: 10 },
    { header: 'Coordinator',       key: 'coordinator', width: 36 },
    { header: 'Country',           key: 'country',     width: 8  },
    { header: 'Consortium',        key: 'consortium',  width: 30 },
    { header: 'Start',             key: 'startDate',   width: 12 },
    { header: 'End',               key: 'endDate',     width: 12 },
    { header: 'EC contribution €', key: 'ec',          width: 18 },
    { header: 'Total cost €',      key: 'tot',         width: 18 },
    { header: 'Status',            key: 'status',      width: 10 },
    { header: 'Keywords',          key: 'keywords',    width: 36 },
    { header: 'Source',            key: 'source',      width: 18 },
  ];

  ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ESABCC_NAVY } };
  ws.getRow(1).alignment = { vertical: 'middle' };
  ws.views = [{ state: 'frozen', ySplit: 1 }];

  for (const p of projects) {
    ws.addRow({
      acronym:     p.acronym,
      title:       p.title,
      id:          p.id,
      programme:   p.programme,
      pillar:      p.pillar || '',
      cluster:     p.cluster || '',
      topic:       p.topic || '',
      callDg:      p.callDg,
      coordinator: p.coordinator,
      country:     p.country,
      consortium:  p.consortiumCountries.join(', '),
      startDate:   p.startDate,
      endDate:     p.endDate,
      ec:          p.ecContribution,
      tot:         p.totalCost,
      status:      p.status,
      keywords:    p.keywords.join('; '),
      source:      p.source,
    });
  }

  // Currency format on EC contribution + total cost
  ws.getColumn('ec').numFmt = '#,##0';
  ws.getColumn('tot').numFmt = '#,##0';

  // Auto-filter on the data range
  if (projects.length > 0) {
    ws.autoFilter = {
      from: { row: 1, column: 1 },
      to:   { row: 1, column: ws.columns.length },
    };
  }

  // ── Summary sheet ─────────────────────────────────────────────────────
  const sum = wb.addWorksheet('Summary', { properties: { tabColor: { argb: ESABCC_TEAL } } });
  sum.columns = [
    { header: '', key: 'label', width: 32 },
    { header: '', key: 'value', width: 24 },
  ];
  sum.getCell('A1').value = 'ESABCC — EU funding portfolio export';
  sum.getCell('A1').font = { bold: true, size: 14, color: { argb: ESABCC_NAVY } };
  sum.mergeCells('A1:B1');

  sum.getCell('A3').value = 'Snapshot date';
  sum.getCell('B3').value = meta.snapshotDate;
  sum.getCell('A4').value = 'Filters applied';
  sum.getCell('B4').value = meta.filterSummary || '(none)';
  sum.getCell('A5').value = 'Projects exported';
  sum.getCell('B5').value = projects.length;

  const totalEc  = projects.reduce((s, p) => s + p.ecContribution, 0);
  const totalTot = projects.reduce((s, p) => s + p.totalCost, 0);
  sum.getCell('A6').value = 'Total EC contribution (€)';
  sum.getCell('B6').value = totalEc;
  sum.getCell('B6').numFmt = '#,##0';
  sum.getCell('A7').value = 'Total project cost (€)';
  sum.getCell('B7').value = totalTot;
  sum.getCell('B7').numFmt = '#,##0';

  // Per-DG block
  const byDg = new Map<string, { ec: number; n: number }>();
  for (const p of projects) {
    const cur = byDg.get(p.callDg) || { ec: 0, n: 0 };
    cur.ec += p.ecContribution;
    cur.n += 1;
    byDg.set(p.callDg, cur);
  }
  const dgRows = [...byDg.entries()].sort((a, b) => b[1].ec - a[1].ec);

  let r = 9;
  sum.getCell(`A${r}`).value = 'EC contribution by lead DG';
  sum.getCell(`A${r}`).font = { bold: true };
  r += 1;
  sum.getCell(`A${r}`).value = 'DG';
  sum.getCell(`B${r}`).value = '€';
  sum.getCell(`C${r}`).value = 'Projects';
  sum.getRow(r).font = { bold: true };
  r += 1;
  for (const [dg, v] of dgRows) {
    sum.getCell(`A${r}`).value = `DG ${dg}`;
    sum.getCell(`B${r}`).value = v.ec;
    sum.getCell(`B${r}`).numFmt = '#,##0';
    sum.getCell(`C${r}`).value = v.n;
    r += 1;
  }

  // ── Save ──────────────────────────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const stamp = new Date().toISOString().slice(0, 10);
  saveAs(blob, `esabcc-funding-sources-${stamp}.xlsx`);
}
