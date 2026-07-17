# EU industry — trade & clean-tech status deck

A self-contained, interactive HTML slide deck (the "status deck") for the
Overview Industry section, in the ESABCC visual identity (teal `#608C95`,
Segoe UI, the ESABCC logo mark). It is a **two-part briefing** — two linked
presentations in one file, each opened by a full-bleed section divider and
numbered from 01:

- **Part I · Trade & dependencies** — the current-state reading of EU-27
  manufacturing trade, its imported inputs (incl. the interactive
  trade-origins map), and the implications for competitiveness and
  geopolitical resilience.
- **Part II · Clean tech, both sides** — the transition read from both sides:
  **Side A** decarbonising the heavy industry that already exists (emissions,
  abatement levers, the project pipeline), and **Side B** the new clean-tech
  manufacturing industries (what they avoid, the EU manufacturing gap, how
  their products cut everyone else's emissions, and a priority read).

The language is deliberately neutral and source-linked — a status assessment,
not an advocacy piece. Part II's clean-tech figures are mapped from the
sibling Clean Tech submodule (`../../cleantech*` + `../../nace-emissions-layer.ts`);
the "clean vs old tech" split and the priority read are flagged MethodHub
judgements.

## Files

| File | Purpose |
|------|---------|
| `build-deck.mjs` | Generator. Holds the slide data and emits the standalone HTML. |
| `deck.css` | The ESABCC design system (tokens, slide layouts, animations). |
| `deck.js` | Vanilla navigation (scroll-snap, keyboard, dots, progress, IntersectionObserver reveal). |
| `assets/esabcc-logo-color.png` / `esabcc-logo-white.png` | Brand marks, inlined as data URIs at build time. |

## Output

Running the generator writes the built, fully self-contained page to:

```
public/decks/eu-industry-trade-status.html
```

which is served at `/decks/eu-industry-trade-status.html` and linked from the
Trade flows page. The built file inlines the logos and uses only system fonts,
so it has no external dependencies (works offline; CSP-safe).

## Regenerate

```
node beta/modules/overview-industry/trade-flows/deck/build-deck.mjs
```

Part I figures mirror `../trade-data.ts` + `../eurostat-io.generated.ts`
(Eurostat `ext_tec01`, the EU-27 use table, FIGARO, and the curated EC/JRC
dependency layer). Part II figures are transcribed from the Clean Tech
submodule data (`../../cleantech-catalogue.ts`, `../../cleantech-external-role.ts`,
`../../nace-emissions-layer.ts`) into the `CT_*` data arrays in
`build-deck.mjs`. Update the arrays at the top of `build-deck.mjs` when the
underlying data changes, then regenerate.

## Navigation

Arrow keys / space / scroll to move between slides; `F` toggles fullscreen;
the dot rail and progress bar track position. Motion respects
`prefers-reduced-motion`.

## Trade-origins map (Part I)

An interactive world map of extra-EU manufacturing imports by partner country
(Eurostat FIGARO, `naio_10_fgti`, 2023 — the same country breakdown behind the
"China's share of extra-EU imports" headline figure). Built at generate-time,
not runtime:

- The world silhouette is projected with `d3-geo` (`geoNaturalEarth1`) from
  `world-atlas`'s `land-110m.json`, and baked into a static SVG `<path>` — the
  browser ships no map library, only the resulting path string.
- Each partner's arc and node are sized two ways, precomputed in Node so the
  browser only ever swaps between two baked numbers: **by trade value** (€ bn,
  sqrt-scaled) and **relative to the partner's own GDP** (import value ÷ GDP,
  also sqrt-scaled) — a toggle that surfaces a genuinely different picture
  (e.g. the Balkan neighbours or Switzerland trade far more, proportionally to
  their economy size, than the largest absolute partners).
- Click a node or arc to inspect it (value, share, GDP ratio); "Animate all
  flows" plays a synchronised dot along every arc at once and auto-stops when
  you navigate away from the slide.
- GDP figures are World Bank "GDP (current US$)", latest available estimate —
  a different reference year from the 2023 trade data, called out in the
  slide's source line so the two are never conflated.

Partner coordinates, trade values and GDP figures live in `MAP_PARTNERS_RAW` at
the top of `build-deck.mjs`; regenerate after editing it the same way as any
other figure.

## Download as PDF

The "Download PDF" button calls the browser's native `window.print()`. The
`@media print` rules in `deck.css` force every slide to render in full (not
just the one currently `.is-active` slide — print output isn't scroll-driven),
one slide per landscape page, with interactive-only chrome (nav dots,
progress bar, the map's toggle/animate controls) hidden. Whatever size-by mode
or country selection is active on the map when you print carries over into the
PDF; the travelling flow-dot animation itself is hidden since a still page
can't show motion — the arc width and node size already carry that value.
