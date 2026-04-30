# Brainstorm — Major UI/UX Review of the Five Modules, Re-Ranked

A fourth-pass review of the five production modules
(`/references`, `/scenarios`, `/news-feed`, `/policy-navigator`,
`/content-analysis`). Companion to
[Brainstorm — 20 module improvements](brainstorm-modules-ux-userspace.md)
and [Brainstorm — professional UX for the five modules](brainstorm-pro-ux-five-modules.md),
but **deliberately fresh angles**: information architecture, workflows
and cross-module friction — not micro-interactions already covered.

> **Status.** Design brief, not a build log. Every item is sized for
> one engineer + one designer in a single sprint. The unified ranking
> at the bottom is the suggested order — biggest user lift per build day
> first.

---

## How items are scored

Each idea is scored on two 1–5 axes:

| Axis | What it means | 1 | 5 |
| --- | --- | --- | --- |
| **User value** (V) | Felt improvement on the daily flow of the Secretariat (Maria, Sebastian, EEA secondee). | Cosmetic | Removes a recurring pain |
| **Feasibility** (F) | Engineering reach: code we already have, surface area, risk. | Multi-sprint, cross-cutting | One file, one PR |

**Priority score** = V × F (max 25). Anything ≥ 16 is a *do-now*; 10–15
is *next quarter*; < 10 is *eventually*. Per-module sections preserve
this scoring so each module can be planned independently; the final
table merges all 30 items into a single shipping queue.

---

## M·01 — Reference Manager (`/references`)

Biggest unaddressed friction: the **library picker** sits beside a
1500-line page that owns master/detail state, so users routinely lose
their place when they switch libraries; the `/annotate` and
`/audit-report` subroutes feel like separate apps; bulk actions exist
on the list but not on selections that span filters.

| # | Idea | V | F | V×F |
| --- | --- | --: | --: | --: |
| 1.1 | **Master/detail with persistent URL state.** Encode `lib`, `q`, `selected`, `view` in the URL so back/forward, refresh and shared links restore the same view. Today reload drops the selection. | 5 | 4 | **20** |
| 1.2 | **Unified left rail: Libraries · Tags · Saved searches · Recent.** Replace the library-only sidebar with a four-section rail. Saved searches and "Recent 10" are the two most-asked features in support tickets. | 5 | 4 | **20** |
| 1.3 | **PDF reader and library in one viewport.** Open a reference → PDF opens in a right pane, library list dims but stays clickable. Removes the modal-vs-route ambiguity of `/annotate`. | 5 | 3 | **15** |
| 1.4 | **Cite-while-you-write panel mirroring the Word add-in.** A floating "Insert citation" widget on `/references` produces the exact CSL string the Word add-in would inject — copy/paste parity for users not on Office. | 4 | 4 | **16** |
| 1.5 | **Conflict resolver for duplicate DOIs.** When import sees a DOI already in the library, present a 2-column diff (incoming vs. existing) with field-level merge, instead of silently skipping. | 4 | 3 | **12** |
| 1.6 | **"Where is this cited?" backlinks.** On a reference card, list every policy / news item / M·05 segment that cites it. Pulls existing `citations_used` + policy reference graph; no new schema. | 5 | 3 | **15** |

---

## M·02 — Data & Scenarios (`/scenarios`)

`ScenarioExplorer` is a single ~3 kLoC client component that owns query
builder, filters, charts, submissions and uploads. The biggest UX cost
is **cognitive entry tax** (a new analyst sees a wall of controls and
freezes) and **chart-first, narrative-last** ordering — the exported
chart needs context the page already has but never carries with it.

| # | Idea | V | F | V×F |
| --- | --- | --: | --: | --: |
| 2.1 | **"What can I learn here?" landing strip.** Above the explorer, three pre-baked questions ("How fast must EU transport decarbonise to hit Net-Zero?", "Which sector lags most under FF55?") that load a configured chart in one click. Removes the cold-start. | 5 | 4 | **20** |
| 2.2 | **Narrative caption auto-drafted under every chart.** A 2-sentence LLM caption — "Under NGFS Net-Zero, EU transport CO₂ falls 41 % by 2035…" — generated from the visible series, editable, included in PNG/SVG/CSV exports. | 5 | 3 | **15** |
| 2.3 | **Split-pane: query builder ↔ chart, with collapsible builder.** Once a chart is dialled in, collapse the builder to a single chip strip; expand on click. Today the builder permanently consumes 40 % of the viewport. | 4 | 4 | **16** |
| 2.4 | **Scenario lineage badge.** Every chart series carries a small badge — *IIASA AR6 · NGFS phase 4 · uploaded by sf@ · 2026-03-12* — click for the upload form / source citation. Builds trust without leaving the page. | 4 | 4 | **16** |
| 2.5 | **Unit + scope toggles in the chart, not the builder.** Switching Mt CO₂e ↔ % of 1990, gross ↔ net, EU-27 ↔ EU+UK should be one tap on the chart axis label. Today it requires re-running the query. | 4 | 3 | **12** |
| 2.6 | **Submissions queue → reviewer dashboard.** `/scenarios/submissions` today is a list. Promote it to a dashboard with status counts, SLA timer, and a side-by-side "incoming vs. accepted" diff. The Secretariat's only QA gate. | 3 | 3 | **9** |

---

## M·03 — Secretariat News (`/news-feed`)

A 3.9 kLoC route — the page does *too many jobs*: feed, daily briefing,
24h update, source filtering, swim-lane policy clock, RSS curation. The
biggest UX wins are **separating jobs that look the same** and **giving
the editorial layer (briefing, special items) its own surface**.

| # | Idea | V | F | V×F |
| --- | --- | --: | --: | --: |
| 3.1 | **Three explicit modes: Feed · Briefing · Clock.** Top-of-page segmented control. Each mode owns its own URL, its own filter set, its own keyboard map. Today they're tabs that share state and bleed into each other. | 5 | 4 | **20** |
| 3.2 | **"What's new since you last visited" banner.** First card on return is a 1-line *"12 new items since Tue 14:32 — open"*; tapping it scrolls to the read/unread divider. Replaces the always-on blue dot. | 5 | 5 | **25** |
| 3.3 | **Source-credibility tier badges.** EUR-Lex / EEA / Commission = primary, agency releases = secondary, news outlets = tertiary, blogs = community. One pre-attentive colour band on each card. Removes the "is this official?" guesswork. | 5 | 4 | **20** |
| 3.4 | **Briefing sent to inbox at 08:00 CET.** A daily email mirror of the briefing (TL;DR + 5 bullets) gated on `user_preferences.notification_frequency`. Keeps casual users in the loop without opening MethodHub. | 5 | 3 | **15** |
| 3.5 | **Reading-list export to PDF / EPUB.** "Save to read later" today goes nowhere offline. Add an evening-export job: items saved today bundle into one PDF/EPUB hitting the inbox at 18:00. | 3 | 3 | **9** |
| 3.6 | **Suggest-a-source one-click form.** Every empty result page links to a 3-field form (URL, why it matters, who's relevant). Editorial team triages; today the only path is Slack. | 3 | 5 | **15** |

---

## M·04 — EU Policy Navigator (`/policy-navigator`)

The graph is the iconic surface but it's also the **highest cognitive
load surface in MethodHub**. The remaining gaps are around *task
completion* (a user usually arrives looking for one article in one
policy, not for a network walk) and *cross-module landings* (deep links
from M·03 / M·05 land on the graph instead of the article).

| # | Idea | V | F | V×F |
| --- | --- | --: | --: | --: |
| 4.1 | **Default to article-resolution on deep-link.** Links of the form `/policy-navigator?article=ESR/5/3` should land on the article view, not the graph. Cross-module navigations (60 % of traffic) currently bounce. | 5 | 5 | **25** |
| 4.2 | **"Read" mode for policies.** A clean reader pane (left: ToC, centre: article text, right: connections) with no graph by default. The graph stays one click away. Maps to how 80 % of sessions actually use the module. | 5 | 4 | **20** |
| 4.3 | **Compare-two-policies mode.** Side-by-side article view of, e.g., ESR pre/post-amendment or ESR ↔ Effort-Sharing draft. Re-uses the existing scenario-diff scrubber pattern. | 4 | 3 | **12** |
| 4.4 | **Policy clock + analytics on the same page.** Today `/policy-navigator/analytics` is a separate route. Move it as a collapsible panel on the main page so timeline + counts are seen alongside the graph. | 4 | 4 | **16** |
| 4.5 | **Saved trails.** A "trail" = ordered list of articles visited in a session, named and saved. Lets the user prep a chair-briefing as they read; replays in one click later. | 4 | 3 | **12** |
| 4.6 | **Connection rationale from the LLM.** Hovering an edge shows not just confidence but a 1-sentence explanation ("ETS2 references ESR Annex II for sector boundaries"). Generated once, cached on the edge row. | 4 | 3 | **12** |

---

## M·05 — Content Analysis (`/content-analysis`)

The module is structurally three apps under one route — workbench,
analysis modes, project locks — and the **mode taxonomy is the single
biggest UX cost**: a new user can't tell what each tab does without
opening it. Coding-fatigue mitigations (covered in the prior brief)
matter, but *finding the right mode in the first place* matters more.

| # | Idea | V | F | V×F |
| --- | --- | --: | --: | --: |
| 5.1 | **Project-first navigation.** Land on a "Projects" board (cards: name, lead, doc count, last activity, lock state). Clicking a project opens its workbench. Today the user lands in a tab and has to remember which project they were in. | 5 | 4 | **20** |
| 5.2 | **Mode tabs with task verbs, not nouns.** Rename tabs to *Read · Code · Compare · Summarise · Export*. Each tab gets a 1-line subtitle and an "open recent doc" shortcut. | 4 | 5 | **20** |
| 5.3 | **Lock-state badges everywhere.** Project, document and code-tree headers all show 🔒 holder · ⏱ heartbeat. Today the lock API is wired but not surfaced; users overwrite each other. | 5 | 4 | **20** |
| 5.4 | **Two-pane code book vs. document split with linked scroll.** Selecting a code in the tree highlights every gutter mark in the doc pane and vice-versa. Re-uses the existing tagging service; no new schema. | 4 | 3 | **12** |
| 5.5 | **AI-suggested code book from the first 3 documents.** Run a clustering pass over the first three uploaded docs; propose a 20-code starter tree the user accepts/edits. Removes the blank-tree start. | 5 | 2 | **10** |
| 5.6 | **Reviewer mode (read-only, comment-only).** A second persona that can comment on coded segments without being able to mutate the tree. Maps to the chair-review workflow before public release. | 4 | 3 | **12** |

---

## Unified ranking (all 36 items, sorted by V × F)

Top of the list ships first. Ties broken by feasibility (cheaper item
wins). Items at score 12 share the *next-quarter* tier; items below 10
are deferred unless a later item depends on them.

| Rank | Score | Module | Idea |
| ---: | ---: | --- | --- |
| 1 | **25** | M·03 | 3.2 — "What's new since you last visited" banner |
| 2 | **25** | M·04 | 4.1 — Default to article-resolution on deep-link |
| 3 | **20** | M·01 | 1.1 — Master/detail with persistent URL state |
| 4 | **20** | M·01 | 1.2 — Unified left rail (Libraries · Tags · Saved · Recent) |
| 5 | **20** | M·02 | 2.1 — "What can I learn here?" landing strip |
| 6 | **20** | M·03 | 3.1 — Three explicit modes: Feed · Briefing · Clock |
| 7 | **20** | M·03 | 3.3 — Source-credibility tier badges |
| 8 | **20** | M·04 | 4.2 — Read mode for policies |
| 9 | **20** | M·05 | 5.1 — Project-first navigation |
| 10 | **20** | M·05 | 5.2 — Task-verb mode tabs |
| 11 | **20** | M·05 | 5.3 — Lock-state badges everywhere |
| 12 | **16** | M·01 | 1.4 — Cite-while-you-write panel mirroring the Word add-in |
| 13 | **16** | M·02 | 2.3 — Collapsible query builder |
| 14 | **16** | M·02 | 2.4 — Scenario lineage badge |
| 15 | **16** | M·04 | 4.4 — Policy clock + analytics on the same page |
| 16 | **15** | M·01 | 1.3 — PDF reader and library in one viewport |
| 17 | **15** | M·01 | 1.6 — "Where is this cited?" backlinks |
| 18 | **15** | M·02 | 2.2 — Auto-drafted narrative caption under every chart |
| 19 | **15** | M·03 | 3.4 — Briefing email at 08:00 CET |
| 20 | **15** | M·03 | 3.6 — Suggest-a-source one-click form |
| 21 | **12** | M·01 | 1.5 — DOI conflict resolver |
| 22 | **12** | M·02 | 2.5 — Unit/scope toggles on the chart axis |
| 23 | **12** | M·04 | 4.3 — Compare-two-policies mode |
| 24 | **12** | M·04 | 4.5 — Saved trails |
| 25 | **12** | M·04 | 4.6 — Connection rationale from the LLM |
| 26 | **12** | M·05 | 5.4 — Two-pane code book / document with linked scroll |
| 27 | **12** | M·05 | 5.6 — Reviewer mode (read-only, comment-only) |
| 28 | **10** | M·05 | 5.5 — AI-suggested code book from first 3 docs |
| 29 | **9**  | M·02 | 2.6 — Submissions reviewer dashboard |
| 30 | **9**  | M·03 | 3.5 — Reading-list export to PDF / EPUB |

---

## Cross-cutting observations

Three patterns recur across modules; investing in them once pays back
in every section above.

1. **URL-as-state.** Every module currently keeps non-trivial state in
   React only — selection, filters, mode, library. Encoding this in the
   URL is the cheapest single intervention with the broadest reach
   (1.1, 3.1, 4.1, 5.1).
2. **Task-verb information architecture.** The current routes name
   *things* (`/scenarios`, `/content-analysis`) instead of *jobs*
   (*Compare scenarios*, *Code a document*). Renaming tabs and adding
   landing strips (2.1, 5.2) restores task legibility without a route
   rewrite.
3. **Provenance everywhere.** Lineage badges, source tiers, lock
   holders, citation backlinks — five separate items above (1.6, 2.4,
   3.3, 4.6, 5.3) reduce to the same primitive: a small "where did
   this come from / who owns it now" chip. Build the chip once.

---

## Suggested rollout

* **Sprint 1 (foundation, score ≥ 20).** Items #1–#11. URL-state work
  (1.1, 4.1, 5.1) lands first because it's a dependency for several
  later items.
* **Sprint 2 (next-quarter, score 15–16).** Items #12–#20. Mostly
  surface-level features that ride on the foundations from sprint 1.
* **Backlog (score < 15).** Items #21–#30. Re-rank quarterly against
  user-research signal — some of these will jump up once the top
  half ships and the next pain becomes visible.

---

## What success looks like

If the top third of this list ships, three felt tests should pass:

1. **The "back button never lies" test** — every URL in MethodHub
   restores exactly the view it was minted on, across all five modules.
2. **The "first 60 seconds" test** — a new EEA secondee opens any
   module and within one minute knows what task it does, what mode
   they're in, and where the next click is.
3. **The "provenance test"** — every chart, every code, every
   citation, every connection shows where it came from and who owns
   it, without the user opening a sidebar.

These three are orthogonal to the *Linear / first-day analyst /
Saturday-morning* tests in the prior brief. Together the two briefs
cover both the *micro-interaction* layer (prior brief) and the
*information architecture* layer (this brief).






