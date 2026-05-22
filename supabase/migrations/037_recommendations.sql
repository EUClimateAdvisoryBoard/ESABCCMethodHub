-- ── Recommendations module ───────────────────────────────────────────────────
-- Stores Advisory Board recommendations and their links to policies
-- (src/data/policies.ts ids) and Policy Gap indicators
-- (src/lib/scenarios/policy-gap.ts ids, e.g. 'o1-total-ghg').

create table if not exists public.recommendations (
  id                   uuid        primary key default gen_random_uuid(),
  report_title         text        not null,
  recommendation_number text       not null,
  year                 integer     not null,
  short_text           text        not null,
  full_text            text,
  justification        text,
  assessment           text,
  category             text,
  status               text        not null default 'not-implemented'
                                   check (status in (
                                     'not-implemented',
                                     'partially-implemented',
                                     'implemented',
                                     'ongoing'
                                   )),
  created_by           uuid        references auth.users(id) on delete set null,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

create table if not exists public.recommendation_policy_links (
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  policy_id         text not null,
  primary key (recommendation_id, policy_id)
);

create table if not exists public.recommendation_indicator_links (
  recommendation_id uuid not null references public.recommendations(id) on delete cascade,
  indicator_id      text not null,
  primary key (recommendation_id, indicator_id)
);

-- ── updated_at trigger ───────────────────────────────────────────────────────

create or replace function public.recommendations_touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

drop trigger if exists trg_recommendations_updated_at on public.recommendations;
create trigger trg_recommendations_updated_at
  before update on public.recommendations
  for each row execute function public.recommendations_touch_updated_at();

-- ── Row-level security ───────────────────────────────────────────────────────
-- Any authenticated user can read and write — the site is already private
-- and recommendations are a collaborative team resource.

alter table public.recommendations enable row level security;
alter table public.recommendation_policy_links enable row level security;
alter table public.recommendation_indicator_links enable row level security;

-- recommendations
create policy "Authenticated users can read recommendations"
  on public.recommendations for select to authenticated using (true);

create policy "Authenticated users can insert recommendations"
  on public.recommendations for insert to authenticated
  with check (auth.uid() is not null);

create policy "Authenticated users can update recommendations"
  on public.recommendations for update to authenticated
  using (true) with check (true);

create policy "Authenticated users can delete recommendations"
  on public.recommendations for delete to authenticated using (true);

-- policy links
create policy "Authenticated users can read policy links"
  on public.recommendation_policy_links for select to authenticated using (true);

create policy "Authenticated users can insert policy links"
  on public.recommendation_policy_links for insert to authenticated
  with check (true);

create policy "Authenticated users can delete policy links"
  on public.recommendation_policy_links for delete to authenticated using (true);

-- indicator links
create policy "Authenticated users can read indicator links"
  on public.recommendation_indicator_links for select to authenticated using (true);

create policy "Authenticated users can insert indicator links"
  on public.recommendation_indicator_links for insert to authenticated
  with check (true);

create policy "Authenticated users can delete indicator links"
  on public.recommendation_indicator_links for delete to authenticated using (true);
