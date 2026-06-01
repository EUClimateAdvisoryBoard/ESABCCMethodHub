/**
 * Tabbed shell for a workspace project.
 * -------------------------------------
 * Renders the project's module tabs and, beneath them, the active
 * module's UI. Module navigation is driven through the `?module=` query
 * string so users can deep-link to a specific tab.
 *
 * Adding a new module from the UI hits POST /api/project-workspace/
 * projects/[id]/modules; on success we refresh the route so the new
 * module appears.
 */
'use client';

import { useState } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { WorkspaceProject } from '@/data/project-workspace';
import type { Indicator } from '@/data/ecno-indicators';
import type { PastRecommendation } from '@/data/esabcc-recommendations';
import type {
  MemberStateCell,
  PolicyAnnotation,
  PolicyOverrideMap,
} from '@/lib/project-workspace/db';
import IndicatorModule from './IndicatorModule';
import RecommendationsModule from './RecommendationsModule';
import MemberStatesModule from './MemberStatesModule';
import PolicyAnalysisModule from './PolicyAnalysisModule';
import CustomNotesModule from './CustomNotesModule';
import { pwApi } from '@/lib/project-workspace/client';

interface Props {
  project: WorkspaceProject;
  activeModule?: string;
  indicators: Indicator[];
  recommendations: PastRecommendation[];
  memberStateCells: MemberStateCell[];
  policyAnnotations: PolicyAnnotation[];
  policyOverrides: PolicyOverrideMap;
  customContent: Record<string, string>;
}

const MODULE_KIND_OPTIONS = [
  { id: 'indicators', label: 'Indicator database' },
  { id: 'recommendations', label: 'Recommendations tracker' },
  { id: 'member-states', label: 'Member state space' },
  { id: 'policy-analysis', label: 'Policy analysis' },
  { id: 'custom', label: 'Custom (notes)' },
];

export default function ProjectShell({
  project,
  activeModule,
  indicators,
  recommendations,
  memberStateCells,
  policyAnnotations,
  policyOverrides,
  customContent,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();
  const active = activeModule ?? project.modules[0]?.id;
  const current = project.modules.find(m => m.id === active);
  const [adding, setAdding] = useState(false);

  function setActive(id: string) {
    const params = new URLSearchParams(search.toString());
    params.set('module', id);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div>
      <div className="flex gap-1 border-b border-grey-200 mb-6 overflow-x-auto">
        {project.modules.map(m => (
          <button
            key={m.id}
            type="button"
            onClick={() => setActive(m.id)}
            className={`shrink-0 px-3 py-2 text-xs font-medium border-b-2 -mb-px ${
              active === m.id
                ? 'border-primary text-primary'
                : 'border-transparent text-tertiary hover:text-tertiary-dark'
            }`}
          >
            {m.name}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="shrink-0 ml-auto px-3 py-2 text-xs text-secondary hover:text-primary"
        >
          + Add module
        </button>
      </div>

      {current?.kind === 'indicators' && (
        <IndicatorModule projectId={project.id} initial={indicators} />
      )}
      {current?.kind === 'recommendations' && (
        <RecommendationsModule projectId={project.id} initial={recommendations} />
      )}
      {current?.kind === 'member-states' && (
        <MemberStatesModule projectId={project.id} initial={memberStateCells} />
      )}
      {current?.kind === 'policy-analysis' && (
        <PolicyAnalysisModule
          projectId={project.id}
          initialAnnotations={policyAnnotations}
          initialOverrides={policyOverrides}
        />
      )}
      {current?.kind === 'custom' && (
        <CustomNotesModule
          projectId={project.id}
          moduleId={current.id}
          moduleName={current.name}
          initialContent={customContent[current.id] ?? ''}
        />
      )}
      {!current && (
        <p className="text-sm text-tertiary">
          This project has no modules yet. Click <em>+ Add module</em> to create one.
        </p>
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

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await pwApi.createModule(projectId, { name, description, kind });
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
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-md w-full p-5"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-tertiary-dark mb-3">Add module</h3>
        <label className="block text-xs text-tertiary mb-3">
          <span className="block mb-1 font-medium text-tertiary-dark">Kind</span>
          <select
            value={kind}
            onChange={e => setKind(e.target.value)}
            className="w-full px-2 py-1.5 border border-grey-200 rounded text-sm"
          >
            {MODULE_KIND_OPTIONS.map(k => (
              <option key={k.id} value={k.id}>
                {k.label}
              </option>
            ))}
          </select>
        </label>
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
            disabled={!name || busy}
            onClick={submit}
            className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50"
          >
            {busy ? 'Creating…' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
