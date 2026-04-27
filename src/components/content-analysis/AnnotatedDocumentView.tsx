'use client';

import { useEffect, useMemo, useRef } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';

interface Props {
  document: AnalysisDocument;
  segments: CodedSegment[];
  codes: CodeNode[];
  activeCodeId: string | null;
  onCreateSegment: (input: { startChar: number; endChar: number; text: string }) => void;
  onSelectSegment: (segmentId: string) => void;
  highlightedSegmentId?: string | null;
}

interface LineInfo {
  lineNumber: number;
  text: string;
  /** Inclusive start char in the original document text. */
  startChar: number;
  /** Exclusive end char. */
  endChar: number;
  /** Segments that touch this line, sorted by start. */
  touching: CodedSegment[];
}

/**
 * Centre panel: document viewer with line numbers and a bracket gutter
 * on the left margin for coded segments — mirrors the MAXQDA bracket
 * visualisation. Select text with the mouse to create a new segment
 * under the currently-active code.
 */
export default function AnnotatedDocumentView({
  document: doc,
  segments,
  codes,
  activeCodeId,
  onCreateSegment,
  onSelectSegment,
  highlightedSegmentId,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);

  const lines = useMemo<LineInfo[]>(() => {
    const out: LineInfo[] = [];
    const sorted = [...segments].sort((a, b) => a.startChar - b.startChar);
    const rawLines = doc.text.split('\n');
    let cursor = 0;
    rawLines.forEach((text, idx) => {
      const startChar = cursor;
      const endChar = cursor + text.length;
      const touching = sorted.filter(s => s.startChar < endChar && s.endChar > startChar);
      out.push({
        lineNumber: idx + 1,
        text,
        startChar,
        endChar,
        touching,
      });
      cursor = endChar + 1; // +1 for the stripped '\n'
    });
    return out;
  }, [doc.text, segments]);

  // Assign each overlapping segment a column in the bracket gutter so
  // nested codings render side-by-side rather than on top of each other.
  const bracketLanes = useMemo(() => {
    const sorted = [...segments].sort((a, b) => a.startChar - b.startChar || b.endChar - a.endChar);
    const lanes: CodedSegment[][] = [];
    const assignment = new Map<string, number>();
    for (const seg of sorted) {
      let laneIdx = 0;
      for (; laneIdx < lanes.length; laneIdx++) {
        const lane = lanes[laneIdx];
        const last = lane[lane.length - 1];
        if (!last || last.endChar <= seg.startChar) break;
      }
      if (!lanes[laneIdx]) lanes[laneIdx] = [];
      lanes[laneIdx].push(seg);
      assignment.set(seg.id, laneIdx);
    }
    return { laneCount: lanes.length, assignment };
  }, [segments]);

  // Scroll the gutter bracket for the highlighted segment into view when
  // it changes — lets the segments-list / tag badges act as "jump to" links.
  // Re-runs on `segments` too so cross-document jumps still scroll once the
  // new document's brackets mount.
  useEffect(() => {
    if (!highlightedSegmentId) return;
    const root = containerRef.current;
    if (!root) return;
    const target =
      root.querySelector<HTMLElement>(`[data-segment-id="${CSS.escape(highlightedSegmentId)}"]`);
    if (!target) return;
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightedSegmentId, segments]);

  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const container = containerRef.current;
    if (!container || !container.contains(range.commonAncestorContainer)) return;

    // Use data-char-offset on each line to map DOM selection → text offsets.
    const startInfo = offsetFromNode(range.startContainer, range.startOffset, container);
    const endInfo = offsetFromNode(range.endContainer, range.endOffset, container);
    if (startInfo == null || endInfo == null) return;
    const startChar = Math.min(startInfo, endInfo);
    const endChar = Math.max(startInfo, endInfo);
    if (endChar - startChar < 2) return;
    const text = doc.text.slice(startChar, endChar);
    if (!text.trim()) return;
    if (!activeCodeId) {
      alert('Select a tag in the left panel first — new segments are created under the active tag.');
      selection.removeAllRanges();
      return;
    }
    onCreateSegment({ startChar, endChar, text });
    selection.removeAllRanges();
  };

  const gutterWidth = Math.max(bracketLanes.laneCount, 1) * 10;

  return (
    <div
      ref={containerRef}
      onMouseUp={handleMouseUp}
      className="font-mono text-[12.5px] leading-[1.55] text-[#3D5265] whitespace-pre-wrap select-text"
    >
      {lines.map(line => {
        // Coverage heatmap intensity (M·05 #1): denser-coded lines get a
        // deeper teal stripe in the left margin so the reviewer sees at a
        // glance which paragraphs are over- or under-coded.
        const density = line.touching.length;
        const heatOpacity = density === 0 ? 0 : Math.min(0.55, 0.18 + density * 0.12);
        return (
        <div key={line.lineNumber} className="flex items-stretch group">
          {/* 4 px coverage-density stripe — pre-margin, before line numbers. */}
          <span
            aria-hidden="true"
            className="shrink-0 select-none"
            style={{ width: 4, backgroundColor: 'var(--mh-status-primary)', opacity: heatOpacity }}
            title={density > 0 ? `${density} segment${density === 1 ? '' : 's'} on this line` : undefined}
          />
          {/* Line number */}
          <span className="w-10 shrink-0 pr-2 pt-[1px] text-right text-[10.5px] tabular-nums text-[#B8BCC2] select-none">
            {line.lineNumber}
          </span>

          {/* Bracket gutter */}
          <div
            className="shrink-0 relative select-none"
            style={{ width: `${gutterWidth}px` }}
            aria-hidden
          >
            {line.touching.map(seg => {
              const lane = bracketLanes.assignment.get(seg.id) ?? 0;
              const code = codeById.get(seg.codeId);
              const color = code?.color ?? '#8A95A3';
              const isStart = seg.startChar >= line.startChar && seg.startChar < line.endChar;
              const isEnd = seg.endChar > line.startChar && seg.endChar <= line.endChar + 1;
              const isHighlighted = highlightedSegmentId === seg.id;
              return (
                <button
                  type="button"
                  key={seg.id}
                  data-segment-id={seg.id}
                  onClick={e => { e.stopPropagation(); onSelectSegment(seg.id); }}
                  title={`${code?.name ?? 'tag'} — "${seg.text.slice(0, 120)}"`}
                  className="absolute top-0 bottom-0 w-[6px] cursor-pointer"
                  style={{
                    left: `${lane * 10 + 1}px`,
                    backgroundColor: color,
                    opacity: isHighlighted ? 1 : 0.85,
                    borderTopLeftRadius: isStart ? 3 : 0,
                    borderTopRightRadius: isStart ? 3 : 0,
                    borderBottomLeftRadius: isEnd ? 3 : 0,
                    borderBottomRightRadius: isEnd ? 3 : 0,
                    outline: isHighlighted ? '1.5px solid #3D5265' : 'none',
                    outlineOffset: 1,
                  }}
                />
              );
            })}
          </div>

          {/* Text */}
          <span
            data-char-offset={line.startChar}
            className="flex-1 pl-2 border-l border-[#F0F1F2] py-[1px]"
          >
            {renderLineWithSpans(line, segments, codeById, highlightedSegmentId)}
          </span>
        </div>
        );
      })}
    </div>
  );
}

/** Render a line, wrapping segment ranges in coloured `<mark>` spans. */
function renderLineWithSpans(
  line: LineInfo,
  allSegments: CodedSegment[],
  codeById: Map<string, CodeNode>,
  highlightedSegmentId?: string | null,
): React.ReactNode {
  if (line.touching.length === 0) return line.text || '​';
  const pieces: React.ReactNode[] = [];
  let cursor = line.startChar;
  // Break the line at every segment start/end within it.
  const boundaries = new Set<number>([line.startChar, line.endChar]);
  for (const seg of line.touching) {
    boundaries.add(Math.max(seg.startChar, line.startChar));
    boundaries.add(Math.min(seg.endChar, line.endChar));
  }
  const sortedBounds = [...boundaries].sort((a, b) => a - b);
  for (let i = 0; i < sortedBounds.length - 1; i++) {
    const from = sortedBounds[i];
    const to = sortedBounds[i + 1];
    if (from === to) continue;
    const slice = line.text.slice(from - line.startChar, to - line.startChar);
    // Segments active at mid-point:
    const active = line.touching.filter(s => s.startChar <= from && s.endChar >= to);
    if (active.length === 0) {
      pieces.push(slice);
    } else {
      // Pick the narrowest (most specific) one for background colour.
      const narrowest = [...active].sort(
        (a, b) => (a.endChar - a.startChar) - (b.endChar - b.startChar),
      )[0];
      const color = codeById.get(narrowest.codeId)?.color ?? '#8A95A3';
      const isHi = highlightedSegmentId && active.some(s => s.id === highlightedSegmentId);
      pieces.push(
        <mark
          key={`${from}-${to}`}
          style={{
            backgroundColor: `${color}${isHi ? '55' : '22'}`,
            borderBottom: `1.5px solid ${color}`,
            padding: '0 1px',
            borderRadius: 2,
          }}
        >
          {slice}
        </mark>,
      );
    }
    cursor = to;
  }
  if (cursor < line.endChar) pieces.push(line.text.slice(cursor - line.startChar));
  return pieces;
}

/** Walk up from a text node to the enclosing `[data-char-offset]` line and
 *  convert the DOM offset to a document-wide char index. */
function offsetFromNode(node: Node, offset: number, root: HTMLElement): number | null {
  let el: Node | null = node;
  while (el && el !== root) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const base = (el as HTMLElement).getAttribute('data-char-offset');
      if (base != null) {
        // Offset within this line = textContent length up to the original node.
        const lineEl = el as HTMLElement;
        const walker = window.document.createTreeWalker(lineEl, NodeFilter.SHOW_TEXT);
        let acc = 0;
        let cur: Node | null = walker.nextNode();
        while (cur) {
          if (cur === node) return Number(base) + acc + offset;
          acc += (cur.textContent ?? '').length;
          cur = walker.nextNode();
        }
        return Number(base) + acc;
      }
    }
    el = el.parentNode;
  }
  return null;
}
