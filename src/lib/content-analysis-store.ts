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
}

function rowToSegment(r: SegmentRow): CodedSegment {
  return {
    id: r.id,
    documentId: r.document_id,
    codeId: r.code_id,
    blockId: r.block_id ?? undefined,
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
    const { error } = await sb
      .from('content_analysis_segments')
      .upsert(rows, { onConflict: 'id' });
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
  created_at: string | null;
  updated_at: string | null;
}

function rowToSummary(r: SummaryRow): DocumentSummary {
  return {
    id: r.id,
    documentId: r.document_id,
    projectId: r.project_id,
    text: r.text ?? '',
    createdAt: r.created_at ?? new Date().toISOString(),
    updatedAt: r.updated_at ?? r.created_at ?? new Date().toISOString(),
  };
}

function summaryToRow(s: DocumentSummary): SummaryRow {
  return {
    id: s.id,
    document_id: s.documentId,
    project_id: s.projectId,
    text: s.text ?? '',
    created_at: s.createdAt,
    updated_at: s.updatedAt,
  };
}

export async function getSummaries(): Promise<DocumentSummary[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_summaries')
      .select('*')
      .order('updated_at', { ascending: true })
      .limit(MAX_ROWS);
    if (error) {
      console.error('[content-analysis-store] getSummaries failed:', error.message);
      return g.__caSummaries!;
    }
    return (data as SummaryRow[]).map(rowToSummary);
  }
  return g.__caSummaries!;
}

export async function upsertSummaries(summaries: DocumentSummary[]): Promise<void> {
  if (summaries.length === 0) return;
  const sb = getServerSupabase();
  if (sb) {
    const rows = summaries.map(summaryToRow);
    const { error } = await sb
      .from('content_analysis_summaries')
      .upsert(rows, { onConflict: 'id' });
    if (error) {
      console.error('[content-analysis-store] upsertSummaries failed:', error.message);
    } else {
      return;
    }
  }
  const bag = g.__caSummaries!;
  for (const s of summaries) {
    const idx = bag.findIndex(x => x.id === s.id);
    if (idx >= 0) bag[idx] = s;
    else bag.push(s);
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
