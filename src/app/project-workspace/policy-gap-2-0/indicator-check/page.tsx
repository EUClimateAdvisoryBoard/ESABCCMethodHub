/**
 * Server wrapper for the Indicator Check page of the Policy Gap 2.0 project
 * (formerly /beta/summer-prep/indicator-check — the old route redirects here).
 * -------------------------------------------------------------------------
 * Reads the ESABCC report indicators from the Policy Gap 2.0 Project
 * Workspace indicator database (`listIndicators` — the exact same read the
 * workspace's Indicator Database tab renders from) and passes them to the
 * client dashboard. The dashboard therefore only ever shows data that is
 * also visible in the Project Workspace: if a data point is not in the
 * workspace, it cannot appear here. Without a configured database
 * (dev / preview) `listIndicators` falls back to the same bundled seed
 * series the workspace preview shows, keeping the two views aligned there
 * too.
 *
 * If the Supabase read itself fails (as opposed to the project genuinely
 * having zero indicators), `listIndicators` throws `ListIndicatorsError`.
 * That's caught here so the client dashboard can render a distinct
 * "couldn't load the indicator database" message instead of the generic
 * "no indicators match the current filter" empty state.
 */
import { listIndicators, ListIndicatorsError } from '@/lib/project-workspace/db';
import type { Indicator } from '@/data/ecno-indicators';
import IndicatorCheck from './IndicatorCheck';

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
  let all: Indicator[] = [];
  let loadError = false;
  try {
    all = await listIndicators(WORKSPACE_PROJECT_ID);
  } catch (err) {
    if (err instanceof ListIndicatorsError) {
      console.error('[indicator-check] indicator database read failed', err);
      loadError = true;
    } else {
      throw err;
    }
  }
  const reportIndicators = all.filter(i => groupOf(i) === 'esabcc');
  return <IndicatorCheck indicators={reportIndicators} error={loadError} />;
}
