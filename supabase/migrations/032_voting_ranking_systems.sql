-- 032: Voting Tool — add `average_ranking` and `ranked_voting` voting systems.
--
-- Extends the check constraint on `votes.voting_system` so polls can be saved
-- with the two ranking-based systems exposed in the vote builder:
--
--   average_ranking — voters order all options 1..N; result is the mean rank
--                     per option (lower = stronger preference).
--   ranked_voting   — instant-runoff: each round counts top-remaining
--                     preferences and eliminates the lowest until a majority
--                     winner emerges.
--
-- Idempotent: drops the prior constraint (whatever its current shape) and
-- recreates it with the expanded value list.

alter table public.votes
  drop constraint if exists votes_voting_system_check;

alter table public.votes
  add constraint votes_voting_system_check
  check (voting_system in (
    'priority_ranking',
    'single_choice',
    'multi_choice',
    'approval',
    'star',
    'average_ranking',
    'ranked_voting'
  ));
