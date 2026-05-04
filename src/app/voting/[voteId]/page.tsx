/**
 * /voting/[voteId] — admin view of a single vote.
 *
 * Server-renders the bundle (config + tokens + ballot count) and hands it
 * to a client component for token generation and copy-to-clipboard helpers.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import { getVote } from '@/lib/voting/store';
import { detectVotingBackend } from '@/lib/voting/backend';
import StorageBackendBanner from '../StorageBackendBanner';
import VoteAdmin from './VoteAdmin';

export const dynamic = 'force-dynamic';

export default async function VoteAdminPage({ params }: { params: { voteId: string } }) {
  const backend = detectVotingBackend();
  const bundle = await getVote(params.voteId);
  if (!bundle) notFound();

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero
        title={bundle.vote.title}
        subtitle={
          <span>
            <span className="font-mono text-[11px] text-[#8A95A3]">{bundle.vote.id}</span>
            {' · '}
            {bundle.vote.votingSystem.replace(/_/g, ' ')}
            {' · '}
            {bundle.vote.isAnonymous ? 'anonymous' : 'attributable'}
            {' · '}
            <Link href={`/voting/${bundle.vote.id}/results`} className="text-[#00928F] hover:underline">
              View results
            </Link>
          </span>
        }
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <StorageBackendBanner backend={backend} />
        <VoteAdmin initial={bundle} />
      </main>
      <SiteFooter />
    </div>
  );
}
