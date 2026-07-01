'use client';

// ---------------------------------------------------------------------------
// Reading responsibility — who is reading which document in a project workspace.
//
// One responsible reader per (project, document), shared through the global
// `content_analysis_reading` table (migration 074) via
// /api/content-analysis/reading — so an assignment made by one analyst is seen
// by the whole team. Unlike overall tags (which describe the document itself,
// globally), a reader is tied to a PROJECT: the same paper may be someone
// else's job in another workspace, so assignments are keyed by project id.
//
// Durability mirrors the rest of the workbench: localStorage-first, with the
// durable outbox retrying the remote write in the background until it lands. An
// assignment therefore survives a reload, a document switch, or a transient
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

const CACHE_PREFIX = 'esabcc_ca_reading_v1:';

type ReaderMap = Record<string, string>;

function cacheKey(projectId: string): string {
  return `${CACHE_PREFIX}${projectId}`;
}

function readCache(projectId: string): ReaderMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(cacheKey(projectId));
    if (!raw) return {};
    const obj = JSON.parse(raw) as ReaderMap;
    return obj && typeof obj === 'object' ? obj : {};
  } catch {
    return {};
  }
}

function writeCacheEntry(projectId: string, documentId: string, reader: string): void {
  if (typeof window === 'undefined') return;
  try {
    const obj = readCache(projectId);
    if (reader) obj[documentId] = reader;
    else delete obj[documentId];
    localStorage.setItem(cacheKey(projectId), JSON.stringify(obj));
  } catch {
    /* quota / unavailable — in-memory state + outbox still hold it */
  }
}

export interface ReadingAssignmentsApi {
  /** True once the shared table has been read. */
  loaded: boolean;
  /** The responsible reader for a document ('' when none). */
  getReader: (docId: string) => string;
  /** Every distinct reader name seen across this project's documents. */
  readerPool: string[];
  /** Assign (or, with an empty string, clear) the responsible reader. Optimistic;
   *  a failed write is queued to the durable outbox and retried until it lands. */
  setReader: (docId: string, reader: string) => Promise<void>;
  /** Merge freshly-added documents' readers into the map (e.g. after a bulk add
   *  via the Add-literature panel), without waiting for a refetch. */
  primeReaders: (entries: Array<{ documentId: string; reader: string }>) => void;
}

export function useReadingAssignments(projectId: string): ReadingAssignmentsApi {
  const { user, requireAuth } = useAuth();
  const [map, setMap] = useState<ReaderMap>({});
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const cached = readCache(projectId);
    if (Object.keys(cached).length) setMap(prev => ({ ...cached, ...prev }));
    try {
      const res = await fetch(
        `/api/content-analysis/reading?projectId=${encodeURIComponent(projectId)}`,
      );
      if (res.ok) {
        const { assignments } = (await res.json()) as {
          assignments: { documentId: string; reader: string }[];
        };
        const server: ReaderMap = {};
        for (const a of assignments ?? []) if (a.reader) server[a.documentId] = a.reader;
        // Local (this browser's optimistic intent) wins over the server copy so
        // an assignment made moments ago isn't clobbered before it syncs.
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

  const getReader = useCallback((docId: string): string => map[docId] ?? '', [map]);

  const readerPool = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const reader of Object.values(map)) {
      const key = reader.trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push(reader);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [map]);

  const primeReaders = useCallback(
    (entries: Array<{ documentId: string; reader: string }>) => {
      setMap(prev => {
        const next = { ...prev };
        for (const e of entries) {
          if (e.reader) next[e.documentId] = e.reader;
          writeCacheEntry(projectId, e.documentId, e.reader);
        }
        return next;
      });
    },
    [projectId],
  );

  const setReader = useCallback(
    async (docId: string, readerRaw: string) => {
      const u = user ?? (await requireAuth('Sign in to assign readers.'));
      if (!u) return;
      const reader = readerRaw.trim();

      writeCacheEntry(projectId, docId, reader);
      setMap(prev => {
        const next = { ...prev };
        if (reader) next[docId] = reader;
        else delete next[docId];
        return next;
      });

      try {
        const res = reader
          ? await fetch('/api/content-analysis/reading', {
              method: 'POST',
              headers: { 'content-type': 'application/json', ...(await authHeader()) },
              body: JSON.stringify({ projectId, documentId: docId, reader }),
            })
          : await fetch(
              `/api/content-analysis/reading?projectId=${encodeURIComponent(projectId)}&documentId=${encodeURIComponent(docId)}`,
              { method: 'DELETE', headers: { ...(await authHeader()) } },
            );
        if (!res.ok) throw new Error(`${res.status}`);
      } catch {
        enqueue({
          key: `reading:${projectId}:${docId}`,
          method: reader ? 'POST' : 'DELETE',
          url: reader
            ? '/api/content-analysis/reading'
            : `/api/content-analysis/reading?projectId=${encodeURIComponent(projectId)}&documentId=${encodeURIComponent(docId)}`,
          body: reader ? { projectId, documentId: docId, reader } : undefined,
          auth: true,
        });
      }
    },
    [user, requireAuth, projectId],
  );

  return { loaded, getReader, readerPool, setReader, primeReaders };
}
