'use client';

import type { AiClassification, CodeNode } from '@/lib/content-analysis/types';

interface Props {
  classifications: AiClassification[];
  codes: CodeNode[];
  taggedAt?: string;
  /** Click an evidence block to scroll/select it in the document viewer. */
  onOpenBlock?: (blockId: string) => void;
  /** Promote a classification to a real `aiCodeIds` entry on the doc. */
  onAccept?: (codeId: string) => void;
}

/**
 * Right-panel list of AI-proposed master-code tags. Each row shows the
 * code, a confidence pill, the model's rationale, and clickable evidence
 * block pointers so the user can verify the claim before accepting it.
 */
export default function AiClassificationsList({
  classifications,
  codes,
  taggedAt,
  onOpenBlock,
  onAccept,
}: Props) {
  if (classifications.length === 0) {
    return (
      <div className="px-3 py-6 text-[12px] italic text-[#8A95A3]">
        No AI classifications yet. Ingest the PDF and run pre-tagging.
      </div>
    );
  }

  const codeById = new Map(codes.map(c => [c.id, c]));

  return (
    <div className="flex flex-col">
      {taggedAt && (
        <div className="px-3 py-1.5 border-b border-[#E6E7E8] bg-[#FBFBFA] font-mono text-[10px] tracking-[0.12em] uppercase text-[#8A95A3]">
          tagged · {new Date(taggedAt).toLocaleString()}
        </div>
      )}
      <ul className="divide-y divide-[#E6E7E8]">
        {classifications.map(c => {
          const code = codeById.get(c.codeId);
          if (!code) return null;
          return (
            <li key={c.codeId} className="px-3 py-2">
              <div className="flex items-start justify-between gap-2">
                <span
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-white px-1.5 py-0.5 rounded-sm"
                  style={{ backgroundColor: code.color }}
                >
                  {code.name}
                </span>
                <span
                  className="font-mono text-[10px] tabular-nums text-[#3D5265]/80"
                  title="model confidence"
                >
                  {(c.confidence * 100).toFixed(0)}%
                </span>
              </div>
              <p className="mt-1 text-[11.5px] text-[#3D5265]/90 leading-snug">
                {c.rationale}
              </p>
              {c.evidenceBlockIds.length > 0 && (
                <div className="mt-1.5 flex items-center gap-1 flex-wrap">
                  <span className="font-mono text-[9.5px] uppercase tracking-[0.1em] text-[#8A95A3]">
                    evidence:
                  </span>
                  {c.evidenceBlockIds.map(id => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => onOpenBlock?.(id)}
                      className="font-mono text-[10px] text-[#00928F] hover:text-[#006F6C] hover:underline"
                    >
                      {id.replace(/^block-[^-]+-/, '#')}
                    </button>
                  ))}
                </div>
              )}
              {onAccept && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => onAccept(c.codeId)}
                    className="text-[10.5px] font-medium text-[#E87722] hover:text-[#c45f14]"
                  >
                    Promote to document tag →
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
