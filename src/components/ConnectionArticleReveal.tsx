'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import type { Policy } from '@/lib/types';
import { extractArticleText } from '@/lib/article-extractor';
import { buildContentAnalysisUrl } from '@/lib/contentAnalysisLinks';

interface Props {
  policy: Policy;
  label: string;
  refs: string;
  /** Optional short note about the surrounding connection — used as the
   *  annotation body when jumping into the policy-text viewer. */
  citeContext?: string;
}

function splitRefs(refs: string): string[] {
  // Split on commas at parenthesis depth 0 so "Art. 1(5)(a)" stays intact.
  const parts: string[] = [];
  let depth = 0;
  let buf = '';
  for (const ch of refs) {
    if (ch === '(' || ch === '[') depth++;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      if (buf.trim()) parts.push(buf.trim());
      buf = '';
    } else {
      buf += ch;
    }
  }
  if (buf.trim()) parts.push(buf.trim());
  return parts;
}

export default function ConnectionArticleReveal({ policy, label, refs, citeContext }: Props) {
  const parts = useMemo(() => splitRefs(refs), [refs]);
  const [openRef, setOpenRef] = useState<string | null>(null);

  const active = openRef ? extractArticleText(policy, openRef) : null;

  // Build a deep link into the Content Analysis module. The `highlight`
  // param tells the workbench which passage to scroll to / flash on open;
  // `context` is shown as a small banner so the reader knows why they were
  // sent here (which connection surfaced this article).
  const deepLink = openRef
    ? buildContentAnalysisUrl({
        policyId: policy.id,
        article: openRef,
        context: citeContext
          ? `${label} ${openRef} — ${citeContext}`
          : `${label} ${openRef}`,
      })
    : null;

  return (
    <div className="w-full">
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[10px] text-grey-500">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="shrink-0">
          <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
          <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
        </svg>
        <span className="font-medium mr-0.5">{label}:</span>
        {parts.map(ref => {
          const isOpen = openRef === ref;
          return (
            <button
              key={ref}
              type="button"
              onClick={() => setOpenRef(isOpen ? null : ref)}
              aria-expanded={isOpen}
              title={isOpen ? `Hide text of ${ref}` : `Click to view exact text of ${ref}`}
              className={`px-1.5 py-0.5 rounded border text-[10px] font-medium transition ${
                isOpen
                  ? 'bg-secondary text-white border-secondary shadow-sm'
                  : 'bg-white border-grey-200 text-tertiary hover:border-secondary hover:text-secondary'
              }`}
            >
              {ref}
            </button>
          );
        })}
      </div>

      {openRef && active && (
        <div className="mt-2 rounded-md border border-grey-200 bg-grey-50">
          <div className="flex items-center justify-between px-3 py-1.5 border-b border-grey-200 bg-white rounded-t-md">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-grey-600">
              <span className="text-tertiary-dark">{policy.short_title}</span>
              <span className="mx-1.5 text-grey-300">/</span>
              <span>{active.label}</span>
            </p>
            <button
              type="button"
              onClick={() => setOpenRef(null)}
              className="text-grey-400 hover:text-tertiary-dark transition"
              aria-label="Close"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="p-3 max-h-80 overflow-y-auto">
            {active.found ? (
              <pre className="text-xs text-tertiary-dark whitespace-pre-wrap font-sans leading-relaxed m-0">
                {active.text}
              </pre>
            ) : (
              <div className="text-xs text-tertiary space-y-2">
                <p>{active.text}</p>
                {policy.eurlex_url && (
                  <a
                    href={policy.eurlex_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-secondary hover:underline font-medium"
                  >
                    Open on EUR-Lex
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3" />
                    </svg>
                  </a>
                )}
              </div>
            )}
          </div>
          {deepLink && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-t border-grey-200 bg-white rounded-b-md">
              <Link
                href={deepLink}
                className="inline-flex items-center gap-1 text-[10px] text-secondary hover:text-primary hover:underline font-medium"
                title={`Open ${policy.short_title} in the Content Analysis module, scroll to ${openRef}, and load the coding workbench`}
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
                  <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
                </svg>
                Open {openRef} in Content Analysis
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Link>
              <span className="text-[9px] text-grey-400 italic">opens the annotated workbench</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
