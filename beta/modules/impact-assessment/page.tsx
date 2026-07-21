'use client';

/**
 * Impact Assessment — Modelling Results (beta module M·38) — placeholder.
 *
 * Reference library of the most important modelling results in the ETS review
 * impact assessment SWD(2026) 616 (17 July 2026): screenshots of the key
 * figures/tables plus the extracted headline numbers (carbon prices,
 * mitigation costs, scenario outcomes, technology scaling, industry
 * projections). Content is being assembled; this placeholder keeps the
 * route building.
 */

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function ImpactAssessmentModule() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
        <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
          Beta module · M · 38 · SWD(2026) 616
        </div>
        <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">
          Impact Assessment — Modelling Results
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
          Reference library of the key modelling results in the Commission&rsquo;s ETS review impact
          assessment{' '}
          <a
            href="https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-primary"
          >
            SWD(2026) 616
          </a>{' '}
          (5 parts, 958 pp). Content is being assembled.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
