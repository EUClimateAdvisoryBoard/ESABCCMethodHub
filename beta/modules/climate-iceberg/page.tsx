'use client';

/**
 * EU Carbon Iceberg — beta module page.
 *
 * An illustrative 3D climate metaphor built on the real EU emissions
 * record: the Transition Panorama donut reimagined as a melting iceberg.
 * The tip above the waterline is "what we see"; each underwater facet is
 * one ECL sector sized by its real net emissions; emitters at the surface
 * blow CO₂ at the berg (the LULUCF forest absorbs it); and as cumulative
 * emissions grow, the water warms, the berg melts and the sea rises.
 *
 * Every number shown is real (EEA history, Member State WAM projections,
 * the ESABCC 2040-advice pathway, sectoral benchmarks and levers). The
 * melt rate, sea level and impact markers are explicitly illustrative.
 */

import { useState } from 'react';
import dynamic from 'next/dynamic';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { DetailPanel } from '@/components/TransitionPanorama';

const ClimateIceberg = dynamic(() => import('@/components/ClimateIceberg'), {
  ssr: false,
  loading: () => (
    <div className="h-[620px] rounded-xl border border-grey-200 bg-grey-50 flex items-center justify-center text-tertiary text-sm">
      Loading iceberg…
    </div>
  ),
});

export default function ClimateIcebergPage() {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <>
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-6">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · illustrative metaphor on real EEA / ESABCC data
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">
            EU Carbon Iceberg
          </h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            The Transition Panorama, melted into a metaphor: each underwater facet of the
            iceberg is one sector of the European Climate Law scope, sized by its real net
            emissions. Surface emitters blow CO₂ at the berg while the LULUCF forest absorbs
            it; as cumulative emissions grow the water warms, the ice melts and the sea
            rises. Scrub to 2050 and compare current Member State projections with the
            Advisory Board&apos;s AR6-based 2040 advice pathway — and see how much iceberg
            each future leaves behind.
          </p>
        </section>

        <section className="grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          <ClimateIceberg selectedId={selectedId} onSelect={setSelectedId} />
          <aside className="lg:sticky lg:top-24 bg-white border border-grey-200 rounded-lg p-4 sm:p-5 min-h-[420px]">
            <DetailPanel
              selectedId={selectedId}
              onSelect={setSelectedId}
              introTitle="How to read the iceberg"
              intro={
                <>
                  Each underwater facet is one sector of the European Climate Law scope,
                  sized by its real net emissions; the LULUCF facet is the sink that keeps
                  the berg alive. Surface emitters blow CO₂ at the ice while the forest
                  absorbs it. Click a facet or emitter to see the sector&apos;s trend,
                  benchmarks and transition levers — or press play and watch what each
                  scenario leaves of the iceberg by 2050.
                </>
              }
            />
          </aside>
        </section>

        <section className="mt-8 border-t border-grey-200 pt-5">
          <h2 className="text-[11px] uppercase tracking-wide text-tertiary mb-2">
            What is real, what is metaphor
          </h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-2 max-w-4xl">
            <div>
              <h3 className="text-[11.5px] font-semibold text-tertiary-dark">Real data</h3>
              <p className="text-[11.5px] text-tertiary leading-snug">
                Facet sizes and emitter strengths (sectoral net emissions, EEA GHG data
                viewer); annual and cumulative totals (EEA history to 2022, then Member
                State WAM projections or a pathway through the ESABCC 2040 advice midpoint
                to climate neutrality); the full sector detail panel with 2030/2040/2050
                benchmarks and transition levers.
              </p>
            </div>
            <div>
              <h3 className="text-[11.5px] font-semibold text-tertiary-dark">Illustrative metaphor</h3>
              <p className="text-[11.5px] text-tertiary leading-snug">
                The melt rate (ice mass is mapped from real cumulative emissions since 2005,
                scaled so the 2050 WAM reference loses about three quarters of the berg),
                the sea-level gauge, the water temperature tint and the impact markers.
                They visualise direction and proportion, not physical projections.
              </p>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
