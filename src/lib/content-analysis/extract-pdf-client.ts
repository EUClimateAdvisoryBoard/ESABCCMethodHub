'use client';

// ---------------------------------------------------------------------------
// Client-side PDF extraction for the content-analysis workbench.
//
// The server `/api/content-analysis/ingest*` routes extract a PDF's text and
// block bounding boxes with pdfjs. That works for small policy PDFs but a
// large report (e.g. a 16 MB, several-hundred-page EU document) exhausts the
// serverless function's time / memory budget and the request dies before it
// can respond — so the PDF "never loads".
//
// The browser has none of those limits: it already loads the PDF to render it,
// and the user's machine has plenty of headroom. This module runs the *same*
// extraction algorithm as the server, in the browser, so large documents are
// handled reliably and the only thing that travels to the server is the small
// extracted text/blocks JSON (which is then shared across users).
//
// Kept deliberately in sync with `extractBlocks` in
// `src/app/api/content-analysis/ingest/route.ts`.
// ---------------------------------------------------------------------------

import { pdfjs } from 'react-pdf';
import type { Block, BlockKind } from './types';

// Same worker the PDF viewer uses (copied to /public by the postinstall step).
// Set here too so extraction works even before the viewer has mounted.
if (typeof window !== 'undefined' && !pdfjs.GlobalWorkerOptions.workerSrc) {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

const MAX_PAGES = 600;

export interface ExtractedPdf {
  blocks: Block[];
  text: string;
  pageCount: number;
}

interface RawItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  hasEOL: boolean;
}

function inferKind(text: string, fontSize: number): BlockKind {
  if (/^Article\s+\d+/i.test(text)) return 'article';
  if (/^\(\d+\)\s/.test(text)) return 'recital';
  if (/^(ANNEX|CHAPTER|SECTION|TITLE|PART)\b/i.test(text)) return 'heading';
  if (fontSize >= 12 && text.length < 80 && text === text.toUpperCase() && /[A-Z]/.test(text)) {
    return 'heading';
  }
  if (text.length < 90 && /^\d+\s*\/\s*\d+\s*$/.test(text.trim())) return 'footer';
  if (/^Page\s+\d+/i.test(text) || /^OJ\b/.test(text)) return 'footer';
  return 'paragraph';
}

/**
 * Extract ordered blocks (with PDF user-space bounding boxes) and flat text
 * from a PDF entirely in the browser. Mirrors the server extractor so the
 * resulting blocks are interchangeable with a server ingest.
 */
export async function extractPdfClient(
  data: ArrayBuffer,
  celex: string,
): Promise<ExtractedPdf> {
  const loadingTask = pdfjs.getDocument({
    data: new Uint8Array(data),
    disableFontFace: true,
    isEvalSupported: false,
  });
  const pdf = await loadingTask.promise;
  const pageCount = Math.min(pdf.numPages, MAX_PAGES);

  const blocks: Block[] = [];
  let order = 0;
  const fullText: string[] = [];

  for (let p = 1; p <= pageCount; p++) {
    const page = await pdf.getPage(p);
    const content = await page.getTextContent();
    const viewport = page.getViewport({ scale: 1 });
    const pageHeight = viewport.height;

    const items: RawItem[] = [];
    for (const raw of content.items as Array<Record<string, unknown>>) {
      const str = typeof raw.str === 'string' ? raw.str : '';
      if (!str) continue;
      const transform = Array.isArray(raw.transform) ? (raw.transform as number[]) : null;
      if (!transform || transform.length < 6) continue;
      const fontSize = Math.abs(transform[3]) || Math.abs(transform[0]);
      const x = transform[4];
      const y = pageHeight - transform[5];
      const width = typeof raw.width === 'number' ? raw.width : 0;
      const height = typeof raw.height === 'number' ? raw.height : fontSize;
      items.push({ str, x, y, width, height, fontSize, hasEOL: raw.hasEOL === true });
    }

    items.sort((a, b) => {
      const dy = a.y - b.y;
      if (Math.abs(dy) > 1.5) return dy;
      return a.x - b.x;
    });

    type Line = { y: number; bottom: number; items: RawItem[]; fontSize: number };
    const lines: Line[] = [];
    for (const it of items) {
      const last = lines[lines.length - 1];
      if (last && Math.abs(it.y - last.y) <= Math.max(1.5, it.fontSize * 0.3)) {
        last.items.push(it);
        last.bottom = Math.max(last.bottom, it.y);
        last.fontSize = Math.max(last.fontSize, it.fontSize);
      } else {
        lines.push({ y: it.y, bottom: it.y, items: [it], fontSize: it.fontSize });
      }
    }

    interface WorkingBlock { lines: Line[]; }
    const workingBlocks: WorkingBlock[] = [];
    let cur: WorkingBlock | null = null;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const prev = lines[i - 1];
      const gap = prev ? line.y - prev.bottom : 0;
      const breakByGap = prev && gap > Math.max(prev.fontSize, line.fontSize) * 1.15;
      if (!cur || breakByGap) {
        cur = { lines: [line] };
        workingBlocks.push(cur);
      } else {
        cur.lines.push(line);
      }
    }

    for (const wb of workingBlocks) {
      const lineTexts = wb.lines.map(l => l.items.map(i => i.str).join('').trim());
      const text = lineTexts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const bboxes = wb.lines.map(l => {
        const minX = Math.min(...l.items.map(i => i.x));
        const maxX = Math.max(...l.items.map(i => i.x + i.width));
        const topY = l.y - l.fontSize;
        return [minX, topY, maxX - minX, l.fontSize + 2];
      });
      const kind = inferKind(text, wb.lines[0].fontSize);
      const blockText = lineTexts.join('\n').trim();
      blocks.push({ id: `block-${celex}-${order}`, page: p, order: order++, bboxes, kind, text: blockText });
      fullText.push(blockText);
    }
  }

  try { await pdf.destroy(); } catch { /* ignore */ }

  return { blocks, text: fullText.join('\n\n'), pageCount };
}
