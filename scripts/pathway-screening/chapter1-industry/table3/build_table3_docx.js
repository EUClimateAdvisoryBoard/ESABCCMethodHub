// Build the Word file with the recomputed Table 3. AI-compiled - pending Secretariat verification.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, PageOrientation, BorderStyle, HeadingLevel, VerticalAlign } = require('docx');
const T = JSON.parse(fs.readFileSync('table3_recomputed.json', 'utf8'));
const OLD = {elec_use: '2,610 → 4,160–4,460 TWh  ×1.7', elec_share: '20 → 49–52 %  +31 pp', ind_h2: '12 → 271–350 TWh  ×27', ind_bio: '484 → 553–584 TWh  ×1.2',
  residue_share: '84 → 78–79 %  −5 pp', scrap_share: '45 → 67–68 %  +22 pp', solar_cap: '×13', wind_cap: '×5.0', ev_sales: '3.2 → 98 %  +95 pp', electrolyser_cap: '0 → 78–126 GW  new',
  biofuel_cap: '18 → 53–67 GW  ×3.4', scrap_steel: '76 → 94–95 Mt  ×1.2', h2_steel: '0 → 39 Mt  new', cellulosic: '0.02 → 1.5–1.7 EJ  new', elec_gen: '3,090 → 5,060–5,570 TWh  ×1.7',
  ind_elec_share: '22 → 40–45 %  +21 pp', electrolytic_h2_share: '0 → 68–80 %  +74 pp', bio_primary: '6.5 → 6.6–7.5 EJ  ×1.1', grid_inv: '39 → 106–108 bn €/yr  ×2.8',
  charger_inv: '5.2 → 54 bn €/yr  ×11', h2_net_inv: '0.6 → 5.0–5.1 bn €/yr  ×8.4'};
const WHY = {elec_use: 'CETO 2024 (3,460) and Rodrigues widen the range downwards.', elec_share: 'Rodrigues (41 %) widens the range.', ind_h2: 'CETO 2024 (365, incl. feedstock) added; multiplier replaced: hydrogen is not new to industry.',
  ind_bio: 'Rodrigues (515) added.', residue_share: '2020 base is the model value (73 %); the change is now +5 pp, not −5 pp. Original 2020 value (84 %) not reproduced.', scrap_share: 'CETO 2024 (46 %) added: much lower scrap share.',
  solar_cap: 'Agora (929) and CETO (1,236) added.', wind_cap: 'Range widened (682–969).', ev_sales: 'Rodrigues and CETO added; ESABCC run reports none.', electrolyser_cap: 'Agora (136 GW) added.',
  biofuel_cap: 'Unchanged: only the three REMIND 3.x runs report it.', scrap_steel: 'CETO 2024 (67 Mt) added.', h2_steel: 'Unchanged: Schreyer runs only.', cellulosic: 'Only CETO 2024 reports the same concept (1.2 EJ); the REMIND value is a wider concept.',
  elec_gen: 'Rodrigues (4,728) and Agora added.', ind_elec_share: 'CETO (53 %) and Agora (about 60 %) added; Rodrigues 34 %.', electrolytic_h2_share: 'CETO (100 % of domestic production) and Agora (90 %) added; definitions differ.',
  bio_primary: 'Agora (3.4 EJ, incl. waste) makes the range 3.4–7.5 EJ and the midpoint fall below 2020.', grid_inv: 'Shown as published in US$2005 (original converted to € with an unstated factor); Rodrigues added.',
  charger_inv: 'As published in US$2005; Rodrigues added.', h2_net_inv: 'As published in US$2005; Schreyer runs only.'};
const F = 'Arial', COLS = ['Clean power', 'Direct electrification', 'Indirect electrification', 'Bio-based resources', 'Recycling and waste management'];
const ROWS = ['(1) Demand changes', '(2) Circular economy', '(3) Industrial facilities', '(4) Innovation and know-how', '(5) Low-carbon electricity', '(6) Alternatives to primary fossil inputs', '(7) Infrastructure'];
const GRID = [['elec_use', 'elec_share', 'ind_h2', 'ind_bio', null], [null, null, null, 'residue_share', 'scrap_share'], [['solar_cap', 'wind_cap'], 'ev_sales', 'electrolyser_cap', 'biofuel_cap', 'scrap_steel'],
  [null, null, 'h2_steel', 'cellulosic', null], ['elec_gen', 'ind_elec_share', 'electrolytic_h2_share', null, 'SCRAP_POWER'], [null, null, null, 'bio_primary', null], ['grid_inv', 'charger_inv', 'h2_net_inv', null, null]];
const r = (t, o = {}) => new TextRun({ text: t, font: F, size: o.size || 16, bold: o.bold, italics: o.italics, color: o.color });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], alignment: o.align, spacing: { before: o.before || 0, after: o.after || 0 } });
const W0 = 2300, W = 2560, TOTAL = W0 + 5 * W;
const border = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' };
const borders = { top: border, bottom: border, left: border, right: border };
function tileParas(key) {
  if (key === 'SCRAP_POWER') return [p(r('Scrap steel power', { bold: true }), { align: AlignmentType.CENTER }), p(r('not recomputed', { italics: true, color: 'C00000' }), { align: AlignmentType.CENTER }), p(r('no matching variable in the ECL pathways; original 96 → 107–108 TWh (check unit)', { size: 13, color: '6A6A6A' }), { align: AlignmentType.CENTER })];
  const t = T[key];
  return [p(r(t.label, { bold: true }), { align: AlignmentType.CENTER }), p(r(t.text), { align: AlignmentType.CENTER }), p(r(t.change, { bold: true, size: 20 }), { align: AlignmentType.CENTER }),
          p(r(`n = ${t.n} of 6`, { size: 13, color: '6A6A6A' }), { align: AlignmentType.CENTER })];
}
const cell = (children, w, fill) => new TableCell({ children, width: { size: w, type: WidthType.DXA }, borders, verticalAlign: VerticalAlign.CENTER, margins: { top: 60, bottom: 60, left: 80, right: 80 }, shading: fill ? { type: ShadingType.CLEAR, fill, color: 'auto' } : undefined });
const head = new TableRow({ tableHeader: true, children: [cell([p(r(''))], W0)].concat(COLS.map(c => cell([p(r(c, { bold: true, size: 17 }), { align: AlignmentType.CENTER })], W, 'E6F0F7'))) });
const body = GRID.map((row, i) => new TableRow({ children: [cell([p(r(ROWS[i], { bold: true, size: 17 }))], W0, 'F2F2F2')].concat(row.map(k => {
  if (!k) return cell([p(r('–', { color: 'A0A0A0' }), { align: AlignmentType.CENTER })], W);
  if (Array.isArray(k)) return cell([].concat(...k.map(tileParas)), W);
  return cell(tileParas(k), W);
})) }));
const grid = new Table({ width: { size: TOTAL, type: WidthType.DXA }, columnWidths: [W0, W, W, W, W, W], rows: [head, ...body] });
// change log
const KEYS = Object.keys(OLD);
const lw = [2200, 3300, 3300, 1100, 5200];
const lh = new TableRow({ tableHeader: true, children: ['Tile', 'Original table', 'Recomputed (current ECL set)', 'n of 6', 'What changed'].map((h, j) => cell([p(r(h, { bold: true, size: 17 }))], lw[j], 'E6F0F7')) });
const lr = KEYS.map(k => new TableRow({ children: [T[k].label, OLD[k], `${T[k].text}  ${T[k].change}`, String(T[k].n), WHY[k]].map((v, j) => cell([p(r(v, { size: 16 }))], lw[j])) }));
lr.push(new TableRow({ children: ['Scrap steel power', '96 → 107–108 TWh  ×1.1', 'not recomputed', '–', 'No matching variable in the ECL pathways; 96 TWh for 76 Mt is about 1.3 MWh/t, well above typical EAF use, so check the unit or scope.'].map((v, j) => cell([p(r(v, { size: 16 }))], lw[j])) }));
const log = new Table({ width: { size: lw.reduce((a, b) => a + b), type: WidthType.DXA }, columnWidths: lw, rows: [lh, ...lr] });
// definitions and per-pathway values
const dw = [2000, 6300, 6800];
const dh = new TableRow({ tableHeader: true, children: ['Tile', 'Definition and caveats', '2040 value per pathway'].map((h, j) => cell([p(r(h, { bold: true, size: 17 }))], dw[j], 'E6F0F7')) });
const dr = KEYS.map(k => new TableRow({ children: [T[k].label + ` (${T[k].unit})`, T[k].note, Object.entries(T[k].per_pathway).map(([a, b]) => `${a} ${b.toLocaleString('en-GB')}`).join('; ')].map((v, j) => cell([p(r(v, { size: 15 }))], dw[j])) }));
const defs = new Table({ width: { size: dw.reduce((a, b) => a + b), type: WidthType.DXA }, columnWidths: dw, rows: [dh, ...dr] });
const H = (t) => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: F })] });
const doc = new Document({
  styles: { default: { document: { run: { font: F, size: 20 } } }, paragraphStyles: [{ id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F, size: 26, bold: true, color: '1F4E79' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true } }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } },
    children: [
      H('Table 3 Needs per clean-technology option, with selected scenario indicators for 2020 and 2040 (recomputed)'),
      p(r('AI-compiled — pending Secretariat verification. Recomputed 27 Nov 2026 on the current ECL set (6 pathways): ESABCC REMIND 3.2, Schreyer CCS180, Schreyer CCS350, Rodrigues, JRC CETO 2024, Agora. The original table used the earlier ECL set of 3 REMIND pathways.', { size: 17, italics: true, color: 'C55A11' }), { after: 120 }),
      grid,
      p([r('Notes: ', { bold: true, size: 17 }), r('Each cell compares 2020 with the 2040 range across the ECL pathways that report the indicator (lowest to highest value). 2020 is the average of those pathways\' own 2020 values. The bold figure is the change from 2020 to the middle of the 2040 range: × for multiples, pp for percentage points, "new" where the 2020 value is close to zero. "n = k of 6" is the number of ECL pathways reporting the indicator in 2040. 2020 was a COVID year, so 2020-based multiples are somewhat inflated. * Industry H₂: models count only hydrogen used as final energy; hydrogen made from natural gas inside refineries and ammonia plants (roughly 300 TWh today) is not in the 2020 value, so no multiplier is shown. Investment tiles are in billion US$2005 a year as published. Importance shading (limited / important / key) is unchanged from the original table and is not reproduced here. Source: scenario data; per-pathway values and variables in the tables below and in scripts/pathway-screening/chapter1-industry/table3/.', { size: 17 })], { before: 120, after: 200 }),
      H('What changed against the original table'),
      log,
      H('Definitions and 2040 values per pathway'),
      defs,
    ] }] });
Packer.toBuffer(doc).then(b => { fs.writeFileSync('Table3_recomputed_ECL_set.docx', b); console.log('ok'); });
