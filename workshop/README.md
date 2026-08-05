# The EU Climate Machine — executive workshop package

A fully fledged one-day executive workshop built on the MethodHub beta policy
models, implementing option 2C ("interactive policy models as education
products") from `MONETIZATION-OPTIONS.md`.

## Contents

| File | What it is |
|---|---|
| `materials/workshop-overview.pdf` | Prospectus: rationale, audience, the four modules, agenda, formats and pricing (€690/seat public · €7,500 in-house day) |
| `materials/workshop-slides.pptx` / `.pdf` | The 28-slide deck, with speaker notes on every slide |
| `materials/facilitator-guide.pdf` | Run-of-show with per-module timing, numbers-at-your-fingertips cards, exercise answer keys, anticipated questions, overrun triage |
| `materials/participant-workbook.pdf` | Exercise worksheets, model reference cards, the precomputed iso-target inversion table, formula sheet, annotated source list, watchlist template |
| `build/` | Reproducible generators: `build_deck.js` (pptxgenjs), `build_overview.py`, `build_facilitator.py`, `build_workbook.py` (reportlab), `docstyle.py` (shared layout) |

## The workshop

**"The EU Climate Machine — how carbon pricing, electricity markets and the
2040 framework actually work."** One day, four modules, each anchored on a
live interactive model from the MethodHub beta estate:

1. **The carbon pricing endgame** — M·26 (ETS endgame & CDR safety valve)
   plus the July 2026 review facts from M·37/reform.
2. **Why European electricity costs what it costs** — M·34 (merit-order
   model, EU–US–China decomposition).
3. **Electrification and the 2040 framework** — M·37/electrification
   (least-cost model, €166/€55/€111) and the final-energy identity.
4. **Stress tests: politics and nature** — M·29 (wishlist GHG accounting)
   and M·41 (wildfires & the land sink).

## Rebuilding

```bash
# Documents (needs: pip install reportlab)
python3 build/build_overview.py
python3 build/build_facilitator.py
python3 build/build_workbook.py

# Deck (needs: npm install pptxgenjs; LibreOffice for the PDF export)
node build/build_deck.js
soffice --headless --convert-to pdf --outdir materials materials/workshop-slides.pptx
```

## Positioning constraints (from the monetization assessment)

- Independently produced and branded: no ESABCC/EEA name, no implied
  endorsement — the disclaimers are baked into the prospectus, the deck's
  closing slide and the workbook.
- All models presented as **stylised teaching instruments**, sourced to
  public documents (COM(2026) 595/616, SWD(2026) 616, EUR-Lex, Eurostat,
  EEA, EFFIS, PIK/LIMES-EU, JRC); participants are told to cite the
  sources, not the toys.
- Refresh cadence: update the numbers after every major EU policy event;
  the "Edition" line on each document's cover carries the date.
