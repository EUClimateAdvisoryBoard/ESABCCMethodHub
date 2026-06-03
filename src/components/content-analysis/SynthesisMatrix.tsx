'use client';

import { useMemo, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import { descendantCodeIds } from '@/lib/content-analysis/store';
import {
  citationLabel,
  evidenceStrength,
  STRENGTH_META,
} from '@/lib/content-analysis/report-structure';

interface Props {
  documents: AnalysisDocument[];
  codes: CodeNode[];
  segments: CodedSegment[];
}

/**
 * Literature synthesis matrix — the workhorse artefact of any systematic
 * review. Rows are themes (codes), columns are sources (documents). Each cell
 * counts the coded quotes a source contributes to a theme; an empty cell means
 * "this source says nothing on this theme".
 *
 * Beyond the grid it surfaces the two numbers that matter when drafting:
 *   • Row Σ — how much total evidence a theme has,
 *   • Sources — across how many *independent* sources (triangulation). A theme
 *     resting on a single source is flagged amber; one with none is a red gap.
 *
 * The analyst can switch the row granularity between top-level themes and a
 * drilled-in subtree, and sort by evidence or by triangulation. Pure SVG/CSS.
 */
export default function SynthesisMatrix({ documents, codes, segments }: Props) {
  const rootCodes = useMemo(() => codes.filter(c => c.parentId === null), [codes]);

  // Which code's children define the rows. null ⇒ the top-level roots.
  const [drillId, setDrillId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'evidence' | 'sources'>('evidence');

  const rowCodes = useMemo(() => {
    if (drillId === null) return rootCodes;
    const children = codes.filter(c => c.parentId === drillId);
    // A leaf theme has no children — keep showing it as a single row so the
    // drill never dead-ends on an empty grid.
    return children.length > 0 ? children : codes.filter(c => c.id === drillId);
  }, [drillId, rootCodes, codes]);

  const { rows, maxCell } = useMemo(() => {
    let max = 1;
    const computed = rowCodes.map(code => {
      const scope = new Set(descendantCodeIds(codes, code.id));
      const cells = documents.map(doc => {
        const n = segments.filter(s => s.documentId === doc.id && scope.has(s.codeId)).length;
        if (n > max) max = n;
        return { doc, n };
      });
      const total = cells.reduce((acc, c) => acc + c.n, 0);
      const sourceCount = cells.filter(c => c.n > 0).length;
      const hasChildren = codes.some(c => c.parentId === code.id);
      return { code, cells, total, sourceCount, hasChildren };
    });
    computed.sort((a, b) =>
      sortBy === 'sources' ? b.sourceCount - a.sourceCount || b.total - a.total : b.total - a.total,
    );
    return { rows: computed, maxCell: max };
  }, [rowCodes, documents, segments, codes, sortBy]);

  // Only show columns (sources) that carry at least one of the visible rows'
  // hits — keeps the matrix legible when the corpus is large.
  const activeDocs = useMemo(() => {
    const live = new Set<string>();
    for (const r of rows) for (const c of r.cells) if (c.n > 0) live.add(c.doc.id);
    return documents.filter(d => live.has(d.id));
  }, [rows, documents]);

  if (documents.length === 0 || rowCodes.length === 0) {
    return (
      <div className="p-4 text-[12.5px] text-[#8A95A3] italic">
        Add at least one document to the workspace and tag a passage to build a synthesis matrix.
      </div>
    );
  }

  const totalQuotes = rows.reduce((acc, r) => acc + r.total, 0);
  if (totalQuotes === 0) {
    return (
      <div className="p-4 text-[12.5px] text-[#8A95A3] italic">
        No coded quotes under the current lens yet. Tag passages in the Code view to populate the matrix.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Controls */}
      <div className="flex items-center gap-2 flex-wrap text-[11px]">
        {drillId !== null && (
          <button
            type="button"
            onClick={() => setDrillId(null)}
            className="px-2 py-0.5 rounded-sm border border-[#E6E7E8] text-[#3D5265] hover:bg-[#F3F4F6]"
          >
            ↑ Back to themes
          </button>
        )}
        <span className="text-[10px] uppercase tracking-[0.12em] text-[#8A95A3] font-semibold ml-auto">
          Sort
        </span>
        {(['evidence', 'sources'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setSortBy(s)}
            className={`px-2 py-0.5 rounded-sm transition ${
              sortBy === s ? 'bg-[#3D5265] text-white' : 'text-[#3D5265] hover:bg-[#F3F4F6]'
            }`}
          >
            {s === 'evidence' ? 'Most evidence' : 'Most triangulated'}
          </button>
        ))}
      </div>

      <div className="overflow-x-auto border border-[#E6E7E8] rounded-md">
        <table className="text-[11.5px] text-[#3D5265] border-collapse w-full">
          <thead>
            <tr>
              <th className="text-left font-mono text-[10px] uppercase tracking-[0.12em] text-[#8A95A3] p-2 border-b border-[#E6E7E8] sticky left-0 bg-white z-10">
                Theme \ Source
              </th>
              {activeDocs.map(d => (
                <th
                  key={d.id}
                  className="p-2 border-b border-[#E6E7E8] align-bottom text-left"
                  style={{ minWidth: 76, maxWidth: 110 }}
                  title={d.title}
                >
                  <div className="font-semibold text-[10.5px] leading-tight line-clamp-3">
                    {citationLabel(d)}
                  </div>
                </th>
              ))}
              <th className="p-2 border-b border-[#E6E7E8] text-right font-mono text-[10px] uppercase tracking-[0.1em] text-[#8A95A3]">
                Σ
              </th>
              <th className="p-2 border-b border-[#E6E7E8] text-center font-mono text-[10px] uppercase tracking-[0.1em] text-[#8A95A3]">
                Support
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ code, cells, total, sourceCount, hasChildren }) => {
              const visibleCells = cells.filter(c => activeDocs.some(d => d.id === c.doc.id));
              const strength = STRENGTH_META[evidenceStrength(sourceCount)];
              return (
                <tr key={code.id} className="hover:bg-[#FBFBFA]">
                  <th className="text-left p-2 border-b border-[#F0F1F2] sticky left-0 bg-white">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: code.color }} aria-hidden />
                      <span className="font-semibold">{code.name}</span>
                      {hasChildren && (
                        <button
                          type="button"
                          onClick={() => setDrillId(code.id)}
                          className="text-[9px] text-[#0065A4] hover:underline ml-1"
                          title="Break this theme into its sub-themes"
                        >
                          drill ↓
                        </button>
                      )}
                    </span>
                  </th>
                  {visibleCells.map(({ doc, n }) => (
                    <td
                      key={doc.id}
                      className="p-2 border-b border-[#F0F1F2] text-center font-mono tabular-nums"
                      style={{
                        backgroundColor: n === 0 ? '#FCFCFB' : `${code.color}${intensityAlpha(n / maxCell)}`,
                        color: n === 0 ? '#C8CDD3' : '#3D5265',
                      }}
                      title={
                        n === 0
                          ? `${citationLabel(doc)} contributes nothing on "${code.name}".`
                          : `${n} quote${n === 1 ? '' : 's'} on "${code.name}" from ${citationLabel(doc)}.`
                      }
                    >
                      {n === 0 ? '·' : n}
                    </td>
                  ))}
                  <td className="p-2 border-b border-[#F0F1F2] text-right font-mono tabular-nums font-semibold">
                    {total}
                  </td>
                  <td className="p-2 border-b border-[#F0F1F2] text-center">
                    <span
                      className="inline-block rounded-full px-1.5 py-0.5 text-[9.5px] font-semibold text-white"
                      style={{ backgroundColor: strength.color }}
                      title={`${sourceCount} source${sourceCount === 1 ? '' : 's'} — ${strength.hint}`}
                    >
                      {sourceCount}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 flex-wrap text-[10.5px] text-[#8A95A3]">
        <span className="font-semibold uppercase tracking-[0.1em]">Support</span>
        {(['gap', 'single', 'emerging', 'strong'] as const).map(k => (
          <span key={k} className="inline-flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STRENGTH_META[k].color }} />
            {STRENGTH_META[k].label}
          </span>
        ))}
        <span className="ml-auto">
          Denser cells = more quotes. The Support badge counts independent sources (triangulation).
        </span>
      </div>
    </div>
  );
}

function intensityAlpha(pct: number): string {
  const a = Math.max(0.12, Math.min(0.6, pct));
  return Math.round(a * 255).toString(16).padStart(2, '0');
}
