'use client';

/**
 * Summer Prep — beta module M · 35 (password-gated; formerly M · 37).
 * -------------------------------------------------------------------
 * A protected workspace that bundles the industry & transport preparation for
 * the next progress report. Overview Industry and the Policy Gap Tracker
 * (formerly listed separately as M · 34 and M · 36) are folded in here as
 * sub-modules — their routes stay alive but they no longer appear as
 * stand-alone modules on the landing page. On top of them sit three
 * internal notes:
 *
 *   • Indicator Check — what has moved, data-wise, since the last report.
 *   • Synergies & trade-offs (mitigation ↔ adaptation) for industry & transport.
 *   • Policy gaps for transport & industry (extends the Policy Gap Tracker).
 *
 * Everything sits behind the shared SummerPrepGate passphrase.
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import SummerPrepGate from '@/components/SummerPrepGate';

interface SubModule {
  href: string;
  title: string;
  badge: string;
  icon: string;
  accent: string;
  blurb: string;
  cta: string;
  external?: boolean;
}

const COMBINED: SubModule[] = [
  {
    href: '/beta/overview-industry',
    title: 'Overview Industry',
    badge: 'Sub-module 1 · was M · 34',
    icon: '⚙',
    accent: '#004B7F',
    blurb:
      'The cross-cutting industry surface — the clean-tech emissions wheel (NACE Section C → subsectors → levers with cost, readiness and real investment decisions), the input–output trade-flows map with its import-dependency risk layer, the Downstream review of lead-market policies (procurement, quotas, CBAM) on the five Better Regulation criteria, and the industry-report objectives page (roadmap & clean-tech syntheses with a fully sourced Excel download).',
    cta: 'Open Overview Industry',
    external: true,
  },
  {
    href: '/beta/policy-gaps',
    title: 'Policy Gap Tracker',
    badge: 'Sub-module 2 · was M · 36',
    icon: '▤',
    accent: '#B83230',
    blurb:
      'Every policy, ambition and implementation gap and inconsistency the Board identified across all 12 report chapters — editable, filterable and exportable to Excel, with the verbatim report quote and page behind each finding.',
    cta: 'Open Policy Gap Tracker',
    external: true,
  },
];

const NOTES: SubModule[] = [
  {
    href: '/beta/summer-prep/indicator-check',
    title: 'Indicator Check',
    badge: 'Note 1 · all sectors',
    icon: '📈',
    accent: '#007B6C',
    blurb:
      'What has moved, data-wise, since the last report? A dashboard over the old report’s progress indicators (the Policy Gap 2.0 indicator database) showing the latest two–three data points added since publication and flagging where a sector has meaningfully improved or slipped.',
    cta: 'Open the indicator dashboard',
  },
  {
    href: '/beta/summer-prep/synergies-tradeoffs',
    title: 'Synergies & Trade-offs — Mitigation ↔ Adaptation',
    badge: 'Note 2 · industry & transport',
    icon: '⇄',
    accent: '#6667AB',
    blurb:
      'A literature note mapping, subsector by subsector (kept in the report’s own structure), where cutting emissions also builds climate resilience — and where it works against it, or where an adaptation need pushes emissions back up.',
    cta: 'Open the synergies note',
  },
  {
    href: '/beta/summer-prep/policy-gaps-sectors',
    title: 'Policy Gaps — Transport & Industry',
    badge: 'Note 3 · extends the gap tracker',
    icon: '◍',
    accent: '#FF9933',
    blurb:
      'Takes the transport- and industry-tagged gaps and asks: do they still exist after the legislation adopted since the report? Where are candidates for additional gaps? Plus a per-sector, per-subsector map of the gap landscape.',
    cta: 'Open the sector gap note',
  },
];

function Card({ m }: { m: SubModule }) {
  const inner = (
    <>
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
          <h3 className="text-[16px] font-bold leading-tight text-[#3D5265] dark:text-[var(--mh-fg)]">
            {m.title}
          </h3>
        </div>
      </div>
      <p className="mt-3 text-[13px] leading-relaxed text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
        {m.blurb}
      </p>
      <span
        className="mt-4 inline-flex items-center gap-1 text-[13px] font-semibold"
        style={{ color: m.accent }}
      >
        {m.cta} →
      </span>
    </>
  );

  const className =
    'group block rounded-xl border border-[#E6E7E8] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)]';

  return (
    <Link href={m.href} className={className}>
      {inner}
    </Link>
  );
}

export default function SummerPrepPage() {
  return (
    <SummerPrepGate>
      <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
        <SiteHeader />
        <PageHero
          title="Summer Prep"
          subtitle={
            <>
              A protected working space for the industry &amp; transport preparation ahead of the
              next progress report. Two existing modules are bundled here as sub-modules; three new
              internal notes sit alongside them.
            </>
          }
        >
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FF9933]/15 px-2.5 py-1 text-[11px] font-semibold text-[#B26A00] dark:text-[#FF9933]">
            🔓 Unlocked for this session
          </span>
        </PageHero>

        <main className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
          <section aria-labelledby="combined-h">
            <h2
              id="combined-h"
              className="mb-1 text-[13px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]"
            >
              Combined modules
            </h2>
            <p className="mb-4 text-[13px] text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
              Two former stand-alone modules now living inside this workspace — open in place, then
              use the back control to return here.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {COMBINED.map((m) => (
                <Card key={m.href} m={m} />
              ))}
            </div>
          </section>

          <section aria-labelledby="notes-h" className="mt-10">
            <h2
              id="notes-h"
              className="mb-1 text-[13px] font-bold uppercase tracking-wide text-[#3D5265] dark:text-[var(--mh-fg)]"
            >
              New internal notes
            </h2>
            <p className="mb-4 text-[13px] text-[#3D5265]/70 dark:text-[var(--mh-muted)]">
              Built for this prep cycle, grounded in the old report’s structure and data.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {NOTES.map((m) => (
                <Card key={m.href} m={m} />
              ))}
            </div>
          </section>

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
    </SummerPrepGate>
  );
}
