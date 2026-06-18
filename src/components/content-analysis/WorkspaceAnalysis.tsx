'use client';

import { useMemo, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import { descendantCodeIds } from '@/lib/content-analysis/store';
import {
  SECTOR_FILTER_OPTIONS,
  sectorsByDocument,
  type SectorFlowId,
} from '@/lib/content-analysis/sector-flow';
import TagDistributionPanel from './TagDistributionPanel';
import SynthesisMatrix from './SynthesisMatrix';
import EvidenceBasePanel from './EvidenceBasePanel';
import ReportOutlineBuilder from './ReportOutlineBuilder';
import ObjectiveChecklistMatrix from './ObjectiveChecklistMatrix';
import PolicyCoherenceBoard from './PolicyCoherenceBoard';
import SectorFlowBoard from './SectorFlowBoard';

interface Props {
  projectId: string;
  projectName: string;
  /** The workspace corpus for the active source type. */
  documents: AnalysisDocument[];
  /** Codes visible in this workspace (master + this project). */
  codes: CodeNode[];
  /** Coded segments under the active lens, restricted to the corpus. */
  segments: CodedSegment[];
  /** Human label for the active source type ("Scientific literature", …). */
  sourceLabel: string;
  /** Optional controlled active tab — lets a parent (e.g. the guided tour)
   *  drive which analysis lens is showing. Omit for self-managed state. */
  tab?: AnalysisTab;
  /** Fired when the user (or the tour) switches lens. */
  onTabChange?: (tab: AnalysisTab) => void;
}

export type AnalysisTab = 'outline' | 'matrix' | 'evidence' | 'distribution' | 'checklist' | 'coherence' | 'flow';

const TABS: Array<{ id: AnalysisTab; label: string; blurb: string }> = [
  { id: 'outline', label: 'Report outline', blurb: 'Map sections to tags — see which articles belong where, and where the gaps are.' },
  { id: 'matrix', label: 'Synthesis matrix', blurb: 'Themes × sources grid with triangulation — the classic literature-review overview.' },
  { id: 'evidence', label: 'Evidence base', blurb: 'A citation-ready quote bank per theme, exportable to Word.' },
  { id: 'distribution', label: 'Tag distribution', blurb: 'How coding effort is spread across tags and documents.' },
  { id: 'checklist', label: 'Objective checklist', blurb: 'Policies × delivery criteria — can each act deliver its own objective, and where are the inconsistencies (incl. consistency for adaptation)?' },
  { id: 'coherence', label: 'Policy coherence (beta)', blurb: 'Four-step coherence model: ① ex-ante design vs world development, ② across all policy goals, ③ goals vs means (derived from the objective checklist), ④ evaluation of policy change and outcomes.' },
  { id: 'flow', label: 'Sector flow', blurb: 'Per-sector flow chart linking ① progress reporting → ② policy analysis → ③ ESABCC recommendations, with co-benefits (health, air, water, biodiversity…) and live data indicators on every node.' },
];

/**
 * Analysis workbench for the Content Analysis module — the toolkit that turns
 * coded literature into a scientific report. A persistent readiness scorecard
 * sits above four lenses:
 *
 *   • Report outline  — the bridge: sections ↔ tags ↔ the articles that belong.
 *   • Synthesis matrix — themes × sources with triangulation strength.
 *   • Evidence base    — a citation-ready quote bank, exportable.
 *   • Tag distribution — how coding effort is spread (the original panel).
 *
 * Each lens reads the same lens-filtered, corpus-scoped segments the Code view
 * is working on, so the analysis always reflects exactly what is on screen.
 */
export default function WorkspaceAnalysis({
  projectId,
  projectName,
  documents,
  codes,
  segments,
  sourceLabel,
  tab: controlledTab,
  onTabChange,
}: Props) {
  const [internalTab, setInternalTab] = useState<AnalysisTab>('outline');
  // Controlled when a parent supplies `tab`; otherwise self-managed. Either
  // way, switching notifies `onTabChange` so the guided tour stays in sync.
  const tab = controlledTab ?? internalTab;
  const setTab = (next: AnalysisTab) => {
    if (controlledTab === undefined) setInternalTab(next);
    onTabChange?.(next);
  };

  // ── Sector filter ───────────────────────────────────────────────────────
  // Narrows every lens (and the scorecard) to the documents touching one or
  // more report sectors, by the same title/code keyword heuristic the Sector
  // flow lens uses. Empty set = all sectors (no filtering).
  const [sectorFilter, setSectorFilter] = useState<Set<SectorFlowId>>(new Set());
  const toggleSector = (id: SectorFlowId) =>
    setSectorFilter(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  // Which sectors each corpus document touches, and a per-sector document tally
  // for the chip badges (always over the full corpus, so the chips read the
  // same regardless of the active filter).
  const sectorsByDoc = useMemo(
    () => sectorsByDocument(documents, codes, segments),
    [documents, codes, segments],
  );
  const sectorDocCounts = useMemo(() => {
    const m = new Map<SectorFlowId, number>();
    for (const set of sectorsByDoc.values()) {
      for (const id of set) m.set(id, (m.get(id) ?? 0) + 1);
    }
    return m;
  }, [sectorsByDoc]);

  // The sector-filtered corpus + segments that feed the scorecard and lenses.
  const filteredDocuments = useMemo(() => {
    if (sectorFilter.size === 0) return documents;
    return documents.filter(d => {
      const s = sectorsByDoc.get(d.id);
      return s !== undefined && [...s].some(id => sectorFilter.has(id));
    });
  }, [documents, sectorFilter, sectorsByDoc]);
  const filteredDocIds = useMemo(
    () => new Set(filteredDocuments.map(d => d.id)),
    [filteredDocuments],
  );
  const filteredSegments = useMemo(
    () =>
      sectorFilter.size === 0
        ? segments
        : segments.filter(s => filteredDocIds.has(s.documentId)),
    [segments, sectorFilter, filteredDocIds],
  );

  // ── Readiness scorecard — a "can we start drafting?" overview ───────────
  const score = useMemo(() => {
    const rootCodes = codes.filter(c => c.parentId === null);
    const codedSources = new Set(filteredSegments.map(s => s.documentId));

    let themesWithEvidence = 0;
    let triangulatedThemes = 0;
    let gapThemes = 0;
    for (const root of rootCodes) {
      const scope = new Set(descendantCodeIds(codes, root.id));
      const docs = new Set(
        filteredSegments.filter(s => scope.has(s.codeId)).map(s => s.documentId),
      );
      if (docs.size === 0) gapThemes += 1;
      else {
        themesWithEvidence += 1;
        if (docs.size >= 3) triangulatedThemes += 1;
      }
    }
    return {
      quotes: filteredSegments.length,
      codedSources: codedSources.size,
      corpusSize: filteredDocuments.length,
      totalThemes: rootCodes.length,
      themesWithEvidence,
      triangulatedThemes,
      gapThemes,
    };
  }, [codes, filteredDocuments, filteredSegments]);

  const activeTab = TABS.find(t => t.id === tab)!;

  return (
    <div className="space-y-4">
      {/* Readiness scorecard */}
      <div className="ca-ws-an-scorecard grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
        <ScoreCard
          label="Sources coded"
          value={`${score.codedSources}`}
          sub={`of ${score.corpusSize} in workspace`}
          tone="#3D5265"
        />
        <ScoreCard
          label="Coded quotes"
          value={`${score.quotes}`}
          sub="evidence passages"
          tone="#3D5265"
        />
        <ScoreCard
          label="Themes covered"
          value={`${score.themesWithEvidence}/${score.totalThemes}`}
          sub="top-level tags with evidence"
          tone="#00928F"
        />
        <ScoreCard
          label="Triangulated"
          value={`${score.triangulatedThemes}`}
          sub="themes with ≥3 sources"
          tone="#0065A4"
        />
        <ScoreCard
          label="Evidence gaps"
          value={`${score.gapThemes}`}
          sub="themes with no evidence"
          tone={score.gapThemes > 0 ? '#B83230' : '#00928F'}
        />
      </div>

      {/* Sector filter — narrows every lens below to the documents touching the
          chosen report sector(s). No selection means all sectors. */}
      <div className="ca-ws-an-sectors flex items-center gap-1.5 flex-wrap">
        <span
          className="text-[10px] uppercase tracking-wide text-[#8A95A3] font-semibold"
          title="Limit the analysis to documents touching these report sectors (matched on title and tag names)"
        >
          Sectors:
        </span>
        {SECTOR_FILTER_OPTIONS.map(s => {
          const on = sectorFilter.has(s.id);
          const count = sectorDocCounts.get(s.id) ?? 0;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => toggleSector(s.id)}
              className={`text-[11px] px-2 py-1 rounded-full border transition ${
                on
                  ? 'text-white'
                  : 'border-[#E6E7E8] text-[#3D5265] hover:border-[#8A95A3]'
              }`}
              style={on ? { backgroundColor: s.color, borderColor: s.color } : undefined}
              title={on ? 'Showing — click to remove' : `${count} document${count === 1 ? '' : 's'} touch this sector`}
            >
              {on ? '✓ ' : ''}{s.name}
              <span className={`ml-1 font-mono ${on ? 'text-white/80' : 'text-[#8A95A3]'}`}>{count}</span>
            </button>
          );
        })}
        {sectorFilter.size > 0 && (
          <button
            type="button"
            onClick={() => setSectorFilter(new Set())}
            className="text-[10px] text-[#8A95A3] hover:text-[#00928F]"
          >
            All sectors
          </button>
        )}
      </div>

      {/* Sub-nav */}
      <div className="ca-ws-an-tabs border-b border-[#E6E7E8] flex items-center gap-1 flex-wrap">
        {TABS.map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-[12px] font-medium border-b-2 -mb-px transition ${
              tab === t.id
                ? 'border-[#00928F] text-[#00928F]'
                : 'border-transparent text-[#8A95A3] hover:text-[#3D5265]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="text-[11.5px] text-[#8A95A3] -mt-2">{activeTab.blurb}</p>

      {/* Active lens */}
      <div className="ca-ws-an-panel">
        {tab === 'outline' && (
          <ReportOutlineBuilder
            projectId={projectId}
            projectName={projectName}
            documents={filteredDocuments}
            codes={codes}
            segments={filteredSegments}
          />
        )}
        {tab === 'matrix' && (
          <SynthesisMatrix documents={filteredDocuments} codes={codes} segments={filteredSegments} />
        )}
        {tab === 'evidence' && (
          <EvidenceBasePanel documents={filteredDocuments} codes={codes} segments={filteredSegments} />
        )}
        {tab === 'distribution' && (
          <div className="border border-[#E6E7E8] rounded-md">
            <TagDistributionPanel documents={filteredDocuments} codes={codes} segments={filteredSegments} />
          </div>
        )}
        {tab === 'checklist' && (
          <ObjectiveChecklistMatrix
            scopeIds={filteredDocuments.map(d => d.id)}
            scopeLabel="This workspace"
          />
        )}
        {tab === 'coherence' && (
          <PolicyCoherenceBoard
            scopeIds={filteredDocuments.map(d => d.id)}
            scopeLabel="This workspace"
          />
        )}
        {tab === 'flow' && (
          <SectorFlowBoard documents={filteredDocuments} codes={codes} segments={filteredSegments} />
        )}
      </div>

      <p className="text-[10.5px] text-[#8A95A3]">
        Analysing {filteredSegments.length} coded segment{filteredSegments.length === 1 ? '' : 's'} across{' '}
        {filteredDocuments.length} {sourceLabel.toLowerCase()} document{filteredDocuments.length === 1 ? '' : 's'}
        {sectorFilter.size > 0
          ? ` in ${sectorFilter.size} selected sector${sectorFilter.size === 1 ? '' : 's'}`
          : ''}{' '}
        under the selected lens.
      </p>
    </div>
  );
}

function ScoreCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: string;
}) {
  return (
    <div className="border border-[#E6E7E8] rounded-md bg-white px-3 py-2">
      <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[#8A95A3]">{label}</p>
      <p className="text-[20px] font-bold leading-tight tabular-nums" style={{ color: tone }}>{value}</p>
      <p className="text-[10px] text-[#8A95A3] leading-tight">{sub}</p>
    </div>
  );
}
