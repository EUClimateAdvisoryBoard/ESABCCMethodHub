'use client';
import { useEffect, useRef, useState } from 'react';
import { useScenarioViews, type ScenarioView } from '@/lib/useScenarioViews';

interface Props {
  /** Snapshot the explorer's current filter state. Called when the user clicks "Save view". */
  getState: () => unknown;
  /** Restore a previously-saved snapshot into the explorer. */
  applyState: (state: unknown) => void;
  /** Optional id passed via `?view=<id>` — auto-applied on first successful fetch. */
  autoLoadId?: string | null;
  /** Notified when a view has been auto-applied so the page can clear `?view=` from the URL. */
  onAutoLoaded?: () => void;
}

export default function ScenarioViewsMenu({ getState, applyState, autoLoadId, onAutoLoaded }: Props) {
  const { views, loading, error, save, remove, loadById } = useScenarioViews();
  const [open, setOpen] = useState(false);
  const [savingOpen, setSavingOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isShared, setIsShared] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const autoApplied = useRef(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Auto-apply a `?view=<id>` URL param on first mount.
  useEffect(() => {
    if (!autoLoadId || autoApplied.current) return;
    autoApplied.current = true;
    (async () => {
      const view = await loadById(autoLoadId);
      if (view) {
        applyState(view.state);
        onAutoLoaded?.();
      }
    })();
  }, [autoLoadId, loadById, applyState, onAutoLoaded]);

  // Close the dropdown on outside click / tap.
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent | TouchEvent) => {
      if (!dropdownRef.current) return;
      if (!dropdownRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('touchstart', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('touchstart', onDocClick);
    };
  }, [open]);

  const handleSave = async () => {
    setBusy(true);
    setSaveError(null);
    try {
      const state = getState();
      await save({ name: name.trim(), description: description.trim(), state, is_shared: isShared });
      setName('');
      setDescription('');
      setSavingOpen(false);
    } catch (e) {
      setSaveError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleLoad = (v: ScenarioView) => {
    applyState(v.state);
    setOpen(false);
  };

  const handleShare = async (v: ScenarioView) => {
    const url = `${window.location.origin}/scenarios?view=${encodeURIComponent(v.id)}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(v.id);
      setTimeout(() => setCopiedId(prev => (prev === v.id ? null : prev)), 1800);
    } catch {
      window.prompt('Copy this URL:', url);
    }
  };

  const handleDelete = async (v: ScenarioView) => {
    if (!window.confirm(`Delete saved view "${v.name}"? This cannot be undone.`)) return;
    try {
      await remove(v.id);
    } catch (e) {
      alert((e as Error).message);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Save the current filter combination, or load a previously saved view"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition border border-grey-300 text-tertiary-dark hover:border-primary hover:text-primary">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
        </svg>
        Saved views
        {views.length > 0 && (
          <span className="ml-1 px-1.5 py-0.5 rounded bg-grey-100 text-[10px] tabular-nums">{views.length}</span>
        )}
      </button>

      {open && (
        <div className="fixed sm:absolute inset-x-2 sm:inset-x-auto bottom-2 sm:bottom-auto sm:right-0 sm:mt-1 z-[60] sm:z-50 w-auto sm:w-[360px] max-w-[min(360px,calc(100vw-1rem))] max-h-[70dvh] overflow-y-auto bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] border border-grey-200 dark:border-[var(--mh-border)] rounded-lg shadow-lg p-3 text-[13px]">
          <div className="flex items-center justify-between mb-2">
            <div className="font-medium text-tertiary-dark">Saved views</div>
            <button
              onClick={() => {
                setSavingOpen(s => !s);
                setSaveError(null);
              }}
              className="text-[11px] px-2 py-0.5 rounded border border-primary text-primary hover:bg-primary hover:text-white">
              {savingOpen ? 'Cancel' : 'Save current view'}
            </button>
          </div>

          {savingOpen && (
            <div className="mb-3 p-2 rounded border border-grey-200 bg-grey-50">
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="View name"
                className="w-full px-2 py-1 mb-1 text-[12px] border border-grey-300 rounded"
              />
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description (optional)"
                className="w-full px-2 py-1 mb-1 text-[12px] border border-grey-300 rounded"
              />
              <label className="flex items-center gap-1.5 text-[11px] text-tertiary mb-2">
                <input
                  type="checkbox"
                  checked={isShared}
                  onChange={e => setIsShared(e.target.checked)}
                />
                Share with other Secretariat staff (otherwise only you see it)
              </label>
              {saveError && <div className="mb-1 text-[11px] text-red-600">{saveError}</div>}
              <button
                onClick={handleSave}
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
          {loading && views.length === 0 && (
            <div className="text-[12px] text-tertiary py-2">Loading…</div>
          )}
          {!loading && views.length === 0 && (
            <div className="text-[12px] text-tertiary py-2">
              No saved views yet. Sign in and click <em>Save current view</em>.
            </div>
          )}

          <div className="max-h-[280px] overflow-y-auto">
            {views.map(v => (
              <div
                key={v.id}
                className="flex items-start gap-2 py-1.5 border-b border-grey-100 last:border-b-0">
                <div className="flex-1 min-w-0">
                  <button
                    onClick={() => handleLoad(v)}
                    className="text-left w-full">
                    <div className="font-medium text-[12px] text-tertiary-dark truncate">{v.name}</div>
                    {v.description && (
                      <div className="text-[11px] text-tertiary truncate">{v.description}</div>
                    )}
                    <div className="text-[10px] text-tertiary mt-0.5">
                      {new Date(v.updated_at).toLocaleDateString()} · {v.is_shared ? 'shared' : 'private'}
                    </div>
                  </button>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => handleShare(v)}
                    title="Copy a shareable URL"
                    className="px-1.5 py-0.5 text-[10px] rounded border border-grey-300 hover:border-primary hover:text-primary">
                    {copiedId === v.id ? 'Copied' : 'Share'}
                  </button>
                  <button
                    onClick={() => handleDelete(v)}
                    title="Delete this view"
                    className="px-1.5 py-0.5 text-[10px] rounded border border-grey-300 hover:border-red-500 hover:text-red-600">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
