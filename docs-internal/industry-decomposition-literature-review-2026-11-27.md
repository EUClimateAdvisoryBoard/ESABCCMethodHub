# EU industry output, GHG intensity and decomposition: literature review

> AI-compiled — pending Secretariat verification. 27 Nov 2026.
>
> **What this is.** Four research agents ran literature sweeps in parallel. Each source was opened and each number checked
> against a page, table or section locator; items that could not be opened are listed under *Not verified*. This file
> distils those notes; the raw notes stay in the session scratchpad.
>
> **What it tests.** It sets the literature against our results in
> [`industry-decomposition-policy-implications-2026-11-26.md`](industry-decomposition-policy-implications-2026-11-26.md)
> (E1–E7) and the figure `scripts/pathway-screening/deck/fig_industry_onefig.png`.
>
> **Status.** This is a literature pass, not a fact-check pass. It changes no stored values.

## 1. Bottom line

| Our result | Literature verdict | Main sources |
|---|---|---|
| Steel and cement/minerals cuts came mostly from lower output (about 67 %, E3) | **Supported** by every study that uses physical output | UBA steel 2025; UBA cement 2022; Branger & Quirion 2015; EEA 14/2026; ESABCC 2024 |
| About 45 % of the manufacturing cut came from lower output (E2) | **Mixed.** Physical-unit studies agree on direction; value-based decompositions give efficiency a much larger role | ODYSSEE 2026 (activity +49 Mt, 2010–2023); Commission Climate Action Progress Report 2026 |
| Value indices understate the fall in output (E7) | **Supported**: monetary measures overstate intensity gains | Farla & Blok 2000; Norman 2017; Ang & Xu 2013; Román-Collado & Economidou 2021 |
| Pathways keep output roughly stable (E6) | **Supported, and explained**: in the central EU scenarios this is an input assumption, not a model result | Commission 2040 impact assessment SWD(2024) 63; JRC CETO 2024 |
| The cause of the output fall cannot be determined from our data (implication 3) | **Supported.** Little carbon-price leakage up to 2016; after 2022, energy-cost relocation in aluminium and chemicals; cement and steel follow demand | Naegele & Zaklan; Dechezleprêtre et al.; ECB; IEA; UBA cement 2022; EUROFER |
| Comparing the historical decomposition with the scenario decomposition | **Appears new.** No published EU-27 manufacturing GHG decomposition with process gases, physical output and data to 2024, and no historical-vs-scenario comparison, was found | — |

## 2. Decomposition studies

| Study | Scope, period | Activity measure | Finding (locator) | Fit with ours |
|---|---|---|---|---|
| UBA / Öko-Institut, *Climate Change* 52/2025, Annex B | EU27+UK steel, 2005–2022, LMDI | Tonnes by route | CO₂ −71.4 Mt (−29 %), "primarily driven by a reduction of production on the BF-BOF route"; direct intensity rose; route shift minimal (pp. 13–14, 34) | Consistent: steel output effect −53 Mt, intensity −22 Mt in ours |
| Emele et al., UBA 2022 | EU28 cement, 2005–2018 | Tonnes | −40.9 Mt; demand side 55 %, supply side 37 %, external 8 % (pp. 26–27); clinker share rose | Consistent |
| Branger & Quirion 2015, *Energy Economics* 47 | EU27 cement, 1990–2011 | Tonnes | Activity effect dominant, −68.6 Mt in 2007–10 (p. 22); ETS-driven abatement 2.0 % ± 1.1 % in 2005–11 (p. 4) | Consistent |
| Rottner & von Graevenitz 2024 | Germany, product level, 2005–2017 | Product output | Emission intensity rose 4.5 %; working at branch level understates composition effects | Consistent; warns that our 15-branch split may still mask product-mix effects |
| ODYSSEE-MURE policy brief, Jan 2026 | EU industry energy CO₂, 2010–2023 | Value added / index | −105 Mt = activity **+49**, savings −72, decarbonisation −45, structure −36 (p. 4) | **Conflicts.** Likely causes: base 2010, value-based activity, energy CO₂ only, broader scope |
| Hammond & Norman 2012 | UK, 1990–2007 | Value added | Intensity, not output, was the main driver | Differs; value-based measure, different country |
| Farla & Blok 2000; Norman 2017; Ang & Xu 2013; Román-Collado & Economidou 2021 | NL, UK, method papers, EU28 | Physical vs monetary | Monetary measures overstate intensity gains (Farla & Blok: 1.4 % vs 1.6 % a year) | Consistent with our 45 % (physical) vs 33 % (index only) |

## 3. Institutional and sector data

- **EEA Report 14/2026, *Europe's industrial transformation*.** CO₂ per tonne of steel and cement shows "only a marginal
  decline" over 2010–2023 and has risen slightly for steel since 2021. Aluminium intensity fell 35 % and chemicals 14 % (p. 34).
- **ESABCC 2024 progress report, industry chapter.** Reductions were "mainly driven by lowered production" (p. 81). The
  Figure 26 data give steel 1.010 → 0.962 t CO₂/t (2008–2021) and clinker-based cement 0.599 → 0.604 t/t (2005–2021,
  peak 0.703 in 2014). This is the only EU-level per-tonne series for steel and cement we could verify. Eurofer and worldsteel
  publish no annual EU series; worldsteel's series is global (1.80 → 1.92 t/t).
- **Commission Climate Action Progress Report 2026.** Credits mainly efficiency over 2014–2024, with lower activity mattering
  more in metals. It gives no effect sizes.
- **Eurostat.** Manufacturing GHG per unit of value added fell 33 % over 2013–2024. Its manufacturing total includes
  refineries, so it is not comparable with our 527 Mt.
- **EU ETS benchmarks** (best 10 % of plants, not EU averages): grey clinker 0.722 → 0.689 t/t; hot metal 1.331 → 1.360 t/t
  (2016–17 to 2021–22).

**Cross-check against our split.**
- **2005–2010:** almost all of the cement, lime and glass cut came from lower output (production −51.8, intensity +1.3 Mt).
- **2010–2024:** the "cleaner" part (−35.4 Mt) is split as follows:
  - cement process CO₂: −8.6 Mt on 77 Mt, about −11 %. This comes from a lower clinker share and is in line with "marginal"
    per-tonne progress;
  - lime: −0.7 Mt;
  - glass: −0.6 Mt;
  - "other minerals" (mostly fuel combustion in 1.A.2.f, measured with the C23 production index): **−25.6 Mt**.
- **Steel 2010–2024:** intensity −10.9 Mt against production −32.8 Mt, consistent with the near-flat per-tonne series.
- **Open point.** The largest mineral intensity gain rests on a value-index proxy, not tonnes. The literature does not
  contradict it, but it is the least robust part of the mineral result and should be checked against clinker activity data.

## 4. Why output fell: leakage or structural change

Evidence for each reading:

- **Against carbon-price leakage (2005–about 2016).**
  - Studies finding none: Naegele & Zaklan (trade data 2004/07/11), Dechezleprêtre et al. (2007–14), Colmer et al.
    (emissions −14 to −16 %, no output loss; exact years not verified), Branger et al. (cement and steel), Healy et al.
    (cement 2000–16).
  - Verde's 2020 review agrees, but notes the evidence comes from years of low prices and free allocation.
- **Later or narrower channels.**
  - Wang & Kuusi 2024: small trade leakage.
  - A 2026 *Climate Policy* meta-analysis: no significant trade effect (0.03, CI −0.03 to 0.09), but a significant
    investment-leakage effect (1.07).
  - EIB Phase IV study (2012–22): marginal effects on production.
- **Energy-cost relocation after 2022.**
  - ECB: imports relative to production rose about 11 % in energy-intensive sectors.
  - IEA: aluminium output −12 % and steel −10 %, with some aluminium closures permanent. The IEA page was read via a mirror.
  - Draghi report: CO₂ was about 2 % of steel costs in 2019.
  - Cefic closure tracker: 37 Mt of capacity closed; companies cite energy cost in 49 % of cases, demand in 19 %.
- **Structural change and demand.**
  - Cement: UBA 2022 attributes 55 % to demand-side effects; the EU has been a net clinker exporter since 2008.
  - Steel since 2019 (EUROFER): apparent consumption fell from 144.8 to 125.6 Mt while imports stayed at about 26 Mt; the
    electric-arc share rose from 40.8 % to 45.0 %.
  - NAVIGATE synthesis (p. 42): past EU industry cuts reflected the collapse of heavy industry and the 2008 crisis,
    stagnating since 2010.
- **Trade footprint** (agent computation from Eurostat FIGARO, 2010–2024; to be reproduced before citing).
  - The non-EU share of the EU footprint rose: metals 49 → 55 %, minerals 31 → 37 %, chemicals 50 → 60 %.
  - Emissions embodied in imports still fell 3–9 % in absolute terms.
  - Lower exports explain 14–33 % of the fall in EU production-side emissions.
  - Reading: relative displacement, not wholesale relocation.

**Reading.** Both readings hold, for different sectors and periods. Cement, and steel since 2019, lean towards falling
demand. Aluminium and chemicals after 2022 lean towards relocation driven by energy costs. There is no causal study for
2021–24.

## 5. Scenario treatment of industrial output

- **Commission 2040 impact assessment, SWD(2024) 63.**
  - Same industrial-production assumptions in S1–S3 (Part 1, §5.3.1, p. 31).
  - Value added in energy-intensive industry is 25 % higher in 2040 than in 2016–2020; volumes grow in every
    energy-intensive sector except iron and steel (Part 2, Annex 6, §2.4.2, p. 15).
  - Only the LIFE variant lowers output: steel −15 %, cement and clinker −25 % (Table 3, pp. 38–39), phased in linearly from
    2030 to 2050.
- **JRC CETO 2024** takes its industry activity from S2 (pp. 14–15), so it is not independent evidence. Steel stays at about
  145 Mt (p. 35); cement grows 13–16 % from 2021 to 2050 (p. 34).
- **A Clean Planet for All (2018).** The circular-economy scenario cuts primary production by only 3–12 % by 2050
  (Table 27, p. 322).
- **REMIND (Pehl et al. 2024).** Output responds to carbon prices through the macro-economic module. This is consistent
  with REMIND-EU letting output fall in our data.
- **IPCC AR6 WGIII.** Material efficiency and demand management "are still not well represented in the scenario literature"
  (Ch. 11, p. 1206). Demand-side potential for industry has a median of 28.7 % (Ch. 5, p. 528).
- **Demand-side scenarios.**
  - Material Economics 2019: EU steel demand 139 Mt rather than about 190 Mt (PDF page locators).
  - CLEVER: 2050 production at 52–99 % (cement) and 74–92 % (steel) of 2015.
  - Grübler et al. 2018: global material output down by about 15–20 %.

## 6. What changes in our implications

1. **Implication 5** (the pathways disagree on output) can now say *why*. In the central EU scenarios, steady output is set
   as an input in the 2040 impact assessment, and CETO inherits it. Only REMIND models an output response. The LIFE variant
   and the demand-side studies show the alternative: planned material efficiency rather than unplanned output loss.
2. **Implication 3** (leakage or demand) can be sharpened by sector: demand for cement and steel; energy-cost relocation
   for aluminium and chemicals after 2022; little carbon-price leakage up to about 2016.
3. **E2** should carry a note that value-based decompositions (ODYSSEE, the Commission progress report) find a much smaller
   or even positive activity effect. The physical-versus-monetary literature explains the gap; the figure footnote already
   discloses the 33 % index-only variant.
4. **New check.** The intensity gain in "other minerals" (−25.6 Mt in 2010–2024) rests on a value-index proxy. Check it
   against clinker activity data before relying on the mineral split.

## 7. Not verified

- **Studies whose findings could not be checked.** Eight decomposition studies on Elsevier and Springer pages were blocked;
  we have their bibliographic details but no verified findings. They are listed in the scratchpad notes and none is cited
  above.
- **Sources that could not be opened.**
  - CEMBUREAU cement PDFs (404) and Cefic figures (404).
  - The GCCA cement database for the EU (behind registration).
  - The ESABCC 2025 industry chapter and the 2025 ETS report from the EEA's climate topic centre (both 503); retry from a
    GitHub runner.
  - The EU Calculator, JRC GECO, the 2020 climate target plan impact assessment, the full text of Pauliuk et al. 2017, the
    final CLEVER figures and the Bauer et al. NAVIGATE comparison.
- **Numbers not verified.** Colmer et al. study years, OECD steel overcapacity figures, Pauliuk steel-stock figures.

## 8. What this pass did not cover

- It did not re-run any fact-check on stored values.
- It did not cover IEA, Climate Action Tracker, Bruegel or Agora industry studies at EU level.
- It did not do a full systematic review of the national decomposition literature beyond Germany, the UK and the Netherlands.
