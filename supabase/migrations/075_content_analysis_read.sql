-- ─────────────────────────────────────────────────────────────────────────────
-- Reading progress — whether a document has been READ in a project workspace.
--
-- Sits beside reading responsibility (migration 074): where that table records
-- WHO is responsible for a document, this one records WHETHER it has been read.
-- The two are independent — a reader can mark a document read before (or without
-- ever) writing a summary, and the "Done" marker in the UI stays derived from
-- the summary. Keyed by (project_id, document_id) so every collaborator sees the
-- same read/unread state, mirroring the corpus / reading access model (public
-- read, writes go through an authenticated route / the service role).
--
-- A row's mere presence means "read"; clearing the flag deletes the row.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_read (
  project_id   text not null,
  document_id  text not null,
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (project_id, document_id)
);

create index if not exists idx_ca_read_project
  on public.content_analysis_read (project_id);

alter table public.content_analysis_read enable row level security;

drop policy if exists "Content analysis read is viewable by everyone" on public.content_analysis_read;
create policy "Content analysis read is viewable by everyone"
  on public.content_analysis_read for select using (true);

drop policy if exists "Authenticated users can mark documents read" on public.content_analysis_read;
create policy "Authenticated users can mark documents read"
  on public.content_analysis_read for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update read state" on public.content_analysis_read;
create policy "Authenticated users can update read state"
  on public.content_analysis_read for update
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can clear read state" on public.content_analysis_read;
create policy "Authenticated users can clear read state"
  on public.content_analysis_read for delete
  using (auth.role() = 'authenticated');
