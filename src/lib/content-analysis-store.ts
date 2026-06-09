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
  CodedSegment,
  CodeSuggestion,
  CodeNode,
  DocumentSummary,
  PdfAnchor,
  SummaryBlock,
} from './content-analysis/types';

// ── In-memory fallback ──────────────────────────────────────────────────────

interface GlobalCache {
  __caSegments?: CodedSegment[];
  __caSuggestions?: CodeSuggestion[];
  __caCodes?: CodeNode[];
  __caSummaries?: DocumentSummary[];
}
const g = globalThis as unknown as GlobalCache;
if (!g.__caSegments) g.__caSegments = [];
if (!g.__caSuggestions) g.__caSuggestions = [];
if (!g.__caCodes) g.__caCodes = [];
if (!g.__caSummaries) g.__caSummaries = [];

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

// Segments ------------------------------------------------------------------

export async function getSegments(): Promise<CodedSegment[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_segments')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(MAX_ROWS);
    if (error) {
      console.error('[content-analysis-store] getSegments failed:', error.message);
      return g.__caSegments!;
    }
    return (data as SegmentRow[]).map(rowToSegment);
  }
  return g.__caSegments!;
}

export async function upsertSegments(segs: CodedSegment[]): Promise<void> {
  if (segs.length === 0) return;
  const sb = getServerSupabase();
  if (sb) {
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
    if (error) {
      console.error('[content-analysis-store] upsertSegments failed:', error.message);
    } else {
      return;
    }
  }
  const bag = g.__caSegments!;
  for (const s of segs) {
    const idx = bag.findIndex(x => x.id === s.id);
    if (idx >= 0) bag[idx] = s;
    else bag.push(s);
  }
}

export async function updateSegmentNote(
  id: string,
  note: string,
  author?: { name?: string; id?: string },
): Promise<boolean> {
  const now = new Date().toISOString();
  const sb = getServerSupabase();
  if (sb) {
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
    if (error) {
      console.error('[content-analysis-store] updateSegmentNote failed:', error.message);
      return false;
    }
    return true;
  }
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

export async function deleteSegment(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_segments')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[content-analysis-store] deleteSegment failed:', error.message);
      return false;
    }
    return true;
  }
  const bag = g.__caSegments!;
  const idx = bag.findIndex(x => x.id === id);
  if (idx < 0) return false;
  bag.splice(idx, 1);
  return true;
}

// Suggestions ---------------------------------------------------------------

export async function getSuggestions(): Promise<CodeSuggestion[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_suggestions')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(MAX_ROWS);
    if (error) {
      console.error('[content-analysis-store] getSuggestions failed:', error.message);
      return g.__caSuggestions!;
    }
    return (data as SuggestionRow[]).map(rowToSuggestion);
  }
  return g.__caSuggestions!;
}

/** Replace all pending suggestions for a document with a fresh batch. */
export async function replaceDocumentSuggestions(
  documentId: string,
  suggestions: CodeSuggestion[],
): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error: delError } = await sb
      .from('content_analysis_suggestions')
      .delete()
      .eq('document_id', documentId);
    if (delError) {
      console.error(
        '[content-analysis-store] replaceDocumentSuggestions delete failed:',
        delError.message,
      );
    }
    if (suggestions.length > 0) {
      const { error: insError } = await sb
        .from('content_analysis_suggestions')
        .insert(suggestions.map(suggestionToRow));
      if (insError) {
        console.error(
          '[content-analysis-store] replaceDocumentSuggestions insert failed:',
          insError.message,
        );
      }
    }
    return;
  }
  const bag = g.__caSuggestions!;
  const kept = bag.filter(x => x.documentId !== documentId);
  kept.push(...suggestions);
  g.__caSuggestions = kept;
}

export async function deleteSuggestion(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_suggestions')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[content-analysis-store] deleteSuggestion failed:', error.message);
      return false;
    }
    return true;
  }
  const bag = g.__caSuggestions!;
  const idx = bag.findIndex(x => x.id === id);
  if (idx < 0) return false;
  bag.splice(idx, 1);
  return true;
}

export async function clearDocumentSuggestions(
  documentId: string,
): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_suggestions')
      .delete()
      .eq('document_id', documentId);
    if (error) {
      console.error(
        '[content-analysis-store] clearDocumentSuggestions failed:',
        error.message,
      );
    }
    return;
  }
  g.__caSuggestions = g.__caSuggestions!.filter(x => x.documentId !== documentId);
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
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_codes')
      .select('*')
      .limit(MAX_ROWS);
    if (error) {
      console.error('[content-analysis-store] getCodes failed:', error.message);
      return g.__caCodes!;
    }
    return (data as CodeRow[]).map(rowToCode);
  }
  return g.__caCodes!;
}

export async function upsertCodes(codes: CodeNode[]): Promise<void> {
  if (codes.length === 0) return;
  const sb = getServerSupabase();
  if (sb) {
    const rows = codes.map(codeToRow);
    const { error } = await sb
      .from('content_analysis_codes')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('[content-analysis-store] upsertCodes failed:', error.message);
    } else {
      return;
    }
  }
  const bag = g.__caCodes!;
  for (const c of codes) {
    const idx = bag.findIndex(x => x.id === c.id);
    if (idx >= 0) bag[idx] = c;
    else bag.push(c);
  }
}

export async function deleteCode(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_codes')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[content-analysis-store] deleteCode failed:', error.message);
      return false;
    }
    return true;
  }
  const bag = g.__caCodes!;
  const idx = bag.findIndex(x => x.id === id);
  if (idx < 0) return false;
  bag.splice(idx, 1);
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
  if (sb) {
    const primary = await sb
      .from('content_analysis_summaries')
      .select(SUMMARY_LIST_COLUMNS)
      .order('updated_at', { ascending: true })
      .limit(MAX_ROWS);
    let data: unknown = primary.data;
    let error = primary.error;
    // `block_count` (migration 055) is a newer column. On a database that
    // hasn't applied it yet, PostgREST rejects the unknown column — retry
    // without it so summaries still load (decks degrade to text-only) rather
    // than silently falling back to the per-process in-memory store, which is
    // never shared across users.
    if (error && /block_count/.test(error.message)) {
      const legacy = await sb
        .from('content_analysis_summaries')
        .select(SUMMARY_LIST_COLUMNS_LEGACY)
        .order('updated_at', { ascending: true })
        .limit(MAX_ROWS);
      data = legacy.data;
      error = legacy.error;
    }
    if (error) {
      console.error('[content-analysis-store] getSummaries failed:', error.message);
      return g.__caSummaries!.map(stripBlocks);
    }
    return (data as SummaryRow[]).map(rowToSummaryLight);
  }
  return g.__caSummaries!.map(stripBlocks);
}

/** Fetch a single summary with its full `blocks` deck hydrated. Returns
 *  `null` when no such summary exists. This is the lazy-load entry point —
 *  called when the user opens "Show summary". */
export async function getSummary(id: string): Promise<DocumentSummary | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_summaries')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) {
      console.error('[content-analysis-store] getSummary failed:', error.message);
      return g.__caSummaries!.find(s => s.id === id) ?? null;
    }
    return data ? rowToSummaryFull(data as SummaryRow) : null;
  }
  return g.__caSummaries!.find(s => s.id === id) ?? null;
}

export async function upsertSummaries(summaries: DocumentSummary[]): Promise<void> {
  if (summaries.length === 0) return;
  const sb = getServerSupabase();
  if (sb) {
    const rows = summaries.map(summaryToRow);
    let { error } = await sb
      .from('content_analysis_summaries')
      .upsert(rows, { onConflict: 'id' });
    // `blocks` and `block_count` (migration 055_content_analysis_summary_decks)
    // are newer columns. If the deploy reaches a database where that migration
    // hasn't been applied yet, PostgREST rejects the unknown columns — so retry
    // once without them rather than failing every summary save (and silently
    // dropping to the per-process in-memory store, which is never shared across
    // users). The plain-text lead still persists durably; the rich slide deck
    // falls back to localStorage until the columns land. Same pattern as
    // upsertSegments above.
    if (error && /(blocks|block_count)/.test(error.message)) {
      const legacyRows = rows.map(({ blocks: _b, block_count: _c, ...rest }) => rest);
      ({ error } = await sb
        .from('content_analysis_summaries')
        .upsert(legacyRows, { onConflict: 'id' }));
    }
    if (error) {
      console.error('[content-analysis-store] upsertSummaries failed:', error.message);
    } else {
      return;
    }
  }
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
}

export async function deleteSummary(id: string): Promise<boolean> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_summaries')
      .delete()
      .eq('id', id);
    if (error) {
      console.error('[content-analysis-store] deleteSummary failed:', error.message);
      return false;
    }
    return true;
  }
  const bag = g.__caSummaries!;
  const idx = bag.findIndex(x => x.id === id);
  if (idx < 0) return false;
  bag.splice(idx, 1);
  return true;
}
