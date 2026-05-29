# Vision

This section is split into a few focused pages.

- [Blueprint for EEA units](blueprint.md) — why this stack generalises and how to fork it.
- [Roadmap](roadmap.md) — the next six months, intent (not commitment).
- [Brainstorm — 20 module improvements](brainstorm-modules-ux-userspace.md) — the depth / UI&nbsp;UX / user-space ideas backing the latest branch.
- [Brainstorm — professional UX for the five modules](brainstorm-pro-ux-five-modules.md) — third-pass UX brief grounded in current interaction-design literature (Doherty, Fitts, Hick, WCAG 2.2, epistemic-UI).
- [Rollout TODO](brainstorm-rollout-todo.md) — migrations + env vars + verification checklist for the brainstorm branch.
- [User Space](user-space.md) — the cross-module surfaces an analyst lives inside (Workbench, Inbox, Workspaces, Collections, Preferences).

## TL;DR

- **Today:** prototype on Vercel · Supabase · Anthropic.
- **Near-term target:** Docker container on EEA infrastructure ·
  EEA Postgres · OIDC via EU Login · either **Azure OpenAI EU** or
  **per-user M365 Copilot via Microsoft Graph**.
- **Stewardship:** CCE5 owns the code. EEA IT operates the service.
- **Scope lock:** six production modules. Eight beta modules parked
  under `beta/modules/` and unrouted by the live app.
- **Blueprint:** the same stack is the recommended shape for any EEA
  unit that needs an internal research / reporting workspace.
