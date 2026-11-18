/**
 * Scenario database module — the Industry Project's tab for the EU industry
 * emission pathways screened against the ESABCC criteria.
 * ---------------------------------------------------------------------------
 * A thin loader: the view and its ~300 kB dataset are split into their own
 * chunk so the other workspace tabs do not pay for them. The view itself is
 * `src/components/industry-scenario-screening/ScenarioDatabaseView.tsx`.
 *
 * AI-compiled — pending Secretariat verification.
 */
'use client';

import dynamic from 'next/dynamic';
import { LoadingState } from '@/components/ui/StateView';

const ScenarioDatabaseView = dynamic(
  () => import('@/components/industry-scenario-screening/ScenarioDatabaseView'),
  { ssr: false, loading: () => <LoadingState label="Loading the scenario database…" /> },
);

export default function ScenarioDatabaseModule() {
  return <ScenarioDatabaseView />;
}
