'use client';

// ---------------------------------------------------------------------------
// SegmentsTablePreview — live Word-compatible table preview (M·05 #8).
//
// Renders the user's segments as a real HTML <table> with a column picker.
// "Copy table" puts the selected HTML on the clipboard so the user can
// paste it directly into a Word document — Word recognises clipboard
// HTML tables and renders them as native tables, no .docx generation
// required from the client.
//
// The preview re-renders live as the user toggles columns, so the user
// sees exactly what will land in their document.
// ---------------------------------------------------------------------------

import { useMemo, useState } from 'react';
import type { CodedSegment, CodeNode, AnalysisDocument } from '@/lib/content-analysis/types';
import { showToast } from '@/components/ui/ToastHost';

type Column = 'segment' | 'code' | 'document' | 'block' | 'date';

const COLUMN_LABELS: Record<Column, string> = {
  segment:  'Segment text',
  code:     'Code',
  document: 'Document',
  block:    'Block / paragraph',
  date:     'Created',
};

interface Props {
  segments: CodedSegment[];
  codes: CodeNode[];
  documents: AnalysisDocument[];
  /** Optional cap on rows shown in the preview itself. Export uses all. */
  previewLimit?: number;
}

export default function SegmentsTablePreview({
  segments,
  codes,
  documents,
  previewLimit = 12,
}: Props) {
  const [columns, setColumns] = useState<Column[]>(['segment', 'code', 'document', 'date']);
  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);
  const docById  = useMemo(() => new Map(documents.map(d => [d.id, d])), [documents]);

  const rows = useMemo(() => segments.map(s => ({
    seg: s,
    code: codeById.get(s.codeId),
    doc: docById.get(s.documentId),
  })), [segments, codeById, docById]);

  const visibleRows = rows.slice(0, previewLimit);

  const cell = (col: Column, r: typeof rows[number]): string => {
    switch (col) {
      case 'segment':  return r.seg.text;
      case 'code':     return r.code?.name ?? r.seg.codeId;
      case 'document': return r.doc?.shortTitle ?? r.seg.documentId;
      case 'block':    return r.seg.blockId ?? '—';
      case 'date':     return r.seg.createdAt?.slice(0, 10) ?? '—';
    }
  };

  const buildTableHtml = (allRows: typeof rows): string => {
    const escape = (s: string) =>
      s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const head = `<tr>${columns.map(c => `<th style="text-align:left;background:#EDF1F2;padding:6px 10px;border:1px solid #E6E7E8;font-family:'Segoe UI',sans-serif;font-size:11px">${escape(COLUMN_LABELS[c])}</th>`).join('')}</tr>`;
    const body = allRows.map(r =>
      `<tr>${columns.map(c => `<td style="padding:6px 10px;border:1px solid #E6E7E8;font-family:'Segoe UI',sans-serif;font-size:11px;vertical-align:top">${escape(cell(c, r))}</td>`).join('')}</tr>`
    ).join('');
    return `<table cellspacing="0" cellpadding="0" style="border-collapse:collapse;font-family:'Segoe UI',sans-serif">${head}${body}</table>`;
  };

  const onCopy = async () => {
    const html = buildTableHtml(rows);
    const plain = [columns.map(c => COLUMN_LABELS[c]).join('\t'), ...rows.map(r => columns.map(c => cell(c, r)).join('\t'))].join('\n');
    try {
      if (typeof window !== 'undefined' && (window as any).ClipboardItem) {
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html':  new Blob([html],  { type: 'text/html'  }),
            'text/plain': new Blob([plain], { type: 'text/plain' }),
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(plain);
      }
      showToast({
        tone: 'success',
        message: `Copied ${rows.length} segment${rows.length === 1 ? '' : 's'} to clipboard`,
        description: 'Paste into Word — the table renders as native Word table.',
      });
    } catch (err) {
      showToast({
        tone: 'danger',
        message: 'Could not access the clipboard',
        description: (err as Error)?.message ?? 'Try again, or use the .csv export instead.',
      });
    }
  };

  if (segments.length === 0) {
    return (
      <p className="text-[12px] italic text-[var(--mh-muted)] px-3 py-2">
        No segments yet — add some, then this preview shows the Word-ready table.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="uppercase tracking-wide font-semibold text-[var(--mh-muted)] pr-1"
          style={{ fontSize: 'var(--mh-text-2xs)' }}
        >
          Columns
        </span>
        {(Object.keys(COLUMN_LABELS) as Column[]).map(c => {
          const active = columns.includes(c);
          return (
            <button
              key={c}
              type="button"
              onClick={() => setColumns(prev =>
                prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c]
              )}
              aria-pressed={active}
              className={`mh-focus mh-motion-fast inline-flex items-center rounded-full px-2.5 py-0.5 border ${active ? 'bg-[var(--mh-status-primary-bg)] text-[var(--mh-status-primary)] border-[var(--mh-status-primary)] font-semibold' : 'bg-[var(--mh-card)] text-[var(--mh-fg)] border-[var(--mh-border)]'}`}
              style={{ fontSize: 'var(--mh-text-2xs)' }}
            >
              {COLUMN_LABELS[c]}
            </button>
          );
        })}
        <div className="flex-1" />
        <button
          type="button"
          onClick={onCopy}
          className="mh-focus mh-motion-fast inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[var(--mh-status-primary)] text-white font-semibold"
          style={{ fontSize: 'var(--mh-text-xs)' }}
        >
          Copy {rows.length} row{rows.length === 1 ? '' : 's'} for Word
        </button>
      </div>
      <div className="rounded-md border border-[var(--mh-border)] overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-[var(--mh-status-primary-bg)]">
              {columns.map(c => (
                <th key={c} className="px-3 py-1.5 border-b border-[var(--mh-border)] font-semibold text-[var(--mh-fg)]" style={{ fontSize: 'var(--mh-text-2xs)' }}>
                  {COLUMN_LABELS[c]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleRows.map(r => (
              <tr key={r.seg.id} className="odd:bg-[var(--mh-bg)]">
                {columns.map(c => (
                  <td
                    key={c}
                    className="px-3 py-1.5 border-b border-[var(--mh-border)] align-top text-[var(--mh-fg)]"
                    style={{ fontSize: 'var(--mh-text-2xs)', maxWidth: c === 'segment' ? 360 : undefined }}
                  >
                    {cell(c, r)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length > visibleRows.length && (
        <p className="text-[var(--mh-muted)] mh-tnum" style={{ fontSize: 'var(--mh-text-2xs)' }}>
          Showing first {visibleRows.length} of {rows.length}. Copy includes all rows.
        </p>
      )}
    </div>
  );
}
