// ============================================================================
// Word Add-in Citation Engine — Insert, Scan, Update Citations in Word
// Uses Content Controls + Custom XML Parts
// ============================================================================

import { RefSearchResult, getReferencesByIds, formatBibliography, formatInlineCitations, recordCitationUsage } from './api';

// ── Types ──

export interface CitationData {
  refId: string;
  citationKey: string;
  cslJson: any;
  formattedText: string;
}

export interface DocumentCitation {
  refId: string;
  citationKey: string;
  formattedText: string;
  isMulti: boolean;
}

// ── Constants ──
const CITE_TAG_PREFIX = 'CITE:';
const BIB_TAG = 'REFMANAGER:BIBLIOGRAPHY';
const XML_NAMESPACE = 'http://esabcc.refmanager/citations';

// Best-effort document identifier for the citations_used log. Uses the
// document URL when Office exposes it (saved files); otherwise falls back to
// the document title. Both are stable enough across saves for analytics.
function getDocumentKey(): string {
  try {
    const ctx = (Office as any)?.context?.document;
    const url = ctx?.url;
    if (typeof url === 'string' && url) return url;
    const title = ctx?.title;
    if (typeof title === 'string' && title) return `title:${title}`;
  } catch {
    // ignore — fall through
  }
  return 'unknown-document';
}

function logCitationUsage(citation: CitationData): void {
  const csl: any = citation.cslJson || {};
  void recordCitationUsage({
    reference_id: citation.refId,
    document_key: getDocumentKey(),
    doi: typeof csl.DOI === 'string' ? csl.DOI : null,
    funding: Array.isArray(csl.funder) ? csl.funder : null,
  });
}

// ── Insert Single Citation ──

export async function insertCitation(
  citation: CitationData,
  styleId: string
): Promise<void> {
  // Format citation text using the style
  const formatted = await formatInlineCitations([citation.cslJson], styleId);
  const displayText = formatted[0] || citation.formattedText;

  await Word.run(async (context) => {
    const range = context.document.getSelection();
    const contentControl = range.insertContentControl();

    contentControl.insertText(displayText, Word.InsertLocation.replace);
    contentControl.tag = `${CITE_TAG_PREFIX}${citation.refId}`;
    contentControl.title = `Citation: ${citation.citationKey}`;
    contentControl.appearance = Word.ContentControlAppearance.boundingBox;
    contentControl.color = '#4472C4';
    contentControl.cannotEdit = true;

    await context.sync();
  });

  // Store citation data in Custom XML Part
  await storeCitationInXml(citation);

  // Log usage so the EU-funded share of references in this report can be
  // computed without re-extracting DOIs from the finished document.
  logCitationUsage(citation);
}

// ── Insert Multi-Citation (e.g., "(Smith, 2024; Jones, 2023)") ──

export async function insertMultiCitation(
  citations: CitationData[],
  styleId: string
): Promise<void> {
  if (citations.length === 0) return;

  // Format as group citation
  const cslItems = citations.map(c => c.cslJson);
  const formatted = await formatInlineCitations(cslItems, styleId);

  // Build combined display text: "(Author1, Year; Author2, Year)"
  // For a proper grouped citation, join with "; "
  const innerTexts = formatted.map(f => f.replace(/^\(/, '').replace(/\)$/, ''));
  const displayText = `(${innerTexts.join('; ')})`;

  const refIds = citations.map(c => c.refId).join(',');
  const keys = citations.map(c => c.citationKey).join(', ');

  await Word.run(async (context) => {
    const range = context.document.getSelection();
    const contentControl = range.insertContentControl();

    contentControl.insertText(displayText, Word.InsertLocation.replace);
    contentControl.tag = `${CITE_TAG_PREFIX}${refIds}`;
    contentControl.title = `Citation: ${keys}`;
    contentControl.appearance = Word.ContentControlAppearance.boundingBox;
    contentControl.color = '#4472C4';
    contentControl.cannotEdit = true;

    await context.sync();
  });

  // Store all citations in XML
  for (const citation of citations) {
    await storeCitationInXml(citation);
  }

  // Log every citation in the group as a separate usage row.
  for (const citation of citations) {
    logCitationUsage(citation);
  }
}

// ── Store Citation in Custom XML Parts ──

async function storeCitationInXml(citation: CitationData): Promise<void> {
  await Word.run(async (context) => {
    const xmlParts = context.document.customXmlParts;
    const existingParts = xmlParts.getByNamespace(XML_NAMESPACE);
    context.load(existingParts, 'items');
    await context.sync();

    const escapedJson = escapeXml(JSON.stringify(citation.cslJson));

    if (existingParts.items.length > 0) {
      // Read existing XML, add this citation
      const part = existingParts.items[0];
      const xml = part.getXml();
      await context.sync();

      // Parse and update
      const parser = new DOMParser();
      const doc = parser.parseFromString(xml.value, 'text/xml');
      const citationsEl = doc.getElementsByTagName('citations')[0];

      if (citationsEl) {
        // Check if citation already exists
        const existing = citationsEl.querySelector(`citation[id="${citation.refId}"]`);
        if (existing) {
          existing.textContent = escapedJson;
        } else {
          const citeEl = doc.createElement('citation');
          citeEl.setAttribute('id', citation.refId);
          citeEl.setAttribute('key', citation.citationKey);
          citeEl.textContent = escapedJson;
          citationsEl.appendChild(citeEl);
        }

        const serializer = new XMLSerializer();
        const updatedXml = serializer.serializeToString(doc);
        part.delete();
        xmlParts.add(updatedXml);
        await context.sync();
      }
    } else {
      // Create new XML part
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<refmanager xmlns="${XML_NAMESPACE}">
  <meta>
    <style>apa</style>
  </meta>
  <citations>
    <citation id="${citation.refId}" key="${citation.citationKey}">${escapedJson}</citation>
  </citations>
</refmanager>`;

      xmlParts.add(xml);
      await context.sync();
    }
  });
}

// ── Scan Document for All Citations ──

export async function getAllCitations(): Promise<DocumentCitation[]> {
  return await Word.run(async (context) => {
    const contentControls = context.document.contentControls;
    contentControls.load('items/tag,items/title,items/text');
    await context.sync();

    const citations: DocumentCitation[] = [];

    for (const cc of contentControls.items) {
      if (cc.tag?.startsWith(CITE_TAG_PREFIX)) {
        const refIdStr = cc.tag.replace(CITE_TAG_PREFIX, '');
        const isMulti = refIdStr.includes(',');

        citations.push({
          refId: refIdStr,
          citationKey: cc.title?.replace('Citation: ', '') || '',
          formattedText: cc.text || '',
          isMulti,
        });
      }
    }

    return citations;
  });
}

// ── Count Citations per Reference ──
//
// How many times each individual paper is cited in the document. A grouped
// citation "(Smith, 2024; Jones, 2023)" counts once for Smith AND once for
// Jones, so the tally reflects genuine per-paper usage. Drives the "cited N×"
// badges in the task pane so the author can see, at a glance, how heavily any
// one paper is leaned on.

export interface CitationCount {
  refId: string;
  citationKey: string;
  count: number;
}

export async function getCitationCounts(): Promise<Map<string, CitationCount>> {
  const citations = await getAllCitations();
  const counts = new Map<string, CitationCount>();

  for (const c of citations) {
    const ids = c.refId.split(',').map(s => s.trim()).filter(Boolean);
    const keys = c.citationKey.split(',').map(s => s.trim());
    ids.forEach((id, i) => {
      const existing = counts.get(id);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(id, { refId: id, citationKey: keys[i] || keys[0] || '', count: 1 });
      }
    });
  }

  return counts;
}

// ── Generate Bibliography ──

export async function generateBibliography(styleId: string): Promise<number> {
  // 1. Scan for all citations
  const citations = await getAllCitations();

  if (citations.length === 0) {
    throw new Error('No citations found in the document');
  }

  // 2. Collect unique reference IDs
  const allRefIds: string[] = [];
  for (const c of citations) {
    const ids = c.refId.split(',');
    for (const id of ids) {
      if (!allRefIds.includes(id)) allRefIds.push(id);
    }
  }

  // 3. Fetch full CSL-JSON
  const references = await getReferencesByIds(allRefIds);
  const cslItems = references.map(r => r.csl_json);

  // 4. Generate formatted bibliography
  const { entries } = await formatBibliography(cslItems, styleId);

  // 5. Insert or update in document
  await Word.run(async (context) => {
    const contentControls = context.document.contentControls;
    contentControls.load('items/tag');
    await context.sync();

    let bibControl: Word.ContentControl | undefined;
    for (const cc of contentControls.items) {
      if (cc.tag === BIB_TAG) {
        bibControl = cc;
        break;
      }
    }

    if (!bibControl) {
      // Create bibliography at end of document
      const body = context.document.body;
      const range = body.getRange(Word.RangeLocation.end);

      // Add heading
      const heading = range.insertParagraph('References', Word.InsertLocation.after);
      heading.style = 'Heading 1';

      // Get range after heading for content control
      const afterHeading = heading.getRange(Word.RangeLocation.after);
      const placeholderPara = afterHeading.insertParagraph('', Word.InsertLocation.after);
      bibControl = placeholderPara.insertContentControl();
      bibControl.tag = BIB_TAG;
      bibControl.title = 'Bibliography (auto-generated)';
      bibControl.appearance = Word.ContentControlAppearance.tags;
    }

    // Clear and re-populate
    bibControl.clear();

    for (const entry of entries) {
      if (entry.trim()) {
        const para = bibControl.insertParagraph(entry.trim(), Word.InsertLocation.end);
        // Hanging indent for bibliography
        para.leftIndent = 36;
        para.firstLineIndent = -36;
        para.spaceAfter = 6;
      }
    }

    await context.sync();
  });

  return entries.length;
}

// ── Refresh All Citations ──

export async function refreshAllCitations(styleId: string): Promise<number> {
  return await Word.run(async (context) => {
    const contentControls = context.document.contentControls;
    contentControls.load('items/tag,items/title,items/text');
    await context.sync();

    const citationControls: Word.ContentControl[] = [];
    for (const cc of contentControls.items) {
      if (cc.tag?.startsWith(CITE_TAG_PREFIX)) {
        citationControls.push(cc);
      }
    }

    if (citationControls.length === 0) return 0;

    // Collect all unique reference IDs
    const allRefIds: string[] = [];
    for (const cc of citationControls) {
      const ids = cc.tag.replace(CITE_TAG_PREFIX, '').split(',');
      for (const id of ids) {
        if (!allRefIds.includes(id)) allRefIds.push(id);
      }
    }

    // Fetch references
    const references = await getReferencesByIds(allRefIds);
    const refMap = new Map(references.map(r => [r.id, r]));

    // Update each citation content control
    for (const cc of citationControls) {
      const ids = cc.tag.replace(CITE_TAG_PREFIX, '').split(',');
      const cslItems = ids
        .map(id => refMap.get(id))
        .filter(Boolean)
        .map(r => r!.csl_json);

      if (cslItems.length > 0) {
        const formatted = await formatInlineCitations(cslItems, styleId);

        if (ids.length > 1) {
          // Multi-citation
          const innerTexts = formatted.map(f => f.replace(/^\(/, '').replace(/\)$/, ''));
          cc.insertText(`(${innerTexts.join('; ')})`, Word.InsertLocation.replace);
        } else {
          cc.insertText(formatted[0] || cc.text, Word.InsertLocation.replace);
        }
      }
    }

    await context.sync();

    // Also regenerate bibliography
    try {
      await generateBibliography(styleId);
    } catch {
      // Bibliography might not exist yet
    }

    return citationControls.length;
  });
}

// ── Utility ──

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
