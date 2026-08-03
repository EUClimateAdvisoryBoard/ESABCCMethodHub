/**
 * Report-page module — one page of a project's report, as a project tab.
 * ---------------------------------------------------------------------------
 * The Policy Gap 2.0 Report and the Industry Report are each a set of pages
 * under `/beta/…`. Rather than copy them into the workspace (two copies of the
 * same analysis is how they drift apart), this module carries the pointer: it
 * says what the page is, what a reader will find on it and where its numbers
 * come from, and opens the page itself.
 *
 * Content comes from `WORKSPACE_REPORT_PAGES`, keyed by module id. A module
 * whose id has no catalogue entry — someone renamed it, or a row was seeded by
 * hand — degrades to the module's own name and description rather than
 * rendering an empty tab.
 */
'use client';

import Link from 'next/link';
import { reportPage } from '@/data/workspace-report-pages';

interface Props {
  moduleId: string;
  moduleName: string;
  moduleDescription: string;
}

export default function ReportPageModule({ moduleId, moduleName, moduleDescription }: Props) {
  const page = reportPage(moduleId);

  if (!page) {
    return (
      <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 px-6 py-10">
        <p className="text-sm font-semibold text-tertiary-dark">{moduleName}</p>
        <p className="mt-1 text-xs text-tertiary leading-relaxed max-w-2xl">
          {moduleDescription || 'This report page has no entry in the report-page catalogue yet, so there is nothing to link to.'}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="rounded-xl border border-grey-200 bg-white overflow-hidden">
        <div className="flex items-start gap-3 border-b border-grey-200 px-5 py-4">
          <span
            aria-hidden
            className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[18px] text-white"
            style={{ backgroundColor: page.accent }}
          >
            {page.icon}
          </span>
          <div className="min-w-0">
            {page.tag && (
              <div className="text-[10px] font-semibold uppercase tracking-wide text-tertiary">
                {page.tag}
              </div>
            )}
            <h2 className="text-base font-bold text-tertiary-dark leading-tight">{moduleName}</h2>
            <p className="mt-1.5 text-sm text-tertiary leading-relaxed">{page.summary}</p>
          </div>
        </div>

        <div className="px-5 py-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-tertiary mb-2">
            What is on this page
          </div>
          <ul className="space-y-1.5">
            {page.highlights.map(h => (
              <li key={h} className="flex gap-2 text-[13px] text-tertiary-dark leading-relaxed">
                <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: page.accent }} />
                <span>{h}</span>
              </li>
            ))}
          </ul>

          {page.provenance && (
            <p className="mt-4 border-t border-grey-200 pt-3 text-[12px] leading-relaxed text-tertiary">
              <span className="font-semibold text-tertiary-dark">Provenance. </span>
              {page.provenance}
            </p>
          )}

          <Link
            href={page.href}
            className="mt-4 inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-semibold text-white transition hover:opacity-90"
            style={{ backgroundColor: page.accent }}
          >
            Open {moduleName}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
          <p className="mt-2 text-[11px] text-tertiary">
            Opens the page itself at <code className="text-[10px]">{page.href}</code> — the workspace links to it
            rather than holding a second copy.
          </p>
        </div>
      </div>
    </div>
  );
}
