/**
 * Hook for saving, loading, and sharing named scenario explorer view configurations.
 */
'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Saved / shareable scenario views.
 *
 * Backed by `scenario_views` (migration 020). The table holds an opaque
 * JSONB `state` blob — schema is owned by `ScenarioExplorer`, see
 * `serializeExplorerState` / `applyExplorerState` in that file.
 *
 * Visibility:
 *   • A signed-in reviewer sees their own views + every shared view.
 *   • Edits & deletes are owner-only (RLS).
 *
 * The hook stays silent when the user is signed out / Supabase is not
 * configured — `views` returns [] and `save`/`remove` are no-ops. This
 * keeps the UI usable in the offline / static-build path.
 */

export interface ScenarioView {
  id: string;
  name: string;
  description: string;
  state: unknown;
  is_shared: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
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

async function authedFetch(input: string, init?: RequestInit): Promise<Response | null> {
  const token = await getAccessToken();
  if (!token) return null;
  return fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  });
}

export function useScenarioViews() {
  const [views, setViews] = useState<ScenarioView[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch('/api/scenarios/views');
      if (!res) {
        setViews([]);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { views: ScenarioView[] };
      setViews(body.views);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    if (!supabase) return;
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      refresh();
    });
    return () => sub.subscription.unsubscribe();
  }, [refresh]);

  const save = useCallback(
    async (input: { name: string; description?: string; state: unknown; is_shared?: boolean }) => {
      const res = await authedFetch('/api/scenarios/views', {
        method: 'POST',
        body: JSON.stringify(input),
      });
      if (!res) throw new Error('Sign in to save views.');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { view: ScenarioView };
      setViews(prev => [body.view, ...prev.filter(v => v.id !== body.view.id)]);
      return body.view;
    },
    [],
  );

  const update = useCallback(
    async (
      id: string,
      patch: { name?: string; description?: string; state?: unknown; is_shared?: boolean },
    ) => {
      const res = await authedFetch(`/api/scenarios/views?id=${encodeURIComponent(id)}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      });
      if (!res) throw new Error('Sign in to update views.');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body?.error || `HTTP ${res.status}`);
      }
      const body = (await res.json()) as { view: ScenarioView };
      setViews(prev => prev.map(v => (v.id === body.view.id ? body.view : v)));
      return body.view;
    },
    [],
  );

  const remove = useCallback(async (id: string) => {
    const res = await authedFetch(`/api/scenarios/views?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res) throw new Error('Sign in to delete views.');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    setViews(prev => prev.filter(v => v.id !== id));
  }, []);

  /** Fetch a single view by id — used when restoring `?view=<id>` from the URL. */
  const loadById = useCallback(async (id: string): Promise<ScenarioView | null> => {
    const res = await authedFetch(`/api/scenarios/views?id=${encodeURIComponent(id)}`);
    if (!res) return null;
    if (!res.ok) return null;
    const body = (await res.json()) as { view: ScenarioView };
    return body.view;
  }, []);

  return { views, loading, error, refresh, save, update, remove, loadById };
}
