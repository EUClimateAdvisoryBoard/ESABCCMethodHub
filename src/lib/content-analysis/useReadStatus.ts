'use client';

// ---------------------------------------------------------------------------
// Reading progress — whether each document in a project workspace has been read.
//
// A sibling to useReadingAssignments: that hook answers "who is responsible for
// this document", this one answers "has it been read yet". The two are
// independent, and both are independent of the summary-derived "Done" marker —
// a reader can flip a document to read the moment they've finished it, before
// (or without ever) writing a summary. Read state is shared through the global
// `content_analysis_read` table (migration 075) via /api/content-analysis/read,
// so one analyst marking a document read is seen by the whole team, and is keyed
// by project id (the same paper may be unread in another workspace).
//
// Durability mirrors the rest of the workbench: localStorage-first, with the
// durable outbox retrying the remote write in the background until it lands. A
// read mark therefore survives a reload, a document switch, or a transient
// network failure, and still reaches teammates.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { enqueue } from './outbox';

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const tok = data.session?.access_token;
  return tok ? { authorization: `Bearer ${tok}` } : {};
}

const CACHE_PREFIX = 'esabcc_ca_read_v1:';

/** Map of documentId → read (true). Absence means unread. */
type ReadMap = Record<string, boolean>;

function cacheKey(projectId: string): string {
  return `${CACHE_PREFIX}${projectId}`;
}

function readCache(projectId: string): ReadMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(cacheKey(projectId));
    if (!raw) return {};
    const obj = JSON.parse(raw) as ReadMap;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeCacheEntry(projectId: string, documentId: string, read: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    const obj = readCache(projectId);
    if (read) obj[documentId] = true;
    else delete obj[documentId];
    localStorage.setItem(cacheKey(projectId), JSON.stringify(obj));
  } catch {
    /* quota / unavailable — in-memory state + outbox still hold it */
  }
}

export interface ReadStatusApi {
  /** True once the shared table has been read. */
  loaded: boolean;
  /** Whether a document has been marked read. */
  isRead: (docId: string) => boolean;
  /** How many documents are marked read. */
  readCount: number;
  /** Mark a document read (or, with `false`, clear it). Optimistic; a failed
   *  write is queued to the durable outbox and retried until it lands. */
  setRead: (docId: string, read: boolean) => Promise<void>;
}

export function useReadStatus(projectId: string): ReadStatusApi {
  const { user, requireAuth } = useAuth();
  const [map, setMap] = useState<ReadMap>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const cached = readCache(projectId);
    if (Object.keys(cached).length) setMap(prev => ({ ...cached, ...prev }));
    try {
      const res = await fetch(
        `/api/content-analysis/read?projectId=${encodeURIComponent(projectId)}`,
      );
      if (res.ok) {
        const { read } = (await res.json()) as { read: string[] };
        const server: ReadMap = {};
        for (const id of read ?? []) server[id] = true;
        // Local (this browser's optimistic intent) wins over the server copy so
        // a mark made moments ago isn't clobbered before it syncs.
        setMap(prev => ({ ...server, ...readCache(projectId), ...prev }));
      }
    } catch {
      /* offline / not configured — keep the cached map */
    } finally {
      setLoaded(true);
    }
  }, [projectId]);

  useEffect(() => {
    void load();
  }, [load]);

  const isRead = useCallback((docId: string): boolean => map[docId] === true, [map]);

  const readCount = useMemo(
    () => Object.values(map).reduce((n, v) => n + (v ? 1 : 0), 0),
    [map],
  );

  const setRead = useCallback(
    async (docId: string, read: boolean) => {
      const u = user ?? (await requireAuth('Sign in to mark documents read.'));
      if (!u) return;

      writeCacheEntry(projectId, docId, read);
      setMap(prev => {
        const next = { ...prev };
        if (read) next[docId] = true;
        else delete next[docId];
        return next;
      });

      try {
        const res = read
          ? await fetch('/api/content-analysis/read', {
              method: 'POST',
              headers: { 'content-type': 'application/json', ...(await authHeader()) },
              body: JSON.stringify({ projectId, documentId: docId, read: true }),
            })
          : await fetch(
              `/api/content-analysis/read?projectId=${encodeURIComponent(projectId)}&documentId=${encodeURIComponent(docId)}`,
              { method: 'DELETE', headers: { ...(await authHeader()) } },
            );
        if (!res.ok) throw new Error(`${res.status}`);
      } catch {
        enqueue({
          key: `caread:${projectId}:${docId}`,
          method: read ? 'POST' : 'DELETE',
          url: read
            ? '/api/content-analysis/read'
            : `/api/content-analysis/read?projectId=${encodeURIComponent(projectId)}&documentId=${encodeURIComponent(docId)}`,
          body: read ? { projectId, documentId: docId, read: true } : undefined,
          auth: true,
        });
      }
    },
    [user, requireAuth, projectId],
  );

  return { loaded, isRead, readCount, setRead };
}
