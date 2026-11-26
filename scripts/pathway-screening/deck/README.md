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

## Industry slide: annual-reduction panel (26 Nov 2026)

At the request of the Secretariat, slide 8 (Industry, 2005–2050) has a panel above the chart showing average annual reductions.
`fig_sector.py` computes the values:

- **2005–2024:** EEA inventory, (887.7 − 527.5) / 19 = **19 Mt CO₂e per year**.
- **2024–2040, ECL set (n = 6):** (inventory 2024 − pathway 2040) / 16 for each pathway; range **18–28 Mt CO₂e per year**.
  The low end is the Rodrigues et al. reference run and the high end Schreyer et al. 07_NZ_CCS180_highImp.
- **2040–2050, ECL set:** (pathway 2040 − pathway 2050) / 10; range **7–20 Mt CO₂e per year**. The low end is Agora and the
  high end the Rodrigues et al. reference run.

Pathway values are the deck's harmonised industry values (energy + process CO₂, scaled to the 2020 inventory; Agora on 2018).
The 2024 starting point is the inventory, not a pathway value.

## Industry slide: production index on a secondary axis (26 Nov 2026)

Slide 8 has a right-hand axis "Index, 2005 = 100". It is scaled so that 100 equals industry emissions in 2005 (887.7 Mt), so the black emission line reads as an index too: 59 in 2024.

**Data.** Dashed lines show EU27 industrial production for manufacturing as a whole and for the three branches that dominate industry emissions: basic metals (C24), non-metallic minerals (C23) and chemicals (C20). Data are in `production_index.json`:
- Source: Eurostat `sts_inpr_a`, unit I21, calendar adjusted, retrieved 26 Nov 2026.
- The series are rebased to 2005 = 100.
- Paper (C17) is stored in the file but not plotted.
- Refining (C19) is excluded, because its emissions sit in energy supply, not industry.

| 2024 vs 2005 | Index (2005 = 100) |
|---|---|
| Industry emissions (EEA inventory) | 59 |
| Manufacturing, all branches | 114 |
| Chemicals (C20) | 96 |
| Paper (C17), not plotted | 95 |
| Basic metals (C24) | 80 |
| Non-metallic minerals (C23) | 74 |

**What the data does and does not show:**
- **Supported:** heavy-industry output fell, and emissions follow it, for example the 2009 collapse and the 2022–24 decline.
- **Not supported:** manufacturing output as a whole is 14 % above 2005.
- **Partial:** emissions fell further (−41 %) than heavy-industry output (−4 % to −26 %), so lower output explains part of the decline, not all of it.

The slide shows the series without a causal claim. Any statement on it should keep this distinction.

## GHG intensity of industry (26 Nov 2026)

`fig_intensity.py` writes two figures:
- `fig_industry_intensity.png`: the sector index lines, the sector waterfall and the branch breakdown.
- `fig_steel_intensity.png`: iron and steel in the layout of the Secretariat's example.

The data, with sources and method, are in `industry_intensity.json`.

**Method.** Each industry inventory category is paired with the Eurostat production index of its branch:

| Branch | Inventory categories | Production index |
|---|---|---|
| Iron and steel | 1.A.2.a + 2.C.1 | C24.1 |
| Non-ferrous metals | 1.A.2.b + 2.C excl. 2.C.1 | C24.4 |
| Chemicals | 1.A.2.c + 2.B | C20 |
| Pulp and paper | 1.A.2.d | C17 |
| Food and drink | 1.A.2.e | C10–12 |
| Non-metallic minerals | 1.A.2.f + 2.A | C23 |
| Other industry | 1.A.2.g + 2.E + 2.H | C (proxy) |

Intensity is emissions divided by the production index. The 2005–2024 change is split into a production effect and an intensity
effect with the additive LMDI-I method, which leaves no residual. The sector production index weights the branch indices by 2005
emissions.

**Results (Mt CO₂e, 2005 → 2024):**
- **Industry:** 906 → 545. Production effect −100 (28 %), intensity effect −262 (72 %). Production index 88, intensity index 68.
- **By branch:** iron and steel −50 / −23; non-metallic minerals −61 / −46; chemicals −6 / −92; other industry +17 / −59; food +5 / −19; paper −1 / −13; non-ferrous −4 / −9.

**Reading.** Lower output dominates only in iron and steel and is about half of the change in minerals. Across industry as a whole,
lower intensity contributed more, chemicals above all.

**Comparison with the Secretariat's steel chart.** That chart shows −54 / −19. It applies the output change to 2005 emissions
(193 × −27.6 % ≈ −53) and puts the remainder in intensity. LMDI splits the interaction term between the two, giving −50 / −23.

**Data vintage.** The sector totals come from the current Eurostat release and are 1–3 % above the EEA series on the industry slide.

## Update: tonnes where available; combined industry slide (26 Nov 2026)

**Measures of production.** The decomposition now measures production in tonnes for the two branches where a reliable EU27
tonnage exists. Sources and flags are in `production_tonnes.json`:

| Branch | Measure | Source | 2024 (2005 = 100) |
|---|---|---|---|
| Iron and steel | Crude steel | worldsteel EU28 minus UK, 2005–2015; Eurofer EU27, 2016–2024 (the series overlap within 0.3 %) | 71 |
| Non-metallic minerals | Cement | CEMBUREAU | 67 |

The other branches keep the Eurostat volume index, for these reasons:
- **Chemicals** has no meaningful single tonnage.
- **Non-ferrous metals:** only an unwrought-aluminium proxy exists, not primary aluminium.
- **Paper:** the FAOSTAT tonnage is mostly estimated.
- **Food and other industry** have no tonnage.

The EU inventory activity data, which are the preferred source, could not be downloaded (unfccc.int bot challenge). The EU NID
2026 values for 2024 are kept in the file as cross-checks.

**Results, Mt CO₂e, 2005–2024 (production effect / intensity effect):**

| | Tonnes | Volume index (earlier) |
|---|---|---|
| Iron and steel | −53 / −20 | −50 / −23 |
| Minerals | −81 / −27 | −61 / −46 |
| **Industry** | **−122 / −240** (production effect 34 % of the decline) | −100 / −262 (28 %) |

The sector production index for 2024 is 86 and the intensity index 70.

**Slide 8** now combines two parts:
- on the left, the scenario chart in a narrower variant (`NARROW=1 python3 fig_sector.py new_sector.json`);
- on the right, the past-drivers waterfall over the branch breakdown (`fig_industry_drivers.png` from `fig_intensity.py`).

`assemble.py` places the composite `f3_industry_combined.png`; the PIL step that builds it is in the run notes. The right-hand
axis of the scenario chart now shows crude steel and cement in tonnes, plus chemicals and manufacturing on the volume index.

## Value-based vs tonnage-based production (26 Nov 2026)

`fig_method_compare.py` compares the two production measures and their effect on the decomposition. It writes
`fig_method_compare.png` and `method_comparison.json`. The chemicals weights are in `chem_weights.json`.

| Branch | Value index 2024 (2005 = 100) | Tonnage 2024 | Reading |
|---|---|---|---|
| Iron and steel | 72 | Crude steel 71 | The measures agree |
| Minerals | 74 | Cement 67 (lime 82) | Tonnes fall more |
| Chemicals | 96 | Basket 65 (ammonia 67, nitric acid 64, adipic acid 71, ethylene 61) | Large gap: value held up while basic-chemical tonnes fell by a third |
| Paper | 95 | Paper and board 83 (FAOSTAT, mostly estimated) | Tonnes fall more |
| Non-ferrous | 80 | Aluminium proxy 25 | Proxy not usable |

| Variant | Production effect | Intensity effect | Output share |
|---|---|---|---|
| V: value index for all branches | −100 | −262 | 28 % |
| T1: tonnes for steel and cement (current slides) | −122 | −240 | 34 % |
| T2: tonnes where available (adds the chemicals basket and paper) | −179 | −182 | 50 % |

**Choice of measure.** The measure chosen moves the output share of the 2005–2024 decline from 28 % to 50 %. Almost all of that
spread comes from chemicals.

**Caveats for T2:**
- The chemicals basket covers the four products with process emissions, weighted by their 2005 emissions (2.B.1, 2.B.2, 2.B.3, 2.B.8).
- It is applied to the whole branch, including combustion (1.A.2.c). This assumes chemicals' fuel use follows basic-chemical output.
- Nitric and adipic acid emissions fell by over 95 % through N₂O abatement. That abatement remains an intensity effect in every variant.

**Unchanged across variants:** food, other industry and non-ferrous metals keep the volume index in all three variants.
