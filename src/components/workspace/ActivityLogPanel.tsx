/**
 * Project activity log dialog.
 * ----------------------------
 * Opened from the "Activity log" button in the project tab bar. Shows every
 * change made anywhere in the project — who did what, when — newest first,
 * grouped by day, with a "Show earlier changes" pager.
 *
 * The entries come from the `pw_activity_log` table, which database triggers
 * keep up to date for every workspace table (migration 067), so the list is
 * complete regardless of which tool or code path made the change.
 */
'use client';

import { useEffect, useState } from 'react';
import {
  pwApi,
  type WorkspaceActivityEntry,
  type WorkspaceActivityStatus,
} from '@/lib/project-workspace/client';
import { supabase } from '@/lib/supabase';

const PAGE_SIZE = 50;

/** Colour accent per operation: green = added, blue = edited, red = removed. */
const OP_STYLE: Record<WorkspaceActivityEntry['op'], { dot: string; label: string }> = {
  insert: { dot: 'bg-emerald-500', label: 'Added' },
  update: { dot: 'bg-sky-500', label: 'Edited' },
  delete: { dot: 'bg-red-500', label: 'Removed' },
};

function dayHeading(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(d, today)) return 'Today';
  if (sameDay(d, yesterday)) return 'Yesterday';
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export default function ActivityLogPanel({
  projectId,
  onClose,
}: {
  projectId: string;
  onClose: () => void;
}) {
  const [entries, setEntries] = useState<WorkspaceActivityEntry[]>([]);
  const [status, setStatus] = useState<WorkspaceActivityStatus | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  // True while the last page came back full — there may be older entries.
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { entries: first, status: st } = await pwApi.activityLog(projectId, {
        limit: PAGE_SIZE,
      });
      if (cancelled) return;
      setEntries(first);
      setStatus(st);
      setHasMore(first.length === PAGE_SIZE);
      setLoading(false);
    })();
    if (supabase) {
      supabase.auth.getSession().then(({ data }) => {
        if (!cancelled) setSignedIn(!!data.session);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Tables that exist but have no change-tracking trigger — the one state
  // where edits silently go unrecorded (migration 067/068 not fully applied).
  const untracked = Object.entries(status?.tables ?? {})
    .filter(([, st]) => st === 'no-trigger')
    .map(([t]) => t);

  async function loadMore() {
    const oldest = entries[entries.length - 1];
    if (!oldest) return;
    setLoadingMore(true);
    const more = await pwApi.listActivity(projectId, { before: oldest.id, limit: PAGE_SIZE });
    setEntries(prev => [...prev, ...more]);
    setHasMore(more.length === PAGE_SIZE);
    setLoadingMore(false);
  }

  // Group consecutive entries by calendar day for the date headings.
  const groups: { heading: string; items: WorkspaceActivityEntry[] }[] = [];
  for (const e of entries) {
    const heading = dayHeading(e.createdAt);
    const last = groups[groups.length - 1];
    if (last && last.heading === heading) last.items.push(e);
    else groups.push({ heading, items: [e] });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Project activity log"
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-2xl w-full p-5 max-h-[85vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-1">
          <h3 className="text-base font-bold text-tertiary-dark">Activity log</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 -mt-1 -mr-1 p-1.5 rounded-md text-tertiary hover:text-tertiary-dark hover:bg-grey-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-xs text-tertiary mb-4">
          Every change made in this project — who did what, and when. The log is stored in the
          database and included in the nightly backup.
        </p>

        {/* Setup / sign-in problems that explain a silent or incomplete log. */}
        {!loading && status && !status.installed && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-900">
              Change tracking is not installed in the database yet
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
              Run <code>supabase/migrations/067_pw_activity_log.sql</code> and{' '}
              <code>068_content_analysis_activity_log.sql</code> in the Supabase SQL editor.
              Until then, no changes are recorded.
            </p>
          </div>
        )}
        {!loading && status?.installed && untracked.length > 0 && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-900">
              Some tools are not being tracked
            </p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
              No change-tracking trigger on: {untracked.join(', ')}. Re-run{' '}
              <code>supabase/migrations/067_pw_activity_log.sql</code> and{' '}
              <code>068_content_analysis_activity_log.sql</code> in the Supabase SQL editor
              (both are safe to re-run).
            </p>
          </div>
        )}
        {signedIn === false && (
          <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-900">You are not signed in</p>
            <p className="text-[11px] text-amber-800 mt-0.5 leading-snug">
              Changes you make can’t be saved to the shared workspace or attributed to you.
              Sign in first, then redo the change.
            </p>
          </div>
        )}
        {!loading && status?.selftest === 'ok' && (
          <div className="mb-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-emerald-900">
              Self-test passed just now
            </p>
            <p className="text-[11px] text-emerald-800 mt-0.5 leading-snug">
              A probe change was written to the database, recorded by the log, and cleaned up
              again — tracking demonstrably works. An empty log means no changes have been made
              since tracking was installed; earlier work can’t be shown retroactively. Make any
              change (add a note, tag a passage, add a document) and it will appear here.
            </p>
          </div>
        )}
        {!loading && status?.selftest && status.selftest !== 'ok' && (
          <div className="mb-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-red-900">Self-test failed</p>
            <p className="text-[11px] text-red-800 mt-0.5 leading-snug">
              {status.selftest === 'project-not-in-db' &&
                'This project has no row in pw_projects, so its changes are skipped by the log. Open the project page once while the database is connected (it self-seeds), then retry.'}
              {status.selftest === 'trigger-did-not-fire' &&
                'A probe change was written but no log entry appeared — the trigger is not firing. Re-run supabase/migrations/067 and 068 in the Supabase SQL editor.'}
              {status.selftest === 'probe-write-failed' &&
                'The probe write itself failed — the database rejected the change. Check the Supabase logs.'}
              {status.selftest === 'log-table-missing' &&
                'The pw_activity_log table is missing — run supabase/migrations/067_pw_activity_log.sql.'}
              {status.selftest === 'selftest-missing' &&
                'The self-test function is missing — run supabase/migrations/069_activity_log_selftest.sql in the Supabase SQL editor.'}
            </p>
          </div>
        )}

        <div className="flex-1 overflow-y-auto -mx-1 px-1">
          {loading && <p className="text-xs text-tertiary py-6 text-center">Loading…</p>}

          {!loading && entries.length === 0 && (
            <div className="rounded-lg border border-dashed border-grey-300 bg-grey-50 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-tertiary-dark">No changes recorded yet</p>
              <p className="text-xs text-tertiary mt-1">
                {status?.installed && untracked.length === 0
                  ? 'Tracking is installed and active — changes made from now on (edits, additions and deletions across every tool) will appear here.'
                  : 'Changes made from now on — edits, additions and deletions across every tool — will appear here.'}
              </p>
            </div>
          )}

          {groups.map(group => (
            <div key={group.heading} className="mb-4">
              <p className="sticky top-0 bg-white text-[11px] font-semibold uppercase tracking-wide text-tertiary py-1">
                {group.heading}
              </p>
              <ul className="mt-1 space-y-0.5">
                {group.items.map(e => {
                  const op = OP_STYLE[e.op] ?? OP_STYLE.update;
                  return (
                    <li key={e.id} className="flex items-start gap-2.5 rounded-md px-2 py-1.5 hover:bg-grey-50">
                      <span
                        className={`shrink-0 mt-1.5 w-2 h-2 rounded-full ${op.dot}`}
                        title={op.label}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs text-tertiary-dark leading-snug">
                          <span className="font-semibold">{e.actorName || 'System'}</span>
                          {' — '}
                          {e.summary}
                        </span>
                        <span className="block text-[11px] text-tertiary-light mt-0.5">
                          {timeOfDay(e.createdAt)}
                          {e.entityKind ? ` · ${e.entityKind}` : ''}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}

          {hasMore && (
            <div className="pb-2 text-center">
              <button
                type="button"
                onClick={loadMore}
                disabled={loadingMore}
                className="px-3 py-1.5 rounded-md border border-grey-200 text-xs font-semibold text-tertiary-dark hover:bg-grey-50 disabled:opacity-50"
              >
                {loadingMore ? 'Loading…' : 'Show earlier changes'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
