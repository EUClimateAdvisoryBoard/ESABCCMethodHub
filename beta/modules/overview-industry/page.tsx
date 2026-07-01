'use client';

/**
 * Overview Industry — beta module landing page.
 * ---------------------------------------------
 * An overview surface for the industry lead's cross-cutting work, gathering
 * two sub-pages:
 *   • Clean Tech  — a collapsible, fully-sourced catalogue mapping the EU
 *                   industry emission profile → subsectors → mitigation
 *                   technologies → cost / readiness / projects / rationale.
 *   • Trade flows — (placeholder; details to follow).
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function OverviewIndustryPage() {
  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-content px-4 py-10">
        <div className="flex items-center gap-2">
          <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Beta
          </span>
          <span className="rounded bg-grey-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
            Overview Industry
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-grey-900">Overview Industry</h1>
        <p className="mt-2 max-w-text text-grey-700">
          A cross-cutting overview surface for EU industrial decarbonisation. Two sub-pages so far —
          an evidence catalogue of clean-tech options, and a trade-flows view.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/beta/overview-industry/cleantech"
            className="group rounded-xl border border-grey-200 bg-white p-5 shadow-sm transition hover:border-primary hover:shadow"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                ⚙
              </span>
              <h2 className="text-lg font-bold text-grey-900 group-hover:text-primary">Clean Tech</h2>
            </div>
            <p className="mt-2 text-sm text-grey-600">
              A big collapsible catalogue: the EU-27 industry emission profile → each energy-intensive
              subsector → every available mitigation technology → its abatement cost, technology
              readiness, availability, real project pipeline (incl. Final Investment Decisions) and
              the reasons costs are high, readiness lags and scale is hard. Every data point is
              sourced. Mine it for recurring bottlenecks that can inform policy.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-primary">
              Open the catalogue →
            </span>
          </Link>

          <Link
            href="/beta/overview-industry/trade-flows"
            className="group rounded-xl border border-grey-200 bg-white p-5 shadow-sm transition hover:border-secondary hover:shadow"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white">
                ⇄
              </span>
              <h2 className="text-lg font-bold text-grey-900 group-hover:text-secondary">
                Trade flows
              </h2>
            </div>
            <p className="mt-2 text-sm text-grey-600">
              Trade exposure and flows for EU industry (carbon leakage, CBAM, import/export
              dependencies). Scope and data to be defined — details to follow.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-secondary">
              Placeholder →
            </span>
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
