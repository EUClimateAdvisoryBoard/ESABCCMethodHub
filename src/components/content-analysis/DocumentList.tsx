'use client';

import type { AnalysisDocument, CodeNode } from '@/lib/content-analysis/types';
import { documentKindLabel } from '@/lib/content-analysis/source-tier';

interface Props {
  documents: AnalysisDocument[];
  codes: CodeNode[];
  selectedDocumentId: string | null;
  onSelect: (id: string) => void;
  /** Segment counts per document, for the badge on the right. */
  counts: Record<string, number>;
  /** Per-document set of block IDs that have at least one segment.
      When provided, the row shows a coverage progress ring (M·05 #7). */
  coveredBlocks?: Record<string, Set<string>>;
  /** When provided, each row exposes a remove control that takes the
      document out of this workspace's corpus (coded segments are kept). */
  onRemove?: (id: string) => void;
  /** Per-document overall-tag override (manual document-level tags). When a
      document id has an entry, its colour dots come from here instead of the
      AI baseline (`doc.aiCodeIds`). */
  overallTagsByDoc?: Record<string, string[]>;
}

/**
 * Top-left panel: corpus browser. Each row shows title + doc kind +
 * AI-assigned master codes as colour dots + segment count.
 */
export default function DocumentList({
  documents,
  codes,
  selectedDocumentId,
  onSelect,
  counts,
  coveredBlocks,
  onRemove,
  overallTagsByDoc,
}: Props) {
  const codeById = new Map(codes.map(c => [c.id, c]));

  if (documents.length === 0) {
    return (
      <div className="text-[12px] italic text-[#8A95A3] px-3 py-4">
        No documents in scope. Broaden the project filter.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-[#E6E7E8]">
      {documents.map(doc => {
        const isSelected = doc.id === selectedDocumentId;
        const totalBlocks = doc.blocks?.length ?? 0;
        const covered = coveredBlocks?.[doc.id]?.size ?? 0;
        const coverage = totalBlocks > 0 ? Math.min(1, covered / totalBlocks) : 0;
        return (
          <li key={doc.id} className="relative group">
            <button
              type="button"
              onClick={() => onSelect(doc.id)}
              className={`w-full text-left px-3 py-2 transition ${onRemove ? 'pr-8' : ''} ${
                isSelected ? 'bg-[#00928F]/10' : 'hover:bg-[#F3F4F6]'
              }`}
            >
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-mono text-[10px] tracking-[0.1em] uppercase text-[#8A95A3]">
                  {documentKindLabel(doc)}
                </span>
                <span className="flex items-center gap-1.5">
                  {/* Only flare when the doc is truly empty (no blocks AND
                      no usable text). A policy with shipped plaintext
                      but no PDF-sourced blocks still renders and can be
                      coded, so we stay quiet for it. */}
                  {(!doc.blocks || doc.blocks.length === 0) && (!doc.text || doc.text.trim().length < 200) && (
                    <span
                      title={
                        doc.sourceKind === 'reference'
                          ? 'Reference has no PDF yet — upload a PDF to analyse it'
                          : 'Document is empty — ingest from EUR-Lex or upload a PDF'
                      }
                      className="font-mono text-[9.5px] px-1 rounded-sm tracking-[0.05em] uppercase text-[#8A95A3] bg-[#F3F4F6]"
                    >
                      empty
                    </span>
                  )}
                  <span className="font-mono text-[10px] tabular-nums text-[#8A95A3]">
                    {counts[doc.id] ?? 0} seg
                  </span>
                  {/* Coverage ring (M·05 #7): goal-gradient pull through the
                      corpus. Only shows when the doc has blocks to begin with. */}
                  {totalBlocks > 0 && (
                    <span title={`${Math.round(coverage * 100)}% of paragraphs coded`} aria-label={`${Math.round(coverage * 100)} percent coverage`}>
                      <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden="true">
                        <circle cx="7" cy="7" r="5.5" fill="none" stroke="var(--mh-border)" strokeWidth="1.5" />
                        <circle
                          cx="7"
                          cy="7"
                          r="5.5"
                          fill="none"
                          stroke="var(--mh-status-primary)"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeDasharray={`${coverage * 2 * Math.PI * 5.5} ${2 * Math.PI * 5.5}`}
                          transform="rotate(-90 7 7)"
                        />
                      </svg>
                    </span>
                  )}
                </span>
              </div>
              <p className="mt-0.5 text-[12.5px] font-semibold text-[#3D5265] leading-tight line-clamp-2">
                {doc.shortTitle}
              </p>
              <div className="mt-1 flex items-center gap-1 flex-wrap">
                {(overallTagsByDoc?.[doc.id] ?? doc.aiCodeIds).slice(0, 6).map(id => {
                  const c = codeById.get(id);
                  if (!c) return null;
                  return (
                    <span
                      key={id}
                      title={c.name}
                      className="inline-flex items-center gap-0.5 text-[10px] text-[#3D5265]"
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-sm"
                        style={{ backgroundColor: c.color }}
                        aria-hidden
                      />
                      {c.name}
                    </span>
                  );
                })}
              </div>
            </button>
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(doc.id)}
                className="absolute top-1.5 right-1.5 text-[#B8BCC2] hover:text-[#B83230] text-[15px] leading-none px-1 rounded opacity-0 group-hover:opacity-100 focus:opacity-100 transition"
                aria-label={`Remove ${doc.shortTitle} from this workspace`}
                title="Remove from this workspace (coded segments are kept)"
              >
                ×
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
