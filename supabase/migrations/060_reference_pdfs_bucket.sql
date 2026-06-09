-- ---------------------------------------------------------------------------
-- 060 · Provision the `reference-pdfs` storage bucket.
--
-- This bucket has been in use in production for a while (the Reference Manager
-- uploads custom-reference PDFs to it, and the Content Analysis workbench now
-- mirrors ingested PDFs into a `content-analysis/` folder inside it so the PDF
-- annotation pane survives serverless instance recycling). It was originally
-- created by hand in the Supabase dashboard and never captured in a migration,
-- so a fresh / self-hosted environment had no way to reproduce it.
--
-- This migration creates the bucket and its permissive policies idempotently.
-- It is a no-op where the bucket already exists, so it is safe to run against
-- the existing production database.
--
-- Server routes talk to this bucket with the service-role key (which bypasses
-- RLS), so the policies below exist only for the client-side SDK path the
-- Reference Manager uses (anon + authenticated upload / read / delete).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
  values ('reference-pdfs', 'reference-pdfs', true)
  on conflict (id) do nothing;

drop policy if exists "Reference PDFs bucket public read" on storage.objects;
create policy "Reference PDFs bucket public read"
  on storage.objects for select
  using (bucket_id = 'reference-pdfs');

drop policy if exists "Reference PDFs bucket public write" on storage.objects;
create policy "Reference PDFs bucket public write"
  on storage.objects for insert
  with check (bucket_id = 'reference-pdfs');

drop policy if exists "Reference PDFs bucket public update" on storage.objects;
create policy "Reference PDFs bucket public update"
  on storage.objects for update
  using (bucket_id = 'reference-pdfs')
  with check (bucket_id = 'reference-pdfs');

drop policy if exists "Reference PDFs bucket public delete" on storage.objects;
create policy "Reference PDFs bucket public delete"
  on storage.objects for delete
  using (bucket_id = 'reference-pdfs');
