# Content analysis: persistence guarantees, backups, and Postgres migration readiness

Audience: the team running the content-analysis workbench, plus whoever
operates the eventual EEA-hosted Postgres. Last reviewed: 2026-06-09.

## What is guaranteed not to be lost

Every user contribution in the workbench is written to a durable Supabase
table, and every write path either confirms the write or keeps retrying it
from a localStorage-persisted queue (the **outbox**, `src/lib/content-analysis/outbox.ts`):

| Contribution | Table | Write path |
|---|---|---|
| In-text tags (coded segments) + their comments | `content_analysis_segments` | outbox |
| Per-item summaries (incl. slide decks/screenshots) | `content_analysis_summaries` | outbox |
| General notes (passage comments without a tag) | `content_analysis_notes` | direct fetch, falls back to outbox on any failure |
| Overall tags on items (incl. custom tags) | `content_analysis_overall_tags` | direct fetch, falls back to outbox on any failure |
| The tag/code system | `content_analysis_codes` | outbox |
| Additions to a workspace (corpus membership + metadata) | `content_analysis_corpus` (sentinel-row fallback in `content_analysis_segments` while migration 062 is missing) | outbox |
| Ingested documents (text, blocks, PDFs) | `content_analysis_documents` | ingest API |

Outbox semantics (this is the durability contract):

- Every queued write survives reloads and crashes (persisted in
  `localStorage` under `esabcc_ca_outbox_v1`).
- Retries happen on enqueue, every 20 s, on tab focus, and on reconnect,
  until the server returns 2xx (or 404 on a DELETE — already gone).
- Ordering is FIFO **per resource class** (segments, summaries, notes, …),
  so one wedged endpoint (e.g. a table whose migration hasn't been applied)
  can no longer stall every other write behind it.
- A non-retryable rejection (4xx other than 404/401/403) is **never silently
  dropped**: the op is parked in a persisted dead-letter ledger
  (`esabcc_ca_outbox_dead_v1`), surfaced in the UI as
  "N changes need attention", and recoverable via
  `requeueDeadLetters()` from `src/lib/content-analysis/outbox.ts`
  (run it in the browser console after the fixing deploy, or ask a dev).
- 401/403 on per-user writes (notes, tags) are retried with a freshly
  resolved session token — an expired token can't kill a queued write.

The sync pill (`SyncStatusPill`) shows: nothing (all confirmed),
"Saving N changes…" (queued + retrying), "N changes need attention"
(dead-lettered, parked safely), or "Not saved to server" (no durable backend
configured at all).

Residual risks, stated honestly:

- Work typed while **offline** lives in the author's browser until the
  outbox can reach the server. Clearing site data on that machine before
  reconnecting loses it. Keep the tab until the "Saving…" pill clears.
- localStorage quota exhaustion stops queue persistence across reloads
  (the queue still retries within the session, and the failure is surfaced).

## Nightly backups (set up once, then automatic)

`.github/workflows/content-analysis-backup.yml` exports **every**
`content_analysis_*` and `pw_*` table nightly (03:30 UTC) and on demand
(workflow_dispatch — run it manually before any risky migration). Each
snapshot goes to two independent places:

1. **`data-backups` branch** of this repo — one commit per night, history
   kept forever. Any past day is recoverable via `git checkout <sha>`.
2. **Workflow artifact**, 90-day retention — survives even branch deletion.

One-time setup: add two repository secrets in GitHub → Settings → Secrets
and variables → Actions:

- `SUPABASE_URL` (or reuse `NEXT_PUBLIC_SUPABASE_URL`)
- `SUPABASE_SERVICE_ROLE_KEY`

The job fails loudly if secrets are missing or any table can't be exported in
full, and warns in the commit message + job annotations if any table's row
count dropped sharply since the previous night (mass-deletion tripwire).

Restore (whole snapshot or a single table):

```bash
SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
  node scripts/restore-content-analysis-backup.mjs <snapshot-dir> [table ...]
```

Restores are additive upserts — they never delete rows added after the
snapshot.

## Readiness for the EEA-hosted Postgres migration

The path is already scripted and the data model is portable:

- `scripts/it-handoff/` — provisions plain Postgres 15+ with an `auth`
  schema shim (`auth.users` table + `auth.uid()` function), so all
  migrations and RLS policies apply unchanged outside Supabase.
- `scripts/migrate-to-postgres/dump.sh` / `restore.sh` — `pg_dump` of the
  public schema (no Supabase-specific ownership/privileges) into the target.
- `scripts/migrate-to-postgres/verify-parity.mjs` — now verifies row-count
  parity for **all** content-analysis and project-workspace tables (it
  previously only covered the reference-manager era tables). Run it after
  every rehearsal restore; it exits non-zero on any mismatch.
- The nightly JSONL snapshots are a belt-and-braces second migration path:
  `restore-content-analysis-backup.mjs` works against any PostgREST-fronted
  Postgres, and the files are plain rows readable by any tool.

Cutover checklist (when the time comes): run `dump.sh` → `restore.sh` →
`verify-parity.mjs` on a staging target, take one manual backup-workflow run
the same hour, freeze writes briefly, re-dump/restore, re-verify, flip the
connection env vars. Auth (`auth.users`) migrates separately to the chosen
provider per `scripts/it-handoff/README.md`.
