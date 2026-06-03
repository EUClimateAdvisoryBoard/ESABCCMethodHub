-- ─────────────────────────────────────────────────────────────────────────────
-- Durable store for whole-document content-analysis summaries.
--
-- A summary is a free-text "comment for the entire paper" — attached to a
-- document as a whole rather than pinned to a passage (that's what
-- `content_analysis_segments.note` is for). It applies to every kind of
-- document the workbench handles: EU policies, grey literature and scientific
-- literature alike.
--
-- Scoped by `(document_id, project_id)` so the Industry Project and Policy
-- Gap 2.0 reports can each keep their own summary of the same paper. The id is
-- deterministic (`summary-<project|master>-<document>`) so re-saving updates
-- the row in place instead of accumulating duplicates.
--
-- Mirrors the `content_analysis_segments` access model: public read, writes go
-- through the service role in the API route.
--
-- Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_summaries (
  id             text primary key,
  document_id    text not null,
  project_id     text,
  text           text not null default '',
  author_id      uuid references auth.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_ca_summaries_document on public.content_analysis_summaries (document_id);
create index if not exists idx_ca_summaries_project  on public.content_analysis_summaries (project_id);

alter table public.content_analysis_summaries enable row level security;

drop policy if exists "Content analysis summaries are viewable by everyone" on public.content_analysis_summaries;
create policy "Content analysis summaries are viewable by everyone"
  on public.content_analysis_summaries for select using (true);
