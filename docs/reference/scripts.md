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
| `scripts/fetch-news.js`                             | Node     | 4× / day          | Sweep every configured RSS feed; write new items to `news_articles`. |
| `scripts/generate-daily-summary.js`                 | Node     | 4× / day          | Dedup + topical cluster + LLM-summarise. Output: `public/data/daily-summary.json`. |
| `scripts/fetch-eurlex-texts.js`                     | Node     | 4× / day          | Consolidate CELEX texts from EUR-Lex cellar into `policy_texts`.   |
| `scripts/prefetch-eurlex-bodies.mjs`                | Node     | on demand         | Warm the full-text cache for a list of CELEXes.                    |
| `scripts/fetch_iiasa_data.py`                       | Python   | on demand         | Pull AR6 WG3 snapshot; write `src/data/scenarios.ts`.              |
| `scripts/fetch_esabcc_reports.py`                   | Python   | monthly (1st)     | Scrape new ESABCC report metadata into `esabcc_reports`.           |
| `scripts/fix-truncated-urls.js`                     | Node     | on demand         | Repair truncated URLs in legacy data imports.                      |

**Triggers.** Each pipeline runs via a matching GitHub Actions
workflow under [`.github/workflows/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/.github/workflows)
(`daily-updates.yml`, `fetch-eurlex-branch.yml`, `fetch-esabcc-reports.yml`,
`prefetch-policy-bodies.yml`). `daily-updates.yml` runs the EUR-Lex, news
and summary steps together at 05:00, 11:00, 17:00 and 23:00 UTC;
`fetch-esabcc-reports.yml` runs on the 1st of each month;
`fetch_iiasa_data.py` has no workflow and is run by hand. On EEA infrastructure the same scripts
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
| `supabase/combined_migrations.sql`                  | Concatenation of `supabase/migrations/001..046` in order. Lets a fresh database bootstrap by pasting a single file into the SQL editor, instead of running each migration individually. Regenerated whenever a new migration is added. |
| `scripts/it-handoff/backup.sh`                      | `pg_dump` wrapper intended to be composed with the hosting partner's GPG + object-storage steps. |
| `scripts/it-handoff/postgresql.conf.recommended`    | Starting `postgresql.conf` values tuned for the MethodHub workload.      |
| `scripts/seed-custom-references.sql`                | Seed the `custom_references` table for a fresh fork.                    |

## Build + utilities

| Script                                              | Purpose                                                                 |
|-----------------------------------------------------|-------------------------------------------------------------------------|
| `scripts/build-extension-zip.mjs`                   | Bundle the browser extension into a distributable ZIP.                  |
| `scripts/build-docs.sh`                             | Build the MkDocs site into `public/docs/`. Run automatically as part of `vercel-build`. Uses `pip --break-system-packages` so it works on PEP-668 build images. |
| `scripts/render-faq-pdf.py`                         | Render `docs/FAQ-NON-TECHNICAL.md` into the repo-root PDF.              |
| `scripts/validate-connections.ts`                   | Nightly check: external feeds respond, schema matches.                  |
| `scripts/classify-references.mjs`                   | Classify the whole reference corpus (static + custom) into scientific vs grey literature and emit the [classification batch](classification-batch.md) (`public/data/reference-classification-batch.json` + the markdown report). Offline; mirrors the Content Analysis `sourceTierOf` rule. |

## Scheduled maintenance & reference library

| Script                                        | Runs via                                         | What it does |
|-----------------------------------------------|--------------------------------------------------|--------------|
| `scripts/screen-publications.mjs`             | `daily-publication-screening.yml`, 04:30 UTC daily | Daily scientific-publication screening for the Project Workspace. |
| `scripts/backup-content-analysis.mjs`         | `content-analysis-backup.yml`, 03:30 UTC daily   | Off-site backup of every content-analysis, project-workspace and reference-manager table. |
| `scripts/restore-content-analysis-backup.mjs` | `content-analysis-backup.yml` (manual dispatch)  | Restore a backup snapshot written by the script above. |
| `scripts/audit-static-references.mjs`         | `audit-static-references.yml` (push / manual)    | CrossRef audit of the bundled static library (`src/data/references.ts`); writes `src/data/reference-pdf-links.json` and `reference-corrections.json`. Report: [Static library audit](static-library-audit.md). |
| `scripts/fetch-reference-pdfs.mjs`            | `fetch-reference-pdfs.yml` (push / manual)       | Attach open-access PDFs to live-stack references; curated sources in `scripts/data/reference-pdf-sources.json`. Report: [Reference PDFs](reference-pdfs.md). |
| `scripts/tag-eu-funded-references.mjs`        | `tag-eu-funded-references.yml` (push / manual)   | Tag references whose CrossRef `funder[]` metadata names an EU programme. Report: [EU-funded references](eu-funding-tags.md). |

## Policy datasets (M·04, M·05, M·36, M·53)

| Script                                        | Runs via                        | What it does |
|-----------------------------------------------|---------------------------------|--------------|
| `scripts/extract-policy-targets.mjs`          | `npm run build:policy-targets`  | Deterministic regex safety-net over the enacting terms (never recitals) of every policy text; inputs and corrections live in `scripts/policy-targets-input/`. |
| `scripts/build-policy-targets.mjs`            | `npm run build:policy-targets`  | Merge, validate (quotes re-checked as source substrings) and classify target candidates into the M·36 dataset, applying `scripts/policy-targets-overrides.json`, `policy-targets-replaced.json` and `policy-targets-review-2026-08.json`. |
| `scripts/policy-targets-classify.mjs`         | imported by the build above     | The deterministic classification vocabularies and veto phrases for M·36. |
| `scripts/export-policy-targets-workbook.py`   | by hand                         | Export the corrected M·36 register to the reviewer workbook. |
| `scripts/build-sector-targets.py`             | by hand                         | Generate `src/data/sector-targets.generated.ts` from the Masterfile tab "Clean targets". |
| `scripts/build-target-indicators.mjs`         | `npm run build:target-indicators` / `check:target-indicators` | Build (or, with `--check`, verify without writing) the M·53 target → indicator ledger; overrides in `scripts/target-indicators-overrides.json`. |
| `scripts/target-indicator-catalogue.mjs`      | imported by the build above     | Measurement-family catalogue for M·53. |
| `scripts/check-policy-registries.mjs`         | `npm run check:policies`        | Guard against drift between the sectoral overlay and the canonical Policy Navigator registry. |
| `scripts/build-policy-bodies-from-texts.mjs`  | `prebuild`, `npm run build:policy-bodies` | Build `public/content-analysis/policy-bodies.json` from `public/data/policy-texts/*.txt`. |
| `scripts/fetch-new-policy-texts.mjs`          | by hand (one-off)               | Fetch consolidated texts for newly registered policies through the Publications Office Cellar endpoint. |
| `scripts/retag-policies.mjs`                  | by hand                         | Regenerate `src/lib/content-analysis/policy-master-tags.ts` with a fleet of tagging agents. |
| `scripts/export-tag-workbook.ts`              | `npx tsx`, by hand              | Export the master tag taxonomy to Excel for team review. |

## Module data builders

| Script                                        | Module                     | What it does |
|-----------------------------------------------|----------------------------|--------------|
| `scripts/build-scenario-pathways.py`          | M·55 Scenarios             | Read `EU_six_sectors_export.zip` without unpacking it and write `public/data/scenario-pathways/pathways.json`, with a parity gate against the EEA export. |
| `scripts/build-industry-scenario-screening.py`| M·07 Industry Project      | Generate `src/data/industry-scenario-screening.generated.ts` from `public/data/industry-scenario-screening/Scenario_database.xlsx`. |
| `scripts/make-scenario-call-figure.py`        | M·07 (project documents)   | Draw the schematic figure for the scenario-call one-pager. |
| `scripts/make-scenario-call-onepager.py`      | M·07 (project documents)   | Generate the one-page Word note on the IAM scenario submission call (needs the figure above). |
| `scripts/country-profile-source-urls.mjs`     | M·07 member-state profiles | Add `source` / `sourceUrl` to every indicator value in `src/data/country-profiles/<code>.ts`. |
| `scripts/build-eu27-geojson.mjs`              | EU-27 choropleths (`src/lib/geo/eu-choropleth.ts`, National Climate Policies map) | `prebuild`: write `public/data/eu27-boundaries.geojson` from the bundled world-atlas topojson. |
| `scripts/seed-sector-background-readings.mjs` | M·33 Sector Background     | Emit `supabase/migrations/073_sector_background_readings_seed.sql`. |
| `scripts/fetch-climate-laws.mjs`              | National Climate Policies (beta) | Refresh `public/data/national-climate-policies.json` from climate-laws.org. |
| `scripts/extract-necpr-2025.py`               | M·40 NECPR 2025            | Extract tidy CSVs and a data-quality report from the 2025 NECPR Reportnet workbooks into `public/data/necpr-2025/`. |
| `scripts/fetch-figaro-io-dataset.mjs`         | Overview Industry (beta)   | Import the full Eurostat FIGARO inter-country input–output table into `public/data/figaro/`. |
| `scripts/fetch-trade-flows-io-data.mjs`       | Overview Industry (beta)   | Regenerate `beta/modules/overview-industry/trade-flows/eurostat-io.generated.ts`. |
| `scripts/refresh-climate-security-eurostat.mjs` | M·45 Climate Security    | Rebuild the Eurostat-derived series in `beta/modules/climate-security/data.generated.ts`. |
| `scripts/refresh-climate-security-prices.mjs` | M·45 Climate Security      | Refresh the border-price anchors in the same file. |
| `scripts/refresh-wildfire-effis-data.mjs`     | M·41 Wildfires & the Land Sink | Refresh the EFFIS burnt-area snapshots in `beta/modules/wildfire-sink-risk/analyses/data.ts`. |

## Pipeline folders

| Folder                                   | What it holds |
|------------------------------------------|---------------|
| `scripts/esabcc-indicators/`             | The M·07 Indicator Database pipeline: report extraction, SQL emitters, the post-report and "report way" rows, fact-check inputs, and `refresh-from-sources.mjs` + `render_verification_pdf.py`, which `refresh-indicators.yml` runs monthly (it opens a PR, never pushes to `main`). |
| `scripts/esabcc-indicator-derivations/`  | Per-chapter Python derivations that reproduce published ESABCC indicator figures from raw data; brief for agents in `AGENT_GUIDE.md`. |
| `scripts/policy-targets-input/`          | Per-act extraction inputs, the regex table and dated correction files for the M·36 build. |
| `scripts/summer-prep-background/`        | Builders for the background workbooks and documents of the former M·35 Summer Prep (indicator check, synergies, sector policy gaps). |
| `scripts/data/`                          | Curated inputs shared by scripts (currently `reference-pdf-sources.json`). |

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
  prototype phase (reference store).
- `ANTHROPIC_API_KEY` / `AZURE_OPENAI_*` — LLM provider for the daily
  summariser and classification pipelines.
- `INBOUND_EMAIL_SECRET` — HMAC for the inbound-email webhook.
- `MEDIA_MONITORING_SECRET` — cron trigger guard.
- `SITE_PASSWORD` / `SITE_AUTH_SECRET` — site-wide password gate
  (Edge middleware) protecting both `/` and `/docs/`.
- `REFMANAGER_API_URL` — read by the Word add-in companion app to
  fetch the live reference library (defaults to the public host).

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
