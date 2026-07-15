'use client';

/**
 * Overview Industry — Trade flows.
 * --------------------------------
 * An input–output view of EU-27 manufacturing trade (NACE Rev. 2 Section C,
 * divisions 10–33), organised as ONE summary dashboard (Overview), a
 * critical-dependencies dashboard (every curated import dependency in one
 * sortable register, aggregated by supplier country and NACE division) plus a
 * division deep-dive: pick one Section C division and see all its information
 * in one place — trade balance and split, the imported-intermediate-input mix
 * straight out of the EU input–output use table, import origins and export
 * destinations (FIGARO), foreign value added in exports, curated critical
 * inputs, and the division's own import dependencies. The full FIGARO inter-country
 * input–output table itself is imported into the MethodHub and explorable at
 * ./figaro (table viewer + analysis dashboard). Statistical layers regenerate
 * from the Eurostat API (`scripts/fetch-trade-flows-io-data.mjs`,
 * `scripts/fetch-figaro-io-dataset.mjs`); dependency figures are sourced to
 * the EC/JRC strategic-dependency reviews and the Critical Raw Materials Act.
 * Every value is linked. Everything on this page exports to ONE Excel handover
 * workbook (./export.ts) — backbone, IO layers, dependency layers and sources.
 */

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import TradeFlowExplorer from './TradeFlowExplorer';
import { exportTradeFlowsWorkbook, SHEET_NAMES } from './export';

export default function TradeFlowsPage() {
  const [exporting, setExporting] = useState(false);

  const onExport = async () => {
    setExporting(true);
    try {
      await exportTradeFlowsWorkbook();
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-screen bg-grey-50 dark:bg-[var(--mh-bg)] dark:text-[var(--mh-fg)]">
      <SiteHeader />

      <main className="mx-auto max-w-wide px-4 py-8">
        <nav className="mb-4 text-sm text-grey-500 dark:text-[var(--mh-muted)]">
          <Link href="/beta/overview-industry" className="hover:underline">
            Overview Industry
          </Link>
          <span className="mx-1">/</span>
          <span className="text-grey-700 dark:text-[var(--mh-muted)]">Trade flows</span>
        </nav>

        <header className="mb-6">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-[#7A4400] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded border border-primary-lighter bg-surface-blue dark:bg-primary/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
              NACE C · Manufacturing
            </span>
            <span className="rounded bg-grey-200 dark:bg-[var(--mh-border)] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-tertiary">
              Live Eurostat data · IO tables
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900 dark:text-[var(--mh-fg)]">
            Trade flows — the input–output map of EU manufacturing
          </h1>
          <p className="mt-2 max-w-text text-grey-700 dark:text-[var(--mh-muted)]">
            An input–output reading of EU-27 manufacturing trade (NACE Rev. 2 Section&nbsp;C, divisions
            10–33). The <span className="font-semibold">Overview</span> is one summary
            dashboard: headline facts, the imports-vs-exports balance of all 24 divisions, the
            import-dependency map of the inputs where imports are both large and concentrated in a single
            supplier, and the critical-materials board. The{' '}
            <span className="font-semibold">Dependencies dashboard</span> pulls every curated critical
            trade dependency — materials, strategic product families, energy — into one sortable register,
            aggregated by supplier country and by NACE division. From there, pick
            any division for the <span className="font-semibold">deep-dive</span>: its trade balance and
            intra/extra-EU split, the imported-input mix straight out of the EU-27{' '}
            <span className="font-semibold">input–output use table</span>, import origins and export
            destinations from the <span className="font-semibold">FIGARO</span> inter-country input–output
            framework (incl. the foreign value added embedded in every euro of exports), its named critical
            inputs and its own import dependencies — all in one place. The full FIGARO table itself now{' '}
            <span className="font-semibold">lives on the MethodHub</span>, with a table viewer and analysis
            dashboard one tab away. Every number carries a source link, and the full method — datasets,
            attribution concepts, formulas, limits — is one click away in the{' '}
            <span className="font-semibold">Methodology</span> view.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              onClick={onExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:opacity-60"
            >
              {exporting ? 'Building workbook…' : '⬇ Download handover workbook (.xlsx)'}
            </button>
            <span className="text-[12px] text-grey-500 dark:text-[var(--mh-muted)]">
              {SHEET_NAMES.length} sheets: {SHEET_NAMES.join(' · ')}
            </span>
          </div>
        </header>

        <section className="rounded-xl border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4 shadow-sm sm:p-5">
          <TradeFlowExplorer />
        </section>

        <section className="mt-6 max-w-text text-sm text-grey-600 dark:text-[var(--mh-muted)]">
          <h2 className="text-base font-bold text-grey-800 dark:text-[var(--mh-fg)]">How to read this — the short version</h2>
          <ul className="mt-2 list-disc space-y-1.5 pl-5">
            <li>
              <span className="font-semibold">Three data layers, kept apart on purpose.</span> A trade
              backbone (Eurostat <code className="rounded bg-grey-100 dark:bg-[var(--mh-bg)] px-1 text-[12px]">ext_tec01</code>,
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
              the dependency and materials views are the EC/JRC figures (criticality methodology), not
              customs arithmetic — quoted per source, with the formula documented.
            </li>
            <li>
              <span className="font-semibold">The data lives here.</span> The full FIGARO inter-country
              input–output table (~11 million cells) is imported into this repository and served from the
              MethodHub — see the <span className="font-semibold">FIGARO IO data</span> tab for the table
              viewer, the analysis dashboard and the JSON downloads.
            </li>
            <li>
              <span className="font-semibold">Reproducible:</span>{' '}
              <code className="rounded bg-grey-100 dark:bg-[var(--mh-bg)] px-1 text-[12px]">
                node scripts/fetch-trade-flows-io-data.mjs
              </code>{' '}
              regenerates every statistical number on this page from the public Eurostat API, and{' '}
              <code className="rounded bg-grey-100 dark:bg-[var(--mh-bg)] px-1 text-[12px]">
                node scripts/fetch-figaro-io-dataset.mjs
              </code>{' '}
              re-imports the full FIGARO table.
            </li>
          </ul>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
