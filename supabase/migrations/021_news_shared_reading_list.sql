-- 021_news_shared_reading_list.sql
--
-- Server-back the Secretariat News "Shared reading list" + its upvotes.
--
-- Until now both the items and the upvote count lived in localStorage
-- under `nf-shared-reading-list`. That meant:
--
--   • One person adds an item — nobody else ever sees it.
--   • Upvotes are a per-browser tally, so the count is meaningless.
--   • A browser clear / different device wipes everything.
--
-- This migration moves the shared list behind Supabase. The personal
-- reading list (`nf-reading-list`) stays in localStorage — it is per-
-- user-per-browser by design and not subject to the same loss class.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

create table if not exists public.shared_reading_list_items (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null,
  authors       text        not null default '',
  url           text        not null default '',
  doi           text        default '',
  kind          text        not null default 'paper'
                  check (kind in ('paper','report','book','article','news','other')),
  priority      text        not null default 'important'
                  check (priority in ('must-read','important','nice-to-have')),
  notes         text        not null default '',
  source_type   text        default '',
  reference_id  text        default '',
  added_by      uuid        references auth.users(id) on delete set null,
  added_by_name text        not null default 'Anonymous',
  added_at      timestamptz not null default now()
);

create index if not exists idx_shared_reading_list_added_at
  on public.shared_reading_list_items (added_at desc);

alter table public.shared_reading_list_items enable row level security;

drop policy if exists "Shared reading list readable by authenticated"
  on public.shared_reading_list_items;
create policy "Shared reading list readable by authenticated"
  on public.shared_reading_list_items for select using (auth.uid() is not null);

drop policy if exists "Authenticated users can add to shared reading list"
  on public.shared_reading_list_items;
create policy "Authenticated users can add to shared reading list"
  on public.shared_reading_list_items for insert
  with check (auth.uid() is not null and (added_by is null or added_by = auth.uid()));

-- Anyone signed in can edit the metadata (notes / priority); the
-- adder column does NOT change. This mirrors the editorial-shared-table
-- semantics already used by `connection_overrides`.
drop policy if exists "Authenticated users can update shared reading list"
  on public.shared_reading_list_items;
create policy "Authenticated users can update shared reading list"
  on public.shared_reading_list_items for update using (auth.uid() is not null);

drop policy if exists "Adder or admin can delete shared reading list items"
  on public.shared_reading_list_items;
create policy "Adder or admin can delete shared reading list items"
  on public.shared_reading_list_items for delete using (
    added_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- ── upvotes ─────────────────────────────────────────────────────────────────
-- One row per (item, user) pair. Existence-of-row encodes the upvote;
-- counting is a simple GROUP BY at read time. No "downvotes" — the UI
-- is a binary toggle.
create table if not exists public.shared_reading_list_upvotes (
  item_id    uuid        not null references public.shared_reading_list_items(id) on delete cascade,
  user_id    uuid        not null references auth.users(id) on delete cascade,
  voted_at   timestamptz not null default now(),
  primary key (item_id, user_id)
);

create index if not exists idx_shared_reading_list_upvotes_item
  on public.shared_reading_list_upvotes (item_id);

alter table public.shared_reading_list_upvotes enable row level security;

drop policy if exists "Upvotes readable by authenticated"
  on public.shared_reading_list_upvotes;
create policy "Upvotes readable by authenticated"
  on public.shared_reading_list_upvotes for select using (auth.uid() is not null);

drop policy if exists "Users can manage their own upvotes"
  on public.shared_reading_list_upvotes;
create policy "Users can manage their own upvotes"
  on public.shared_reading_list_upvotes for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can remove their own upvotes"
  on public.shared_reading_list_upvotes;
create policy "Users can remove their own upvotes"
  on public.shared_reading_list_upvotes for delete using (auth.uid() = user_id);
