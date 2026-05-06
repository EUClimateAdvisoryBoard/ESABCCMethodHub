'use client';

/**
 * Approval progress strip shown on top of the policy map. Communicates, in
 * plain language, how many connections a human reviewer has signed off on
 * versus the total number that are still pending review. When every
 * connection has been approved the strip flips to a big "Human approved"
 * state so a non-technical reader can tell at a glance that the network
 * they are looking at has been vetted.
 */

interface Props {
  approved: number;
  rejected: number;
  needsReview: number;
  pending: number;
  total: number;
  /** Fired when the user clicks the "Review pending" CTA. */
  onGotoReview?: () => void;
}

export default function ApprovalProgress({
  approved,
  rejected,
  needsReview,
  pending,
  total,
  onGotoReview,
}: Props) {
  const approvedPct = total === 0 ? 0 : Math.round((approved / total) * 100);
  const pendingPct = total === 0 ? 0 : Math.round((pending / total) * 100);
  const needsReviewPct = total === 0 ? 0 : Math.round((needsReview / total) * 100);
  const rejectedPct = total === 0 ? 0 : Math.round((rejected / total) * 100);
  const fullyApproved = total > 0 && approved === total;

  return (
    <div
      className={`rounded border shadow-sm ${
        fullyApproved
          ? 'bg-emerald-50 border-emerald-200'
          : 'bg-white border-grey-200'
      }`}
    >
      <div className="px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {fullyApproved ? (
              <span
                className="shrink-0 inline-flex items-center gap-1.5 bg-emerald-600 text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                aria-label="Network fully human approved"
              >
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Human approved
              </span>
            ) : (
              <span className="shrink-0 inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 15 15" />
                </svg>
                Review in progress
              </span>
            )}
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-tertiary-dark leading-tight">
                {fullyApproved
                  ? 'Every connection on this map has been approved by a human reviewer.'
                  : `${approved} of ${total} connections approved by a human.`}
              </p>
              <p className="text-[11px] text-tertiary leading-tight mt-0.5">
                {fullyApproved
                  ? 'Re-open the review table at any time to update a decision.'
                  : 'The rest were auto-imported and still need a human to confirm, edit or reject them.'}
              </p>
            </div>
          </div>
          {!fullyApproved && onGotoReview && (
            <button
              type="button"
              onClick={onGotoReview}
              className="shrink-0 text-[12px] font-semibold px-3 py-1.5 rounded bg-primary text-white hover:bg-[#006F6C] transition inline-flex items-center gap-1.5"
            >
              Review pending
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>

        {/* Segmented progress bar */}
        <div className="mt-3 h-2 w-full rounded-full bg-grey-100 overflow-hidden flex">
          {approved > 0 && (
            <div
              className="h-full bg-emerald-500"
              style={{ width: `${approvedPct}%` }}
              aria-label={`${approved} approved`}
              title={`${approved} approved`}
            />
          )}
          {needsReview > 0 && (
            <div
              className="h-full bg-blue-400"
              style={{ width: `${needsReviewPct}%` }}
              aria-label={`${needsReview} flagged for more info`}
              title={`${needsReview} flagged — needs more info`}
            />
          )}
          {rejected > 0 && (
            <div
              className="h-full bg-red-400"
              style={{ width: `${rejectedPct}%` }}
              aria-label={`${rejected} rejected`}
              title={`${rejected} rejected`}
            />
          )}
          {pending > 0 && (
            <div
              className="h-full bg-amber-300"
              style={{ width: `${pendingPct}%` }}
              aria-label={`${pending} pending review`}
              title={`${pending} pending human review`}
            />
          )}
        </div>

        {/* Legend — wraps to 2×2 on phones, single row on tablet+. */}
        <div className="mt-2 grid grid-cols-2 sm:flex sm:flex-wrap gap-x-3 sm:gap-x-4 gap-y-1.5 sm:gap-y-1 text-[11px] sm:text-[10.5px]">
          <Legend color="bg-emerald-500" label="Approved" n={approved} />
          <Legend color="bg-amber-300" label="Pending" n={pending} />
          <Legend color="bg-blue-400" label="Needs info" n={needsReview} />
          <Legend color="bg-red-400" label="Rejected" n={rejected} />
        </div>
      </div>
    </div>
  );
}

function Legend({ color, label, n }: { color: string; label: string; n: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-tertiary">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span className="text-tertiary-dark font-medium">{n}</span>
      <span>{label}</span>
    </span>
  );
}
