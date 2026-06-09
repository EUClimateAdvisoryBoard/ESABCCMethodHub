-- ---------------------------------------------------------------------------
-- Overall (document-level) tags for the Content Analysis workbench.
--
-- The workbench distinguishes two tag categories:
--   • in-text tags  — codes pinned to a passage (content_analysis_segments),
--   • overall tags  — codes that describe the WHOLE document (the coloured dots
--     on each corpus card).
--
-- Policy documents ship an AI-assigned overall-tag baseline in code
-- (policy-master-tags.ts). Scientific & grey literature, which arrive live from
-- the reference manager, are tagged by hand instead — and those manual tags
-- must be visible to EVERY user, in both the workbench and the reference
-- library. This table is that shared, global store.
--
-- Like content_analysis_master_tag_status (050), it is intentionally NOT
-- project-scoped: an overall tag is a property of the document itself, so it is
-- the same everywhere the document is rendered. A row's existence means "this
-- document carries this overall tag"; removing the tag deletes the row.
--
-- `document_id` is the workbench document id — `ref-doc-<referenceId>` for a
-- reference, or the policy id for a policy. `code_id` is a master-code id from
-- the seeded taxonomy (see seed.ts / master-code-catalog.ts).
-- ---------------------------------------------------------------------------

create table if not exists public.content_analysis_overall_tags (
  document_id  text        not null,
  code_id      text        not null,
  created_by   uuid        references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  primary key (document_id, code_id)
);

create index if not exists ca_overall_tags_document_idx
  on public.content_analysis_overall_tags(document_id);

alter table public.content_analysis_overall_tags enable row level security;

drop policy if exists "ca_overall_tags read"   on public.content_analysis_overall_tags;
drop policy if exists "ca_overall_tags insert" on public.content_analysis_overall_tags;
drop policy if exists "ca_overall_tags delete" on public.content_analysis_overall_tags;

-- Public read: the coloured dots are visible to everyone browsing the
-- workbench corpus and the reference library.
create policy "ca_overall_tags read"
  on public.content_analysis_overall_tags for select using (true);
-- Only signed-in users can add / remove overall tags.
create policy "ca_overall_tags insert"
  on public.content_analysis_overall_tags for insert to authenticated with check (auth.uid() is not null);
create policy "ca_overall_tags delete"
  on public.content_analysis_overall_tags for delete to authenticated using (true);
