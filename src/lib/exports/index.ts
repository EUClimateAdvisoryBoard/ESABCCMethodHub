/**
 * Project Workspace export helpers.
 * ---------------------------------
 * One import surface for the three download families every module
 * exposes through the shared `DownloadMenu`:
 *   • charts  → PNG / JPG / SVG   (`./chart`)
 *   • data    → Excel / CSV        (`./excel`, `downloadCsv`)
 *   • text    → Word .docx         (`./word`)
 */
'use client';

import { saveAs } from 'file-saver';

export {
  downloadChartImage,
  buildExportProvenance,
  type ChartImageFormat,
} from './chart';
export {
  downloadTableWorkbook,
  downloadTable,
  type SheetSpec,
} from './excel';
export { downloadWord, buildDocxBlob, type DocBlock } from './word';

/** Lightweight CSV download for a single header + rows table. */
export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
): void {
  const escape = (v: string | number | null | undefined) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [
    headers.map(escape).join(','),
    ...rows.map(r => headers.map((_, i) => escape(r[i])).join(',')),
  ];
  saveAs(
    new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }),
    filename.endsWith('.csv') ? filename : `${filename}.csv`
  );
}
