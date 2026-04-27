// ============================================================================
// Citation Key Generation & Formatting Utilities
// ============================================================================

import { CSLItem, CSLName } from './types';

/**
 * Generate a citation key from CSL-JSON data (e.g., "smith2024climate")
 */
export function generateCitationKey(item: CSLItem): string {
  const firstAuthor = item.author?.[0]?.family || item.editor?.[0]?.family || 'unknown';
  const year = item.issued?.['date-parts']?.[0]?.[0] || 'nd';

  // Take first significant word from title (skip articles)
  const skipWords = new Set(['the', 'a', 'an', 'of', 'in', 'on', 'for', 'and', 'to', 'with']);
  const titleWord = (item.title || '')
    .split(/\s+/)
    .map(w => w.toLowerCase().replace(/[^a-z]/g, ''))
    .find(w => w.length > 2 && !skipWords.has(w)) || '';

  const key = `${firstAuthor.toLowerCase().replace(/[^a-z]/g, '')}${year}${titleWord}`;
  return key;
}

/**
 * Make a citation key unique by appending a letter suffix
 */
export function makeUniqueKey(baseKey: string, existingKeys: Set<string>): string {
  if (!existingKeys.has(baseKey)) return baseKey;

  const letters = 'abcdefghijklmnopqrstuvwxyz';
  for (const letter of letters) {
    const candidate = `${baseKey}${letter}`;
    if (!existingKeys.has(candidate)) return candidate;
  }
  return `${baseKey}_${Date.now()}`;
}

/**
 * Format author names for display: "Smith, J., Müller, A., & Lee, B."
 */
export function formatAuthors(authors: CSLName[] | null | undefined, maxAuthors = 3): string {
  if (!authors || authors.length === 0) return 'Unknown Author';

  const formatted = authors.slice(0, maxAuthors).map((a, i) => {
    if (a.literal) return a.literal;
    const given = a.given ? ` ${a.given.charAt(0)}.` : '';
    const particle = a['non-dropping-particle'] ? `${a['non-dropping-particle']} ` : '';
    return `${particle}${a.family}${given}`;
  });

  if (authors.length > maxAuthors) {
    return formatted.join(', ') + ' et al.';
  }
  if (formatted.length === 1) return formatted[0];
  if (formatted.length === 2) return formatted.join(' & ');
  return formatted.slice(0, -1).join(', ') + ', & ' + formatted[formatted.length - 1];
}

/**
 * Format a short inline citation: "(Smith, 2024)" or "(Smith & Müller, 2024)"
 */
export function formatInlineCitation(item: CSLItem): string {
  const authors = item.author || item.editor || [];
  const year = item.issued?.['date-parts']?.[0]?.[0] || 'n.d.';

  if (authors.length === 0) return `(${year})`;
  if (authors.length === 1) {
    return `(${authors[0].literal || authors[0].family}, ${year})`;
  }
  if (authors.length === 2) {
    const a1 = authors[0].literal || authors[0].family;
    const a2 = authors[1].literal || authors[1].family;
    return `(${a1} & ${a2}, ${year})`;
  }
  return `(${authors[0].literal || authors[0].family} et al., ${year})`;
}

/**
 * Build a CSL-JSON object from form data
 */
export function buildCSLJson(data: {
  item_type: string;
  title: string;
  authors: CSLName[];
  year: number | null;
  doi: string;
  container_title: string;
  volume: string;
  issue: string;
  page: string;
  publisher: string;
  url: string;
  abstract: string;
  // Type-specific extensions
  institution?: string;       // for reports, web pages — issuing org
  accessed?: string;          // ISO date YYYY-MM-DD — for webpages, datasets
  legislation_code?: string;  // for legislation — e.g. 2021/1119, COM(2021)550
}): CSLItem {
  const csl: CSLItem = {
    id: '', // Will be set to citation_key
    type: data.item_type as CSLItem['type'],
    title: data.title,
  };

  if (data.authors.length > 0) csl.author = data.authors;
  if (data.year) csl.issued = { 'date-parts': [[data.year]] };
  if (data.doi) csl.DOI = data.doi;
  if (data.container_title) csl['container-title'] = data.container_title;
  if (data.volume) csl.volume = data.volume;
  if (data.issue) csl.issue = data.issue;
  if (data.page) csl.page = data.page;
  if (data.publisher) csl.publisher = data.publisher;
  if (data.url) csl.URL = data.url;
  if (data.abstract) csl.abstract = data.abstract;
  // Map institution → publisher when no publisher is set; CSL has no
  // dedicated 'institution' field, but most styles render publisher in
  // its place for reports/webpages.
  if (data.institution && !data.publisher) csl.publisher = data.institution;
  // accessed → CSL accessed date
  if (data.accessed) {
    const parts = data.accessed.split('-').map((p) => parseInt(p, 10)).filter((n) => !isNaN(n));
    if (parts.length > 0) csl.accessed = { 'date-parts': [parts] };
  }
  // Legislation code → CSL `number` field, which is the conventional CSL
  // location for statute/regulation identifiers.
  if (data.legislation_code) csl.number = data.legislation_code;

  return csl;
}

/**
 * Determine which fields are relevant for a given CSL item type. The
 * Reference form uses this to show / hide inputs so users do not see e.g.
 * a "journal" field for legislation, or a "volume" field for a webpage.
 */
export function fieldsForType(itemType: string): {
  container: boolean;       // container-title (journal/book series)
  containerLabel: string;
  volume: boolean;
  issue: boolean;
  page: boolean;
  publisher: boolean;
  publisherLabel: string;
  doi: boolean;
  url: boolean;
  institution: boolean;
  accessed: boolean;
  legislationCode: boolean;
  legislationCodeLabel: string;
} {
  const t = itemType;
  const isJournal = t === 'article-journal' || t === 'article-newspaper' || t === 'article-magazine';
  const isBookish = t === 'book' || t === 'chapter' || t === 'entry-encyclopedia';
  const isReport = t === 'report' || t === 'thesis' || t === 'paper-conference' || t === 'manuscript';
  const isWeb = t === 'webpage' || t === 'broadcast' || t === 'dataset' || t === 'motion_picture';
  const isLegislation = t === 'legislation';

  return {
    container: isJournal || isBookish,
    containerLabel: isBookish ? 'Book / Series Title' : 'Journal',
    volume: isJournal || isBookish,
    issue: isJournal,
    page: isJournal || isBookish,
    publisher: isBookish || isReport,
    publisherLabel: isReport ? 'Publisher' : 'Publisher',
    doi: isJournal || isBookish || isReport,
    url: isWeb || isReport || isLegislation || isJournal,
    institution: isReport || isWeb,
    accessed: isWeb,
    legislationCode: isLegislation,
    legislationCodeLabel: 'Legislation code (e.g. 2021/1119, COM(2021)550)',
  };
}

/**
 * Parse a simple BibTeX string into CSL-JSON items (lightweight parser)
 * For production use, citation-js should be used; this handles basic cases.
 */
export function parseBibTeX(bibtex: string): CSLItem[] {
  const entries: CSLItem[] = [];
  // Match @type{key, ... }
  const entryRegex = /@(\w+)\s*\{([^,]*),\s*([\s\S]*?)(?=\n@|\s*$)/g;
  let match;

  while ((match = entryRegex.exec(bibtex)) !== null) {
    const [, entryType, entryKey, body] = match;
    const fields: Record<string, string> = {};

    // Parse fields: key = {value} or key = "value"
    const fieldRegex = /(\w+)\s*=\s*(?:\{([^}]*)\}|"([^"]*)")/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      const key = fieldMatch[1].toLowerCase();
      const value = fieldMatch[2] ?? fieldMatch[3] ?? '';
      fields[key] = value.trim();
    }

    // Map BibTeX type to CSL type
    const typeMap: Record<string, CSLItem['type']> = {
      article: 'article-journal',
      inproceedings: 'paper-conference',
      conference: 'paper-conference',
      book: 'book',
      inbook: 'chapter',
      incollection: 'chapter',
      phdthesis: 'thesis',
      mastersthesis: 'thesis',
      techreport: 'report',
      misc: 'webpage',
      online: 'webpage',
    };

    // Parse authors: "Last1, First1 and Last2, First2"
    const parseAuthors = (authorStr: string): CSLName[] => {
      if (!authorStr) return [];
      return authorStr.split(/\s+and\s+/i).map(a => {
        const parts = a.trim().split(/,\s*/);
        if (parts.length >= 2) {
          return { family: parts[0].trim(), given: parts[1].trim() };
        }
        // "First Last" format
        const words = a.trim().split(/\s+/);
        if (words.length >= 2) {
          return { family: words[words.length - 1], given: words.slice(0, -1).join(' ') };
        }
        return { family: a.trim() };
      });
    };

    const csl: CSLItem = {
      id: entryKey.trim(),
      type: typeMap[entryType.toLowerCase()] || 'article-journal',
      title: fields.title || 'Untitled',
    };

    if (fields.author) csl.author = parseAuthors(fields.author);
    if (fields.editor) csl.editor = parseAuthors(fields.editor);
    if (fields.year) csl.issued = { 'date-parts': [[parseInt(fields.year, 10)]] };
    if (fields.doi) csl.DOI = fields.doi;
    if (fields.journal) csl['container-title'] = fields.journal;
    if (fields.booktitle) csl['container-title'] = fields.booktitle;
    if (fields.volume) csl.volume = fields.volume;
    if (fields.number || fields.issue) csl.issue = fields.number || fields.issue;
    if (fields.pages) csl.page = fields.pages.replace('--', '-');
    if (fields.publisher) csl.publisher = fields.publisher;
    if (fields.url) csl.URL = fields.url;
    if (fields.abstract) csl.abstract = fields.abstract;
    if (fields.isbn) csl.ISBN = fields.isbn;
    if (fields.issn) csl.ISSN = fields.issn;

    entries.push(csl);
  }

  return entries;
}

/**
 * Parse RIS format into CSL-JSON items
 */
export function parseRIS(ris: string): CSLItem[] {
  const entries: CSLItem[] = [];
  const blocks = ris.split(/^ER\s*-/m);

  const typeMap: Record<string, CSLItem['type']> = {
    JOUR: 'article-journal',
    BOOK: 'book',
    CHAP: 'chapter',
    CONF: 'paper-conference',
    RPRT: 'report',
    THES: 'thesis',
    ELEC: 'webpage',
    DATA: 'dataset',
    NEWS: 'article-newspaper',
    MGZN: 'article-magazine',
    GEN: 'article-journal',
  };

  for (const block of blocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 2) continue;

    const fields: Record<string, string[]> = {};
    for (const line of lines) {
      const m = line.match(/^([A-Z][A-Z0-9])\s*-\s*(.*)/);
      if (m) {
        const [, tag, value] = m;
        if (!fields[tag]) fields[tag] = [];
        fields[tag].push(value.trim());
      }
    }

    if (!fields.TY) continue;

    const csl: CSLItem = {
      id: fields.ID?.[0] || `ris_${entries.length}`,
      type: typeMap[fields.TY[0]] || 'article-journal',
      title: fields.TI?.[0] || fields.T1?.[0] || 'Untitled',
    };

    // Authors (AU tags)
    if (fields.AU) {
      csl.author = fields.AU.map(a => {
        const parts = a.split(/,\s*/);
        return parts.length >= 2
          ? { family: parts[0], given: parts[1] }
          : { family: a };
      });
    }

    if (fields.PY) csl.issued = { 'date-parts': [[parseInt(fields.PY[0], 10)]] };
    else if (fields.Y1) csl.issued = { 'date-parts': [[parseInt(fields.Y1[0].split('/')[0], 10)]] };

    if (fields.DO) csl.DOI = fields.DO[0];
    if (fields.JO || fields.JF || fields.T2) csl['container-title'] = fields.JO?.[0] || fields.JF?.[0] || fields.T2?.[0];
    if (fields.VL) csl.volume = fields.VL[0];
    if (fields.IS) csl.issue = fields.IS[0];
    if (fields.SP) csl.page = fields.EP ? `${fields.SP[0]}-${fields.EP[0]}` : fields.SP[0];
    if (fields.PB) csl.publisher = fields.PB[0];
    if (fields.UR) csl.URL = fields.UR[0];
    if (fields.AB) csl.abstract = fields.AB[0];
    if (fields.SN) csl.ISSN = fields.SN[0];

    entries.push(csl);
  }

  return entries;
}
