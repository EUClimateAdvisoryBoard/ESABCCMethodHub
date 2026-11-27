// Word file for Table 3 v2 (best-fit tiles, Eurostat 2024 start, JRC 2030 needs). AI-compiled - pending Secretariat verification.
const fs = require('fs');
const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, ShadingType, PageOrientation, BorderStyle, HeadingLevel, ImageRun } = require('docx');
const D = JSON.parse(fs.readFileSync('table3_v2.json', 'utf8'));
const F = 'Arial';
const r = (t, o = {}) => new TextRun({ text: t, font: F, size: o.size || 18, bold: o.bold, italics: o.italics, color: o.color });
const p = (runs, o = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], spacing: { before: o.before || 0, after: o.after ?? 80 } });
const b = { style: BorderStyle.SINGLE, size: 4, color: 'BFBFBF' }, borders = { top: b, bottom: b, left: b, right: b };
const cell = (t, w, o = {}) => new TableCell({ children: [p(r(t, { size: 16, bold: o.bold }), { after: 0 })], width: { size: w, type: WidthType.DXA }, borders, margins: { top: 50, bottom: 50, left: 80, right: 80 }, shading: o.fill ? { type: ShadingType.CLEAR, fill: o.fill, color: 'auto' } : undefined });
const table = (widths, head, rows) => new Table({ width: { size: widths.reduce((a, c) => a + c), type: WidthType.DXA }, columnWidths: widths,
  rows: [new TableRow({ tableHeader: true, children: head.map((h, j) => cell(h, widths[j], { bold: true, fill: 'E6F0F7' })) }), ...rows.map(row => new TableRow({ children: row.map((v, j) => cell(String(v), widths[j])) }))] });
const H = t => new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun({ text: t, font: F })] });
const img = fs.readFileSync('Table3_v2.png');
const fmt = (v, d = 0) => v.toLocaleString('en-GB', { maximumFractionDigits: d });
const W1 = [1700, 1500, 4200, 1900, 800, 5300];
const tiles = Object.values(D.tiles).map(t => [t.label, `${fmt(t.base, 1)} ${t.unit}`, t.source, `${fmt(t.lo)}–${fmt(t.hi)} ${t.unit} (${t.change})`, `${t.n}/6`,
  Object.entries(t.per_pathway).map(([a, v]) => `${a} ${fmt(v)}`).join('; ')]);
const W2 = [2200, 1600, 11600];
const jrc = Object.entries(D.jrc2030).filter(([k]) => !k.startsWith('_')).map(([k, v]) => [v.label, v.change, v.note]);
const W3 = [3400, 12000];
const PROXY = [['Electricity generation (row 5)', 'Total generation, not low-carbon generation: a proxy for the need.'], ['Industry electricity share (row 5)', 'Electrification of industry, not low-carbon electricity: a proxy.'],
  ['Electric car sales (row 3)', 'Car sales stand in for battery and vehicle manufacturing: a proxy.'], ['Industry H2 use (row 1)', 'Models count only hydrogen used as final energy, so 2020 is near zero and no Eurostat statistic matches.'],
  ['Electrolytic H2 share, electrolysers (rows 3, 5)', 'No Eurostat statistic; definitions differ between models (share of domestic production vs of demand). Electrolysers are kept only as the JRC 2030 need.'],
  ['Scrap steel output and share, H2-based steel, residues share, cellulosic biomass, biofuel plants', 'Reported by 1–3 of the 6 ECL pathways, mostly one model family; no Eurostat statistic.'],
  ['Investment (grids, chargers, H2 networks)', 'Reported by 2–3 pathways only, in US$2005; no Eurostat statistic.'], ['Scrap steel power', 'No matching variable in any ECL pathway.']];
const NM = { elec_share: 'Electricity share (row 1)', ind_bio: 'Industry bioenergy (row 1)', bio_primary: 'Primary bioenergy (row 6)' };
const drop = Object.entries(D.dropped).map(([k, why]) => [NM[k] || k, `Failed the scope check: ${why}. A change from a Eurostat start value would mix two definitions.`]);
const chk = Object.entries(D.scope_check).map(([k, c]) => [k, String(c.eurostat_2020), Object.entries(c.deviation).map(([a, v]) => `${a} ${v}`).join('; ')]);
const doc = new Document({ styles: { default: { document: { run: { font: F, size: 18 } } }, paragraphStyles: [{ id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: F, size: 24, bold: true, color: '1F4E79' }, paragraph: { spacing: { before: 240, after: 120 }, keepNext: true } }] },
  sections: [{ properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 720, bottom: 720, left: 720, right: 720 } } }, children: [
    H('Table 3 Needs per clean-technology option, with selected indicators for 2024 and 2040'),
    p(r('AI-compiled — pending Secretariat verification. Version 2, 27 Nov 2026: only the best-fitting indicators are shown.', { italics: true, color: 'C55A11', size: 17 })),
    new Paragraph({ children: [new ImageRun({ data: img, type: 'png', transformation: { width: 660, height: 477 } })] }),
    p([r('Notes: ', { bold: true }), r('Each scenario tile compares the Eurostat value for 2024 with the 2040 range across the pathways of the ECL set that report the indicator (lowest to highest value, bar). The bold figure is the change from 2024 to the middle of the 2040 range. "n" is the number of the 6 ECL pathways reporting it. An indicator is shown only if (1) it measures the need in its cell directly, (2) Eurostat publishes the same quantity, and (3) the pathways\' own 2020 values are within 15 % of Eurostat 2020, so the start value and the scenario values measure the same thing. Dashed tiles: growth in annual EU deployment needed from 2024 to 2030 to meet the 2030 targets, JRC (2026), as quoted in the chapter; not re-verified in this pass. Shading (limited / important / key) is the Secretariat\'s assessment, unchanged. Sources: Eurostat (nrg_bal_c, nrg_inf_epcrw); scenario data; JRC (2026).')], { before: 120 }),
    H('Scenario tiles: values and sources'),
    table(W1, ['Indicator', 'Eurostat 2024', 'Eurostat dataset', '2040 range (change)', 'n', '2040 value per pathway'], tiles),
    H('JRC (2026) 2030 scale-up needs'),
    table(W2, ['Product', 'Growth 2024 → 2030', 'Measure'], jrc),
    p(r(D.jrc2030._source, { italics: true, size: 16 }), { before: 80 }),
    H('Indicators left out, and why'),
    table(W3, ['Indicator', 'Reason'], PROXY.concat(drop)),
    H('Scope check: the pathways\' own 2020 values against Eurostat 2020'),
    table([2600, 1800, 11000], ['Indicator', 'Eurostat 2020', 'Deviation of each pathway\'s 2020 value'], chk),
  ] }] });
Packer.toBuffer(doc).then(buf => { fs.writeFileSync('Table3_v2_best_fit.docx', buf); console.log('ok'); });
