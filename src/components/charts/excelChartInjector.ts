'use client';

import JSZip from 'jszip';

const CHART_COLORS = [
  '003399', '007B6C', 'FF9933', 'B83230', 'A530B8', '0065A4', '54728C', '6667AB',
];

interface ChartSheetInfo {
  sheetName: string;  // Actual Excel worksheet tab name
  title: string;
  dataStartRow: number;
  dataEndRow: number;
  dataStartCol: number;
  dataEndCol: number;
  seriesCount: number;
  years: number[];
  unit: string;
}

/**
 * Inject native Excel line charts into an XLSX buffer.
 * Finds sheets by name in workbook.xml, then adds chart + drawing XML.
 */
export async function injectExcelCharts(
  xlsxBuffer: ArrayBuffer,
  chartInfos: ChartSheetInfo[]
): Promise<ArrayBuffer> {
  const zip = await JSZip.loadAsync(xlsxBuffer);

  // Parse workbook.xml.rels to find sheet rId → file mappings
  const wbRelsStr = await zip.file('xl/_rels/workbook.xml.rels')?.async('string');
  if (!wbRelsStr) return xlsxBuffer;

  // Parse workbook.xml to find sheet name → rId mappings
  const wbStr = await zip.file('xl/workbook.xml')?.async('string');
  if (!wbStr) return xlsxBuffer;

  // Extract sheet entries: { name, rId, file }
  const sheetEntries: { name: string; rId: string; file: string }[] = [];
  const sheetRegex = /<sheet[^>]+name="([^"]+)"[^>]+r:id="([^"]+)"[^>]*\/>/g;
  let m;
  while ((m = sheetRegex.exec(wbStr)) !== null) {
    const name = m[1].replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&apos;/g, "'").replace(/&quot;/g, '"');
    const rId = m[2];
    // Find the file for this rId in rels
    const relRegex = new RegExp(`<Relationship[^>]+Id="${rId}"[^>]+Target="([^"]+)"`, 'g');
    const rm = relRegex.exec(wbRelsStr);
    if (rm) {
      // Target is relative to xl/, e.g., "worksheets/sheet1.xml"
      sheetEntries.push({ name, rId, file: rm[1] });
    }
  }

  let contentTypesStr = await zip.file('[Content_Types].xml')!.async('string');
  const newContentTypes: string[] = [];
  let chartNum = 0;

  for (const info of chartInfos) {
    // Find the sheet entry by name
    const entry = sheetEntries.find(e => e.name === info.sheetName);
    if (!entry) {
      console.warn(`Chart injection: sheet "${info.sheetName}" not found in workbook`);
      continue;
    }

    chartNum++;
    const drawingNum = chartNum;
    const chartPath = `xl/charts/chart${chartNum}.xml`;
    const drawingPath = `xl/drawings/drawing${drawingNum}.xml`;
    const drawingRelsPath = `xl/drawings/_rels/drawing${drawingNum}.xml.rels`;
    // Sheet rels path matches the sheet file path
    const sheetFile = entry.file; // e.g., "worksheets/sheet2.xml"
    const sheetRelsDir = sheetFile.replace(/([^/]+)$/, '_rels/$1.rels');
    const sheetRelsPath = `xl/${sheetRelsDir}`;
    const sheetFullPath = `xl/${sheetFile}`;

    // 1. Chart XML
    zip.file(chartPath, generateLineChartXml(info, chartNum));

    // 2. Drawing XML
    zip.file(drawingPath, generateDrawingXml(chartNum, info));

    // 3. Drawing rels → chart
    zip.file(drawingRelsPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${chartNum}.xml"/>
</Relationships>`);

    // 4. Sheet rels → drawing
    const drawingRelId = `rIdChart${chartNum}`;
    const existingSheetRels = zip.file(sheetRelsPath);
    if (existingSheetRels) {
      let rels = await existingSheetRels.async('string');
      rels = rels.replace('</Relationships>',
        `<Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingNum}.xml"/>
</Relationships>`);
      zip.file(sheetRelsPath, rels);
    } else {
      zip.file(sheetRelsPath, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="${drawingRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${drawingNum}.xml"/>
</Relationships>`);
    }

    // 5. Add <drawing> to sheet XML
    const sheetXmlFile = zip.file(sheetFullPath);
    if (sheetXmlFile) {
      let xml = await sheetXmlFile.async('string');
      if (!xml.includes('<drawing')) {
        // Must add xmlns:r if not present
        if (!xml.includes('xmlns:r=')) {
          xml = xml.replace('<worksheet', '<worksheet xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"');
        }
        // <drawing> must come after </sheetData> and before </worksheet>
        xml = xml.replace('</worksheet>', `<drawing r:id="${drawingRelId}"/></worksheet>`);
        zip.file(sheetFullPath, xml);
      }
    }

    newContentTypes.push(
      `<Override PartName="/${chartPath}" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
      `<Override PartName="/${drawingPath}" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`
    );
  }

  // 6. Update content types
  if (newContentTypes.length > 0) {
    contentTypesStr = contentTypesStr.replace('</Types>', newContentTypes.join('\n') + '\n</Types>');
    zip.file('[Content_Types].xml', contentTypesStr);
  }

  return zip.generateAsync({ type: 'arraybuffer' });
}

function colLetter(col: number): string {
  let s = '';
  let c = col;
  while (c >= 0) {
    s = String.fromCharCode(65 + (c % 26)) + s;
    c = Math.floor(c / 26) - 1;
  }
  return s;
}

function generateLineChartXml(info: ChartSheetInfo, chartNum: number): string {
  const sn = info.sheetName.replace(/'/g, "''"); // Excel escaping for sheet names with quotes
  const maxSeries = Math.min(info.seriesCount, 10);
  const catStartCol = colLetter(info.dataStartCol);
  const catEndCol = colLetter(info.dataEndCol);
  const catRef = `'${sn}'!$${catStartCol}$${info.dataStartRow}:$${catEndCol}$${info.dataStartRow}`;

  let seriesXml = '';
  for (let s = 0; s < maxSeries; s++) {
    const dataRow = info.dataStartRow + 1 + s;
    if (dataRow > info.dataEndRow) break;
    const color = CHART_COLORS[s % CHART_COLORS.length];
    const labelRef = `'${sn}'!$A$${dataRow}`;
    const valRef = `'${sn}'!$${catStartCol}$${dataRow}:$${catEndCol}$${dataRow}`;

    seriesXml += `
      <c:ser>
        <c:idx val="${s}"/><c:order val="${s}"/>
        <c:tx><c:strRef><c:f>${escXml(labelRef)}</c:f></c:strRef></c:tx>
        <c:spPr><a:ln w="22225"><a:solidFill><a:srgbClr val="${color}"/></a:solidFill></a:ln></c:spPr>
        <c:marker><c:symbol val="none"/></c:marker>
        <c:cat><c:numRef><c:f>${escXml(catRef)}</c:f></c:numRef></c:cat>
        <c:val><c:numRef><c:f>${escXml(valRef)}</c:f></c:numRef></c:val>
        <c:smooth val="0"/>
      </c:ser>`;
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart"
              xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
              xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <c:chart>
    <c:title>
      <c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p>
        <a:pPr><a:defRPr sz="1100" b="1"><a:solidFill><a:srgbClr val="003399"/></a:solidFill></a:defRPr></a:pPr>
        <a:r><a:rPr lang="en-US" sz="1100" b="1"><a:solidFill><a:srgbClr val="003399"/></a:solidFill></a:rPr><a:t>${escXml(info.title)}</a:t></a:r>
      </a:p></c:rich></c:tx>
      <c:overlay val="0"/>
    </c:title>
    <c:autoTitleDeleted val="0"/>
    <c:plotArea>
      <c:layout/>
      <c:lineChart>
        <c:grouping val="standard"/>
        <c:varyColors val="0"/>
        ${seriesXml}
        <c:marker val="0"/>
      </c:lineChart>
      <c:catAx>
        <c:axId val="${1000 + chartNum}"/><c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/><c:axPos val="b"/><c:crossAx val="${2000 + chartNum}"/>
      </c:catAx>
      <c:valAx>
        <c:axId val="${2000 + chartNum}"/><c:scaling><c:orientation val="minMax"/></c:scaling>
        <c:delete val="0"/><c:axPos val="l"/>
        <c:title><c:tx><c:rich><a:bodyPr rot="-5400000" vert="horz"/><a:lstStyle/><a:p>
          <a:pPr><a:defRPr sz="900"/></a:pPr>
          <a:r><a:rPr lang="en-US" sz="900"/><a:t>${escXml(info.unit)}</a:t></a:r>
        </a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
        <c:crossAx val="${1000 + chartNum}"/>
      </c:valAx>
    </c:plotArea>
    <c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend>
    <c:plotVisOnly val="1"/>
  </c:chart>
</c:chartSpace>`;
}

function generateDrawingXml(chartNum: number, info: ChartSheetInfo): string {
  const startRow = info.dataEndRow + 3;
  const endRow = startRow + 20;
  const endCol = Math.max(info.dataEndCol + 1, 10);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing"
          xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
          xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <xdr:twoCellAnchor>
    <xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${startRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
    <xdr:to><xdr:col>${endCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${endRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
    <xdr:graphicFrame macro="">
      <xdr:nvGraphicFramePr>
        <xdr:cNvPr id="${chartNum + 1}" name="Chart ${chartNum}"/>
        <xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr>
      </xdr:nvGraphicFramePr>
      <xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
      <a:graphic>
        <a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">
          <c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/>
        </a:graphicData>
      </a:graphic>
    </xdr:graphicFrame>
    <xdr:clientData/>
  </xdr:twoCellAnchor>
</xdr:wsDr>`;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export type { ChartSheetInfo };
