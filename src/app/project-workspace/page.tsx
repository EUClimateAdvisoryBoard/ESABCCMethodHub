/**
 * Project Workspace — landing page (M·19).
 * ----------------------------------------
 * Lists every project in `pw_projects` and lets users create new ones.
 * Two projects ship seeded by the migration: "Policy Gap 2.0" and
 * "Industry Project". Anything users add lives in the same table.
 *
 * The page is written for non-technical team members: plain-language
 * copy, a short "how it works" strip, and project cards that show each
 * project's tools as labelled icon chips (shared with the tab bar via
 * `moduleMeta`) so people can tell at a glance what a project contains.
 */
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { listProjects, isWorkspaceDbEnabled } from '@/lib/project-workspace/db';
import { SEED_PROJECTS } from '@/data/project-workspace';
import NewProjectButton from '@/components/workspace/NewProjectButton';
import { moduleMeta } from '@/components/workspace/moduleMeta';

export const dynamic = 'force-dynamic';

export default async function ProjectWorkspaceIndex() {
  const dbEnabled = isWorkspaceDbEnabled();
  const projects = dbEnabled ? await listProjects() : SEED_PROJECTS;

  return (
    <div className="min-h-screen bg-white text-tertiary-dark">
      <SiteHeader />
      <main className="max-w-wide mx-auto px-4 py-6 sm:px-6 sm:py-10">
        <header className="mb-8">
          <p className="text-[10px] tracking-[0.18em] uppercase text-primary font-semibold mb-1">
            Project Workspace
          </p>
          <h1 className="text-2xl font-bold text-tertiary-dark">
            Your projects
          </h1>
          <p className="text-sm text-tertiary mt-2 max-w-3xl leading-relaxed">
            Every analytical project gets its own space. Open a project to
            find its tools — indicators, document analysis, the member-state
            comparison, the recommendation tracker, meetings and notes — all in
            one place, and shared live with everyone on the team.
          </p>
        </header>

        {/* How it works — a three-step orientation for first-time users. */}
        <ol className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8" aria-label="How the workspace works">
          {[
            { n: 1, t: 'Open a project', d: 'Pick one of the cards below to enter its workspace.' },
            { n: 2, t: 'Switch between tools', d: 'Each project has tabs along the top — one per tool.' },
            { n: 3, t: 'Work together', d: 'Every change saves automatically and the whole team sees it.' },
          ].map(s => (
            <li
              key={s.n}
              className="flex items-start gap-3 rounded-lg border border-grey-200 bg-grey-50 px-4 py-3"
            >
              <span className="shrink-0 mt-0.5 w-6 h-6 rounded-full bg-primary text-white text-xs font-bold flex items-center justify-center">
                {s.n}
              </span>
              <span>
                <span className="block text-sm font-semibold text-tertiary-dark">{s.t}</span>
                <span className="block text-xs text-tertiary mt-0.5 leading-snug">{s.d}</span>
              </span>
            </li>
          ))}
        </ol>

        {!dbEnabled && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
            <strong className="font-semibold">Preview mode.</strong> You are
            viewing the example projects read-only. Editing and creating
            projects is available once the workspace database is connected (set{' '}
            <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> and run migration{' '}
            <code>038_project_workspace.sql</code>).
          </div>
        )}

        <div className="flex flex-wrap gap-3 justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wide">
            {projects.length} project{projects.length === 1 ? '' : 's'}
          </h2>
          {dbEnabled && <NewProjectButton />}
        </div>

        {projects.length === 0 ? (
          <div className="rounded-xl border border-dashed border-grey-300 bg-grey-50 px-6 py-12 text-center">
            <p className="text-sm font-semibold text-tertiary-dark">No projects yet</p>
            <p className="text-xs text-tertiary mt-1">
              Create your first project to start gathering tools and data in one place.
            </p>
            {dbEnabled && (
              <div className="mt-4 flex justify-center">
                <NewProjectButton />
              </div>
            )}
          </div>
        ) : (
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map(p => (
              <li key={p.id}>
                <Link
                  href={`/project-workspace/${p.id}`}
                  className="group flex h-full flex-col bg-white border border-grey-200 rounded-xl p-5 transition hover:border-primary hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-tertiary-dark group-hover:text-primary transition-colors">
                      {p.name}
                    </h3>
                    {p.isSeed && (
                      <span className="shrink-0 text-[10px] uppercase tracking-wide text-secondary border border-secondary/30 px-2 py-0.5 rounded-full">
                        example
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-tertiary leading-relaxed">
                    {p.shortDescription}
                  </p>

                  {/* Tool chips — same icons & labels as the project tab bar. */}
                  {p.modules.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {p.modules.map(m => {
                        const meta = moduleMeta(m.kind);
                        return (
                          <span
                            key={m.id}
                            className="inline-flex items-center gap-1.5 rounded-full border border-grey-200 bg-grey-50 pl-1.5 pr-2.5 py-1 text-[11px] font-medium text-tertiary-dark"
                          >
                            <span
                              className="inline-flex items-center justify-center w-4 h-4 rounded-full"
                              style={{ color: meta.accent }}
                            >
                              <meta.Icon className="w-3.5 h-3.5" />
                            </span>
                            {meta.label}
                          </span>
                        );
                      })}
                    </div>
                  )}

                  <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    Open project
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5" aria-hidden>
                      <path d="M5 12h14M13 6l6 6-6 6" />
                    </svg>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}
