'use client';
/**
 * Human-confirmation state for the Policy Targets Register (the 12th column).
 * --------------------------------------------------------------------------
 * The extraction is deliberately recall-first, so every row starts UNCONFIRMED
 * (rendered grey). A reviewer ticks the checkbox to mark a row human-confirmed
 * (rendered green). That review state is per-user and local — it lives in
 * localStorage, not in the shipped dataset — so different reviewers can work
 * without clobbering each other and nothing leaves the browser.
 */
import { useCallback, useEffect, useState } from 'react';

const KEY = 'esabcc:policy-targets:confirmed:v1';

function load(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? new Set(arr.filter((x) => typeof x === 'string')) : new Set();
  } catch {
    return new Set();
  }
}

export function useTargetConfirmations() {
  const [confirmed, setConfirmed] = useState<Set<string>>(() => new Set());
  const [hydrated, setHydrated] = useState(false);

  // Load once on mount (avoids SSR/client hydration mismatch).
  useEffect(() => {
    setConfirmed(load());
    setHydrated(true);
  }, []);

  const persist = useCallback((next: Set<string>) => {
    setConfirmed(next);
    try {
      window.localStorage.setItem(KEY, JSON.stringify([...next]));
    } catch {
      /* quota / private mode — state still works for the session */
    }
  }, []);

  const toggle = useCallback((id: string) => {
    const next = new Set(confirmed);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persist(next);
  }, [confirmed, persist]);

  const setMany = useCallback((ids: string[], value: boolean) => {
    const next = new Set(confirmed);
    for (const id of ids) {
      if (value) next.add(id);
      else next.delete(id);
    }
    persist(next);
  }, [confirmed, persist]);

  const isConfirmed = useCallback((id: string) => confirmed.has(id), [confirmed]);

  return { confirmed, isConfirmed, toggle, setMany, count: confirmed.size, hydrated };
}
