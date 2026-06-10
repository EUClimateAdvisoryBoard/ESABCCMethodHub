'use client';

/**
 * SyncStatusPill — surfaces the durability state of the content-analysis
 * workbench so an analyst can tell, at a glance, whether their work has reached
 * the shared Supabase store.
 *
 * It reads the live outbox status from the store hook:
 *   • signed out        → edits can't be saved to the shared workspace at all
 *                         (the server requires an account) — the most common
 *                         silent-loss case, so it's warned about up front.
 *   • pending > 0       → writes are queued and being retried ("Saving…").
 *   • dead > 0          → the server rejected writes (typically 401 from a
 *                         signed-out save attempt); they are parked in the
 *                         recovery ledger, not lost. The pill is a button:
 *                         sign in and click it to retry them.
 *   • persistent false  → the server has no durable backend configured; work is
 *                         staying in this browser only ("Not saved to server").
 *   • otherwise         → everything is confirmed; the pill stays hidden so it
 *                         doesn't add noise in the happy path.
 */

import { useEffect, useState } from 'react';
import { useContentAnalysis } from '@/lib/content-analysis/store';
import { requeueDeadLetters } from '@/lib/content-analysis/outbox';
import { supabase } from '@/lib/supabase';

export default function SyncStatusPill() {
  const { syncStatus } = useContentAnalysis();
  const { pending, dead, persistent } = syncStatus;

  // null = unknown (no Supabase client / still resolving) — show no warning.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => {
    if (!supabase) return;
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (!cancelled) setSignedIn(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setSignedIn(!!session);
    });
    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  // No durable backend at all — the most serious case to surface.
  if (!persistent) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[#E0B400]/40 bg-[#FFF8E1] px-2 py-[2px] text-[11px] font-medium text-[#8A6D00]"
        title="The server has no durable store configured, so this work is saved in this browser only and is not shared with the team. Contact an administrator."
      >
        <span aria-hidden>⚠️</span> Not saved to server
      </span>
    );
  }

  // Writes the server rejected — parked in the recovery ledger, never deleted.
  // Recoverable by the user: sign in and click to retry.
  if (dead > 0) {
    return (
      <button
        type="button"
        onClick={() => requeueDeadLetters()}
        className="inline-flex items-center gap-1 rounded-full border border-[#C0392B]/40 bg-[#FDEDEC] px-2 py-[2px] text-[11px] font-medium text-[#922B21] hover:bg-[#FADBD8]"
        title={
          signedIn === false
            ? `${dead} change${dead === 1 ? '' : 's'} were rejected by the server (you were signed out). They are parked safely in this browser — sign in, then click to retry.`
            : `${dead} change${dead === 1 ? '' : 's'} were rejected by the server and are parked safely in this browser. Click to retry saving them now.`
        }
      >
        <span aria-hidden>⚠️</span> {dead} unsaved change{dead === 1 ? '' : 's'} — click to retry
      </button>
    );
  }

  // Writes in flight / queued for retry.
  if (pending > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[#00928F]/30 bg-[#E6F4F4] px-2 py-[2px] text-[11px] font-medium text-[#006F6C]"
        title={`${pending} change${pending === 1 ? '' : 's'} are being saved to the shared store. They are kept safe in this browser and retried automatically until they land.`}
      >
        <span aria-hidden className="animate-pulse">⟳</span>
        Saving {pending} change{pending === 1 ? '' : 's'}…
      </span>
    );
  }

  // Signed out with a healthy queue: warn BEFORE anything is lost — saving
  // tags, summaries and documents requires an account, so edits made now
  // would be rejected.
  if (signedIn === false) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[#E0B400]/40 bg-[#FFF8E1] px-2 py-[2px] text-[11px] font-medium text-[#8A6D00]"
        title="You are not signed in. You can read everything, but tags, summaries, notes and document changes can't be saved to the shared workspace or attributed to you until you sign in."
      >
        <span aria-hidden>⚠️</span> Signed out — changes won’t be saved
      </span>
    );
  }

  // All confirmed — render nothing in the happy path.
  return null;
}
