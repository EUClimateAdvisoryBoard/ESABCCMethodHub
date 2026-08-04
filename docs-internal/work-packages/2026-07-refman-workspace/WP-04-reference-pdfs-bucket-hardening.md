# WP-04 — Tighten `reference-pdfs` storage bucket RLS

**Area:** Security hardening (SQL) · **Size:** S · **Depends on:** nothing

## Problem

`supabase/migrations/060_reference_pdfs_bucket.sql` creates the public
`reference-pdfs` storage bucket with **fully permissive anonymous
policies**: public read, write, update AND delete on `storage.objects`
for the bucket. Public read is intentional (PDFs are served same-origin
via the `api/references/pdf` proxy and direct links), but anonymous
write/update/delete means anyone who can reach the Supabase URL can
overwrite or delete the Secretariat's stored PDFs.

## Tasks

1. Read `supabase/migrations/060_reference_pdfs_bucket.sql` and
   `src/lib/references/pdf-storage.ts` first. Confirm where uploads
   happen from: if all upload/delete call sites run in the browser
   behind the app's sign-in (`useAuth`), an `authenticated`-role policy
   is safe. Also grep for any server-side writers (service role bypasses
   RLS, so they are unaffected either way). Check whether the
   Content Analysis module's `uploadPdf` usage
   (`src/components/workspace/ContentAnalysisModule.tsx`) runs with a
   signed-in session.
2. Write a new migration (next free number, currently `076_…`, but
   re-check the directory and pick the highest+1; name it
   `reference_pdfs_bucket_hardening.sql`):
   - keep the public **read** policy as-is;
   - drop the public write / update / delete policies;
   - recreate write / update / delete `to authenticated`;
   - idempotent style per repo convention (`drop policy if exists` +
     `create policy`).
3. Add a short comment block in the migration explaining the change and
   the finding (anonymous overwrite/delete of staff PDFs), matching the
   narrative comment style of the existing migrations.
4. If step 1 reveals an anonymous upload path that would break (e.g. an
   unauthenticated add-in flow writing directly to storage), do NOT
   ship a breaking policy — instead write the migration to the safest
   level that doesn't break the flow, and clearly flag the residual
   risk at the top of your final report.

## File ownership (do not touch files outside this list)

- `supabase/migrations/<next>_reference_pdfs_bucket_hardening.sql` (new)

Read-only access to everything else. Do NOT edit application code —
if a client change would be needed, describe it in your report instead.

## Acceptance criteria

- One new idempotent migration; public read preserved; write/update/
  delete restricted to `authenticated` (or the documented safest level
  per step 4).
- The migration runs cleanly on a database that already applied 060
  (policies dropped by name before recreation).
- Report states where uploads happen from and why the chosen policy
  level is safe.

## Constraints

- Do NOT run any git commands — the orchestrator commits.
- SQL only; no application-code edits.
