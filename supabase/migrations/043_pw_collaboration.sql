-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace collaboration layer.
--
-- Gives every workspace module the same no-code collaboration primitives,
-- all persisted in Postgres (nothing lives only in the browser):
--
--   1. pw_comments       — threaded discussion attached to ANY workspace
--                          target (indicator, recommendation, member-state
--                          cell, policy, module, project). Supports @mentions
--                          (stored as an array of mentioned user ids) and a
--                          resolved flag so review threads can be closed.
--
--   2. pw_verifications  — one row per (target, user) recording whether that
--                          user has "verified" or "disputed" the target, with
--                          an optional note. The UI rolls these up into a
--                          verified/disputed count + the current user's vote.
--
-- @mention notifications are written into the existing public.notifications
-- table server-side (service role), since that table only allows users to
-- read/update their OWN rows.
--
-- Same authorisation posture as the rest of the workspace (038/039): any
-- authenticated user can read everything and write; deletes on comments are
-- restricted to the author.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_comments (
  id            uuid        primary key default gen_random_uuid(),
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  -- 'indicator' | 'recommendation' | 'member-state-cell' | 'policy' | 'module' | 'project'
  target_kind   text        not null,
  target_id     text        not null,
  parent_id     uuid        references public.pw_comments(id) on delete cascade,
  body          text        not null,
  mentions      uuid[]      not null default '{}',
  resolved      boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  author_name   text        not null default '',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_comments_target_idx
  on public.pw_comments(project_id, target_kind, target_id, created_at);

create table if not exists public.pw_verifications (
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  target_kind   text        not null,
  target_id     text        not null,
  user_id       uuid        not null references auth.users(id) on delete cascade,
  status        text        not null check (status in ('verified','disputed')),
  note          text        not null default '',
  user_name     text        not null default '',
  updated_at    timestamptz not null default now(),
  primary key (project_id, target_kind, target_id, user_id)
);

create index if not exists pw_verifications_target_idx
  on public.pw_verifications(project_id, target_kind, target_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.pw_comments      enable row level security;
alter table public.pw_verifications enable row level security;

-- pw_comments: read/insert/update open to authenticated; delete = author only.
drop policy if exists "pw_comments read"   on public.pw_comments;
drop policy if exists "pw_comments insert" on public.pw_comments;
drop policy if exists "pw_comments update" on public.pw_comments;
drop policy if exists "pw_comments delete" on public.pw_comments;

create policy "pw_comments read"
  on public.pw_comments for select to authenticated using (true);
create policy "pw_comments insert"
  on public.pw_comments for insert to authenticated with check (auth.uid() is not null);
create policy "pw_comments update"
  on public.pw_comments for update to authenticated using (true) with check (true);
create policy "pw_comments delete"
  on public.pw_comments for delete to authenticated using (auth.uid() = created_by);

-- pw_verifications: a user manages only their OWN vote row.
drop policy if exists "pw_verifications read"   on public.pw_verifications;
drop policy if exists "pw_verifications insert" on public.pw_verifications;
drop policy if exists "pw_verifications update" on public.pw_verifications;
drop policy if exists "pw_verifications delete" on public.pw_verifications;

create policy "pw_verifications read"
  on public.pw_verifications for select to authenticated using (true);
create policy "pw_verifications insert"
  on public.pw_verifications for insert to authenticated with check (auth.uid() = user_id);
create policy "pw_verifications update"
  on public.pw_verifications for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "pw_verifications delete"
  on public.pw_verifications for delete to authenticated using (auth.uid() = user_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
drop trigger if exists trg_pw_comments_updated_at on public.pw_comments;
create trigger trg_pw_comments_updated_at
  before update on public.pw_comments
  for each row execute function public.pw_touch_updated_at();

drop trigger if exists trg_pw_verifications_updated_at on public.pw_verifications;
create trigger trg_pw_verifications_updated_at
  before update on public.pw_verifications
  for each row execute function public.pw_touch_updated_at();
