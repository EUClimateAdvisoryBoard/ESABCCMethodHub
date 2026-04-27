# Scripts reference

Every file under `scripts/` — pipelines, migrations, handoff tools —
with what it does, when it runs, and the env vars it reads. Grouped
by purpose.

!!! info "Source of truth"
    Each script carries its own head-of-file docstring. This page is
    the index.

## Ingestion pipelines

| Script                                              | Language | Cadence           | What it does                                                       |
|-----------------------------------------------------|----------|-------------------|--------------------------------------------------------------------|
| `scripts/fetch-news.js`                             | Node     | hourly            | Sweep every configured RSS feed; write new items to `news_articles`. |
| `scripts/generate-daily-summary.js`                 | Node     | 4× / day          | Dedup + topical cluster + LLM-summarise. Output: `public/data/daily-summary.json`. |
| `scripts/fetch-eurlex-texts.js`                     | Node     | daily             | Consolidate CELEX texts from EUR-Lex cellar into `policy_texts`.   |
| `scripts/prefetch-eurlex-bodies.mjs`                | Node     | on demand         | Warm the full-text cache for a list of CELEXes.                    |
| `scripts/fetch_iiasa_data.py`                       | Python   | weekly            | Pull AR6 WG3 snapshot; write `src/data/scenarios.ts`.              |
| `scripts/fetch_esabcc_reports.py`                   | Python   | weekly            | Scrape new ESABCC report metadata into `esabcc_reports`.           |
| `scripts/fix-truncated-urls.js`                     | Node     | on demand         | Repair truncated URLs in legacy data imports.                      |

**Triggers.** Each pipeline runs via a matching GitHub Actions
workflow under [`.github/workflows/`](https://github.com/SebastianFra/MethodHub/tree/main/.github/workflows)
(`daily-updates.yml`, `fetch-eurlex-branch.yml`, `fetch-esabcc-reports.yml`,
`prefetch-policy-bodies.yml`). On EEA infrastructure the same scripts
run from a local cron against the EEA Postgres; GitHub Actions is not
required.

## Migration + IT handoff

| Script                                              | Purpose                                                                 |
|-----------------------------------------------------|-------------------------------------------------------------------------|
| `scripts/migrate-to-postgres/dump.sh`               | `pg_dump` the live Supabase database into a local archive.              |
| `scripts/migrate-to-postgres/restore.sh`            | Restore into an EEA Postgres URL via `psql`.                            |
| `scripts/migrate-to-postgres/verify-parity.mjs`     | Row-count parity diff Supabase vs. EEA Postgres; fails on mismatch. `npm run db:verify-parity`. |
| `scripts/migrate-to-postgres/smoke-test.mjs`        | End-to-end happy-path after migration. `npm run db:smoke`.              |
| `scripts/it-handoff/00-prereqs.sql`                 | Preflight SQL checks that must pass before applying the schema.         |
| `scripts/it-handoff/01-apply-schema.sh`             | Apply `supabase-schema.sql` + every `supabase/migrations/*.sql`.        |
| `scripts/it-handoff/02-service-accounts.sql`        | Create the service-role accounts the app uses against EEA Postgres.     |
| `scripts/it-handoff/03-verify.sh`                   | Post-apply sanity: expected tables, RLS policies, retention GUCs.       |
| `scripts/it-handoff/backup.sh`                      | `pg_dump` wrapper intended to be composed with the hosting partner's GPG + object-storage steps. |
| `scripts/it-handoff/postgresql.conf.recommended`    | Starting `postgresql.conf` values tuned for the MethodHub workload.      |
| `scripts/seed-custom-references.sql`                | Seed the `custom_references` table for a fresh fork.                    |

## Build + utilities

| Script                                              | Purpose                                                                 |
|-----------------------------------------------------|-------------------------------------------------------------------------|
| `scripts/build-extension-zip.mjs`                   | Bundle the browser extension into a distributable ZIP.                  |
| `scripts/render-faq-pdf.py`                         | Render `docs/FAQ-NON-TECHNICAL.md` into the repo-root PDF.              |
| `scripts/validate-connections.ts`                   | Nightly check: external feeds respond, schema matches.                  |

## Fact-sheet verification (beta)

| Script                                                        | Purpose                                                         |
|---------------------------------------------------------------|-----------------------------------------------------------------|
| `scripts/factsheet-verify/preprocess_reports.py`              | Normalise source ESABCC reports into per-page JSON.             |
| `scripts/factsheet-verify/extract_figure_images.py`           | Extract figures + captions from report PDFs.                    |
| `scripts/factsheet-verify/summarise_figures.py`               | Caption summarisation for downstream fact-sheet review.         |
| `scripts/factsheet-verify/gen_figures_ts.py`                  | Emit a TypeScript manifest of extracted figures for the UI.     |
| `scripts/factsheet-verify/rewrite_data.py`                    | Batch rewrite of a fact-sheet JSON store after a schema change. |

## Environment variables used across scripts

Most pipelines read from the same env-var namespace as the app. The
ones that matter operationally:

- `DATABASE_URL` — Postgres (EEA production).
- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` — Supabase (prototype).
- `REFS_GITHUB_TOKEN` — optional GitHub persistence during the
  prototype phase (reference + report-plan stores).
- `ANTHROPIC_API_KEY` / `AZURE_OPENAI_*` — LLM provider for the daily
  summariser and classification pipelines.
- `INBOUND_EMAIL_SECRET` — HMAC for the inbound-email webhook.
- `MEDIA_MONITORING_SECRET` — cron trigger guard.

Full list lives in `.env.local.example`.

## Running a script by hand

```bash
# One-shot: refresh the AR6 snapshot
python3 scripts/fetch_iiasa_data.py

# One-shot: regenerate the daily summary
node scripts/generate-daily-summary.js

# Re-render the non-technical FAQ PDF after a docs edit
python3 scripts/render-faq-pdf.py
```

All pipelines are idempotent — re-running does not duplicate rows.
