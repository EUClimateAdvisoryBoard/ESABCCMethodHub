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
    <div
      role="region"
      aria-label={`${count} item${count === 1 ? '' : 's'} selected`}
      className="fixed left-1/2 -translate-x-1/2 z-[80] bg-tertiary-dark dark:bg-[var(--mh-card)] dark:border dark:border-[var(--mh-border)] text-white dark:text-[var(--mh-fg)] rounded-lg shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center gap-x-3 gap-y-2 max-w-[min(720px,calc(100vw-1rem))] w-[calc(100vw-1rem)] sm:w-auto bottom-bottom-nav mb-3 sm:mb-0 sm:bottom-4"
    >
      <button
        onClick={onClear}
        className="text-[12px] sm:text-xs px-2 py-1 min-h-[36px] rounded bg-white/10 hover:bg-white/20 active:bg-white/25 inline-flex items-center gap-1"
        aria-label="Clear selection"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden>
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
        {count} selected
      </button>
      <div className="h-5 w-px bg-white/20 dark:bg-[var(--mh-border)] hidden sm:block" />
      <div className="flex items-center gap-2 flex-wrap">{children}</div>
    </div>
  );
}
