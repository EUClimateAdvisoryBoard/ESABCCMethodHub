/**
 * /member-states/[code]/edit — main-user editor for a country profile.
 *
 * Saves directly to the live profile (auto-approval), but also records an
 * audit row in `country_profile_submissions` for traceability.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import EditClient from './EditClient';
import { loadEffectiveProfile } from '@/lib/country-profiles/server';

export const dynamic = 'force-dynamic';

export default async function EditPage({ params }: { params: { code: string } }) {
  const profile = await loadEffectiveProfile(params.code);
  if (!profile) notFound();

  return (
    <>
      <SiteHeader />
      <main className="pt-16 md:pt-20 pb-16 px-4 sm:px-6 lg:px-8 max-w-wide mx-auto">
        <div className="flex items-center justify-between gap-3 mb-4">
          <Link href={`/member-states/${profile.code}`} className="text-[11px] text-primary hover:underline">
            ← Back to {profile.name} profile
          </Link>
        </div>
        <header className="mb-4">
          <div className="text-[11px] uppercase tracking-wide text-tertiary">Editing</div>
          <h1 className="text-2xl font-bold text-tertiary-dark mt-1">{profile.name}</h1>
          <p className="text-[12px] text-tertiary mt-1 max-w-2xl">
            Edits made here are applied immediately and recorded in the audit log.
            Use the share-link flow if you want the change to go through approval first.
          </p>
        </header>
        <EditClient profile={profile} />
      </main>
      <SiteFooter />
    </>
  );
}
