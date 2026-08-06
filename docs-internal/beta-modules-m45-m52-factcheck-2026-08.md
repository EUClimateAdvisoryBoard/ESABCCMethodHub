# Beta modules M·45–M·52 — fact-check (August 2026)

*Fact-check of the eight beta modules added in the Policy Gap 2.0
competitiveness-and-security round: M·45 Climate Security Ledger, M·46
Clean-Tech Manufacturing Scoreboard, M·47 Competitiveness Claims Register,
M·48 CRM × 2040 Pathway Stress Test, M·49 CBAM & Leakage Watch, M·50 Grid &
Interconnection Security Ledger, M·51 Climate Investment vs Rearmament, M·52
Trade-Partner Climate & Article 6 Tracker. All eight shipped labelled
AI-compiled, and none of their figures had been validated against a live
source. Checked 2026-08-06 against live Eurostat, the EU Publications Office
Cellar service, the World Bank Pink Sheet, ECB reference rates and named
primary publications.*

> **Departure from the usual rule, stated up front.** The standing convention
> is that a fact-check pass changes no stored values and hands decisions to a
> named owner. This pass was explicitly asked to correct as well as check, so
> it does both, in one commit per module. Each correction is traceable to the
> commit that made it, and every value replaced is named here alongside what
> replaced it. Where a correction was not possible, nothing was invented —
> the claim was withdrawn or left flagged, and it is listed under
> "Not corrected" below.

## The finding that made this pass possible

Six of the eight modules state in their file headers that Eurostat, EEA and
EUR-Lex hosts are blocked from the build sandbox, and several cite that as
the reason their figures are compiled from model knowledge rather than
pulled. **That premise is wrong**, and it is the most consequential thing
this pass found, because it silently licensed every other defect:

- **Eurostat is not blocked.** The dissemination API
  (`ec.europa.eu/eurostat/api/dissemination/statistics/1.0/data/`) answers
  ordinary HTTPS requests and returns JSON-stat. Every Eurostat figure in
  these modules could have been pulled at compile time.
- **EUR-Lex is behind an AWS WAF JavaScript challenge** and returns HTTP 202
  with a challenge page to any plain client — a genuine block, and one that
  looks like success to a naive fetcher. But the enacting terms are reachable
  without a browser through the **Publications Office Cellar service**:
  `https://publications.europa.eu/resource/celex/<CELEX>` with
  `Accept: application/xhtml+xml`. Every legal quote in this pass was
  extracted that way.
- **EEA** web pages are reachable.

`docs/how-to-access-eurostat-eea-data.md` and the network note in
`CLAUDE.md` have both been corrected in this pass: the guide now carries a
per-host reachability table, a section on reading enacting terms through
Cellar, and a warning that these three failure modes look alike and need
different fixes — 403/407 is an allowlist denial, 202 with a short body is a
bot challenge, 200 with an empty payload is a wrong query.

## Verdict bands

Standard bands, applied to quantities: **CONFIRMED** (≤ 2 %), **REVISION**
(2–5 %), **WRONG** (> 5 %), **NO SOURCE YEAR**, **NOT CHECKABLE**. For legal
text a quote is either an exact substring of the enacting terms or it is not;
"nearly verbatim" is recorded as WRONG.

## Summary

| Module | Checked | CONFIRMED | REVISION | WRONG | Corrected in this pass |
|---|---|---|---|---|---|
| M·45 Climate Security | 5 series (50 values), 9 price anchors, 3 supplier splits, 2 aggregates | 24 values | 12 values | 23 values + 1 aggregate stale | Yes — rebuilt from live sources |
| M·46 Clean-Tech | 2 legal benchmarks, 3 industry figures | 2 | 0 | 3 (1 locator, 1 quote, 1 figure) | Yes |
| M·47 Competitiveness Claims | 3 locators, 3 evidence bases | 4 | 2 | 0 | Yes |
| M·48 CRM | 4 legal benchmarks, 1 legal annex | 4 | 0 | 1 fabricated fragment | Yes |
| M·49 CBAM | 9 phase-down factors, 1 instrument | 9 | 0 | 0 (1 gap closed) | Yes |
| M·50 Grid | 27 ratios, 3 thresholds, 2 investment figures | 29 | 1 | 4 | Yes |
| M·51 Fiscal | 3 constants, 1 declaration | 1 | 1 | 2 | Yes |
| M·52 Trade-Partner | 3 NDC entries | 3 | 0 | 0 (2 flags closed) | Yes |

---

## M·45 — Climate Security Ledger

The worst-affected module, and now the best-sourced. Its entire backward leg
was rebuilt from live Eurostat and published World Bank price averages by two
new generator scripts, `scripts/refresh-climate-security-eurostat.mjs` and
`scripts/refresh-climate-security-prices.mjs`, both with `--dry-run`, both
treating a 200-with-nothing response and a missing year as fatal. Raw pulls
are committed under `public/data/climate-security/`.

**WRONG (> 5 %)**

1. **Hard-coal demand 2015–2018** — stored 226 / 215 / 208 / 200 Mt against
   248.0 / 240.8 / 232.1 / 221.3 Mt (`nrg_cb_sff`). Errors of 9–11 %.
2. **Gas demand 2015–2016** — stored 386 / 410 bcm against 361.7 / 381.9 bcm
   (`nrg_cb_gas`, million cubic metres, so no calorific conversion is
   involved). Errors of 6.7 % and 7.4 %.
3. **Hard-coal import share, all ten years** — stored as a flat 55–58 %,
   actually 60.5–77.4 %. The stored series appears to have been reasoned from
   *all solid fossil fuels including lignite*, which is domestic and carries
   no import bill. The module is hard-coal only.
4. **Gas import-dependency shape** — stored as a smooth monotone ramp
   74 → 90 %. The real `nrg_ind_id` indicator is not monotone: it spikes to
   97.6 % in 2022 and falls to 85.0 % in 2024, because it moves with stock
   changes as well as with trade. *The invented smoothness suppressed the
   single most policy-relevant feature of the series.* This is the finding
   with the clearest methodological lesson: an interpolated series between two
   remembered endpoints will always look plausible and will always be wrong in
   exactly the places that matter.
5. **Russia's share of extra-EU hard-coal imports, 2021** — stored 45 % with a
   40–50 % range; `nrg_ti_sff` gives **52.5 %**, outside the stated range.
6. **Norway's share of extra-EU gas imports, 2021** — stored 23 %, actually
   17.0 %.
7. **2022 gas price** — stored €1,250m/bcm; the World Bank annual average
   converts to €1,379m/bcm, a 10 % understatement.

**REVISION (2–5 %)**

8. Oil demand sat 2–3 % low across most of the window.
9. US share of extra-EU gas imports 2024 — stored 20 %, actually 16.7 %.
10. Gas demand 2017–2018 — 3.7 % and 2.1 % high.

**CONFIRMED (≤ 2 %)**

11. GDP activity index, all ten years (within 0.9 index points).
12. Russian share of extra-EU gas imports 2021 — stored 45 %, actually 44.1 %.
13. Russian share of extra-EU crude-oil imports 2021 — stored 27 %, actually
    25.3 % (inside the stored 25–29 % range).
14. Oil demand 2022–2023, gas demand 2019–2024, coal demand 2019–2023.
15. 2019 gas price — stored €150m/bcm, actually €154. Cross-checked two ways:
    the World Bank "Natural gas, Europe" 2019 average of 4.80 $/mmBtu converts
    to 14.63 €/MWh, and the ACER quarterly TTF averages for 2019 (18.40 /
    13.10 / 11.80 / 15.20 €/MWh) average to the same 14.63.
16. 2019 and 2022 oil prices — stored €420 and €700/t, actually €419.3 and
    €694.9.

**Asserted where the truth is small but non-zero**

17. The 2024 Russian coal share was asserted as exactly **0** on the strength
    of the embargo. It is **0.4 %**. A small number, but asserting zero from a
    legal instrument rather than from the data is the same class of error as
    inventing a trend.

**Stale rather than wrong**

18. The EEA projection aggregates quoted for the forward leg (WEM −43 %, WAM
    −49 % vs 1990) were correct for EEA Report 11/2024, which the module
    cited. The **November 2025 EEA indicator update gives −47 % and −54 %
    net**. The per-fuel 2030 levels were inferred against the older, weaker
    aggregates and have **not** been re-inferred, so they understate 2030
    progress on both projected pathways. Recorded in the data file, the caveat
    box and next to the chart.

**Method changes made**

- Border prices are now published annual averages, not recalled levels, and
  each `lo`/`hi` band is the **within-year monthly spread** (gas, oil) or the
  spread between the two published steam-coal markers (coal) — a range a
  reader can check, rather than an expression of the compiler's confidence.
  `model.ts` was updated to describe the band correctly: it is a
  cheapest-month/dearest-month bracket, not a confidence interval.
- The third price scenario was labelled "Recent forward" and sourced to a
  "forward-curve level at compile" that no one could check. It is now the
  **2025 observed annual average**, relabelled accordingly.
- Coal moves to the World Bank Australian and South African markers, with the
  API 2 proxy gap stated: API 2 (CIF ARA) is the right EU marker but is a
  proprietary Argus/McCloskey index with no free authoritative annual average,
  and it ran above both markers used here in 2022 — so the crisis-year coal
  bill is if anything understated.
- The epistemic label is no longer applied to the module as a whole. The
  backward leg is live-sourced; the forward leg is still AI-compiled; the
  page, the caveat box and both file headers now say which is which.

## M·46 — Clean-Tech Manufacturing Scoreboard

The module's own uncertainty discipline held up well: almost every industry
figure already carried `uncertain: true` and a source label, and the findings
concentrate on the legal benchmarks, which were the one part asserted without
a flag.

**WRONG**

1. **Locator.** Both NZIA benchmarks were attributed to **Article 1**.
   Article 1 is the subject-matter article and states no benchmark at all.
   They are in **Article 5(1)(a) and 5(1)(b)**.
2. **Quote.** The 2040 benchmark was paraphrased as "around 15 % of world
   production". The enacting term says "15 %" with no hedge, and closes with
   an exception the paraphrase dropped entirely: the benchmark does not apply
   "except where the increased Union manufacturing capacity would be
   significantly higher than the Union's deployment needs … to achieve the
   Union's 2040 climate and energy targets".
3. **Heat-pump production.** The capacity note asserted "actual EU production
   ≈ 2.2 m units in 2023". That is the **2024 sales** figure wearing a
   production label — EHPA reports 2.8 m units sold across 14 European
   countries in 2023 falling 21 % to 2.2 m in 2024. Withdrawn and replaced
   with the sales series plus the JRC CETO two-thirds production ratio, which
   puts EU production of the order of 1.7–1.9 m units. Recorded alongside:
   EHPA country coverage varies between editions (14, 19 and 21 countries all
   appear), so its totals are not comparable across releases.

**Scope finding (no number wrong, reading at risk)**

4. Recital 18 states the 40 % figure as an **overall** benchmark "for net-zero
   technologies considered as a whole", while Art. 5(1)(a) ties it to "the
   corresponding technologies". This module's entire layout is one
   distance-to-benchmark bar *per technology*, so the difference is load
   bearing: on the recital's reading, a shortfall in one technology may be
   offset by a surplus in another. The per-technology reading is kept but is
   now stated *as a reading*, and the page says plainly that no single bar is
   a compliance test.

**CONFIRMED**

5. EU-27 wind installations 2024 — "≈ 13 GW" confirmed and made exact at
   **12.9 GW** (WindEurope), with the Europe-wide 16.4 GW distinguished from
   it and the outlook added (140 GW EU-27 over 2025–2030, ~23 GW/yr, against
   ~32 GW/yr implied by the 425 GW consistent with the 42.5 % renewables
   target).
6. Heat-pump bottleneck prose (−6.5 % in 2023, roughly a further fifth in
   2024).

## M·47 — Competitiveness Claims Register

The easiest of the eight to check, because it had already done the hard
honest thing: it asserts **no verbatim quotes at all**, marks every claim as a
paraphrase, and listed by name the three locators it was least sure of. All
three were checked and **none was wrong**.

**Locators resolved (all CONFIRMED)**

1. Automotive action plan = **COM(2025) 95 final, 5.3.2025**, confirmed from
   the Communication PDF header. Source now points at the CELEX record rather
   than a topic landing page.
2. Budapest Declaration adopted **8 November 2024**, Council document
   **ST 15518/2024**. URL now points at the declaration text, not the meeting
   index page.
3. ESRS inventory — **over 1,100 data points** in EFRAG IG 3 (final list, May
   2024), down from 1,178 in the October 2023 draft. The stored "roughly
   1,100" is confirmed.

**REVISION**

4. **Draghi electricity-price comparison.** Stored as "≈ €0.18–0.20/kWh
   (2023) … a ratio of about 2.5–3". Live Eurostat `nrg_pc_205` gives EU-27
   2023 at **€0.175/kWh** (band ID, ex-tax) and **€0.156/kWh** (band IE), so
   the top of the stored range is not reached. Against the US EIA industrial
   average of ~$0.08/kWh at the ECB 2023 rate, the ex-tax ratio is **2.1–2.3**;
   2.5–3 only appears if a tax-inclusive EU figure is set against a US average
   that is not tax-inclusive, which is not like for like. The proposition
   itself says "two to three times", so **the SUPPORTED verdict stands** — the
   basis now says which comparison it rests on. Recorded because it changes
   how the claim reads today: EU industrial prices have since fallen to
   €0.143/kWh (2024) and €0.137/kWh (2025).
5. **Decoupling.** GDP growth 1990–2023 was given as "roughly two thirds" /
   "mid-60s %". The EEA's own paired statement is **GDP +70 %** against net
   emissions −37 %. Corrected upward — this *strengthens* the for-ambition
   claim. Noted that EEA publications quote both 36 % and 37 % for the
   emissions leg depending on vintage, so the pairing is taken from a single
   source statement rather than assembled from two.

**CONFIRMED in every particular**

6. The **Kotz et al. retraction**, which was the single most retraction-prone
   claim in the register and turned out to be exactly right: "The economic
   commitment of climate change" (Nature, April 2024) was retracted by its
   authors on **3 December 2025** after the result proved sensitive to
   removing Uzbekistan, whose 1995–1999 economic data were inaccurate, with
   spatial auto-correlation also affecting the uncertainty ranges. Revised
   central estimate **17 %**, range widening from 11–29 % to 6–31 %. The
   UNSUPPORTED verdict on "double-digit magnitudes are established" stands,
   and the module's own `proves` line already made the right point: *the
   retraction removed a number, not the phenomenon.*

## M·48 — CRM × 2040 Pathway Stress Test

**WRONG — fabricated quote fragment**

1. The single-supplier benchmark carried **"not more than 65 %"** in a field
   documented as "verbatim fragment from Art. 5(1)". **That string does not
   occur in Reg. (EU) 2024/1252.** The act reads "no third country accounts
   for more than 65 % of the Union's annual consumption of such a strategic
   raw material". Short fragments have been dropped entirely in favour of
   whole quoted provisions, which cannot drift the same way. This is the
   clearest instance in the eight modules of the failure mode the repository's
   quote rule exists to prevent: a fragment that reads like the law, is
   labelled as the law, and is not the law.

**Dropped qualifiers**

2. The 10 % extraction benchmark applies "to the extent possible in light of
   the Union's reserves". Omitting this made the softest of the three capacity
   benchmarks look as firm as the other two. Restored.
3. The 25 % recycling benchmark has a second limb the paraphrase lost:
   capacity must also be "capable of recycling significantly increasing
   amounts of each strategic raw material from waste". The aggregate
   percentage alone does not discharge it. Restored.

**Scope finding**

4. Same shape as the M·46 finding. The Art. 5(1) chapeau asks that Union
   capacity "approaches or reaches" the benchmarks **"overall"**; only the
   single-supplier cap in point (b) is expressed per material. The module
   draws a per-material bar for all four. Bars kept, chapeau now stored
   verbatim, page states that a material short of a bar is not by itself a
   compliance finding.

**CONFIRMED, locator added**

5. The Batteries Regulation recovery targets quoted in the recycling narrative
   are exactly right — **Reg. (EU) 2023/1542, Annex XII, Part C**: 50 %
   lithium and 90 % cobalt, copper and nickel by 31 December 2027; 80 %
   lithium and 95 % cobalt, copper and nickel by 31 December 2031. The module
   had stated the numbers with no locator; it now carries one.

## M·49 — CBAM & Leakage Watch

**CONFIRMED, exactly, all nine values**

1. The free-allocation phase-down is verified verbatim against the
   consolidated ETS Directive (CELEX 02003L0087, Art. 10a(1a)): the CBAM
   factor "shall be equal to 97,5 % in 2026, 95 % in 2027, 90 % in 2028,
   77,5 % in 2029, 51,5 % in 2030, 39 % in 2031, 26,5 % in 2032 and 14 % in
   2033. From 2034, no CBAM factor shall apply." Every one of the nine stored
   rows matches. The header described this block as "verbatim percentages from
   the Directive, not estimates", and it is — the one block in the eight
   modules whose self-description was exactly accurate.

**Gap closed**

2. The event ledger carried the February 2025 Omnibus I proposal with "final
   adopted instrument number pending verification". The instrument is
   **Regulation (EU) 2025/2083** of 8 October 2025, published in the OJ on
   17 October 2025, in force from 20 October 2025, setting a single mass-based
   de minimis threshold of **50 tonnes** applying cumulatively across iron and
   steel, aluminium, fertilisers and cement, and not applying to electricity
   or hydrogen imports. This matters beyond a citation tidy-up: **the scope
   register and the definitive-regime narrative in this module describe a
   regime that has since been amended**, and the ledger now says so.

## M·50 — Grid & Interconnection Security Ledger

**WRONG**

1. Three of 27 member-state interconnection ratios did not match Table 2 of
   COM(2017) 718: **Czechia 17 → 19 %**, **Slovakia 61 → 43 %**,
   **Luxembourg 245 → 109 %**. Slovakia's 61 % is close to the table's
   expected-2020 value of 59 %, so the likely mechanism is drift between the
   two columns; Luxembourg's 245 % corresponds to nothing in the table.
2. The distribution-grid investment breakdown was wrong **in form**: stored as
   "≈ €400 bn in distribution grids (incl. ≈ €170 bn for digitalisation)". The
   Grid Action Plan gives a **range** and attributes it to industry, not the
   Commission — "Industry estimates around EUR 375-425 billion of investment
   in distribution grids is necessary by 2030". Midpoint replaced by the
   published range, attribution corrected, and the €170 bn digitalisation
   split — which could not be found in either Communication — **withdrawn**
   rather than left standing.

**REVISION**

3. The 2030 target headline read "15 % electricity interconnection by 2030".
   The European Council endorsed a target of **at least 15 %** (EUCO 169/14).

**CONFIRMED**

4. The other 24 member-state ratios, exactly.
5. All three urgency thresholds, previously stored at "medium uncertainty,
   pending verification", now quoted verbatim from COM(2017) 718 §4.2: the
   2 €/MWh price differential; nominal interconnector capacity "below 30% of
   their peak load"; and likewise "below 30% of installed renewable generation
   capacity".
6. The €584 bn figure, verbatim from COM(2023) 757 §1.
7. The legal-nature note — that the 15 % objective binds no Member State and
   enters Union law only as an NECP reporting dimension.

**Data added rather than corrected**

8. Table 2 publishes a second column — expected interconnection level in 2020
   — that the module had left unused. It is real published data from the same
   locator and is now carried in every row note, so a reader sees direction of
   travel rather than a single 2017 snapshot.

## M·51 — Climate Investment vs Rearmament

**WRONG**

1. **EU defence spending.** Stored "≈ €326bn in 2024 (≈ 1.9 % of EU GDP)".
   EDA Defence Data 2024-2025 (2 September 2025) reports **€343bn** in 2024, a
   19 % rise on 2023, at 1.9 % of GDP. The *percentage* was right and the €
   figure it was derived from was ~5 % low. Added alongside, because it
   changes the picture the module is about: EDA expects **€381bn in 2025 at
   2.1 % of GDP**, the first time EU-wide spending passes 2 % in the series.
2. **The Hague commitment wording.** Labelled "3.5 % of GDP core defence +
   1.5 % defence- and security-related", with the locator marked "quote
   pending verification". Verified against Declaration paragraph 2, and the
   label was losing an asymmetry that matters: the core-defence leg is a
   **floor** — "Allies will allocate at least 3.5% of GDP annually …" — while
   the second leg is a **ceiling** — "Allies will account for up to 1.5% of
   GDP annually …". The headline 5 % is not a sum of two equally binding
   parts. Also, the stored NATO URL was stale.

**REVISION**

3. EU-27 nominal GDP 2024 stored as €17,900bn with the note "pending
   verification of the rounding". Live Eurostat gives **€18,043bn**, ~0.8 %
   higher. Corrected; the 2025 figure (€18,796bn) recorded for whenever the
   module is rebased.

**CONFIRMED**

4. The 1.9 %-of-GDP defence figure itself; that the Hague commitment binds 23
   of 27 EU Member States (Austria, Ireland, Malta, Cyprus being outside
   NATO); and the module's refusal to compute a € gap from any row other than
   I4CE, which is the only source publishing need and actual investment on one
   scope.

## M·52 — Trade-Partner Climate & Article 6 Tracker

All three checked NDC entries **CONFIRMED**; two `uncertain` flags closed.

1. **China** — "formal registry submission around COP30 could not be verified
   at compile" and `uncertain: true`. It can be verified: announced by Xi
   Jinping at the UN climate summit on **24 September 2025** and formally
   submitted to the UNFCCC on **3 November 2025**, ahead of COP30 in Belém.
2. **United Kingdom** — 81 % below 1990 by 2035, announced at COP29 and
   submitted **30 January 2025** with an ICTU annex, all sectors and all
   gases. Confirmed in every particular.
3. **United States** — confirmed as stored, including the two details most
   likely to be wrong: the December 2024 NDC figure of 61–66 % below 2005 by
   2035, and the withdrawal mechanics (executive order 20 January 2025,
   withdrawal effective **27 January 2026** under Article 28, one year after
   notification).

---

## What this pass deliberately did NOT cover

Listed so the next pass does not mistake silence for clearance.

- **M·45**: the 2030 per-fuel demand levels and the assumed 2030 import
  shares. These remain AI-inferred from GHG aggregates, are now known to have
  been inferred against superseded EEA figures, and are the module's open work
  item.
- **M·46**: all COMEXT-derived import-penetration and supplier-share figures,
  which remain published summaries rather than a committed CN-code pipeline;
  and the solar, battery, electrolyser and grid capacity ranges, which are
  industry-reported and stay flagged uncertain.
- **M·47**: **no verbatim quote has been extracted for any claim.** Every
  `claim` field is still an explicit paraphrase of a named institutional
  source. This remains the blocker on publication. The claim-selection rule
  and the 7-against / 7-for structural balance were not re-audited.
- **M·48**: the material-intensity coefficient ranges, the stylised deployment
  rates, and the current EU extraction / processing / recycling and
  top-supplier shares — the bulk of the module. Checking them needs the JRC
  foresight study, the SCRREEN factsheets and the RMIS material profiles read
  directly.
- **M·49**: the Annex I scope register transcription; the downstream boundary
  rows, which are claims of *absence* from Annex I and need a different kind
  of check; and the remaining event-ledger entries still marked unverified.
  `IMPORT_SERIES` remains illustrative AI-compiled index levels, not a COMEXT
  extraction — the module was already explicit about this, and its refusal to
  show 2026 monthly values is still the right call.
- **M·50**: the incident ledger, whose attribution entries remain as recalled
  at compile time with several court-outcome details flagged unverified; and
  the pace-ratio inputs, whose realised-investment leg still rests on an
  unverified TSO assumption of €10–15 bn/yr — the module already calls that
  its weakest number.
- **M·51**: the need-side rows (COM(2024) 63 and its impact assessment, I4CE,
  Draghi) and the climate-side ledger rows (MFF 30 % target, RRF, ETS
  revenues, Social Climate Fund, Industrial Decarbonisation Bank).
- **M·52**: carbon-price levels and coverage shares for every partner; the
  Article 6 agreement and volume columns; and the CBAM and linkage columns
  beyond the three partners checked.

## Not corrected, and why

- **M·45 forward leg.** Re-inferring the 2030 per-fuel levels against the
  current EEA aggregates would mean inventing a second set of numbers on the
  same weak basis. The bias is documented in three places instead, with its
  direction stated (it understates 2030 progress).
- **M·45 coal border price.** API 2 (CIF ARA) is the correct marker and has no
  free authoritative annual average. Rather than keep an unverifiable figure,
  the two published World Bank steam-coal markers are used with the proxy gap
  and its direction stated.
- **M·46 / M·48 per-technology and per-material bars.** Both could be argued
  to need restructuring to an aggregate view. That is a design decision for
  the Secretariat, not a fact-check correction; the ambiguity is surfaced in
  the UI instead.

## Cross-cutting lessons for the next compile

1. **Check the "host is blocked" premise before letting it license a
   compile-from-memory.** Six modules inherited a false premise, and it is
   visible in the defect pattern: the modules with the most invented figures
   are exactly the ones that believed they could not pull.
2. **A 202 with a challenge page is a silent failure.** EUR-Lex returns HTTP
   202 and a body that a naive fetcher records as success. Any fetcher in this
   repository should treat a short body or a challenge marker as fatal, per
   ground rule 6.
3. **Interpolated series are the highest-risk artefact in these modules.**
   Both invented series found here (gas import dependency, coal import share)
   were smooth, plausible, and wrong precisely at the policy-relevant
   inflections. If endpoints are remembered and the middle is filled in, the
   result should be stored as two endpoints, not as a series.
4. **Short quote fragments drift; whole provisions do not.** The one
   fabricated quote in eight modules was a five-word fragment. Quoting the
   whole provision costs a line of UI and removes the failure mode.
5. **Recital and enacting terms disagree about scope more often than about
   numbers.** Both NZIA and CRMA state a benchmark that a recital frames as an
   aggregate and an article frames per unit. Any distance-to-benchmark module
   has to pick a reading and say it picked one.

## Provenance of this pass

- Eurostat dissemination API, JSON-stat: `nrg_cb_gas`, `nrg_cb_oil`,
  `nrg_cb_sff`, `nrg_ind_id`, `nrg_ti_gas`, `nrg_ti_oil`, `nrg_ti_sff`,
  `nama_10_gdp`, `demo_gind`, `nrg_pc_205`.
- EU Publications Office Cellar (`Accept: application/xhtml+xml`): CELEX
  32024R1735, 32024R1252, 32023R1542, 02003L0087, 52023DC0757, 52017DC0718.
- World Bank Commodity Price Data (Pink Sheet), annual and monthly nominal
  series; ECB euro reference exchange rates (annual USD/EUR).
- Named primary publications: EEA indicator update (Nov 2025), WindEurope
  2024 statistics, EHPA March 2025 press release, EFRAG IG 3, EDA Defence Data
  2024-2025, NATO Hague Summit Declaration, UNFCCC NDC submissions, Nature
  retraction note for Kotz et al.

Working notes stayed in the session scratchpad; this file is the distilled
audit. Corrections landed in eight commits, one per module, each naming its
own findings.
