/**
 * Workspace policy sub-libraries inside Content Analysis (M·05).
 * -------------------------------------------------------------
 * Surfaces every Project Workspace project's policy-coding overlay as a
 * project-scoped *sub-library* of the master content-analysis taxonomy.
 *
 * The integration is deliberately store-level rather than a copy: this
 * panel renders the very same `PolicyCodesOverlay` used inside the
 * workspace "Policy analysis" module, backed by the same
 * `pw_policy_codes` table via `/api/project-workspace/policy-codes`.
 * So a code created / renamed / recoloured / moved / merged here shows up
 * in the workspace immediately, and vice versa — one shared, project-
 * scoped store, fully integrated across both modules.
 */
'use client';

import { useCallback, useEffect, useState } from 'react';
import PolicyCodesOverlay from '@/components/workspace/PolicyCodesOverlay';
import type { PolicyCode } from '@/lib/project-workspace/db';
import { useAuth } from '@/lib/auth-context';

interface WorkspaceProjectLite {
  id: string;
  name: string;
  shortDescription?: string;
  modules?: { kind: string }[];
}

export default function WorkspacePolicyLibraries() {
  const { user } = useAuth();
  const [projects, setProjects] = useState<WorkspaceProjectLite[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [codes, setCodes] = useState<PolicyCode[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingCodes, setLoadingCodes] = useState(false);
  const [open, setOpen] = useState(false);

  // Load the workspace project list once the panel is first expanded.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoadingProjects(true);
    fetch('/api/project-workspace/projects')
      .then(r => (r.ok ? r.json() : { projects: [] }))
      .then((j: { projects?: WorkspaceProjectLite[] }) => {
        if (cancelled) return;
        // Prefer projects that actually run a policy-analysis module; fall
        // back to all projects when none advertise one (older seeds).
        const all = j.projects ?? [];
        const withPolicy = all.filter(p =>
          (p.modules ?? []).some(m => m.kind === 'policy-analysis')
        );
        const list = withPolicy.length > 0 ? withPolicy : all;
        setProjects(list);
        setActiveId(prev => prev ?? list[0]?.id ?? null);
      })
      .catch(() => {
        if (!cancelled) setProjects([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingProjects(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const loadCodes = useCallback(async (projectId: string) => {
    setLoadingCodes(true);
    try {
      const res = await fetch(
        `/api/project-workspace/policy-codes?projectId=${encodeURIComponent(projectId)}`
      );
      if (!res.ok) {
        setCodes([]);
        return;
      }
      const { codes: fresh } = (await res.json()) as { codes: PolicyCode[] };
      setCodes(fresh);
    } catch {
      setCodes([]);
    } finally {
      setLoadingCodes(false);
    }
  }, []);

  // Refetch the active sub-library's codes whenever the selection changes.
  useEffect(() => {
    if (!open || !activeId) return;
    void loadCodes(activeId);
  }, [open, activeId, loadCodes]);

  const refresh = useCallback(async () => {
    if (activeId) await loadCodes(activeId);
  }, [activeId, loadCodes]);

  return (
    <section className="max-w-[1600px] mx-auto px-4 sm:px-6 pb-10">
      <div className="border border-[#E6E7E8] rounded-lg bg-[#FBFBFA]">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className="w-full flex items-center gap-3 px-4 py-3 text-left"
        >
          <span className="text-[10px] font-mono tracking-[0.14em] uppercase text-[#8A95A3]">
            Sub-libraries
          </span>
          <span className="text-[13px] font-semibold text-[#3D5265] flex-1">
            Project workspace policy libraries
          </span>
          <span className="text-[11px] text-[#8A95A3]">{open ? '▴ Hide' : '▾ Show'}</span>
        </button>

        {open && (
          <div className="px-4 pb-4 border-t border-[#E6E7E8] pt-3 space-y-3">
            <p className="text-[12px] text-[#3D5265]/80 max-w-3xl">
              Each project workspace keeps its own policy-coding overlay over the
              shared master taxonomy. They appear here as project-scoped
              sub-libraries: the full coding &amp; tagging toolset (add, rename,
              recolour, move, merge, hide) works exactly as in the workspace, on
              the same shared store — changes sync both ways automatically.
            </p>

            {loadingProjects ? (
              <p className="text-[12px] text-[#8A95A3]">Loading project libraries…</p>
            ) : projects.length === 0 ? (
              <p className="text-[12px] text-[#8A95A3]">
                No project workspaces found. Create one under Project Workspace to
                start a policy sub-library.
              </p>
            ) : (
              <>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-[#8A95A3] font-semibold shrink-0">
                    Library:
                  </span>
                  {projects.map(p => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveId(p.id)}
                      className={`text-[11px] px-2 py-1 rounded border transition ${
                        activeId === p.id
                          ? 'bg-[#00928F] text-white border-[#00928F]'
                          : 'bg-white text-[#3D5265] border-[#E6E7E8] hover:border-[#3D5265]'
                      }`}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>

                {activeId && (
                  <div className="bg-white border border-[#E6E7E8] rounded-lg p-3">
                    {loadingCodes ? (
                      <p className="text-[12px] text-[#8A95A3]">Loading codes…</p>
                    ) : (
                      <PolicyCodesOverlay
                        projectId={activeId}
                        policyCodes={codes}
                        isSignedIn={!!user}
                        onCodesChanged={refresh}
                      />
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
