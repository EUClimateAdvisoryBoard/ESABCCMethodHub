'use client';

import type { AnalysisMode } from '@/lib/content-analysis/types';

/**
 * Placeholder cards for the analysis modes that the brief marks as
 * "harder — depends on tool flexibility". Shipped so the scaffolding is
 * discoverable; no compute runs until we wire the data.
 */

const COPY: Record<Exclude<AnalysisMode, 'horizontal'>, { title: string; body: string; needs: string[] }> = {
  vertical: {
    title: 'Vertical policy coherence',
    body:
      'Aligns targets ↔ budgets ↔ implementation documents. Requires those document kinds to be attached to the project, with links between them.',
    needs: [
      'Attach budget and implementation documents to the project.',
      'Declare target-document links (this targets → that implements).',
      'Visualise as a sankey / alignment ladder (planned).',
    ],
  },
  longitudinal: {
    title: 'Longitudinal analysis (policy change)',
    body:
      'Requires a time-series of the same legal act. Use direct PDFs from EUR-Lex so different consolidated versions can be compared (not just the latest plaintext).',
    needs: [
      'Ingest successive CELEX versions via `supersedes` links.',
      'Diff segments of the same tag across versions.',
      'Plot tag-hit counts by adoption date.',
    ],
  },
  outcomes: {
    title: 'Policy outcomes (downstream)',
    body:
      'Not about the document text — about implementation and what follows. Cannot rely on text alone; needs indicators from Eurostat, EEA, national inventories.',
    needs: [
      'Join with the scenarios / Eurostat indicators pipeline.',
      'Map policy → target → indicator time-series.',
      'Flag gaps where a tagged target has no downstream indicator.',
    ],
  },
};

export function AnalysisPlaceholder({ mode }: { mode: Exclude<AnalysisMode, 'horizontal'> }) {
  const c = COPY[mode];
  return (
    <div className="border border-dashed border-[#B8BCC2] rounded-sm bg-[#FBFBFA] p-5 sm:p-6 max-w-3xl">
      <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#E87722] font-semibold">
        <span className="inline-block w-6 border-t border-[#E87722] align-middle mr-2" />
        Placeholder · tooling pending
      </p>
      <h3 className="mt-3 text-[18px] font-bold text-[#3D5265]">{c.title}</h3>
      <p className="mt-2 text-[13px] text-[#3D5265]/80 leading-relaxed">{c.body}</p>
      <ul className="mt-4 text-[12.5px] text-[#3D5265] space-y-1.5 list-disc pl-5">
        {c.needs.map(n => (<li key={n}>{n}</li>))}
      </ul>
    </div>
  );
}
