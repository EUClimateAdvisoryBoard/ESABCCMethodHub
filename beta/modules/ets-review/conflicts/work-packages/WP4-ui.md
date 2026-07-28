# WP4 — Submodule UI + hub integration

*Read WP0 first. Inputs: all data files from WP1–WP3. Outputs:
`page.tsx` (this folder), `src/app/beta/ets-review/conflicts/page.tsx`
(re-export), edits to `beta/modules/ets-review/page.tsx` and
`ets-review/README.md`.*

## Page: `/beta/ets-review/conflicts`

`'use client'`, follow the visual conventions of the sibling pages
(`../reform/page.tsx`, `../electrification/page.tsx`): `SiteHeader` /
`SiteFooter` from `@/components`, the shared module palette constants, the
same card/section/typography idiom (text-tertiary, border-grey-200, rounded-xl
cards, section anchor nav). Read `../reform/page.tsx` fully before writing —
match its tone and density, don't invent a new design language.

Sections (anchor nav in this order):

1. **Hero** — title "Advice conflicts — the package vs the Board's advice",
   one-paragraph framing (what is compared with what), the AI-assembled /
   pending-verification caveat box (same style as the IA module's caveat), and
   headline stat tiles computed from the data: total conflicts, counts by tier
   (critical/major/moderate/minor), alignments count, reports drawn on.
2. **How the ranking works** (`#method`) — render the rubric *from
   `types.ts`* (`SEVERITY_AXES` anchors, `SEVERITY_WEIGHTS`, tier
   thresholds) — do not hard-code copies. Show the formula in one line and the
   kind definitions from `CONFLICT_KIND_META`.
3. **Ranked conflict register** (`#conflicts`) — the core. `rankedConflicts()`
   rendered as cards in rank order, each showing:
   - rank number, kind chip (colored per `CONFLICT_KIND_META`), theme label,
     severity score as `x.x / 10` with a horizontal bar tinted by tier +
     tier chip;
   - the one-line `esabccAsk` vs `packageDoes` juxtaposition;
   - collapsible evidence: package positions (doc chip from `PACKAGE_DOCS`
     with url + `sourceRef` + quote) and advice positions (report chip from
     `RECOMMENDATION_REPORTS` label/url + pages + quote + `recIds` rendered as
     small tags);
   - numbered reasoning chain;
   - a score-breakdown row: four mini-bars (axis 0–3) each with its
     `scoreRationale` sentence (collapsible).
   Filters above the list: kind, tier, theme, report (derived from advice
   positions), all client-side; a count of visible/total.
4. **Alignments** (`#alignments`) — same card, no rank numbers, framed as
   "where the package delivers on the advice", to keep the read even-handed.
5. **Sources** (`#sources`) — two columns: package documents (from
   `PACKAGE_DOCS`) and the ESABCC reports actually cited (via
   `ADVICE_REPORT_FILES` + `RECOMMENDATION_REPORTS`), plus a line on method
   (work packages in `work-packages/`, severity rubric in `types.ts`).

Implementation notes: pure client component, no data fetching; import data
from `./conflicts`, `./advice-core`, `./advice-wider`, `./package-positions`,
`./types`; build lookup maps by id once. Keep it a single file like the
siblings (~600–900 lines).

## Route re-export

`src/app/beta/ets-review/conflicts/page.tsx`:

```ts
export { default } from '../../../../../beta/modules/ets-review/conflicts/page';
```

## Hub integration (`beta/modules/ets-review/page.tsx`)

- Add a third `Card` for the conflicts submodule (kicker "Submodule 3 —
  advice conflicts"; accent `C_RED`; 3–4 bullet points; cta "Open the conflict
  ranking"). Adjust the grid so three cards lay out cleanly (`md:grid-cols-3`,
  or keep 2-col with the third full-width — match existing responsive
  behaviour).
- Update the hub's intro copy ("two submodules" → three) and, in the
  `STATS` row, add one stat tile linking to `/beta/ets-review/conflicts`
  (e.g. number of conflicts found / number critical, computed by importing the
  data, not hard-coded).
- Update the header comment block listing the submodules.

## Docs

- `ets-review/README.md`: extend the "App module M·37 — two submodules" table
  to three (update heading text), one row for the conflicts submodule with
  route + source links and a one-line description including the severity
  ranking.
- Do not touch other docs.

## Definition of done

- Typechecks; page renders from data only (no hard-coded finding content);
  rubric section rendered from `types.ts` exports; hub + README updated;
  no `next/image` remote sources; no new dependencies.
