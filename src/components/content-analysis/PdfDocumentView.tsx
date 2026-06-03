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
  /** Client rect of the selection, for anchoring the floating toolbar. */
  rect: DOMRect;
}

interface Props {
  document: AnalysisDocument;
  /** URL the browser can fetch from. Typically `/api/content-analysis/pdf?celex=…` */
  pdfSrcUrl: string;
  segments: CodedSegment[];
  codes: CodeNode[];
  highlightedBlockId?: string | null;
  /** Fired when the user selects text directly on a page, so the parent can
   *  open the tag picker and create a coded segment in place. When provided,
   *  the page text layer is made selectable and block overlays are
   *  non-interactive (so they don't swallow the selection). */
  onSelectText?: (sel: PdfTextSelection) => void;
  /** Legacy click-to-highlight a block. Used by the standalone content
   *  analysis page. Ignored when `onSelectText` is set. */
  onSelectBlock?: (blockId: string) => void;
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
  segments,
  codes,
  highlightedBlockId,
  onSelectText,
  onSelectBlock,
}: Props) {
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(780);
  const [loadError, setLoadError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Remount the <Document> whenever the source URL changes.
  const file = useMemo(() => ({ url: pdfSrcUrl }), [pdfSrcUrl]);

  useEffect(() => {
    setLoadError(null);
    if (!containerRef.current) return;
    const measure = () => {
      if (!containerRef.current) return;
      const w = containerRef.current.clientWidth;
      if (w > 0) setPageWidth(Math.min(w - 24, 960));
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [pdfSrcUrl]);

  const blocksByPage = useMemo(() => {
    const map = new Map<number, Block[]>();
    for (const b of doc.blocks ?? []) {
      const arr = map.get(b.page) ?? [];
      arr.push(b);
      map.set(b.page, arr);
    }
    return map;
  }, [doc.blocks]);

  const segmentsByBlock = useMemo(() => {
    const map = new Map<string, CodedSegment[]>();
    for (const s of segments) {
      if (!s.blockId) continue;
      const arr = map.get(s.blockId) ?? [];
      arr.push(s);
      map.set(s.blockId, arr);
    }
    return map;
  }, [segments]);

  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);

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
        onLoadError={err => setLoadError(err?.message ?? 'Failed to load PDF')}
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
            codeById={codeById}
            highlightedBlockId={highlightedBlockId ?? null}
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
  codeById: Map<string, CodeNode>;
  highlightedBlockId: string | null;
  onSelectText?: (sel: PdfTextSelection) => void;
  onSelectBlock?: (blockId: string) => void;
}

function PdfPageOverlay({
  pageNumber,
  width,
  blocks,
  segmentsByBlock,
  codeById,
  highlightedBlockId,
  onSelectText,
  onSelectBlock,
}: PageProps) {
  // pdfjs viewport is in PDF user-space units at scale 1. Our bboxes were
  // captured at scale 1 too, so the scale factor is simply
  //   renderedWidth / pageNaturalWidth
  // which we read from the Page's onRenderSuccess callback.
  const [scale, setScale] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

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

    const rects = range.getClientRects();
    const anchorRect = rects.length ? rects[0] : range.getBoundingClientRect();

    let blockId: string | null = null;
    if (scale != null) {
      const wrapRect = wrap.getBoundingClientRect();
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
    onSelectText({ text, page: pageNumber, blockId, rect: range.getBoundingClientRect() });
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
      title={`${block.kind} · p${block.page}`}
      style={style}
      onClick={onClick ? e => { e.stopPropagation(); onClick(); } : undefined}
    >
      {tints}
    </div>
  );
}
