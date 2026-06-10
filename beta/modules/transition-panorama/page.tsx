'use client';

/**
 * EU Transition Panorama — beta module page.
 *
 * A Panorama-style (panorama-sweden.com) radial visualisation of the EU's
 * climate transition: where emissions stand by sector and subsector, how
 * far the Fit-for-55 benchmarks and the Advisory Board's AR6-based 2040
 * advice scenarios require them to fall, and which transition levers the
 * progress report tracks for each sector.
 *
 * Heavy D3 work lives in `src/components/TransitionPanorama.tsx` and is
 * loaded client-side only.
 */

import dynamic from 'next/dynamic';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const TransitionPanorama = dynamic(() => import('@/components/TransitionPanorama'), {
  ssr: false,
  loading: () => (
    <div className="h-[640px] rounded-lg border border-grey-200 bg-grey-50 flex items-center justify-center text-tertiary text-sm">
      Loading panorama…
    </div>
  ),
});

export default function TransitionPanoramaPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <section className="mb-8">
          <div className="text-[11px] uppercase tracking-[0.12em] text-tertiary mb-2">
            Beta module · AR6-based ESABCC 2040 advice scenarios
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-tertiary-dark">
            EU Transition Panorama
          </h1>
          <p className="mt-2 text-sm sm:text-base text-tertiary max-w-3xl">
            One picture of the EU&apos;s climate transition: every sector and subsector of
            the European Climate Law scope, sized by today&apos;s emissions and set against
            the 2030 benchmarks and the Advisory Board&apos;s 2040 advice range derived from
            1.5&nbsp;°C-compatible pathways in the IPCC AR6 scenario database. Inspired by
            Sweden&apos;s Panorama tool.
          </p>
        </section>
        <TransitionPanorama />
      </main>
      <SiteFooter />
    </>
  );
}
