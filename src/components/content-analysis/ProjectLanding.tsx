'use client';

import type { CodedSegment, Project } from '@/lib/content-analysis/types';
import ProvenanceChip from '@/components/ui/ProvenanceChip';

export type ProjectLockSummary = {
  holderName: string;
  heartbeatAt: string;
};

interface Props {
  projects: Project[];
  /** Segment counts per project (for "47 codings" style badges). */
  segmentCounts: Record<string, number>;
  /** Document counts per project scope (for "in 23 docs" badges). */
  documentCounts: Record<string, number>;
  /** Active locks by projectId — lets the cards surface "🔒 Maria F." up
   *  front so users see who holds what before clicking in (item 5.1
   *  + 5.3 in the major UI/UX review re-rank). */
  locksByProjectId?: Record<string, ProjectLockSummary>;
  onOpen: (projectId: string) => void;
  onCreate: () => void;
  onDelete: (projectId: string) => void;
}

/**
 * First screen of the content-analysis module. Pick a project before
 * landing in the workbench — the workflow the user asked for:
 *   landing → (new project wizard) → workbench
 *
 * Master library is always pinned at the top; user-created projects are
 * listed below, with a "+ New project" card as the terminal tile.
 */
export default function ProjectLanding({
  projects,
  segmentCounts,
  documentCounts,
  locksByProjectId,
  onOpen,
  onCreate,
  onDelete,
}: Props) {
  // Seeded master libraries, pinned above user projects: the shared tag
  // tree + full corpus, and the policy-coherence assessment library (the
  // four-step model's evidence as in-text tags under verdict codes).
  const MASTER_LIBRARIES: Array<{ id: string; accent: string; kindLabel: string }> = [
    { id: 'project-master', accent: '#00928F', kindLabel: 'Master library' },
    { id: 'project-policy-coherence', accent: '#6D28D9', kindLabel: 'Master library · Coherence' },
  ];
  const masters = MASTER_LIBRARIES.flatMap(m => {
    const project = projects.find(p => p.id === m.id);
    return project ? [{ ...m, project }] : [];
  });
  const masterIds = new Set(MASTER_LIBRARIES.map(m => m.id));
  const others = projects.filter(p => !masterIds.has(p.id));

  return (
    <section className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 lg:py-12">
      <header className="mb-8">
        <h2 className="text-[22px] sm:text-[26px] font-bold text-[#3D5265]">Pick a project</h2>
        <p className="mt-2 text-[13.5px] text-[#3D5265]/75 max-w-2xl leading-relaxed">
          A project is a scoped workbench: it inherits the master tag system
          and the full corpus, then narrows both to whatever you&apos;re
          analyzing. Master library is where you curate the shared tag tree
          and the top-level AI pre-tags that downstream projects draw from.
        </p>
      </header>

      {masters.length > 0 && (
        <div className="mb-6">
          <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#00928F] font-semibold mb-2">
            <span className="inline-block w-6 border-t border-[#00928F] align-middle mr-2" />
            Master
          </p>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {masters.map(m => (
              <ProjectCard
                key={m.id}
                project={m.project}
                segments={segmentCounts[m.id] ?? 0}
                documents={documentCounts[m.id] ?? 0}
                accent={m.accent}
                kindLabel={m.kindLabel}
                lock={locksByProjectId?.[m.id]}
                onOpen={() => onOpen(m.id)}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="font-mono text-[10px] tracking-[0.18em] uppercase text-[#3D5265]/70 font-semibold mb-2">
          <span className="inline-block w-6 border-t border-[#3D5265]/50 align-middle mr-2" />
          Projects ({others.length})
        </p>
        <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {others.map(p => (
            <ProjectCard
              key={p.id}
              project={p}
              segments={segmentCounts[p.id] ?? 0}
              documents={documentCounts[p.id] ?? 0}
              accent="#3D5265"
              lock={locksByProjectId?.[p.id]}
              onOpen={() => onOpen(p.id)}
              onDelete={() => onDelete(p.id)}
            />
          ))}

          <button
            type="button"
            onClick={onCreate}
            className="group relative border-2 border-dashed border-[#B8BCC2] rounded-sm bg-white p-5 text-left hover:border-[#E87722] hover:bg-[#FFF7ED]/30 transition flex flex-col items-center justify-center min-h-[180px]"
          >
            <span className="w-10 h-10 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-[#E87722] text-[22px] leading-none group-hover:bg-[#FED7AA]">
              +
            </span>
            <span className="mt-3 font-semibold text-[13.5px] text-[#3D5265] group-hover:text-[#E87722]">
              New project
            </span>
            <span className="mt-1 text-[11.5px] text-[#8A95A3] text-center max-w-[14rem]">
              Scope to a sub-set of master tags and documents.
            </span>
          </button>
        </div>
      </div>
    </section>
  );
}

function ProjectCard({
  project,
  segments,
  documents,
  accent,
  kindLabel,
  lock,
  onOpen,
  onDelete,
}: {
  project: Project;
  segments: number;
  documents: number;
  accent: string;
  /** Overrides the mode label for pinned master-library cards. */
  kindLabel?: string;
  lock?: ProjectLockSummary;
  onOpen: () => void;
  onDelete?: () => void;
}) {
  const isMaster = project.id === 'project-master';
  return (
    <div
      className="group relative bg-white border border-[#E6E7E8] rounded-sm p-5 hover:border-[var(--accent)] hover:shadow-sm transition flex flex-col min-h-[180px]"
      style={{ ['--accent' as never]: accent }}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="font-mono text-[10px] tracking-[0.14em] uppercase font-semibold"
          style={{ color: accent }}
        >
          {kindLabel ?? (isMaster ? 'Master library' : project.mode.replace(/^./, c => c.toUpperCase()))}
        </span>
        <div className="flex items-center gap-1.5">
          {lock && (
            <ProvenanceChip
              kind="lock"
              label={lock.holderName}
              holder={lock.holderName}
              heartbeatAt={lock.heartbeatAt}
            />
          )}
          {onDelete && (
            <button
              type="button"
              onClick={e => { e.stopPropagation(); onDelete(); }}
              className="opacity-0 group-hover:opacity-100 transition text-[#B8BCC2] hover:text-[#B83230] text-[16px] leading-none"
              aria-label="Delete project"
              title="Delete project"
            >
              ×
            </button>
          )}
        </div>
      </div>
      <button type="button" onClick={onOpen} className="text-left flex-1 mt-2">
        <h3 className="text-[15px] font-bold text-[#3D5265] leading-snug group-hover:text-[var(--accent)] transition">
          {project.name}
        </h3>
        <p className="mt-1.5 text-[12px] text-[#3D5265]/75 leading-relaxed line-clamp-3">
          {project.description || (isMaster ? 'Shared library of all policies and tags.' : 'No description.')}
        </p>
      </button>
      <dl className="mt-4 border-t border-[#E6E7E8] pt-2.5 font-mono text-[10.5px] text-[#3D5265]/80 grid grid-cols-3 gap-2">
        <Stat label="Docs" value={documents} />
        <Stat label="Segments" value={segments} />
        <Stat label="Scope" value={project.masterCodeSelection.length || '—'} />
      </dl>
      <button
        type="button"
        onClick={onOpen}
        className="mt-3 inline-flex items-center gap-1 text-[12px] font-medium"
        style={{ color: accent }}
      >
        Open workbench
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="flex flex-col">
      <dt className="tracking-[0.1em] text-[#8A95A3] uppercase text-[9.5px]">{label}</dt>
      <dd className="tabular-nums text-[#3D5265] text-[13px] font-semibold">{value}</dd>
    </div>
  );
}

export function countSegmentsByProject(segments: CodedSegment[]): Record<string, number> {
  const out: Record<string, number> = { 'project-master': 0 };
  for (const s of segments) {
    const key = s.projectId ?? 'project-master';
    out[key] = (out[key] ?? 0) + 1;
    // Master segments also count toward each project that uses master
    // codes — keep simple for now: they live only under their assigned
    // project (plus master). No cross-double-count.
  }
  return out;
}
