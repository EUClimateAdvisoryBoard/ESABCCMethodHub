'use client';

/**
 * Overview Industry — Trade flows.
 * --------------------------------
 * An input–output view of EU-27 manufacturing trade (NACE Rev. 2 Section C,
 * divisions 10–33): for every division, where the EU imports from and exports
 * to, the intra-EU vs extra-EU split, the imported-intermediate-input mix
 * straight out of the EU input–output use table, the origin countries of
 * those imports (FIGARO), the foreign value added embedded in exports, and
 * the high-risk dependency hotspots where a single foreign supplier
 * dominates. One interactive figure (`TradeFlowExplorer`) with five linked
 * views — the fifth being the full methodology. Statistical layers regenerate
 * live from the Eurostat API (`scripts/fetch-trade-flows-io-data.mjs`);
 * dependency figures are sourced to the EC/JRC strategic-dependency reviews
 * and the Critical Raw Materials Act. Every value is linked.
 */

import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TradeFlowExplorer from './TradeFlowExplorer';

export default function TradeFlowsPage() {
  return (
    <div className="min-h-screen bg-grey-50">
      <SiteHeader />

      <main className="mx-auto max-w-wide px-4 py-8">
        <nav className="mb-4 text-sm text-grey-500">
          <Link href="/beta/overview-industry" className="hover:underline">
            Overview Industry
          </Link>
          <span className="mx-1">/</span>
          <span className="text-grey-700">Trade flows</span>
        </nav>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded border border-primary-lighter bg-surface-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              NACE C · Manufacturing
            </span>
            <span className="rounded bg-grey-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
              Live Eurostat data · IO tables
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900">
            Trade flows — the input–output map of EU manufacturing
          </h1>
          <p className="mt-2 max-w-text text-grey-700">
            An input–output reading of EU-27 manufacturing trade (NACE Rev. 2 Section&nbsp;C, divisions
            10–33). For every division it shows the <span className="font-semibold">output</span> side —
            where the EU sells, intra-EU vs extra-EU, real destination shares — and the{' '}
            <span className="font-semibold">input</span> side at three depths: the imported-input mix
            straight out of the EU-27 <span className="font-semibold">input–output use table</span> (which
            products, how many € billion, what share of all inputs is imported), the origin countries of
            those imports from the <span className="font-semibold">FIGARO</span> inter-country input–output
            framework (incl. the foreign value added embedded in every euro of exports), and a curated
            critical-materials layer naming the feedstocks below the statistics&apos; radar. The last data
            view pulls out the <span className="font-semibold text-accent-red">high-risk hotspots</span>:
            where imports are both large and concentrated in a single supplier. Every number carries a
            source link, and the full method — datasets, attribution concepts, formulas, limits — is one
            click away in the <span className="font-semibold">Methodology</span> view.
          </p>
        </header>

        <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm sm:p-5">
          <TradeFlowExplorer />
        </section>

        <section className="mt-6 max-w-text text-sm text-grey-600">
          <h2 className="text-base font-bold text-grey-800">How to read this — the short version</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <span className="font-semibold">Three data layers, kept apart on purpose.</span> A trade
              backbone (Eurostat <code className="rounded bg-grey-100 px-1 text-[12px]">ext_tec01</code>,
              all 24 divisions, 2023 + 2024), an input–output layer (EU-27 use table + FIGARO, 2023), and a
              curated critical-materials layer (EC/JRC, &quot;as reported by&quot;).
            </li>
            <li>
              <span className="font-semibold">&quot;Imports of division X&quot; is not one number.</span>{' '}
              The backbone books trade to the enterprise&apos;s NACE code; the IO layer follows the product.
              C19 is the worked example — refiners import ~€218 bn of crude (enterprise view), but crude is
              a mining product, so the IO view shows it as an imported <em>input into</em> refining instead.
              The Methodology view walks through it.
            </li>
            <li>
              <span className="font-semibold">Import-reliance and supplier-concentration</span> figures in
              the risk and materials views are the EC/JRC assessments (criticality methodology), not customs
              arithmetic — quoted per source, with the formula documented.
            </li>
            <li>
              <span className="font-semibold">Reproducible:</span>{' '}
              <code className="rounded bg-grey-100 px-1 text-[12px]">
                node scripts/fetch-trade-flows-io-data.mjs
              </code>{' '}
              regenerates every statistical number on this page from the public Eurostat API.
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
