'use client';

/**
 * ETS Review (beta module M·37) — hub.
 *
 * On 17 July 2026 the Commission published a single package with two halves: an
 * Electrification Action Plan and a review of the EU ETS (Phase 5, 2031–2040).
 * This module splits into the two matching submodules:
 *
 *   1. Electrification — the interactive least-cost model (what a given 2040
 *      electrification rate costs on a price-only path vs with demand-side
 *      measures). Route: /beta/ets-review/electrification.
 *   2. ETS reform — an overview of the most important proposed changes, each
 *      linked to where it is stated in the Commission's own communication of the
 *      proposal, plus the underlying assumptions and an uncertainty register.
 *      Route: /beta/ets-review/reform.
 *
 * This page is just the chooser between the two.
 */

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const C_TEAL = '#0D9488';
const C_NAVY = '#2E3E4C';

function Card({ href, kicker, title, blurb, points, cta, accent }: {
  href: string; kicker: string; title: string; blurb: string; points: string[]; cta: string; accent: string;
}) {
  return (
    <a href={href} className="group flex flex-col rounded-xl border border-grey-200 bg-white p-5 transition hover:border-primary hover:shadow-sm">
      <span className="text-[11px] font-semibold uppercase tracking-[0.1em]" style={{ color: accent }}>{kicker}</span>
      <h2 className="mt-1 text-xl font-bold text-tertiary-dark group-hover:text-primary">{title}</h2>
      <p className="mt-2 text-[13px] leading-relaxed text-tertiary">{blurb}</p>
      <ul className="mt-3 space-y-1.5">
        {points.map((p) => (
          <li key={p} className="flex items-start gap-2 text-[12.5px] text-tertiary-dark">
            <span className="mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: accent }} />{p}
          </li>
        ))}
      </ul>
      <span className="mt-4 inline-flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: accent }}>
        {cta}<span aria-hidden className="transition group-hover:translate-x-0.5">→</span>
      </span>
    </a>
  );
}

export default function EtsReviewHub() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
        <section className="mb-7">
          <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">
            Beta module · M · 37 · 17 July 2026 package
          </div>
          <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">ETS Review &amp; Electrification</h1>
          <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
            On <strong>17 July 2026</strong> the Commission tabled a single package with two halves — an{' '}
            <strong>Electrification Action Plan</strong> (make Europe the &ldquo;first electro-powered continent&rdquo;, indicative
            46% electrification by 2040) and a <strong>review of the EU ETS</strong> for Phase 5 (2031–2040), aligned with the
            −90% 2040 target. This module splits into the two matching submodules.
          </p>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <Card
            href="/beta/ets-review/electrification"
            accent={C_TEAL}
            kicker="Submodule 1 · Electrification"
            title="What does 46% electrification cost?"
            blurb="The interactive least-cost model behind the Electrification Action Plan: the carbon price needed to reach a 2040 electrification rate on a price-only path versus with a demand-side package — the gap is the shadow value of demand-side policy."
            points={[
              'Drive the assumptions with sliders (target, baseline, barriers, measures)',
              'Price-only ≈ €166/t vs with measures ≈ €55/t — the €111/t gap',
              'Supply curve, sector breakdown, physical outputs',
            ]}
            cta="Open the model"
          />
          <Card
            href="/beta/ets-review/reform"
            accent={C_NAVY}
            kicker="Submodule 2 · ETS reform"
            title="The ETS reform — what's proposed"
            blurb="An overview of the most important proposed changes to the carbon market, each linked to where it is stated in the Commission's own communication of the proposal — plus the underlying technical assumptions and an uncertainty register."
            points={[
              'Every key change → its line in the press release, Q&A and COM(2026) 616',
              'Cap trajectory (LRF 3.7% → 1.7%), MSR, removals, free allocation, IDB',
              'Filterable register of the uncertainties and ambiguities',
            ]}
            cta="Open the overview"
          />
        </section>

        <section className="mt-6">
          <div className="rounded-md bg-surface-blue px-4 py-3 text-[12px] leading-relaxed text-tertiary">
            <strong className="text-tertiary-dark">Sources.</strong> Commission press release{' '}
            <a href="https://ec.europa.eu/commission/presscorner/detail/en/ip_26_1596" className="underline hover:text-primary">IP/26/1596</a>,
            the ETS Directive proposal <strong>COM(2026) 616</strong>, the impact assessment{' '}
            <a href="https://climate.ec.europa.eu/publications/swd2026-616-impact-assessment_en" className="underline hover:text-primary">SWD(2026) 616</a>,
            and the Electrification Action Plan <strong>COM(2026) 595</strong> — all 17 July 2026.
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
