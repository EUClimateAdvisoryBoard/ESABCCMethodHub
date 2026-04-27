-- 019_connection_review_state.sql
--
-- Persist the Policy Navigator "Review & approve connections" workflow.
--
-- Until now, every approve / reject / needs-info decision in the
-- ConnectionsReviewTable was written to `localStorage` only (see the
-- comment block in `src/lib/useConnectionOverrides.ts` that planned a
-- "future iteration" to mirror state to Supabase). That meant a
-- reviewer's work survived only as long as their browser cache —
-- a redeploy, a different device, or an incognito tab and it was gone.
--
-- This migration creates the three tables the hook will sync to:
--
--   • connection_overrides     — per-connection edits to type/description/articles
--   • connection_verifications — per-connection approve/reject/needs-info decision
--   • connection_additions     — user-created connections that don't exist in code
--
-- All three are keyed by the integer connection id used in
-- `src/data/policies.ts`. There is one row per connection (not per
-- reviewer) because the UI displays a single current decision; the
-- reviewer column records who last touched it.
--
-- Idempotent: safe to re-run.

-- ── connection_overrides ─────────────────────────────────────────────────────
create table if not exists public.connection_overrides (
  connection_id    integer     primary key,
  connection_type  text,
  description      text,
  articles_source  text,
  articles_target  text,
  edited_by        uuid        references auth.users(id) on delete set null,
  updated_at       timestamptz not null default now()
);

create index if not exists idx_connection_overrides_updated_at
  on public.connection_overrides (updated_at desc);

alter table public.connection_overrides enable row level security;

drop policy if exists "Connection overrides readable by authenticated"
  on public.connection_overrides;
create policy "Connection overrides readable by authenticated"
  on public.connection_overrides for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can write connection overrides"
  on public.connection_overrides;
create policy "Authenticated users can write connection overrides"
  on public.connection_overrides for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection overrides"
  on public.connection_overrides;
create policy "Authenticated users can update connection overrides"
  on public.connection_overrides for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection overrides"
  on public.connection_overrides;
create policy "Authenticated users can delete connection overrides"
  on public.connection_overrides for delete using (auth.uid() is not null);

-- ── connection_verifications ─────────────────────────────────────────────────
create table if not exists public.connection_verifications (
  connection_id    integer     primary key,
  status           text        not null check (status in ('unverified','verified','rejected','needs_review')),
  reviewer_name    text        not null default '',
  reviewer_user_id uuid        references auth.users(id) on delete set null,
  reviewer_note    text,
  reviewed_at      timestamptz not null default now()
);

create index if not exists idx_connection_verifications_status
  on public.connection_verifications (status);
create index if not exists idx_connection_verifications_reviewed_at
  on public.connection_verifications (reviewed_at desc);

alter table public.connection_verifications enable row level security;

drop policy if exists "Connection verifications readable by authenticated"
  on public.connection_verifications;
create policy "Connection verifications readable by authenticated"
  on public.connection_verifications for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can write connection verifications"
  on public.connection_verifications;
create policy "Authenticated users can write connection verifications"
  on public.connection_verifications for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection verifications"
  on public.connection_verifications;
create policy "Authenticated users can update connection verifications"
  on public.connection_verifications for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection verifications"
  on public.connection_verifications;
create policy "Authenticated users can delete connection verifications"
  on public.connection_verifications for delete using (auth.uid() is not null);

-- ── connection_additions ─────────────────────────────────────────────────────
-- The id sequence starts at 100_000 — well above the max id shipped in
-- src/data/policies.ts (currently ~90) so user-added rows never collide
-- with the base set even after years of new shipped connections.
create sequence if not exists public.connection_additions_id_seq
  start with 100000
  increment by 1
  no cycle;

create table if not exists public.connection_additions (
  id               integer     primary key default nextval('public.connection_additions_id_seq'),
  source_policy_id text        not null,
  target_policy_id text        not null,
  connection_type  text        not null,
  description      text        not null default '',
  articles_source  text,
  articles_target  text,
  added_by         uuid        references auth.users(id) on delete set null,
  added_at         timestamptz not null default now()
);

alter sequence public.connection_additions_id_seq owned by public.connection_additions.id;

create index if not exists idx_connection_additions_added_at
  on public.connection_additions (added_at desc);

alter table public.connection_additions enable row level security;

drop policy if exists "Connection additions readable by authenticated"
  on public.connection_additions;
create policy "Connection additions readable by authenticated"
  on public.connection_additions for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can add connections"
  on public.connection_additions;
create policy "Authenticated users can add connections"
  on public.connection_additions for insert
  with check (auth.uid() is not null);

drop policy if exists "Authenticated users can update connection additions"
  on public.connection_additions;
create policy "Authenticated users can update connection additions"
  on public.connection_additions for update using (auth.uid() is not null);

drop policy if exists "Authenticated users can delete connection additions"
  on public.connection_additions;
create policy "Authenticated users can delete connection additions"
  on public.connection_additions for delete using (auth.uid() is not null);
