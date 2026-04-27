'use client';
/**
 * /profile/workspaces/[id] — single workspace view (#3).
 *
 * Shows the curated set of items + members + invite form.
 */
import { useState, useEffect } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';

interface Item {
  id: string;
  kind: 'reference' | 'policy' | 'news' | 'scenario_view' | 'segment';
  ref_id: string;
  note: string;
  added_at: string;
}

interface Member {
  user_id: string;
  display_name: string;
  role: string;
  added_at: string;
}

export default function WorkspaceDetail({ params }: { params: { id: string } }) {
  const { user, session, requireAuth } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');

  useEffect(() => {
    if (!user) { requireAuth('Sign in to open this workspace.'); return; }
    if (!session?.access_token) return;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    fetch(`/api/workspaces/${params.id}/items`, { headers }).then(r => r.json()).then(d => setItems(d.items || []));
    fetch(`/api/workspaces/${params.id}/members`, { headers }).then(r => r.json()).then(d => setMembers(d.members || []));
  }, [user, session?.access_token, params.id, requireAuth]);

  async function invite() {
    if (!session?.access_token || !inviteEmail.trim()) return;
    const res = await fetch(`/api/workspaces/${params.id}/members`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
    });
    if (res.ok) {
      setInviteEmail('');
      const r = await fetch(`/api/workspaces/${params.id}/members`, { headers: { Authorization: `Bearer ${session.access_token}` } });
      setMembers((await r.json()).members || []);
    }
  }

  function hrefForItem(it: Item): string {
    switch (it.kind) {
      case 'reference': return `/references?ref=${it.ref_id}`;
      case 'policy': return `/policy-navigator/policy?id=${it.ref_id}`;
      case 'news': return `/news-feed?id=${it.ref_id}`;
      case 'scenario_view': return `/scenarios?view=${it.ref_id}`;
      case 'segment': return `/content-analysis?segment=${it.ref_id}`;
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <Link href="/profile/workspaces" className="text-xs text-secondary hover:underline">← All workspaces</Link>
        <h1 className="text-2xl font-bold mt-3 mb-1">Workspace</h1>
        <p className="text-sm text-grey-500 mb-6">{items.length} items · {members.length} members</p>

        <div className="grid gap-4 lg:grid-cols-3">
          <section className="lg:col-span-2 bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] p-5">
            <h2 className="text-sm font-bold mb-3">Items</h2>
            {items.length === 0 ? (
              <p className="text-xs text-grey-500">No items yet. Add to a workspace from any list (look for the &quot;+ workspace&quot; chip).</p>
            ) : (
              <ul className="space-y-1.5">
                {items.map(it => (
                  <li key={it.id} className="flex items-baseline gap-3 text-sm">
                    <span className="text-[10px] uppercase tracking-wide text-grey-500 shrink-0 w-20">{it.kind}</span>
                    <Link href={hrefForItem(it)} className="truncate hover:underline">{it.ref_id}</Link>
                    {it.note && <span className="text-xs text-grey-500 truncate">— {it.note}</span>}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] p-5">
            <h2 className="text-sm font-bold mb-3">Members</h2>
            <ul className="space-y-1.5 mb-4">
              {members.map(m => (
                <li key={m.user_id} className="flex items-baseline justify-between text-sm">
                  <span className="truncate">{m.display_name}</span>
                  <span className="text-[10px] uppercase tracking-wide text-grey-500 ml-2">{m.role}</span>
                </li>
              ))}
            </ul>
            <div className="flex flex-col gap-2 pt-3 border-t border-grey-100 dark:border-[var(--mh-border)]">
              <input
                value={inviteEmail}
                onChange={e => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-3 py-2 text-sm"
              />
              <select
                value={inviteRole}
                onChange={e => setInviteRole(e.target.value as 'editor' | 'viewer')}
                className="border border-grey-300 dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)] rounded-md px-3 py-2 text-sm"
              >
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </select>
              <button
                onClick={invite}
                disabled={!inviteEmail.trim()}
                className="bg-secondary text-white text-sm font-semibold px-3 py-2 rounded-md disabled:opacity-50"
              >
                Invite
              </button>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
