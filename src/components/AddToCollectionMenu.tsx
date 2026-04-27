'use client';
/**
 * Reusable "+ Collection" / "+ Workspace" chip used on every list card
 * (references, policies, news, segments).
 *
 * Renders a small dropdown that lists the user's existing collections /
 * workspaces and POSTs the artefact reference to the chosen container.
 */
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface Props {
  kind: 'reference' | 'policy' | 'news' | 'segment';
  refId: string;
  /** Allows attaching to a workspace as well — shown when true. */
  includeWorkspaces?: boolean;
}

interface Bucket {
  id: string;
  name: string;
  emoji?: string;
  type: 'collection' | 'workspace';
}

export default function AddToCollectionMenu({ kind, refId, includeWorkspaces = true }: Props) {
  const { user, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !session?.access_token) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    Promise.all([
      fetch('/api/collections', { headers }).then(r => r.json()),
      includeWorkspaces ? fetch('/api/workspaces', { headers }).then(r => r.json()) : Promise.resolve({ workspaces: [] }),
    ]).then(([c, w]) => {
      const all: Bucket[] = [
        ...(c.collections || []).map((x: { id: string; name: string; emoji: string }) => ({
          id: x.id, name: x.name, emoji: x.emoji, type: 'collection' as const,
        })),
        ...(w.workspaces || []).map((x: { id: string; name: string }) => ({
          id: x.id, name: x.name, emoji: '👥', type: 'workspace' as const,
        })),
      ];
      setBuckets(all);
    });
  }, [open, session?.access_token, includeWorkspaces]);

  async function add(b: Bucket) {
    if (!session?.access_token) return;
    setBusy(b.id);
    try {
      const url = b.type === 'collection'
        ? `/api/collections/${b.id}/items`
        : `/api/workspaces/${b.id}/items`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ kind, ref_id: refId }),
      });
    } finally {
      setBusy(null); setOpen(false);
    }
  }

  if (!user) return null;
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[11px] px-2 py-0.5 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary dark:text-[var(--mh-fg)] hover:bg-grey-50 dark:hover:bg-[#1D2734]"
        aria-label="Add to collection or workspace"
      >
        + collection
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 z-30 w-[220px] bg-white dark:bg-[var(--mh-card)] border border-grey-200 dark:border-[var(--mh-border)] rounded-lg shadow-lg"
          onMouseLeave={() => setOpen(false)}
        >
          {buckets.length === 0 ? (
            <p className="text-xs text-grey-500 px-3 py-3">No collections or workspaces yet.</p>
          ) : (
            <ul className="py-1 max-h-[260px] overflow-y-auto">
              {buckets.map(b => (
                <li key={b.type + ':' + b.id}>
                  <button
                    onClick={() => add(b)}
                    disabled={busy === b.id}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-grey-50 dark:hover:bg-[#1D2734] flex items-center gap-2 disabled:opacity-50"
                  >
                    <span aria-hidden>{b.emoji || '📁'}</span>
                    <span className="truncate flex-1">{b.name}</span>
                    <span className="text-[10px] uppercase tracking-wide text-grey-500">{b.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Helper to make a list-card draggable into the collection drop-zone.
 * Spread the result onto the wrapping element.
 */
export function makeDraggable(kind: 'reference' | 'policy' | 'news' | 'segment', refId: string) {
  return {
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.setData('application/x-mh-item', JSON.stringify({ kind, ref_id: refId }));
      e.dataTransfer.effectAllowed = 'copy';
    },
  };
}
