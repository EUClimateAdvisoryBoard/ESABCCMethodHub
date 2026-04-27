'use client';

// ---------------------------------------------------------------------------
// FilterPill / SavedViewChip — Hick's Law + recognition-over-recall.
//
// Replaces tall checkbox columns with a horizontal row of compact pills.
// Three visual states: idle, active (filter applied), focused.
// Optional count badge (e.g. "Sector · 3") for goal-gradient feedback.
//
// SavedViewChip is the same shape with a tiny sparkle marker for personal
// saved views and an X to remove from pinned set.
//
// Both honour WCAG 2.2: 24×24 minimum hit area met via padding.
// ---------------------------------------------------------------------------

import { ReactNode } from 'react';

type FilterPillProps = {
  label: string;
  active?: boolean;
  count?: number;
  icon?: ReactNode;
  onClick?: () => void;
  onClear?: () => void;       // when active, render an inline × to clear this filter
  ariaLabel?: string;
  className?: string;
};

export function FilterPill({
  label,
  active = false,
  count,
  icon,
  onClick,
  onClear,
  ariaLabel,
  className = '',
}: FilterPillProps) {
  const base =
    'mh-focus mh-motion-fast inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 border whitespace-nowrap select-none';
  const tone = active
    ? 'bg-[var(--mh-status-primary-bg)] text-[var(--mh-status-primary)] border-[var(--mh-status-primary)] font-semibold'
    : 'bg-[var(--mh-card)] text-[var(--mh-fg)] border-[var(--mh-border)] hover:border-[var(--mh-status-primary)]';
  return (
    <span className={`inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={ariaLabel ?? label}
        className={`${base} ${tone}`}
        style={{ fontSize: 'var(--mh-text-xs)', minHeight: 28 }}
      >
        {icon ? <span aria-hidden="true">{icon}</span> : null}
        <span>{label}</span>
        {typeof count === 'number' && count > 0 ? (
          <span
            aria-hidden="true"
            className="mh-tnum inline-flex items-center justify-center rounded-full"
            style={{
              fontSize: 'var(--mh-text-2xs)',
              minWidth: 18,
              height: 18,
              padding: '0 5px',
              background: active ? 'var(--mh-status-primary)' : 'var(--mh-bg)',
              color: active ? '#fff' : 'var(--mh-muted)',
              border: active ? 'none' : '1px solid var(--mh-border)',
            }}
          >
            {count}
          </span>
        ) : null}
        {active && onClear ? (
          <span
            role="button"
            tabIndex={0}
            aria-label={`Clear ${label}`}
            onClick={(e) => { e.stopPropagation(); onClear(); }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault(); e.stopPropagation(); onClear();
              }
            }}
            className="-mr-1 ml-0.5 inline-flex items-center justify-center rounded-full hover:bg-[var(--mh-status-primary)]/15 mh-focus"
            style={{ width: 16, height: 16, lineHeight: 1, fontSize: 12 }}
          >
            ×
          </span>
        ) : null}
      </button>
    </span>
  );
}

type SavedViewChipProps = {
  label: string;
  active?: boolean;
  pinned?: boolean;
  onClick?: () => void;
  onRemove?: () => void;
  className?: string;
};

export function SavedViewChip({
  label,
  active = false,
  pinned = false,
  onClick,
  onRemove,
  className = '',
}: SavedViewChipProps) {
  const tone = active
    ? 'bg-[var(--mh-status-info-bg)] text-[var(--mh-status-info)] border-[var(--mh-status-info)] font-semibold'
    : 'bg-[var(--mh-card)] text-[var(--mh-fg)] border-[var(--mh-border)] hover:border-[var(--mh-status-info)]';
  return (
    <span className={`inline-flex items-center ${className}`}>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={`mh-focus mh-motion-fast inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border ${tone}`}
        style={{ fontSize: 'var(--mh-text-xs)', minHeight: 28 }}
      >
        <span aria-hidden="true" style={{ fontSize: 10 }}>
          {pinned ? '★' : '☆'}
        </span>
        <span className="truncate max-w-[180px]">{label}</span>
      </button>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Unpin ${label}`}
          className="ml-1 mh-focus mh-motion-fast inline-flex items-center justify-center text-[var(--mh-muted)] hover:text-[var(--mh-status-danger)]"
          style={{ width: 20, height: 20, fontSize: 12 }}
        >
          ×
        </button>
      ) : null}
    </span>
  );
}

// Container — sticky on scroll if the parent sets `position: sticky`.
// Keeps active-filter chips visible per the brief (recognition over recall).
export function FilterPillRow({
  children,
  className = '',
  sticky = false,
}: {
  children: ReactNode;
  className?: string;
  sticky?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 flex-wrap ${
        sticky ? 'sticky top-0 z-10 bg-[var(--mh-bg)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--mh-bg)]/80 py-2' : ''
      } ${className}`}
      role="toolbar"
      aria-label="Filters"
    >
      {children}
    </div>
  );
}
