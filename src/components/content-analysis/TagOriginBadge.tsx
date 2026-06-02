/**
 * AI / human provenance badge for a policy master tag.
 * ----------------------------------------------------
 * Renders next to a code chip to show whether the tag is still an
 * AI suggestion or has been confirmed by a human reviewer:
 *
 *   • AI tag    → a violet "AI" pill with a sparkle. Clicking it (when the
 *                 viewer can edit) confirms the tag → promotes it to human.
 *   • Human tag → a green "verified" badge (the human logo). Clicking it
 *                 reverts the confirmation back to the AI baseline.
 *
 * The component is presentational — confirm / revert handlers and the busy
 * state come from useMasterTagStatus in the parent.
 */
'use client';

type Origin = 'ai' | 'human';

function SparkleIcon() {
  return (
    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2l1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2z" />
      <path d="M19 14l.9 2.6L22.5 17.5l-2.6.9L19 21l-.9-2.6L15.5 17.5l2.6-.9L19 14z" />
    </svg>
  );
}

function VerifiedIcon() {
  // A check inside a rosette — the "human-confirmed" logo.
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 1l2.4 1.8 3 .1 1 2.8 2.4 1.7-.9 2.9.9 2.9-2.4 1.7-1 2.8-3 .1L12 23l-2.4-1.8-3-.1-1-2.8L3.2 16l.9-2.9-.9-2.9 2.4-1.7 1-2.8 3-.1L12 1z" />
      <path d="M10.6 14.6l-2.2-2.2-1.4 1.4 3.6 3.6 6-6-1.4-1.4z" fill="#fff" />
    </svg>
  );
}

export default function TagOriginBadge({
  origin,
  canEdit,
  busy,
  confirmedByName,
  onConfirm,
  onRevert,
}: {
  origin: Origin;
  canEdit: boolean;
  busy?: boolean;
  confirmedByName?: string | null;
  onConfirm?: () => void;
  onRevert?: () => void;
}) {
  if (origin === 'human') {
    const title = confirmedByName
      ? `Confirmed by ${confirmedByName}${canEdit ? ' · click to revert to AI' : ''}`
      : canEdit
        ? 'Confirmed tag · click to revert to AI'
        : 'Confirmed by a reviewer';
    return (
      <button
        type="button"
        disabled={!canEdit || busy}
        onClick={canEdit ? onRevert : undefined}
        title={title}
        className="inline-flex items-center gap-0.5 rounded-full px-1 py-px text-[8px] font-bold uppercase tracking-wide bg-green-100 text-green-800 border border-green-300 disabled:opacity-60 disabled:cursor-default cursor-pointer"
      >
        <VerifiedIcon />
        <span className="leading-none">Human</span>
      </button>
    );
  }
  // AI tag.
  const title = canEdit
    ? 'AI-suggested tag · click to confirm as a human tag'
    : 'AI-suggested tag (sign in to confirm)';
  return (
    <button
      type="button"
      disabled={busy}
      onClick={canEdit ? onConfirm : undefined}
      title={title}
      className="inline-flex items-center gap-0.5 rounded-full px-1 py-px text-[8px] font-bold uppercase tracking-wide bg-violet-100 text-violet-800 border border-dashed border-violet-400 hover:bg-violet-200 disabled:opacity-60 cursor-pointer"
    >
      <SparkleIcon />
      <span className="leading-none">AI</span>
    </button>
  );
}
