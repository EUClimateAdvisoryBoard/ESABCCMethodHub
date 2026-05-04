-- 031: Voting Tool — reset epoch.
--
-- Lets an admin "reset" a vote: drop every ballot, clear every token's
-- use_count, and force participants whose browsers had a localStorage
-- "already submitted" flag set to be allowed to vote again.
--
-- We can't reach into a participant's browser to clear localStorage, so we
-- version the flag instead: every ballot page reads `votes.reset_epoch`
-- and tags its localStorage key with that integer
-- (`esabcc-vote-submitted:<voteId>:<epoch>`). When the admin bumps the
-- epoch on the server, every existing browser flag is silently orphaned
-- and the page treats the participant as a fresh voter.
--
-- Idempotent.

alter table public.votes
  add column if not exists reset_epoch int not null default 0;
