/**
 * Native-chart injector for the Trade Flows IO-model masterfile.
 * --------------------------------------------------------------
 * ExcelJS cannot author chart parts, so the build script writes the workbook
 * first and this module then adds three REAL Excel charts (DrawingML chart
 * parts) to the Figures sheet by editing the .xlsx package directly (JSZip,
 * existing project dependency):
 *
 *   1. a diverging horizontal bar chart of the extra-EU trade balance
 *      (two series — Surplus / Deficit — read from the live IF(...) columns
 *      on the Figures sheet, so the sign→colour routing recalculates);
 *   2. a scatter of the import-dependency map (two series, raw materials vs
 *      manufactured products, reading the Risk map sheet's columns);
 *   3. a bar chart of the top-12 industries by model import content
 *      (reading the live INDEX/MATCH block on the Figures sheet).
 *
 * The charts are generated FROM the sheet data: every series is a range
 * reference, so editing the underlying sheets moves the charts. Cached
 * str/num values are embedded (like the cached formula results elsewhere in
 * the workbook) so the charts render before Excel's first recalculation.
 *
 * Element order follows the ECMA-376 CT_* sequences exactly — Excel repairs
 * (and strips) chart parts whose children are out of order.
 *
 * Colours are the workbook's CVD-validated chart palette: surplus #00846C /
 * deficit #B83230; raw material #2B6E9F / product #D97A22.
 */

import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const JSZip = require('jszip');

const XDR = 'http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing';
const A = 'http://schemas.openxmlformats.org/drawingml/2006/main';
const C = 'http://schemas.openxmlformats.org/drawingml/2006/chart';
const R = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';

const EMU_PER_PX = 9525;

const esc = (s) =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ------------------------------------------------------------ chart pieces */

const strRef = (f, vals) =>
  `<c:strRef><c:f>${esc(f)}</c:f><c:strCache><c:ptCount val="${vals.length}"/>` +
  vals.map((v, i) => `<c:pt idx="${i}"><c:v>${esc(v)}</c:v></c:pt>`).join('') +
  `</c:strCache></c:strRef>`;

/** vals may contain null (blank / #N/A points) — those cache points are omitted. */
const numRef = (f, vals, fmt = 'General') =>
  `<c:numRef><c:f>${esc(f)}</c:f><c:numCache><c:formatCode>${fmt}</c:formatCode><c:ptCount val="${vals.length}"/>` +
  vals.map((v, i) => (v == null ? '' : `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`)).join('') +
  `</c:numCache></c:numRef>`;

const seriesName = (name) => `<c:tx><c:v>${esc(name)}</c:v></c:tx>`;

const solidFill = (hex) => `<a:solidFill><a:srgbClr val="${hex}"/></a:solidFill>`;

const axTitle = (text, vertical = false) =>
  `<c:title><c:tx><c:rich><a:bodyPr${vertical ? ' rot="-5400000" vert="horz"' : ''}/><a:lstStyle/>` +
  `<a:p><a:pPr><a:defRPr sz="1000" b="0"/></a:pPr><a:r><a:rPr lang="en-GB" sz="1000"/><a:t>${esc(text)}</a:t></a:r></a:p>` +
  `</c:rich></c:tx><c:overlay val="0"/></c:title>`;

/** Category axis (CT_CatAx child order: axId, scaling, delete, axPos, [title], [tickLblPos], crossAx). */
const catAx = (id, crossId, pos, { orientation = 'minMax' } = {}) =>
  `<c:catAx><c:axId val="${id}"/><c:scaling><c:orientation val="${orientation}"/></c:scaling>` +
  `<c:delete val="0"/><c:axPos val="${pos}"/><c:tickLblPos val="low"/><c:crossAx val="${crossId}"/></c:catAx>`;

/** Value axis (CT_ValAx child order: axId, scaling, delete, axPos, majorGridlines, title, numFmt, tickLblPos, crossAx). */
const valAx = (id, crossId, pos, { min, max, title, fmt = 'General', gridlines = true } = {}) =>
  `<c:valAx><c:axId val="${id}"/><c:scaling><c:orientation val="minMax"/>` +
  (max != null ? `<c:max val="${max}"/>` : '') +
  (min != null ? `<c:min val="${min}"/>` : '') +
  `</c:scaling><c:delete val="0"/><c:axPos val="${pos}"/>` +
  (gridlines ? `<c:majorGridlines><c:spPr><a:ln w="9525"><a:solidFill><a:srgbClr val="E3E9EE"/></a:solidFill></a:ln></c:spPr></c:majorGridlines>` : '') +
  (title ? axTitle(title, pos === 'l') : '') +
  `<c:numFmt formatCode="${fmt}" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="${crossId}"/></c:valAx>`;

const chartSpace = (inner) =>
  `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
  `<c:chartSpace xmlns:c="${C}" xmlns:a="${A}" xmlns:r="${R}"><c:lang val="en-GB"/><c:chart>` +
  `<c:autoTitleDeleted val="1"/><c:plotArea><c:layout/>${inner.plot}</c:plotArea>` +
  (inner.legend ? `<c:legend><c:legendPos val="t"/><c:overlay val="0"/></c:legend>` : '') +
  `<c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart></c:chartSpace>`;

/**
 * Diverging horizontal bar chart: two series (surplus / deficit) over one
 * category axis; overlap 100 so each category shows the one series that has
 * a value. CT_BarSer child order: idx, order, tx, spPr, cat, val.
 */
function barChartXml({ cats, catRange, series, valueFmt, catOrientation = 'maxMin', legend }) {
  const axCat = 3001, axVal = 3002;
  const sers = series
    .map(
      (s, i) =>
        `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${seriesName(s.name)}` +
        `<c:spPr>${solidFill(s.color)}<a:ln><a:noFill/></a:ln></c:spPr>` +
        `<c:cat>${strRef(catRange, cats)}</c:cat><c:val>${numRef(s.range, s.values, valueFmt)}</c:val></c:ser>`,
    )
    .join('');
  return chartSpace({
    plot:
      `<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="0"/>${sers}` +
      `<c:gapWidth val="50"/><c:overlap val="100"/><c:axId val="${axCat}"/><c:axId val="${axVal}"/></c:barChart>` +
      catAx(axCat, axVal, 'l', { orientation: catOrientation }) +
      valAx(axVal, axCat, 'b', { fmt: valueFmt }),
    legend,
  });
}

/**
 * Scatter chart (markers only). CT_ScatterSer child order: idx, order, tx,
 * spPr, marker, xVal, yVal, smooth.
 */
function scatterChartXml({ series, xTitle, yTitle }) {
  const axX = 4001, axY = 4002;
  const sers = series
    .map(
      (s, i) =>
        `<c:ser><c:idx val="${i}"/><c:order val="${i}"/>${seriesName(s.name)}` +
        `<c:spPr><a:ln w="19050"><a:noFill/></a:ln></c:spPr>` +
        `<c:marker><c:symbol val="circle"/><c:size val="8"/><c:spPr>${solidFill(s.color)}<a:ln w="9525"><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill></a:ln></c:spPr></c:marker>` +
        `<c:xVal>${numRef(s.xRange, s.x)}</c:xVal><c:yVal>${numRef(s.yRange, s.y)}</c:yVal><c:smooth val="0"/></c:ser>`,
    )
    .join('');
  return chartSpace({
    plot:
      `<c:scatterChart><c:scatterStyle val="lineMarker"/><c:varyColors val="0"/>${sers}` +
      `<c:axId val="${axX}"/><c:axId val="${axY}"/></c:scatterChart>` +
      valAx(axX, axY, 'b', { min: 0, max: 100, title: xTitle }) +
      valAx(axY, axX, 'l', { min: 0, max: 100, title: yTitle }),
    legend: true,
  });
}

/* ------------------------------------------------------------ zip helpers */

function anchorXml(anchors) {
  const frames = anchors
    .map(
      (a2, i) =>
        `<xdr:oneCellAnchor><xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff>` +
        `<xdr:row>${a2.row0}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
        `<xdr:ext cx="${a2.wPx * EMU_PER_PX}" cy="${a2.hPx * EMU_PER_PX}"/>` +
        `<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${i + 10}" name="${esc(a2.name)}"/>` +
        `<xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>` +
        `<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>` +
        `<xdr:graphic><a:graphicData uri="${C}"><c:chart xmlns:c="${C}" xmlns:r="${R}" r:id="rId${i + 1}"/></a:graphicData></xdr:graphic>` +
        `</xdr:graphicFrame><xdr:clientData/></xdr:oneCellAnchor>`,
    )
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><xdr:wsDr xmlns:xdr="${XDR}" xmlns:a="${A}">${frames}</xdr:wsDr>`;
}

/**
 * Inject the three native charts into the written workbook buffer.
 * spec: { sheetName, charts: { balance, risk, imports } } — see the build script.
 * Returns the modified buffer.
 */
export async function injectNativeCharts(buffer, spec) {
  const zip = await JSZip.loadAsync(buffer);

  /* Resolve the Figures sheet part. */
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  const sheetTag = wbXml.match(new RegExp(`<sheet[^>]*name="${spec.sheetName}"[^>]*/>`));
  if (!sheetTag) throw new Error(`Sheet "${spec.sheetName}" not found in workbook.xml`);
  const rid = sheetTag[0].match(/r:id="(rId\d+)"/)[1];
  const wbRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  const target = wbRels.match(new RegExp(`<Relationship[^>]*Id="${rid}"[^>]*Target="([^"]+)"`))[1];
  const sheetPath = `xl/${target.replace(/^\//, '')}`;
  const sheetFile = sheetPath.split('/').pop();

  /* Next free drawing index (the method-figure image already owns one). */
  const drawingIdx =
    Math.max(0, ...Object.keys(zip.files).map((n) => Number(n.match(/^xl\/drawings\/drawing(\d+)\.xml$/)?.[1] ?? 0))) + 1;
  const chartBase =
    Math.max(0, ...Object.keys(zip.files).map((n) => Number(n.match(/^xl\/charts\/chart(\d+)\.xml$/)?.[1] ?? 0)));

  const { balance, risk, imports } = spec.charts;
  const chartXmls = [
    barChartXml({
      cats: balance.cats, catRange: balance.catRange,
      series: [
        { name: 'Surplus', color: '00846C', range: balance.surplusRange, values: balance.surplus },
        { name: 'Deficit', color: 'B83230', range: balance.deficitRange, values: balance.deficit },
      ],
      valueFmt: '#,##0', legend: true,
    }),
    scatterChartXml({
      series: [
        { name: 'Critical raw material', color: '2B6E9F', xRange: risk.materials.xRange, yRange: risk.materials.yRange, x: risk.materials.x, y: risk.materials.y },
        { name: 'Manufactured product', color: 'D97A22', xRange: risk.products.xRange, yRange: risk.products.yRange, x: risk.products.x, y: risk.products.y },
      ],
      xTitle: risk.xTitle, yTitle: risk.yTitle,
    }),
    barChartXml({
      cats: imports.cats, catRange: imports.catRange,
      series: [{ name: 'Import content of final demand %', color: '2B6E9F', range: imports.valRange, values: imports.values }],
      valueFmt: '0.0', legend: false,
    }),
  ];
  chartXmls.forEach((xml, i) => zip.file(`xl/charts/chart${chartBase + i + 1}.xml`, xml));

  /* Drawing part + its rels. */
  zip.file(
    `xl/drawings/drawing${drawingIdx}.xml`,
    anchorXml([
      { row0: balance.anchorRow, wPx: 940, hPx: 880, name: 'Trade balance chart' },
      { row0: risk.anchorRow, wPx: 940, hPx: 660, name: 'Import-dependency map' },
      { row0: imports.anchorRow, wPx: 940, hPx: 460, name: 'Import content chart' },
    ]),
  );
  zip.file(
    `xl/drawings/_rels/drawing${drawingIdx}.xml.rels`,
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
      chartXmls
        .map(
          (_x, i) =>
            `<Relationship Id="rId${i + 1}" Type="${R}/chart" Target="../charts/chart${chartBase + i + 1}.xml"/>`,
        )
        .join('') +
      `</Relationships>`,
  );

  /* Wire the drawing into the sheet (rels + <drawing/> element). */
  const sheetRelsPath = `xl/worksheets/_rels/${sheetFile}.rels`;
  const existingRels = zip.file(sheetRelsPath) ? await zip.file(sheetRelsPath).async('string') : null;
  let drawingRid;
  if (existingRels) {
    const maxRid = Math.max(0, ...[...existingRels.matchAll(/Id="rId(\d+)"/g)].map((m2) => Number(m2[1])));
    drawingRid = `rId${maxRid + 1}`;
    zip.file(
      sheetRelsPath,
      existingRels.replace(
        '</Relationships>',
        `<Relationship Id="${drawingRid}" Type="${R}/drawing" Target="../drawings/drawing${drawingIdx}.xml"/></Relationships>`,
      ),
    );
  } else {
    drawingRid = 'rId1';
    zip.file(
      sheetRelsPath,
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
        `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        `<Relationship Id="${drawingRid}" Type="${R}/drawing" Target="../drawings/drawing${drawingIdx}.xml"/></Relationships>`,
    );
  }
  const sheetXml = await zip.file(sheetPath).async('string');
  if (/<drawing /.test(sheetXml)) throw new Error(`${sheetPath} already has a drawing — unexpected`);
  zip.file(sheetPath, sheetXml.replace('</worksheet>', `<drawing r:id="${drawingRid}"/></worksheet>`));

  /* Content types. */
  const ctPath = '[Content_Types].xml';
  const ct = await zip.file(ctPath).async('string');
  const additions =
    `<Override PartName="/xl/drawings/drawing${drawingIdx}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` +
    chartXmls
      .map(
        (_x, i) =>
          `<Override PartName="/xl/charts/chart${chartBase + i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
      )
      .join('');
  zip.file(ctPath, ct.replace('</Types>', `${additions}</Types>`));

  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}
