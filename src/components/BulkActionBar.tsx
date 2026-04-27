'use client';
/**
 * Floating bottom bar that appears when bulk selection is non-empty (#8).
 * The bar's children are the module-specific actions (Export, Tag, Add to
 * collection…). Clicking the count opens a "Clear" affordance.
 */
import { ReactNode } from 'react';

interface Props {
  count: number;
  onClear: () => void;
  /** Module-specific bulk actions, rendered as buttons. */
  children?: ReactNode;
}

export default function BulkActionBar({ count, onClear, children }: Props) {
  if (count === 0) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-[80] bg-tertiary-dark dark:bg-[var(--mh-card)] dark:border dark:border-[var(--mh-border)] text-white dark:text-[var(--mh-fg)] rounded-lg shadow-2xl px-4 py-2.5 flex items-center gap-3 max-w-[min(720px,92vw)]">
      <button
        onClick={onClear}
        className="text-xs px-2 py-0.5 rounded bg-white/10 hover:bg-white/20"
        aria-label="Clear selection"
      >
        ✕ {count} selected
      </button>
      <div className="h-5 w-px bg-white/20 dark:bg-[var(--mh-border)]" />
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}
