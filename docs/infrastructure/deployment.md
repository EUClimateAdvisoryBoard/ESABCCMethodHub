# Deployment on EEA

This page is the at-a-glance reviewer's view; companion pages under
[`infrastructure/`](index.md) cover the stewardship model, tech stack,
and AI layer in more depth.

## Topology

<figure class="mh-figure mh-figure--wide" markdown>
<img src="../../assets/fig-deployment-topology.svg" alt="Production deployment topology on three swim lanes. Client network at the top (browser, Word), EEA infrastructure in the middle (TLS edge, app container, Postgres, storage, OIDC), external services at the bottom (AI layer, public EU data).">
<figcaption><span class="mh-figure__num">Figure 4.</span> Production topology on three swim lanes. Solid edges are required flows; dashed edges are optional extensions controlled by environment switches. The central <code>methodhub-app</code> container is the only piece CCE5 ships; everything else is a service EEA IT operates or an external source.</figcaption>
</figure>

## What EEA IT has to provide

<div class="mh-callout" markdown>
<p class="mh-callout__kicker">Required · minimum set</p>

| Item                        | Purpose                                   | Where it plugs in                                                                 |
|-----------------------------|-------------------------------------------|-----------------------------------------------------------------------------------|
| Postgres 14+ URL            | App data · RLS · GDPR retention           | `DATABASE_URL` · `DB_PROVIDER=postgres`                                           |
| Container host              | Runs the Next.js standalone image         | Podman · OpenShift · Nomad · plain VM                                             |
| Reverse proxy + TLS cert    | TLS termination · HSTS · EEA domain       | Fronts the container on `:3000`                                                    |
</div>

<div class="mh-callout" markdown>
<p class="mh-callout__kicker">Optional · pick what applies</p>

| Item                        | Purpose                                                  | Where it plugs in                                                  |
|-----------------------------|----------------------------------------------------------|--------------------------------------------------------------------|
| OIDC client (EU Login)      | Replaces Supabase Auth                                   | `AUTH_PROVIDER=oidc` + standard OIDC env vars                      |
| S3-compatible bucket        | Replaces Supabase Storage for reference PDFs              | `STORAGE_PROVIDER=s3` + bucket + credentials                       |
| Azure OpenAI EU endpoint    | AI summaries via service subscription                    | `LLM_PROVIDER=azure` + `AZURE_OPENAI_*`                            |
| **M365 Copilot (per-user)** | AI summaries via each user's own licence (no service key)| `LLM_PROVIDER=copilot-graph` — see [Copilot deep-dive](copilot.md) |
</div>

## What stays at EEA vs. what stays at CCE5

- **Stays at EEA.** Everything the app runs against: the DB, the
  bucket, the reverse proxy, the OIDC client, optionally Azure OpenAI
  or the Copilot app registration.
- **Stays at CCE5.** Everything upstream of the image build: source,
  PRs, CI, release notes, migration authorship, feature work.

## Deep dive

??? abstract "Dockerfile — multi-stage layout"
    The `Dockerfile` is three stages:

    1. **`deps`** — `node:20-alpine`, installs production dependencies
       against a frozen `package-lock.json`. Cached between builds.
    2. **`builder`** — same base image, runs `next build` with
       `output: 'standalone'`. Produces `/app/.next/standalone`,
       `/app/.next/static`, and `/app/public`.
    3. **`runner`** — `node:20-alpine`, non-root `nextjs` user,
       `WORKDIR=/app`. Copies only the three folders above, plus the
       minimal `server.js`. Final image is ~180 MB.

    The runner's `ENTRYPOINT` is literally `node server.js`. No shell
    wrapper, no init system, no sidecar. That keeps the
    container's attack surface and cold-start time minimal.

??? abstract "Health check and graceful shutdown"
    **Target state for EEA** — some of these are not yet in the
    code and are on the pre-handoff hardening list:

    - `GET /api/health` — *not yet implemented.* The target is a
      200-OK endpoint that checks DB connectivity (`SELECT 1`) and
      reports the schema version so EEA IT can point a container
      orchestrator's liveness probe at it. Today, health is
      inferred from process exit / HTTP failure.
    - `SIGTERM` graceful shutdown — today we rely on Next.js's
      default process-exit behaviour; a custom `SIGTERM` trap that
      drains in-flight HTTP requests cleanly is target work
      before the EEA handoff.
    - Request-ID correlation (`x-request-id` header) — *not yet
      implemented.* The target is a small middleware that assigns
      a correlation id to every inbound request and attaches it
      to every outgoing log line and downstream call.

??? abstract "Environment-variable reference"
    The full list lives in `.env.local.example`. The
    production-critical ones:

    ```
    # Data layer
    DB_PROVIDER=postgres
    DATABASE_URL=postgres://user:***@pg.internal.example:5432/methodhub
    PGSSLMODE=require          # recommended for EEA Postgres

    # Auth
    AUTH_PROVIDER=oidc
    OIDC_ISSUER_URL=https://login.microsoftonline.com/<tenant>/v2.0
    OIDC_CLIENT_ID=...
    OIDC_CLIENT_SECRET=***     # in IT secret store
    OIDC_REDIRECT_URI=https://methodhub.example/api/auth/callback

    # Storage
    STORAGE_PROVIDER=s3
    S3_ENDPOINT=https://minio.internal.example
    S3_BUCKET=methodhub-refs
    S3_ACCESS_KEY_ID=...
    S3_SECRET_ACCESS_KEY=***

    # AI layer (see the Copilot deep-dive for more)
    LLM_PROVIDER=azure
    AZURE_OPENAI_ENDPOINT=https://<resource>.openai.azure.com
    AZURE_OPENAI_API_KEY=***
    AZURE_OPENAI_DEPLOYMENT=gpt-4o-mini
    ```

??? abstract "Postgres tuning for MethodHub"
    The schema is read-mostly with sporadic writes from annotation,
    content-analysis coding and news ingestion. Recommended
    `postgresql.conf` tweaks (shipped as
    `scripts/it-handoff/postgresql.conf.recommended`):

    ```
    shared_buffers          = 25% of system RAM
    effective_cache_size    = 75% of system RAM
    work_mem                = 32MB
    maintenance_work_mem    = 256MB
    wal_compression         = on
    random_page_cost        = 1.1       # SSD
    effective_io_concurrency= 200       # SSD
    max_connections         = 100       # behind pgBouncer
    ```

    Behind **pgBouncer** in transaction-pooling mode, so the app
    connection-pool's apparent connection count stays under 20 even
    when 100 users are active.

## One-afternoon cutover

Migrating from the current Supabase setup to EEA Postgres is
verified by
[`scripts/migrate-to-postgres/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/scripts/migrate-to-postgres):

```
dump.sh            → pg_dump the live Supabase DB
restore.sh         → psql into EEA Postgres
verify-parity.mjs  → row-count diff per table, fails on any mismatch
                     (run via: npm run db:verify-parity)
smoke-test.mjs     → end-to-end happy path
                     (run via: npm run db:smoke)
```

Running those four, plus the schema bootstrap in
[`scripts/it-handoff/01-apply-schema.sh`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/scripts/it-handoff/01-apply-schema.sh),
is the intended cutover. This is the path the codebase is
prepared for; the scripts are the source of truth for exact
filenames (the older `*.js` names in earlier drafts of these docs
are out of date).

!!! warning "Post-cutover: decommission the prototype Supabase project"
    The prototype runs on a hosted Supabase project whose URL
    (`NEXT_PUBLIC_SUPABASE_URL`) is, by design, public — it ships in
    the browser bundle, so the security boundary is the anon key plus
    **Row-Level Security**, never the URL. Two things to confirm once the
    EEA Postgres cutover is verified:

    1. **Decommission or lock down the prototype project.** Once traffic
       moves to EEA infra, pause/delete the Supabase project (or at least
       rotate its keys) so the public URL no longer points at a live
       database.
    2. **Confirm RLS is enforced on every table** for as long as the
       prototype stays reachable. The service-role key bypasses RLS and
       must remain server-side only (it is *not* committed to this
       repository).

    Because this repository is public, never paste a live project URL +
    anon key into an issue, commit, or doc without confirming RLS is on.

### Bootstrapping a fresh database

Two paths apply migrations to an empty Postgres:

1. **Stepwise.** `01-apply-schema.sh` walks
   `supabase/migrations/*.sql` in order. This is what production-
   like deployments use, because each migration is independently
   reviewable and re-runnable.
2. **One-shot.**
   [`supabase/combined_migrations.sql`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/supabase/combined_migrations.sql)
   concatenates `001..028` in order so a fresh database can be
   brought up by pasting a single file into the SQL editor of a
   hosted Supabase project. Useful for local dev and for the
   "spin up a parallel staging instance" flow.

### Migration-order caveat — `library_members` before `libraries` policies

A subtle ordering rule landed in commit
[`cec3aeb`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/commit/cec3aeb):
`library_members` must exist **before** the RLS policies on
`libraries` are created, because the `libraries` policies read
membership from `library_members` to decide whether a row is
visible. Both stepwise apply and the combined file already do
this in the right order; if you write a custom bootstrap script,
preserve it.
