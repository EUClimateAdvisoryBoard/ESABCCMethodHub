'use client';

import { useMemo, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import { codesByParent } from '@/lib/content-analysis/store';

interface Props {
  documents: AnalysisDocument[];
  codes: CodeNode[];
  segments: CodedSegment[];
  /** When set, the matrix collapses everything except this code's subtree. */
  selectedCodeId?: string | null;
}

/**
 * Compact visual summary of tag distribution across the supplied documents.
 *
 * Surfaces three views the workbench was missing:
 *   • a stacked bar — segment counts per top-level tag,
 *   • a coverage strip — percent of tagged-character coverage,
 *   • a matrix — root tags with expandable sub-tag rows + counts.
 *
 * Pure SVG/CSS; no chart-library dependency.
 */
export default function TagDistributionPanel({ documents, codes, segments }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [view, setView] = useState<'bar' | 'matrix' | 'coverage'>('bar');

  const codeById = useMemo(() => new Map(codes.map(c => [c.id, c])), [codes]);
  const byParent = useMemo(() => codesByParent(codes), [codes]);

  /** Resolve a code's root ancestor — used to bucket descendants under
   *  the visual family they belong to. */
  const rootOf = (id: string): CodeNode | null => {
    let cur = codeById.get(id) ?? null;
    let guard = 0;
    while (cur && cur.parentId && guard++ < 16) cur = codeById.get(cur.parentId) ?? null;
    return cur;
  };

  const rootCodes = useMemo(() => codes.filter(c => c.parentId === null), [codes]);

  // Per-root-tag aggregate counts (segment count + char coverage). Includes
  // descendants — a segment under "EU ETS" rolls up into "Mitigation".
  const rootStats = useMemo(() => {
    const out = new Map<string, { count: number; chars: number }>();
    for (const r of rootCodes) out.set(r.id, { count: 0, chars: 0 });
    for (const s of segments) {
      const root = rootOf(s.codeId);
      if (!root) continue;
      const cur = out.get(root.id) ?? { count: 0, chars: 0 };
      cur.count += 1;
      cur.chars += Math.max(0, s.endChar - s.startChar);
      out.set(root.id, cur);
    }
    return out;
  }, [segments, rootCodes, codeById]);

  // Per-code direct counts (no roll-up). Drives the matrix rows.
  const directCounts = useMemo(() => {
    const out: Record<string, number> = {};
    for (const s of segments) out[s.codeId] = (out[s.codeId] ?? 0) + 1;
    return out;
  }, [segments]);

  const totalSegments = segments.length;
  const totalDocChars = useMemo(
    () => documents.reduce((acc, d) => acc + (d.text?.length ?? 0), 0),
    [documents],
  );
  const totalTaggedChars = useMemo(
    () => segments.reduce((acc, s) => acc + Math.max(0, s.endChar - s.startChar), 0),
    [segments],
  );

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  });

  if (totalSegments === 0) {
    return (
      <div className="px-3 py-4 text-[12px] italic text-[#8A95A3]">
        No tagged segments {documents.length === 1 ? 'in this document' : 'across the selection'} yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2 px-3 py-1.5 border-b border-[#E6E7E8] bg-[#FBFBFA]">
        {(['bar', 'coverage', 'matrix'] as const).map(v => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`px-2 py-0.5 rounded-sm text-[10.5px] font-medium transition ${
              view === v
                ? 'bg-[#3D5265] text-white'
                : 'text-[#3D5265] hover:bg-[#F3F4F6]'
            }`}
          >
            {v === 'bar' ? 'Bar' : v === 'coverage' ? 'Coverage' : 'Matrix'}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-[#8A95A3] tabular-nums">
          {totalSegments} segments · {documents.length} doc{documents.length === 1 ? '' : 's'}
        </span>
      </div>

      {view === 'bar' && (
        <StackedBar rootCodes={rootCodes} rootStats={rootStats} totalSegments={totalSegments} />
      )}

      {view === 'coverage' && (
        <CoverageStrip
          documents={documents}
          rootCodes={rootCodes}
          codeById={codeById}
          segments={segments}
          rootOf={rootOf}
          totalDocChars={totalDocChars}
          totalTaggedChars={totalTaggedChars}
        />
      )}

      {view === 'matrix' && (
        <Matrix
          rootCodes={rootCodes}
          byParent={byParent}
          rootStats={rootStats}
          directCounts={directCounts}
          expanded={expanded}
          toggle={toggle}
          totalSegments={totalSegments}
        />
      )}
    </div>
  );
}

function StackedBar({
  rootCodes,
  rootStats,
  totalSegments,
}: {
  rootCodes: CodeNode[];
  rootStats: Map<string, { count: number; chars: number }>;
  totalSegments: number;
}) {
  const sorted = [...rootCodes]
    .map(r => ({ root: r, stats: rootStats.get(r.id) ?? { count: 0, chars: 0 } }))
    .filter(x => x.stats.count > 0)
    .sort((a, b) => b.stats.count - a.stats.count);
  return (
    <div className="px-3 py-2.5 space-y-2">
      <div className="flex h-3 rounded-sm overflow-hidden border border-[#E6E7E8]">
        {sorted.map(({ root, stats }) => (
          <div
            key={root.id}
            title={`${root.name}: ${stats.count} (${Math.round((stats.count / totalSegments) * 100)}%)`}
            style={{
              width: `${(stats.count / totalSegments) * 100}%`,
              backgroundColor: root.color,
            }}
          />
        ))}
      </div>
      <ul className="space-y-1">
        {sorted.map(({ root, stats }) => (
          <li key={root.id} className="flex items-center gap-2 text-[11.5px]">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: root.color }} />
            <span className="flex-1 truncate text-[#3D5265]">{root.name}</span>
            <span className="font-mono tabular-nums text-[#8A95A3]">
              {stats.count} · {Math.round((stats.count / totalSegments) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CoverageStrip({
  documents,
  rootCodes,
  codeById,
  segments,
  rootOf,
  totalDocChars,
  totalTaggedChars,
}: {
  documents: AnalysisDocument[];
  rootCodes: CodeNode[];
  codeById: Map<string, CodeNode>;
  segments: CodedSegment[];
  rootOf: (id: string) => CodeNode | null;
  totalDocChars: number;
  totalTaggedChars: number;
}) {
  const overallPct = totalDocChars === 0 ? 0 : Math.round((totalTaggedChars / totalDocChars) * 100);

  // Per-document strip with each segment shown as a coloured tick. Lets
  // the user see at a glance which documents are over- or under-coded.
  const perDoc = documents.map(d => {
    const docSegs = segments.filter(s => s.documentId === d.id);
    const docChars = d.text?.length ?? 0;
    const taggedChars = docSegs.reduce((acc, s) => acc + (s.endChar - s.startChar), 0);
    const pct = docChars === 0 ? 0 : Math.round((taggedChars / docChars) * 100);
    return { doc: d, segs: docSegs, docChars, pct };
  }).sort((a, b) => b.pct - a.pct);

  return (
    <div className="px-3 py-2.5 space-y-2">
      <div className="flex items-center gap-2 text-[11px] text-[#3D5265]">
        <span className="font-medium">Overall coverage</span>
        <span className="font-mono tabular-nums text-[#8A95A3] ml-auto">{overallPct}%</span>
      </div>
      <div className="h-1.5 rounded-sm bg-[#F3F4F6] overflow-hidden">
        <div
          className="h-full bg-[#00928F]"
          style={{ width: `${overallPct}%` }}
          aria-hidden
        />
      </div>
      {perDoc.length > 1 && (
        <ul className="mt-2 space-y-1">
          {perDoc.map(({ doc, segs, docChars, pct }) => (
            <li key={doc.id}>
              <div className="flex items-center gap-2 text-[10.5px]">
                <span className="flex-1 truncate text-[#3D5265]">{doc.shortTitle}</span>
                <span className="font-mono tabular-nums text-[#8A95A3]">{pct}%</span>
              </div>
              <div className="relative h-2 mt-0.5 rounded-sm bg-[#F3F4F6] overflow-hidden">
                {segs.map(s => {
                  const root = rootOf(s.codeId);
                  const color = codeById.get(s.codeId)?.color ?? root?.color ?? '#8A95A3';
                  if (!docChars) return null;
                  return (
                    <span
                      key={s.id}
                      title={`${codeById.get(s.codeId)?.name ?? 'tag'} — "${s.text.slice(0, 80)}"`}
                      className="absolute top-0 bottom-0"
                      style={{
                        left: `${(s.startChar / docChars) * 100}%`,
                        width: `${Math.max(0.3, ((s.endChar - s.startChar) / docChars) * 100)}%`,
                        backgroundColor: color,
                      }}
                    />
                  );
                })}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Matrix({
  rootCodes,
  byParent,
  rootStats,
  directCounts,
  expanded,
  toggle,
  totalSegments,
}: {
  rootCodes: CodeNode[];
  byParent: Map<string | null, CodeNode[]>;
  rootStats: Map<string, { count: number; chars: number }>;
  directCounts: Record<string, number>;
  expanded: Set<string>;
  toggle: (id: string) => void;
  totalSegments: number;
}) {
  const rows = [...rootCodes]
    .map(r => ({ node: r, count: rootStats.get(r.id)?.count ?? 0 }))
    .filter(x => x.count > 0)
    .sort((a, b) => b.count - a.count);

  const renderChildren = (parentId: string, depth: number): React.ReactNode => {
    const children = (byParent.get(parentId) ?? [])
      .map(c => ({ node: c, count: directCounts[c.id] ?? 0 }))
      .filter(x => x.count > 0 || (byParent.get(x.node.id)?.length ?? 0) > 0)
      .sort((a, b) => b.count - a.count);
    if (children.length === 0) return null;
    return (
      <ul>
        {children.map(({ node, count }) => {
          const hasChildren = (byParent.get(node.id) ?? []).length > 0;
          const isOpen = expanded.has(node.id);
          return (
            <li key={node.id}>
              <div
                className="flex items-center gap-1.5 py-0.5 hover:bg-[#F3F4F6] rounded-sm"
                style={{ paddingLeft: `${depth * 12 + 8}px` }}
              >
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    className="w-3 inline-flex items-center justify-center text-[9px] text-[#8A95A3]"
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {isOpen ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="w-3" />
                )}
                <span className="w-2 h-2 rounded-sm shrink-0" style={{ backgroundColor: node.color }} />
                <span className="flex-1 truncate text-[11px] text-[#3D5265]">{node.name}</span>
                <span className="font-mono tabular-nums text-[10.5px] text-[#8A95A3]">{count}</span>
              </div>
              {hasChildren && isOpen && renderChildren(node.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="px-3 py-2 max-h-[40vh] overflow-y-auto">
      <ul>
        {rows.map(({ node, count }) => {
          const hasChildren = (byParent.get(node.id) ?? []).length > 0;
          const isOpen = expanded.has(node.id);
          return (
            <li key={node.id}>
              <div className="flex items-center gap-1.5 py-0.5 font-medium">
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggle(node.id)}
                    className="w-3 inline-flex items-center justify-center text-[9px] text-[#8A95A3]"
                    aria-label={isOpen ? 'Collapse' : 'Expand'}
                  >
                    {isOpen ? '▾' : '▸'}
                  </button>
                ) : (
                  <span className="w-3" />
                )}
                <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: node.color }} />
                <span className="flex-1 truncate text-[11.5px] text-[#3D5265]">{node.name}</span>
                <span className="font-mono tabular-nums text-[11px] text-[#3D5265]">{count}</span>
                <span className="font-mono tabular-nums text-[10px] text-[#8A95A3] w-10 text-right">
                  {Math.round((count / totalSegments) * 100)}%
                </span>
              </div>
              {hasChildren && isOpen && renderChildren(node.id, 1)}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
