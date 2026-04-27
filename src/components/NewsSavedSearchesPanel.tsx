'use client';
import { useMemo, useState } from 'react';
import {
  useNewsSavedSearches,
  matchSavedSearch,
  type NewsSavedSearch,
} from '@/lib/useNewsSavedSearches';

interface ArticleLike {
  title: string;
  description?: string;
  source?: string;
  sourceLabel?: string;
  published?: string;
  link?: string;
}

interface Props {
  /** All currently-loaded live news articles. The panel matches against this in memory. */
  articles: ArticleLike[];
  /** The current search query the user has typed. Pre-fills the "Save this search" form. */
  currentQuery?: string;
  /** Apply a saved search to the parent's filter state. */
  onApply: (search: NewsSavedSearch) => void;
}

export default function NewsSavedSearchesPanel({ articles, currentQuery = '', onApply }: Props) {
  const { searches, loading, error, save, update, remove } = useNewsSavedSearches();
  const [creatingOpen, setCreatingOpen] = useState(false);
  const [name, setName] = useState('');
  const [query, setQuery] = useState(currentQuery);
  const [notify, setNotify] = useState(false);
  const [busy, setBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Compute fresh-vs-total match counts for every saved search up front.
  const enriched = useMemo(
    () => searches.map(s => ({ search: s, match: matchSavedSearch(s, articles) })),
    [searches, articles],
  );

  const handleCreate = async () => {
    setBusy(true);
    setCreateError(null);
    try {
      await save({
        name: name.trim(),
        query: query.trim(),
        notify,
      });
      setName('');
      setQuery(currentQuery);
      setNotify(false);
      setCreatingOpen(false);
    } catch (e) {
      setCreateError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleRun = async (s: NewsSavedSearch) => {
    onApply(s);
    // Advance the bookmark so subsequent visits compute "new since"
    // against this run.
    try {
      await update(s.id, { last_seen_at: new Date().toISOString() });
    } catch {
      // Silent — applying the filter still works even if the bookmark
      // failed to advance.
    }
  };

  const handleDelete = async (s: NewsSavedSearch) => {
    if (!window.confirm(`Delete saved search "${s.name}"?`)) return;
    try {
      await remove(s.id);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="border border-grey-200 rounded p-3 bg-white">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-tertiary">
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <span className="text-sm font-medium text-tertiary-dark">Saved searches</span>
          {searches.length > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-grey-100 text-[10px] tabular-nums text-tertiary">
              {searches.length}
            </span>
          )}
        </div>
        <button
          onClick={() => {
            setCreatingOpen(o => !o);
            setQuery(currentQuery);
            setCreateError(null);
          }}
          className="text-[11px] px-2 py-0.5 rounded border border-primary text-primary hover:bg-primary hover:text-white">
          {creatingOpen ? 'Cancel' : '+ Save current search'}
        </button>
      </div>

      {creatingOpen && (
        <div className="mb-3 p-2 rounded border border-grey-200 bg-grey-50">
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="Search name (e.g. CBAM)"
            className="w-full px-2 py-1 mb-1 text-[12px] border border-grey-300 rounded"
          />
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Keywords (substring match against title + description)"
            className="w-full px-2 py-1 mb-1 text-[12px] border border-grey-300 rounded"
          />
          <label className="flex items-center gap-1.5 text-[11px] text-tertiary mb-2">
            <input type="checkbox" checked={notify} onChange={e => setNotify(e.target.checked)} />
            Email me about new matches (cron not yet wired — toggle is persisted for now)
          </label>
          {createError && <div className="mb-1 text-[11px] text-red-600">{createError}</div>}
          <button
            onClick={handleCreate}
            disabled={!name.trim() || busy}
            className={`px-2 py-1 text-[12px] rounded ${
              !name.trim() || busy
                ? 'bg-grey-200 text-grey-500 cursor-not-allowed'
                : 'bg-primary text-white hover:bg-primary-dark'
            }`}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      )}

      {error && <div className="mb-2 text-[11px] text-red-600">{error}</div>}
      {loading && searches.length === 0 && (
        <div className="text-[12px] text-tertiary py-1">Loading…</div>
      )}
      {!loading && searches.length === 0 && (
        <div className="text-[12px] text-tertiary py-1">
          No saved searches yet. Type a keyword in the live search above, then click <em>+ Save current search</em>.
        </div>
      )}

      <div className="space-y-1">
        {enriched.map(({ search, match }) => (
          <div
            key={search.id}
            className="flex items-center gap-2 py-1.5 border-t border-grey-100 first:border-t-0">
            <button
              onClick={() => handleRun(search)}
              className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-medium text-tertiary-dark truncate">
                  {search.name}
                </span>
                {match.fresh.length > 0 ? (
                  <span className="px-1.5 py-0 rounded bg-accent-orange text-white text-[10px] tabular-nums">
                    {match.fresh.length} new
                  </span>
                ) : (
                  <span className="px-1.5 py-0 rounded bg-grey-100 text-tertiary text-[10px] tabular-nums">
                    {match.total} match
                  </span>
                )}
                {search.notify && (
                  <span className="text-[10px] text-tertiary">· alert on</span>
                )}
              </div>
              {search.query && (
                <div className="text-[10px] text-tertiary truncate">"{search.query}"</div>
              )}
            </button>
            <button
              onClick={() => handleDelete(search)}
              title="Delete saved search"
              className="px-1.5 py-0.5 text-[10px] rounded border border-grey-300 hover:border-red-500 hover:text-red-600">
              Delete
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
