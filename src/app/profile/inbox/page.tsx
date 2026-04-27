'use client';
/**
 * /profile/inbox — in-app notifications inbox (#4).
 *
 * Lists every notification (mentions, replies, system) for the signed-in
 * user. Reuses the existing /lib/notifications store, so the bell icon in
 * the SiteHeader stays in sync.
 */
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import { useAuth } from '@/lib/auth-context';
import { fetchNotifications, markAsRead, markAllAsRead, Notification } from '@/lib/notifications';

const TYPE_LABELS: Record<Notification['type'], { label: string; color: string }> = {
  mention: { label: '@mention', color: 'bg-secondary/15 text-secondary' },
  reply:   { label: 'reply', color: 'bg-blue-100 text-blue-700' },
  system:  { label: 'system', color: 'bg-grey-100 text-tertiary' },
};

function timeAgo(d: string): string {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function InboxPage() {
  const { user, requireAuth } = useAuth();
  const [items, setItems] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { requireAuth('Sign in to view your inbox.'); return; }
  }, [user, requireAuth]);

  const reload = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      setItems(await fetchNotifications(user.id));
    } finally { setLoading(false); }
  }, [user]);

  useEffect(() => { reload(); }, [reload]);

  const visible = filter === 'unread' ? items.filter(i => !i.read) : items;
  const unreadCount = items.filter(i => !i.read).length;

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-grey-500 mt-1">
              {unreadCount} unread · @-mentions, replies, and system notices.
            </p>
          </div>
          <div className="flex gap-2">
            {(['all', 'unread'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 text-xs rounded-md border ${
                  filter === f
                    ? 'bg-secondary text-white border-secondary'
                    : 'bg-white dark:bg-transparent border-grey-300 dark:border-[var(--mh-border)]'
                }`}
              >
                {f}
              </button>
            ))}
            <button
              onClick={async () => { if (!user) return; await markAllAsRead(user.id); reload(); }}
              className="px-3 py-1.5 text-xs rounded-md border border-grey-300 dark:border-[var(--mh-border)]"
            >
              Mark all read
            </button>
          </div>
        </div>
        <section className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] divide-y divide-grey-100 dark:divide-[var(--mh-border)]">
          {loading && <p className="text-xs text-grey-500 px-5 py-6">Loading…</p>}
          {!loading && visible.length === 0 && (
            <p className="text-sm text-grey-500 px-5 py-8 text-center">Nothing here. Quiet inbox is a happy inbox.</p>
          )}
          {visible.map(n => {
            const meta = TYPE_LABELS[n.type] || TYPE_LABELS.system;
            return (
              <Link
                key={n.id}
                href={n.link || '#'}
                onClick={() => { if (!n.read) markAsRead(n.id); }}
                className={`flex items-start gap-3 px-5 py-3 hover:bg-grey-50 dark:hover:bg-[#1D2734] ${
                  n.read ? 'opacity-70' : ''
                }`}
              >
                <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-semibold ${meta.color}`}>
                  {meta.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm ${n.read ? '' : 'font-semibold'}`}>{n.title}</p>
                  <p className="text-xs text-grey-500 truncate">{n.message}</p>
                </div>
                <span className="text-[11px] text-grey-500 shrink-0">{timeAgo(n.created_at)}</span>
              </Link>
            );
          })}
        </section>
      </main>
    </>
  );
}
