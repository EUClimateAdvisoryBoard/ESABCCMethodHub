# Deck rebuild: three pathway sets (25 Nov 2026)

> AI-compiled — pending Secretariat verification.

This folder updates the data of the 14-slide deck `settings3.html` and `Three_pathway_sets_EU_2040_2050.pdf` (repository
root) to the screening in [`../screen_three_sets.py`](../screen_three_sets.py): ECL 3 → 6, ECL +10% 11 → 14 and
ESABCC 2040 9 → 9. The slides, layout and wording are kept and only the data change.

The original build (`build3.py` and the chart scripts in the repository root) reads files that were never committed (`charts.py`,
`collapse.py`, `rest_components.csv`, `/home/claude/...`). The slides are therefore patched in place rather than rebuilt.
Each step was first run on the old data and checked against the old slide before the new data went in.

| Slide | What changes | How | Check on the old data |
|---|---|---|---|
| 1 Sources, 4 Pathways per source | rows for the added sources; totals 1,244 and 635 | `patch_tables.py` | per-source counts reproduce the deck (936/411, 46/19, …) |
| 2 Screening steps | step counts from the screener flags (`funnel3.json`) | `methodfig.py` (root script; the "+ EC S2 / + EC LIFE" labels removed, because the EC IA runs are now screened) | all boxes reproduce, except the 2040-window box (70 against 68), which is unexplained |
| 3 Three pathway sets | counts, model families, ranges | `patch_tables.py` | ranges reproduce, apart from the EC IA values completed from Annex 8 |
| 5, 6 Pathway tables | three new rows; EC IA S2 and LIFE completed (capture, bioenergy) | `patch_tables.py` | existing rows unchanged |
| 7, 8 Net GHG and industry | three new pathways, harmonised as in the deck (value × inventory / model, base 2020; Agora 2018) | `fig_sector.py` (standalone port of `facet4.py`; reads `sector_dump.json`, `new_sector.json`) | old ranges on slide 14 reproduced exactly |
| 9, 10 Industry energy and CO₂ | CETO 2024 and the Rodrigues reference run added to `ind_detail.json`; Agora publishes no industry energy split | `indfig.py` (root script) | image identical in size, values unchanged |
| 11–13 Solar/wind, final energy, electrolysers and CO₂ captured | existing values re-pulled (`existing_ct.json`, provenance in `existing_ct_provenance.md`) and three new pathways added | `fig_ct.py` (redraw of the "Chapter I draft" figures 4–6) | dot counts 3/8/8 (electrolysers 3/7/8) and set medians reproduce the old slides |
| 14 Ranges | from `fig_sector.py` | `assemble.py` | old values reproduced exactly |

## Run

From this folder (Selawik fonts in `/root/.fonts/Selawik*.ttf` for the deck charts; Inter for `fig_ct.py`):

```bash
python3 methodfig.py && python3 indfig.py && python3 fig_sector.py new_sector.json && python3 fig_ct.py ct_data.json
```

```bash
python3 -I patch_tables.py ../../../settings3.html deck.html && python3 -I assemble.py deck.html deck_out.html .
```

```bash
DSF=1.5 node shoot.js "$PWD/deck_out.html" shots
```

The last command writes one PNG per slide and reports any element that overflows a slide. The PDF is these 14 screenshots
combined (as in the root `mkpdf.py`).

## Caveats

- Mixed bases on slide 5: existing rows keep the deck's stored values. For example, the Schreyer et al. 2030 cuts are the stored
  database values (about 62 %), while the workbook formula gives about 57 %. The new rows and EC IA S2 use the screening formula.
  The slide note says so.
- Slides 11–13 plot only pathways the old deck plotted, plus the new ones. CETO 2025, POLIZERO CLI and EC IA S2/LIFE have
  sourced values that the old deck did not plot; they remain unplotted, as before (`deck_plotted` in `existing_ct.json`).
- Final energy and industry final energy are not on one basis. REMIND includes feedstocks (and, for total final energy,
  bunkers); POTEnCIA excludes them.
- Only Agora publishes electrolyser capacity among the new pathways. REMIND `Cap|Electricity|Hydrogen` is hydrogen-fired
  power and is not used.
- The electrolyser ring (0.49 GW, end-2025) is taken from a secondary report citing ACER and is not verified against ACER.
  The PV and wind rings are Eurostat `nrg_inf_epcrw` 2024 (307.1 and 231.1 GW).
