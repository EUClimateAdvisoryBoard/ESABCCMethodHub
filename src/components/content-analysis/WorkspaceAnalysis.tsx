'use client';

import { useMemo, useState } from 'react';
import type {
  AnalysisDocument,
  CodeNode,
  CodedSegment,
} from '@/lib/content-analysis/types';
import { descendantCodeIds } from '@/lib/content-analysis/store';
import TagDistributionPanel from './TagDistributionPanel';
import SynthesisMatrix from './SynthesisMatrix';
import EvidenceBasePanel from './EvidenceBasePanel';
import ReportOutlineBuilder from './ReportOutlineBuilder';
import ObjectiveChecklistMatrix from './ObjectiveChecklistMatrix';
import PolicyCoherenceBoard from './PolicyCoherenceBoard';

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

export type AnalysisTab = 'outline' | 'matrix' | 'evidence' | 'distribution' | 'checklist' | 'coherence';

const TABS: Array<{ id: AnalysisTab; label: string; blurb: string }> = [
  { id: 'outline', label: 'Report outline', blurb: 'Map sections to tags — see which articles belong where, and where the gaps are.' },
  { id: 'matrix', label: 'Synthesis matrix', blurb: 'Themes × sources grid with triangulation — the classic literature-review overview.' },
  { id: 'evidence', label: 'Evidence base', blurb: 'A citation-ready quote bank per theme, exportable to Word.' },
  { id: 'distribution', label: 'Tag distribution', blurb: 'How coding effort is spread across tags and documents.' },
  { id: 'checklist', label: 'Objective checklist', blurb: 'Policies × delivery criteria — can each act deliver its own objective, and where are the inconsistencies (incl. consistency for adaptation)?' },
  { id: 'coherence', label: 'Policy coherence (beta)', blurb: 'Four-step coherence model: ① ex-ante design vs world development, ② across all policy goals, ③ goals vs means (derived from the objective checklist), ④ evaluation of policy change and outcomes.' },
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

  // ── Readiness scorecard — a "can we start drafting?" overview ───────────
  const score = useMemo(() => {
    const rootCodes = codes.filter(c => c.parentId === null);
    const codedSources = new Set(segments.map(s => s.documentId));

    let themesWithEvidence = 0;
    let triangulatedThemes = 0;
    let gapThemes = 0;
    for (const root of rootCodes) {
      const scope = new Set(descendantCodeIds(codes, root.id));
      const docs = new Set(
        segments.filter(s => scope.has(s.codeId)).map(s => s.documentId),
      );
      if (docs.size === 0) gapThemes += 1;
      else {
        themesWithEvidence += 1;
        if (docs.size >= 3) triangulatedThemes += 1;
      }
    }
    return {
      quotes: segments.length,
      codedSources: codedSources.size,
      corpusSize: documents.length,
      totalThemes: rootCodes.length,
      themesWithEvidence,
      triangulatedThemes,
      gapThemes,
    };
  }, [codes, documents, segments]);

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
            documents={documents}
            codes={codes}
            segments={segments}
          />
        )}
        {tab === 'matrix' && (
          <SynthesisMatrix documents={documents} codes={codes} segments={segments} />
        )}
        {tab === 'evidence' && (
          <EvidenceBasePanel documents={documents} codes={codes} segments={segments} />
        )}
        {tab === 'distribution' && (
          <div className="border border-[#E6E7E8] rounded-md">
            <TagDistributionPanel documents={documents} codes={codes} segments={segments} />
          </div>
        )}
        {tab === 'checklist' && (
          <ObjectiveChecklistMatrix
            scopeIds={documents.map(d => d.id)}
            scopeLabel="This workspace"
          />
        )}
        {tab === 'coherence' && (
          <PolicyCoherenceBoard
            scopeIds={documents.map(d => d.id)}
            scopeLabel="This workspace"
          />
        )}
      </div>

      <p className="text-[10.5px] text-[#8A95A3]">
        Analysing {segments.length} coded segment{segments.length === 1 ? '' : 's'} across {documents.length}{' '}
        {sourceLabel.toLowerCase()} document{documents.length === 1 ? '' : 's'} under the selected lens.
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
