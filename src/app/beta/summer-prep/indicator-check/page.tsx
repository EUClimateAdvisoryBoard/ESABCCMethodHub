/**
 * Server wrapper for the Summer Prep Indicator Check.
 * ---------------------------------------------------
 * Reads the ESABCC report indicators from the Policy Gap 2.0 Project
 * Workspace indicator database (`listIndicators` — the exact same read the
 * workspace's Indicator Database tab renders from) and passes them to the
 * client dashboard. The dashboard therefore only ever shows data that is
 * also visible in the Project Workspace: if a data point is not in the
 * workspace, it cannot appear here. Without a configured database
 * (dev / preview) `listIndicators` falls back to the same bundled seed
 * series the workspace preview shows, keeping the two views aligned there
 * too.
 */
import { listIndicators } from '@/lib/project-workspace/db';
import type { Indicator } from '@/data/ecno-indicators';
import IndicatorCheck from '../../../../../beta/modules/summer-prep/indicator-check/page';

export const dynamic = 'force-dynamic';

const WORKSPACE_PROJECT_ID = 'policy-gap-2-0';

/**
 * Effective provenance group — mirrors `groupOf` in
 * src/components/workspace/IndicatorModule.tsx so "the report's own
 * indicators" means exactly the workspace's "Existing indicators" group.
 */
function groupOf(i: Indicator): string {
  if (i.group) return i.group;
  if (i.beta) return 'beta';
  return i.id.startsWith('esabcc-') ? 'esabcc' : 'additional';
}

export default async function Page() {
  const all = await listIndicators(WORKSPACE_PROJECT_ID);
  const reportIndicators = all.filter(i => groupOf(i) === 'esabcc');
  return <IndicatorCheck indicators={reportIndicators} />;
}
