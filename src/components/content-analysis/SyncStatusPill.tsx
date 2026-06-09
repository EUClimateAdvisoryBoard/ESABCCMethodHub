'use client';

/**
 * SyncStatusPill — surfaces the durability state of the content-analysis
 * workbench so an analyst can tell, at a glance, whether their work has reached
 * the shared Supabase store.
 *
 * It reads the live outbox status from the store hook:
 *   • pending > 0       → writes are queued and being retried ("Saving…").
 *   • dead > 0          → the server rejected writes as non-retryable; they are
 *                         parked in the recovery ledger, not lost ("N changes
 *                         need attention").
 *   • persistent false  → the server has no durable backend configured; work is
 *                         staying in this browser only ("Not saved to server").
 *   • otherwise         → everything is confirmed; the pill stays hidden so it
 *                         doesn't add noise in the happy path.
 *
 * The pill is intentionally read-only: the outbox retries on its own (on an
 * interval, on focus, on reconnect), so there is nothing for the user to click.
 */

import { useContentAnalysis } from '@/lib/content-analysis/store';

export default function SyncStatusPill() {
  const { syncStatus } = useContentAnalysis();
  const { pending, dead, persistent } = syncStatus;

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
  if (dead > 0) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full border border-[#C0392B]/40 bg-[#FDEDEC] px-2 py-[2px] text-[11px] font-medium text-[#922B21]"
        title={`${dead} change${dead === 1 ? '' : 's'} were rejected by the server and are parked safely in this browser. Nothing is lost — contact an administrator so they can be recovered.`}
      >
        <span aria-hidden>⚠️</span> {dead} change{dead === 1 ? '' : 's'} need attention
      </span>
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

  // All confirmed — render nothing in the happy path.
  return null;
}
