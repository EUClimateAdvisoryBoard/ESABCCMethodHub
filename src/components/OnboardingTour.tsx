'use client';
/**
 * Lightweight onboarding tour (#12).
 *
 * Each module-level page can drop in:
 *
 *   <OnboardingTour
 *     moduleKey="references"
 *     steps={[
 *       { title: 'Filter by type', body: 'Use the dropdown to filter by article, report, or chapter.' },
 *       …
 *     ]}
 *   />
 *
 * The tour renders a floating card on first visit; users can dismiss it
 * permanently (we record onboarding_seen[moduleKey] = true in their
 * preferences). They can replay it any time via `?help=1` in the URL.
 */
import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { usePreferences } from '@/lib/preferences-context';

export interface TourStep {
  title: string;
  body: string;
  /** Optional CSS selector. When set, the step scroll-into-views the matching
      element and pulses an mh-ring around it for the duration of the step. */
  anchor?: string;
}

interface Props {
  moduleKey: string;
  steps: TourStep[];
}

// Next.js requires components calling useSearchParams() during render to be
// wrapped in a Suspense boundary so the page can still be statically
// prerendered. We wrap the inner implementation here so every consumer gets
// the boundary for free.
export default function OnboardingTour(props: Props) {
  return (
    <Suspense fallback={null}>
      <OnboardingTourInner {...props} />
    </Suspense>
  );
}

function OnboardingTourInner({ moduleKey, steps }: Props) {
  const { prefs, markOnboardingSeen } = usePreferences();
  const search = useSearchParams();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const force = search?.get('help') === '1';
    const seen = !!prefs.onboarding_seen[moduleKey];
    if (force) { setOpen(true); setStep(0); return; }
    if (!seen) setOpen(true);
  }, [moduleKey, prefs.onboarding_seen, search]);

  // Anchor highlight (M·04 #10): when a step has an anchor selector,
  // scroll it into view and apply mh-ring-pulse + a persistent outline
  // until the user advances. Cleans up on step change and on close.
  useEffect(() => {
    if (!open) return;
    const anchor = steps[step]?.anchor;
    if (!anchor) return;
    const el = document.querySelector(anchor) as HTMLElement | null;
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('mh-ring-pulse');
    const prevOutline = el.style.outline;
    const prevOffset = el.style.outlineOffset;
    el.style.outline = '2px solid var(--mh-status-primary)';
    el.style.outlineOffset = '4px';
    return () => {
      el.classList.remove('mh-ring-pulse');
      el.style.outline = prevOutline;
      el.style.outlineOffset = prevOffset;
    };
  }, [step, open, steps]);

  if (!open || steps.length === 0) return null;
  const current = steps[step];
  const last = step === steps.length - 1;

  function next() {
    if (last) { setOpen(false); markOnboardingSeen(moduleKey); }
    else setStep(s => s + 1);
  }
  function skip() { setOpen(false); markOnboardingSeen(moduleKey); }

  return (
    <div className="fixed bottom-6 right-6 z-[90] w-[min(360px,90vw)] bg-white dark:bg-[var(--mh-card)] dark:text-[var(--mh-fg)] border border-grey-200 dark:border-[var(--mh-border)] rounded-xl shadow-2xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-wide text-grey-500">{step + 1} / {steps.length}</span>
        <button onClick={skip} className="text-[11px] text-grey-500 hover:underline">Skip</button>
      </div>
      <h3 className="text-sm font-bold mb-1">{current.title}</h3>
      <p className="text-sm text-tertiary dark:text-[var(--mh-fg)]/80">{current.body}</p>
      <div className="flex justify-end gap-2 mt-4">
        {step > 0 && (
          <button onClick={() => setStep(s => s - 1)} className="text-xs px-3 py-1.5 rounded-md border border-grey-300 dark:border-[var(--mh-border)]">
            Back
          </button>
        )}
        <button onClick={next} className="text-xs font-semibold px-3 py-1.5 rounded-md bg-secondary text-white">
          {last ? 'Got it' : 'Next'}
        </button>
      </div>
    </div>
  );
}
