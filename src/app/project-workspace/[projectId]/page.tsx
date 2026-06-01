/**
 * Project detail page for the Project Workspace.
 * ----------------------------------------------
 * Renders the project's modules as tabs. Today the four module kinds
 * (indicators, recommendations, member-states, policy-analysis) each
 * have a dedicated client component; user-added "custom" modules
 * currently render a stub asking the user to choose a kind.
 *
 * Initial data is server-fetched once per request so the page is
 * fast to first paint; client components handle mutations and update
 * their local state on success.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import {
  getProject,
  listIndicators,
  listIndicatorSheets,
  listRecommendations,
  listMemberStateCells,
  listPolicyAnnotations,
  listPolicyCodes,
  getPolicyOverrides,
  getCustomModuleContent,
} from '@/lib/project-workspace/db';
import ProjectShell from '@/components/workspace/ProjectShell';

export const dynamic = 'force-dynamic';

export default async function ProjectPage({
  params,
  searchParams,
}: {
  params: { projectId: string };
  searchParams: { module?: string };
}) {
  const project = await getProject(params.projectId);
  if (!project) notFound();

  const [
    indicators,
    indicatorSheets,
    recommendations,
    memberStateCells,
    policyAnnotations,
    policyOverrides,
    policyCodes,
  ] = await Promise.all([
    listIndicators(params.projectId),
    listIndicatorSheets(params.projectId),
    listRecommendations(params.projectId),
    listMemberStateCells(params.projectId),
    listPolicyAnnotations(params.projectId),
    getPolicyOverrides(),
    listPolicyCodes(params.projectId),
  ]);

  const activeModule =
    searchParams.module && project.modules.some(m => m.id === searchParams.module)
      ? searchParams.module
      : project.modules[0]?.id;

  // Pre-load scratchpad content for every custom module so they all render
  // server-side. Cheap: one row per custom module, typically <5 per project.
  const customContent: Record<string, string> = {};
  await Promise.all(
    project.modules
      .filter(m => m.kind === 'custom')
      .map(async m => {
        customContent[m.id] = await getCustomModuleContent(project.id, m.id);
      })
  );

  return (
    <div className="min-h-screen bg-white text-tertiary-dark">
      <SiteHeader />
      <main className="max-w-wide mx-auto px-6 py-8">
        <nav className="text-xs text-tertiary mb-4">
          <Link href="/project-workspace" className="hover:text-primary">
            Project Workspace
          </Link>
          <span className="mx-1">/</span>
          <span className="text-tertiary-dark font-medium">{project.name}</span>
        </nav>
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-tertiary-dark">{project.name}</h1>
          <p className="text-sm text-tertiary mt-2 max-w-3xl">
            {project.shortDescription}
          </p>
        </header>

        <ProjectShell
          project={project}
          activeModule={activeModule}
          indicators={indicators}
          indicatorSheets={indicatorSheets}
          recommendations={recommendations}
          memberStateCells={memberStateCells}
          policyAnnotations={policyAnnotations}
          policyOverrides={policyOverrides}
          policyCodes={policyCodes}
          customContent={customContent}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
