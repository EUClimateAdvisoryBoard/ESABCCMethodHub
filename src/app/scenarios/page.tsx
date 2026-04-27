/**
 * M · 02 — Data & Scenario Explorer (production)
 * ----------------------------------------------
 * Route: `/scenarios`
 *
 * Thin route shell. Every piece of real logic — the query builder, the
 * cross-filters, the chart rendering, the scenario-submission flow — lives
 * in `ScenarioExplorer` (the largest component in the app at ~3k LoC).
 * It is loaded client-side only (`ssr: false`) because:
 *
 *   - It depends on Chart.js which needs `window`.
 *   - Its initial payload is already large; streaming SSR would not help
 *     perceived performance.
 *
 * Data sources wired behind ScenarioExplorer:
 *
 *   - `src/data/scenarios.ts`      — bundled IIASA AR6 WG3 snapshot.
 *   - `/api/scenarios/**`           — user-submitted scenarios (DB).
 *   - `/api/eea-projections`        — EEA WEM/WAM projections feed.
 *   - `/api/electricity-maps`       — hourly grid intensity.
 *
 * Subroutes handled separately:
 *
 *   - `/scenarios/submissions` — review queue for user submissions.
 *   - `/scenarios/upload`      — form for submitting a new scenario set.
 *   - `/scenarios/request`     — request-a-dataset flow.
 */
import dynamic from 'next/dynamic';

const ScenarioExplorer = dynamic(() => import('@/components/ScenarioExplorer'), { ssr: false });

export default function ScenariosPage() {
  return <ScenarioExplorer />;
}
