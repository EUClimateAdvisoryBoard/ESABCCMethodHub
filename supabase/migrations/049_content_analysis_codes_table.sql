-- ─────────────────────────────────────────────────────────────────────────────
-- Durable store for *user-created* content-analysis codes (tags).
--
-- Master codes are deterministic (seeded from the bundled taxonomy, with stable
-- ids like `root-mitigation` / `code-ets`), so every client resolves them the
-- same way without persistence. Project-scoped codes, however, are created at
-- runtime with random ids — previously they lived only in the author's
-- localStorage, so a coded segment created under a new project tag rendered as
-- an unknown code for everyone else.
--
-- This table persists those runtime codes so the workspace Content Analysis
-- module's lens feature works live: a tag created in one project's context is
-- saved immediately and shows up — resolvable, with name + colour — for every
-- other user (and every other project's lens) on their next sync.
--
-- Mirrors the `content_analysis_segments` access model: public read, writes go
-- through the service role in the API route.
--
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_codes (
  id             text primary key,
  parent_id      text,
  name           text not null,
  description    text not null default '',
  color          text not null default '#00928F',
  scope          text not null default 'project',
  project_id     text,
  author_id      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_ca_codes_project on public.content_analysis_codes (project_id);
create index if not exists idx_ca_codes_parent  on public.content_analysis_codes (parent_id);

alter table public.content_analysis_codes enable row level security;

drop policy if exists "Content analysis codes are viewable by everyone" on public.content_analysis_codes;
create policy "Content analysis codes are viewable by everyone"
  on public.content_analysis_codes for select using (true);
