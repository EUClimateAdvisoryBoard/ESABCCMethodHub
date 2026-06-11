'use client';

/**
 * Policy Coherence Assessment — beta module page.
 *
 * The standalone home of the beta four-step coherence model over the
 * tracked EU policy corpus:
 *
 *   ① Ex ante design vs world development
 *   ② Coherence across all policy goals in the space
 *   ③ Between policy goals and means of implementation
 *   ④ Policy evaluation: measuring policy change and policy outcomes
 *
 * The board itself lives in `src/components/content-analysis/
 * PolicyCoherenceBoard.tsx` so the workspace Content Analysis module can
 * mount the identical lens scoped to its corpus. Steps ③–④ are derived
 * from the objective–delivery checklist rather than re-assessed — see
 * `src/lib/content-analysis/policy-coherence.ts` for the model.
 */

import dynamic from 'next/dynamic';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { COHERENCE_STEPS } from '@/lib/content-analysis/policy-coherence';

const PolicyCoherenceBoard = dynamic(
  () => import('@/components/content-analysis/PolicyCoherenceBoard'),
  {
    ssr: false,
    loading: () => (
      <div className="h-[480px] rounded-lg border border-grey-200 bg-grey-50 flex items-center justify-center text-tertiary text-sm">
        Loading coherence board…
      </div>
    ),
  },
);

export default function PolicyCoherencePage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · Four-step coherence model
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">
            Policy Coherence Assessment
          </h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            A system-level coherence reading of the tracked EU climate policy corpus. Where the
            objective–delivery checklist asks whether each act can deliver its <em>own</em>{' '}
            objective, this lens asks whether the policy <em>space</em> coheres — with the world
            it was designed for, with itself, with its means, and with what the indicators
            actually measure.
          </p>
        </section>

        {/* The four steps, as method cards */}
        <section className="mb-6 grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {COHERENCE_STEPS.map(s => (
            <div key={s.id} className="border border-grey-200 rounded-lg bg-white p-3">
              <p className="font-mono text-[18px] font-bold text-primary leading-none">
                {s.ordinal}
              </p>
              <p className="mt-1 text-[12px] font-bold text-tertiary-dark leading-snug">
                {s.name}
              </p>
              <p className="mt-1 text-[10.5px] text-tertiary leading-relaxed">{s.question}</p>
              <p className="mt-1.5 font-mono text-[8.5px] uppercase tracking-[0.1em] text-tertiary">
                {s.basis}
              </p>
            </div>
          ))}
        </section>

        <PolicyCoherenceBoard />

        <section className="mt-8 border-t border-grey-200 pt-4 text-[11px] text-tertiary leading-relaxed max-w-3xl space-y-2">
          <p className="font-bold text-tertiary-dark text-[12px]">Method note</p>
          <p>
            Steps ① and ② are curated AI-baseline assessments (world-development snapshot:
            mid-2026) over the major acts of the corpus, reviewable like every other AI tag in
            the platform. Steps ③ and ④ deliberately <em>derive</em> from the per-policy
            objective–delivery checklist — the five means-side criteria (instruments, coverage,
            enforcement, financing, timeline) and the two evaluation-machinery criteria
            (monitoring, review) — so the two lenses can never contradict each other and no
            verdict is authored twice. Measured outcomes in step ④ are curated against published
            indicator data and override machinery verdicts: perfect MRV on a measurably
            off-track trajectory is still evaluative incoherence.
          </p>
          <p>
            The four steps are also registered as taggable codes under{' '}
            <span className="font-mono">Policy coherence (beta)</span> in the Content Analysis
            master code system, so coherence evidence can be pinned to text segments in the
            master library and the same lens appears inside the workspace analysis workbench.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
