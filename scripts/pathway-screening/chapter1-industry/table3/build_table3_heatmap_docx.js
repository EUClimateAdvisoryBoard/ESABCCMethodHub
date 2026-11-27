// Table 3 as a plain heatmap: importance of each need per clean-technology option, no numbers.
// Shading copied from the chapter's original figure (colours sampled from it). AI-compiled - pending Secretariat verification.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, PageOrientation, BorderStyle, HeadingLevel, AlignmentType, VerticalAlign, ImageRun } = require('docx');
const F = 'Calibri', TEAL = '5B8A96', L = 'E4EDEF', I = 'A9C4C9', K = '608C95';
const IMP = [[I, K, K, K, I], [L, I, I, K, K], [K, K, K, I, K], [L, I, K, K, K], [L, I, K, L, L], [K, K, K, K, L], [K, K, K, I, I]];
const COLS = ['Clean power', 'Direct electrification', 'Indirect electrification', 'Bio-based resources', 'Recycling and waste management'];
const ROWS = ['(1) Demand changes', '(2) Circular economy', '(3) Industrial facilities', '(4) Innovation and know-how', '(5) Low-carbon electricity', '(6) Alternatives to primary fossil inputs', '(7) Infrastructure'];
const b = { style: BorderStyle.SINGLE, size: 12, color: 'FFFFFF' }, borders = { top: b, bottom: b, left: b, right: b };
const t = (s, o = {}) => new Paragraph({ alignment: o.align || AlignmentType.CENTER, children: [new TextRun({ text: s, font: F, size: o.size || 17, bold: o.bold, color: o.color || '2C2D2D' })] });
const W0 = 2200, W = 1365;   // fits a portrait A4 page with 2.5 cm margins (9,025 twips)
const cell = (children, w, fill) => new TableCell({ children, width: { size: w, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, margins: { top: 50, bottom: 50, left: 70, right: 70 }, shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined });
const grid = new Table({ width: { size: W0 + 5 * W, type: WidthType.DXA }, columnWidths: [W0, W, W, W, W, W], rows: [
  new TableRow({ tableHeader: true, children: [cell([t('')], W0)].concat(COLS.map(h => cell([t(h, { bold: true })], W))) }),
  ...ROWS.map((r, i) => new TableRow({ height: { value: 520, rule: 'atLeast' }, children: [cell([t(r, { bold: true, align: AlignmentType.LEFT })], W0)].concat(IMP[i].map(f => cell([t('')], W, f))) })),
  new TableRow({ height: { value: 420, rule: 'atLeast' }, children: [cell([t('Importance of the need', { bold: true, align: AlignmentType.LEFT })], W0), cell([t('Limited')], W, L), cell([t('Important')], W, I), cell([t('Key', { color: 'FFFFFF' })], W, K), cell([t('')], W), cell([t('')], W)] })] });
const doc = new Document({ styles: { default: { document: { run: { font: F, size: 20 } } }, paragraphStyles: [{ id: 'Caption1', name: 'Table caption', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F, size: 26, color: TEAL }, paragraph: { spacing: { before: 120, after: 200 }, keepNext: true } }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } }, children: [
    new Paragraph({ style: 'Caption1', children: [new TextRun({ text: 'Table 3 Needs per clean-technology option', font: F })] }),
    new Paragraph({ children: [new ImageRun({ data: fs.readFileSync('Table3_heatmap.png'), type: 'png', transformation: { width: 602, height: Math.round(602 * 1733 / 2492) } })] }),   // figure in the style of Figure 6 (fig_table3_heatmap.py)
    new Paragraph({ spacing: { before: 160 }, children: [new TextRun({ text: 'Notes: ', font: F, size: 16, bold: true, color: TEAL }), new TextRun({ text: 'Shading shows how important each need is for each clean-technology option: limited, important or key. Source: Secretariat assessment; see the technical annex.', font: F, size: 16, color: TEAL })] }),
  ] }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync('Table3_heatmap.docx', buf); console.log('ok'); });
