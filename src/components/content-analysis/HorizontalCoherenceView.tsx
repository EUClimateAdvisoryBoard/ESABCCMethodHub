'use client';

import { useMemo } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import { descendantCodeIds } from '@/lib/content-analysis/store';
import { documentKindLabel } from '@/lib/content-analysis/source-tier';

interface Props {
  documents: AnalysisDocument[];
  codes: CodeNode[];
  segments: CodedSegment[];
}

/**
 * Horizontal coherence = "do these policies talk about the same thing?"
 * Matrix view: rows = top-level codes, cols = documents. Cell shows the
 * hit count; a blank cell is the "this text does not at all use this
 * concept" signal from the brief.
 */
export default function HorizontalCoherenceView({ documents, codes, segments }: Props) {
  const rootCodes = useMemo(() => codes.filter(c => c.parentId === null), [codes]);

  const { matrix, totalsByCode } = useMemo(() => {
    const mat: Record<string, Record<string, number>> = {};
    const totals: Record<string, number> = {};
    for (const root of rootCodes) {
      mat[root.id] = {};
      const descendants = new Set(descendantCodeIds(codes, root.id));
      let total = 0;
      for (const doc of documents) {
        const hits = segments.filter(
          s => s.documentId === doc.id && descendants.has(s.codeId),
        ).length;
        mat[root.id][doc.id] = hits;
        total += hits;
      }
      totals[root.id] = total;
    }
    return { matrix: mat, totalsByCode: totals };
  }, [rootCodes, codes, documents, segments]);

  if (documents.length === 0 || rootCodes.length === 0) {
    return (
      <div className="p-4 text-[12.5px] text-[#8A95A3] italic">
        Need at least one document in scope and one master tag to compute a coherence matrix.
      </div>
    );
  }

  const maxCell = Math.max(
    1,
    ...rootCodes.flatMap(r => documents.map(d => matrix[r.id][d.id])),
  );

  return (
    <div className="overflow-x-auto">
      <table className="text-[11.5px] text-[#3D5265] border-collapse">
        <thead>
          <tr>
            <th className="text-left font-mono text-[10px] uppercase tracking-[0.14em] text-[#8A95A3] p-2 border-b border-[#E6E7E8] sticky left-0 bg-white">
              Concept \ Document
            </th>
            {documents.map(d => (
              <th
                key={d.id}
                className="p-2 border-b border-[#E6E7E8] align-bottom text-left"
                style={{ minWidth: 90, maxWidth: 120 }}
              >
                <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8A95A3] mb-0.5">
                  {documentKindLabel(d)}
                </div>
                <div className="font-semibold text-[11px] leading-tight line-clamp-3">
                  {d.shortTitle}
                </div>
              </th>
            ))}
            <th className="p-2 border-b border-[#E6E7E8] text-right font-mono text-[10px] uppercase tracking-[0.1em] text-[#8A95A3]">
              Row Σ
            </th>
          </tr>
        </thead>
        <tbody>
          {rootCodes.map(root => (
            <tr key={root.id}>
              <th className="text-left p-2 border-b border-[#F0F1F2] sticky left-0 bg-white">
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-sm"
                    style={{ backgroundColor: root.color }}
                    aria-hidden
                  />
                  <span className="font-semibold">{root.name}</span>
                </span>
              </th>
              {documents.map(d => {
                const v = matrix[root.id][d.id];
                const pct = v / maxCell;
                return (
                  <td
                    key={d.id}
                    className="p-2 border-b border-[#F0F1F2] text-center font-mono tabular-nums"
                    style={{
                      backgroundColor: v === 0 ? '#FDF6F0' : `${root.color}${intensityAlpha(pct)}`,
                      color: v === 0 ? '#B83230' : '#3D5265',
                    }}
                    title={
                      v === 0
                        ? `${d.shortTitle} does not use the concept "${root.name}".`
                        : `${v} segment${v === 1 ? '' : 's'} under "${root.name}" in ${d.shortTitle}.`
                    }
                  >
                    {v === 0 ? '—' : v}
                  </td>
                );
              })}
              <td className="p-2 border-b border-[#F0F1F2] text-right font-mono tabular-nums font-semibold">
                {totalsByCode[root.id]}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="mt-3 text-[11.5px] text-[#8A95A3] leading-relaxed max-w-3xl">
        Cells in warm beige flag a document that <em>does not at all use</em> the concept.
        Denser teal means more tagged hits. This is the entry point into horizontal
        coherence analysis — walk each row to surface programme-specific contradictions
        or gaps.
      </p>
    </div>
  );
}

function intensityAlpha(pct: number): string {
  const a = Math.max(0.1, Math.min(0.55, pct));
  const byte = Math.round(a * 255).toString(16).padStart(2, '0');
  return byte;
}
