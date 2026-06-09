'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import { descendantCodeIds } from '@/lib/content-analysis/store';
import {
  type ReportOutline,
  type ReportSection,
  aggregateEvidence,
  buildDefaultOutline,
  citationLabel,
  evidenceStrength,
  expandCodeIds,
  fetchOutline,
  fullCitation,
  loadOutline,
  makeSection,
  pushOutline,
  STRENGTH_META,
} from '@/lib/content-analysis/report-structure';

interface Props {
  projectId: string;
  projectName: string;
  documents: AnalysisDocument[];
  codes: CodeNode[];
  segments: CodedSegment[];
}

/** Codes in tree order (DFS), each with its depth — for the indented picker. */
function orderedCodes(codes: CodeNode[]): Array<{ code: CodeNode; depth: number }> {
  const byParent = new Map<string | null, CodeNode[]>();
  for (const c of codes) {
    const list = byParent.get(c.parentId) ?? [];
    list.push(c);
    byParent.set(c.parentId, list);
  }
  for (const list of byParent.values()) list.sort((a, b) => a.name.localeCompare(b.name));
  const out: Array<{ code: CodeNode; depth: number }> = [];
  const walk = (parentId: string | null, depth: number) => {
    for (const c of byParent.get(parentId) ?? []) {
      out.push({ code: c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);
  return out;
}

/**
 * Report outline builder — the bridge from coded literature to the written
 * report. The analyst lays out the report's sections and maps each to the
 * codes whose evidence belongs there; the builder then places every coded
 * source into its section, scores how well each section is supported
 * (triangulation), and flags the gaps to fill before drafting.
 *
 * The outline persists per workspace project, and exports to a Word / Markdown
 * skeleton — sections, the sources that belong in each, and their quotes —
 * so drafting starts from evidence rather than a blank page.
 */
export default function ReportOutlineBuilder({
  projectId,
  projectName,
  documents,
  codes,
  segments,
}: Props) {
  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);
  const rootCodes = useMemo(() => codes.filter(c => c.parentId === null), [codes]);
  const codeList = useMemo(() => orderedCodes(codes), [codes]);

  const [outline, setOutline] = useState<ReportOutline>(() => buildDefaultOutline(rootCodes));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingCodeFor, setAddingCodeFor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const loadedFor = useRef<string | null>(null);

  // Load the saved outline once per project (and seed the default from the
  // live root codes the first time, so a brand-new report opens pre-mapped).
  // Paint instantly from the localStorage cache, then override with the shared
  // server outline so every collaborator converges on the same structure.
  useEffect(() => {
    if (loadedFor.current === projectId) return;
    loadedFor.current = projectId;
    setOutline(loadOutline(projectId, rootCodes));
    let cancelled = false;
    void fetchOutline(projectId).then(server => {
      if (!cancelled && server) setOutline(server);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, rootCodes]);

  const persist = useCallback(
    (next: ReportOutline) => {
      setOutline(next);
      void pushOutline(projectId, next);
    },
    [projectId],
  );

  const mutateSections = useCallback(
    (fn: (sections: ReportSection[]) => ReportSection[]) =>
      persist({ ...outline, sections: fn(outline.sections) }),
    [outline, persist],
  );

  // ── Section mutations ──────────────────────────────────────────────────
  const addSection = () =>
    mutateSections(s => [...s, makeSection(`Section ${s.length + 1}`)]);
  const deleteSection = (id: string) =>
    mutateSections(s => s.filter(x => x.id !== id));
  const renameSection = (id: string, title: string, description: string) =>
    mutateSections(s => s.map(x => (x.id === id ? { ...x, title, description } : x)));
  const moveSection = (id: string, dir: -1 | 1) =>
    mutateSections(s => {
      const i = s.findIndex(x => x.id === id);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= s.length) return s;
      const next = [...s];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const toggleCode = (sectionId: string, codeId: string) =>
    mutateSections(s =>
      s.map(x =>
        x.id === sectionId
          ? {
              ...x,
              codeIds: x.codeIds.includes(codeId)
                ? x.codeIds.filter(c => c !== codeId)
                : [...x.codeIds, codeId],
            }
          : x,
      ),
    );
  const resetOutline = () => {
    if (window.confirm('Reset the outline to the suggested structure? Your section edits will be lost.')) {
      persist(buildDefaultOutline(rootCodes));
    }
  };
  const toggleExpand = (id: string) =>
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // ── Evidence per section + coverage roll-up ─────────────────────────────
  const sectionEvidence = useMemo(
    () => new Map(outline.sections.map(s => [s.id, aggregateEvidence(s.codeIds, codes, documents, segments)])),
    [outline.sections, codes, documents, segments],
  );

  // Codes mapped anywhere in the outline (expanded to subtrees), and the
  // segments / sources those cover — used to surface what's still unplaced.
  const mappedCodeIds = useMemo(
    () => expandCodeIds(codes, outline.sections.flatMap(s => s.codeIds)),
    [codes, outline.sections],
  );

  const unmappedThemes = useMemo(() => {
    return rootCodes
      .map(root => {
        const scope = new Set(descendantCodeIds(codes, root.id));
        const quotes = segments.filter(s => scope.has(s.codeId));
        // A root theme is "unplaced" when none of its subtree is mapped to any
        // section yet it carries evidence — a prompt to add it to the report.
        const anyMapped = [...scope].some(id => mappedCodeIds.has(id));
        return { root, count: quotes.length, anyMapped };
      })
      .filter(t => t.count > 0 && !t.anyMapped);
  }, [rootCodes, codes, segments, mappedCodeIds]);

  const unplacedSources = useMemo(() => {
    return documents.filter(d => {
      const segs = segments.filter(s => s.documentId === d.id);
      if (segs.length === 0) return false; // not coded at all → not "unplaced"
      return !segs.some(s => mappedCodeIds.has(s.codeId));
    });
  }, [documents, segments, mappedCodeIds]);

  // ── Export ──────────────────────────────────────────────────────────────
  const buildMarkdown = (): string => {
    const lines: string[] = [`# ${projectName} — report outline`, ''];
    outline.sections.forEach((sec, i) => {
      lines.push(`## ${i + 1}. ${sec.title}`);
      if (sec.description) lines.push(`_${sec.description}_`, '');
      const ev = sectionEvidence.get(sec.id)!;
      const strength = STRENGTH_META[evidenceStrength(ev.sourceCount)];
      if (sec.codeIds.length === 0) {
        lines.push('> Framing section — synthesises the thematic sections.', '');
      } else if (ev.sourceCount === 0) {
        lines.push(`> ⚠ ${strength.label}: ${strength.hint}`, '');
      } else {
        lines.push(`> ${strength.label} — ${ev.segments.length} quote(s) from ${ev.sourceCount} source(s).`, '');
        for (const src of ev.sources) {
          lines.push(`- **${citationLabel(src.document)}** (${src.segments.length})`);
          for (const seg of src.segments) {
            lines.push(`  - "${seg.text.replace(/\s+/g, ' ').trim()}"${seg.note?.trim() ? ` — ${seg.note.trim()}` : ''}`);
          }
        }
        lines.push('');
      }
    });
    // Reference list.
    const cited = new Map<string, AnalysisDocument>();
    for (const ev of sectionEvidence.values()) for (const s of ev.sources) cited.set(s.document.id, s.document);
    if (cited.size > 0) {
      lines.push('## Sources cited', '');
      for (const doc of cited.values()) lines.push(`- ${fullCitation(doc)}`);
    }
    return lines.join('\n');
  };

  const copyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(buildMarkdown());
    } catch {
      /* clipboard blocked */
    }
  };

  const exportWord = () => {
    const escape = (v: string) =>
      v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const sectionsHtml = outline.sections
      .map((sec, i) => {
        const ev = sectionEvidence.get(sec.id)!;
        const strength = STRENGTH_META[evidenceStrength(ev.sourceCount)];
        const head = `<h2>${i + 1}. ${escape(sec.title)}</h2>${
          sec.description ? `<p style="color:#555;font-style:italic;">${escape(sec.description)}</p>` : ''
        }`;
        if (sec.codeIds.length === 0) {
          return `${head}<p style="color:#888;">Framing section — synthesises the thematic sections.</p>`;
        }
        if (ev.sourceCount === 0) {
          return `${head}<p style="color:${strength.color};font-weight:600;">⚠ ${strength.label}: ${escape(strength.hint)}</p>`;
        }
        const body = ev.sources
          .map(src => {
            const quotes = src.segments
              .map(
                seg =>
                  `<li><em>“${escape(seg.text.replace(/\s+/g, ' ').trim())}”</em>${
                    seg.note?.trim() ? ` — ${escape(seg.note.trim())}` : ''
                  }</li>`,
              )
              .join('');
            return `<p style="margin:6pt 0 2pt;"><strong>${escape(citationLabel(src.document))}</strong> (${src.segments.length})</p><ul>${quotes}</ul>`;
          })
          .join('');
        return `${head}<p style="color:${strength.color};font-weight:600;">${strength.label} — ${ev.segments.length} quote(s) from ${ev.sourceCount} source(s).</p>${body}`;
      })
      .join('');
    const cited = new Map<string, AnalysisDocument>();
    for (const ev of sectionEvidence.values()) for (const s of ev.sources) cited.set(s.document.id, s.document);
    const refs = [...cited.values()].map(d => `<li>${escape(fullCitation(d))}</li>`).join('');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escape(projectName)} — report outline</title>
<style>
  body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color:#1a1a1a; }
  h1 { font-size: 16pt; } h2 { font-size: 13pt; margin-top: 14pt; } h3 { font-size: 11pt; }
  ul { margin: 2pt 0 6pt; } li { margin-bottom: 2pt; }
</style></head><body>
<h1>${escape(projectName)} — report outline</h1>
<p style="color:#555;">Evidence-grounded skeleton generated ${new Date().toLocaleDateString()}.</p>
${sectionsHtml}
<h2>Sources cited</h2><ol>${refs}</ol>
</body></html>`;
    const blob = new Blob(['﻿', html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = `report-outline-${new Date().toISOString().slice(0, 10)}.doc`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 flex-wrap">
        <p className="text-[12px] text-[#3D5265]/80 max-w-2xl leading-relaxed flex-1">
          Lay out the report and map each section to the tags whose evidence belongs there. Every coded
          source is then placed into its section, scored for how well it is supported, and gaps are flagged —
          so you draft from evidence, not a blank page.
        </p>
        <div className="flex items-center gap-3 shrink-0">
          <button type="button" onClick={copyMarkdown} className="text-[11px] font-medium text-[#3D5265] hover:underline">
            Copy Markdown
          </button>
          <button type="button" onClick={exportWord} className="text-[11px] font-medium text-[#003399] hover:text-[#002266]">
            Export skeleton (Word)
          </button>
          <button type="button" onClick={resetOutline} className="text-[11px] font-medium text-[#8A95A3] hover:text-[#B83230]">
            Reset
          </button>
        </div>
      </div>

      {/* Sections */}
      <ol className="space-y-2.5">
        {outline.sections.map((sec, i) => {
          const ev = sectionEvidence.get(sec.id)!;
          const strength = STRENGTH_META[evidenceStrength(ev.sourceCount)];
          const isFraming = sec.codeIds.length === 0;
          const isOpen = expanded.has(sec.id);
          const assignedIds = new Set(sec.codeIds);
          return (
            <li key={sec.id} className="border border-[#E6E7E8] rounded-md bg-white">
              {/* Header row */}
              <div className="flex items-start gap-2 px-3 py-2.5">
                <span className="font-mono text-[12px] text-[#8A95A3] mt-0.5 tabular-nums w-5 text-right">{i + 1}.</span>
                <div className="flex-1 min-w-0">
                  {editingId === sec.id ? (
                    <SectionEditor
                      section={sec}
                      onSave={(t, d) => { renameSection(sec.id, t, d); setEditingId(null); }}
                      onCancel={() => setEditingId(null)}
                    />
                  ) : (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-[14px] font-bold text-[#3D5265]">{sec.title}</h4>
                        {isFraming ? (
                          <span className="text-[10px] text-[#8A95A3] italic">framing section</span>
                        ) : (
                          <span
                            className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9.5px] font-semibold text-white"
                            style={{ backgroundColor: strength.color }}
                            title={strength.hint}
                          >
                            {strength.label}
                            <span className="font-mono opacity-80">· {ev.segments.length}q / {ev.sourceCount}s</span>
                          </span>
                        )}
                      </div>
                      {sec.description && (
                        <p className="text-[11.5px] text-[#8A95A3] mt-0.5 leading-snug">{sec.description}</p>
                      )}
                    </>
                  )}

                  {/* Mapped code chips */}
                  <div className="flex items-center gap-1.5 flex-wrap mt-2">
                    {sec.codeIds.map(cid => {
                      const c = codeById.get(cid);
                      if (!c) return null;
                      return (
                        <span
                          key={cid}
                          className="inline-flex items-center gap-1 rounded-sm pl-1.5 pr-1 py-0.5 text-[10.5px] text-white"
                          style={{ backgroundColor: c.color }}
                        >
                          {c.name}
                          <button
                            type="button"
                            onClick={() => toggleCode(sec.id, cid)}
                            className="hover:bg-black/20 rounded-sm w-3.5 h-3.5 inline-flex items-center justify-center leading-none"
                            title="Unmap this tag"
                            aria-label={`Remove ${c.name}`}
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                    {addingCodeFor === sec.id ? (
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={e => { if (e.target.value) toggleCode(sec.id, e.target.value); setAddingCodeFor(null); }}
                        onBlur={() => setAddingCodeFor(null)}
                        className="text-[11px] border border-[#E6E7E8] rounded-sm px-1.5 py-0.5 bg-white text-[#3D5265]"
                      >
                        <option value="" disabled>Add a tag…</option>
                        {codeList
                          .filter(({ code }) => !assignedIds.has(code.id))
                          .map(({ code, depth }) => (
                            <option key={code.id} value={code.id}>
                              {' '.repeat(depth * 2)}{code.name}
                            </option>
                          ))}
                      </select>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setAddingCodeFor(sec.id)}
                        className="text-[10.5px] text-[#0065A4] border border-dashed border-[#B8CCE0] rounded-sm px-1.5 py-0.5 hover:bg-[#F0F6FB]"
                      >
                        + map tag
                      </button>
                    )}
                  </div>
                </div>

                {/* Row controls */}
                <div className="flex items-center gap-0.5 shrink-0 text-[#B8BCC2]">
                  <button type="button" onClick={() => moveSection(sec.id, -1)} disabled={i === 0} className="px-1 hover:text-[#3D5265] disabled:opacity-30" title="Move up">↑</button>
                  <button type="button" onClick={() => moveSection(sec.id, 1)} disabled={i === outline.sections.length - 1} className="px-1 hover:text-[#3D5265] disabled:opacity-30" title="Move down">↓</button>
                  <button type="button" onClick={() => setEditingId(sec.id)} className="px-1 hover:text-[#3D5265]" title="Edit title & description">✎</button>
                  <button type="button" onClick={() => deleteSection(sec.id)} className="px-1 hover:text-[#B83230]" title="Delete section">×</button>
                </div>
              </div>

              {/* Sources that belong here */}
              {!isFraming && ev.sourceCount > 0 && (
                <div className="border-t border-[#F0F1F2] px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggleExpand(sec.id)}
                    className="text-[11px] font-semibold text-[#3D5265] hover:text-[#0065A4] flex items-center gap-1"
                  >
                    <span className="text-[9px]">{isOpen ? '▾' : '▸'}</span>
                    Articles & sources that belong here ({ev.sourceCount})
                  </button>
                  {isOpen && (
                    <ul className="mt-1.5 space-y-1.5">
                      {ev.sources.map(src => (
                        <li key={src.document.id} className="flex items-start gap-2 text-[11.5px]">
                          <span className="font-mono text-[10px] text-[#8A95A3] mt-0.5 shrink-0 w-6 text-right">{src.segments.length}×</span>
                          <span className="min-w-0">
                            <span className="font-semibold text-[#3D5265]">{citationLabel(src.document)}</span>
                            <span className="text-[#8A95A3]"> — {src.document.title}</span>
                            <span className="flex flex-wrap gap-1 mt-0.5">
                              {src.codeIds.map(cid => {
                                const c = codeById.get(cid);
                                return c ? (
                                  <span key={cid} className="inline-block rounded-sm px-1 py-0.5 text-[9px] text-white" style={{ backgroundColor: c.color }}>
                                    {c.name}
                                  </span>
                                ) : null;
                              })}
                            </span>
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>

      <button
        type="button"
        onClick={addSection}
        className="text-[11.5px] font-medium text-[#0065A4] border border-dashed border-[#B8CCE0] rounded-md px-3 py-1.5 hover:bg-[#F0F6FB]"
      >
        + Add section
      </button>

      {/* What's not yet in the report */}
      {(unmappedThemes.length > 0 || unplacedSources.length > 0) && (
        <div className="border border-[#F2D9C2] bg-[#FDF6F0] rounded-md p-3 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-[#E87722] font-semibold">
            Not yet in the report
          </p>
          {unmappedThemes.length > 0 && (
            <div className="text-[11.5px] text-[#3D5265]">
              <span className="font-semibold">Coded themes with no home:</span>{' '}
              {unmappedThemes.map((t, idx) => (
                <span key={t.root.id}>
                  <span className="inline-flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: t.root.color }} />
                    {t.root.name} <span className="text-[#8A95A3] font-mono">({t.count})</span>
                  </span>
                  {idx < unmappedThemes.length - 1 ? ', ' : ''}
                </span>
              ))}
              <span className="text-[#8A95A3]"> — map these to a section so their evidence reaches the report.</span>
            </div>
          )}
          {unplacedSources.length > 0 && (
            <div className="text-[11.5px] text-[#3D5265]">
              <span className="font-semibold">Sources coded but unplaced:</span>{' '}
              <span>{unplacedSources.map(d => citationLabel(d)).join(', ')}</span>
              <span className="text-[#8A95A3]"> — their tags aren’t mapped to any section yet.</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Inline section title / description editor ────────────────────────────────
function SectionEditor({
  section,
  onSave,
  onCancel,
}: {
  section: ReportSection;
  onSave: (title: string, description: string) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(section.title);
  const [description, setDescription] = useState(section.description ?? '');
  return (
    <div className="space-y-1.5">
      <input
        value={title}
        onChange={e => setTitle(e.target.value)}
        autoFocus
        placeholder="Section title"
        className="w-full text-[13px] font-semibold border border-[#E6E7E8] rounded-sm px-2 py-1 text-[#3D5265]"
      />
      <input
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="What belongs in this section?"
        className="w-full text-[11.5px] border border-[#E6E7E8] rounded-sm px-2 py-1 text-[#3D5265]"
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onSave(title.trim() || 'Untitled section', description.trim())}
          className="text-[11px] font-medium text-white bg-[#00928F] hover:bg-[#006F6C] rounded-sm px-2 py-0.5"
        >
          Save
        </button>
        <button type="button" onClick={onCancel} className="text-[11px] text-[#8A95A3] hover:underline">
          Cancel
        </button>
      </div>
    </div>
  );
}
