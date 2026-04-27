/**
 * CSL-JSON and Reference Manager type definitions.
 * ------------------------------------------------
 * CSL-JSON is the Citation Style Language JSON shape used by Zotero,
 * Citation.js, and most modern bibliography tools. Mapping every
 * MethodHub reference through CSL-JSON gives us "Zotero-compatible
 * forever" as a baseline: any formatting engine can render our
 * references without a bespoke schema.
 *
 * Internal Reference / ReferenceLibrary / LibraryMember shapes are
 * additionally defined here for DB-level fields (owner, created_at,
 * visibility) that CSL-JSON doesn't carry.
 */

export type CSLItemType =
  | 'article-journal'
  | 'book'
  | 'chapter'
  | 'paper-conference'
  | 'report'
  | 'thesis'
  | 'webpage'
  | 'legislation'
  | 'dataset'
  | 'article-newspaper'
  | 'article-magazine'
  | 'motion_picture'
  | 'broadcast'
  | 'patent'
  | 'personal_communication'
  | 'interview'
  | 'entry-encyclopedia'
  | 'manuscript'
  | 'graphic'
  | 'map'
  | 'song'
  | 'speech';

export interface CSLName {
  family: string;
  given?: string;
  'non-dropping-particle'?: string;
  'dropping-particle'?: string;
  suffix?: string;
  literal?: string;
}

export interface CSLDate {
  'date-parts': number[][];
  literal?: string;
}

export interface CSLItem {
  id: string;
  type: CSLItemType;
  title: string;
  author?: CSLName[];
  editor?: CSLName[];
  issued?: CSLDate;
  accessed?: CSLDate;
  'container-title'?: string;
  'collection-title'?: string;
  publisher?: string;
  'publisher-place'?: string;
  volume?: string;
  issue?: string;
  page?: string;
  DOI?: string;
  ISBN?: string;
  ISSN?: string;
  URL?: string;
  abstract?: string;
  language?: string;
  note?: string;
  keyword?: string;
  number?: string;
  edition?: string;
  genre?: string;
  source?: string;
  'number-of-pages'?: string;
}

// ── Application-level types ──

export interface ReferenceLibrary {
  id: string;
  name: string;
  description: string | null;
  owner_id: string | null;
  is_shared: boolean;
  created_at: string;
}

export interface LibraryMember {
  library_id: string;
  user_id: string;
  role: 'viewer' | 'editor' | 'admin';
}

export interface Reference {
  id: string;
  library_id: string;
  csl_json: CSLItem;
  item_type: string;
  title: string;
  authors: CSLName[] | null;
  year: number | null;
  doi: string | null;
  abstract: string | null;
  container_title: string | null;
  citation_key: string | null;
  tags: string[] | null;
  notes: string | null;
  pdf_url: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface CSLStyle {
  id: string;
  name: string;
  xml: string;
  updated_at: string;
}

// ── Helper types for the UI ──

export interface ReferenceFormData {
  item_type: CSLItemType;
  title: string;
  authors: CSLName[];
  year: number | null;
  doi: string;
  abstract: string;
  container_title: string;
  volume: string;
  issue: string;
  page: string;
  publisher: string;
  url: string;
  tags: string[];
  notes: string;
}

export const ITEM_TYPE_LABELS: Record<CSLItemType, string> = {
  'article-journal': 'Journal Article',
  'book': 'Book',
  'chapter': 'Book Chapter',
  'paper-conference': 'Conference Paper',
  'report': 'Report',
  'thesis': 'Thesis',
  'webpage': 'Web Page',
  'legislation': 'Legislation',
  'dataset': 'Dataset',
  'article-newspaper': 'Newspaper Article',
  'article-magazine': 'Magazine Article',
  'motion_picture': 'Film/Video',
  'broadcast': 'Broadcast',
  'patent': 'Patent',
  'personal_communication': 'Personal Communication',
  'interview': 'Interview',
  'entry-encyclopedia': 'Encyclopedia Entry',
  'manuscript': 'Manuscript',
  'graphic': 'Graphic/Image',
  'map': 'Map',
  'song': 'Audio Recording',
  'speech': 'Speech/Presentation',
};

export const CITATION_STYLES = [
  { id: 'apa', name: 'APA 7th Edition' },
  { id: 'chicago-author-date', name: 'Chicago (Author-Date)' },
  { id: 'ieee', name: 'IEEE' },
  { id: 'vancouver', name: 'Vancouver' },
  { id: 'harvard-cite-them-right', name: 'Harvard' },
  { id: 'nature', name: 'Nature' },
  { id: 'science', name: 'Science' },
  { id: 'mla', name: 'MLA 9th Edition' },
  { id: 'elsevier-harvard', name: 'Elsevier Harvard' },
  { id: 'springer-basic-author-date', name: 'Springer (Author-Date)' },
] as const;
