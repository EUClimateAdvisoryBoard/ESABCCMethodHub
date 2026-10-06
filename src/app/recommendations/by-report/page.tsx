/**
 * Recommendations tracker — "by report" view (sub-page of M·08).
 * A read-only companion to the editable tracker: one table per report, newest
 * first, at headline level, plus a role matrix across all reports. Reads the same `pw_recommendations` rows as the tracker, so
 * recommendations added or removed there appear here. Focus, sector and role
 * labels are AI-compiled — pending Secretariat verification.
 */
import { Suspense } from 'react';
import Link from 'next/link';
import { listRecommendations } from '@/lib/project-workspace/db';
import {
  ALL_ESABCC_RECOMMENDATIONS,
  RECOMMENDATION_REPORTS,
  type PastRecommendation,
} from '@/data/esabcc-recommendations';
import RecommendationsByReport, {
  type ByReportRec,
} from '@/components/recommendations/RecommendationsByReport';

export const dynamic = 'force-dynamic';

/** The tracker is backed by the Policy Gap 2.0 workspace project. */
const PROJECT_ID = 'policy-gap-2-0';

/** Report ids newest first: `RECOMMENDATION_REPORTS` is declared oldest first. */
const REPORT_ORDER = Object.keys(RECOMMENDATION_REPORTS).reverse();

export default async function RecommendationsByReportPage() {
  let source: PastRecommendation[] = [];
  let fromSeed = false;
  let dbError: string | null = null;
  try {
    source = await listRecommendations(PROJECT_ID);
  } catch (e) {
    dbError = e instanceof Error ? e.message : String(e);
  }
  // `listRecommendations` returns [] both for "no database configured" and for
  // an empty table, so say plainly when the built-in seed is shown instead.
  if (source.length === 0) {
    source = ALL_ESABCC_RECOMMENDATIONS;
    fromSeed = true;
  }

  const recs: ByReportRec[] = source.map(r => ({
    id: r.id,
    title: r.title,
    summary: r.summary,
    area: r.area,
    reportId: r.report?.id || '__unlabelled__',
    reportLabel: r.report?.label || 'Unlabelled',
    reportUrl: r.report?.url || '',
  }));

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-8 space-y-4">
      <p className="text-xs text-tertiary">
        <Link href="/recommendations" className="underline hover:text-primary">
          ← Back to the editable recommendations tracker
        </Link>
      </p>
      <header>
        <h1 className="text-xl font-bold text-tertiary-dark">Recommendations by report</h1>
        <p className="mt-1 max-w-3xl text-sm text-tertiary">
          Every tracked headline recommendation, listed under the ESABCC report it comes from, newest report first.
        </p>
      </header>

      <section className="rounded-lg border-2 border-accent-orange/60 bg-surface-orange p-4">
        <p className="text-[11px] font-bold uppercase tracking-[0.1em] text-tertiary-dark">
          ⚠ AI-compiled — pending Secretariat verification
        </p>
        <p className="mt-1.5 max-w-4xl text-[12.5px] leading-relaxed text-tertiary-dark">
          Recommendations are shown at headline level. Where the tracker stores a report&apos;s detailed
          recommendations, they are grouped under the report&apos;s headline recommendation and listed as
          sub-recommendations (<code>src/lib/recommendations/headlines.ts</code>); the January 2024 chapter
          recommendations sit under one &ldquo;Detailed recommendations for …&rdquo; row per chapter. The
          mitigation/adaptation, sector and EU policy role labels are assigned by fixed keyword rules
          (<code>src/lib/recommendations/classify.ts</code>), only where the title or the report&apos;s own scope makes
          the label clear; a headline carries the labels of its own title and of all its sub-recommendations. A blank
          cell means no clear evidence was found, not that the recommendation is not relevant.
        </p>
      </section>

      {dbError && (
        <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          The tracker database could not be read ({dbError}). Showing the built-in seed set instead; edits made in
          the tracker are not reflected here.
        </p>
      )}
      {fromSeed && !dbError && (
        <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          No tracker rows were returned from the database, so the built-in seed set is shown. Edits made in the
          tracker are not reflected here.
        </p>
      )}

      <Suspense fallback={null}>
        <RecommendationsByReport recs={recs} reportOrder={REPORT_ORDER} />
      </Suspense>
    </div>
  );
}
