# M · 42 — EU Policy Hierarchy

!!! tip "Status"
    Beta · parked under [`beta/modules/policy-hierarchy/`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/tree/main/beta/modules/policy-hierarchy) · route [`/beta/policy-hierarchy`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/policy-hierarchy/page.tsx) enabled via a re-export stub; promoted to `src/app/` when hardened.

One collapsible figure of the **entire EU legal order** — not only climate.
Primary law (TEU, TFEU, Euratom, the Charter) sits at the top; below it, ten
per-domain branches (climate & energy, environment, trade, industry &
competitiveness, health, security & defence, digital, transport, agriculture
& fisheries, economy/finance/social) fan out into secondary law
(regulations, directives, decisions), tertiary law (delegated / implementing
acts), soft law (communications, recommendations, green/white papers) and a
supporting layer (impact assessments, staff working documents). Every
instrument links to EUR-Lex.

Where the [M·04 Policy Navigator](policy-navigator.md) is a force-directed
network you explore by following edges, this module is deliberately **more
structure and less movement**: a static, top-down tree you expand and
collapse, built to answer "where does this act sit in the acquis, and what
does it sit under" at a glance.

## User story

> A Secretariat officer is scoping which 2025-26 dossiers the Board should
> comment on. They open `/beta/policy-hierarchy`, switch to **Board view**
> (mandate colouring, all branches open), filter to **Moving now**, and scan
> the adjacent-ring instruments the omnibus and simplification agenda is
> reopening outside the climate files proper — then export the current
> selection as a markdown brief to paste into the drafting note.

## The hierarchy figure

The tree has a fixed vertical order, top to bottom:

| Tier | What sits there |
|------|------------------|
| **Primary law** | The Treaties (TEU, TFEU, Charter) plus, in a collapsible "law-making machinery" strip underneath, the acts that define how everything below gets made — Art. 288/290/291 TFEU, comitology, interinstitutional agreements such as Better Law-Making. |
| **International agreements** | Concluded under Art. 216–218 TFEU (e.g. the Paris Agreement) — binding, ranking below the Treaties but above secondary law. |
| **Secondary law** | Regulations, directives and decisions under Art. 288 TFEU — the binding legislative acts. |
| **Tertiary law** | Delegated acts (Art. 290 TFEU) and implementing acts (Art. 291 TFEU), shown nested under their parent act. |
| **Soft law & strategy** | Communications, recommendations, green and white papers — no legal force, but they set direction. |
| **Supporting documents** | Impact assessments and staff working documents — the Better Regulation evidence layer. |

Below the Treaties, the acquis is grouped into ten **domain branches**
(Climate & Energy, Environment & Circular Economy, Trade & External Action,
Industry/Single Market & Competitiveness, Health & Food Safety, Security,
Defence & Migration, Digital & Data, Transport & Mobility, Agriculture &
Fisheries, Economy/Finance & Social). Each branch panel opens onto its own
tree of instruments (tertiary acts and impact assessments nested under the
act they belong to, collapsed by default once a branch has more than three
children) and, where the underlying act specifies one, the Treaty legal
bases it rests on.

Nothing in `page.tsx` hard-codes an instrument count, a branch list or a
type label — everything is computed at render time from `DOMAIN_BRANCHES`,
`MANDATE` and `STATUS` in [`data.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/data.ts),
so the figure keeps working as the dataset is regenerated or corrected.

## Four cross-cutting lenses

**Climate · Competitiveness · Security · Health** — toggleable chips that
re-colour the same tree by theme instead of by branch, so the acquis can be
read as "the climate acquis", "the competitiveness acquis" and so on. An
instrument can carry more than one lens (CBAM, for instance, is both climate
and competitiveness). Lenses only **dim** non-matching rows — unlike the
mandate-ring and tier chips below, which filter the tree down to matching
instruments. Each domain-branch header also shows a small lens-count strip
so a branch's thematic mix is visible before it is even opened.

## Mandate rings — core / adjacent / context

A second, independent colouring mode sorts every instrument into one of
three **mandate rings**, opened from a collapsible **`MandatePanel`** above
the figure:

- **Core** — the climate architecture itself (the Climate Law, ETS, ESR,
  LULUCF, CBAM and their delegated/implementing acts).
- **Adjacent** — acts whose primary purpose lies elsewhere (industrial,
  fiscal, trade, energy-security, defence) but that carry material climate
  provisions, and are therefore coherence-assessable.
- **Context** — instruments that shape the political or economic
  feasibility of climate action without a climate provision to assess
  coherence against; dimmed in mandate view.

The rings operationalise **Art. 3(2)(b) of the European Climate Law**
(Regulation (EU) 2021/1119), which tasks the Board with advising on the
coherence of *"Union measures"* — not *"climate measures"*. `MandatePanel`
lays out the argument in three parts: the mandate as written (with an
EUR-Lex link), the reading that follows from it (with a ring-share bar and
per-ring description), and an explicit **"what this is not"** notice. Every
individual ring assignment in the register is flagged there as a
**Secretariat working interpretation, AI-drafted and pending Secretariat and
legal review** — not a legal opinion and not a position adopted by the
Board. Where an instrument carries no annotation, the page falls back
conservatively: climate-lens acts default to "adjacent" (never silently
"core"), everything else to "context".

In mandate mode, each instrument row also shows its one-line **"Board
angle"** where one has been drafted, and domain-branch headers add a
core/adjacent count next to the usual binding/underlying/soft-law tally. A
one-click **Board view** button turns mandate colouring on, clears the lens
filter and expands every branch — "the hierarchy as the Board reads it".

## "Moving now" — the legislative status layer

A third, optional layer marks where the **2025-26 legislative agenda** is
acting on an instrument: **Proposal** (still a Commission text), **Under
revision** (adopted act with a formal amending proposal on the table),
**Reopened** (caught up in the omnibus/simplification agenda) or **Review
ahead** (an announced review clause or clearly signalled revision). A
**Moving now** toggle in the controls bar filters the whole tree down to
just those instruments (keeping a parent branch or act visible if any of its
children carry a status), and each flagged row shows a status chip;
unconfirmed status entries carry a trailing "?" and are marked
"unconfirmed" in the tooltip.

## EUR-Lex linking and the unverified flag

Every instrument, at every tier, carries an **"EUR-Lex ↗"** link. Where the
compiling agent resolved an exact CELEX number the link opens the
consolidated act directly; where it did not, the link instead points to a
EUR-Lex search and the row carries an amber **`unverified`** badge (tooltip:
*"The compiling agent was not certain of the exact reference — link points
to a EUR-Lex search, verify before citing"*). A page-level banner states the
same thing at the top of the module: the instrument list, the mandate-ring
assignments and the status layer were **all compiled by AI agents from
model knowledge, without live EUR-Lex verification**, and reports the count
of unverified entries against the total. The module's own footer repeats
that it is a beta, AI-compiled structural map pending Secretariat
verification — not a citable register.

Where an instrument also has a matching entry in the Policy Navigator's
corpus, the row adds a second **"Navigator ↗"** link
(`/policy-navigator?policy=<policyId>`) into the full-text, annotatable
view, and — if the Board has already issued a recommendation on that file —
a row of **"Board advice"** chips linking into
[M·08 Recommendations](recommendations.md).

## Export and shareable state

- **Export CSV** dumps the full register — every branch, every instrument,
  with its lenses, mandate ring, Board hook, status and `unverified` flag —
  as `eu-policy-hierarchy.csv`.
- **Export brief** writes only the *currently filtered* selection (lenses,
  rings, tiers, moving-only, search query) as a Markdown one-pager
  (`policy-hierarchy-brief.md`), each instrument with its EUR-Lex link,
  summary, ring/Board-angle and status — for pasting straight into an
  advice draft. It carries its own inline reminder that it is AI-compiled
  working data to verify before citing.
- **Shareable URL state** — the active lenses, mandate rings, tiers, colour
  mode, moving-only toggle, search text and open branches are all mirrored
  into the query string (`?lens=…&rings=…&tiers=…&view=mandate&moving=1&q=…&open=…`)
  on every change, and read back on load, so a filtered view of the
  hierarchy can be shared as a single link. Every instrument also exposes a
  **"⧉ link"** hover action that copies a permalink
  (`…#<instrument-id>`); opening that link auto-expands the owning branch
  and scrolls the row into view.

## Code surface

| Path | Role |
|------|------|
| [`beta/modules/policy-hierarchy/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/page.tsx) | The whole module — figure, controls, legend, CSV/brief export, URL-state sync. |
| [`beta/modules/policy-hierarchy/data.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/data.ts) | Types (`Instrument`, `DomainBranch`, `Tier`, `MandateRelevance`, `InstrumentStatus`) and all display metadata (lens/tier/type/ring/status colours and copy). |
| [`beta/modules/policy-hierarchy/instruments.generated.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/instruments.generated.ts) | The instrument register itself — `DOMAIN_BRANCHES` — compiled one Sonnet agent per domain branch. |
| [`beta/modules/policy-hierarchy/annotations.generated.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/annotations.generated.ts) | `MANDATE` (ring + Board-angle per instrument id) and `STATUS` (legislative-status entries). |
| [`beta/modules/policy-hierarchy/bridges.generated.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/bridges.generated.ts) | `NAVIGATOR_BRIDGE` (policy-id links into M·04) and `SECTOR_BRIDGE` (sector tags shown on hover). |
| [`beta/modules/policy-hierarchy/recommendations.generated.ts`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/recommendations.generated.ts) | `RECOMMENDATIONS` — instrument id → Board recommendation ids, feeding the "Board advice" chips. |
| [`beta/modules/policy-hierarchy/MandatePanel.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/beta/modules/policy-hierarchy/MandatePanel.tsx) | The collapsible mandate argument — Art. 3(2)(b) text, the three-ring reading with a share bar, and the "what this is not" notice. |
| [`src/app/beta/policy-hierarchy/page.tsx`](https://github.com/EUClimateAdvisoryBoard/ESABCCMethodHub/blob/main/src/app/beta/policy-hierarchy/page.tsx) | One-line re-export so the route is reachable when navigated to directly. |

There is **no API route, no database table and no external fetch** in this
module — everything is client-side, computed from the generated TypeScript
literals above; the CSV and brief exports build their file in the browser
via `Blob` + `URL.createObjectURL`, and all state (filters, URL, permalink)
lives in React state and the query string, not in a data store.

## Known limits & roadmap

- **AI-compiled, not verified.** The instrument register, the mandate-ring
  assignments and the status layer were produced by AI agents from model
  knowledge, without live EUR-Lex verification — that is the reason the
  module is in `beta/` rather than shipped. Every unverified entry is
  flagged in-row and counted in the top banner; the mandate rings are
  additionally flagged as a Secretariat working interpretation of the law,
  not a legal opinion or a Board position.
- **Static, hand-maintained corpus.** Unlike the Policy Navigator, this
  module has no ingestion script — the register is a set of generated
  TypeScript literals, refreshed by re-running the compiling agents, not by
  a scheduled job.
- **Promotion path** — the same one-command move as every beta module (see
  the [beta parking lot](../overview/beta.md)):

  ```bash
  git mv beta/modules/policy-hierarchy src/app/policy-hierarchy
  $EDITOR src/components/SiteHeader.tsx   # add to MODULES nav
  $EDITOR src/app/page.tsx                # add to productionModules tile grid
  ```

## Where it fits in the routine

The Policy Hierarchy is the Secretariat's **pre-plenary horizon-scan
surface**: before drafting agenda items or advice, an officer opens it, sets
Board view or a lens, filters to "moving now", and reads across the whole
acquis — not just the climate files — for where the current legislative
agenda is creating or defusing climate-neutrality risk. It complements
rather than replaces the deeper, per-act tools it links out to:

**Related modules**

- **[M·04 EU Policy Navigator](policy-navigator.md)** — once an instrument
  is identified here, "Navigator ↗" opens its full text, network context and
  annotations.
- **[M·08 Recommendations](recommendations.md)** — "Board advice" chips
  show where the Board has already spoken on a file surfaced in the
  hierarchy.
- **M·39 EU Green Deal Policy Tracker** — the companion tracking surface for
  where Green Deal files stand in the legislative process.
