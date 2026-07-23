'use client';

/**
 * Summer Prep — beta module M · 35 (formerly M · 37).
 * ----------------------------------------------------
 * A workspace that bundles the industry & transport preparation for
 * the next progress report into TWO modules:
 *
 *   1. Industry Report      — the former Overview Industry module (M · 34):
 *                             clean-tech emissions wheel, trade flows,
 *                             Downstream lead-market review and the
 *                             industry-report objectives page.
 *   2. Policy Gap 2.0 Report — the former Policy Gap Tracker (M · 36) plus
 *                             the three internal notes built for this prep
 *                             cycle (Indicator Check, Synergies & trade-offs,
 *                             Policy gaps — transport & industry), which now
 *                             live inside this module.
 *
 * The folded-in routes stay alive; they simply no longer appear as
 * stand-alone modules on the landing page.
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';

interface SubLink {
  href: string;
  title: string;
  tag?: string;
  desc: string;
  icon: string;
  accent: string;
}

interface PrepModule {
  href: string;
  title: string;
  badge: string;
  icon: string;
  accent: string;
  blurb: string;
  cta: string;
  contents: SubLink[];
  contentsLabel: string;
}

const MODULES: PrepModule[] = [
  {
    href: '/beta/overview-industry',
    title: 'Industry Report',
    badge: 'Module 1 · was M · 34 (Overview Industry)',
    icon: '⚙',
    accent: '#004B7F',
    blurb:
      'The cross-cutting industry surface for the next report’s industry chapter — evidence catalogue, trade dependencies, demand-side policy review and the report objectives themselves.',
    cta: 'Open the Industry Report',
    contentsLabel: 'Inside this module',
    contents: [
      {
        href: '/beta/overview-industry/cleantech',
        title: 'Clean Tech',
        desc: 'The collapsible emissions wheel of EU manufacturing (NACE Section C → subsectors → levers with cost, readiness and real investment decisions).',
        icon: '⚙',
        accent: '#004B7F',
      },
      {
        href: '/beta/overview-industry/trade-flows',
        title: 'Trade flows',
        desc: 'The input–output map of EU-27 manufacturing trade with its critical-dependencies dashboard, on live Eurostat data.',
        icon: '⇄',
        accent: '#00928F',
      },
      {
        href: '/beta/overview-industry/downstream',
        title: 'Downstream',
        desc: 'The review of EU lead-market policies (procurement, quotas, CBAM) documented along the five Better Regulation criteria.',
        icon: '⬇',
        accent: '#6667AB',
      },
      {
        href: '/beta/overview-industry/report-objectives',
        title: 'Industry report — objectives',
        desc: 'Roadmap & clean-tech syntheses and the report objectives, with a fully sourced Excel download.',
        icon: '◎',
        accent: '#B87400',
      },
      {
        href: '/beta/summer-prep/optimization',
        title: 'Optimization',
        tag: 'Sector least-cost model',
        desc: 'A SEAMAPS-style least-cost optimization model (Julia/JuMP) of the EU energy-intensive subsectors — sourced cost & technology inputs in an Excel workbook, the fully commented solver code, built-in sensitivity runs and the key findings, all viewable and downloadable.',
        icon: '∑',
        accent: '#007B6C',
      },
    ],
  },
  {
    href: '/beta/policy-gaps',
    title: 'Policy Gap 2.0 Report',
    badge: 'Module 2 · was M · 36 + the internal notes',
    icon: '▤',
    accent: '#B83230',
    blurb:
      'Everything for the policy-gap work of the next report: the gap tracker seeded from the last report, plus the three internal notes built for this prep cycle.',
    cta: 'Open the Gap Tracker',
    contentsLabel: 'Inside this module',
    contents: [
      {
        href: '/beta/policy-gaps',
        title: 'Policy Gap Tracker',
        desc: 'Every policy, ambition and implementation gap and inconsistency the Board identified across all 12 report chapters — editable, filterable and exportable to Excel, with the verbatim report quote and page behind each finding.',
        icon: '▤',
        accent: '#B83230',
      },
      {
        href: '/beta/summer-prep/indicator-check',
        title: 'Indicator Check',
        tag: 'Note 1 · all sectors',
        desc: 'What has moved, data-wise, since the last report? A dashboard over the report’s progress indicators (the Policy Gap 2.0 indicator database) showing the latest data points added since publication and the change against the report baseline.',
        icon: '📈',
        accent: '#007B6C',
      },
      {
        href: '/beta/summer-prep/synergies-tradeoffs',
        title: 'Synergies & Trade-offs — Mitigation ↔ Adaptation',
        tag: 'Note 2 · industry & transport',
        desc: 'A literature note mapping, subsector by subsector, where cutting emissions also builds climate resilience — and where it works against it.',
        icon: '⇄',
        accent: '#6667AB',
      },
      {
        href: '/beta/summer-prep/policy-gaps-sectors',
        title: 'Policy Gaps — Transport & Industry',
        tag: 'Note 3 · extends the gap tracker',
        desc: 'Do the transport- and industry-tagged gaps still exist after the legislation adopted since the report? Where are candidates for additional gaps? Plus a per-sector, per-subsector map of the gap landscape.',
        icon: '◍',
        accent: '#FF9933',
      },
    ],
  },
];

function ModuleCard({ m }: { m: PrepModule }) {
  return (
    <section
      aria-label={m.title}
      className="flex flex-col rounded-xl border border-[#E6E7E8] bg-white p-5 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]"
    >
      <div className="flex items-center gap-2">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[18px] text-white"
          style={{ backgroundColor: m.accent }}
        >
          {m.icon}
        </span>
        <div>
          <div className="text-[10px] font-semibold uppercase tracking-wide text-[#54728C] dark:text-[var(--mh-muted)]">
            {m.badge}
          </div>
          <h3 className="text-[17px] font-bold leading-tight text-[#3D5265] dark:text-[var(--mh-fg)]">
            {m.title}
          </h3>
        </div>
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
        {m.blurb}
      </p>

      <Link
        href={m.href}
        className="mt-3 inline-flex items-center gap-1 text-[13px] font-semibold hover:underline"
        style={{ color: m.accent }}
      >
        {m.cta} →
      </Link>

      <div className="mt-4 border-t border-[#E6E7E8] pt-3 dark:border-[var(--mh-border)]">
        <div className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[#54728C] dark:text-[var(--mh-muted)]">
          {m.contentsLabel}
        </div>
        <ul className="space-y-2">
          {m.contents.map((s) => (
            <li key={`${m.href}-${s.href}`}>
              <Link
                href={s.href}
                className="group flex gap-2.5 rounded-lg border border-transparent p-2 transition hover:border-[#E6E7E8] hover:bg-[#F7F9FA] dark:hover:border-[var(--mh-border)] dark:hover:bg-[var(--mh-bg)]"
              >
                <span
                  aria-hidden
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-[14px] text-white"
                  style={{ backgroundColor: s.accent }}
                >
                  {s.icon}
                </span>
                <span className="min-w-0">
                  {s.tag && (
                    <span className="block text-[9px] font-semibold uppercase tracking-wide text-[#54728C] dark:text-[var(--mh-muted)]">
                      {s.tag}
                    </span>
                  )}
                  <span
                    className="block text-[13px] font-semibold leading-snug text-[#3D5265] group-hover:underline dark:text-[var(--mh-fg)]"
                    style={{ textDecorationColor: s.accent }}
                  >
                    {s.title}
                  </span>
                  <span className="mt-0.5 block text-[12px] leading-relaxed text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
                    {s.desc}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

export default function SummerPrepPage() {
  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Summer Prep"
        subtitle={
          <>
            A working space for the industry &amp; transport preparation ahead of the next
            progress report, organised in two modules: the <strong>Industry Report</strong> and
            the <strong>Policy Gap 2.0 Report</strong> — the three internal notes built for this
            prep cycle live inside the Policy Gap 2.0 Report.
          </>
        }
      />

      <main className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {MODULES.map((m) => (
            <ModuleCard key={m.href} m={m} />
          ))}
        </div>

        <p className="mt-10 max-w-3xl text-[12px] leading-relaxed text-[#3D5265]/55 dark:text-[var(--mh-muted)]">
          Provenance: the Indicator Check reads the report’s own progress indicators live from
          the Policy Gap 2.0 Project Workspace indicator database (it shows nothing that is not
          also in the workspace); the
          synergies and sector-gap notes are literature- and report-grounded working drafts, with
          AI-compiled framing flagged as pending verification inside each note. The synergies
          note’s citations were source-verified (Crossref/publisher records) in July 2026.
          Nothing here is a Board position.
        </p>
      </main>

      <SiteFooter />
    </div>
  );
}
