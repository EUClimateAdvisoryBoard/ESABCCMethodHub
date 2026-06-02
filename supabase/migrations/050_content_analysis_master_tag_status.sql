-- ---------------------------------------------------------------------------
-- Master-level AI/human status for policy tags.
--
-- The per-policy master-code assignments shipped in
-- src/lib/content-analysis/policy-master-tags.ts are an AI-GENERATED baseline:
-- every (policy, code) pair starts life as an "AI tag". When a human reviews a
-- policy (in the Policy Navigator chips or the workspace Policy-codes panel)
-- and agrees with a suggested tag, they CONFIRM it — promoting that pair to a
-- "human tag". This table is the global ledger of those confirmations.
--
-- It is intentionally NOT project-scoped: the AI-vs-human label is a property
-- of the shared master tag, so a confirmation by any reviewer is visible
-- everywhere the tag is rendered (navigator + every project workspace). The
-- project-scoped pw_policy_codes overlay (040) stays unchanged and continues
-- to handle per-project add/remove of codes.
--
-- A row's mere existence means "human-confirmed". Reverting a confirmation
-- deletes the row, dropping the tag back to its AI baseline.
-- ---------------------------------------------------------------------------

create table if not exists public.content_analysis_master_tag_status (
  policy_id          text        not null,
  code_id            text        not null,
  -- 'human' once a reviewer confirms the AI suggestion. Kept explicit (rather
  -- than implied by row existence) so the column can later carry an 'ai'
  -- override (e.g. a reviewer flagging a tag as machine-only) without a schema
  -- change.
  origin             text        not null default 'human' check (origin in ('ai','human')),
  confirmed_by       uuid        references auth.users(id) on delete set null,
  -- Denormalised display name so the navigator can show "Confirmed by X"
  -- without a join to profiles (which has its own RLS).
  confirmed_by_name  text,
  confirmed_at       timestamptz not null default now(),
  primary key (policy_id, code_id)
);

create index if not exists ca_master_tag_status_policy_idx
  on public.content_analysis_master_tag_status(policy_id);

alter table public.content_analysis_master_tag_status enable row level security;

drop policy if exists "ca_master_tag_status read"   on public.content_analysis_master_tag_status;
drop policy if exists "ca_master_tag_status insert" on public.content_analysis_master_tag_status;
drop policy if exists "ca_master_tag_status update" on public.content_analysis_master_tag_status;
drop policy if exists "ca_master_tag_status delete" on public.content_analysis_master_tag_status;

-- Public read: the AI/human badge is visible to everyone browsing the navigator.
create policy "ca_master_tag_status read"
  on public.content_analysis_master_tag_status for select using (true);
-- Only signed-in users can confirm / revert tags.
create policy "ca_master_tag_status insert"
  on public.content_analysis_master_tag_status for insert to authenticated with check (auth.uid() is not null);
create policy "ca_master_tag_status update"
  on public.content_analysis_master_tag_status for update to authenticated using (true) with check (true);
create policy "ca_master_tag_status delete"
  on public.content_analysis_master_tag_status for delete to authenticated using (true);
