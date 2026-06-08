/**
 * Flow-chart version registry UI.
 * -------------------------------
 * Wraps the FrameworkBoard with a registry bar: pick which version to view /
 * edit, start a new version from an existing one (its "foundation" is copied),
 * rename any version, and delete custom ones.
 *
 * Four versions ship built in — the report-faithful ESABCC frameworks (the
 * default), the "enhanced" board (every lever/outcome given an indicator), the
 * beta board (enhanced + adaptation & resilience layer), and "Advanced version
 * 1" (high-quality long-series indicators + a first-class, equal-weight
 * adaptation track). Everything else is a user-created copy, stored per project
 * in localStorage by `@/lib/project-workspace/flowchart-versions`.
 */
'use client';
import { useEffect, useState } from 'react';
import type { Indicator } from '@/data/ecno-indicators';
import {
  createVersion,
  deleteVersion,
  loadVersions,
  renameVersion,
  type FlowChartVersion,
} from '@/lib/project-workspace/flowchart-versions';
import FrameworkBoard from './FrameworkBoard';
import ResultsChainBoardView from '@/components/frameworks/ResultsChainBoardView';

interface Props {
  projectId: string;
  allIndicators: Indicator[];
  onOpenInList?: (id: string) => void;
}

export default function FlowChartVersions({ projectId, allIndicators, onOpenInList }: Props) {
  // SSR-safe initial: the built-ins only. The full (possibly renamed + custom)
  // list is loaded from localStorage on mount.
  const [versions, setVersions] = useState<FlowChartVersion[]>(() => loadVersions(''));
  const [activeId, setActiveId] = useState<string>('report-faithful');
  const [creating, setCreating] = useState(false);
  const [renaming, setRenaming] = useState(false);

  useEffect(() => {
    setVersions(loadVersions(projectId));
  }, [projectId]);

  const reload = (nextActiveId?: string) => {
    setVersions(loadVersions(projectId));
    if (nextActiveId) setActiveId(nextActiveId);
  };

  const active = versions.find((v) => v.id === activeId) ?? versions[0];

  const handleCreate = (foundation: FlowChartVersion, name: string) => {
    const created = createVersion(projectId, foundation, name);
    setCreating(false);
    reload(created.id);
  };

  const handleRename = (name: string) => {
    renameVersion(projectId, active, name);
    setRenaming(false);
    reload();
  };

  const handleDelete = () => {
    if (active.builtIn) return;
    if (!confirm(`Delete the flow-chart version “${active.name}”? This cannot be undone.`)) return;
    deleteVersion(projectId, active);
    reload('report-faithful');
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-grey-200 bg-white p-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wide text-tertiary-light font-semibold mb-1">
              Flow-chart version
            </p>
            <p className="text-xs text-tertiary max-w-2xl">
              Pick a version to view or edit. Start a new one from any existing version — it copies
              that version&apos;s flow charts as a foundation you can build on.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-md bg-primary text-white hover:bg-primary-dark shrink-0"
          >
            + New version
          </button>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select
            value={active.id}
            onChange={(e) => setActiveId(e.target.value)}
            className="text-xs border border-grey-200 rounded-md px-2 py-1.5 bg-white text-tertiary-dark max-w-full"
            aria-label="Select flow-chart version"
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.builtIn ? '' : ' (custom)'}
              </option>
            ))}
          </select>
          {active.variant === 'beta' && (
            <span className="text-[9px] uppercase font-bold rounded px-1 bg-teal-100 text-teal-700">
              β
            </span>
          )}
          {active.variant === 'advanced' && (
            <span className="text-[9px] uppercase font-bold rounded px-1 bg-indigo-100 text-indigo-700">
              adv
            </span>
          )}
          {active.variant === 'advanced-v2' && (
            <span className="text-[9px] uppercase font-bold rounded px-1 bg-purple-100 text-purple-700">
              adv 2 · M&amp;E
            </span>
          )}
          <button
            type="button"
            onClick={() => setRenaming(true)}
            className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-grey-200 text-tertiary-dark hover:bg-grey-50"
          >
            ✎ Rename
          </button>
          {!active.builtIn && (
            <button
              type="button"
              onClick={handleDelete}
              className="text-xs font-semibold px-2.5 py-1.5 rounded-md border border-grey-200 text-red-600 hover:border-red-300"
            >
              Delete version
            </button>
          )}
          {!active.builtIn && active.basedOnName && (
            <span className="text-[11px] text-tertiary-light">
              based on {active.basedOnName}
            </span>
          )}
        </div>
      </div>

      {active.variant === 'advanced-v2' ? (
        // The results-chain board is a computed, read-only re-clustering of the
        // whole catalogue along the six M&E groups — it has its own view rather
        // than the sector goal→outcome→lever boards.
        <ResultsChainBoardView
          key={active.id}
          allIndicators={allIndicators}
          onOpenInList={onOpenInList}
        />
      ) : (
        <FrameworkBoard
          key={active.id}
          version={active}
          projectId={projectId}
          allIndicators={allIndicators}
          onOpenInList={onOpenInList}
        />
      )}

      {creating && (
        <NewVersionDialog
          versions={versions}
          defaultFoundationId={active.id}
          onClose={() => setCreating(false)}
          onCreate={handleCreate}
        />
      )}
      {renaming && (
        <RenameDialog
          version={active}
          onClose={() => setRenaming(false)}
          onSave={handleRename}
        />
      )}
    </div>
  );
}

function NewVersionDialog({
  versions,
  defaultFoundationId,
  onClose,
  onCreate,
}: {
  versions: FlowChartVersion[];
  defaultFoundationId: string;
  onClose: () => void;
  onCreate: (foundation: FlowChartVersion, name: string) => void;
}) {
  const [foundationId, setFoundationId] = useState(defaultFoundationId);
  const foundation = versions.find((v) => v.id === foundationId) ?? versions[0];
  const [name, setName] = useState(`Copy of ${foundation.name}`);

  return (
    <DialogShell title="New flow-chart version" onClose={onClose}>
      <div className="space-y-3 text-sm">
        <label className="block text-xs text-tertiary">
          <span className="block mb-1 font-medium text-tertiary-dark">Start from</span>
          <select
            value={foundationId}
            onChange={(e) => {
              const next = versions.find((v) => v.id === e.target.value);
              setFoundationId(e.target.value);
              if (next) setName(`Copy of ${next.name}`);
            }}
            className={inputCls}
          >
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
                {v.builtIn ? '' : ' (custom)'}
              </option>
            ))}
          </select>
          <span className="mt-1 block text-[10px] text-tertiary-light">
            The chosen version&apos;s flow charts (including any edits) are copied as the
            starting point. Editing the new version never changes the one it was copied from.
          </span>
        </label>
        <label className="block text-xs text-tertiary">
          <span className="block mb-1 font-medium text-tertiary-dark">Name</span>
          <input
            className={inputCls}
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </label>
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onCreate(foundation, name)}
          className={btnPrimary}
        >
          Create version
        </button>
      </div>
    </DialogShell>
  );
}

function RenameDialog({
  version,
  onClose,
  onSave,
}: {
  version: FlowChartVersion;
  onClose: () => void;
  onSave: (name: string) => void;
}) {
  const [name, setName] = useState(version.name);
  return (
    <DialogShell title="Rename flow-chart version" onClose={onClose}>
      <label className="block text-xs text-tertiary">
        <span className="block mb-1 font-medium text-tertiary-dark">Name</span>
        <input
          className={inputCls}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />
      </label>
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={onClose} className={btnSecondary}>
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onSave(name)}
          className={btnPrimary}
        >
          Save
        </button>
      </div>
    </DialogShell>
  );
}

function DialogShell({
  title,
  children,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-grey-200 max-w-md w-full p-4 sm:p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-tertiary-dark">{title}</h3>
          <button type="button" onClick={onClose} className="text-tertiary text-sm">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls =
  'w-full px-2 py-1.5 border border-grey-200 rounded text-sm bg-white focus:outline-none focus:border-primary';
const btnPrimary =
  'px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold hover:bg-primary-dark disabled:opacity-50';
const btnSecondary =
  'px-3 py-1.5 rounded-md border border-grey-200 text-xs text-tertiary-dark hover:bg-grey-50';
