/**
 * useEditableBoard — shared persistence + edit-mode state for the computed
 * "Advanced" flow-chart views (v2 results-chain, v4 monitoring-map, v5 sectored
 * results-chain, v6 policy-loop).
 *
 * These views used to be read-only re-clusterings of the catalogue. They are now
 * editable: this hook gives each one the same lifecycle the sector `FrameworkBoard`
 * already has —
 *   • initial render uses the computed published default (SSR-safe);
 *   • on mount (and again once the shared store has hydrated the localStorage
 *     cache) the saved board for this version is loaded, if any;
 *   • every user edit is written through to the cache and the shared store, so
 *     collaborators converge; and
 *   • `reset()` restores a built-in to its published default, or a custom copy
 *     to the seed it was created from.
 *
 * The board shape is generic — each view passes its own `makeDefault()` factory
 * and a `validate()` shape guard so a stale/foreign cache entry is ignored.
 */
'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  boardStorageKey,
  readVersionBoard,
  readVersionSeed,
  saveVersionBoard,
  type FlowChartVersion,
} from './flowchart-versions';

interface Options<T> {
  projectId: string;
  version: FlowChartVersion;
  /** True once the shared store has been pulled into the localStorage cache. */
  hydrated: boolean;
  /** The computed published default board for this version's variant. */
  makeDefault: () => T;
  /** Shape guard: is a parsed cache entry a usable board of this type? */
  validate: (parsed: unknown) => boolean;
}

interface Result<T> {
  board: T;
  setBoard: React.Dispatch<React.SetStateAction<T>>;
  editing: boolean;
  setEditing: React.Dispatch<React.SetStateAction<boolean>>;
  /** Restore the published default (built-in) or creation seed (custom). */
  reset: () => void;
  /** True after the first client mount (saved board has been read). */
  mounted: boolean;
}

export function useEditableBoard<T>({
  projectId,
  version,
  hydrated,
  makeDefault,
  validate,
}: Options<T>): Result<T> {
  const [mounted, setMounted] = useState(false);
  const [board, setBoard] = useState<T>(() => makeDefault());
  const [editing, setEditing] = useState(false);
  // The next board change came from (re)loading, not a user edit — don't write
  // it back, so we never echo the just-loaded board to the shared store.
  const skipPersist = useRef(true);
  const storageKey = boardStorageKey(version, projectId);

  // Load the saved board on mount, and again once `hydrated` flips true (the
  // shared store has been pulled into the cache by the parent).
  useEffect(() => {
    setMounted(true);
    skipPersist.current = true;
    const stored = readVersionBoard(projectId, version);
    if (stored && validate(stored)) {
      setBoard(stored as T);
    } else {
      setBoard(makeDefault());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey, hydrated]);

  // Write through to the shared store (and cache) on every user edit, once the
  // shared store has hydrated (so we never overwrite a colleague's board with
  // the published default before it has loaded).
  useEffect(() => {
    if (!mounted || !hydrated) return;
    if (skipPersist.current) {
      skipPersist.current = false;
      return;
    }
    saveVersionBoard(projectId, version, board);
  }, [board, mounted, hydrated, projectId, version]);

  const reset = useCallback(() => {
    if (version.builtIn) {
      setBoard(makeDefault());
      return;
    }
    const seed = readVersionSeed(projectId, version);
    setBoard(seed && validate(seed) ? (seed as T) : makeDefault());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, version]);

  return { board, setBoard, editing, setEditing, reset, mounted };
}
