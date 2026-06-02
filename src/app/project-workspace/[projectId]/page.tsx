/**
 * Project detail page for the Project Workspace.
 * ----------------------------------------------
 * Renders the project's modules as tabs. Today the four module kinds
 * (indicators, recommendations, member-states, policy-analysis) each
 * have a dedicated client component; user-added "custom" modules
 * currently render a stub asking the user to choose a kind.
 *
 * Performance: only the active tab's data is fetched server-side.
 * `ProjectShell` only renders one module at a time, and tab switches
 * re-render via `router.push(?module=…)`, which re-runs this server
 * component with the new active kind. The other modules' fetches —
 * indicators (all data points), recommendations (all uptake events),
 * policy annotations / overrides / codes, meetings, milestones —
 * are skipped until their tab is opened.
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
import { listMeetings, listMilestones } from '@/lib/project-workspace/meetings';
import type {
  MemberStateCell,
  PolicyAnnotation,
  PolicyCode,
  PolicyOverrideMap,
} from '@/lib/project-workspace/db';
import type { IndicatorSheetLayout } from '@/lib/project-workspace/indicator-sheet';
import type { Indicator } from '@/data/ecno-indicators';
import type { PastRecommendation } from '@/data/esabcc-recommendations';
import type { Meeting, Milestone } from '@/lib/project-workspace/client';
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

  const activeModule =
    searchParams.module && project.modules.some(m => m.id === searchParams.module)
      ? searchParams.module
      : project.modules[0]?.id;
  const current = project.modules.find(m => m.id === activeModule);
  const kind = current?.kind;

  // Only fetch data for the active tab. Empty defaults flow into ProjectShell
  // for the modules it won't render this turn.
  let indicators: Indicator[] = [];
  let indicatorSheets: Record<string, IndicatorSheetLayout> = {};
  let recommendations: PastRecommendation[] = [];
  let memberStateCells: MemberStateCell[] = [];
  let policyAnnotations: PolicyAnnotation[] = [];
  let policyOverrides: PolicyOverrideMap = {};
  let policyCodes: PolicyCode[] = [];
  let meetings: Meeting[] = [];
  let milestones: Milestone[] = [];
  const customContent: Record<string, string> = {};

  if (kind === 'indicators') {
    [indicators, indicatorSheets] = await Promise.all([
      listIndicators(params.projectId),
      listIndicatorSheets(params.projectId),
    ]);
  } else if (kind === 'recommendations') {
    recommendations = await listRecommendations(params.projectId);
  } else if (kind === 'member-states') {
    memberStateCells = await listMemberStateCells(params.projectId);
  } else if (kind === 'policy-analysis') {
    [policyAnnotations, policyOverrides, policyCodes] = await Promise.all([
      listPolicyAnnotations(params.projectId),
      getPolicyOverrides(),
      listPolicyCodes(params.projectId),
    ]);
  } else if (kind === 'meetings') {
    [meetings, milestones] = await Promise.all([
      listMeetings(params.projectId),
      listMilestones(params.projectId),
    ]);
  } else if (kind === 'custom' && current) {
    customContent[current.id] = await getCustomModuleContent(project.id, current.id);
  }

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
          meetings={meetings}
          milestones={milestones}
        />
      </main>
      <SiteFooter />
    </div>
  );
}
