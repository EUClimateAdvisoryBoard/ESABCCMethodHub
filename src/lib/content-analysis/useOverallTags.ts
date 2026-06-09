'use client';

// ---------------------------------------------------------------------------
// Overall (document-level) tags for the Content Analysis workbench.
//
// The workbench distinguishes TWO categories of tag:
//
//   1. In-text tags  — codes pinned to a passage (a `CodedSegment`). These are
//      the highlights an analyst makes inside a document.
//   2. Overall tags  — codes that describe the WHOLE document, the coloured
//      dots shown on each corpus card. Policy documents ship an AI-assigned
//      baseline (`AnalysisDocument.aiCodeIds`, see policy-master-tags.ts);
//      scientific & grey literature, which arrive live from the reference
//      manager, are tagged by hand here.
//
// Persistence is the GLOBAL, shared `content_analysis_overall_tags` table
// (migration 059) via /api/content-analysis/overall-tags — so an overall tag
// added by one analyst is visible to EVERY user, in both the workbench and the
// reference library. Overall tags describe the document itself, so they are
// stored globally (one set per document id) rather than per project.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { enqueue } from './outbox';

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const tok = data.session?.access_token;
  return tok ? { authorization: `Bearer ${tok}` } : {};
}

export interface OverallTagsApi {
  /** True once the shared table has been read. */
  loaded: boolean;
  /** The overall-tag code ids stored for a document (empty when none). */
  getTags: (docId: string) => string[];
  /** Add or remove a single overall tag on a document. Persists to the shared
   *  table; prompts sign-in if needed. Optimistic; a failed write is handed to
   *  the durable outbox and retried until it lands, so a toggle is never lost
   *  to a transient error. */
  toggleTag: (docId: string, codeId: string) => Promise<void>;
}

export function useOverallTags(): OverallTagsApi {
  const { user, requireAuth } = useAuth();
  // docId → set of code ids.
  const [map, setMap] = useState<Map<string, Set<string>>>(new Map());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/content-analysis/overall-tags');
      if (res.ok) {
        const { tags } = (await res.json()) as { tags: { documentId: string; codeId: string }[] };
        const m = new Map<string, Set<string>>();
        for (const t of tags ?? []) {
          let set = m.get(t.documentId);
          if (!set) { set = new Set(); m.set(t.documentId, set); }
          set.add(t.codeId);
        }
        setMap(m);
      }
    } catch {
      /* offline / not configured — fall back to empty (policy AI baseline only) */
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const getTags = useCallback(
    (docId: string): string[] => {
      const set = map.get(docId);
      return set ? [...set] : [];
    },
    [map],
  );

  const toggleTag = useCallback(
    async (docId: string, codeId: string) => {
      const u = user ?? (await requireAuth('Sign in to edit overall tags.'));
      if (!u) return;
      const had = map.get(docId)?.has(codeId) ?? false;

      // Optimistic update.
      setMap(prev => {
        const next = new Map(prev);
        const set = new Set(next.get(docId) ?? []);
        if (had) set.delete(codeId);
        else set.add(codeId);
        if (set.size) next.set(docId, set);
        else next.delete(docId);
        return next;
      });

      try {
        const res = had
          ? await fetch(
              `/api/content-analysis/overall-tags?documentId=${encodeURIComponent(docId)}&codeId=${encodeURIComponent(codeId)}`,
              { method: 'DELETE', headers: { ...(await authHeader()) } },
            )
          : await fetch('/api/content-analysis/overall-tags', {
              method: 'POST',
              headers: { 'content-type': 'application/json', ...(await authHeader()) },
              body: JSON.stringify({ documentId: docId, codeId }),
            });
        if (!res.ok && !(had && res.status === 404)) throw new Error(`${res.status}`);
      } catch {
        // Keep the optimistic state and queue the write durably. One key per
        // (document, code) so an add→remove flurry collapses to the last
        // intent; the POST is an upsert and the DELETE tolerates 404, so
        // retries are idempotent.
        enqueue({
          key: `otag:${docId}:${codeId}`,
          method: had ? 'DELETE' : 'POST',
          url: had
            ? `/api/content-analysis/overall-tags?documentId=${encodeURIComponent(docId)}&codeId=${encodeURIComponent(codeId)}`
            : '/api/content-analysis/overall-tags',
          body: had ? undefined : { documentId: docId, codeId },
          auth: true,
        });
      }
    },
    [user, requireAuth, map],
  );

  return { loaded, getTags, toggleTag };
}
