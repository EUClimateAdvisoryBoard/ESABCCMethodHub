/**
 * Content-analysis durable write outbox.
 * -----------------------------------------------------------------------------
 *
 * The workbench is localStorage-first: every mutation updates local state
 * instantly and is *mirrored* to Supabase through the /api/content-analysis/*
 * routes. The danger is that a mirror write can fail (offline, a 5xx, a
 * transient DB error) — and if that failure is swallowed, the work survives
 * only in the author's browser and is lost on a cache clear or a device change,
 * and never reaches teammates.
 *
 * This outbox closes that gap. Instead of fire-and-forget `fetch()`, every
 * server write is recorded as an op in a queue that is:
 *
 *   • persisted to localStorage, so it survives reloads and crashes;
 *   • retried — on enqueue, on an interval, when the tab regains focus, and
 *     when the browser comes back online — until the server confirms (HTTP 2xx,
 *     or a 404 on a DELETE, which means "already gone");
 *   • collapsed per (resource, id): a newer write supersedes an older queued
 *     one, and a delete supersedes a pending create for the same id.
 *
 * Only a genuinely non-retryable response (a 4xx other than 404 — a malformed
 * request that will never succeed) drops an op, so the queue can't be wedged by
 * one poison payload. Everything else stays queued until it lands, which is the
 * durability guarantee: a confirmed-or-still-trying write is never silently
 * dropped.
 */

'use client';

const LS_KEY = 'esabcc_ca_outbox_v1';
const FLUSH_INTERVAL_MS = 20_000;

export interface OutboxOp {
  /** Dedupe key per (resource, id). A newer op with the same key replaces the
   *  older one, so an upsert→upsert collapses to the latest and an upsert→delete
   *  collapses to the delete. */
  key: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  url: string;
  /** JSON body for POST/PATCH; omitted for DELETE. */
  body?: unknown;
  ts: number;
}

export interface OutboxStatus {
  /** Writes still waiting to be confirmed by the server. */
  pending: number;
  /** Last send error message, or null when the queue is healthy/empty. */
  lastError: string | null;
  /** Whether the server reported a configured durable backend (Supabase). When
   *  false, writes can't be shared — surfaced so the UI can warn. */
  persistent: boolean;
}

type Listener = () => void;

let queue: OutboxOp[] = [];
let loaded = false;
let flushing = false;
let lastError: string | null = null;
let persistent = true;
const listeners = new Set<Listener>();

// useSyncExternalStore requires a referentially-stable snapshot between changes,
// so we cache it and only rebuild when something actually moves.
let statusSnapshot: OutboxStatus = { pending: 0, lastError: null, persistent: true };
function recomputeStatus(): void {
  statusSnapshot = { pending: queue.length, lastError, persistent };
}

function emit(): void {
  recomputeStatus();
  for (const l of listeners) l();
}

function save(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(queue));
  } catch {
    // Quota exceeded — the op still lives in the in-memory queue and will be
    // retried this session; we just can't persist it across a reload.
  }
}

function load(): void {
  if (loaded) return;
  loaded = true;
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) queue = parsed as OutboxOp[];
    }
  } catch {
    queue = [];
  }
  recomputeStatus();
  // Retry triggers beyond the immediate enqueue flush.
  window.addEventListener('online', () => void flush());
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flush();
  });
  window.setInterval(() => {
    if (queue.length > 0) void flush();
  }, FLUSH_INTERVAL_MS);
  // Best-effort final flush on unload (keepalive lets it outlive the page).
  window.addEventListener('pagehide', () => void flush());
  // Kick any work persisted from a previous session.
  if (queue.length > 0) void flush();
}

export function subscribeOutbox(cb: Listener): () => void {
  load();
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getOutboxStatus(): OutboxStatus {
  return statusSnapshot;
}

/** Enqueue a server write. Collapses any pending op with the same key. */
export function enqueue(op: Omit<OutboxOp, 'ts'>): void {
  load();
  queue = queue.filter(o => o.key !== op.key);
  queue.push({ ...op, ts: Date.now() });
  save();
  emit();
  void flush();
}

async function sendOne(op: OutboxOp): Promise<boolean> {
  try {
    const resp = await fetch(op.url, {
      method: op.method,
      headers: op.body !== undefined ? { 'content-type': 'application/json' } : undefined,
      body: op.body !== undefined ? JSON.stringify(op.body) : undefined,
      keepalive: true,
    });
    // Pick up the backend's persistence signal so the UI can warn when the
    // server has no durable store configured.
    try {
      const j = await resp.clone().json();
      if (j && typeof j.persistent === 'boolean') persistent = j.persistent;
    } catch {
      // non-JSON response — ignore
    }
    if (resp.ok) return true;
    // A DELETE for a row that's already gone is, for our purposes, done.
    if (op.method === 'DELETE' && resp.status === 404) return true;
    // Other 4xx are non-retryable (a malformed request won't fix itself) — drop
    // the op so it can't wedge the queue, but record why.
    if (resp.status >= 400 && resp.status < 500) {
      lastError = `${op.method} ${op.url} → ${resp.status} (dropped, non-retryable)`;
      return true;
    }
    // 5xx (e.g. a transient DB error / migration lag) — keep and retry.
    lastError = `${op.method} ${op.url} → ${resp.status}`;
    return false;
  } catch (err) {
    // Network failure / offline — keep and retry.
    lastError = err instanceof Error ? err.message : 'network error';
    return false;
  }
}

/** Attempt to drain the queue. FIFO; stops at the first retryable failure so
 *  ordering (create-before-note, create-before-delete) is preserved. */
export async function flush(): Promise<void> {
  load();
  if (flushing || queue.length === 0) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  flushing = true;
  try {
    const pending = [...queue];
    for (const op of pending) {
      const ok = await sendOne(op);
      if (!ok) break;
      queue = queue.filter(o => o !== op);
      save();
      emit();
    }
  } finally {
    flushing = false;
    if (queue.length === 0) lastError = null;
    emit();
  }
}
