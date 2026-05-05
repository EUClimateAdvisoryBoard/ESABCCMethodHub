/**
 * Voting Tool — type definitions.
 *
 * The voting tool (M·06) lets MethodHub users create polls and share a
 * single-use, public link with externals (typically Advisory Board members).
 * Externals reach `/vote/<token>` without site-auth and submit a ballot;
 * results are written to `data/votes/` and analysed inside the Hub.
 *
 * Anything in this file must be safe to import from both server and client
 * code (no Node APIs).
 */

export type VotingSystem =
  | 'priority_ranking'  // assign integer scores per option (e.g. 1=high, 2=med, 3=low)
  | 'single_choice'     // pick exactly one option
  | 'multi_choice'      // pick up to N options
  | 'approval'          // approve / reject each option
  | 'star'              // 1–5 star rating per option
  | 'average_ranking'   // each voter ranks options 1..N; result = mean rank per option
  | 'ranked_voting';    // instant-runoff: eliminate the lowest first-preference each round until a majority winner

export type VoteStatus = 'draft' | 'open' | 'closed';

export interface VoteOption {
  /** Stable id used as the ballot response key. Auto-generated from label. */
  id: string;
  label: string;
  description?: string;
}

/**
 * Per-system configuration.
 *
 * For priority_ranking: `scores` lists the allowed scores in priority order
 *   (lowest = highest priority by convention) and `maxPerScore` caps how
 *   many options may receive each score. Scores not capped here may be
 *   used freely (used for the "rest of the topics" bucket).
 *
 * For single_choice / multi_choice: `maxSelections` caps the number of
 *   selections (always 1 for single_choice).
 *
 * For star: `maxStars` is the upper bound (default 5).
 */
export interface VoteConfig {
  scores?: number[];
  maxPerScore?: Record<string, number | null>; // null = unlimited
  scoreLabels?: Record<string, string>;        // human label per score
  /** Whether every option must be assigned a score (priority_ranking only). */
  requireAllScored?: boolean;
  maxSelections?: number;
  maxStars?: number;
  /**
   * Ranking systems (`average_ranking`, `ranked_voting`). When true, every
   * option must be given a distinct rank in 1..N. When false (the default
   * for `ranked_voting`), voters may leave options unranked — useful for
   * truncated IRV ballots.
   */
  requireAllRanked?: boolean;
  /**
   * Priority-ranking shortlist policy (analysis-only — does not affect ballot
   * validation).
   *
   *   'natural_break' (default) — pick the cut where adjacent means jump
   *     the most, clamped to the [shortlistMin..shortlistMax] window. The
   *     window defaults to 4..7 when these fields are omitted.
   *   'fixed' — always cut after `shortlistSize` rows, regardless of where
   *     the biggest mean-gap lands.
   */
  shortlistMode?: 'natural_break' | 'fixed';
  /** Lower bound on the natural-break shortlist size (inclusive). */
  shortlistMin?: number;
  /** Upper bound on the natural-break shortlist size (inclusive). */
  shortlistMax?: number;
  /** Shortlist size when `shortlistMode = 'fixed'`. */
  shortlistSize?: number;
  /**
   * If this vote was spawned by "Find clear winner" on a parent vote, the
   * parent's id. Lets the parent's admin/results pages link to the runoff
   * and pull its outcome back into the original surface.
   */
  parentVoteId?: string;
}

export interface VoteRecord {
  id: string;
  title: string;
  description?: string;
  /** Instructions shown to externals on the ballot page. */
  instructions?: string;
  votingSystem: VotingSystem;
  config: VoteConfig;
  options: VoteOption[];
  /**
   * Whether ballots are anonymised at rest. When true, no token reference
   * is persisted on the ballot row — only a hash that proves the token was
   * single-use. When false, the token id is saved alongside the ballot so
   * admins can see who has voted (the token may carry an optional label).
   */
  isAnonymous: boolean;
  status: VoteStatus;
  createdAt: string;
  closesAt?: string;
  createdBy?: string;
  /**
   * Bumped by the admin "Reset" action. The ballot page tags its
   * localStorage "already submitted" flag with this number, so bumping
   * the epoch invalidates every participant's browser flag at once.
   * Defaults to 0 for votes that have never been reset.
   */
  resetEpoch: number;
}

export interface VoteToken {
  /** Random url-safe token, used as both id and credential. */
  token: string;
  /** Optional label visible only to the admin (e.g. participant name). */
  label?: string;
  createdAt: string;
  /**
   * ISO timestamp of the FIRST submission via this token. null = never
   * used. Single-use tokens are exhausted after one submission; shared
   * tokens (`maxUses=null` or `useCount<maxUses`) keep accepting more.
   */
  usedAt: string | null;
  /**
   * Maximum number of submissions allowed via this token.
   *   1     → single-use (default; the original behaviour).
   *   N>1   → up to N submissions allowed.
   *   null  → unlimited (a "universal link" anyone can submit through).
   */
  maxUses: number | null;
  /** Number of submissions that have actually been made through this token. */
  useCount: number;
}

export interface Ballot {
  id: string;
  voteId: string;
  /** Submission timestamp. */
  submittedAt: string;
  /**
   * Map of optionId -> response value.
   *
   *   priority_ranking: optionId -> integer score
   *   single_choice:    optionId -> true (one key)
   *   multi_choice:     optionId -> true (up to N keys)
   *   approval:         optionId -> boolean
   *   star:             optionId -> 1..maxStars
   *   average_ranking:  optionId -> distinct rank in 1..N (1 = top)
   *   ranked_voting:    optionId -> distinct rank in 1..N (1 = top); options
   *                     not ranked are simply omitted from the map.
   */
  responses: Record<string, number | boolean>;
  /** Token id if not anonymous; otherwise undefined. */
  tokenId?: string;
  /** SHA-256 of (voteId || token) — proof of single-use without leaking the token. */
  tokenFingerprint: string;
}

export interface VoteBundle {
  vote: VoteRecord;
  tokens: VoteToken[];
  ballots: Ballot[];
}

/** Public-safe view of a vote — what externals see on /vote/<token>. */
export interface PublicVoteView {
  id: string;
  title: string;
  description?: string;
  instructions?: string;
  votingSystem: VotingSystem;
  config: VoteConfig;
  options: VoteOption[];
  status: VoteStatus;
  closesAt?: string;
  /**
   * True when the token has reached its max_uses cap. For shared tokens
   * (`isShared=true`) this only flips when the cap is set and exhausted.
   * Per-browser idempotency for shared links is handled by localStorage on
   * the client side.
   */
  alreadySubmitted: boolean;
  /**
   * True when this token allows multiple submissions (max_uses != 1).
   * The ballot page uses this to switch from "single-use" wording to
   * "shared link" wording.
   */
  isShared: boolean;
  /** See VoteRecord.resetEpoch — the ballot page mixes this into its
   * localStorage key so an admin reset re-enables that browser. */
  resetEpoch: number;
}
