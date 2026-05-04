/**
 * /voting/new — vote builder.
 *
 * Method Hub users define title/description/instructions, pick a voting
 * system, add options and configure per-system constraints (allowed scores,
 * caps per score, max selections, etc.).
 */
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import VoteBuilder from './VoteBuilder';

export const dynamic = 'force-dynamic';

export default function NewVotePage() {
  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero title="New vote" subtitle="Configure a ballot, pick a voting system and generate single-use links." />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <VoteBuilder />
      </main>
      <SiteFooter />
    </div>
  );
}
