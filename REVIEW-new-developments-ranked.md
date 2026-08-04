# MethodHub — Extensive Review & Ranked New Developments

> Produced 2026-05-27 · Covers all 6 production modules  
> Ranking criteria: **Usefulness** (U) = impact on Secretariat daily work · **Feasibility** (F) = effort, risk, dependency  
> Score = U + F (max 10 each, 20 total)

---

## Executive Summary

The ESABCCMethodHub is a mature Next.js 14 platform shipping **6 production modules** for the ESABCC Secretariat: Reference Manager, Data & Scenarios, Secretariat News, EU Policy Navigator, Content Analysis, and Voting Tool. The codebase also hosts 8 beta modules and an extensive user-space layer (workspaces, collections, command palette, AI assistant). After reviewing ~250 source files, all module documentation, the database schema, vision documents, and three brainstorm passes, this document identifies **30 potential new developments** across the 6 modules, ranked by usefulness and feasibility.

---

## Current State of Each Module

### M·01 — Reference Manager
**Maturity:** Stable v1.0 · ~15 components, 8 API routes  
**Strengths:** DOI auto-resolution (Crossref), PDF annotation with coordinate-stable highlights, Word add-in bridge for manuscript citation, EU-funded share audit, Semantic Scholar similar-paper discovery.  
**Weaknesses:** Citation graph is heuristic-only (Jaccard title overlap), no full-text search on uploaded PDFs, library sharing UI incomplete, no fuzzy search (typo tolerance), no bulk metadata cleanup.

### M·02 — Data & Scenario Explorer
**Maturity:** Stable v1.0 · ~2,600 LoC monolith component  
**Strengths:** Unified view across Eurostat historical data, IIASA scenario projections (11 databases), and EEA WEM/WAM baselines. 11 preset dashboards. Policy gap assessment with 23+ indicators mapped to sectors. Sonification for accessibility.  
**Weaknesses:** ScenarioExplorer is a monolithic refactoring candidate. Scenario submission workflow incomplete (validates but doesn't ingest). Policy gap is EU-27 only (no member-state disaggregation). Region name normalization fragile.

### M·03 — Secretariat News
**Maturity:** Stable v1.0 · 40+ RSS feeds, Outlook email integration  
**Strengths:** Hourly RSS sweep with MinHash deduplication. Three views (Daily Summary, 24h EU Briefing, AI Daily Briefing). Brussels Bulletin generator with Word export. Provider-agnostic LLM summarization (Anthropic/Azure/Gemini). Inbound email webhook from Outlook VBA.  
**Weaknesses:** No full-text search over past summaries. No trend/topic tracking dashboard. No admin UI for feed management. Saved search email notifications not wired. Deduplication is O(n²) at scale.

### M·04 — EU Policy Navigator
**Maturity:** Stable v1.0 · D3 force-directed graph + 6 connection types  
**Strengths:** Network visualization with domain clustering, mini-map, fish-eye focus. Full EUR-Lex text reader with annotation. Policy Clock with 8 event categories. Analytics dashboard (text analysis, network analysis, content analysis, TF-IDF). Connection review workflow with approval states.  
**Weaknesses:** Policy corpus is small (~30-50 acts vs. 200+ in full EU climate law). Label legibility at low zoom. No admin panel for managing RSS sources or Policy Clock events. EUR-Lex fetch can time out (15s limit).

### M·05 — Content Analysis
**Maturity:** Stable v1.0 · MAXQDA-style qualitative coding  
**Strengths:** Three-panel workbench (code tree + document + analysis). AI-assisted coding via Gemini (document classification + segment suggestions) with confidence tinting and track-changes UX. Multi-user soft locks with heartbeat. Numeric extraction with CSV/Word export. Horizontal coherence matrix view. Auto-snapshots every 5 minutes.  
**Weaknesses:** Hardcoded to Gemini (LLM_PROVIDER not wired for this module). Vertical/longitudinal/outcomes tabs are stubs. No inter-coder reliability metrics in-app. No MAXQDA/NVivo import. No full-text corpus indexing beyond client-side.

### M·06 — Voting Tool
**Maturity:** Stable v1.0 · 7 voting systems  
**Strengths:** 7 voting systems (priority ranking, single/multi choice, approval, star, average ranking, IRV). Anonymous mode with token-fingerprint isolation. Race-safe ballot recording via atomic Postgres updates. Zero PII stored (no IP, user-agent, fingerprinting). QR code for ballot distribution.  
**Weaknesses:** No option editing after ballots arrive (intentional but no "duplicate vote" workaround yet). No client-side deadline countdown. Result export is JSON-only (no CSV/Word). No historical vote comparison.

---

## Ranked New Developments

### Tier 1 — High Impact, High Feasibility (Score 17-20)

| # | Module | Development | U | F | Total | Rationale |
|---|--------|------------|---|---|-------|-----------|
| 1 | **M·05** | **Multi-provider LLM support for Content Analysis** | 10 | 9 | **19** | The classify/suggest-codes routes are hardcoded to Gemini while the rest of the platform supports 4+ providers via `LLM_PROVIDER`. Wiring the existing dispatcher into M·05 is a config change + minor refactor. Unlocks Azure OpenAI EU (Path A) and future Copilot (Path B) for the module that does the heaviest AI work. |
| 2 | **M·03** | **Saved search email notifications** | 9 | 9 | **18** | The `notify` flag already exists in `news_saved_searches`. Wiring a cron job (GitHub Actions or node-cron) to run saved queries and email matches is a day's work. Directly requested by Secretariat workflow — analysts want alerts when topics they track appear in new articles. |
| 3 | **M·06** | **Deadline countdown + CSV/Word export** | 8 | 10 | **18** | Two small, independent additions. Client-side countdown timer reads `closes_at` (already stored). CSV/Word export wraps existing `analysis.ts` computation. No new dependencies. Directly useful for meeting-driven Advisory Board workflow. |
| 4 | **M·01** | **Full-text search on uploaded PDFs** | 9 | 8 | **17** | PDFs are uploaded to Supabase Storage but text is only extracted on-demand by M·05. Pre-indexing text at upload time (via pdf.js or pdf-parse) and storing in a `tsvector` column enables Postgres full-text search across the entire bibliography. Major productivity gain — analysts currently can't search inside papers. |
| 5 | **M·04** | **Expanded policy corpus (150+ additional acts)** | 10 | 7 | **17** | The network graph has ~30-50 policies but EU climate law spans 200+ acts. The data structure and UI already handle arbitrary scale. The work is curating the additional policies (CELEX IDs, connections, metadata) — a research task the Secretariat can do incrementally. Each addition makes the network exponentially more useful. |

### Tier 2 — High Impact, Moderate Feasibility (Score 14-16)

| # | Module | Development | U | F | Total | Rationale |
|---|--------|------------|---|---|-------|-----------|
| 6 | **M·02** | **Member-state policy gap disaggregation** | 10 | 6 | **16** | Currently EU-27 only. Adding per-country WEM/WAM projections requires the EEA Discodata API (data exists but isn't fetched). Would let the Secretariat answer "Where is [country] lagging on [indicator]?" — directly relevant to the Board's advisory mandate. Medium effort: new API routes + modified PolicyGapChart. |
| 7 | **M·05** | **Inter-coder reliability (Cohen's κ / Krippendorff's α)** | 9 | 7 | **16** | Currently requires manual export to SPSS. Computing agreement metrics in-app (segment overlap × code match) would let the team validate coding quality without leaving MethodHub. Pure computation on existing data; the `CodedSegment` model has everything needed. |
| 8 | **M·03** | **Topic trend dashboard with time-series** | 9 | 7 | **16** | News articles are tagged with topics on ingestion but there's no visualization of topic frequency over time. A dashboard charting topic volume (stacked area / heatmap) over weeks/months would reveal emerging issues. Data exists in `news_articles.topics[]`; needs a new aggregation endpoint + chart component. |
| 9 | **M·01** | **Library sharing & collaborative editing UI** | 8 | 7 | **15** | The `is_shared` flag and RLS policies exist, but no invite/permission UI is built. Adding a share modal (email → library membership → RLS access) would enable team bibliographies. Medium effort: UI work + membership management API. |
| 10 | **M·04** | **Streaming EUR-Lex text with progressive loading** | 8 | 7 | **15** | EUR-Lex fetch has a 15s timeout and sometimes fails. Implementing streaming (ReadableStream from the API) with progressive text rendering would eliminate blank-page failures. The policy-text route already has 3 fallback endpoints; adding streaming is an incremental improvement. |
| 11 | **Cross-module** | **Unified full-text search (Postgres tsvector)** | 9 | 6 | **15** | Currently each module searches independently. A single `search_index` materialized view joining references, policies, news, and content-analysis segments would power the ⌘K palette with real results instead of just navigation. Requires schema migration + index maintenance triggers. |
| 12 | **M·02** | **Scenario submission review & ingestion pipeline** | 8 | 7 | **15** | Upload form validates IAMC CSV structure but doesn't persist to the database. Adding a review queue (admin approval → insert into scenario tables) closes the loop. Partially built: `/scenarios/submissions` page exists, needs backend wiring. |
| 13 | **M·05** | **MAXQDA/NVivo project import (QDPX format)** | 8 | 7 | **15** | Researchers with existing coded projects can't bring them into MethodHub. QDPX (REFI-QDA standard) is an XML+ZIP format mapping directly to CodeNode + CodedSegment. Parser effort is moderate; data model alignment is already close. Would significantly lower adoption barriers. |

### Tier 3 — Moderate Impact, High Feasibility (Score 12-13)

| # | Module | Development | U | F | Total | Rationale |
|---|--------|------------|---|---|-------|-----------|
| 14 | **M·06** | **Duplicate vote workflow** | 7 | 6 | **13** | Editing options after ballots arrive is intentionally blocked. A "Clone this vote" button (copy metadata + options → new vote) would let admins iterate without losing historical data. Small feature, documented as roadmap item. |
| 15 | **M·01** | **Fuzzy search with Levenshtein distance** | 7 | 6 | **13** | Author name typos ("Edenhoffer" vs "Edenhofer") cause missed results. Adding `pg_trgm` GIN index + `similarity()` scoring is a one-migration change that dramatically improves search ergonomics. |
| 16 | **M·03** | **RSS feed admin panel** | 7 | 6 | **13** | Currently adding a feed requires a code PR (intentional, but friction for non-developers). A simple admin UI showing feed health (last fetch, error count, article count) with add/remove would let the Secretariat self-serve. Keeps PR requirement for public sources but unlocks ad-hoc monitoring. |
| 17 | **M·05** | **Evidence block visualization for AI classifications** | 7 | 6 | **13** | `evidenceBlockIds` from the classify API are stored on documents but not visualized. Highlighting evidence blocks in the sidebar when a classification is selected would let analysts verify AI reasoning at a glance. Small UI addition on existing data. |
| 18 | **M·02** | **ScenarioExplorer component decomposition** | 6 | 7 | **13** | The 2,600-line monolith is acknowledged as a refactoring candidate. Splitting into query-builder, filter-UI, and chart-renderer sub-components reduces bug surface and makes the module testable. No user-facing change, but de-risks every future scenario feature. |
| 19 | **M·04** | **Label abbreviations at low zoom** | 7 | 6 | **13** | Policy names vanish entirely when zoomed out. Showing 3-4 letter abbreviations (ETS, CBAM, RED) at low zoom levels instead of hiding labels would maintain orientation in the network view. Small D3 enhancement. |
| 20 | **M·06** | **Historical vote comparison view** | 7 | 6 | **13** | No way to compare results across multiple votes on the same topic (e.g., "How did priorities shift from AB Meeting 38 to 39?"). A side-by-side results view using existing `analysis.ts` computation would serve longitudinal governance analysis. |

### Tier 4 — Moderate Impact, Moderate Feasibility (Score 10-11)

| # | Module | Development | U | F | Total | Rationale |
|---|--------|------------|---|---|-------|-----------|
| 21 | **M·01** | **Crossref `references[]` citation graph** | 8 | 3 | **11** | Would replace the Jaccard heuristic with verified citation links. Blocked on Crossref releasing the `references[]` field for works metadata. When available, it's a high-impact data quality upgrade with moderate integration effort. |
| 22 | **M·03** | **Incremental RSS fetch with delta-checking** | 6 | 5 | **11** | Each sweep re-fetches all 40+ feeds in parallel. Using `If-Modified-Since` / `ETag` headers would reduce bandwidth and latency. Moderate effort: need per-feed header storage in `rss_feeds` table + conditional fetch logic. |
| 23 | **M·05** | **Vertical coherence & longitudinal analysis views** | 8 | 3 | **11** | Tab stubs exist for vertical (within-document) and longitudinal (across-version) analysis. Full implementation requires version comparison algorithms and temporal visualization. High value for policy document evolution tracking but substantial UI development. |
| 24 | **M·02** | **Uncertainty envelopes on scenario charts** | 7 | 4 | **11** | Showing model disagreement ranges (ensemble quantile bands) is on the roadmap. Requires aggregation logic changes in ScenarioChart + FanChart enhancement. Valuable for communicating scenario uncertainty to Board members but non-trivial chart rendering work. |
| 25 | **M·04** | **NLP-powered policy similarity scoring** | 7 | 4 | **11** | Currently policy connections are manually curated. Using sentence embeddings (via the existing LLM layer) to auto-suggest connections between policy texts would accelerate corpus building. Needs embedding storage + similarity search infrastructure. |
| 26 | **Cross-module** | **Offline-first progressive web app (PWA)** | 6 | 5 | **11** | Secretariat members travel to meetings without reliable internet. Service worker + IndexedDB caching of recently viewed references, policies, and news would enable offline reading. Moderate complexity: need cache invalidation strategy + sync queue. |
| 27 | **M·01** | **Bulk metadata cleanup / review view** | 6 | 5 | **11** | Imported references can have mangled author names, missing years, duplicate entries. A batch review interface with auto-fix suggestions (normalize names, fill years from DOI) would save hours of manual cleanup. |
| 28 | **M·03** | **Story threading across days** | 7 | 4 | **11** | Related articles aren't grouped by ongoing event. Building topic threads (using embedding similarity on article titles/summaries) would let analysts follow a developing story (e.g., "ETS revision debate") across multiple days. Requires embedding infrastructure. |
| 29 | **M·05** | **Batch coding API** | 6 | 5 | **11** | Researchers can't programmatically submit segments. A REST endpoint for bulk segment creation would enable scripted imports from external tools, pipeline-based coding, and integration with R/Python analysis workflows. |
| 30 | **M·06** | **Weighted voting / Condorcet method** | 5 | 5 | **10** | Adding Condorcet (pairwise comparison) or weighted-vote systems would serve more complex decision-making scenarios. The voting framework is well-structured for extension (validation + analysis are per-system). Niche but clean to implement. |

---

## Summary: Top 10 Priorities

| Rank | Development | Module | Score | Effort Estimate |
|------|------------|--------|-------|-----------------|
| 1 | Multi-provider LLM for Content Analysis | M·05 | 19 | 1-2 days |
| 2 | Saved search email notifications | M·03 | 18 | 1-2 days |
| 3 | Deadline countdown + CSV/Word export | M·06 | 18 | 1-2 days |
| 4 | Full-text search on uploaded PDFs | M·01 | 17 | 3-5 days |
| 5 | Expanded policy corpus (+150 acts) | M·04 | 17 | 2-4 weeks (research) |
| 6 | Member-state policy gap disaggregation | M·02 | 16 | 1-2 weeks |
| 7 | Inter-coder reliability metrics | M·05 | 16 | 3-5 days |
| 8 | Topic trend dashboard | M·03 | 16 | 3-5 days |
| 9 | Library sharing UI | M·01 | 15 | 1 week |
| 10 | Streaming EUR-Lex text | M·04 | 15 | 3-5 days |

---

## Module Coverage Balance

| Module | Developments in Top 10 | Developments Total | Assessment |
|--------|----------------------|-------------------|------------|
| M·01 Reference Manager | 2 | 5 | Well-balanced; PDF search is the biggest win |
| M·02 Data & Scenarios | 1 | 4 | Member-state disaggregation is the killer feature |
| M·03 Secretariat News | 2 | 5 | Notification wiring + trend dashboard both high-value |
| M·04 Policy Navigator | 2 | 4 | Corpus expansion is the single highest-impact investment |
| M·05 Content Analysis | 2 | 6 | LLM provider fix is the most urgent (blocks AI layer roadmap) |
| M·06 Voting Tool | 1 | 4 | Already well-scoped; export + countdown close obvious gaps |

---

## Methodology

This review was based on:
- Reading all 6 module documentation pages under `docs/modules/`
- Analyzing ~250 source files across `src/app/`, `src/components/`, `src/lib/`, and `src/app/api/`
- Reviewing the database schema (`supabase-schema.sql` + migrations)
- Examining all 3 brainstorm documents, the roadmap, blueprint, and user-space vision
- Cross-referencing the 8 beta modules for overlap and promotion potential
- Evaluating the existing `LLM_PROVIDER` architecture for extensibility gaps
