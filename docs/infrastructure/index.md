# Infrastructure

This section answers the operational question: what does EEA IT actually
have to host, and who keeps the code moving afterwards?

- [Stewardship model](stewardship.md) — CCE5 owns the code, EEA IT hosts the service.
- [Deployment on EEA](deployment.md) — the handoff, the container, the reverse proxy.
- [AI layer — three paths](ai-layer.md) — Azure OpenAI · M365 Copilot · none.
- [Copilot — technical deep-dive](copilot.md) — OAuth scopes, code shape, fallback.
- [Tech stack](tech-stack.md) — full dependency inventory, grouped by responsibility.
- [Data & GDPR](data-gdpr.md) — RLS, retention, erasure, audit.

## One-page summary

| Axis             | Today (pre-handoff pilot)                            | EEA-ready target                                                     |
|------------------|------------------------------------------------------|----------------------------------------------------------------------|
| Code             | CCE5 · `github.com/EUClimateAdvisoryBoard/ESABCCMethodHub` · Next.js 14 · Postgres | Same — code stewardship stays at CCE5.                   |
| Running app      | Vercel Frankfurt (`fra1`) + Supabase (EU)            | EEA-managed container · EU region · Docker · **not** Vercel          |
| IT surface       | none — pilot is hosted externally                    | Postgres URL · container host · TLS cert                             |
| Optional         | AI provider switch live (Azure OpenAI · Anthropic · OpenAI · Gemini) | + OIDC · S3 · per-user M365 Copilot (each requires the corresponding branch to be implemented) |
| Migration cost   | —                                                    | One afternoon on a staging clone, verified by parity tests.          |
| Blueprint        | Fork the repo, swap seed data, re-skin — three file edits. | Same.                                                          |
