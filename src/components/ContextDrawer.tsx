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
      <button
        onClick={() => setOpen(true)}
        aria-label="Open context drawer"
        className="hidden md:flex fixed top-1/2 right-0 -translate-y-1/2 z-30 bg-secondary text-white py-2 px-1.5 rounded-l-md shadow-md hover:bg-secondary-dark transition writing-mode-vertical-rl"
        style={{ writingMode: 'vertical-rl' }}
      >
        ↶ Related
      </button>
      {open && (
        <div className="fixed inset-0 z-[95] flex" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/30" onClick={() => setOpen(false)} />
          <aside className="ml-auto relative bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] w-[min(420px,90vw)] h-full shadow-2xl border-l border-grey-200 dark:border-[var(--mh-border)] flex flex-col">
            <div className="px-4 py-3 border-b border-grey-100 dark:border-[var(--mh-border)] flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-wide text-grey-500">{ctx.kind}</p>
                <p className="text-sm font-semibold truncate">{ctx.title}</p>
              </div>
              <button onClick={() => setOpen(false)} aria-label="Close" className="text-grey-500">✕</button>
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
                          <Link href={it.href} onClick={() => setOpen(false)} className="block px-2 py-1.5 rounded hover:bg-grey-50 dark:hover:bg-[#1D2734]">
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
