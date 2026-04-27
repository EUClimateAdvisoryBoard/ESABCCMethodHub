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

interface Props {
  document: AnalysisDocument;
  /** URL the browser can fetch from. Typically `/api/content-analysis/pdf?celex=…` */
  pdfSrcUrl: string;
  segments: CodedSegment[];
  codes: CodeNode[];
  highlightedBlockId?: string | null;
  onSelectBlock: (blockId: string) => void;
}

/**
 * Renders the cached EUR-Lex PDF one page at a time and overlays the
 * extracted block bounding boxes so user can see the same structure the
 * block viewer is working on. Clicking a block highlights it; coded
 * segments render as tinted bars over the lines they touch.
 */
export default function PdfDocumentView({
  document: doc,
  pdfSrcUrl,
  segments,
  codes,
  highlightedBlockId,
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
            onSelectBlock={onSelectBlock}
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
  onSelectBlock: (blockId: string) => void;
}

function PdfPageOverlay({
  pageNumber,
  width,
  blocks,
  segmentsByBlock,
  codeById,
  highlightedBlockId,
  onSelectBlock,
}: PageProps) {
  // pdfjs viewport is in PDF user-space units at scale 1. Our bboxes were
  // captured at scale 1 too, so the scale factor is simply
  //   renderedWidth / pageNaturalWidth
  // which we read from the Page's onRenderSuccess callback.
  const [scale, setScale] = useState<number | null>(null);

  return (
    <div className="relative mb-4 shadow-sm border border-[#E6E7E8] bg-white">
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
              onClick={() => onSelectBlock(block.id)}
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
  onClick: () => void;
}

function BlockOverlay({
  block,
  scale,
  segments,
  codeById,
  isHighlighted,
  onClick,
}: BlockOverlayProps) {
  if (block.bboxes.length === 0) return null;
  // Aggregate bbox — outer rectangle covering every line. Keeps the
  // clickable surface a single hit target.
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const [x, y, w, h] of block.bboxes) {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + h);
  }
  const style: React.CSSProperties = {
    position: 'absolute',
    left: minX * scale,
    top: minY * scale,
    width: (maxX - minX) * scale,
    height: (maxY - minY) * scale,
    pointerEvents: 'auto',
    cursor: 'pointer',
    background: isHighlighted ? 'rgba(124, 58, 237, 0.15)' : 'transparent',
    border: isHighlighted ? '1.5px solid #7C3AED' : '1px dashed rgba(0, 146, 143, 0.25)',
    borderRadius: 2,
    transition: 'background 0.15s, border-color 0.15s',
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
      title={`${block.kind} · p${block.page} · ${block.id}`}
      style={style}
      onClick={e => { e.stopPropagation(); onClick(); }}
      onMouseEnter={e => {
        if (!isHighlighted) (e.currentTarget.style.background = 'rgba(0, 146, 143, 0.08)');
      }}
      onMouseLeave={e => {
        if (!isHighlighted) (e.currentTarget.style.background = 'transparent');
      }}
    >
      {tints}
    </div>
  );
}
