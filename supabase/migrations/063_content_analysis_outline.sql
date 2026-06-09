-- ─────────────────────────────────────────────────────────────────────────────
-- Durable, shared per-workspace report outline.
--
-- The report outline (the section skeleton each project maps its codes onto)
-- lived only in the editing browser's localStorage (`ca:report-outline:<id>`),
-- so collaborators on the same project saw different outlines and edits were
-- never synced. This table holds one outline per project workspace as a JSON
-- blob so every collaborator shares the same structure.
--
-- Mirrors the content_analysis_documents / _corpus access model: public read,
-- writes go through the service role in the API route. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_outlines (
  project_id   text primary key,
  outline      jsonb not null,
  updated_at   timestamptz not null default now()
);

alter table public.content_analysis_outlines enable row level security;

drop policy if exists "Content analysis outlines are viewable by everyone" on public.content_analysis_outlines;
create policy "Content analysis outlines are viewable by everyone"
  on public.content_analysis_outlines for select using (true);
