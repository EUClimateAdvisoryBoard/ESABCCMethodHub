# MethodHub

Internal research workspace for the Secretariat of the European
Scientific Advisory Board on Climate Change (ESABCC). Built and
maintained by CCE5. Packaged to run on EEA infrastructure — not on
Vercel in production.

This README is deliberately brief. The full documentation is
password-gated; see [Documentation](#documentation) below.

## Repository layout

| Path | Contents |
| --- | --- |
| `src/` | Next.js 14 application — five production modules. |
| `beta/` | Eight experimental modules, intentionally unrouted. |
| `docs/` | Source for the password-gated documentation site. |
| `scripts/` | Data pipelines, migration tooling, IT handoff kit. |
| `supabase/` | Postgres migrations. |
| `Dockerfile`, `docker-compose.yml` | Single-host demo and production build target. |
| `.github/workflows/` | CI, daily pipelines, docs deployment. |

## Quick start (local demo)

```bash
cp .env.local.example .env.local   # edit DB + LLM keys
docker compose up --build
```

Opens at `http://localhost:3000`.

## Documentation

The full documentation — five-module deep-dives, infrastructure,
vision, deployment, GDPR and tech stack — ships as a subpage of the
MethodHub itself, hosted on Vercel at:

**<https://esabccmethodhub.vercel.app/docs/>**

The MkDocs source lives under `docs/` and is built into `public/docs/`
during the Vercel build (see `scripts/build-docs.sh` and the
`vercel-build` script in `package.json`). To preview locally:

```bash
bash scripts/build-docs.sh   # writes to public/docs/
mkdocs serve                 # http://127.0.0.1:8000
```

Not a developer? The non-technical FAQ is shipped as a PDF at the repo
root: [`ESABCC-MethodHub-FAQ-non-technical.pdf`](ESABCC-MethodHub-FAQ-non-technical.pdf).

## Contact

* **Code stewardship (CCE5) — Sebastian Franz.**
  <sebastian.franz@esabcc.europa.eu>
* **About the Board.**
  <https://climate-advisory-board.europa.eu>

Please ask CCE5 before pulling design details from this repository
directly — the password-gated docs site is the single source of truth
for the current architecture.
