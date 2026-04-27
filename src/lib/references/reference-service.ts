/**
 * Reference Manager service — M·01 data plane.
 * ---------------------------------------------
 * All CRUD against `libraries`, `references`, and `library_members`
 * rows, plus DOI resolution via Crossref. This is the one module
 * that every other caller (the /references page, the Word add-in
 * bridge, the Content Analysis ingestion path) goes through — keep
 * the shape stable.
 *
 * Storage strategy:
 *
 *   - When `supabase` is configured (dev + hosted prototype), every
 *     function talks to the `libraries` / `references` tables
 *     directly and relies on RLS to scope rows by `owner` /
 *     `library_id`.
 *   - When `supabase` is null (SSR build, pure static prerender,
 *     or air-gapped local dev), the service falls back to
 *     `getLocalLibraries` / `createLocalLibrary` / … — in-memory
 *     stores that give the UI a working shape without a backend.
 *
 * Helpers from `./citation-utils` handle:
 *
 *   - `generateCitationKey` / `makeUniqueKey` — stable `AuthorYearTitle`
 *     keys for the Word add-in.
 *   - `buildCSLJson` — maps our internal Reference shape to the
 *     CSL-JSON envelope Zotero / Citation.js consume.
 *   - `parseBibTeX` / `parseRIS` — bulk-import parsers.
 *
 * RLS note: every function here assumes the caller is a signed-in
 * user. Anonymous callers hit either empty results (SELECT) or
 * `new row violates row-level security policy` errors (INSERT /
 * UPDATE). The UI gates these paths behind `useAuth()` upstream.
 */

import { supabase } from '../supabase';
import { Reference, ReferenceLibrary, LibraryMember, CSLItem, CSLName, FundingEntry } from './types';
import { generateCitationKey, makeUniqueKey, buildCSLJson, parseBibTeX, parseRIS } from './citation-utils';

// ── Library Operations ──

export async function getLibraries(): Promise<ReferenceLibrary[]> {
  if (!supabase) return getLocalLibraries();

  const { data, error } = await supabase
    .from('libraries')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function createLibrary(name: string, description?: string): Promise<ReferenceLibrary> {
  if (!supabase) return createLocalLibrary(name, description);

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('libraries')
    .insert({ name, description, owner_id: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteLibrary(id: string): Promise<void> {
  if (!supabase) { deleteLocalLibrary(id); return; }

  const { error } = await supabase.from('libraries').delete().eq('id', id);
  if (error) throw error;
}

// ── Reference CRUD ──

export async function getReferences(libraryId: string): Promise<Reference[]> {
  if (!supabase) return getLocalReferences(libraryId);

  const { data, error } = await supabase
    .from('references')
    .select('*')
    .eq('library_id', libraryId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function searchReferences(libraryId: string, query: string): Promise<Reference[]> {
  if (!supabase) return searchLocalReferences(libraryId, query);

  // Use full-text search for multi-word queries, ILIKE for simple ones
  if (query.includes(' ')) {
    const { data, error } = await supabase
      .from('references')
      .select('*')
      .eq('library_id', libraryId)
      .textSearch('fts', query, { type: 'websearch' })
      .limit(50);

    if (error) throw error;
    return data || [];
  }

  // Simple search across key fields
  const { data, error } = await supabase
    .from('references')
    .select('*')
    .eq('library_id', libraryId)
    .or(`title.ilike.%${query}%,citation_key.ilike.%${query}%,container_title.ilike.%${query}%,doi.ilike.%${query}%`)
    .limit(50);

  if (error) throw error;
  return data || [];
}

export async function getReferencesByIds(ids: string[]): Promise<Reference[]> {
  if (!supabase) return getLocalReferencesByIds(ids);

  const { data, error } = await supabase
    .from('references')
    .select('*')
    .in('id', ids);

  if (error) throw error;
  return data || [];
}

export async function addReference(libraryId: string, cslJson: CSLItem, tags?: string[], notes?: string): Promise<Reference> {
  // Generate citation key
  const existingKeys = await getExistingCitationKeys(libraryId);
  const baseKey = generateCitationKey(cslJson);
  const citationKey = makeUniqueKey(baseKey, existingKeys);
  cslJson.id = citationKey;

  const ref = {
    library_id: libraryId,
    csl_json: cslJson,
    item_type: cslJson.type,
    title: cslJson.title,
    authors: cslJson.author || null,
    year: cslJson.issued?.['date-parts']?.[0]?.[0] || null,
    doi: cslJson.DOI || null,
    abstract: cslJson.abstract || null,
    container_title: cslJson['container-title'] || null,
    citation_key: citationKey,
    tags: tags || null,
    notes: notes || null,
    funding: cslJson.funder || null,
  };

  if (!supabase) return addLocalReference(ref);

  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from('references')
    .insert({ ...ref, created_by: user?.id })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateReference(id: string, updates: Partial<{
  csl_json: CSLItem;
  title: string;
  authors: CSLName[];
  year: number;
  doi: string;
  abstract: string;
  container_title: string;
  tags: string[];
  notes: string;
  pdf_url: string;
  funding: FundingEntry[];
}>): Promise<Reference> {
  if (!supabase) return updateLocalReference(id, updates);

  const { data, error } = await supabase
    .from('references')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteReference(id: string): Promise<void> {
  if (!supabase) { deleteLocalReference(id); return; }

  const { error } = await supabase.from('references').delete().eq('id', id);
  if (error) throw error;
}

// ── DOI Resolution ──

export async function resolveFromDOI(doi: string): Promise<CSLItem> {
  // CrossRef API returns CSL-JSON directly when Accept header is set
  const cleanDoi = doi.replace(/^https?:\/\/doi\.org\//, '').trim();
  const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(cleanDoi)}`, {
    headers: { 'Accept': 'application/json' },
  });

  if (!response.ok) {
    throw new Error(`DOI not found: ${cleanDoi}`);
  }

  const data = await response.json();
  const work = data.message;

  // Convert CrossRef response to CSL-JSON
  const csl: CSLItem = {
    id: cleanDoi,
    type: mapCrossRefType(work.type),
    title: Array.isArray(work.title) ? work.title[0] : work.title || 'Untitled',
  };

  if (work.author) {
    csl.author = work.author.map((a: any) => ({
      family: a.family || '',
      given: a.given || '',
    }));
  }

  if (work.issued?.['date-parts']?.[0]) {
    csl.issued = { 'date-parts': [work.issued['date-parts'][0]] };
  }

  if (work['container-title']?.[0]) csl['container-title'] = work['container-title'][0];
  if (work.volume) csl.volume = work.volume;
  if (work.issue) csl.issue = work.issue;
  if (work.page) csl.page = work.page;
  if (work.DOI) csl.DOI = work.DOI;
  if (work.ISSN?.[0]) csl.ISSN = work.ISSN[0];
  if (work.ISBN?.[0]) csl.ISBN = work.ISBN[0];
  if (work.publisher) csl.publisher = work.publisher;
  if (work.abstract) csl.abstract = stripHtml(work.abstract);
  if (work.URL) csl.URL = work.URL;

  if (Array.isArray(work.funder) && work.funder.length > 0) {
    csl.funder = work.funder.map((f: any): FundingEntry => ({
      name: f.name || '',
      doi: f.DOI || undefined,
      awards: Array.isArray(f.award) ? f.award.filter(Boolean) : undefined,
    })).filter((f: FundingEntry) => f.name);
  }

  return csl;
}

function mapCrossRefType(type: string): CSLItem['type'] {
  const map: Record<string, CSLItem['type']> = {
    'journal-article': 'article-journal',
    'book': 'book',
    'book-chapter': 'chapter',
    'proceedings-article': 'paper-conference',
    'report': 'report',
    'dissertation': 'thesis',
    'dataset': 'dataset',
    'posted-content': 'article-journal',
    'monograph': 'book',
  };
  return map[type] || 'article-journal';
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
}

// ── Batch Import ──

export interface BatchImportSkip {
  /** Title (or fallback id) of the entry that didn't make it in. */
  title: string;
  reason: 'duplicate' | 'parse-error' | 'add-error';
  /** Human-readable detail; populated for `add-error`. */
  error?: string;
  /** When `reason === 'duplicate'`, the DOI we matched on. */
  doi?: string;
}

export interface BatchImportResult {
  imported: Reference[];
  skipped: BatchImportSkip[];
  /** Total entries the parser produced (imported.length + skipped.length). */
  parsed: number;
}

/**
 * Build a Set of DOIs already present in the target library so a bulk
 * import can skip duplicates without round-tripping the database for
 * every entry. Returns lowercased, normalised DOIs.
 */
async function getExistingDoiSet(libraryId: string): Promise<Set<string>> {
  const refs = await getReferences(libraryId);
  const out = new Set<string>();
  for (const r of refs) {
    if (r.doi) out.add(r.doi.toLowerCase().trim());
  }
  return out;
}

async function importEntries(
  libraryId: string,
  items: CSLItem[],
): Promise<BatchImportResult> {
  const existingDois = await getExistingDoiSet(libraryId);
  const imported: Reference[] = [];
  const skipped: BatchImportSkip[] = [];
  // Track DOIs we've added in this batch too — same file twice is a common case.
  const seenInBatch = new Set<string>();
  for (const item of items) {
    const title = item.title || item.id || 'Untitled';
    const doi = item.DOI?.toLowerCase().trim();
    if (doi && (existingDois.has(doi) || seenInBatch.has(doi))) {
      skipped.push({ title, reason: 'duplicate', doi });
      continue;
    }
    try {
      const ref = await addReference(libraryId, item);
      imported.push(ref);
      if (doi) seenInBatch.add(doi);
    } catch (err) {
      skipped.push({
        title,
        reason: 'add-error',
        error: (err as Error)?.message || String(err),
      });
    }
  }
  return { imported, skipped, parsed: items.length };
}

export async function importBibTeX(libraryId: string, bibtex: string): Promise<BatchImportResult> {
  const items = parseBibTeX(bibtex);
  return importEntries(libraryId, items);
}

export async function importRIS(libraryId: string, ris: string): Promise<BatchImportResult> {
  const items = parseRIS(ris);
  return importEntries(libraryId, items);
}

// ── Helpers ──

async function getExistingCitationKeys(libraryId: string): Promise<Set<string>> {
  if (!supabase) {
    const refs = getLocalReferences(libraryId);
    return new Set(refs.map(r => r.citation_key).filter(Boolean) as string[]);
  }

  const { data } = await supabase
    .from('references')
    .select('citation_key')
    .eq('library_id', libraryId);

  return new Set((data || []).map(r => r.citation_key).filter(Boolean));
}

// ── Realtime Subscription ──

export function subscribeToLibrary(
  libraryId: string,
  onInsert: (ref: Reference) => void,
  onUpdate: (ref: Reference) => void,
  onDelete: (id: string) => void,
): () => void {
  if (!supabase) return () => {};

  const channel = supabase
    .channel(`library-${libraryId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'references',
        filter: `library_id=eq.${libraryId}`,
      },
      (payload) => onInsert(payload.new as Reference)
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'references',
        filter: `library_id=eq.${libraryId}`,
      },
      (payload) => onUpdate(payload.new as Reference)
    )
    .on(
      'postgres_changes',
      {
        event: 'DELETE',
        schema: 'public',
        table: 'references',
        filter: `library_id=eq.${libraryId}`,
      },
      (payload) => onDelete((payload.old as any).id)
    )
    .subscribe();

  return () => { supabase!.removeChannel(channel); };
}

// ── Export ──

export function exportBibTeX(references: Reference[]): string {
  return references.map(ref => {
    const csl = ref.csl_json;
    const typeMap: Record<string, string> = {
      'article-journal': 'article',
      'book': 'book',
      'chapter': 'incollection',
      'paper-conference': 'inproceedings',
      'report': 'techreport',
      'thesis': 'phdthesis',
      'webpage': 'misc',
    };
    const bibType = typeMap[csl.type] || 'misc';
    const key = ref.citation_key || ref.id;

    const fields: string[] = [];
    if (csl.title) fields.push(`  title = {${csl.title}}`);
    if (csl.author) {
      const authors = csl.author.map(a =>
        a.literal || `${a.family}, ${a.given || ''}`
      ).join(' and ');
      fields.push(`  author = {${authors}}`);
    }
    if (csl.issued?.['date-parts']?.[0]?.[0]) fields.push(`  year = {${csl.issued['date-parts'][0][0]}}`);
    if (csl['container-title']) fields.push(`  journal = {${csl['container-title']}}`);
    if (csl.volume) fields.push(`  volume = {${csl.volume}}`);
    if (csl.issue) fields.push(`  number = {${csl.issue}}`);
    if (csl.page) fields.push(`  pages = {${csl.page}}`);
    if (csl.DOI) fields.push(`  doi = {${csl.DOI}}`);
    if (csl.publisher) fields.push(`  publisher = {${csl.publisher}}`);
    if (csl.URL) fields.push(`  url = {${csl.URL}}`);

    return `@${bibType}{${key},\n${fields.join(',\n')}\n}`;
  }).join('\n\n');
}

// ============================================================================
// LocalStorage Fallback (mirrors Supabase when not configured)
// ============================================================================

const LS_LIBRARIES_KEY = 'refmanager_libraries';
const LS_REFERENCES_KEY = 'refmanager_references';

function getLocalLibraries(): ReferenceLibrary[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_LIBRARIES_KEY) || '[]');
  } catch { return []; }
}

function saveLocalLibraries(libs: ReferenceLibrary[]) {
  localStorage.setItem(LS_LIBRARIES_KEY, JSON.stringify(libs));
}

function createLocalLibrary(name: string, description?: string): ReferenceLibrary {
  const libs = getLocalLibraries();
  const lib: ReferenceLibrary = {
    id: crypto.randomUUID(),
    name,
    description: description || null,
    owner_id: null,
    is_shared: false,
    created_at: new Date().toISOString(),
  };
  libs.push(lib);
  saveLocalLibraries(libs);
  return lib;
}

function deleteLocalLibrary(id: string) {
  const libs = getLocalLibraries().filter(l => l.id !== id);
  saveLocalLibraries(libs);
  // Also delete references in this library
  const refs = getAllLocalReferences().filter(r => r.library_id !== id);
  saveLocalReferences(refs);
}

function getAllLocalReferences(): Reference[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(LS_REFERENCES_KEY) || '[]');
  } catch { return []; }
}

function saveLocalReferences(refs: Reference[]) {
  localStorage.setItem(LS_REFERENCES_KEY, JSON.stringify(refs));
}

function getLocalReferences(libraryId: string): Reference[] {
  return getAllLocalReferences().filter(r => r.library_id === libraryId);
}

function searchLocalReferences(libraryId: string, query: string): Reference[] {
  const q = query.toLowerCase();
  return getLocalReferences(libraryId).filter(r =>
    r.title.toLowerCase().includes(q) ||
    r.citation_key?.toLowerCase().includes(q) ||
    r.container_title?.toLowerCase().includes(q) ||
    r.doi?.toLowerCase().includes(q) ||
    r.authors?.some(a => a.family?.toLowerCase().includes(q) || a.given?.toLowerCase().includes(q))
  );
}

function getLocalReferencesByIds(ids: string[]): Reference[] {
  const idSet = new Set(ids);
  return getAllLocalReferences().filter(r => idSet.has(r.id));
}

function addLocalReference(ref: Omit<Reference, 'id' | 'created_at' | 'updated_at' | 'created_by' | 'pdf_url'>): Reference {
  const refs = getAllLocalReferences();
  const fullRef: Reference = {
    ...ref,
    id: crypto.randomUUID(),
    pdf_url: null,
    funding: ref.funding ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    created_by: null,
  } as Reference;
  refs.push(fullRef);
  saveLocalReferences(refs);
  return fullRef;
}

function updateLocalReference(id: string, updates: Record<string, any>): Reference {
  const refs = getAllLocalReferences();
  const idx = refs.findIndex(r => r.id === id);
  if (idx === -1) throw new Error('Reference not found');
  refs[idx] = { ...refs[idx], ...updates, updated_at: new Date().toISOString() };
  saveLocalReferences(refs);
  return refs[idx];
}

function deleteLocalReference(id: string) {
  const refs = getAllLocalReferences().filter(r => r.id !== id);
  saveLocalReferences(refs);
}
