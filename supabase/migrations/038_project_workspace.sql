-- ─────────────────────────────────────────────────────────────────────────────
-- Project Workspace (M·19) — projects, modules, indicators, recommendations,
-- member-state matrix, sectoral-policy annotations.
--
-- All tables are scoped to a `project_id`. Authenticated users can read and
-- write everything (same posture as 037_recommendations.sql).
--
-- Seed data is inserted at the bottom of this file with `on conflict do nothing`
-- so the migration is idempotent — re-running it will not duplicate rows.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.pw_projects (
  id            text        primary key,
  name          text        not null,
  description   text        not null default '',
  is_seed       boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.pw_modules (
  id            text        not null,
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  kind          text        not null check (kind in (
                              'indicators',
                              'recommendations',
                              'member-states',
                              'policy-analysis',
                              'custom'
                            )),
  name          text        not null,
  description   text        not null default '',
  position      integer     not null default 0,
  is_seed       boolean     not null default false,
  created_at    timestamptz not null default now(),
  primary key (project_id, id)
);

create table if not exists public.pw_indicators (
  id            text        primary key,
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  name          text        not null,
  category      text        not null,
  unit          text        not null,
  description   text        not null default '',
  source        text        not null default '',
  source_url    text        not null default '',
  direction     text        not null default 'down' check (direction in ('up','down')),
  target_value  double precision,
  target_year   integer,
  is_seed       boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_indicators_project_idx on public.pw_indicators(project_id);

create table if not exists public.pw_indicator_points (
  indicator_id  text        not null references public.pw_indicators(id) on delete cascade,
  year          integer     not null,
  value         double precision not null,
  updated_at    timestamptz not null default now(),
  primary key (indicator_id, year)
);

create table if not exists public.pw_recommendations (
  id            text        primary key,
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  area          text        not null default '',
  title         text        not null,
  summary       text        not null default '',
  status        text        not null default 'not-addressed' check (status in (
                              'not-addressed','in-progress','partially','addressed'
                            )),
  is_seed       boolean     not null default false,
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists pw_recommendations_project_idx on public.pw_recommendations(project_id);

create table if not exists public.pw_recommendation_events (
  id              uuid        primary key default gen_random_uuid(),
  recommendation_id text      not null references public.pw_recommendations(id) on delete cascade,
  occurred_at     date        not null,
  note            text        not null,
  source_url      text        not null default '',
  created_by      uuid        references auth.users(id) on delete set null,
  created_at      timestamptz not null default now()
);

create index if not exists pw_rec_events_rec_idx on public.pw_recommendation_events(recommendation_id);

create table if not exists public.pw_member_state_cells (
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  country_code  text        not null,
  sector_id     text        not null,
  status        text        not null default 'empty',
  note          text        not null default '',
  updated_by    uuid        references auth.users(id) on delete set null,
  updated_at    timestamptz not null default now(),
  primary key (project_id, country_code, sector_id)
);

-- Sectoral-overview annotations made from inside the workspace's
-- policy-analysis module. They are read by both the workspace and the
-- EU Policy Navigator's "Sectoral overview" tab so edits propagate.
create table if not exists public.pw_policy_annotations (
  id            uuid        primary key default gen_random_uuid(),
  project_id    text        not null references public.pw_projects(id) on delete cascade,
  policy_id     text        not null,
  -- 'approve' / 'disapprove' / 'fact-check' / 'edit' / 'comment'
  kind          text        not null check (kind in (
                              'approve','disapprove','fact-check','edit','comment'
                            )),
  field         text        not null default '',     -- e.g. 'meaning', 'currentRequirement'
  value         text        not null default '',     -- new text / fact-check verdict / comment body
  status        text        not null default 'open' check (status in ('open','resolved')),
  created_by    uuid        references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index if not exists pw_policy_ann_project_idx on public.pw_policy_annotations(project_id);
create index if not exists pw_policy_ann_policy_idx on public.pw_policy_annotations(policy_id);

-- ── updated_at triggers ──────────────────────────────────────────────────────
create or replace function public.pw_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_pw_projects_updated_at on public.pw_projects;
create trigger trg_pw_projects_updated_at
  before update on public.pw_projects
  for each row execute function public.pw_touch_updated_at();

drop trigger if exists trg_pw_indicators_updated_at on public.pw_indicators;
create trigger trg_pw_indicators_updated_at
  before update on public.pw_indicators
  for each row execute function public.pw_touch_updated_at();

drop trigger if exists trg_pw_recommendations_updated_at on public.pw_recommendations;
create trigger trg_pw_recommendations_updated_at
  before update on public.pw_recommendations
  for each row execute function public.pw_touch_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.pw_projects                enable row level security;
alter table public.pw_modules                 enable row level security;
alter table public.pw_indicators              enable row level security;
alter table public.pw_indicator_points        enable row level security;
alter table public.pw_recommendations         enable row level security;
alter table public.pw_recommendation_events   enable row level security;
alter table public.pw_member_state_cells      enable row level security;
alter table public.pw_policy_annotations      enable row level security;

do $$
declare
  t text;
  tbls text[] := array[
    'pw_projects','pw_modules','pw_indicators','pw_indicator_points',
    'pw_recommendations','pw_recommendation_events','pw_member_state_cells',
    'pw_policy_annotations'
  ];
begin
  foreach t in array tbls loop
    execute format('drop policy if exists "%s read"     on public.%I', t, t);
    execute format('drop policy if exists "%s insert"   on public.%I', t, t);
    execute format('drop policy if exists "%s update"   on public.%I', t, t);
    execute format('drop policy if exists "%s delete"   on public.%I', t, t);

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

-- ── Seed projects + modules ──────────────────────────────────────────────────
insert into public.pw_projects (id, name, description, is_seed) values
  ('policy-gap-2-0',  'Policy Gap 2.0',
     'Successor analysis to the 2024 ESABCC progress report — indicators, recommendation tracking, member-state space and sectoral policy analysis.',
     true),
  ('industry-project','Industry Project',
     'Analytical workspace dedicated to industrial decarbonisation. Modules to be added as the project scope is defined.',
     true)
on conflict (id) do nothing;

insert into public.pw_modules (id, project_id, kind, name, description, position, is_seed) values
  ('indicators',      'policy-gap-2-0', 'indicators',
     'Indicator database',
     'EU-level progress indicators (ECNO framework + custom). Table + chart view, editable in the UI.',
     0, true),
  ('recommendations', 'policy-gap-2-0', 'recommendations',
     'Past recommendations tracker',
     'Recommendations from the 2024 ESABCC progress report, with status and dated uptake events.',
     1, true),
  ('member-states',   'policy-gap-2-0', 'member-states',
     'Member state space',
     'EU-27 × sector matrix — placeholder cells for member-state specific findings (filled in over time).',
     2, true),
  ('policy-analysis', 'policy-gap-2-0', 'policy-analysis',
     'Policy analysis',
     'Sectoral policy review. Mirrors the Sectoral overview in the EU Policy Navigator; edits made here propagate to the navigator.',
     3, true)
on conflict (project_id, id) do nothing;
