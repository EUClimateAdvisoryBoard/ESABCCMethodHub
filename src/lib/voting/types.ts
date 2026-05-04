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
  | 'star';             // 1–5 star rating per option

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
}

export interface VoteToken {
  /** Random url-safe token, used as both id and credential. */
  token: string;
  /** Optional label visible only to the admin (e.g. participant name). */
  label?: string;
  createdAt: string;
  /** ISO timestamp when the token was redeemed. null = unused. */
  usedAt: string | null;
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
  alreadySubmitted: boolean;
}
