-- ─────────────────────────────────────────────────────────────────────────────
-- Durable, shared store for content-analysis "general notes".
--
-- A general note is a lightweight comment an analyst leaves while reading a
-- document, tied to a passage but WITHOUT applying a tag. It's the "just leave
-- a comment" path that sits alongside full coding:
--   • content_analysis_segments  — a passage pinned to a tag (+ its `note`),
--   • content_analysis_summaries  — one whole-document write-up per project,
--   • content_analysis_notes      — many free-form, passage-anchored comments
--                                   per document (this table).
--
-- A note optionally carries the passage it's about (`quote`) plus a block /
-- char anchor so the workbench can jump back to it. Scoped by
-- `(document_id, project_id)` like summaries, so each project keeps its own
-- notes on the same paper. Unlike summaries there are MANY notes per
-- (document, project), so the id is a client-generated unique key rather than
-- a deterministic one.
--
-- Mirrors the segments / summaries access model: public read, authenticated
-- insert, and authors may delete their own notes. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_notes (
  id           text primary key,
  document_id  text not null,
  project_id   text,
  text         text not null,
  quote        text,
  block_id     text,
  start_char   integer,
  end_char     integer,
  author       text,
  author_id    uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now()
);

create index if not exists idx_ca_notes_document on public.content_analysis_notes (document_id);
create index if not exists idx_ca_notes_project  on public.content_analysis_notes (project_id);

alter table public.content_analysis_notes enable row level security;

drop policy if exists "ca_notes read"   on public.content_analysis_notes;
drop policy if exists "ca_notes insert" on public.content_analysis_notes;
drop policy if exists "ca_notes delete" on public.content_analysis_notes;

-- Public read: notes are shared with the whole team.
create policy "ca_notes read"
  on public.content_analysis_notes for select using (true);
-- Only signed-in users can add a note, and only as themselves.
create policy "ca_notes insert"
  on public.content_analysis_notes for insert to authenticated
  with check (author_id = auth.uid());
-- An author may delete their own notes.
create policy "ca_notes delete"
  on public.content_analysis_notes for delete to authenticated
  using (author_id = auth.uid());
