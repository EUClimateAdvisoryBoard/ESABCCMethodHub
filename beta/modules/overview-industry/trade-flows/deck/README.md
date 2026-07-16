# EU manufacturing — trade & dependency status deck

A self-contained, interactive HTML slide deck (the "status deck") for the
Overview Industry / Trade flows sub-module. It presents the current-state
reading of EU-27 manufacturing trade, its input dependencies, and the
implications for **competitiveness** and **geopolitical resilience**, in the
ESABCC visual identity (teal `#608C95`, Segoe UI, the ESABCC logo mark).

The language is deliberately neutral and source-linked — a status assessment,
not an advocacy piece.

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

Figures mirror `../trade-data.ts` + `../eurostat-io.generated.ts` (Eurostat
`ext_tec01`, the EU-27 use table, FIGARO, and the curated EC/JRC dependency
layer). Update the data arrays at the top of `build-deck.mjs` when those change,
then regenerate.

## Navigation

Arrow keys / space / scroll to move between slides; `F` toggles fullscreen;
the dot rail and progress bar track position. Motion respects
`prefers-reduced-motion`.
