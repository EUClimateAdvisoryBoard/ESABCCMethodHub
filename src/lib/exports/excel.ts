/**
 * Generic table → Excel (.xlsx) writer.
 * -------------------------------------
 * Turns one or more `{ headers, rows }` tables into a styled ESABCC
 * workbook (one sheet per table) so any module — recommendations,
 * member-state matrix, policy analysis — can offer a real "Download
 * Excel" without hand-rolling ExcelJS each time.
 *
 * The Indicator module keeps its richer server-side workbook export
 * (one tab per indicator, with native charts); this helper covers the
 * simpler "what you see in the table" exports everywhere else.
 */
'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

const COLORS = {
  headerBg: '003399',
  headerText: 'FFFFFF',
  stripe: 'F5F7FA',
  subtitle: '666666',
};

/** A cell that renders as a clickable hyperlink in the workbook. */
export interface LinkCell {
  text: string;
  hyperlink: string;
}

/** A cell with a solid background fill (ARGB/RGB hex, e.g. '004B7F'). */
export interface FillCell {
  text: string;
  fill: string;
  /** Optional font colour (hex); defaults to the normal body text colour. */
  color?: string;
}

export type CellValue = string | number | LinkCell | FillCell | null | undefined;

function isLinkCell(v: CellValue): v is LinkCell {
  return typeof v === 'object' && v != null && 'hyperlink' in v;
}

function isFillCell(v: CellValue): v is FillCell {
  return typeof v === 'object' && v != null && 'fill' in v;
}

export interface SheetSpec {
  /** Worksheet name (sanitised + truncated to 31 chars). */
  name: string;
  /** Optional title row rendered above the table. */
  title?: string;
  /** Optional italic subtitle (unit, provenance, …). */
  subtitle?: string;
  headers: string[];
  rows: CellValue[][];
  /**
   * Optional row above the headers that groups consecutive columns under a
   * merged label, left to right; a group with an empty label is left blank.
   * Spans must not add up to more than `headers.length`.
   */
  headerGroups?: { label: string; span: number }[];
  /** Fixed column widths (characters), overriding the automatic widths. */
  columnWidths?: number[];
  /** Wrap header text (for long headers over narrow columns). */
  wrapHeaders?: boolean;
  /** Freeze the header rows and this many leading columns. */
  freezeColumns?: number;
}

function sanitizeSheetName(name: string, fallback: string): string {
  const cleaned = (name || fallback).replace(/[\\/*?:[\]]/g, ' ').trim();
  return (cleaned || fallback).slice(0, 31);
}

function styleHeaderRow(ws: ExcelJS.Worksheet, rowNum: number) {
  const row = ws.getRow(rowNum);
  row.eachCell(cell => {
    cell.font = { bold: true, size: 10, color: { argb: COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
    cell.alignment = { horizontal: 'left', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: '999999' } } };
  });
  row.height = 22;
}

export async function downloadTableWorkbook(
  filename: string,
  sheets: SheetSpec[],
  meta?: { creator?: string }
): Promise<void> {
  const wb = new ExcelJS.Workbook();
  wb.creator = meta?.creator ?? 'ESABCC MethodHub';
  wb.created = new Date();

  const usedNames = new Set<string>();
  sheets.forEach((spec, si) => {
    let name = sanitizeSheetName(spec.name, `Sheet${si + 1}`);
    let n = 2;
    while (usedNames.has(name.toLowerCase())) {
      name = sanitizeSheetName(`${spec.name} ${n++}`, `Sheet${si + 1}`);
    }
    usedNames.add(name.toLowerCase());

    const ws = wb.addWorksheet(name, {
      properties: { tabColor: { argb: COLORS.headerBg } },
    });

    let cursor = 1;
    const lastCol = Math.max(spec.headers.length, 1);
    if (spec.title) {
      ws.mergeCells(cursor, 1, cursor, lastCol);
      const c = ws.getCell(cursor, 1);
      c.value = spec.title;
      c.font = { bold: true, size: 14, color: { argb: COLORS.headerBg } };
      cursor++;
    }
    if (spec.subtitle) {
      ws.mergeCells(cursor, 1, cursor, lastCol);
      const c = ws.getCell(cursor, 1);
      c.value = spec.subtitle;
      c.font = { italic: true, size: 9, color: { argb: COLORS.subtitle } };
      cursor++;
    }
    if (spec.title || spec.subtitle) cursor++; // blank spacer row

    if (spec.headerGroups?.length) {
      const total = spec.headerGroups.reduce((n, g) => n + g.span, 0);
      if (total > spec.headers.length) {
        throw new Error(`headerGroups span ${total} columns but the sheet has ${spec.headers.length}`);
      }
      let col = 1;
      for (const g of spec.headerGroups) {
        if (g.span > 1) ws.mergeCells(cursor, col, cursor, col + g.span - 1);
        ws.getCell(cursor, col).value = g.label;
        col += g.span;
      }
      // Style every cell in the row (merged and blank ones too) like a header.
      for (let c = 1; c <= lastCol; c++) {
        const cell = ws.getCell(cursor, c);
        cell.font = { bold: true, size: 10, color: { argb: COLORS.headerText } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.headerBg } };
        cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
        cell.border = { left: { style: 'thin', color: { argb: 'FFFFFF' } } };
      }
      ws.getRow(cursor).height = 30;
      cursor++;
    }

    const headerRowNum = cursor;
    const headerRow = ws.getRow(headerRowNum);
    spec.headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
    });
    styleHeaderRow(ws, headerRowNum);
    if (spec.wrapHeaders) {
      headerRow.eachCell(cell => {
        cell.alignment = { horizontal: 'left', vertical: 'bottom', wrapText: true };
      });
      headerRow.height = 90;
    }
    if (spec.freezeColumns != null) {
      ws.views = [{ state: 'frozen', xSplit: spec.freezeColumns, ySplit: headerRowNum }];
    }

    spec.rows.forEach((r, ri) => {
      const row = ws.getRow(headerRowNum + 1 + ri);
      spec.headers.forEach((_, ci) => {
        const v = r[ci];
        const cell = row.getCell(ci + 1);
        if (isLinkCell(v)) {
          cell.value = { text: v.text, hyperlink: v.hyperlink };
          cell.font = { size: 10, color: { argb: '0563C1' }, underline: true };
        } else if (isFillCell(v)) {
          cell.value = v.text;
          cell.font = { size: 10, ...(v.color ? { color: { argb: v.color } } : {}) };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: v.fill } };
        } else {
          cell.value = v == null ? '' : v;
          cell.font = { size: 10 };
          if (typeof v === 'string' && v.includes('\n')) {
            cell.alignment = { wrapText: true, vertical: 'top' };
          }
        }
      });
      if (ri % 2 === 0) {
        for (let c = 1; c <= lastCol; c++) {
          if (isFillCell(r[c - 1])) continue; // keep explicit fills
          row.getCell(c).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: COLORS.stripe },
          };
        }
      }
    });

    // Auto-ish column widths from header + sampled cell lengths.
    spec.headers.forEach((h, ci) => {
      let maxLen = h.length;
      for (const r of spec.rows.slice(0, 200)) {
        const v = r[ci];
        if (v != null) {
          const t = isLinkCell(v) || isFillCell(v) ? v.text : String(v);
          // Multi-line cells size to their longest line.
          maxLen = Math.max(maxLen, ...t.split('\n').map(l => l.length));
        }
      }
      ws.getColumn(ci + 1).width = spec.columnWidths?.[ci] ?? Math.min(Math.max(maxLen + 2, 10), 60);
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  saveAs(
    new Blob([buffer], {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }),
    filename.endsWith('.xlsx') ? filename : `${filename}.xlsx`
  );
}

/** Convenience: download a single table as a one-sheet workbook. */
export function downloadTable(
  filename: string,
  sheet: SheetSpec
): Promise<void> {
  return downloadTableWorkbook(filename, [sheet]);
}
