/**
 * /member-states/submissions — approval queue.
 *
 * Lists pending external submissions (and the audit log for main-user
 * edits). Each row exposes the patch diff and Approve / Reject controls.
 */
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import { listSubmissions } from '@/lib/country-profiles/server';
import { COUNTRY_BY_CODE } from '@/data/country-profiles';
import SubmissionsClient from './SubmissionsClient';

export const dynamic = 'force-dynamic';

export default async function SubmissionsPage({
  searchParams,
}: {
  searchParams: { country?: string; state?: string };
}) {
  const pending = await listSubmissions({
    countryCode: searchParams.country,
    state: 'pending',
  });
  const recent = await listSubmissions({
    countryCode: searchParams.country,
  });
  const decided = recent.filter(r => r.state !== 'pending').slice(0, 20);

  // Build a quick country-name lookup
  const lookupName = (cc: string) => COUNTRY_BY_CODE[cc]?.name ?? cc;

  return (
    <>
      <SiteHeader />
      <main className="pt-16 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-wide mx-auto">
        <header className="mb-6">
          <Link href="/member-states" className="text-[11px] text-primary hover:underline">
            ← Back to all member states
          </Link>
          <h1 className="text-2xl font-bold text-tertiary-dark mt-1">Submissions</h1>
          <p className="text-[12px] text-tertiary mt-1 max-w-3xl">
            External contributor submissions land here for review. Approving a
            submission applies its patch to the live profile and triggers a
            refresh of the map and heatmap. Main-user direct edits also appear
            in the audit log (already-approved).
          </p>
        </header>

        <SubmissionsClient
          pending={pending}
          decided={decided}
          countryName={lookupName}
        />
      </main>
      <SiteFooter />
    </>
  );
}
