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
vision, deployment, GDPR and tech stack — is published as a
password-gated site:

**<https://sebastianfra.github.io/MethodHub/>**

The site is encrypted with [StaticCrypt](https://github.com/robinmoisson/staticrypt);
the browser decrypts locally after you enter the passphrase. Ask CCE5
for the current password. Ticking *Remember me* keeps a device signed
in for 30 days. `robots.txt` tells search engines to stay away.

Password rotation and the full threat-model discussion live inside the
docs site under *Docs site → Access*.

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
