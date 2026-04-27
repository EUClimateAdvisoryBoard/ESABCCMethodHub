'use client';

import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { injectExcelCharts, ChartSheetInfo } from './excelChartInjector';

// ── ESABCC colour palette (from official reports) ────────────────────────
const ESABCC_COLORS = {
  primary: '003399',
  secondary: '0065A4',
  accent1: '007B6C',
  accent2: 'FF9933',
  accent3: 'B83230',
  accent4: 'A530B8',
  accent5: '54728C',
  accent6: '6667AB',
  headerBg: '003399',
  headerText: 'FFFFFF',
};

// ── Types ────────────────────────────────────────────────────────────────
interface Series {
  label: string;
  points: { year: number; value: number }[];
  category?: string;
}

interface ChartDataExport {
  variable: string;
  series: Series[];
  unit: string;
  region?: string;
  chartType?: string;
}

interface BarGroup {
  label: string;
  values: { name: string; value: number }[];
}

interface BoxDataItem {
  label: string;
  values: number[];
}

interface FigureEntry {
  figNum: number;
  title: string;
  sheetName: string;
  type: string;
  region: string;
  variable: string;
  unit: string;
  seriesCount: number;
}

// ── Excel Export ─────────────────────────────────────────────────────────
export async function exportToExcel(
  charts: ChartDataExport[],
  barGroups: BarGroup[],
  boxData: BoxDataItem[],
  metadata: { database: string; regions: string[]; categories: string[]; narratives: string[]; preset: string }
) {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'ESABCC Scenario Explorer';
  wb.created = new Date();

  const figures: FigureEntry[] = [];
  let figCounter = 0;
  const chartSheetInfos: ChartSheetInfo[] = [];

  // ── Data + Chart sheets per line chart ────────────────────────────────
  const lineCharts = charts.filter(c => c.chartType === 'line' || !c.chartType);

  for (let ci = 0; ci < lineCharts.length; ci++) {
    const chart = lineCharts[ci];
    figCounter++;
    const figNum = figCounter;
    const sheetName = sanitizeSheetName(`Fig${figNum}`, chart.variable, chart.region);

    const ws = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: ESABCC_COLORS.primary } } });

    const allYears = new Set<number>();
    chart.series.forEach(s => s.points.forEach(p => allYears.add(p.year)));
    const years = [...allYears].sort((a, b) => a - b);

    if (years.length === 0 || chart.series.length === 0) continue;

    const figTitle = `Figure ${figNum}: ${chart.variable}${chart.region ? ` — ${chart.region}` : ''}`;

    // Title row
    ws.mergeCells(1, 1, 1, Math.max(years.length + 1, 6));
    const titleCell = ws.getCell(1, 1);
    titleCell.value = figTitle;
    titleCell.font = { bold: true, size: 14, color: { argb: ESABCC_COLORS.primary } };
    titleCell.alignment = { horizontal: 'left' };

    // Subtitle: unit + metadata
    ws.mergeCells(2, 1, 2, Math.max(years.length + 1, 6));
    ws.getCell(2, 1).value = `Unit: ${chart.unit} | Region: ${chart.region || metadata.regions.join(', ')} | Database: ${metadata.database}`;
    ws.getCell(2, 1).font = { italic: true, size: 10, color: { argb: '666666' } };

    // Header row (row 4)
    const headerRow = ws.getRow(4);
    headerRow.getCell(1).value = 'Scenario / Model';
    years.forEach((y, i) => { headerRow.getCell(i + 2).value = y; });
    styleHeader(ws, 4);
    ws.getColumn(1).width = 40;
    years.forEach((_, i) => { ws.getColumn(i + 2).width = 13; });

    // Data rows
    chart.series.forEach((s, si) => {
      const row = ws.getRow(5 + si);
      row.getCell(1).value = s.label;
      row.getCell(1).font = { size: 10 };
      years.forEach((y, yi) => {
        const pt = s.points.find(p => p.year === y);
        if (pt) {
          row.getCell(yi + 2).value = pt.value;
          row.getCell(yi + 2).numFmt = '#,##0.00';
        }
      });
      if (si % 2 === 0) {
        for (let c = 1; c <= years.length + 1; c++) {
          row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F7FA' } };
        }
      }
    });

    // Summary statistics
    const statsStartRow = 5 + chart.series.length + 2;
    ws.getCell(statsStartRow, 1).value = 'Summary Statistics';
    ws.getCell(statsStartRow, 1).font = { bold: true, size: 12, color: { argb: ESABCC_COLORS.primary } };

    const statLabels = ['Median', 'Mean', 'Min', 'Max', 'P10', 'P25', 'P75', 'P90', 'Count'];
    const statsHeaderRow = ws.getRow(statsStartRow + 1);
    statsHeaderRow.getCell(1).value = 'Statistic';
    years.forEach((y, i) => { statsHeaderRow.getCell(i + 2).value = y; });
    styleHeader(ws, statsStartRow + 1);

    statLabels.forEach((label, li) => {
      const row = ws.getRow(statsStartRow + 2 + li);
      row.getCell(1).value = label;
      row.getCell(1).font = { bold: true, size: 10 };
      years.forEach((y, yi) => {
        const vals = chart.series
          .map(s => s.points.find(p => p.year === y)?.value)
          .filter((v): v is number => v != null && !isNaN(v))
          .sort((a, b) => a - b);
        if (vals.length === 0) return;
        const cell = row.getCell(yi + 2);
        switch (label) {
          case 'Median': cell.value = percentile(vals, 50); break;
          case 'Mean': cell.value = vals.reduce((a, b) => a + b, 0) / vals.length; break;
          case 'Min': cell.value = vals[0]; break;
          case 'Max': cell.value = vals[vals.length - 1]; break;
          case 'P10': cell.value = percentile(vals, 10); break;
          case 'P25': cell.value = percentile(vals, 25); break;
          case 'P75': cell.value = percentile(vals, 75); break;
          case 'P90': cell.value = percentile(vals, 90); break;
          case 'Count': cell.value = vals.length; break;
        }
        if (label !== 'Count') cell.numFmt = '#,##0.00';
      });
    });

    // Define named table for the data range
    const dataEndRow = 4 + chart.series.length;
    const dataEndCol = years.length + 1;
    try {
      ws.addTable({
        name: `Table_Fig${figNum}`,
        ref: `A4`,
        headerRow: true,
        style: { theme: 'TableStyleMedium2', showRowStripes: true },
        columns: [
          { name: 'Scenario / Model', filterButton: true },
          ...years.map(y => ({ name: String(y), filterButton: false })),
        ],
        rows: chart.series.map(s =>
          [s.label, ...years.map(y => s.points.find(p => p.year === y)?.value ?? null)]
        ),
      });
    } catch {
      // Table creation may fail in some ExcelJS versions, data is still present
    }

    // Track chart info for OOXML chart injection
    chartSheetInfos.push({
      sheetName,
      title: `Figure ${figNum}: ${chart.variable.split('|').pop() || chart.variable}${chart.region ? ' — ' + chart.region : ''}`,
      dataStartRow: 4,
      dataEndRow: 4 + chart.series.length,
      dataStartCol: 1,
      dataEndCol: years.length,
      seriesCount: chart.series.length,
      years,
      unit: chart.unit,
    });

    figures.push({
      figNum, title: figTitle, sheetName,
      type: 'Line Chart', region: chart.region || metadata.regions.join(', '),
      variable: chart.variable, unit: chart.unit, seriesCount: chart.series.length,
    });
  }

  // ── Bar comparison sheet ──────────────────────────────────────────────
  if (barGroups.length > 0) {

    figCounter++;
    const figNum = figCounter;
    const sheetName = sanitizeSheetName(`Fig${figNum}`, 'Comparison', undefined);
    const ws = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: ESABCC_COLORS.accent2 } } });

    const figTitle = `Figure ${figNum}: ${metadata.preset} — Cross-Variable Comparison`;
    ws.mergeCells(1, 1, 1, 6);
    ws.getCell(1, 1).value = figTitle;
    ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: ESABCC_COLORS.primary } };

    const varNames = [...new Set(barGroups.flatMap(g => g.values.map(v => v.name)))];
    const headerRow = ws.getRow(3);
    headerRow.getCell(1).value = 'Year';
    varNames.forEach((n, i) => { headerRow.getCell(i + 2).value = n; });
    styleHeader(ws, 3);
    ws.getColumn(1).width = 12;
    varNames.forEach((_, i) => { ws.getColumn(i + 2).width = 20; });

    barGroups.forEach((g, gi) => {
      const row = ws.getRow(4 + gi);
      row.getCell(1).value = g.label;
      g.values.forEach(v => {
        const ci2 = varNames.indexOf(v.name);
        if (ci2 >= 0) {
          row.getCell(ci2 + 2).value = v.value;
          row.getCell(ci2 + 2).numFmt = '#,##0.00';
        }
      });
    });

    figures.push({
      figNum, title: figTitle, sheetName,
      type: 'Bar Chart', region: metadata.regions[0] || '',
      variable: 'Multiple', unit: '', seriesCount: varNames.length,
    });
  }

  // ── Box plot / distribution sheet ─────────────────────────────────────
  if (boxData.length > 0) {

    figCounter++;
    const figNum = figCounter;
    const sheetName = sanitizeSheetName(`Fig${figNum}`, 'Distribution', undefined);
    const ws = wb.addWorksheet(sheetName, { properties: { tabColor: { argb: ESABCC_COLORS.accent1 } } });

    const figTitle = `Figure ${figNum}: ${metadata.preset} — Scenario Distribution at 2050`;
    ws.mergeCells(1, 1, 1, 11);
    ws.getCell(1, 1).value = figTitle;
    ws.getCell(1, 1).font = { bold: true, size: 14, color: { argb: ESABCC_COLORS.primary } };

    const statCols = ['Min', 'P10', 'P25', 'Median', 'P75', 'P90', 'Max', 'Mean', 'Std Dev', 'Count'];
    const headerRow = ws.getRow(3);
    headerRow.getCell(1).value = 'Variable / Year';
    statCols.forEach((s, i) => { headerRow.getCell(i + 2).value = s; });
    styleHeader(ws, 3);
    ws.getColumn(1).width = 25;
    statCols.forEach((_, i) => { ws.getColumn(i + 2).width = 14; });

    boxData.forEach((b, bi) => {
      const vals = [...b.values].sort((a, b) => a - b);
      const row = ws.getRow(4 + bi);
      row.getCell(1).value = b.label;
      if (vals.length > 0) {
        const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
        const stdDev = Math.sqrt(vals.reduce((sum, v) => sum + (v - mean) ** 2, 0) / vals.length);
        row.getCell(2).value = vals[0];
        row.getCell(3).value = percentile(vals, 10);
        row.getCell(4).value = percentile(vals, 25);
        row.getCell(5).value = percentile(vals, 50);
        row.getCell(6).value = percentile(vals, 75);
        row.getCell(7).value = percentile(vals, 90);
        row.getCell(8).value = vals[vals.length - 1];
        row.getCell(9).value = mean;
        row.getCell(10).value = stdDev;
        row.getCell(11).value = vals.length;
        for (let c = 2; c <= 10; c++) row.getCell(c).numFmt = '#,##0.00';
      }
    });

    figures.push({
      figNum, title: figTitle, sheetName,
      type: 'Box Plot', region: metadata.regions[0] || '',
      variable: 'Multiple', unit: '', seriesCount: boxData.length,
    });
  }

  // ── Summary / Index sheet (added last, will appear after data sheets) ──
  const summarySheet = wb.addWorksheet('Summary', {
    properties: { tabColor: { argb: ESABCC_COLORS.primary } },
  });

  // Title
  summarySheet.mergeCells(1, 1, 1, 7);
  summarySheet.getCell(1, 1).value = 'ESABCC Scenario Explorer — Data Export';
  summarySheet.getCell(1, 1).font = { bold: true, size: 16, color: { argb: ESABCC_COLORS.primary } };

  // Metadata
  const metaRows = [
    ['Generated', new Date().toISOString().slice(0, 19).replace('T', ' ')],
    ['Database', metadata.database],
    ['Region(s)', metadata.regions.join(', ')],
    ['Climate Categories', metadata.categories.join(', ') || 'All'],
    ['SSP Narratives', metadata.narratives.join(', ') || 'All'],
    ['Dashboard Preset', metadata.preset],
  ];
  metaRows.forEach(([key, val], i) => {
    const row = summarySheet.getRow(3 + i);
    row.getCell(1).value = key;
    row.getCell(1).font = { bold: true, size: 10, color: { argb: '333333' } };
    row.getCell(2).value = val;
    row.getCell(2).font = { size: 10 };
  });

  summarySheet.getColumn(1).width = 20;
  summarySheet.getColumn(2).width = 50;

  // Figures index table
  const indexStartRow = 3 + metaRows.length + 2;
  summarySheet.mergeCells(indexStartRow, 1, indexStartRow, 7);
  summarySheet.getCell(indexStartRow, 1).value = 'Figures Index';
  summarySheet.getCell(indexStartRow, 1).font = { bold: true, size: 14, color: { argb: ESABCC_COLORS.primary } };

  const indexHeaders = ['Figure', 'Title', 'Type', 'Region', 'Variable', 'Unit', 'Series'];
  const indexHeaderRow = summarySheet.getRow(indexStartRow + 1);
  indexHeaders.forEach((h, i) => { indexHeaderRow.getCell(i + 1).value = h; });
  styleHeader(summarySheet, indexStartRow + 1);

  summarySheet.getColumn(1).width = 10;
  summarySheet.getColumn(2).width = 50;
  summarySheet.getColumn(3).width = 14;
  summarySheet.getColumn(4).width = 18;
  summarySheet.getColumn(5).width = 30;
  summarySheet.getColumn(6).width = 14;
  summarySheet.getColumn(7).width = 10;

  figures.forEach((fig, fi) => {
    const row = summarySheet.getRow(indexStartRow + 2 + fi);
    // Figure number as hyperlink to the sheet
    const cell = row.getCell(1);
    cell.value = { text: `Fig. ${fig.figNum}`, hyperlink: `#'${fig.sheetName}'!A1` };
    cell.font = { color: { argb: ESABCC_COLORS.primary }, underline: true, size: 10 };

    row.getCell(2).value = fig.title;
    row.getCell(2).font = { size: 10 };
    row.getCell(3).value = fig.type;
    row.getCell(4).value = fig.region;
    row.getCell(5).value = fig.variable;
    row.getCell(6).value = fig.unit;
    row.getCell(7).value = fig.seriesCount;

    // Alternate shading
    if (fi % 2 === 0) {
      for (let c = 1; c <= 7; c++) {
        row.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F5F7FA' } };
      }
    }
  });

  // ── Generate buffer and inject native Excel charts ─────────────────
  let buffer = await wb.xlsx.writeBuffer();

  // Inject actual Excel line charts into data sheets
  if (chartSheetInfos.length > 0) {
    try {
      buffer = await injectExcelCharts(buffer as ArrayBuffer, chartSheetInfos);
    } catch (err) {
      console.warn('Chart injection failed, exporting data only:', err);
    }
  }

  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `ESABCC_Scenarios_${metadata.preset}_${new Date().toISOString().slice(0, 10)}.xlsx`);
}

// ── CSV export per chart ────────────────────────────────────────────────
//
// Exports a single chart's data to a CSV file (year × series matrix).
// This is the lightweight alternative to the full Excel workbook export
// and works for any chart whose data fits a {label, points: [{year, value}]}
// shape — both projection (multi-scenario) and historical (one-line-per-region).

// ---------------------------------------------------------------------------
// buildProvenance — single-line citation footer baked into every export.
//
// Brief item M·02 #8: exports should include a 1-line footer like
// "MethodHub · IIASA AR6 · accessed 2026-04-26 · scenario: NGFS Net Zero 2050"
// so users stop screenshotting + retyping; the artefact is presentation-ready.
// ---------------------------------------------------------------------------
export function buildProvenance(opts: {
  database?: string | null;
  scenario?: string | null;
  region?: string | null;
  preset?: string | null;
}): string {
  const today = new Date().toISOString().slice(0, 10);
  const parts: string[] = ['MethodHub'];
  if (opts.database) parts.push(opts.database);
  if (opts.preset) parts.push(opts.preset);
  if (opts.region) parts.push(opts.region);
  if (opts.scenario) parts.push(`scenario: ${opts.scenario}`);
  parts.push(`accessed ${today}`);
  return parts.join(' · ');
}

export function exportChartAsCsv(
  chart: ChartDataExport,
  filename: string,
  provenance?: string,
) {
  if (!chart.series || chart.series.length === 0) return;

  const allYears = new Set<number>();
  chart.series.forEach((s) => s.points.forEach((p) => allYears.add(p.year)));
  const years = [...allYears].sort((a, b) => a - b);
  if (years.length === 0) return;

  // CSV header: comment block with metadata, then header row, then data rows.
  const lines: string[] = [];
  lines.push(`# ${chart.variable}${chart.region ? ` — ${chart.region}` : ''}`);
  lines.push(`# Unit: ${chart.unit}`);
  lines.push(`# Generated: ${new Date().toISOString().slice(0, 19).replace('T', ' ')}`);
  if (provenance) lines.push(`# ${provenance}`);
  lines.push('');

  const escape = (v: string | number | null) => {
    if (v == null) return '';
    const s = String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };

  const headerRow = ['Series / Year', ...years.map((y) => String(y))];
  lines.push(headerRow.map(escape).join(','));

  for (const s of chart.series) {
    const row: (string | number | null)[] = [s.label];
    for (const y of years) {
      const pt = s.points.find((p) => p.year === y);
      row.push(pt ? pt.value : null);
    }
    lines.push(row.map(escape).join(','));
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, `${filename}.csv`);
}

// ── PNG/SVG export per chart ────────────────────────────────────────────

const PROVENANCE_FONT = '11px "Segoe UI", system-ui, sans-serif';
const PROVENANCE_PADDING = 6;
const PROVENANCE_HEIGHT = 22; // strip drawn under the chart
const PROVENANCE_COLOR = '#54728C';

// Re-render `srcCanvas` onto a new canvas with a 1-line provenance footer
// drawn under the original drawing. Kept here so PNG export can reuse it.
function appendProvenance(srcCanvas: HTMLCanvasElement, provenance: string): HTMLCanvasElement {
  const w = srcCanvas.width;
  const h = srcCanvas.height;
  const out = document.createElement('canvas');
  out.width = w;
  out.height = h + PROVENANCE_HEIGHT;
  const ctx = out.getContext('2d');
  if (!ctx) return srcCanvas;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(srcCanvas, 0, 0);
  ctx.font = PROVENANCE_FONT;
  ctx.fillStyle = PROVENANCE_COLOR;
  ctx.textBaseline = 'middle';
  ctx.fillText(provenance, PROVENANCE_PADDING, h + PROVENANCE_HEIGHT / 2);
  return out;
}

export function exportChartAsPng(canvasOrSvg: HTMLCanvasElement | HTMLElement, filename: string, provenance?: string) {
  const canvas = canvasOrSvg.querySelector('canvas') || (canvasOrSvg instanceof HTMLCanvasElement ? canvasOrSvg : null);
  if (canvas) {
    const out = provenance ? appendProvenance(canvas, provenance) : canvas;
    out.toBlob(blob => {
      if (blob) saveAs(blob, `${filename}.png`);
    }, 'image/png');
    return;
  }
  const svg = canvasOrSvg.querySelector('svg');
  if (svg) {
    const svgData = new XMLSerializer().serializeToString(svg);
    const img = new Image();
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    img.onload = () => {
      const c = document.createElement('canvas');
      c.width = img.width * 2;
      c.height = img.height * 2;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0);
        const out = provenance ? appendProvenance(c, provenance) : c;
        out.toBlob(blob => { if (blob) saveAs(blob, `${filename}.png`); }, 'image/png');
      }
      URL.revokeObjectURL(url);
    };
    img.src = url;
  }
}

export function exportChartAsSvg(container: HTMLElement, filename: string, provenance?: string) {
  // For SVG exports we wrap the original SVG (or the canvas-rasterised image)
  // in an outer SVG that adds the provenance footer as a real <text> element —
  // so the line can be selected, restyled, and translated by downstream tooling.
  const inner = (() => {
    const canvas = container.querySelector('canvas');
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      return { svgFragment: `<image href="${dataUrl}" width="${canvas.width}" height="${canvas.height}"/>`, w: canvas.width, h: canvas.height };
    }
    const svg = container.querySelector('svg');
    if (svg) {
      const w = svg.viewBox?.baseVal?.width || svg.clientWidth || svg.getBoundingClientRect().width || 800;
      const h = svg.viewBox?.baseVal?.height || svg.clientHeight || svg.getBoundingClientRect().height || 400;
      return { svgFragment: new XMLSerializer().serializeToString(svg), w, h };
    }
    return null;
  })();
  if (!inner) return;
  if (!provenance) {
    const blob = new Blob([
      `<svg xmlns="http://www.w3.org/2000/svg" width="${inner.w}" height="${inner.h}">${inner.svgFragment}</svg>`,
    ], { type: 'image/svg+xml;charset=utf-8' });
    saveAs(blob, `${filename}.svg`);
    return;
  }
  const total = inner.h + PROVENANCE_HEIGHT;
  const escaped = provenance.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const wrapped = `<svg xmlns="http://www.w3.org/2000/svg" width="${inner.w}" height="${total}">
    <rect x="0" y="0" width="${inner.w}" height="${total}" fill="#FFFFFF"/>
    <g>${inner.svgFragment}</g>
    <text x="${PROVENANCE_PADDING}" y="${inner.h + PROVENANCE_HEIGHT / 2 + 4}" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${PROVENANCE_COLOR}">${escaped}</text>
  </svg>`;
  const blob = new Blob([wrapped], { type: 'image/svg+xml;charset=utf-8' });
  saveAs(blob, `${filename}.svg`);
}

// ── Helpers ─────────────────────────────────────────────────────────────

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function sanitizeSheetName(prefix: string, variable: string, region: string | undefined): string {
  let name = variable.split('|').pop() || variable;
  if (region) name = `${name} (${region})`;
  name = `${prefix} ${name}`.replace(/[\\/*?:\[\]]/g, '').slice(0, 31);
  return name;
}

function styleHeader(ws: ExcelJS.Worksheet, rowNum = 1) {
  const row = ws.getRow(rowNum);
  row.eachCell(cell => {
    cell.font = { bold: true, size: 10, color: { argb: ESABCC_COLORS.headerText } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ESABCC_COLORS.headerBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    cell.border = { bottom: { style: 'thin', color: { argb: '999999' } } };
  });
  row.height = 24;
}
