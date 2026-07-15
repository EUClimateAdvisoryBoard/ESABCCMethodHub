/**
 * Reusable "Download" dropdown for Project Workspace modules.
 * -----------------------------------------------------------
 * Surfaces the three export families from `src/lib/exports` behind one
 * button so non-technical users get consistent, one-click downloads on
 * every module:
 *
 *   • Chart    → PNG / JPG / SVG  (pass a `chart` getter for the element)
 *   • Data     → Excel / CSV      (pass a `data` getter for sheet specs)
 *   • Document → Word .docx       (pass a `text` getter for doc blocks)
 *
 * Any subset can be supplied; only the relevant sections render. Getters
 * are lazy so the (sometimes expensive) data assembly only runs when the
 * user actually picks a format.
 */
'use client';

import { useEffect, useRef, useState } from 'react';
import {
  downloadChartImage,
  downloadTableWorkbook,
  downloadWord,
  downloadCsv,
  type SheetSpec,
  type DocBlock,
} from '@/lib/exports';

interface ChartSource {
  /** Returns the DOM element wrapping the chart's <canvas> or <svg>. */
  getContainer: () => HTMLElement | null;
}
interface DataSource {
  /** Returns one or more sheets (header + rows) to write into the workbook. */
  getSheets: () => SheetSpec[];
}
interface TextSource {
  /** Returns the ordered document blocks for the .docx. */
  getBlocks: () => DocBlock[];
}

interface Props {
  /** Base filename (no extension) for every produced artefact. */
  filename: string;
  /** Optional provenance footer baked into chart images. */
  provenance?: string;
  chart?: ChartSource;
  data?: DataSource;
  text?: TextSource;
  label?: string;
  /** Render compact (icon-only-ish) for tight toolbars. */
  size?: 'sm' | 'md';
  className?: string;
}

export default function DownloadMenu({
  filename,
  provenance,
  chart,
  data,
  text,
  label = 'Download',
  size = 'md',
  className = '',
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  if (!chart && !data && !text) return null;

  async function run(fn: () => void | Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      // Downloads are best-effort; surface failures without crashing the page.
      console.error('[DownloadMenu] export failed', e);
      alert(`Download failed: ${(e as Error).message}`);
    } finally {
      setBusy(false);
      setOpen(false);
    }
  }

  const btnPad = size === 'sm' ? 'px-2 py-1 text-[10px]' : 'px-3 py-1.5 text-xs';

  return (
    <div ref={ref} className={`relative inline-block ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        disabled={busy}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`${btnPad} rounded-md border border-grey-200 text-tertiary-dark font-semibold hover:bg-grey-50 disabled:opacity-50 inline-flex items-center gap-1`}
        title="Download this content"
      >
        ↓ {busy ? 'Preparing…' : label}
        <span className="text-tertiary-light">▾</span>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-52 rounded-lg border border-grey-200 bg-white shadow-xl py-1 text-left"
        >
          {chart && (
            <MenuSection title="Chart image">
              <MenuItem onClick={() => run(() => exportChart('png'))}>PNG image</MenuItem>
              <MenuItem onClick={() => run(() => exportChart('jpg'))}>JPG image</MenuItem>
              <MenuItem onClick={() => run(() => exportChart('svg'))}>SVG (vector)</MenuItem>
            </MenuSection>
          )}
          {data && (
            <MenuSection title="Data">
              <MenuItem onClick={() => run(exportExcel)}>Excel (.xlsx)</MenuItem>
              <MenuItem onClick={() => run(exportCsv)}>CSV</MenuItem>
            </MenuSection>
          )}
          {text && (
            <MenuSection title="Document">
              <MenuItem onClick={() => run(exportWord)}>Word (.docx)</MenuItem>
            </MenuSection>
          )}
        </div>
      )}
    </div>
  );

  function exportChart(format: 'png' | 'jpg' | 'svg') {
    const el = chart!.getContainer();
    if (!el) {
      alert('Chart is not ready to export yet.');
      return;
    }
    downloadChartImage(el, filename, format, provenance);
  }

  async function exportExcel() {
    const sheets = data!.getSheets();
    if (sheets.length === 0) return;
    await downloadTableWorkbook(filename, sheets);
  }

  function exportCsv() {
    const sheets = data!.getSheets();
    if (sheets.length === 0) return;
    // CSV is single-table; use the first sheet (the primary view).
    // Hyperlink cells flatten to their display text.
    const s = sheets[0];
    downloadCsv(
      filename,
      s.headers,
      s.rows.map(r =>
        r.map(v => (typeof v === 'object' && v != null && 'hyperlink' in v ? v.text : v))
      )
    );
  }

  async function exportWord() {
    const blocks = text!.getBlocks();
    if (blocks.length === 0) return;
    await downloadWord(filename, blocks);
  }
}

function MenuSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="py-1 border-b border-grey-100 last:border-b-0">
      <p className="px-3 pt-1 pb-0.5 text-[9px] uppercase tracking-wide text-tertiary-light font-bold">
        {title}
      </p>
      {children}
    </div>
  );
}

function MenuItem({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="w-full text-left px-3 py-1.5 text-xs text-tertiary-dark hover:bg-primary/10 hover:text-primary"
    >
      {children}
    </button>
  );
}
