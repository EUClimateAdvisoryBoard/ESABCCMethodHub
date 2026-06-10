# Data backups (automated)

Nightly snapshots of every `content_analysis_*` and `pw_*` Supabase
table, written by `.github/workflows/content-analysis-backup.yml`.
One JSON-Lines file per table under `content-analysis/`, plus a
`manifest.json` with row counts.

Each night is a commit — use `git log -- content-analysis` to find a
date and `git checkout <sha> -- content-analysis` to pull that day's
state. Restore into Supabase (or any PostgREST-fronted Postgres) with:

    SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... \
      node scripts/restore-content-analysis-backup.mjs content-analysis

Do not edit this branch by hand.
