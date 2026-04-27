# MethodHub

Internal research workspace for the Secretariat of the European
Scientific Advisory Board on Climate Change (ESABCC). Built and
maintained by CCE5. Packaged to run on EEA infrastructure — not on
Vercel in production.

This README is a quick overview. Every section links into the
password-gated [documentation site](https://esabccmethodhub.vercel.app/docs/),
which is the single source of truth.

## What is MethodHub?

A Next.js 14 application that bundles the Secretariat's day-to-day
research tooling — reference management, scenario data, news
monitoring, EU policy tracking and content analysis — behind a single
sign-in. Five production modules ship in `src/`; eight experimental
modules sit unrouted in `beta/` and are pulled into production once
the science team signs off.

Read more:
[What is MethodHub?](https://esabccmethodhub.vercel.app/docs/overview/what-is-methodhub/) ·
[The five modules](https://esabccmethodhub.vercel.app/docs/overview/the-five-modules/) ·
[Beta parking lot](https://esabccmethodhub.vercel.app/docs/overview/beta/) ·
[FAQ (non-technical)](https://esabccmethodhub.vercel.app/docs/FAQ-NON-TECHNICAL/).

## The five production modules

| # | Module | What it does | Docs |
| --- | --- | --- | --- |
| M·01 | Reference Manager | Shared bibliography with PDF ingestion and tagging. | [reference manager](https://esabccmethodhub.vercel.app/docs/modules/references/) |
| M·02 | Data & Scenarios | Climate scenario datasets and chart builders. | [data & scenarios](https://esabccmethodhub.vercel.app/docs/modules/scenarios/) |
| M·03 | Secretariat News | Curated daily climate-policy news feed. | [news feed](https://esabccmethodhub.vercel.app/docs/modules/news-feed/) |
| M·04 | EU Policy Navigator | Search and timeline over EU climate legislation. | [policy navigator](https://esabccmethodhub.vercel.app/docs/modules/policy-navigator/) |
| M·05 | Content Analysis | LLM-assisted analysis of long documents. | [content analysis](https://esabccmethodhub.vercel.app/docs/modules/content-analysis/) |

Module index: [modules overview](https://esabccmethodhub.vercel.app/docs/modules/).

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

For anything beyond a local demo — running it on EEA infrastructure,
wiring up the AI layer, GDPR posture — start with
[deployment](https://esabccmethodhub.vercel.app/docs/infrastructure/deployment/)
and [tech stack](https://esabccmethodhub.vercel.app/docs/infrastructure/tech-stack/).

## Infrastructure

MethodHub is packaged for self-hosted deployment on EEA infrastructure.
The Vercel deployment exists only to host this documentation site and a
public demo; the production target is a single Docker host inside the
EEA estate, with Postgres on Supabase-compatible storage and an LLM
layer that can be pointed at three different back-ends depending on the
unit's procurement situation.

* [Infrastructure overview](https://esabccmethodhub.vercel.app/docs/infrastructure/) — the picture in one page.
* [Stewardship model](https://esabccmethodhub.vercel.app/docs/infrastructure/stewardship/) — who owns what after handoff.
* [Deployment on EEA](https://esabccmethodhub.vercel.app/docs/infrastructure/deployment/) — Docker, env, secrets, CI.
* [AI layer — three paths](https://esabccmethodhub.vercel.app/docs/infrastructure/ai-layer/) — hosted, EEA-internal, on-prem.
* [Copilot — technical deep-dive](https://esabccmethodhub.vercel.app/docs/infrastructure/copilot/).
* [Tech stack](https://esabccmethodhub.vercel.app/docs/infrastructure/tech-stack/) — Next.js, Postgres, MkDocs, the lot.
* [Data & GDPR](https://esabccmethodhub.vercel.app/docs/infrastructure/data-gdpr/) — what's stored, what isn't, retention.

## Vision and roadmap

MethodHub is positioned as a blueprint for other EEA units, not just a
tool for the ESABCC Secretariat. The vision pages capture the longer
arc: where the modules are heading, what the user-space layer adds on
top, and the open brainstorms that haven't yet hardened into roadmap
items.

* [Blueprint for EEA units](https://esabccmethodhub.vercel.app/docs/vision/blueprint/).
* [Roadmap](https://esabccmethodhub.vercel.app/docs/vision/roadmap/).
* [User Space](https://esabccmethodhub.vercel.app/docs/vision/user-space/).
* [Brainstorm — 20 module improvements](https://esabccmethodhub.vercel.app/docs/vision/brainstorm-modules-ux-userspace/).
* [Brainstorm — professional UX for the five modules](https://esabccmethodhub.vercel.app/docs/vision/brainstorm-pro-ux-five-modules/).
* [Brainstorm rollout TODO](https://esabccmethodhub.vercel.app/docs/vision/brainstorm-rollout-todo/).

## Reference

* [API reference](https://esabccmethodhub.vercel.app/docs/reference/api/) — every route under `src/app/api/`.
* [Scripts reference](https://esabccmethodhub.vercel.app/docs/reference/scripts/) — the pipelines and IT handoff kit under `scripts/`.
* [Design system](https://esabccmethodhub.vercel.app/docs/reference/design-system/) — tokens, components, ESABCC palette.

## Documentation

The full documentation — five-module deep-dives, infrastructure,
vision, deployment, GDPR and tech stack — ships as a subpage of the
MethodHub itself, hosted on Vercel at:

**<https://eu-climate-policy.vercel.app/docs/>**

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
