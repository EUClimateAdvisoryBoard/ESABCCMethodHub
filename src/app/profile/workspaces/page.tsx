'use client';
/**
 * /profile/workspaces — list and create team workspaces (#3).
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';

interface Workspace {
  id: string;
  name: string;
  description: string;
  role: 'owner' | 'editor' | 'viewer';
  updated_at: string;
}

export default function WorkspacesPage() {
  const { user, session, requireAuth } = useAuth();
  const [items, setItems] = useState<Workspace[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) { requireAuth('Sign in to manage workspaces.'); return; }
    if (!session?.access_token) return;
    fetch('/api/workspaces', { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(r => r.json())
      .then(d => setItems(d.workspaces || []));
  }, [user, session?.access_token, requireAuth]);

  async function create() {
    if (!session?.access_token || !name.trim()) return;
    setCreating(true);
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ name: name.trim(), description: description.trim() }),
      });
      const data = await res.json();
      if (data.workspace) setItems(prev => [data.workspace, ...prev]);
      setName(''); setDescription('');
    } finally { setCreating(false); }
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Workspaces</h1>
        <p className="text-sm text-grey-500 mb-6">
          Shared research projects. Workspaces own a curated set of references, policies, news items, and scenario views — invitable Secretariat staff see the same set.
        </p>

        <section className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] p-5 mb-6">
          <h2 className="text-sm font-semibold mb-3">New workspace</h2>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. MRR review 2026"
              className="flex-1 border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-3 py-2 text-sm"
            />
            <input
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Optional description"
              className="flex-1 border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-3 py-2 text-sm"
            />
            <button
              onClick={create}
              disabled={creating || !name.trim()}
              className="bg-secondary text-white text-sm font-semibold px-4 py-2 rounded-md disabled:opacity-50"
            >
              Create
            </button>
          </div>
        </section>

        <section className="space-y-2">
          {items.length === 0 ? (
            <p className="text-sm text-grey-500">No workspaces yet.</p>
          ) : items.map(w => (
            <Link
              key={w.id}
              href={`/profile/workspaces/${w.id}`}
              className="block bg-white dark:bg-[var(--mh-card)] rounded-lg border border-grey-200 dark:border-[var(--mh-border)] p-4 hover:bg-grey-50 dark:hover:bg-[#1D2734] transition"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h3 className="font-semibold text-sm">{w.name}</h3>
                <span className="text-[10px] uppercase tracking-wide text-grey-500">{w.role}</span>
              </div>
              {w.description && <p className="text-xs text-grey-500 mt-1">{w.description}</p>}
            </Link>
          ))}
        </section>
      </main>
    </>
  );
}
