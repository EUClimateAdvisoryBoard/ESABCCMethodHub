'use client';

import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';

interface Props {
  segments: CodedSegment[];
  codes: CodeNode[];
  documents: AnalysisDocument[];
  selectedSegmentId: string | null;
  onOpenSegment: (segmentId: string) => void;
  onDelete: (segmentId: string) => void;
}

/**
 * Right-panel list of every coded segment in the current scope. Clicking
 * a row navigates back to the source document + line. Includes a CSV
 * export — the dataset view described in the workflow.
 */
export default function SegmentsList({
  segments,
  codes,
  documents,
  selectedSegmentId,
  onOpenSegment,
  onDelete,
}: Props) {
  const codeById = new Map(codes.map(c => [c.id, c]));
  const docById = new Map(documents.map(d => [d.id, d]));

  const buildRows = () => {
    const header = ['Tag', 'Document', 'Quote', 'Note', 'Range'];
    const rows: string[][] = [header];
    for (const s of segments) {
      const code = codeById.get(s.codeId);
      const doc = docById.get(s.documentId);
      rows.push([
        code?.name ?? '',
        doc?.shortTitle ?? s.documentId,
        s.text.replace(/\s+/g, ' ').trim(),
        s.note.replace(/\s+/g, ' ').trim(),
        `chars ${s.startChar}–${s.endChar}`,
      ]);
    }
    return rows;
  };

  const exportCsv = () => {
    // CSV uses the lower-level columns analysts asked for (ids + offsets).
    const header = ['segment_id', 'document_id', 'document_title', 'tag', 'start_char', 'end_char', 'text', 'note'];
    const rows = [header];
    for (const s of segments) {
      const code = codeById.get(s.codeId);
      const doc = docById.get(s.documentId);
      rows.push([
        s.id,
        s.documentId,
        doc?.shortTitle ?? '',
        code?.name ?? '',
        String(s.startChar),
        String(s.endChar),
        s.text.replace(/\s+/g, ' ').trim(),
        s.note.replace(/\s+/g, ' ').trim(),
      ]);
    }
    const csv = rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `tagged-segments-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportWord = () => {
    // Word opens an HTML payload with the .doc extension and an
    // application/msword content type. The output is a real table the
    // user can drop into an analysis chapter without re-formatting.
    const escape = (v: string) =>
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rows = buildRows();
    const [head, ...body] = rows;
    const tableHead = `<tr>${head.map(c => `<th>${escape(c)}</th>`).join('')}</tr>`;
    const tableBody = body
      .map((r, i) => {
        const code = codeById.get(segments[i]?.codeId ?? '');
        const tagCell = code
          ? `<td style="background-color:${code.color};color:#fff;font-weight:600;">${escape(r[0])}</td>`
          : `<td>${escape(r[0])}</td>`;
        return `<tr>${tagCell}${r.slice(1).map(c => `<td>${escape(c)}</td>`).join('')}</tr>`;
      })
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tagged segments</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 0.5pt solid #888; padding: 4pt 6pt; vertical-align: top; }
  th { background-color: #F2F2F2; text-align: left; }
  td { font-size: 10pt; }
</style></head><body>
<h2>Tagged segments — ${new Date().toLocaleDateString()}</h2>
<p>${segments.length} coded segment(s) across ${new Set(segments.map(s => s.documentId)).size} document(s).</p>
<table>${tableHead}${tableBody}</table>
</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `tagged-segments-${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full min-h-0">
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA]">
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#8A95A3]">
          Segments · {segments.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={segments.length === 0}
            className="text-[11px] font-medium text-[#E87722] hover:text-[#c45f14] disabled:text-[#B8BCC2] disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportWord}
            disabled={segments.length === 0}
            title="Download a Word-compatible table you can paste straight into an analysis chapter"
            className="text-[11px] font-medium text-[#003399] hover:text-[#002266] disabled:text-[#B8BCC2] disabled:cursor-not-allowed"
          >
            Export Word
          </button>
        </div>
      </div>

      {segments.length === 0 ? (
        <div className="px-3 py-6 text-[12px] italic text-[#8A95A3]">
          No tagged segments yet. Select text in the document and a tag in the tree to start.
        </div>
      ) : (
        <ul className="flex-1 overflow-y-auto divide-y divide-[#E6E7E8]">
          {segments.map(seg => {
            const code = codeById.get(seg.codeId);
            const doc = docById.get(seg.documentId);
            const isSelected = selectedSegmentId === seg.id;
            return (
              <li key={seg.id}>
                <div
                  className={`px-3 py-2 cursor-pointer ${
                    isSelected ? 'bg-[#00928F]/10' : 'hover:bg-[#F3F4F6]'
                  }`}
                  onClick={() => onOpenSegment(seg.id)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onOpenSegment(seg.id); }}
                      title="Jump to this segment in the document"
                      className="inline-flex items-center gap-1 text-[10.5px] font-medium text-white px-1.5 py-0.5 rounded-sm hover:brightness-110 hover:underline underline-offset-2 cursor-pointer"
                      style={{ backgroundColor: code?.color ?? '#8A95A3' }}
                    >
                      {code?.name ?? 'unknown'}
                      <span aria-hidden className="text-white/80">↗</span>
                    </button>
                    <button
                      type="button"
                      onClick={e => { e.stopPropagation(); onDelete(seg.id); }}
                      className="text-[#B8BCC2] hover:text-[#B83230] text-[14px] leading-none"
                      aria-label="Delete segment"
                      title="Delete segment"
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-1 text-[11.5px] italic text-[#3D5265] leading-snug line-clamp-3">
                    “{seg.text.trim()}”
                  </p>
                  {seg.note && (
                    <p className="mt-1 text-[11px] text-[#3D5265]/70 line-clamp-2">{seg.note}</p>
                  )}
                  <p className="mt-1 font-mono text-[10px] text-[#8A95A3] truncate">
                    {doc?.shortTitle ?? seg.documentId} · chars {seg.startChar}–{seg.endChar}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
