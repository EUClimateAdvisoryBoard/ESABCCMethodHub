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
  CorpusDocMeta,
  DocumentSummary,
  PdfAnchor,
  SharedIngestedDocument,
  SummaryBlock,
  WorkspaceCorpusEntry,
} from './content-analysis/types';

// ── In-memory fallback ──────────────────────────────────────────────────────

interface GlobalCache {
  __caSegments?: CodedSegment[];
  __caSuggestions?: CodeSuggestion[];
  __caCodes?: CodeNode[];
  __caSummaries?: DocumentSummary[];
  __caDocuments?: SharedIngestedDocument[];
  /** project id → (document id → its corpus metadata, or null for legacy
   *  id-only entries) in that workspace corpus. */
  __caCorpus?: Map<string, Map<string, CorpusDocMeta | null>>;
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

/** The signed-in user behind a write, stamped onto rows (`author_id` /
 *  `added_by` / `updated_by`) so the activity-log triggers (migration 068)
 *  can attribute the change to a person. */
export interface StoreActor {
  id: string;
}

type Supa = NonNullable<ReturnType<typeof getServerSupabase>>;

/**
 * Stamp the deleter onto a row just before deleting it, so the DELETE trigger
 * sees who removed it (the service-role connection carries no auth.uid()).
 * The triggers ignore updates that only touch attribution columns, so this
 * never produces a spurious "edited" log entry. Best-effort by design.
 */
async function stampBeforeDelete(
  sb: Supa,
  table: string,
  patch: Record<string, string>,
  match: Record<string, string>,
): Promise<void> {
  let q = sb.from(table).update(patch);
  for (const [col, val] of Object.entries(match)) q = q.eq(col, val);
  const { error } = await q;
  if (error) {
    // Attribution column not migrated yet (or similar) — the delete itself
    // must still go ahead, just unattributed.
    console.warn(`[content-analysis-store] delete-stamp on ${table} skipped:`, error.message);
  }
}

// Segments ------------------------------------------------------------------

export async function getSegments(): Promise<CodedSegment[]> {
  const sb = getServerSupabase();
  if (!sb) return g.__caSegments!;
  const { data, error } = await sb
    .from('content_analysis_segments')
    .select('*')
    // Workspace-corpus membership rows stored via the segments fallback (see
    // the corpus section below) must never surface as coded segments.
    .neq('code_id', CORPUS_SENTINEL_CODE)
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);
  if (error) failDurable('getSegments', error);
  return (data as SegmentRow[]).map(rowToSegment);
}

export async function upsertSegments(segs: CodedSegment[], actor?: StoreActor): Promise<void> {
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
  // `author_id` records who last wrote the row; only touched when the route
  // resolved a signed-in user, so internal writers can't blank it out.
  const rows = segs.map(s =>
    actor ? { ...segmentToRow(s), author_id: actor.id } : segmentToRow(s),
  );
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
      // The note author is also the last person who touched the row.
      ...(author?.id ? { author_id: author.id } : {}),
      note_updated_at: now,
      updated_at: now,
    })
    .eq('id', id);
  if (error) failDurable('updateSegmentNote', error);
  return true;
}

export async function deleteSegment(id: string, actor?: StoreActor): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSegments!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag.splice(idx, 1);
    return true;
  }
  if (actor) {
    await stampBeforeDelete(sb, 'content_analysis_segments', { author_id: actor.id }, { id });
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

export async function upsertCodes(codes: CodeNode[], actor?: StoreActor): Promise<void> {
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
  const rows = codes.map(c => (actor ? { ...codeToRow(c), author_id: actor.id } : codeToRow(c)));
  const { error } = await sb
    .from('content_analysis_codes')
    .upsert(rows, { onConflict: 'id' });
  if (error) failDurable('upsertCodes', error);
}

export async function deleteCode(id: string, actor?: StoreActor): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caCodes!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag.splice(idx, 1);
    return true;
  }
  if (actor) {
    await stampBeforeDelete(sb, 'content_analysis_codes', { author_id: actor.id }, { id });
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

export async function upsertSummaries(
  summaries: DocumentSummary[],
  actor?: StoreActor,
): Promise<void> {
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
  const rows = summaries.map(s =>
    actor ? { ...summaryToRow(s), author_id: actor.id } : summaryToRow(s),
  );
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

export async function deleteSummary(id: string, actor?: StoreActor): Promise<boolean> {
  const sb = getServerSupabase();
  if (!sb) {
    const bag = g.__caSummaries!;
    const idx = bag.findIndex(x => x.id === id);
    if (idx < 0) return false;
    bag.splice(idx, 1);
    return true;
  }
  if (actor) {
    await stampBeforeDelete(sb, 'content_analysis_summaries', { author_id: actor.id }, { id });
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
//
// Primary backend: the `content_analysis_corpus` table (migrations 062 + 065).
// Fallback backend: sentinel rows in `content_analysis_segments` (migration
// 017). The corpus table only exists once the operator has applied the newer
// migrations to the production database — and when it doesn't, every corpus
// write used to 500 forever, which both lost the membership AND wedged the
// client's FIFO outbox so the coded-segment writes queued behind it stopped
// syncing too. The segments table is the one store proven to persist in every
// deployment (it's where the annotations that *do* sync live), so corpus
// membership degrades to it instead of failing: code_id is a reserved sentinel,
// project_id/document_id carry the membership, and `text` carries the JSON
// display metadata. Sentinel rows are filtered out of getSegments() and are
// migrated into the real table automatically the first time it is seen to
// exist.

/** Reserved code id marking a workspace-corpus membership row stored in the
 *  segments table. Never a real code; excluded from all segment reads. */
const CORPUS_SENTINEL_CODE = '__ws_corpus__';

function corpusSentinelId(projectId: string, documentId: string): string {
  return `wscorpus:${projectId}:${documentId}`;
}

/** Whether a PostgREST error means the `content_analysis_corpus` table itself
 *  is absent (migration 062 not applied), as opposed to any other failure. */
function isMissingCorpusTable(error: { code?: string; message: string }): boolean {
  if (error.code === '42P01' || error.code === 'PGRST205') {
    return true;
  }
  return (
    /content_analysis_corpus/i.test(error.message) &&
    /does not exist|schema cache|could not find/i.test(error.message)
  );
}

function parseSentinelMeta(text: string | null, documentId: string): CorpusDocMeta | null {
  if (!text) return null;
  try {
    const m = JSON.parse(text) as CorpusDocMeta;
    if (m && typeof m === 'object' && typeof m.title === 'string' && m.title) {
      return { ...m, id: documentId };
    }
  } catch {
    // Garbled meta — the membership itself still counts.
  }
  return null;
}

interface CorpusSentinelRow {
  document_id: string;
  text: string | null;
}

/** Corpus entries persisted as sentinel rows in the segments table, oldest
 *  first. Returns null when the read itself failed (so callers can tell "no
 *  fallback rows" apart from "couldn't look"). */
async function getCorpusSentinels(
  sb: NonNullable<ReturnType<typeof getServerSupabase>>,
  projectId: string,
): Promise<WorkspaceCorpusEntry[] | null> {
  const { data, error } = await sb
    .from('content_analysis_segments')
    .select('document_id, text')
    .eq('code_id', CORPUS_SENTINEL_CODE)
    .eq('project_id', projectId)
    .order('created_at', { ascending: true })
    .limit(MAX_ROWS);
  if (error) {
    console.error('[content-analysis-store] corpus sentinel read failed:', error.message);
    return null;
  }
  return (data as CorpusSentinelRow[]).map(r => ({
    documentId: r.document_id,
    meta: parseSentinelMeta(r.text, r.document_id),
  }));
}

/** Persist one corpus membership as a sentinel segment row. Throws (durable
 *  failure) if even the segments table can't take the write. */
async function addCorpusSentinel(
  sb: NonNullable<ReturnType<typeof getServerSupabase>>,
  projectId: string,
  documentId: string,
  meta?: CorpusDocMeta | null,
): Promise<void> {
  const { error } = await sb
    .from('content_analysis_segments')
    .upsert(
      {
        id: corpusSentinelId(projectId, documentId),
        document_id: documentId,
        code_id: CORPUS_SENTINEL_CODE,
        start_char: 0,
        end_char: 0,
        text: meta ? JSON.stringify(meta) : '',
        note: '',
        project_id: projectId,
      },
      { onConflict: 'id' },
    );
  if (error) failDurable('addToCaCorpus(segments fallback)', error);
}

function memCorpus(projectId: string): Map<string, CorpusDocMeta | null> {
  let map = g.__caCorpus!.get(projectId);
  if (!map) {
    map = new Map();
    g.__caCorpus!.set(projectId, map);
  }
  return map;
}

function memCorpusEntries(projectId: string): WorkspaceCorpusEntry[] {
  return [...memCorpus(projectId)].map(([documentId, meta]) => ({ documentId, meta: meta ?? null }));
}

interface CorpusRow {
  document_id: string;
  doc_meta: CorpusDocMeta | null;
}

/** Union primary-table entries with sentinel-fallback entries. Primary wins on
 *  a duplicate id (it's richer/newer); sentinel-only entries are appended. */
function mergeCorpusEntries(
  primary: WorkspaceCorpusEntry[],
  sentinels: WorkspaceCorpusEntry[] | null,
): { merged: WorkspaceCorpusEntry[]; sentinelOnly: WorkspaceCorpusEntry[] } {
  if (!sentinels || sentinels.length === 0) return { merged: primary, sentinelOnly: [] };
  const seen = new Set(primary.map(e => e.documentId));
  const sentinelOnly = sentinels.filter(e => !seen.has(e.documentId));
  return { merged: [...primary, ...sentinelOnly], sentinelOnly };
}

/** Entries (document id + self-describing metadata) in a project's workspace
 *  corpus, oldest first. */
export async function getCaCorpus(projectId: string): Promise<WorkspaceCorpusEntry[]> {
  const sb = getServerSupabase();
  if (!sb) return memCorpusEntries(projectId);

  // Fallback rows written while the corpus table was missing (or by an older
  // deploy). Read unconditionally: cheap (indexed), once per workbench mount.
  const sentinels = await getCorpusSentinels(sb, projectId);

  const { data, error } = await sb
    .from('content_analysis_corpus')
    .select('document_id, doc_meta')
    .eq('project_id', projectId)
    .order('added_at', { ascending: true })
    .limit(MAX_ROWS);
  if (!error) {
    const primary = (data as CorpusRow[]).map(r => ({ documentId: r.document_id, meta: r.doc_meta ?? null }));
    const { merged, sentinelOnly } = mergeCorpusEntries(primary, sentinels);
    // The real table exists: move any fallback rows into it so the sentinel
    // mechanism retires itself. Best-effort — on failure the sentinels stay
    // and the next read tries again.
    if (sentinels && sentinels.length > 0) {
      try {
        for (const e of sentinelOnly) await addToCaCorpus(projectId, e.documentId, e.meta);
        await sb
          .from('content_analysis_segments')
          .delete()
          .eq('code_id', CORPUS_SENTINEL_CODE)
          .eq('project_id', projectId);
      } catch {
        /* keep sentinels; retried on the next read */
      }
    }
    return merged;
  }
  // Graceful degradation: before migration 065 the `doc_meta` column doesn't
  // exist, so re-read the membership ids alone rather than returning nothing.
  if (/doc_meta/.test(error.message)) {
    const { data: idsData, error: idsError } = await sb
      .from('content_analysis_corpus')
      .select('document_id')
      .eq('project_id', projectId)
      .order('added_at', { ascending: true })
      .limit(MAX_ROWS);
    if (!idsError) {
      const primary = (idsData as { document_id: string }[]).map(r => ({ documentId: r.document_id, meta: null }));
      return mergeCorpusEntries(primary, sentinels).merged;
    }
    console.error('[content-analysis-store] getCaCorpus failed:', idsError.message);
    return sentinels ?? memCorpusEntries(projectId);
  }
  // Graceful degradation: the corpus table itself is absent (migration 062 not
  // applied to this database) — the sentinel rows in the segments table ARE
  // the corpus.
  if (isMissingCorpusTable(error)) {
    return sentinels ?? memCorpusEntries(projectId);
  }
  console.error('[content-analysis-store] getCaCorpus failed:', error.message);
  return sentinels ?? memCorpusEntries(projectId);
}

/** Add a document to a project's workspace corpus, with its self-describing
 *  display metadata. Idempotent; re-adding refreshes the stored metadata. */
export async function addToCaCorpus(
  projectId: string,
  documentId: string,
  meta?: CorpusDocMeta | null,
  actor?: StoreActor,
): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const base: Record<string, unknown> = {
      project_id: projectId,
      document_id: documentId,
      added_at: new Date().toISOString(),
    };
    if (actor) base.added_by = actor.id;
    // Only overwrite doc_meta when we actually have it, so a metadata-less
    // re-add (e.g. a legacy migration push) can't blank out a richer existing row.
    const row: Record<string, unknown> = meta ? { ...base, doc_meta: meta } : { ...base };
    let { error } = await sb
      .from('content_analysis_corpus')
      .upsert(row, { onConflict: 'project_id,document_id' });
    // Graceful degradation: `added_by` is a newer column (migration 068) —
    // retry without it rather than wedging the write until the column lands.
    if (error && actor && /added_by/.test(error.message)) {
      const { added_by: _ab, ...rowNoActor } = row;
      delete base.added_by;
      ({ error } = await sb
        .from('content_analysis_corpus')
        .upsert(rowNoActor, { onConflict: 'project_id,document_id' }));
    }
    if (!error) return;
    // Graceful degradation: if the `doc_meta` column hasn't been migrated yet
    // (migration 065), persist the membership row without it rather than wedging
    // the write. The workspace still syncs; it just lacks the richer metadata
    // until the column exists.
    if (meta && /doc_meta/.test(error.message)) {
      const { error: retryError } = await sb
        .from('content_analysis_corpus')
        .upsert(base, { onConflict: 'project_id,document_id' });
      if (!retryError) return;
      if (!isMissingCorpusTable(retryError)) failDurable('addToCaCorpus', retryError);
      await addCorpusSentinel(sb, projectId, documentId, meta);
      return;
    }
    // Graceful degradation: the corpus table itself is absent (migration 062
    // not applied to this database). Persist the membership as a sentinel row
    // in the segments table — the store annotations provably sync through —
    // instead of 500ing forever, which also wedged the client outbox and
    // stalled every queued segment write behind it.
    if (isMissingCorpusTable(error)) {
      await addCorpusSentinel(sb, projectId, documentId, meta);
      return;
    }
    failDurable('addToCaCorpus', error);
  }
  memCorpus(projectId).set(documentId, meta ?? memCorpus(projectId).get(documentId) ?? null);
}

/** Remove a document from a project's workspace corpus. Idempotent. */
export async function removeFromCaCorpus(
  projectId: string,
  documentId: string,
  actor?: StoreActor,
): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    // Clear any sentinel-fallback row first so a remove can't resurrect via
    // the sentinel merge on the next read. Idempotent; throws only if even
    // the segments table refuses the write.
    const { error: sentinelError } = await sb
      .from('content_analysis_segments')
      .delete()
      .eq('id', corpusSentinelId(projectId, documentId));
    if (sentinelError) failDurable('removeFromCaCorpus(segments fallback)', sentinelError);
    if (actor) {
      await stampBeforeDelete(
        sb,
        'content_analysis_corpus',
        { added_by: actor.id },
        { project_id: projectId, document_id: documentId },
      );
    }
    const { error } = await sb
      .from('content_analysis_corpus')
      .delete()
      .eq('project_id', projectId)
      .eq('document_id', documentId);
    if (!error || isMissingCorpusTable(error)) return;
    failDurable('removeFromCaCorpus', error);
  }
  memCorpus(projectId).delete(documentId);
}

/** Distinct project ids that have a workspace corpus, with document counts —
 *  used by the Word add-in's "Cite from project workspace" picker. Unions the
 *  primary corpus table with sentinel-fallback rows, deduped per
 *  (project, document) pair. Best-effort: a failed read contributes nothing. */
export async function listCaCorpusProjects(): Promise<Array<{ projectId: string; count: number }>> {
  const sb = getServerSupabase();
  if (!sb) {
    return [...g.__caCorpus!]
      .map(([projectId, docs]) => ({ projectId, count: docs.size }))
      .filter(p => p.count > 0);
  }
  const pairs = new Set<string>();
  const counts = new Map<string, number>();
  const tally = (rows: Array<{ project_id: string; document_id: string }> | null) => {
    for (const r of rows ?? []) {
      const key = `${r.project_id} ${r.document_id}`;
      if (pairs.has(key)) continue;
      pairs.add(key);
      counts.set(r.project_id, (counts.get(r.project_id) ?? 0) + 1);
    }
  };
  const { data: primary, error } = await sb
    .from('content_analysis_corpus')
    .select('project_id, document_id')
    .limit(MAX_ROWS);
  if (error && !isMissingCorpusTable(error)) {
    console.error('[content-analysis-store] listCaCorpusProjects failed:', error.message);
  }
  tally(primary as Array<{ project_id: string; document_id: string }> | null);
  const { data: sentinels } = await sb
    .from('content_analysis_segments')
    .select('project_id, document_id')
    .eq('code_id', CORPUS_SENTINEL_CODE)
    .limit(MAX_ROWS);
  tally(sentinels as Array<{ project_id: string; document_id: string }> | null);
  return [...counts.entries()].map(([projectId, count]) => ({ projectId, count }));
}

// Report outline ------------------------------------------------------------
// One JSON outline (the report section skeleton) per project workspace, shared
// so every collaborator edits the same structure. Stored opaquely as JSON here;
// the shape is owned by `content-analysis/report-structure.ts`.

const g2 = globalThis as unknown as { __caOutlines?: Map<string, unknown> };
if (!g2.__caOutlines) g2.__caOutlines = new Map();

/** The saved outline for a project, or null if none has been saved yet. */
export async function getCaOutline(projectId: string): Promise<unknown | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_outlines')
      .select('outline')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) {
      console.error('[content-analysis-store] getCaOutline failed:', error.message);
      return g2.__caOutlines!.get(projectId) ?? null;
    }
    return data ? (data as { outline: unknown }).outline : null;
  }
  return g2.__caOutlines!.get(projectId) ?? null;
}

/** Upsert the outline for a project. */
export async function setCaOutline(
  projectId: string,
  outline: unknown,
  actor?: StoreActor,
): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const row: Record<string, unknown> = {
      project_id: projectId,
      outline,
      updated_at: new Date().toISOString(),
    };
    if (actor) row.updated_by = actor.id;
    let { error } = await sb
      .from('content_analysis_outlines')
      .upsert(row, { onConflict: 'project_id' });
    // `updated_by` is a newer column (migration 068) — retry without it
    // rather than wedging the write until the column lands.
    if (error && actor && /updated_by/.test(error.message)) {
      const { updated_by: _ub, ...legacyRow } = row;
      ({ error } = await sb
        .from('content_analysis_outlines')
        .upsert(legacyRow, { onConflict: 'project_id' }));
    }
    if (!error) return;
    failDurable('setCaOutline', error);
  }
  g2.__caOutlines!.set(projectId, outline);
}
