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
import { unstable_noStore as noStore } from 'next/cache';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import PageHero from '@/components/PageHero';
import { getVote, listVotes } from '@/lib/voting/store';
import {
  analyse,
  PriorityAnalysis,
  TallyAnalysis,
  StarAnalysis,
  AverageRankingAnalysis,
  RankedVotingAnalysis,
} from '@/lib/voting/analysis';

export const dynamic = 'force-dynamic';

function fmt(n: number): string {
  if (!Number.isFinite(n)) return '—';
  return n.toFixed(2);
}

export default async function ResultsPage({ params }: { params: { voteId: string } }) {
  // Force a fresh read on every request — admins refreshing this page after
  // a new ballot must see the updated counts and analysis, not a cached
  // pre-render with stale numbers.
  noStore();
  const bundle = await getVote(params.voteId);
  if (!bundle) notFound();
  const analysis = analyse(bundle.vote, bundle.ballots);

  const issued = bundle.tokens.length;
  const used = bundle.tokens.filter((t) => t.usedAt).length;
  const submitted = bundle.ballots.length;

  // Pull in this vote's runoff descendants and (if relevant) its parent so
  // the admin can navigate between the layered votes from one screen.
  const allVotes = await listVotes();
  const childVotes = allVotes.filter((v) => v.config?.parentVoteId === bundle.vote.id);
  const parentVoteId = bundle.vote.config?.parentVoteId;
  const parentVote = parentVoteId ? allVotes.find((v) => v.id === parentVoteId) ?? null : null;

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
        <section>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#00928F] font-semibold mb-2">
            <span className="inline-block w-4 border-t border-[#00928F] align-middle mr-1.5" />
            Participation
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-[#E6E7E8] border border-[#E6E7E8] rounded-sm overflow-hidden">
            <Stat label="Tokens issued" value={String(issued)} />
            <Stat label="Tokens used" value={`${used} / ${issued}`} />
            <Stat label="Ballots submitted" value={String(submitted)} />
            <Stat label="Participation" value={issued > 0 ? `${Math.round((used / issued) * 100)}%` : '—'} />
          </div>
        </section>

        {parentVote ? (
          <section className="rounded-sm border border-[#00928F]/40 bg-[#E6F5F4]/40 p-4 text-[13px] text-[#3D5265]">
            <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#00928F] font-semibold mr-2">
              Follow-up vote
            </span>
            Spawned from{' '}
            <Link href={`/voting/${parentVote.id}/results`} className="font-semibold text-[#00928F] hover:underline">
              {parentVote.title}
            </Link>
            {' '}to find the clear winner among its shortlist.
          </section>
        ) : null}

        {childVotes.length > 0 ? (
          <section className="rounded-sm border border-[#E6E7E8] bg-white p-4">
            <h3 className="text-[13px] font-mono uppercase tracking-[0.12em] text-[#3D5265]/70 mb-2">
              Follow-up votes
            </h3>
            <ul className="space-y-1 text-[13px]">
              {childVotes.map((child) => (
                <li key={child.id} className="flex flex-wrap items-center gap-3">
                  <span className="font-medium">{child.title}</span>
                  <span className="font-mono text-[11px] text-[#8A95A3]">
                    {child.votingSystem.replace(/_/g, ' ')} · {child.status}
                  </span>
                  <Link
                    href={`/voting/${child.id}/results`}
                    className="ml-auto font-semibold text-[#00928F] hover:underline text-[12.5px]"
                  >
                    Open follow-up results →
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {analysis.kind === 'priority_ranking' ? (
          <PriorityTable
            analysis={analysis}
            ballots={submitted}
            scoreLabels={bundle.vote.config.scoreLabels ?? {}}
          />
        ) : analysis.kind === 'star' ? (
          <StarTable analysis={analysis} />
        ) : analysis.kind === 'average_ranking' ? (
          <AverageRankingTable analysis={analysis} ballots={submitted} />
        ) : analysis.kind === 'ranked_voting' ? (
          <RankedVotingTable analysis={analysis} />
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

function PriorityTable({
  analysis,
  ballots,
  scoreLabels,
}: {
  analysis: PriorityAnalysis;
  ballots: number;
  scoreLabels: Record<string, string>;
}) {
  const scoreKeys = Object.keys(analysis.rows[0]?.scoreCounts ?? {});
  // Domain for the inline mean-bar: scores observed in this analysis. We use
  // the min/max numeric scoreKey rather than a hard-coded 1..3 so the bar
  // also makes sense for non-default score sets (e.g. 1..5).
  const numericScores = scoreKeys.map(Number).filter((n) => Number.isFinite(n));
  const scoreMin = numericScores.length ? Math.min(...numericScores) : 1;
  const scoreMax = numericScores.length ? Math.max(...numericScores) : 3;
  const span = Math.max(scoreMax - scoreMin, 0.0001);
  return (
    <section className="rounded-sm border border-[#E6E7E8] bg-white">
      <header className="px-4 py-3 border-b border-[#E6E7E8] flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-[10.5px] uppercase tracking-[0.14em] text-[#00928F] font-semibold">
            <span className="inline-block w-4 border-t border-[#00928F] align-middle mr-1.5" />
            Method · priority ranking
          </p>
          <h2 className="mt-1.5 text-[15px] font-bold text-[#3D5265]">Per-option statistics</h2>
          <p className="mt-1 text-[12px] text-[#3D5265]/70 leading-relaxed">
            Sorted by mean ascending — lowest mean = highest priority. The bar shows where
            the option&apos;s mean lies between the lowest ({scoreMin}) and highest ({scoreMax}) score.
            {analysis.shortlistEnd != null
              ? ` Suggested short list: top ${analysis.shortlistEnd + 1} option${analysis.shortlistEnd === 0 ? '' : 's'}.`
              : ''}
          </p>
        </div>
        <dl className="font-mono text-[10.5px] text-[#3D5265]/80 space-y-0.5 text-right shrink-0">
          <div className="flex items-baseline justify-end gap-2">
            <dt className="tracking-[0.1em] text-[#8A95A3]">N · BALLOTS</dt>
            <dd className="tabular-nums text-[#3D5265] font-semibold">{ballots}</dd>
          </div>
          <div className="flex items-baseline justify-end gap-2">
            <dt className="tracking-[0.1em] text-[#8A95A3]">K · OPTIONS</dt>
            <dd className="tabular-nums text-[#3D5265] font-semibold">{analysis.rows.length}</dd>
          </div>
        </dl>
      </header>
      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead className="bg-[#FBFBFA] text-[#3D5265]/70 font-mono text-[10.5px] uppercase tracking-[0.1em]">
            <tr>
              <th className="text-left px-3 py-2 w-10">#</th>
              <th className="text-left px-3 py-2">Option</th>
              <th className="text-left px-3 py-2 w-[140px]">μ on [{scoreMin}, {scoreMax}]</th>
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
              const meanFraction = Number.isFinite(r.mean)
                ? Math.max(0, Math.min(1, (r.mean - scoreMin) / span))
                : null;
              // The break separator has to live on the <td>s, not the <tr>:
              // the parent <tbody>'s divide-y draws a border-top on the next
              // row that paints over a tr-level border-bottom and hides the
              // line entirely.
              const breakCell = isBreakAfter ? 'border-b-[3px] border-[#E87722] ' : '';
              return (
                <tr
                  key={r.optionId}
                  className={inShortlist ? 'bg-[#E6F5F4]/40' : ''}
                >
                  <td className={breakCell + 'px-3 py-2 font-mono text-[12px] text-[#8A95A3] tabular-nums'}>{i + 1}</td>
                  <td className={breakCell + 'px-3 py-2'}>
                    <span className="font-medium">{r.label}</span>
                    {inShortlist ? (
                      <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] bg-[#00928F]/10 text-[#00928F] rounded-sm">
                        short list
                      </span>
                    ) : null}
                  </td>
                  <td className={breakCell + 'px-3 py-2'}>
                    {meanFraction == null ? (
                      <span className="text-[#8A95A3] font-mono text-[11px]">—</span>
                    ) : (
                      <div className="relative h-2 w-full bg-[#FBFBFA] border border-[#E6E7E8] rounded-sm overflow-hidden" aria-hidden>
                        <span
                          className={
                            'absolute inset-y-0 left-0 ' +
                            (inShortlist ? 'bg-[#00928F]' : 'bg-[#3D5265]/40')
                          }
                          style={{ width: `${meanFraction * 100}%` }}
                        />
                      </div>
                    )}
                  </td>
                  <td className={breakCell + 'px-3 py-2 text-right tabular-nums font-bold'}>{fmt(r.mean)}</td>
                  <td className={breakCell + 'px-3 py-2 text-right tabular-nums'}>{fmt(r.median)}</td>
                  <td className={breakCell + 'px-3 py-2 text-right tabular-nums'}>{fmt(r.stddev)}</td>
                  <td className={breakCell + 'px-3 py-2 text-right tabular-nums'}>{r.count}</td>
                  {scoreKeys.map((s) => (
                    <td key={s} className={breakCell + 'px-3 py-2 text-right tabular-nums text-[12px]'}>
                      {r.scoreCounts[s] ?? 0}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {analysis.shortlistEnd != null && analysis.shortlistInfo ? (
        <ShortlistExplainer
          shortlistEnd={analysis.shortlistEnd}
          info={analysis.shortlistInfo}
        />
      ) : null}
      <MethodologyNote scoreKeys={scoreKeys} scoreLabels={scoreLabels} rows={analysis.rows} />
    </section>
  );
}

/**
 * Short footer that pins down the scoring convention used in the table:
 * lists each allowed score together with its label (e.g. "1 = high"), and
 * spells out the "lower mean = higher priority" rule. The score labels live
 * on the parent vote (vote.config.scoreLabels) but they are not echoed by
 * the analysis rows — we surface them here from the raw config instead.
 */
function MethodologyNote({
  scoreKeys,
  rows,
  scoreLabels,
}: {
  scoreKeys: string[];
  rows: PriorityAnalysis['rows'];
  scoreLabels?: Record<string, string>;
}) {
  // Re-derive the scoring labels from whatever the page already loaded.
  // Empty when the vote was created without scoreLabels — in that case we
  // omit the labels and only describe the priority direction.
  const labels = scoreLabels ?? {};
  const items = scoreKeys
    .map((k) => ({ score: k, label: labels[k] }))
    .filter((it) => Number.isFinite(Number(it.score)));
  // Suppress the per-row stats reference if the table is empty.
  if (rows.length === 0) return null;
  return (
    <div className="px-4 py-3 border-t border-[#E6E7E8] text-[12px] text-[#3D5265]/75 leading-relaxed space-y-2">
      <p>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#3D5265]/60 font-semibold mr-1">
          Methodology
        </span>
        Each ballot assigns one of the allowed integer scores to every option.
        We compute the mean, median and standard deviation of those scores
        per option, sort ascending, and call the lowest-mean rows the
        highest-priority. The shortlist boundary (orange separator) follows
        the policy configured for this vote.
      </p>
      <p>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#3D5265]/60 font-semibold mr-1">
          Scores
        </span>
        {items.length > 0 ? (
          <>
            {items.map((it, i) => (
              <span key={it.score}>
                {i > 0 ? ', ' : ''}
                <span className="font-mono">{it.score}</span>
                {it.label ? <> = {it.label}</> : null}
              </span>
            ))}
            {'. '}
          </>
        ) : null}
        Lower numeric scores represent higher priority — so a smaller mean
        means a stronger collective preference for that option.
      </p>
    </div>
  );
}

function ShortlistExplainer({
  shortlistEnd,
  info,
}: {
  shortlistEnd: number;
  info: NonNullable<PriorityAnalysis['shortlistInfo']>;
}) {
  const chosenSize = shortlistEnd + 1;

  if (info.mode === 'fixed') {
    return (
      <div className="px-4 py-3 border-t border-[#E6E7E8] text-[12px] text-[#3D5265]/75 leading-relaxed space-y-2">
        <p>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#E87722] font-semibold mr-1">
            Fixed shortlist
          </span>
          The shortlist is fixed at the top {chosenSize} option{chosenSize === 1 ? '' : 's'} regardless
          of where the means cluster. The orange separator marks the cut.
          {Number.isFinite(info.chosenGap) && info.chosenGap !== 0
            ? <> Δmean across this boundary: {fmt(info.chosenGap)}.</>
            : null}
        </p>
      </div>
    );
  }

  const targetSize = info.targetEnd + 1;
  const hitTarget = shortlistEnd === info.targetEnd;
  // "Near-tie" when the runner-up gap is within 10% of the chosen one (and
  // both are positive). Below that threshold the cut is sensitive to a few
  // ballots tipping one way and should be treated as advisory.
  const closeCall =
    info.runnerUp != null &&
    info.chosenGap > 0 &&
    info.runnerUp.gap > 0 &&
    (info.chosenGap - info.runnerUp.gap) / info.chosenGap < 0.1;

  return (
    <div className="px-4 py-3 border-t border-[#E6E7E8] text-[12px] text-[#3D5265]/75 leading-relaxed space-y-2">
      <p>
        <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#E87722] font-semibold mr-1">
          Natural break
        </span>
        The largest jump between adjacent means falls after rank #{chosenSize} (Δ&nbsp;=&nbsp;{fmt(info.chosenGap)}).
        The orange separator marks where the short list ends.
      </p>
      <p>
        The cut is the biggest jump within the top-{info.minSize} to top-{info.maxSize} window. The
        conventional target is a top-{targetSize} short list, but the boundary
        moves to wherever that biggest jump actually sits — so the short list
        follows the data instead of being forced to a fixed size.
      </p>
      {hitTarget ? null : (
        <p>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#3D5265]/60 font-semibold mr-1">
            Off target
          </span>
          The cut landed at top-{chosenSize} rather than the conventional
          top-{targetSize}. This happens when the vote is skewed (broad
          agreement pushes the biggest gap earlier) or when one option
          stands clearly apart from a tightly-clustered tail.
        </p>
      )}
      {info.runnerUp ? (
        <p>
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] text-[#3D5265]/60 font-semibold mr-1">
            Runner-up
          </span>
          The next-best break would put the cut after rank #{info.runnerUp.end + 1} (Δ&nbsp;=&nbsp;{fmt(info.runnerUp.gap)}).
        </p>
      ) : null}
      {closeCall ? (
        <p className="text-[#B33A3A]">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.12em] font-semibold mr-1">
            Near tie
          </span>
          The chosen and runner-up gaps are within 10% of each other, so a
          handful of ballots could move the boundary. When the vote is this
          dispersed, treat the suggested short list as advisory and confirm
          the cut-off with the Advisory Board rather than reading it as a
          definitive draw.
        </p>
      ) : null}
    </div>
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

function AverageRankingTable({
  analysis,
  ballots,
}: {
  analysis: AverageRankingAnalysis;
  ballots: number;
}) {
  return (
    <section className="rounded-sm border border-[#E6E7E8] bg-white">
      <header className="px-4 py-3 border-b border-[#E6E7E8] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[#3D5265]">Average ranking</h2>
          <p className="text-[12px] text-[#3D5265]/70">
            Sorted by mean rank ascending — lower mean = stronger preference.
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
              <th className="text-right px-3 py-2">Mean rank</th>
              <th className="text-right px-3 py-2">Median</th>
              <th className="text-right px-3 py-2">SD</th>
              <th className="text-right px-3 py-2">N</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E7E8]">
            {analysis.rows.map((r, i) => (
              <tr key={r.optionId}>
                <td className="px-3 py-2 font-mono text-[12px] text-[#8A95A3] tabular-nums">{i + 1}</td>
                <td className="px-3 py-2 font-medium">{r.label}</td>
                <td className="px-3 py-2 text-right tabular-nums font-bold">{fmt(r.mean)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.median)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{fmt(r.stddev)}</td>
                <td className="px-3 py-2 text-right tabular-nums">{r.count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function RankedVotingTable({ analysis }: { analysis: RankedVotingAnalysis }) {
  const options = analysis.rounds[0]?.rows ?? [];
  return (
    <section className="rounded-sm border border-[#E6E7E8] bg-white">
      <header className="px-4 py-3 border-b border-[#E6E7E8] flex items-center justify-between">
        <div>
          <h2 className="text-[15px] font-bold text-[#3D5265]">Ranked voting (instant-runoff)</h2>
          <p className="text-[12px] text-[#3D5265]/70">
            Each round shows first-preference counts among still-active ballots. The lowest is eliminated until a majority winner emerges.
          </p>
        </div>
        <span className="font-mono text-[11px] text-[#8A95A3] uppercase tracking-[0.1em]">
          {analysis.totalBallots} ballots
        </span>
      </header>

      {analysis.winnerOptionId ? (
        <div className="px-4 py-3 border-b border-[#E6E7E8] bg-[#E6F5F4]/40 text-[13px]">
          <span className="font-mono text-[10.5px] uppercase tracking-[0.1em] text-[#00928F] font-semibold">
            Winner
          </span>
          <span className="ml-2 font-bold text-[#3D5265]">
            {options.find((o) => o.optionId === analysis.winnerOptionId)?.label ?? analysis.winnerOptionId}
          </span>
          <span className="ml-2 text-[#3D5265]/70">
            — declared after round {analysis.rounds.length}.
          </span>
        </div>
      ) : analysis.tied ? (
        <div className="px-4 py-3 border-b border-[#E6E7E8] bg-[#FFF8EC] text-[13px] text-[#3D5265]">
          No majority winner — the count ended in a tie among the remaining options.
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <table className="min-w-full text-[13px]">
          <thead className="bg-[#FBFBFA] text-[#3D5265]/70 font-mono text-[10.5px] uppercase tracking-[0.1em]">
            <tr>
              <th className="text-left px-3 py-2">Option</th>
              {analysis.rounds.map((_, i) => (
                <th key={i} className="text-right px-3 py-2">R{i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E6E7E8]">
            {options.map((o) => (
              <tr key={o.optionId}>
                <td className="px-3 py-2 font-medium">
                  {o.label}
                  {analysis.winnerOptionId === o.optionId ? (
                    <span className="ml-2 inline-block px-1.5 py-0.5 text-[10px] font-mono uppercase tracking-[0.08em] bg-[#00928F]/10 text-[#00928F] rounded-sm">
                      winner
                    </span>
                  ) : null}
                </td>
                {analysis.rounds.map((round, i) => {
                  const cell = round.rows.find((r) => r.optionId === o.optionId);
                  const eliminatedHere = round.eliminatedOptionId === o.optionId;
                  return (
                    <td
                      key={i}
                      className={
                        'px-3 py-2 text-right tabular-nums ' +
                        (cell?.count == null ? 'text-[#8A95A3]' : '') +
                        (eliminatedHere ? ' bg-[#FCEBEB] text-[#B33A3A] font-semibold' : '')
                      }
                    >
                      {cell?.count == null ? '—' : cell.count}
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-[#FBFBFA] text-[12px] text-[#3D5265]/70">
              <td className="px-3 py-2 italic">Exhausted ballots</td>
              {analysis.rounds.map((round, i) => (
                <td key={i} className="px-3 py-2 text-right tabular-nums">{round.exhausted || '—'}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
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
