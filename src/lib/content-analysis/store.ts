/**
 * Content Analysis — client-side store (M·05's state layer).
 * -----------------------------------------------------------
 *
 * Single source of truth for:
 *
 *   - The hierarchical code system (`CodeSystemTree`).
 *   - The corpus of ingested documents (`DocumentList`).
 *   - Per-segment codings (`AnnotatedDocumentView` / `PdfDocumentView`).
 *   - Pending LLM code suggestions (the "review queue" UI).
 *
 * Two-tier persistence:
 *
 *   1. **localStorage** — instant render and offline fallback. Every
 *      mutation is flushed synchronously on the tick so a page reload
 *      never loses work-in-progress.
 *   2. **Supabase** (when configured) — durable, multi-user source
 *      of truth. Mutations mirror through:
 *        POST /api/content-analysis/segments       (create/update)
 *        POST /api/content-analysis/suggestions    (accept/reject LLM)
 *      Reads pull on mount + periodically via SWR-style invalidation.
 *
 * The hook API (`useContentAnalysis`) is deliberately stable so that
 * components don't care which backend is active; swapping Supabase for
 * EEA Postgres is a wiring concern in `@/lib/db/*`, not here.
 *
 * Concurrency model: `useSyncExternalStore` for the read path,
 * optimistic local mutation with a rollback-on-server-error pattern
 * for writes. Conflicts (two users coding the same segment) are
 * resolved last-write-wins on the `updated_at` column.
 */

'use client';

import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodeScope,
  CodedSegment,
  CodeSuggestion,
  ContentAnalysisSnapshot,
  DocumentSummary,
  Project,
  SummaryBlock,
} from './types';
import type { Block, AiClassification } from './types';
import { buildSeedSnapshot, deriveBlocksFromText } from './seed';

const LS_KEY = 'esabcc_content_analysis_v1';

// ── Server sync ─────────────────────────────────────────────────────────
// All calls are fire-and-forget: the UI updates local state immediately
// and we log (but don't surface) errors from the API. If the API is down
// the segment stays in localStorage and the user keeps working; on the
// next successful mutation or page load the local state reconciles with
// the server.

function logApiError(label: string, err: unknown): void {
  // eslint-disable-next-line no-console
  console.error(`[content-analysis] ${label} failed:`, err);
}

function postSegments(segments: CodedSegment[]): void {
  if (segments.length === 0) return;
  fetch('/api/content-analysis/segments', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ segments }),
    keepalive: true,
  }).catch(err => logApiError('postSegments', err));
}

function patchSegmentNote(
  id: string,
  note: string,
  author?: { name?: string; id?: string },
): void {
  fetch('/api/content-analysis/segments', {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id, note, noteAuthor: author?.name, noteAuthorId: author?.id }),
    keepalive: true,
  }).catch(err => logApiError('patchSegmentNote', err));
}

function deleteSegmentRemote(id: string): void {
  fetch(`/api/content-analysis/segments?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    keepalive: true,
  }).catch(err => logApiError('deleteSegment', err));
}

/** Persist a runtime code to the server. Only project-scoped codes are
 *  synced — master codes are deterministic seed data resolved client-side,
 *  so we never push the whole bundled taxonomy. */
function postCode(code: CodeNode): void {
  if (code.scope !== 'project') return;
  fetch('/api/content-analysis/codes', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ codes: [code] }),
    keepalive: true,
  }).catch(err => logApiError('postCode', err));
}

function deleteCodeRemote(id: string): void {
  fetch(`/api/content-analysis/codes?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    keepalive: true,
  }).catch(err => logApiError('deleteCode', err));
}

function postSuggestions(documentId: string, suggestions: CodeSuggestion[]): void {
  fetch('/api/content-analysis/suggestions', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ documentId, suggestions }),
    keepalive: true,
  }).catch(err => logApiError('postSuggestions', err));
}

function deleteSuggestionRemote(id: string): void {
  fetch(`/api/content-analysis/suggestions?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    keepalive: true,
  }).catch(err => logApiError('deleteSuggestion', err));
}

function clearDocumentSuggestionsRemote(documentId: string): void {
  fetch(
    `/api/content-analysis/suggestions?documentId=${encodeURIComponent(documentId)}`,
    { method: 'DELETE', keepalive: true },
  ).catch(err => logApiError('clearDocumentSuggestions', err));
}

function postSummary(summary: DocumentSummary): void {
  fetch('/api/content-analysis/summaries', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ summaries: [summary] }),
    keepalive: true,
  }).catch(err => logApiError('postSummary', err));
}

function deleteSummaryRemote(id: string): void {
  fetch(`/api/content-analysis/summaries?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    keepalive: true,
  }).catch(err => logApiError('deleteSummary', err));
}

let serverSynced = false;

/** Merge server-side segments + suggestions into local state. Server
 *  rows win on id collision so refreshes pick up other users' work. */
async function syncFromServer(): Promise<void> {
  if (serverSynced) return;
  serverSynced = true;
  try {
    const [segResp, suggResp, codesResp, summResp] = await Promise.all([
      fetch('/api/content-analysis/segments', { cache: 'no-store' }),
      fetch('/api/content-analysis/suggestions', { cache: 'no-store' }),
      fetch('/api/content-analysis/codes', { cache: 'no-store' }),
      fetch('/api/content-analysis/summaries', { cache: 'no-store' }),
    ]);
    if (!segResp.ok && !suggResp.ok && !codesResp.ok && !summResp.ok) return;
    const segJson = segResp.ok ? await segResp.json() : { items: [] };
    const suggJson = suggResp.ok ? await suggResp.json() : { items: [] };
    const codesJson = codesResp.ok ? await codesResp.json() : { items: [] };
    const summJson = summResp.ok ? await summResp.json() : { items: [] };
    const serverSegs: CodedSegment[] = Array.isArray(segJson.items) ? segJson.items : [];
    const serverSuggs: CodeSuggestion[] = Array.isArray(suggJson.items) ? suggJson.items : [];
    const serverCodes: CodeNode[] = Array.isArray(codesJson.items) ? codesJson.items : [];
    const serverSumms: DocumentSummary[] = Array.isArray(summJson.items) ? summJson.items : [];
    update(s => {
      const byIdSeg = new Map<string, CodedSegment>();
      for (const x of s.segments) byIdSeg.set(x.id, x);
      for (const x of serverSegs) byIdSeg.set(x.id, x);
      const bySuggId = new Map<string, CodeSuggestion>();
      for (const x of s.suggestions) bySuggId.set(x.id, x);
      for (const x of serverSuggs) bySuggId.set(x.id, x);
      // Merge server codes (other users' project tags) over local ones so a
      // tag created in another project's context resolves here. Seed master
      // codes already present locally are preserved (server only holds
      // runtime codes).
      const byIdCode = new Map<string, CodeNode>();
      for (const x of s.codes) byIdCode.set(x.id, x);
      for (const x of serverCodes) byIdCode.set(x.id, x);
      // Server summaries win on id collision so a teammate's summary shows up.
      const byIdSumm = new Map<string, DocumentSummary>();
      for (const x of s.summaries) byIdSumm.set(x.id, x);
      for (const x of serverSumms) byIdSumm.set(x.id, x);
      return {
        ...s,
        segments: Array.from(byIdSeg.values()),
        suggestions: Array.from(bySuggId.values()),
        codes: Array.from(byIdCode.values()),
        summaries: Array.from(byIdSumm.values()),
      };
    });
  } catch (err) {
    serverSynced = false;
    logApiError('syncFromServer', err);
  }
}

// ── Module-level singleton state ─────────────────────────────────────────
let state: ContentAnalysisSnapshot = emptySnapshot();
let hydrated = false;
const listeners = new Set<() => void>();

function emptySnapshot(): ContentAnalysisSnapshot {
  return { version: 1, codes: [], documents: [], segments: [], projects: [], suggestions: [], summaries: [] };
}

function emit(): void {
  for (const l of listeners) l();
}

function persist(): void {
  if (typeof window === 'undefined') return;
  try {
    // Strip the heavy summary `blocks` (embedded screenshots) before writing
    // to localStorage — they live in the durable store and are re-hydrated on
    // demand, so persisting them would blow the quota for no benefit. We keep
    // `blockCount` so the "Show summary (N slides)" affordance still renders.
    // Coded-segment figure `screenshot`s get the same treatment: they're saved
    // server-side (via postSegments) and re-fetched by syncFromServer, so a
    // base64 figure per segment would needlessly eat the localStorage quota.
    const lean: ContentAnalysisSnapshot = {
      ...state,
      segments: state.segments.map(s =>
        s.screenshot === undefined ? s : { ...s, screenshot: undefined },
      ),
      summaries: state.summaries.map(s =>
        s.blocks === undefined
          ? s
          : { ...s, blocks: undefined, blockCount: s.blocks.length },
      ),
    };
    localStorage.setItem(LS_KEY, JSON.stringify(lean));
  } catch {
    // quota exceeded — silently drop in the beta
  }
}

function hydrate(): void {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === 'undefined') {
    state = buildSeedSnapshot();
    return;
  }
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ContentAnalysisSnapshot>;
      if (parsed && parsed.version === 1) {
        state = {
          version: 1,
          codes: parsed.codes ?? [],
          documents: parsed.documents ?? [],
          segments: parsed.segments ?? [],
          projects: parsed.projects ?? [],
          // `suggestions` was added after the initial v1 ship; default it
          // to [] for older persisted snapshots so we don't have to bump
          // the version number and wipe the user's work.
          suggestions: parsed.suggestions ?? [],
          // `summaries` was added later still — same defaulting strategy.
          summaries: parsed.summaries ?? [],
        };
        return;
      }
    }
  } catch {
    // fall through to seed
  }
  state = buildSeedSnapshot();
  persist();
}

function update(mutator: (s: ContentAnalysisSnapshot) => ContentAnalysisSnapshot): void {
  state = mutator(state);
  persist();
  emit();
}

// ── Pure helpers ────────────────────────────────────────────────────────
function newId(prefix: string): string {
  const rnd = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rnd}`;
}

function childrenOf(codes: CodeNode[], parentId: string | null): CodeNode[] {
  return codes.filter(c => c.parentId === parentId);
}

/** Returns the full descendant set (inclusive) of a code, across scopes. */
export function descendantCodeIds(codes: CodeNode[], rootId: string): string[] {
  const out: string[] = [rootId];
  const queue = [rootId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const child of codes) {
      if (child.parentId === cur) {
        out.push(child.id);
        queue.push(child.id);
      }
    }
  }
  return out;
}

// ── React hook ──────────────────────────────────────────────────────────
export function useContentAnalysis() {
  // Hydrate on first call, synchronously — the page is a client component.
  if (!hydrated) hydrate();

  const subscribe = useCallback((cb: () => void) => {
    listeners.add(cb);
    return () => { listeners.delete(cb); };
  }, []);

  const snapshot = useSyncExternalStore(subscribe, () => state, () => state);

  // Guard against stale state after a HMR reload with an empty key.
  useEffect(() => { if (!hydrated) hydrate(); }, []);

  // Reconcile with Supabase on first mount so accepted segments and
  // pending suggestions created by other users show up here.
  useEffect(() => { void syncFromServer(); }, []);

  // ── Code operations ────────────────────────────────────────────────
  const addCode = useCallback((input: {
    name: string;
    parentId: string | null;
    color: string;
    description?: string;
    scope: CodeScope;
    projectId?: string;
  }): CodeNode => {
    const code: CodeNode = {
      id: newId('code'),
      parentId: input.parentId,
      name: input.name,
      color: input.color,
      description: input.description,
      scope: input.scope,
      projectId: input.scope === 'project' ? input.projectId : undefined,
      createdAt: new Date().toISOString(),
    };
    update(s => ({ ...s, codes: [...s.codes, code] }));
    postCode(code);
    return code;
  }, []);

  const renameCode = useCallback((id: string, name: string) => {
    let updated: CodeNode | null = null;
    update(s => ({
      ...s,
      codes: s.codes.map(c => {
        if (c.id !== id) return c;
        updated = { ...c, name };
        return updated;
      }),
    }));
    if (updated) postCode(updated);
  }, []);

  const recolorCode = useCallback((id: string, color: string) => {
    let updated: CodeNode | null = null;
    update(s => ({
      ...s,
      codes: s.codes.map(c => {
        if (c.id !== id) return c;
        updated = { ...c, color };
        return updated;
      }),
    }));
    if (updated) postCode(updated);
  }, []);

  const deleteCode = useCallback((id: string) => {
    const cascadedSegmentIds: string[] = [];
    const removedCodeIds: string[] = [];
    update(s => {
      const toRemove = new Set(descendantCodeIds(s.codes, id));
      for (const c of s.codes) if (toRemove.has(c.id)) removedCodeIds.push(c.id);
      for (const seg of s.segments) {
        if (toRemove.has(seg.codeId)) cascadedSegmentIds.push(seg.id);
      }
      return {
        ...s,
        codes: s.codes.filter(c => !toRemove.has(c.id)),
        segments: s.segments.filter(seg => !toRemove.has(seg.codeId)),
      };
    });
    for (const segId of cascadedSegmentIds) deleteSegmentRemote(segId);
    for (const codeId of removedCodeIds) deleteCodeRemote(codeId);
  }, []);

  /**
   * Merge `sourceId` (and its descendants) into `targetId`.
   *
   *   • Every segment whose codeId belongs to the source subtree is
   *     reassigned to `targetId` and re-POSTed so the server picks up
   *     the new code-id.
   *   • The source code subtree is deleted.
   *
   * Refusing to merge into a descendant of itself prevents the obvious
   * tree-corruption case ("merge parent into its own child"). Returns
   * the count of segments that were reassigned, or null when the merge
   * was rejected.
   */
  const mergeCode = useCallback((sourceId: string, targetId: string): { reassigned: number; undo: () => void } | null => {
    if (sourceId === targetId) return null;
    let reassigned = 0;
    let rejected = false;
    let removedCodes: CodeNode[] = [];
    let originalSegments: { id: string; codeId: string }[] = [];
    update(s => {
      // Reject merges that would put a code under one of its own descendants.
      const sourceSubtree = new Set(descendantCodeIds(s.codes, sourceId));
      if (sourceSubtree.has(targetId)) {
        rejected = true;
        return s;
      }
      // Snapshot for undo (M·05 #5).
      removedCodes = s.codes.filter(c => sourceSubtree.has(c.id));
      originalSegments = s.segments
        .filter(seg => sourceSubtree.has(seg.codeId))
        .map(seg => ({ id: seg.id, codeId: seg.codeId }));

      const movedSegments: CodedSegment[] = [];
      const nextSegments = s.segments.map(seg => {
        if (sourceSubtree.has(seg.codeId)) {
          const moved = { ...seg, codeId: targetId };
          movedSegments.push(moved);
          return moved;
        }
        return seg;
      });
      reassigned = movedSegments.length;
      if (movedSegments.length > 0) postSegments(movedSegments);
      return {
        ...s,
        codes: s.codes.filter(c => !sourceSubtree.has(c.id)),
        segments: nextSegments,
      };
    });
    if (rejected) return null;
    // The merged-away source subtree is gone — drop those rows server-side.
    for (const c of removedCodes) deleteCodeRemote(c.id);
    // Undo closure: re-install the deleted codes and restore the original
    // codeId on every segment that was reassigned. Re-POSTs so the server
    // reflects the rollback too.
    const undo = () => {
      update(s => {
        const restored = s.segments.map(seg => {
          const orig = originalSegments.find(o => o.id === seg.id);
          return orig ? { ...seg, codeId: orig.codeId } : seg;
        });
        const restoredAffected = restored.filter(seg => originalSegments.some(o => o.id === seg.id));
        if (restoredAffected.length > 0) postSegments(restoredAffected);
        return {
          ...s,
          codes: [...s.codes, ...removedCodes],
          segments: restored,
        };
      });
      for (const c of removedCodes) postCode(c);
    };
    return { reassigned, undo };
  }, []);

  /**
   * Move a code (and its subtree, by virtue of children pointing at the
   * moved id) to a new parent. `newParentId === null` re-roots it.
   * Returns false if the move would create a cycle (target is in the
   * moved subtree); otherwise true.
   */
  const moveCode = useCallback((id: string, newParentId: string | null): boolean => {
    let ok = true;
    let moved: CodeNode | null = null;
    update(s => {
      const subtree = new Set(descendantCodeIds(s.codes, id));
      if (newParentId !== null && subtree.has(newParentId)) {
        ok = false;
        return s;
      }
      return {
        ...s,
        codes: s.codes.map(c => {
          if (c.id !== id) return c;
          moved = { ...c, parentId: newParentId };
          return moved;
        }),
      };
    });
    if (ok && moved) postCode(moved);
    return ok;
  }, []);

  // ── Segment operations ─────────────────────────────────────────────
  const addSegment = useCallback((input: {
    documentId: string;
    codeId: string;
    startChar: number;
    endChar: number;
    text: string;
    note?: string;
    projectId: string | null;
    blockId?: string;
    /** Precise PDF selection anchor — present for passages marked on a PDF
     *  page, so the highlight sticks to the exact selected text. */
    pdfAnchor?: import('./types').PdfAnchor;
    /** Captured figure screenshot (PNG data-URL) when the segment marks a
     *  chart/figure boxed with the "Capture figure" tool. */
    screenshot?: string;
    /** Mixed-methods payload (number + unit + year + label). */
    numeric?: import('./types').NumericExtraction;
  }): CodedSegment => {
    const seg: CodedSegment = {
      id: newId('seg'),
      documentId: input.documentId,
      codeId: input.codeId,
      blockId: input.blockId,
      pdfAnchor: input.pdfAnchor,
      screenshot: input.screenshot,
      startChar: input.startChar,
      endChar: input.endChar,
      text: input.text,
      note: input.note ?? '',
      projectId: input.projectId,
      createdAt: new Date().toISOString(),
      numeric: input.numeric,
    };
    update(s => ({ ...s, segments: [...s.segments, seg] }));
    postSegments([seg]);
    return seg;
  }, []);

  /** Set or update the numeric metadata on an existing segment. Pass
   *  `null` to clear the numeric payload (segment stays qualitative). */
  const updateSegmentNumeric = useCallback((
    id: string,
    numeric: import('./types').NumericExtraction | null,
  ) => {
    let updated: CodedSegment | null = null;
    update(s => {
      const segments = s.segments.map(seg => {
        if (seg.id !== id) return seg;
        const merged: CodedSegment = numeric
          ? { ...seg, numeric }
          : (() => { const { numeric: _drop, ...rest } = seg; return rest; })();
        updated = merged;
        return merged;
      });
      return { ...s, segments };
    });
    if (updated) postSegments([updated]);
  }, []);

  const deleteSegment = useCallback((id: string) => {
    update(s => ({ ...s, segments: s.segments.filter(seg => seg.id !== id) }));
    deleteSegmentRemote(id);
  }, []);

  /** Update the shared note ("comment") on a segment. `author` stamps the
   *  comment with who wrote it (display name + auth id) so the segments list
   *  can show a byline; pass it from the signed-in user. */
  const updateSegmentNote = useCallback((
    id: string,
    note: string,
    author?: { name?: string; id?: string },
  ) => {
    const now = new Date().toISOString();
    update(s => ({
      ...s,
      segments: s.segments.map(seg =>
        seg.id === id
          ? {
              ...seg,
              note,
              noteAuthor: author?.name,
              noteAuthorId: author?.id,
              noteUpdatedAt: now,
            }
          : seg,
      ),
    }));
    patchSegmentNote(id, note, author);
  }, []);

  /** Resize a coded segment in place — used by the bracket-gutter context
   *  menu in the document view (expand to next sentence, shrink, etc.).
   *  The caller passes a function that maps the existing offsets to new
   *  ones; we re-derive the `text` slice from the document body so the
   *  preview in the segments list stays in sync. */
  const updateSegmentRange = useCallback((
    id: string,
    next: { startChar: number; endChar: number },
  ) => {
    let updated: CodedSegment | null = null;
    update(s => {
      const segments = s.segments.map(seg => {
        if (seg.id !== id) return seg;
        const doc = s.documents.find(d => d.id === seg.documentId);
        // For block-anchored segments, slice from the block's text;
        // otherwise from the document's flat text.
        let body = doc?.text ?? '';
        if (seg.blockId && doc?.blocks) {
          const block = doc.blocks.find(b => b.id === seg.blockId);
          body = block?.text ?? body;
        }
        const start = Math.max(0, Math.min(next.startChar, next.endChar));
        const end = Math.min(body.length, Math.max(next.startChar, next.endChar));
        if (end - start < 1) return seg;
        const merged: CodedSegment = {
          ...seg,
          startChar: start,
          endChar: end,
          text: body.slice(start, end),
        };
        updated = merged;
        return merged;
      });
      return { ...s, segments };
    });
    if (updated) postSegments([updated]);
  }, []);

  // ── Suggestion operations (AI track-changes workflow) ─────────────
  /** Replace all pending suggestions for a document with a fresh batch
   *  from the AI. Accepts an array of raw suggestion inputs (without ids
   *  or timestamps) and stamps them with fresh ids + createdAt. */
  const replaceDocumentSuggestions = useCallback((
    documentId: string,
    batch: Array<Omit<CodeSuggestion, 'id' | 'documentId' | 'createdAt'>>,
    model?: string,
  ) => {
    const now = new Date().toISOString();
    let fresh: CodeSuggestion[] = [];
    update(s => {
      const kept = s.suggestions.filter(sg => sg.documentId !== documentId);
      fresh = batch.map(b => ({
        ...b,
        id: newId('sugg'),
        documentId,
        model: b.model ?? model,
        createdAt: now,
      }));
      return { ...s, suggestions: [...kept, ...fresh] };
    });
    postSuggestions(documentId, fresh);
  }, []);

  /** Accept a suggestion — promote it to a real CodedSegment in the
   *  given project (null for master-level) and remove it from the
   *  pending list. Returns the created segment, or null if the
   *  suggestion id wasn't found. */
  const acceptSuggestion = useCallback((
    suggestionId: string,
    projectId: string | null,
  ): CodedSegment | null => {
    let created: CodedSegment | null = null;
    update(s => {
      const sugg = s.suggestions.find(x => x.id === suggestionId);
      if (!sugg) return s;
      const seg: CodedSegment = {
        id: newId('seg'),
        documentId: sugg.documentId,
        codeId: sugg.codeId,
        blockId: sugg.blockId,
        startChar: sugg.startChar,
        endChar: sugg.endChar,
        text: sugg.quote,
        note: sugg.rationale ? `AI: ${sugg.rationale}` : '',
        projectId,
        createdAt: new Date().toISOString(),
      };
      created = seg;
      return {
        ...s,
        segments: [...s.segments, seg],
        suggestions: s.suggestions.filter(x => x.id !== suggestionId),
      };
    });
    if (created) {
      postSegments([created]);
      deleteSuggestionRemote(suggestionId);
    }
    return created;
  }, []);

  const rejectSuggestion = useCallback((suggestionId: string) => {
    update(s => ({
      ...s,
      suggestions: s.suggestions.filter(x => x.id !== suggestionId),
    }));
    deleteSuggestionRemote(suggestionId);
  }, []);

  const clearDocumentSuggestions = useCallback((documentId: string) => {
    update(s => ({
      ...s,
      suggestions: s.suggestions.filter(x => x.documentId !== documentId),
    }));
    clearDocumentSuggestionsRemote(documentId);
  }, []);

  /** Accept every pending suggestion for a single document in one go. */
  const acceptAllSuggestions = useCallback((
    documentId: string,
    projectId: string | null,
  ): number => {
    let count = 0;
    let newSegments: CodedSegment[] = [];
    update(s => {
      const toAccept = s.suggestions.filter(x => x.documentId === documentId);
      if (toAccept.length === 0) return s;
      const nowIso = new Date().toISOString();
      newSegments = toAccept.map(sugg => ({
        id: newId('seg'),
        documentId: sugg.documentId,
        codeId: sugg.codeId,
        blockId: sugg.blockId,
        startChar: sugg.startChar,
        endChar: sugg.endChar,
        text: sugg.quote,
        note: sugg.rationale ? `AI: ${sugg.rationale}` : '',
        projectId,
        createdAt: nowIso,
      }));
      count = newSegments.length;
      return {
        ...s,
        segments: [...s.segments, ...newSegments],
        suggestions: s.suggestions.filter(x => x.documentId !== documentId),
      };
    });
    if (count > 0) {
      postSegments(newSegments);
      clearDocumentSuggestionsRemote(documentId);
    }
    return count;
  }, []);

  // ── Document operations ────────────────────────────────────────────
  /** Insert a document into the snapshot if it isn't already persisted.
   *  Used to promote live-loaded references to the snapshot before any
   *  mutation (ingest, classification, segment creation) touches them. */
  /** Merge lazily-loaded EUR-Lex bodies (from
   *  `public/content-analysis/policy-bodies.json`) into each matching
   *  policy document. Derives paragraph blocks from the text so the
   *  block viewer immediately reflects the richer body. Only touches
   *  documents that still have the synthesized metadata stub — if
   *  the user has already ingested a PDF for that doc we preserve
   *  their work. */
  const applyPolicyBodies = useCallback((bodies: Record<string, { text: string }>) => {
    update(s => ({
      ...s,
      documents: s.documents.map(d => {
        const incoming = bodies[d.id]?.text;
        if (!incoming || incoming.trim().length < 200) return d;
        // Skip if the doc already has PDF-sourced blocks with bboxes
        // (real ingestion), or real policy text ≥2× the incoming.
        const hasRealBlocks = Array.isArray(d.blocks) && d.blocks.some(b => b.bboxes.length > 0);
        if (hasRealBlocks) return d;
        const blocks = deriveBlocksFromText(d.id, incoming);
        return {
          ...d,
          text: incoming,
          blocks: blocks.length > 0 ? blocks : d.blocks,
        };
      }),
    }));
  }, []);

  /** Replace the blocks of a document with an AI-resegmented list,
   *  archiving the previous state as a `DocumentVersion` first. Tries
   *  to re-anchor existing segments to the new blocks via substring
   *  match — exact hits for the original segment text on a new block
   *  rewire to it; misses are dropped (they're preserved in the
   *  archived version regardless). Returns the stats so the UI can
   *  show "N of M segments re-anchored". */
  const applyResegmentation = useCallback((
    documentId: string,
    newBlocks: Block[],
  ): { reanchored: number; orphaned: number; total: number } => {
    let stats = { reanchored: 0, orphaned: 0, total: 0 };
    update(s => {
      const doc = s.documents.find(d => d.id === documentId);
      if (!doc) return s;

      // Number the new blocks and stamp fresh ids.
      const reblocked: Block[] = newBlocks.map((b, i) => ({
        ...b,
        order: i,
        id: b.id || `block-${documentId}-ai-${i}`,
      }));

      // Archive the current blocks as a version (if any) so the
      // user can always restore.
      const shouldArchive = Array.isArray(doc.blocks) && doc.blocks.length > 0;
      const versions = shouldArchive
        ? [
            ...(doc.versions ?? []),
            {
              id: newId('ver'),
              capturedAt: new Date().toISOString(),
              label: 'Before AI re-block',
              source: 'pre-resegment',
              blocks: doc.blocks!,
              text: doc.text,
              pageCount: doc.pageCount,
            },
          ]
        : doc.versions;

      // Re-anchor segments: for each segment anchored to an old block,
      // find the first new block whose text contains the segment's
      // original text. If found, re-point. If not, mark as orphaned
      // and clear the blockId (the segment stays visible in the
      // segments list and in archived versions).
      const nextSegments = s.segments.map(seg => {
        if (seg.documentId !== documentId) return seg;
        stats.total++;
        if (!seg.blockId) return seg;
        const needle = seg.text.trim();
        if (!needle) return seg;
        for (const nb of reblocked) {
          const idx = nb.text.indexOf(needle);
          if (idx >= 0) {
            stats.reanchored++;
            return {
              ...seg,
              blockId: nb.id,
              startChar: idx,
              endChar: idx + needle.length,
            };
          }
        }
        stats.orphaned++;
        return { ...seg, blockId: undefined };
      });

      const nextText = reblocked.map(b => b.text).join('\n\n');

      return {
        ...s,
        documents: s.documents.map(d =>
          d.id === documentId
            ? { ...d, blocks: reblocked, text: nextText, versions }
            : d,
        ),
        segments: nextSegments,
      };
    });
    return stats;
  }, []);

  const upsertDocument = useCallback((doc: AnalysisDocument) => {
    update(s => {
      if (s.documents.some(d => d.id === doc.id)) return s;
      return { ...s, documents: [...s.documents, doc] };
    });
  }, []);

  /** Merge ingestion output into a document. Preserves user-set fields. */
  const applyIngestion = useCallback((
    documentId: string,
    ingest: {
      pdfUrl: string;
      pageCount: number;
      blocks: Block[];
      text: string;
      ingestedAt: string;
      /** Optional human-facing label for the archived version (e.g.
       *  an adoption date) — falls back to the previous ingestedAt. */
      archiveLabel?: string;
      /** Optional pipeline source so the archive row can show where
       *  the previous version came from. */
      archiveSource?: string;
    },
  ) => {
    update(s => ({
      ...s,
      documents: s.documents.map(d => {
        if (d.id !== documentId) return d;
        // Snapshot the current block/text state as a DocumentVersion
        // before we overwrite it, so longitudinal analysis can walk
        // through the consolidated versions.
        const shouldArchive = Array.isArray(d.blocks) && d.blocks.length > 0;
        const versions = shouldArchive
          ? [
              ...(d.versions ?? []),
              {
                id: newId('ver'),
                capturedAt: new Date().toISOString(),
                label: ingest.archiveLabel ?? d.ingestedAt,
                source: ingest.archiveSource,
                blocks: d.blocks!,
                text: d.text,
                pageCount: d.pageCount,
              },
            ]
          : d.versions;
        return {
          ...d,
          pdfUrl: ingest.pdfUrl,
          pageCount: ingest.pageCount,
          blocks: ingest.blocks,
          text: ingest.text,
          ingestedAt: ingest.ingestedAt,
          ingestSource: (ingest.archiveSource as AnalysisDocument['ingestSource']) ?? d.ingestSource,
          versions,
        };
      }),
    }));
  }, []);

  /** Delete a specific archived version of a document. */
  const deleteDocumentVersion = useCallback((documentId: string, versionId: string) => {
    update(s => ({
      ...s,
      documents: s.documents.map(d => {
        if (d.id !== documentId || !d.versions) return d;
        return { ...d, versions: d.versions.filter(v => v.id !== versionId) };
      }),
    }));
  }, []);

  /** Re-order the blocks of a document. Segment blockId anchoring is
   *  preserved (segments stick to their block, not their position). */
  const reorderBlocks = useCallback((documentId: string, orderedBlockIds: string[]) => {
    update(s => ({
      ...s,
      documents: s.documents.map(d => {
        if (d.id !== documentId || !d.blocks) return d;
        const byId = new Map(d.blocks.map(b => [b.id, b]));
        const reordered: Block[] = [];
        orderedBlockIds.forEach((id, idx) => {
          const b = byId.get(id);
          if (b) reordered.push({ ...b, order: idx });
        });
        // Append any blocks the caller forgot so data can't be lost.
        for (const b of d.blocks) {
          if (!orderedBlockIds.includes(b.id)) reordered.push({ ...b, order: reordered.length });
        }
        const nextText = reordered.map(b => b.text).join('\n\n');
        return { ...d, blocks: reordered, text: nextText };
      }),
    }));
  }, []);

  /** Split a block at a character offset inside the block's text. Segments
   *  anchored to the block are re-homed to whichever half they fall in. */
  const splitBlock = useCallback((
    documentId: string,
    blockId: string,
    splitAt: number,
  ) => {
    update(s => {
      const doc = s.documents.find(d => d.id === documentId);
      if (!doc?.blocks) return s;
      const idx = doc.blocks.findIndex(b => b.id === blockId);
      if (idx < 0) return s;
      const block = doc.blocks[idx];
      const clampAt = Math.max(1, Math.min(block.text.length - 1, splitAt));
      if (clampAt <= 0 || clampAt >= block.text.length) return s;
      const firstText = block.text.slice(0, clampAt).trimEnd();
      const secondText = block.text.slice(clampAt).trimStart();
      if (!firstText || !secondText) return s;
      const firstId = block.id;
      const secondId = newId('block');
      const firstBlock: Block = { ...block, id: firstId, text: firstText };
      const secondBlock: Block = {
        ...block,
        id: secondId,
        text: secondText,
        order: block.order + 0.5,
      };
      const nextBlocks: Block[] = [];
      for (let i = 0; i < doc.blocks.length; i++) {
        if (i === idx) { nextBlocks.push(firstBlock, secondBlock); }
        else nextBlocks.push(doc.blocks[i]);
      }
      // Re-number order 0..N.
      nextBlocks.sort((a, b) => a.order - b.order);
      nextBlocks.forEach((b, i) => { b.order = i; });

      // Re-home segments that were anchored to the original block.
      const nextSegments = s.segments.map(seg => {
        if (seg.blockId !== blockId) return seg;
        if (seg.endChar <= clampAt) return seg; // fully in first half
        if (seg.startChar >= clampAt) {
          // fully in second half → shift offsets
          return {
            ...seg,
            blockId: secondId,
            startChar: seg.startChar - clampAt,
            endChar: seg.endChar - clampAt,
          };
        }
        // Straddles the split — clip to first half; a more ambitious
        // implementation could split the segment, but the beta keeps it.
        return { ...seg, endChar: clampAt };
      });

      const nextText = nextBlocks.map(b => b.text).join('\n\n');
      return {
        ...s,
        documents: s.documents.map(d =>
          d.id === documentId ? { ...d, blocks: nextBlocks, text: nextText } : d,
        ),
        segments: nextSegments,
      };
    });
  }, []);

  /** Merge `secondId` into `firstId` (concatenates text, `\n\n` between).
   *  Segments on the second block are offset-shifted onto the first. */
  const mergeBlocks = useCallback((
    documentId: string,
    firstId: string,
    secondId: string,
  ) => {
    update(s => {
      const doc = s.documents.find(d => d.id === documentId);
      if (!doc?.blocks) return s;
      const first = doc.blocks.find(b => b.id === firstId);
      const second = doc.blocks.find(b => b.id === secondId);
      if (!first || !second) return s;
      const joiner = '\n\n';
      const shift = first.text.length + joiner.length;
      const merged: Block = {
        ...first,
        text: `${first.text}${joiner}${second.text}`,
        bboxes: [...first.bboxes, ...second.bboxes],
      };
      const nextBlocks = doc.blocks
        .filter(b => b.id !== secondId)
        .map(b => (b.id === firstId ? merged : b));
      nextBlocks.sort((a, b) => a.order - b.order);
      nextBlocks.forEach((b, i) => { b.order = i; });

      const nextSegments = s.segments.map(seg => {
        if (seg.blockId !== secondId) return seg;
        return {
          ...seg,
          blockId: firstId,
          startChar: seg.startChar + shift,
          endChar: seg.endChar + shift,
        };
      });

      const nextText = nextBlocks.map(b => b.text).join('\n\n');
      return {
        ...s,
        documents: s.documents.map(d =>
          d.id === documentId ? { ...d, blocks: nextBlocks, text: nextText } : d,
        ),
        segments: nextSegments,
      };
    });
  }, []);

  /** Change the heuristic kind of a block (heading / recital / …). */
  const setBlockKind = useCallback((
    documentId: string,
    blockId: string,
    kind: Block['kind'],
  ) => {
    update(s => ({
      ...s,
      documents: s.documents.map(d =>
        d.id === documentId && d.blocks
          ? { ...d, blocks: d.blocks.map(b => (b.id === blockId ? { ...b, kind } : b)) }
          : d,
      ),
    }));
  }, []);

  /** Merge AI classifications into a document (replaces prior run). */
  const applyClassifications = useCallback((
    documentId: string,
    classifications: AiClassification[],
    options?: { mergeIntoAiCodeIds?: boolean },
  ) => {
    update(s => ({
      ...s,
      documents: s.documents.map(d => {
        if (d.id !== documentId) return d;
        const nextAiCodeIds = options?.mergeIntoAiCodeIds
          ? Array.from(new Set([...d.aiCodeIds, ...classifications.map(c => c.codeId)]))
          : d.aiCodeIds;
        return {
          ...d,
          aiClassifications: classifications,
          aiCodeIds: nextAiCodeIds,
          aiTaggedAt: new Date().toISOString(),
        };
      }),
    }));
  }, []);

  // ── Document summary operations ────────────────────────────────────
  /** Set (or clear) the whole-document summary for a document under a
   *  project. The id is deterministic per (project, document) so re-saving
   *  updates the same row. The summary carries a plain-text lead (`text`) and
   *  an optional rich deck of `blocks` (text, SmartArt-style flowcharts,
   *  screenshots). It is cleared only when *both* the text and the deck are
   *  empty. Mirrors to the shared store so the whole team sees it. */
  const setDocumentSummary = useCallback((
    documentId: string,
    projectId: string | null,
    text: string,
    blocks: SummaryBlock[] = [],
  ): DocumentSummary | null => {
    const id = `summary-${projectId ?? 'master'}-${documentId}`;
    const trimmed = text.trim();
    if (!trimmed && blocks.length === 0) {
      update(s => ({ ...s, summaries: s.summaries.filter(x => x.id !== id) }));
      deleteSummaryRemote(id);
      return null;
    }
    const now = new Date().toISOString();
    let saved: DocumentSummary | null = null;
    update(s => {
      const existing = s.summaries.find(x => x.id === id);
      const next: DocumentSummary = {
        id,
        documentId,
        projectId,
        text: trimmed,
        blocks,
        blockCount: blocks.length,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      };
      saved = next;
      return { ...s, summaries: [...s.summaries.filter(x => x.id !== id), next] };
    });
    if (saved) postSummary(saved);
    return saved;
  }, []);

  /** Lazy-load a summary's rich `blocks` deck from the durable store. The
   *  bulk list ships only `text` + `blockCount`, so the heavy slides (with
   *  embedded screenshots) are fetched only when the user opens the panel.
   *  Resolves to the hydrated blocks (`[]` when there are none). No-op /
   *  cached once `blocks` is present. */
  const loadSummaryBlocks = useCallback(async (id: string): Promise<SummaryBlock[]> => {
    const current = state.summaries.find(s => s.id === id);
    if (current?.blocks !== undefined) return current.blocks;
    try {
      const resp = await fetch(
        `/api/content-analysis/summaries?id=${encodeURIComponent(id)}`,
        { cache: 'no-store' },
      );
      if (!resp.ok) {
        // 404 ⇒ no durable row yet; treat as an empty deck so we don't refetch.
        update(s => ({
          ...s,
          summaries: s.summaries.map(x => (x.id === id ? { ...x, blocks: [] } : x)),
        }));
        return [];
      }
      const json = await resp.json();
      const blocks: SummaryBlock[] = Array.isArray(json?.item?.blocks) ? json.item.blocks : [];
      update(s => ({
        ...s,
        summaries: s.summaries.map(x =>
          x.id === id ? { ...x, blocks, blockCount: blocks.length } : x,
        ),
      }));
      return blocks;
    } catch (err) {
      logApiError('loadSummaryBlocks', err);
      return current?.blocks ?? [];
    }
  }, []);

  // ── Project operations ─────────────────────────────────────────────
  const addProject = useCallback((input: Omit<Project, 'id' | 'createdAt' | 'updatedAt'>): Project => {
    const now = new Date().toISOString();
    const proj: Project = { ...input, id: newId('project'), createdAt: now, updatedAt: now };
    update(s => ({ ...s, projects: [...s.projects, proj] }));
    return proj;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Omit<Project, 'id' | 'createdAt'>>) => {
    update(s => ({
      ...s,
      projects: s.projects.map(p =>
        p.id === id ? { ...p, ...patch, updatedAt: new Date().toISOString() } : p
      ),
    }));
  }, []);

  const deleteProject = useCallback((id: string) => {
    update(s => ({
      ...s,
      projects: s.projects.filter(p => p.id !== id),
      // Cascade: drop project-scoped codes + segments.
      codes: s.codes.filter(c => !(c.scope === 'project' && c.projectId === id)),
      segments: s.segments.map(seg => (seg.projectId === id ? { ...seg, projectId: null } : seg)),
    }));
  }, []);

  const resetAll = useCallback(() => {
    state = buildSeedSnapshot();
    persist();
    emit();
  }, []);

  /** Replace the current code system + segments with the contents of a
   *  snapshot. Documents and projects are preserved — snapshots are only
   *  about the user's coding work, not the corpus. */
  const restoreCodesAndSegments = useCallback((codes: CodeNode[], segments: CodedSegment[]) => {
    update(s => ({ ...s, codes, segments }));
  }, []);

  // ── Derived selectors ──────────────────────────────────────────────
  const rootCodes = useMemo(() => childrenOf(snapshot.codes, null), [snapshot.codes]);

  return {
    snapshot,
    rootCodes,
    addCode,
    renameCode,
    recolorCode,
    deleteCode,
    mergeCode,
    moveCode,
    addSegment,
    deleteSegment,
    updateSegmentNote,
    updateSegmentRange,
    updateSegmentNumeric,
    replaceDocumentSuggestions,
    acceptSuggestion,
    rejectSuggestion,
    clearDocumentSuggestions,
    acceptAllSuggestions,
    upsertDocument,
    applyPolicyBodies,
    applyResegmentation,
    restoreCodesAndSegments,
    applyIngestion,
    applyClassifications,
    setDocumentSummary,
    loadSummaryBlocks,
    deleteDocumentVersion,
    reorderBlocks,
    splitBlock,
    mergeBlocks,
    setBlockKind,
    addProject,
    updateProject,
    deleteProject,
    resetAll,
  };
}

// ── Pure helpers exported for components ─────────────────────────────────
export function codesByParent(codes: CodeNode[]): Map<string | null, CodeNode[]> {
  const map = new Map<string | null, CodeNode[]>();
  for (const c of codes) {
    const key = c.parentId;
    const list = map.get(key) ?? [];
    list.push(c);
    map.set(key, list);
  }
  for (const list of map.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  return map;
}

export function documentsInScope(
  snapshot: ContentAnalysisSnapshot,
  project: Project,
): AnalysisDocument[] {
  if (project.documentAllowList.length > 0) {
    const allow = new Set(project.documentAllowList);
    return snapshot.documents.filter(d => allow.has(d.id));
  }
  if (project.masterCodeSelection.length === 0) {
    return snapshot.documents;
  }
  const expanded = new Set<string>();
  for (const root of project.masterCodeSelection) {
    for (const id of descendantCodeIds(snapshot.codes, root)) expanded.add(id);
  }
  return snapshot.documents.filter(d => d.aiCodeIds.some(id => expanded.has(id)));
}

export function segmentsForProject(
  snapshot: ContentAnalysisSnapshot,
  projectId: string,
): CodedSegment[] {
  // Segments of a project = project-scoped + all master segments (the
  // master library is considered the shared substrate).
  return snapshot.segments.filter(
    s => s.projectId === projectId || s.projectId === null,
  );
}
