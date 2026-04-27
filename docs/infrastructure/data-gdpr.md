# Data & GDPR

## Personal data inventory

| Where it lives                           | What it is                                   | Source                                                    | Status          |
|------------------------------------------|----------------------------------------------|-----------------------------------------------------------|-----------------|
| `profiles` (`email`, `display_name`, `role`) | Authentication identity.                  | Supabase Auth today; OIDC claims at sign-in in the target state. | live            |
| `reference_annots`                       | Annotations on PDFs.                         | User-entered.                                             | live            |
| `policy_annots`                          | Annotations on policy text.                  | User-entered.                                             | live            |
| `ca_annotations`                         | Qualitative codings.                         | User-entered.                                             | live            |
| `admin_audit_log`                        | Admin actions with timestamps.               | Server-side (`src/lib/admin-audit.ts`).                   | live            |
| `ai_call_audit`                          | Latency / status of AI calls (no prompt).    | Server-side.                                              | **target** — retention window defined (`app.ai_audit_retention_days`); table and writes not yet in the schema. |
| Object storage (PDFs)                    | User-uploaded PDFs.                          | Supabase Storage today; S3 / MinIO in the EEA target.     | live (Supabase) |

## Retention

| Data                   | Default window                 | Controlled by                                  |
|------------------------|-------------------------------:|------------------------------------------------|
| Annotations            | until user deletes             | user                                           |
| News articles          | 365 days                       | `app.news_retention_days` GUC                  |
| AI call audit          | 90 days                        | `app.ai_audit_retention_days` GUC              |
| Admin audit            | 3 years                        | `app.admin_audit_retention_days` GUC           |

The purge is driven by the Postgres function
`public.purge_expired_personal_data()` defined in
[`supabase/migrations/012_gdpr_data_retention.sql`](https://github.com/SebastianFra/MethodHub/blob/main/supabase/migrations/012_gdpr_data_retention.sql).
Today it is invoked weekly by `.github/workflows/gdpr-retention.yml`,
which POSTs to `/api/admin/retention` with a shared secret.

**Target state for EEA:** the same SQL function is called on a
schedule that the hosting partner operates — `pg_cron` or a
systemd timer / OpenShift CronJob running against the EEA
Postgres — so no GitHub-side scheduling is required once the
service has moved in-network.

## Right to erasure (Art. 17)

Implemented as a two-step soft-delete in migration `013`
([`013_gdpr_account_deletion.sql`](https://github.com/SebastianFra/MethodHub/blob/main/supabase/migrations/013_gdpr_account_deletion.sql)):

1. The user clicks "Delete account" on `/profile`, which POSTs to
   `/api/user/delete-request`. This marks the account for
   deletion 30 days out; the user can cancel during that window.
2. A scheduled call to `public.process_pending_deletions()`
   cascades through every owned row (`added_by`, `created_by`),
   deletes owned content, and anonymises display fields on
   collaborative rows — so an erased user's annotations are
   preserved as "anonymous", their identity is not.

Trigger paths:

- User-initiated: `/profile` → "Delete account" button → POST
  `/api/user/delete-request`.
- DPO-initiated: direct call to
  `public.process_pending_deletions()`, audited via
  `admin_audit_log`.

(Older docs referenced a single `public.erase_user()` function;
the actual implementation is the two-step flow above.)

## RLS summary

- Every table that holds user-entered state has RLS enabled.
- Policies are keyed to `auth.uid() = added_by` or to explicit
  library / workspace membership tables.
- Service-role callers (the app container using
  `SUPABASE_SERVICE_ROLE_KEY`) bypass RLS — the app container is
  expected to do its own user-scoping, verified by the RLS policies
  when the caller is end-user JWT instead.

Full policy listings are in `supabase/migrations/*_rls.sql`.
