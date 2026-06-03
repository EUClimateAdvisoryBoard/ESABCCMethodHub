# Tech stack

Full inventory of what MethodHub runs on, grouped by responsibility.
Each row is marked either as **in place today** (visible in
[`package.json`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/package.json),
the [`Dockerfile`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/Dockerfile),
or under [`scripts/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/scripts))
or as part of the **EEA-ready target** — scoped and named here so
the handoff punch list is visible, but not yet implemented.

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-repo-layout.svg" alt="Four-zone repository layout — src/ for the shipped Next.js app, beta/ for scope-parked modules, docs/ for the hosted documentation, scripts/ and supabase/ for ingestion and deployment.">
<figcaption><span class="mh-figure__num">Figure 8.</span> Repository layout. A reviewer can read the scope off the folder names alone: the eight production modules live under <code>src/app/</code>, the eleven beta modules sit under <code>beta/modules/</code> outside the Next.js route tree, documentation ships from <code>docs/</code>, and the operational surface (pipelines, migrations, handoff scripts, container assets) is rooted at the repo root.</figcaption>
</figure>

## Runtime

| Layer                  | Choice                                        | Why                                                                                     |
|------------------------|-----------------------------------------------|-----------------------------------------------------------------------------------------|
| **Language / platform**| **Node.js 20 LTS**                            | Matches the `node:20-alpine` base image; LTS through 2026.                              |
| **Framework**          | **Next.js 14** (app router)                   | Server components + streaming, file-system routing, first-class `output: 'standalone'`. |
| **UI library**         | **React 18**                                  | Shipped by Next.js.                                                                     |
| **Language**           | **TypeScript 5.4 strict**                     | `strict: true`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`.               |
| **CSS framework**      | **Tailwind CSS**                              | Utility-first; keeps the custom-component count down.                                   |
| **Component primitives** | **Radix UI** (dialog, dropdown, tooltip)    | Accessible headless primitives. No bespoke modal code.                                  |
| **Charting**           | **Chart.js**                                  | Good enough for line/bar/stacked, small bundle, tabular tooltips.                       |
| **Graph layout**       | **D3 force simulation** (via `d3-force`)      | Only the parts of D3 we use; saves ~80 kB.                                              |
| **Mapping**            | **Leaflet** + **react-leaflet** + OSM tiles   | Member-state choropleth (M·07) + climate-councils map. Free, deterministic, no API key. |
| **Geometry**           | **`topojson-client`** + **`world-atlas`**     | EU-27 boundary simplification; pre-baked to GeoJSON at build (`build-eu27-geojson.mjs`). |
| **PDF rendering**      | **`pdfjs-dist`** via **`react-pdf`**          | Used by Content Analysis (M·05) and Reference annotation (M·01). Lazy-loaded per tab.   |
| **Spreadsheets**       | **`exceljs`**                                 | Indicator-database Excel export / import (M·07) with formula-aware cells.               |
| **File output**        | **`file-saver`** + **`jszip`**                | Client-side downloads (CSV/XLSX, bundled exports, the extension zip).                    |
| **QR codes**           | **`qrcode`**                                  | Single-use voting-ballot links (M·06) rendered as scannable QR.                          |
| **In-app diagrams**    | **`mermaid`**                                 | Rendered client-side inside guide / analysis surfaces.                                   |
| **Server canvas**      | **`@napi-rs/canvas`**                         | Server-side image generation (e.g. social / factsheet cards) without a headless browser. |
| **Icon set**           | Inline SVGs + Radix UI icons                  | No separate icon-library dependency today; inline SVGs keep the bundle small.            |

## Data layer

| Layer              | Choice                                | Role                                                              |
|--------------------|---------------------------------------|-------------------------------------------------------------------|
| **Database**       | **PostgreSQL 14+**                    | Source of truth in production. Supabase in dev / early prototype. |
| **Migrations**     | Plain SQL under `supabase/migrations/`| Applied in filename order on first boot; idempotent re-runs OK.   |
| **Connection pool**| **pgBouncer** (recommended)            | Transaction-pooling mode; keeps per-request fanout bounded.       |
| **ORM / query**    | `@supabase/supabase-js` + `pg`         | No Prisma — the code talks SQL directly, behind the `src/lib/db/` façade. |
| **Row security**   | **RLS on every user-data table**      | `auth.uid() = added_by` or library / workspace membership.        |
| **Object storage** | **Supabase Storage** or **S3 / MinIO** | Reference PDFs, content-analysis ingested files.                  |
| **Cache**          | In-memory + Postgres cache tables     | No Redis. Every cache row has a `fetched_at` and a TTL in code.   |

### The data-layer façade (`src/lib/db/`)

All persistent state is Postgres, but the code reaches it through a thin
façade rather than scattering client construction across call sites. This is
the **cutover seam** for the EEA handoff:

- `src/lib/db/config.ts` declares the provider switches — `DB_PROVIDER`
  (`supabase` | `postgres`), `STORAGE_PROVIDER`, `REALTIME_PROVIDER`,
  `AUTH_PROVIDER` — so each piece of infrastructure can migrate on its own
  schedule.
- The self-hosted Postgres pool (`pg`) is an **optional dependency** and is
  `import()`-ed lazily, so a Supabase-only deployment never loads it.
- Per-module logic lives in `*-store.ts` / `db.ts` files (`lib/references/`,
  `lib/scenarios/`, `lib/content-analysis/`, `lib/voting/`,
  `lib/project-workspace/`, `lib/country-profiles/`) that talk SQL or the
  Supabase client behind the façade — never a generated ORM DSL.

## Module → dependency map

Which third-party libraries each of the eight core modules actually leans on.
Anything not listed here is shared chrome (Next.js, React, Tailwind, Radix).

| Module                       | Key dependencies                                                              |
|------------------------------|-------------------------------------------------------------------------------|
| M·01 Reference Manager       | `pdfjs-dist` / `react-pdf` (annotation), Crossref (DOI), the Word bridge + Office.js add-in + Electron companion. |
| M·02 Data & Scenarios        | `chart.js` / `react-chartjs-2`, `d3` (scales), Eurostat + IIASA AR6 + EEA clients. |
| M·03 Secretariat News        | `lib/rss-feeds.ts` (regex RSS), `lib/ai-summary.ts` (narrative briefing), inbound-email ingest. |
| M·04 EU Policy Navigator     | `d3-force` (network layout), `lib/article-extractor.ts`, EUR-Lex cellar text. |
| M·05 Content Analysis        | `pdfjs-dist` / `react-pdf`, the hierarchical-code model in `lib/content-analysis/`. |
| M·06 Voting Tool             | `qrcode` (single-use links), isolated ballot store, seven tally algorithms in `lib/voting/`. |
| M·07 Project Workspace       | `exceljs` (indicator workbooks), `leaflet` / `react-leaflet` + `topojson-client` (member-states map), `file-saver`, the indicator-refresh upstream clients (Eurostat / EEA / EAFO / IRENA / EHPA). |
| M·08 Recommendations         | Shares the M·07 `pw_*` store; no extra runtime deps beyond the workspace API. |

## Auth & identity

| Layer             | Choice                                   | Role                                              |
|-------------------|------------------------------------------|---------------------------------------------------|
| **Provider switch** | `AUTH_PROVIDER=supabase \| oidc` (today)       | Flag declared in `src/lib/db/config.ts`. Supabase Auth is the live branch; the OIDC branch is scoped but not yet wired into the sign-in routes. |
| **OIDC library** *(target)*   | **`openid-client`** (`panva/node-openid-client`) | Not yet a dependency. Added when the OIDC branch lands. Standards-compliant, zero vendor lock-in. |
| **Target IdPs**   | EU Login · Entra ID                      | Standard OIDC + PKCE.                             |
| **Session** *(target)*       | Signed httpOnly cookies · `iron-session` style | Not yet a dependency. Today Supabase cookies carry the session. |
| **MSAL** *(target, optional)* | `@azure/msal-node`                     | Not yet a dependency. Required if / when `LLM_PROVIDER=copilot-graph` is implemented. |

## AI layer

| Layer                  | Choice                                 | Role                                                            |
|------------------------|----------------------------------------|-----------------------------------------------------------------|
| **Provider switch**    | `LLM_PROVIDER` in `.env.local`         | Live. Accepts `anthropic \| azure-openai \| openai \| gemini` (auto-detects from whichever API key is present). `copilot-graph` and `none` are target values, not yet implemented. |
| **Default today**      | Auto-detects from keys                 | Priority: Azure OpenAI > Gemini > Anthropic > OpenAI. Swaps to Azure OpenAI EU for production. |
| **Dispatcher**         | `src/lib/ai-summary.ts`                | Single file with `callAzureOpenAI()`, `callAnthropic()`, `callGemini()`, `callOpenAI()`. The `src/lib/ai/*.ts` per-provider split is a target refactor, not current layout. |
| **Delegated adapter** *(target)* | `src/lib/ai/copilot-graph.ts`  | Not yet implemented. See [Copilot deep-dive](copilot.md) for what this path would look like. |
| **Audit** *(target)*   | `ai_call_audit` table                  | Table and retention window (`app.ai_audit_retention_days`) are scoped; the table is not yet in the schema and no call sites write to it. |
| **Budget / breaker** *(target)*   | Per-user token bucket + circuit breaker | Not yet implemented. Required before enabling `copilot-graph` to stay under Graph's per-minute caps. |

## Deployment

| Layer              | Choice                                     | Role                                                   |
|--------------------|--------------------------------------------|--------------------------------------------------------|
| **Build**          | `next build` with `output: 'standalone'`   | No Vercel primitives; single `node server.js` binary.  |
| **Container**      | Multi-stage `Dockerfile` (node:20-alpine)  | ~180 MB final image, non-root user.                    |
| **Orchestration**  | Agnostic — Podman · OpenShift · Nomad · VM | Anything that runs OCI images.                         |
| **Reverse proxy**  | nginx / HAProxy (EEA IT's choice)          | TLS termination, HSTS, forwarded headers.              |
| **Health check** *(target)* | `GET /api/health` → `{ ok, schemaVersion }` | Not yet implemented; tracked as pre-handoff work so standard orchestrator liveness / readiness probes can plug in. |
| **CI — PR checks** | GitHub-hosted runner                       | Today: `npm ci` + `npm run build` (see `deploy.yml`). **Target (pre-handoff):** add `tsc`, `eslint`, unit/integration tests, and a dependency-vulnerability scan as blocking checks. |
| **CI — releases**  | **`[self-hosted, eea]` runner**             | `self-hosted-deploy.yml` opt-in workflow; builds and pushes the image to the EEA registry, tags with short SHA + `latest`. |

## Ingestion pipelines

| Source              | Script                                                  | Cadence           |
|---------------------|---------------------------------------------------------|-------------------|
| EUR-Lex (cellar)    | `scripts/fetch-eurlex-texts.js`                         | daily             |
| IIASA AR6 WG3       | `scripts/fetch_iiasa_data.py`                           | weekly            |
| ESABCC reports      | `scripts/fetch_esabcc_reports.py`                       | weekly            |
| Eurostat            | live via `/api/eurostat-*` + 24 h cache                 | on demand         |
| EEA projections     | live via `/api/eea-projections` + 24 h cache             | on demand         |
| Crossref (DOIs)     | live via `/api/resolve-doi` + 30 d cache                 | on demand         |
| RSS (40+ sources)   | `scripts/fetch-news.js`                                 | hourly            |
| Daily summary (LLM) | `scripts/generate-daily-summary.js`                     | 4× / day          |
| Electricity Maps    | live via `/api/electricity-maps`                        | hourly per-zone   |

## Documentation

| Layer              | Choice                                        | Role                                                     |
|--------------------|-----------------------------------------------|----------------------------------------------------------|
| **Site generator** | **MkDocs Material 9.x**                       | Themed to ESABCC palette via `docs/stylesheets/extra.css`. |
| **Markdown ext.**  | `pymdownx.*` (superfences, tabbed, details)   | Tabs, collapsible deep-dives, annotated code.            |
| **Diagrams**       | **Mermaid** + hand-authored **SVG**           | Mermaid for code-like flows, SVG for polished overviews. |
| **Access control** | **Edge-middleware HMAC cookie** (`SITE_PASSWORD` + `SITE_AUTH_SECRET`) | Server-side password check at the edge; `HttpOnly` HMAC-signed cookie. Same gate as the rest of the app. See [`DOCSITE.md`](../DOCSITE.md). |
| **Hosting**        | Vercel — built into `public/docs/` by `scripts/build-docs.sh` | Docs travel with the app deploy. OIDC / EU Login replaces the password gate at the EEA cutover. |

## Operational guardrails

- **GDPR.** RLS on every user table (live). Retention windows via
  Postgres GUCs (live). Art. 17 erasure is implemented as a
  two-step soft-delete: the user requests deletion through the
  profile page (POST `/api/user/delete-request`, 30-day grace
  window), and a scheduled call to
  `public.process_pending_deletions()` +
  `public.purge_expired_personal_data()` performs the actual
  cascade. (The name `erase_user()` that older docs referenced
  does not exist.)
- **Admin audit.** Every admin action written to
  `admin_audit_log` via `src/lib/admin-audit.ts` (live).
- **Secrets.** Out-of-repo. Secret store owns `DATABASE_URL`, LLM
  keys, OIDC client secret (target), `DOCS_SITE_PASSWORD`.
- **Backups** *(target).*
  `scripts/it-handoff/backup.sh` is committed and takes a
  `pg_dump`; GPG-encryption + upload to EEA object storage is
  expected to be wrapped by the hosting partner's scheduler and
  credentials at deploy time.
- **Migration safety.** Every schema change has a forward-only
  migration in `supabase/migrations/` and a row-count parity
  smoke test at `scripts/migrate-to-postgres/verify-parity.mjs`
  (run via `npm run db:verify-parity`).

## Client & satellite components

None of these ship inside the deployable container, but they are part of the
stack a reviewer will see in the repo. Each is independently deployable or
runs on the user's own machine.

| Component            | Stack                                          | Role                                                                 |
|----------------------|------------------------------------------------|----------------------------------------------------------------------|
| `bridge-service/`    | Node HTTP server, loopback `:8585`, SQLite cache | Holds the Word add-in's token so the add-in never sees Supabase creds. |
| `word-addin/`        | **Office.js** task-pane add-in (webpack + TS)  | Live search-and-insert of citations into a Word manuscript (M·01).   |
| `word-addin-app/`    | **Electron** desktop companion                 | Zotero-style reference browser; live library fetch + offline snapshot. |
| `browser-extension/` | MV3 Edge/Chrome extension                      | One-click LinkedIn capture into the beta media-monitoring module.    |
| `pypsa-service/`     | **Python / FastAPI**, own `Dockerfile`         | Energy-system optimisation solver; called only by the beta energy module. |
| `outlook-vba/`, `word-vba/` | VBA macros + PowerShell installers      | Legacy push-to-Hub macros for sites without the Office.js add-in.    |

The [Clients & extensions](../reference/clients.md) reference covers each in
full.

## Build & configuration

| File                  | What it pins                                                                                  |
|-----------------------|-----------------------------------------------------------------------------------------------|
| `next.config.js`      | `output: 'standalone'`, trailing-slash, global security headers (HSTS, CSP, `X-Frame-Options`), dynamic CORS for the Office hosts, and legacy `/policy` → `/policy-navigator/*` redirects. |
| `tsconfig.json`       | `strict` TypeScript, path alias `@/*` → `./src/*`.                                            |
| `tailwind.config.ts`  | ESABCC palette (primary `#004B7F`, secondary `#007B6C`) + responsive max-widths.              |
| `Dockerfile`          | Three-stage `node:20-alpine` build → ~180 MB non-root image, entrypoint `node server.js`.     |
| `package.json` scripts | `prebuild` bakes the extension zip + EU-27 GeoJSON; `postinstall` copies the `pdf.worker` into `public/`; `vercel-build` builds the docs then the app. |

## What we deliberately **don't** use

| Not used                              | Why                                                                                             |
|---------------------------------------|-------------------------------------------------------------------------------------------------|
| **Vercel / edge runtime**             | Data sovereignty + IT handover; standard container image runs on any EEA host.                  |
| **Redis / Memcached**                 | Every cache can live in Postgres; removing a stateful sidecar shrinks the ops surface.          |
| **Kubernetes (as a requirement)**     | The app runs on a single container. Podman / Nomad / OpenShift / plain VM all work.             |
| **Prisma / heavy ORM**                | The schema is small; Postgres function calls + typed query helpers read better than generated DSLs. |
| **A WebSocket server**                | Supabase Realtime (dev) is optional; production uses short polling on a handful of endpoints.   |
| **Heavy feature flagging (LaunchDarkly etc.)** | Scope is visible in the file system — `beta/modules/` is the flag. Promote with `git mv`. |
