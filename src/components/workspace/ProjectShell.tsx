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

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { WorkspaceProject, WorkspaceModule, WorkspaceModuleKind } from '@/data/project-workspace';
import type { Indicator } from '@/data/ecno-indicators';
import type { PastRecommendation } from '@/data/esabcc-recommendations';
import type { MemberStateCell } from '@/lib/project-workspace/db';
import type { IndicatorSheetLayout } from '@/lib/project-workspace/indicator-sheet';
import IndicatorModule from './IndicatorModule';
import RecommendationsModule from './RecommendationsModule';
import MemberStatesModule from './MemberStatesModule';
import ContentAnalysisModule from './ContentAnalysisModule';
import LiteratureWatchModule from './LiteratureWatchModule';
import CustomNotesModule from './CustomNotesModule';
import ReportPageModule from './ReportPageModule';
import MeetingsModule from './MeetingsModule';
import ActivityLogPanel from './ActivityLogPanel';
import { moduleMeta } from './moduleMeta';
import { Tooltip, TooltipProvider } from '@/components/ui/Tooltip';
import { pwApi, type Meeting, type Milestone, type Phase } from '@/lib/project-workspace/client';

interface Props {
  project: WorkspaceProject;
  /** False in preview mode (no Supabase configured) — hides every mutation affordance. */
  dbEnabled: boolean;
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
  { id: 'literature-watch', label: 'Literature watch', blurb: 'Daily journal screening matched to this project.' },
  { id: 'custom', label: 'Notes', blurb: 'A free-form space for notes and write-ups.' },
];

export default function ProjectShell({
  project,
  dbEnabled,
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
  const [showLog, setShowLog] = useState(false);
  const [renamingProject, setRenamingProject] = useState(false);
  const [deletingProject, setDeletingProject] = useState(false);
  const [managingModules, setManagingModules] = useState(false);

  // The seed Industry Project scopes its copied tools to industry: policies
  // pre-filter to the industry sector and the member-state space is framed
  // around industrial transition.
  const industryFocus = project.id === 'industry-project';

  function setActive(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set('module', id);
    // Deep-link params (e.g. the Activity log's ?doc=…) belong to one
    // navigation, not to the tab — drop them on a manual tab switch.
    params.delete('doc');
    router.push(`${pathname}?${params.toString()}`);
  }

  // Removing the active tab must not leave the URL pointing at a module
  // that no longer exists — fall back to the project's (new) default tab.
  function handleModuleDeleted(moduleId: string) {
    if (moduleId === active) {
      const remaining = project.modules.filter(m => m.id !== moduleId);
      if (remaining[0]) {
        setActive(remaining[0].id);
      } else {
        const params = new URLSearchParams(search.toString());
        params.delete('module');
        params.delete('doc');
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      }
    }
    router.refresh();
  }

  return (
    <div>
      <TooltipProvider delayDuration={120}>
        {/* The tab row wraps rather than scrolling: with nine tabs (the
            report-page modules took Policy Gap 2.0 there) a scrolling row cut
            the last labels mid-word and hid the rest behind a scrollbar most
            people never noticed. The Activity log and Add tool buttons sit
            outside the row so they stay reachable however many tools a project
            has. */}
        <div className="flex flex-wrap items-end justify-between gap-x-4 border-b border-grey-200">
        <div
          role="tablist"
          aria-label="Project tools"
          className="flex w-full flex-wrap items-end gap-x-1 sm:w-auto sm:min-w-0 sm:flex-1"
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
                  className={`inline-flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-xs border-b-2 -mb-px transition-colors ${
                    m.featured ? 'font-bold' : 'font-medium'
                  } ${
                    isActive
                      ? 'border-primary text-primary'
                      : 'border-transparent text-tertiary hover:text-tertiary-dark hover:border-grey-300'
                  }`}
                >
                  <meta.Icon className="w-4 h-4 shrink-0" />
                  {m.name}
                </button>
              </Tooltip>
            );
          })}
        </div>
        {/* On a phone the tab row takes the full width and these drop onto
            their own line beneath it, still flush right. */}
        <div className="flex shrink-0 items-center ml-auto">
          <Tooltip content="Every change made in this project — who did what, and when.">
            <button
              type="button"
              onClick={() => setShowLog(true)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-secondary hover:text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
                <path d="M3 3v5h5" />
                <path d="M12 7v5l3 3" />
              </svg>
              Activity log
            </button>
          </Tooltip>
          {dbEnabled && project.modules.length > 0 && (
            <button
              type="button"
              onClick={() => setManagingModules(true)}
              className="shrink-0 inline-flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-secondary hover:text-primary"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M3 6h18M3 12h18M3 18h18" />
                <path d="M8 6l-2 2-2-2M8 18l-2-2-2 2" />
              </svg>
              Reorder / remove
            </button>
          )}
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="shrink-0 inline-flex items-center gap-1 px-3 py-2.5 text-xs font-medium text-secondary hover:text-primary"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add tool
          </button>
          {dbEnabled && (
            <ProjectMenu
              project={project}
              onRename={() => setRenamingProject(true)}
              onDelete={() => setDeletingProject(true)}
            />
          )}
        </div>
        </div>
      </TooltipProvider>

      {/* Plain-language helper: what the open tool is for. It stays the short
          kind-level blurb on purpose — every module renders its own heading and
          description below, so the module's own text here would say the same
          thing twice. */}
      {currentMeta ? (
        <p className="mt-3 mb-6 flex max-w-3xl items-start gap-2 text-xs text-tertiary leading-relaxed">
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
          {current.kind === 'literature-watch' && (
            <LiteratureWatchModule projectId={project.id} />
          )}
          {current.kind === 'meetings' && (
            <MeetingsModule
              projectId={project.id}
              initialMeetings={meetings}
              initialMilestones={milestones}
              initialPhases={phases}
            />
          )}
          {current.kind === 'report-page' && (
            <ReportPageModule
              moduleId={current.id}
              moduleName={current.name}
              moduleDescription={current.description}
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

      {showLog && (
        <ActivityLogPanel
          projectId={project.id}
          modules={project.modules}
          onClose={() => setShowLog(false)}
        />
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

      {renamingProject && (
        <RenameProjectDialog
          project={project}
          onClose={() => setRenamingProject(false)}
          onSaved={() => {
            setRenamingProject(false);
            router.refresh();
          }}
        />
      )}

      {deletingProject && (
        <DeleteProjectDialog
          project={project}
          onClose={() => setDeletingProject(false)}
          onDeleted={() => {
            router.push('/project-workspace');
            router.refresh();
          }}
        />
      )}

      {managingModules && (
        <ManageModulesDialog
          project={project}
          onClose={() => setManagingModules(false)}
          onReordered={() => router.refresh()}
          onDeleted={moduleId => handleModuleDeleted(moduleId)}
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

/** Small "…" menu on the project chrome: rename, and (for non-seed projects) delete. */
function ProjectMenu({
  project,
  onRename,
  onDelete,
}: {
  project: WorkspaceProject;
  onRename: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDocClick);
    document.addEventListener('keydown', onEsc);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
      document.removeEventListener('keydown', onEsc);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Project settings"
        title="Project settings"
        className="inline-flex items-center justify-center w-8 h-8 rounded-md text-secondary hover:text-primary hover:bg-grey-50"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1 w-44 rounded-lg border border-grey-200 bg-white shadow-xl py-1 text-left"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onRename();
            }}
            className="w-full text-left px-3 py-1.5 text-xs text-tertiary-dark hover:bg-primary/10 hover:text-primary"
          >
            Rename project
          </button>
          {!project.isSeed && (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="w-full text-left px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
            >
              Delete project
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RenameProjectDialog({
  project,
  onClose,
  onSaved,
}: {
  project: WorkspaceProject;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.shortDescription);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('Name cannot be empty.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await pwApi.updateProject(project.id, { name: trimmed, description });
      onSaved();
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
      aria-label="Rename project"
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-tertiary-dark mb-3">Rename project</h3>
        <label className="block text-xs text-tertiary mb-3">
          <span className="block mb-1 font-medium text-tertiary-dark">Name</span>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
          />
        </label>
        <label className="block text-xs text-tertiary mb-3">
          <span className="block mb-1 font-medium text-tertiary-dark">Description</span>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm h-20"
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
            disabled={!name.trim() || busy}
            onClick={submit}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Destructive — requires typing the project's name to enable the Delete button. */
function DeleteProjectDialog({
  project,
  onClose,
  onDeleted,
}: {
  project: WorkspaceProject;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canDelete = confirmText.trim() === project.name;

  async function submit() {
    if (!canDelete) return;
    setBusy(true);
    setError(null);
    try {
      await pwApi.deleteProject(project.id);
      onDeleted();
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Delete project"
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-red-700 mb-1">Delete project</h3>
        <p className="text-xs text-tertiary mb-3 leading-relaxed">
          This permanently deletes <strong>{project.name}</strong> and everything in
          it — indicators, recommendations, member-state notes, meetings and
          all its tools. This cannot be undone.
        </p>
        <label className="block text-xs text-tertiary mb-3">
          <span className="block mb-1 font-medium text-tertiary-dark">
            Type <strong>{project.name}</strong> to confirm
          </span>
          <input
            value={confirmText}
            onChange={e => setConfirmText(e.target.value)}
            className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
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
            disabled={!canDelete || busy}
            onClick={submit}
            className="px-3 py-1.5 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700 disabled:opacity-50"
          >
            {busy ? 'Deleting…' : 'Delete project'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Reorder tools (up/down) and remove non-seed ones. No drag-and-drop per convention. */
function ManageModulesDialog({
  project,
  onClose,
  onReordered,
  onDeleted,
}: {
  project: WorkspaceProject;
  onClose: () => void;
  onReordered: () => void;
  onDeleted: (moduleId: string) => void;
}) {
  const [order, setOrder] = useState(() => project.modules.map(m => m.id));
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const byId = new Map(project.modules.map(m => [m.id, m]));
  const rows = order.map(id => byId.get(id)).filter((m): m is WorkspaceModule => !!m);

  async function move(id: string, direction: -1 | 1) {
    const idx = order.indexOf(id);
    const swapWith = idx + direction;
    if (idx < 0 || swapWith < 0 || swapWith >= order.length) return;
    const next = order.slice();
    [next[idx], next[swapWith]] = [next[swapWith], next[idx]];
    setOrder(next);
    setBusyId(id);
    setError(null);
    try {
      await pwApi.reorderModules(project.id, next);
      onReordered();
    } catch (e) {
      setOrder(order); // revert on failure
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  async function remove(m: WorkspaceModule) {
    if (m.isSeed) return;
    if (!confirm(`Remove "${m.name}" from this project? This cannot be undone.`)) return;
    setBusyId(m.id);
    setError(null);
    try {
      await pwApi.deleteModule(project.id, m.id);
      setOrder(prev => prev.filter(id => id !== m.id));
      onDeleted(m.id);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Reorder or remove tools"
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-md w-full p-5 max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-tertiary-dark mb-1">Reorder / remove tools</h3>
        <p className="text-xs text-tertiary mb-4">
          Use the arrows to change tab order. Seed tools are built in and can&apos;t be removed.
        </p>
        <ul className="space-y-1.5 mb-4">
          {rows.map((m, i) => {
            const meta = moduleMeta(m.kind);
            const busy = busyId === m.id;
            return (
              <li
                key={m.id}
                className="flex items-center gap-2 rounded-md border border-grey-200 px-2.5 py-2"
              >
                <span className="shrink-0" style={{ color: meta.accent }}>
                  <meta.Icon className="w-4 h-4" />
                </span>
                <span className="min-w-0 flex-1 truncate text-xs font-medium text-tertiary-dark">
                  {m.name}
                  {m.isSeed && (
                    <span className="ml-1.5 text-[9px] uppercase tracking-wide text-tertiary-light font-normal">
                      seed
                    </span>
                  )}
                </span>
                <button
                  type="button"
                  disabled={busy || i === 0}
                  onClick={() => move(m.id, -1)}
                  aria-label={`Move ${m.name} up`}
                  title="Move up"
                  className="inline-flex items-center justify-center w-6 h-6 rounded text-tertiary hover:text-primary hover:bg-grey-50 disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 19V5M5 12l7-7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  disabled={busy || i === rows.length - 1}
                  onClick={() => move(m.id, 1)}
                  aria-label={`Move ${m.name} down`}
                  title="Move down"
                  className="inline-flex items-center justify-center w-6 h-6 rounded text-tertiary hover:text-primary hover:bg-grey-50 disabled:opacity-30"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M12 5v14M5 12l7 7 7-7" />
                  </svg>
                </button>
                {!m.isSeed && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => remove(m)}
                    aria-label={`Remove ${m.name}`}
                    title="Remove tool"
                    className="inline-flex items-center justify-center w-6 h-6 rounded text-tertiary hover:text-red-700 hover:bg-red-50 disabled:opacity-30"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        {rows.length === 0 && (
          <p className="text-xs text-tertiary mb-4">No tools left to manage.</p>
        )}
        {error && <p className="text-xs text-red-700 mb-2">{error}</p>}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
