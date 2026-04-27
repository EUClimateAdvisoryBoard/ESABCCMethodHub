'use client';

// ---------------------------------------------------------------------------
// ConfidenceDot — at-a-glance epistemic UI for AI-generated suggestions.
//
// Three filled dots out of three encode confidence quantiles, paired with
// the system-status taxonomy:
//   ●●●  ≥ 0.85  (success — high)
//   ●●○  0.6–0.85 (warning — medium)
//   ●○○  < 0.6   (danger — low)
//
// The dot is *not* a tooltip. Pair with <ExplainabilityBadge /> when the
// user needs the "why this?" popover. Used as a glanceable surface on:
//   - news cards (matched policy chip)
//   - graph edges (in popover)
//   - code segments (AI-suggested)
//
// ARIA: aria-label exposes the numeric confidence to screen readers.
// title surfaces the same on long-hover for sighted users.
// ---------------------------------------------------------------------------

import { CSSProperties } from 'react';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export function levelFromScore(score: number): ConfidenceLevel {
  if (score >= 0.85) return 'high';
  if (score >= 0.6)  return 'medium';
  return 'low';
}

const LEVEL_FILL: Record<ConfidenceLevel, number> = { high: 3, medium: 2, low: 1 };
const LEVEL_COLOR: Record<ConfidenceLevel, string> = {
  high:   'var(--mh-status-success)',
  medium: 'var(--mh-status-warning)',
  low:    'var(--mh-status-danger)',
};
const LEVEL_LABEL: Record<ConfidenceLevel, string> = {
  high:   'High confidence',
  medium: 'Medium confidence',
  low:    'Low confidence',
};

type Props = {
  score: number;            // 0..1
  size?: number;            // dot diameter, px (default 6)
  showLabel?: boolean;      // also render the textual level next to the dots
  className?: string;
};

export default function ConfidenceDot({ score, size = 6, showLabel = false, className = '' }: Props) {
  const clamped = Math.max(0, Math.min(1, score));
  const pct = Math.round(clamped * 100);
  const level = levelFromScore(clamped);
  const filled = LEVEL_FILL[level];
  const colour = LEVEL_COLOR[level];
  const ariaLabel = `${LEVEL_LABEL[level]} (${pct}%)`;
  const dotStyle: CSSProperties = { width: size, height: size, borderRadius: '50%' };
  return (
    <span
      role="img"
      aria-label={ariaLabel}
      title={ariaLabel}
      className={`inline-flex items-center gap-[2px] align-middle ${className}`}
    >
      {[0, 1, 2].map(i => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            ...dotStyle,
            backgroundColor: i < filled ? colour : 'transparent',
            boxShadow: `inset 0 0 0 1px ${colour}`,
          }}
        />
      ))}
      {showLabel ? (
        <span
          className="mh-tnum text-[var(--mh-muted)] ml-1"
          style={{ fontSize: 'var(--mh-text-2xs)' }}
        >
          {pct}%
        </span>
      ) : null}
    </span>
  );
}
