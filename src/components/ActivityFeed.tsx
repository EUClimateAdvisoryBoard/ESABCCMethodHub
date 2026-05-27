/**
 * Timeline feed showing recent annotations, comments, and tag activity across policies.
 */
'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ActivityEntry, fetchActivityLog } from '@/lib/comments';
import { getPolicy } from '@/data/policies';

interface Props {
  policyId?: string;
  limit?: number;
}

const ACTION_ICONS: Record<string, { icon: string; color: string }> = {
  annotation_created: { icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z', color: 'text-secondary' },
  comment_created: { icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z', color: 'text-primary' },
  tag_added: { icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', color: 'text-accent-violet' },
};

export default function ActivityFeed({ policyId, limit = 30 }: Props) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchActivityLog({ policyId, limit }).then(data => {
      setEntries(data);
      setLoading(false);
    });
  }, [policyId, limit]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-grey-500 italic">No activity yet.</p>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, ActivityEntry[]> = {};
  for (const e of entries) {
    const date = new Date(e.created_at).toLocaleDateString('en-GB', {
      weekday: 'short', day: 'numeric', month: 'short',
    });
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(e);
  }

  return (
    <div className="space-y-5">
      {Object.entries(grouped).map(([date, items]) => (
        <div key={date}>
          <h4 className="text-xs font-medium text-grey-400 uppercase tracking-wider mb-2">{date}</h4>
          <div className="space-y-1">
            {items.map(entry => {
              const config = ACTION_ICONS[entry.action] || ACTION_ICONS.comment_created;
              const policy = entry.policy_id ? getPolicy(entry.policy_id) : null;
              const time = new Date(entry.created_at).toLocaleTimeString('en-GB', {
                hour: '2-digit', minute: '2-digit',
              });

              return (
                <div key={entry.id} className="flex items-start gap-3 py-2 px-2 rounded hover:bg-grey-50 transition">
                  <div className={`mt-0.5 shrink-0 ${config.color}`}>
                    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                      <path d={config.icon} strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-tertiary-dark">
                      <span className="font-medium text-secondary">{entry.user_display_name || 'Someone'}</span>
                      {' '}{entry.summary}
                      {policy && !policyId && (
                        <>
                          {' on '}
                          <Link href={`/policy-navigator/policy/?id=${entry.policy_id}`} className="font-medium text-primary hover:underline">
                            {policy.short_title}
                          </Link>
                        </>
                      )}
                    </p>
                    <span className="text-xs text-grey-400">{time}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
