/**
 * Project Workspace — landing page (M·19).
 * ----------------------------------------
 * Lists every project in `pw_projects` and lets users create new ones.
 * Two projects ship seeded by the migration: "Policy Gap 2.0" and
 * "Industry Project". Anything users add lives in the same table.
 */
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { listProjects, isWorkspaceDbEnabled } from '@/lib/project-workspace/db';
import { SEED_PROJECTS } from '@/data/project-workspace';
import NewProjectButton from '@/components/workspace/NewProjectButton';

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
            M · 19
          </p>
          <h1 className="text-2xl font-bold text-tertiary-dark">Project Workspace</h1>
          <p className="text-sm text-tertiary mt-2 max-w-3xl">
            A workspace per analytical project. Each project bundles its
            own modules — indicator database, recommendation tracker,
            member-state matrix, policy analysis, or anything custom you
            add. Everything is persisted in Postgres so contributors share
            the same state.
          </p>
        </header>

        {!dbEnabled && (
          <div className="mb-6 px-4 py-3 rounded-lg border border-amber-200 bg-amber-50 text-xs text-amber-900">
            Supabase is not configured in this environment. The seed projects
            are shown read-only — set <code>NEXT_PUBLIC_SUPABASE_URL</code> and{' '}
            <code>SUPABASE_SERVICE_ROLE_KEY</code> and run migration{' '}
            <code>038_project_workspace.sql</code> to enable the workspace.
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <h2 className="text-sm font-bold text-tertiary-dark uppercase tracking-wide">
            Projects ({projects.length})
          </h2>
          {dbEnabled && <NewProjectButton />}
        </div>

        <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map(p => (
            <li key={p.id}>
              <Link
                href={`/project-workspace/${p.id}`}
                className="block bg-white border border-grey-200 rounded-xl p-5 hover:border-primary transition"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-tertiary-dark">{p.name}</h3>
                  {p.isSeed && (
                    <span className="text-[10px] uppercase tracking-wide text-secondary border border-secondary/30 px-2 py-0.5 rounded-full">
                      seed
                    </span>
                  )}
                </div>
                <p className="text-sm text-tertiary leading-relaxed">
                  {p.shortDescription}
                </p>
                <p className="text-[10px] text-tertiary-light mt-3">
                  {p.modules.length} module{p.modules.length === 1 ? '' : 's'}
                  {p.modules.length > 0 && (
                    <span> · {p.modules.map(m => m.name).join(' · ')}</span>
                  )}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </main>
      <SiteFooter />
    </div>
  );
}
