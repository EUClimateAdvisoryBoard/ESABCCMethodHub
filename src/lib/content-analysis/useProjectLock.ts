'use client';

/**
 * Soft-locking hook for the content-analysis workbench.
 *
 *   const { mode, lock, requestEdit, handOff } = useProjectLock(projectId);
 *
 *   mode === 'editor'   → you hold the lock; render controls enabled
 *   mode === 'watcher'  → someone else holds it; render disabled banner
 *   mode === 'idle'     → no lock yet (master/no project, or loading)
 *
 * Behaviour:
 *   • On mount with a real projectId, attempts to acquire. If another
 *     active holder exists, drops into watcher mode and starts polling
 *     every WATCH_POLL_MS for the lock to free up.
 *   • While editor, heartbeats every HEARTBEAT_MS so the lock stays warm.
 *   • Releases on unmount via sendBeacon so a tab close doesn't strand
 *     the lock.
 *   • Auto-releases after IDLE_RELEASE_MS without user interaction; the
 *     user can keep working — any input bumps the idle timer.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface ProjectLock {
  projectId: string;
  holderId: string;
  holderName: string;
  acquiredAt: string;
  heartbeatAt: string;
}

export type LockMode = 'idle' | 'editor' | 'watcher';

export interface UseProjectLockResult {
  mode: LockMode;
  lock: ProjectLock | null;
  /** True the first time we acquired without an existing holder. */
  stolen: boolean;
  /** Watcher action: ask the current holder to hand off. */
  requestEdit: () => Promise<void>;
  /** Editor action: voluntarily release the lock. */
  handOff: () => Promise<void>;
  /** Editor action: bump the idle timer. Wired internally to user gestures. */
  ping: () => void;
}

const HEARTBEAT_MS = 30_000;
const WATCH_POLL_MS = 5_000;
const IDLE_RELEASE_MS = 10 * 60_000; // 10 min

const CLIENT_ID_KEY = 'mh:client-id';
const HOLDER_NAME_KEY = 'mh:holder-name';

function readOrCreateClientId(): string {
  if (typeof window === 'undefined') return 'ssr';
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing && /^[a-zA-Z0-9._:-]{6,80}$/.test(existing)) return existing;
    // 22-char base36 uuid-ish — safe under the API regex.
    const fresh =
      'mh-' +
      Array.from(crypto.getRandomValues(new Uint8Array(12)))
        .map(b => b.toString(36).padStart(2, '0'))
        .join('')
        .slice(0, 22);
    localStorage.setItem(CLIENT_ID_KEY, fresh);
    return fresh;
  } catch {
    return 'mh-fallback-' + Math.random().toString(36).slice(2, 10);
  }
}

export function readHolderName(): string {
  if (typeof window === 'undefined') return 'Anonymous editor';
  try {
    const v = localStorage.getItem(HOLDER_NAME_KEY);
    return (v && v.trim()) || 'Anonymous editor';
  } catch {
    return 'Anonymous editor';
  }
}

export function setHolderName(name: string): void {
  if (typeof window === 'undefined') return;
  try { localStorage.setItem(HOLDER_NAME_KEY, name.slice(0, 80)); } catch { /* ignore */ }
}

/** Heads up to the rest of the app: callers can read this to attach the
 *  client-id header to *other* writes once we extend authorisation. */
export function getClientId(): string {
  return readOrCreateClientId();
}

interface FetchHeaders {
  [key: string]: string;
}

function authHeaders(): FetchHeaders {
  return {
    'content-type': 'application/json',
    'x-mh-client-id': readOrCreateClientId(),
  };
}

/** No-op for the master project — locking it makes no sense (it's the
 *  shared library, not a per-analyst workspace). */
function isLockable(projectId: string | null): boolean {
  return !!projectId && projectId !== 'project-master';
}

export function useProjectLock(projectId: string | null): UseProjectLockResult {
  const [lock, setLock] = useState<ProjectLock | null>(null);
  const [mode, setMode] = useState<LockMode>('idle');
  const [stolen, setStolen] = useState(false);

  const heartbeatTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const watchTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const idleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const releasedRef = useRef(false);

  const holderId = typeof window === 'undefined' ? 'ssr' : readOrCreateClientId();

  const clearTimers = () => {
    if (heartbeatTimer.current) { clearInterval(heartbeatTimer.current); heartbeatTimer.current = null; }
    if (watchTimer.current) { clearInterval(watchTimer.current); watchTimer.current = null; }
    if (idleTimer.current) { clearTimeout(idleTimer.current); idleTimer.current = null; }
  };

  const tryAcquire = useCallback(async (): Promise<void> => {
    if (!isLockable(projectId)) return;
    try {
      const res = await fetch('/api/content-analysis/locks', {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ projectId, holderName: readHolderName() }),
      });
      const json = await res.json();
      if (json.lock) setLock(json.lock as ProjectLock);
      if (json.ok) {
        setMode('editor');
        setStolen(!!json.stolen);
        releasedRef.current = false;
      } else {
        setMode('watcher');
      }
    } catch {
      // Network blip — leave the previous mode in place; the next poll fixes it.
    }
  }, [projectId]);

  const heartbeat = useCallback(async (): Promise<void> => {
    if (!isLockable(projectId)) return;
    try {
      const res = await fetch('/api/content-analysis/locks', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ projectId }),
      });
      const json = await res.json();
      if (json.ok && json.lock) {
        setLock(json.lock);
        setMode('editor');
      } else if (json.hijacked) {
        // Someone took over — drop to watcher so the controls disable.
        setLock(json.lock ?? null);
        setMode('watcher');
      }
    } catch {
      // Best-effort — try again next tick.
    }
  }, [projectId]);

  const pollWatcher = useCallback(async (): Promise<void> => {
    if (!isLockable(projectId)) return;
    try {
      const res = await fetch(
        `/api/content-analysis/locks?projectId=${encodeURIComponent(projectId!)}`,
        { headers: authHeaders() },
      );
      const json = await res.json();
      const fresh = (json.lock ?? null) as ProjectLock | null;
      setLock(fresh);
      if (!fresh) {
        // Lock released — try to grab it.
        await tryAcquire();
      } else if (fresh.holderId === holderId) {
        // We somehow already hold it (e.g. previous tab's leftover).
        setMode('editor');
      } else {
        setMode('watcher');
      }
    } catch {
      // Ignore — keep current state.
    }
  }, [projectId, holderId, tryAcquire]);

  const release = useCallback(async (): Promise<void> => {
    if (!isLockable(projectId)) return;
    if (releasedRef.current) return;
    releasedRef.current = true;
    // Use sendBeacon when available so unmount/tab-close releases reliably.
    const url = `/api/content-analysis/locks?projectId=${encodeURIComponent(projectId!)}`;
    const headers = authHeaders();
    if (typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        const blob = new Blob([JSON.stringify({ projectId })], { type: 'application/json' });
        // Beacon ignores custom headers; fall back to fetch when we need
        // the X-MH-Client-Id header to be honoured by the server.
        await fetch(url, { method: 'DELETE', headers, body: blob, keepalive: true });
      } catch { /* swallow */ }
    } else {
      try { await fetch(url, { method: 'DELETE', headers }); } catch { /* swallow */ }
    }
  }, [projectId]);

  const ping = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(() => {
      // Idle release — drop to watcher so the next click re-acquires.
      release().then(() => setMode('watcher'));
    }, IDLE_RELEASE_MS);
  }, [release]);

  // Acquire on mount / when project changes.
  useEffect(() => {
    setLock(null);
    setStolen(false);
    if (!isLockable(projectId)) {
      setMode('idle');
      clearTimers();
      return;
    }
    setMode('idle');
    void tryAcquire();
    return () => {
      clearTimers();
      void release();
    };
    // tryAcquire/release are stable per projectId.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  // Heartbeat loop while we're the editor; watcher loop while we're not.
  useEffect(() => {
    clearTimers();
    if (!isLockable(projectId)) return;
    if (mode === 'editor') {
      heartbeatTimer.current = setInterval(heartbeat, HEARTBEAT_MS);
      ping(); // arm the idle timer
    } else if (mode === 'watcher') {
      watchTimer.current = setInterval(pollWatcher, WATCH_POLL_MS);
    }
    return clearTimers;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, projectId]);

  // Release the lock cleanly when the tab is closed or hidden.
  useEffect(() => {
    if (!isLockable(projectId) || mode !== 'editor') return;
    const onUnload = () => { void release(); };
    const onVisibility = () => {
      // When the tab goes to background for >5 minutes, drop the lock so
      // a forgotten tab doesn't block colleagues. (Heartbeat is suspended
      // by browsers anyway when hidden.) Re-acquired automatically when
      // the tab comes back.
      if (document.visibilityState === 'hidden') {
        setTimeout(() => {
          if (document.visibilityState === 'hidden') void release();
        }, 5 * 60_000);
      }
    };
    window.addEventListener('beforeunload', onUnload);
    window.addEventListener('pagehide', onUnload);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('beforeunload', onUnload);
      window.removeEventListener('pagehide', onUnload);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [projectId, mode, release]);

  const requestEdit = useCallback(async () => {
    // Try to acquire — if the holder is stale we'll succeed; otherwise
    // we stay watcher, but the holder's heartbeat surfaces them in the UI.
    await tryAcquire();
  }, [tryAcquire]);

  const handOff = useCallback(async () => {
    await release();
    setMode('watcher');
    void pollWatcher();
  }, [release, pollWatcher]);

  return { mode, lock, stolen, requestEdit, handOff, ping };
}
