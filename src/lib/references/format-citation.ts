// ---------------------------------------------------------------------------
// formatCitation — minimal four-style citation formatter.
//
// Not a full CSL implementation; a focused approximation of:
//   apa      — APA 7th
//   chicago  — Chicago author-date
//   harvard  — Harvard (Anglia)
//   esabcc   — ESABCC house style (similar to APA but with year up-front)
//
// Covers the four CSL types that dominate the ESABCC corpus:
//   article-journal · book · report · webpage
// Other types fall back to APA.
//
// The full CSL render-engine (citeproc-js + CSL XML) is the right thing to
// adopt long-term; this file ships fast wins for the in-app switcher
// (Brief item M·01 #7) without the bundle hit.
// ---------------------------------------------------------------------------

import { Reference } from './types';
import { formatAuthors } from './citation-utils';

export type CitationStyle = 'apa' | 'chicago' | 'harvard' | 'esabcc';

export const CITATION_STYLE_LABELS: Record<CitationStyle, string> = {
  apa:     'APA 7',
  chicago: 'Chicago',
  harvard: 'Harvard',
  esabcc:  'ESABCC house',
};

function authorsForStyle(ref: Reference, style: CitationStyle): string {
  // Harvard / Chicago / ESABCC all want surname-first; APA already does.
  const max = style === 'apa' ? 6 : 3;
  return formatAuthors(ref.authors, max);
}

function yearOrND(ref: Reference): string {
  return ref.year ? String(ref.year) : 'n.d.';
}

function joinNonEmpty(parts: (string | null | undefined)[], sep = ', '): string {
  return parts.filter((p): p is string => !!p && p.length > 0).join(sep);
}

function formatJournal(ref: Reference, style: CitationStyle): string {
  const authors = authorsForStyle(ref, style);
  const year = yearOrND(ref);
  const title = ref.title;
  const journal = ref.container_title || '';
  const vol = ref.csl_json?.volume ? String(ref.csl_json.volume) : '';
  const issue = ref.csl_json?.issue ? `(${ref.csl_json.issue})` : '';
  const page = ref.csl_json?.page ? String(ref.csl_json.page) : '';
  const doi = ref.doi ? ` https://doi.org/${ref.doi}` : '';
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${title}. ${journal}, ${vol}${issue}${page ? ', ' + page : ''}.${doi}`;
    case 'chicago':
      return `${authors}. ${year}. "${title}." ${journal} ${vol}${issue ? ', no. ' + issue.replace(/[()]/g, '') : ''}: ${page}.${doi}`;
    case 'harvard':
      return `${authors} (${year}) '${title}', ${journal}, ${vol}${issue}, pp. ${page}.${doi}`;
    case 'esabcc':
      return `${authors} (${year}) ${title}. ${journal} ${vol}${issue}: ${page}.${doi}`;
  }
}

function formatBook(ref: Reference, style: CitationStyle): string {
  const authors = authorsForStyle(ref, style);
  const year = yearOrND(ref);
  const publisher = ref.csl_json?.publisher || '';
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${ref.title}. ${publisher}.`;
    case 'chicago':
      return `${authors}. ${year}. ${ref.title}. ${publisher}.`;
    case 'harvard':
      return `${authors} (${year}) ${ref.title}. ${publisher}.`;
    case 'esabcc':
      return `${authors} (${year}) ${ref.title}, ${publisher}.`;
  }
}

function formatReport(ref: Reference, style: CitationStyle): string {
  const authors = authorsForStyle(ref, style);
  const year = yearOrND(ref);
  const publisher = ref.csl_json?.publisher || ref.container_title || '';
  const url = ref.csl_json?.URL || (ref.doi ? `https://doi.org/${ref.doi}` : '');
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${ref.title} [Report]. ${publisher}. ${url}`;
    case 'chicago':
      return `${authors}. ${year}. ${ref.title}. ${publisher}. ${url}`;
    case 'harvard':
      return `${authors} (${year}) ${ref.title} [Report]. ${publisher}. ${url}`;
    case 'esabcc':
      return `${authors} (${year}) ${ref.title}, ${publisher}. ${url}`;
  }
}

function formatWebpage(ref: Reference, style: CitationStyle): string {
  const authors = authorsForStyle(ref, style);
  const year = yearOrND(ref);
  const url = ref.csl_json?.URL || '';
  const accessed = ref.csl_json?.accessed?.['date-parts']?.[0];
  const accessedStr = accessed ? `accessed ${accessed.join('-')}` : '';
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${ref.title}. ${joinNonEmpty([url, accessedStr])}`;
    case 'chicago':
      return `${authors}. ${year}. "${ref.title}." ${joinNonEmpty([url, accessedStr])}`;
    case 'harvard':
      return `${authors} (${year}) ${ref.title}. ${joinNonEmpty([url, accessedStr])}`;
    case 'esabcc':
      return `${authors} (${year}) ${ref.title}. ${joinNonEmpty([url, accessedStr])}`;
  }
}

export function formatCitation(ref: Reference, style: CitationStyle): string {
  switch (ref.item_type) {
    case 'article-journal':
    case 'article-newspaper':
    case 'article-magazine':
    case 'paper-conference':
      return formatJournal(ref, style);
    case 'book':
    case 'chapter':
    case 'entry-encyclopedia':
      return formatBook(ref, style);
    case 'report':
    case 'thesis':
    case 'manuscript':
      return formatReport(ref, style);
    case 'webpage':
    case 'broadcast':
    case 'dataset':
    case 'legislation':
      return formatWebpage(ref, style);
    default:
      return formatJournal(ref, style);
  }
}
