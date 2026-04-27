-- ============================================================================
-- 026 — Universal policy id on Policy Clock events
--
-- Adds a `policy_id` column to `public.policy_clock_events` so a user-added
-- timeline event can be linked back to a tracked policy. The id matches
-- `Policy.id` in `src/data/policies.ts` (e.g. 'eu-climate-law', 'cbam-regulation')
-- and is the same identifier used by the Policy Navigator, the Content
-- Analysis module, and the synthetic policy citations in the Reference
-- Manager. This is what makes a Policy Clock event clickable through to
-- every other module that shares the same policy corpus.
--
-- The column is nullable because not every event is policy-specific
-- (general Council agenda items, Commission communications, etc.).
-- ============================================================================

alter table public.policy_clock_events
  add column if not exists policy_id text;

create index if not exists idx_policy_clock_events_policy_id
  on public.policy_clock_events (policy_id)
  where policy_id is not null;
