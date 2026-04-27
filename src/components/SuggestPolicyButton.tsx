'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { suggestPoliciesForArticle, type PolicySuggestion } from '@/lib/suggestPolicyForArticle';
import ExplainabilityBadge from './ExplainabilityBadge';
import ConfidenceDot from './ui/ConfidenceDot';

interface Props {
  article: { title?: string; description?: string };
  /** Optional CSS class wedged onto the trigger so callers can match site styling. */
  className?: string;
}

/**
 * Tiny inline affordance shown on news cards. Clicking surfaces the top
 * 3–5 policy suggestions for the article — each links to the Policy
 * Navigator, deep-linked to the policy in question. Suggestions are
 * computed client-side from the static `policies` dataset.
 */
export default function SuggestPolicyButton({ article, className = '' }: Props) {
  const suggestions = useMemo<PolicySuggestion[]>(
    () => suggestPoliciesForArticle(article).slice(0, 5),
    [article.title, article.description],
  );
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  if (suggestions.length === 0) {
    return (
      <span
        title="We couldn't confidently match this article to a tracked policy."
        className={`text-[10px] text-tertiary-light italic ${className}`}>
        No policy match
      </span>
    );
  }

  const top = suggestions[0];
  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        title="Show the policies most likely related to this article"
        className={`mh-focus mh-motion-fast inline-flex items-center gap-1.5 text-[10.5px] px-1.5 py-0.5 rounded border border-grey-300 hover:border-primary hover:text-primary ${className}`}>
        {/* At-a-glance confidence dot — shows the quality of the *top* match
            without making the user open the popover. Pairs with the
            ExplainabilityBadge inside the popover when they want detail. */}
        <ConfidenceDot score={Math.min(1, top.score)} />
        <span>↗ {top.policy.short_title}</span>
        {suggestions.length > 1 && (
          <span className="text-tertiary mh-tnum">+{suggestions.length - 1}</span>
        )}
      </button>
      {open && (
        <div className="absolute z-30 right-0 mt-1 w-[300px] bg-[var(--mh-card)] border border-[var(--mh-border)] rounded-lg shadow-lg p-2 text-[12px]" style={{ boxShadow: 'var(--mh-shadow-lg)' }}>
          <div className="text-[10px] uppercase tracking-wider text-[var(--mh-muted)] mb-1">
            Suggested policies
          </div>
          <ul className="space-y-1">
            {suggestions.map(s => (
              <li key={s.policyId} className="flex items-start gap-2 py-0.5">
                <ConfidenceDot score={Math.min(1, s.score)} className="mt-1" />
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/policy-navigator?policy=${encodeURIComponent(s.policyId)}`}
                    className="mh-focus text-[var(--mh-status-info)] hover:underline font-medium truncate block">
                    {s.policy.short_title}
                  </Link>
                </div>
                <ExplainabilityBadge
                  score={Math.min(1, s.score)}
                  reasons={s.reasons.map(r => ({ label: r }))}
                  ruleId="suggestPolicyForArticle/v1"
                />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
