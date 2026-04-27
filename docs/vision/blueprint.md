# Blueprint for EEA units

MethodHub happens to serve the ESABCC Secretariat, but **the shape of
the solution is unit-agnostic**. Any EEA unit that needs an internal
workspace to:

- coordinate a reporting process,
- maintain a reference library,
- explore policy text or statistical scenarios, or
- run AI-assisted content analysis,

will face the same constraints: EU sovereignty, GDPR, small team, tight
timeline, limited appetite for third-party services. The pattern —
**Next.js + Postgres + Docker + agentic coding** — answers all of them.

## What makes this a realistic fork target

| Lever                 | How MethodHub sets it up                                                                                  |
|-----------------------|-----------------------------------------------------------------------------------------------------------|
| Runtime               | One Docker image. No vendor primitives.                                                                   |
| Data layer            | Supabase today; Postgres in the EEA target. `DB_PROVIDER` flag declared; the Postgres branch still needs to be finished before flipping. |
| Auth                  | Supabase Auth today; OIDC tomorrow. `AUTH_PROVIDER=oidc` flag declared; OIDC branch not yet implemented.  |
| Storage               | Supabase Storage today; S3 / MinIO in the EEA target. `STORAGE_PROVIDER=s3` flag declared; S3 branch not yet implemented. |
| LLM                   | Azure OpenAI / Anthropic / OpenAI / Gemini — live via `LLM_PROVIDER`. Per-user M365 Copilot is on the roadmap (not yet implemented). |
| Ingestion             | `scripts/` contains EUR-Lex, Eurostat, IIASA, RSS and Crossref pipelines. Swap the source, keep the shape. |
| Review / QA           | PR templates, agentic coding pipelines, automated multi-agent review passes, self-hosted CI — all in the repo. |
| Docs                  | Per-subsystem READMEs, ERDs, deployment handoffs. Update in the same PR as code.                          |
| Scope lock            | Beta modules live under `beta/modules/`, not behind feature flags. Scope is visible from the file system. |

## Fork-and-reskin, end to end

Start by cloning the repository into a new working directory.

```bash
git clone https://github.com/SebastianFra/MethodHub your-unit-hub
cd your-unit-hub
```

### 1. Swap seed data to your unit's domain

```bash
$EDITOR src/data/references.ts
$EDITOR src/data/policies.ts
$EDITOR src/data/scenarios.ts
$EDITOR src/data/newsfeed.ts
```

### 2. Update identity

Edit unit name, owner and description in the README; the `<title>` and
theme colours in the root layout; and the logo plus module list in the
site header.

```bash
$EDITOR README.md
$EDITOR src/app/layout.tsx
$EDITOR src/components/SiteHeader.tsx
```

### 3. Stand it up locally

```bash
cp .env.local.example .env.local
docker compose up --build
```

Anything else (module names, copy, what shows up in the beta parking
lot) is a series of small follow-up PRs. The infrastructure shape does
not change.

## Agentic coding in the loop

Because the review and iteration loop is itself tracked in the repo
(agentic coding sessions, multi-agent review passes, automated
security-review workflows), a forking unit inherits not just the code
but the **cadence**.
Two engineers and an agentic coding setup can keep a MethodHub-sized
product shipping without an army of maintainers — which is the only
way an internal tool stays alive inside a small unit.
