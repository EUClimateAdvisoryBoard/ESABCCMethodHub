'use client';

// ---------------------------------------------------------------------------
// NewsLastVisitBanner — "What's new since you last visited" (item 3.2 in the
// major UI/UX review re-ranked brief).
//
// Replaces the always-on blue dot with a single dismissible strip at the top
// of the feed:
//
//     ↻  12 new since Tue 14:32 — Open
//
// Behaviour
//   - Reads `mh:news-last-visit` from localStorage (ISO timestamp).
//   - Counts items with `publishedDate > lastVisit`.
//   - On "Open", scrolls to the divider between new and seen items, with
//     a 600 ms ring pulse on the first new card.
//   - On "Mark all read", advances the timestamp to now and hides the banner.
//   - First-ever visit: stamps "now" silently, no banner shown.
//
// The timestamp is updated on dwell (after 8 s on the page) so the user has
// a chance to *see* what's new before it's marked as visited. Closing the
// tab earlier leaves the timestamp untouched — refresh and the banner is
// still there.
// ---------------------------------------------------------------------------

import { useEffect, useMemo, useState } from 'react';

const LS_KEY = 'mh:news-last-visit';
const DWELL_MS = 8000;

export type NewsLastVisitItem = {
  id: string;
  publishedDate?: string;          // ISO date or YYYY-MM-DD
};

type Props = {
  items: NewsLastVisitItem[];
  /** Smoothly scrolls to the first new card and adds a ring pulse. */
  onOpen?: (firstNewId: string) => void;
  className?: string;
};

function formatRelative(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMs = Date.now() - d.getTime();
  const mins = Math.round(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) {
    // "Tue 14:32"
    const day = d.toLocaleDateString(undefined, { weekday: 'short' });
    const time = d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    return `${day} ${time}`;
  }
  return d.toISOString().slice(0, 10);
}

export default function NewsLastVisitBanner({ items, onOpen, className = '' }: Props) {
  const [lastVisit, setLastVisit] = useState<string | null>(null);
  const [hidden, setHidden] = useState(false);

  // Read once on mount. First-ever visit: stamp now, never show banner.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(LS_KEY);
    if (!stored) {
      window.localStorage.setItem(LS_KEY, new Date().toISOString());
      setHidden(true);
      return;
    }
    setLastVisit(stored);
  }, []);

  // Dwell timer — advance the timestamp after 8 s so future visits show
  // only items newer than this session.
  useEffect(() => {
    if (typeof window === 'undefined' || !lastVisit) return;
    const t = setTimeout(() => {
      window.localStorage.setItem(LS_KEY, new Date().toISOString());
    }, DWELL_MS);
    return () => clearTimeout(t);
  }, [lastVisit]);

  const { count, firstNewId } = useMemo(() => {
    if (!lastVisit) return { count: 0, firstNewId: null as string | null };
    const cutoff = lastVisit.slice(0, 10);          // compare on YYYY-MM-DD
    let count = 0;
    let firstNewId: string | null = null;
    for (const item of items) {
      const d = (item.publishedDate || '').slice(0, 10);
      if (d > cutoff) {
        count += 1;
        if (!firstNewId) firstNewId = item.id;
      }
    }
    return { count, firstNewId };
  }, [items, lastVisit]);

  if (hidden || !lastVisit || count === 0) return null;

  const open = () => {
    if (firstNewId && onOpen) onOpen(firstNewId);
  };
  const markAllRead = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(LS_KEY, new Date().toISOString());
    }
    setHidden(true);
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={[
        'flex items-center justify-between gap-3 rounded-lg border px-4 py-2.5',
        'bg-[var(--mh-status-info-bg)] border-[var(--mh-status-info)]',
        className,
      ].join(' ')}
      style={{ fontSize: 'var(--mh-text-sm)' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span aria-hidden="true" className="text-[var(--mh-status-info)]">↻</span>
        <span className="text-[var(--mh-status-info)] font-semibold">{count}</span>
        <span className="text-[var(--mh-fg)] truncate">
          new since <span className="mh-tnum">{formatRelative(lastVisit)}</span>
        </span>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={open}
          className="mh-focus mh-motion-fast rounded-md px-3 py-1 font-semibold text-white bg-[var(--mh-status-info)] hover:brightness-110"
          style={{ fontSize: 'var(--mh-text-xs)', minHeight: 28 }}
        >
          Open
        </button>
        <button
          type="button"
          onClick={markAllRead}
          className="mh-focus mh-motion-fast rounded-md px-2 py-1 text-[var(--mh-muted)] hover:text-[var(--mh-fg)]"
          style={{ fontSize: 'var(--mh-text-xs)', minHeight: 28 }}
          aria-label="Mark all read"
          title="Mark all read"
        >
          Mark all read
        </button>
      </div>
    </div>
  );
}
