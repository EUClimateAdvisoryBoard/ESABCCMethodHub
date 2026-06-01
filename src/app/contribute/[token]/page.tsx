/**
 * /contribute/[token] — external contributor entry point.
 *
 * Resolves the share-link token, hydrates the editor with the current state
 * of the country profile, restricts editing to the sections allowed by the
 * link, and posts the contributor's edits as a `country_profile_submissions`
 * row in the `pending` state. The submission then appears in the main user's
 * approval queue.
 *
 * This route does NOT require authentication.
 */
import { notFound } from 'next/navigation';
import SiteFooter from '@/components/SiteFooter';
import ContributeClient from './ContributeClient';
import { resolveShareLink, loadEffectiveProfile } from '@/lib/country-profiles/server';

export const dynamic = 'force-dynamic';

export default async function ContributePage({ params }: { params: { token: string } }) {
  const link = await resolveShareLink(params.token);
  if (!link || link.revoked) notFound();
  if (link.expiresAt && new Date(link.expiresAt).getTime() < Date.now()) notFound();
  const profile = await loadEffectiveProfile(link.countryCode);
  if (!profile) notFound();

  return (
    <>
      <header className="bg-primary text-white">
        <div className="max-w-wide mx-auto px-4 sm:px-6 py-4 flex items-center gap-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            <path d="M2 12h20" />
          </svg>
          <div>
            <div className="text-[11px] uppercase tracking-wide opacity-80">ESABCC — external contributor</div>
            <div className="text-lg font-bold">Submit data for {profile.name}</div>
          </div>
        </div>
      </header>

      <main className="px-4 sm:px-6 lg:px-8 max-w-wide mx-auto py-8 space-y-6">
        <div className="bg-amber-50 border border-amber-200 rounded-md p-4 text-[13px] text-amber-900">
          <strong>You have been invited to contribute data for {profile.name}.</strong>{' '}
          Anything you save will be sent to the ESABCC Secretariat for review.
          It will only appear on the public profile after the Secretariat
          approves the submission.
          {link.invitationMessage && (
            <div className="mt-2 text-amber-900/90 italic">{link.invitationMessage}</div>
          )}
        </div>

        <ContributeClient
          profile={profile}
          token={params.token}
          allowedSections={link.sections}
          contributorName={link.contributorName}
        />
      </main>
      <SiteFooter />
    </>
  );
}
