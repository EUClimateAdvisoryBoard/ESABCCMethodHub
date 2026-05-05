'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { connections as baseConnections, policies } from '@/data/policies';
import type { PolicyConnection, GraphLink, GraphNode } from '@/lib/types';
import type { ConnectionTypeId } from '@/lib/connectionTypes';
import { supabase } from '@/lib/supabase';

/**
 * Client-side overrides, verification state, and user-added connections.
 *
 * The base connection dataset ships as code in `src/data/policies.ts`.
 * On top of it, editors can:
 *
 *   1. Edit a base connection (type / description / article refs).
 *   2. Verify or reject a connection — both base and user-added. The
 *      verification record stamps *who* (display name) verified it
 *      *when*, plus an optional reviewer note explaining the decision.
 *   3. Add entirely new connections that do not exist in the base set.
 *
 * State lives in three places:
 *
 *   • Supabase (`connection_overrides`, `connection_verifications`,
 *     `connection_additions`) — the source of truth for any signed-in
 *     reviewer. Migration 019_connection_review_state.sql.
 *   • `localStorage` — a per-browser cache that hydrates the UI
 *     instantly and acts as a fallback when Supabase is not configured
 *     (CI build, fresh dev clone) or the user is signed out.
 *   • A `eu-policy-connections-changed` custom event + the native
 *     `storage` event — propagate edits across hooks/tabs.
 */

const OVERRIDES_KEY = 'eu-policy-connection-overrides';
const ADDED_KEY = 'eu-policy-connection-added';
const VERIFICATIONS_KEY = 'eu-policy-connection-verifications';
const CHANGE_EVENT = 'eu-policy-connections-changed';

export type VerificationStatus = 'unverified' | 'verified' | 'rejected' | 'needs_review';

export interface VerificationRecord {
  status: VerificationStatus;
  /** Who signed off / rejected — free-text display name (`user.email` or profile name). */
  reviewerName: string;
  /** Optional Supabase user id, stored so a future sync can attribute the row server-side. */
  reviewerUserId?: string | null;
  /** ISO timestamp at the moment the reviewer pressed verify/reject. */
  reviewedAt: string;
  /** Optional free-text rationale for the verification decision. */
  reviewerNote?: string;
}

export type ConnectionPatch = Partial<
  Pick<PolicyConnection, 'connection_type' | 'description' | 'articles_source' | 'articles_target'>
> & {
  updatedAt: string;
};

type OverrideMap = Record<string, ConnectionPatch>;
type VerificationMap = Record<string, VerificationRecord>;

function readJson<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Storage disabled / quota hit — tolerate silently, in-memory state still works.
  }
}

function readOverrides(): OverrideMap {
  return readJson<OverrideMap>(OVERRIDES_KEY) ?? {};
}

function readAdded(): PolicyConnection[] {
  const arr = readJson<PolicyConnection[]>(ADDED_KEY);
  return Array.isArray(arr) ? arr : [];
}

function readVerifications(): VerificationMap {
  return readJson<VerificationMap>(VERIFICATIONS_KEY) ?? {};
}

function applyPatch(base: PolicyConnection, patch?: ConnectionPatch): PolicyConnection {
  if (!patch) return base;
  return {
    ...base,
    connection_type: (patch.connection_type ?? base.connection_type) as PolicyConnection['connection_type'],
    description: patch.description ?? base.description,
    articles_source: patch.articles_source ?? base.articles_source,
    articles_target: patch.articles_target ?? base.articles_target,
  };
}

export interface EnrichedConnection extends PolicyConnection {
  source_title?: string;
  source_domain?: string;
  target_title?: string;
  target_domain?: string;
  isEdited: boolean;
  /** True when this connection came from `addedConnections`, not the shipped dataset. */
  isUserAdded: boolean;
  verification: VerificationRecord;
}

const DEFAULT_VERIFICATION: VerificationRecord = {
  status: 'unverified',
  reviewerName: '',
  reviewedAt: '',
};

function enrich(
  c: PolicyConnection,
  overrides: OverrideMap,
  verifications: VerificationMap,
  isUserAdded: boolean,
): EnrichedConnection {
  const source = policies.find(p => p.id === c.source_policy_id);
  const target = policies.find(p => p.id === c.target_policy_id);
  const key = String(c.id);
  return {
    ...c,
    source_title: source?.short_title,
    source_domain: source?.domain,
    target_title: target?.short_title,
    target_domain: target?.domain,
    isEdited: Boolean(overrides[key]),
    isUserAdded,
    verification: verifications[key] ?? DEFAULT_VERIFICATION,
  };
}

/** Biggest id in the base + added sets — used to allocate new user-added ids. */
function nextConnectionId(added: PolicyConnection[]): number {
  const base = baseConnections.reduce((m, c) => (c.id > m ? c.id : m), 0);
  const extra = added.reduce((m, c) => (c.id > m ? c.id : m), 0);
  return Math.max(base, extra) + 1;
}

// ── Supabase sync ──────────────────────────────────────────────────────────
//
// The hook talks to /api/connections/state for read + write. On any 2xx
// response we replace the local cache with the server's view, which is
// also written back to localStorage so a refresh hydrates instantly even
// before the next fetch lands.

interface ServerOverrideRow {
  connection_id: number;
  connection_type: string | null;
  description: string | null;
  articles_source: string | null;
  articles_target: string | null;
  updated_at: string;
}
interface ServerVerificationRow {
  connection_id: number;
  status: VerificationStatus;
  reviewer_name: string;
  reviewer_user_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string;
}
interface ServerAdditionRow {
  id: number;
  source_policy_id: string;
  target_policy_id: string;
  connection_type: string;
  description: string;
  articles_source: string | null;
  articles_target: string | null;
}
interface ServerStatePayload {
  overrides: ServerOverrideRow[];
  verifications: ServerVerificationRow[];
  additions: ServerAdditionRow[];
  created?: ServerAdditionRow;
}

function rowsToOverrideMap(rows: ServerOverrideRow[]): OverrideMap {
  const out: OverrideMap = {};
  for (const r of rows) {
    out[String(r.connection_id)] = {
      connection_type: (r.connection_type ?? undefined) as ConnectionTypeId | undefined,
      description: r.description ?? undefined,
      articles_source: r.articles_source,
      articles_target: r.articles_target,
      updatedAt: r.updated_at,
    };
  }
  return out;
}

function rowsToVerificationMap(rows: ServerVerificationRow[]): VerificationMap {
  const out: VerificationMap = {};
  for (const r of rows) {
    out[String(r.connection_id)] = {
      status: r.status,
      reviewerName: r.reviewer_name,
      reviewerUserId: r.reviewer_user_id,
      reviewedAt: r.reviewed_at,
      reviewerNote: r.reviewer_note ?? undefined,
    };
  }
  return out;
}

function rowsToAddedConnections(rows: ServerAdditionRow[]): PolicyConnection[] {
  return rows.map(r => ({
    id: r.id,
    source_policy_id: r.source_policy_id,
    target_policy_id: r.target_policy_id,
    connection_type: r.connection_type as PolicyConnection['connection_type'],
    description: r.description,
    articles_source: r.articles_source,
    articles_target: r.articles_target,
  }));
}

async function getAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  try {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** Fire-and-forget API call. Returns the new server state, or null on failure. */
async function syncRequest(
  method: 'GET' | 'POST',
  body?: Record<string, unknown>,
): Promise<ServerStatePayload | null> {
  const token = await getAccessToken();
  if (!token) return null; // Not signed in / Supabase not configured — stay local-only.
  try {
    const res = await fetch('/api/connections/state', {
      method,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return (await res.json()) as ServerStatePayload;
  } catch {
    return null;
  }
}

/**
 * Upload local-only changes to the server before a server snapshot is applied.
 * Only entries absent from `serverPayload` are uploaded — existing server
 * entries win on conflict so the server stays authoritative.
 * This recovers changes made while a session was expired or unavailable.
 */
async function flushLocalOnlyChanges(
  localOverrides: OverrideMap,
  localVerifications: VerificationMap,
  localAdded: PolicyConnection[],
  serverPayload: ServerStatePayload,
): Promise<void> {
  const serverOverrideIds = new Set(serverPayload.overrides.map(r => String(r.connection_id)));
  const serverVerificationIds = new Set(serverPayload.verifications.map(r => String(r.connection_id)));
  const serverAdditionIds = new Set(serverPayload.additions.map(r => r.id));

  const pending: Promise<unknown>[] = [];

  for (const [idStr, patch] of Object.entries(localOverrides)) {
    if (!serverOverrideIds.has(idStr)) {
      pending.push(syncRequest('POST', { op: 'saveOverride', id: Number(idStr), patch }));
    }
  }

  for (const [idStr, record] of Object.entries(localVerifications)) {
    if (!serverVerificationIds.has(idStr)) {
      pending.push(
        syncRequest('POST', {
          op: 'setVerification',
          id: Number(idStr),
          status: record.status,
          reviewerName: record.reviewerName,
          reviewerNote: record.reviewerNote,
        }),
      );
    }
  }

  for (const conn of localAdded) {
    if (!serverAdditionIds.has(conn.id)) {
      pending.push(
        syncRequest('POST', {
          op: 'addConnection',
          draft: {
            source_policy_id: conn.source_policy_id,
            target_policy_id: conn.target_policy_id,
            connection_type: conn.connection_type,
            description: conn.description,
            articles_source: conn.articles_source ?? null,
            articles_target: conn.articles_target ?? null,
          },
        }),
      );
    }
  }

  if (pending.length > 0) await Promise.all(pending);
}

export function useConnectionOverrides() {
  const [overrides, setOverrides] = useState<OverrideMap>(() => readOverrides());
  const [added, setAdded] = useState<PolicyConnection[]>(() => readAdded());
  const [verifications, setVerifications] = useState<VerificationMap>(() => readVerifications());

  /** Apply a server payload → state + localStorage cache. */
  const applyServerPayload = useCallback((payload: ServerStatePayload) => {
    const nextOverrides = rowsToOverrideMap(payload.overrides);
    const nextVerifications = rowsToVerificationMap(payload.verifications);
    const nextAdded = rowsToAddedConnections(payload.additions);
    writeJson(OVERRIDES_KEY, nextOverrides);
    writeJson(VERIFICATIONS_KEY, nextVerifications);
    writeJson(ADDED_KEY, nextAdded);
    setOverrides(nextOverrides);
    setVerifications(nextVerifications);
    setAdded(nextAdded);
  }, []);

  // Hydrate from Supabase when a session is available, and refresh whenever
  // the auth state changes (sign in / sign out / token refresh).
  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const serverPayload = await syncRequest('GET');
      if (cancelled || !serverPayload) return;

      // Before overwriting local state, upload any local-only changes that
      // never reached the server (e.g. edits made while the session was expired).
      const localOverrides = readOverrides();
      const localVerifications = readVerifications();
      const localAdded = readAdded();
      const hasPendingLocal =
        Object.keys(localOverrides).some(id => !serverPayload.overrides.find(r => String(r.connection_id) === id)) ||
        Object.keys(localVerifications).some(id => !serverPayload.verifications.find(r => String(r.connection_id) === id)) ||
        localAdded.some(c => !serverPayload.additions.find(r => r.id === c.id));

      if (hasPendingLocal) {
        await flushLocalOnlyChanges(localOverrides, localVerifications, localAdded, serverPayload);
        if (cancelled) return;
        const flushedPayload = await syncRequest('GET');
        if (!cancelled && flushedPayload) applyServerPayload(flushedPayload);
      } else {
        applyServerPayload(serverPayload);
      }
    };
    refresh();

    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applyServerPayload]);

  // Cross-tab + same-tab sync of the localStorage cache.
  useEffect(() => {
    const refreshLocal = () => {
      setOverrides(readOverrides());
      setAdded(readAdded());
      setVerifications(readVerifications());
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === OVERRIDES_KEY || e.key === ADDED_KEY || e.key === VERIFICATIONS_KEY) refreshLocal();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, refreshLocal);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, refreshLocal);
    };
  }, []);

  const mergedBase = useMemo<PolicyConnection[]>(
    () => baseConnections.map(c => applyPatch(c, overrides[String(c.id)])),
    [overrides],
  );

  /** Full list (base + user-added) after edits applied. Rejected rows are INCLUDED — filter at the UI layer. */
  const mergedConnections = useMemo<PolicyConnection[]>(
    () => [...mergedBase, ...added],
    [mergedBase, added],
  );

  const enrichedConnections = useMemo<EnrichedConnection[]>(() => {
    const fromBase = mergedBase.map(c => enrich(c, overrides, verifications, false));
    const fromAdded = added.map(c => enrich(c, overrides, verifications, true));
    return [...fromBase, ...fromAdded];
  }, [mergedBase, added, overrides, verifications]);

  // ── Mutations ──────────────────────────────────────────────────────────
  // Pattern: optimistic local update for snappy UI, then POST to /api/...
  // and replace state with the server payload (authoritative). If the
  // POST fails (offline, signed out) we keep the optimistic state — the
  // next successful refresh will reconcile.

  const saveOverride = useCallback(
    async (id: number, patch: Omit<ConnectionPatch, 'updatedAt'>) => {
      const current = readOverrides();
      const next: OverrideMap = {
        ...current,
        [String(id)]: { ...patch, updatedAt: new Date().toISOString() },
      };
      writeJson(OVERRIDES_KEY, next);
      setOverrides(next);
      const payload = await syncRequest('POST', { op: 'saveOverride', id, patch });
      if (payload) applyServerPayload(payload);
    },
    [applyServerPayload],
  );

  const clearOverride = useCallback(
    async (id: number) => {
      const current = readOverrides();
      if (String(id) in current) {
        const next = { ...current };
        delete next[String(id)];
        writeJson(OVERRIDES_KEY, next);
        setOverrides(next);
      }
      const payload = await syncRequest('POST', { op: 'clearOverride', id });
      if (payload) applyServerPayload(payload);
    },
    [applyServerPayload],
  );

  const setVerification = useCallback(
    async (
      id: number,
      record: Omit<VerificationRecord, 'reviewedAt'> & { reviewedAt?: string },
    ) => {
      const current = readVerifications();
      const next: VerificationMap = {
        ...current,
        [String(id)]: {
          ...record,
          reviewedAt: record.reviewedAt ?? new Date().toISOString(),
        },
      };
      writeJson(VERIFICATIONS_KEY, next);
      setVerifications(next);
      const payload = await syncRequest('POST', {
        op: 'setVerification',
        id,
        status: record.status,
        reviewerName: record.reviewerName,
        reviewerNote: record.reviewerNote,
      });
      if (payload) applyServerPayload(payload);
    },
    [applyServerPayload],
  );

  const bulkSetVerification = useCallback(
    async (
      ids: number[],
      record: Omit<VerificationRecord, 'reviewedAt'> & { reviewedAt?: string },
    ) => {
      const current = readVerifications();
      const stamped: VerificationRecord = {
        ...record,
        reviewedAt: record.reviewedAt ?? new Date().toISOString(),
      };
      const next: VerificationMap = { ...current };
      for (const id of ids) next[String(id)] = stamped;
      writeJson(VERIFICATIONS_KEY, next);
      setVerifications(next);
      const payload = await syncRequest('POST', {
        op: 'bulkSetVerification',
        ids,
        status: record.status,
        reviewerName: record.reviewerName,
        reviewerNote: record.reviewerNote,
      });
      if (payload) applyServerPayload(payload);
    },
    [applyServerPayload],
  );

  const clearVerification = useCallback(
    async (id: number) => {
      const current = readVerifications();
      if (String(id) in current) {
        const next = { ...current };
        delete next[String(id)];
        writeJson(VERIFICATIONS_KEY, next);
        setVerifications(next);
      }
      const payload = await syncRequest('POST', { op: 'clearVerification', id });
      if (payload) applyServerPayload(payload);
    },
    [applyServerPayload],
  );

  const addConnection = useCallback(
    async (draft: Omit<PolicyConnection, 'id'>): Promise<PolicyConnection> => {
      const payload = await syncRequest('POST', { op: 'addConnection', draft });
      if (payload?.created) {
        applyServerPayload(payload);
        return rowsToAddedConnections([payload.created])[0];
      }
      // Offline / signed-out fallback: allocate a local id and write to
      // localStorage. The id will be reconciled the next time the user
      // signs in and a fresh fetch lands.
      const currentAdded = readAdded();
      const created: PolicyConnection = { ...draft, id: nextConnectionId(currentAdded) };
      const nextAdded = [...currentAdded, created];
      writeJson(ADDED_KEY, nextAdded);
      setAdded(nextAdded);
      return created;
    },
    [applyServerPayload],
  );

  const updateAddedConnection = useCallback(
    async (id: number, patch: Partial<Omit<PolicyConnection, 'id'>>) => {
      const currentAdded = readAdded();
      const nextAdded = currentAdded.map(c => (c.id === id ? { ...c, ...patch } : c));
      writeJson(ADDED_KEY, nextAdded);
      setAdded(nextAdded);
      const payload = await syncRequest('POST', { op: 'updateAddedConnection', id, patch });
      if (payload) applyServerPayload(payload);
    },
    [applyServerPayload],
  );

  const deleteAddedConnection = useCallback(
    async (id: number) => {
      const currentAdded = readAdded();
      const nextAdded = currentAdded.filter(c => c.id !== id);
      writeJson(ADDED_KEY, nextAdded);
      setAdded(nextAdded);
      const currentVer = readVerifications();
      if (String(id) in currentVer) {
        const next = { ...currentVer };
        delete next[String(id)];
        writeJson(VERIFICATIONS_KEY, next);
        setVerifications(next);
      }
      const payload = await syncRequest('POST', { op: 'deleteAddedConnection', id });
      if (payload) applyServerPayload(payload);
    },
    [applyServerPayload],
  );

  const getConnectionsForPolicy = useCallback(
    (policyId: string): EnrichedConnection[] =>
      enrichedConnections.filter(
        c => c.source_policy_id === policyId || c.target_policy_id === policyId,
      ),
    [enrichedConnections],
  );

  /**
   * Build the graph payload. Rejected connections are dropped — the
   * reviewer has said the link is wrong, so it should not show as an
   * edge. They remain in the verification table for audit.
   */
  const getGraphData = useCallback((): { nodes: GraphNode[]; links: GraphLink[] } => {
    const visible = enrichedConnections.filter(c => c.verification.status !== 'rejected');
    const nodes: GraphNode[] = policies.map(p => ({
      id: p.id,
      title: p.title,
      short_title: p.short_title,
      domain: p.domain,
      status: p.status,
      document_type: p.document_type,
      connections: visible.filter(
        c => c.source_policy_id === p.id || c.target_policy_id === p.id,
      ).length,
    }));
    const links: GraphLink[] = visible.map(c => ({
      source: c.source_policy_id,
      target: c.target_policy_id,
      connection_type: c.connection_type,
      description: c.description,
      review_status: c.verification.status,
    }));
    return { nodes, links };
  }, [enrichedConnections]);

  const verificationCounts = useMemo(() => {
    const counts = { verified: 0, rejected: 0, needs_review: 0, unverified: 0 };
    for (const c of enrichedConnections) counts[c.verification.status] += 1;
    return counts;
  }, [enrichedConnections]);

  return {
    overrides,
    verifications,
    addedConnections: added,
    connections: mergedConnections,
    enrichedConnections,
    editedCount: Object.keys(overrides).length,
    verificationCounts,
    saveOverride,
    clearOverride,
    setVerification,
    bulkSetVerification,
    clearVerification,
    addConnection,
    updateAddedConnection,
    deleteAddedConnection,
    getConnectionsForPolicy,
    getGraphData,
  };
}

export type { ConnectionTypeId };
