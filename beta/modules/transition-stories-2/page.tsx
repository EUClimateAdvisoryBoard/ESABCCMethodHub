'use client';

/**
 * Transition Stories 2 — beta module page.
 *
 * "Mind the Gap": a cinematic landing page for the Advisory Board's policy
 * gap report, "Towards EU climate neutrality: Progress, policy gaps and
 * opportunities" (2024). Builds on Transition Stories (M·22) with the same
 * data series, staged over real stock photography (Pexels licence) in an
 * oryzo.ai-inspired scroll: inertia-smoothed scrolly choreography, clip-path
 * image reveals, living animated scenes — flowing water, rising embers,
 * grazing cattle, a pedalling cyclist — and the 13 key recommendations.
 */

import dynamic from 'next/dynamic';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

const TransitionStories2 = dynamic(() => import('@/components/TransitionStories2'), {
  ssr: false,
  loading: () => (
    <div className="h-[100svh] bg-[#0f0c08] flex items-center justify-center text-[#f4ead8]/60 text-sm">
      Finding the gap…
    </div>
  ),
});

export default function TransitionStories2Page() {
  return (
    <>
      <SiteHeader />
      <main>
        <TransitionStories2 />
      </main>
      <SiteFooter />
    </>
  );
}
