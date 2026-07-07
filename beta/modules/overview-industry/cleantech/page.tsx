'use client';

/**
 * Overview Industry — Clean Tech.
 * -------------------------------
 * ONE figure for the whole page: a collapsible sunburst of EU manufacturing
 * emissions (NACE Rev. 2.1 Section C only), centre → divisions → subsectors →
 * decarbonisation levers, with a connected detail panel carrying each lever's
 * marginal abatement cost, readiness, barriers, scale and investment decisions.
 * All data lives in `../cleantech-catalogue.ts`; every value is sourced.
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { MANUFACTURING_SECTION } from '../cleantech-catalogue';
import EmissionsSunburst from './EmissionsSunburst';

export default function CleanTechPage() {
  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-wide px-4 py-8">
        <nav className="mb-4 text-sm text-grey-500">
          <Link href="/beta/overview-industry" className="hover:underline">
            Overview Industry
          </Link>
          <span className="mx-1">/</span>
          <span className="text-grey-700">Clean Tech</span>
        </nav>

        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded border border-primary-lighter bg-surface-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              NACE C · Manufacturing
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900">
            Clean Tech — the manufacturing emissions wheel
          </h1>
          <p className="mt-2 max-w-text text-grey-700">
            One figure: EU manufacturing (NACE Rev. 2.1 Section&nbsp;C, divisions{' '}
            {MANUFACTURING_SECTION.divisionRange}) as a collapsible emissions sunburst. The centre is the sector total;
            the rings decompose it into NACE divisions, subsectors and their decarbonisation levers — every arc sized
            by sourced Mt CO₂, every level foldable so the figure combines upward to a single number and opens
            downward to each lever&apos;s marginal abatement cost, technology readiness, barriers, scale and real
            investment decisions. Every data point carries a source link — nothing is invented. A{' '}
            <strong>clean&nbsp;tech vs old&nbsp;tech</strong> overlay re-colours the levers to separate the near-zero
            routes from the incumbent-based transitional bridges (gas/&ldquo;blue&rdquo; hydrogen, blast-furnace CCS,
            fossil fuel-switching) — an analytical classification, clearly flagged, not a sourced datum.
          </p>
        </header>

        <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm sm:p-5">
          <EmissionsSunburst />
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
