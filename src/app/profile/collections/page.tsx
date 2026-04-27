'use client';
/**
 * /profile/collections — list / create personal cross-module folders (#13).
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';

interface Collection {
  id: string;
  name: string;
  emoji: string;
  sort_order: number;
}

export default function CollectionsPage() {
  const { user, session, requireAuth } = useAuth();
  const [items, setItems] = useState<Collection[]>([]);
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('📁');

  useEffect(() => {
    if (!user) { requireAuth('Sign in to manage collections.'); return; }
    if (!session?.access_token) return;
    fetch('/api/collections', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => setItems(d.collections || []));
  }, [user, session?.access_token, requireAuth]);

  async function create() {
    if (!session?.access_token || !name.trim()) return;
    const res = await fetch('/api/collections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ name: name.trim(), emoji: emoji.trim() || '📁' }),
    });
    const data = await res.json();
    if (data.collection) setItems(prev => [...prev, data.collection]);
    setName('');
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Collections</h1>
        <p className="text-sm text-grey-500 mb-6">
          Personal folders for any artefact across MethodHub. Drag references, policies, news items, or code segments into one bucket and export them as a project pack.
        </p>

        <section className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">New collection</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input
              value={emoji}
              onChange={e => setEmoji(e.target.value)}
              maxLength={2}
              className="w-16 text-center border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-3 py-2 text-sm"
            />
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. FF55 evidence base"
              className="flex-1 border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={create}
              disabled={!name.trim()}
              className="bg-secondary text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.length === 0 ? (
            <p className="text-sm text-grey-500">No collections yet.</p>
          ) : items.map(c => (
            <Link
              key={c.id}
              href={`/profile/collections/${c.id}`}
              className="bg-white dark:bg-[var(--mh-card)] rounded-lg border border-grey-200 dark:border-[var(--mh-border)] p-4 hover:bg-grey-50 dark:hover:bg-[#1D2734] transition flex items-center gap-3"
            >
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-sm font-semibold truncate">{c.name}</span>
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
