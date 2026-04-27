'use client';
/**
 * /profile/workbench — cross-module landing dashboard (#1).
 *
 * Aggregates everything an analyst is working on across all five modules
 * into a single Monday-morning view.
 */
import { useEffect, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';

interface WorkbenchData {
  savedSearches: Array<{ id: string; name: string; query: string; last_seen_at: string }>;
  inboxUnread: number;
  workspaces: Array<{ id: string; name: string; role: string; item_count: number }>;
  collections: Array<{ id: string; name: string; emoji: string; item_count: number }>;
  recentActivity: Array<{ id: string; action: string; summary: string; policy_id: string | null; created_at: string }>;
  anonymous?: boolean;
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

function Card({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-tertiary dark:text-[var(--mh-fg)]/80">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

export default function WorkbenchPage() {
  const { user, session, requireAuth } = useAuth();
  const [data, setData] = useState<WorkbenchData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { requireAuth('Sign in to open your workbench.'); return; }
    let cancelled = false;
    async function load() {
      if (!session?.access_token) return;
      setLoading(true);
      try {
        const res = await fetch('/api/workbench', {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });
        if (!res.ok) return;
        if (!cancelled) setData(await res.json());
      } finally { if (!cancelled) setLoading(false); }
    }
    load();
    return () => { cancelled = true; };
  }, [user, session?.access_token, requireAuth]);

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">My Workbench</h1>
          <p className="text-sm text-grey-500 mt-1">
            Everything you&apos;re working on, across References (M·01), Data &amp; Scenarios (M·02), News (M·03), Policy Navigator (M·04), and Content Analysis (M·05).
          </p>
        </div>

        {loading && <p className="text-sm text-grey-500">Loading…</p>}
        {!loading && data && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card
              title="Inbox"
              action={<Link href="/profile/inbox" className="text-xs text-secondary hover:underline">Open</Link>}
            >
              <p className="text-3xl font-bold">{data.inboxUnread}</p>
              <p className="text-xs text-grey-500 mt-1">unread @-mentions, replies, system notices</p>
            </Card>
            <Card
              title="Saved searches"
              action={<Link href="/news-feed" className="text-xs text-secondary hover:underline">News feed</Link>}
            >
              {data.savedSearches.length === 0 ? (
                <p className="text-xs text-grey-500">No saved searches yet. Open the news feed and save a query to see what&apos;s new.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.savedSearches.slice(0, 5).map(s => (
                    <li key={s.id} className="flex items-center justify-between text-sm">
                      <Link href={`/news-feed?savedSearchId=${s.id}`} className="truncate hover:underline">{s.name}</Link>
                      <span className="text-[11px] text-grey-500 shrink-0 ml-2">since {timeAgo(s.last_seen_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card
              title="Workspaces"
              action={<Link href="/profile/workspaces" className="text-xs text-secondary hover:underline">Manage</Link>}
            >
              {data.workspaces.length === 0 ? (
                <p className="text-xs text-grey-500">No team workspaces yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.workspaces.map(w => (
                    <li key={w.id} className="flex items-center justify-between text-sm">
                      <Link href={`/profile/workspaces/${w.id}`} className="truncate hover:underline">{w.name}</Link>
                      <span className="text-[11px] text-grey-500 shrink-0 ml-2">{w.item_count} items · {w.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card
              title="Collections"
              action={<Link href="/profile/collections" className="text-xs text-secondary hover:underline">Manage</Link>}
            >
              {data.collections.length === 0 ? (
                <p className="text-xs text-grey-500">No personal collections. Drag references, policies, or news into a folder to bundle them.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.collections.map(c => (
                    <li key={c.id} className="flex items-center justify-between text-sm">
                      <Link href={`/profile/collections/${c.id}`} className="truncate hover:underline">{c.emoji} {c.name}</Link>
                      <span className="text-[11px] text-grey-500 shrink-0 ml-2">{c.item_count} items</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Recent activity" action={<Link href="/profile" className="text-xs text-secondary hover:underline">Profile</Link>}>
              {data.recentActivity.length === 0 ? (
                <p className="text-xs text-grey-500">No activity yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {data.recentActivity.map(a => (
                    <li key={a.id} className="text-sm">
                      <span className="text-grey-500 text-[11px] mr-2">{timeAgo(a.created_at)}</span>
                      <span>{a.summary}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card title="Quick actions">
              <div className="flex flex-wrap gap-2">
                <Link href="/references" className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] hover:bg-grey-50 dark:hover:bg-[#1D2734]">+ reference</Link>
                <Link href="/news-feed" className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] hover:bg-grey-50 dark:hover:bg-[#1D2734]">scan news</Link>
                <Link href="/policy-navigator" className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] hover:bg-grey-50 dark:hover:bg-[#1D2734]">policy graph</Link>
                <Link href="/content-analysis" className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] hover:bg-grey-50 dark:hover:bg-[#1D2734]">tag segments</Link>
                <Link href="/profile/preferences" className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)] hover:bg-grey-50 dark:hover:bg-[#1D2734]">preferences</Link>
              </div>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
