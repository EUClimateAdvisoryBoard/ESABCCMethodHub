-- ─────────────────────────────────────────────────────────────────────────────
-- Durable, shared per-workspace document corpus (the "In this workspace" list).
--
-- Until now the set of documents an analyst had *added to a project workspace*
-- lived only in that one browser's localStorage (`ca:ws-corpus:<projectId>`).
-- Coded segments, codes, summaries and the ingested document substrate were all
-- shared via Supabase, but the workspace membership list was not — so a second
-- analyst opening the same project saw a different (or empty) document list and
-- the workspaces appeared "not synced".
--
-- This table records which documents belong to which project workspace, keyed by
-- (project_id, document_id), so every collaborator on a project sees the same
-- corpus. document_id is a policy id or `ref-doc-<refId>` — the same id space the
-- content_analysis_documents / _segments tables use.
--
-- Mirrors the `content_analysis_documents` access model: public read, writes go
-- through the service role in the API route. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_corpus (
  project_id   text not null,
  document_id  text not null,
  added_at     timestamptz not null default now(),
  primary key (project_id, document_id)
);

create index if not exists idx_ca_corpus_project on public.content_analysis_corpus (project_id);

alter table public.content_analysis_corpus enable row level security;

drop policy if exists "Content analysis corpus is viewable by everyone" on public.content_analysis_corpus;
create policy "Content analysis corpus is viewable by everyone"
  on public.content_analysis_corpus for select using (true);
