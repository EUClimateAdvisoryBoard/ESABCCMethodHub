'use client';

// ---------------------------------------------------------------------------
// ModeSwitcher — task-verb information architecture (foundation for items
// 2.1 / 3.1 / 4.2 / 5.2 in docs/vision/brainstorm-modules-uxui-feasibility-rank.md).
//
// Names *jobs* (Read · Code · Compare · Summarise · Export) rather than
// the thing the user is inside of. A single segmented control with
// optional 1-line subtitles. Keyboard: ← → to switch focus, Enter to
// activate. Mobile: same pattern, minimum 44 × 44 hit area.
//
// Usage
//
//   <ModeSwitcher
//     modes={[
//       { id: 'feed',     label: 'Feed',     subtitle: 'Latest items' },
//       { id: 'briefing', label: 'Briefing', subtitle: 'Today's TL;DR' },
//       { id: 'clock',    label: 'Clock',    subtitle: 'Policy timeline' },
//     ]}
//     value={mode}
//     onChange={(id) => update({ mode: id })}
//   />
//
// The ID type stays generic so callers can keep their existing union types.
// ---------------------------------------------------------------------------

import { ReactNode, useId, useRef } from 'react';

export type Mode<Id extends string = string> = {
  id: Id;
  label: string;
  subtitle?: string;
  icon?: ReactNode;
  /** Hidden from view but read by screen readers in place of label. */
  ariaLabel?: string;
  /** Disable the tab; tooltip suggested via title in caller. */
  disabled?: boolean;
};

type Props<Id extends string> = {
  modes: ReadonlyArray<Mode<Id>>;
  value: Id;
  onChange: (id: Id) => void;
  /** Visual density. `compact` hides subtitles. */
  size?: 'compact' | 'comfortable';
  /** Page-scoped label, e.g. "View mode". Read by screen readers. */
  ariaLabel?: string;
  className?: string;
};

export default function ModeSwitcher<Id extends string>({
  modes,
  value,
  onChange,
  size = 'comfortable',
  ariaLabel = 'Mode',
  className = '',
}: Props<Id>) {
  const groupId = useId();
  const buttonsRef = useRef<Array<HTMLButtonElement | null>>([]);

  const activeIndex = Math.max(
    0,
    modes.findIndex((m) => m.id === value),
  );

  const focusAt = (i: number) => {
    const len = modes.length;
    const next = ((i % len) + len) % len;
    buttonsRef.current[next]?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent, i: number) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); focusAt(i + 1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); focusAt(i - 1); }
    else if (e.key === 'Home') { e.preventDefault(); focusAt(0); }
    else if (e.key === 'End') { e.preventDefault(); focusAt(modes.length - 1); }
  };

  const showSubtitles = size === 'comfortable' && modes.some((m) => m.subtitle);

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className={`mh-mode-switcher inline-flex items-stretch gap-0 rounded-lg border border-[var(--mh-border)] bg-[var(--mh-card)] p-1 ${className}`}
      style={{ minHeight: showSubtitles ? 56 : 36 }}
    >
      {modes.map((mode, i) => {
        const active = mode.id === value;
        return (
          <button
            key={mode.id}
            ref={(el) => { buttonsRef.current[i] = el; }}
            id={`${groupId}-${mode.id}`}
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={`${groupId}-${mode.id}-panel`}
            aria-label={mode.ariaLabel ?? mode.label}
            tabIndex={active ? 0 : -1}
            disabled={mode.disabled}
            onClick={() => !mode.disabled && onChange(mode.id)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={[
              'mh-focus mh-motion-fast group flex flex-col items-start justify-center rounded-md px-3 text-left',
              'min-w-[88px]',
              active
                ? 'bg-[var(--mh-status-primary-bg)] text-[var(--mh-status-primary)] font-semibold'
                : 'text-[var(--mh-fg)] hover:bg-[var(--mh-bg)]',
              mode.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
            ].join(' ')}
            style={{ minHeight: showSubtitles ? 48 : 28, paddingTop: 4, paddingBottom: 4 }}
          >
            <span className="inline-flex items-center gap-1.5" style={{ fontSize: 'var(--mh-text-sm)' }}>
              {mode.icon ? <span aria-hidden="true">{mode.icon}</span> : null}
              {mode.label}
            </span>
            {showSubtitles && mode.subtitle ? (
              <span
                className="truncate max-w-[200px] text-[var(--mh-muted)]"
                style={{ fontSize: 'var(--mh-text-2xs)', marginTop: 2 }}
              >
                {mode.subtitle}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

// Helper: pair the switcher with a panel so aria-controls is wired up
// correctly. Caller still owns the actual rendering.
export function ModePanel({
  id,
  active,
  children,
}: {
  id: string;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div role="tabpanel" id={`${id}-panel`} aria-labelledby={id} hidden={!active}>
      {children}
    </div>
  );
}
