-- ─────────────────────────────────────────────────────────────────────────────
-- Durable, shared store for ingested content-analysis documents.
--
-- Until now the *extracted* text + block bounding boxes of an ingested PDF
-- lived only in the ingesting user's localStorage. Coded segments, codes and
-- summaries were already shared via Supabase, but the document substrate they
-- anchor to was not — so a second analyst had to re-ingest (re-upload) the same
-- PDF before they could see it fully coded.
--
-- This table holds the ingestion output keyed by the document id (a policy id
-- or `ref-doc-<refId>`), so once anyone ingests a document its text/blocks are
-- available to everyone. The PDF bytes themselves live in Supabase storage
-- (the `reference-pdfs` bucket), so nothing here is heavy except the `blocks`
-- JSON and flat `text`, which are excluded from the bulk list and lazy-loaded
-- per document.
--
-- Mirrors the `content_analysis_summaries` access model: public read, writes go
-- through the service role in the API route. Idempotent.
-- ─────────────────────────────────────────────────────────────────────────────

create table if not exists public.content_analysis_documents (
  id             text primary key,
  title          text,
  celex_number   text,
  page_count     integer,
  ingest_source  text,
  pdf_url        text,
  text           text,
  blocks         jsonb,
  ingested_at    timestamptz,
  updated_at     timestamptz not null default now()
);

create index if not exists idx_ca_documents_updated on public.content_analysis_documents (updated_at);

alter table public.content_analysis_documents enable row level security;

drop policy if exists "Content analysis documents are viewable by everyone" on public.content_analysis_documents;
create policy "Content analysis documents are viewable by everyone"
  on public.content_analysis_documents for select using (true);
