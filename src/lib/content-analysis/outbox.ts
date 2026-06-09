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
 * Ordering is FIFO *per resource class* (the key prefix — `seg:`, `summ:`,
 * `note:`, …): a retryable failure holds back later ops on the same resource,
 * so create-before-note and create-before-delete are preserved, but it does
 * NOT stall unrelated resources — one wedged endpoint (say, a table whose
 * migration hasn't landed) can't block segments or summaries queued behind it.
 *
 * Nothing is ever silently dropped. A genuinely non-retryable response (a 4xx
 * other than 404 — a malformed request that will never succeed) moves the op
 * to a persisted DEAD-LETTER ledger instead of deleting it: the payload stays
 * recoverable in localStorage, the UI can surface the count, and
 * `requeueDeadLetters()` puts them back in the queue after a fix ships.
 */

'use client';

import { supabase } from '@/lib/supabase';

const LS_KEY = 'esabcc_ca_outbox_v1';
const DEAD_KEY = 'esabcc_ca_outbox_dead_v1';
const FLUSH_INTERVAL_MS = 20_000;
/** Dead letters are an emergency ledger, not a database — cap so a runaway
 *  bug can't eat the localStorage quota that the live queue needs. */
const DEAD_MAX = 200;

export interface OutboxOp {
  /** Dedupe key per (resource, id). A newer op with the same key replaces the
   *  older one, so an upsert→upsert collapses to the latest and an upsert→delete
   *  collapses to the delete. */
  key: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  url: string;
  /** JSON body for POST/PATCH; omitted for DELETE. */
  body?: unknown;
  /** When true, the op is sent with the caller's Supabase bearer token
   *  (resolved fresh at send time, so a token that expired while the op was
   *  queued doesn't poison it). Used by per-user writes (notes, overall tags)
   *  whose API routes authorise via RLS. */
  auth?: boolean;
  ts: number;
}

/** An op that got a non-retryable rejection, kept for recovery instead of
 *  being discarded. */
export interface DeadLetterOp extends OutboxOp {
  /** HTTP status that killed it. */
  status: number;
  diedAt: number;
}

export interface OutboxStatus {
  /** Writes still waiting to be confirmed by the server. */
  pending: number;
  /** Writes the server rejected as non-retryable, parked in the dead-letter
   *  ledger (recoverable via requeueDeadLetters). */
  dead: number;
  /** Last send error message, or null when the queue is healthy/empty. */
  lastError: string | null;
  /** Whether the server reported a configured durable backend (Supabase). When
   *  false, writes can't be shared — surfaced so the UI can warn. */
  persistent: boolean;
}

type Listener = () => void;

let queue: OutboxOp[] = [];
let deadLetters: DeadLetterOp[] = [];
let loaded = false;
let flushing = false;
let lastError: string | null = null;
let persistent = true;
const listeners = new Set<Listener>();

// useSyncExternalStore requires a referentially-stable snapshot between changes,
// so we cache it and only rebuild when something actually moves.
let statusSnapshot: OutboxStatus = { pending: 0, dead: 0, lastError: null, persistent: true };
function recomputeStatus(): void {
  statusSnapshot = { pending: queue.length, dead: deadLetters.length, lastError, persistent };
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
    // retried this session; we just can't persist it across a reload. Surface
    // it so the pill can warn instead of failing silently.
    lastError = 'Browser storage is full — pending changes survive this tab but not a reload. Free up space or keep this tab open until "Saving…" clears.';
  }
}

function saveDead(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DEAD_KEY, JSON.stringify(deadLetters));
  } catch {
    // Same quota story as save() — ledger stays in memory for this session.
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
  try {
    const rawDead = localStorage.getItem(DEAD_KEY);
    if (rawDead) {
      const parsed = JSON.parse(rawDead);
      if (Array.isArray(parsed)) deadLetters = parsed as DeadLetterOp[];
    }
  } catch {
    deadLetters = [];
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

/** The parked non-retryable ops, for inspection / manual export. */
export function getDeadLetters(): DeadLetterOp[] {
  load();
  return [...deadLetters];
}

/** Put every dead-lettered op back in the live queue (e.g. after the server
 *  bug that rejected them is fixed) and try again. */
export function requeueDeadLetters(): void {
  load();
  if (deadLetters.length === 0) return;
  for (const d of deadLetters) {
    const { status: _s, diedAt: _d, ...op } = d;
    queue = queue.filter(o => o.key !== op.key);
    queue.push({ ...op, ts: Date.now() });
  }
  deadLetters = [];
  save();
  saveDead();
  emit();
  void flush();
}

function deadLetter(op: OutboxOp, status: number): void {
  deadLetters.push({ ...op, status, diedAt: Date.now() });
  if (deadLetters.length > DEAD_MAX) deadLetters = deadLetters.slice(-DEAD_MAX);
  saveDead();
  // eslint-disable-next-line no-console
  console.error(
    `[content-analysis] write rejected by server (${status}) and parked for recovery:`,
    op.method,
    op.url,
  );
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

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  try {
    const { data } = await supabase.auth.getSession();
    const tok = data.session?.access_token;
    return tok ? { authorization: `Bearer ${tok}` } : {};
  } catch {
    return {};
  }
}

type SendResult =
  | { kind: 'done' }
  | { kind: 'retry' }
  | { kind: 'dead'; status: number };

async function sendOne(op: OutboxOp): Promise<SendResult> {
  try {
    const headers: Record<string, string> = {};
    if (op.body !== undefined) headers['content-type'] = 'application/json';
    if (op.auth) Object.assign(headers, await authHeader());
    const resp = await fetch(op.url, {
      method: op.method,
      headers: Object.keys(headers).length > 0 ? headers : undefined,
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
    if (resp.ok) return { kind: 'done' };
    // A DELETE for a row that's already gone is, for our purposes, done.
    if (op.method === 'DELETE' && resp.status === 404) return { kind: 'done' };
    // 401/403 on an authenticated op is retryable: the session may have been
    // mid-refresh (or briefly signed out) when we sent. The token is resolved
    // fresh on every attempt, so the next try can succeed.
    if (op.auth && (resp.status === 401 || resp.status === 403)) {
      lastError = `${op.method} ${op.url} → ${resp.status} (waiting for sign-in)`;
      return { kind: 'retry' };
    }
    // Other 4xx are non-retryable (a malformed request won't fix itself) —
    // park the op in the dead-letter ledger so it can't wedge the queue but
    // is never silently lost, and record why.
    if (resp.status >= 400 && resp.status < 500) {
      lastError = `${op.method} ${op.url} → ${resp.status} (parked for recovery)`;
      return { kind: 'dead', status: resp.status };
    }
    // 5xx (e.g. a transient DB error / migration lag) — keep and retry.
    lastError = `${op.method} ${op.url} → ${resp.status}`;
    return { kind: 'retry' };
  } catch (err) {
    // Network failure / offline — keep and retry.
    lastError = err instanceof Error ? err.message : 'network error';
    return { kind: 'retry' };
  }
}

/** Resource class of an op — the key prefix (`seg`, `summ`, `note`, …).
 *  `suggdoc` collapses into `sugg`: per-suggestion deletes and per-document
 *  batch ops touch the same rows, so they must stay mutually ordered. */
function opClass(op: OutboxOp): string {
  const prefix = op.key.split(':', 1)[0] ?? op.key;
  return prefix === 'suggdoc' ? 'sugg' : prefix;
}

/** Attempt to drain the queue. FIFO per resource class; a retryable failure
 *  holds back later ops of the SAME class (so create-before-note and
 *  create-before-delete ordering is preserved) without stalling unrelated
 *  resources behind one wedged endpoint. */
export async function flush(): Promise<void> {
  load();
  if (flushing || queue.length === 0) return;
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return;
  flushing = true;
  try {
    const pending = [...queue];
    const blocked = new Set<string>();
    for (const op of pending) {
      const cls = opClass(op);
      if (blocked.has(cls)) continue;
      const result = await sendOne(op);
      if (result.kind === 'retry') {
        blocked.add(cls);
        continue;
      }
      if (result.kind === 'dead') deadLetter(op, result.status);
      queue = queue.filter(o => o !== op);
      save();
      emit();
    }
  } finally {
    flushing = false;
    if (queue.length === 0 && deadLetters.length === 0) lastError = null;
    emit();
  }
}
