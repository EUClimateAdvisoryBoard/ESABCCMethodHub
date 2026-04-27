'use client';

import { useMemo, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
  NumericExtraction,
} from '@/lib/content-analysis/types';
import { formatNumeric } from '@/lib/content-analysis/numeric';

interface Props {
  segments: CodedSegment[];
  codes: CodeNode[];
  documents: AnalysisDocument[];
  onUpdate: (id: string, numeric: NumericExtraction | null) => void;
  onDelete: (id: string) => void;
  onJump: (segmentId: string) => void;
}

/**
 * Right-rail panel that shows every segment carrying a `numeric` payload
 * as a sortable / exportable table. Values stay attached to the original
 * coded segment so qualitative tags + numeric extractions never drift.
 */
export default function NumericExtractionsPanel({
  segments,
  codes,
  documents,
  onUpdate,
  onDelete,
  onJump,
}: Props) {
  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);
  const docById = useMemo(() => new Map(documents.map(d => [d.id, d])), [documents]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<NumericExtraction>({ value: 0 });

  const numericSegments = useMemo(
    () => segments.filter(s => s.numeric != null),
    [segments],
  );

  const startEdit = (seg: CodedSegment) => {
    setEditing(seg.id);
    setDraft({ ...(seg.numeric ?? { value: 0 }) });
  };
  const commitEdit = () => {
    if (editing) onUpdate(editing, draft);
    setEditing(null);
  };

  // CSV / Excel-compatible export. Excel opens UTF-8 CSVs natively when
  // they include a BOM, and the columns are tab-separated as fallback.
  const exportCsv = () => {
    const header = ['code', 'document', 'celex', 'value', 'unit', 'year', 'label', 'source_text', 'note'];
    const rows = [header];
    for (const s of numericSegments) {
      const code = codeById.get(s.codeId);
      const doc = docById.get(s.documentId);
      rows.push([
        code?.name ?? '',
        doc?.shortTitle ?? s.documentId,
        doc?.celexNumber ?? '',
        Number.isFinite(s.numeric?.value ?? NaN) ? String(s.numeric!.value) : '',
        s.numeric?.unit ?? '',
        s.numeric?.year ?? '',
        s.numeric?.label ?? '',
        s.text.replace(/\s+/g, ' ').trim(),
        s.note.replace(/\s+/g, ' ').trim(),
      ]);
    }
    const csv = '﻿' + rows
      .map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `numeric-extractions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Word-compatible HTML table.
  const exportWord = () => {
    const escape = (v: string) =>
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const headers = ['Code', 'Value', 'Unit', 'Year', 'Label', 'Document', 'Source quote'];
    const head = `<tr>${headers.map(h => `<th>${h}</th>`).join('')}</tr>`;
    const body = numericSegments.map(s => {
      const code = codeById.get(s.codeId);
      const doc = docById.get(s.documentId);
      const tagCell = code
        ? `<td style="background-color:${code.color};color:#fff;font-weight:600;">${escape(code.name)}</td>`
        : '<td></td>';
      return `<tr>${tagCell}` +
        `<td style="text-align:right;">${escape(formatNumeric(s.numeric?.value ?? NaN))}</td>` +
        `<td>${escape(s.numeric?.unit ?? '')}</td>` +
        `<td>${escape(s.numeric?.year ?? '')}</td>` +
        `<td>${escape(s.numeric?.label ?? '')}</td>` +
        `<td>${escape(doc?.shortTitle ?? s.documentId)}</td>` +
        `<td><em>${escape(s.text.replace(/\s+/g, ' ').trim())}</em></td>` +
        `</tr>`;
    }).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Numeric extractions</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
  table { border-collapse: collapse; width: 100%; }
  th, td { border: 0.5pt solid #888; padding: 4pt 6pt; vertical-align: top; }
  th { background-color: #F2F2F2; text-align: left; }
  td { font-size: 10pt; }
</style></head><body>
<h2>Numeric extractions — ${new Date().toLocaleDateString()}</h2>
<p>${numericSegments.length} extractions across ${new Set(numericSegments.map(s => s.documentId)).size} document(s).</p>
<table>${head}${body}</table>
</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `numeric-extractions-${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-[#E6E7E8] bg-[#FBFBFA]">
        <span className="font-mono text-[10px] tracking-[0.14em] uppercase text-[#8A95A3]">
          Numbers · {numericSegments.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={exportCsv}
            disabled={numericSegments.length === 0}
            className="text-[11px] font-medium text-[#E87722] hover:text-[#c45f14] disabled:text-[#B8BCC2] disabled:cursor-not-allowed"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportWord}
            disabled={numericSegments.length === 0}
            className="text-[11px] font-medium text-[#003399] hover:text-[#002266] disabled:text-[#B8BCC2] disabled:cursor-not-allowed"
          >
            Export Word
          </button>
        </div>
      </div>

      {numericSegments.length === 0 ? (
        <div className="px-3 py-4 text-[12px] italic text-[#8A95A3]">
          No numeric extractions yet. Highlight a number, then choose
          “Extract number” from the floating toolbar.
        </div>
      ) : (
        <ul className="max-h-[40vh] overflow-y-auto divide-y divide-[#E6E7E8]">
          {numericSegments.map(seg => {
            const code = codeById.get(seg.codeId);
            const doc = docById.get(seg.documentId);
            const isEditing = editing === seg.id;
            return (
              <li key={seg.id} className="px-3 py-2">
                <div className="flex items-center gap-2 mb-1">
                  <button
                    type="button"
                    onClick={() => onJump(seg.id)}
                    className="inline-flex items-center gap-1 text-[10.5px] font-medium text-white px-1.5 py-0.5 rounded-sm hover:brightness-110"
                    style={{ backgroundColor: code?.color ?? '#8A95A3' }}
                    title="Jump to this extraction in the document"
                  >
                    {code?.name ?? 'unknown'}
                  </button>
                  <span className="text-[10.5px] text-[#8A95A3] truncate">
                    {doc?.shortTitle ?? seg.documentId}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDelete(seg.id)}
                    className="ml-auto text-[#B8BCC2] hover:text-[#B83230] text-[14px] leading-none"
                    title="Remove extraction"
                    aria-label="Remove"
                  >
                    ×
                  </button>
                </div>
                {isEditing ? (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={Number.isFinite(draft.value) ? draft.value : ''}
                        onChange={e => setDraft(d => ({ ...d, value: Number(e.target.value) }))}
                        className="w-32 border border-[#E6E7E8] rounded-sm px-1.5 py-0.5 text-[12px] font-mono"
                        placeholder="Value"
                      />
                      <input
                        type="text"
                        value={draft.unit ?? ''}
                        onChange={e => setDraft(d => ({ ...d, unit: e.target.value || undefined }))}
                        className="w-20 border border-[#E6E7E8] rounded-sm px-1.5 py-0.5 text-[12px]"
                        placeholder="Unit"
                      />
                      <input
                        type="text"
                        value={draft.year ?? ''}
                        onChange={e => setDraft(d => ({ ...d, year: e.target.value || undefined }))}
                        className="w-20 border border-[#E6E7E8] rounded-sm px-1.5 py-0.5 text-[12px]"
                        placeholder="Year"
                      />
                    </div>
                    <input
                      type="text"
                      value={draft.label ?? ''}
                      onChange={e => setDraft(d => ({ ...d, label: e.target.value || undefined }))}
                      className="w-full border border-[#E6E7E8] rounded-sm px-1.5 py-0.5 text-[12px]"
                      placeholder="Label (e.g. ‘Adaptation budget’)"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={commitEdit}
                        className="text-[11px] font-medium text-white bg-[#00928F] hover:bg-[#006F6C] rounded-sm px-2 py-0.5"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="text-[11px] font-medium text-[#3D5265] hover:underline"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(seg)}
                    className="w-full text-left rounded-sm hover:bg-[#F3F4F6] px-1 -mx-1 py-1"
                  >
                    <span className="font-mono text-[12.5px] text-[#3D5265] tabular-nums">
                      {formatNumeric(seg.numeric!.value, seg.numeric!.unit)}
                    </span>
                    {seg.numeric!.year && (
                      <span className="ml-2 font-mono text-[10.5px] text-[#8A95A3]">{seg.numeric!.year}</span>
                    )}
                    {seg.numeric!.label && (
                      <span className="ml-2 text-[11px] text-[#3D5265]">— {seg.numeric!.label}</span>
                    )}
                    <p className="mt-0.5 text-[11px] italic text-[#3D5265]/70 line-clamp-2">
                      “{seg.text.trim()}”
                    </p>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
