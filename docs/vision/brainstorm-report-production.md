# Brainstorm — Report Production Efficiency

A fourth-pass brainstorm. The first three passes were per-module depth
([rollout TODO](brainstorm-rollout-todo.md)), cross-module user space
([20 module improvements](brainstorm-modules-ux-userspace.md)), and per-module
professional UX
([pro UX for the five modules](brainstorm-pro-ux-five-modules.md)).

This pass widens the lens to the **core deliverable of the Secretariat**:
producing scientific reports for the ESABCC. Every idea below is judged on
one question — *does it shorten the time, or raise the quality, of the next
report?*

The scope is wider than UI polish. Three buckets:

1. **New modules** that don't exist yet and would carry first-class weight
   alongside the five production modules.
2. **New functions inside existing modules** (M·01–M·05) that turn them from
   research tools into report-production tools.
3. **New scientific / policy APIs** worth wiring into the data pipelines, so
   the modules above are fed automatically.

Each item has a one-line **User example** in the same style as prior
brainstorms. A combined ranking sits at the bottom.

> **Status.** Brief, not commitment. Sized so a forking unit can pick any
> single item and ship it inside one sprint without touching the others.

---

## A. New modules

### A.1 — Report Studio (M·06)

A single workspace per ESABCC report. Chapters are first-class objects with
owner, status (drafting / internal review / Board review / cleared / typeset
/ published), word-count target, deadline, and a live render of the chapter
as it would appear in the final PDF. Citations are inserted from M·01,
figures from M·02, policy hooks from M·04, coded evidence from M·05 — all by
reference, never by copy-paste.

**User example.** Maria opens *Report Studio → Annual Progress Report 2026*.
The dashboard shows 12 chapters, 8 cleared, 2 in Board review, 2 still
drafting. She clicks *Chapter 4 — Transport*; the right pane is the live
render, the left pane lists every M·01 reference cited, every M·02 figure
embedded, every M·04 policy referenced. She drags one more reference in,
saves; the render updates in 200 ms.

### A.2 — Review Roundtable (M·07)

A structured comment workflow for Board members and external reviewers.
Each paragraph in a draft has a stable anchor; comments thread under the
anchor; resolution requires either an edit, a counter-argument, or a "noted
— not changed" with rationale. Board sign-off is per-chapter, audit-logged.

**User example.** A Board member opens the *Transport* chapter, hits `C` on
paragraph 14, leaves *"This conflicts with the AR6 WG3 Box 10.4 figure."*
The chapter owner sees the comment in their Workbench inbox, replies with
an edit + a one-line rationale, marks resolved. The Board member re-opens
the comment thread two weeks later from her phone — the resolution is right
there, with the diff that addressed it.

### A.3 — Fact-Check Co-pilot (M·08)

A linter that runs on a draft chapter and flags every numeric claim,
attribution, or assertion that is not backed by something in M·01 / M·02 /
M·04 / M·05. Claims with backing get a green chip; claims with weak backing
get amber; claims with no backing get red and a one-click *"add citation"*
that searches M·01.

**User example.** Sebastian saves a draft. The lint pass flags
*"transport emissions fell 4.7 % in 2024"* as red — no source. He clicks
the chip; M·01 search returns *EEA GHG inventory 2025* with a 4.6 % match;
he accepts; the chip turns green; the citation is inserted at the end of
the sentence. Total time: 8 seconds per claim, instead of *"I'll find a
source for that later"* (which never happens).

### A.4 — Figure Factory (M·09)

Every figure in every report is a **reproducible artefact**: a script + a
pinned data version + a style profile + a caption draft. The build pass
re-renders the figure on every report build; if the underlying M·02 dataset
moves, the figure regenerates and a diff badge appears. Style is unified
across the report (same fonts, same palette, same axis treatment) without
the chapter authors having to think about it.

**User example.** A chapter author drops a CSV and a one-line spec
(*"line chart, transport sector, 2005–2024, EU-27"*). Figure Factory
returns a styled PNG + SVG + the script that produced it + a caption
draft. Six months later, EEA publishes a revised inventory; the next
report build flags *"Fig 4.2 changed — 2024 value 815 → 818 Mt"*. The
author accepts the update with one click; the caption auto-updates the
revision date.

---

### A.5 — Mandate & Coverage Tracker (M·10)

Every ESABCC report is commissioned against a written mandate (Terms of
Reference, Council request, own-initiative scoping note). This module turns
that mandate into a checklist: each clause becomes a row, each row gets
linked to the chapter / paragraph that addresses it. A coverage ring shows
*how much of the mandate has actually been answered*. Nothing ships with
red rows.

**User example.** The chair asks at week 6 *"Are we still on scope?"* The
secretariat opens Mandate Tracker — 23 / 27 ToR clauses linked, 3 amber
(partial coverage), 1 red (*"distributional impacts on rural households"*
not addressed anywhere). The red row has a one-click *"assign to chapter"*
button; the gap closes by week 8 instead of being discovered in peer review.

### A.6 — Reviewer Pool & Conflicts Manager (M·11)

A registry of external reviewers with expertise tags, conflict-of-interest
declarations, response-rate history, and language. Per chapter, the
secretariat picks reviewers; the system flags COIs against authors and
funding sources, tracks invitation / acceptance / submission status, and
anonymises responses for the editorial team.

**User example.** Sebastian needs three reviewers for the *Industry*
chapter. The pool returns 11 candidates ranked by expertise match and
response rate; two are auto-flagged for COIs (one funded by Eurofer in the
last 3 years, one co-authored with a chapter lead). He picks three of the
remaining nine; invitations send with one click; two weeks later the
roundtable shows *"2 / 3 received, 1 pending — last contacted 4 days ago"*.

### A.7 — IPCC-Calibrated Language Linter (M·12)

Scientific reports use calibrated uncertainty language ("very likely",
"likely", "more likely than not", "about as likely as not", …). The linter
checks every such phrase in a draft against the underlying evidence
strength, flags inconsistencies, and proposes the calibrated phrase that
matches the cited confidence interval. Same logic for IPBES, EEA-IND, and
ESABCC house style.

**User example.** A chapter says *"emissions will likely fall 30 % by
2030"* but the cited NGFS scenario gives a 25th–75th percentile of
20–35 %. The linter flags the phrase, suggests *"more likely than not (>50 %
chance of falling at least 25 %)"*, and links to the ESABCC calibrated
language guideline. The author accepts; the report's uncertainty language
is now consistent across all twelve chapters.

### A.8 — Reproducibility Kit / Zenodo Builder (M·13)

When a report is published, every figure, table, and dataset is bundled
into a single archive: scripts, data snapshots (or DOIs of the datasets
used), software lockfile, build instructions. One command produces a
Zenodo-deposit-ready bundle with a DOI reservation. The bundle is the
machine-readable counterpart of the PDF.

**User example.** On publication day, Sebastian runs `methodhub report
build --release annual-2026`. The kit lands in `releases/annual-2026/`
with 47 figures, 12 datasets, a `Makefile` that re-runs every analysis,
and a Zenodo metadata file. He uploads to Zenodo; a reviewer six months
later runs `make` and reproduces every chart. The Board's reproducibility
score on the next ECA audit jumps from amber to green.

---

### A.9 — Translation & Multilingual Sync (M·14)

ESABCC reports are drafted in EN; key parts (executive summary, plain-language
summary, press release) need DE/FR and increasingly all 24 EU languages. This
module pairs each EN paragraph with its translated counterparts, tracks
freshness (paragraph edited after translation = stale), routes stale chunks
to the translator queue, and runs a back-translation lint pass to catch
meaning drift on numerical claims.

**User example.** Maria edits one sentence in the executive summary on
Friday afternoon. By Monday, the DE and FR versions show that paragraph
in amber with *"source edited — re-translation pending"*. The translator
sees only the changed paragraph (not the whole ES) in their queue; the
back-translation pass confirms *"4.7 %"* in EN matches *"4,7 %"* in DE.
Translation lag drops from 3 weeks to 4 days.

### A.10 — Briefing & Speech Kit (M·15)

Board members brief journalists, speak at hearings, and front parliamentary
sessions. This module generates structured briefing notes from the live
report content: 1-page Q&A, 5-bullet talking points, anticipated hostile
questions with vetted answers, related quotes from prior ESABCC reports, an
appendix with the underlying numbers. Every claim points back to the source
chapter.

**User example.** The chair has a hearing in ENVI committee on Tuesday.
Sebastian opens *Briefing Kit → ENVI 2026-05-12*. Picks four chapters of
relevance; the kit generates 1 page of talking points + 8 anticipated
questions + 8 vetted answers, each cited. He reviews, sends to the chair's
office. The chair walks in with the same answers the report actually
supports — no contradictions in Hansard.

### A.11 — Public Consultation Portal (M·16)

ESABCC publishes draft reports for public comment. This module collects
comments from a public-facing form, deduplicates near-identical wording
(stakeholder campaigns), themes them automatically, routes each to the
relevant chapter owner, and tracks the editorial response (*"accepted",
"declined with rationale", "merged"*). Required by EU public-consultation
guidelines anyway — automated here.

**User example.** A draft is open for 8 weeks; 1,800 comments arrive.
The portal clusters them into 47 themes, dedupes 700 form-letter entries
into 1, routes 6 themes to the *Energy* chapter owner. She replies
once per theme; her replies render in the published consultation
response document automatically. Time spent on consultation drops from
6 person-weeks to 1.

### A.12 — Cross-Report Memory (M·17)

Every prior ESABCC report indexed at paragraph level: search the corpus,
get hits with chapter / paragraph anchors, see how a topic has been
treated across reports. Prevents new reports contradicting old ones
silently, surfaces the canonical ESABCC position on recurring topics
(carbon pricing, ESR, EU 2040 target, etc.).

**User example.** A new chapter on *Carbon Pricing* drafts the sentence
*"the ETS2 should start in 2027"*. Cross-Report Memory flashes a
warning: *"BCT-1 (2024) said 2026; the position changed in
ETS2-Review (2025) to 2027 with reasoning X."* The new draft adds a
sentence acknowledging the evolution; future readers see the shift,
not a silent reversal.

### A.13 — Press & Dissemination Tracker (M·18)

Once the report ships, this module tracks media coverage (news, social,
academic citations), routes corrections / clarifications, generates
social-card variants, schedules the launch comms, and measures reach.
Wraps GDELT, Altmetric, Google News, and Twitter/Mastodon APIs.

**User example.** The annual report launches Tuesday at 10:00. By Friday,
the tracker shows 142 news items in 17 languages, 38 op-eds (12 critical,
26 supportive), 14 academic mentions, 2 misquotes flagged for press-team
follow-up. The launch report writes itself; the next report's stakeholder
plan is informed by *which outlets actually covered the last one*.

### A.14 — Risk & Uncertainty Register (M·19)

A live ledger of every quantitative uncertainty across the report: the
median, the range, the source, the propagation through downstream claims.
When chapter 4 says *"emissions in 2030 are 1,200 ± 80 Mt"* and chapter 9
later cites *"1,200 Mt"* without the range, the register flags the
inconsistency. Required for IPCC-grade uncertainty discipline.

**User example.** During cross-chapter consistency review, the register
shows that chapter 4's *"1,200 ± 80 Mt"* propagates to four downstream
claims, only two of which carry the uncertainty band forward. The two
naked-number claims get auto-flagged; the editor adds the band; the
report's uncertainty treatment is internally consistent.

---

## B. New functions inside existing modules

The five production modules already do their core jobs. The functions below
turn each of them from a research aid into a **report-production engine**.

### B.1 — M·01 Reference Manager

1. **Per-report citation style switcher.** Pick APA / Chicago / Harvard /
   ESABCC house / IPCC house once per report; every export and every
   in-text citation re-renders accordingly.
   *User example.* The annual report uses ESABCC house; the sectoral
   report uses Chicago. Same library, same authors, no copy-paste.

2. **Citation-in-context view.** For each reference, show every paragraph
   across every report-in-progress that cites it, with the surrounding
   sentence. Spot mis-citations and over-reliance on a single source.
   *User example.* A reviewer challenges a claim; the citation-in-context
   view shows the same paper is cited in 14 paragraphs across 3 chapters.
   Two of those uses don't survive scrutiny; the reviewer sees this in
   one screen.

3. **Smart-deduplication on import.** When a colleague drops 50 PDFs,
   detect duplicates against the existing library by DOI / title / SHA;
   present a "merge or skip" review.
   *User example.* The library never grows three copies of the same IPCC
   AR6 chapter again.

4. **Crossref-references sync.** For every paper in the library,
   periodically fetch its updated Crossref `references` field; surface
   *"this paper now cites 4 new things, 1 already in your library, 3
   not"*.
   *User example.* The lit review keeps catching up to itself; new
   foundational citations appear without manual hunting.

5. **Retraction / correction watch.** Watch Retraction Watch + Crossref
   for any paper in the library; flag instantly.
   *User example.* A 2023 paper cited in chapter 6 is retracted in
   2026; the retraction badge appears on the reference and on every
   paragraph that cites it before the next review round.

6. **Auto-generate "Methods" appendix entries.** For every reference
   coded as "method source", produce a structured methods description
   block (sample size, technique, scope) suitable for the report's
   methods annex.
   *User example.* The methods annex compiles itself from the coded
   references; no separate handwritten document.

### B.2 — M·02 Data & Scenarios

1. **Vintage lock per report.** Pin every chart in a report to a specific
   data snapshot date. The chart never silently changes when EEA / IIASA
   updates their dataset.
   *User example.* The annual report 2026 shows the dataset as of
   2026-04-01 even when the chair revises the report in 2027.

2. **"Build all figures" CLI.** One command re-renders every figure in a
   report from source data + the locked vintage; CI fails if any figure
   is missing or stale.
   *User example.* The build pipeline produces a folder of 47 figures,
   each with PNG + SVG + PDF + caption + provenance footer; copy-paste
   into the report template is a single rsync.

3. **Scenario annotation overlay.** Authors mark inflection points
   (*"ETS revision adopted here"*, *"Russia gas cut-off"*) on a scenario
   chart; annotations persist with the saved view.
   *User example.* The brief to the chair shows the curve with five
   labelled inflection points; the same chart appears in the report
   without re-doing the annotation.

4. **Dataset-DOI auto-citation.** Every chart carries the source
   dataset's DOI; the citation renders in the figure caption and is
   automatically added to M·01.
   *User example.* The reader sees the dataset DOI under every chart;
   the bibliography entry is generated; no manual citation typing.

5. **Cross-scenario diff scrubber (already in pro-UX brainstorm) ×
   report-aware.** The diff scrubber persists inside Report Studio so
   the chapter author sees the diff as it will print.
   *User example.* Chapter 4 says *"−18 % by 2030 between FF55 and NGFS
   Net Zero"* — the diff scrubber confirms; the report renders the
   exact value.

6. **Statistical-significance banding.** When two scenarios are within
   each other's reported uncertainty, the chart says so visually
   (banded overlap region).
   *User example.* Reviewer challenges *"FF55 outperforms NGFS"* — the
   banded chart shows the bands overlap by 60 %, the claim is
   moderated.

### B.3 — M·03 Secretariat News

1. **Saved-search auto-digest into a chapter.** Pin a saved search to a
   chapter; news items in that search appear as evidence candidates in
   Report Studio.
   *User example.* The *FuelEU Maritime* saved search drips into the
   *Maritime* chapter; the chapter author sees 4 new candidate evidence
   items in their Workbench every Monday.

2. **News-to-policy auto-link with confidence.** Already exists; extend
   so accepted links push directly into the *Policy Navigator* (M·04)
   timeline as "press signal" entries.
   *User example.* A Politico brief about a Council vote shows up on
   the ESR timeline within an hour, before EUR-Lex catches up.

3. **Editorial-bias tag per source.** Source outlets are tagged for
   editorial stance (centrist, industry-aligned, NGO-aligned) so
   citations of news in reports are visibly diverse.
   *User example.* The *Industry* chapter draws news from 3 outlets all
   industry-aligned; the bias-tag dashboard flashes amber; the editor
   adds two NGO-aligned briefs to balance.

4. **Per-language coverage filter.** Today the feed is mostly EN; add
   FR / DE / ES / IT / PL filters with auto-translation tooltips.
   *User example.* The Polish coverage of the ETS2 vote shows up;
   chapter 7 cites a Polish-language source for the first time.

### B.4 — M·04 EU Policy Navigator

1. **Policy timeline export as report figure.** A timeline that auto-renders
   as a publication-quality figure in the report, with the same vintage
   lock as M·02.
   *User example.* The EU 2040 chapter ends with a timeline of every
   relevant legislative act since 2018; the figure regenerates if a new
   act is added before publication.

2. **Connection-network export.** Export the force graph for a chosen
   filter as a static SVG with the same legend conventions as the
   in-app version.
   *User example.* Chapter 9 prints the *Effort Sharing* connection
   subgraph as Fig 9.3; readers see the same graph the secretariat
   sees in the app.

3. **Article-precision deep-link in citations.** A citation to a policy
   article (*"ESR Art 5(3)"*) renders in the report as a clickable
   anchor that lands on the exact article in the live MethodHub.
   *User example.* The PDF reader (or the HTML version) clicks
   *"Art 5(3)"*; MethodHub opens at that article with a ring pulse.

4. **Implementation-gap chart auto-build.** Per Member State, the gap
   between target and observed; chart auto-built from the navigator
   plus M·02 data.
   *User example.* Chapter 6 cites the implementation gap for each MS;
   the figure regenerates on every quarterly EUR-Lex pull.

5. **Trilogue / amendment tracker.** Track a file from Commission
   proposal → Council general approach → EP first reading → trilogue →
   adoption, with diffs at each step.
   *User example.* The chair asks *"how did Article 30 evolve?"*;
   the tracker shows the four versions side by side in 30 seconds.

### B.5 — M·05 Content Analysis

1. **Coding output → chapter evidence base.** Coded segments tagged
   with a chapter ID flow into Report Studio as the chapter's evidence
   base; the lit-review writes from the codebook, not from memory.
   *User example.* The *Mitigation* chapter's evidence base is 240
   coded segments grouped by code; the author writes paragraph by
   paragraph against the segments instead of skimming PDFs.

2. **AI-suggested codes scoped to a report's codebook.** When a new
   document is added, the AI only suggests codes from the active
   report's codebook (not the universal taxonomy).
   *User example.* No more amber suggestions of *"Adaptation"* on a
   pure-mitigation report; the suggestions stay on-scope.

3. **Inter-coder agreement metric.** When two coders work the same
   document, compute κ (Cohen's kappa) per code; surface low-agreement
   codes for codebook clarification.
   *User example.* The *Just Transition* code shows κ = 0.41 between
   coders; the codebook gets a clearer definition; agreement rises to
   0.78.

4. **Auto-summarise a code group.** *"Summarise everything coded as
   *Carbon Pricing* across the corpus"* → a paragraph draft with
   citations to every contributing segment.
   *User example.* The first-draft paragraph for *Carbon Pricing*
   takes 30 seconds instead of a day; the author edits, doesn't
   compose from blank.

5. **Word add-in: cite-and-evidence drawer in Word.** The author writes
   in Word; a side pane shows the codebook, the references, the live
   suggestions, and inserts citations at the cursor.
   *User example.* The author keeps writing in Word (where the Board
   reviews) but every citation insertion is one click and survives
   round-trip.

---

## C. New scientific & policy APIs / data sources

The modules above only pay off if fresh data flows in continuously. Today
we wire EUR-Lex, Eurostat, IIASA, Crossref, and a few RSS feeds. The list
below is what would noticeably raise the evidence base.

### C.1 — EU primary sources (free, no procurement)

1. **EUR-Lex SPARQL endpoint** (already a partial pull) — extend to
   amendments, consolidated text diffs, and the full Cellar metadata so
   the trilogue tracker (B.4.5) can be built without scraping HTML.
2. **EP Open Data** (`data.europarl.europa.eu`) — MEP votes, plenary
   amendments, committee opinions; feeds the Policy Navigator timeline
   and the Press tracker (M·18).
3. **Council Open Data** (`data.consilium.europa.eu`) — General Approach
   texts, Presidency programmes, working-party agendas.
4. **Have-Your-Say (`ec.europa.eu/info/law/better-regulation`)** — public
   consultation feeds with comment counts; powers the Public Consultation
   Portal (M·16).
5. **TED (Tenders Electronic Daily)** — public-procurement signals on
   climate-relevant contracts; useful for the *Funding Sources* beta
   module's graduation.
6. **Comitology Register** — implementing/delegated act tracker; today
   invisible to the Policy Navigator.
7. **EEA Discomap / SDI services** — geospatial layers (NUTS-3 emissions,
   air quality, biodiversity); enables proper map figures in chapters.
8. **EEA Reportnet 3 (CDR)** — Member-State reporting submissions; powers
   the implementation-gap chart (B.4.4).

### C.2 — EU statistics

1. **Eurostat REST API** (already partially used) — extend to NUTS-3
   resolution, sector-coded GHG inventories, energy balances.
2. **EU Reference Scenario 2024 / 2026** — Commission's official long-term
   energy and climate projections; should be a first-class scenario in
   M·02 alongside IIASA AR6.
3. **EU ETS Transaction Log (EUTL)** — installation-level emissions and
   allowance flows; powers carbon-pricing chapters end-to-end.
4. **JRC IDEES (Integrated Database of the European Energy System)** —
   full sectoral energy decomposition; the missing link between Eurostat
   and PyPSA.
5. **JRC EDGAR** — country-level GHG inventories with consistent global
   coverage; useful for cross-country comparisons.
6. **JRC GHSL (Global Human Settlement Layer)** — exposure data for the
   *Climate Adaptation* beta module's graduation.

### C.3 — Climate science

1. **Copernicus Climate Data Store (CDS API)** — ERA5 reanalysis, CMIP6
   downscaled projections, seasonal forecasts; the heavy data layer
   under all impact and adaptation chapters.
2. **Copernicus Atmosphere Monitoring (CAMS)** — air-quality and
   wildfire emissions; useful for health-co-benefit narratives.
3. **NASA POWER / EUMETSAT** — radiation and wind for renewable-potential
   figures.
4. **Global Carbon Budget (Global Carbon Project)** — annual update;
   should auto-pull in October each year.
5. **Carbon Monitor** — near-real-time emissions; feeds the briefing kit
   for *"latest available"* numbers.
6. **IPCC AR6 / AR7 figure & data archive** (via DDC) — pinned source
   for any IPCC-derived chart in an ESABCC report.
7. **WMO State of the Climate annual** — referenced in every annual
   ESABCC report; auto-import the data tables.

### C.4 — Scenarios & integrated-assessment models

1. **IIASA AR6 Scenario Explorer** (already wired) — keep current; pin
   release tags per report.
2. **NGFS Scenario Explorer** — already wired; extend to v5+ Phase 5
   variants.
3. **ENGAGE / ECEMF / EUCalc / SENTINEL / MESSAGEix** — open IAM
   pipelines that produce EU-tailored scenarios; ingestion via the
   `pyam` package.
4. **PyPSA-Eur datasets** (already a service in this repo) — promote the
   energy-system beta module on the back of this.
5. **REMIND-EU / WITCH-EU outputs** via IIASA SSP database — for IAM
   diversity in chapters that need it.
6. **PRIMES** — the Commission's reference IAM; contractual access via
   ICCS-NTUA; would require procurement but high value.

### C.5 — Bibliography & open scholarship

1. **OpenAlex** — free Crossref-superset with topic concepts, citation
   graph, institutional affiliations; powers the citation-graph view
   in M·01 and the cross-report memory in M·17.
2. **Semantic Scholar API** — paper TLDRs, influence scores, paper
   embeddings; useful for the lit-review summarisation (B.5.4).
3. **OpenCitations** — open citation index; backup for Crossref's patchy
   `references` coverage.
4. **Unpaywall** — open-access PDF discovery for any DOI; reduces the
   "I have the citation but not the PDF" friction.
5. **CORE / BASE** — repository-level full-text search beyond OA
   journals.
6. **Retraction Watch API** — powers the retraction watch (B.1.5).
7. **Altmetric / PlumX** — for the Press tracker (M·18).
8. **ORCID** — author disambiguation; required for proper COI tracking
   in Reviewer Pool (M·11).
9. **ROR (Research Organization Registry)** — institution disambiguation;
   feeds the COI logic and reviewer-pool affiliation views.
10. **DataCite** — dataset DOIs; enables the dataset-DOI auto-citation
    in B.2.4.

### C.6 — News, media, and public discourse

1. **GDELT 2.0** (already wired in the *Media Monitoring* beta) —
   graduate this; full event database in 100+ languages.
2. **EU Newsroom RSS / EurActiv / Politico Pro / Contexte** — paid
   subscriptions but already inside many EEA units; M·03 should ingest
   what is licensed.
3. **AP / Reuters / AFP newswires** — high-credibility press signals;
   often available through DG COMM.
4. **Mastodon / Bluesky firehose for #climate** — open replacement for
   the Twitter signal we lost in 2023.
5. **YouTube Data API (committee hearings)** — auto-transcribe ENVI /
   ITRE / ECON committee sessions; cite verbatim quotes in chapters.
6. **Hansard EP / Council** — official transcripts of plenary debates.

### C.7 — Climate finance, industry, and economic data

1. **OECD DAC / Creditor Reporting System** — bilateral climate finance
   flows; powers the *Climate Finance* beta module's graduation.
2. **EIB Project Database** — green-bond and loan portfolio.
3. **European Green Bond Standard register** — once live (2026).
4. **CDP corporate disclosure** — company-level emissions, targets.
5. **CSRD / ESRS XBRL filings** (from 2025 onward via ESAP) — structured
   sustainability disclosures by EU-listed companies.
6. **EU Taxonomy alignment data** — via EFRAG / ESAP.
7. **Climate Policy Database (NewClimate Institute)** — global policy
   inventory; complements EUR-Lex with non-EU comparators.
8. **Climate TRACE** — independently measured emissions by asset class.
9. **IRENA / IEA open datasets** — renewables capacity, investment
   flows.

### C.8 — AI / LLM-side integrations

1. **Anthropic Files API** — already wired for the AI layer; promote to
   ingestion path for very long documents (CSRD reports, ToR drafts).
2. **Microsoft Graph Copilot** — on the roadmap for the AI layer
   (Path B); use it specifically for the Briefing Kit (M·15) which
   benefits from M365 doc context.
3. **Anthropic Agent SDK / Claude Code** — already in use for the dev
   loop; same primitive can power the Fact-Check Co-pilot (M·08) as a
   long-running agent that re-runs lints on every save.
4. **Embedding store** (pgvector inside the existing Postgres) —
   foundational for cross-report memory (M·17), citation-in-context
   (B.1.2), and AI assistant anchoring (existing pro-UX brainstorm).

---

## D. Cross-cutting workflow improvements

These ride on top of the modules and APIs above. Each is small but
compounds across every report cycle.

1. **Report Build CI.** A GitHub Action (or self-hosted equivalent)
   that takes a report draft and runs: link-checker, citation-checker,
   IPCC-language linter, fact-check lint, figure rebuild, glossary
   check, Mandate Tracker coverage, reproducibility-kit packaging.
   Same green/red signal as software CI.
2. **Per-chapter Kanban.** *Drafting → internal review → Board review →
   cleared → typeset → published*. Visible at-a-glance; the chair sees
   readiness without an email.
3. **Time-to-publication telemetry.** Auto-measure the cycle time of
   each report stage; the Secretariat sees where the bottleneck is
   (almost always reviewer response).
4. **Author-contribution / CRediT register.** Per chapter, who did what
   (conceptualisation, data curation, writing-original-draft, …);
   exported into the published report's contributions block.
5. **Plain-language summary auto-draft.** From the executive summary,
   produce a CEFR-B1 reading-level draft; required by EU public-comms
   guidelines.
6. **Outlook / Teams / Slack integrations.** When a comment is left,
   when CI fails, when a Board sign-off is requested — push to the
   right surface; today this is email-by-email.
7. **Snapshot-on-publish.** When a report ships, every page in
   MethodHub it cites freezes a snapshot — even if the underlying data
   later changes, the citations remain valid.
8. **Corrigendum workflow.** A first-class *"issue a correction"* path
   that diffs the published PDF against the corrected version, posts
   to the website, and updates Zenodo.
9. **Cost-of-evidence dashboard.** Per chapter, how many references,
   how many policy hooks, how many coded segments, how much scenario
   data — the "evidence density" of the chapter.
10. **Chair / co-chair view.** A bird's-eye dashboard tailored to Board
    leadership: red rows from the Mandate Tracker, amber chapters in
    the Kanban, COI flags, time-to-publication trend. Two-minute
    Monday read.

---

## E. Ranked rollout (impact × feasibility × strategic fit)

Ranked across **all** of A, B, C, D above. The weighting prefers items
that (a) shorten the next report's cycle, (b) reuse infrastructure
already in the repo, (c) unblock several other items.

| Rank | Idea | Bucket | Why here |
| ---- | ---- | ------ | -------- |
| 1 | **Report Studio (M·06)** | A.1 | The missing centrepiece. Every other A/B item slots into this. Foundational. |
| 2 | **Fact-Check Co-pilot (M·08)** | A.3 | Highest per-hour quality lift; rides on M·01/M·02/M·05 data already in the repo. |
| 3 | **Per-chapter Kanban + Report Build CI** | D.1, D.2 | Operational backbone — converts ad-hoc reporting into a tracked process. |
| 4 | **Mandate & Coverage Tracker (M·10)** | A.5 | Cheap to build, prevents the worst class of editorial failure (off-scope reports). |
| 5 | **Figure Factory (M·09)** | A.4 | Removes the most common late-stage scramble (figure rebuilds); enables vintage-lock (B.2.1). |
| 6 | **Coding output → chapter evidence base** | B.5.1 | Connects M·05 to actual writing; massive lit-review payoff. |
| 7 | **OpenAlex + Retraction Watch + ORCID + ROR** | C.5 | Foundational for any citation-quality work; all free, all stable APIs. |
| 8 | **Review Roundtable (M·07)** | A.2 | Replaces the worst part of the cycle (Track Changes ping-pong). |
| 9 | **Vintage lock per report (B.2.1) + dataset-DOI auto-citation (B.2.4)** | B.2 | Unblocks reproducibility-kit (M·13) and figure factory (M·09). |
| 10 | **Cross-Report Memory (M·17)** | A.12 | Embedding store + Postgres pgvector; enables consistent positions across reports. |
| 11 | **IPCC-Calibrated Language Linter (M·12)** | A.7 | One sprint of rules; Board reviewers stop nit-picking calibrated language. |
| 12 | **EUR-Lex amendments + EP/Council Open Data** | C.1.1–C.1.3 | Powers M·04 deeper; tractable, free, EU primary sources. |
| 13 | **Reviewer Pool & Conflicts Manager (M·11)** | A.6 | Replaces a spreadsheet that lives on someone's laptop. Required for COI hygiene. |
| 14 | **Crossref refs sync + retraction watch on M·01** | B.1.4, B.1.5 | Citation hygiene; near-zero cost, large reputational protection. |
| 15 | **Plain-language summary auto-draft** | D.5 | EU comms requirement; AI-assisted; one prompt + edit pass per report. |
| 16 | **Reproducibility Kit / Zenodo Builder (M·13)** | A.8 | Audit-ready output; rises in value as ECA / external scrutiny grows. |
| 17 | **Scenario annotation overlay + diff scrubber persisted in Studio** | B.2.3, B.2.5 | Pure UX; closes the M·02 ↔ Report Studio loop. |
| 18 | **Briefing & Speech Kit (M·15)** | A.10 | High value for the chair; high quality bar — must wait for fact-check (M·08). |
| 19 | **Translation & Multilingual Sync (M·14)** | A.9 | High strategic fit; effort scales with language count, so start with DE/FR. |
| 20 | **Risk & Uncertainty Register (M·19)** | A.14 | Rigour-multiplier; valuable but only after Fact-Check Co-pilot is in place. |
| 21 | **Public Consultation Portal (M·16)** | A.11 | Required for major reports only; build when the next consultation cycle is on the calendar. |
| 22 | **Press & Dissemination Tracker (M·18)** | A.13 | Promote the *Media Monitoring* beta into this; reuses GDELT pipeline. |
| 23 | **Copernicus CDS + Climate TRACE + Carbon Monitor** | C.3, C.7 | Heavy data; only worth ingesting once the *Climate Adaptation* and *Climate Finance* beta modules graduate. |
| 24 | **PRIMES / EU Reference Scenario** | C.4.6, C.2.2 | Highest scenario value, but procurement / contractual hoops; pace deliberately. |
| 25 | **Microsoft Graph Copilot for Briefing Kit** | C.8.2 | On Path B roadmap already; align with M·15 build. |

---

## F. What success looks like

If the top 10 of this list ships, the next ESABCC report cycle should pass
three felt tests:

1. **The "first-draft test."** A chapter author opens Report Studio,
   pulls evidence from M·01 / M·02 / M·04 / M·05 by reference, and
   produces a fact-check-clean first draft in days, not weeks.
2. **The "Board sign-off test."** A Board member reviews a chapter on
   their phone, leaves five anchored comments, returns a week later and
   sees each one resolved — with the diff that resolved it — without a
   single email round-trip.
3. **The "press-day test."** On launch day, the chair walks into a
   press conference with a Briefing Kit produced from the live report,
   the report itself is reproducible from a Zenodo bundle, and the
   media tracker is already counting the first wave of coverage by
   midnight.

Hitting those three is what *"more efficient at producing scientific
reports"* operationally means. Everything in this brief serves one of them.





