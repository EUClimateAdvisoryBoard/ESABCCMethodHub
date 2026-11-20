/**
 * M · 55 — Scenarios (main module)
 * --------------------------------
 * Route: `/scenario-pathways`
 *
 * Thin route shell. The screening model lives in
 * `src/lib/scenario-pathways/model.ts`, the page in
 * `src/components/scenario-pathways/ScenarioPathways.tsx`. Loaded
 * client-side only: the dataset is fetched at runtime from
 * `public/data/scenario-pathways/pathways.json`, which the site-auth
 * middleware gates, so the embargoed data never ship in the (ungated)
 * JavaScript bundle.
 */
import dynamic from 'next/dynamic';
import { Suspense } from 'react';

const ScenarioPathways = dynamic(() => import('@/components/scenario-pathways/ScenarioPathways'), { ssr: false });

export const metadata = {
  title: 'Scenarios — EU pathways under the 2040 screening · MethodHub',
};

export default function ScenarioPathwaysPage() {
  return (
    <Suspense fallback={null}>
      <ScenarioPathways />
    </Suspense>
  );
}
