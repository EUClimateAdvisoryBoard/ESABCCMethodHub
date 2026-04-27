# Brainstorm — Professional UX for the Five Modules

A third-pass brainstorm that continues
[Brainstorm — 20 module improvements](brainstorm-modules-ux-userspace.md). The
first pass was per-module depth, the second was cross-module user space; this
one is **professional UI/UX polish per module**, grounded in the current
research literature on interaction design, perception, and accessibility.

The goal is the *feeling*: MethodHub should feel like a Linear- or
Arc-grade research instrument — quiet, fast, legible, trustworthy — not a
data-entry intranet.

> **Status.** This is a design brief, not a build log. Each item is sized
> small enough that one engineer + one designer can ship it inside a single
> sprint. The ranked rollout at the bottom is the suggested order.

---

## UX science we are leaning on

The improvements below are not stylistic preferences — each one cites a
specific law, study, or guideline. Calling them out up front so reviewers
can audit the rationale.

| Principle | What it says | How we use it |
| --- | --- | --- |
| **Doherty threshold** (IBM, 1982; still replicated) | Productivity collapses above ~400 ms response latency. | Optimistic UI on every save; skeleton screens during fetch; <100 ms hover affordances. |
| **Fitts's Law** | Time-to-target ∝ distance / target-size. | Primary actions ≥ 44×44 px; destructive actions far from primary. |
| **Hick's Law** | Decision time grows log-linearly with options. | Progressive disclosure; "more" menus; never more than 7 visible filters. |
| **Miller's Law** (7±2) | Working memory chunk limit. | Tables paginate at 25, lists chunk at 7, code trees collapse beyond depth 3. |
| **Jakob's Law** | Users prefer your site to behave like the others they use. | ⌘K palette, J/K nav, ⇧⏎ submit — Linear/Notion/GitHub conventions. |
| **Aesthetic-Usability Effect** (Kurosu & Kashimura, replicated 2024) | Prettier interfaces are *perceived* as more usable. | Modular type scale, 8 px grid, restrained motion. |
| **Peak-End Rule** (Kahneman) | Memory of an experience = peak moment + ending. | Invest in the "aha" moments (scenario diff reveal, citation match) and the goodbye (export confirmation, undo toast). |
| **Goal-Gradient Effect** | Effort accelerates near visible goals. | Bulk-import progress bars, onboarding step counters, coding-coverage rings. |
| **Cognitive Load Theory** (Sweller) | Three load types — intrinsic, extraneous, germane. | Strip extraneous chrome; chunk intrinsic complexity; design germane scaffolds. |
| **Tesler's Law** | Complexity is conserved — someone pays. | Default to "we pay it" (smart defaults), let power users opt into the raw complexity. |
| **Recognition over recall** (Nielsen #6) | Show, don't ask users to remember. | Recently-used filters, breadcrumbs, sticky context, autocomplete everywhere. |
| **WCAG 2.2 AA** (W3C, Oct 2023) | New SCs: focus-not-obscured, target-size 24 px min, dragging movement alternatives. | Every drag has a keyboard equivalent; focus rings 3 px / 2 px offset; no hover-only affordances. |
| **Reduced-motion preference** (`prefers-reduced-motion`) | ~35 % of users dislike or are harmed by motion. | All non-essential motion gated; replace parallax/scale with cross-fade. |
| **Epistemic UI for AI** (Microsoft HAX, 2023; Anthropic, 2024) | Users overtrust AI unless uncertainty is shown. | Confidence chips, "why this?" badges, explicit "AI-suggested" tinting. |

These are the levers. The five sections below pull them, module by module.

---

## M·01 — Reference Manager (`/references`)

**Today's friction.** DOI input is a lonely text field; bulk-import progress
is a generic spinner; the citation card is dense, all-equal-weight text;
PDF drop has no rejection feedback; empty library shows nothing.

### Improvements

1. **Smart-paste DOI / arXiv / ISBN detection.**
   On focus of the add-reference field, read the clipboard (with permission
   prompt the first time only). If the clipboard is a DOI/arXiv/ISBN, show
   a one-tap chip: *"Paste 10.1038/s41586-024-07023-w?"*. Cuts the
   add-a-reference flow from 4 actions to 1.
   *Principle: recognition over recall + Fitts's Law (one big target).*

2. **Live citation preview as you type.**
   Below the DOI field, render a skeleton card that fills in within
   <400 ms (Doherty) as Crossref responds. If Crossref is slow, show the
   author/year first, then title, then journal — progressive reveal.
   *Principle: Doherty threshold + perceived performance.*

3. **Bulk-import progress with goal-gradient.**
   Replace the spinner with a row-by-row tick list:
   *"23 / 50 imported · 2 duplicates · 1 needs review"*. Goal-gradient
   says users push harder when the goalpost is visible.
   *Principle: goal-gradient effect.*

4. **Dropzone with three explicit states.**
   Idle (dashed border, "Drop a PDF or BibTeX"), valid-hover (green tint,
   "Release to import"), invalid-hover (amber, "Only PDF / BibTeX / RIS").
   No silent rejections.
   *Principle: error prevention (Nielsen #5).*

5. **Citation card typographic hierarchy.**
   Authors in 14 px regular, title in 16 px medium, journal-year in 12 px
   tabular-numeral grey. Tabular numerals so years/page-counts align in
   the column. Replace the four equal-weight metadata icons with a single
   secondary row that appears on hover.
   *Principle: aesthetic-usability + Miller's Law (chunking).*

6. **Empty-library state as onboarding.**
   First visit shows three illustrated paths: *"Drop a PDF"*, *"Paste a
   DOI"*, *"Connect Zotero"*. Each is a real button, not a screenshot.
   Add a *"Try a sample reference"* link that imports an ESABCC working
   paper so the user immediately sees what a populated library looks like.
   *Principle: peak-end rule (the "aha" moment of seeing a real card).*

7. **Citation-style switcher with live re-render.**
   A single dropdown (APA · Chicago · Harvard · ESABCC house) above the
   library re-renders all citations instantly via CSL, no page reload.
   Power users keep a per-collection default in preferences.
   *Principle: Tesler's Law (we pay the complexity, not the user).*

8. **Keyboard-first add flow.**
   `N` to open add-reference modal · paste · ⏎ to import · `Esc` to close
   · toast with `U` to undo. The whole flow in under three seconds without
   touching the mouse.
   *Principle: Jakob's Law (Linear/GitHub conventions).*

**User example.** Maria copies a DOI from a PDF reader, switches to
MethodHub. The DOI field already shows *"Paste 10.1038/…?"* — she presses
⏎. The skeleton card resolves in 280 ms, she presses ⏎ again to confirm.
A toast says *"Imported · Undo"*. Three seconds, zero mouse. She sees the
new card animate into the top of the library list with a brief 200 ms
highlight, then fade — the peak moment landed.

---

## M·02 — Data & Scenarios (`/scenarios`)

**Today's friction.** Charts are pretty but mute; filters are a tall column
of checkboxes (every option always visible); scenario comparison requires
opening two tabs; colour-blind users can't distinguish the 16-colour
palette in dense overlays; loading shows a spinner with no preview.

### Improvements

1. **Brushable timeline with persistent delta callouts.**
   Drag-select a year range; the chart annotates the *delta* and *CAGR*
   between endpoints in a stuck callout. The "aha" moment is the number,
   not the curve — so render the number large, in the brand teal,
   tabular-numeral.
   *Principle: peak-end rule + data-ink ratio (Tufte).*

2. **Side-by-side scenario diff with synchronized cursors.**
   Pick two scenarios; a vertical scrubber shows both lines and a
   *"Δ 2030: −18 %"* readout that updates as the cursor moves. Cursors
   sync across both panels.
   *Principle: recognition over recall (the comparison is shown,
   not memorized).*

3. **Filter pills > checkbox columns.**
   Replace the 30-row checkbox column with horizontal pills under the
   chart: *Sector · Region · Scenario · Year-range*. Tap a pill to open a
   compact pop-over of options. Visible filter count never exceeds 7
   (Miller).
   *Principle: Hick's Law + Miller's Law.*

4. **Colour-blind-safe palette toggle.**
   Default palette tested against the 8 % male / 0.5 % female deuteranope
   prevalence. A toggle in preferences switches to a Wong-2011 palette
   (8 colours, deuteranopia-safe) for analysts who request it. Pair every
   colour with a redundant marker shape so colour is never the only
   channel (WCAG 1.4.1).
   *Principle: WCAG 1.4.1 — use of colour.*

5. **Skeleton chart, not spinner.**
   While the dataset loads, render the axes, the legend chips, and a
   shimmering placeholder line in the chart's exact final dimensions.
   Layout never shifts when real data arrives.
   *Principle: perceived performance + zero CLS (Core Web Vitals).*

6. **Sonification for accessibility.**
   A "🔊 Play series" button reads the curve as a 3-second pitch line —
   higher tone = higher value. Crucial for screen-reader users; nice for
   sighted users skimming many series.
   *Principle: WCAG 1.1.1 — non-text content has an alternative.*

7. **Saved-view chips at the top.**
   The user's saved scenario views surface as chips above the chart:
   *"FF55 baseline · NGFS Net Zero · My MRR view"*. One tap loads — no
   modal, no list. Recent views auto-pin; manual pins persist.
   *Principle: recognition over recall (Nielsen #6).*

8. **Export with provenance footer.**
   PNG / SVG / CSV exports include a 1-line footer: *"MethodHub ·
   IIASA AR6 · accessed 2026-04-26 · scenario: NGFS Net-Zero 2050"*. No
   extra clicks; users stop screenshotting because the exported image is
   already presentation-ready.
   *Principle: Tesler's Law (we pay; user gets clean output).*

**User example.** Sebastian opens M·02 to brief the chair on transport
emissions. He taps the *"FF55 baseline"* chip — chart skeleton fills in
under 300 ms with axes already in place. He brushes 2025–2035; a teal
callout reads *"Δ −22 % · CAGR −2.4 %/yr"*. He drops a second scenario
*"NGFS Net Zero"* — the diff cursor syncs, the readout updates as he
moves it. He hits Export PNG; the file lands on his desktop with the
provenance footer baked in. Total time: 45 seconds.

---

## M·03 — Secretariat News (`/news-feed`)

**Today's friction.** Cards are uniform-weight (no scanning hierarchy);
unread state is a blue dot that never decays; reading a card loses your
scroll position; saving requires opening the card; the daily 24 h
briefing is a wall of text with no skim affordance.

### Improvements

1. **F-pattern card hierarchy.**
   Eyebrow line (source · time-ago) → headline (16 px medium) → 2-line
   summary (14 px regular) → footer chips (sector · suggested policy).
   Eye-tracking studies (Nielsen Norman, 2024) confirm users scan in an
   F — design for it explicitly.
   *Principle: F-pattern reading + visual hierarchy.*

2. **Skim mode vs. read mode toggle.**
   `Tab` key (or a single segmented control) switches between *Skim*
   (headline-only, 3 columns) and *Read* (single column with summary,
   like Apple News). Density is a user choice, not a designer one.
   *Principle: Tesler's Law — let power users opt in to density.*

3. **Reading-position memory.**
   Scroll back from a card to the list — the list re-anchors to the card
   you came from, with a brief 400 ms ring highlight on it. Today the
   list resets to the top.
   *Principle: spatial mental model (Norman).*

4. **Decaying unread indicator.**
   Today: blue dot, on or off. Proposed: vivid blue for <24 h, soft blue
   for 24–72 h, grey ring for older. Backlog stops feeling like a debt.
   *Principle: Peak-end rule — soften the "ending" of the unread queue
   instead of guilting users.*

5. **One-key save / read-list / share.**
   `S` to save · `R` to add to reading list · `M` to mark read · `J/K`
   next/prev card. Keyboard cheat sheet on `?`.
   *Principle: Jakob's Law (Gmail/Reader keybindings).*

6. **Suggested-policy chip with confidence.**
   The matched-policy badge today shows the policy name. Add a
   *confidence dot* (●●● = ≥0.85, ●●○ = 0.6–0.85, ●○○ = <0.6) and a
   hover-to-expand "why?" panel listing matched tokens. Reviewer no
   longer guesses whether the AI is being cautious or sloppy.
   *Principle: epistemic UI — show uncertainty.*

7. **Daily briefing as scannable digest.**
   The 24 h briefing today is one long block. Convert to: 1-line TL;DR
   at top · 5 bulleted *"What changed today"* · 5 *"Watch this week"* ·
   collapsible *"Full text"* below. The TL;DR is the peak; the user
   should be able to leave after 30 seconds and feel informed.
   *Principle: peak-end + Miller's Law.*

8. **Sticky filter bar with active-filter chips.**
   When the user filters by *EUR-Lex only* + *last 7 days*, those two
   chips stick to the top of the viewport while scrolling. Today, the
   filter context disappears and users forget what they filtered.
   *Principle: recognition over recall.*

9. **Empty-state for active filters.**
   When a filter combination returns zero, show *"No matches for
   *EUR-Lex* + *7 days*. Try **last 30 days** or **clear filters**."*
   Each suggestion is a real button.
   *Principle: error recovery (Nielsen #9).*

**User example.** Maria opens M·03 on her commute, taps Skim mode. She
scans 40 headlines in 90 seconds with J/K, hits S on three, R on one
long-read for the train back. She opens the briefing: TL;DR is one
sentence, five bullets follow — she's caught up before her coffee
arrives. The blue-dot tax is gone; old items have already faded to grey.

---

## M·04 — EU Policy Navigator (`/policy-navigator`)

**Today's friction.** The D3 force graph is impressive but cognitively
expensive: nodes float, labels collide, zoom loses orientation, no
mini-map, connection confidence is a tooltip number, and article-level
deep-links scroll abruptly. Power users love it; first-timers freeze.

### Improvements

1. **Lens / fish-eye focus on hover.**
   Hover a node — neighbours within 1 hop scale to 1.2×, 2-hop to 1.0×,
   the rest fade to 30 % opacity. The graph stops shouting; the local
   neighbourhood pops. Used by Linkurious, Kumu, and the LLM-graph tools
   that landed in 2024.
   *Principle: cognitive load — strip extraneous, amplify germane.*

2. **Persistent mini-map with viewport rectangle.**
   Bottom-right 160×120 px overview panel. Drag the rectangle to pan;
   double-click to fit-to-view. Solves the "where am I?" panic at high
   zoom.
   *Principle: spatial mental model + Norman's gulf of evaluation.*

3. **Connection confidence as a visual band, not a number.**
   Edge thickness encodes confidence (1 px = <0.5, 4 px = ≥0.9), edge
   colour encodes type (causal, citation, supersedes). Hover shows the
   numeric value and the model that produced it. Today users have to
   click each edge to find this out.
   *Principle: epistemic UI + Tufte's data-ink ratio.*

4. **Deep-link to article with smooth scroll + ring highlight.**
   Clicking *"Art 5(3) ESR"* in any module lands on M·04 with the
   article scrolled into view, a 600 ms ring highlight pulse, and
   surrounding articles dimmed for 1.5 s before fading back. The user
   never wonders *"where did the page jump to?"*.
   *Principle: peak-end + reduced-motion fallback (cross-fade
   replacement when prefers-reduced-motion is set).*

5. **Graph ↔ list dual view (not just mobile).**
   Toggle in the header — *Graph · List · Table*. Same data, three
   shapes. Some users think in nodes, some in tables; let both exist
   first-class. Mobile already gets list (#10 in the prior brainstorm);
   bring it to desktop too.
   *Principle: Tesler's Law — match users' mental model.*

6. **Filter pills with counts + "save as view".**
   Pills above the graph: *Sector (3) · Year (2) · Connection type (1)*.
   Counts update live. A *"Save view"* button beside captures the
   current filter+layout combo into a personal chip.
   *Principle: recognition over recall + goal-gradient (counts as
   feedback).*

7. **Article-level annotation gutter.**
   When a policy is open, the left margin shows annotation marks (●) at
   the line they reference; clicking jumps the right pane to the note.
   Same pattern as Hypothes.is and GitHub PR comments.
   *Principle: Jakob's Law.*

8. **Pre-render hover cards (200 ms in, 50 ms out).**
   Hover any node — preview card with title, short title, in-force date,
   3 most-confident connections. Delay 200 ms in (avoids flicker on
   pass-by), 50 ms out (feels instant). These exact timings come from
   Material Design 3 hover specs.
   *Principle: aesthetic-usability + Doherty.*

9. **Reduced-motion fallback.**
   When `prefers-reduced-motion: reduce` is set, the force-directed
   layout becomes a stable hierarchical tree (left-right, sector-grouped),
   and all node movement is replaced with cross-fade. Same data, no
   animation budget.
   *Principle: WCAG 2.3.3 + inclusive design.*

10. **First-time guided tour anchored to graph elements.**
    The Shepherd tour from #12 of the prior brainstorm is here extended
    with *graph callouts* — the tooltip points at an actual edge and
    says *"Edge thickness = confidence. Click to see the source."*
    *Principle: cognitive load — externalize the legend.*

**User example.** A new EEA secondee opens the Policy Navigator. The
graph fades in; a 5-step tour points at edge thickness, the mini-map,
the filter pills. He hovers *Effort Sharing Regulation* — the lens
dims everything else, three confidence-graded edges to ETS2, AFIR and
CO₂ Cars stand out. He drags the mini-map rectangle to navigate to the
transport cluster, clicks *"Art 5(3)"* in a news card on a second
monitor — the page lands on the article with a ring pulse. He toggles
to List view to brief his director by email; same data, no graph.

---

## M·05 — Content Analysis (`/content-analysis`)

**Today's friction.** Coding is a long, repetitive task — fatigue is the
real enemy. Today the code tree is a flat outline, drag handles are
small, the document gutter has no coverage feedback, code colours are
arbitrary, merge/move flows are modal, and there's no sense of
*progress* across a corpus.

### Improvements

1. **Coverage heatmap in the document gutter.**
   A 4 px wide vertical strip in the left margin tints by tag density:
   white = uncoded, deeper teal = more codes. The user sees at a glance
   which paragraphs are over-coded and which are unread.
   *Principle: data-ink ratio + recognition over recall.*

2. **Tactile drag-and-drop on the code tree.**
   Drag handle 24×24 px (WCAG 2.2 target size); the dragged node lifts
   2 px, casts a soft shadow, snaps into a valid drop slot with a 120 ms
   ease. Invalid drops bounce back. Keyboard equivalent: select code +
   `⌘↑/↓/←/→` to reorder/reparent (WCAG 2.5.7 dragging alternative).
   *Principle: Fitts + WCAG 2.2.*

3. **Semantic colour palette by code role.**
   Today colours are arbitrary. Proposed: hue = top-level category
   (governance = teal, finance = amber, mitigation = green,
   adaptation = blue), saturation = depth in tree. A new analyst can
   recognize a code group by colour alone.
   *Principle: pre-attentive processing (Treisman) — colour is a
   pre-attentive channel.*

4. **Coding fatigue indicator + Pomodoro nudge.**
   After 25 minutes of continuous coding, a soft toast offers a 5-minute
   break. After 50, a gentler nudge. Optional, dismissible, off by
   default. Coding accuracy drops measurably after 30 min sessions
   (replicated qualitative-research literature).
   *Principle: peak-end + duty of care.*

5. **Code merge/move with reversible inline UI.**
   Today: confirm-modal blocks the page. Proposed: drag *"Just
   Transition"* into *"Carbon Pricing"* — the move happens immediately,
   a 15-second toast says *"Merged 12 segments · Undo"*. Modal-free.
   *Principle: error recovery + Tesler's Law (we pay; user moves fast).*

6. **Inline AI-suggested codes with confidence tinting.**
   When the AI suggests a code on a segment, the segment renders with a
   dashed border and a 30 % tint of the code's colour. Hover shows the
   confidence and the matched span. One-tap accept (`A`) or dismiss
   (`X`). Today the user has to open a side panel.
   *Principle: epistemic UI + Doherty.*

7. **Coverage progress ring per document.**
   Each document in the sidebar carries a small ring: 0 % uncoded,
   100 % every paragraph touched. Goal-gradient pulls the user through
   the corpus.
   *Principle: goal-gradient effect.*

8. **Export as Word table — preview before save.**
   The export already lands as a Word-compatible table. Add a
   400×600 px preview panel that re-renders live as the user picks
   columns (segment text · code · confidence · annotator · date).
   *Principle: recognition over recall (WYSIWYG).*

9. **Empty-state for new code book.**
   First visit: three illustrated paths — *"Import a code book (RIS,
   QDPX, CSV)"*, *"Start from a template (IPCC AR6 / IPBES)"*,
   *"Build from scratch"*. The template option seeds 30 codes so the
   tree isn't empty.
   *Principle: peak-end (the "aha" of seeing a populated tree).*

10. **Sticky breadcrumb trail in deep code trees.**
    When the tree is scrolled past depth 3, a sticky breadcrumb at the
    top of the tree pane shows *"Mitigation › Energy › Renewables"* so
    the user never loses context.
    *Principle: spatial mental model.*

**User example.** Maria opens a 60-page ESR consolidated text. The
gutter heatmap shows the first 20 pages already coded by a colleague,
the rest white. She codes a new paragraph — the AI suggests
*"Just Transition"* with a dashed teal border and ●●○ confidence; she
taps `A` to accept. After 25 minutes, a soft toast invites her to
stretch — she dismisses, codes 5 more paragraphs, then takes the break
on the next prompt. The doc-level ring fills to 78 %; the goal pulls
her back after coffee.

---

## Cross-cutting polish (applies to all five modules)

These are the foundations the per-module ideas above ride on. They are
boring to ship and felt every minute of every session.

1. **Type system.** One typeface (Inter Variable, system fallback), one
   modular scale (12 / 14 / 16 / 18 / 22 / 28 / 36 px, ratio 1.25),
   tabular numerals on all data surfaces, line-height 1.5 on body and
   1.2 on headings.
2. **8 px grid + 4 px micro-grid.** Every padding, margin, gap is a
   multiple. Stops the *"why does this feel slightly off?"* sensation.
3. **Motion choreography.** Default 240 ms `cubic-bezier(0.2, 0, 0, 1)`
   (Material 3 standard easing); enter 240 ms, exit 160 ms. All motion
   gated on `prefers-reduced-motion`.
4. **Focus rings — WCAG 2.2 compliant.** 3 px outline, 2 px offset,
   high-contrast token; never `outline: none` without a replacement.
   Focus-not-obscured (SC 2.4.11) verified on every modal/sticky bar.
5. **Toast / banner / dialog taxonomy.** Toast = transient, dismissible,
   bottom-right. Banner = persistent, page-scoped, top. Dialog = blocking,
   centered, ESC-dismissible. Never mix the three.
6. **System-status taxonomy.** Five colours, one meaning each:
   teal = primary action, blue = info, green = success, amber = warning,
   red = destructive. No exceptions. (Today some greens mean *active
   filter* and some mean *success* — confusing.)
7. **Empty / loading / error / partial states designed first-class.**
   Every list, chart, and panel ships all four. Empty states have a
   real CTA, never just a blank rectangle.
8. **Skeleton screens > spinners** everywhere. Spinners only for actions
   <400 ms where layout is unknown.
9. **Optimistic UI on every save.** Server failure rolls back with an
   amber toast; success is silent. Today every save is a round-trip the
   user feels.
10. **Touch targets ≥ 44×44 px on touch devices, ≥ 24×24 px on desktop**
    (WCAG 2.2 SC 2.5.8). Verified per build with an automated audit.
11. **Reduced-motion + high-contrast + dark-mode** — three independent
    user preferences, three independent theme variants, all tested.
12. **Microcopy voice.** Quiet, specific, never cute. *"Imported"*, not
    *"Yay! Your reference was imported! 🎉"*. Anthropic's voice
    guidelines, applied to UI.

---

## Ranked rollout (impact × feasibility × foundation-fit)

Top of the list is what to build first. Ranking weights *foundations
that unblock other ideas* heavily — get those in early.

| Rank | Idea | Module | Why here |
| ---- | ---- | ------ | -------- |
| 1 | **Type system + 8 px grid + motion tokens** | All | Foundation. Every later idea looks worse without it. One sprint, ships once. |
| 2 | **Skeleton screens + optimistic UI everywhere** | All | Doherty payoff is felt site-wide; one shared pattern, used in every module. |
| 3 | **Empty / loading / error / partial state pass** | All | Catches the unloved 20 % of UI; cheap; users notice. |
| 4 | **Smart-paste DOI + live citation preview** | M·01 | The flagship "feels like Linear" moment for the most-used add-flow. |
| 5 | **Decaying unread + F-pattern card hierarchy** | M·03 | Daily-use module; biggest perceived-quality jump per hour invested. |
| 6 | **Lens / fish-eye + mini-map + edge-thickness confidence** | M·04 | Turns the graph from impressive to legible; unblocks first-time users. |
| 7 | **Coverage heatmap + AI-suggested code tinting** | M·05 | Removes coding fatigue's biggest contributor — invisible progress. |
| 8 | **Brushable timeline + scenario diff scrubber** | M·02 | The "aha" moment of the whole module; peak-end gold. |
| 9 | **Filter pills (counts, sticky, save-as-view)** | M·02 / M·03 / M·04 | One pattern, three modules; replaces three checkbox columns. |
| 10 | **Daily briefing as scannable digest** | M·03 | Highest read-rate surface in MethodHub; biggest editorial leverage. |
| 11 | **Tactile drag with keyboard equivalent** | M·05 | Code-tree manipulation 10× per day per coder; WCAG 2.2 compliance. |
| 12 | **Deep-link smooth scroll + ring highlight** | M·04 | Cross-module landings stop being jarring; small change, big polish. |
| 13 | **Reduced-motion fallback (graph → tree, motion → cross-fade)** | All | WCAG 2.3.3; the Board has older readers; cheap. |
| 14 | **Sonification + colour-blind palette** | M·02 | Accessibility floor; required for EU public-sector procurement scrutiny. |
| 15 | **First-time tour anchored to graph elements** | M·04 | New-user retention; piggybacks on existing Shepherd setup. |
| 16 | **Empty-state-as-onboarding for libraries** | M·01 / M·05 | First-time-user wow moment; one component, two reuses. |
| 17 | **Coding fatigue Pomodoro nudge** | M·05 | Cheap, optional, opt-in; quality of life for power coders. |
| 18 | **Export with provenance footer** | M·02 / M·05 | Trust and citation hygiene; one shared utility. |
| 19 | **Skim/Read mode toggle** | M·03 | Tesler-class win for power users; small build. |
| 20 | **Microcopy pass (taxonomy + voice)** | All | Slow, hand-crafted; do once when the rest is in place. |

---

## What success looks like

If the top half of this list ships, MethodHub should pass three felt
tests:

1. **The "Linear test"** — a power user can complete the most common
   add / find / export flow in each module without touching the mouse,
   and feel the page respond inside 400 ms.
2. **The "first-day analyst test"** — a new EEA secondee opens a module
   they've never seen, and inside 60 seconds knows what the page is
   for, where they are, and what to click next.
3. **The "Saturday-morning test"** — an analyst reads MethodHub on a
   phone, in dark mode, with reduced motion, and nothing breaks, looks
   bad, or asks them to use a feature that requires hover.

Hitting those three is what *"really, really professional"* means here.
Everything in this brief serves one of them.






