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
  /** Called when the user makes a selection but there is no active code.
   *  Lets the parent open the FloatingCodeToolbar so the user can pick or
   *  create a tag without the legacy "select a tag first" alert. */
  onSelectionWithoutCode?: (sel: { startChar: number; endChar: number; text: string; rect: DOMRect }) => void;
  /** In-document Ctrl+F search: case-insensitive substring; matches are
   *  wrapped in a yellow `<mark>` on top of any segment highlight. */
  searchQuery?: string;
  /** When set, matches are numbered and the Nth one (0-indexed) gets a
   *  brighter highlight + scrolls into view. */
  searchHitIndex?: number;
  /** Reports the total number of matches back to the parent so it can
   *  drive the prev/next nav and "N of M" counter. */
  onSearchMatchesChange?: (total: number) => void;
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
  onSelectionWithoutCode,
  searchQuery,
  searchHitIndex,
  onSearchMatchesChange,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);

  // Pre-compute every match offset for the in-document Ctrl+F search.
  // Recomputed only when the document text or query changes; keeps the
  // line renderer's per-line slice cheap (it just looks up offsets).
  const searchMatches = useMemo(() => {
    const q = (searchQuery ?? '').trim();
    if (q.length < 2 || !doc.text) return [] as Array<{ start: number; end: number }>;
    const text = doc.text;
    const lower = text.toLowerCase();
    const qLower = q.toLowerCase();
    const out: Array<{ start: number; end: number }> = [];
    let cursor = 0;
    while (true) {
      const idx = lower.indexOf(qLower, cursor);
      if (idx < 0) break;
      out.push({ start: idx, end: idx + q.length });
      cursor = idx + qLower.length;
      if (out.length > 5000) break; // hard cap on absurd queries
    }
    return out;
  }, [doc.text, searchQuery]);

  // Notify the parent of the match count so it can drive its own UI.
  // Effect (rather than render-time call) keeps React happy.
  useEffect(() => {
    onSearchMatchesChange?.(searchMatches.length);
  }, [searchMatches.length, onSearchMatchesChange]);

  // Scroll the active match into view whenever the index changes.
  useEffect(() => {
    if (searchHitIndex == null || searchMatches.length === 0) return;
    const root = containerRef.current;
    if (!root) return;
    const target = root.querySelector<HTMLElement>(
      `[data-search-match="${searchHitIndex}"]`,
    );
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [searchHitIndex, searchMatches.length]);

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
      // Modern flow: surface the floating toolbar so the user can pick an
      // existing tag or create a new one from the selection. Falls back
      // to the legacy alert when the parent hasn't migrated yet.
      if (onSelectionWithoutCode) {
        const rect = range.getBoundingClientRect();
        onSelectionWithoutCode({ startChar, endChar, text, rect });
        return;
      }
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
            {renderLineWithSpans(line, segments, codeById, highlightedSegmentId, searchMatches, searchHitIndex)}
          </span>
        </div>
        );
      })}
    </div>
  );
}

/** Render a line, wrapping segment ranges in coloured `<mark>` spans, and
 *  overlaying yellow Ctrl+F search-match highlights on top. */
function renderLineWithSpans(
  line: LineInfo,
  allSegments: CodedSegment[],
  codeById: Map<string, CodeNode>,
  highlightedSegmentId?: string | null,
  searchMatches?: Array<{ start: number; end: number }>,
  searchHitIndex?: number,
): React.ReactNode {
  // Find the search matches that intersect this line, paired with their
  // global index (so the active hit gets a brighter highlight).
  const lineMatches: Array<{ start: number; end: number; idx: number }> =
    searchMatches
      ? searchMatches
          .map((m, idx) => ({ ...m, idx }))
          .filter(m => m.start < line.endChar && m.end > line.startChar)
      : [];

  if (line.touching.length === 0 && lineMatches.length === 0) {
    return line.text || '​';
  }

  // Build the boundary set: line edges, every segment start/end, and every
  // search-match start/end. Then walk slice-by-slice and stack the right
  // wrappers on each piece.
  const boundaries = new Set<number>([line.startChar, line.endChar]);
  for (const seg of line.touching) {
    boundaries.add(Math.max(seg.startChar, line.startChar));
    boundaries.add(Math.min(seg.endChar, line.endChar));
  }
  for (const m of lineMatches) {
    boundaries.add(Math.max(m.start, line.startChar));
    boundaries.add(Math.min(m.end, line.endChar));
  }
  const sortedBounds = [...boundaries].sort((a, b) => a - b);
  const pieces: React.ReactNode[] = [];
  for (let i = 0; i < sortedBounds.length - 1; i++) {
    const from = sortedBounds[i];
    const to = sortedBounds[i + 1];
    if (from === to) continue;
    const slice = line.text.slice(from - line.startChar, to - line.startChar);
    const activeSegs = line.touching.filter(s => s.startChar <= from && s.endChar >= to);
    const activeMatch = lineMatches.find(m => m.start <= from && m.end >= to);

    let node: React.ReactNode = slice;
    if (activeSegs.length > 0) {
      // Pick the narrowest (most specific) one for background colour.
      const narrowest = [...activeSegs].sort(
        (a, b) => (a.endChar - a.startChar) - (b.endChar - b.startChar),
      )[0];
      const color = codeById.get(narrowest.codeId)?.color ?? '#8A95A3';
      const isHi = highlightedSegmentId && activeSegs.some(s => s.id === highlightedSegmentId);
      node = (
        <mark
          key={`seg-${from}-${to}`}
          style={{
            backgroundColor: `${color}${isHi ? '55' : '22'}`,
            borderBottom: `1.5px solid ${color}`,
            padding: '0 1px',
            borderRadius: 2,
          }}
        >
          {slice}
        </mark>
      );
    }

    if (activeMatch) {
      const isActive = activeMatch.idx === searchHitIndex;
      node = (
        <mark
          key={`hit-${from}-${to}`}
          data-search-match={activeMatch.idx}
          style={{
            backgroundColor: isActive ? '#FBBF24' : '#FEF3C7',
            outline: isActive ? '1.5px solid #B45309' : 'none',
            borderRadius: 2,
            padding: '0 1px',
          }}
        >
          {node}
        </mark>
      );
    }

    pieces.push(node);
  }
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
