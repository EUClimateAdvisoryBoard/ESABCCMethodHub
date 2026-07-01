-- ─────────────────────────────────────────────────────────────────────────────
-- Reading responsibility — who is reading which document in a project workspace.
--
-- The Content Analysis workbench gains a "Reading responsibility" view next to
-- the Chapter view: the same shared corpus (content_analysis_corpus), grouped by
-- the person responsible for reading each document. This table stores that
-- assignment, keyed by (project_id, document_id) so every collaborator sees the
-- same reader — mirroring the corpus/overall-tags access model (public read,
-- writes go through an authenticated route / the service role).
--
-- A single responsible reader per document per project. `reader` is a free-text
-- display name (matched against team profiles in the UI, but not constrained to
-- them — the seeded scoping-phase list uses first names). An empty/removed
-- assignment is represented by deleting the row.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_reading (
  project_id   text not null,
  document_id  text not null,
  reader       text not null default '',
  updated_by   uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now(),
  primary key (project_id, document_id)
);

create index if not exists idx_ca_reading_project
  on public.content_analysis_reading (project_id);

alter table public.content_analysis_reading enable row level security;

drop policy if exists "Content analysis reading is viewable by everyone" on public.content_analysis_reading;
create policy "Content analysis reading is viewable by everyone"
  on public.content_analysis_reading for select using (true);

drop policy if exists "Authenticated users can assign readers" on public.content_analysis_reading;
create policy "Authenticated users can assign readers"
  on public.content_analysis_reading for insert
  with check (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can update readers" on public.content_analysis_reading;
create policy "Authenticated users can update readers"
  on public.content_analysis_reading for update
  using (auth.role() = 'authenticated');

drop policy if exists "Authenticated users can clear readers" on public.content_analysis_reading;
create policy "Authenticated users can clear readers"
  on public.content_analysis_reading for delete
  using (auth.role() = 'authenticated');
