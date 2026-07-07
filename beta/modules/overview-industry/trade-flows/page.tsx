'use client';

/**
 * Overview Industry — Trade flows.
 * --------------------------------
 * An input–output view of EU-27 manufacturing trade (NACE Rev. 2.1 Section C,
 * divisions 10–33): for every division, where the EU imports from and exports
 * to, the intra-EU vs extra-EU split, the granular imported inputs each supply
 * chain depends on, and the high-risk dependency hotspots where a single
 * foreign supplier dominates. One interactive figure (`TradeFlowExplorer`) with
 * four linked views. Trade backbone is REAL Eurostat data (ext_tec01, 2023);
 * dependency figures are sourced to the EC/JRC strategic-dependency reviews,
 * the Critical Raw Materials Act and OECD TiVA / FIGARO. Every value is linked.
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
              Live Eurostat data
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900">
            Trade flows — the input–output map of EU manufacturing
          </h1>
          <p className="mt-2 max-w-text text-grey-700">
            An input–output reading of EU-27 manufacturing trade (NACE Rev. 2.1 Section&nbsp;C, divisions
            10–33). For every division it shows the <span className="font-semibold">output</span> side — where
            the EU sells, intra-EU vs extra-EU — and the <span className="font-semibold">input</span> side —
            what it must import and from whom, down to the specific feedstocks, metals and materials each
            supply chain runs on. The trade backbone is live Eurostat data; the dependency layer sits on the
            Commission&apos;s strategic-dependency reviews, the Critical Raw Materials Act and OECD TiVA. The
            last view pulls out the <span className="font-semibold text-accent-red">high-risk hotspots</span>:
            where imports are both large and concentrated in a single supplier. Every number carries a source
            link — nothing is invented.
          </p>
        </header>

        <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm sm:p-5">
          <TradeFlowExplorer />
        </section>

        <section className="mt-6 max-w-text text-sm text-grey-600">
          <h2 className="text-base font-bold text-grey-800">How to read this — and its limits</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <span className="font-semibold">Trade values</span> (all 24 divisions) are real, from Eurostat{' '}
              <code className="rounded bg-grey-100 px-1 text-[12px]">ext_tec01</code> (Trade by NACE Rev.&nbsp;2
              activity), EU-27, 2023. This dataset attributes trade to the trading enterprise&apos;s NACE
              activity, not to the product — which is why C19 (refined petroleum) carries the imported-energy
              bill, and why totals differ from product/CN-based statistics.
            </li>
            <li>
              <span className="font-semibold">Partner shares</span> are a proxy: Eurostat publishes no partner
              breakdown at division level, so shares are taken from the SITC product section each division
              belongs to and flagged accordingly.
            </li>
            <li>
              <span className="font-semibold">Import-reliance and supplier-concentration</span> figures are the
              EC/JRC &quot;share of EU supply&quot; numbers; customs trade shares differ and are cross-checked
              in the sources. Foreign value added is OECD TiVA with the EU-27 treated as one economy (so
              intra-EU inputs count as domestic).
            </li>
            <li>
              It is a curated first build, meant to be mined for recurring dependency themes that inform CBAM,
              the Critical Raw Materials Act and industrial-strategy policy — not a live customs feed.
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
