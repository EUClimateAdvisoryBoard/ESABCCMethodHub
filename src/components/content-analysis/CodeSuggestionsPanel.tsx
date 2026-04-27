'use client';

import { useMemo } from 'react';
import type { CodeNode, CodeSuggestion } from '@/lib/content-analysis/types';
import ConfidenceDot, { levelFromScore } from '@/components/ui/ConfidenceDot';

interface Props {
  suggestions: CodeSuggestion[];
  codes: CodeNode[];
  /** Called when the user accepts a single suggestion. */
  onAccept: (suggestionId: string) => void;
  /** Called when the user rejects a single suggestion. */
  onReject: (suggestionId: string) => void;
  /** Called when the user accepts every pending suggestion. */
  onAcceptAll: () => void;
  /** Called when the user rejects every pending suggestion. */
  onRejectAll: () => void;
  /** Called when the user clicks a suggestion — the workbench scrolls
   *  the document viewer to the relevant block / offset. */
  onJump?: (suggestion: CodeSuggestion) => void;
}

/**
 * Track-changes-style review panel for AI-suggested code segments.
 *
 * The analyst reviews each quote and decides whether it becomes a real
 * coded segment (Accept) or is discarded (Reject). Suggestions are
 * rendered with a dashed border + muted background so they read
 * visually as "pending" rather than "committed" — mirroring track-
 * changes in Word.
 */
export default function CodeSuggestionsPanel({
  suggestions,
  codes,
  onAccept,
  onReject,
  onAcceptAll,
  onRejectAll,
  onJump,
}: Props) {
  const codesById = useMemo(() => {
    const map = new Map<string, CodeNode>();
    for (const c of codes) map.set(c.id, c);
    return map;
  }, [codes]);

  if (suggestions.length === 0) {
    return (
      <div className="px-3 py-4 text-[12px] italic text-[#8A95A3]">
        No pending AI suggestions. Click &ldquo;AI suggest tags&rdquo; in the document toolbar
        to propose tagged segments — you&apos;ll be able to accept or reject each one.
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className="flex items-center justify-between gap-2 px-3 py-1.5 border-b border-[#E6E7E8] bg-[#FBFBFA]">
        <span className="text-[11px] text-[#3D5265]">
          <strong>{suggestions.length}</strong> pending — review and accept or reject each one
        </span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onAcceptAll}
            className="text-[10.5px] font-medium text-white bg-[#16A34A] hover:bg-[#166534] px-2 py-0.5 rounded-sm"
            title="Accept every pending suggestion"
          >
            Accept all
          </button>
          <button
            type="button"
            onClick={onRejectAll}
            className="text-[10.5px] font-medium text-[#B83230] hover:text-[#8A1D1C] px-2 py-0.5"
            title="Discard every pending suggestion"
          >
            Reject all
          </button>
        </div>
      </div>
      <ul className="max-h-[50vh] overflow-y-auto divide-y divide-[#F3F4F6]">
        {suggestions.map(sugg => {
          const code = codesById.get(sugg.codeId);
          const color = code?.color ?? '#8A95A3';
          const pct = Math.round(sugg.confidence * 100);
          // M·05 #6: confidence-driven background tint — high-confidence
          // suggestions look closer to the committed segment colour, low-
          // confidence ones stay nearly transparent so the reviewer's eye
          // jumps to the trustworthy ones first. Dashed border on the
          // blockquote keeps the 'pending' read.
          const level = levelFromScore(sugg.confidence);
          const tintAlpha = level === 'high' ? '24' : level === 'medium' ? '14' : '08';
          return (
            <li
              key={sugg.id}
              className="px-3 py-2.5 border-l-2"
              style={{
                borderLeftColor: color,
                backgroundColor: `${color}${tintAlpha}`,
              }}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="inline-flex items-center text-[10.5px] font-medium text-white px-1.5 py-0.5 rounded-sm"
                  style={{ backgroundColor: color }}
                >
                  {code?.name ?? sugg.codeId}
                </span>
                <ConfidenceDot score={sugg.confidence} />
                <span className="font-mono text-[9.5px] text-[#8A95A3] mh-tnum">{pct}%</span>
                {sugg.blockId && (
                  <span className="font-mono text-[9.5px] text-[#8A95A3]">· {sugg.blockId}</span>
                )}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onAccept(sugg.id)}
                    className="text-[10.5px] font-medium text-white bg-[#16A34A] hover:bg-[#166534] px-1.5 py-0.5 rounded-sm"
                    title="Accept — create a real tagged segment"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onReject(sugg.id)}
                    className="text-[10.5px] font-medium text-[#B83230] hover:text-[#8A1D1C] px-1.5 py-0.5"
                    title="Reject — discard this suggestion"
                  >
                    Reject
                  </button>
                </div>
              </div>
              <blockquote
                onClick={() => onJump?.(sugg)}
                className={`text-[12px] leading-snug text-[#3D5265] border-l-2 pl-2 border-dashed ${
                  onJump ? 'cursor-pointer hover:bg-[#F3F4F6]' : ''
                }`}
                style={{ borderLeftColor: color }}
                title={onJump ? 'Jump to this passage in the document' : undefined}
              >
                &ldquo;{sugg.quote}&rdquo;
              </blockquote>
              {sugg.rationale && (
                <p className="mt-1 text-[11px] italic text-[#6B7280]">{sugg.rationale}</p>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
