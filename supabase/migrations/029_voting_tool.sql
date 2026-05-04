-- 029: Voting Tool (M·06) — votes, single-use tokens, ballots.
--
-- Stores polls created by MethodHub users plus the ballots submitted by
-- externals via /vote/<token>. Three tables:
--
--   votes        — config + options (jsonb) for each poll.
--   vote_tokens  — single-use credentials. The raw token IS the credential;
--                  we keep it server-side but RLS denies all client reads.
--   ballots      — submitted responses. In anonymous mode `token_id` is
--                  NULL and only `token_fingerprint` (sha256 of voteId+token)
--                  is stored, so admins cannot link a ballot to a token.
--
-- Authorisation model
-- -------------------
-- Every voting endpoint runs server-side using the service-role key, so it
-- bypasses RLS. We still enable RLS on every table and ship NO permissive
-- policies, which means the anon and authenticated roles cannot reach these
-- rows from the browser. Belt-and-braces against accidental client reads.
--
-- Idempotent.

create table if not exists public.votes (
  id text primary key,
  title text not null,
  description text,
  instructions text,
  voting_system text not null
    check (voting_system in ('priority_ranking','single_choice','multi_choice','approval','star')),
  config jsonb not null default '{}'::jsonb,
  options jsonb not null,
  is_anonymous boolean not null default true,
  status text not null default 'open'
    check (status in ('draft','open','closed')),
  closes_at timestamptz,
  created_by text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.vote_tokens (
  token text primary key,
  vote_id text not null references public.votes(id) on delete cascade,
  label text,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_vote_tokens_vote on public.vote_tokens(vote_id);

create table if not exists public.ballots (
  id text primary key,
  vote_id text not null references public.votes(id) on delete cascade,
  responses jsonb not null,
  -- token_id is NULL in anonymous mode so a ballot cannot be linked to a
  -- specific participant. Non-anonymous votes keep it for admin attribution.
  token_id text references public.vote_tokens(token) on delete set null,
  -- sha256(voteId || ' ' || token). Used to enforce single-use without
  -- revealing which token was redeemed.
  token_fingerprint text not null,
  submitted_at timestamptz not null default now()
);

create index if not exists idx_ballots_vote on public.ballots(vote_id);
create unique index if not exists ux_ballots_vote_fingerprint
  on public.ballots(vote_id, token_fingerprint);

-- updated_at trigger for votes ------------------------------------------------
create or replace function public.touch_votes_updated_at()
returns trigger as $$
begin
  new.updated_at := now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_votes_updated_at on public.votes;
create trigger trg_votes_updated_at
  before update on public.votes
  for each row execute procedure public.touch_votes_updated_at();

-- RLS: lock everything down. Server reaches these tables via the service-role
-- key which bypasses RLS; no other role gets access.
alter table public.votes        enable row level security;
alter table public.vote_tokens  enable row level security;
alter table public.ballots      enable row level security;

-- Drop any policies that may have been created in earlier dev runs, so this
-- migration is safe to re-apply.
do $$
declare r record;
begin
  for r in
    select schemaname, tablename, policyname
      from pg_policies
     where schemaname = 'public'
       and tablename in ('votes','vote_tokens','ballots')
  loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

-- Seed: ABmeeting38 Topical Vote ----------------------------------------------
insert into public.votes (
  id, title, description, instructions, voting_system, config, options,
  is_anonymous, status, created_by
) values (
  'abmeeting38-topical-vote',
  'ABmeeting38 Topical Vote',
  'Help the Secretariat shortlist topics for further discussion at AB meeting 38. Your responses are anonymous; only aggregate results are shared with the Secretariat.',
  E'Assign a priority score to each topic:\n\n  1 = highest priority   (give to a maximum of three topics)\n  2 = medium priority    (give to a maximum of three topics)\n  3 = lowest priority    (give to all the rest)\n\nEvery topic must receive a score before you submit. You can change your mind freely until you press Submit; once submitted, the ballot is final and the link cannot be reused.',
  'priority_ranking',
  '{"scores":[1,2,3],"maxPerScore":{"1":3,"2":3,"3":null},"scoreLabels":{"1":"highest priority","2":"medium priority","3":"lowest priority"},"requireAllScored":true}'::jsonb,
  '[
    {"id":"policy-gap-report-2-0","label":"Policy gap report 2.0"},
    {"id":"industry-transitions","label":"Industry transitions"},
    {"id":"climate-diplomacy-and-international-credits","label":"Climate diplomacy and international credits"},
    {"id":"limits-to-adaptation","label":"Limits to adaptation"},
    {"id":"climate-security","label":"Climate security"},
    {"id":"land-sink-and-biomass","label":"Land sink and biomass"},
    {"id":"ets-review","label":"ETS review"},
    {"id":"overshoot-in-eu-policy","label":"Overshoot in EU policy"},
    {"id":"energy-and-security","label":"Energy and security"},
    {"id":"post-2030-flexibilities","label":"Post 2030 flexibilities"},
    {"id":"mis-and-disinformation","label":"Mis and disinformation"},
    {"id":"solar-radiation-management","label":"Solar radiation management"}
  ]'::jsonb,
  true,
  'open',
  'secretariat'
) on conflict (id) do nothing;
