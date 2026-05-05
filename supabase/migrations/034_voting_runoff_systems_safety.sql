-- 034: Voting Tool — re-apply the voting_system check constraint.
--
-- Migration 032 first added `average_ranking` and `ranked_voting` to the
-- allow-list on `votes.voting_system`. Some deployments missed that
-- migration, so "Find clear winner" — which now defaults to
-- `average_ranking` — fails with `votes_voting_system_check`. This file
-- is an idempotent safety re-apply: drop the constraint (whatever its
-- current shape) and recreate it with the full set of values the app
-- actually writes today.
--
-- Safe to run repeatedly. If 032 has already been applied, this is a
-- no-op in effect.

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
