-- 030: Voting Tool — shared (multi-use) tokens.
--
-- Adds support for "universal" voting links: a single token that any number
-- of participants can use to submit a ballot, instead of pre-minting one
-- single-use token per participant.
--
-- Approach
-- --------
--   * `vote_tokens.max_uses` — null means unlimited; an integer caps the
--     number of ballots that can be submitted via this token. Existing
--     rows default to `1` (single-use), preserving prior semantics.
--   * `vote_tokens.use_count` — atomic counter, incremented on every
--     successful submission. Combined with `max_uses` in a single
--     UPDATE … WHERE clause, this gives us a race-free reservation.
--   * The `(vote_id, token_fingerprint)` unique index on `ballots` is
--     dropped: a shared token legitimately produces many ballots, all of
--     which share the same fingerprint. Single-use is now enforced
--     entirely by the atomic `use_count < max_uses` update on the token
--     row, which is sufficient.
--
-- Idempotent.

alter table public.vote_tokens
  add column if not exists max_uses int default 1,
  add column if not exists use_count int not null default 0;

-- The `default 1` above backfills every existing row with max_uses=1, so
-- pre-migration tokens keep their single-use semantics. New shared tokens
-- are minted with max_uses=null (unlimited) explicitly.

drop index if exists public.ux_ballots_vote_fingerprint;
