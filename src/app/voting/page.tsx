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
import { unstable_noStore as noStore } from 'next/cache';
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
  // Belt-and-braces against any pre-render or fetch cache: every load must
  // re-read tokens/ballots from the live store, otherwise admins see stale
  // counts after a ballot is submitted.
  noStore();
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
          <>
            {/* Mobile / narrow tablet — card-based list, no horizontal scroll. */}
            <ul className="md:hidden grid grid-cols-1 gap-3" aria-label="Votes">
              {votes.map((v) => {
                const c = countMap.get(v.id);
                return (
                  <li
                    key={v.id}
                    className="rounded-md border border-[#E6E7E8] dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <Link
                        className="font-semibold text-[14px] text-[#3D5265] dark:text-[var(--mh-fg)] hover:text-[#00928F] flex-1 min-w-0 break-words"
                        href={`/voting/${v.id}`}
                      >
                        {v.title}
                      </Link>
                      <StatusBadge status={v.status} />
                    </div>
                    <div className="mt-1 text-[11px] font-mono text-[#8A95A3] dark:text-[var(--mh-muted)] truncate">{v.id}</div>
                    <dl className="mt-3 grid grid-cols-3 gap-2 text-[12px]">
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8A95A3] dark:text-[var(--mh-muted)]">System</dt>
                        <dd className="mt-0.5 text-[#3D5265] dark:text-[var(--mh-fg)] capitalize">{v.votingSystem.replace(/_/g, ' ')}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8A95A3] dark:text-[var(--mh-muted)]">Tokens</dt>
                        <dd className="mt-0.5 tabular-nums text-[#3D5265] dark:text-[var(--mh-fg)]">{c ? `${c.used} / ${c.tokens}` : '—'}</dd>
                      </div>
                      <div>
                        <dt className="text-[10px] uppercase tracking-[0.08em] text-[#8A95A3] dark:text-[var(--mh-muted)]">Ballots</dt>
                        <dd className="mt-0.5 tabular-nums text-[#3D5265] dark:text-[var(--mh-fg)]">{c?.ballots ?? 0}</dd>
                      </div>
                    </dl>
                    <p className="mt-2 text-[11px] text-[#8A95A3] dark:text-[var(--mh-muted)]">
                      Created {fmtDate(v.createdAt)}
                    </p>
                    <div className="mt-3 flex gap-2">
                      <Link
                        href={`/voting/${v.id}`}
                        className="flex-1 inline-flex items-center justify-center min-h-[40px] px-3 text-[12px] font-semibold text-white bg-[#00928F] rounded active:opacity-90"
                      >
                        View
                      </Link>
                      <Link
                        href={`/voting/${v.id}/results`}
                        className="flex-1 inline-flex items-center justify-center min-h-[40px] px-3 text-[12px] font-semibold text-[#00928F] border border-[#00928F]/30 rounded active:bg-[#E6F5F4] dark:active:bg-[var(--mh-border)]"
                      >
                        Results
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>

            {/* md+ — table layout with explicit horizontal-scroll affordance. */}
            <div className="hidden md:block overflow-x-auto rounded-sm border border-[#E6E7E8] dark:border-[var(--mh-border)]">
              <table className="min-w-full text-[13px]">
                <thead className="bg-[#FBFBFA] dark:bg-[var(--mh-bg)] text-[#3D5265]/70 dark:text-[var(--mh-muted)] font-mono text-[10.5px] uppercase tracking-[0.1em]">
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
                <tbody className="divide-y divide-[#E6E7E8] dark:divide-[var(--mh-border)]">
                  {votes.map((v) => {
                    const c = countMap.get(v.id);
                    return (
                      <tr key={v.id} className="hover:bg-[#FBFBFA] dark:hover:bg-[var(--mh-bg)]">
                        <td className="px-3 py-3">
                          <Link className="font-semibold text-[#3D5265] dark:text-[var(--mh-fg)] hover:text-[#00928F]" href={`/voting/${v.id}`}>
                            {v.title}
                          </Link>
                          <div className="text-[11px] font-mono text-[#8A95A3] dark:text-[var(--mh-muted)]">{v.id}</div>
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
                          <div className="inline-flex items-center gap-3">
                            <Link
                              href={`/voting/${v.id}`}
                              className="text-[12.5px] font-semibold text-[#00928F] hover:underline"
                            >
                              View →
                            </Link>
                            <Link
                              href={`/voting/${v.id}/results`}
                              className="text-[12.5px] font-semibold text-[#00928F] hover:underline"
                            >
                              Results →
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
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
