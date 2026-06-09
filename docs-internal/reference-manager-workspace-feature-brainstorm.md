# Brainstorm: Connecting the Reference Manager to the Project Workspace for Scientific Report Writing

**Date:** 2026-06-09
**Scope:** New features, module connections, and functions that link the Reference Manager (M·01) with the Project Workspace (M·07) and Content Analysis (M·05), aligned with the Secretariat's core activity: writing scientific reports.

---

## Where we stand today

The plumbing between the modules already exists, which makes most of the ideas below incremental rather than greenfield:

- **Reference Manager (M·01):** CSL-JSON references in Supabase, full-text search, DOI lookup (Crossref/DataCite), BibTeX/RIS import, PDF storage + browser-local annotations, 4 citation styles (`format-citation.ts`), project tags (`project:` namespace), Word add-in + bridge-service with citeproc-js, `citations_used` audit log.
- **Project Workspace (M·07):** per-project binder with pluggable modules (`pw_projects`, `pw_modules`), workspace corpus (`content_analysis_corpus`) that already ingests references as `ref-doc-<refId>`.
- **Content Analysis (M·05):** MAXQDA-style coding (`content_analysis_segments`), Evidence Base panel with citation-ready quotes, `ReportOutlineBuilder` that maps report sections to code subtrees and exports Word/Markdown skeletons.

The gap: references flow *into* analysis, but citations don't yet flow *back out* into a finished, properly cited report without manual work in Word.

---

## Feature ideas

Feasibility legend — **High**: builds on existing tables/APIs, days of work. **Medium**: needs a new table, API, or external dependency, 1–3 weeks. **Low**: architecturally significant, a month or more / needs sign-off.

### Theme 1 — Citation-aware drafting (workspace → report)

| # | Feature | What it does | Feasibility | Improvement |
|---|---------|--------------|-------------|-------------|
| 1.1 | **Cite-while-you-outline** | A "+ Cite" picker inside `ReportOutlineBuilder` sections that searches the workspace corpus (and the wider library) and inserts an in-text citation using `format-citation.ts`. | **High** — corpus rows already carry author/year/type snapshots; formatter exists. | Authors stop copy-pasting citations by hand; section ↔ source links become structured data we can audit. |
| 1.2 | **Live per-project bibliography** | Auto-generated, style-selectable reference list for a workspace project, compiled from every citation used in the outline + coded segments. Export as formatted text, `.bib`, or RIS. | **High** — union of `citations_used`, outline source maps, and segment refs; BibTeX serialization is the inverse of the existing parser. | One canonical reference list per report; no orphaned or duplicate entries at submission time. |
| 1.3 | **Citation coverage dashboard** | Per-section view: which claims have sources, triangulation strength (the ≥3-source score already exists), and a list of *uncited* outline bullets. | **High** — pure aggregation over existing data. | Quality gate before drafting in Word; makes weak evidence visible early. |
| 1.4 | **Proper `.docx` export with live citation fields** | Replace the current HTML-for-Word export with a real `.docx` (e.g. via the `docx` npm package) where citations are inserted as the same content controls the Word add-in uses. | **Medium** — new export path, but the add-in's field format is already defined. | The exported skeleton stays compatible with the add-in: refresh bibliography, switch styles, keep editing in Word seamlessly. |

### Theme 2 — Evidence provenance (PDF → quote → report)

| # | Feature | What it does | Feasibility | Improvement |
|---|---------|--------------|-------------|-------------|
| 2.1 | **Cloud-synced PDF annotations** | Move `pdf-annotations.ts` from localStorage to a Supabase table (keyed by reference + user, RLS like libraries). | **Medium** — new table + migration; the data shape already exists. | Annotations survive browser changes and become shareable — the prerequisite for everything else in this theme. |
| 2.2 | **Promote annotation → coded segment** | One click turns a PDF highlight into a `content_analysis_segments` row in the active workspace, carrying the page anchor and quote. | **Medium** — depends on 2.1; segment schema already supports quotes + attribution. | Reading and coding merge into one pass; no retyping quotes into the coding workbench. |
| 2.3 | **Quote provenance links** | Every quote in the Evidence Base panel and exported outline deep-links back to the exact PDF page (`/references/annotate?ref=…&page=…`). | **Medium** — anchor data exists once 2.1 lands. | Reviewers and co-authors can verify any quoted claim in two clicks — important for a scientific advisory body. |
| 2.4 | **Retraction & metadata watch** | Nightly job checks workspace-corpus DOIs against Crossref/OpenAlex for retractions, corrections, and richer metadata. | **Medium** — we already call Crossref; needs a scheduled job (the nightly-backup pattern exists). | Avoids the embarrassment of citing a retracted paper in an ESABCC report. |

### Theme 3 — Smarter reference intake inside the workspace

| # | Feature | What it does | Feasibility | Improvement |
|---|---------|--------------|-------------|-------------|
| 3.1 | **Add-by-DOI in the corpus panel** | Paste a DOI in the "In this workspace" panel → resolves via `/api/references/doi`, creates the reference, tags it `project:<workspace>`, adds it to the corpus in one step. | **High** — composes three existing APIs. | Removes the current three-screen round trip (Reference Manager → tag → workspace). |
| 3.2 | **Related-paper suggestions** | Surface Semantic Scholar "related papers" for the workspace corpus (the Electron app already integrates this API) with one-click import. | **Medium** — port existing integration to the web app; add ranking against corpus. | Literature discovery happens where the report is being written, seeded by what the team already selected. |
| 3.3 | **Screening workflow (PRISMA-lite)** | Per-workspace reading status on corpus items: *to screen → screened → included/excluded (+ reason)*, with an exportable screening log. | **Medium** — extend `content_analysis_corpus.doc_meta` or add a status column. | Systematic, defensible literature selection — directly citable in the report's methods section. |
| 3.4 | **Cross-library deduplication & enrichment** | Background job that flags duplicate references (DOI/title fuzzy match) across libraries and offers merge; backfills missing abstracts/funding via Crossref. | **Medium** — service-layer logic, no schema change. | Cleaner shared libraries; the EU-funding auto-tagging gets more complete inputs. |

### Theme 4 — Word & publication pipeline

| # | Feature | What it does | Feasibility | Improvement |
|---|---------|--------------|-------------|-------------|
| 4.1 | **Workspace-scoped Word add-in** | Add-in task pane defaults its filter to the `project:` tag of the workspace you're drafting for, and shows that workspace's evidence quotes for insertion. | **High** — project filter already flows to the add-in; needs a quotes endpoint. | Authors in Word see only the ~100 relevant sources instead of 2,600+, plus ready-to-paste evidence. |
| 4.2 | **Full citeproc-js in the web app** | Replace the 4-type approximation in `format-citation.ts` with the citeproc-js engine already used by the bridge-service, using `csl_styles` XML. | **High** — code exists in-repo; it's a port. | Correct formatting for all 21 CSL types and any future house-style tweak in one place. |
| 4.3 | **Pandoc render service** | Small containerized service (alongside `bridge-service`/`pypsa-service`): outline Markdown + CSL-JSON + style → `.docx`/PDF with perfect citations. | **Medium** — new service, but the Docker pattern exists. | A push-button "draft v0" of the report; also unlocks idea 5.1 below. |
| 4.4 | **Citation usage analytics** | Dashboard over `citations_used`: most-cited sources per report, sources cited in multiple chapters, stale citations to superseded policies. | **High** — the audit log already records the events. | Editorial overview for report leads; supports consistency checks across chapters. |

### Theme 5 — Reproducible / computational reporting (R & Quarto)

| # | Feature | What it does | Feasibility | Improvement |
|---|---------|--------------|-------------|-------------|
| 5.1 | **Quarto/R Markdown bundle export** | Export a workspace as a ready-to-knit bundle: `report.qmd` skeleton from the outline, `references.bib`, ESABCC `.csl`, and a `data/` folder with the project's `pw_indicators` as CSV. | **Medium** — pure file generation from existing data; no runtime R needed in the app. | Analysts who work in R/Quarto get a reproducible starting point with citations and indicator data wired in — bridges the app to how the scenario/indicator work is actually done. |
| 5.2 | **Indicator → figure snippets** | For each indicator in the bundle, generate a ggplot2 chunk that reproduces the workspace chart from the CSV. | **Medium** — templated code generation; charts' configs are known. | Report figures become regenerable when data refreshes (Eurostat/EEA refresh already exists), instead of static screenshots. |
| 5.3 | **In-browser R chunks (webR)** | Embed webR (WASM) so workspace pages can run small R snippets against indicator data. | **Low** — heavy dependency, performance and security questions; needs sign-off. | Exploratory analysis without leaving the workspace — nice-to-have, not on the critical path to reports. |

---

## Suggested sequencing

**Quick wins (this quarter):** 1.1 cite-while-you-outline → 1.2 live bibliography → 3.1 add-by-DOI → 4.2 citeproc-js port → 1.3 coverage dashboard. These are all High feasibility and together close the loop *corpus → coded evidence → cited outline → bibliography*.

**Next (one to two quarters):** 2.1 cloud annotations (it unblocks 2.2 and 2.3), 1.4 real `.docx` export, 4.1 workspace-scoped add-in, 3.3 screening workflow.

**Later / needs discussion:** 4.3 pandoc service and 5.1 Quarto bundle (decide whether Word or Quarto is the primary drafting target first), 2.4 retraction watch, 3.2 suggestions, 5.2–5.3.

The single highest-leverage dependency is **2.1 (cloud-synced annotations)** — three other features queue behind it — and the single best effort-to-value ratio is **1.1 + 1.2**, which turn the existing outline builder into an actual citation-managed drafting tool.
