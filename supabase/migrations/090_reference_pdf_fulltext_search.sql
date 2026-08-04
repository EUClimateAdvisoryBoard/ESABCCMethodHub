-- Migration 090: Add PDF full-text search to references
-- Adds a pdf_full_text column for extracted PDF content and a
-- generated tsvector column (fts) that combines title, abstract,
-- notes, and PDF text for full-text search.
--
-- Authored as 038 while PR #77 was open; renumbered on merge because
-- 038_project_workspace.sql already occupies that slot on main.
--
-- Step 2 replaces the fts column that 001_reference_manager_tables.sql
-- created (title A, abstract B, container_title C, notes D). The rebuilt
-- column is a superset — every one of those fields is still indexed, with
-- pdf_full_text inserted at C and container_title moved down to D — so the
-- rebuild adds PDF text to the index without dropping anything from it.

-- 1. Add column for extracted PDF text
alter table public.references
  add column if not exists pdf_full_text text;

-- 2. Drop the old fts column if it exists (it may have been generated
--    from fewer fields) so we can recreate it with pdf_full_text included.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'references'
      and column_name = 'fts'
  ) then
    alter table public.references drop column fts;
  end if;
end $$;

-- 3. Create a generated tsvector column combining all searchable text fields.
--    Weights: title (A), abstract (B), pdf_full_text (C), notes/container (D).
alter table public.references
  add column fts tsvector generated always as (
    setweight(to_tsvector('english', coalesce(title, '')), 'A') ||
    setweight(to_tsvector('english', coalesce(abstract, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(pdf_full_text, '')), 'C') ||
    setweight(to_tsvector('english', coalesce(notes, '')), 'D') ||
    setweight(to_tsvector('english', coalesce(container_title, '')), 'D')
  ) stored;

-- 4. GIN index on the tsvector for fast full-text queries.
create index if not exists idx_references_fts
  on public.references using gin (fts);

-- 5. Index on pdf_full_text being non-null so we can quickly find
--    references that still need text extraction (backfill query).
create index if not exists idx_references_pdf_needs_extraction
  on public.references (id)
  where pdf_url is not null and pdf_full_text is null;
