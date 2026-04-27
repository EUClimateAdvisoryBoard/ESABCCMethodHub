# Brainstorm — 20 Module Improvements (Depth · UI/UX · User Space)

A second-pass brainstorm following PR #20. The first pass focused on per-module
depth (cite-PDF drop, scenario views, saved searches, citation validation, code
merge/move). This pass widens the lens to **cross-module depth**, **UI/UX**,
and **User Space** — i.e. how an individual analyst lives inside MethodHub day
to day, and how a small team works together inside it.

Each idea below has a one-line concrete **User example** showing what changes
for the person sitting at the screen. Ranking at the bottom is by
*impact × feasibility × strategic fit* — top of the list is what I would build
first.

> **Status (branch `claude/brainstorm-give-modules-JaeRW`):** all 20 ideas are
> implemented. See [Rollout TODO](brainstorm-rollout-todo.md) for the
> migrations + env vars you need to run before deploying. See
> [User Space](user-space.md) for the cross-module surfaces this branch
> introduces.

---

## 1. "My Workbench" — cross-module home dashboard
A personal landing page at `/profile/workbench` aggregating, across all five
modules: unread items in saved searches, unresolved comments on artefacts the
user owns, segments awaiting review, recent annotations, drafts.

**User example.** Maria opens MethodHub on Monday morning. Instead of clicking
through M·01 → M·03 → M·04 → M·05 to see what changed, her Workbench shows
"3 new EUR-Lex items in your *FuelEU Maritime* saved search · 2 unresolved
replies on the ESR↔ETS2 connection · 5 segments AI pre-tagged for your
review." One click takes her to each.

---

## 2. Global command palette (⌘K) — unified search across modules
A single typeahead that searches references (M·01), scenarios (M·02), news
(M·03), policies + articles (M·04), and code segments (M·05) in one ranked
list, with module-prefix filters (`p:` policies, `r:` refs, `n:` news,
`c:` codes).

**User example.** Sebastian presses ⌘K, types "Article 5 ESR", picks the
article hit, lands on the article anchor in the Policy Navigator — without
ever opening a sidebar.

---

## 3. Team Workspaces (shared "research projects")
A workspace owns a curated set of references, saved scenario views, saved
news searches, pinned policies, and a comment thread. Invitable by Secretariat
staff, isolated from personal saves.

**User example.** The four-person *MRR review* team creates a workspace; one
member drops 30 references, another saves three scenario views, a third
pins 12 policies. Every member sees the same curated set, edits show up live,
nobody has to forward URLs over Teams.

---

## 4. @-mentions, threaded comments, in-app inbox
Mentioning `@maria` on a connection, annotation, segment, or news card creates
a notification in Maria's inbox + (opt-in) email. Threads can be resolved.

**User example.** Sebastian reads an AI-generated citation he distrusts, drops
"@maria can you double-check Art 5(3) here?" inline. Maria sees the bell
indicator at next login, clicks straight to the artefact, replies, marks
resolved.

---

## 5. Personal preferences panel
A `/profile/preferences` tab with: notification frequency (immediate / daily /
weekly), email digest on/off, UI density (comfortable / compact), theme
(system / light / dark), default citation style for M·01 exports, default
language for AI summaries.

**User example.** A user who reads MethodHub on Saturday morning over coffee
flips to "weekly digest only" + "compact density" + "dark theme". No more
Friday email floods; lists fit more on screen.

---

## 6. Cross-module context drawer
A right-side slide-in panel always available via a keyboard shortcut. Knows
the current artefact and surfaces related items from other modules: linked
references, news mentions, scenario impacts, code segments tagged on it.

**User example.** Reading the ESR text in M·05, Maria swipes in the drawer
and sees "12 references cite this · 4 news items in last 30 days · linked to
*Effort Sharing* connection in M·04." She drags one reference into her
annotation without leaving the page.

---

## 7. Full dark mode
Not just `prefers-color-scheme` respect — an explicit toggle, dark-mode
chart palette (the ESABCC 16 colours re-tuned for dark backgrounds), darkened
EUR-Lex PDF viewer.

**User example.** Late-evening reviewer reads a 40-page ESR consolidated text
without eye strain; the policy-gap chart no longer glares white.

---

## 8. Bulk actions on multi-select lists
Shift-click / cmd-click selection on references, policies, news items, and
segments. Bulk: tag, export, add-to-workspace, delete, mark-as-read,
add-to-reading-list.

**User example.** Analyst shift-selects 12 references, clicks **Export
BibTeX**, gets one file. Today they would click **Export** twelve times.

---

## 9. Undo toast + saved-state rollback
Every destructive or significant action emits a 15-second undo toast, plus
keeps the last 10 versions of any editable artefact (connection, code tree,
annotation) viewable / restorable.

**User example.** Maria drags a code into the wrong parent. Toast: "Moved
*Just Transition* under *Carbon Pricing*. **Undo**." Click within 15s,
restored. If she notices Tuesday, version history still has it.

---

## 10. Mobile-optimised Policy Navigator (graph → list mode)
On viewports below `md`, the D3 force graph automatically swaps for a
swipeable card list grouped by sector, with tap-to-expand connection details.

**User example.** In a Brussels-bound train, an analyst pulls up a policy on
their phone, taps three connection cards in sequence to brief themselves
before the meeting. Today the graph is unreadable on phone.

---

## 11. AI assistant anchored to page context
A chat sidebar that knows which module, which artefact, and which selection
the user has open. Answers cite the actual loaded policy/reference text, not
the open web.

**User example.** On the M·04 ESR page, user types "How does this differ
from EED Article 7?" The reply quotes both articles by paragraph with
inline `[ESR Art 4(2)]` citations, all from the EUR-Lex cache MethodHub
already has.

---

## 12. Onboarding tour + contextual tooltips per module
A 4–6 step Shepherd-style walkthrough on first visit to each module
(skippable, replayable from `?help=1`). Persistent **?** icon in headers
opens a context-relevant tooltip set.

**User example.** A new EEA secondee opens M·04, gets walked through filter
pills, connection types, AI badge meaning. Three days later they hit `?` on
a confidence score they don't understand and read the explanation.

---

## 13. Drag-and-drop personal collections (folders / smart sets)
Personal folders that can hold *anything cross-module*: references,
policies, news items, code segments. Smart sets (saved filters) live alongside
manual folders.

**User example.** Analyst drags 8 references, 3 policies and 4 news items
into a folder *"FF55 evidence base"*. Later opens the folder and exports
everything as one bibliography + brief.

---

## 14. Scenario ↔ Policy alignment view (M·02 ↔ M·04)
Pick an IIASA / AR6 scenario in M·02, get a sector-by-sector overlay of the
EU policies (M·04) that contribute to the modelled emission cuts. Policy
gap chart annotated with policy names per sector.

**User example.** Sebastian loads the *NGFS Net Zero 2050* scenario, sees
that the transport gap is widening and that only ESR + AFIR + CO₂ Cars
currently address it — three clicks away from the connection details.

---

## 15. "Why am I seeing this?" explainability badges
Every AI-generated suggestion (matched policy on news, AI-tagged segment,
suggested reference) has a hover badge revealing the score, the matched
tokens, and the rule that fired.

**User example.** Suggested-policy popover on a news card shows
"matched on *FuelEU Maritime* short title + journalistic CELEX + 4 token
overlap (score 0.87)". Reviewer accepts informed instead of guessing.

---

## 16. Keyboard shortcuts + visible cheat sheet (`?`)
`J/K` next/prev card · `S` save · `R` reading list · `C` comment ·
`A` annotate · `/` focus search · `G then N` go to news · etc. `?` opens an
overlay cheat sheet.

**User example.** Power user clears the morning news in 90 seconds with
J/K/R, never touching the mouse.

---

## 17. Inline annotations on any text view (not just PDFs)
Highlight any phrase in a news article, policy article, or reference
abstract, attach a note, share with a workspace. Today annotations live on
PDFs only.

**User example.** Analyst highlights "tentative agreement" in a Politico
brief, attaches "*conflicts with Art 5(3) ESR*". Next visit the highlight
re-renders; the note shows on hover.

---

## 18. Public contributor profile + lightweight leaderboard
Hover any `@username` to see badge level, top 5 most-edited policies,
contribution count, member-since. Optional opt-out for users who prefer
privacy.

**User example.** New analyst sees `@maria` everywhere on cement-related
connections, hovers, finds out Maria is the in-house cement subject expert,
@-mentions her on a doubt instead of mailing the whole team.

---

## 19. Citation graph view in M·01
A second tab on the references page: a network of paper-cites-paper edges
(populated from Crossref `references` field), with the user's library
highlighted.

**User example.** Analyst opens a 2024 review paper, sees in two clicks
that it cites a 2019 foundational study they don't have — adds it to the
library with one click.

---

## 20. Change-history timeline on every editable artefact
A discreet "history" affordance on connections, code trees, annotations.
Shows diffs ("confidence 0.6 → 0.9 by @sebastian on 2026-04-20, reason:
*verified vs EUR-Lex consolidated text*").

**User example.** Reviewer challenges a connection confidence value;
opens history, sees who changed it and why; either accepts the rationale
or reverts in one click.

---

## Ranking (impact × feasibility × strategic fit)

| Rank | Idea | Why it ranks here |
| ---- | ---- | ---- |
| 1 | **My Workbench dashboard** (#1) | Highest daily-use payoff; reuses data already in `activity_log`, saved searches, saved views; turns five modules into one product. |
| 2 | **Global ⌘K command palette** (#2) | Closes the biggest navigation gap; small surface, high frequency, keyboard-first crowd loves it. |
| 3 | **Team Workspaces** (#3) | Unlocks team collaboration that today happens in Teams/email; foundational for many later features. |
| 4 | **@-mentions + threaded comments + inbox** (#4) | Cheap to add on top of existing `comments` table; massive engagement multiplier. |
| 5 | **Personal preferences panel** (#5) | Pre-requisite for digest/notification/dark-mode work; small build; users immediately notice. |
| 6 | **Cross-module context drawer** (#6) | Turns isolated module pages into a connected research surface; the "depth" multiplier. |
| 7 | **Bulk actions on lists** (#8) | Removes the most repetitive friction; one afternoon to ship per list. |
| 8 | **Undo toast + version history** (#9) | Reduces fear of editing; correlates with deeper engagement on M·04 / M·05. |
| 9 | **Dark mode** (#7) | Demanded by evening readers; mostly a Tailwind theme + chart palette swap. |
| 10 | **AI assistant anchored to context** (#11) | High delight, but quality gate is steep — must cite, must not hallucinate. |
| 11 | **Scenario ↔ Policy alignment** (#14) | Closes the M·02 / M·04 silo; the most senior analyst will use this constantly. |
| 12 | **Mobile Policy Navigator (graph → list)** (#10) | High-impact on mobile usage which today is poor; one-component rewrite. |
| 13 | **Onboarding tour + tooltips** (#12) | Critical for every new EEA secondee; cheap to ship, high retention. |
| 14 | **Drag-and-drop collections / folders** (#13) | Strongly requested pattern; works hand-in-hand with workspaces (#3). |
| 15 | **Why-am-I-seeing-this explainability** (#15) | Builds trust in AI features; small change per surface, but many surfaces. |
| 16 | **Keyboard shortcuts + cheat sheet** (#16) | Power-user payoff; piggybacks on ⌘K (#2). |
| 17 | **Inline annotations on any text view** (#17) | Real depth jump for M·03 / M·04; non-trivial to ship robustly. |
| 18 | **Public contributor profile + leaderboard** (#18) | Subject-expert discovery; nice but not on the critical path. |
| 19 | **Citation graph in M·01** (#19) | Beautiful, niche; depends on Crossref `references` coverage which is patchy. |
| 20 | **Change-history timeline on artefacts** (#20) | Auditing power, but requires writing a versioned-edits store; deferrable. |

---

*Rationale.* Top 6 are all **user-space and cross-module-depth** ideas — they
make MethodHub feel like one product instead of five. 7–10 are
single-module UX wins that pay back in week one. 11–14 are the heavier
"depth" plays that need product taste before engineering. 15–20 are
nice-to-haves that compound once the foundations above exist.
