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
//
// Durability: like the rest of the workbench, overall tags are localStorage-
// FIRST. Every toggle is mirrored to a local cache, and the cache is hydrated
// before — and merged with — the shared table on load. This guarantees a tag
// you add is stored permanently from the moment you add it: it survives a
// reload or a document switch even if the Supabase write is delayed, the device
// is offline, or the shared table is briefly unreachable. The durable outbox
// keeps retrying the remote write in the background until it lands, so the tag
// also reaches teammates; the local cache just makes sure it is never lost to a
// transient failure in the meantime.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-context';
import { enqueue } from './outbox';
import { isCustomTagId, parseCustomTag } from './custom-overall-tags';

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const tok = data.session?.access_token;
  return tok ? { authorization: `Bearer ${tok}` } : {};
}

// --- Local cache --------------------------------------------------------------
// This browser's own tag toggles, mirrored to localStorage so an added tag
// survives reloads and remounts regardless of whether the remote write has
// landed yet. Hydrated on load and merged with the shared table.
const CACHE_KEY = 'esabcc_ca_overall_tags_v1';

type TagMap = Map<string, Set<string>>;

function readCache(): TagMap {
  const m: TagMap = new Map();
  if (typeof window === 'undefined') return m;
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return m;
    const obj = JSON.parse(raw) as Record<string, string[]>;
    for (const [docId, ids] of Object.entries(obj)) {
      if (Array.isArray(ids) && ids.length) m.set(docId, new Set(ids));
    }
  } catch {
    /* corrupt cache — start empty */
  }
  return m;
}

function writeCache(map: TagMap): void {
  if (typeof window === 'undefined') return;
  try {
    const obj: Record<string, string[]> = {};
    for (const [docId, set] of map) if (set.size) obj[docId] = [...set];
    localStorage.setItem(CACHE_KEY, JSON.stringify(obj));
  } catch {
    /* quota / unavailable — the in-memory map + outbox still hold the state */
  }
}

/** Persist a single document's tags to the durable cache, leaving every other
 *  document untouched. The cache therefore holds only the tags THIS browser has
 *  added/removed — the shared table stays authoritative for everyone else's, so
 *  a tag another user later removes still disappears here on the next load. */
function cacheDoc(docId: string, ids: Set<string>): void {
  const cache = readCache();
  if (ids.size) cache.set(docId, new Set(ids));
  else cache.delete(docId);
  writeCache(cache);
}

/** Union of two tag maps. The local cache is this browser's intended state; the
 *  server contributes tags added by other users/devices. Unioning preserves a
 *  tag this browser added even when the shared table hasn't caught up yet. */
function mergeMaps(a: TagMap, b: TagMap): TagMap {
  const out: TagMap = new Map();
  for (const [docId, set] of a) out.set(docId, new Set(set));
  for (const [docId, set] of b) {
    const existing = out.get(docId);
    if (existing) for (const id of set) existing.add(id);
    else out.set(docId, new Set(set));
  }
  return out;
}

export interface OverallTagsApi {
  /** True once the shared table has been read. */
  loaded: boolean;
  /** The overall-tag code ids stored for a document (empty when none). */
  getTags: (docId: string) => string[];
  /** Every distinct custom (analyst-coined) overall-tag id used on ANY
   *  document, deduplicated by name. A custom tag lives only as a code id on
   *  the documents that carry it; this rolls those up into one reusable pool so
   *  a tag coined on one paper is offered as a ready choice on every other
   *  paper — and, because the underlying rows are the shared, durable
   *  `content_analysis_overall_tags` table, that choice stays available
   *  permanently and for every user. */
  customTagPool: string[];
  /** Add or remove a single overall tag on a document. Persists to the shared
   *  table; prompts sign-in if needed. Optimistic; a failed write is handed to
   *  the durable outbox and retried until it lands, so a toggle is never lost
   *  to a transient error. */
  toggleTag: (docId: string, codeId: string) => Promise<void>;
}

export function useOverallTags(): OverallTagsApi {
  const { user, requireAuth } = useAuth();
  // docId → set of code ids.
  const [map, setMap] = useState<TagMap>(new Map());
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    // Hydrate from the local cache first — a previously-added tag is shown
    // immediately and survives even when the shared table is unreachable.
    const cached = readCache();
    if (cached.size) setMap(prev => mergeMaps(prev, cached));

    try {
      const res = await fetch('/api/content-analysis/overall-tags');
      if (res.ok) {
        const { tags } = (await res.json()) as { tags: { documentId: string; codeId: string }[] };
        const server: TagMap = new Map();
        for (const t of tags ?? []) {
          let set = server.get(t.documentId);
          if (!set) { set = new Set(); server.set(t.documentId, set); }
          set.add(t.codeId);
        }
        // Merge the shared table in without dropping locally-added tags that
        // may not have synced yet.
        setMap(prev => mergeMaps(prev, server));
      }
    } catch {
      /* offline / not configured — keep the cached map (no remote overwrite) */
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

  // Roll every custom tag seen across all documents into one reusable pool,
  // deduplicated by name (case-insensitive). A freshly-coined tag is in `map`
  // optimistically the instant it is toggled, so it joins the pool immediately
  // and the merge-on-load above keeps tags coined by other users in it too.
  const customTagPool = useMemo(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const set of map.values()) {
      for (const id of set) {
        if (!isCustomTagId(id)) continue;
        const parsed = parseCustomTag(id);
        const key = (parsed ? parsed.name : id).trim().toLowerCase();
        if (!key || seen.has(key)) continue;
        seen.add(key);
        out.push(id);
      }
    }
    out.sort((a, b) =>
      (parseCustomTag(a)?.name ?? a).localeCompare(parseCustomTag(b)?.name ?? b),
    );
    return out;
  }, [map]);

  const toggleTag = useCallback(
    async (docId: string, codeId: string) => {
      const u = user ?? (await requireAuth('Sign in to edit overall tags.'));
      if (!u) return;
      const had = map.get(docId)?.has(codeId) ?? false;

      // Write to the durable local cache up front, so the tag is stored
      // permanently the instant it is toggled — it survives a reload or a
      // document switch even if the remote write below never lands.
      const nextSet = new Set(map.get(docId) ?? []);
      if (had) nextSet.delete(codeId);
      else nextSet.add(codeId);
      cacheDoc(docId, nextSet);

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

  return { loaded, getTags, customTagPool, toggleTag };
}
