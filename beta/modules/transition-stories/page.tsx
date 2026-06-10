'use client';

/**
 * Transition Stories — beta module page.
 *
 * A cinematic, scroll-driven data essay on the EU's path to climate
 * neutrality: real photography from the Advisory Board's own report
 * covers, scrollytelling charts that draw themselves, full-bleed parallax
 * chapters and 3D photo cards — all carrying the real EEA / ESABCC data
 * (emissions history, WAM projections, the 2040 advice corridor, sector
 * benchmarks and transition levers).
 */

import dynamic from 'next/dynamic';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const TransitionStories = dynamic(() => import('@/components/TransitionStories'), {
  ssr: false,
  loading: () => (
    <div className="h-[100svh] bg-[#0c1117] flex items-center justify-center text-white/60 text-sm">
      Loading the briefing…
    </div>
  ),
});

export default function TransitionStoriesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <TransitionStories />
      </main>
      <SiteFooter />
    </>
  );
}
