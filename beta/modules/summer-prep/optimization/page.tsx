'use client';

/**
 * Summer Prep · Industry Report — Optimization (placeholder).
 * -----------------------------------------------------------
 * Sector least-cost optimization model (Julia/JuMP, SEAMAPS-style) for the
 * EU energy-intensive subsectors. The full page — input-workbook viewer,
 * commented solver code, sensitivity results and downloads — lands in the
 * next commit; this placeholder keeps the route buildable meanwhile.
 */

import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';

export default function OptimizationPage() {
  return (
    <div className="min-h-screen bg-white text-[#3D5265] dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />
      <PageHero
        title="Optimization — sector least-cost model"
        subtitle="A SEAMAPS-style least-cost optimization of the EU energy-intensive industry subsectors. Content is being assembled — inputs, Julia code, sensitivity runs and findings will appear here."
      />
      <main className="mx-auto max-w-[1080px] px-4 py-8 sm:px-6">
        <p className="text-[13px] leading-relaxed text-[#3D5265]/75 dark:text-[var(--mh-muted)]">
          The model, its sourced Excel inputs and the sensitivity results are being finalised.
        </p>
      </main>
      <SiteFooter />
    </div>
  );
}
