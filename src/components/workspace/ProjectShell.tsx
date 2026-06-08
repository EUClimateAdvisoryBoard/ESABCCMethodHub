/**
 * Tabbed shell for a workspace project.
 * -------------------------------------
 * Renders the project's module tabs and, beneath them, the active
 * module's UI. Module navigation is driven through the `?module=` query
 * string so users can deep-link to a specific tab.
 *
 * The tab bar is built for non-technical team members: each tab carries
 * the module's icon and a hover tooltip, and a short plain-language
 * helper line under the bar explains what the open tool is for. Icons,
 * labels and blurbs all come from the shared `moduleMeta` catalogue so
 * the tabs match the project cards on the landing page.
 *
 * Adding a new module from the UI hits POST /api/project-workspace/
 * projects/[id]/modules; on success we refresh the route so the new
 * module appears.
 */
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { WorkspaceProject, WorkspaceModuleKind } from '@/data/project-workspace';
import type { Indicator } from '@/data/ecno-indicators';
import type { PastRecommendation } from '@/data/esabcc-recommendations';
import type { MemberStateCell } from '@/lib/project-workspace/db';
import type { IndicatorSheetLayout } from '@/lib/project-workspace/indicator-sheet';
import IndicatorModule from './IndicatorModule';
import RecommendationsModule from './RecommendationsModule';
import MemberStatesModule from './MemberStatesModule';
import ContentAnalysisModule from './ContentAnalysisModule';
import CustomNotesModule from './CustomNotesModule';
import MeetingsModule from './MeetingsModule';
import { moduleMeta } from './moduleMeta';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { pwApi, type Meeting, type Milestone, type Phase } from '@/lib/project-workspace/client';

interface Props {
  project: WorkspaceProject;
  activeModule?: string;
  indicators: Indicator[];
  indicatorSheets: Record<string, IndicatorSheetLayout>;
  recommendations: PastRecommendation[];
  memberStateCells: MemberStateCell[];
  customContent: Record<string, string>;
  meetings: Meeting[];
  milestones: Milestone[];
  phases: Phase[];
}

const MODULE_KIND_OPTIONS: { id: string; label: string; blurb: string }[] = [
  { id: 'indicators', label: 'Indicators', blurb: 'Numbers and charts in a table you can edit.' },
  { id: 'content-analysis', label: 'Content analysis', blurb: 'Highlight and tag passages in documents.' },
  { id: 'member-states', label: 'Member states', blurb: 'Compare the 27 EU countries on a map.' },
  { id: 'recommendations', label: 'Recommendations', blurb: 'Track recommendations and their uptake.' },
  { id: 'meetings', label: 'Meetings & progress', blurb: 'Meetings, milestones and progress.' },
  { id: 'custom', label: 'Notes', blurb: 'A free-form space for notes and write-ups.' },
];

export default function ProjectShell({
  project,
  activeModule,
  indicators,
  indicatorSheets,
  recommendations,
  memberStateCells,
  customContent,
  meetings,
  milestones,
  phases,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const active = activeModule ?? project.modules[0]?.id;
  const current = project.modules.find(m => m.id === active);
  const currentMeta = current ? moduleMeta(current.kind) : null;
  const [adding, setAdding] = useState(false);

  // The seed Industry Project scopes its copied tools to industry: policies
  // pre-filter to the industry sector and the member-state space is framed
  // around industrial transition.
  const industryFocus = project.id === 'industry-project';

  function setActive(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set('module', id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <TooltipProvider delayDuration={120}>
        <div
          role="tablist"
          aria-label="Project tools"
          className="flex gap-1 border-b border-grey-200 overflow-x-auto"
        >
          {project.modules.map(m => {
            const meta = moduleMeta(m.kind);
            const isActive = active === m.id;
            return (
              <Tooltip key={m.id} content={meta.blurb}>
                <button
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActive(m.id)}
                  className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2.5 text-xs border-b-2 -mb-px transition-colors ${
                    m.featured ? 'font-bold' : 'font-medium'
                  } ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-tertiary hover:text-tertiary-dark hover:border-grey-300'
                  }`}
                >
                  <meta.Icon className="w-4 h-4 shrink-0" />
                  {m.name}
                  {m.beta && (
                    <span className="ml-0.5 align-middle text-[9px] uppercase tracking-wide text-secondary/70 font-normal">
                      beta
                    </span>
                  )}
                </button>
              </Tooltip>
            );
          })}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 ml-auto inline-flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-secondary hover:text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add tool
          </button>
        </div>
      </TooltipProvider>

      {/* Plain-language helper: what the open tool is for. */}
      {currentMeta ? (
        <p className="mt-3 mb-6 flex items-start gap-2 text-xs text-tertiary leading-relaxed">
          <span className="shrink-0 mt-px" style={{ color: currentMeta.accent }}>
            <currentMeta.Icon className="w-4 h-4" />
          </span>
          <span>{currentMeta.blurb}</span>
        </p>
      ) : (
        <div className="mb-6" />
      )}

      {current && (
        <div>
          {current.kind === 'indicators' && (
            <IndicatorModule
              projectId={project.id}
              initial={indicators}
              initialLayouts={indicatorSheets}
            />
          )}
          {current.kind === 'recommendations' && (
            <RecommendationsModule projectId={project.id} initial={recommendations} />
          )}
          {current.kind === 'member-states' && (
            <MemberStatesModule projectId={project.id} industryFocus={industryFocus} />
          )}
          {(current.kind === 'content-analysis' || current.kind === 'policy-analysis') && (
            <ContentAnalysisModule
              projectId={project.id}
              projectName={project.name}
              industryFocus={industryFocus}
            />
          )}
          {current.kind === 'meetings' && (
            <MeetingsModule
              projectId={project.id}
              initialMeetings={meetings}
              initialMilestones={milestones}
              initialPhases={phases}
            />
          )}
          {current.kind === 'custom' && (
            <CustomNotesModule
              projectId={project.id}
              moduleId={current.id}
              moduleName={current.name}
              initialContent={customContent[current.id] ?? ''}
            />
          )}
        </div>
      )}
      {!current && (
        <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 px-6 py-12 text-center">
          <p className="text-sm font-semibold text-tertiary-dark">No tools yet</p>
          <p className="text-xs text-tertiary mt-1">
            Click <em>Add tool</em> above to add the first tool to this project.
          </p>
        </div>
      )}

      {adding && (
        <AddModuleDialog
          projectId={project.id}
          onClose={() => setAdding(false)}
          onCreated={() => {
            setAdding(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

function AddModuleDialog({
  projectId,
  onClose,
  onCreated,
}: {
  projectId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [kind, setKind] = useState<string>('indicators');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default the name to the chosen tool's friendly label so users rarely
  // have to type anything — but let them override it.
  const [nameEdited, setNameEdited] = useState(false);
  const selected = MODULE_KIND_OPTIONS.find(k => k.id === kind);
  const effectiveName = nameEdited ? name : name || selected?.label || '';

  function chooseKind(id: string) {
    setKind(id);
    if (!nameEdited) {
      const label = MODULE_KIND_OPTIONS.find(k => k.id === id)?.label ?? '';
      setName(label);
    }
  }

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await pwApi.createModule(projectId, { name: effectiveName, description, kind });
      onCreated();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add a tool"
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-lg w-full p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-base font-bold text-tertiary-dark mb-1">Add a tool</h3>
        <p className="text-xs text-tertiary mb-4">
          Pick what this tool should do. You can rename it below.
        </p>

        {/* Visual type picker — icon + plain-language blurb per option. */}
        <fieldset className="mb-4">
          <legend className="sr-only">Choose a tool type</legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {MODULE_KIND_OPTIONS.map(opt => {
              const meta = moduleMeta(opt.id as WorkspaceModuleKind);
              const isSelected = kind === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => chooseKind(opt.id)}
                  aria-pressed={isSelected}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition ${
                    isSelected
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                      : 'border-grey-200 hover:border-primary/40 hover:bg-grey-50'
                  }`}
                >
                  <span
                    className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-lg"
                    style={{ color: meta.accent, backgroundColor: meta.accentBg }}
                  >
                    <meta.Icon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-tertiary-dark">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-tertiary leading-snug mt-0.5">
                      {opt.blurb}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <label className="block text-xs text-tertiary mb-3">
          <span className="block mb-1 font-medium text-tertiary-dark">Name</span>
          <input
            value={effectiveName}
            onChange={e => {
              setNameEdited(true);
              setName(e.target.value);
            }}
            placeholder={selected?.label}
            className="w-full px-2.5 py-2 border border-grey-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </label>
        <label className="block text-xs text-tertiary mb-4">
          <span className="block mb-1 font-medium text-tertiary-dark">
            Description <span className="font-normal text-tertiary-light">(optional)</span>
          </span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is this tool for in this project?"
            className="w-full px-2.5 py-2 border border-grey-200 rounded-md text-sm h-20 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary"
          />
        </label>
        {error && <p className="text-xs text-red-700 mb-2">{error}</p>}
        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!effectiveName || busy}
            onClick={submit}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? 'Adding…' : 'Add tool'}
          </button>
        </div>
      </div>
    </div>
  );
}
