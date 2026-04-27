-- ============================================================================
-- 017 — Content analysis: coded segments + AI code suggestions
--
-- Persistent backend for the content analysis workbench
-- (/content-analysis). Writes happen server-side through
-- /api/content-analysis/segments and /api/content-analysis/suggestions
-- using the SERVICE ROLE key, so reads are public (the workbench renders
-- for the whole team) but clients can't write directly.
-- ============================================================================

create table if not exists public.content_analysis_segments (
  id             text primary key,
  document_id    text not null,
  code_id        text not null,
  block_id       text,
  start_char     integer not null,
  end_char       integer not null,
  text           text not null default '',
  note           text not null default '',
  project_id     text,
  author_id      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_ca_segments_document on public.content_analysis_segments (document_id);
create index if not exists idx_ca_segments_code     on public.content_analysis_segments (code_id);
create index if not exists idx_ca_segments_project  on public.content_analysis_segments (project_id);
create index if not exists idx_ca_segments_created  on public.content_analysis_segments (created_at desc);

alter table public.content_analysis_segments enable row level security;

drop policy if exists "Coded segments are viewable by everyone" on public.content_analysis_segments;
create policy "Coded segments are viewable by everyone"
  on public.content_analysis_segments for select using (true);

create table if not exists public.content_analysis_suggestions (
  id             text primary key,
  document_id    text not null,
  code_id        text not null,
  block_id       text,
  start_char     integer not null,
  end_char       integer not null,
  quote          text not null default '',
  rationale      text not null default '',
  confidence     double precision not null default 0,
  model          text,
  created_at     timestamptz not null default now()
);

create index if not exists idx_ca_suggestions_document on public.content_analysis_suggestions (document_id);
create index if not exists idx_ca_suggestions_created  on public.content_analysis_suggestions (created_at desc);

alter table public.content_analysis_suggestions enable row level security;

drop policy if exists "Code suggestions are viewable by everyone" on public.content_analysis_suggestions;
create policy "Code suggestions are viewable by everyone"
  on public.content_analysis_suggestions for select using (true);
