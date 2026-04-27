'use client';
/**
 * "Why am I seeing this?" badge for AI-generated suggestions (#15).
 *
 * Drop-in next to any AI affordance:
 *   <ExplainabilityBadge
 *     score={0.87}
 *     reasons={[
 *       { label: 'Short title match', weight: 0.5 },
 *       { label: 'CELEX form', weight: 0.3 },
 *       { label: '4 token overlap', weight: 0.2 },
 *     ]}
 *     ruleId="suggestPolicyForArticle/v1"
 *   />
 *
 * The badge is intentionally small and shows a popover on hover/focus.
 * We never claim 100% confidence — the popover always carries the
 * deterministic rule id so users can find the exact code path.
 */
import { useState } from 'react';

export interface ExplainabilityReason {
  label: string;
  /** 0–1; rendered as a small bar so the largest contributor is visually obvious. */
  weight?: number;
  detail?: string;
}

interface Props {
  score: number;
  reasons: ExplainabilityReason[];
  ruleId: string;
  className?: string;
}

function tone(score: number): string {
  if (score >= 0.75) return 'bg-secondary/10 text-secondary border-secondary/30';
  if (score >= 0.5)  return 'bg-accent-orange/10 text-accent-orange border-accent-orange/30';
  return 'bg-grey-100 text-grey-600 border-grey-300';
}

export default function ExplainabilityBadge({ score, reasons, ruleId, className = '' }: Props) {
  const [open, setOpen] = useState(false);
  const pct = Math.round(score * 100);
  return (
    <span className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${tone(score)}`}
        aria-label={`Why am I seeing this? Confidence ${pct}%.`}
      >
        why? · {pct}%
      </button>
      {open && (
        <div className="absolute z-50 left-1/2 -translate-x-1/2 mt-1 w-[260px] bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] border border-grey-200 dark:border-[var(--mh-border)] rounded-lg shadow-xl px-3 py-2.5 text-left">
          <p className="text-[11px] uppercase tracking-wide text-grey-500 mb-1.5">Why this match</p>
          <ul className="space-y-1.5 mb-2">
            {reasons.map((r, i) => (
              <li key={i} className="text-[12px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-tertiary dark:text-[var(--mh-fg)]">{r.label}</span>
                  {typeof r.weight === 'number' && (
                    <span className="text-[10px] text-grey-500">{(r.weight * 100).toFixed(0)}%</span>
                  )}
                </div>
                {typeof r.weight === 'number' && (
                  <div className="h-1 mt-1 rounded-full bg-grey-100 dark:bg-[#222D3B] overflow-hidden">
                    <div className="h-full bg-secondary" style={{ width: `${(r.weight * 100).toFixed(0)}%` }} />
                  </div>
                )}
                {r.detail && <p className="text-[11px] text-grey-500 mt-0.5">{r.detail}</p>}
              </li>
            ))}
          </ul>
          <p className="text-[10px] text-grey-500 border-t border-grey-100 dark:border-[var(--mh-border)] pt-1.5 font-mono">
            rule: {ruleId}
          </p>
        </div>
      )}
    </span>
  );
}
