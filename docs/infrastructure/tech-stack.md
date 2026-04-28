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
<figcaption><span class="mh-figure__num">Figure 8.</span> Repository layout. A reviewer can read the scope off the folder names alone: the five production modules live under <code>src/app/</code>, the eight beta modules sit under <code>beta/modules/</code> outside the Next.js route tree, documentation ships from <code>docs/</code>, and the operational surface (pipelines, migrations, handoff scripts, container assets) is rooted at the repo root.</figcaption>
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
| **Mapping**            | **Leaflet** + OSM tiles                       | Free, deterministic, no API key.                                                        |
| **PDF rendering**      | **`pdfjs-dist`** via `react-pdf`              | Used by Content Analysis and Reference annotation.                                      |
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

## What we deliberately **don't** use

| Not used                              | Why                                                                                             |
|---------------------------------------|-------------------------------------------------------------------------------------------------|
| **Vercel / edge runtime**             | Data sovereignty + IT handover; standard container image runs on any EEA host.                  |
| **Redis / Memcached**                 | Every cache can live in Postgres; removing a stateful sidecar shrinks the ops surface.          |
| **Kubernetes (as a requirement)**     | The app runs on a single container. Podman / Nomad / OpenShift / plain VM all work.             |
| **Prisma / heavy ORM**                | The schema is small; Postgres function calls + typed query helpers read better than generated DSLs. |
| **A WebSocket server**                | Supabase Realtime (dev) is optional; production uses short polling on a handful of endpoints.   |
| **Heavy feature flagging (LaunchDarkly etc.)** | Scope is visible in the file system — `beta/modules/` is the flag. Promote with `git mv`. |
