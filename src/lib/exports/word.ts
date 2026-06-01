/**
 * Minimal Word (.docx) writer.
 * ----------------------------
 * Produces a genuine OOXML WordprocessingML package (not an HTML-with-a-
 * .doc-extension hack) using JSZip, which is already a project dependency.
 * Supports the handful of block types the Project Workspace needs to turn
 * a module's content into a shareable document:
 *
 *   • headings (levels 1–3)
 *   • paragraphs (with optional bold / italic runs)
 *   • bullet lists
 *   • simple tables (header row + body rows)
 *
 * The goal is a file colleagues with no coding experience can open in
 * Word / LibreOffice and edit, so we keep styling conservative and rely
 * on Word's built-in Heading/Normal styles.
 */
'use client';

import JSZip from 'jszip';
import { saveAs } from 'file-saver';

export type DocBlock =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string; bold?: boolean; italic?: boolean }
  | { type: 'bullets'; items: string[] }
  | { type: 'table'; headers: string[]; rows: (string | number | null)[][] }
  | { type: 'spacer' };

function esc(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Split text on newlines into <w:br/>-separated runs inside one run group. */
function runs(text: string, opts?: { bold?: boolean; italic?: boolean }): string {
  const rPr =
    opts?.bold || opts?.italic
      ? `<w:rPr>${opts.bold ? '<w:b/>' : ''}${opts.italic ? '<w:i/>' : ''}</w:rPr>`
      : '';
  const segments = String(text).split(/\r?\n/);
  return segments
    .map((seg, i) => {
      const br = i > 0 ? '<w:br/>' : '';
      return `<w:r>${rPr}${br}<w:t xml:space="preserve">${esc(seg)}</w:t></w:r>`;
    })
    .join('');
}

function paragraph(text: string, opts?: { bold?: boolean; italic?: boolean; style?: string }): string {
  const pPr = opts?.style ? `<w:pPr><w:pStyle w:val="${opts.style}"/></w:pPr>` : '';
  return `<w:p>${pPr}${runs(text, opts)}</w:p>`;
}

function headingXml(level: 1 | 2 | 3, text: string): string {
  return `<w:p><w:pPr><w:pStyle w:val="Heading${level}"/></w:pPr>${runs(text, { bold: true })}</w:p>`;
}

function bulletXml(items: string[]): string {
  return items
    .map(
      it =>
        `<w:p><w:pPr><w:pStyle w:val="ListParagraph"/><w:numPr><w:ilvl w:val="0"/><w:numId w:val="1"/></w:numPr></w:pPr>${runs(
          it
        )}</w:p>`
    )
    .join('');
}

function tableXml(headers: string[], rows: (string | number | null)[][]): string {
  const cell = (text: string, header: boolean) =>
    `<w:tc><w:tcPr><w:tcBorders><w:top w:val="single" w:sz="4" w:color="DDDDDD"/><w:bottom w:val="single" w:sz="4" w:color="DDDDDD"/><w:left w:val="single" w:sz="4" w:color="DDDDDD"/><w:right w:val="single" w:sz="4" w:color="DDDDDD"/></w:tcBorders>${
      header ? '<w:shd w:val="clear" w:color="auto" w:fill="003399"/>' : ''
    }</w:tcPr><w:p>${runs(text, header ? { bold: true } : undefined)}</w:p></w:tc>`;
  const headerRow = `<w:tr>${headers
    .map(h => cell(h, true))
    .join('')}</w:tr>`;
  const bodyRows = rows
    .map(
      r =>
        `<w:tr>${headers
          .map((_, ci) => cell(r[ci] == null ? '' : String(r[ci]), false))
          .join('')}</w:tr>`
    )
    .join('');
  return `<w:tbl><w:tblPr><w:tblStyle w:val="TableGrid"/><w:tblW w:w="0" w:type="auto"/></w:tblPr>${headerRow}${bodyRows}</w:tbl>`;
}

function blockToXml(b: DocBlock): string {
  switch (b.type) {
    case 'heading':
      return headingXml(b.level, b.text);
    case 'paragraph':
      return paragraph(b.text, { bold: b.bold, italic: b.italic });
    case 'bullets':
      return bulletXml(b.items);
    case 'table':
      return tableXml(b.headers, b.rows);
    case 'spacer':
      return '<w:p/>';
    default:
      return '';
  }
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:sz w:val="22"/></w:rPr></w:rPrDefault></w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/></w:style>
  <w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="heading 1"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr><w:rPr><w:b/><w:color w:val="003399"/><w:sz w:val="36"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="heading 2"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="200" w:after="100"/></w:pPr><w:rPr><w:b/><w:color w:val="0065A4"/><w:sz w:val="28"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="Heading3"><w:name w:val="heading 3"/><w:basedOn w:val="Normal"/><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr><w:rPr><w:b/><w:color w:val="54728C"/><w:sz w:val="24"/></w:rPr></w:style>
  <w:style w:type="paragraph" w:styleId="ListParagraph"><w:name w:val="List Paragraph"/><w:basedOn w:val="Normal"/><w:pPr><w:ind w:left="720"/></w:pPr></w:style>
  <w:style w:type="table" w:styleId="TableGrid"><w:name w:val="Table Grid"/><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="DDDDDD"/><w:left w:val="single" w:sz="4" w:color="DDDDDD"/><w:bottom w:val="single" w:sz="4" w:color="DDDDDD"/><w:right w:val="single" w:sz="4" w:color="DDDDDD"/><w:insideH w:val="single" w:sz="4" w:color="DDDDDD"/><w:insideV w:val="single" w:sz="4" w:color="DDDDDD"/></w:tblBorders></w:tblPr></w:style>
</w:styles>`;

const NUMBERING_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="bullet"/><w:lvlText w:val="•"/><w:lvlJc w:val="left"/><w:pPr><w:ind w:left="720" w:hanging="360"/></w:pPr></w:lvl></w:abstractNum>
  <w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num>
</w:numbering>`;

const CONTENT_TYPES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>
</Types>`;

const ROOT_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const DOC_RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>
</Relationships>`;

/** Build the .docx Blob from a list of blocks. */
export async function buildDocxBlob(blocks: DocBlock[]): Promise<Blob> {
  const body = blocks.map(blockToXml).join('');
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/></w:sectPr></w:body>
</w:document>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES);
  zip.folder('_rels')!.file('.rels', ROOT_RELS);
  const word = zip.folder('word')!;
  word.file('document.xml', documentXml);
  word.file('styles.xml', STYLES_XML);
  word.file('numbering.xml', NUMBERING_XML);
  word.folder('_rels')!.file('document.xml.rels', DOC_RELS);

  return zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

/** Build and download a .docx from a list of blocks. */
export async function downloadWord(filename: string, blocks: DocBlock[]): Promise<void> {
  const blob = await buildDocxBlob(blocks);
  saveAs(blob, filename.endsWith('.docx') ? filename : `${filename}.docx`);
}
