'use client';

// ---------------------------------------------------------------------------
// General notes for the Content Analysis workbench.
//
// A general note is a lightweight, passage-anchored comment an analyst leaves
// on a document WITHOUT applying a tag — the "just leave a comment" path that
// sits alongside full coding. Notes are SHARED across the team: they persist
// to the `content_analysis_notes` table (migration 060) via
// /api/content-analysis/notes, scoped by (document, project) like summaries.
//
// This hook owns load / add / delete for the currently-open document. Writes
// are DURABLE: the happy path is a direct fetch (so the server's canonical row
// reconciles immediately), but any failure — offline, a 5xx, a flaky network —
// hands the write to the content-analysis outbox, which persists it in
// localStorage and retries until it lands. A note someone typed is never
// rolled away because of a transient error.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { enqueue } from './outbox';

export interface GeneralNote {
  id: string;
  text: string;
  /** The passage the comment is about, when anchored to a selection. */
  quote?: string;
  /** Block the passage lives in, used to jump back to it in the document. */
  blockId?: string;
  startChar?: number;
  endChar?: number;
  author: string | null;
  /** True when the requesting user authored this note — gates the delete UI.
   *  Resolved server-side so author ids never reach other readers. */
  mine?: boolean;
  createdAt: string;
}

/** Fields supplied when adding a note — the rest (id, author, timestamp) are
 *  filled in by the hook / server. */
export interface NewNoteInput {
  text: string;
  quote?: string;
  blockId?: string;
  startChar?: number;
  endChar?: number;
}

export interface GeneralNotesApi {
  notes: GeneralNote[];
  loading: boolean;
  /** True for notes the current user authored — only those expose a delete. */
  canDelete: (note: GeneralNote) => boolean;
  addNote: (input: NewNoteInput) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
}

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const tok = data.session?.access_token;
  return tok ? { authorization: `Bearer ${tok}` } : {};
}

export function useGeneralNotes(
  projectId: string,
  documentId: string | null,
): GeneralNotesApi {
  const { user, displayName, requireAuth } = useAuth();
  const [notes, setNotes] = useState<GeneralNote[]>([]);
  const [loading, setLoading] = useState(false);
  // Track which note ids the current user authored this session, so we can
  // show a delete control. (The server is the source of truth — RLS rejects
  // deletes of others' notes regardless of what the UI shows.)
  const [ownIds, setOwnIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!documentId) {
      setNotes([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await fetch(
          `/api/content-analysis/notes?documentId=${encodeURIComponent(documentId)}&projectId=${encodeURIComponent(projectId)}`,
          { headers: { ...(await authHeader()) } },
        );
        if (res.ok) {
          const { notes } = (await res.json()) as { notes: GeneralNote[] };
          if (!cancelled) setNotes(notes ?? []);
        } else if (!cancelled) {
          setNotes([]);
        }
      } catch {
        if (!cancelled) setNotes([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [projectId, documentId]);

  const addNote = useCallback(
    async (input: NewNoteInput) => {
      const text = input.text.trim();
      if (!text || !documentId) return;
      const u = user ?? (await requireAuth('Sign in to add a note.'));
      if (!u) return;

      const note: GeneralNote = {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        text,
        quote: input.quote?.replace(/\s+/g, ' ').trim() || undefined,
        blockId: input.blockId,
        startChar: input.startChar,
        endChar: input.endChar,
        author: displayName ?? null,
        mine: true,
        createdAt: new Date().toISOString(),
      };

      // Optimistic prepend.
      setNotes(prev => [note, ...prev]);
      setOwnIds(prev => new Set(prev).add(note.id));

      const body = {
        id: note.id,
        documentId,
        projectId,
        text: note.text,
        quote: note.quote,
        blockId: note.blockId,
        startChar: note.startChar,
        endChar: note.endChar,
        author: note.author,
      };
      try {
        const res = await fetch('/api/content-analysis/notes', {
          method: 'POST',
          headers: { 'content-type': 'application/json', ...(await authHeader()) },
          body: JSON.stringify(body),
        });
        if (!res.ok) throw new Error(`${res.status}`);
        const { note: saved } = (await res.json()) as { note: GeneralNote };
        // Reconcile with the server's canonical row.
        if (saved) setNotes(prev => prev.map(n => (n.id === note.id ? saved : n)));
      } catch {
        // Keep the note on screen and hand the write to the durable outbox,
        // which retries (with a fresh auth token) until the server confirms.
        enqueue({
          key: `note:${note.id}`,
          method: 'POST',
          url: '/api/content-analysis/notes',
          body,
          auth: true,
        });
      }
    },
    [documentId, projectId, user, displayName, requireAuth],
  );

  const deleteNote = useCallback(
    async (id: string) => {
      const u = user ?? (await requireAuth('Sign in to delete a note.'));
      if (!u) return;
      setNotes(prev => prev.filter(n => n.id !== id));
      try {
        const res = await fetch(
          `/api/content-analysis/notes?id=${encodeURIComponent(id)}`,
          { method: 'DELETE', headers: { ...(await authHeader()) } },
        );
        if (!res.ok && res.status !== 404) throw new Error(`${res.status}`);
      } catch {
        // Queue the delete durably (same key as a pending create, so deleting
        // a note that never reached the server collapses to a no-op).
        enqueue({
          key: `note:${id}`,
          method: 'DELETE',
          url: `/api/content-analysis/notes?id=${encodeURIComponent(id)}`,
          auth: true,
        });
      }
    },
    [user, requireAuth],
  );

  // The server flags the caller's own notes (`mine`); fall back to ids added
  // this session for the optimistic window before reconciliation.
  const canDelete = useCallback(
    (note: GeneralNote) => note.mine === true || ownIds.has(note.id),
    [ownIds],
  );

  return { notes, loading, canDelete, addNote, deleteNote };
}
