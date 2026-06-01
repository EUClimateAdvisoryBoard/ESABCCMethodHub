/**
 * Advisory Board Recommendations — core module.
 * ---------------------------------------------
 * Surfaces the recommendation tracker that lives in the Project Workspace
 * "Policy Gap 2.0" project as a stand-alone core module. Both this page and
 * the workspace tab read/write the same `pw_recommendations` rows (seeded from
 * the ESABCC reports), so edits made in either place stay in sync.
 *
 * The previous stand-alone recommendations system (the `recommendations` table
 * + useRecommendations hook + RecommendationForm) is no longer wired up here;
 * it is left in place for reference but unused.
 */
import Link from 'next/link';
import { listRecommendations } from '@/lib/project-workspace/db';
import RecommendationsModule from '@/components/workspace/RecommendationsModule';

export const dynamic = 'force-dynamic';

/** The tracker is backed by the Policy Gap 2.0 workspace project. */
const PROJECT_ID = 'policy-gap-2-0';

export default async function RecommendationsPage() {
  const recommendations = await listRecommendations(PROJECT_ID);

  return (
    <div className="max-w-content mx-auto px-4 sm:px-6 py-8">
      <p className="text-xs text-tertiary mb-4">
        Shared with{' '}
        <Link
          href={`/project-workspace/${PROJECT_ID}?module=recommendations`}
          className="underline hover:text-primary"
        >
          Project Workspace · Policy Gap 2.0
        </Link>
        {' '}— changes here and in the workspace stay in sync.
      </p>
      <RecommendationsModule projectId={PROJECT_ID} initial={recommendations} />
    </div>
  );
}
