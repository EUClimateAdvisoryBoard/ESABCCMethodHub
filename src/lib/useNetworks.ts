'use client';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * User-defined networks are named subsets of policies (and, implicitly, the
 * connections that fall entirely within that subset). They let analysts
 * carve out focused views of the full legislative graph — e.g. "Finance
 * disclosure stack" or "Fit for 55 core" — without touching the underlying
 * dataset.
 *
 * Networks are stored per-browser in `localStorage` under
 * `eu-policy-networks`. Cross-tab updates are propagated via the storage
 * event; same-tab updates via the `eu-policy-networks-changed` custom event.
 */

const STORAGE_KEY = 'eu-policy-networks';
const CHANGE_EVENT = 'eu-policy-networks-changed';

export interface PolicyNetwork {
  id: string;
  name: string;
  description: string;
  policyIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface NetworkDraft {
  name: string;
  description: string;
  policyIds: string[];
}

function readNetworks(): PolicyNetwork[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PolicyNetwork[]) : [];
  } catch {
    return [];
  }
}

function writeNetworks(next: PolicyNetwork[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
  } catch {
    // Ignore storage failures; caller retains in-memory state.
  }
}

function makeId() {
  return 'net_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function useNetworks() {
  const [networks, setNetworks] = useState<PolicyNetwork[]>(() => readNetworks());

  useEffect(() => {
    const refresh = () => setNetworks(readNetworks());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(CHANGE_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(CHANGE_EVENT, refresh);
    };
  }, []);

  const sorted = useMemo(
    () => [...networks].sort((a, b) => a.name.localeCompare(b.name)),
    [networks],
  );

  const createNetwork = useCallback((draft: NetworkDraft): PolicyNetwork => {
    const now = new Date().toISOString();
    const created: PolicyNetwork = {
      id: makeId(),
      name: draft.name.trim() || 'Untitled network',
      description: draft.description.trim(),
      policyIds: Array.from(new Set(draft.policyIds)),
      createdAt: now,
      updatedAt: now,
    };
    const current = readNetworks();
    const next = [...current, created];
    writeNetworks(next);
    setNetworks(next);
    return created;
  }, []);

  const updateNetwork = useCallback(
    (id: string, draft: NetworkDraft): PolicyNetwork | null => {
      const current = readNetworks();
      const idx = current.findIndex(n => n.id === id);
      if (idx === -1) return null;
      const updated: PolicyNetwork = {
        ...current[idx],
        name: draft.name.trim() || current[idx].name,
        description: draft.description.trim(),
        policyIds: Array.from(new Set(draft.policyIds)),
        updatedAt: new Date().toISOString(),
      };
      const next = [...current];
      next[idx] = updated;
      writeNetworks(next);
      setNetworks(next);
      return updated;
    },
    [],
  );

  const deleteNetwork = useCallback((id: string) => {
    const current = readNetworks();
    const next = current.filter(n => n.id !== id);
    if (next.length === current.length) return;
    writeNetworks(next);
    setNetworks(next);
  }, []);

  const getNetwork = useCallback(
    (id: string | null): PolicyNetwork | null =>
      id ? networks.find(n => n.id === id) || null : null,
    [networks],
  );

  return {
    networks: sorted,
    createNetwork,
    updateNetwork,
    deleteNetwork,
    getNetwork,
  };
}
