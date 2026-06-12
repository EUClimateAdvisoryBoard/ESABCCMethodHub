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
              <p className="mt-1.5 text-[9px] text-tertiary leading-snug">{s.framework}</p>
              <p className="mt-1 font-mono text-[8.5px] uppercase tracking-[0.1em] text-tertiary">
                {s.basis}
              </p>
            </div>
          ))}
        </section>

        <PolicyCoherenceBoard />

        <section className="mt-8 border-t border-grey-200 pt-4 text-[11px] text-tertiary leading-relaxed max-w-3xl space-y-2">
          <p className="font-bold text-tertiary-dark text-[12px]">Method note</p>
          <p>
            The model is rule-based by construction: every grade follows mechanically from a
            declared rule applied to citable evidence, so reviewers audit rule applications
            rather than opinions. Step ① uses Assumption-Based Planning (Dewar et al., RAND
            1993): each load-bearing assumption is a falsifiable proposition with a named
            signpost indicator and an explicit violation criterion; the status is the criterion
            applied to a sourced observation. Step ② scores pairwise goal interactions on the
            seven-point scale of Nilsson, Griggs &amp; Visbeck (2016, <em>Nature</em> 534:320)
            with the ICSU (2017) decision rules, each score carrying the interaction mechanism
            and the legal provisions that create it. Step ④ outcomes use the distance-to-target
            method of the EEA Trends &amp; Projections reports: observed recent pace ÷ required
            pace, computed in code with declared thresholds (≥1.0 on track · ≥0.5 lagging ·
            below off track). Evidence quality is graded A (official statistics / legal acts),
            B (official assessments) or C (secondary sources).
          </p>
          <p>
            Steps ③ and ④ (machinery) deliberately <em>derive</em> from the per-policy
            objective–delivery checklist — the five means-side criteria (instruments, coverage,
            enforcement, financing, timeline) and the two evaluation-machinery criteria
            (monitoring, review) — so the two lenses can never contradict each other and no
            verdict is authored twice. Measured pace readings override machinery verdicts:
            perfect MRV on a measurably off-track trajectory is still evaluative incoherence.
            Observation snapshot: mid-2026; every observation carries its source for
            re-verification.
          </p>
          <p>
            <span className="font-bold text-tertiary-dark">Text provenance.</span> Every curated
            assessment is anchored in the acts&apos; own words: the step views quote the exact
            provisions each grade stems from — verbatim from the policy-text library where the
            (consolidated) text is shipped, and clearly flagged as a paraphrase where it is not
            (e.g. the library still carries the 2003 ETS Directive, the 2018 ESR, RED II, the
            2019 CO₂-cars Regulation and the pre-postponement EUDR — none of which contain
            their later amendments). Observations were re-verified against primary sources in
            June 2026. The same
            passages are seeded into the Content Analysis master library as coded segments under
            the four <span className="font-mono">coh-*</span> codes, alongside a ready-made
            project — <span className="font-semibold">Policy coherence — master library</span> —
            scoping exactly the assessed corpus. Open any assessed act in the workbench and the
            coherence evidence appears as in-text highlights, word for word, next to the
            objective–delivery checklist annotations.
          </p>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
