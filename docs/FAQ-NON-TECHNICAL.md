---
title: MethodHub — FAQ for non-technical staff
---

# MethodHub — FAQ for non-technical staff

*A plain-language guide to what the tool is, how it's built, and what we
ask of the EEA. Every technical term is unpacked as it first appears.
No prior software knowledge assumed.*

> **Audience.** Secretariat colleagues, EEA managers, peer EEA units
> evaluating the pattern, DPO, and anyone doing an internal review. If
> you are a developer, skip this and read the main docs site.

---

## Part 1 — The big picture

### 1. What is MethodHub, in one paragraph?

MethodHub is an **internal research workspace** designed for the
Secretariat of the **European Scientific Advisory Board on Climate
Change (ESABCC)**. Once properly deployed and adopted, the intent is
that it becomes part of the Secretariat's daily toolkit: bringing
into one place the activities that today are spread across Word
documents, shared drives, EndNote libraries, and a dozen public
websites — managing references, exploring climate data and scenarios,
following policy news, navigating EU climate laws, and doing
qualitative coding of policy text. Think of it as "Google Docs +
EndNote + a climate-data browser + a policy tracker, but private,
EU-hosted, and purpose-built for the Secretariat". It is currently a
developed prototype; roll-out to users is the next step after the
EEA hosting conversation lands.

### 2. Is it a public website?

No. **MethodHub is an internal tool.** The intended audience is the
ESABCC Secretariat: once deployed, members will use it to manage
references, explore data, follow news, and analyse policy text. The
source code lives in a public repository on GitHub (see Q10), but
the running application is intended to live on EEA infrastructure,
behind EU Login, so nothing the Secretariat writes in MethodHub
leaves that environment.

### 3. Does anything in MethodHub constitute official Board advice?

No. MethodHub is designed as a **working tool**, not a publication
channel. Board advice comes out through the Board's formal
publications. MethodHub is intended to help the Secretariat prepare
that advice faster and more transparently, but any outputs produced
inside it are working drafts until the Board signs off through its
normal process.

### 4. What are "the six modules"?

MethodHub v1.0 ships with five focused areas:

1. **Reference Manager** — a searchable literature library with
   one-click DOI lookup and a Word add-in for inline citations.
2. **Data & Scenarios** — Eurostat indicators alongside the IPCC and
   IIASA scenario databases, all in one chart.
3. **Secretariat News** — a curated climate-policy news feed, an
   automated 24-hour EU briefing, and an AI-written narrative summary.
4. **EU Policy Navigator** — a network map of EU climate laws with
   article-level text and annotation.
5. **Content Analysis** — MAXQDA-style qualitative coding of policy
   texts and references (MAXQDA is a commercial coding tool; this is
   the in-browser equivalent).

All other experimental functionality (energy-system modelling, media
monitoring, the Brussels Bulletin, etc.) is held in a `beta/` folder
within the repository. Those modules exist and are functional, but
are deliberately excluded from the v1.0 release so that the
production scope remains tractable to review.

### 5. Who built it, who will keep building it?

**CCE5.** A small unit inside the EEA. The intent is that, after the
app is handed over for hosting, **CCE5 remains the code owner** —
features, fixes, migrations, and data pipelines continue to ship
from the CCE5 team through the same GitHub repository. That split
(CCE5 ships code, a hosting partner runs the service) mirrors the
pattern the EEA already uses for its Plone stack at
[`github.com/eea`](https://github.com/eea) — code in the open,
services in the EU region. Other arrangements are of course possible;
this is the one the codebase is set up for today.

---

## Part 2 — The tech stack in plain English

Every piece of jargon you'll hear in the docs, explained in one or two
paragraphs. Skip anything you don't need.

### 6. What is Next.js, and why did you pick it?

**Next.js** is a framework for building modern web applications. A
"framework" is a prepackaged foundation that handles the lower-level
infrastructure of a website — page routing, forms, server-side
rendering, asset optimisation — so that the development team can
concentrate on the Secretariat's actual features rather than
reimplementing that infrastructure from scratch.

**Why we selected it.**

- It is built on **React**, currently the most widely adopted
  web-interface toolkit, so relevant documentation, tooling, and
  future engineering talent are abundant.
- It produces a **single self-contained application** ("standalone
  output") that runs as one process, without unusual runtime
  dependencies.
- It supports both static pages and dynamic server code in the same
  project, so every module in MethodHub — a chart, a data API, a
  search page — lives in a single codebase.

Alternatives evaluated — Django (Python), Rails (Ruby), SvelteKit —
each have their merits, but Next.js offers the largest community,
the most streamlined container-deployment pathway, and direct
compatibility with the Microsoft and Copilot integrations we wanted
to keep available as an option.

### 7. What is Docker / a container?

A **container** is a single portable package that bundles an entire
runtime environment — the operating system layer, the application,
every library it depends on, and all its configuration — into one
immutable artefact. **Docker** is the most widely used tool for
building and running containers, and it established the image format
later standardised by the Open Container Initiative (OCI).

**Why it matters for MethodHub.**

- The application behaves identically on a developer's workstation,
  on a test server, and on EEA's production infrastructure, because
  the runtime image is bit-for-bit the same in all three.
- EEA IT is not required to install Node.js, Python, or specific
  library versions on the host. The container runtime executes the
  image; all dependencies are encapsulated inside.
- Any platform that executes OCI-compliant containers — Podman,
  OpenShift, Nomad, or a plain virtual machine — can run MethodHub.
  EEA can use whichever runtime it already operates.

The MethodHub container image is approximately **180 MB**, which is
comparable in size to a single high-resolution video file. It
contains the full application.

### 8. What is Postgres (PostgreSQL)?

**PostgreSQL** (often just "Postgres") is a **database**. A database
is where the app stores everything users create — references they
add, annotations they write, codings they apply, and so on. Postgres
is free, open-source, and the default choice for almost every
serious European public-sector project; it is not owned by a single
company.

**Why Postgres, specifically.**

- Mature, well-documented, used by many EEA systems already.
- Supports "row-level security" (RLS) — the ability to say "user A
  can only see user A's annotations" inside the database itself, so
  a bug in the application can't accidentally leak data.
- Integrates cleanly with the operational tooling EEA IT already
  uses (`pg_dump`, `pg_restore`, `pgBouncer`, and standard
  monitoring agents).

MethodHub talks to Postgres through a thin layer called **Supabase**
during development (see Q12), and directly in production.

### 9. What is Supabase?

**Supabase** is an open-source product that bundles Postgres with
four conveniences — authentication, file storage, realtime updates,
and a REST/GraphQL layer. You can use it as a hosted service (like
Google's, but EU-region), or run it yourself on your own servers.

In MethodHub we use Supabase **during iteration** because it lets a
small team spin up a working database in minutes. For **production
on EEA infrastructure**, the plan is to swap it out for a plain
Postgres + normal file storage + OIDC login. Today the codebase has
typed configuration flags (`DB_PROVIDER`, `AUTH_PROVIDER`,
`STORAGE_PROVIDER` — see `src/lib/db/config.ts`) that declare the
intended selection, but the call sites still import Supabase
directly. Flipping the flags therefore requires finishing the
thin wrapper layer and adding the Postgres / OIDC / S3 branches
— an explicit piece of migration work, not a live one-line switch.
The migration scripts that will back that work live in
`scripts/migrate-to-postgres/`.

### 10. What is GitHub? What is a "repository"?

**GitHub** is a website that stores code and keeps a complete history
of every change to that code. It is built on top of **Git**, the
underlying version-control system created in 2005 for the Linux
kernel. A **repository** (or "repo") is one project's folder on
GitHub. MethodHub's repo lives at `github.com/EUClimateAdvisoryBoard/ESABCCMethodHub`
— today under a personal account, intended to move under an ESABCC
or EEA GitHub organisation later (see Q18).

**What version control actually does, in two sentences.** Every time
a developer saves a meaningful set of changes (a "commit"), Git takes
a snapshot of every file in the project and tags it with who made the
change, when, and why. You can travel back to any previous snapshot,
compare any two snapshots line-by-line, and reconstruct how the
project got to its current state — even years later.

**The everyday workflow we use on MethodHub.**

1. **Branch.** Before modifying code, a developer creates a **branch**
   — an isolated line of development where changes can be tested
   without affecting the version running in production. Branches
   are inexpensive to create and routinely short-lived; a typical
   working day involves several.
2. **Commit.** As the work progresses, the developer saves it as a
   series of commits. Each commit has a short message explaining
   *why* the change was made (not just *what*). Good commit messages
   are the audit trail.
3. **Pull request (PR).** When the work is ready, the developer opens
   a **pull request** on GitHub — a formal proposal to merge the
   branch into the main codebase. The PR shows exactly which lines
   changed, in which files.
4. **Code review.** A second developer reads the PR, leaves
   comments, asks clarifying questions, and requests changes. This
   is the principal quality gate in the workflow: no code is
   merged into `main` without at least one independent reviewer.
5. **Continuous integration (CI).** GitHub automatically runs tests,
   type checks and the container build on every PR (see Q39). If any
   of these fail, the PR is blocked until the developer fixes it.
6. **Merge.** Once reviewed and green, the PR is merged into `main`.
   A new Docker image is built and tagged automatically.

The point of all this, even for a small internal tool:

- **Reviewable history.** Every change is recorded and attributed, so
  six months from now anyone can ask "why did we do X?" and get a
  traceable answer. `git blame` on a single line shows the commit,
  the author, the date, and the PR that introduced it.
- **Safe experimentation.** A branch that does not produce the
  intended result is simply discarded — no residual cost and no
  impact on the running application.
- **Low-friction collaboration.** Multiple CCE5 engineers can work
  on different modules in parallel without interfering with each
  other. When two developers modify the same file, Git performs a
  three-way merge automatically; where the changes are genuinely
  incompatible, Git flags the conflict explicitly rather than
  silently discarding one side.
- **Rollback on demand.** If a release introduces a regression, the
  hosting partner can redeploy the previous Docker image tag — which
  corresponds to a specific commit — within minutes.
- **Issues and planning.** GitHub **Issues** track defects and
  feature requests; **Projects** provides a lightweight kanban view.
  Planning artefacts live alongside the code they describe, rather
  than in a parallel spreadsheet.
- **Standard practice.** The EEA already uses GitHub (`github.com/eea`)
  for its Plone stack, so there is no policy conflict.

### 11. What is OIDC / EU Login?

**OIDC** (OpenID Connect) is the standard technology behind
"Sign in with Microsoft / Google / your work account". **EU Login**
is the European Commission's OIDC service used across EU institutions
for staff sign-in. **Azure AD** (now Microsoft Entra ID) is
Microsoft's equivalent for organisations.

In the target EEA deployment, signing in is done through OIDC: no
MethodHub-specific username/password is created, your existing EU
staff identity logs you in, and when you leave EU Login stops
working and so does your MethodHub access, automatically. Today,
pre-handoff, the running application uses Supabase email/password
auth and is additionally wrapped in a pilot-stage site-wide
password gate; the OIDC branch is scoped but not yet wired into
the sign-in routes.

### 12. What is the "AI layer"?

MethodHub uses AI for a few specific things: summarising the daily
news briefing, suggesting codes in Content Analysis, and producing
abstracts. The actual dispatch code (`src/lib/ai-summary.ts`) picks
between four providers based on which API key is configured:

- **Azure OpenAI EU** — Microsoft-run, LLMs hosted **in EU data
  centres**, per-token billing. This is the primary path we
  anticipate for an EEA deployment.
- **Anthropic** (Claude), **OpenAI** (direct), and **Google Gemini**
  are also supported as alternatives for development and for cases
  where EEA already holds contracts with those providers.

Selection is controlled by a single environment variable
(`LLM_PROVIDER`), or auto-detected from whichever API key is
present. If no key is configured, AI features are disabled and
everything else still works.

A **Microsoft 365 Copilot / Microsoft Graph** path — where every AI
call would be authorised against the signed-in user's own Copilot
seat rather than a service API key — has been scoped but is **not
currently implemented** in the codebase. It remains an option the
architecture could accommodate if EEA chose it, but it would
require new code, not just a config flag.

### 13. What about Microsoft Graph and Copilot?

**Microsoft Graph** is Microsoft's unified REST API for everything
in a Microsoft 365 tenant — mailbox, OneDrive, Teams, and more
recently Copilot. Routing AI calls through Graph would let
MethodHub reuse each user's existing Copilot entitlement instead
of holding a separate API key.

As of today, **no Graph integration exists in the codebase**. There
is no Microsoft Graph SDK in `package.json` and no Graph/Copilot
client in `src/lib/ai-summary.ts`. This path is an option on the
roadmap rather than a feature that is live behind a switch.

### 14. Why is the site password-protected?

The whole MethodHub deployment — both the application and the
documentation under `/docs/` — sits behind a single **password gate
enforced at the edge**. There is no separate StaticCrypt step
anymore; the same gate that protects `/policy-navigator` also
protects `/docs/policy-navigator/`.

Mechanically:

- The password (`SITE_PASSWORD`) is a server-only environment
  variable. It never appears in the JavaScript bundle.
- A small Edge middleware (`src/middleware.ts`) checks every page
  request. If the user is not signed in, they are 302'd to a
  styled `/site-login` page.
- A successful login issues an HMAC-signed, HttpOnly cookie
  (signed with `SITE_AUTH_SECRET`) that lasts 30 days. After that
  the user is signed in for every page in the deployment.
- API routes, the Word add-in's task pane and webhooks have their
  own auth and bypass the gate so they keep working.

This replaces the older PasswordGate React component (which shipped
the password in the JS bundle) and the older StaticCrypt-on-Pages
setup. The long-term plan is still to swap the password gate for
**OIDC / EU Login** at the EEA cutover — at that point each user
signs in with their EEA identity and the cookie carries their `sub`.

### 15. What is MkDocs?

**MkDocs** is a tool that turns a folder of Markdown files into a
polished documentation website. The **MkDocs Material** theme gives
it the clean, searchable, ESABCC-styled look you see at the docs
URL.

### 16. What does "standalone output" mean?

Next.js, by default, produces a website that needs a Next.js-aware
runtime to run. Setting `output: 'standalone'` in the config tells
Next.js to instead bake **everything** (runtime, libraries,
app code) into a single folder that can be launched with
`node server.js` — no special platform required. This is what lets
MethodHub run as a plain Docker container on any EEA host.

### 17. What does "RLS" mean? (Row-level security)

"Row-level security" is a Postgres feature that lets you define, in
the database itself, who is allowed to read or write each specific
row. MethodHub uses RLS so that a user's annotations and codings are
visible only to them (and, where appropriate, to colleagues they
share a workspace with). A bug in the application code cannot
override RLS — the database refuses the query.

---

## Part 3 — Hosting options we've prepared

*Framing note.* Nothing in this section is prescriptive. Everything
that follows is a **starting point** — an operational shape that the
codebase is already wired to support, so it integrates with minimal
friction. If any hosting partner (EEA IT or another operator)
prefers a different operational model, substituting it is a
configuration change rather than a code change.

### 18. What does a reasonable hosting setup look like?

As a baseline we have in mind, three pieces would cover it:

1. **A place to run one container.** Anything that runs standard OCI
   containers — Podman, OpenShift, Nomad, or a plain virtual
   machine — works. The container is ~180 MB and needs about as
   much memory as a small web app (512 MB to 1 GB is plenty).
2. **A Postgres 14+ database** (or any compatible equivalent). The
   hosting partner manages it as they would any other Postgres
   instance — backups, patching, restore. MethodHub just needs a
   connection URL and credentials.
3. **A reverse proxy with a TLS certificate** on an EEA-owned
   domain. Most EEA services already sit behind one (nginx or
   HAProxy); MethodHub aligns with the same operational pattern.

Each of these choices can be swapped for whatever the hosting
partner already prefers — container orchestrator, database engine
variant, TLS terminator — via environment-variable switches rather
than code changes.

### 19. What extensions does the codebase already support?

Of the three optional extensions the design anticipates, the AI
provider path is the only one that is fully switchable at runtime
today. The other two are scaffolded but not yet live.

- **AI provider** — *live*. A single environment variable
  (`LLM_PROVIDER`) routes between Azure OpenAI EU, Anthropic,
  OpenAI, and Google Gemini (`src/lib/ai-summary.ts`). Without
  any key configured, MethodHub's AI features are disabled and
  everything else still works. A Microsoft 365 Copilot / Graph
  path is on the roadmap but not implemented (Q12).
- **OIDC sign-in** — *scaffolded*. The `AUTH_PROVIDER` flag has
  `'oidc'` as a declared value, but only the Supabase Auth branch
  is wired into the actual sign-in, sign-up, and magic-link
  routes (`src/app/api/auth/*`). Turning this on requires
  implementing the OIDC branch, not just flipping the flag.
- **S3-compatible object storage** — *scaffolded*. The
  `STORAGE_PROVIDER` flag exists with `'s3'` as a declared value,
  but `src/lib/references/pdf-storage.ts` currently calls
  Supabase Storage directly with no conditional branch. The S3
  adapter has not yet been written.

In other words: the *shape* of these three extension points is in
place, but only the AI layer is operational end-to-end. The
hosting partner is welcome to propose entirely different choices;
the codebase is structured so those substitutions are a bounded
piece of work rather than a rewrite.

### 20. What the codebase doesn't assume of the hosting partner

Just for clarity on what is *not* implied:

- **No new software on the host** beyond whatever container runtime
  is already in use. Node.js, Python, libraries — all inside the
  container.
- **No access** to Active Directory trees, shared drives, or build
  servers beyond what the hosting partner already uses.
- **No specific monitoring stack.** The operational shape
  MethodHub targets — standard-output logs (JSON-structured in the
  planned state, plain text today), a `GET /api/health` liveness
  endpoint (planned, see Q41 and Q45), and a Prometheus
  `/api/metrics` endpoint (planned) — is compatible with whatever
  monitoring the hosting partner already runs. Some of those
  pieces are still on the pre-handoff hardening list.
- **No ongoing development work.** The intent is that CCE5 keeps
  owning the code and the hosting partner operates the service,
  but this is a proposal — other arrangements are possible.

### 21. How long would the handoff take?

Based on the dry-runs we can do against a staging clone, an
**afternoon** is realistic for a staging environment and a
**working day** for production. The scripts that verify a clean
cutover are in the repo (`scripts/migrate-to-postgres/`) and check
row-for-row that a Supabase database and a self-hosted Postgres are
equivalent. This is the path the codebase is prepared for; other
handoff patterns are of course workable too.

### 22. What happens after handoff if a bug fix or a new feature is needed?

The intended flow: CCE5 ships a change through the GitHub
repository (pull request → review → merge to `main` → new Docker
image tag). The hosting partner pulls the new image tag into the
running environment on their own cadence — for example, weekly for
minor updates, immediately for security fixes. Nothing on the CCE5
side changes after handoff. This is one pattern that works well and
that the codebase supports; nothing about it is rigid.

---

## Part 4 — Data, privacy, GDPR

### 23. Where does user-entered data live?

Wherever the hosting partner stands up Postgres. The design keeps
everything user-entered — annotations, codings, reference library
entries, custom tags — in that one database. The pattern we have in
mind is an EEA-managed Postgres in the EU region, but any compatible
Postgres works. Nothing user-entered is written back to GitHub or to
any third-party cloud.

### 24. What personal data does MethodHub collect?

The minimum needed to know who wrote what. Concretely:

- **Identity** — the email and display name associated with the
  user's account. In the current (pre-EEA-handoff) deployment,
  authentication is handled by Supabase Auth, and email + a
  hashed password are stored by Supabase. The plan for the
  production deployment is to move this to EU Login / OIDC, at
  which point only the identity attributes returned by EU Login
  are stored and no password ever reaches MethodHub; that
  migration is scoped but has not yet landed (see Q9, Q11, Q19).
- **Content a user creates** — references, annotations, codings,
  comments, and the timestamps when they were created or edited.
- **Operational logs** — server-side `console` output containing
  request errors, timestamps, and the occasional diagnostic line.
  These are basic at present; a structured AI-call audit log
  (latency, status code, no prompt text) is planned (retention
  window `app.ai_audit_retention_days` is already defined in the
  schema) but the audit writes themselves have not yet been
  wired into the AI dispatch code.

That's it. No analytics beacons, no third-party trackers, no
cookies beyond the session cookie.

### 25. How is GDPR handled in the code?

Data-protection requirements are addressed as first-class concerns
in the architecture, not retrofitted later. Three mechanisms sit
directly alongside the database schema:

- **Row-level security** (Q17) — the database enforces that a user
  can only see their own annotations / codings / references. RLS
  policies are defined in `supabase/migrations/010_gdpr_rls_hardening.sql`.
- **Retention windows** — stored as Postgres server settings (GUCs)
  read by the helper function `_gdpr_int_setting()` in
  `supabase/migrations/012_gdpr_data_retention.sql`. The DPO can
  tune them without a code change, using `ALTER DATABASE ... SET
  app.<name>_retention_days = N`. Defaults in the schema: activity
  log 365 days, inbound emails 730 days, AI-call audit 90 days,
  admin audit log ~3 years.
- **Right to erasure (Article 17)** — implemented as a two-step
  soft-delete in `supabase/migrations/013_gdpr_account_deletion.sql`.
  A user clicks "Delete account" on their profile page, which POSTs
  to `/api/user/delete-request`; this schedules deletion 30 days
  out (and the user can cancel during that window). A scheduled
  call to `process_pending_deletions()` then cascades through the
  user's rows, deleting owned content and anonymising identity on
  collaborative rows. A companion function
  `purge_expired_personal_data()` enforces the retention windows
  above.

See [`infrastructure/data-gdpr.md`](infrastructure/data-gdpr.md) in
the docs site for the full inventory and for the DPO sign-off
checklist.

**Where this goes for EEA.** The three mechanisms above are all
live today. The EEA-ready target layers two things on top:
(a) the scheduled call to `process_pending_deletions()` and
`purge_expired_personal_data()` runs on the EEA-operated Postgres
cadence (cron / pg_cron / external scheduler), operated by the
hosting partner; and (b) the DPO can trigger both functions
directly against the database without going through the web UI,
using the credentials the hosting partner issues — a pattern
common to EEA's existing Plone systems.

### 26. Is user-entered text sent to an AI provider?

Only when a user explicitly asks for an AI action, and only the
text they chose. The app never sends prompts in the background
without a user-initiated call, unless explicitly enabled (for
example, the daily news summariser, which processes *public* news
articles, not user content). The `AUTO_LLM_SUMMARIZATION_ENABLED`
switch is **off by default** for user-content pathways.

Where the prompt goes:

- **Path A — Azure OpenAI EU.** Microsoft's EU data centres.
  Microsoft's published commitments apply (no training on customer
  data, EU Data Boundary).
- **Path B — M365 Copilot via Graph.** Processed inside the
  organisation's own M365 tenant under whatever DLP and sensitivity-
  label policies that tenant enforces. For an EEA tenant this tends
  to be stronger than Path A operationally.

### 27. Does the news feed pull content from outside the EU?

Yes, but only **public** RSS feeds (European Commission,
Parliament, Carbon Brief, EurActiv, Climate Home News, etc.).
MethodHub downloads their headlines and summaries the same way a
browser or any aggregator would. No user data goes *out* in the
reverse direction.

### 28. Who can see what?

Three permission levels today:

- **Anonymous** — not signed in. Sees nothing.
- **Signed-in user** — can create and edit their own content, read
  what other users have marked as shared.
- **Admin** — a small, named list supplied to the server through
  the `ADMIN_EMAILS` environment variable
  (`src/lib/admin-emails.ts`). On sign-up, any user whose email is
  in that list is persisted with `role = 'admin'` on the
  `profiles` table. Admin actions are recorded to `admin_audit_log`
  via `src/lib/admin-audit.ts`.

There is no "super-admin" escape hatch. The only path to see
another user's private content is either through explicit sharing
by that user, or through the DPO's authorised use of the erasure
or export functions.

**Where this goes for EEA.** Today admin status is derived from
the `ADMIN_EMAILS` environment variable so the list is managed by
whoever operates the container. In the EEA-ready target, sign-in
runs through EU Login / Entra ID (Q11), and the "admin" role is
derived from the OIDC `groups` claim — i.e. membership of an EEA
security group that IT already administers. That removes the
need to restart the container to add or remove an admin, and it
re-uses EEA's existing joiner/leaver process instead of
maintaining a separate list.

---

## Part 5 — Cost, maintenance, vendor lock-in

### 29. What would MethodHub cost to run?

On the baseline setup we have in mind, the running-cost line items
would be:

- **One container host.** Marginal if the hosting partner already
  runs a container platform — the app is small and sits alongside
  whatever else they operate.
- **One Postgres database.** Also marginal if shared Postgres
  capacity is already available.
- **Optional AI costs.** Under Path A (Azure OpenAI EU), per-token
  billing applies. Under Path B (per-user M365 Copilot), the cost
  is absorbed into existing Copilot seats and there is no extra
  subscription for AI.

Notably absent from the design: **no SaaS subscription, no per-user
licence fee, and no managed-platform hosting fee** (for example, no
recurring Vercel or similar PaaS charge). The codebase itself is
open-source and carries no licensing cost. Alternative hosting
choices are of course possible and would carry their own cost
profile.

### 30. What happens if CCE5 is unavailable?

Two backstops.

- The source is in a public GitHub repository with full
  documentation (architecture, deployment, data layer, operational
  scripts). Any competent development team — another EEA unit, a
  contractor, a successor to CCE5 — can pick it up.
- The running app is a plain container against a plain Postgres.
  The hosting partner can keep the service running indefinitely
  even if no new features ship.

### 31. What stops MethodHub from becoming a maintenance burden?

Three deliberate choices in the architecture:

- **Bounded scope.** Six modules are locked for v1.0; all other
  experimental modules are held in `beta/`. The production surface
  area is deliberately constrained.
- **Standard components.** Every technology choice (Next.js,
  Postgres, Docker, OIDC) is an industry-standard, well-documented
  stack. The talent pool that knows these technologies is large and
  structurally stable.
- **No bespoke infrastructure.** The application is a standard OCI
  container. Migration between hosts — including between cloud
  providers — is an operation measured in hours of engineering
  effort, not in multi-week projects.

### 32. Are we locked into Microsoft / Anthropic / any vendor?

No, by design — though the state of that "no" varies by layer.

- **AI provider: live.** A single environment variable
  (`LLM_PROVIDER`) routes between Azure OpenAI, Anthropic, OpenAI
  (direct), and Google Gemini, with auto-detection from whichever
  API key is present (`src/lib/ai-summary.ts`). A Microsoft 365
  Copilot / Graph path has been scoped but is not yet
  implemented.
- **Database / storage / auth: scaffolded.** The `DB_PROVIDER`,
  `STORAGE_PROVIDER`, and `AUTH_PROVIDER` flags are declared in
  `src/lib/db/config.ts`, and migration scripts between Supabase
  and self-hosted Postgres exist in `scripts/migrate-to-postgres/`,
  but the call sites in the application still import Supabase
  directly. Flipping each flag is a bounded piece of wrapper-code
  work, not a purely configuration-level change today.

The important point is that none of these layers is structurally
locked in — the substitutions are regular engineering work rather
than a rewrite. Some substitutions are already a config switch;
others still need the branch-code to be written.

**Where this goes for EEA.** The target EEA deployment uses:
Azure OpenAI EU (or a per-user M365 Copilot path once
implemented) for the AI layer; an EEA-operated Postgres 14+ for
the database; EEA MinIO or an equivalent S3-compatible object
store for PDFs; and EU Login / Entra ID for auth. Getting there
means finishing the OIDC, S3, and Postgres branches behind the
flags that already exist — a bounded piece of pre-handoff
engineering, not a rewrite.

### 33. What is "the blueprint"?

MethodHub is deliberately structured so it can also serve as a
**reference implementation** for other EEA units that may require a
comparable internal workspace — reference management, data
exploration, or document coordination. Forking the repository,
replacing the seed data, and re-skinning the branding is an effort
measured in days rather than quarters. The documentation site
contains a dedicated "Blueprint for EEA units" section with the
fork recipe. Whether another unit adopts this pattern is entirely
at their discretion; the codebase is prepared to support that
conversation if and when it arises.

---

## Part 6 — Why these tools matter: the daily case for the Secretariat

*This section steps back from individual technologies and asks the
broader question: why should a Secretariat of climate scientists and
policy analysts care about tooling at all? The short answer is that
the quality of the Secretariat's advice depends on the quality of
the evidence behind it, and the evidence base is now too large, too
fast-moving, and too distributed to manage with file folders and
email. The longer answer follows.*

### 34. Why does it matter that the Secretariat uses purpose-built tools?

The Secretariat's scientific output is only as reliable as the
underlying evidence trail. Three structural pressures make generic
office tooling inadequate for that task:

- **Volume.** A single advice-cycle routinely touches hundreds of
  academic references, dozens of scenario datasets, and a continually
  expanding corpus of EU legislation. Maintaining this material by
  hand — across Word documents, shared drives, and individual
  EndNote libraries — does not scale, and errors accumulate silently.
- **Traceability.** Scientific advice is expected to be reproducible:
  every claim should be linkable to the reference, dataset version,
  or legal article that supports it. Generic office tools do not
  preserve this chain of evidence reliably.
- **Continuity.** Secretariat staff rotate. Knowledge held only in a
  departing colleague's personal file system leaves with them.
  Purpose-built tooling captures institutional knowledge as
  structured data that outlives any individual tenure.

MethodHub exists to address these three pressures directly by
consolidating references, datasets, policy text, and analysis
workflows into one version-controlled, access-controlled system.

### 35. How does MethodHub improve day-to-day efficiency?

The efficiency gains come from eliminating recurring friction in
tasks the Secretariat already performs, rather than from adding new
capabilities. Representative examples:

- **Reference management.** Adding a paper by DOI populates the
  citation, abstract, and bibliographic metadata in one call to
  Crossref. The Word add-in then inserts a properly formatted
  in-text citation and keeps the bibliography synchronised. Time
  that would otherwise be spent copying metadata by hand is
  recovered.
- **Data exploration.** Eurostat indicators and IPCC / IIASA
  scenario trajectories can be overlaid in a single chart without
  first downloading spreadsheets, reconciling units, and aligning
  time axes manually. A comparison that previously required a
  half-day of data preparation becomes a matter of minutes.
- **Policy navigation.** EU climate legislation is traversed as a
  network of interrelated acts with article-level text inline,
  instead of requiring repeated lookups across EUR-Lex.
- **News triage.** An automated 24-hour briefing, with optional
  AI-generated summaries, replaces the manual scan of multiple RSS
  feeds each morning.
- **Qualitative coding.** Content Analysis provides in-browser
  MAXQDA-equivalent functionality with codings stored centrally, so
  multiple analysts can apply a shared codebook without emailing
  project files back and forth.

Collectively, the design aim is to move the Secretariat's marginal
hour from data wrangling toward analysis and writing.

### 36. Why is it crucial to have MethodHub up and running?

The ESABCC Secretariat operates under fixed publication deadlines
that do not accommodate tooling gaps. Several specific operational
reasons make continuous availability of MethodHub a material
concern rather than a convenience:

- **Advice-cycle continuity.** An advice cycle combines literature
  review, scenario analysis, legal interpretation, and stakeholder
  consultation over a compressed timeline. An interruption in any
  of the supporting workflows propagates directly into the
  publication schedule.
- **Single source of evidence.** If the reference library, the
  scenario data viewer, and the policy navigator are unavailable,
  staff revert to ad-hoc local copies of the same material.
  Divergence between those local copies then has to be reconciled
  manually, which is precisely the failure mode MethodHub is
  designed to prevent.
- **Institutional memory.** Annotations, codings, and curated
  reference collections accumulate value over time. An extended
  outage does not merely pause work; it erodes the ability of the
  Secretariat to build on its prior analysis.
- **External coordination.** The Secretariat interacts with the
  Board, external reviewers, and EEA stakeholders on a regular
  cadence. When shared artefacts (citation lists, annotated legal
  texts, briefing summaries) live in MethodHub, the availability of
  MethodHub becomes part of the coordination surface.
- **Cost of downtime is non-linear.** A few minutes of unavailability
  is inconvenient; several hours during a publication window can
  displace work into evening and weekend hours. The service-level
  expectation therefore has to be treated as a first-class
  operational requirement, not as best-effort.

For these reasons, the hosting arrangement, monitoring, and backup
regime described in Parts 3 and 4 are not incidental — they are
what makes MethodHub usable as the Secretariat's primary working
environment rather than as an occasional aid.

### 37. Why apply mainstream software-engineering practices to an internal tool?

Version control, code review, continuous integration, and
containerised deployment are sometimes perceived as overhead that
is appropriate only for large commercial platforms. In practice,
the opposite is true: these practices are the most effective means
currently available to keep a small-team codebase auditable,
reversible, and transferable. Three concrete justifications apply
to MethodHub specifically:

- **Auditability.** Every line of code is attributable to a commit,
  an author, a date, and a pull request that records the review.
  For a tool that supports a public-sector scientific advisory
  body, this level of traceability is not optional — it is what
  allows the codebase to be scrutinised by an external reviewer or
  a successor team without special access or tacit knowledge.
- **Reversibility.** Continuous integration catches regressions
  before they reach users; tagged Docker images allow any previous
  known-good version to be redeployed within minutes. The
  combination substantially reduces the operational risk of
  shipping changes, which in turn allows the codebase to evolve
  steadily rather than being frozen for fear of breakage.
- **Transferability.** The workflow is intentionally conventional.
  A new engineer joining CCE5, another EEA unit forking the
  blueprint, or an external contractor picking up maintenance all
  encounter the same tooling they would encounter on any
  comparable open-source project. No MethodHub-specific training
  is required to be productive.

The overhead of these practices, measured in engineering hours per
change, is small; the cost of *not* having them — expressed as
lost history, untraceable defects, or dependency on a single
individual — compounds over time.

---

## Part 7 — A deeper technical look

*This section is intended for readers who want more mechanical
detail on how the software-engineering apparatus around MethodHub
actually operates. It remains non-specialist in tone, but goes one
layer below the explanations earlier in the document. Readers with
a purely policy focus can skip to the Glossary.*

### 38. What happens end-to-end when a developer changes the code?

The full life-cycle of a change, from a developer's keyboard to a
running production container, is as follows:

1. **Local edit.** The developer checks out the `main` branch of
   the repository on their workstation, creates a new branch for
   the change (for example `feat/eurostat-cache`), and modifies
   the relevant files.
2. **Local verification.** Before opening a pull request, the
   developer runs the production build locally (`npm run build`)
   and exercises the feature in the running app. A full automated
   test suite is on the roadmap (see Q43) but is not yet in place,
   so local verification is currently hands-on.
3. **Commit and push.** The developer commits the changes in
   logical units, each with a descriptive message, and pushes the
   branch to GitHub.
4. **Pull request.** A pull request is opened against `main`.
   GitHub displays the line-level diff, the commit history, and
   automatically runs the CI pipeline.
5. **CI pipeline.** GitHub Actions runs the `deploy.yml`
   workflow on every PR and every push to `main`. Today that
   workflow installs dependencies and runs `npm run build` — in
   effect, a full production-build smoke test (see Q39). A build
   failure blocks the merge.
6. **Review.** A second CCE5 engineer reviews the diff, leaves
   inline comments where appropriate, and either approves or
   requests changes. Review iterations continue until the reviewer
   approves.
7. **Merge.** After approval and a green CI run, the PR is merged
   into `main`. On pushes to `main`, the separate
   `self-hosted-deploy.yml` workflow (opt-in, runs on an EEA
   self-hosted runner) builds the Docker image and pushes it to
   the configured registry tagged with both `latest` and the
   short commit SHA.
8. **Deploy.** The hosting partner pulls the new image tag on
   their release cadence (for example weekly for routine changes,
   immediately for security patches) and restarts the service. An
   optional deploy-webhook step in `self-hosted-deploy.yml` can
   trigger the rolling restart automatically.

At no point is a change applied directly to the running service
without passing through steps 4 to 7. Protecting `main` so that
PRs cannot merge without a green CI run is a GitHub repository
setting (Settings → Branches → Branch protection rules); this is
the configuration assumed by the workflow, not something the
codebase itself can enforce.

**Where this goes for EEA.** In the EEA-ready target, step 5
fans out into the full CI pipeline described in Q39 (tsc +
eslint + test suite + dependency-vulnerability scan + image
signing), `main` is a protected branch with those checks set as
required, and step 7 publishes the signed image to an
**EEA-operated container registry** rather than a generic one
(`self-hosted-deploy.yml` is already parameterised for this via
the `EEA_REGISTRY` variable). The shape of the process is already
in place; a handful of the individual stages still need to be
wired in before handoff.

### 39. What is continuous integration, and what does GitHub Actions do specifically?

**Continuous integration** (CI) is the practice of running an
automated series of checks against every proposed change, so that
defects are identified within minutes of being introduced rather
than being discovered during release or, worse, in production.

**GitHub Actions** is GitHub's built-in CI platform. The MethodHub
configuration lives under `.github/workflows/`. The relevant
workflows today:

- **`deploy.yml` (main CI).** Runs on every pull request and on
  every push to `main`. Installs the Node.js dependency tree from
  the lock file (`package-lock.json`) and executes `npm run build`.
  This is in effect a production-build smoke test: if the Next.js
  compilation, type-checking, or route generation fails, the PR
  is blocked from merging.
- **`self-hosted-deploy.yml` (opt-in deploy).** Runs on pushes to
  `main` on an EEA self-hosted runner. Builds the Docker image
  from the top-level `Dockerfile`, tags it with the short commit
  SHA and `latest`, pushes both tags to the configured EEA
  container registry, and optionally calls a deploy webhook to
  trigger a rolling restart.
- **Auxiliary workflows.** `daily-updates.yml` refreshes the news
  feed and EUR-Lex policy texts on a cron schedule;
  `gdpr-retention.yml` runs the retention-purge function on
  schedule; `docs.yml` builds and encrypts the MkDocs site (see
  Q14); `deploy-pypsa-service.yml` ships the companion
  energy-system-modelling service; `fetch-esabcc-reports.yml`
  and `fetch-eurlex-branch.yml` handle upstream data refreshes.

Some pipeline stages that the design anticipates are **not yet
wired in** — notably a dedicated `tsc`/`eslint` job, an
automated unit/integration test suite (Q43), a dependency-
vulnerability scan, and image signing. The production `npm run
build` catches compile-time errors and many type errors because
Next.js runs TypeScript as part of the build, but the full
fan-out described earlier in this FAQ's aspirations is
scheduled work rather than live configuration today.

**Where this goes for EEA.** The EEA-ready CI runs, on every PR:
dependency install (cached), `tsc` type-check, `eslint`, the
Vitest unit/integration suite against an ephemeral Postgres
fixture, a container build, and a dependency-vulnerability scan
(for example `npm audit --audit-level=high` or Trivy on the
image). On every push to `main` the image is signed (e.g. with
cosign) and pushed to the EEA registry with the commit SHA as
its immutable tag. Each of these stages is a conventional
GitHub Actions job; finishing them is a short block of
pre-handoff work rather than new architecture.

### 40. How is the codebase organised?

MethodHub is structured as a single repository containing all of
its components — application code, documentation, infrastructure
configuration, and auxiliary tooling. This arrangement is commonly
referred to as a **monorepo**. It simplifies cross-cutting changes
(for example, a schema change that affects both the API and the
user interface) because the whole system can be modified and
reviewed in one pull request.

The principal top-level directories:

- `src/` — the Next.js application itself, further subdivided into
  `app/` (pages and routes), `components/` (reusable UI building
  blocks), `lib/` (shared utility code), and `data/` (static
  reference data).
- `supabase/` and `supabase-schema.sql` — the database schema,
  migrations, and Supabase-specific configuration used during
  development.
- `docs/` — the Markdown sources for the MkDocs documentation site,
  including this FAQ.
- `beta/` — experimental modules deliberately excluded from v1.0
  (see Q4).
- `scripts/` — operational scripts, including the
  Supabase-to-Postgres migration utilities referenced in Q21.
- `word-addin/`, `word-addin-app/`, `outlook-vba/`, `word-vba/`,
  `browser-extension/` — the Microsoft Office and browser
  integrations that complement the main web application.
- `bridge-service/`, `pypsa-service/` — small Python-based
  companion services invoked by specific modules, deployable as
  separate containers where applicable.

The top-level `Dockerfile` and `docker-compose.yml` describe how
these pieces are assembled for local development and for the
production container.

### 41. What is the API layer, and how does it work?

MethodHub exposes its server-side functionality through a RESTful
HTTP API rooted at `/api/`. The implementation uses Next.js's
built-in route handlers, so each API endpoint is a TypeScript
function colocated with the rest of the application code in
`src/app/api/<endpoint>/route.ts`.

Characteristics of the API layer:

- **Typed end-to-end.** Request and response shapes are declared
  as TypeScript types and shared between the server handler and
  the client-side caller. A schema change at the server is caught
  by the type checker at the client in the same pull request.
- **Per-handler authentication.** Every route that touches user
  data checks the caller's session token inside the handler
  itself — typically by calling a helper such as
  `getRequestingUser()` or `verifyAdmin()` — and returns an HTTP
  401/403 if the token is missing or invalid. Today this session
  token is issued by Supabase Auth; the OIDC path is the intended
  production replacement (Q9, Q11) but is not yet wired in. The
  top-level `src/middleware.ts` currently handles CORS only, so
  the 401 check happens at the route, not at the edge.
- **Row-level security at the database.** Even after a request
  is authenticated, the database rejects any query that attempts
  to read or modify rows not owned by the caller (see Q17).
  Authorisation is therefore enforced twice, independently, at
  the application layer and at the database layer.
- **External contracts.** Endpoints consumed by the Word add-in,
  the browser extension, or the Outlook VBA macros live under
  stable, unversioned paths today (for example, `/api/references`).
  Explicit URL versioning (`/api/v1/...`) is not in place; when a
  breaking change is needed, the current practice is to coordinate
  the change across the client and server in the same pull
  request.

A liveness/readiness health endpoint (`GET /api/health`) is named
in this FAQ's design but is **not yet implemented**; adding it is
tracked as a small piece of work before the EEA handoff so that
standard orchestrator probes can use it.

**Where this goes for EEA.** Authentication moves from Supabase
Auth to OIDC / EU Login, with the token check factored out into a
shared `auth()` helper (or, optionally, Next.js middleware) so
that the 401 is returned consistently for any unauthenticated
request. `GET /api/health` and `GET /api/metrics` (Q45) are
added so that Kubernetes / OpenShift / Nomad liveness probes and
Prometheus scrapers in the EEA monitoring stack can plug in
without custom adapters. External contracts stay at their
current unversioned paths unless a breaking change is required,
at which point the change is introduced with a versioned path
(`/api/v1/...`) alongside the existing one for a deprecation
window.

### 42. How do database migrations work?

A **migration** is a small, versioned SQL script that makes a
specific, reversible change to the database schema — for example,
adding a column, introducing a new table, or altering an index. The
complete set of migrations, applied in order, reconstructs the
current schema from an empty database.

In MethodHub, migrations live under `supabase/migrations/` with a
timestamped filename. The workflow is:

- Migrations are written as part of the pull request that
  introduces the feature depending on them. Schema and code
  evolve together and are reviewed together.
- In development, the migration is applied automatically when the
  local Supabase instance is started.
- In production, the hosting partner applies migrations using the
  standard Postgres migration tooling (`psql`, or an equivalent
  wrapper) before deploying the corresponding application image.
- A migration is paired, where feasible, with a "down" script that
  reverses it, so that a problematic release can be rolled back
  at the schema level as well as at the container level.

The migration history is therefore a full, ordered record of how
the schema has evolved, and can be inspected by a DPO or an
auditor as readily as the application code itself.

### 43. What testing is in place?

Honestly: not as much as the design anticipates. An automated
test suite — unit, integration, and end-to-end — is on the
roadmap but is not in place today. There is no Jest, Vitest, or
Playwright dependency in `package.json`, and no `*.test.ts` or
`*.spec.ts` files in the tree. The `"test"` npm script is not
defined.

What *does* exist today:

- **Production build as smoke test.** Every PR and every push to
  `main` runs `npm run build` via `deploy.yml`. Next.js's build
  step performs TypeScript type-checking and route generation,
  so a broken import, a type error, or a missing route is
  caught before merge.
- **Linter on demand.** `npm run lint` invokes `next lint`
  (ESLint with Next.js defaults). It is not currently a blocking
  CI gate.
- **Database-parity smoke checks.** `scripts/migrate-to-postgres/verify-parity.mjs`
  compares row counts between a Supabase and a self-hosted
  Postgres after a migration dry-run, so the cutover to EEA
  Postgres can be verified quantitatively.
- **Container build.** The Dockerfile builds end-to-end in
  `self-hosted-deploy.yml` on pushes to `main`, confirming the
  production image is producible.

Adding a proper test suite — Vitest for unit tests, an ephemeral
Postgres fixture for integration tests against the schema, and
Playwright for a handful of high-value end-to-end flows — is
scheduled as part of the pre-handoff hardening.

**Where this goes for EEA.** In the EEA-ready target, the test
suite is a required check on every PR: unit tests run in
milliseconds against pure functions (citation formatter, DOI
parser, unit-conversion helpers); integration tests spin up an
ephemeral Postgres inside the CI job, apply the migrations, and
exercise the API handlers + RLS policies end-to-end; and a
handful of Playwright scenarios cover the highest-value user
flows (add a reference, apply a code, run a search, request
account deletion). `eslint` and `tsc` run in parallel as blocking
checks. That state is the target configuration for the CI
workflow described in Q39.

### 44. How does the Word add-in communicate with MethodHub?

The Word add-in is a small Microsoft Office extension that runs
inside Word and exposes MethodHub's reference library directly in
the authoring context. Mechanically, it consists of three parts:

- **The add-in manifest.** An XML file loaded by Word that
  declares which task-pane URL to open, which commands to expose,
  and which permissions the add-in requires.
- **The task-pane UI.** A lightweight web page (served by the
  MethodHub application itself) rendered inside Word's embedded
  browser. The user searches the reference library, selects
  entries, and inserts them into the document from this pane.
- **The document bridge.** JavaScript running in the task pane
  uses the **Office.js** API to read and write content in the
  Word document — inserting in-text citations, appending the
  bibliography, and updating existing citations when references
  change.

Authentication does **not** reuse the main web application's
session cookie. Instead, the add-in's task-pane route
(`/word-addin`) is an explicitly public route in the site's
password gate (`SITE_AUTH_BYPASS_PREFIXES` in
`src/middleware.ts`), and the add-in holds its own credentials,
provisioned at install time by EEA IT:

- A **local Bridge token** (`__REFMANAGER_BRIDGE_TOKEN__`)
  injected into the task pane's `window` at bootstrap and sent as
  a `Bearer` header to the local bridge service at
  `http://127.0.0.1:8585` (`word-addin/src/services/api.ts`).
- **Supabase credentials** (`SUPABASE_URL`, `SUPABASE_KEY`) as a
  fallback when the local bridge is not reachable.

If neither path is available, the pane falls back to an offline
reference library and shows a "No connection available" indicator;
no login prompt is presented inside Word.

Bibliographic metadata is exchanged in **CSL-JSON** (the format
that Zotero and most modern reference managers use), which allows
the Secretariat to move reference data between MethodHub and
external tools without lossy conversions.

**Where this goes for EEA.** Once EEA sign-in moves to OIDC /
EU Login (Q11), the add-in reuses the same EU-Login session the
user is already holding in their browser, rather than the
current install-time Bridge token. The concrete change is to
replace the `__REFMANAGER_BRIDGE_TOKEN__` injection with an
OIDC-authorised call to the MethodHub backend (the `/api/references`
surface) using a token obtained through the Office SSO
(`Office.auth.getAccessToken`) flow; the task-pane route stays
publicly reachable (Word needs to load it), but every API call
it makes is then authenticated by the signed-in user's EU Login
identity. The Supabase-key fallback goes away in that target
state.

### 45. How is observability handled (logs, metrics, health)?

The design intent is that a hosting partner can operate MethodHub
using whatever monitoring stack is already in place, without
adopting any MethodHub-specific tooling. Some pieces of the
instrumentation are in place; several are acknowledged gaps that
form part of the pre-handoff hardening list.

What exists today:

- **Standard-output logs.** Server-side code emits log lines via
  `console.log` / `console.error`. These are captured by whatever
  container runtime the hosting partner uses and can be forwarded
  to their existing log aggregator. No personal data, prompt
  content, or user-generated text is written to these logs.
- **Admin audit log.** Events concerning administrative actions
  are recorded separately in the `admin_audit_log` Postgres
  table via `src/lib/admin-audit.ts`, independent of the
  operational log stream.
- **Container signal.** A failing liveness is currently inferred
  from container exit / HTTP failures, rather than from a
  dedicated endpoint.

Not yet implemented (tracked as pre-handoff work):

- **Structured JSON logs.** The plan is to migrate the
  `console.*` calls to a single-line-JSON logger (timestamp,
  severity, correlation id, context fields). A logging library
  (e.g. `pino`) is not yet a dependency.
- **Health/readiness endpoints.** A `GET /api/health` endpoint
  returning HTTP 200 when the process and the database are
  reachable is named throughout this FAQ but is not yet a route
  handler in `src/app/api/health/`.
- **Request correlation IDs.** No middleware currently assigns a
  correlation identifier per request or propagates it to
  downstream calls.
- **Prometheus metrics endpoint.** `GET /api/metrics` in the
  Prometheus exposition format is planned but not yet
  implemented.

In short: the *operational shape* the FAQ anticipates — JSON logs
over stdout, a health probe, a metrics scrape target, per-request
correlation — is a deliberate target, but several of those
components still need to be written before the service is
production-ready for EEA operations. This is one of the main
items on the handoff punch list.

**Where this goes for EEA.** The EEA-ready target: single-line
JSON logs via a small logger (e.g. `pino`) sent to stdout and
picked up by whichever log collector EEA operates (Graylog /
Splunk / Elasticsearch); a `GET /api/health` liveness+readiness
endpoint for Kubernetes / OpenShift / Nomad probes; a
Prometheus-format `GET /api/metrics` for the EEA scraper; and a
correlation-id middleware that assigns an id on every inbound
request and propagates it to downstream calls (Postgres, AI
provider, external APIs). None of these require new
architecture — they are conventional additions to a Next.js
route tree.

### 46. How are secrets and configuration managed?

MethodHub follows the widely adopted "twelve-factor" convention of
reading all environment-specific values from **environment
variables** at startup, rather than from files baked into the
container image. In practical terms:

- **Non-secret configuration** — the base URL, the list of RSS
  feeds, retention windows, feature flags — is supplied either
  through environment variables or through entries in a database
  configuration table that the DPO and administrators can edit
  without redeploying the application.
- **Secrets** — database credentials, the OIDC client secret, the
  AI-provider API key if one is in use — are supplied exclusively
  through environment variables sourced from the hosting
  partner's preferred secret store (for example Kubernetes
  Secrets, HashiCorp Vault, or the platform's native mechanism).
  Secrets are never written to the repository, never logged, and
  never included in the container image.
- **The twelve configuration switches** documented in Parts 3 and
  5 (`DB_PROVIDER`, `AUTH_PROVIDER`, `STORAGE_PROVIDER`,
  `LLM_PROVIDER`, and related) are read at startup from the same
  environment variables, which is what allows the hosting partner
  to substitute providers without modifying any code.

A sample environment file (`.env.local.example`) is committed to
the repository as a template; the real values live only in the
hosting partner's secret store. A separate `.env.example` is
committed under `bridge-service/` for the companion service.

### 47. What security layers protect the running service?

Security is designed in depth, with mechanisms at each layer so
that the compromise of one layer does not immediately expose user
data. Some layers are fully in place; others are partially
implemented and remain on the pre-handoff hardening list. The
honest state today:

- **Transport layer.** All traffic is intended to be served over
  HTTPS, with TLS terminated at the reverse proxy using
  certificates issued and rotated by the hosting partner. No
  app-level TLS terminator is bundled in the container — this is
  correctly the hosting partner's responsibility.
- **Authentication layer.** At present, sign-in uses **Supabase
  Auth** (email + hashed password). In addition, the running
  application is wrapped in a simple site-wide password gate
  enforced at the edge in `src/middleware.ts` (server-only
  `SITE_PASSWORD`; HMAC-signed HttpOnly cookie issued by
  `/api/auth/site-login`) while the site is pre-release. The
  EEA-hosted production target is **OIDC / EU Login** (Q11,
  Q19), which is scoped but not yet wired in.
- **Application layer.** Route handlers currently validate input
  with manual checks (string length, required fields, type
  coercion) inside each handler. A formal schema-validation
  library such as `zod` is **not yet** a dependency. CSRF-token
  middleware on state-changing endpoints is also **not yet** in
  place. Output that will be rendered as HTML is escaped by
  React by default, which covers the most common XSS class.
- **Database layer.** Row-level security (Q17) enforces
  authorisation inside Postgres, so a defect in a route handler
  cannot grant access to rows outside the authenticated user's
  scope. This layer is fully in place.
- **Supply-chain layer.** Automated dependency-vulnerability
  scanning on every PR is **not yet** configured in CI (Q39).
  Dependency updates today rely on GitHub's default Dependabot
  alerts at the repository level.
- **Container layer.** The production image runs as a
  **non-root** user (`nextjs`, UID 1001 in the `Dockerfile`) and
  uses the minimal `node:20-alpine` base (~180 MB total). A
  **read-only root filesystem** is not yet enforced at the
  container-runtime level; it is a hosting-partner flag
  (`readOnlyRootFilesystem: true` or equivalent) to be turned on
  at deploy time.
- **Operational layer.** Administrative actions that could
  affect other users are logged to `admin_audit_log` with the
  actor, the action, and the timestamp (`src/lib/admin-audit.ts`,
  `supabase/migrations/015_gdpr_admin_audit_log.sql`), so any
  privileged operation remains reviewable after the fact.

In short: the database layer, the admin audit trail, the
container user and base image, and the transport-layer
expectation are all in place today. OIDC, `zod` validation, CSRF
middleware, an automated supply-chain scan, and a read-only
root filesystem are the pieces tracked as pre-handoff hardening
before the service is fronted by EEA staff beyond the pilot
group.

**Where this goes for EEA.** The EEA-ready target keeps every
layer above and closes each gap: HTTPS terminated at the EEA
reverse proxy with EEA-issued certificates; sign-in through
EU Login / Entra ID; `zod` schema validation on every route
handler; CSRF middleware on all state-changing endpoints; a
supply-chain scan (e.g. `npm audit --audit-level=high` and
Trivy on the built image) as a required CI check; and the
container run with `readOnlyRootFilesystem: true` in the
orchestrator's pod/security-context settings. The only piece
that remains hosting-partner-operated, by design, is the
reverse-proxy / TLS layer.

---

## Part 8 — Glossary

A one-line definition for every term of jargon used in this FAQ or
in the rest of the documentation. Alphabetical.

- **API.** A programmatic interface one program uses to talk to
  another, usually over HTTPS. MethodHub's own API is the set of
  server endpoints under `/api/...`.
- **Branch.** A named line of development in Git that isolates a
  set of changes from the main codebase until they are ready to
  merge. See Q10.
- **Azure AD / Entra ID.** Microsoft's identity service for
  organisations; handles sign-in and token issuance. OIDC-compliant.
- **Azure OpenAI.** Microsoft's managed hosting of OpenAI's LLMs,
  runnable in an EU region.
- **CCE5.** The EEA unit that builds and maintains MethodHub's code.
- **CELEX.** EUR-Lex's unique identifier for an EU legal act
  (for example, `32023R0857`).
- **Container.** See Q7. A self-contained bundle of an application
  and its dependencies that runs identically on any host.
- **Crossref.** A non-profit consortium that maintains a free API
  for resolving DOIs into bibliographic metadata.
- **CSL-JSON.** A standard JSON shape for bibliographic data,
  used by Zotero and by MethodHub's Word add-in.
- **CI / Continuous Integration.** The practice of running
  automated checks against every proposed change. See Q39.
- **Commit.** An immutable snapshot of the repository at a point in
  time, attributed to an author and accompanied by a message. See
  Q10.
- **Docker.** The most common tool for building and running
  containers.
- **DOI.** Digital Object Identifier — the stable reference used
  by academic publishers (`10.1038/...`).
- **EEA.** European Environment Agency — the EU agency that
  hosts the ESABCC Secretariat.
- **ESABCC.** European Scientific Advisory Board on Climate
  Change — the independent scientific body MethodHub serves.
- **EU Data Boundary.** Microsoft's commitment that, for EU-tenant
  customers, specified services process data only in the EU region.
- **EU Login.** The European Commission's OIDC single-sign-on used
  across EU institutions.
- **EUR-Lex.** The EU's official legal-text repository.
- **GDPR.** General Data Protection Regulation — the EU data-
  protection law that governs how MethodHub handles personal data.
- **Git.** The distributed version-control system on which GitHub
  is built. See Q10.
- **GitHub.** A code-hosting service and the current home of
  MethodHub's source code.
- **GitHub Actions.** GitHub's built-in continuous-integration
  platform; runs the MethodHub pipeline on every pull request.
  See Q39.
- **LLM.** Large Language Model — the AI technology behind
  ChatGPT, Claude, Copilot, Gemini.
- **Migration.** A versioned SQL script that applies a specific
  change to the database schema. See Q42.
- **MkDocs.** The tool that renders the Markdown in `docs/` into
  the searchable password-gated documentation website.
- **Monorepo.** A single repository that contains all of a
  project's components — application code, infrastructure,
  documentation — to simplify cross-cutting changes. See Q40.
- **OCI.** Open Container Initiative — the vendor-neutral standard
  that Docker, Podman and friends all implement.
- **OIDC.** OpenID Connect — the standard for delegated sign-in;
  EU Login is an OIDC provider.
- **Next.js.** See Q6. The web framework MethodHub is built on.
- **Office.js.** Microsoft's JavaScript API for Office add-ins,
  used by the MethodHub Word add-in to read and write document
  content. See Q44.
- **Postgres / PostgreSQL.** See Q8. The database MethodHub uses.
- **Pull request (PR).** A proposed merge of a branch into the
  main codebase, reviewed on GitHub before acceptance. See Q10.
- **RLS.** Row-level security. See Q17.
- **RSS.** An older standard for machine-readable news feeds,
  still supported by most publishers.
- **Site password gate.** See Q14. An Edge-middleware HMAC cookie
  that protects every page of the deployment (app + docs) behind
  one shared `SITE_PASSWORD`. Replaces the legacy StaticCrypt /
  PasswordGate setup.
- **Supabase.** See Q9. Postgres plus conveniences, used during
  iteration.
- **Twelve-factor.** A widely adopted set of conventions for
  building portable, container-friendly services; MethodHub
  follows the relevant subset. See Q46.
- **Word add-in.** A small Microsoft Office extension that puts
  MethodHub's reference library inside Microsoft Word.

