# Working conventions for MethodHub

Distilled from roughly 490 PRs of work on this repository. These are the
standing conventions — follow them on every task unless the request
explicitly overrides them. British English throughout ("programme",
"modelled"), plain complete sentences, in code comments and prose alike.

## What this repository is

Internal research workspace for the ESABCC Secretariat (EU Climate
Advisory Board). Next.js 14 App Router + Tailwind + Supabase/Postgres,
packaged for self-hosted EEA deployment; Vercel hosts only the docs site
and demo. Eight production modules (M·01–M·08) live in `src/`;
experimental modules (M·09 upwards) live in `beta/modules/` and are
routed through one-line re-export stubs in `src/app/beta/`. `docs/` is
the MkDocs source for the published docs site; `docs-internal/` is the
private QA ledger (never part of the docs site). `scripts/` holds the
data pipelines. Owner and sole human steward: Sebastian Franz (CCE5).

## Ground rules — data and honesty

These are the non-negotiables that every past QA pass enforces:

1. **No invented numbers or quotes.** Every figure and quote must be
   traceable to a source with a locator (page, table, article, CELEX).
   If support cannot be found, drop the entry — coverage gaps are
   acceptable, fabrication is not.
2. **Quotes are verbatim substrings of the source** (enacting terms
   only for legislation), ≤ ~60 words, ellipses allowed. Where a build
   exists, quotes are machine-revalidated as source substrings
   (`npm run build:policy-targets`). Fix wrong quotes by re-extracting
   from the source, never by hand-editing the text.
3. **Cite EUR-Lex consolidated versions**, not the original acts.
   Replacing stale source texts is itself a tracked work item; when a
   text is pre-consolidation, say so explicitly in a caveat.
4. **Everything AI-compiled is labelled as such** — file-header comment
   plus an orange caveat box in the UI: "AI-compiled — pending human
   verification" (or "pending Secretariat verification"). Commit bodies
   carry the same line.
5. **Uncertain values are flagged in prose, never silently dropped or
   asserted.** "Unable to fully verify — left unchanged" is a valid and
   expected outcome; record it.
6. **Hunt silent failures.** Fetches that return 200-with-nothing and
   report "up to date", fault-tolerant sums that quietly drop legs,
   Supabase errors indistinguishable from an empty DB — these have
   bitten repeatedly. Make failure loud and distinguishable from empty.
7. **Corrections are carried, not re-applied by hand.** Curated
   datasets regenerate from source + overrides files
   (e.g. `scripts/policy-targets-overrides.json`) where every entry has
   a stable content-hash id and a per-entry prose `reason` tagged with
   the pass (`[fact-check 2026-07]`, `[human review 2026-07]`). Any
   removal must be reversible by deleting one entry and rebuilding.
8. **Classification is deterministic**, not agent judgement: word-boundary
   vocabularies plus explicit veto phrases for known traps, reproducible
   by the build script.
9. **Steel-man both sides.** In any conflict/alignment analysis, genuine
   alignments must be recorded so the assessment is even-handed.

## QA rhythm — docs-internal/

`docs-internal/` is an append-only ledger: one dated markdown file per
QA pass, named `<topic>-<kind>-<YYYY-MM[-DD]>.md` (kinds: `factcheck`,
`human-review`, `data-provenance-audit`, `source-refresh`,
`functional-review`). New passes supersede, never overwrite, old ones.

- **Every substantive data or report change is followed by a separate
  fact-check pass** with its own dated file and commit.
- Fact-checks use explicit verdict bands — CONFIRMED (≤2 %),
  REVISION (2–5 %), WRONG (>5 %), NO SOURCE YEAR, NOT CHECKABLE — and
  record what each check proves (a trend splice cannot confirm a
  level), plus a section on what the pass deliberately did *not* cover.
- **A fact-check pass changes no stored values.** It produces decisions
  for the named owner (sector lead / Secretariat); corrections land in
  a separate, explicit correction pass via the overrides mechanism.
- Human-reviewer mark-up is generalised into named rules (NT-1…, DUP,
  FIX), each with the reviewer's verbatim example, then applied to every
  comparable row — with a mandatory "where the rules were deliberately
  not applied" section.
- Audits always include a "verified correct — no action" list; later
  work must not re-touch anything on it.
- Working notes stay in the session scratchpad; only the distilled
  audit is committed.

## Multi-agent work packages

Big jobs decompose into WP0…WPn under a `work-packages/` folder (module
or `docs-internal/`), following the pattern of
`beta/modules/ets-review/conflicts/work-packages/WP0-overview.md`:

- WP0 is the overview: source inventory first, then a file map (one row
  per file → owning WP), then the pipeline (`WP1a ∥ WP1b ∥ WP2 → WP3 →
  WP4 → WP5 verify/commit`).
- Each WP brief is self-contained: mission, **disjoint write-set** (safe
  to run in parallel), prioritised tasks (P0 must / P1 should / P2
  cheap-nice), constraints, acceptance criteria that are runnable
  (greps, `npx tsc --noEmit`).
- Sub-agents edit only their write-set, keep/add source citations on
  every fact edit, and **do not commit** — the orchestrator reviews,
  verifies and commits centrally.
- Audits (raw findings with severity, `file:line`, exact current text,
  exact proposed fix, source URL) are separate artefacts; WP briefs cite
  finding numbers rather than restating them.
- Severity scoring uses written 0–3 axis anchors with weights and tier
  cut-offs, defined once in `types.ts`; docs carry only the summary.
- Close with a "deferred backlog — good ideas deliberately not in this
  round" section instead of scope-creeping.

## Beta modules

`beta/README.md` is the canonical prose registry; `src/app/page.tsx`
(`experimentalModules`) is canonical for the M·NN number and home-page
tile; `docs/overview/beta.md` mirrors both. Numbers continue from M·09
upwards (check the registry for the next free number); they are a stable
presentation index, not a routing identifier, and promotion renumbers
nothing.

Adding a module — the canonical minimal set (see M·43, five files):

1. `beta/modules/<slug>/page.tsx` — `'use client'`, doc-comment header
   naming the module, its `M · NN` and its epistemic status, then
   `SiteHeader` + `<main className="mx-auto max-w-[1280px] px-4 py-6
   sm:px-6 sm:py-8">` + `SiteFooter`.
2. `beta/modules/<slug>/model.ts` (computation) and/or `data.ts`
   (curated records, provenance comment block at the top stating the
   documents, page-offset rules and compile date); agent-produced data
   goes in `*.generated.ts`.
3. `src/app/beta/<slug>/page.tsx` — the one-line stub:
   `export { default } from '../../../../beta/modules/<slug>/page';`
   Without it the module is unreachable.
4. One new row in `beta/README.md`: `| <slug>/ | Title | **M · NN**. …
   Why beta: … |`.
5. An `experimentalModules` entry (`code: 'M · NN'`, `title`, `href`,
   2–3 `tags`) — unless the module is a sub-page of an existing hub, in
   which case link it from the parent module page instead.
6. Assets to `public/data/<slug>/…` (screenshots named
   `<doc><page>-<topic>.png`); any extraction script to `scripts/`,
   named in the registry entry so the data is reproducible.
7. Update the mirrors in the same PR: `docs/overview/beta.md` row, and
   the module counts / number ranges in `README.md` and
   `docs/overview/what-is-methodhub.md`. For larger modules add
   `docs/modules/<slug>.md` plus an `mkdocs.yml` nav line
   `"M·NN Title (beta)"`.

Beta modules never appear in `SiteHeader` navigation — home-page ribbon
only. Promotion to production is a `git mv` into `src/app/` plus nav
edits, gated on science-team sign-off; keep shared components, API
routes and pipelines in their production locations so promotion stays a
move, not a refactor. Downloadable masterfiles live at
`public/data/*.xlsx` with an explicit version label ("Masterfile v5")
and a `title` tooltip explaining the tabs; module version identifiers
are per-review-pass counters (v3, v5, v5.1) surfaced in the UI and in
commit subjects. Where a Python reference model exists, the React port
must be in exact numerical parity, defaults quoted in both.

## Design system

Tokens and primitives are the contract — no module invents its own
toast, focus ring, empty-state or spinner.

- Tokens: `--mh-*` custom properties in `src/app/globals.css`; Tailwind
  semantic colours from `tailwind.config.ts` (`primary` #004B7F,
  `secondary` #007B6C, `tertiary` #3D5265 body text, `tertiary-dark`
  headings, `accent.*`, `surface.*`) — not raw hex, except chart series
  palettes, which are declared as a named const near the top of the file
  with a colour-vision-deficiency note.
- Primitives from `src/components/ui/`: `Skeleton` (not spinners),
  `EmptyState`/`ErrorState`/`LoadingState`/`PartialState` (every list,
  chart and panel ships all four), `ToastHost`, `ConfidenceDot`,
  `FilterPill`, `ModeSwitcher` (task verbs, not nouns),
  `ProvenanceChip`; `useUrlState` so every meaningful view state lives
  in the URL; `useOptimisticAction` for saves.
- Numbers use `font-mono … tabular-nums`. Animations respect
  `prefers-reduced-motion`. WCAG 2.2 focus rings via `mh-focus`.
- Beta page hero: uppercase kicker (`Beta module · M · NN · …`) → h1 →
  lede → orange caveat box; stat strip of bordered `bg-grey-50` tiles;
  closing "Caveats & sources" panel rendered from a
  `const SOURCES: { label; url }[]` with `↗` external links.
- Indicator/share units: store percentage series on the 0–100 scale
  (the percent-number scale the fact-checks are based on); the older
  "store as fractions" note in `docs/how-to-access-eurostat-eea-data.md`
  is stale on this point.

## Docs site

`docs/` builds with MkDocs Material into `public/docs/` during
`vercel-build` — **a broken MkDocs build breaks the app deploy**, and a
new docs page must be wired into `mkdocs.yml` nav. Fixed structure:
`overview/`, `modules/`, `infrastructure/`, `reference/`, `vision/` —
do not re-add flat top-level narrative files. When you change a feature,
update the relevant README(s) and docs page **in the same PR**; a new
subsystem gets its own README next to its code, linked from the root
README, `docs/README.md`, and `docs/infrastructure/tech-stack.md` if it
participates in a data flow. Keep file paths in docs as clickable
relative links; Mermaid diagrams small enough to read without
scrolling. `/docs` stays behind the same `mh_site_auth` cookie —
never add a middleware bypass for it.

## Verification gates

Before finishing any code change: `npx tsc --noEmit` and
`npm run lint`. For policy datasets: `npm run check:policies` and
`npm run build:policy-targets` must reproduce the dataset. Cross-
reference integrity (every id in `recIds`/`packageIds`/etc. resolves in
its registry) is part of the QA bar, as is spot-checking quotes against
extracted source text.

## Git and CI

- Branches: `claude/<topic>-<suffix>`; work lands via PR to `main`.
- Commit subjects, by kind: `M36:`-style bare module prefix for module
  iterations (`M36 v5: …`); `Add beta module M·NN: <Title>` or
  `feat: new beta module M·NN — <title>` for new modules;
  conventional-commit scopes for app code (`feat(media-monitoring):`,
  `fix(indicators):`, `data(indicators):` for data-only changes,
  `chore:`); plain imperative sentences for substantive content work,
  written for the reader ("Fact-check the content of all four Summer
  Prep modules"). `[automated]` is reserved for the cron workflows.
- Long regeneration jobs commit interim checkpoints with "in progress"
  stated in the subject.
- Commit bodies for substantive work are long and structured: context
  paragraph, numbered findings with locators, what was recorded
  alongside, the AI-compiled caveat line, and registration/linking
  notes.
- Merge-conflict resolutions get explanatory commit subjects stating
  what the resolution decided.
- Do not break the scheduled pipelines in `.github/workflows/`:
  `deploy.yml` (CI + prebuild scripts), `daily-updates.yml`,
  `daily-publication-screening.yml`, `media-monitoring-daily.yml`,
  `refresh-indicators.yml` (opens a PR, never pushes to main — every
  automated value gets fact-checked before merge), report/reference
  fetchers, `gdpr-retention.yml`, backups.
- Network access to primary sources varies by host, and **the old blanket
  "Eurostat/EEA/EUR-Lex are blocked" rule was wrong** — it licensed six
  beta modules to be compiled from model knowledge, with errors up to
  20 percentage points (see
  `docs-internal/beta-modules-m45-m52-factcheck-2026-08.md`). As of
  August 2026: the Eurostat dissemination API and `eea.europa.eu` are
  **reachable** over plain HTTPS; `eur-lex.europa.eu` is behind an AWS
  WAF JavaScript challenge and answers **202 with a challenge page**, but
  enacting terms are reachable through the Publications Office Cellar
  service (`publications.europa.eu/resource/celex/<CELEX>` with
  `Accept: application/xhtml+xml`). Probe before assuming, and read the
  body not just the status: 403/407 is an allowlist denial, 202 with a
  short body is a bot challenge, 200 with an empty payload is a wrong
  query. Recipes in `docs/how-to-access-eurostat-eea-data.md`; fall back
  to the GitHub-runner workflows only when a host really is blocked,
  never drop a check.
