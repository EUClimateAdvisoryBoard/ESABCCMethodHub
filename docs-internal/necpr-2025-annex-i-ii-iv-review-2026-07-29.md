# NECPR 2025 — Annexes I, II and IV: what is usable, July 2026

First pass over the three 2025 National Energy and Climate Progress Report
workbooks published through the EEA's Reportnet 3 dataflow:

| Workbook | Coverage |
|---|---|
| `NECPR_Annex_I_GHG_Progress_2025.xlsx` | GHG emissions and removals — Tables 1–4 |
| `NECPR_Annex_II_RES_2025.xlsx` | Renewable energy — Tables 1–8 |
| `NECPR_Annex_IV_EE_Progress_2025.xlsx` | Energy efficiency — Tables 1–7 |

The brief was to find what is usable in the "other objectives" tables
(Annex I Tables 1, 3 and 4; Annex II Table 7; Annex IV Table 6), so that is
where most of this sits. Annex I Table 2 (Effort Sharing) was read as well
because it carries a defect worth reporting upstream.

Extraction is reproducible via `scripts/extract-necpr-2025.py`; tidy CSVs and a
machine-generated flag list land in `public/data/necpr-2025/`. The source
workbooks are not redistributed here.

**Bottom line.** Annex I Tables 1–3 are usable with cleaning and carry two
findings that stand on their own. Annex I Table 4 is usable for about half the
Member States after manual normalisation. Annex II Table 7 yields nine
country–objective pairs where a target and a progress value can actually be
compared. Annex IV Table 6 has no value columns at all and cannot be made
quantitative without re-reading the prose.

---

## 1. Two substantive findings

### 1.1 The aggregate LULUCF sink peaks in 2030 and then shrinks

Summing the 27 national LULUCF series (Annex I Table 3; Table 1's
including-minus-excluding-LULUCF difference reproduces these figures exactly,
which is a useful internal consistency check):

| | 2023 actual | 2030 | 2035 | 2040 |
|---|---|---|---|---|
| WEM | −198 Mt | −183 Mt | −157 Mt | −148 Mt |
| WAM | −198 Mt | −233 Mt | −204 Mt | −199 Mt |

Two things follow. The EU-wide 2030 net-removals target under Regulation (EU)
2018/841 is −310 Mt CO₂e; the sum of national *with additional measures*
projections reaches −233 Mt, roughly 77 Mt short, and the *with existing
measures* sum is around 127 Mt short. And beyond 2030 the aggregate declines
under both scenarios — the direction of travel in Member States' own
projections is the opposite of the growing sink that a 2040 net target leans on.

The decline is concentrated. Germany's land sector is projected to stay a net
**source** of roughly +32 Mt through 2040 (it was +69 Mt in 2023); Finland
(+12 Mt in 2023), Latvia (+4.6 Mt), Ireland (+3.9 Mt), the Netherlands
(+3.8 Mt) and Estonia (+2.1 Mt) are also net sources. Sweden's sink shrinks
from −31 Mt to −18 Mt by 2040 and France's from −37 Mt to −21 Mt, while
Poland's recovers to −42 Mt in 2030 before falling back to −30 Mt in 2040.

### 1.2 A "commitment" is often the country's own projection

Annex I Table 3 asks for the LULUCF commitment stated in the current NECP.
Four Member States (EE, ES, HU, RO) entered a number that is, to within a
rounding error, their own WEM or WAM projection for the same year. Greece is
explicit about it in the description field: *"Projected values in the WEM
scenario."* Eight report nothing at all for 2030 (AT, BG, CZ, FI, IE, IT, MT,
SE), several of them noting that the commitment is whatever Regulation
2018/841 sets.

Read together with §1.1, the practical consequence is that the LULUCF column
of Table 3 cannot be used as a measure of ambition — for a large minority of
Member States it is a restatement of the projection it would be compared
against.

---

## 2. Annex I Table 1 — headline targets

**Climate neutrality year.** 22 of 27 report one: FI 2035, AT 2040, DE 2045,
RO 2045, and 2050 for the other 18. BE, CZ, HR, PL and SE return `NA`. For at
least Sweden that is a template artefact rather than an absent target — its
net-zero-by-2045 objective appears in Table 4 instead. Anyone using this column
should treat `NA` as "not captured here", not "no target".

**National GHG targets.** The table offers three scopes (excluding LULUCF;
including LULUCF; including LULUCF and international aviation) and coverage is
thin and uneven:

| Year | Excl. LULUCF | Incl. LULUCF | Incl. LULUCF + aviation | Any scope |
|---|---|---|---|---|
| 2030 | 14 | 13 | 5 | **19 MS** |
| 2040 | 9 | 7 | 2 | **10 MS** |
| 2050 | 8 | 12 | 2 | **14 MS** |

Only ten Member States give a quantified 2040 target in any scope. Member
States also pick different scopes, so a cross-country table has to be built
scope by scope and will have gaps in every one of them.

**Role of removals.** Quantified by 13 Member States for 2030, 6 for 2040 and
8 for 2050. The template also reuses the `Target_year_for_climate_neutrality`
column to hold the NECP removals figure on these rows, so that column carries
two different quantities depending on the row type — worth knowing before
parsing it.

**Three entry errors.** Hungary's 2030 target is given as 475,000 kt excluding
LULUCF and 412,000 kt including it, against its own WEM projections of 53,731
and 48,788 kt. Ireland's 2030 including-LULUCF target is 335,000 kt against a
59,837 kt projection. All three look like order-of-magnitude slips and all
three propagate into the reported gap column, which shows Hungary and Ireland
comfortably beating targets they are not in fact beating.

**Targets that sit above the projection.** Czechia's 2030 excluding-LULUCF
target (103,962 kt) is well above its own WEM projection (65,538 kt), and the
same holds for 2040 and 2050. Lithuania's 2030 including-LULUCF target
(15,708 kt) is roughly double its projection. These are not errors — they are
NECP targets that current projections have overtaken — but they need a
different label from the Hungary/Ireland cases when the two are shown side by
side.

**The gap columns are relative, not absolute.** `Projected progress:
Difference between W[E/A]M scenario and values in line with national GHG target
path` is (target − projection) / target, so −1.05 means the projection is 105%
above the target path. The tidy extract adds absolute kt gaps alongside.

---

## 3. Annex I Table 2 — a defect worth reporting upstream

The `Annual emission allocation` series is in **Mt CO₂e** but is labelled
`ktCO2e`, while `Total Effort Sharing emissions` in the same table is genuinely
in kt. Austria's 2030 AEA reads 36.14; its 2030 WAM ESR emissions read
34,223.4.

The consequence is that the table's own pre-calculated difference rows are
wrong. Austria's 2030 WAM difference is reported as −34,187.25, which is
exactly 36.14 − 34,223.40: kilotonnes subtracted from megatonnes. Every
`Difference between AEA…` value in the table is affected; the flag list picks
up 54 of them (27 Member States × the 2023 and 2030 rows, the two years where
an allocation and a projection can be paired directly).

Rescaling the AEA by 1,000 gives a usable comparison. EU-27 ESR emissions in
2030 come to 1,558 Mt under WAM and 1,727 Mt under WEM, against 1,775 Mt of
allocations. Under WAM three Member States exceed their allocation — MT
(+63%), IE (+14%) and DE (+3%); under WEM ten do, adding CY (+28%), BE (+21%),
LU (+12%), SI (+7%), AT (+7%), IT (+5%) and FR (+0.5%). That arithmetic is
ours, not the file's.

One caveat on the allocation series itself: it sums to 1,775 Mt in 2030 against
2,469 Mt in 2005, i.e. −28%. That is the trajectory of the original 2018 Effort
Sharing Regulation, not the −40% of the 2023 amendment. The source field says
`ETC Source` rather than a Member State submission, so the vintage should be
confirmed with the EEA before the series is used as the compliance benchmark.

---

## 4. Annex I Table 4 — other national objectives

88 objectives from **17 Member States**; ten report nothing. 75 of the 88 carry
a numeric target in at least one year. Volume is concentrated: PL 23, LU 12,
RO 8, DE 7, SI 6, LT 5, PT 5, and single digits elsewhere.

The structure is a target block followed by unlabelled `Current progress` /
`Projected progress under W[E/A]M scenario` rows that inherit the preceding
block's identity — they carry no target name, sector or unit of their own, so
the file has to be read sequentially. The extract script does this and emits
one row per objective-year.

What makes it hard to compare:

- **65 distinct sector labels** for 88 objectives, ranging from CRF codes
  (`1.A.3 Transport`) to prose (`GHG emissions attributed to Luxembourg under
  Regulation (EU) 2018/842 — Transports: CRF 1A3 & 1A5`) to `brak danych`.
- **22 distinct unit strings**, including four spellings of kt CO₂e, three of
  Mt CO₂e, and entries that are not units at all: `pkt`, `szt.`, `dam3`,
  `brak danych`, `Share of RES in FEC (%) - incl. cooperation measures`.
- **Fractions where percentages are declared.** Portugal's sectoral targets
  read −0.7, −0.35, −0.4 for what the description confirms are −70%, −35% and
  −40% cuts against 2005; Slovenia does the same. In both files one row of the
  set then carries absolute kt values in the progress series while the target
  stays a fraction.
- **GWP mixing.** 290 rows on AR5, 150 on AR4 (Germany and Poland).
- **Untranslated submissions.** Poland's 23 objectives are in Polish, 13 of
  them with `brak danych` (no data) in the description, unit and sector fields,
  and most are not GHG objectives at all — air quality zones, sewerage
  connection rates, Natura 2000 coverage, small water retention capacity.
  Denmark's single entry is `NA` throughout.
- **One decimal error.** Greece's ESR target reads 47,613,900 for 2030 and
  48,687,500 for 2035 against current progress around 46,000 ktCO₂eq — three
  orders of magnitude out.

Netting that off, the genuinely comparable material is Luxembourg's five
sectoral ESR budgets plus its LULUCF, RES and EE targets; Romania's seven
sectoral targets with WEM/WAM series; Germany's Federal Climate Change Act
sectoral series; Slovenia's six ESR sectoral percentages (after ×100);
Portugal's five sectoral percentages (same); Sweden's ESR and transport
milestones; France's carbon budgets; Croatia's ESR/ETS/LULUCF split; the
Netherlands' Climate Act figures; and Finland's transport-fuel and coal
phase-out targets. That is roughly 60 objectives across 15 Member States that
survive normalisation — enough for sectoral comparison across a subset, not
enough for an EU-wide table.

---

## 5. Annex II Table 7 — other RES objectives

ENER standardised the objective *types*, and that part worked: six named
categories (district heating, buildings, cities, energy communities,
self-consumers, energy from sewage sludge) plus a free-text "other". What was
not standardised is the indicator, the unit or the target format.

132 rows, **13 Member States**, 66 country–objective pairs across 2022 and
2023. Of those pairs:

- 27 have a numeric progress value,
- **9 have both a numeric target and a numeric progress value.**

Spain, Slovenia and Slovakia submit all six standard categories with `NA` in
every field. Poland submits in Polish with `brak danych` / `Nie dotyczy`.

Units diverge inside a single standardised category:

| Category | Units used |
|---|---|
| District heating | `%`, `percent`, `TWh`, `ktoe`, `Mtep`, `%points/year` |
| Buildings | `%`, `TWh`, `%points/year` |
| Self-consumers | `number of prosumers`, `Liczba`, `MW`, `PJ/a` |
| Energy communities | `Liczba`, `pcs/a`, `MW` |

Targets are prose in 34 rows — *"Renewable energy to account for 9.4% of energy
used in district heating systems"* (RO), *"at least 3500 MW"* (RO), *"31 to 36
TWh"* (FR), *"~+2,2%points/a"* (HU). Where they are numeric they mix fractions
and percentages: Lithuania's district-heating target is `0.9` and Germany's
`0.45` (both fractions) while Latvia's is `73.9` and Croatia's `20.9` (both
percent), all in the same column.

Three things in the numbers are worth a second look:

- **Croatia** reports 0.1% renewables in district heating for both 2022 and
  2023 against a 20.9% target. Given Croatia's actual DH mix this looks like a
  reporting error, not a 20.8-point gap.
- **Poland** reports 1,193,350 prosumers in 2022 and 1,383,480 in 2023 against
  a stated 2030 target of one million — the target was passed before the
  reporting period began.
- **Greece** gives a buildings target of `0.722` against progress values of
  40.7% and 44.5% — fraction against percent in one row.

Cleanest series: Lithuania and Latvia district heating, Latvia buildings,
Germany district heating, Italy and Romania (absolute, with prose targets),
Lithuania self-consumers.

---

## 6. Annex IV Table 6 — other EE objectives

The weakest of the three by a distance, and the reason is structural rather
than behavioural: **the table has no unit, year or value column.** Its fields
are `Name_of_national_target_or_objective`, `Description`,
`Progress_towards_target_or_objective` and `Expected_impacts_of_the_set_objective`
— all free text. Nothing in it is machine-comparable by construction.

55 rows, **8 Member States**. 26 rows are `NA` in every field — Denmark
submitted 13 such rows and Czechia 13. That leaves 29 substantive entries:
IE 12, FR 6, HU 5, SI 4, EL 1, PL 1. Only 11 of the 29 contain a number with a
unit anywhere in their prose.

Where numbers do appear they are embedded in sentences, and in the submission
language:

- **France** (6 entries, French) is the most extractable: primary coal
  consumption *"Objectif : 26 TWh en 2030 et 21 TWh en 2035 … Valeur 2022 : 64
  TWh, Valeur 2023 : 49 TWh"*, and the same pattern for natural gas
  (260/173 TWh target, 405/358 TWh actual), petroleum products (359/216 vs
  593/597), renewable heat (297 TWh target vs 176/183), final energy
  consumption (1,243 TWh vs 1,572/1,509) and primary energy (1,844 TWh vs
  2,376/2,419). Note petroleum products and primary energy both *rose* between
  2022 and 2023.
- **Slovenia** (4): final energy use below 50.2 TWh by 2030, at 52.2 TWh in
  2023; buildings −15% by 2030 against 2020, at −3.8%; public sector −1.9%/year,
  *"not yet being monitored"*.
- **Hungary** (5): final energy consumption ≤740 PJ in 2030, cumulative savings
  336.3 PJ, residential building stock −20%, public buildings −18%, final energy
  intensity below 0.429 toe/million HUF — all targets, no progress values.
- **Ireland** (12): the largest submission and the least quantified — programme
  narratives (Pathfinder, Heat and Built Environment Taskforce, heat policy
  statement) with progress in prose. A few carry figures: 500,000 buildings to
  B2 with 201,000 done 2019–2024, 680,000 heat pumps by 2030 with ~14,500
  installed under SEAI schemes.
- **Greece** (1): 3% annual public-building renovation, *"Fulfilled"*.
- **Poland** (1): efficient district heating systems, in Polish, no figures.

For contrast, Annex IV Table 1 (the national energy-consumption contribution)
*is* structured and complete, so the weakness here is specific to the
"other objectives" table.

---

## 7. Notation keys

2025 is the first year notation keys were mandatory, which is an improvement —
a blank and a deliberate "not applicable" are now distinguishable. Two keys are
defined: `NA` (not applicable) and `NAv` (not available). In practice the files
also contain `NAV`, `N/A`, `NO`, `ΝΑ` (Greek capital nu-alpha, not Latin NA),
`brak danych` and `Nie dotyczy`. Any parser needs to treat all of these as
missing; the extraction script does.

---

## 8. What was produced

`scripts/extract-necpr-2025.py` writes to `public/data/necpr-2025/`:

| File | Rows | Contents |
|---|---|---|
| `annex1-table1-targets.csv` | 405 | target / historic / WEM / WAM per country-scope-year, with absolute and reported relative gaps |
| `annex1-table1-neutrality.csv` | 27 | neutrality year and role of removals per country |
| `annex1-table3-lulucf.csv` | 135 | LULUCF history, projections and stated NECP commitment |
| `annex1-table4-other.csv` | 440 | other GHG objectives, one row per objective-year, with a `has_any_numeric_target` filter |
| `annex2-table7-res.csv` | 132 | other RES objectives with a `comparable` flag |
| `annex4-table6-ee.csv` | 55 | other EE objectives with a count of quantities found in the prose |
| `quality-flags.csv` | 196 | machine-detected flags across all of the above |

Flag counts: 54 `unit_mismatch` (Annex I Table 2 AEA), 34 `target_as_free_text`
(Annex II Table 7), 26 `empty_row` and 18 `no_quantity_anywhere` (Annex IV
Table 6), 18 `nonstandard_unit_string` and 4 `unit_mismatch` (Annex I Table 3),
13 `no_numeric_target` and 10 `missing_unit` (Annex I Table 4),
4 `commitment_equals_projection`, 4 `incomparable_units`, 3
`implausible_magnitude`, 2 `fraction_vs_percent`, 5 `not_reported`, and 1
`no_value_columns` for the structural defect in Annex IV Table 6.

The three order-of-magnitude errors (HU ×2, IE ×1) and Greece's ESR decimal
error are corrections to make before any of this is used; they are flagged but
deliberately **not** silently fixed in the extract, since the published value is
what the Member State submitted.

---

## 9. Suggested next steps

1. Normalise Annex I Table 4 into the sector taxonomy already used by the
   policy-target register, and apply the ×100 correction to the PT and SI
   percentage targets and the ×0.001 correction to the EL ESR target. Roughly
   60 objectives across 15 Member States should survive.
2. Raise the Annex I Table 2 AEA unit defect with the EEA — it makes the
   table's own difference column unusable, and the fix is a label change plus a
   recalculation.
3. Treat the LULUCF trajectory (§1.1) as a candidate finding in its own right:
   Member States' own WAM projections have the aggregate sink peaking in 2030
   and declining thereafter, against a −310 Mt 2030 target.
4. For Annex II Table 7, ask ENER whether the indicator and unit can be
   standardised alongside the objective type for the next cycle. Nine
   comparable pairs out of 66 is the cost of standardising only the name.
5. Do not attempt to quantify Annex IV Table 6 mechanically. If the content is
   needed, the French and Slovenian entries repay manual extraction; the rest
   does not.
