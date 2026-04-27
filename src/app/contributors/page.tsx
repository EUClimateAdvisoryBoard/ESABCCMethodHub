'use client';
/**
 * Public contributor leaderboard (#18).
 *
 * Lists users who have opted into a public profile, ranked by total
 * contributions. Hovering a row shows the per-action breakdown.
 */
import { useEffect, useState } from 'react';
import SiteHeader from '@/components/SiteHeader';

interface Contributor {
  id: string;
  display_name: string;
  role: string;
  total: number;
  comments: number;
  annotations: number;
  tags: number;
}

function tierFromCount(n: number): { label: string; emoji: string } {
  if (n >= 100) return { label: 'Champion', emoji: '🏆' };
  if (n >= 50) return { label: 'Expert', emoji: '⭐' };
  if (n >= 20) return { label: 'Contributor', emoji: '🔬' };
  if (n >= 5) return { label: 'Active Member', emoji: '🌿' };
  return { label: 'Newcomer', emoji: '🌱' };
}

export default function ContributorsPage() {
  const [items, setItems] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/contributors').then(r => r.json()).then(d => {
      setItems(d.contributors || []);
      setLoading(false);
    });
  }, []);

  return (
    <>
      <SiteHeader />
      <main className="max-w-content mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-bold mb-2">Contributors</h1>
        <p className="text-sm text-grey-500 mb-6">
          Secretariat staff who&apos;ve opted into a public contributor profile. Toggle yours in <a href="/profile/preferences" className="underline">Preferences</a>.
        </p>
        {loading ? (
          <p className="text-sm text-grey-500">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-grey-500">Nobody has opted into a public profile yet.</p>
        ) : (
          <ol className="bg-white dark:bg-[var(--mh-card)] rounded-xl border border-grey-200 dark:border-[var(--mh-border)] divide-y divide-grey-100 dark:divide-[var(--mh-border)]">
            {items.map((c, i) => {
              const tier = tierFromCount(c.total);
              return (
                <li key={c.id} className="px-5 py-3 flex items-center gap-3">
                  <span className="text-grey-500 text-sm tabular-nums w-6 text-right">{i + 1}</span>
                  <span className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center text-sm font-bold text-secondary">
                    {c.display_name[0]?.toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold truncate">{c.display_name}</p>
                    <p className="text-[11px] text-grey-500">{tier.emoji} {tier.label} · {c.role}</p>
                  </div>
                  <div className="hidden sm:flex gap-3 text-[11px] text-grey-500">
                    <span title="Total contributions">{c.total}</span>
                    <span title="Comments">💬 {c.comments}</span>
                    <span title="Annotations">📌 {c.annotations}</span>
                    <span title="Tags">🏷️ {c.tags}</span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </main>
    </>
  );
}
