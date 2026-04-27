'use client';
/**
 * Global ⌘K command palette — searches across References (M·01),
 * Scenarios (M·02), News (M·03), Policies + Articles (M·04), and
 * Code segments (M·05) in a single ranked list.
 *
 * Hits /api/global-search?q= which fans out to per-module sources.
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePreferences } from '@/lib/preferences-context';

type Hit = {
  id: string;
  module: 'references' | 'scenarios' | 'news' | 'policies' | 'codes';
  title: string;
  subtitle?: string;
  href: string;
  badge?: string;
};

const MODULE_LABEL: Record<Hit['module'], string> = {
  references: 'Reference',
  scenarios: 'Scenario',
  news: 'News',
  policies: 'Policy',
  codes: 'Code',
};

const MODULE_DOT: Record<Hit['module'], string> = {
  references: 'bg-accent-violet',
  scenarios: 'bg-accent-orange',
  news: 'bg-accent-blue',
  policies: 'bg-secondary',
  codes: 'bg-accent-purple',
};

export default function CommandPalette() {
  const router = useRouter();
  const { prefs } = usePreferences();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [hits, setHits] = useState<Hit[]>([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const close = useCallback(() => { setOpen(false); setQ(''); setHits([]); setActive(0); }, []);

  // Open on ⌘K / Ctrl+K. ESC to close. Honours `shortcuts_enabled` pref.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!prefs.shortcuts_enabled) return;
      const isOpen = (e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey);
      if (isOpen) { e.preventDefault(); setOpen(o => !o); return; }
      if (e.key === 'Escape' && open) close();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, prefs.shortcuts_enabled, close]);

  useEffect(() => { if (open) setTimeout(() => inputRef.current?.focus(), 10); }, [open]);

  // Debounced fetch.
  useEffect(() => {
    if (!open) return;
    const trimmed = q.trim();
    if (trimmed.length < 2) { setHits([]); return; }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await fetch('/api/global-search?q=' + encodeURIComponent(trimmed));
        if (!res.ok) { setHits([]); return; }
        const data = await res.json();
        setHits(Array.isArray(data.hits) ? data.hits.slice(0, 30) : []);
        setActive(0);
      } finally { setLoading(false); }
    }, 180);
    return () => clearTimeout(t);
  }, [q, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, hits.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(a => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter' && hits[active]) {
      router.push(hits[active].href);
      close();
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-[110] flex items-start justify-center pt-[12vh] bg-black/40 backdrop-blur-sm"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <div
        className="w-[min(620px,92vw)] bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] rounded-xl shadow-2xl border border-grey-200 dark:border-[var(--mh-border)] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-grey-100 dark:border-[var(--mh-border)] gap-2">
          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
            <circle cx="11" cy="11" r="7" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search references, scenarios, news, policies, codes…"
            className="flex-1 bg-transparent outline-none text-sm placeholder:text-grey-400"
          />
          <kbd className="text-[10px] text-grey-500 border border-grey-200 dark:border-[var(--mh-border)] rounded px-1.5 py-0.5">ESC</kbd>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {q.trim().length < 2 ? (
            <p className="text-xs text-grey-500 px-4 py-6 text-center">Type at least 2 characters. Tip: prefix with <code>p:</code> policy, <code>r:</code> reference, <code>n:</code> news, <code>c:</code> code.</p>
          ) : loading && hits.length === 0 ? (
            <p className="text-xs text-grey-500 px-4 py-6 text-center">Searching…</p>
          ) : hits.length === 0 ? (
            <p className="text-xs text-grey-500 px-4 py-6 text-center">No results.</p>
          ) : (
            <ul role="listbox">
              {hits.map((h, i) => (
                <li key={h.module + ':' + h.id}>
                  <Link
                    href={h.href}
                    onClick={close}
                    onMouseEnter={() => setActive(i)}
                    className={`flex items-center gap-3 px-4 py-2.5 border-l-2 ${
                      i === active
                        ? 'bg-grey-50 dark:bg-[#222D3B] border-secondary'
                        : 'border-transparent hover:bg-grey-50 dark:hover:bg-[#1D2734]'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${MODULE_DOT[h.module]}`} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{h.title}</p>
                      {h.subtitle && <p className="text-[11px] text-grey-500 truncate">{h.subtitle}</p>}
                    </div>
                    <span className="text-[10px] uppercase tracking-wide text-grey-500">{MODULE_LABEL[h.module]}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
