'use client';
/**
 * Cross-module context drawer (#6).
 *
 * Pages that have a "current artefact" register a context with:
 *   window.dispatchEvent(new CustomEvent('mh:context', { detail: {
 *     kind: 'policy' | 'reference' | 'news' | 'segment',
 *     id: string,
 *     title: string,
 *   }}));
 *
 * The drawer button (top-right floating handle) opens a slide-in
 * panel that fetches `/api/context-drawer?kind=…&id=…` and shows
 * related items from the other four modules.
 */
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

type Kind = 'policy' | 'reference' | 'news' | 'segment';

interface Ctx {
  kind: Kind;
  id: string;
  title: string;
}

interface RelatedItem {
  module: 'references' | 'scenarios' | 'news' | 'policies' | 'codes';
  id: string;
  title: string;
  subtitle?: string;
  href: string;
}

const MODULE_LABEL: Record<RelatedItem['module'], string> = {
  references: 'References',
  scenarios: 'Scenarios',
  news: 'News',
  policies: 'Policies',
  codes: 'Codes',
};

export default function ContextDrawer() {
  const [ctx, setCtx] = useState<Ctx | null>(null);
  const [open, setOpen] = useState(false);
  const [related, setRelated] = useState<RelatedItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    function onCtx(e: Event) {
      const detail = (e as CustomEvent<Ctx>).detail;
      if (detail && detail.kind && detail.id) setCtx(detail);
      else setCtx(null);
    }
    function onClear() { setCtx(null); setRelated([]); }
    window.addEventListener('mh:context', onCtx as EventListener);
    window.addEventListener('mh:context-clear', onClear);
    return () => {
      window.removeEventListener('mh:context', onCtx as EventListener);
      window.removeEventListener('mh:context-clear', onClear);
    };
  }, []);

  const load = useCallback(async () => {
    if (!ctx) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/context-drawer?kind=${ctx.kind}&id=${encodeURIComponent(ctx.id)}`);
      if (!res.ok) { setRelated([]); return; }
      const data = await res.json();
      setRelated(Array.isArray(data.items) ? data.items : []);
    } finally { setLoading(false); }
  }, [ctx]);

  useEffect(() => { if (open) load(); }, [open, load]);

  // ⌘. (period) opens the drawer when a context is active.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!ctx) return;
      if (e.key === '.' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault(); setOpen(o => !o);
      }
      if (e.key === 'Escape' && open) setOpen(false);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ctx, open]);

  if (!ctx) return null;
  return (
    <>
      {/* Desktop / tablet: vertical-text tab on the right edge */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open related items"
        className="hidden md:flex fixed top-1/2 right-0 -translate-y-1/2 z-30 bg-secondary text-white py-2 px-1.5 rounded-l-md shadow-md hover:bg-secondary-dark transition"
        style={{ writingMode: 'vertical-rl' }}
      >
        ↶ Related
      </button>
      {/* Mobile: floating action button above the bottom-nav. Without this
          phones had no way to reach the drawer at all. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Open related items"
        className="md:hidden fixed right-3 z-30 w-12 h-12 rounded-full bg-secondary text-white shadow-lg active:bg-secondary-dark flex items-center justify-center bottom-bottom-nav mb-3"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.36.16.68.4.93.7" />
        </svg>
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] flex" role="dialog" aria-modal="true" aria-label="Related items">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside
            className="ml-auto relative bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] w-full sm:w-[min(420px,90vw)] h-full shadow-2xl sm:border-l border-grey-200 dark:border-[var(--mh-border)] flex flex-col pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] drawer-panel"
          >
            <div className="px-4 py-3 border-b border-grey-100 dark:border-[var(--mh-border)] flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-grey-500">{ctx.kind}</p>
                <p className="text-sm font-semibold truncate">{ctx.title}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close related items"
                className="text-grey-500 dark:text-[var(--mh-muted)] p-2 -m-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-md active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
              {loading && <p className="text-xs text-grey-500">Loading related items…</p>}
              {!loading && related.length === 0 && (
                <p className="text-xs text-grey-500">No related items found.</p>
              )}
              {(['references', 'news', 'policies', 'scenarios', 'codes'] as const).map(mod => {
                const items = related.filter(r => r.module === mod);
                if (items.length === 0) return null;
                return (
                  <div key={mod}>
                    <p className="text-[10px] uppercase tracking-wide text-grey-500 mb-1">{MODULE_LABEL[mod]} ({items.length})</p>
                    <ul className="space-y-1">
                      {items.map(it => (
                        <li key={mod + ':' + it.id}>
                          <Link
                            href={it.href}
                            onClick={() => setOpen(false)}
                            className="block px-3 py-2.5 sm:py-1.5 min-h-[44px] sm:min-h-0 rounded hover:bg-grey-50 dark:hover:bg-[#1D2734] active:bg-grey-100 dark:active:bg-[#1D2734]"
                          >
                            <p className="text-sm truncate">{it.title}</p>
                            {it.subtitle && <p className="text-[11px] text-grey-500 truncate">{it.subtitle}</p>}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </aside>
        </div>
      )}
    </>
  );
}

export function setContext(ctx: Ctx | null) {
  if (typeof window === 'undefined') return;
  if (ctx) window.dispatchEvent(new CustomEvent('mh:context', { detail: ctx }));
  else window.dispatchEvent(new Event('mh:context-clear'));
}
