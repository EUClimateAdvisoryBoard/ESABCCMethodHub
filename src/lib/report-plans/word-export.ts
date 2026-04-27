/**
 * Report Reference Plan — DOCX export.
 * ------------------------------------
 * Builds a minimal Office Open XML (.docx) file using JSZip. Each
 * in-text citation is wrapped in a `<w:sdt>` structured-document tag
 * so the Word add-in can later round-trip edits back to the plan.
 *
 * Why roll our own instead of using docx.js / officegen:
 *   - We need deterministic output so `git diff` on exported
 *     samples is readable during review.
 *   - Our shape is trivially small (headings, paragraphs, SDTs for
 *     citations, a bibliography at the end). The dependency cost
 *     of a full Office library is not justified.
 *   - JSZip is already in the bundle for the browser-extension build.
 *
 * Each citation SDT carries:
 */
//     w:tag   = "CITE:<refId>"
//     w:alias = "Citation: <citation-key>"
//
// which is exactly the shape the ESABCC Word VBA add-in
// (word-vba/ESABCC_RefManager.bas) looks for — meaning the downloaded doc
// opens in Word with all references already "live" and the Bibliography
// button can rebuild the list from the tags.
//
// The bibliography section at the end renders each reference in a simple
// APA-like format with a clickable hyperlink to the DOI / URL.
// ---------------------------------------------------------------------------

import JSZip from 'jszip';
import type { PlanReference, ReportPlan } from './types';

// ─── XML helpers ────────────────────────────────────────────────────────────
function esc(s: string | undefined | null): string {
  if (!s) return '';
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function makeCiteKey(ref: PlanReference): string {
  const authorPart = (ref.authors || '')
    .split(/[,;]/)[0]
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, '') || 'unknown';
  const year = ref.year || 'nd';
  const titleWord = (ref.title || '')
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .find(w => w.length > 2 && !['the', 'and', 'for', 'with', 'from', 'into'].includes(w)) || '';
  return `${authorPart}${year}${titleWord}`;
}

function shortAuthor(authors: string): string {
  if (!authors) return '';
  // Grab the first surname from "Smith, J.; Müller, A." or "Smith, J."
  const first = authors.split(/[;,]/)[0].trim();
  return first;
}

// "(Smith et al., 2024)" / "(Smith & Müller, 2024)" / "(Smith, 2024)"
function formatInlineCitation(ref: PlanReference): string {
  const names = (ref.authors || '').split(/;\s*/).filter(Boolean);
  const y = ref.year || 'n.d.';
  if (names.length === 0) return `(${y})`;
  if (names.length === 1) return `(${shortAuthor(names[0])}, ${y})`;
  if (names.length === 2) return `(${shortAuthor(names[0])} & ${shortAuthor(names[1])}, ${y})`;
  return `(${shortAuthor(names[0])} et al., ${y})`;
}

function formatBibliographyEntry(ref: PlanReference): string {
  // APA-ish: "Authors (Year). Title. Journal, Volume(Issue), Pages. DOI/URL"
  const parts: string[] = [];
  if (ref.authors) parts.push(ref.authors);
  parts.push(`(${ref.year || 'n.d.'}).`);
  parts.push(`${ref.title || 'Untitled'}.`);
  if (ref.journal) {
    let j = ref.journal;
    if (ref.volume) j += `, ${ref.volume}`;
    if (ref.issue) j += `(${ref.issue})`;
    if (ref.pages) j += `, ${ref.pages}`;
    parts.push(`${j}.`);
  }
  return parts.join(' ').replace(/\s+/g, ' ').trim();
}

// ─── Paragraph builders ─────────────────────────────────────────────────────
function paragraph(text: string, opts: { style?: string; bold?: boolean } = {}): string {
  const styleTag = opts.style ? `<w:pStyle w:val="${opts.style}"/>` : '';
  const runProps = opts.bold ? '<w:rPr><w:b/></w:rPr>' : '';
  return (
    `<w:p><w:pPr>${styleTag}</w:pPr>` +
    `<w:r>${runProps}<w:t xml:space="preserve">${esc(text)}</w:t></w:r>` +
    `</w:p>`
  );
}

function heading(text: string, level: 1 | 2): string {
  return paragraph(text, { style: `Heading${level}` });
}

// Citation rendered as a Word Structured Document Tag (content control) so the
// Word VBA add-in recognises it.  Tag shape must match CITE_TAG_PREFIX="CITE:".
function citationSdt(ref: PlanReference, citeKey: string): string {
  const tag = `CITE:${ref.id}`;
  const alias = `Citation: ${citeKey}`;
  const display = formatInlineCitation(ref);
  return (
    `<w:sdt>` +
    `<w:sdtPr>` +
    `<w:alias w:val="${esc(alias)}"/>` +
    `<w:tag w:val="${esc(tag)}"/>` +
    `<w:appearance w:val="boundingBox"/>` +
    `</w:sdtPr>` +
    `<w:sdtContent>` +
    `<w:r><w:t xml:space="preserve">${esc(display)}</w:t></w:r>` +
    `</w:sdtContent>` +
    `</w:sdt>`
  );
}

// A paragraph that starts with the optional description and inlines all
// citations assigned to the section (comma-separated).  If the section has
// no references, we still add a placeholder so the writer has somewhere to
// start typing.
function sectionBodyParagraph(
  citations: { ref: PlanReference; citeKey: string }[],
  description: string | undefined,
): string {
  const runs: string[] = [];
  if (description) {
    runs.push(
      `<w:r><w:rPr><w:i/><w:color w:val="6B7280"/></w:rPr>` +
      `<w:t xml:space="preserve">${esc(description)} </w:t></w:r>`,
    );
  }
  if (citations.length === 0) {
    runs.push(
      `<w:r><w:rPr><w:color w:val="9CA3AF"/></w:rPr>` +
      `<w:t xml:space="preserve">[Add prose here. No references yet assigned to this section.]</w:t></w:r>`,
    );
  } else {
    runs.push(
      `<w:r><w:t xml:space="preserve">Relevant references: </w:t></w:r>`,
    );
    citations.forEach((c, i) => {
      if (i > 0) runs.push(`<w:r><w:t xml:space="preserve">; </w:t></w:r>`);
      runs.push(citationSdt(c.ref, c.citeKey));
    });
    runs.push(`<w:r><w:t xml:space="preserve">.</w:t></w:r>`);
  }
  return `<w:p>${runs.join('')}</w:p>`;
}

// Bibliography entry with an optional hyperlink to DOI/URL.
function bibliographyEntry(
  ref: PlanReference,
  hyperlinkRelId: string | null,
): string {
  const text = formatBibliographyEntry(ref);
  const linkHref = ref.doi ? `https://doi.org/${ref.doi}` : (ref.url || '');
  const runs: string[] = [];
  runs.push(`<w:r><w:t xml:space="preserve">${esc(text)}</w:t></w:r>`);
  if (linkHref && hyperlinkRelId) {
    runs.push(`<w:r><w:t xml:space="preserve"> </w:t></w:r>`);
    runs.push(
      `<w:hyperlink r:id="${hyperlinkRelId}">` +
      `<w:r><w:rPr><w:rStyle w:val="Hyperlink"/></w:rPr>` +
      `<w:t xml:space="preserve">${esc(linkHref)}</w:t></w:r>` +
      `</w:hyperlink>`,
    );
  }
  return `<w:p><w:pPr><w:pStyle w:val="Bibliography"/></w:pPr>${runs.join('')}</w:p>`;
}

// ─── Document skeleton ──────────────────────────────────────────────────────
const CONTENT_TYPES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
  <Override PartName="/word/settings.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.settings+xml"/>
</Types>`;

const ROOT_RELS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:docDefaults>
    <w:rPrDefault><w:rPr>
      <w:rFonts w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Calibri"/>
      <w:sz w:val="22"/>
    </w:rPr></w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:spacing w:before="240" w:after="120"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="40"/><w:color w:val="1F2937"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:spacing w:before="320" w:after="120"/><w:outlineLvl w:val="0"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="30"/><w:color w:val="007B6C"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:pPr><w:spacing w:before="240" w:after="80"/><w:outlineLvl w:val="1"/></w:pPr>
    <w:rPr><w:rFonts w:ascii="Calibri" w:hAnsi="Calibri"/><w:b/><w:sz w:val="26"/><w:color w:val="3D5265"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Bibliography">
    <w:name w:val="Bibliography"/>
    <w:pPr><w:spacing w:after="120"/><w:ind w:left="360" w:hanging="360"/></w:pPr>
    <w:rPr><w:sz w:val="20"/></w:rPr>
  </w:style>
  <w:style w:type="character" w:styleId="Hyperlink">
    <w:name w:val="Hyperlink"/>
    <w:rPr><w:color w:val="1D4ED8"/><w:u w:val="single"/></w:rPr>
  </w:style>
</w:styles>`;

const SETTINGS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:zoom w:percent="100"/>
  <w:defaultTabStop w:val="720"/>
</w:settings>`;

// Build document.xml + document.xml.rels.  Returns both strings.
function buildDocumentXml(plan: ReportPlan): { documentXml: string; relsXml: string } {
  // Build a reference lookup
  const refById = new Map<string, PlanReference>();
  for (const r of plan.references) refById.set(r.id, r);

  // Assign unique cite keys (handle collisions by appending a letter).
  const keyCount = new Map<string, number>();
  const citeKeyFor = new Map<string, string>();
  for (const r of plan.references) {
    const base = makeCiteKey(r);
    const n = keyCount.get(base) || 0;
    keyCount.set(base, n + 1);
    const key = n === 0 ? base : `${base}${String.fromCharCode(96 + n)}`;
    citeKeyFor.set(r.id, key);
  }

  // Hyperlink relationships: one per reference with a DOI or URL.  Stored in
  // word/_rels/document.xml.rels and referenced via r:id in <w:hyperlink>.
  const rels: { id: string; target: string }[] = [];
  let relCounter = 100;
  const relIdFor = new Map<string, string>();
  for (const r of plan.references) {
    const target = r.doi ? `https://doi.org/${r.doi}` : (r.url || '');
    if (target) {
      const rid = `rId${relCounter++}`;
      rels.push({ id: rid, target });
      relIdFor.set(r.id, rid);
    }
  }

  const parts: string[] = [];
  parts.push(paragraph(plan.name, { style: 'Title' }));
  if (plan.description) {
    parts.push(paragraph(plan.description));
  }
  parts.push(paragraph(`Generated ${new Date().toLocaleDateString()}. ${plan.references.length} references across ${plan.sections.length} sections.`));

  // Per-section content
  for (const section of plan.sections) {
    parts.push(heading(section.title, 1));
    const sectionCites = section.referenceIds
      .map(id => {
        const ref = refById.get(id);
        if (!ref) return null;
        return { ref, citeKey: citeKeyFor.get(ref.id) || ref.id };
      })
      .filter((x): x is { ref: PlanReference; citeKey: string } => x !== null);
    parts.push(sectionBodyParagraph(sectionCites, section.description));
  }

  // Bibliography
  parts.push(heading('References', 1));
  if (plan.references.length === 0) {
    parts.push(paragraph('No references in this plan yet.'));
  } else {
    // Sort by first author, year
    const sorted = [...plan.references].sort((a, b) => {
      const aAuth = shortAuthor(a.authors || '').toLowerCase();
      const bAuth = shortAuthor(b.authors || '').toLowerCase();
      if (aAuth !== bAuth) return aAuth.localeCompare(bAuth);
      return (a.year || '').localeCompare(b.year || '');
    });
    for (const r of sorted) {
      parts.push(bibliographyEntry(r, relIdFor.get(r.id) || null));
    }
  }

  const documentXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<w:document ` +
    `xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" ` +
    `xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<w:body>${parts.join('')}` +
    `<w:sectPr><w:pgSz w:w="12240" w:h="15840"/>` +
    `<w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440"/>` +
    `</w:sectPr>` +
    `</w:body></w:document>`;

  const relsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>` +
    rels
      .map(
        r =>
          `<Relationship Id="${r.id}" ` +
          `Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" ` +
          `Target="${esc(r.target)}" TargetMode="External"/>`,
      )
      .join('') +
    `</Relationships>`;

  return { documentXml, relsXml };
}

export async function buildDocxBlob(plan: ReportPlan): Promise<Blob> {
  const { documentXml, relsXml } = buildDocumentXml(plan);

  const zip = new JSZip();
  zip.file('[Content_Types].xml', CONTENT_TYPES_XML);
  zip.folder('_rels')!.file('.rels', ROOT_RELS_XML);
  const wordDir = zip.folder('word')!;
  wordDir.file('document.xml', documentXml);
  wordDir.file('styles.xml', STYLES_XML);
  wordDir.file('settings.xml', SETTINGS_XML);
  wordDir.folder('_rels')!.file('document.xml.rels', relsXml);

  return await zip.generateAsync({
    type: 'blob',
    mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

export function downloadDocx(plan: ReportPlan) {
  return buildDocxBlob(plan).then(blob => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = plan.name.replace(/[^a-z0-9\- ]/gi, '').replace(/\s+/g, '-') || 'report-plan';
    a.href = url;
    a.download = `${safeName}.docx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });
}
