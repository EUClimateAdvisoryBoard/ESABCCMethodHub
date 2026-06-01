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

export interface SheetSpec {
  /** Worksheet name (sanitised + truncated to 31 chars). */
  name: string;
  /** Optional title row rendered above the table. */
  title?: string;
  /** Optional italic subtitle (unit, provenance, …). */
  subtitle?: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
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

    const headerRowNum = cursor;
    const headerRow = ws.getRow(headerRowNum);
    spec.headers.forEach((h, i) => {
      headerRow.getCell(i + 1).value = h;
    });
    styleHeaderRow(ws, headerRowNum);

    spec.rows.forEach((r, ri) => {
      const row = ws.getRow(headerRowNum + 1 + ri);
      spec.headers.forEach((_, ci) => {
        const v = r[ci];
        row.getCell(ci + 1).value = v == null ? '' : (v as string | number);
        row.getCell(ci + 1).font = { size: 10 };
      });
      if (ri % 2 === 0) {
        for (let c = 1; c <= lastCol; c++) {
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
        if (v != null) maxLen = Math.max(maxLen, String(v).length);
      }
      ws.getColumn(ci + 1).width = Math.min(Math.max(maxLen + 2, 10), 60);
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
