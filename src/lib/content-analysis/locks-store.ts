/**
 * Server-side store for content-analysis project locks.
 *
 * One row per locked project in `public.content_analysis_project_locks`.
 * The API route at `/api/content-analysis/locks` is the only writer; this
 * module wraps the Supabase client so the route stays terse.
 *
 * Falls back to an in-memory map when Supabase env vars are missing
 * (local dev without `.env.local`). The fallback is lossy on cold start,
 * which for a soft-lock is fine — the client re-acquires on reconnect.
 */

import { getServerSupabase } from '@/lib/supabase-server';

/** A held lock — older rows where `heartbeat_at` is more than this many
 *  seconds old are considered stale and can be stolen by another user. */
export const STALE_AFTER_SECONDS = 90;

export interface ProjectLock {
  projectId: string;
  holderId: string;
  holderName: string;
  acquiredAt: string;
  heartbeatAt: string;
}

interface LockRow {
  project_id: string;
  holder_id: string;
  holder_name: string;
  acquired_at: string;
  heartbeat_at: string;
}

interface GlobalCache {
  __caLocks?: Map<string, ProjectLock>;
}
const g = globalThis as unknown as GlobalCache;
if (!g.__caLocks) g.__caLocks = new Map();

function rowToLock(r: LockRow): ProjectLock {
  return {
    projectId: r.project_id,
    holderId: r.holder_id,
    holderName: r.holder_name,
    acquiredAt: r.acquired_at,
    heartbeatAt: r.heartbeat_at,
  };
}

function isStale(lock: ProjectLock, now: number): boolean {
  const heartbeat = Date.parse(lock.heartbeatAt);
  if (!Number.isFinite(heartbeat)) return true;
  return now - heartbeat > STALE_AFTER_SECONDS * 1000;
}

export async function getLock(projectId: string): Promise<ProjectLock | null> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_project_locks')
      .select('*')
      .eq('project_id', projectId)
      .maybeSingle();
    if (error) {
      console.error('[locks-store] getLock failed:', error.message);
      return g.__caLocks!.get(projectId) ?? null;
    }
    return data ? rowToLock(data as LockRow) : null;
  }
  return g.__caLocks!.get(projectId) ?? null;
}

export async function listLocks(): Promise<ProjectLock[]> {
  const sb = getServerSupabase();
  if (sb) {
    const { data, error } = await sb
      .from('content_analysis_project_locks')
      .select('*')
      .order('heartbeat_at', { ascending: false })
      .limit(500);
    if (error) {
      console.error('[locks-store] listLocks failed:', error.message);
      return [...g.__caLocks!.values()];
    }
    return (data as LockRow[]).map(rowToLock);
  }
  return [...g.__caLocks!.values()];
}

export interface AcquireInput {
  projectId: string;
  holderId: string;
  holderName: string;
}

export interface AcquireResult {
  ok: boolean;
  /** Always returned — the current holder, whether you are them or not. */
  lock: ProjectLock;
  /** True when the previous holder timed out and we stole the lock. */
  stolen: boolean;
}

/** Acquire (or refresh, or steal-if-stale). Idempotent for the same holder. */
export async function acquireLock(input: AcquireInput): Promise<AcquireResult> {
  const now = new Date();
  const nowMs = now.getTime();
  const sb = getServerSupabase();

  // Read current lock (server or memory fallback).
  const existing = await getLock(input.projectId);

  if (existing && existing.holderId !== input.holderId && !isStale(existing, nowMs)) {
    return { ok: false, lock: existing, stolen: false };
  }

  const stolen = !!existing && existing.holderId !== input.holderId && isStale(existing, nowMs);

  const next: ProjectLock = {
    projectId: input.projectId,
    holderId: input.holderId,
    holderName: input.holderName,
    // Refresh acquiredAt only when we're a new holder (own-refresh keeps old).
    acquiredAt: existing && existing.holderId === input.holderId ? existing.acquiredAt : now.toISOString(),
    heartbeatAt: now.toISOString(),
  };

  if (sb) {
    const row: LockRow = {
      project_id: next.projectId,
      holder_id: next.holderId,
      holder_name: next.holderName,
      acquired_at: next.acquiredAt,
      heartbeat_at: next.heartbeatAt,
    };
    const { error } = await sb
      .from('content_analysis_project_locks')
      .upsert(row, { onConflict: 'project_id' });
    if (error) {
      console.error('[locks-store] acquireLock failed:', error.message);
      // Fall through to memory fallback so the user isn't stuck.
    }
  }
  g.__caLocks!.set(next.projectId, next);
  return { ok: true, lock: next, stolen };
}

export interface HeartbeatResult {
  ok: boolean;
  lock: ProjectLock | null;
  /** True when the heartbeat was rejected because someone else holds the lock. */
  hijacked: boolean;
}

/** Heartbeat: refresh `heartbeat_at` as long as we still hold the lock. */
export async function heartbeatLock(projectId: string, holderId: string): Promise<HeartbeatResult> {
  const existing = await getLock(projectId);
  if (!existing) return { ok: false, lock: null, hijacked: false };
  if (existing.holderId !== holderId) {
    return { ok: false, lock: existing, hijacked: true };
  }
  const next: ProjectLock = { ...existing, heartbeatAt: new Date().toISOString() };
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_project_locks')
      .update({ heartbeat_at: next.heartbeatAt })
      .eq('project_id', projectId)
      .eq('holder_id', holderId);
    if (error) {
      console.error('[locks-store] heartbeatLock failed:', error.message);
    }
  }
  g.__caLocks!.set(projectId, next);
  return { ok: true, lock: next, hijacked: false };
}

/** Release: only the current holder may release. Stale locks no-op cleanly. */
export async function releaseLock(projectId: string, holderId: string): Promise<boolean> {
  const existing = await getLock(projectId);
  if (!existing || existing.holderId !== holderId) return false;
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb
      .from('content_analysis_project_locks')
      .delete()
      .eq('project_id', projectId)
      .eq('holder_id', holderId);
    if (error) {
      console.error('[locks-store] releaseLock failed:', error.message);
    }
  }
  g.__caLocks!.delete(projectId);
  return true;
}
