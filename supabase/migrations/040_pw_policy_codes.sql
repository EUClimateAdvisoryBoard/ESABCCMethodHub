-- ---------------------------------------------------------------------------
-- Project-scoped, copy-on-write code assignments per policy.
--
-- The EU Policy Navigator carries a shared "master" code taxonomy
-- (see src/lib/content-analysis/seed.ts and POLICY_MASTER_TAGS). Inside a
-- workspace project, analysts need their own coding overlay for the same
-- policy: they can soft-remove a master code, or add custom (hierarchical)
-- codes — without touching the master set used by the navigator.
--
-- Rows are written lazily: while a project has no rows for a policy, the
-- UI shows the master codes as-is. The first edit forks the master codes
-- into rows (one per master tag, source='master', removed=false), then
-- applies the change. Custom codes are inserted as source='custom' rows
-- with their own label / color / optional parent.
-- ---------------------------------------------------------------------------

create table if not exists public.pw_policy_codes (
  id              uuid        primary key default gen_random_uuid(),
  project_id      text        not null references public.pw_projects(id) on delete cascade,
  policy_id       text        not null,
  -- Stable master code id (e.g. 'code-ets') for source='master',
  -- or a generated id (e.g. 'proj-<uuid>') for source='custom'.
  code_id         text        not null,
  source          text        not null check (source in ('master','custom')),
  -- Only set for source='custom'. May reference a master code id
  -- ('code-pricing') or another project code id ('proj-...').
  parent_code_id  text,
  -- Only meaningful for source='custom' (master codes resolve via catalog).
  label           text        not null default '',
  color           text        not null default '#94A3B8',
  -- Only meaningful for source='master': true = user removed it from the
  -- project copy. Soft delete so it can be restored.
  removed         boolean     not null default false,
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (project_id, policy_id, code_id)
);

create index if not exists pw_policy_codes_project_idx
  on public.pw_policy_codes(project_id);
create index if not exists pw_policy_codes_policy_idx
  on public.pw_policy_codes(project_id, policy_id);

drop trigger if exists trg_pw_policy_codes_updated_at on public.pw_policy_codes;
create trigger trg_pw_policy_codes_updated_at
  before update on public.pw_policy_codes
  for each row execute function public.pw_touch_updated_at();

alter table public.pw_policy_codes enable row level security;

drop policy if exists "pw_policy_codes read"   on public.pw_policy_codes;
drop policy if exists "pw_policy_codes insert" on public.pw_policy_codes;
drop policy if exists "pw_policy_codes update" on public.pw_policy_codes;
drop policy if exists "pw_policy_codes delete" on public.pw_policy_codes;

create policy "pw_policy_codes read"
  on public.pw_policy_codes for select to authenticated using (true);
create policy "pw_policy_codes insert"
  on public.pw_policy_codes for insert to authenticated with check (auth.uid() is not null);
create policy "pw_policy_codes update"
  on public.pw_policy_codes for update to authenticated using (true) with check (true);
create policy "pw_policy_codes delete"
  on public.pw_policy_codes for delete to authenticated using (true);
