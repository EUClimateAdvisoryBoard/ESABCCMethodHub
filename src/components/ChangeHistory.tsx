'use client';
/**
 * Change-history timeline (#20).
 *
 * Drop next to any editable artefact:
 *   <ChangeHistory artefactKind="connection" artefactId={c.id} />
 *
 * Renders a discreet "history" affordance that opens a popover with the
 * latest 50 audit log entries. Each entry shows the editor, timestamp,
 * reason, and a JSON before/after diff.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface Entry {
  id: string;
  user_id: string | null;
  display_name: string;
  reason: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  created_at: string;
}

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function diffKeys(before: Record<string, unknown>, after: Record<string, unknown>): string[] {
  const ks = new Set([...Object.keys(before), ...Object.keys(after)]);
  return Array.from(ks).filter(k => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
}

interface Props {
  artefactKind: string;
  artefactId: string;
  className?: string;
}

export default function ChangeHistory({ artefactKind, artefactId, className = '' }: Props) {
  const { session } = useAuth();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (!session?.access_token) { setEntries([]); return; }
    setLoading(true);
    fetch(`/api/artefact-history?kind=${encodeURIComponent(artefactKind)}&id=${encodeURIComponent(artefactId)}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
      .then(r => r.json())
      .then(d => setEntries(d.entries || []))
      .finally(() => setLoading(false));
  }, [open, artefactKind, artefactId, session?.access_token]);

  return (
    <span className={`relative inline-block ${className}`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[12px] sm:text-[11px] text-grey-500 hover:text-tertiary dark:hover:text-white underline-offset-2 hover:underline px-1 py-1.5 -my-1.5 inline-flex items-center min-h-[32px]"
        aria-label="Show change history"
        aria-expanded={open}
      >
        history
      </button>
      {open && (
        <>
          {/* Mobile: full-screen backdrop closes the popover on outside-tap. */}
          <div className="sm:hidden fixed inset-0 z-[60] bg-black/30" onClick={() => setOpen(false)} />
          <div
            className="fixed sm:absolute inset-x-2 sm:inset-x-auto top-auto bottom-2 sm:bottom-auto sm:right-0 sm:mt-1 z-[61] sm:z-40 w-auto sm:w-[360px] max-w-[min(360px,calc(100vw-1rem))] max-h-[70dvh] sm:max-h-[400px] overflow-y-auto bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] border border-grey-200 dark:border-[var(--mh-border)] rounded-lg shadow-xl drawer-panel sm:animate-none"
            role="dialog"
            aria-label="Change history"
          >
            <div className="px-3 py-2.5 border-b border-grey-100 dark:border-[var(--mh-border)] flex items-center justify-between sticky top-0 bg-white dark:bg-[var(--mh-card)] z-10">
              <p className="text-[10px] uppercase tracking-wide text-grey-500">Change history · {artefactKind}</p>
              <button
                onClick={() => setOpen(false)}
                className="text-grey-500 dark:text-[var(--mh-muted)] p-1.5 -m-1.5 min-h-[40px] min-w-[40px] flex items-center justify-center rounded active:bg-grey-100 dark:active:bg-[var(--mh-border)]"
                aria-label="Close"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
            {loading && <p className="text-xs text-grey-500 px-3 py-3">Loading…</p>}
            {!loading && entries.length === 0 && (
              <p className="text-xs text-grey-500 px-3 py-3">No edits recorded yet.</p>
            )}
            <ul className="divide-y divide-grey-100 dark:divide-[var(--mh-border)]">
              {entries.map(e => {
                const changed = diffKeys(e.before, e.after);
                return (
                  <li key={e.id} className="px-3 py-2.5 text-xs">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="font-semibold">{e.display_name}</span>
                      <span className="text-grey-500 shrink-0">{timeAgo(e.created_at)}</span>
                    </div>
                    {e.reason && <p className="text-tertiary dark:text-[var(--mh-fg)]/80 italic mt-0.5">&ldquo;{e.reason}&rdquo;</p>}
                    {changed.length > 0 && (
                      <ul className="mt-1 space-y-1 sm:space-y-0.5">
                        {changed.map(k => (
                          <li key={k} className="font-mono text-[10.5px] break-all">
                            <span className="text-grey-500">{k}:</span>{' '}
                            <span className="text-accent-red line-through">{JSON.stringify(e.before[k]) || '∅'}</span>{' '}
                            → <span className="text-secondary">{JSON.stringify(e.after[k]) || '∅'}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </span>
  );
}
