'use client';

// ---------------------------------------------------------------------------
// useOptimisticAction — small hook for "save now, roll back on failure".
//
// Pattern:
//   const { value, run, pending, error } = useOptimisticAction({
//     initial: reference.tags,
//     commit: async (next) => api.updateTags(reference.id, next),
//     onError: (err, prev) => showToast({ tone: 'danger',
//       message: 'Couldn’t save — restored',
//       description: err.message }),
//   });
//   // in a handler:
//   await run([...value, 'just-transition']);
//
// Why this exists. The brief calls for optimistic UI on every save —
// success silent, failure rolls back with an amber toast. Keeping the
// rollback logic in one place stops every component from inventing its
// own try/catch + setState dance.
//
// Notes:
//  - Pure client-side. Does not depend on Supabase or any specific API
//    layer; pass any async commit() function.
//  - The hook never throws; errors land in `error` and trigger onError().
//  - If commit() resolves with a value, that value replaces the
//    optimistic one (server-of-record wins, e.g. trimmed strings,
//    server-assigned IDs).
// ---------------------------------------------------------------------------

import { useCallback, useRef, useState } from 'react';

export type OptimisticConfig<T> = {
  initial: T;
  commit: (next: T) => Promise<T | void>;
  onError?: (err: Error, previous: T) => void;
  onSuccess?: (committed: T) => void;
};

export type OptimisticHandle<T> = {
  value: T;
  pending: boolean;
  error: Error | null;
  run: (next: T) => Promise<void>;
  reset: (to?: T) => void;
};

export function useOptimisticAction<T>({
  initial,
  commit,
  onError,
  onSuccess,
}: OptimisticConfig<T>): OptimisticHandle<T> {
  const [value, setValue] = useState<T>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const previousRef = useRef<T>(initial);

  const run = useCallback(async (next: T) => {
    previousRef.current = value;
    setValue(next);            // optimistic — paint immediately
    setPending(true);
    setError(null);
    try {
      const committed = await commit(next);
      if (committed !== undefined) setValue(committed as T);
      onSuccess?.(((committed ?? next) as T));
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      setValue(previousRef.current);   // rollback
      setError(err);
      onError?.(err, previousRef.current);
    } finally {
      setPending(false);
    }
  }, [value, commit, onError, onSuccess]);

  const reset = useCallback((to?: T) => {
    setValue(to !== undefined ? to : initial);
    setError(null);
    setPending(false);
  }, [initial]);

  return { value, pending, error, run, reset };
}
