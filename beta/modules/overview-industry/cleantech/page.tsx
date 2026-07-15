'use client';

/**
 * Overview Industry — Clean Tech.
 * -------------------------------
 * TWO sides of one story, as two sub-segments of the module:
 *
 *   Side 1 — INSIDE industry (the emitting subsectors): a collapsible sunburst
 *   of EU manufacturing emissions (NACE Rev. 2.1 Section C only), centre →
 *   divisions → subsectors → decarbonisation levers, with a connected detail
 *   panel carrying each lever's marginal abatement cost, readiness, barriers,
 *   scale and investment decisions. Data: `../cleantech-catalogue.ts`.
 *
 *   Side 2 — OUTSIDE industry (the external role of clean tech): the NEW
 *   manufacturing industries — solar PV, wind turbines, batteries, EVs,
 *   electrolysers, heat pumps — and how their products decarbonise the OTHER
 *   sectors (power, transport, buildings, industry, agriculture), evidenced
 *   with mitigation potentials, the sectoral pathways of the Commission's
 *   2040-target impact assessment, and the EU's manufacturing position —
 *   surfacing a priority & competitiveness read. Data:
 *   `../cleantech-external-role.ts`.
 *
 * Every value on both sides is sourced. Everything exports to ONE Excel
 * handover workbook (./export.ts) — both sides, findings, project pipeline,
 * reading list and sources included.
 */

import { useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { MANUFACTURING_SECTION } from '../cleantech-catalogue';
import EmissionsSunburst from './EmissionsSunburst';
import ExternalRolePanel from './ExternalRolePanel';
import { exportCleanTechWorkbook } from './export';

type Side = 'inside' | 'outside';

const SIDES: { id: Side; k: string; label: string; sub: string }[] = [
  {
    id: 'inside',
    k: '1',
    label: 'Inside industry — the emitting subsectors',
    sub: 'Where today’s industrial emissions sit and the levers that remove them (the emissions wheel)',
  },
  {
    id: 'outside',
    k: '2',
    label: 'Outside industry — the external role of clean tech',
    sub: 'How the new clean-tech industries decarbonise the other sectors — and the priority / competitiveness read',
  },
];

export default function CleanTechPage() {
  const [exporting, setExporting] = useState(false);
  const [side, setSide] = useState<Side>('inside');

  const onExport = async () => {
    setExporting(true);
    try {
      await exportCleanTechWorkbook();
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
          <span className="text-grey-700 dark:text-[var(--mh-muted)]">Clean Tech</span>
        </nav>

        <header className="mb-6">
          <div className="flex items-center gap-2">
            <span className="rounded bg-accent-orange px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
              Beta
            </span>
            <span className="rounded border border-primary-lighter bg-surface-blue px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary dark:border-[var(--mh-border)] dark:bg-[var(--mh-bg)]">
              NACE C · Manufacturing
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-grey-900 dark:text-[var(--mh-fg)]">
            Clean Tech — two sides of industrial decarbonisation
          </h1>
          <p className="mt-2 max-w-text text-grey-700 dark:text-[var(--mh-muted)]">
            One module, two complementary sub-segments. <strong>Side&nbsp;1</strong> looks <em>inside</em> industry:
            EU manufacturing (NACE Rev. 2.1 Section&nbsp;C, divisions {MANUFACTURING_SECTION.divisionRange}) as a
            collapsible emissions sunburst — the sector total decomposing into divisions, subsectors and their
            decarbonisation levers, each with sourced abatement cost, readiness, barriers and investment decisions,
            plus the clean-tech vs old-tech overlay — plus a dedicated section for the cross-cutting enablers
            (electrification, CO₂ transport &amp; storage, hydrogen, circularity) that sit outside the manufacturing
            tree but underpin it. <strong>Side&nbsp;2</strong> turns the telescope around and looks{' '}
            <em>outside</em>: the new clean-tech manufacturing industries — solar PV, wind, batteries, EVs,
            electrolysers, heat pumps — and how their products decarbonise everyone <em>else</em> (power, transport,
            buildings, other industry, agriculture), evidenced with sourced mitigation potentials and the sectoral
            2040 pathways of the Commission&apos;s impact assessment, ending in a flagged priority &amp;
            competitiveness read. Every data point on both sides carries a source link — nothing is invented.
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
              13 sheets, both sides: read-me · overview · subsectors · technologies (MAC / TRL / clean-vs-old) ·
              projects &amp; FIDs · emissions map · sector MACC · external role (industries · support matrix ·
              2040 pathways · priority read) · reading list · sources
            </span>
          </div>
        </header>

        {/* side switcher */}
        <div className="mb-4 grid gap-2 sm:grid-cols-2">
          {SIDES.map((s) => {
            const active = side === s.id;
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => setSide(s.id)}
                aria-pressed={active}
                className={`rounded-xl border p-3.5 text-left transition ${
                  active
                    ? 'border-primary bg-surface-blue shadow-sm dark:bg-[var(--mh-bg)]'
                    : 'border-grey-200 bg-white hover:border-primary-lighter hover:bg-grey-50 dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] dark:hover:bg-[var(--mh-bg)]'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 flex-none items-center justify-center rounded-full text-[12px] font-bold ${
                      active ? 'bg-primary text-white' : 'bg-grey-200 text-grey-600 dark:bg-[var(--mh-border)] dark:text-[var(--mh-muted)]'
                    }`}
                  >
                    {s.k}
                  </span>
                  <span className={`text-[13.5px] font-bold ${active ? 'text-primary' : 'text-grey-900 dark:text-[var(--mh-fg)]'}`}>
                    {s.label}
                  </span>
                </div>
                <p className="mt-1 pl-8 text-[11.5px] leading-snug text-grey-600 dark:text-[var(--mh-muted)]">{s.sub}</p>
              </button>
            );
          })}
        </div>

        <section className="rounded-xl border border-grey-200 bg-white p-4 shadow-sm dark:border-[var(--mh-border)] dark:bg-[var(--mh-card)] sm:p-5">
          {side === 'inside' ? <EmissionsSunburst /> : <ExternalRolePanel />}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
