/**
 * M·06 — Voting Tool (admin index).
 *
 * Lists every vote known to the file-store. From here a Method Hub user
 * can open an existing vote, view results, or jump to the new-vote form.
 *
 * Server component; reads directly from the store. The site-auth gate in
 * `middleware.ts` ensures only Method Hub users reach this page.
 */
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import { listVotes, getVote } from '@/lib/voting/store';
import { detectVotingBackend } from '@/lib/voting/backend';
import StorageBackendBanner from './StorageBackendBanner';

export const dynamic = 'force-dynamic';

function fmtDate(iso?: string) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toISOString().slice(0, 10);
}

export default async function VotingIndex() {
  const backend = detectVotingBackend();
  const votes = await listVotes();
  const counts = await Promise.all(
    votes.map(async (v) => {
      const bundle = await getVote(v.id);
      return {
        id: v.id,
        tokens: bundle?.tokens.length ?? 0,
        used: bundle?.tokens.filter((t) => t.usedAt).length ?? 0,
        ballots: bundle?.ballots.length ?? 0,
      };
    }),
  );
  const countMap = new Map(counts.map((c) => [c.id, c]));

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero
        title="Voting Tool"
        subtitle={
          <span>
            Build private ballots for Advisory Board members. Externals receive
            a single-use link; their submissions never expose any other part of
            the Method Hub.
          </span>
        }
      >
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Link
            href="/voting/new"
            className="inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold text-white bg-[#00928F] rounded-sm hover:opacity-90"
          >
            + New vote
          </Link>
        </div>
      </PageHero>

      <main className="max-w-[1280px] mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <StorageBackendBanner backend={backend} />
        {votes.length === 0 ? (
          <div className="rounded-sm border border-dashed border-[#B8BCC2] bg-[#FBFBFA] p-8 text-center">
            <h2 className="text-[16px] font-bold text-[#3D5265]">No votes yet.</h2>
            <p className="mt-2 text-[13px] text-[#3D5265]/75">
              Create your first vote — pick a voting system, add options and
              generate single-use links to share with externals.
            </p>
            <Link
              href="/voting/new"
              className="mt-4 inline-flex items-center justify-center px-4 py-2 text-[13px] font-semibold text-white bg-[#00928F] rounded-sm hover:opacity-90"
            >
              Create a vote
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sm border border-[#E6E7E8]">
            <table className="min-w-full text-[13px]">
              <thead className="bg-[#FBFBFA] text-[#3D5265]/70 font-mono text-[10.5px] uppercase tracking-[0.1em]">
                <tr>
                  <th className="text-left px-3 py-2.5">Title</th>
                  <th className="text-left px-3 py-2.5">System</th>
                  <th className="text-left px-3 py-2.5">Status</th>
                  <th className="text-right px-3 py-2.5">Tokens</th>
                  <th className="text-right px-3 py-2.5">Ballots</th>
                  <th className="text-left px-3 py-2.5">Created</th>
                  <th className="text-right px-3 py-2.5">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E7E8]">
                {votes.map((v) => {
                  const c = countMap.get(v.id);
                  return (
                    <tr key={v.id} className="hover:bg-[#FBFBFA]">
                      <td className="px-3 py-3">
                        <Link className="font-semibold text-[#3D5265] hover:text-[#00928F]" href={`/voting/${v.id}`}>
                          {v.title}
                        </Link>
                        <div className="text-[11px] font-mono text-[#8A95A3]">{v.id}</div>
                      </td>
                      <td className="px-3 py-3 text-[12.5px]">{v.votingSystem.replace(/_/g, ' ')}</td>
                      <td className="px-3 py-3">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">
                        {c ? `${c.used} / ${c.tokens}` : '—'}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums">{c?.ballots ?? 0}</td>
                      <td className="px-3 py-3 text-[12.5px]">{fmtDate(v.createdAt)}</td>
                      <td className="px-3 py-3 text-right">
                        <Link
                          href={`/voting/${v.id}/results`}
                          className="text-[12.5px] font-semibold text-[#00928F] hover:underline"
                        >
                          Results →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'open'
      ? 'bg-[#E6F5F4] text-[#00928F] border-[#00928F]/30'
      : status === 'closed'
      ? 'bg-[#FBF1ED] text-[#E87722] border-[#E87722]/40'
      : 'bg-[#FBFBFA] text-[#8A95A3] border-[#E6E7E8]';
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm border text-[11px] font-mono uppercase tracking-[0.1em] ${cls}`}>
      {status}
    </span>
  );
}
