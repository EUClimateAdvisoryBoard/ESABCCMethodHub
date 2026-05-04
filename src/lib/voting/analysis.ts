/**
 * Post-hoc analysis of submitted ballots.
 *
 * For priority_ranking we report mean / median / std-dev per option, sort
 * ascending (lowest mean = highest priority by convention), and propose a
 * "natural break" cut-off using the largest gap between adjacent means
 * (clamped to a 4..7 short-list when there are enough options).
 *
 * For other voting systems we surface tally counts. Everything is computed
 * fresh on read — there is no aggregate cache to keep in sync.
 */

import type { Ballot, VoteRecord } from './types';

export interface PriorityRow {
  optionId: string;
  label: string;
  count: number;
  mean: number;
  median: number;
  stddev: number;
  scoreCounts: Record<string, number>;
}

export interface PriorityAnalysis {
  kind: 'priority_ranking';
  rows: PriorityRow[];
  /** 0-based index — `rows[0..shortlistEnd]` is the proposed short list. */
  shortlistEnd: number | null;
}

export interface TallyRow {
  optionId: string;
  label: string;
  count: number;
  share: number;
}

export interface TallyAnalysis {
  kind: 'tally';
  rows: TallyRow[];
}

export interface StarRow {
  optionId: string;
  label: string;
  count: number;
  mean: number;
}

export interface StarAnalysis {
  kind: 'star';
  rows: StarRow[];
}

export type AnalysisResult = PriorityAnalysis | TallyAnalysis | StarAnalysis;

function mean(xs: number[]): number {
  if (xs.length === 0) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function median(xs: number[]): number {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

function stddev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  const v = xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1);
  return Math.sqrt(v);
}

function priorityRanking(vote: VoteRecord, ballots: Ballot[]): PriorityAnalysis {
  const allowedScores = (vote.config.scores ?? []).map(String);
  const rows: PriorityRow[] = vote.options.map((opt) => {
    const values: number[] = [];
    const scoreCounts: Record<string, number> = Object.fromEntries(
      allowedScores.map((s) => [s, 0]),
    );
    for (const b of ballots) {
      const r = b.responses[opt.id];
      if (typeof r === 'number') {
        values.push(r);
        const k = String(r);
        scoreCounts[k] = (scoreCounts[k] ?? 0) + 1;
      }
    }
    return {
      optionId: opt.id,
      label: opt.label,
      count: values.length,
      mean: values.length ? mean(values) : NaN,
      median: values.length ? median(values) : NaN,
      stddev: values.length ? stddev(values) : 0,
      scoreCounts,
    };
  });

  // Lower mean = higher priority. Push NaN (no votes) to the bottom.
  rows.sort((a, b) => {
    const am = Number.isFinite(a.mean) ? a.mean : Number.POSITIVE_INFINITY;
    const bm = Number.isFinite(b.mean) ? b.mean : Number.POSITIVE_INFINITY;
    return am - bm;
  });

  // Natural break: pick the cut between adjacent rows where the mean jumps
  // the most, constrained to a 4..7 short-list. Falls back to null when we
  // do not have enough options to make the split useful.
  let shortlistEnd: number | null = null;
  const finite = rows.filter((r) => Number.isFinite(r.mean));
  if (finite.length >= 5) {
    const lo = Math.min(3, finite.length - 1);
    const hi = Math.min(6, finite.length - 1);
    let bestI = lo;
    let bestGap = -Infinity;
    for (let i = lo; i <= hi; i++) {
      const gap = finite[i + 1] !== undefined ? finite[i + 1].mean - finite[i].mean : -Infinity;
      if (gap > bestGap) {
        bestGap = gap;
        bestI = i;
      }
    }
    shortlistEnd = bestI;
  }

  return { kind: 'priority_ranking', rows, shortlistEnd };
}

function tally(vote: VoteRecord, ballots: Ballot[]): TallyAnalysis {
  const counts: Record<string, number> = Object.fromEntries(
    vote.options.map((o) => [o.id, 0]),
  );
  let total = 0;
  for (const b of ballots) {
    for (const [optId, val] of Object.entries(b.responses)) {
      if (val === true) {
        counts[optId] = (counts[optId] ?? 0) + 1;
        total += 1;
      }
    }
  }
  const rows: TallyRow[] = vote.options
    .map((o) => ({
      optionId: o.id,
      label: o.label,
      count: counts[o.id] ?? 0,
      share: total > 0 ? (counts[o.id] ?? 0) / total : 0,
    }))
    .sort((a, b) => b.count - a.count);
  return { kind: 'tally', rows };
}

function star(vote: VoteRecord, ballots: Ballot[]): StarAnalysis {
  const rows: StarRow[] = vote.options.map((opt) => {
    const xs: number[] = [];
    for (const b of ballots) {
      const r = b.responses[opt.id];
      if (typeof r === 'number') xs.push(r);
    }
    return {
      optionId: opt.id,
      label: opt.label,
      count: xs.length,
      mean: xs.length ? mean(xs) : NaN,
    };
  });
  rows.sort((a, b) => {
    const am = Number.isFinite(a.mean) ? a.mean : -Infinity;
    const bm = Number.isFinite(b.mean) ? b.mean : -Infinity;
    return bm - am;
  });
  return { kind: 'star', rows };
}

export function analyse(vote: VoteRecord, ballots: Ballot[]): AnalysisResult {
  switch (vote.votingSystem) {
    case 'priority_ranking':
      return priorityRanking(vote, ballots);
    case 'star':
      return star(vote, ballots);
    case 'single_choice':
    case 'multi_choice':
    case 'approval':
      return tally(vote, ballots);
  }
}
