/**
 * PACKAGE_POSITIONS — what the 17 July 2026 Commission package actually
 * proposes, models and admits (side B of the advice-conflicts comparison).
 *
 * AI-consolidated (Sonnet agent, WP2 of the "Advice conflicts" submodule),
 * pending Secretariat verification. Every quote and number below is taken
 * from an in-repo extraction that itself carries a document + page locator
 * back to the Commission's 17 July 2026 package — the originals (the
 * Directive proposal, the 958-page impact assessment, the Action Plan) are
 * not stored in this repository.
 *
 * Source documents (side B, cited via `docId`):
 *   - COM(2026) 616 — ETS Directive proposal ('com-616')
 *   - SWD(2026) 616 — impact assessment, 5 parts / 958 pp
 *     ('swd-616-p1' main report, 'swd-616-p2' Annexes 1–7, 'swd-616-p3'
 *     Annexes 8–11, 'swd-616-p4' Annexes 12–14, 'swd-616-p5' Annex 15
 *     evaluation)
 *   - COM(2026) 595 — Electrification Action Plan ('eap')
 *   - IP/26/1596 — press release ('pr'); QANDA/26/1598 — Q&A ('qa')
 *
 * In-repo extractions used (each `extractedFrom` points into one of these):
 *   - beta/modules/ets-review/reform/page.tsx — the CHANGES array (10
 *     proposed changes, quoted with a `links` source chip), the numbers
 *     section (CAP_YEARS/CAP_SERIES, CDR_2040), the PILLARS/HEADROOM
 *     flexibility-package summary, and the 23-entry REGISTER of
 *     uncertainties/ambiguities, each carrying a `src` document locator.
 *   - beta/modules/impact-assessment/data.ts — IA_FINDINGS (id, part,
 *     pdfPages, quote, keyNumbers) drawn from all 5 SWD(2026) 616 parts.
 *   - ets-review/electrification-46-percent.md — the Electrification Action
 *     Plan analysis (46% target definition, Q4 2026 legislation intent,
 *     Pillar 1 price reform / COM(2026) 600, the four demand-side measure
 *     families).
 *   - beta/modules/ets-review/page.tsx, ets-review/README.md — headline
 *     cross-checks (hub stats, milestone callouts).
 *
 * See work-packages/WP2-package-positions.md for the brief and
 * WP0-overview.md for submodule-wide conventions (no invented numbers or
 * quotes; quotes near-verbatim ≤ ~60 words; British English).
 */

import type { PackagePosition } from './types';

export const PACKAGE_POSITIONS: PackagePosition[] = [
  /* ------------------------------------------------------- cap-ambition */
  {
    id: 'pp-ambition-85-87-contested',
    docId: 'pr',
    theme: 'cap-ambition',
    title: '2040 ambition claimed at 85–87%, contested at ~80%',
    position:
      'The Commission presents the package as delivering an 85% domestic reduction by 2040 (−90% net once credits and removals are counted), with its own communications giving a wider 85–87% range for the overall reduction achieved. Climact, an independent analysis, estimates the tabled text as drafted delivers only around 80%. The proposal has just entered trialogue between Parliament and Council, so both the architecture (cap, removals, credits) and the resulting percentage may still move before adoption.',
    quote:
      'The Commission estimates the package delivers an 85–87% reduction by 2040; Climact estimates the tabled text delivers ~80%. The proposal is entering trialogue, so the architecture and figures may still shift.',
    sourceRef: 'Removals summary · secondary coverage',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#ambition-contested',
  },
  {
    id: 'pp-cap-trajectory-model-range',
    docId: 'swd-616-p3',
    theme: 'cap-ambition',
    title: 'The cap trajectory depends on which model is used',
    position:
      'The impact assessment models three cap trajectories (CAP1/CAP2/CAP3) for the 85% scenario using both PRIMES and POTEnCIA. The two models put the 2035 cap anywhere from 560 to 670 Mt for the same target, and the 2040 cap at 330 Mt (PRIMES) versus 375 Mt (POTEnCIA). The preferred policy option (PO2) is modelled with a 2040 cap of 310–340 Mt once municipal waste incineration is included — a genuine, acknowledged spread rather than a single fixed pathway.',
    quote:
      'PRIMES and POTEnCIA put the 2035 cap anywhere from 560 to 670 Mt for the same 85% target — "the intrinsic uncertainties involved in assessments on the longer-term technological future."',
    sourceRef: 'Annex 8 I, p11',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#cap-model-range',
  },
  {
    id: 'pp-lrf-backloading',
    docId: 'pr',
    theme: 'cap-ambition',
    title: 'LRF cut and back-loaded: 3.7% then 1.7%',
    position:
      'The Linear Reduction Factor is cut from the legal default of 4.3–4.4% to 3.7% for 2031–35, then further to 1.7% for 2036–40 — a two-step, more back-loaded path to the 85% domestic reduction by 2040. This lifts the 2040 cap to roughly 330 Mt, against roughly 69 Mt if the current LRF were left unchanged, making the ambition of the outer years of the decade materially dependent on decisions the package defers to the second half of Phase 5.',
    quote:
      'It updates the Linear Reduction Factor (LRF) of 3.7% for 2031-2035 and 1.7% for 2036-2040, making the trajectory more gradual.',
    sourceRef: 'Press release IP/26/1596',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#lrf',
  },
  {
    id: 'pp-msr-reform-design',
    docId: 'pr',
    theme: 'cap-ambition',
    title: 'MSR intake rate halved: 24% to 12%',
    position:
      'The Market Stability Reserve intake rate is halved from 24% to 12%, keeping more allowances in circulation for longer with the stated aim of reducing excessive price volatility. It is presented as complementary to an earlier April 2026 proposal to stop the automatic invalidation of allowances held in the reserve.',
    quote:
      'a reform of the Market Stability Reserve (MSR) to … maintain liquidity and reduce excessive price volatility.',
    sourceRef: 'Press release IP/26/1596',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#msr',
  },
  {
    id: 'pp-price-path-tnac-liquidity',
    docId: 'swd-616-p1',
    theme: 'cap-ambition',
    title: 'A monotonic price-path claim, and a liquidity ratio with a wide spread',
    position:
      'The impact assessment claims the reformed MSR (design MSR3, used in preferred options PO2/PO3) produces a monotonic, steadily rising EUA price path to 2040, in contrast to the static-parameter option (MSR1), which rises then dips before a late steep increase. The accompanying market-liquidity metric — the TNAC-to-emissions ratio — nonetheless spans a wide range across the period: PO1 0.29–0.68 (dipping to 0.29 in 2036), PO2 0.28–0.59, PO3 0.25–0.59, all described as "within an acceptable range" rather than tightly controlled.',
    quote:
      'For PO2 and PO3, the MSR3 design allows for a monotonic and steady increase in the price throughout the period, indicative of a healthy supply-demand balance on the market.',
    sourceRef: 'Part 1, p51–54',
    extractedFrom: 'beta/modules/impact-assessment/data.ts#msr-eua-price-index',
  },

  /* ------------------------------------------------------ carbon-budget */
  {
    id: 'pp-carbon-budget-2031-40',
    docId: 'swd-616-p1',
    theme: 'carbon-budget',
    title: 'Carbon budget 2031–40: 5,605–6,295 Mt across the modelled cap options',
    position:
      'Across the modelled cap trajectory options (CAP1–CAP3, PRIMES/POTEnCIA), the cumulative 2031–40 ETS carbon budget ranges from 5,605 to 6,295 Mt CO2 — substantially larger than the 4,436 Mt implied by the unchanged legal-default LRF. The 2030 cap is common to all options at 911 Mt; the range opens up through the decade as the two models diverge on the pace of the post-2035 tightening.',
    quote:
      'CAP2: Default modelled trajectory to 85%: it follows the 2031-2040 trajectory of GHGs currently under ETS towards the estimated cost-effective contribution of the EU ETS to a reduction of economy-wide net GHGs by 85% in 2040.',
    sourceRef: 'Part 1, p28–29',
    extractedFrom: 'beta/modules/impact-assessment/data.ts#cap-trajectories-2040',
  },

  /* ------------------------------------------------------------ removals */
  {
    id: 'pp-removals-250mt-on-top-of-cap',
    docId: 'pr',
    theme: 'removals',
    title: 'Article 9c: 250 Mt permanent removals added on top of the cap',
    position:
      'A new Article 9c raises the cap by 250 Mt (+10 Mt contingency) over 2031–40. The Commission auctions these additional allowances and uses the revenue to buy an equal tonnage of CRCF-certified EU BioCCS/DACCS through a central "Removals Authority" — not an emitter-to-supplier market. The mechanism sits on top of the cap and outside the LRF, i.e. it adds allowance headroom rather than displacing part of the emissions budget the LRF otherwise tightens.',
    quote:
      'The proposal also integrates permanent carbon removals into the EU ETS … additional flexibility for the hardest-to-abate sectors.',
    sourceRef: 'Art. 9c',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#removals',
  },
  {
    id: 'pp-removals-net-gross-ambiguity',
    docId: 'swd-616-p3',
    theme: 'removals',
    title: 'Net-vs-gross ambiguity in the removals design',
    position:
      'The netting design choice between removals-integration options CR2 and CR3 leaves the net objective ambiguous. Under CR2 the gross removals outcome is uncertain and effectively unlimited; CR3 sets a maximum level of removals but no minimum. In either design the net emissions figure can silently converge on the gross figure — i.e. the intended net-of-removals target can be missed without any rule being broken.',
    quote:
      'CR2 gross outcome is "uncertain and unlimited"; CR3 has "a maximum level of removals … but not a minimum," so the net can silently equal the gross and miss the target.',
    sourceRef: 'Annex 8 II, p29/53',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#net-vs-gross',
  },
  {
    id: 'pp-removals-revenue-driven-delivery',
    docId: 'com-616',
    theme: 'removals',
    title: 'Removal delivery is revenue-driven, not a firm 250 Mt commitment',
    position:
      'The 250 Mt is not a guaranteed delivered volume. The Commission auctions the allowances first and buys certified removals with whatever proceeds result, so the tonnage actually delivered tracks auction revenue against removal cost rather than a fixed physical target — which is precisely why the design carries a +10 Mt contingency buffer rather than a hard floor.',
    quote:
      'The programme is revenue-driven: the Commission auctions the 250 Mt and buys removals with the proceeds, so delivered tonnage depends on auction revenue vs removal cost (hence the +10 Mt contingency). It is not a hard commitment to 250 Mt delivered.',
    sourceRef: 'Removals summary · Art. 9c',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#removal-delivery',
  },
  {
    id: 'pp-removals-daccs-cost-uncertainty',
    docId: 'swd-616-p3',
    theme: 'removals',
    title: 'DACCS cost band €185–370/t, with reliable estimates only for BECCS',
    position:
      'The impact assessment models DACCS unit cost in 2040 at €185–370/t (average €278), against €160–192/t for BioCCS (average €176). The IA states that reliable cost estimates exist only for BECCS, deliberately withholds judgement on DACCS cost-competitiveness, and assumes BECCS cost equals BioCCS cost as a simplifying proxy. Separately, the technology cost data show BECCS becoming cost-competitive with the EUA price around 2036–38, while DACCS does not reach competitiveness within the 2031–40 period at all.',
    quote:
      '"Reliable cost estimates are only available for BECCS"; DACCS spans €185–370/t in 2040. The IA "tries to withhold judgement on cost-competitiveness" and assumes BECCS cost = BioCCS cost.',
    sourceRef: 'Annex 8 II, p37/46',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#cdr-cost',
  },
  {
    id: 'pp-removals-target-may-not-be-met',
    docId: 'swd-616-p1',
    theme: 'removals',
    title: 'The IA itself says the removal target "may simply not be met"',
    position:
      'Under policy option 3, the impact assessment admits explicitly that if removals fail to become cost-competitive with the ETS price — which, per its own DACCS cost modelling, is a real possibility within the 2031–40 period — the ETS will miss its net emissions objective. This is not a critics\' claim but the Commission\'s own risk assessment of its central removals-integration design.',
    quote:
      'as long as removals are not cost competitive … the EU ETS [misses] its net objective. The risk … is that the modelled assumptions would simply not be met.',
    sourceRef: 'Part 1, p30–31',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#removal-target',
  },

  /* --------------------------------------------- international-credits */
  {
    id: 'pp-credits-260mt-2036-40',
    docId: 'pr',
    theme: 'international-credits',
    title: 'International credits re-admitted: up to 2% of the cap, ~260 Mt 2036–40',
    position:
      'From 2036 the EU ETS may use up to 2% high-quality international credits — the ETS\'s share of the Climate Law\'s wider 5% international-flexibility allowance — amounting to roughly 260 Mt cumulative over 2036–40. Unlike the removals pillar, these credits are reflected inside the cap as proportional flexibility rather than added on top of it.',
    quote:
      'Up to 2% high-quality international credits will allow to finance decarbonisation projects abroad and provide breathing space in 2036-2040.',
    sourceRef: 'Press release IP/26/1596',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#credits',
  },
  {
    id: 'pp-credits-2033-review-condition',
    docId: 'com-616',
    theme: 'international-credits',
    title: 'Credits window is conditional on a 2033 availability review',
    position:
      'Access to the ~260 Mt of 2036–40 international credits is not unconditional. A 2033 review must first confirm that high-integrity, cost-effective credits are actually available at the volume assumed; the package builds this checkpoint into its own flexibility design rather than legislating the credits pathway as fixed.',
    quote:
      'The ~260 Mt of 2036–40 international credits is contingent: a 2033 review must find high-integrity, cost-effective credits available. If it fails, the 2036–40 LRF reverts to 2.7% (from 1.7%) to tighten the cap instead.',
    sourceRef: 'Removals summary · 2033 review',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#credits-2033-review',
  },
  {
    id: 'pp-credits-lrf-reversion-2.7',
    docId: 'com-616',
    theme: 'international-credits',
    title: 'If the 2033 review fails, the fallback tightens the cap (LRF reverts to 2.7%)',
    position:
      'The package\'s own fallback for a failed 2033 credits review is not the status quo but a tighter domestic cap: the 2036–40 LRF reverts from 1.7% to 2.7%, and the allowances that would have been set aside for credits are redirected to the Industrial Decarbonisation Bank instead. On the package\'s own design, therefore, failure of the international-credits pathway increases rather than decreases domestic ambition.',
    quote:
      'The ~260 Mt of international credits hinge on a 2033 availability review. If it fails, the 2036–40 LRF reverts to 2.7% (from 1.7%) and set-aside allowances go to the Industrial Decarbonisation Bank.',
    sourceRef: 'Removals summary · flexibility package',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#flexibility',
  },

  /* ------------------------------------------------------ pricing-scope */
  {
    id: 'pp-free-allocation-cbam-continuity',
    docId: 'pr',
    theme: 'pricing-scope',
    title: 'Free allocation continues beyond 2030; CBAM phase-out slowed to 2038',
    position:
      'Free allocation is kept past 2030 but tied more closely to demonstrated decarbonisation investment in Europe. For CBAM sectors specifically, the free-allocation phase-out is slowed and extended to 2038 (from 2034), and a separate benchmarks proposal raises industry free allocation by €6bn for 2026–30. The underlying leakage-protection calculation carries its own simplifying assumption: it holds refinery output constant over time, even though the impact assessment itself notes output is expected to decline in reality — a caveat that affects how tightly the leakage budget is actually calibrated.',
    quote:
      'Free allocation for companies will continue beyond 2030, and will be more closely linked to investments in decarbonisation in Europe.',
    sourceRef: 'Press release IP/26/1596',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#free-alloc',
  },
  {
    id: 'pp-20mw-threshold-basis',
    docId: 'swd-616-p4',
    theme: 'pricing-scope',
    title: '20 MW threshold kept, on a headline number built from two countries',
    position:
      'The package keeps the existing 20 MW capacity threshold for stationary installations rather than lowering it, using a modelled trade-off — up to 28 MtCO2e / 94,428 installations if the threshold were removed entirely — to justify that choice. That headline figure rests on French and Polish emissions-registry data only, applied as a representative curve for the whole EU, and the IA notes the result is driven primarily by the Polish dataset alone.',
    quote:
      'The headline "up to 28 MtCO₂e / 94,428 installations" comes from French + Polish registries only, "applied as a representative curve for the entire EU" and "driven primarily by the Polish dataset."',
    sourceRef: 'Annex 12, p62/68',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#mw-threshold',
  },
  {
    id: 'pp-aviation-scope-extension',
    docId: 'swd-616-p3',
    theme: 'pricing-scope',
    title: 'Aviation scope widened to ≤5,000 km departing flights from 2029, +148 Mt cap addition',
    position:
      'Aviation scope is extended to flights departing the EEA to third countries within 5,000 km of the Union\'s centre, from 2029 (bringing in destinations such as Istanbul and Dubai; excluding the US, China and the Far East). Business and private jets are also brought in via a single 10,000 tCO2/yr emissions threshold applied to all operator types. The associated 2027 cap addition for incoming/outgoing international aviation is +148 Mt — a PRIMES-modelled estimate the impact assessment itself describes as uncertain.',
    quote:
      'The +148 Mt added for incoming/outgoing international aviation in 2027 rests on a PRIMES estimate the IA calls "uncertain, but it gives an indication."',
    sourceRef: 'Annex 8 I, p8',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#aviation-cap',
  },
  {
    id: 'pp-aviation-corsia-revert-2032',
    docId: 'qa',
    theme: 'pricing-scope',
    title: 'Aviation scope can revert in 2032, contingent on a CORSIA review',
    position:
      'The 2029 aviation scope extension is provisional rather than final: a 2032 review of the international CORSIA offsetting scheme can revert the EU ETS\'s departing-flight scope back to intra-EEA only if CORSIA is judged "ambitious, efficient and successful," or widen the scope further if it is not. Either outcome leaves the post-2029 aviation architecture conditional on a decision the package defers to the following decade.',
    quote:
      'The extension to departing flights (≤5,000 km, from 2029) is provisional: a 2032 review of CORSIA can revert the scope to intra-EEA if CORSIA is judged "ambitious, efficient and successful", or widen it if not.',
    sourceRef: 'Q&A · aviation coverage',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#aviation-scope-revert',
  },
  {
    id: 'pp-maritime-scope-extension',
    docId: 'swd-616-p3',
    theme: 'pricing-scope',
    title: 'Maritime scope extended toward smaller vessels (~400–5,000 GT)',
    position:
      'Maritime scope is extended toward smaller vessels (roughly 400–5,000 GT), with the cap raised and anti-evasion safeguards added. The impact assessment models this extension (measure MSS2) as cutting maritime GHG emissions a further 24.5% by 2040 and 70.4% by 2050 relative to the narrower-scope baseline (PO1) — cumulatively −124.3 Mt (−28.3%) over 2030–50 — at an average shipping-cost increase of 5.1% across 2030–50 (+€36.1bn cumulative), while lifting the renewable-fuel share of smaller-vessel energy demand to 77% by 2050 versus 26% under the baseline.',
    quote:
      'Total shipping cost increases from policy measure MSS2 were estimated at 5.1% on average during the period 2030-2050, compared to the default policy scenario.',
    sourceRef: 'Part 3, p311–313',
    extractedFrom: 'beta/modules/impact-assessment/data.ts#maritime-mss2-extension',
  },
  {
    id: 'pp-saf-reserve-smap-pots',
    docId: 'swd-616-p1',
    theme: 'pricing-scope',
    title: 'SAF reserve and maritime SMAP: capped support pots against a large price gap',
    position:
      'The SAF reserve for aviation is grown from 20 M to roughly 110 M allowances (~€9bn) and extended to 2040, run book-and-claim with support tiered to fuel quality: 95% of the price gap for e-SAF/RFNBOs, 70% for advanced biofuels, 50% for other ReFuelEU-eligible SAF. A new maritime mechanism, SMAP, is sized at roughly 46 M EUAs (an RFNBO-focused tranche of 26 M plus a further SAF-like-share tranche), alongside 50% of maritime ETS revenue recycled to the sector. Both are fixed pots against a very large cost gap — SAF abatement runs $600–800/t versus offsets at $10–40/t — so uptake still depends on the separate ReFuelEU/FuelEU blending mandates being met, not on the ETS support alone.',
    quote:
      'The SAF reserve (~110 M allowances, ~€9bn to 2040) and maritime SMAP (~46 M EUAs) are fixed pots covering a fixed share of the price gap. With SAF abatement at $600–800/t vs offsets $10–40/t, uptake still assumes the ReFuelEU/FuelEU mandates are met.',
    sourceRef: 'Part 1, p40 · coverage',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#green-fuel-pot',
  },
  {
    id: 'pp-waste-incineration-inclusion',
    docId: 'swd-616-p3',
    theme: 'pricing-scope',
    title: 'Waste incineration brought into the ETS, on data the IA calls "complex to estimate"',
    position:
      'Municipal waste incineration — and, in the widest policy option, hazardous waste and landfill as well — is gradually pulled into the ETS. The impact assessment scopes cap additions of roughly +41.5 Mt (municipal, EU27) to +42.2 Mt (EEA), +10.7 Mt (hazardous), and around 65–82 Mt for landfill depending on definitional choice. The IA itself flags the underlying data as weak: municipal, hazardous and landfill emissions estimates are built with "a buffer for underestimation" because of limited, non-harmonised, verified measurement data across the sector.',
    quote:
      'Municipal, hazardous and landfill caps are built on "a buffer for underestimation" and "limited availability of measurement-based data … constraints on harmonised, robust and verified data."',
    sourceRef: 'Annex 8 I, p18',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#waste-emissions',
  },

  /* -------------------------------------------------- investment-revenue */
  {
    id: 'pp-idb-100bn',
    docId: 'pr',
    theme: 'investment-revenue',
    title: 'Industrial Decarbonisation Bank: €100bn, modelled at €60/t and "illustrative"',
    position:
      'A new €100bn Industrial Decarbonisation Bank channels ETS revenue into industrial decarbonisation at scale, structured as ten annual €10bn auction rounds, with an ETS Investment Booster running before 2030 as its first phase. The impact assessment models roughly 1,630 Mt of cumulative abatement over ten years at a weighted average awarded support of €60/tCO2, with a private-investment leverage effect ranging 5–75% (weighted average 45%). The IA itself calls this abatement figure "illustrative," noting it depends on the final IDB design, demand for low-carbon products, project delivery risk, and an assumed ETS price that is itself drawn from separate 2040 climate-target modelling.',
    quote:
      'The Industrial Decarbonisation Bank will have €100bn funding going towards industrial decarbonisation across Europe at scale.',
    sourceRef: 'Press release IP/26/1596',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#idb',
  },
  {
    id: 'pp-revenue-earmarking-50pct',
    docId: 'pr',
    theme: 'investment-revenue',
    title: 'Member States must earmark 50% of national ETS revenue',
    position:
      'Member States will be required to spend 50% of their national ETS revenues on investments that decarbonise ETS sectors, on top of the more than €100bn of IDB investment envisaged before 2030 — framed by the Commission as ensuring contributions by industry flow back to industry.',
    quote:
      'Member States will be required to spend 50% of their national ETS revenues on investments to decarbonise ETS sectors.',
    sourceRef: 'Press release IP/26/1596',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#earmarking',
  },
  {
    id: 'pp-gem-e3-macro-results',
    docId: 'swd-616-p1',
    theme: 'investment-revenue',
    title: 'GEM-E3 macro modelling: near-neutral GDP, small mixed employment effects',
    position:
      'The Commission\'s GEM-E3 macroeconomic modelling finds the reform close to neutral at the whole-economy level: 2040 GDP change versus baseline ranges from about 0.00% to +0.08% across policy-option variants (also confirmed at the sectoral level in the separate carbon-leakage modelling in Annex 12, Part 4, p49), sectoral (ETS) employment moves from +0.01% to −0.06%, and total private consumption shifts from −0.10% to +0.02%. The largest positive GDP results are driven mainly by revenue-recycling design choices (lump-sum household transfers) rather than by the carbon-price signal itself.',
    quote:
      'The GDP increase ranges from 0.00% under PO2_50 to 0.08% under PO3R, with the latter achieving the highest GDP level due to the combined effect of a lower carbon price and stronger household demand.',
    sourceRef: 'Part 1, p98',
    extractedFrom: 'beta/modules/impact-assessment/data.ts#gem-e3-macro-impacts',
  },

  /* ------------------------------------------------------- electrification */
  {
    id: 'pp-electrification-46pct-target',
    docId: 'eap',
    theme: 'electrification',
    title: 'Indicative 46% direct-electrification target by 2040',
    position:
      'The Electrification Action Plan sets an indicative target of a 46% electricity share of final energy consumption by 2040 — roughly double today\'s stalled ~23%. The target counts only direct electrification (electricity delivered to an end-use, e.g. a heat pump or an EV); it explicitly excludes indirect electrification via hydrogen, ammonia or e-fuels produced from renewable power, and excludes ambient/waste heat captured by heat pumps or district heat.',
    quote:
      "46% is a direct-electrification target — electricity's share of final energy consumption. Indirect electrification (hydrogen and e-fuels made from renewable power) is on top and adds roughly another 10–20 points of final energy in 2040 scenarios.",
    sourceRef: 'Bottom line',
    extractedFrom: 'ets-review/electrification-46-percent.md#bottom-line',
  },
  {
    id: 'pp-electrification-q4-2026-legislation',
    docId: 'eap',
    theme: 'electrification',
    title: '46% is indicative only for now; binding legislation intended Q4 2026',
    position:
      'The 46% figure is not yet binding law. The Commission intends to propose enshrining it in EU legislation via the post-2030 Energy Union package in Q4 2026, at which point it would replace the existing 32%-by-2030 electrification KPI. Until that legislation is adopted, the target is a policy intention rather than a legal obligation.',
    quote:
      'The target is indicative for now: the Commission intends to propose enshrining it in EU law via the post-2030 Energy Union package in Q4 2026, replacing the existing KPI of 32% by 2030.',
    sourceRef: 'Introduction',
    extractedFrom: 'ets-review/electrification-46-percent.md',
  },
  {
    id: 'pp-electrification-pillar1-price-reform',
    docId: 'eap',
    theme: 'electrification',
    title: 'Pillar 1: electricity-price reform, COM(2026) 600',
    position:
      'Pillar 1 of the Action Plan, set out in COM(2026) 600 ("future-proof electricity bills"), reforms electricity pricing directly: reforming network charges and taxes so electricity is not taxed above gas, via an Energy Taxation Directive fix, and targeting a KPI that caps the electricity-to-gas retail price ratio at ≤2.5 for households and ≤2 for industry by 2030. This is presented as the cheapest lever available for driving electrification uptake, ahead of subsidies or mandates.',
    quote:
      'It is the Action Plan\'s Pillar 1 ("future-proof electricity bills," COM(2026) 600): network-charge reform, an Energy Taxation Directive fix so electricity is not taxed above gas, and a KPI capping national ratios at ≤2.5 for households and ≤2 for industry by 2030.',
    sourceRef: 'Pillar 1',
    extractedFrom: 'ets-review/electrification-46-percent.md#5-the-demand-side-measures---what-they-are-and-what-they-fix',
  },
  {
    id: 'pp-electrification-demand-side-measures',
    docId: 'eap',
    theme: 'electrification',
    title: 'Four demand-side measure families alongside the carbon price',
    position:
      'The Action Plan pairs the 46% target with four demand-side measure families beyond the ETS/ETS2 carbon price itself: (1) electricity-price reform (Pillar 1, COM(2026) 600); (2) buildings — the EPBD-recast fossil-boiler phase-out, retrofit support, and Social Climate Fund financing for vulnerable households; (3) transport — CO2 fleet standards (Regulation (EU) 2023/851) and AFIR charging infrastructure; (4) industry — Carbon Contracts for Difference for electrified process heat and faster grid-connection reform. The stated logic is that a uniform carbon price is a blunt instrument, while these measures remove the specific non-price barrier each sector faces.',
    quote:
      'The carbon price is a blunt, universal signal; demand-side measures are scalpels that remove the specific non-price barrier in each sector — which is why a modest price plus targeted measures beats a very high price alone.',
    sourceRef: '§5, demand-side measures',
    extractedFrom: 'ets-review/electrification-46-percent.md#5-the-demand-side-measures---what-they-are-and-what-they-fix',
  },

  /* -------------------------------------------------------- governance */
  {
    id: 'pp-attribution-industrial-reductions',
    docId: 'swd-616-p5',
    theme: 'governance',
    title: 'Evaluation admission: past industrial reductions may not be the ETS at all',
    position:
      'The evaluation annex (Annex 15) admits that a substantial share of the ETS\'s headline industrial emissions reduction cannot be cleanly attributed to the carbon price. It finds the cuts were primarily driven by a decline in activity levels unrelated to the ETS — chiefly energy-crisis-era price shocks — rather than by the carbon signal itself, and states that decoupling emissions from output could not be demonstrated. This directly qualifies the ~50% stationary-installation reduction since 2005 that the same evaluation cites elsewhere as the ETS\'s delivery record.',
    quote:
      'The evaluation finds industrial cuts were "primarily driven by a decline in levels of activity … unrelated to the ETS" — energy-crisis prices, not the carbon price. Decoupling could not be shown.',
    sourceRef: 'Annex 15, p29',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#attribution-industrial',
  },
  {
    id: 'pp-msr-effect-not-isolable',
    docId: 'swd-616-p5',
    theme: 'governance',
    title: 'Evaluation admission: the MSR\'s own effect cannot be isolated',
    position:
      'The evaluation admits that recent EUA price rises are mainly explained by the increased Linear Reduction Factor, with the Market Stability Reserve itself having only a small effect, and that the MSR\'s individual effect on market confidence cannot be assessed because no clean pre-MSR (2014) baseline exists to test it against. This is a direct qualification of the confidence the package places in the proposed MSR intake-rate reform as a price-stabilising measure.',
    quote:
      'Price rises "mainly explained by the increased Linear Reduction Factor, with the MSR having only a small effect"; "the individual effect of the MSR on confidence cannot be assessed." No clean 2014 baseline exists.',
    sourceRef: 'Annex 15, p20/70',
    extractedFrom: 'beta/modules/ets-review/reform/page.tsx#msr-effect',
  },
];
