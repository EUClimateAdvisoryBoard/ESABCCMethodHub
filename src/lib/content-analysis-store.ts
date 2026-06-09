/**
 * Persistent store for content-analysis coded segments and AI code
 * suggestions.
 *
 * Primary backend: Supabase tables `public.content_analysis_segments`
 * and `public.content_analysis_suggestions` (see
 * `supabase/migrations/017_content_analysis_codes.sql`). Uses the SERVICE
 * ROLE key (via `getServerSupabase`) so the API routes under
 * /api/content-analysis/* can write under the default "reads public,
 * writes service-role-only" RLS policy.
 *
 * Fallback: module-scoped in-memory cache on `globalThis`. Used only when
 * Supabase env vars are missing (local dev without `.env.local`). The
 * in-memory store is lossy — anything it holds vanishes on cold start.
 *
 * All public functions are async so callers don't need to know which
 * backend is active.
 */

import { getServerSupabase } from './supabase-server';
import type {
  Block,
  CodedSegment,
  CodeSuggestion,
  CodeNode,
  DocumentSummary,
  PdfAnchor,
  SharedIngestedDocument,
  SummaryBlock,
} from './content-analysis/types';

// ── In-memory fallback ──────────────────────────────────────────────────────

interface GlobalCache {
  __caSegments?: CodedSegment[];
  __caSuggestions?: CodeSuggestion[];
  __caCodes?: CodeNode[];
  __caSummaries?: DocumentSummary[];
  __caDocuments?: SharedIngestedDocument[];
  /** project id → set of document ids in that workspace corpus. */
  __caCorpus?: Map<string, Set<string>>;
}
const g = globalThis as unknown as GlobalCache;
if (!g.__caSegments) g.__caSegments = [];
if (!g.__caSuggestions) g.__caSuggestions = [];
if (!g.__caCodes) g.__caCodes = [];
if (!g.__caSummaries) g.__caSummaries = [];
if (!g.__caDocuments) g.__caDocuments = [];
if (!g.__caCorpus) g.__caCorpus = new Map();

const MAX_ROWS = 20000;

// ── Row ↔ item conversion ──────────────────────────────────────────────────

interface SegmentRow {
  id: string;
  document_id: string;
  code_id: string;
  block_id: string | null;
  start_char: number;
  end_char: number;
  text: string | null;
  note: string | null;
  note_author: string | null;
  note_author_id: string | null;
  note_updated_at: string | null;
  project_id: string | null;
  created_at: string | null;
  pdf_anchor: PdfAnchor | null;
  screenshot: string | null;
}

/** Defensively validate a `pdf_anchor` jsonb value read back from the DB (or
 *  posted by a client) — only a well-formed `{ page, rects }` shape survives. */
function coercePdfAnchor(raw: unknown): PdfAnchor | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const r = raw as Record<string, unknown>;
  if (typeof r.page !== 'number' || !Array.isArray(r.rects)) return undefined;
  const rects: number[][] = [];
  for (const rect of r.rects) {
    if (Array.isArray(rect) && rect.length === 4 && rect.every(n => typeof n === 'number')) {
      rects.push(rect as number[]);
    }
  }
  if (rects.length === 0) return undefined;
  return { page: r.page, rects };
}

function rowToSegment(r: SegmentRow): CodedSegment {
  return {
    id: r.id,
    documentId: r.document_id,
    codeId: r.code_id,
    blockId: r.block_id ?? undefined,
    pdfAnchor: coercePdfAnchor(r.pdf_anchor),
    screenshot: typeof r.screenshot === 'string' && r.screenshot ? r.screenshot : undefined,
    startChar: r.start_char,
    endChar: r.end_char,
    text: r.text ?? '',
    note: r.note ?? '',
    noteAuthor: r.note_author ?? undefined,
    noteAuthorId: r.note_author_id ?? undefined,
    noteUpdatedAt: r.note_updated_at ?? undefined,
    projectId: r.project_id,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function segmentToRow(s: CodedSegment): SegmentRow {
  return {
    id: s.id,
    document_id: s.documentId,
    code_id: s.codeId,
    block_id: s.blockId ?? null,
    start_char: s.startChar,
    end_char: s.endChar,
    text: s.text ?? '',
    note: s.note ?? '',
    note_author: s.noteAuthor ?? null,
    note_author_id: s.noteAuthorId ?? null,
    note_updated_at: s.noteUpdatedAt ?? null,
    project_id: s.projectId,
    created_at: s.createdAt,
    pdf_anchor: s.pdfAnchor ?? null,
    screenshot: s.screenshot ?? null,
  };
}

interface SuggestionRow {
  id: string;
  document_id: string;
  code_id: string;
  block_id: string | null;
  start_char: number;
  end_char: number;
  quote: string | null;
  rationale: string | null;
  confidence: number | null;
  model: string | null;
  created_at: string | null;
}

function rowToSuggestion(r: SuggestionRow): CodeSuggestion {
  return {
    id: r.id,
    documentId: r.document_id,
    codeId: r.code_id,
    blockId: r.block_id ?? undefined,
    startChar: r.start_char,
    endChar: r.end_char,
    quote: r.quote ?? '',
    rationale: r.rationale ?? '',
    confidence: r.confidence ?? 0,
    model: r.model ?? undefined,
    createdAt: r.created_at ?? new Date().toISOString(),
  };
}

function suggestionToRow(s: CodeSuggestion): SuggestionRow {
  return {
    id: s.id,
    document_id: s.documentId,
    code_id: s.codeId,
    block_id: s.blockId ?? null,
    start_char: s.startChar,
    end_char: s.endChar,
    quote: s.quote ?? '',
    rationale: s.rationale ?? '',
    confidence: s.confidence ?? 0,
    model: s.model ?? null,
    created_at: s.createdAt,
  };
}

// ── Public API ─────────────────────────────────────────────────────────────

export function isPersistent(): boolean {
  return getServerSupabase() !== null;
}

/**
 * A durable write failed while Supabase *was* configured. We must NOT pretend
 * it succeeded by silently dropping to the volatile in-memory cache (which is
 * per-lambda-instance on serverless and never shared across users) — that is
 * how content was being lost. Throw so the API route returns a non-OK status
 * and the client keeps the item queued in its outbox to retry until it lands.
 *
 * The in-memory bag stays in use *only* when Supabase is not configured at all
 * (local dev without env vars), reached by the `if (!sb)` branches below.
 */
function failDurable(op: string, error: { message: string }): never {
  console.error(`[content-analysis-store] ${op} failed:`, error.message);
  throw new Error(`${op} failed: ${error.message}`);
}

// Segments ------------------------------------------------------------------

export async function getSegments(): Promise<CodedSegment[]> {
  const sb = getServerSupabase();
  if (!sb) return g.__caSegments!;
  const { data, error } = await sb
    .from('content_analysis_segments')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);
  if (error) failDurable('getSegments', error);
  return (data as SegmentRow[]).map(rowToSegment);
}

export async function upsertSegments(segs: CodedSegment[]): Promise<void> {
  if (segs.length === 0) return;
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSegments!;
    for (const s of segs) {
      const idx = bag.findIndex(x => x.id === s.id);
      if (idx >= 0) bag[idx] = s;
      else bag.push(s);
    }
    return;
  }
  const rows = segs.map(segmentToRow);
  let { error } = await sb
    .from('content_analysis_segments')
    .upsert(rows, { onConflict: 'id' });
  // `pdf_anchor` (migration 057) and `screenshot` (migration 060) are newer
  // columns. If the deploy reaches a database where a migration hasn't been
  // applied yet, PostgREST rejects the unknown column — so retry once without
  // the newer columns rather than failing every segment save (the precise
  // highlight falls back to the block tint, and the figure screenshot to
  // localStorage, until the columns land). Detected by the column name.
  if (error && /(pdf_anchor|screenshot)/.test(error.message)) {
    const legacyRows = rows.map(({ pdf_anchor: _a, screenshot: _b, ...rest }) => rest);
    ({ error } = await sb
      .from('content_analysis_segments')
      .upsert(legacyRows, { onConflict: 'id' }));
  }
  if (error) failDurable('upsertSegments', error);
}

export async function updateSegmentNote(
  id: string,
  note: string,
  author?: { name?: string; id?: string },
): Promise<boolean> {
  const now = new Date().toISOString();
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSegments!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag[idx] = {
      ...bag[idx],
      note,
      noteAuthor: author?.name,
      noteAuthorId: author?.id,
      noteUpdatedAt: now,
    };
    return true;
  }
  const { error } = await sb
    .from('content_analysis_segments')
    .update({
      note,
      note_author: author?.name ?? null,
      note_author_id: author?.id ?? null,
      note_updated_at: now,
      updated_at: now,
    })
    .eq('id', id);
  if (error) failDurable('updateSegmentNote', error);
  return true;
}

export async function deleteSegment(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSegments!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag.splice(idx, 1);
    return true;
  }
  const { error } = await sb
    .from('content_analysis_segments')
    .delete()
    .eq('id', id);
  if (error) failDurable('deleteSegment', error);
  return true;
}

// Suggestions ---------------------------------------------------------------

export async function getSuggestions(): Promise<CodeSuggestion[]> {
  const sb = getServerSupabase();
  if (!sb) return g.__caSuggestions!;
  const { data, error } = await sb
    .from('content_analysis_suggestions')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);
  if (error) failDurable('getSuggestions', error);
  return (data as SuggestionRow[]).map(rowToSuggestion);
}

/** Replace all pending suggestions for a document with a fresh batch. */
export async function replaceDocumentSuggestions(
  documentId: string,
  suggestions: CodeSuggestion[],
): Promise<void> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSuggestions!;
    const kept = bag.filter(x => x.documentId !== documentId);
    kept.push(...suggestions);
    g.__caSuggestions = kept;
    return;
  }
  const { error: delError } = await sb
    .from('content_analysis_suggestions')
    .delete()
    .eq('document_id', documentId);
  if (delError) failDurable('replaceDocumentSuggestions (delete)', delError);
  if (suggestions.length > 0) {
    const { error: insError } = await sb
      .from('content_analysis_suggestions')
      .insert(suggestions.map(suggestionToRow));
    if (insError) failDurable('replaceDocumentSuggestions (insert)', insError);
  }
}

export async function deleteSuggestion(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSuggestions!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag.splice(idx, 1);
    return true;
  }
  const { error } = await sb
    .from('content_analysis_suggestions')
    .delete()
    .eq('id', id);
  if (error) failDurable('deleteSuggestion', error);
  return true;
}

export async function clearDocumentSuggestions(
  documentId: string,
): Promise<void> {
  const sb = getServerSupabase();
  if (!sb) {
    g.__caSuggestions = g.__caSuggestions!.filter(x => x.documentId !== documentId);
    return;
  }
  const { error } = await sb
    .from('content_analysis_suggestions')
    .delete()
    .eq('document_id', documentId);
  if (error) failDurable('clearDocumentSuggestions', error);
}

// Codes ---------------------------------------------------------------------
// Only runtime (user-created, typically project-scoped) codes are persisted
// here — master codes are deterministic seed data and resolve client-side.

interface CodeRow {
  id: string;
  parent_id: string | null;
  name: string;
  description: string | null;
  color: string;
  scope: string;
  project_id: string | null;
  updated_at?: string;
}

function rowToCode(r: CodeRow): CodeNode {
  return {
    id: r.id,
    parentId: r.parent_id,
    name: r.name,
    description: r.description ?? undefined,
    color: r.color,
    scope: r.scope === 'master' ? 'master' : 'project',
    projectId: r.project_id ?? undefined,
    createdAt: r.updated_at ?? new Date().toISOString(),
  };
}

function codeToRow(c: CodeNode): CodeRow {
  return {
    id: c.id,
    parent_id: c.parentId,
    name: c.name,
    description: c.description ?? '',
    color: c.color,
    scope: c.scope,
    project_id: c.projectId ?? null,
    updated_at: new Date().toISOString(),
  };
}

export async function getCodes(): Promise<CodeNode[]> {
  const sb = getServerSupabase();
  if (!sb) return g.__caCodes!;
  const { data, error } = await sb
    .from('content_analysis_codes')
    .select('*')
    .limit(MAX_ROWS);
  if (error) failDurable('getCodes', error);
  return (data as CodeRow[]).map(rowToCode);
}

export async function upsertCodes(codes: CodeNode[]): Promise<void> {
  if (codes.length === 0) return;
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caCodes!;
    for (const c of codes) {
      const idx = bag.findIndex(x => x.id === c.id);
      if (idx >= 0) bag[idx] = c;
      else bag.push(c);
    }
    return;
  }
  const rows = codes.map(codeToRow);
  const { error } = await sb
    .from('content_analysis_codes')
    .upsert(rows, { onConflict: 'id' });
  if (error) failDurable('upsertCodes', error);
}

export async function deleteCode(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caCodes!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag.splice(idx, 1);
    return true;
  }
  const { error } = await sb
    .from('content_analysis_codes')
    .delete()
    .eq('id', id);
  if (error) failDurable('deleteCode', error);
  return true;
}

// Summaries -----------------------------------------------------------------
// Whole-document, free-text summaries ("comment for the entire paper"),
// scoped by (document_id, project_id) with a deterministic id so re-saving
// updates the row in place.

interface SummaryRow {
  id: string;
  document_id: string;
  project_id: string | null;
  text: string | null;
  blocks?: SummaryBlock[] | null;
  block_count?: number | null;
  created_at: string | null;
  updated_at: string | null;
}

// Columns shipped in the bulk list — deliberately *excludes* `blocks` so the
// heavy screenshot payloads are not loaded until the user opens a summary.
const SUMMARY_LIST_COLUMNS = 'id,document_id,project_id,text,block_count,created_at,updated_at';

/** Light mapping for the bulk list: no `blocks` (lazy), just `blockCount`. */
function rowToSummaryLight(r: SummaryRow): DocumentSummary {
  return {
    id: r.id,
    documentId: r.document_id,
    projectId: r.project_id,
    text: r.text ?? '',
    blockCount: typeof r.block_count === 'number' ? r.block_count : 0,
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? r.created_at ?? new Date().toISOString(),
  };
}

/** Full mapping including the hydrated `blocks` deck. */
function rowToSummaryFull(r: SummaryRow): DocumentSummary {
  const blocks = Array.isArray(r.blocks) ? r.blocks : [];
  return { ...rowToSummaryLight(r), blocks, blockCount: blocks.length };
}

function summaryToRow(s: DocumentSummary): SummaryRow {
  const blocks = Array.isArray(s.blocks) ? s.blocks : [];
  return {
    id: s.id,
    document_id: s.documentId,
    project_id: s.projectId,
    text: s.text ?? '',
    blocks,
    block_count: blocks.length,
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

/** Drop the heavy `blocks` from a summary, leaving a light list entry that
 *  still carries `blockCount` for the badge / "Show summary" affordance. */
function stripBlocks(s: DocumentSummary): DocumentSummary {
  const { blocks, ...rest } = s;
  return { ...rest, blockCount: Array.isArray(blocks) ? blocks.length : (s.blockCount ?? 0) };
}

// Light list columns minus `block_count` — the fallback select for a database
// where the summary-decks migration (055_content_analysis_summary_decks) hasn't
// landed yet, so `blocks`/`block_count` don't exist.
const SUMMARY_LIST_COLUMNS_LEGACY = 'id,document_id,project_id,text,created_at,updated_at';

export async function getSummaries(): Promise<DocumentSummary[]> {
  const sb = getServerSupabase();
  if (!sb) return g.__caSummaries!.map(stripBlocks);
  const primary = await sb
    .from('content_analysis_summaries')
    .select(SUMMARY_LIST_COLUMNS)
    .order('updated_at', { ascending: true })
    .limit(MAX_ROWS);
  let data: unknown = primary.data;
  let error = primary.error;
  // `block_count` (migration 055) is a newer column. On a database that
  // hasn't applied it yet, PostgREST rejects the unknown column — retry
  // without it so summaries still load (decks degrade to text-only).
  if (error && /block_count/.test(error.message)) {
    const legacy = await sb
      .from('content_analysis_summaries')
      .select(SUMMARY_LIST_COLUMNS_LEGACY)
      .order('updated_at', { ascending: true })
      .limit(MAX_ROWS);
    data = legacy.data;
    error = legacy.error;
  }
  if (error) failDurable('getSummaries', error);
  return (data as SummaryRow[]).map(rowToSummaryLight);
}

/** Fetch a single summary with its full `blocks` deck hydrated. Returns
 *  `null` when no such summary exists. This is the lazy-load entry point —
 *  called when the user opens "Show summary". */
export async function getSummary(id: string): Promise<DocumentSummary | null> {
  const sb = getServerSupabase();
  if (!sb) return g.__caSummaries!.find(s => s.id === id) ?? null;
  const { data, error } = await sb
    .from('content_analysis_summaries')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) failDurable('getSummary', error);
  return data ? rowToSummaryFull(data as SummaryRow) : null;
}

export async function upsertSummaries(summaries: DocumentSummary[]): Promise<void> {
  if (summaries.length === 0) return;
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSummaries!;
    for (const s of summaries) {
      const withCount: DocumentSummary = {
        ...s,
        blocks: Array.isArray(s.blocks) ? s.blocks : [],
        blockCount: Array.isArray(s.blocks) ? s.blocks.length : 0,
      };
      const idx = bag.findIndex(x => x.id === s.id);
      if (idx >= 0) bag[idx] = withCount;
      else bag.push(withCount);
    }
    return;
  }
  const rows = summaries.map(summaryToRow);
  let { error } = await sb
    .from('content_analysis_summaries')
    .upsert(rows, { onConflict: 'id' });
  // `blocks` and `block_count` (migration 055_content_analysis_summary_decks)
  // are newer columns. If the deploy reaches a database where that migration
  // hasn't been applied yet, PostgREST rejects the unknown columns — so retry
  // once without them rather than failing every summary save. The plain-text
  // lead still persists durably; the rich slide deck falls back to localStorage
  // until the columns land. Same pattern as upsertSegments above.
  if (error && /(blocks|block_count)/.test(error.message)) {
    const legacyRows = rows.map(({ blocks: _b, block_count: _c, ...rest }) => rest);
    ({ error } = await sb
      .from('content_analysis_summaries')
      .upsert(legacyRows, { onConflict: 'id' }));
  }
  if (error) failDurable('upsertSummaries', error);
}

export async function deleteSummary(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSummaries!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag.splice(idx, 1);
    return true;
  }
  const { error } = await sb
    .from('content_analysis_summaries')
    .delete()
    .eq('id', id);
  if (error) failDurable('deleteSummary', error);
  return true;
}

// Documents ------------------------------------------------------------------
// Ingested document substrate (extracted text + block boxes), keyed by the
// document id, so once anyone ingests a PDF its text/blocks are shared with
// every user — they no longer have to re-upload it. The heavy `text`/`blocks`
// are excluded from the bulk list and lazy-loaded per document.

interface DocumentRow {
  id: string;
  title: string | null;
  celex_number: string | null;
  page_count: number | null;
  ingest_source: string | null;
  pdf_url: string | null;
  text?: string | null;
  blocks?: Block[] | null;
  ingested_at: string | null;
  updated_at?: string | null;
}

const DOCUMENT_LIST_COLUMNS =
  'id,title,celex_number,page_count,ingest_source,pdf_url,ingested_at,updated_at';

function rowToDocumentLight(r: DocumentRow): SharedIngestedDocument {
  return {
    id: r.id,
    title: r.title ?? '',
    celexNumber: r.celex_number,
    pageCount: typeof r.page_count === 'number' ? r.page_count : 0,
    ingestSource: (r.ingest_source as SharedIngestedDocument['ingestSource']) ?? undefined,
    pdfUrl: r.pdf_url ?? '',
    ingestedAt: r.ingested_at ?? new Date().toISOString(),
    text: '',
    blocks: [],
  };
}

function rowToDocumentFull(r: DocumentRow): SharedIngestedDocument {
  return {
    ...rowToDocumentLight(r),
    text: r.text ?? '',
    blocks: Array.isArray(r.blocks) ? r.blocks : [],
  };
}

function documentToRow(d: SharedIngestedDocument): DocumentRow {
  return {
    id: d.id,
    title: d.title,
    celex_number: d.celexNumber,
    page_count: d.pageCount,
    ingest_source: d.ingestSource ?? null,
    pdf_url: d.pdfUrl,
    text: d.text ?? '',
    blocks: Array.isArray(d.blocks) ? d.blocks : [],
    ingested_at: d.ingestedAt,
    updated_at: new Date().toISOString(),
  };
}

function stripDocBody(d: SharedIngestedDocument): SharedIngestedDocument {
  return { ...d, text: '', blocks: [] };
}

export async function getCaDocuments(): Promise<SharedIngestedDocument[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_documents')
      .select(DOCUMENT_LIST_COLUMNS)
      .order('updated_at', { ascending: true })
      .limit(MAX_ROWS);
    if (error) {
      console.error('[content-analysis-store] getCaDocuments failed:', error.message);
      return g.__caDocuments!.map(stripDocBody);
    }
    return (data as DocumentRow[]).map(rowToDocumentLight);
  }
  return g.__caDocuments!.map(stripDocBody);
}

/** Fetch one document with its full text + blocks hydrated. */
export async function getCaDocument(id: string): Promise<SharedIngestedDocument | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_documents')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[content-analysis-store] getCaDocument failed:', error.message);
      return g.__caDocuments!.find(d => d.id === id) ?? null;
    }
    return data ? rowToDocumentFull(data as DocumentRow) : null;
  }
  return g.__caDocuments!.find(d => d.id === id) ?? null;
}

export async function upsertCaDocuments(docs: SharedIngestedDocument[]): Promise<void> {
  if (docs.length === 0) return;
  const sb = getServerSupabase();
  if (sb) {
    const rows = docs.map(documentToRow);
    const { error } = await sb
      .from('content_analysis_documents')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('[content-analysis-store] upsertCaDocuments failed:', error.message);
    } else {
      return;
    }
  }
  const bag = g.__caDocuments!;
  for (const d of docs) {
    const idx = bag.findIndex(x => x.id === d.id);
    if (idx >= 0) bag[idx] = d;
    else bag.push(d);
  }
}

// Workspace corpus ----------------------------------------------------------
// The set of document ids an analyst has added to a project workspace (the
// "In this workspace" list). Shared per project so every collaborator sees the
// same documents.

function memCorpus(projectId: string): Set<string> {
  let set = g.__caCorpus!.get(projectId);
  if (!set) {
    set = new Set();
    g.__caCorpus!.set(projectId, set);
  }
  return set;
}

interface CorpusRow {
  document_id: string;
}

/** Document ids in a project's workspace corpus. */
export async function getCaCorpus(projectId: string): Promise<string[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_corpus')
      .select('document_id')
      .eq('project_id', projectId)
      .order('added_at', { ascending: true })
      .limit(MAX_ROWS);
    if (error) {
      console.error('[content-analysis-store] getCaCorpus failed:', error.message);
      return [...memCorpus(projectId)];
    }
    return (data as CorpusRow[]).map(r => r.document_id);
  }
  return [...memCorpus(projectId)];
}

/** Add a document to a project's workspace corpus. Idempotent. */
export async function addToCaCorpus(projectId: string, documentId: string): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_corpus')
      .upsert(
        { project_id: projectId, document_id: documentId, added_at: new Date().toISOString() },
        { onConflict: 'project_id,document_id' },
      );
    if (!error) return;
    failDurable('addToCaCorpus', error);
  }
  memCorpus(projectId).add(documentId);
}

/** Remove a document from a project's workspace corpus. Idempotent. */
export async function removeFromCaCorpus(projectId: string, documentId: string): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_corpus')
      .delete()
      .eq('project_id', projectId)
      .eq('document_id', documentId);
    if (!error) return;
    failDurable('removeFromCaCorpus', error);
  }
  memCorpus(projectId).delete(documentId);
}
