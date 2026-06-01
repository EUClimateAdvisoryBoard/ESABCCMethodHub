/**
 * /member-states/[code] — full read-only country profile page.
 *
 * Server-renders the merged profile (seed + draft overrides + approved
 * submissions). The "Edit profile" button takes the main user to the
 * editor; the "Invite contributor" button opens the share-link modal on
 * the client.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import CountryProfileView from '@/components/member-states/CountryProfileView';
import ProfileActions from './ProfileActions';
import { loadEffectiveProfile } from '@/lib/country-profiles/server';

export const dynamic = 'force-dynamic';

export default async function CountryProfilePage({
  params,
}: {
  params: { code: string };
}) {
  const profile = await loadEffectiveProfile(params.code);
  if (!profile) notFound();

  return (
    <>
      <SiteHeader />
      <main className="pt-16 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-wide mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href="/member-states" className="text-[11px] text-primary hover:underline">
            ← Back to all member states
          </Link>
          <ProfileActions countryCode={profile.code} countryName={profile.name} />
        </div>
        <CountryProfileView profile={profile} />
      </main>
      <SiteFooter />
    </>
  );
}
