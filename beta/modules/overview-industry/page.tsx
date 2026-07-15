'use client';

/**
 * Overview Industry — beta module landing page.
 * ---------------------------------------------
 * An overview surface for the industry lead's cross-cutting work, gathering
 * four sub-pages:
 *   • Clean Tech  — two sides: (1) inside industry — a collapsible emissions
 *                   sunburst of EU manufacturing (NACE Section C): total →
 *                   divisions → subsectors → levers, with cost / readiness /
 *                   barriers / investment decisions; (2) outside industry —
 *                   the external role of the new clean-tech industries (solar,
 *                   wind, batteries, EVs, electrolysers, heat pumps) in
 *                   decarbonising the other sectors, with the EC 2040 impact-
 *                   assessment pathways and a priority/competitiveness read.
 *   • Trade flows — input–output map of EU-27 manufacturing trade (all NACE
 *                   Section C divisions): imports/exports, supply-chain inputs
 *                   and a critical-dependencies dashboard, on live Eurostat data.
 *   • Downstream  — the demand side: review of the EU lead-market policies
 *                   (public procurement, quotas, border signals) documented
 *                   along the five Better Regulation criteria, plus the
 *                   downstream standards they depend on. Exports an Excel
 *                   handover pack.
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
    <div className="min-h-screen bg-grey-50 dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />

      <main className="mx-auto max-w-content px-4 py-10">
        <div className="flex items-center gap-2">
          <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Beta
          </span>
          <span className="rounded bg-grey-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary dark:bg-[var(--mh-border)]">
            Overview Industry
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-grey-900 dark:text-[var(--mh-fg)]">Overview Industry</h1>
        <p className="mt-2 max-w-text text-grey-700 dark:text-[var(--mh-muted)]">
          A cross-cutting overview surface for EU industrial decarbonisation. Four sub-pages so far
          — an evidence catalogue of clean-tech options, a trade-flows view, a demand-side review
          of lead-market policies and downstream standards, and the objectives &amp; evidence base
          for the next report&apos;s industry chapter.
        </p>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Link
            href="/beta/overview-industry/cleantech"
            className="group rounded-xl border border-grey-200 bg-white p-5 shadow-sm transition hover:border-primary hover:shadow dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-white">
                ⚙
              </span>
              <h2 className="text-lg font-bold text-grey-900 group-hover:text-primary dark:text-[var(--mh-fg)]">Clean Tech</h2>
            </div>
            <p className="mt-2 text-sm text-grey-600 dark:text-[var(--mh-muted)]">
              Two sides of one story. Side&nbsp;1 — inside industry: EU manufacturing (NACE Rev. 2.1
              Section&nbsp;C) as a collapsible emissions sunburst — the sector total decomposing into
              NACE divisions, subsectors and their decarbonisation levers, each with sourced abatement
              cost, readiness, barriers and investment decisions (incl. FIDs), plus a clean-tech vs
              old-tech overlay. Side&nbsp;2 — outside industry: the new clean-tech manufacturing
              industries (solar PV, wind, batteries, EVs, electrolysers, heat pumps) and how their
              products decarbonise the other sectors — support matrix, sourced mitigation potentials,
              the sectoral 2040 pathways of the Commission&apos;s impact assessment, and a flagged
              priority &amp; competitiveness read.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-primary">
              Open the two sides →
            </span>
          </Link>

          <Link
            href="/beta/overview-industry/trade-flows"
            className="group rounded-xl border border-grey-200 bg-white p-5 shadow-sm transition hover:border-secondary hover:shadow dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary text-white">
                ⇄
              </span>
              <h2 className="text-lg font-bold text-grey-900 group-hover:text-secondary dark:text-[var(--mh-fg)]">
                Trade flows
              </h2>
            </div>
            <p className="mt-2 text-sm text-grey-600 dark:text-[var(--mh-muted)]">
              An input–output map of EU-27 manufacturing trade (all 24 NACE Section&nbsp;C divisions): one
              summary dashboard, a critical-dependencies dashboard, then a deep-dive per division — trade
              balance, imported-input mix straight from the EU input–output use table and FIGARO (incl.
              foreign value added in exports, real origin/destination shares), critical inputs and the
              import dependencies where imports are large and one supplier dominates. The full FIGARO
              inter-country input–output table is imported into the MethodHub itself, with a table viewer
              and analysis dashboard. Statistical layers regenerate from the Eurostat API; the dependency
              layer sits on the Critical Raw Materials Act and the Commission&apos;s strategic-dependency
              reviews — with a full Methodology view.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-secondary">
              Open the map →
            </span>
          </Link>

          <Link
            href="/beta/overview-industry/downstream"
            className="group rounded-xl border border-grey-200 bg-white p-5 shadow-sm transition hover:border-accent-violet hover:shadow dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-violet text-white">
                ⬇
              </span>
              <h2 className="text-lg font-bold text-grey-900 group-hover:text-accent-violet dark:text-[var(--mh-fg)]">
                Downstream
              </h2>
            </div>
            <p className="mt-2 text-sm text-grey-600 dark:text-[var(--mh-muted)]">
              The demand side: a review of the EU&apos;s lead-market policies — public procurement
              (voluntary GPP, NZIA non-price criteria, the Industrial Accelerator Act, the Public
              Procurement Act revision, ESPR mandatory GPP), quotas (ELV recycled content, clean-fuel
              mandates) and the CBAM border signal — each documented along the five Better Regulation
              evaluation criteria (effectiveness, efficiency, relevance, coherence, EU added value),
              facts and sources only, no rating scale.
              Plus the downstream standards underneath: low-carbon definitions, labels, product rules.
              One click exports the whole review as an Excel handover workbook with criteria notes, data,
              sources and a what-to-watch timeline.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-accent-violet">
              Open the review →
            </span>
          </Link>

          <Link
            href="/beta/overview-industry/report-objectives"
            className="group rounded-xl border border-grey-200 bg-white p-5 shadow-sm transition hover:border-tertiary hover:shadow dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
          >
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-tertiary text-white">
                ◎
              </span>
              <h2 className="text-lg font-bold text-grey-900 group-hover:text-tertiary dark:text-[var(--mh-fg)]">
                Industry report — objectives
              </h2>
            </div>
            <p className="mt-2 text-sm text-grey-600 dark:text-[var(--mh-muted)]">
              The objectives and evidence base for the next progress report&apos;s industry work: a
              synthesis of industrial decarbonisation pathways and roadmaps (including their
              investment timelines), a synthesis of the clean-tech industry&apos;s role in
              economy-wide decarbonisation, and the report objectives themselves. Key overview
              figures aggregate pathway, scenario (incl. IIASA AR6 ensemble) and investment data —
              and one Excel download carries every data point, the objectives, the scenarios and
              the exact link to the paper behind each number.
            </p>
            <span className="mt-3 inline-block text-sm font-semibold text-tertiary">
              Open the objectives →
            </span>
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
