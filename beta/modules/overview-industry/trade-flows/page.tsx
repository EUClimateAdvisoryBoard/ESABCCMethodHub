'use client';

/**
 * Overview Industry — Trade flows (placeholder).
 * ----------------------------------------------
 * Sibling sub-page to Clean Tech. Scope and data to be defined by the industry
 * lead — this is an intentional placeholder so the route and navigation exist.
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

export default function TradeFlowsPage() {
  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-content px-4 py-10">
        <nav className="mb-4 text-sm text-grey-500">
          <Link href="/beta/overview-industry" className="hover:underline">
            Overview Industry
          </Link>
          <span className="mx-1">/</span>
          <span className="text-grey-700">Trade flows</span>
        </nav>

        <div className="flex items-center gap-2">
          <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Beta
          </span>
          <span className="rounded bg-grey-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
            Placeholder
          </span>
        </div>
        <h1 className="mt-2 text-3xl font-bold text-grey-900">Trade flows</h1>
        <p className="mt-3 max-w-text text-grey-700">
          This sub-page will cover EU industrial trade flows — carbon-leakage exposure, CBAM sectors,
          and import/export dependencies for the energy-intensive industries mapped in{' '}
          <Link href="/beta/overview-industry/cleantech" className="text-primary hover:underline">
            Clean Tech
          </Link>
          . Scope and data are still to be defined; the industry lead will add details later.
        </p>

        <div className="mt-6 rounded-xl border border-dashed border-grey-300 bg-white p-6 text-sm text-grey-500">
          Nothing here yet — this is an intentional placeholder so the route and navigation exist.
          The same sourcing rule as Clean Tech will apply: every data point will carry a real source
          link.
        </div>
      </main>

      <SiteFooter />
    </div>
  );
}
