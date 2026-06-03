# API reference

Every `src/app/api/**/route.ts` in one place. Grouped by module; each
row names the HTTP verbs, the purpose, the authentication
expectation, and any salient caveat.

!!! info "Source of truth"
    The file-level JSDoc at the top of each route handler is the
    primary source. This table is maintained alongside those
    docstrings and reviewed as part of every API-touching PR. If a
    row here diverges from the handler's own comment, the handler
    wins.

## Module — Reference Manager (M·01)

| Path                                      | Method        | Purpose                                                          | Notes                                            |
|-------------------------------------------|---------------|------------------------------------------------------------------|--------------------------------------------------|
| `/api/references`                         | `GET`, `POST` | List / create references (combines seed + custom store)          | VBA-sanitised · Node runtime pin                 |
| `/api/references/doi`                     | `POST`        | Upsert-by-DOI; resolves via Crossref, falls back to DataCite     | Idempotent                                       |
| `/api/references/pdf`                     | `GET`         | Stream a reference PDF by id                                     | Hides Supabase / S3 URLs from clients            |
| `/api/references/fetch-pdf`               | `POST`        | Server-side PDF fetcher for CORS-blocked publisher URLs          | 50 MB cap · http(s) only · 3-hop redirect limit  |
| `/api/references/library`                 | `GET`, `POST`, `DELETE` | Per-library CRUD against the custom store              | RLS at the store layer                           |
| `/api/references/library/backfill`        | `POST`        | Bulk-import legacy bibliography (EndNote / BibTeX / RIS)         | Admin-gated · `admin_audit_log`-written           |
| `/api/resolve-doi`                        | `GET`         | Normalise + look up a DOI through Crossref                       | 30-day cache · 422 on not-found · lifts CrossRef `funder[]` into `csl.funder` |
| `/api/similar-papers`                     | `GET`         | "Find similar" — Semantic Scholar with bundled-corpus fallback    | Query-only · no user data sent                   |
| `/api/citations/used`                     | `GET`, `POST` | Citation-insertion event log (writes from Word add-in; reads roll-ups for the audit-report Live tab) | Snapshots `funding` + `doi` at write time so reads don't need to join across reference tables |

## Module — Data & Scenarios (M·02)

| Path                           | Method          | Purpose                                                 | Notes                                           |
|--------------------------------|-----------------|---------------------------------------------------------|-------------------------------------------------|
| `/api/scenarios`               | `GET`           | List scenarios with filters                             | Backs the ScenarioExplorer master list          |
| `/api/scenarios/ar6`           | `GET`           | Bundled AR6 WG3 snapshot (fast path)                    | Served from `src/data/scenarios.ts`             |
| `/api/scenarios/iiasa`         | `GET`           | Live IIASA Scenario Explorer proxy                      | Cache table + bundled fallback on upstream fail |
| `/api/scenario-submissions`    | `POST`          | Submit a user-provided scenario for review              | Writes to `scenario_submissions` with status    |
| `/api/scenario-upload`         | `POST`          | Upload raw IAMC CSV and parse                           | Streams to parser, returns structured result    |
| `/api/eea-projections`         | `GET`           | EEA WEM / WAM projections (member-state submissions)    | Cached ~24 h                                    |
| `/api/electricity-maps`        | `GET`           | Hourly grid carbon-intensity                            | 27 EU zones                                     |
| `/api/energy-prices`           | `GET`           | EU wholesale energy prices                              | Aux data for M·02                               |
| `/api/energy-optimization`     | `POST`          | PyPSA-style energy-system optimisation                  | Calls out to `pypsa-service` · beta              |

## Module — Secretariat News (M·03)

| Path                         | Method | Purpose                                                        | Notes                                    |
|------------------------------|--------|----------------------------------------------------------------|------------------------------------------|
| `/api/live-news`             | `GET`  | Current RSS sweep with optional filters                        | Backed by `news_articles`                |
| `/api/daily-summary`         | `GET`  | Cached daily-summary JSON (hourly RSS sweep → LLM summary)     | Served from `public/data/daily-summary.json` |
| `/api/daily-summary/factsheet` | `GET` | Daily-summary rendered as a factsheet layout                   | Used by M·03 factsheet export            |
| `/api/rss-feeds`             | `GET`  | List of configured RSS feed endpoints                          | Read-only                                |
| `/api/policy-news`           | `GET`  | News articles linked to a specific policy                      | Backs the "Related news" rail on M·04    |
| `/api/policy-clock`          | `GET`  | Timeline events (deadlines, reviews, sunsets)                  | Backs the PolicyClock component          |
| `/api/policy-clock/events`   | `GET`  | Raw event rows for the clock                                   | —                                        |
| `/api/eu-calendar`           | `GET`  | EU institutional calendar feed                                 | Aux                                      |
| `/api/link-preview`          | `GET`  | Open-Graph preview for a URL                                   | Unfurls links in the news cards          |
| `/api/inbound-email`         | `POST` | Webhook handler for inbound-email ingestion                    | HMAC-signed (`INBOUND_EMAIL_SECRET`)     |
| `/api/inbound-email/summarize` | `POST` | Summarise an already-ingested email                          | LLM · user-initiated                     |
| `/api/inbound-email/backfill`  | `POST` | Re-ingest a range of emails                                   | Admin-gated                              |

## Module — EU Policy Navigator (M·04)

| Path                | Method | Purpose                                                         | Notes                                      |
|---------------------|--------|-----------------------------------------------------------------|--------------------------------------------|
| `/api/policy-text`  | `GET`  | Consolidated EUR-Lex text for a CELEX / policy id               | Cache-on-miss via `policy_texts` table     |
| `/api/policy-news`  | `GET`  | *(also under M·03)* news articles linked to a policy            | —                                          |
| `/api/policy-clock` | `GET`  | *(also under M·03)* timeline events for a policy                | —                                          |

## Module — Content Analysis (M·05)

| Path                                         | Method        | Purpose                                                          | Notes                                                   |
|----------------------------------------------|---------------|------------------------------------------------------------------|---------------------------------------------------------|
| `/api/content-analysis/segments`             | `GET`, `POST` | List / upsert coding segments for a document                     | RLS-gated                                               |
| `/api/content-analysis/suggestions`          | `GET`         | List pending LLM-suggested codings awaiting human approval       | —                                                       |
| `/api/content-analysis/ingest`               | `GET`, `POST` | Ingest an EUR-Lex policy PDF into the corpus                     | Falls back to `POST {fallbackText}` on EUR-Lex failure  |
| `/api/content-analysis/ingest-upload`        | `POST`        | Direct file upload (PDF / DOCX / MD) into the corpus             | Multipart; 50 MB cap                                    |
| `/api/content-analysis/pdf`                  | `GET`         | Serve PDF bytes for the react-pdf viewer                         | —                                                       |
| `/api/content-analysis/resegment`            | `POST`        | Re-segment a document at a new granularity                       | Preserves existing annotations where possible           |
| `/api/content-analysis/classify`             | `POST`        | AI master-code classification for a single document              | `AUTO_LLM_SUMMARIZATION_ENABLED` gate                   |
| `/api/content-analysis/suggest-codes`        | `POST`        | AI-suggest new coded segments for a document                     | Low-confidence suggestions land in `ca_suggestions`     |
| `/api/content-analysis/locks`                | `GET`, `POST`, `PATCH`, `DELETE` | Soft-lock lifecycle for the workbench (one editor per project) | Holder identity carried by `X-MH-Client-Id` (uuid in localStorage); 90 s steal threshold; hand-off requests stamped on `request_pending` |

## Admin, auth, user

| Path                          | Method           | Purpose                                              | Notes                                                     |
|-------------------------------|------------------|------------------------------------------------------|-----------------------------------------------------------|
| `/api/auth/site-login`        | `POST`           | Site-wide password gate — accepts `{ password }` (JSON or form) and issues an HMAC-signed `mh_site_auth` cookie | Edge runtime · timing-safe compare against `SITE_PASSWORD` · bypassed by `src/middleware.ts` |
| `/api/auth/site-logout`       | `POST`           | Clear the `mh_site_auth` cookie                      | Edge runtime · works without JS                            |
| `/api/auth/signup`            | `POST`           | Dev-only sign-up with admin-email elevation          | Unreachable on `AUTH_PROVIDER=oidc`                       |
| `/api/auth/magic-link`        | `POST`           | Dev-only magic-link sender                           | Returns 200 regardless to avoid leaking account existence |
| `/api/auth/forgot-password`   | `POST`           | Dev-only password-reset trigger                      | Out of scope on EEA OIDC                                  |
| `/api/user/export`            | `GET`            | GDPR Art. 20 — download my data                      | JSON bundle                                               |
| `/api/user/delete-request`    | `POST`, `DELETE` | GDPR Art. 17 — request / cancel deletion             | 30-day grace · audited                                    |
| `/api/user/preferences`       | `GET`, `PUT`     | Per-user UI preferences (theme, density, …)          | Backs `/profile/preferences` (#5)                         |
| `/api/admin/users`            | `GET`, `POST`    | Admin-only user management                           | Audited                                                   |
| `/api/admin/retention`        | `POST`           | Admin-triggered retention-purge run                  | Audited                                                   |

## Cross-module / User Space

| Path                                  | Method                          | Purpose                                                       |
|---------------------------------------|---------------------------------|---------------------------------------------------------------|
| `/api/global-search?q=`               | `GET`                           | ⌘K palette fan-out across References / Scenarios / News / Policies / Codes (#2) |
| `/api/context-drawer?kind=&id=`       | `GET`                           | Related-items lookup for the cross-module drawer (#6)        |
| `/api/workbench`                      | `GET`                           | Aggregated dashboard counters for `/profile/workbench` (#1)  |
| `/api/workspaces`                     | `GET`, `POST`                   | List + create team workspaces (#3)                            |
| `/api/workspaces/[id]/items`          | `GET`, `POST`, `DELETE`         | Workspace items CRUD                                          |
| `/api/workspaces/[id]/members`        | `GET`, `POST`                   | Workspace member listing + invite                             |
| `/api/collections`                    | `GET`, `POST`                   | Personal cross-module folders (#13)                           |
| `/api/collections/[id]/items`         | `GET`, `POST`, `DELETE`         | Items inside a collection                                     |
| `/api/text-annotations`               | `GET`, `POST`, `DELETE`         | Inline annotations on any text view (#17)                     |
| `/api/artefact-history`               | `GET`, `POST`                   | Polymorphic change-history audit log (#20)                    |
| `/api/contributors`                   | `GET`                           | Public leaderboard for opted-in users (#18)                   |
| `/api/assistant`                      | `POST`                          | Context-grounded AI chat (#11) · 503 if no LLM key            |

## Aux / beta / misc

| Path                         | Method | Purpose                                                    |
|------------------------------|--------|------------------------------------------------------------|
| `/api/climada`               | `GET`  | CLIMADA impact-chain data (beta, M·07)                     |
| `/api/brussels-bulletin`     | `POST` | Brussels Bulletin weekly digest generator (beta, M·11)     |
| `/api/maritime-aviation`     | `GET`  | Shipping & aviation fuel-route data (beta, M·08)           |
| `/api/custom-posts`          | `GET`, `POST`, `DELETE` | Custom short posts / notes                  |
| `/api/media-monitoring/*`    | *various* | GDELT-backed media monitoring (beta, M·10)              |
| `/api/doi-lookup`            | `GET`  | Legacy alias of `/api/resolve-doi`                         |

## Expected authentication

- Every route assumes an authenticated caller unless specifically
  noted above. Today the identity is carried by a Supabase Auth
  session (JWT). In the EEA-ready target, `AUTH_PROVIDER=oidc`
  flips the same routes to an OIDC session cookie set at the EU
  Login callback.
- Admin routes additionally check membership of the allow-list
  supplied through the `ADMIN_EMAILS` environment variable
  (`src/lib/admin-emails.ts`). In the EEA-ready target, admin
  status is derived from an OIDC `groups` claim (EEA security
  group) so the list doesn't need a redeploy to change.
- Webhook routes (`/api/inbound-email`) use shared-secret HMAC.
- No route on this list requires a hardcoded API key; every
  external credential (Supabase service role today, Azure OpenAI,
  and — once the Copilot path is built — the M365 Copilot Graph
  app) is resolved server-side from environment variables held
  in the hosting partner's secret store.
