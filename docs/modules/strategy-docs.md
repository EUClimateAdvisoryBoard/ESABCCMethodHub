# M · 15 — Strategy & Framework Docs

!!! tip "Status"
    Beta · parked under [`beta/modules/strategy-docs/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules/strategy-docs) · the Next.js route at `/beta/strategy-docs` re-exports the beta page so it is reachable when manually navigated.

A documentation-style overview surface for the Secretariat's internal
strategy and project-framework documents. Built to mirror the
wayfinding of this docs site itself — a hero with intent, an
on-this-page index, and a sectioned library of cards grouped by
purpose — so reviewers can browse the corpus the same way they browse
the technical handbook.

## User story

> A reviewer (EEA Director, audit, new joiner) wants the canonical set
> of strategy and framework documents the Secretariat operates against
> — the multi-year strategy, the signed Project Initiation Requests,
> the RACI between CCE5 and EEA IT, the methodological notes — without
> having to ask for them by name. They open `/beta/strategy-docs`,
> scroll the catalogue, and either click straight through to the PDF
> or see at a glance which documents are still in draft.

## Why a separate module

The six production modules cover **research outputs**: literature,
scenarios, news, policies, qualitative coding. Strategy & Framework
Docs covers the **rules of engagement**: how the Secretariat decides,
runs and reports on the work that produces those outputs. Keeping
this corpus on its own surface — with the same look as the docs site
— signals "this is institutional context, not a research artefact".

## Catalogue shape

The module reads from a single in-file catalogue
([`SECTIONS`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/strategy-docs/page.tsx))
with five sections. Each section holds an array of `DocumentEntry`
records:

| Section            | Kicker                  | What it holds                                                       |
|--------------------|-------------------------|---------------------------------------------------------------------|
| `strategy`         | Where we are going      | Multi-year strategy, MethodHub vision, EEA-blueprint framing.       |
| `project-framework`| How we run projects     | Signed PIRs, PM handbook, lifecycle and RACI templates.             |
| `governance`       | Roles, decisions, audit | RACI between CCE5 and EEA IT, quarterly review cadence.             |
| `methodology`      | How we work             | Literature workflow, AI ground rules, qualitative-coding conventions. |
| `change-log`       | What moved              | Rolling change log of the catalogue itself.                          |

### `DocumentEntry`

| Field      | Type        | Notes                                                                      |
|------------|-------------|----------------------------------------------------------------------------|
| `id`       | string      | Stable slug — used as the React key and the URL anchor.                    |
| `title`    | string      | Display title.                                                             |
| `summary`  | string      | One-line description shown under the title on the card.                    |
| `version`  | string      | Semantic-version label (e.g. `v1.0`, `v0.5-draft`).                         |
| `updated`  | string      | Last-updated label, e.g. *23 Apr 2026* or *Pending upload*.                 |
| `format`   | enum        | `PDF \| DOCX \| MD \| XLSX \| PPTX` — drives the format chip.               |
| `author`   | string      | Filed-from author / unit (typically *CCE5*).                                |
| `status`   | enum        | `available \| coming-soon \| draft` — drives the status chip and link path. |
| `href`     | URL \| null | Set once the file is in the repo. Cards with no `href` render as placeholders. |
| `tags`     | string[]    | Tag chips at the bottom of the card.                                        |

## Wiring a real document in

Promotion of a card from "coming-soon" to "available" is a one-line
edit:

```bash
# 1. Drop the file into the repo
cp ~/Downloads/cce5-strategy-2026-2030.pdf public/strategy-docs/

# 2. Flip the catalogue entry
$EDITOR beta/modules/strategy-docs/page.tsx
#   - status:  'coming-soon'   →  'available'
#   - href:    undefined       →  '/strategy-docs/cce5-strategy-2026-2030.pdf'
#   - updated: 'Pending upload' →  '23 Apr 2026'
```

No build pipeline, no JSON regeneration — files in
`public/strategy-docs/` are served directly by Next.js.

## Code surface

| Path | Role |
|------|------|
| [`beta/modules/strategy-docs/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/strategy-docs/page.tsx) | Client component: hero, on-this-page sidebar, sectioned card library, status / format chips. |
| [`src/app/beta/strategy-docs/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/strategy-docs/page.tsx) | One-line re-export so the beta page is reachable at `/beta/strategy-docs`. |
| `public/strategy-docs/` | Document files referenced by `href` on `DocumentEntry`. Created once the first file is uploaded. |

## On-page surfaces

The route renders, top to bottom:

1. **Hero** — `PageHero` with the module's intent and headline counters
   (total documents, available count).
2. **On-this-page** sidebar — anchored navigation jumping to each
   section. Mirrors this docs site's right-hand TOC.
3. **Section blocks** — one per `DocumentSection`: kicker · label ·
   intro paragraph · grid of cards.
4. **Document cards** — format/version line, status chip, title,
   summary, author/updated `<dl>`, tag chips. Available cards render
   as `<a>`; placeholders render as dashed-border `<div>` so the
   catalogue stays browsable.

## Promoting to production

Same one-command path as every other beta module:

```bash
git mv beta/modules/strategy-docs src/app/strategy-docs
$EDITOR src/components/SiteHeader.tsx       # add to MODULES nav
$EDITOR src/app/page.tsx                    # add to productionModules tile grid
```

After that, `next build` picks the route up automatically.

## Known limits

- **Catalogue is hand-edited.** Adding a document is a code change to
  `SECTIONS` plus a file drop in `public/strategy-docs/`. Intentional
  for a small, slow-moving corpus.
- **No search.** With ~15 documents, anchored on-this-page navigation
  is enough; a full-text index would be premature.
- **No RLS / per-user gating.** All entries are visible to anyone who
  reaches the route. The site-wide HMAC password gate is the access
  control today.
