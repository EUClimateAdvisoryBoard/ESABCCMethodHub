'use client';

/**
 * Overview Industry — beta module landing page.
 * ---------------------------------------------
 * An overview surface for the industry lead's cross-cutting work, gathering
 * three sub-pages:
 *   • Clean Tech  — ONE collapsible emissions sunburst of EU manufacturing
 *                   (NACE Section C): total → divisions → subsectors → levers,
 *                   with cost / readiness / barriers / investment decisions.
 *   • Trade flows — input–output map of EU-27 manufacturing trade (all NACE
 *                   Section C divisions): imports/exports, supply-chain inputs
 *                   and high-risk import dependencies, on live Eurostat data.
 *   • Industry report — objectives & evidence base for the next progress
 *                   report's industry chapter: a synthesis of industrial
 *                   decarbonisation roadmaps (incl. investment timelines) and
 *                   of the clean-tech industry's role in economy-wide
 *                   decarbonisation, with overview figures and a fully sourced
 *                   Excel download (every data point linked to its paper).
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
          A cross-cutting overview surface for EU industrial decarbonisation. Three sub-pages so
          far — an evidence catalogue of clean-tech options, a trade-flows view, and the objectives
          &amp; evidence base for the next report&apos;s industry chapter.
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

              One figure: EU manufacturing (NACE Rev. 2.1 Section&nbsp;C) as a collapsible emissions
              sunburst — the sector total decomposing into NACE divisions, subsectors and their
              decarbonisation levers, every arc sized by sourced Mt CO₂. Each lever carries its
              marginal abatement cost, technology readiness, barriers, scale and the real investment
              decisions (incl. FIDs), all with source links — plus a clean-tech vs old-tech overlay
              that splits the levers into near-zero routes and incumbent-based transitional bridges.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-primary">
              Open the wheel →
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
              An input–output map of EU-27 manufacturing trade (all 24 NACE Section&nbsp;C divisions): one
              summary dashboard, then a deep-dive per division — trade balance, imported-input mix straight
              from the EU input–output use table and FIGARO (incl. foreign value added in exports, real
              origin/destination shares), critical inputs and the high-risk import dependencies where one
              supplier dominates. The full FIGARO inter-country input–output table is imported into the
              MethodHub itself, with a table viewer and analysis dashboard. Statistical layers regenerate
              from the Eurostat API; the risk layer sits on the Critical Raw Materials Act and the
              Commission&apos;s strategic-dependency reviews — with a full Methodology view.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-secondary">
              Open the map →
            </span>
          </Link>

          <Link
            href="/beta/overview-industry/report-objectives"
            className="group rounded-xl border border-grey-200 bg-white p-5 shadow-sm transition hover:border-accent-violet hover:shadow"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-violet text-white">
                ◎
              </span>
              <h2 className="text-lg font-bold text-grey-900 group-hover:text-accent-violet">
                Industry report — objectives
              </h2>
            </div>
            <p className="mt-2 text-sm text-grey-600">
              The objectives and evidence base for the next progress report&apos;s industry work: a
              synthesis of industrial decarbonisation pathways and roadmaps (including their
              investment timelines), a synthesis of the clean-tech industry&apos;s role in
              economy-wide decarbonisation, and the report objectives themselves. Key overview
              figures aggregate pathway, scenario (incl. IIASA AR6 ensemble) and investment data —
              and one Excel download carries every data point, the objectives, the scenarios and
              the exact link to the paper behind each number.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-accent-violet">
              Open the objectives →
            </span>
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
