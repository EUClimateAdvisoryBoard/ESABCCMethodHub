-- 018_custom_references_store.sql
--
-- Replace the GitHub-Contents-API-as-database hack for custom references.
--
-- Previously, `src/lib/references/custom-store.ts` PUT a JSON blob to
-- `public/data/custom-references.json` in the source repo via the GitHub
-- Contents API using `REFS_GITHUB_TOKEN`. That meant user-entered
-- reference metadata (titles, DOIs, authors, source tags) was replicated
-- into GitHub on every add — a GDPR / EU-sovereignty problem the hosting
-- architecture diagram couldn't account for.
--
-- This migration introduces a proper `custom_references` table. The app
-- layer writes here directly; the GitHub path is retired.
--
-- Idempotent: safe to run on an already-upgraded database.

create table if not exists public.custom_references (
  id            text primary key,
  doi           text        default '',
  title         text        not null,
  authors       text        default '',
  year          text        default '',
  journal       text        default '',
  type          text        default '',
  volume        text        default '',
  issue         text        default '',
  pages         text        default '',
  url           text        default '',
  full_citation text        default '',
  source        text        not null default 'web',    -- 'web' | 'vba'
  pdf_url       text        default '',                 -- Supabase Storage / S3 public URL
  added_by      uuid        references auth.users(id) on delete set null,
  added_at      timestamptz not null default now()
);

create index if not exists idx_custom_references_doi
  on public.custom_references (doi) where doi <> '';
create index if not exists idx_custom_references_added_at
  on public.custom_references (added_at desc);

alter table public.custom_references enable row level security;

-- Authenticated staff can read the full library.
drop policy if exists "Custom references readable by authenticated" on public.custom_references;
create policy "Custom references readable by authenticated"
  on public.custom_references for select using (auth.uid() is not null);

-- Any authenticated user can add a reference; we record who did it.
drop policy if exists "Authenticated users can insert references" on public.custom_references;
create policy "Authenticated users can insert references"
  on public.custom_references for insert
  with check (auth.uid() is not null and (added_by is null or added_by = auth.uid()));

-- Updates/deletes are gated to the original adder or an admin.
drop policy if exists "Adder or admin can update references" on public.custom_references;
create policy "Adder or admin can update references"
  on public.custom_references for update using (
    added_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

drop policy if exists "Adder or admin can delete references" on public.custom_references;
create policy "Adder or admin can delete references"
  on public.custom_references for delete using (
    added_by = auth.uid()
    or exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
  );

-- Service-role webhook writes (e.g. from the Word VBA "Add reference"
-- bridge) bypass RLS in code; no explicit policy needed.
