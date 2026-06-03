'use client';

import { useMemo, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import {
  aggregateEvidence,
  citationLabel,
  fullCitation,
} from '@/lib/content-analysis/report-structure';

interface Props {
  documents: AnalysisDocument[];
  codes: CodeNode[];
  segments: CodedSegment[];
  /** Jump to a segment in the document viewer (Code view). */
  onJump?: (segmentId: string) => void;
}

/**
 * Citable evidence bank. Pick a theme and get every coded quote that supports
 * it, grouped by source and labelled with a citation — the raw material for
 * drafting a section. Each quote keeps its analyst note (the "why this
 * matters") and links back to the exact passage in the document.
 *
 * Two exports turn the bank into report-ready output:
 *   • Word — a formatted evidence table (quote · source · note),
 *   • a reference list of every source cited, de-duplicated.
 */
export default function EvidenceBasePanel({ documents, codes, segments, onJump }: Props) {
  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);
  const rootCodes = useMemo(() => codes.filter(c => c.parentId === null), [codes]);

  // 'all' aggregates across every theme; otherwise a single root code subtree.
  const [themeId, setThemeId] = useState<string>('all');

  const codeIds = themeId === 'all' ? rootCodes.map(c => c.id) : [themeId];
  const evidence = useMemo(
    () => aggregateEvidence(codeIds, codes, documents, segments),
    [codeIds, codes, documents, segments],
  );

  const themeName =
    themeId === 'all' ? 'all themes' : codeById.get(themeId)?.name ?? 'selected theme';

  const exportWord = () => {
    const escape = (v: string) =>
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const rowsHtml = evidence.sources
      .map(src => {
        const cite = escape(citationLabel(src.document));
        return src.segments
          .map((seg, i) => {
            const code = codeById.get(seg.codeId);
            const tag = code
              ? `<span style="background-color:${code.color};color:#fff;padding:1pt 4pt;border-radius:3pt;font-size:8pt;">${escape(code.name)}</span>`
              : '';
            const note = seg.note?.trim()
              ? `<div style="color:#555;font-size:9pt;margin-top:2pt;">${escape(seg.note.trim())}</div>`
              : '';
            return `<tr>
              <td style="vertical-align:top;">${i === 0 ? cite : ''}</td>
              <td style="vertical-align:top;">${tag}</td>
              <td style="vertical-align:top;"><em>“${escape(seg.text.replace(/\s+/g, ' ').trim())}”</em>${note}</td>
            </tr>`;
          })
          .join('');
      })
      .join('');
    const refs = evidence.sources
      .map(s => `<li>${escape(fullCitation(s.document))}</li>`)
      .join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Evidence — ${escape(themeName)}</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color:#1a1a1a; }
  table { border-collapse: collapse; width: 100%; margin-top: 8pt; }
  th, td { border: 0.5pt solid #bbb; padding: 4pt 6pt; text-align: left; vertical-align: top; }
  th { background-color: #F2F2F2; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em; }
</style></head><body>
<h2>Evidence base — ${escape(themeName)}</h2>
<p>${evidence.segments.length} coded quote(s) across ${evidence.sourceCount} source(s), ${new Date().toLocaleDateString()}.</p>
<table>
  <tr><th>Source</th><th>Code</th><th>Quote &amp; note</th></tr>
  ${rowsHtml}
</table>
<h3>Sources cited</h3>
<ol>${refs}</ol>
</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `evidence-${themeId}-${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyReferences = async () => {
    const list = evidence.sources.map(s => fullCitation(s.document)).join('\n');
    try {
      await navigator.clipboard.writeText(list);
    } catch {
      /* clipboard blocked — no-op in the beta */
    }
  };

  return (
    <div className="space-y-3">
      {/* Theme picker + exports */}
      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[10px] uppercase tracking-[0.12em] text-[#8A95A3] font-semibold">Theme</label>
        <select
          value={themeId}
          onChange={e => setThemeId(e.target.value)}
          className="text-[12px] border border-[#E6E7E8] rounded-sm px-2 py-1 bg-white text-[#3D5265] max-w-[260px]"
        >
          <option value="all">All themes</option>
          {rootCodes.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div className="ml-auto flex items-center gap-3">
          <button
            type="button"
            onClick={copyReferences}
            disabled={evidence.sourceCount === 0}
            className="text-[11px] font-medium text-[#3D5265] hover:underline disabled:text-[#B8BCC2] disabled:no-underline disabled:cursor-not-allowed"
          >
            Copy reference list
          </button>
          <button
            type="button"
            onClick={exportWord}
            disabled={evidence.segments.length === 0}
            className="text-[11px] font-medium text-[#003399] hover:text-[#002266] disabled:text-[#B8BCC2] disabled:cursor-not-allowed"
          >
            Export Word
          </button>
        </div>
      </div>

      <p className="text-[11.5px] text-[#8A95A3]">
        <span className="font-semibold text-[#3D5265]">{evidence.segments.length}</span> quote
        {evidence.segments.length === 1 ? '' : 's'} from{' '}
        <span className="font-semibold text-[#3D5265]">{evidence.sourceCount}</span> source
        {evidence.sourceCount === 1 ? '' : 's'} support “{themeName}”.
      </p>

      {evidence.sourceCount === 0 ? (
        <div className="border border-dashed border-[#E6E7E8] rounded-md p-5 text-center text-[12px] text-[#8A95A3] italic">
          No coded evidence for this theme yet. Tag passages in the Code view, then return here to gather them.
        </div>
      ) : (
        <ul className="space-y-3">
          {evidence.sources.map(src => (
            <li key={src.document.id} className="border border-[#E6E7E8] rounded-md overflow-hidden">
              <div className="px-3 py-2 bg-[#FBFBFA] border-b border-[#E6E7E8] flex items-baseline gap-2">
                <span className="font-semibold text-[12.5px] text-[#3D5265]">
                  {citationLabel(src.document)}
                </span>
                <span className="text-[10.5px] text-[#8A95A3] truncate flex-1" title={src.document.title}>
                  {src.document.title}
                </span>
                <span className="font-mono text-[10px] text-[#8A95A3] shrink-0">
                  {src.segments.length} quote{src.segments.length === 1 ? '' : 's'}
                </span>
              </div>
              <ul className="divide-y divide-[#F0F1F2]">
                {src.segments.map(seg => {
                  const code = codeById.get(seg.codeId);
                  return (
                    <li key={seg.id} className="px-3 py-2">
                      <div className="flex items-start gap-2">
                        <span
                          className="mt-0.5 inline-block shrink-0 rounded-sm px-1.5 py-0.5 text-[9.5px] font-medium text-white"
                          style={{ backgroundColor: code?.color ?? '#8A95A3' }}
                        >
                          {code?.name ?? 'tag'}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[12px] italic text-[#3D5265] leading-snug">
                            “{seg.text.replace(/\s+/g, ' ').trim()}”
                          </p>
                          {seg.note?.trim() && (
                            <p className="mt-1 text-[11px] text-[#6B7785] leading-snug">
                              <span className="font-semibold">Note:</span> {seg.note.trim()}
                            </p>
                          )}
                          {onJump && (
                            <button
                              type="button"
                              onClick={() => onJump(seg.id)}
                              className="mt-1 text-[10.5px] text-[#0065A4] hover:underline"
                            >
                              Show in document →
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
