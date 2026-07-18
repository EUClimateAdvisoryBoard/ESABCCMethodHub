-- ---------------------------------------------------------------------------
-- 076 · Harden RLS on the `reference-pdfs` storage bucket.
--
-- Migration 060 provisioned `reference-pdfs` with fully permissive policies —
-- public (anon) select, insert, update AND delete on `storage.objects` for
-- the bucket. Public *read* is intentional: PDFs are served same-origin via
-- the `api/references/pdf` proxy and via direct public links. But anonymous
-- write/update/delete means anyone who can reach the Supabase URL — or, as
-- confirmed while investigating this migration, anyone who lands on the
-- `/references` page without ever signing in and clicks into an existing
-- reference — can overwrite or permanently delete the Secretariat's stored
-- PDFs. That's a real finding, not a hypothetical: the client SDK path
-- (`src/lib/references/pdf-storage.ts`, used from `src/app/references/
-- page.tsx` and `src/components/workspace/ContentAnalysisModule.tsx`) talks
-- directly to this bucket with the browser's anon/authenticated key, and RLS
-- is the only thing standing between a visitor and a write.
--
-- All *writers* that matter for legitimate use are behind sign-in:
--   - Reference Manager "+ Add Reference" (both Supabase-library mode and the
--     static-library fallback mode) gates on `useAuth().requireAuth(...)`
--     before the upload form ever opens.
--   - The Content Analysis workspace module can only be reached inside a
--     project workspace, and every `pw_*` table already requires
--     `to authenticated` — so its `uploadPdf()` call
--     (`ContentAnalysisModule.tsx`) never runs unauthenticated either.
--   - Server-side writers (`scripts/fetch-reference-pdfs.mjs` via the
--     `fetch-reference-pdfs` GitHub Action, and `putDurablePdf()` in
--     `src/lib/content-analysis/pdf-durable-cache.ts`) use the Supabase
--     SERVICE ROLE key when it's configured, which bypasses RLS entirely and
--     is therefore unaffected by this change either way.
--
-- This migration keeps public read as-is and restricts insert / update /
-- delete on the bucket to the `authenticated` role, closing the anonymous
-- overwrite/delete hole while leaving every signed-in-gated upload path
-- working exactly as before. It is idempotent (drop-by-name then recreate),
-- so it runs cleanly whether 060's original permissive policies are still in
-- place or have already been superseded.
--
-- Residual risk (flagged, not fixed here — SQL-only change per this
-- migration's scope):
--   - `src/app/references/page.tsx`: the fallback-mode "Edit" action on an
--     *existing* reference (`openFallbackRef`, wired to `ReferenceList`'s
--     `onEditReference`, and the `?ref=<id>` deep-link handler) opens the
--     PDF upload/remove controls WITHOUT calling `requireAuth` first — unlike
--     the "+ Add Reference" button, which does. Before this migration that
--     meant an anonymous visitor could silently replace/delete a reference's
--     PDF; after this migration the same click now fails closed with a
--     visible "Storage upload failed" / "Delete failed" RLS error instead of
--     succeeding. That's the correct security outcome, but the entry point
--     itself should still be gated behind `requireAuth` for a clean sign-in
--     prompt instead of a dead-end error — a follow-up client-code fix, not
--     performed here.
--   - `scripts/fetch-reference-pdfs.mjs` falls back to
--     `NEXT_PUBLIC_SUPABASE_ANON_KEY` for its direct REST upload when
--     `SUPABASE_SERVICE_ROLE_KEY` isn't set in the environment / repo
--     secrets. If the `fetch-reference-pdfs` GitHub Action's repo doesn't
--     have `SUPABASE_SERVICE_ROLE_KEY` configured, this migration will make
--     its Supabase uploads start failing (the script degrades gracefully —
--     per-reference failures are reported, not a hard crash — but PDF
--     auto-attachment silently stops landing in Supabase). Confirm that
--     secret is configured wherever this workflow runs.
-- ---------------------------------------------------------------------------

-- Public read stays exactly as migration 060 left it — re-asserted here only
-- so this migration is a complete, self-contained statement of the bucket's
-- intended policy set.
drop policy if exists "Reference PDFs bucket public read" on storage.objects;
create policy "Reference PDFs bucket public read"
  on storage.objects for select
  using (bucket_id = 'reference-pdfs');

-- Drop the permissive anon write / update / delete policies from 060.
drop policy if exists "Reference PDFs bucket public write" on storage.objects;
drop policy if exists "Reference PDFs bucket public update" on storage.objects;
drop policy if exists "Reference PDFs bucket public delete" on storage.objects;

-- Recreate write / update / delete restricted to signed-in users only.
drop policy if exists "Reference PDFs bucket authenticated write" on storage.objects;
create policy "Reference PDFs bucket authenticated write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'reference-pdfs');

drop policy if exists "Reference PDFs bucket authenticated update" on storage.objects;
create policy "Reference PDFs bucket authenticated update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'reference-pdfs')
  with check (bucket_id = 'reference-pdfs');

drop policy if exists "Reference PDFs bucket authenticated delete" on storage.objects;
create policy "Reference PDFs bucket authenticated delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'reference-pdfs');
