/**
 * /voting/[voteId]/results — analysis surface for Method Hub users.
 *
 * For priority_ranking we render a ranked table (lowest mean first), the
 * mean / median / std-dev per option, the per-score histogram and a
 * highlighted natural-break boundary where the means jump the most.
 *
 * For other voting systems we render a simple tally / star-rating table.
 */
import { notFound } from 'next/navigation';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import { getVote } from '@/lib/voting/store';
import { analyse, PriorityAnalysis, TallyAnalysis, StarAnalysis } from '@/lib/voting/analysis';

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

export default async function ResultsPage({ params }: { params: { voteId: string } }) {
  const bundle = await getVote(params.voteId);
  if (!bundle) notFound();
  const analysis = analyse(bundle.vote, bundle.ballots);

  const issued = bundle.tokens.length;
  const used = bundle.tokens.filter((t) => t.usedAt).length;
  const submitted = bundle.ballots.length;

  return (
    <div className="min-h-screen bg-white text-[#3D5265]">
      <SiteHeader />
      <PageHero
        title={`Results: ${bundle.vote.title}`}
        subtitle={
          <span>
            <Link href={`/voting/${bundle.vote.id}`} className="text-[#00928F] hover:underline">
              ← Back to vote
            </Link>{' '}
            · {bundle.vote.votingSystem.replace(/_/g, ' ')} · {bundle.vote.status}
          </span>
        }
      />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 space-y-8">
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden">
          <Stat label="Tokens issued" value={String(issued)} />
          <Stat label="Tokens used" value={`${used} / ${issued}`} />
          <Stat label="Ballots submitted" value={String(submitted)} />
          <Stat label="Participation" value={issued > 0 ? `${Math.round((used / issued) * 100)}%` : '—'} />
        </section>

        {analysis.kind === 'priority_ranking' ? (
          <PriorityTable analysis={analysis} ballots={submitted} />
        ) : analysis.kind === 'star' ? (
          <StarTable analysis={analysis} />
        ) : (
          <TallyTable analysis={analysis} />
        )}
      </main>
      <SiteFooter />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white px-4 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.1em] text-[#8A95A3]">{label}</div>
      <div className="mt-1 text-[20px] font-bold text-[#3D5265] tabular-nums">{value}</div>
    </div>
  );
}

function PriorityTable({ analysis, ballots }: { analysis: PriorityAnalysis; ballots: number }) {
  const scoreKeys = Object.keys(analysis.rows[0]?.scoreCounts ?? {});
  return (
    <section className="rounded-sm border border-[#E6E7E8] bg-white">
      <header className="px-4 py-3 border-b border-[#E6E7E8] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[#3D5265]">Priority ranking</h2>
          <p className="text-[12px] text-[#3D5265]/70">
            Sorted by mean ascending — lowest mean = highest priority.
            {analysis.shortlistEnd != null
              ? ` Suggested short list: top ${analysis.shortlistEnd + 1} option${analysis.shortlistEnd === 0 ? '' : 's'}.`
              : ''}
          </p>
        </div>
        <span className="font-mono text-[11px] text-[#8A95A3] uppercase tracking-[0.1em]">
          {ballots} ballots
        </span>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead className="bg-[#FBFBFA] text-[#3D5265]/70 font-mono text-[10.5px] uppercase tracking-[0.1em]">
            <tr>
              <th className="text-left px-3 py-2 w-10">#</th>
              <th className="text-left px-3 py-2">Option</th>
              <th className="text-right px-3 py-2">Mean</th>
              <th className="text-right px-3 py-2">Median</th>
              <th className="text-right px-3 py-2">SD</th>
              <th className="text-right px-3 py-2">N</th>
              {scoreKeys.map((s) => (
                <th key={s} className="text-right px-3 py-2">Score {s}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E7E8]">
            {analysis.rows.map((r, i) => {
              const inShortlist = analysis.shortlistEnd != null && i <= analysis.shortlistEnd;
              const isBreakAfter = analysis.shortlistEnd === i;
              return (
                <tr
                  key={r.optionId}
                  className={
                    (inShortlist ? 'bg-[#E6F5F4]/40 ' : '') +
                    (isBreakAfter ? 'border-b-2 border-[#E87722] ' : '')
                  }
                >
                  <td className="px-3 py-2 font-mono text-[12px] text-[#8A95A3] tabular-nums">{i + 1}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.label}</span>
                    {inShortlist ? (
                      <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] bg-[#00928F]/10 text-[#00928F] rounded-sm">
                        short list
                      </span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(r.mean)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(r.median)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{fmt(r.stddev)}</td>
                  <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
                  {scoreKeys.map((s) => (
                    <td key={s} className="px-3 py-2 text-right tabular-nums text-[12px]">
                      {r.scoreCounts[s] ?? 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {analysis.shortlistEnd != null ? (
        <p className="px-4 py-3 text-[12px] text-[#3D5265]/70 border-t border-[#E6E7E8]">
          Natural-break suggestion: the largest gap between adjacent means
          falls after rank #{analysis.shortlistEnd + 1}. The orange separator
          marks where the short list ends.
        </p>
      ) : null}
    </section>
  );
}

function TallyTable({ analysis }: { analysis: TallyAnalysis }) {
  return (
    <section className="rounded-sm border border-[#E6E7E8] bg-white">
      <header className="px-4 py-3 border-b border-[#E6E7E8]">
        <h2 className="text-[15px] font-bold text-[#3D5265]">Tally</h2>
      </header>
      <table className="min-w-full text-[13px]">
        <thead className="bg-[#FBFBFA] text-[#3D5265]/70 font-mono text-[10.5px] uppercase tracking-[0.1em]">
          <tr>
            <th className="text-left px-3 py-2">Option</th>
            <th className="text-right px-3 py-2">Votes</th>
            <th className="text-right px-3 py-2">Share</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6E7E8]">
          {analysis.rows.map((r) => (
            <tr key={r.optionId}>
              <td className="px-3 py-2">{r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold">{r.count}</td>
              <td className="px-3 py-2 text-right tabular-nums">{Math.round(r.share * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function StarTable({ analysis }: { analysis: StarAnalysis }) {
  return (
    <section className="rounded-sm border border-[#E6E7E8] bg-white">
      <header className="px-4 py-3 border-b border-[#E6E7E8]">
        <h2 className="text-[15px] font-bold text-[#3D5265]">Star ratings</h2>
      </header>
      <table className="min-w-full text-[13px]">
        <thead className="bg-[#FBFBFA] text-[#3D5265]/70 font-mono text-[10.5px] uppercase tracking-[0.1em]">
          <tr>
            <th className="text-left px-3 py-2">Option</th>
            <th className="text-right px-3 py-2">Mean</th>
            <th className="text-right px-3 py-2">N</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E6E7E8]">
          {analysis.rows.map((r) => (
            <tr key={r.optionId}>
              <td className="px-3 py-2">{r.label}</td>
              <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(r.mean)}</td>
              <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
