'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import type {
  AnalysisDocument,
  Block,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';

// Same worker path the references module uses — copied by `postinstall`.
pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';

/** A raw text selection made on a rendered PDF page. The parent maps it to
 *  document character offsets and opens the tagging toolbar. */
export interface PdfTextSelection {
  text: string;
  page: number;
  /** Block the selection started in, if it could be hit-tested. */
  blockId: string | null;
  /** Exact selection rectangles in PDF user-space points (the same space as
   *  block bboxes), so the resulting segment highlights the real selected
   *  text rather than the whole enclosing block. */
  rects: number[][];
  /** Client rect of the selection, for anchoring the floating toolbar. */
  rect: DOMRect;
}

interface Props {
  document: AnalysisDocument;
  /** URL the browser can fetch from. Typically `/api/content-analysis/pdf?celex=…` */
  pdfSrcUrl: string;
  /** Secondary URL tried once if the primary fails to load. References use
   *  this to fall back from the durable storage proxy (which only knows
   *  references in the shared library store) to the freshly-ingested
   *  content-analysis cache — so a PDF that lives in only one of the two
   *  stores still renders instead of dead-ending on a 404. */
  fallbackSrcUrl?: string;
  segments: CodedSegment[];
  codes: CodeNode[];
  highlightedBlockId?: string | null;
  /** The coded segment currently selected in the sidebar. When it carries a
   *  precise PDF anchor we scroll to (and emphasise) that exact passage. */
  highlightedSegmentId?: string | null;
  /** Fired when the user selects text directly on a page, so the parent can
   *  open the tag picker and create a coded segment in place. When provided,
   *  the page text layer is made selectable and block overlays are
   *  non-interactive (so they don't swallow the selection). */
  onSelectText?: (sel: PdfTextSelection) => void;
  /** Legacy click-to-highlight a block. Used by the standalone content
   *  analysis page. Ignored when `onSelectText` is set. */
  onSelectBlock?: (blockId: string) => void;
}

/** True when any rectangle in `a` visually intersects any rectangle in `b`.
 *  Rects are `[x, y, w, h]` in PDF user-space points. Used to detect when two
 *  precisely-anchored segments mark the same passage so their highlights can
 *  be nested rather than drawn on top of one another. */
function rectsOverlap(a: number[][], b: number[][]): boolean {
  for (const [ax, ay, aw, ah] of a) {
    for (const [bx, by, bw, bh] of b) {
      if (ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by) {
        return true;
      }
    }
  }
  return false;
}

/** Outer rectangle [minX, minY, maxX, maxY] covering all of a block's lines. */
function aggBbox(block: Block): [number, number, number, number] | null {
  if (!block.bboxes.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y, w, h] of block.bboxes) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  return [minX, minY, maxX, maxY];
}

/**
 * Renders the original PDF one page at a time, overlays the extracted block
 * structure, and lets the user select text directly on the page to tag it.
 * Coded segments render as tinted bars over the blocks they touch.
 */
export default function PdfDocumentView({
  document: doc,
  pdfSrcUrl,
  fallbackSrcUrl,
  segments,
  codes,
  highlightedBlockId,
  highlightedSegmentId,
  onSelectText,
  onSelectBlock,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(780);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // The URL currently handed to react-pdf. Starts at the primary source; if
  // that fails to load and a fallback is provided, we switch to it once (see
  // onLoadError below) so a reference PDF that only exists in the other store
  // still renders.
  const [activeUrl, setActiveUrl] = useState(pdfSrcUrl);
  const [triedFallback, setTriedFallback] = useState(false);

  // Remount the <Document> whenever the active source URL changes.
  const file = useMemo(() => ({ url: activeUrl }), [activeUrl]);

  // Reset to the primary source whenever it changes (a new document was
  // selected) so a later document never gets stranded on a previous fallback.
  useEffect(() => {
    setActiveUrl(pdfSrcUrl);
    setTriedFallback(false);
    setLoadError(null);
  }, [pdfSrcUrl]);

  useEffect(() => {
    if (!containerRef.current) return;
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 0) setPageWidth(Math.min(w - 24, 960));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [activeUrl]);

  const blocksByPage = useMemo(() => {
    const map = new Map<number, Block[]>();
    for (const b of doc.blocks ?? []) {
      const arr = map.get(b.page) ?? [];
      arr.push(b);
      map.set(b.page, arr);
    }
    return map;
  }, [doc.blocks]);

  // Block-anchored segments (legacy / no precise anchor) → tinted over their
  // whole block. Segments that carry a precise `pdfAnchor` are drawn exactly
  // over the selected text instead and grouped by page below.
  const segmentsByBlock = useMemo(() => {
    const map = new Map<string, CodedSegment[]>();
    for (const s of segments) {
      if (!s.blockId || s.pdfAnchor) continue;
      const arr = map.get(s.blockId) ?? [];
      arr.push(s);
      map.set(s.blockId, arr);
    }
    return map;
  }, [segments]);

  // Precisely-anchored segments → one highlight per selection rectangle, drawn
  // over the exact text the analyst marked.
  const anchoredByPage = useMemo(() => {
    const map = new Map<number, CodedSegment[]>();
    for (const s of segments) {
      if (!s.pdfAnchor) continue;
      const arr = map.get(s.pdfAnchor.page) ?? [];
      arr.push(s);
      map.set(s.pdfAnchor.page, arr);
    }
    return map;
  }, [segments]);

  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);

  // Scroll the highlighted passage into view (e.g. when a coded segment is
  // clicked in the sidebar). Prefer the precise per-segment anchor — it jumps
  // to the exact marked text, and works even when no block was hit-tested —
  // and fall back to the enclosing block for legacy segments. The target
  // page/overlay may not be rendered yet, so retry a few times while react-pdf
  // catches up.
  useEffect(() => {
    if (!highlightedSegmentId && !highlightedBlockId) return;
    let cancelled = false;
    const selectors = [
      highlightedSegmentId
        ? `[data-segment-id="${CSS.escape(highlightedSegmentId)}"]`
        : null,
      highlightedBlockId
        ? `[data-block-id="${CSS.escape(highlightedBlockId)}"]`
        : null,
    ].filter((s): s is string => s !== null);
    const tryScroll = (attempt: number) => {
      if (cancelled) return;
      for (const sel of selectors) {
        const el = containerRef.current?.querySelector(sel);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return;
        }
      }
      if (attempt < 12) setTimeout(() => tryScroll(attempt + 1), 150);
    };
    tryScroll(0);
    return () => { cancelled = true; };
  }, [highlightedSegmentId, highlightedBlockId]);

  return (
    <div ref={containerRef} className="flex flex-col items-center">
      {onSelectText && (
        <p className="self-stretch px-1 pb-1 text-[10px] text-tertiary-light">
          Select any text on the page to tag it.
        </p>
      )}
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => setNumPages(numPages)}
        onLoadError={err => {
          // First failure with a fallback still untried: switch to it silently
          // rather than surfacing the error. Only show the error once the
          // fallback has also failed (or there is none) — e.g. a static-library
          // reference whose PDF lives in the ingest cache but not the durable
          // storage proxy the primary URL points at.
          if (fallbackSrcUrl && !triedFallback && activeUrl !== fallbackSrcUrl) {
            setTriedFallback(true);
            setActiveUrl(fallbackSrcUrl);
            return;
          }
          setLoadError(err?.message ?? 'Failed to load PDF');
        }}
        loading={<div className="p-4 text-[12px] text-[#8A95A3]">Loading PDF…</div>}
        error={<div className="p-4 text-[12px] text-[#B83230]">Couldn&apos;t load PDF. Re-ingest the document.</div>}
      >
        {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNumber => (
          <PdfPageOverlay
            key={pageNumber}
            pageNumber={pageNumber}
            width={pageWidth}
            blocks={blocksByPage.get(pageNumber) ?? []}
            segmentsByBlock={segmentsByBlock}
            anchoredSegments={anchoredByPage.get(pageNumber) ?? []}
            codeById={codeById}
            highlightedBlockId={highlightedBlockId ?? null}
            highlightedSegmentId={highlightedSegmentId ?? null}
            onSelectText={onSelectText}
            onSelectBlock={onSelectText ? undefined : onSelectBlock}
          />
        ))}
      </Document>
      {loadError && (
        <div className="p-3 text-[12px] text-[#B83230]">{loadError}</div>
      )}
    </div>
  );
}

// ── Single page with overlay ──────────────────────────────────────────────

interface PageProps {
  pageNumber: number;
  width: number;
  blocks: Block[];
  segmentsByBlock: Map<string, CodedSegment[]>;
  /** Segments on this page that carry a precise `pdfAnchor`. */
  anchoredSegments: CodedSegment[];
  codeById: Map<string, CodeNode>;
  highlightedBlockId: string | null;
  highlightedSegmentId: string | null;
  onSelectText?: (sel: PdfTextSelection) => void;
  onSelectBlock?: (blockId: string) => void;
}

function PdfPageOverlay({
  pageNumber,
  width,
  blocks,
  segmentsByBlock,
  anchoredSegments,
  codeById,
  highlightedBlockId,
  highlightedSegmentId,
  onSelectText,
  onSelectBlock,
}: PageProps) {
  // pdfjs viewport is in PDF user-space units at scale 1. Our bboxes were
  // captured at scale 1 too, so the scale factor is simply
  //   renderedWidth / pageNaturalWidth
  // which we read from the Page's onRenderSuccess callback.
  const [scale, setScale] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // When several tags mark the same passage, their precise highlights would
  // otherwise stack exactly on top of each other and only the last-painted
  // colour would show. Give each segment a "stack depth" = how many already
  // placed segments it overlaps, so SegmentHighlight can inflate its frame by
  // that depth and every tag's colour stays visible as a concentric outline.
  const anchoredWithDepth = useMemo(() => {
    const placed: number[][][] = [];
    return anchoredSegments.map(seg => {
      const rects = seg.pdfAnchor?.rects ?? [];
      let depth = 0;
      for (const prev of placed) {
        if (rectsOverlap(rects, prev)) depth++;
      }
      placed.push(rects);
      return { seg, depth };
    });
  }, [anchoredSegments]);

  // Capture a text selection made on this page and hand it up. The block
  // overlays are pointer-events:none so the pdfjs text layer underneath stays
  // selectable; we hit-test the selection anchor against the block boxes to
  // attribute it to a block.
  function handleMouseUp() {
    if (!onSelectText) return;
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const text = sel.toString().replace(/\s+/g, ' ').trim();
    if (text.length < 2) return;
    const range = sel.getRangeAt(0);
    const wrap = wrapRef.current;
    if (!wrap || !wrap.contains(range.startContainer)) return;

    const clientRects = range.getClientRects();
    const anchorRect = clientRects.length ? clientRects[0] : range.getBoundingClientRect();

    // Convert the selection's client rectangles into page-relative PDF
    // user-space points so the highlight can be re-drawn over the exact text
    // on any later render (and scrolled to precisely). Coalesce slivers and
    // near-duplicate rows pdfjs sometimes emits per glyph run.
    const pdfRects: number[][] = [];
    let blockId: string | null = null;
    if (scale != null) {
      const wrapRect = wrap.getBoundingClientRect();
      for (const cr of Array.from(clientRects)) {
        if (cr.width < 1 || cr.height < 1) continue;
        pdfRects.push([
          (cr.left - wrapRect.left) / scale,
          (cr.top - wrapRect.top) / scale,
          cr.width / scale,
          cr.height / scale,
        ]);
      }
      // Still hit-test a block for back-compat (e.g. the extracted-text view
      // and offset resolution), using the selection's start point.
      const px = (anchorRect.left - wrapRect.left) / scale;
      const py = (anchorRect.top - wrapRect.top) / scale;
      for (const b of blocks) {
        const agg = aggBbox(b);
        if (!agg) continue;
        if (px >= agg[0] - 2 && px <= agg[2] + 2 && py >= agg[1] - 6 && py <= agg[3] + 6) {
          blockId = b.id;
          break;
        }
      }
    }
    onSelectText({ text, page: pageNumber, blockId, rects: pdfRects, rect: range.getBoundingClientRect() });
  }

  return (
    <div
      ref={wrapRef}
      className="relative mb-4 shadow-sm border border-[#E6E7E8] bg-white"
      onMouseUp={onSelectText ? handleMouseUp : undefined}
    >
      <Page
        pageNumber={pageNumber}
        width={width}
        onRenderSuccess={page => {
          setScale(width / page.originalWidth);
        }}
        renderAnnotationLayer={false}
        renderTextLayer={true}
      />
      {scale != null && (
        <div className="absolute inset-0 pointer-events-none">
          {blocks.map(block => (
            <BlockOverlay
              key={block.id}
              block={block}
              scale={scale}
              segments={segmentsByBlock.get(block.id) ?? []}
              codeById={codeById}
              isHighlighted={highlightedBlockId === block.id}
              onClick={onSelectBlock ? () => onSelectBlock(block.id) : undefined}
            />
          ))}
          {anchoredWithDepth.map(({ seg, depth }) => (
            <SegmentHighlight
              key={seg.id}
              segment={seg}
              scale={scale}
              color={codeById.get(seg.codeId)?.color ?? '#8A95A3'}
              codeName={codeById.get(seg.codeId)?.name}
              stackDepth={depth}
              isHighlighted={highlightedSegmentId === seg.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Block rectangle overlay ───────────────────────────────────────────────

interface BlockOverlayProps {
  block: Block;
  scale: number;
  segments: CodedSegment[];
  codeById: Map<string, CodeNode>;
  isHighlighted: boolean;
  /** When set the block is clickable (legacy highlight mode). When absent the
   *  overlay is inert so the text layer underneath stays selectable. */
  onClick?: () => void;
}

function BlockOverlay({
  block,
  scale,
  segments,
  codeById,
  isHighlighted,
  onClick,
}: BlockOverlayProps) {
  const agg = aggBbox(block);
  if (!agg) return null;
  const [minX, minY, maxX, maxY] = agg;
  // Only outline blocks that are highlighted or carry a tag — an outline on
  // every block turns the page into a grid and fights with reading the PDF.
  const hasSegments = segments.length > 0;
  const style: React.CSSProperties = {
    position: 'absolute',
    left: minX * scale,
    top: minY * scale,
    width: (maxX - minX) * scale,
    height: (maxY - minY) * scale,
    pointerEvents: onClick ? 'auto' : 'none',
    cursor: onClick ? 'pointer' : 'default',
    background: isHighlighted ? 'rgba(124, 58, 237, 0.12)' : 'transparent',
    border: isHighlighted
      ? '1.5px solid #7C3AED'
      : hasSegments
        ? '1px solid rgba(0, 146, 143, 0.35)'
        : 'none',
    borderRadius: 2,
  };

  // Segment tints layered on top: one translucent rectangle per segment
  // occupying the same block surface, colour-coded by the code.
  const tints = segments.slice(0, 5).map((seg, idx) => {
    const code = codeById.get(seg.codeId);
    const color = code?.color ?? '#8A95A3';
    return (
      <span
        key={seg.id}
        style={{
          position: 'absolute',
          inset: `${idx * 3}px`,
          background: `${color}1F`,
          borderBottom: `2px solid ${color}`,
          pointerEvents: 'none',
          borderRadius: 2,
        }}
      />
    );
  });

  return (
    <div
      data-block-id={block.id}
      title={`${block.kind} · p${block.page}`}
      style={style}
      onClick={onClick ? e => { e.stopPropagation(); onClick(); } : undefined}
    >
      {tints}
    </div>
  );
}

// ── Precise per-segment highlight ─────────────────────────────────────────

interface SegmentHighlightProps {
  segment: CodedSegment;
  scale: number;
  color: string;
  /** Tag name — shown in the hover tooltip so overlapping frames are
   *  identifiable. */
  codeName?: string;
  /** How many other highlights this one shares the same passage with. Each
   *  level inflates the frame outward by a few pixels so co-located tags nest
   *  as concentric coloured outlines instead of hiding one another. */
  stackDepth?: number;
  isHighlighted: boolean;
}

// Pixels each overlap level pushes the frame outward, so a passage carrying
// several tags shows one coloured outline per tag.
const STACK_GAP = 3;

/**
 * Draws one outlined rectangle per selection rect captured at marking time, so
 * the highlight frames the exact text the analyst selected — not the whole
 * enclosing block. A coloured frame (rather than a solid fill) keeps the text
 * underneath readable. The first rect carries the `data-segment-id` anchor the
 * sidebar scrolls to. Inert (pointer-events:none) so the pdfjs text layer
 * underneath stays selectable for further tagging.
 *
 * When `stackDepth` > 0 the frame is inflated outward so multiple tags on the
 * same text render as concentric coloured outlines — both (or all) colours
 * stay visible rather than the last-painted one winning.
 */
function SegmentHighlight({
  segment,
  scale,
  color,
  codeName,
  stackDepth = 0,
  isHighlighted,
}: SegmentHighlightProps) {
  const rects = segment.pdfAnchor?.rects ?? [];
  if (!rects.length) return null;
  const gap = stackDepth * STACK_GAP;
  const title = codeName ? `${codeName} — ${segment.text}` : segment.text;
  return (
    <>
      {rects.map(([x, y, w, h], i) => (
        <span
          key={i}
          data-segment-id={i === 0 ? segment.id : undefined}
          title={title}
          style={{
            position: 'absolute',
            left: x * scale - gap,
            top: y * scale - gap,
            width: w * scale + gap * 2,
            height: h * scale + gap * 2,
            // Frame, not fill — a faint tint only when selected, so the text
            // stays legible. Selection emphasis is carried by a thicker, fully
            // opaque border rather than a darker wash. Nested frames keep the
            // solid border even unselected so each colour reads clearly.
            background: isHighlighted ? `${color}1F` : 'transparent',
            border: isHighlighted
              ? `1.5px solid ${color}`
              : `${stackDepth > 0 ? 1.5 : 1}px solid ${stackDepth > 0 ? color : `${color}99`}`,
            pointerEvents: 'none',
            borderRadius: 2 + gap,
          }}
        />
      ))}
    </>
  );
}
