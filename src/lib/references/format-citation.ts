// ---------------------------------------------------------------------------
// formatCitation — string-template citation formatter.
//
// Not a full CSL implementation; a focused approximation of every style
// advertised in `CITATION_STYLES` (types.ts), plus the ESABCC house style:
//   apa                          — APA 7th
//   chicago-author-date          — Chicago author-date
//   ieee                         — IEEE
//   vancouver                    — Vancouver (ICMJE)
//   harvard-cite-them-right      — Harvard (Cite Them Right)
//   nature                       — Nature
//   science                      — Science
//   mla                          — MLA 9th
//   elsevier-harvard             — Elsevier Harvard
//   springer-basic-author-date   — Springer (Author-Date)
//   esabcc                       — ESABCC house style (similar to APA but
//                                   with year up-front)
//
// `CitationStyle` is derived from `CITATION_STYLES` so the two can never
// drift apart again — every id the UI advertises has a render branch here,
// and adding a style means adding it to `CITATION_STYLES` and to every
// switch below (TS will *not* catch a missing switch case, since none of
// these functions use `default:` — see the acceptance test in
// citation-utils' self-check for the actual enforcement).
//
// Covers the four CSL types that dominate the ESABCC corpus:
//   article-journal · book · report · webpage
// Other types fall back to one of these four (see formatCitation()).
//
// The full CSL render-engine (citeproc-js + CSL XML) is the right thing to
// adopt long-term; this file ships fast wins for the in-app switcher
// (Brief item M·01 #7) without the bundle hit.
// ---------------------------------------------------------------------------

import { Reference, CITATION_STYLES } from './types';
import { formatAuthors } from './citation-utils';

export type CitationStyle = (typeof CITATION_STYLES)[number]['id'] | 'esabcc';

export const CITATION_STYLE_LABELS: Record<CitationStyle, string> = {
  apa: 'APA 7',
  'chicago-author-date': 'Chicago',
  ieee: 'IEEE',
  vancouver: 'Vancouver',
  'harvard-cite-them-right': 'Harvard',
  nature: 'Nature',
  science: 'Science',
  mla: 'MLA 9',
  'elsevier-harvard': 'Elsevier Harvard',
  'springer-basic-author-date': 'Springer',
  esabcc: 'ESABCC house',
};

function authorsForStyle(ref: Reference, style: CitationStyle): string {
  // Most styles want surname-first, which is what `formatAuthors` already
  // produces; APA / IEEE / Vancouver conventionally list more authors
  // before truncating to "et al." than the shorter author-date styles do.
  const max = style === 'apa' || style === 'ieee' || style === 'vancouver' ? 6 : 3;
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
  const issueNum = ref.csl_json?.issue ? String(ref.csl_json.issue) : '';
  const page = ref.csl_json?.page ? String(ref.csl_json.page) : '';
  const doi = ref.doi ? ` https://doi.org/${ref.doi}` : '';
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${title}. ${journal}, ${vol}${issue}${page ? ', ' + page : ''}.${doi}`;
    case 'chicago-author-date':
      return `${authors}. ${year}. "${title}." ${journal} ${vol}${issueNum ? ', no. ' + issueNum : ''}: ${page}.${doi}`;
    case 'harvard-cite-them-right':
      return `${authors} (${year}) '${title}', ${journal}, ${vol}${issue}, pp. ${page}.${doi}`;
    case 'esabcc':
      return `${authors} (${year}) ${title}. ${journal} ${vol}${issue}: ${page}.${doi}`;
    case 'ieee':
      return `${authors}, "${title}," ${journal}, vol. ${vol || 'n/a'}${issueNum ? ', no. ' + issueNum : ''}${page ? ', pp. ' + page : ''}, ${year}.${doi}`;
    case 'vancouver':
      return `${authors}. ${title}. ${journal}. ${year};${vol}${issue}${page ? ':' + page : ''}.${doi}`;
    case 'nature':
      return `${authors}. ${title}. ${journal} ${vol}${page ? ', ' + page : ''} (${year}).${doi}`;
    case 'science':
      return `${authors}, ${title}. ${journal} ${vol}${page ? ', ' + page : ''} (${year}).${doi}`;
    case 'mla':
      return `${authors}. "${title}." ${journal}, vol. ${vol || 'n/a'}${issueNum ? ', no. ' + issueNum : ''}, ${year}${page ? ', pp. ' + page : ''}.${doi}`;
    case 'elsevier-harvard':
      return `${authors}, ${year}. ${title}. ${journal}, ${vol}${issue}${page ? ', pp. ' + page : ''}.${doi}`;
    case 'springer-basic-author-date':
      return `${authors} (${year}) ${title}. ${journal} ${vol}${issue}${page ? ':' + page : ''}.${doi}`;
  }
}

function formatBook(ref: Reference, style: CitationStyle): string {
  const authors = authorsForStyle(ref, style);
  const year = yearOrND(ref);
  const title = ref.title;
  const publisher = ref.csl_json?.publisher || '';
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${title}. ${publisher}.`;
    case 'chicago-author-date':
      return `${authors}. ${year}. ${title}. ${publisher}.`;
    case 'harvard-cite-them-right':
      return `${authors} (${year}) ${title}. ${publisher}.`;
    case 'esabcc':
      return `${authors} (${year}) ${title}, ${publisher}.`;
    case 'ieee':
      return `${authors}, ${title}. ${publisher}, ${year}.`;
    case 'vancouver':
      return `${authors}. ${title}. ${publisher}; ${year}.`;
    case 'nature':
      return `${authors}. ${title} (${publisher}, ${year}).`;
    case 'science':
      return `${authors}, ${title} (${publisher}, ${year}).`;
    case 'mla':
      return `${authors}. ${title}. ${publisher}, ${year}.`;
    case 'elsevier-harvard':
      return `${authors}, ${year}. ${title}. ${publisher}.`;
    case 'springer-basic-author-date':
      return `${authors} (${year}) ${title}. ${publisher}.`;
  }
}

function formatReport(ref: Reference, style: CitationStyle): string {
  const authors = authorsForStyle(ref, style);
  const year = yearOrND(ref);
  const title = ref.title;
  const publisher = ref.csl_json?.publisher || ref.container_title || '';
  const url = ref.csl_json?.URL || (ref.doi ? `https://doi.org/${ref.doi}` : '');
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${title} [Report]. ${publisher}. ${url}`;
    case 'chicago-author-date':
      return `${authors}. ${year}. ${title}. ${publisher}. ${url}`;
    case 'harvard-cite-them-right':
      return `${authors} (${year}) ${title} [Report]. ${publisher}. ${url}`;
    case 'esabcc':
      return `${authors} (${year}) ${title}, ${publisher}. ${url}`;
    case 'ieee':
      return `${authors}, "${title}," ${publisher}, ${year}. ${url}`;
    case 'vancouver':
      return `${authors}. ${title}. ${publisher}; ${year}. Available from: ${url}`;
    case 'nature':
      return `${authors}. ${title} (${publisher}, ${year}). ${url}`;
    case 'science':
      return `${authors}, ${title} (${publisher}, ${year}). ${url}`;
    case 'mla':
      return `${authors}. ${title}. ${publisher}, ${year}, ${url}.`;
    case 'elsevier-harvard':
      return `${authors}, ${year}. ${title}. ${publisher}. ${url}`;
    case 'springer-basic-author-date':
      return `${authors} (${year}) ${title}. ${publisher}. ${url}`;
  }
}

function formatWebpage(ref: Reference, style: CitationStyle): string {
  const authors = authorsForStyle(ref, style);
  const year = yearOrND(ref);
  const title = ref.title;
  const url = ref.csl_json?.URL || '';
  const accessed = ref.csl_json?.accessed?.['date-parts']?.[0];
  const accessedStr = accessed ? `accessed ${accessed.join('-')}` : '';
  switch (style) {
    case 'apa':
      return `${authors} (${year}). ${title}. ${joinNonEmpty([url, accessedStr])}`;
    case 'chicago-author-date':
      return `${authors}. ${year}. "${title}." ${joinNonEmpty([url, accessedStr])}`;
    case 'harvard-cite-them-right':
      return `${authors} (${year}) ${title}. ${joinNonEmpty([url, accessedStr])}`;
    case 'esabcc':
      return `${authors} (${year}) ${title}. ${joinNonEmpty([url, accessedStr])}`;
    case 'ieee':
      return `${authors}, "${title}," ${joinNonEmpty([url, accessedStr])}.`;
    case 'vancouver':
      return `${authors}. ${title} [Internet]. ${year}. ${joinNonEmpty([url, accessedStr])}`;
    case 'nature':
      return `${authors}. ${title} (${year}). ${joinNonEmpty([url, accessedStr])}`;
    case 'science':
      return `${authors}, ${title} (${year}). ${joinNonEmpty([url, accessedStr])}`;
    case 'mla':
      return `${authors}. "${title}." ${year}, ${joinNonEmpty([url, accessedStr])}.`;
    case 'elsevier-harvard':
      return `${authors}, ${year}. ${title}. ${joinNonEmpty([url, accessedStr])}`;
    case 'springer-basic-author-date':
      return `${authors} (${year}) ${title}. ${joinNonEmpty([url, accessedStr])}`;
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
