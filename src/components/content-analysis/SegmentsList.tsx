'use client';

import { useEffect, useRef, useState } from 'react';
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
  /** When provided, each segment row exposes an add/edit comment control.
   *  The comment is the segment's shared `note`, persisted through the store
   *  so everyone in the project can read it. */
  onUpdateNote?: (segmentId: string, note: string) => void;
  /** When provided, figure-capture segments (which carry a screenshot instead
   *  of a text quote) expose an editable title. The title is stored as the
   *  segment's `text`, so it reads in this list and flows into the exports. */
  onUpdateTitle?: (segmentId: string, title: string) => void;
  /** Set to a segment id to open its comment editor (e.g. straight after
   *  tagging, from the "Add comment" toast action). */
  requestCommentForId?: string | null;
  /** Called once the requested comment editor has been opened, so the
   *  parent can clear its request state and allow re-triggering. */
  onCommentRequestConsumed?: () => void;
  /** Set to a figure segment id to open its title editor (e.g. straight after
   *  capturing the figure, from the "Add title" toast action). */
  requestTitleForId?: string | null;
  /** Called once the requested title editor has been opened. */
  onTitleRequestConsumed?: () => void;
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
  onUpdateNote,
  onUpdateTitle,
  requestCommentForId,
  onCommentRequestConsumed,
  requestTitleForId,
  onTitleRequestConsumed,
}: Props) {
  const codeById = new Map(codes.map(c => [c.id, c]));
  const docById = new Map(documents.map(d => [d.id, d]));

  // Inline comment editor — which segment is being commented on, and the draft.
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Inline figure-title editor — mirrors the comment editor but a single line.
  const [titleEditingId, setTitleEditingId] = useState<string | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (titleEditingId) titleInputRef.current?.focus();
  }, [titleEditingId]);

  // Open the title editor when the parent requests it (e.g. just after
  // capturing a figure).
  useEffect(() => {
    if (!requestTitleForId) return;
    const seg = segments.find(s => s.id === requestTitleForId);
    if (!seg) return;
    setTitleEditingId(seg.id);
    setTitleDraft(seg.text ?? '');
    onTitleRequestConsumed?.();
  }, [requestTitleForId, segments, onTitleRequestConsumed]);

  const openTitleEditor = (seg: CodedSegment) => {
    setTitleEditingId(seg.id);
    setTitleDraft(seg.text ?? '');
  };
  const saveTitleEditor = () => {
    if (titleEditingId && onUpdateTitle) onUpdateTitle(titleEditingId, titleDraft.trim());
    setTitleEditingId(null);
    setTitleDraft('');
  };
  const cancelTitleEditor = () => {
    setTitleEditingId(null);
    setTitleDraft('');
  };

  // Open the editor when the parent requests it (e.g. just after tagging).
  useEffect(() => {
    if (!requestCommentForId) return;
    const seg = segments.find(s => s.id === requestCommentForId);
    if (!seg) return;
    setEditingId(seg.id);
    setDraft(seg.note ?? '');
    onCommentRequestConsumed?.();
  }, [requestCommentForId, segments, onCommentRequestConsumed]);

  useEffect(() => {
    if (editingId) textareaRef.current?.focus();
  }, [editingId]);

  const openEditor = (seg: CodedSegment) => {
    setEditingId(seg.id);
    setDraft(seg.note ?? '');
  };
  const saveEditor = () => {
    if (editingId && onUpdateNote) onUpdateNote(editingId, draft.trim());
    setEditingId(null);
    setDraft('');
  };
  const cancelEditor = () => {
    setEditingId(null);
    setDraft('');
  };

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
            // Byline for the shared comment — who left it and when.
            const noteDate = seg.noteUpdatedAt
              ? new Date(seg.noteUpdatedAt).toLocaleDateString(undefined, {
                  year: 'numeric', month: 'short', day: 'numeric',
                })
              : null;
            const noteByline = [seg.noteAuthor, noteDate].filter(Boolean).join(' · ');
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
                  {seg.screenshot ? (
                    /* Figure capture — an editable title stands in for the
                       missing text quote. */
                    onUpdateTitle && titleEditingId === seg.id ? (
                      <div className="mt-1" onClick={e => e.stopPropagation()}>
                        <input
                          ref={titleInputRef}
                          value={titleDraft}
                          onChange={e => setTitleDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') { e.preventDefault(); saveTitleEditor(); }
                            else if (e.key === 'Escape') { e.preventDefault(); cancelTitleEditor(); }
                          }}
                          onBlur={saveTitleEditor}
                          placeholder="Add a figure title…"
                          className="w-full px-2 py-1 border border-[#E6E7E8] rounded text-[11.5px] text-[#3D5265] focus:outline-none focus:border-[#00928F]"
                        />
                      </div>
                    ) : onUpdateTitle ? (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); openTitleEditor(seg); }}
                        title="Edit figure title"
                        className={`mt-1 block w-full text-left text-[11.5px] leading-snug ${
                          seg.text.trim()
                            ? 'font-medium text-[#3D5265] hover:text-[#00928F]'
                            : 'italic text-[#8A95A3] hover:text-[#00928F]'
                        }`}
                      >
                        {seg.text.trim() || '+ Add a figure title'}
                      </button>
                    ) : (
                      <p className="mt-1 text-[11.5px] font-medium text-[#3D5265] leading-snug">
                        {seg.text.trim() || 'Captured figure'}
                      </p>
                    )
                  ) : seg.text.trim() ? (
                    <p className="mt-1 text-[11.5px] italic text-[#3D5265] leading-snug line-clamp-3">
                      “{seg.text.trim()}”
                    </p>
                  ) : null}

                  {/* Captured figure — the screenshot boxed from the PDF page. */}
                  {seg.screenshot && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={seg.screenshot}
                      alt={seg.text.trim() || 'Captured figure'}
                      className="mt-1.5 max-h-40 w-auto max-w-full rounded border border-[#E6E7E8]"
                    />
                  )}

                  {/* Shared comment — readable by everyone in the project. */}
                  {onUpdateNote ? (
                    editingId === seg.id ? (
                      <div className="mt-1.5" onClick={e => e.stopPropagation()}>
                        <textarea
                          ref={textareaRef}
                          value={draft}
                          onChange={e => setDraft(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); saveEditor(); }
                            else if (e.key === 'Escape') { e.preventDefault(); cancelEditor(); }
                          }}
                          placeholder="Add a comment on this tag for the team…"
                          className="w-full h-16 px-2 py-1 border border-[#E6E7E8] rounded text-[11.5px] text-[#3D5265] focus:outline-none focus:border-[#00928F]"
                        />
                        <div className="flex items-center gap-2 mt-1">
                          <button
                            type="button"
                            onClick={saveEditor}
                            className="text-[11px] font-semibold text-white bg-[#00928F] hover:bg-[#017a77] rounded px-2 py-0.5"
                          >
                            Save comment
                          </button>
                          <button
                            type="button"
                            onClick={cancelEditor}
                            className="text-[11px] text-[#8A95A3] hover:text-[#3D5265]"
                          >
                            Cancel
                          </button>
                          <span className="ml-auto font-mono text-[9px] text-[#B8BCC2]">⌘↵ save · esc cancel</span>
                        </div>
                      </div>
                    ) : seg.note ? (
                      <div
                        className="mt-1.5 flex items-start gap-1 group/comment"
                        onClick={e => { e.stopPropagation(); openEditor(seg); }}
                        title="Edit comment"
                      >
                        <span aria-hidden className="text-[#00928F] text-[11px] leading-tight mt-px">💬</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-[#3D5265]/80 leading-snug cursor-text hover:text-[#3D5265]">
                            {seg.note}
                          </p>
                          {noteByline && (
                            <p className="mt-0.5 text-[10px] text-[#8A95A3]">— {noteByline}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-[#B8BCC2] opacity-0 group-hover/comment:opacity-100">edit</span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); openEditor(seg); }}
                        className="mt-1.5 text-[11px] text-[#8A95A3] hover:text-[#00928F]"
                      >
                        + Add comment
                      </button>
                    )
                  ) : (
                    seg.note && (
                      <div className="mt-1">
                        <p className="text-[11px] text-[#3D5265]/70 line-clamp-2">{seg.note}</p>
                        {noteByline && (
                          <p className="mt-0.5 text-[10px] text-[#8A95A3]">— {noteByline}</p>
                        )}
                      </div>
                    )
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
