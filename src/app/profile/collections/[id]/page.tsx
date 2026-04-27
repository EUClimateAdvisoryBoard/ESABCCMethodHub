'use client';
/**
 * /profile/collections/[id] — single collection view with drop-zone (#13).
 *
 * Drag-and-drop: any list page that supports it can dispatch a
 * `DataTransfer` payload with mime-type `application/x-mh-item` whose
 * value is JSON `{ kind, ref_id }`. This page accepts the drop and
 * POSTs to /api/collections/[id]/items.
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';
import { showUndoToast } from '@/components/UndoToastHost';

interface Item {
  id: string;
  kind: 'reference' | 'policy' | 'news' | 'segment';
  ref_id: string;
  added_at: string;
}

export default function CollectionDetail({ params }: { params: { id: string } }) {
  const { user, session, requireAuth } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [dragOver, setDragOver] = useState(false);

  const reload = useCallback(async () => {
    if (!session?.access_token) return;
    const res = await fetch(`/api/collections/${params.id}/items`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    const data = await res.json();
    setItems(data.items || []);
  }, [params.id, session?.access_token]);

  useEffect(() => {
    if (!user) { requireAuth('Sign in to open this collection.'); return; }
    reload();
  }, [user, reload, requireAuth]);

  const onDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    if (!session?.access_token) return;
    const raw = e.dataTransfer.getData('application/x-mh-item');
    if (!raw) return;
    let payload: { kind?: string; ref_id?: string };
    try { payload = JSON.parse(raw); } catch { return; }
    if (!payload.kind || !payload.ref_id) return;
    await fetch(`/api/collections/${params.id}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(payload),
    });
    reload();
  }, [params.id, session?.access_token, reload]);

  async function remove(itemId: string, snapshot: Item) {
    if (!session?.access_token) return;
    setItems(prev => prev.filter(i => i.id !== itemId));
    await fetch(`/api/collections/${params.id}/items?itemId=${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    showUndoToast({
      message: `Removed ${snapshot.kind} from this collection`,
      onUndo: async () => {
        await fetch(`/api/collections/${params.id}/items`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
          body: JSON.stringify({ kind: snapshot.kind, ref_id: snapshot.ref_id }),
        });
        reload();
      },
    });
  }

  function hrefForItem(it: Item): string {
    switch (it.kind) {
      case 'reference': return `/references?ref=${it.ref_id}`;
      case 'policy': return `/policy-navigator/policy?id=${it.ref_id}`;
      case 'news': return `/news-feed?id=${it.ref_id}`;
      case 'segment': return `/content-analysis?segment=${it.ref_id}`;
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <Link href="/profile/collections" className="text-xs text-secondary hover:underline">← All collections</Link>
        <h1 className="text-2xl font-bold mt-3 mb-1">Collection</h1>
        <p className="text-sm text-grey-500 mb-6">{items.length} items · drag any reference / policy / news / segment card here.</p>

        <section
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`bg-white dark:bg-[var(--mh-card)] rounded-xl border-2 border-dashed transition ${
            dragOver ? 'border-secondary bg-secondary/5' : 'border-grey-200 dark:border-[var(--mh-border)]'
          } p-5`}
        >
          {items.length === 0 ? (
            <p className="text-sm text-grey-500 text-center py-8">Drop items here</p>
          ) : (
            <ul className="space-y-1.5">
              {items.map(it => (
                <li key={it.id} className="flex items-baseline gap-3 text-sm">
                  <span className="text-[10px] uppercase tracking-wide text-grey-500 shrink-0 w-20">{it.kind}</span>
                  <Link href={hrefForItem(it)} className="truncate flex-1 hover:underline">{it.ref_id}</Link>
                  <button onClick={() => remove(it.id, it)} className="text-xs text-grey-500 hover:text-accent-red">remove</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </>
  );
}
