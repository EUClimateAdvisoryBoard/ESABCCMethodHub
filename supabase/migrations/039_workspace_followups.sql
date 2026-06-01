-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace follow-ups — wires the three open items from M·19:
--   1. Indicator refresh log so live Eurostat / EEA pulls can record their
--      provenance per indicator (success or failure).
--   2. A free-form content store for the "custom" module kind so user-added
--      modules render an editable scratchpad instead of a placeholder.
--   3. Promotion of policy-analysis "Suggested edit" annotations into a
--      canonical override layer that the EU Policy Navigator reads back, so
--      promoting an edit no longer requires editing the SECTOR_POLICIES
--      data file by hand.
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Per-indicator refresh log. One row per attempt; the latest row tells the
--    UI when (and from where) the indicator was last refreshed.
create table if not exists public.pw_indicator_refreshes (
  id            uuid        primary key default gen_random_uuid(),
  indicator_id  text        not null references public.pw_indicators(id) on delete cascade,
  source        text        not null,           -- 'eurostat' | 'eea' | …
  ok            boolean     not null,
  points_added  integer     not null default 0,
  message       text        not null default '',
  refreshed_at  timestamptz not null default now(),
  refreshed_by  uuid        references auth.users(id) on delete set null
);

create index if not exists pw_indicator_refreshes_indicator_idx
  on public.pw_indicator_refreshes(indicator_id, refreshed_at desc);

-- 2. Markdown/plain-text scratchpad for "custom" modules. One row per
--    (project, module) pair; nullable until the user first edits it.
create table if not exists public.pw_custom_module_content (
  project_id    text        not null,
  module_id     text        not null,
  content       text        not null default '',
  updated_by    uuid        references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (project_id, module_id),
  foreign key (project_id, module_id)
    references public.pw_modules(project_id, id) on delete cascade
);

-- 3. Promotion timestamp on annotations. Non-null = the suggested edit has
--    been promoted into the canonical sectoral-policy view, i.e. it overrides
--    the bundled SECTOR_POLICIES text everywhere it is rendered.
alter table public.pw_policy_annotations
  add column if not exists promoted_at timestamptz;

create index if not exists pw_policy_ann_promoted_idx
  on public.pw_policy_annotations(policy_id) where promoted_at is not null;

-- ── RLS ──────────────────────────────────────────────────────────────────────
alter table public.pw_indicator_refreshes    enable row level security;
alter table public.pw_custom_module_content  enable row level security;

do $$
declare
  t text;
  tbls text[] := array['pw_indicator_refreshes','pw_custom_module_content'];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "%s read"   on public.%I', t, t);
    execute format('drop policy if exists "%s insert" on public.%I', t, t);
    execute format('drop policy if exists "%s update" on public.%I', t, t);
    execute format('drop policy if exists "%s delete" on public.%I', t, t);

    execute format(
      'create policy "%s read"   on public.%I for select to authenticated using (true)',
      t, t
    );
    execute format(
      'create policy "%s insert" on public.%I for insert to authenticated with check (auth.uid() is not null)',
      t, t
    );
    execute format(
      'create policy "%s update" on public.%I for update to authenticated using (true) with check (true)',
      t, t
    );
    execute format(
      'create policy "%s delete" on public.%I for delete to authenticated using (true)',
      t, t
    );
  end loop;
end $$;

-- ── updated_at trigger on custom_module_content ──────────────────────────────
drop trigger if exists trg_pw_custom_content_updated_at on public.pw_custom_module_content;
create trigger trg_pw_custom_content_updated_at
  before update on public.pw_custom_module_content
  for each row execute function public.pw_touch_updated_at();
