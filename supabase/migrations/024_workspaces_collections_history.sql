-- 024_workspaces_collections_history.sql
--
-- Schema for several brainstorm features:
--   #3  team workspaces (shared research projects)
--   #13 personal cross-module collections
--   #20 change-history timeline on editable artefacts
--   #17 polymorphic inline annotations on any text view
--
-- All RLS-locked: every row references either auth.uid() (personal)
-- or a workspace membership row.
--
-- Idempotent: safe to re-run.

create extension if not exists "pgcrypto";

-- ─── #3 Team Workspaces ─────────────────────────────────────────────────────

create table if not exists public.workspaces (
  id          uuid        primary key default gen_random_uuid(),
  owner_id    uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  description text        not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.workspace_members (
  workspace_id uuid       not null references public.workspaces(id) on delete cascade,
  user_id      uuid       not null references auth.users(id) on delete cascade,
  -- 'owner' | 'editor' | 'viewer'
  role         text       not null default 'editor',
  added_at     timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create table if not exists public.workspace_items (
  id           uuid       primary key default gen_random_uuid(),
  workspace_id uuid       not null references public.workspaces(id) on delete cascade,
  -- 'reference' | 'policy' | 'news' | 'scenario_view' | 'segment'
  kind         text       not null,
  ref_id       text       not null,
  note         text       not null default '',
  added_by     uuid       not null references auth.users(id) on delete cascade,
  added_at     timestamptz not null default now(),
  unique (workspace_id, kind, ref_id)
);

create index if not exists idx_workspace_items_ws on public.workspace_items (workspace_id, added_at desc);

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.workspace_items enable row level security;

-- Members can read; owners can insert/update/delete; new workspaces are
-- created with the creator as their first 'owner' membership row.
drop policy if exists "Workspace member read" on public.workspaces;
create policy "Workspace member read" on public.workspaces for select using (
  id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace owner write" on public.workspaces;
create policy "Workspace owner write" on public.workspaces for all using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "Workspace member listing" on public.workspace_members;
create policy "Workspace member listing" on public.workspace_members for select using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace owner manages members" on public.workspace_members;
create policy "Workspace owner manages members" on public.workspace_members for all using (
  workspace_id in (select id from public.workspaces where owner_id = auth.uid())
) with check (
  workspace_id in (select id from public.workspaces where owner_id = auth.uid())
);

drop policy if exists "Workspace member reads items" on public.workspace_items;
create policy "Workspace member reads items" on public.workspace_items for select using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid())
);
drop policy if exists "Workspace member writes items" on public.workspace_items;
create policy "Workspace member writes items" on public.workspace_items for all using (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid() and role in ('owner','editor'))
) with check (
  workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid() and role in ('owner','editor'))
);

-- ─── #13 Personal Collections ───────────────────────────────────────────────

create table if not exists public.collections (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  name        text        not null,
  emoji       text        not null default '📁',
  sort_order  int         not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists public.collection_items (
  id            uuid        primary key default gen_random_uuid(),
  collection_id uuid        not null references public.collections(id) on delete cascade,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  kind          text        not null,    -- 'reference' | 'policy' | 'news' | 'segment'
  ref_id        text        not null,
  added_at      timestamptz not null default now(),
  unique (collection_id, kind, ref_id)
);

create index if not exists idx_collection_items_user on public.collection_items (user_id, added_at desc);

alter table public.collections enable row level security;
alter table public.collection_items enable row level security;

drop policy if exists "Users own their collections" on public.collections;
create policy "Users own their collections" on public.collections for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "Users own their collection items" on public.collection_items;
create policy "Users own their collection items" on public.collection_items for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- ─── #20 Change-history timeline ────────────────────────────────────────────
-- Polymorphic audit log of artefact edits. `artefact_kind` is one of
-- 'connection' | 'code' | 'annotation' | 'policy_review' (extendable).
-- `before` / `after` are snapshot JSON blobs the application interprets.

create table if not exists public.artefact_history (
  id            uuid        primary key default gen_random_uuid(),
  artefact_kind text        not null,
  artefact_id   text        not null,
  user_id       uuid        references auth.users(id) on delete set null,
  reason        text        not null default '',
  before        jsonb       not null default '{}'::jsonb,
  after         jsonb       not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists idx_artefact_history_target on public.artefact_history (artefact_kind, artefact_id, created_at desc);

alter table public.artefact_history enable row level security;

-- Anyone authenticated can read the history of any artefact (it's audit
-- data); writers are limited to authenticated users so anon CSRF can't
-- pollute the log.
drop policy if exists "Authenticated read history" on public.artefact_history;
create policy "Authenticated read history" on public.artefact_history for select
  using (auth.role() = 'authenticated');
drop policy if exists "Authenticated insert history" on public.artefact_history;
create policy "Authenticated insert history" on public.artefact_history for insert
  with check (auth.role() = 'authenticated' and user_id = auth.uid());

-- ─── #17 Polymorphic inline annotations ─────────────────────────────────────
-- Today annotations only attach to PDFs. This generalised store lets the
-- M·03 news cards and M·04 policy article views emit highlights too.

create table if not exists public.text_annotations (
  id          uuid        primary key default gen_random_uuid(),
  user_id     uuid        not null references auth.users(id) on delete cascade,
  -- Kind of host artefact: 'news' | 'policy_article' | 'reference_abstract'
  host_kind   text        not null,
  host_id     text        not null,
  -- The exact substring the user highlighted, plus a small offset so we
  -- can re-anchor if the host text is reflowed.
  selected    text        not null,
  offset_hint int         not null default 0,
  note        text        not null default '',
  workspace_id uuid       references public.workspaces(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_text_annotations_host on public.text_annotations (host_kind, host_id, created_at desc);
create index if not exists idx_text_annotations_user on public.text_annotations (user_id, created_at desc);

alter table public.text_annotations enable row level security;

-- Personal annotations are private unless attached to a workspace, in
-- which case all members of that workspace can read.
drop policy if exists "Read own or workspace annotations" on public.text_annotations;
create policy "Read own or workspace annotations" on public.text_annotations for select using (
  user_id = auth.uid()
  or (workspace_id is not null
      and workspace_id in (select workspace_id from public.workspace_members where user_id = auth.uid()))
);
drop policy if exists "Insert own annotations" on public.text_annotations;
create policy "Insert own annotations" on public.text_annotations for insert with check (user_id = auth.uid());
drop policy if exists "Update own annotations" on public.text_annotations;
create policy "Update own annotations" on public.text_annotations for update using (user_id = auth.uid());
drop policy if exists "Delete own annotations" on public.text_annotations;
create policy "Delete own annotations" on public.text_annotations for delete using (user_id = auth.uid());
