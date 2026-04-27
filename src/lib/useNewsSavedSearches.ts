'use client';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Persistent saved searches for the Secretariat News module.
 *
 * Backed by `news_saved_searches` (migration 022). RLS keeps each
 * user's searches private. Matching is performed client-side against
 * the live-news feed the page already has in memory — no extra
 * server endpoint needed for the read path.
 */

export interface NewsSavedSearch {
  id: string;
  name: string;
  query: string;
  sources: string[];
  tags: string[];
  notify: boolean;
  last_seen_at: string;
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

export function useNewsSavedSearches() {
  const [searches, setSearches] = useState<NewsSavedSearch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await authedFetch('/api/news-feed/saved-searches');
      if (!res) {
        setSearches([]);
        return;
      }
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error || `HTTP ${res.status}`);
        return;
      }
      const body = (await res.json()) as { searches: NewsSavedSearch[] };
      setSearches(body.searches);
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

  const save = useCallback(async (input: {
    name: string;
    query?: string;
    sources?: string[];
    tags?: string[];
    notify?: boolean;
  }) => {
    const res = await authedFetch('/api/news-feed/saved-searches', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    if (!res) throw new Error('Sign in to save searches.');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    const body = (await res.json()) as { search: NewsSavedSearch };
    setSearches(prev => [body.search, ...prev.filter(s => s.id !== body.search.id)]);
    return body.search;
  }, []);

  const update = useCallback(async (
    id: string,
    patch: Partial<Pick<NewsSavedSearch, 'name' | 'query' | 'sources' | 'tags' | 'notify' | 'last_seen_at'>>,
  ) => {
    const res = await authedFetch(`/api/news-feed/saved-searches?id=${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    });
    if (!res) throw new Error('Sign in to update searches.');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    const body = (await res.json()) as { search: NewsSavedSearch };
    setSearches(prev => prev.map(s => (s.id === id ? body.search : s)));
    return body.search;
  }, []);

  const remove = useCallback(async (id: string) => {
    const res = await authedFetch(`/api/news-feed/saved-searches?id=${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res) throw new Error('Sign in to delete searches.');
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error || `HTTP ${res.status}`);
    }
    setSearches(prev => prev.filter(s => s.id !== id));
  }, []);

  return { searches, loading, error, refresh, save, update, remove };
}

// ── Client-side matcher ──────────────────────────────────────────────────────
// Pure function so it can be unit-tested and reused outside the hook.

interface MatchableArticle {
  title: string;
  description?: string;
  source?: string;
  sourceLabel?: string;
  published?: string;
}

export interface SavedSearchMatch<T extends MatchableArticle = MatchableArticle> {
  total: number;
  /** Articles that match the criteria, regardless of `published` cutoff. */
  matches: T[];
  /** Subset of `matches` published after `search.last_seen_at`. */
  fresh: T[];
}

export function matchSavedSearch<T extends MatchableArticle>(
  search: NewsSavedSearch,
  articles: T[],
  /** Optional accessor to extract tags from an article. */
  getTags?: (a: T) => string[],
): SavedSearchMatch<T> {
  const q = search.query.trim().toLowerCase();
  const cutoff = search.last_seen_at ? new Date(search.last_seen_at).getTime() : 0;
  const sourceSet = new Set(search.sources.map(s => s.toLowerCase()));
  const tagSet = new Set(search.tags.map(t => t.toLowerCase()));
  const out: T[] = [];
  for (const a of articles) {
    if (sourceSet.size > 0) {
      const src = (a.source ?? '').toLowerCase();
      if (!sourceSet.has(src)) continue;
    }
    if (tagSet.size > 0 && getTags) {
      const tags = getTags(a).map(t => t.toLowerCase());
      if (!tags.some(t => tagSet.has(t))) continue;
    }
    if (q) {
      const hay = `${a.title} ${a.description ?? ''}`.toLowerCase();
      if (!hay.includes(q)) continue;
    }
    out.push(a);
  }
  const fresh = out.filter(a => {
    if (!a.published) return false;
    const t = new Date(a.published).getTime();
    return Number.isFinite(t) && t > cutoff;
  });
  return { total: out.length, matches: out, fresh };
}
