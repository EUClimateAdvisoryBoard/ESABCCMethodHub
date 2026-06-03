// ---------------------------------------------------------------------------
// Per-policy master-code assignments — AI-generated baseline.
//
// This file was regenerated from scratch by a fleet of analysis agents that
// read each policy's title, summary and (where shipped) full legal text and
// assigned codes from the master taxonomy (see `buildSeedSnapshot` in
// ./seed.ts for the catalog). EVERY assignment starts life tagged as an
// "AI tag" (`origin: 'ai'`). When a human reviews a policy in the Policy
// Navigator or the workspace and agrees with a tag, they "confirm" it, which
// promotes that (policy, code) pair to a human tag (`origin: 'human'`).
// Confirmations are persisted server-side (content_analysis_master_tag_status)
// and merged over this baseline at runtime — see master-tag-status.ts.
//
// This block is machine-generated: prefer re-running the tagging agents over a
// taxonomy snapshot + the policy corpus rather than hand-editing assignments.
// (Live full text is fetched from EUR-Lex where reachable; otherwise the
// shipped full_text / summary is used.)
//
// Regenerate with: node scripts/retag-policies.mjs prepare → tag → compile
// ---------------------------------------------------------------------------

/** Who put a tag on a policy: an AI agent, or a human who confirmed it. */
export type TagOrigin = 'ai' | 'human';

/** A single master-code assignment on a policy, with provenance. */
export interface PolicyTagAssignment {
  /** Master-code id from the seeded taxonomy (e.g. `code-ets`). */
  codeId: string;
  /** `'ai'` for the generated baseline; `'human'` once confirmed. */
  origin: TagOrigin;
  /** Model confidence in [0, 1] for AI tags. */
  confidence?: number;
  /** One-line, evidence-grounded justification from the tagging agent. */
  rationale?: string;
}

/** Keys are Policy.id values from `@/data/policies`. Values are the
 *  AI-generated tag assignments for that policy (all `origin: 'ai'`). */
export const POLICY_TAG_ASSIGNMENTS: Record<string, PolicyTagAssignment[]> = {
  // European Climate Law
  'eu-climate-law': [
    { codeId: 'code-gov-climatelaw', origin: 'ai', confidence: 0.99, rationale: 'This IS the European Climate Law (Reg. 2021/1119), establishing the governance framework for EU climate policy.' },
    { codeId: 'code-gov-necps', origin: 'ai', confidence: 0.85, rationale: 'Art. 7 requires consistency of national measures identified via NECPs and long-term strategies in Reg. 2018/1999.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.9, rationale: 'Arts. 6-7 create a 5-year assessment cycle by the Commission for tracking Union and Member State climate progress.' },
    { codeId: 'code-sci-esabcc', origin: 'ai', confidence: 0.97, rationale: 'Art. 10 establishes the European Scientific Advisory Board on Climate Change (ESABCC) as an independent advisory body.' },
    { codeId: 'code-target', origin: 'ai', confidence: 0.98, rationale: 'The law is the overarching framework establishing all EU climate targets (2030, 2040, 2050) in binding legislation.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.99, rationale: 'Art. 4 sets binding 2030 target of at least -55% net GHG emissions vs 1990, the Fit-for-55 headline target.' },
    { codeId: 'code-target-2040', origin: 'ai', confidence: 0.92, rationale: 'Art. 5 requires the Commission to propose a 2040 climate target by first half of 2024, establishing the interim pathway.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.99, rationale: 'Art. 2 sets binding objective of climate neutrality (net-zero GHG) by 2050 as the law\'s central purpose.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.99, rationale: 'Domain is explicitly \'climate\'; the law is the foundational EU climate governance instrument.' },
    { codeId: 'root-adaptation', origin: 'ai', confidence: 0.88, rationale: 'Art. 8 requires Member States to develop adaptation strategies; Art. 6(1)(b) mandates assessment of adaptation progress.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.98, rationale: 'The law\'s primary purpose is setting the framework for GHG emission reductions — the core mitigation architecture.' },
  ],
  // EU ETS Directive
  'eu-ets-directive': [
    { codeId: 'code-ets', origin: 'ai', confidence: 0.99, rationale: 'Art. 1 establishes the EU Emissions Trading System — the core cap-and-trade scheme for GHG allowances.' },
    { codeId: 'code-ets-aviation', origin: 'ai', confidence: 0.93, rationale: 'Chapter II (Arts. 3a-3f) sets provisions for aviation activities including intra-EEA flights in the ETS.' },
    { codeId: 'code-ets-freealloc', origin: 'ai', confidence: 0.95, rationale: 'Art. 10a establishes harmonised free allocation rules using benchmark values from 10% most efficient installations.' },
    { codeId: 'code-ets-innovfund', origin: 'ai', confidence: 0.88, rationale: 'Art. 10(3) specifies auction revenue uses including supporting low-emission technologies (precursor to Innovation Fund).' },
    { codeId: 'code-ets-msr', origin: 'ai', confidence: 0.95, rationale: 'Art. 18a establishes the Market Stability Reserve (from 2019), with 24%/12% intake rates and 400 M allowance release trigger.' },
    { codeId: 'code-ets-phases', origin: 'ai', confidence: 0.97, rationale: 'Art. 9 sets the linear reduction factor (2.2% then 4.3% from 2024, 4.4% from 2028) defining cap trajectory phases.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.9, rationale: 'Arts. 14-15 establish MRV obligations: monitoring plans, verified annual emission reports, and surrender requirements.' },
    { codeId: 'code-pricing', origin: 'ai', confidence: 0.97, rationale: 'The ETS is the EU\'s primary carbon pricing instrument; Art. 10 governs auctioning creating the carbon price signal.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'climate\'; the ETS Directive is the EU\'s flagship climate-mitigation legislative instrument.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.98, rationale: 'The ETS is a direct mitigation instrument; Art. 1 explicitly aims to promote cost-effective GHG emission reductions.' },
  ],
  // Effort Sharing Regulation
  'effort-sharing-regulation': [
    { codeId: 'code-esr', origin: 'ai', confidence: 0.99, rationale: 'Art. 1 defines the regulation as setting Member State obligations for non-ETS GHG reductions — the Effort Sharing Regulation.' },
    { codeId: 'code-esr-flex', origin: 'ai', confidence: 0.97, rationale: 'Arts. 5-7 establish banking/borrowing (10%), MS-to-MS transfers (5%), ETS-ESR and LULUCF flexibilities.' },
    { codeId: 'code-esr-targets', origin: 'ai', confidence: 0.99, rationale: 'Art. 4 and Annex I set per-Member-State binding 2030 reduction targets (e.g. Germany -50%, Poland -17.7% vs 2005).' },
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.82, rationale: 'Art. 7 allows Member States to use up to 280 Mt CO2eq of LULUCF net removals for ESR compliance 2021-2030.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.88, rationale: 'Arts. 8-9 require annual Commission assessment of MS progress and impose corrective action (1.08× penalty factor).' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.93, rationale: 'The ESR implements the -40% 2030 target for non-ETS sectors, aligned with Fit-for-55 / -55% economy-wide goal.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'climate\'; the regulation directly governs national GHG reduction commitments outside the ETS.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.98, rationale: 'The ESR is a core mitigation instrument covering ~60% of EU GHG emissions from transport, buildings, agriculture, waste.' },
  ],
  // LULUCF Regulation
  'lulucf-regulation': [
    { codeId: 'code-esr-flex', origin: 'ai', confidence: 0.83, rationale: 'Art. 13 establishes LULUCF-ESR flexibility allowing excess removals to be transferred or used for ESR compliance.' },
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.99, rationale: 'Art. 1 establishes accounting rules for GHG emissions and removals from land use, land-use change, and forestry.' },
    { codeId: 'code-lulucf-crop', origin: 'ai', confidence: 0.92, rationale: 'Art. 7 establishes accounting for managed cropland, subtracting 2005-2009 baseline average emissions.' },
    { codeId: 'code-lulucf-forest', origin: 'ai', confidence: 0.95, rationale: 'Art. 8 governs managed forest land accounting using national forestry accounting plans and forest reference levels.' },
    { codeId: 'code-lulucf-grass', origin: 'ai', confidence: 0.9, rationale: 'Art. 7 includes managed grassland accounting alongside cropland in the same framework.' },
    { codeId: 'code-lulucf-harv', origin: 'ai', confidence: 0.88, rationale: 'Art. 9 establishes accounting for harvested wood products using first-order decay with defined half-life values.' },
    { codeId: 'code-lulucf-wetland', origin: 'ai', confidence: 0.85, rationale: 'Art. 2(1)(f) includes managed wetland as a land accounting category; Art. 7 covers managed wetland accounting.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.92, rationale: 'Art. 4(2) sets Union-wide target of 310 Mt CO2eq net removals in the LULUCF sector by 2030 (Annex IIa).' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'climate\'; the regulation covers the land sector\'s contribution to EU 2030 climate commitments.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.97, rationale: 'The regulation integrates land-sector sinks/sources into EU climate framework; core mitigation through carbon sequestration.' },
  ],
  // Renewable Energy Directive (RED II)
  'renewable-energy-directive': [
    { codeId: 'code-renew-bioliq', origin: 'ai', confidence: 0.85, rationale: 'Art. 25 sets 29% transport renewable obligation with sub-mandates relevant to liquid biofuels and advanced biofuels.' },
    { codeId: 'code-renew-biomass', origin: 'ai', confidence: 0.92, rationale: 'Art. 29 establishes sustainability and GHG emissions saving criteria for biofuels, bioliquids, and biomass fuels.' },
    { codeId: 'code-renew-h2-green', origin: 'ai', confidence: 0.87, rationale: 'Art. 2(7) defines \'renewable hydrogen\' (electrolysis from RES or reformed biogas); underpins RFNBO provisions.' },
    { codeId: 'code-renew-red', origin: 'ai', confidence: 0.99, rationale: 'This directive IS RED II/III (Directive 2018/2001 as amended by 2023/2413), setting binding RES targets and rules.' },
    { codeId: 'code-renew-sust', origin: 'ai', confidence: 0.93, rationale: 'Art. 29 sets detailed sustainability criteria prohibiting bioenergy from high biodiversity-value or high carbon-stock land.' },
    { codeId: 'code-renewables', origin: 'ai', confidence: 0.99, rationale: 'Art. 1 establishes a common framework for renewable energy promotion; Art. 3 sets binding 42.5% target for 2030.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.9, rationale: 'Art. 3 sets the binding 42.5% RES target by 2030 (aspirational 45%), contributing directly to the Fit-for-55 package.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'energy\'; the directive governs renewable energy in the EU energy system.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.97, rationale: 'RES deployment directly reduces GHG emissions; recital 2 notes energy sector produces over 75% of EU GHG emissions.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'The directive is primarily sectoral energy policy — governing RES deployment across electricity, heating/cooling, transport.' },
  ],
  // Energy Efficiency Directive
  'energy-efficiency-directive': [
    { codeId: 'code-eff-eed', origin: 'ai', confidence: 0.99, rationale: 'This directive IS the Energy Efficiency Directive (EED recast, 2023/1791), establishing the EED framework and obligations.' },
    { codeId: 'code-eff-poverty', origin: 'ai', confidence: 0.78, rationale: 'Art. 24 requires Member States to promote energy efficiency improvements to small and domestic customers, including low-income.' },
    { codeId: 'code-efficiency', origin: 'ai', confidence: 0.99, rationale: 'Art. 4 sets binding EU energy efficiency target: -11.7% final energy consumption by 2030 vs 2020 projections (763 Mtoe).' },
    { codeId: 'code-sec-build-heat', origin: 'ai', confidence: 0.8, rationale: 'Art. 23 mandates increasing RES/waste-heat share in district heating by 2.2 pp (2021-25) and 2.3 pp (2026-30) annually.' },
    { codeId: 'code-sec-build-renov', origin: 'ai', confidence: 0.82, rationale: 'Art. 6 requires Member States to renovate at least 3% of public buildings\' floor area annually to near-zero-energy standard.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.88, rationale: 'Art. 4 sets a binding 2030 efficiency target aligned with the -55% GHG Fit-for-55 framework; recital 3 links it explicitly.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'energy\'; the directive governs energy efficiency policy across the EU energy system.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.96, rationale: 'Energy efficiency reduces energy consumption, lowering GHG emissions; recital 1 links directly to the Climate Law -55% target.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.88, rationale: 'The directive covers energy supply and demand sectors including buildings, industry, and public sector operations.' },
  ],
  // CBAM Regulation
  'cbam-regulation': [
    { codeId: 'code-cbam', origin: 'ai', confidence: 0.99, rationale: 'Art. 1 establishes the Carbon Border Adjustment Mechanism to address GHG in imported goods and prevent carbon leakage.' },
    { codeId: 'code-cbam-alu', origin: 'ai', confidence: 0.96, rationale: 'Art. 2(3)(e) and Annex I include aluminium as a CBAM-covered sector.' },
    { codeId: 'code-cbam-cement', origin: 'ai', confidence: 0.96, rationale: 'Art. 2(3)(a) and Annex I include cement as a CBAM-covered sector.' },
    { codeId: 'code-cbam-elec', origin: 'ai', confidence: 0.95, rationale: 'Art. 2(3)(b) and Annex I include imported electricity as a CBAM-covered good.' },
    { codeId: 'code-cbam-fert', origin: 'ai', confidence: 0.96, rationale: 'Art. 2(3)(c) and Annex I include fertilisers (nitrogen) as a CBAM-covered sector.' },
    { codeId: 'code-cbam-h2', origin: 'ai', confidence: 0.95, rationale: 'Art. 2(3)(f) and Annex I include hydrogen as a CBAM-covered sector from the definitive phase.' },
    { codeId: 'code-cbam-iron', origin: 'ai', confidence: 0.96, rationale: 'Art. 2(3)(d) and Annex I include iron and steel as a CBAM-covered sector subject to embedded-emissions obligations.' },
    { codeId: 'code-cbam-trans', origin: 'ai', confidence: 0.97, rationale: 'Art. 32 defines the transitional period (Oct 2023 – Dec 2025) with reporting-only obligations before certificate surrender.' },
    { codeId: 'code-ets-freealloc', origin: 'ai', confidence: 0.85, rationale: 'Art. 36 phases out free ETS allocation for CBAM sectors 2026-2034, replacing it with CBAM certificate obligations.' },
    { codeId: 'code-pricing', origin: 'ai', confidence: 0.9, rationale: 'CBAM prices are pegged to EU ETS average auction prices (Art. 20), functioning as an equivalent carbon price on imports.' },
    { codeId: 'code-trade-wto', origin: 'ai', confidence: 0.82, rationale: 'CBAM design (Art. 22 carbon-price credit, third-country equivalence) directly engages WTO compatibility questions.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.9, rationale: 'Domain is \'finance\'; CBAM involves certificate purchase/surrender, carbon price equivalence, and trade finance impacts.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'CBAM prevents carbon leakage and maintains ETS mitigation effectiveness by levelling the carbon cost for imports.' },
  ],
  // EU Taxonomy Regulation
  'taxonomy-regulation': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.92, rationale: 'Arts.5-7 impose disclosure obligations on financial market participants and issuers of financial products and corporate bonds.' },
    { codeId: 'code-fin-sfdr', origin: 'ai', confidence: 0.8, rationale: 'The Taxonomy Regulation amends SFDR (Reg.2019/2088) and its Art.5-6 disclosures build directly on the SFDR product categories.' },
    { codeId: 'code-fin-tax-adapt', origin: 'ai', confidence: 0.96, rationale: 'Art.11 defines substantial contribution to climate change adaptation through forward-looking physical risk assessment criteria.' },
    { codeId: 'code-fin-tax-dnsh', origin: 'ai', confidence: 0.97, rationale: 'Art.17 establishes the \'Do No Significant Harm\' principle across all six environmental objectives as a gating condition.' },
    { codeId: 'code-fin-tax-mitig', origin: 'ai', confidence: 0.98, rationale: 'Art.10 defines substantial contribution to climate change mitigation, listing eligible activities (RES, efficiency, clean mobility, CCS, etc.).' },
    { codeId: 'code-fin-taxonomy', origin: 'ai', confidence: 0.99, rationale: 'This IS the EU Taxonomy Regulation (2020/852); Art.1 establishes the classification system for environmentally sustainable economic activities.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'finance\'; the regulation governs financial market participant disclosures and investment classification.' },
    { codeId: 'root-adaptation', origin: 'ai', confidence: 0.82, rationale: 'Art.11 establishes adaptation as a standalone environmental objective with its own substantial-contribution criteria.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.97, rationale: 'The regulation steers private finance towards sustainable activities; its legal base is the single market (Art.114 TFEU) not climate.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.88, rationale: 'The primary climate objective is channelling investment into mitigation-aligned activities; Art.10 lists mitigation criteria explicitly.' },
  ],
  // Sustainable Finance Disclosure Regulation
  'sfdr': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.93, rationale: 'Arts.3-11 require entity- and product-level disclosures on sustainability risks, adverse impacts, and sustainable investment objectives.' },
    { codeId: 'code-fin-sfdr', origin: 'ai', confidence: 0.99, rationale: 'This IS the SFDR (Reg.2019/2088); Art.1 lays down harmonised sustainability disclosure rules for financial market participants.' },
    { codeId: 'code-fin-taxonomy', origin: 'ai', confidence: 0.82, rationale: 'The SFDR is amended by and operationalises the Taxonomy Regulation; Art.8/9 products must disclose taxonomy alignment.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.75, rationale: 'Arts.4 and 11 require periodic reporting on principal adverse sustainability impacts and product-level sustainability outcomes.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'finance\'; the regulation governs sustainability disclosure obligations in financial services.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.97, rationale: 'The regulation is primarily a financial-sector disclosure instrument; legal base Art.114 TFEU targets capital markets transparency.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.72, rationale: 'Art.9(3) specifically addresses financial products with carbon-emission reduction as objective, linking to Paris Agreement Article 2(1)(c).' },
  ],
  // CO2 Standards for Cars
  'co2-cars-regulation': [
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.85, rationale: 'Art.7 requires annual Commission recording and provisional publication of each manufacturer\'s average specific CO2 emissions.' },
    { codeId: 'code-sec-road', origin: 'ai', confidence: 0.95, rationale: 'The regulation covers light-duty road vehicles (M1 and N1 categories per Art.2), including cars and light commercial vehicles.' },
    { codeId: 'code-sec-road-cars', origin: 'ai', confidence: 0.99, rationale: 'Art.1 sets CO2 performance standards for new passenger cars and vans; Art.1(3) establishes 100% reduction (zero-emission) by 2035.' },
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.9, rationale: 'Art.3(5-6) defines zero- and low-emission vehicles; Art.14(2)(b) requires review of ZEV/PHEV uptake on the Union market.' },
    { codeId: 'code-sec-transp', origin: 'ai', confidence: 0.9, rationale: 'Recital 2 notes road transport is the second-largest GHG sector; the regulation is a core transport decarbonisation instrument.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.92, rationale: 'Art.1(2) sets fleet-wide targets: -55% for cars and -50% for vans from 2030 vs 2021 baseline, part of Fit-for-55.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.99, rationale: 'Domain is \'transport\'; the regulation governs CO2 standards for new passenger cars and light commercial vehicles.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.97, rationale: 'Cars/vans are ~15% of EU CO2 emissions (recital 2); the 100% reduction target by 2035 directly cuts GHG from road transport.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.93, rationale: 'This is sector-specific transport legislation governing manufacturer fleet CO2 standards and the 2035 ICE phase-out.' },
  ],
  // Alternative Fuels Infrastructure Regulation
  'afir-regulation': [
    { codeId: 'code-sec-altfuel', origin: 'ai', confidence: 1, rationale: 'AFIR IS this instrument; Art. 1 sets binding targets repealing Directive 2014/94/EU on alternative fuels infrastructure.' },
    { codeId: 'code-sec-altfuel-ev', origin: 'ai', confidence: 0.99, rationale: 'Arts. 3–4 mandate EV recharging pools on TEN-T core at 400 kW by 2025 and 600 kW by 2027 for LDVs and HDVs.' },
    { codeId: 'code-sec-altfuel-h2', origin: 'ai', confidence: 0.97, rationale: 'Art. 6 requires H₂ refuelling stations every 200 km on TEN-T core by 2030, minimum 1 t/day, 700 bar dispenser.' },
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.87, rationale: 'Recital 1 links AFIR to Reg. 2023/851 (2035 ICE phase-out); charging network is direct enabler for EV uptake.' },
    { codeId: 'code-sec-transp', origin: 'ai', confidence: 1, rationale: 'Art. 1 establishes mandatory national targets for alternative fuels infrastructure for road vehicles, vessels and aircraft.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 1, rationale: 'Policy domain is transport; Reg. 2023/1804 governs alternative fuels infrastructure deployment under Art. 91 TFEU.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.8, rationale: 'Supports zero-emission transport by removing infrastructure barrier identified as key obstacle (recital 2).' },
    { codeId: 'root-sector', origin: 'ai', confidence: 1, rationale: 'Sector-specific transport legislation; part of Fit-for-55 package targeting zero-emission mobility infrastructure.' },
  ],
  // Energy Performance of Buildings Directive
  'epbd-recast': [
    { codeId: 'code-eff-epbd', origin: 'ai', confidence: 0.98, rationale: 'Recital 1: buildings = 40% final energy and 36% energy-related GHG; directive is the primary EPBD efficiency instrument.' },
    { codeId: 'code-eff-poverty', origin: 'ai', confidence: 0.82, rationale: 'Art. 3(2)(e) requires renovation plans to address energy poverty and split-incentive dilemmas for vulnerable households.' },
    { codeId: 'code-renew-solar-pv', origin: 'ai', confidence: 0.88, rationale: 'Art. 9a mandates solar installation on new/existing public and commercial buildings from 2026–2029 (rooftop solar mandate).' },
    { codeId: 'code-sec-build', origin: 'ai', confidence: 0.99, rationale: 'Art. 1 sets common framework for energy performance covering new builds, MEPS, renovation plans, EPCs and solar mandates.' },
    { codeId: 'code-sec-build-epbd', origin: 'ai', confidence: 1, rationale: 'This IS the EPBD recast (Dir. 2024/1275); Art. 7 mandates zero-emission new buildings from 2028 (public) and 2030 (all).' },
    { codeId: 'code-sec-build-mepsr', origin: 'ai', confidence: 0.97, rationale: 'Art. 8: non-residential buildings must reach class E by 2030 and D by 2033; residential -16% primary energy by 2030.' },
    { codeId: 'code-sec-build-renov', origin: 'ai', confidence: 0.96, rationale: 'Art. 3 requires national building renovation plans targeting zero-emission stock by 2050, with 55% reduction via worst-43%.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 1, rationale: 'Policy domain is energy; Dir. 2024/1275 adopted under Art. 194(2) TFEU targeting building energy performance.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.9, rationale: 'Recital 2 cites European Climate Law neutrality by 2050; decarbonising buildings is a key mitigation pathway.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.99, rationale: 'Sector-specific buildings legislation requiring zero-emission new buildings by 2030 and renovation of existing stock.' },
  ],
  // European Green Deal
  'eu-green-deal': [
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.88, rationale: 'Section 2.7 commits to EU Biodiversity Strategy 2030 and legally binding nature restoration targets.' },
    { codeId: 'code-fin-jtm', origin: 'ai', confidence: 0.9, rationale: 'Section 5 outlines three-pillar JTM: Just Transition Fund + InvestEU just transition + EIB public sector loan facility.' },
    { codeId: 'code-gov-climatelaw', origin: 'ai', confidence: 0.97, rationale: 'Section 2.1 explicitly proposes a European Climate Law to enshrine 2050 neutrality and the 2030 target in legislation.' },
    { codeId: 'code-intl', origin: 'ai', confidence: 0.85, rationale: 'Section 3: EU commits to leading UNFCCC/Paris negotiations and embedding Green Deal in trade agreements.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.92, rationale: 'Section 5: Just Transition Mechanism (JTF EUR 7.5 bn, InvestEU JT scheme, EIB public sector loan facility) to leave no one behind.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.97, rationale: 'Section 2.1 proposes raising 2030 target to \'at least 50% and towards 55%\' — the genesis of Fit-for-55.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.99, rationale: 'Section 1: \'no net emissions of greenhouse gases in 2050\' is the defining objective; section 2.1 proposes Climate Law.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 1, rationale: 'Policy domain is cross-cutting; COM(2019) 640 is the overarching Green Deal framework spanning all sectors.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.99, rationale: 'The European Green Deal is the master governance framework and growth strategy for EU climate and sustainability policy.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.98, rationale: 'Section 2.1: commits to -55% by 2030 and climate neutrality by 2050; proposes European Climate Law and ETS extension.' },
  ],
  // Fit for 55 Package
  'fit-for-55': [
    { codeId: 'code-cbam', origin: 'ai', confidence: 0.97, rationale: 'Section 2.2: CBAM covers cement, iron/steel, aluminium, fertilisers, electricity, hydrogen; transitional phase 2023–2025.' },
    { codeId: 'code-esr', origin: 'ai', confidence: 0.96, rationale: 'Section 2.3: ESR target increased to -40% vs 2005; per-MS national targets updated on GDP/cost-effectiveness basis.' },
    { codeId: 'code-ets', origin: 'ai', confidence: 0.98, rationale: 'Section 2.1: linear reduction factor rises to 4.3% from 2024; aviation free allocation phased out; maritime included.' },
    { codeId: 'code-ets2', origin: 'ai', confidence: 0.97, rationale: 'Section 2.1 establishes ETS2 covering buildings and road transport from 2027 (MRV from 2024).' },
    { codeId: 'code-ets2-scf', origin: 'ai', confidence: 0.94, rationale: 'Section 2.12 establishes EUR 65 bn Social Climate Fund (2026–2032) funded by 25% of ETS2 revenues.' },
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.95, rationale: 'Section 2.4: EU-wide net removal target 310 Mt CO2e by 2030; per-MS targets; scope expands to AFOLU from 2031.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.99, rationale: 'Section 1: translates binding -55% by 2030 target from European Climate Law into concrete legislative changes.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 1, rationale: 'Domain is cross-cutting; COM(2021) 550 is a legislative package communication spanning ETS, transport, buildings, land use.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.99, rationale: 'Fit for 55 is the umbrella framework translating European Climate Law targets into legislation across all sectors.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.99, rationale: 'The entire package targets net -55% GHG reductions by 2030 per European Climate Law Art. 4 (section 1).' },
  ],
  // Social Climate Fund
  'social-climate-fund': [
    { codeId: 'code-eff-poverty', origin: 'ai', confidence: 0.9, rationale: 'Art. 6(1)(d–e) funds building renovation and renewable energy integration to reduce energy poverty and fossil fuel reliance.' },
    { codeId: 'code-ets2', origin: 'ai', confidence: 0.92, rationale: 'SCF is the companion instrument to ETS2; recital 1 and Art. 3 explicitly reference the ETS extension to buildings/road transport.' },
    { codeId: 'code-ets2-scf', origin: 'ai', confidence: 0.98, rationale: 'Art. 3: Fund addresses social impacts of ETS2 (buildings/road transport); funded by 25% of ETS2 auction revenues.' },
    { codeId: 'code-fin-scf', origin: 'ai', confidence: 0.99, rationale: 'Art. 1 establishes the Social Climate Fund 2026–2032 at EUR 65 bn; Art. 9 sets per-MS maximum allocations.' },
    { codeId: 'code-jt-households', origin: 'ai', confidence: 0.96, rationale: 'Arts. 2–6 directly target households in energy poverty and lower middle-income households affected by ETS2 carbon pricing.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.97, rationale: 'Art. 3(1): general objective is \'socially fair transition\'; Art. 2 defines vulnerable households, micro-enterprises, transport users.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 1, rationale: 'Policy domain is finance; Reg. 2023/955 establishes a EUR 65 bn EU fund with MS co-financing obligations.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Social climate plans (Art. 4) must be consistent with NECPs, renovation strategies and just transition plans — cross-cutting governance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.99, rationale: 'SCF is a public finance instrument channelling ETS2 revenues to Member States for social climate plans.' },
  ],
  // Methane Emissions Regulation
  'methane-regulation': [
    { codeId: 'code-intl', origin: 'ai', confidence: 0.85, rationale: 'Art. 27: import performance standards for crude oil, gas, coal from 2027; maximum methane intensity limits from 2030.' },
    { codeId: 'code-methane', origin: 'ai', confidence: 0.99, rationale: 'Regulation IS the EU\'s first comprehensive methane legislation; recital 2 references the Global Methane Pledge (COP26, -30% by 2030).' },
    { codeId: 'code-methane-energy', origin: 'ai', confidence: 0.99, rationale: 'Art. 1: scope covers upstream/midstream/downstream oil, gas and coal; LDAR, venting/flaring ban, abandoned well monitoring.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.96, rationale: 'Arts. 4–6: mandatory source-level CH4 measurement (quarterly min), annual reporting to competent authority, independent verification.' },
    { codeId: 'code-monitoring-inv', origin: 'ai', confidence: 0.88, rationale: 'Art. 5: operators report total CH4 disaggregated by venting/flaring/fugitive categories, feeding into national GHG inventories.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.72, rationale: 'Art. 28: global methane transparency platform facilitates supply-chain data; art. 30 flags potential scope extension to agriculture.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 1, rationale: 'Policy domain is energy; Reg. 2024/1787 adopted under Arts. 192(1) and 194(2) TFEU covering oil, gas and coal sector.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.99, rationale: 'Regulation targets methane abatement; recital 1: methane is 2nd-largest GHG with 80× CO2 GWP over 20 years.' },
  ],
  // Nature Restoration Law
  'nature-restoration-law': [
    { codeId: 'code-adapt-eco', origin: 'ai', confidence: 0.87, rationale: 'Recital 2: restored ecosystems provide flood protection; Art. 7 (connectivity) and Art. 8 (free-flowing rivers) boost resilience.' },
    { codeId: 'code-eco-nbs', origin: 'ai', confidence: 0.93, rationale: 'Art. 3(5) defines nature-based solutions; Art. 6 (urban green space) and Art. 8 (free-flowing rivers) are NbS-based measures.' },
    { codeId: 'code-eco-nrl', origin: 'ai', confidence: 0.99, rationale: 'This IS the NRL (Reg. 2024/1991); Art. 4(1) mandates ≥30% of poor-condition habitats under restoration measures by 2030.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.99, rationale: 'Arts. 4–11 set binding restoration targets for terrestrial, marine, urban, forest and agricultural ecosystems up to 2050.' },
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.88, rationale: 'Art. 10(2)(f): forest carbon stock is a required restoration indicator; peatland/wetland rewetting links to LULUCF sinks.' },
    { codeId: 'code-lulucf-wetland', origin: 'ai', confidence: 0.85, rationale: 'Arts. 4–5 cover coastal/marine and freshwater habitats including peatland rewetting — core wetland carbon restoration.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 1, rationale: 'Policy domain is climate; NRL adopted under Art. 192(1) TFEU; Art. 1(b) explicitly targets climate change mitigation and adaptation.' },
    { codeId: 'root-adaptation', origin: 'ai', confidence: 0.9, rationale: 'Art. 1(b) links to climate adaptation; recital 2 cites flood protection and water purification as restored-ecosystem services.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'NRL spans biodiversity, LULUCF, adaptation, agriculture and marine policy; Art. 12 national restoration plans are cross-cutting.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.92, rationale: 'Recital 3: nature-based solutions contribute ~25% of needed climate mitigation; Art. 10(2)(f) tracks forest organic carbon stocks.' },
  ],
  // Corporate Sustainability Reporting Directive
  'csrd': [
    { codeId: 'code-fin-csrd', origin: 'ai', confidence: 0.99, rationale: 'This IS the CSRD (Dir. 2022/2464); Art. 19a mandates double-materiality reporting on climate risks, emissions, transition plans.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.9, rationale: 'CSRD is a private finance disclosure instrument extending NFRD to ~50,000 firms, supporting the EU Sustainable Finance agenda.' },
    { codeId: 'code-fin-trans-plans', origin: 'ai', confidence: 0.95, rationale: 'Art. 19a(2)(a)(iii) requires companies to disclose plans for Paris-alignment and 1.5°C compatibility of their business model.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.88, rationale: 'Art. 19b: ESRS require Scope 1, 2 and 3 GHG emission disclosures; Art. 19c mandates independent assurance of sustainability data.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.78, rationale: 'Art. 19a(2)(b) requires companies to set GHG reduction targets at least for 2030 and 2050, grounded in scientific evidence.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 1, rationale: 'Policy domain is finance; Dir. 2022/2464 amends accounting/audit directives under Art. 50(1) TFEU for capital markets.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'ESRS cover climate, biodiversity, water, pollution and social matters — cross-cutting sustainability reporting framework.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.99, rationale: 'CSRD expands mandatory sustainability reporting to ~50,000 companies, driving private capital market climate disclosure.' },
  ],
  // FuelEU Maritime
  'fueleu-maritime': [
    { codeId: 'code-renew-h2-green', origin: 'ai', confidence: 0.85, rationale: 'Art. 5: from 2034, ≥2% of ship energy must be RFNBO; multiplier of 2 applied to RFNBO for compliance with Art. 4.' },
    { codeId: 'code-sec-mari', origin: 'ai', confidence: 0.99, rationale: 'Maritime shipping regulation targeting GHG intensity, alternative fuels and shore-side power — comprehensive maritime instrument.' },
    { codeId: 'code-sec-mari-fueleu', origin: 'ai', confidence: 1, rationale: 'This IS FuelEU Maritime; Art. 4 sets GHG intensity limits: -2% (2025), -6% (2030), -14.5% (2035), -80% (2050).' },
    { codeId: 'code-sec-mari-imo', origin: 'ai', confidence: 0.78, rationale: 'Recital 2 references Paris Agreement alignment; regulation designed to interface with IMO global GHG strategy frameworks.' },
    { codeId: 'code-sec-mari-ports', origin: 'ai', confidence: 0.95, rationale: 'Art. 6: from 2030, container and passenger ships at TEN-T core ports must connect to on-shore power supply (OPS).' },
    { codeId: 'code-sec-transp', origin: 'ai', confidence: 0.99, rationale: 'Reg. 2023/1805 regulates all ships >5,000 GT at EU ports; covers entire energy used for intra-EU and 50% of extra-EU voyages.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 1, rationale: 'Policy domain is transport; Reg. 2023/1805 adopted under Art. 100(2) TFEU governing maritime fuel GHG intensity.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.97, rationale: 'Art. 4 targets 80% GHG intensity reduction by 2050 (vs 91.16 gCO2eq/MJ baseline); recital 2 cites Paris Agreement.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.99, rationale: 'Sector-specific maritime legislation setting GHG intensity limits for ships at EU ports — part of Fit-for-55 package.' },
  ],
  // ReFuelEU Aviation
  'refueleu-aviation': [
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.83, rationale: 'Arts. 6–8: Union SAF database tracks volumes, lifecycle GHG and feedstocks; annual reporting by suppliers and operators.' },
    { codeId: 'code-renew-h2-green', origin: 'ai', confidence: 0.85, rationale: 'Art. 3(2): synthetic aviation fuel defined as RFNBO (renewable hydrogen + CO2); sub-mandate starts at 1.2% from 2030.' },
    { codeId: 'code-sec-avi', origin: 'ai', confidence: 0.99, rationale: 'Aviation-specific decarbonisation regulation covering SAF mandates, synthetic fuels, and monitoring of uplift.' },
    { codeId: 'code-sec-avi-refuel', origin: 'ai', confidence: 1, rationale: 'This IS ReFuelEU Aviation; Art. 4 mandates 2% SAF by 2025, 6% by 2030, 20% by 2035, 70% by 2050.' },
    { codeId: 'code-sec-avi-saf', origin: 'ai', confidence: 0.97, rationale: 'Art. 3 defines SAF (biofuels, RFNBO/e-kerosene, recycled carbon fuels); Art. 4(2) sub-mandates synthetic fuels to 35% by 2050.' },
    { codeId: 'code-sec-transp', origin: 'ai', confidence: 0.99, rationale: 'Reg. 2023/2405 applies to all aviation fuel suppliers at EU airports and aircraft operators departing from EU airports.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 1, rationale: 'Policy domain is transport; Reg. 2023/2405 adopted under Art. 100(2) TFEU governing aviation fuel at EU airports.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.97, rationale: 'Art. 1: objectives include reducing lifecycle GHG emissions from aviation; recital 1 cites EU Climate Law and Paris Agreement.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.99, rationale: 'Sector-specific aviation legislation mandating SAF blending — part of Fit-for-55 package for transport decarbonisation.' },
  ],
  // Governance Regulation
  'governance-regulation': [
    { codeId: 'code-gov-gov', origin: 'ai', confidence: 0.99, rationale: 'This IS Regulation 2018/1999 — the EU Governance Regulation — establishing the governance mechanism for the Energy Union.' },
    { codeId: 'code-gov-ltsnz', origin: 'ai', confidence: 0.97, rationale: 'Art.15 requires each MS to prepare 30-year long-term strategies with GHG reductions by sector by 1 January 2020.' },
    { codeId: 'code-gov-necps', origin: 'ai', confidence: 0.99, rationale: 'Arts. 3–9 require each MS to submit integrated National Energy and Climate Plans every 10 years covering all five Energy Union dimensions.' },
    { codeId: 'code-gov-progress', origin: 'ai', confidence: 0.95, rationale: 'Art.17 requires biennial progress reports on NECP implementation; Art.29 requires Commission to assess MS progress biennially.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.97, rationale: 'Art.17 establishes biennial integrated progress reports; Art.29 mandates Commission assessment every two years.' },
    { codeId: 'code-monitoring-inv', origin: 'ai', confidence: 0.95, rationale: 'Art.26 mandates annual MS GHG inventories covering CO2, CH4, N2O, HFCs, PFCs, SF6 and NF3 submitted by 15 January.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'cross-cutting\'; Governance Regulation applies horizontally across all Energy Union dimensions.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.99, rationale: 'Core cross-cutting instrument establishing planning, monitoring and reporting across energy, climate and efficiency sectors.' },
  ],
  // Industrial Emissions Directive
  'industrial-emissions-directive': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.85, rationale: 'Art.1 aims for high-level protection of the environment as a whole, covering emissions to air, water and land and waste prevention.' },
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.87, rationale: 'Art.30 sets emission limit values for SO2, NOx and particulate matter from large combustion plants, directly improving air quality.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.85, rationale: 'Arts.14–15 require monitoring as a permit condition; Art.21 mandates periodic permit review tied to updated BAT conclusions.' },
    { codeId: 'code-sec-ind', origin: 'ai', confidence: 0.92, rationale: 'Covers combustion, chemicals, refining and other heavy industry; Art.11(f) requires energy to be used efficiently.' },
    { codeId: 'code-sec-ind-ied', origin: 'ai', confidence: 0.99, rationale: 'This IS Directive 2010/75/EU — the IED — Art.1 sets rules on integrated pollution prevention; Art.14 mandates BAT-based permits.' },
    { codeId: 'domain-industry', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'industry\'; IED regulates ~75,000 industrial installations via integrated pollution prevention and control.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.99, rationale: 'Sector-specific legislation establishing permit conditions and BAT-based emission limits for major industrial activities.' },
  ],
  // Net-Zero Industry Act
  'net-zero-industry-act': [
    { codeId: 'code-innov-cleantech', origin: 'ai', confidence: 0.9, rationale: 'Art.6 designates net-zero strategic projects; Arts.22–25 include procurement and auction criteria supporting clean-tech scale-up.' },
    { codeId: 'code-jt-skills', origin: 'ai', confidence: 0.82, rationale: 'Art.29 establishes Net-Zero Industry Academies targeting 100,000 trained workers within 3 years for net-zero technology sectors.' },
    { codeId: 'code-sec-ind-ccs', origin: 'ai', confidence: 0.93, rationale: 'Art.18 sets a 50 Mt/yr CO2 injection capacity target by 2030; Art.2(g) lists CCUS as a strategic net-zero technology.' },
    { codeId: 'code-sec-ind-nzia', origin: 'ai', confidence: 0.99, rationale: 'This IS Regulation 2024/1735, the NZIA — Art.1 sets 40% domestic manufacturing benchmark for net-zero technologies by 2030.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.82, rationale: 'Recital 2 and Art.22(2)(c) address supply-chain resilience and diversification to reduce dependency on single third-country suppliers.' },
    { codeId: 'domain-industry', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'industry\'; NZIA directly targets EU manufacturing capacity for clean energy technologies.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.92, rationale: 'Scaling net-zero tech manufacturing (solar, wind, batteries, electrolysers) directly enables GHG emission reductions; Art.2 lists covered technologies.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.98, rationale: 'Sector-specific industrial policy framework to scale up net-zero technology manufacturing, with streamlined permitting (Art.9).' },
  ],
  // Critical Raw Materials Act
  'critical-raw-materials-act': [
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.78, rationale: 'Art.19 requires Commission to regularly monitor CRM supply chains including trade flows, concentration and processing capacity.' },
    { codeId: 'code-sec-ind-crma', origin: 'ai', confidence: 0.99, rationale: 'This IS Regulation 2024/1252, the CRMA — Art.2 establishes lists of critical/strategic raw materials and domestic supply benchmarks.' },
    { codeId: 'code-sec-waste-batt', origin: 'ai', confidence: 0.8, rationale: 'Art.25 requires national measures to increase collection and recycling of CRMs from batteries, WEEE and end-of-life vehicles.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.85, rationale: 'Arts.19–24 stress supply diversification; Art.22 mandates stress tests every 3 years; Art.24 requires strategic reserves.' },
    { codeId: 'domain-industry', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'industry\'; CRMA governs extraction, processing and recycling of critical raw materials for industrial supply chains.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.82, rationale: 'Recital 1 links CRM supply security to the green transition; lithium, cobalt and rare earths are prerequisites for clean-energy technologies.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.97, rationale: 'Sector-specific industrial policy setting extraction (10%), processing (40%), recycling (25%) benchmarks for strategic CRMs by 2030.' },
  ],
  // Deforestation Regulation
  'deforestation-regulation': [
    { codeId: 'code-eco-defor', origin: 'ai', confidence: 0.99, rationale: 'This IS Regulation 2023/1115, the EUDR — Art.4 prohibits deforestation-linked commodities on the EU market; Art.8 mandates due diligence.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.93, rationale: 'Art.1(b) explicitly targets reduction of global biodiversity loss; forests host >80% of terrestrial species (recital 1).' },
    { codeId: 'code-lulucf-forest', origin: 'ai', confidence: 0.88, rationale: 'The regulation protects forest carbon stocks by banning conversion of forests to agricultural use after 31 December 2020 (Art.3 definition).' },
    { codeId: 'code-sec-agri', origin: 'ai', confidence: 0.8, rationale: 'Covers agricultural production (cattle, soya, palm oil) requiring farm-level geolocation (Art.8(2)(a)(ii)) in due diligence statements.' },
    { codeId: 'code-trade', origin: 'ai', confidence: 0.82, rationale: 'Due diligence requirements (Art.8) and country benchmarking affect seven major traded commodities at the EU market boundary.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'agriculture\'; EUDR covers cattle, cocoa, coffee, oil palm, rubber, soya — core agricultural commodities.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.83, rationale: 'Supply-chain due diligence, country benchmarking (Art.29), and enforcement are cross-cutting trade and governance tools.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.93, rationale: 'Art.1 explicitly aims to reduce EU contribution to GHG emissions; deforestation contributes ~11% of global GHGs per recital 1.' },
  ],
  // AI Act
  'ai-act': [
    { codeId: 'code-digital-ai', origin: 'ai', confidence: 0.97, rationale: 'This IS Regulation 2024/1689, the AI Act — Art.1 sets harmonised rules for AI system development, deployment and risk classification.' },
    { codeId: 'code-digital-dc', origin: 'ai', confidence: 0.68, rationale: 'Training GPAI models with >10^25 FLOPs (Art.51) requires massive data-centre energy and water, an indirect but significant climate nexus.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.72, rationale: 'Risk-based classification, conformity assessment (Arts.6, 9), regulatory sandboxes and impact assessment reflect structured better-regulation design.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.7, rationale: 'Art.55 requires providers of systemic-risk GPAI models to document, track and report serious incidents to the AI Office.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'digital\'; the AI Act regulates AI systems and GPAI models across the digital economy.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Horizontal governance instrument; high-risk AI systems include critical infrastructure management (Annex III), covering energy-system AI.' },
  ],
  // Digital Services Act
  'digital-services-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.97, rationale: 'This IS Regulation 2022/2065, the DSA — Art.1 establishes due diligence, transparency and content-moderation rules for digital services.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.68, rationale: 'Art.34 requires systemic risk assessments by VLOPs; Art.37 mandates independent annual audits — proportionate regulatory governance.' },
    { codeId: 'code-publeng-comm', origin: 'ai', confidence: 0.62, rationale: 'Art.34(2)(c) identifies negative effects on civic discourse as a systemic risk to mitigate, touching on climate communication and misinformation.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'digital\'; the DSA regulates online intermediaries and platforms across the digital single market.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Horizontal framework applicable across all digital services; systemic risk assessments (Art.34) cover civic discourse including climate misinformation.' },
  ],
  // Digital Markets Act
  'digital-markets-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.97, rationale: 'This IS Regulation 2022/1925, the DMA — Art.1 ensures contestability and fairness of digital markets; Art.3 designates gatekeepers.' },
    { codeId: 'code-digital-dc', origin: 'ai', confidence: 0.58, rationale: 'Cloud computing services are classified as core platform services under Art.2(2)(i); gatekeeper rules affect the data-centre energy-use landscape.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'digital\'; the DMA imposes ex-ante obligations on digital gatekeepers to ensure contestable and fair platform markets.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Horizontal regulation governing core platform services (cloud, OS, search) with structural implications for digital-sector energy use and market conditions.' },
  ],
  // Data Act
  'data-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.97, rationale: 'This IS Regulation 2023/2854, the Data Act — Art.1 sets harmonised rules for data access from connected products and related services.' },
    { codeId: 'code-digital-dc', origin: 'ai', confidence: 0.62, rationale: 'Arts.23–24 regulate switching between data processing services, directly relevant to cloud infrastructure and associated data-centre energy consumption.' },
    { codeId: 'code-monitoring-data', origin: 'ai', confidence: 0.68, rationale: 'Art.3 mandates easy accessible data from connected products, enabling data sharing from smart meters and climate/energy monitoring devices.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'digital\'; the Data Act governs fair access to data generated by connected products across the digital economy.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.87, rationale: 'Horizontal data-governance framework affecting all sectors including smart-energy infrastructure, smart meters, and IoT-enabled climate monitoring.' },
  ],
  // Cyber Resilience Act
  'cyber-resilience-act': [
    { codeId: 'code-adapt-infra', origin: 'ai', confidence: 0.62, rationale: 'Securing smart-grid devices, industrial IoT and critical digital infrastructure from cyber threats supports resilience of climate-critical energy systems.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.97, rationale: 'This IS Regulation 2024/2847, the CRA — Art.1 lays down harmonised cybersecurity requirements for products with digital elements.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.73, rationale: 'Recital 24 explicitly links the CRA to securing digital infrastructure for critical-infrastructure providers; energy grid devices are covered products.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'digital\'; the CRA mandates cybersecurity requirements for all products with digital elements on the EU market.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Horizontal cybersecurity framework covering connected hardware and software, including energy grid devices and industrial IoT critical to the green transition.' },
  ],
  // EU-UK Trade and Cooperation Agreement
  'eu-uk-tca': [
    { codeId: 'code-gov', origin: 'ai', confidence: 0.8, rationale: 'Art.2 and Arts.3–9 establish institutional governance (Partnership Council, Committees), Commission enforcement powers and arbitration procedures.' },
    { codeId: 'code-intl', origin: 'ai', confidence: 0.8, rationale: 'TCA is a major multilateral-scale bilateral agreement embedding EU climate and environment standards in international trade architecture.' },
    { codeId: 'code-intl-bilat', origin: 'ai', confidence: 0.93, rationale: 'Art.2 establishes Partnership Council and bilateral cooperation structures; TCA is the foundational EU-UK bilateral partnership instrument.' },
    { codeId: 'code-trade-fta', origin: 'ai', confidence: 0.92, rationale: 'Art.2(4) requires annual reporting on UK law evolution on environment and climate under the level playing field/TSD chapter of the TCA.' },
    { codeId: 'code-trade-wto', origin: 'ai', confidence: 0.7, rationale: 'Art.3 and remedial/rebalancing measures (Art.411 TCA) involve WTO-compatible trade enforcement under the Agreement.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is \'trade\'; the TCA governs post-Brexit EU-UK trade and cooperation including goods, services, fisheries and cooperation.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'TCA covers cross-cutting governance, level playing field on environment/climate/labour standards (Art.2(4) annual reports on UK law evolution).' },
  ],
  // Batteries Regulation
  'batteries-regulation': [
    { codeId: 'code-digital-dpp', origin: 'ai', confidence: 0.92, rationale: 'Art.14 mandates an electronic battery passport for each industrial and EV battery from 18 Feb 2027, containing sustainability and lifecycle data.' },
    { codeId: 'code-sec-ind-crma', origin: 'ai', confidence: 0.78, rationale: 'Art.8 sets recycled-content targets for cobalt (16-26%), lithium (6-12%), nickel (6-15%)—key critical raw materials under CRMA.' },
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.85, rationale: 'Arts.7-8 set carbon footprint declarations, performance class labels and recycled-content targets specifically for electric vehicle batteries.' },
    { codeId: 'code-sec-waste-batt', origin: 'ai', confidence: 0.99, rationale: 'Arts.55-57 set collection targets (45-73% portable, 51-61% LMT); Arts.71-72 set recycling efficiencies (80-90% Li-ion) and material recovery targets.' },
    { codeId: 'code-sec-waste-cea', origin: 'ai', confidence: 0.88, rationale: 'Recital 2 frames regulation as implementing CEAP 2020 circular design: recycled content (Art.8), removability/replaceability (Art.11), waste recovery.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.8, rationale: 'Recital 1 states the EU\'s 2050 climate-neutrality ambition and the clean energy transition as the overarching objective of the regulation.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'circular_economy\'; regulation governs full battery lifecycle including recycling, second-life use and waste management.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Cross-cutting circular-economy and climate-neutrality regulation covering all battery categories placed on the EU market.' },
  ],
  // Ecodesign for Sustainable Products Regulation
  'ecodesign-sustainable-products': [
    { codeId: 'code-consumer-repair', origin: 'ai', confidence: 0.88, rationale: 'Recitals 6-7, 30 and Art.6 enable Commission to set repairability scores and durability standards; ESPR is the primary basis for Right to Repair.' },
    { codeId: 'code-digital-dpp', origin: 'ai', confidence: 0.96, rationale: 'Arts.9-14 (Recitals 32-42) establish the Digital Product Passport (DPP) as a mandatory information requirement across product groups.' },
    { codeId: 'code-eff-ecodes', origin: 'ai', confidence: 0.95, rationale: 'ESPR repeals and replaces Directive 2009/125/EC (Ecodesign Directive), extending scope beyond energy-related products to all physical goods.' },
    { codeId: 'code-env-chem', origin: 'ai', confidence: 0.78, rationale: 'Recitals 26-31 provide for restrictions on substances of concern hindering circularity, complementing REACH/CLP, tracked through the DPP.' },
    { codeId: 'code-sec-waste-cea', origin: 'ai', confidence: 0.9, rationale: 'Recital 2 directly implements CEAP 2020; mandatory circular design requirements replace the voluntary EU Ecolabel and GPP tools.' },
    { codeId: 'code-sec-waste-esp', origin: 'ai', confidence: 0.99, rationale: 'Regulation (EU) 2024/1781 is the Ecodesign for Sustainable Products Regulation (ESPR)—the direct subject of this catalog code.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.82, rationale: 'Recitals 1 and 9 ground the regulation in achieving climate neutrality by 2050 via energy efficiency (≈36% by 2030) and resource savings.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'circular_economy\'; ESPR extends ecodesign requirements to virtually all physical products targeting durability, reparability, recyclability.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.93, rationale: 'Cross-cutting product regulation linking circular economy, energy efficiency, climate targets, chemicals and consumer protection across sectors.' },
  ],
  // CAP Strategic Plans Regulation
  'cap-strategic-plans': [
    { codeId: 'code-adapt-agri', origin: 'ai', confidence: 0.82, rationale: 'Recital 29 states climate change and extreme weather require robust risk management frameworks; CAP integrates agricultural climate adaptation.' },
    { codeId: 'code-fin-mff-biodiv', origin: 'ai', confidence: 0.76, rationale: 'Recital 7 specifies CAP must contribute to 7.5% MFF biodiversity spending in 2024 and 10% in 2026-2027—a binding financial mainstreaming target.' },
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.82, rationale: 'Recital 31 links CAP to GHG reductions and carbon sequestration; Art.63 supports peatland rewetting and paludiculture under eco-schemes.' },
    { codeId: 'code-lulucf-soil', origin: 'ai', confidence: 0.78, rationale: 'Recital 43 (GAEC standards) and Art.63 address peatland rewetting, paludiculture and soil carbon management as eco-scheme practices.' },
    { codeId: 'code-methane-agri', origin: 'ai', confidence: 0.73, rationale: 'Recital 31 references enteric fermentation and manure management as areas where CAP eco-schemes can support GHG reduction from livestock.' },
    { codeId: 'code-sec-agri-cap', origin: 'ai', confidence: 0.99, rationale: 'Regulation (EU) 2021/2115 is the CAP Strategic Plans Regulation—the direct legislative instrument for the post-2023 CAP reform.' },
    { codeId: 'code-sec-agri-f2f', origin: 'ai', confidence: 0.88, rationale: 'Recitals 30-31 explicitly state that CAP Strategic Plans must align with European Green Deal and Farm to Fork strategy objectives.' },
    { codeId: 'code-sec-agri-organic', origin: 'ai', confidence: 0.85, rationale: 'Recital 64 and Art.62 support organic farming through eco-schemes and rural development commitments; organic farming as an eco-scheme option.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'agriculture\'; regulation establishes Member State CAP Strategic Plans for 2023-2027 financed by EAGF and EAFRD.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.95, rationale: 'Core sectoral legislation governing EU agricultural support, environmental conditionality, and eco-schemes for the farming sector.' },
  ],
  // European Health Data Space
  'ehds': [
    { codeId: 'code-adapt-health', origin: 'ai', confidence: 0.68, rationale: 'Recitals 1-2 state EHDS supports health threats preparedness and pandemic response—enabling climate-sensitive disease surveillance.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.93, rationale: 'EHDS establishes interoperability standards, digital health infrastructure (MyHealth@EU), EHR system certification and data governance frameworks.' },
    { codeId: 'code-health', origin: 'ai', confidence: 0.92, rationale: 'Regulation directly governs electronic health data use for healthcare, research, policymaking, and health threats preparedness (Recital 1).' },
    { codeId: 'code-monitoring-data', origin: 'ai', confidence: 0.62, rationale: 'EHDS data platforms and interoperability standards can underpin health monitoring related to climate-sensitive diseases and environmental health.' },
    { codeId: 'domain-health', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'health\'; EHDS establishes the European Health Data Space for primary and secondary use of electronic health data.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting digital governance and data regulation enabling health data sharing, interoperability and research across EU Member States.' },
  ],
  // Water Framework Directive
  'water-framework-directive': [
    { codeId: 'code-adapt-water', origin: 'ai', confidence: 0.9, rationale: 'WFD river basin management plans directly address water allocation and supply security—core climate adaptation concerns under water stress.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.82, rationale: 'WFD requires good ecological status of water bodies, protecting aquatic biodiversity and freshwater ecosystems across the EU.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.88, rationale: 'WFD directly delivers environmental co-benefits through protection of inland surface waters, transitional waters, coastal waters and groundwater.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.84, rationale: 'WFD mandates comprehensive monitoring programmes for ongoing assessment of ecological and chemical status of water bodies.' },
    { codeId: 'code-risk-drought', origin: 'ai', confidence: 0.8, rationale: 'WFD river basin plans must address water scarcity and drought; hydrological drought is a primary climate hazard WFD measures respond to.' },
    { codeId: 'code-sec-water-wfd', origin: 'ai', confidence: 0.99, rationale: 'Directive 2000/60/EC is the Water Framework Directive itself—the direct subject of this catalog code, requiring good ecological/chemical status.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'environment\'; WFD establishes the comprehensive EU framework for water policy and protection of all water bodies.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting environmental framework requiring river basin management plans integrating water quality, ecology and chemical status.' },
  ],
  // Marine Strategy Framework Directive
  'marine-strategy-framework-directive': [
    { codeId: 'code-adapt-fish', origin: 'ai', confidence: 0.78, rationale: 'Recital 42 notes serious climate-change concerns for Arctic waters; MSFD strategies address ocean warming and acidification impacts on fisheries.' },
    { codeId: 'code-eco-ocean', origin: 'ai', confidence: 0.93, rationale: 'Art.1 and 9 define good environmental status encompassing marine biodiversity, ocean ecosystem structure and blue-carbon habitats.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.85, rationale: 'Art.13(4) requires spatial protection measures (Natura 2000, MPAs) and ecosystem-based management to protect marine biodiversity.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.87, rationale: 'Art.11 requires Member States to establish coordinated monitoring programmes for ongoing assessment of marine environmental status.' },
    { codeId: 'code-risk-slr', origin: 'ai', confidence: 0.65, rationale: 'Marine strategies cover coastal zone management including sea-level rise and storm surge as physical characteristics affecting good environmental status.' },
    { codeId: 'code-sec-water-marine', origin: 'ai', confidence: 0.99, rationale: 'Directive 2008/56/EC is the Marine Strategy Framework Directive—the direct subject of this catalog code for marine good environmental status.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'environment\'; MSFD requires Member States to achieve good environmental status in EU marine waters by 2020.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting environmental framework for marine strategy development, monitoring and programmes of measures across marine regions.' },
  ],
  // Zero Pollution Action Plan
  'zero-pollution-action-plan': [
    { codeId: 'code-adapt-cities', origin: 'ai', confidence: 0.72, rationale: 'Flagship 2 promotes urban zero-pollution via green infrastructure and depolluted sites as public green areas integrated with adaptation.' },
    { codeId: 'code-env-chem', origin: 'ai', confidence: 0.9, rationale: 'Section 2.4 cross-references Chemicals Strategy for Sustainability to phase out endocrine disruptors, PFAS, microplastics via REACH interface.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.94, rationale: 'Core objective is zero pollution as environmental protection—Targets 3-6 address ecosystem eutrophication, plastics, waste generation by 2030.' },
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.96, rationale: 'Target 1: reduce premature deaths from air pollution by >55% by 2030; proposes aligning EU air quality standards with WHO 2005 guidelines.' },
    { codeId: 'code-health-cobenefit', origin: 'ai', confidence: 0.88, rationale: 'Section 2.2 quantifies health co-benefits: EUR 330-940bn/yr cost of air pollution versus EUR 70-80bn/yr cost of air quality measures.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.72, rationale: 'Section 1 explicitly states pollution\'s most harmful impacts fall on vulnerable groups (children, elderly, poor)—framed as a justice issue.' },
    { codeId: 'code-sec-water-marine', origin: 'ai', confidence: 0.8, rationale: 'Section 2.3 calls for MSFD review by 2023 and EU threshold values for underwater noise, plastic litter and contaminants in EU seas.' },
    { codeId: 'code-sec-water-wfd', origin: 'ai', confidence: 0.85, rationale: 'Section 2.3 states achieving \'good status\' under WFD would realise zero pollution ambition; commits to better WFD implementation.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'environment\'; action plan sets 2030/2050 zero-pollution targets for air, water and soil across all EU policies.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.96, rationale: 'Cross-cutting communication integrating pollution prevention into all EU Green Deal policies with 6 quantified 2030 targets.' },
  ],
  // REACH Regulation
  'reach-regulation': [
    { codeId: 'code-env-chem', origin: 'ai', confidence: 0.99, rationale: 'Regulation (EC) 1907/2006 is the REACH Regulation—the direct subject of this catalog code, governing ECHA management of ~30,000 substances.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.9, rationale: 'REACH prevents environmental contamination from chemicals, delivering co-benefits for soil, water and air quality across the EU.' },
    { codeId: 'code-health', origin: 'ai', confidence: 0.87, rationale: 'REACH places burden of proof on industry to demonstrate chemical safety, protecting human health from hazardous substances in products.' },
    { codeId: 'code-sec-ind', origin: 'ai', confidence: 0.72, rationale: 'REACH applies to chemicals in industrial manufacturing processes; chemical industry decarbonisation pathways interface with REACH compliance.' },
    { codeId: 'code-sec-waste-esp', origin: 'ai', confidence: 0.7, rationale: 'REACH substances-of-concern framework underpins ESPR substance tracking and restriction provisions for digital product passports.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'environment\'; REACH establishes EU-wide registration, evaluation, authorisation and restriction of ~30,000 chemicals.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.92, rationale: 'Cross-cutting chemical safety regulation affecting industrial production, consumer products and environmental quality across all sectors.' },
  ],
  // F-Gas Regulation
  'f-gas-regulation': [
    { codeId: 'code-fgas', origin: 'ai', confidence: 0.99, rationale: 'Regulation (EU) 2024/573 is the revised F-Gas Regulation—the direct subject of this catalog code covering HFC phase-down and bans.' },
    { codeId: 'code-intl-unfccc', origin: 'ai', confidence: 0.78, rationale: 'Recital 2 explicitly references the Kigali Amendment to the Montreal Protocol; regulation goes beyond this UNFCCC-linked international commitment.' },
    { codeId: 'code-methane', origin: 'ai', confidence: 0.82, rationale: 'F-gases (HFCs, PFCs, SF6, NF3) are the non-CO₂ potent greenhouse gases regulated under the broader methane & non-CO₂ mitigation category.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.82, rationale: 'Art.26 requires annual reports from producers/importers/exporters on F-gas quantities produced, traded, recycled and destroyed—core MRV.' },
    { codeId: 'code-sec-build-heatpump', origin: 'ai', confidence: 0.82, rationale: 'Art.11 bans monobloc heat pumps with GWP ≥150 from 2027 and split heat pumps with GWP ≥750 from 2027, steering deployment to natural refrigerants.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.88, rationale: 'Recital 3 explicitly aligns the HFC phase-down with the European Climate Law\'s 2050 climate-neutrality objective, going beyond Kigali.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'climate\'; F-Gas Regulation targets HFCs with GWP up to 25,000× CO2, directly reducing potent greenhouse gas emissions.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.98, rationale: 'Core mitigation regulation: Art.16 phase-down schedule cuts HFC use 97.6% by 2050; Art.11 bans high-GWP equipment from 2025-2032.' },
  ],
  // Waste Framework Directive
  'waste-framework-directive': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.85, rationale: 'Art. 13 mandates waste management without risk to water, air, soil, plants or animals — direct environmental protection objective.' },
    { codeId: 'code-gov', origin: 'ai', confidence: 0.8, rationale: 'Requires MS to adopt waste management plans and waste prevention programmes; establishes governance framework with permit systems.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.82, rationale: 'Art. 37 requires Member States to report every three years on recycling targets compliance; establishes MRV obligations for waste.' },
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.98, rationale: 'Core waste/circular economy legislation — establishes waste hierarchy (prevention, reuse, recycling, recovery, disposal) under Art. 4.' },
    { codeId: 'code-sec-waste-cea', origin: 'ai', confidence: 0.9, rationale: 'Foundational text for Circular Economy Action Plan; sets up recycling targets for paper, metal, plastic, glass and bio-waste provisions.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'circular_economy\'; the WFD establishes the foundational EU waste management framework including waste hierarchy and recycling targets.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Governance and cross-cutting framework establishing definitions, hierarchy, extended producer responsibility applicable across all sectors.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.65, rationale: 'Recital 35 explicitly links separate collection of bio-waste to reducing GHG emissions from landfill; energy recovery provisions support mitigation co-benefits.' },
  ],
  // Single-Use Plastics Directive
  'single-use-plastics-directive': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.78, rationale: 'Art. 10 requires awareness-raising measures for consumers on disposal options; Art. 7 mandates product marking on environmental impacts.' },
    { codeId: 'code-eco-ocean', origin: 'ai', confidence: 0.85, rationale: '80-85% of marine litter is plastic; Directive targets marine litter reduction, referencing MSFD and SDG 14 (conserve oceans).' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.82, rationale: 'Addresses aquatic and terrestrial environmental pollution from plastic litter; references marine environmental status objectives.' },
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.97, rationale: 'Core circular/waste legislation banning 10 SUP items, establishing EPR schemes and 77%/90% separate-collection targets for plastic bottles.' },
    { codeId: 'code-sec-waste-cea', origin: 'ai', confidence: 0.88, rationale: 'Described as part of Circular Economy Action Plan; promotes re-use over single use in line with waste hierarchy.' },
    { codeId: 'code-sec-waste-plast', origin: 'ai', confidence: 0.99, rationale: 'Directly implements the EU Plastics Strategy — bans oxo-degradable plastics, mandates recycled content ≥25% in PET bottles by 2025.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'circular_economy\'; directive explicitly aims to promote transition to a circular economy for plastics (Art. 1).' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting instrument combining bans, EPR, consumption reduction targets and labelling across multiple product categories.' },
  ],
  // Packaging and Packaging Waste Regulation
  'packaging-waste-regulation': [
    { codeId: 'code-env-chem', origin: 'ai', confidence: 0.75, rationale: 'Restricts PFAS in food-contact packaging (Arts. 20-21) and maintains limits on lead, cadmium, mercury and hexavalent chromium in packaging components.' },
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.97, rationale: 'Core circular economy legislation for packaging waste; sets binding reuse/refill targets, recyclability grades, and recycled content targets for plastics by 2030.' },
    { codeId: 'code-sec-waste-cea', origin: 'ai', confidence: 0.9, rationale: 'Directly implements CEAP 2020 commitment to make all packaging reusable or recyclable by 2030; referenced extensively in recitals.' },
    { codeId: 'code-sec-waste-pkg', origin: 'ai', confidence: 0.99, rationale: 'This IS the new Packaging and Packaging Waste Regulation (PPWR) — directly corresponds to this leaf code.' },
    { codeId: 'code-sec-waste-plast', origin: 'ai', confidence: 0.88, rationale: 'Recital 6 notes plastic is \'most carbon-intensive packaging material\'; mandates minimum recycled plastic content targets (2030/2040).' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'circular_economy\'; replaces Packaging Directive with rules covering entire packaging lifecycle including reuse, recycling, recycled content.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Horizontal regulation covering all packaging types across all sectors; harmonises internal market rules under Art. 114 TFEU.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.7, rationale: 'Recital 6 states recycling plastic ~5× better than incineration for GHG reduction; plastic own-resource incentive to reduce packaging waste since 2021.' },
  ],
  // NIS2 Directive
  'nis2-directive': [
    { codeId: 'code-adapt-infra', origin: 'ai', confidence: 0.6, rationale: 'Requires resilient critical infrastructure (including water, energy, transport) to withstand cyber incidents — indirect link to infrastructure resilience.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.85, rationale: 'Covers digital infrastructure sector specifically (cloud, DNS, data centres, TLD registries); promotes AI and open-source tools for cyber defence.' },
    { codeId: 'code-gov', origin: 'ai', confidence: 0.75, rationale: 'Establishes governance architecture (Cooperation Group, CSIRTs network, EU-CyCLONe) and requires national cybersecurity strategies.' },
    { codeId: 'code-security', origin: 'ai', confidence: 0.95, rationale: 'Core security legislation: mandates cybersecurity risk-management and incident reporting for essential and important entities across critical sectors.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.78, rationale: 'Energy sector is a key covered sector; Annex I covers electricity, oil, gas, hydrogen, district heating — cybersecurity as energy security enabler.' },
    { codeId: 'domain-security', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'security\'; NIS2 is the primary EU cybersecurity directive establishing requirements across critical sectors.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Horizontal cross-sector cybersecurity governance framework covering 18+ sectors including energy, transport, water, health, digital infrastructure.' },
  ],
  // DORA (Digital Operational Resilience Act)
  'dora-regulation': [
    { codeId: 'code-adapt-fin', origin: 'ai', confidence: 0.65, rationale: 'Strengthens financial sector operational resilience — indirect climate relevance as financial sector manages climate-related ICT and operational risks.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.92, rationale: 'Comprehensively regulates ICT risk, incident reporting, resilience testing, and third-party ICT provider oversight for financial entities.' },
    { codeId: 'code-gov', origin: 'ai', confidence: 0.72, rationale: 'Requires management bodies to take full responsibility for ICT risk governance; establishes supervisory architecture through ESAs oversight roles.' },
    { codeId: 'code-security', origin: 'ai', confidence: 0.88, rationale: 'Mandates cybersecurity risk management, threat-led penetration testing (TLPT) and ICT incident reporting to prevent systemic financial-sector cyber risk.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'finance\'; DORA establishes ICT risk management and digital operational resilience requirements for the EU financial sector.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting digital governance instrument; consolidates ICT risk management rules across all financial subsectors into a single framework.' },
  ],
  // European Defence Industrial Strategy
  'european-defence-industrial-strategy': [
    { codeId: 'code-innov-cleantech', origin: 'ai', confidence: 0.5, rationale: 'EDIS promotes dual-use technologies and ramp-up of manufacturing capacity; defence innovation including drones has overlap with clean-tech scale-up.' },
    { codeId: 'code-sec-ind-crma', origin: 'ai', confidence: 0.55, rationale: 'Identifies critical raw material dependencies as EDTIB bottleneck — defence industry relies on same CRMs as clean-tech sectors (rare earths, etc.).' },
    { codeId: 'code-security-def', origin: 'ai', confidence: 0.92, rationale: 'Core climate-security nexus: strategy references need to secure access to contested domains; defence readiness against hybrid threats directly relevant.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.6, rationale: 'Strategy mentions critical infrastructure protection and energy/supply security dependencies; countering strategic dependencies in defence supply chains.' },
    { codeId: 'code-trade', origin: 'ai', confidence: 0.62, rationale: 'Addresses intra-EU defence trade (target: 35% of EU defence market by 2030) and strategic autonomy from third-country procurement dependencies.' },
    { codeId: 'domain-security', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'security\'; EDIS is the EU strategy to strengthen the European Defence Technological and Industrial Base (EDTIB).' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting strategic communication addressing defence industrial investment, procurement cooperation, and supply-chain resilience across Member States.' },
  ],
  // EU Space Programme Regulation
  'eu-space-programme': [
    { codeId: 'code-digital-twin', origin: 'ai', confidence: 0.72, rationale: 'Copernicus feeds Destination Earth digital twin initiative; recital 78 explicitly references climate adaptation and mitigation information services.' },
    { codeId: 'code-intl-unfccc', origin: 'ai', confidence: 0.6, rationale: 'Recital 26 commits space programme to mainstreaming climate actions per Paris Agreement; Copernicus supports UNFCCC carbon monitoring needs.' },
    { codeId: 'code-monitoring-data', origin: 'ai', confidence: 0.95, rationale: 'Copernicus is explicitly listed as a key data platform (EDGAR, Copernicus) for climate monitoring — provides GHG, atmosphere, ocean, land and ice data.' },
    { codeId: 'code-riskassess', origin: 'ai', confidence: 0.72, rationale: 'Copernicus supports emergency management, climate risk assessment, disaster monitoring and early warning through Earth observation services.' },
    { codeId: 'code-security', origin: 'ai', confidence: 0.7, rationale: 'Programme has explicit security dimension: GOVSATCOM, SST (space surveillance), cybersecurity of space infrastructure all addressed.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'digital\'; EU Space Programme covers Galileo (navigation), Copernicus (Earth observation) and EGNOS under one framework.' },
    { codeId: 'root-adaptation', origin: 'ai', confidence: 0.78, rationale: 'Copernicus services deliver information supporting climate change adaptation and mitigation at EU, national and local scale (recital 78).' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Cross-cutting programme with €14.8 bn budget; Copernicus provides data for climate, environment, security, agriculture, transport and ocean monitoring.' },
  ],
  // Foreign Subsidies Regulation
  'foreign-subsidies-regulation': [
    { codeId: 'code-fin-stateaid', origin: 'ai', confidence: 0.72, rationale: 'Designed as complement to EU State aid control (CEEAG); balancing test in Art. 6 weighs positive effects including EU environmental/social policy goals.' },
    { codeId: 'code-sec-ind-crma', origin: 'ai', confidence: 0.6, rationale: 'Art. 3 covers strategic sectors including critical infrastructure; foreign subsidies distorting green-tech and CRM sectors are a key policy concern.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.55, rationale: 'Covers critical infrastructure acquisitions; foreign subsidies that enable takeovers of energy/clean-tech assets raise energy security concerns.' },
    { codeId: 'code-trade', origin: 'ai', confidence: 0.95, rationale: 'Core trade governance tool: introduces notification obligations for large M&A and public procurement bids involving foreign financial contributions.' },
    { codeId: 'code-trade-wto', origin: 'ai', confidence: 0.8, rationale: 'Art. 12 and recital 69 emphasise WTO consistency; FSR complements WTO subsidies rules but applies where WTO remedies are insufficient.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'trade\'; FSR empowers the Commission to investigate distortive third-country subsidies to companies in the EU internal market.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Horizontal cross-cutting instrument covering all economic sectors; complements State aid rules and trade defence instruments.' },
  ],
  // Anti-Coercion Instrument
  'anti-coercion-instrument': [
    { codeId: 'code-gov', origin: 'ai', confidence: 0.65, rationale: 'Art. 5 creates Council implementing-act procedure; Art. 6 requires Commission-led consultations — adds cross-institutional governance layer to trade policy.' },
    { codeId: 'code-intl', origin: 'ai', confidence: 0.7, rationale: 'Art. 7 mandates international cooperation with third countries facing same coercion; ACI directly engages multilateral and bilateral diplomatic frameworks.' },
    { codeId: 'code-security', origin: 'ai', confidence: 0.72, rationale: 'Recital 15 notes legitimate climate-change concerns can justify third-country measures; ACI protects EU sovereign choices including green/climate policy.' },
    { codeId: 'code-trade', origin: 'ai', confidence: 0.97, rationale: 'Core trade legislation: establishes graduated response mechanism from dialogue to countermeasures against coercive third-country trade/investment measures.' },
    { codeId: 'code-trade-wto', origin: 'ai', confidence: 0.78, rationale: 'Art. 3 and recital 12 ground countermeasures in WTO law and ARSIWA; Commission must ensure WTO consistency; multilateral coordination is central.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.99, rationale: 'Domain field is \'trade\'; ACI provides the EU with a tool to deter and respond to third-country economic coercion via trade/investment measures.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting trade-policy instrument with broad sector coverage; response measures span tariffs, services, IP rights, and public procurement.' },
  ],
  // Corporate Sustainability Due Diligence Directive (CSDDD)
  'csddd': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.88, rationale: 'Art. 1 and Annex Part II impose due diligence on adverse environmental impacts across value chains, including pollution, biodiversity and ecosystem harms.' },
    { codeId: 'code-fin-trans-plans', origin: 'ai', confidence: 0.99, rationale: 'Art. 22 explicitly requires companies to adopt climate transition plans aligned with 1.5°C/Paris Agreement and net-zero by 2050 — core CSDDD obligation.' },
    { codeId: 'code-gov-enforce', origin: 'ai', confidence: 0.78, rationale: 'Art. 27 mandates pecuniary penalties ≥5% of global net turnover; Art. 29 creates civil liability for failing due diligence — strong enforcement regime.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.85, rationale: 'Art. 22(2)(a) requires time-bound targets for 2030 and five-year steps to 2050 based on conclusive scientific evidence for Scope 1/2/3 GHG emissions.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.88, rationale: 'Art. 22(1) requires transition plans compatible with \'climate neutrality by 2050\'; Art. 3(5) defines climate transition plan by reference to that objective.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.95, rationale: 'Domain field is \'trade\'; CSDDD imposes supply-chain due diligence obligations on large companies with operations/turnover in the EU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Cross-cutting instrument applying across all sectors; combines human-rights, environmental and climate obligations in corporate governance.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.85, rationale: 'Art. 22(2)(a) mandates time-bound 2030/2050 GHG reduction targets (Scope 1-3) and decarbonisation levers as part of mandatory transition plans.' },
  ],
  // TEN-T Regulation
  'ten-t-regulation': [
    { codeId: 'code-adapt-infra', origin: 'ai', confidence: 0.88, rationale: 'Recital 14 requires climate proofing and vulnerability/risk assessment for all projects of common interest.' },
    { codeId: 'code-fin-cef', origin: 'ai', confidence: 0.87, rationale: 'TEN-T regulation is the planning backbone that CEF (Connecting Europe Facility) funding targets; explicitly cross-referenced.' },
    { codeId: 'code-sec-altfuel', origin: 'ai', confidence: 0.92, rationale: 'Regulation mandates sufficient alternative-fuels infrastructure along TEN-T in line with AFIR (Regulation 2023/1804).' },
    { codeId: 'code-sec-altfuel-ev', origin: 'ai', confidence: 0.88, rationale: 'Requires publicly accessible EV recharging points along the network and in multimodal terminals and passenger hubs.' },
    { codeId: 'code-sec-altfuel-h2', origin: 'ai', confidence: 0.82, rationale: 'Requires examination and deployment of hydrogen refuelling stations at multimodal terminals and hubs.' },
    { codeId: 'code-sec-rail', origin: 'ai', confidence: 0.97, rationale: 'Extensive provisions on rail freight corridors, ERTMS deployment, high-speed rail and interoperability standards.' },
    { codeId: 'code-sec-rail-ertms', origin: 'ai', confidence: 0.95, rationale: 'Arts. on ERTMS require deployment on core network by 2030, extended core by 2040, comprehensive network by 2050.' },
    { codeId: 'code-sec-rail-hsr', origin: 'ai', confidence: 0.9, rationale: 'Recital 46 sets minimum speed design requirements for passenger lines and promotes a coherent high-speed rail network.' },
    { codeId: 'code-sec-road-logi', origin: 'ai', confidence: 0.8, rationale: 'Multimodal freight terminals, urban nodes, and road logistics are addressed including safe parking and rest areas.' },
    { codeId: 'code-sec-transp', origin: 'ai', confidence: 0.98, rationale: 'Core instrument governing all transport modes — rail, road, maritime, inland waterways — within the TEN-T.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'transport\'; regulation governs trans-European transport network infrastructure.' },
    { codeId: 'root-adaptation', origin: 'ai', confidence: 0.8, rationale: 'Climate resilience and adaptation of infrastructure is a cross-cutting obligation embedded throughout the regulation.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.98, rationale: 'Sector-specific legislation covering all transport modes within the TEN-T framework.' },
  ],
  // CO2 Standards for Heavy-Duty Vehicles
  'co2-hdv-regulation': [
    { codeId: 'code-jt-workers', origin: 'ai', confidence: 0.72, rationale: 'Recital 12 references Pact for Skills, reskilling/upskilling of workers in the heavy-duty vehicles sector transition.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.75, rationale: 'Recitals explicitly address just transition: reskilling in automotive supply chain, SME support, Social Climate Fund use.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.87, rationale: 'Regulation integrates monitoring and reporting of CO2 emissions from new HDVs, replacing Regulation 2018/956.' },
    { codeId: 'code-sec-road', origin: 'ai', confidence: 0.95, rationale: 'Covers all road heavy-duty vehicles including trucks, buses and trailers operating on Union roads.' },
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.9, rationale: 'Targets drive uptake of zero-emission HDVs; 90% zero-emission urban buses by 2030 and 100% from 2035 (Art. 3d).' },
    { codeId: 'code-sec-road-hdv', origin: 'ai', confidence: 0.99, rationale: 'The regulation\'s core purpose is to set CO2 standards for new heavy-duty vehicles (Art. 3a); the exact catalogue entry.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.88, rationale: '-45% CO2 reduction target from 2030 directly contributes to Fit-for-55 / 55% GHG reduction package.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.85, rationale: '-90% target from 2040 and overall roadmap framed as contribution to 2050 climate neutrality objective.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.99, rationale: 'Domain is transport; regulation directly governs heavy-duty vehicle CO2 emission standards.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.99, rationale: 'Sets binding CO2 reduction targets (-45% by 2030, -65% by 2035, -90% by 2040) for heavy-duty vehicles.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.97, rationale: 'Sector-specific regulation for road transport — heavy-duty vehicles including buses, coaches and trailers.' },
  ],
  // Euro 7 Regulation
  'euro-7-regulation': [
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.95, rationale: 'Core objective is reducing NOx, PM, PN10 and brake/tyre particles to meet zero-pollution air quality objectives.' },
    { codeId: 'code-health-cobenefit', origin: 'ai', confidence: 0.88, rationale: 'Stricter pollutant limits deliver public health co-benefits; recitals link to zero-pollution action plan targets.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.72, rationale: 'Recital 7 requires a socially just transition, targeting just transition plans for automotive-dependent regions.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.82, rationale: 'Mandates on-board monitoring (OBM) and OBFCM devices for real-world emission and fuel/energy consumption tracking.' },
    { codeId: 'code-sec-road', origin: 'ai', confidence: 0.97, rationale: 'Covers all road vehicle categories M1–M3 and N1–N3; updates emission limits for exhaust and non-exhaust pollutants.' },
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.85, rationale: 'Introduces battery durability requirements for traction batteries in EVs and PHEVs to build consumer confidence.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.99, rationale: 'Domain is transport; regulation sets type-approval emission standards for all categories of motor vehicles.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.8, rationale: 'Zero-pollution and health co-benefits cross multiple policy domains; regulation references Green Deal and 8th EAP.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.97, rationale: 'Sector-specific legislation for road transport type-approval covering cars, vans, buses, trucks and trailers.' },
  ],
  // Horizon Europe
  'horizon-europe': [
    { codeId: 'code-fin-horizon', origin: 'ai', confidence: 0.99, rationale: 'Directly establishes Horizon Europe; code-fin-horizon refers exactly to this R&I framework programme.' },
    { codeId: 'code-fin-mff', origin: 'ai', confidence: 0.85, rationale: 'Horizon Europe is a core MFF 2021–2027 programme; budget envelope is set within MFF Regulation 2020/2093.' },
    { codeId: 'code-fin-mff-mainstr', origin: 'ai', confidence: 0.88, rationale: 'Recital 74 sets 30% climate expenditure mainstreaming target for the programme\'s budget.' },
    { codeId: 'code-innov', origin: 'ai', confidence: 0.97, rationale: 'Core function is clean-tech and climate innovation R&I; EIC, EIT, missions all fund clean innovation scale-up.' },
    { codeId: 'code-innov-cleantech', origin: 'ai', confidence: 0.88, rationale: 'EIC Accelerator and EIT KICs target cleantech scale-up and market-creating innovation across clean sectors.' },
    { codeId: 'code-innov-demo', origin: 'ai', confidence: 0.82, rationale: 'Programme funds first-of-a-kind demonstrators (TRL 5-7) bridging research and industrial deployment.' },
    { codeId: 'code-innov-horizon', origin: 'ai', confidence: 0.97, rationale: 'Establishes climate missions including climate-neutral cities and adaptation mission under pillar II clusters.' },
    { codeId: 'code-sci-jrc', origin: 'ai', confidence: 0.8, rationale: 'JRC implements direct actions under the programme; recitals confirm JRC\'s customer-driven scientific evidence role.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.97, rationale: 'Domain is cross-cutting; Horizon Europe funds R&I across all sectors and policy areas.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.97, rationale: 'Framework R&I programme spanning climate, health, digital, industry and social challenges.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.9, rationale: 'Represents EUR 95.5 billion public R&I investment; major EU budget instrument steering green innovation.' },
  ],
  // European Pillar of Social Rights Action Plan
  'social-rights-action-plan': [
    { codeId: 'code-eff-poverty', origin: 'ai', confidence: 0.8, rationale: 'Body references Renovation Wave, EED revision and energy poverty alleviation for medium and low-income households.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.72, rationale: 'Commission Communication with impact assessments and a structured action plan; uses European Semester as governance tool.' },
    { codeId: 'code-jt-households', origin: 'ai', confidence: 0.88, rationale: 'Action Plan addresses energy poverty, affordable housing and Renovation Wave to support low-income households.' },
    { codeId: 'code-jt-skills', origin: 'ai', confidence: 0.93, rationale: '60% adult training target by 2030; references Pact for Skills, ESF+ and VET for green and digital transition skills.' },
    { codeId: 'code-jt-workers', origin: 'ai', confidence: 0.95, rationale: 'Sets 78% employment target by 2030; promotes job creation, social dialogue, reskilling during green/digital transitions.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.97, rationale: 'Central theme is ensuring a fair just transition to climate neutrality and digitalisation for workers and households.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.97, rationale: 'Domain is cross-cutting; action plan addresses employment, skills and social protection across all sectors.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.95, rationale: 'Governance communication setting social targets and actions that cross-cut the green and digital transitions.' },
  ],
  // Platform Workers Directive
  'platform-workers-directive': [
    { codeId: 'code-digital-ai', origin: 'ai', confidence: 0.85, rationale: 'Extensively regulates algorithmic management systems and automated decision-making by digital labour platforms.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.65, rationale: 'Introduces legal presumption of employment and enforcement tools; reflects better regulation of emerging platform economy.' },
    { codeId: 'code-jt-workers', origin: 'ai', confidence: 0.75, rationale: 'Combats false self-employment, improves worker rights and social protection coverage for platform workers.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.78, rationale: 'Addresses fair working conditions during digital transition; linked to European Pillar of Social Rights Action Plan.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Domain is digital; directive governs working conditions in digital labour platforms using algorithmic management.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Cross-cutting labour rights and data governance instrument; no direct climate mitigation or adaptation content.' },
  ],
  // European Chips Act
  'european-chips-act': [
    { codeId: 'code-digital-dc', origin: 'ai', confidence: 0.7, rationale: 'Recital 14 notes semiconductor devices reduce carbon impact; Act references energy efficiency of chip manufacturing.' },
    { codeId: 'code-fin-invest', origin: 'ai', confidence: 0.75, rationale: 'Chips Fund blending facility under InvestEU targets equity and debt for semiconductor start-ups and supply chain.' },
    { codeId: 'code-innov', origin: 'ai', confidence: 0.88, rationale: 'Chips for Europe Initiative funds R&I, pilot lines, virtual design platform and competence centres across Union.' },
    { codeId: 'code-innov-demo', origin: 'ai', confidence: 0.82, rationale: 'Supports first-of-a-kind integrated production facilities and open EU foundries as novel manufacturing demonstrators.' },
    { codeId: 'code-sec-ind-nzia', origin: 'ai', confidence: 0.72, rationale: 'Chips Act establishes strategic net-zero-relevant manufacturing capacity; complements Net-Zero Industry Act framing.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.72, rationale: 'Semiconductor supply security underpins energy infrastructure, EVs, smart grids and other green-transition hardware.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Domain is digital; regulation establishes framework for EU semiconductor ecosystem, a core digital technology.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting industrial and technology sovereignty instrument; secondary climate relevance as digital enabler.' },
  ],
  // General Data Protection Regulation (GDPR)
  'gdpr': [
    { codeId: 'code-digital-ai', origin: 'ai', confidence: 0.8, rationale: 'Art. 22 regulates automated individual decision-making and profiling; foundational for AI governance in climate data contexts.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.68, rationale: 'Introduced harmonised EU-wide enforcement via supervisory authorities and one-stop-shop; significant better-regulation reform.' },
    { codeId: 'code-monitoring-data', origin: 'ai', confidence: 0.62, rationale: 'GDPR governs processing of data on climate platforms (Climate-ADAPT, Copernicus) where personal data is involved.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Domain is digital; GDPR is the foundational EU personal data protection regulation for the digital economy.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.95, rationale: 'Cross-cutting fundamental-rights instrument applying to all sectors; no direct climate mitigation or adaptation content.' },
  ],
  // ePrivacy Directive
  'eprivacy-directive': [
    { codeId: 'code-digital-ai', origin: 'ai', confidence: 0.62, rationale: 'Sector-specific rules on tracking and profiling via cookies and traffic data overlap with AI/algorithmic governance.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.6, rationale: 'Directive established EU-wide minimum rules for telecom privacy, forming part of the digital single market regulatory framework.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.99, rationale: 'Domain is digital; directive regulates privacy in electronic communications — cookies, traffic data, unsolicited marketing.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.92, rationale: 'Cross-cutting digital privacy instrument complementing GDPR; no direct climate mitigation or adaptation content.' },
  ],
  // MiCA (Markets in Crypto-Assets)
  'mica-regulation': [
    { codeId: 'code-fin-csrd', origin: 'ai', confidence: 0.65, rationale: 'Sustainability disclosure requirements for crypto-asset issuers on environmental impacts complement CSRD/ESRS reporting.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.9, rationale: 'MiCA governs private crypto-asset capital markets — issuance, trading, custody — within the EU financial market framework.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.72, rationale: 'Fills regulatory gap for previously unregulated crypto-assets; harmonises 27 fragmented national regimes via single EU framework.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.78, rationale: 'Recital 7 mandates ESMA/EBA to develop RTS on sustainability indicators and energy/climate disclosure for crypto-assets.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Domain is finance; MiCA creates the EU regulatory framework for crypto-assets, stablecoins and service providers.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.97, rationale: 'Core financial regulation establishing authorisation, disclosure and prudential rules for crypto-asset markets.' },
  ],
  // Payment Services Directive (PSD2)
  'psd2-directive': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.72, rationale: 'Extensive payment-service-user rights, liability caps (€50), transparency and redress provisions directly protect consumers.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.75, rationale: 'PSD2 mandates open-banking APIs, strong customer authentication (SCA) and digital payment service infrastructure.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'finance\'; PSD2 regulates EU payment services and electronic payments market.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.6, rationale: 'Consumer-protection, digital-governance and supervisory-cooperation dimensions span cross-cutting policy themes.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'PSD2 governs payment service providers, open banking, third-party access and consumer protection in payment markets — core finance regulation.' },
  ],
  // MiFID II
  'mifid2-directive': [
    { codeId: 'code-ets', origin: 'ai', confidence: 0.65, rationale: 'Recital 11 explicitly addresses emission allowances (EUAs) as financial instruments under MiFID II, bringing spot EUA trading under financial-market supervision.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.7, rationale: 'MiFID II governs distribution of financial products including ESG products; 2021 amendments added sustainability-preference assessments in suitability rules.' },
    { codeId: 'code-fin-sfdr', origin: 'ai', confidence: 0.5, rationale: 'MiFID II suitability rules require advisors to consider client sustainability preferences, providing backbone for SFDR-aligned sustainable-finance product distribution.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'finance\'; MiFID II regulates investment firms, trading venues and financial instruments across the EU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.55, rationale: 'Governance requirements, market-surveillance MRV and cross-border supervisory cooperation engage cross-cutting policy themes.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.97, rationale: 'MiFID II is the core EU framework governing investment services, markets and investor protection — foundational capital-markets legislation.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.45, rationale: 'Including EUAs as financial instruments supports ETS price formation and market integrity, indirectly strengthening the carbon-pricing mitigation mechanism.' },
  ],
  // Solvency II
  'solvency2-directive': [
    { codeId: 'code-adapt-fin', origin: 'ai', confidence: 0.65, rationale: 'Insurance is the financial sector\'s primary climate-risk absorption mechanism; Solvency II capital rules govern physical-risk pricing and catastrophe reserving.' },
    { codeId: 'code-fin-insure', origin: 'ai', confidence: 0.75, rationale: 'Solvency II governs prudential adequacy of the EU insurance sector, directly relevant to closing the climate insurance-protection gap and NatCat reserving.' },
    { codeId: 'code-fin-stress', origin: 'ai', confidence: 0.72, rationale: 'SCR and ORSA frameworks are the legal basis for EIOPA climate stress tests on insurers\' physical- and transition-risk exposures.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'finance\'; Solvency II harmonises EU insurance and reinsurance capital requirements and governance.' },
    { codeId: 'root-adaptation', origin: 'ai', confidence: 0.5, rationale: 'Insurance sector adaptation covered by Solvency II (NatCat pricing, reserve requirements) forms the private-finance pillar of adaptation resilience.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.55, rationale: 'Supervisory governance, group-supervision colleges and cross-border regulatory-equivalence rules engage cross-cutting governance themes.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.97, rationale: 'Solvency II establishes risk-based capital requirements (SCR/MCR), ORSA, and group-supervisory frameworks for EU insurers — foundational financial regulation.' },
  ],
  // Capital Requirements Regulation (CRR)
  'crr-regulation': [
    { codeId: 'code-adapt-fin', origin: 'ai', confidence: 0.55, rationale: 'Physical and transition climate risks to bank loan books are addressed through CRR credit-risk, concentration-risk and stress-test provisions.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.58, rationale: 'CRR Pillar-3 disclosures underpin bank-level green-asset-ratio reporting; the green supporting-factor debate on capital for sustainable assets arose here.' },
    { codeId: 'code-fin-stress', origin: 'ai', confidence: 0.72, rationale: 'CRR\'s SREP and internal-model frameworks are the legal basis for EBA climate stress tests on banks\' physical- and transition-risk loan exposures.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.45, rationale: 'CRR\'s extensive Pillar-3 reporting requirements provide the data infrastructure extended by EBA to climate-risk disclosures and ESG Pillar-3 templates.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'finance\'; CRR sets prudential capital, liquidity and leverage rules for EU credit institutions — the Basel III single rulebook.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.55, rationale: 'Systemic-risk governance, ESRB macroprudential oversight, and cross-border supervisory cooperation are cross-cutting regulatory themes.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.97, rationale: 'CRR is the cornerstone of EU banking prudential regulation, governing capital adequacy, liquidity coverage (LCR), and large-exposure limits.' },
  ],
  // European Green Bonds Regulation
  'green-bonds-regulation': [
    { codeId: 'code-fin-bonds', origin: 'ai', confidence: 0.99, rationale: 'This regulation is the EU Green Bond Standard itself; Art. 1 establishes the \'European Green Bond\' designation, external review and disclosure requirements.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.95, rationale: 'EuGBS is a core green-finance instrument complementing SFDR, CSRD, and the Taxonomy to steer private capital to sustainable activities.' },
    { codeId: 'code-fin-tax-dnsh', origin: 'ai', confidence: 0.82, rationale: 'Art. 5(3) requires activities financed under the 15% flexibility provision to meet the generic DNSH criteria from Delegated Regulation 2021/2139.' },
    { codeId: 'code-fin-tax-mitig', origin: 'ai', confidence: 0.78, rationale: 'A primary use case for EuGB proceeds is financing climate-mitigation activities meeting Taxonomy substantial-contribution criteria for mitigation objectives.' },
    { codeId: 'code-fin-taxonomy', origin: 'ai', confidence: 0.97, rationale: 'Art. 4 requires 100% of proceeds to be allocated per EU Taxonomy technical screening criteria, tightly coupling EuGBS to the Taxonomy Regulation.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'finance\'; the EuGBS creates a voluntary EU standard for green bond issuance aligned with the EU Taxonomy.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.98, rationale: 'Directly governs private green capital markets — the European Green Bond Standard links bond proceeds to Taxonomy-aligned environmental activities.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.72, rationale: 'Recital 1 explicitly references the Paris Agreement and climate-neutrality by 2050; green bond proceeds fund low-carbon and mitigation-aligned economic activities.' },
  ],
  // Anti-Money Laundering Regulation
  'aml-regulation': [
    { codeId: 'code-gov', origin: 'ai', confidence: 0.65, rationale: 'Establishes AMLA as a new EU supervisory authority and harmonised governance/compliance obligations — substantive EU regulatory governance architecture.' },
    { codeId: 'code-gov-enforce', origin: 'ai', confidence: 0.58, rationale: 'Regulation creates enforcement mechanisms, administrative sanctions and supervisory powers for national authorities and AMLA against AML/CFT violations.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'finance\'; the AML Regulation establishes directly applicable AML/CFT rules for the EU financial system.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.55, rationale: 'AML/CFT rules are cross-cutting: they apply across financial services, real estate, high-value goods, professional services and crypto-assets.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'Regulates obliged entities (banks, PSPs, crypto-asset service providers) through CDD, beneficial-ownership transparency and cash-limit rules.' },
  ],
  // Instant Payments Regulation
  'instant-payments-regulation': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.55, rationale: 'Requires instant payment charges to not exceed regular transfer charges, providing price equity; adds payee-verification service protecting consumers from fraud.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.6, rationale: 'Mandates 24/7 real-time payment processing within 10 seconds; advances digital payments infrastructure and enables new point-of-interaction payment solutions.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'finance\'; the Instant Payments Regulation mandates real-time euro credit transfers across the EU SEPA area.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.45, rationale: 'Sanctions-screening obligations, cross-border supervisory harmonisation and financial-stability considerations engage cross-cutting governance themes.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'Amends SEPA Regulation and PSD2 to require PSPs to offer instant credit transfers in euro; primary subject is EU payments market integration and efficiency.' },
  ],
  // Habitats Directive
  'habitats-directive': [
    { codeId: 'code-adapt-eco', origin: 'ai', confidence: 0.75, rationale: 'Habitat conservation and restoration under the directive provide ecosystem-based adaptation co-benefits, increasing landscape resilience to climate impacts.' },
    { codeId: 'code-eco-n2000', origin: 'ai', confidence: 0.99, rationale: 'Directive 92/43/EEC is one of the two founding legal acts of Natura 2000; directly mandates Special Areas of Conservation (SACs) and appropriate assessments.' },
    { codeId: 'code-eco-nbs', origin: 'ai', confidence: 0.65, rationale: 'Protected habitats (wetlands, forests, grasslands) deliver nature-based solutions for carbon storage, flood protection and cooling as climate co-benefits.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.99, rationale: 'Directive requires conservation of 200+ habitat types and 1,000+ species; cornerstone of EU biodiversity strategy and Natura 2000 network establishment.' },
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.5, rationale: 'Natura 2000 habitats (peatlands, forests, wetlands) overlap directly with LULUCF sink categories; conservation helps maintain terrestrial carbon stocks.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'environment\'; the Habitats Directive is the foundational EU nature-conservation legislation.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Nature conservation is cross-cutting: the Habitats Directive intersects climate adaptation, biodiversity, ecosystem services and land-use policy.' },
  ],
  // Birds Directive
  'birds-directive': [
    { codeId: 'code-adapt-eco', origin: 'ai', confidence: 0.68, rationale: 'SPA wetlands and coastal habitats provide ecosystem-based adaptation benefits; migratory bird corridors are sensitive bio-indicators of climate-driven range shifts.' },
    { codeId: 'code-eco-n2000', origin: 'ai', confidence: 0.99, rationale: 'Art. 4 requires designation of Special Protection Areas (SPAs), which together with Habitats Directive SACs form the full Natura 2000 network.' },
    { codeId: 'code-eco-ocean', origin: 'ai', confidence: 0.55, rationale: 'Art. 4(2) specifically mandates protection of wetlands for migratory species; marine and coastal SPAs cover blue-carbon and ocean-biodiversity habitats.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.99, rationale: 'Directive 2009/147/EC protects all naturally occurring wild bird species; requires MS to maintain populations at ecologically sustainable levels (Art. 2).' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.52, rationale: 'Art. 10 requires research and population monitoring; Art. 12 mandates triennial reporting to the Commission — a structured MRV regime for species status.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'environment\'; the Birds Directive protects all wild bird species and their habitats in the EU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Wild bird conservation is cross-cutting: links to biodiversity, ecosystem health, habitat management and climate-change impacts on species distribution.' },
  ],
  // Environmental Impact Assessment Directive
  'eia-directive': [
    { codeId: 'code-adapt-eco', origin: 'ai', confidence: 0.55, rationale: 'EIA screens effects on ecosystems and biodiversity (Art. 3(a)) including cumulative and indirect impacts, supporting ecosystem-based adaptation through project-level safeguards.' },
    { codeId: 'code-eco-n2000', origin: 'ai', confidence: 0.7, rationale: 'Annex III Annex III.2(c)(v) explicitly lists Natura 2000 SPAs/SACs as sensitive locations requiring heightened EIA scrutiny, linking EIA to Habitats and Birds directives.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.92, rationale: 'Art. 3 requires assessment of effects on fauna, flora, soil, water, air, climate and landscape — the directive\'s core is environmental co-benefit and impact screening.' },
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.8, rationale: 'Arts. 6, 9 and 11 implement the Aarhus Convention: public participation, access to information and judicial review of EIA decisions are central obligations.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.65, rationale: 'EIA is a precautionary and preventive regulatory instrument; Annex III selection criteria and Annex IV information requirements embody better-regulation principles.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.5, rationale: 'Art. 12 requires Commission-MS exchange of data on thresholds and EIA experience; structured monitoring and information reporting underpins the directive\'s effectiveness review.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'environment\'; the EIA Directive requires environmental impact assessments for projects likely to have significant environmental effects.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'EIA is a procedural cross-cutting instrument applied across energy, transport, infrastructure, industry and land-use sectors to mainstream environmental considerations.' },
  ],
  // Air Quality Directive (recast)
  'air-quality-directive': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.85, rationale: 'Sets critical levels protecting vegetation and ecosystems from acid deposition and ozone; targets toxic-free environment by 2050.' },
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.85, rationale: 'Art. 49 and recital 48 grant public access to justice for air quality violations; Aarhus-aligned standing and remedies.' },
    { codeId: 'code-health', origin: 'ai', confidence: 0.96, rationale: 'Directive aims to protect human health from air pollution, grants citizens right to compensation, and targets vulnerable groups.' },
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.99, rationale: 'Core subject: revised AAQD sets stricter limit values for PM2.5 and NO2 aligned with WHO Air Quality Guidelines to protect human health.' },
    { codeId: 'code-health-cobenefit', origin: 'ai', confidence: 0.88, rationale: 'Recital 4 explicitly links pollution reduction to decarbonisation (Regulation 2021/1119); zero-pollution framed as mitigation co-benefit.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.92, rationale: 'Mandates fixed measurements, modelling, sampling point networks and standardised data reporting to Commission and EEA.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'environment\'; directive is the primary EU ambient air quality legislation (Directive 2024/2881).' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.82, rationale: 'Cross-cutting health, governance, monitoring and public engagement dimensions span mitigation co-benefits and enforcement.' },
  ],
  // Drinking Water Directive
  'drinking-water-directive': [
    { codeId: 'code-adapt-water', origin: 'ai', confidence: 0.86, rationale: 'Recital 15 mandates risk assessment reviews in response to climate-related extreme weather events threatening catchment and supply security.' },
    { codeId: 'code-env-chem', origin: 'ai', confidence: 0.8, rationale: 'Adds PFAS, microplastics and endocrine disruptors to a watch list; ECHA assesses substances for European positive lists for contact materials.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.75, rationale: 'Recital 40: promoting tap water reduces plastic usage and GHG emissions, delivering environmental co-benefits and contributing to circularity.' },
    { codeId: 'code-health', origin: 'ai', confidence: 0.93, rationale: 'Core objective is protecting human health; new parameters cover PFAS, microplastics and endocrine disruptors under precautionary principle.' },
    { codeId: 'code-sec-water', origin: 'ai', confidence: 0.98, rationale: 'Primary EU drinking water legislation: sets parametric values, risk-based monitoring, supply-system risk assessment and leakage reduction.' },
    { codeId: 'code-sec-water-wfd', origin: 'ai', confidence: 0.83, rationale: 'Recitals 15 and 18 explicitly integrate WFD catchment hazard data and require coordination with WFD monitoring to avoid duplication.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'environment\'; directive governs quality standards and access for drinking water in the EU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.8, rationale: 'Cross-cutting governance of water safety, consumer access, chemicals regulation and climate adaptation in the supply chain.' },
  ],
  // Medical Devices Regulation (MDR)
  'medical-devices-regulation': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.74, rationale: 'Implant cards, summaries of safety and clinical performance, and EUDAMED public access protect device users and patients as consumers.' },
    { codeId: 'code-health', origin: 'ai', confidence: 0.97, rationale: 'Core objective is high-level patient and user health protection; introduces EUDAMED, UDI system and stricter notified-body scrutiny.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.82, rationale: 'Creates comprehensive post-market surveillance system, EUDAMED database, vigilance reporting and clinical follow-up as MRV infrastructure.' },
    { codeId: 'domain-health', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'health\'; regulation governs medical device safety, conformity assessment and post-market surveillance across the EU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.78, rationale: 'Cross-cutting internal market governance for device safety; no direct climate link, but horizontal monitoring/governance codes apply.' },
  ],
  // Clinical Trials Regulation
  'clinical-trials-regulation': [
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.72, rationale: 'Replaces Directive 2001/20/EC with a single harmonised authorisation procedure; explicit simplification and administrative burden reduction goals.' },
    { codeId: 'code-health', origin: 'ai', confidence: 0.97, rationale: 'Core purpose: protect subject safety and rights, generate reliable clinical data, and facilitate access to innovative medicinal treatments.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.76, rationale: 'Establishes EU portal and database for trial registration, adverse event reporting and mandatory public disclosure of results.' },
    { codeId: 'domain-health', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'health\'; regulation entirely concerns clinical trial authorisation, conduct, participant protection and results disclosure.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.75, rationale: 'Harmonised EU governance framework for clinical research; cross-cutting but no substantive climate or environmental content.' },
  ],
  // General Food Law
  'general-food-law': [
    { codeId: 'code-health', origin: 'ai', confidence: 0.82, rationale: 'Primary objective is protection of human health; EFSA provides independent risk assessments to safeguard consumers.' },
    { codeId: 'code-sec-agri', origin: 'ai', confidence: 0.88, rationale: 'Covers the entire agri-food chain from production to distribution; legal basis for all downstream food and feed sector legislation.' },
    { codeId: 'code-sec-agri-food', origin: 'ai', confidence: 0.96, rationale: 'Foundational food system regulation: establishes traceability requirements, RASFF rapid alert, and EFSA scientific basis for food governance.' },
    { codeId: 'code-security-food', origin: 'ai', confidence: 0.83, rationale: 'Precautionary principle and RASFF alert system underpin EU resilience to food supply shocks; food security is an explicit objective.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'agriculture\'; regulation lays down general principles of EU food law and establishes EFSA.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.85, rationale: 'Sector-specific agri-food regulation forming the constitutional framework for food law; no direct climate mitigation content.' },
  ],
  // Organic Farming Regulation
  'organic-farming-regulation': [
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.83, rationale: 'Recitals 1 and 5 cite high biodiversity, natural resource preservation and alignment with EU biodiversity strategy as core objectives.' },
    { codeId: 'code-lulucf-soil', origin: 'ai', confidence: 0.7, rationale: 'Mandatory soil-based crop cultivation and prohibition of hydroponics supports soil carbon preservation in organic agricultural systems.' },
    { codeId: 'code-sec-agri', origin: 'ai', confidence: 0.92, rationale: 'Covers plant, livestock, aquaculture and processed food production within the CAP agriculture and food sectoral framework.' },
    { codeId: 'code-sec-agri-f2f', origin: 'ai', confidence: 0.86, rationale: 'Recital 1 explicitly links organic production to best environmental and climate action practices; directly supports Farm to Fork goals.' },
    { codeId: 'code-sec-agri-organic', origin: 'ai', confidence: 0.99, rationale: 'This IS the EU Organic Farming Regulation (2018/848); the primary instrument underlying the Farm to Fork 25% organic land target.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'agriculture\'; regulation sets EU-wide rules for organic production, labelling and certification.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.88, rationale: 'Sector-specific agricultural regulation; contributes to climate through biodiversity and soil co-benefits rather than direct GHG pricing.' },
  ],
  // General Product Safety Regulation
  'product-safety-regulation': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.98, rationale: 'Core instrument: mandatory safety requirements, Safety Gate portal, product recalls and market surveillance for all consumer products.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.74, rationale: 'Regulation explicitly addresses AI-enabled products, digitally connected devices, online marketplace obligations and cybersecurity as safety factors.' },
    { codeId: 'code-gov', origin: 'ai', confidence: 0.72, rationale: 'Establishes Safety Gate rapid alert system, Consumer Safety Network governance and market surveillance coordination across Member States.' },
    { codeId: 'domain-consumer', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'consumer\'; regulation modernises EU product safety rules for online marketplaces and AI-enabled consumer products.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.78, rationale: 'Horizontal internal market governance framework; no direct climate content — environment counted only as a consumer health risk factor.' },
  ],
  // Asylum Procedures Regulation
  'asylum-procedures-regulation': [
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.78, rationale: 'Ensures effective access to asylum procedure, free legal counselling and assistance, personal interviews and judicial review for applicants.' },
    { codeId: 'code-migration', origin: 'ai', confidence: 0.97, rationale: 'Primary asylum procedure instrument: replaces Directive 2013/32/EU, sets binding deadlines, border procedures and harmonised safeguards.' },
    { codeId: 'domain-migration', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'migration\'; regulation establishes a unified common procedure for international protection across all EU Member States.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting governance framework spanning justice, security and migration; no substantive climate content in the text.' },
  ],
  // Return Directive
  'return-directive': [
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.74, rationale: 'Art. 13 requires effective judicial remedy and free legal aid; proportionality safeguards limit coercive measures for returnees.' },
    { codeId: 'code-migration', origin: 'ai', confidence: 0.98, rationale: 'Core return instrument: defines voluntary departure, forced removal, entry bans and detention limits for irregular migrants.' },
    { codeId: 'domain-migration', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'migration\'; directive sets common EU standards for returning illegally staying third-country nationals.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.8, rationale: 'Cross-cutting governance for migration enforcement; no climate or environmental content; purely procedural migration law.' },
  ],
  // Erasmus+ Regulation
  'erasmus-plus': [
    { codeId: 'code-edu-greenskills', origin: 'ai', confidence: 0.86, rationale: 'Recital 15 explicitly names climate change, environmental protection and clean energy as forward-looking fields the Programme should support.' },
    { codeId: 'code-edu-literacy', origin: 'ai', confidence: 0.8, rationale: 'Recital 15 lists climate change and sustainable development as study areas; recital 39 commits to Paris Agreement mainstreaming and do-no-harm.' },
    { codeId: 'code-education', origin: 'ai', confidence: 0.98, rationale: 'Core instrument: learning mobility for students, teachers and trainees; institutional cooperation; Jean Monnet; youth exchanges and sport.' },
    { codeId: 'code-fin-mff-mainstr', origin: 'ai', confidence: 0.73, rationale: 'Recital 39 commits Programme to 30% MFF climate-spending target; climate actions to be identified and measured during implementation.' },
    { codeId: 'code-jt-skills', origin: 'ai', confidence: 0.78, rationale: 'Programme supports European Skills Agenda and Pact for Skills; green and digital skills explicitly highlighted for the green transition.' },
    { codeId: 'domain-education', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'education\'; regulation establishes the Erasmus+ programme 2021-2027 (EUR 26.2 bn) for education, training, youth and sport.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.82, rationale: 'Cross-cutting education and skills programme with explicit green transition and climate mainstreaming commitments across all sectors.' },
  ],
  // European Electronic Communications Code
  'eecc-directive': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.85, rationale: 'Extensive end-user protection provisions: transparency, universal service, dispute resolution, and consumer rights for telecom services.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.95, rationale: 'Core subject: regulatory framework for electronic communications (5G, fibre, spectrum management, broadband deployment).' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.8, rationale: 'Adopted under REFIT; recasts four previous telecom directives to simplify and harmonise the regulatory framework.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is \'digital\'; EECC governs electronic communications networks, spectrum, broadband and services across the EU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting governance instrument establishing regulatory framework for telecoms across all Member States via BEREC coordination.' },
  ],
  // Electricity Market Reform
  'electricity-market-regulation': [
    { codeId: 'code-eff-poverty', origin: 'ai', confidence: 0.75, rationale: 'Reform explicitly aims to protect vulnerable consumers and prevent energy poverty by redistributing CfD revenues to household customers.' },
    { codeId: 'code-renewables', origin: 'ai', confidence: 0.88, rationale: 'Accelerated renewable deployment is the central goal; offshore wind compensation and renewable auctions anchor the reform.' },
    { codeId: 'code-sec-elec', origin: 'ai', confidence: 0.98, rationale: 'Core purpose: reforms EU electricity market design — intraday markets, capacity mechanisms, price formation and forward markets.' },
    { codeId: 'code-sec-elec-cfd', origin: 'ai', confidence: 0.96, rationale: 'Art. 35 onwards mandates direct price support for new low-carbon generation in the form of two-sided contracts for difference.' },
    { codeId: 'code-sec-elec-flex', origin: 'ai', confidence: 0.9, rationale: 'Regulation introduces non-fossil flexibility support schemes, peak-shaving products and national demand-response capacity assessments.' },
    { codeId: 'code-sec-elec-market', origin: 'ai', confidence: 0.97, rationale: 'Introduces two-way CfDs as mandatory form for new public support, demand response/peak-shaving products and flexibility support schemes.' },
    { codeId: 'code-sec-elec-ppa', origin: 'ai', confidence: 0.94, rationale: 'Recitals 28–33 require MS to remove barriers to PPAs, enable guarantee schemes and foster cross-border PPA market development.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'energy\'; regulation directly amends EU electricity market rules (Regulations 2019/942 and 2019/943).' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.95, rationale: 'Core sectoral legislation redesigning the EU internal electricity market to integrate renewables and protect consumers.' },
  ],
  // European Defence Fund
  'european-defence-fund': [
    { codeId: 'code-fin-mff', origin: 'ai', confidence: 0.85, rationale: 'Art. 4 sets EUR 7.953 bn envelope aligned with MFF 2021-2027; fund contributes to 30% climate and 7.5% biodiversity mainstreaming targets.' },
    { codeId: 'code-innov', origin: 'ai', confidence: 0.82, rationale: 'Fund supports disruptive defence technologies (Art. 6) and FOAK demonstrations, targeting collaborative cross-border innovation.' },
    { codeId: 'code-security-def', origin: 'ai', confidence: 0.95, rationale: 'Establishes EUR 7.95 bn fund for collaborative defence R&D, directly addressing the EU defence-security nexus and strategic autonomy.' },
    { codeId: 'domain-security', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is explicitly \'security\'; the fund exclusively finances collaborative defence R&D across Member States.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting MFF instrument supporting defence industrial capacity and EU strategic autonomy.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.8, rationale: 'Fund provides EU budget financing (grants, prizes, procurement) under MFF 2021-2027; financial governance is central.' },
  ],
  // Just Transition Fund
  'just-transition-fund': [
    { codeId: 'code-fin-cohesion', origin: 'ai', confidence: 0.82, rationale: 'JTF resources programmed under cohesion policy (Reg. 2021/1060) alongside ERDF and ESF+; co-financing rates mirror cohesion rules.' },
    { codeId: 'code-fin-jtf', origin: 'ai', confidence: 0.99, rationale: 'Regulation (EU) 2021/1056 is the founding act of the Just Transition Fund — the direct legislative reference for this code.' },
    { codeId: 'code-fin-jtm', origin: 'ai', confidence: 0.95, rationale: 'JTF is pillar 1 of the Just Transition Mechanism; regulation references JTM pillars and territorial just transition plans (Art. 11).' },
    { codeId: 'code-jt-coal', origin: 'ai', confidence: 0.88, rationale: 'Recital 2 and Annex II explicitly target coal, lignite, peat and oil shale regions; builds on Coal Regions in Transition Platform.' },
    { codeId: 'code-jt-regions', origin: 'ai', confidence: 0.93, rationale: 'Territorial just transition plans (Art. 11) focus support on NUTS-3 regions most negatively affected by industrial transition.' },
    { codeId: 'code-jt-workers', origin: 'ai', confidence: 0.92, rationale: 'Art. 8(2)(k)–(m) support upskilling, reskilling and job-search for workers affected by the transition.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.97, rationale: 'Explicit objective: alleviating socioeconomic impacts on workers and communities in fossil-fuel and GHG-intensive industrial regions.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is explicitly \'cross-cutting\'; JTF addresses distributional socioeconomic impacts of the climate transition across regions.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Just transition is the paradigmatic cross-cutting theme linking climate policy, social cohesion, employment and regional development.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'Fund provides EUR 17.5 bn in EU budget support; financial allocation, programming and MFF mainstreaming are the core mechanisms.' },
  ],
  // International Procurement Instrument
  'ipi-regulation': [
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.65, rationale: 'Includes review, reporting obligations and Commission investigation procedures (Arts 13–14) aligned with better-regulation principles.' },
    { codeId: 'code-trade', origin: 'ai', confidence: 0.97, rationale: 'IPI creates leverage to open foreign procurement markets via restrictions on third-country bidders — core EU trade-policy instrument.' },
    { codeId: 'code-trade-wto', origin: 'ai', confidence: 0.88, rationale: 'Regulation explicitly operates in the space of non-covered procurement not bound by the WTO GPA (recitals 4–6); WTO-compatibility is central.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is explicitly \'trade\'; IPI is a common commercial policy instrument based on Art. 207(2) TFEU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Trade governance instrument with cross-cutting procurement implications across all EU sectors and contracting authorities.' },
  ],
  // Whistleblower Protection Directive
  'whistleblower-directive': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.72, rationale: 'Annex I explicitly covers environmental law as a protected domain; recital 10 highlights environmental enforcement as a key use case.' },
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.85, rationale: 'Directive establishes access to justice via internal and external reporting channels, confidentiality protections and anti-retaliation obligations.' },
    { codeId: 'code-gov-enforce', origin: 'ai', confidence: 0.9, rationale: 'Core objective is strengthening enforcement of EU law by protecting whistleblowers who report breaches to authorities or publicly.' },
    { codeId: 'code-justice-proc', origin: 'ai', confidence: 0.87, rationale: 'Creates procedural rights: reporting channels, confidentiality, time-limited authority responses, and remedies for retaliation victims.' },
    { codeId: 'domain-justice', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is explicitly \'justice\'; directive establishes legal protection framework for persons reporting EU law breaches.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Horizontal governance instrument spanning multiple policy areas including environment, finance, transport and food safety.' },
  ],
  // Roaming Regulation
  'roaming-regulation': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.9, rationale: 'Extensive consumer protection: bill-shock safeguards, transparency notices, fair-use policy rules and emergency services access while roaming.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.92, rationale: 'Recast of EU roaming rules extending Roam Like At Home until 2032, covering 5G/4G quality-of-service, wholesale caps and transparency.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is explicitly \'digital\'; regulation governs mobile roaming on public mobile communications networks.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.82, rationale: 'Consumer digital rights and internal-market harmonisation instrument spanning all Member States and telecom operators.' },
  ],
  // Seveso III Directive
  'seveso-directive': [
    { codeId: 'code-adapt-infra', origin: 'ai', confidence: 0.76, rationale: 'Art. 13 requires land-use planning to maintain safety distances between hazardous establishments and sensitive areas.' },
    { codeId: 'code-disaster', origin: 'ai', confidence: 0.88, rationale: 'Arts 12, 16–17 mandate internal/external emergency plans, response actions and post-accident notification to competent authorities.' },
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.72, rationale: 'Arts 14–15 require active public information and participation in decision-making, implementing the Aarhus Convention obligations.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.8, rationale: 'Safety reports, MAPP, notification and inspection regime (Arts 7–10, 20) constitute a comprehensive industrial monitoring framework.' },
    { codeId: 'code-risk', origin: 'ai', confidence: 0.82, rationale: 'Operators must identify major-accident scenarios including natural disasters (recital 15) and assess hazard risk to health and environment.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is explicitly \'environment\'; directive controls major-accident hazards from dangerous substances to protect health and environment.' },
    { codeId: 'root-adaptation', origin: 'ai', confidence: 0.78, rationale: 'Emergency planning, risk assessment and disaster-response requirements align with climate risk preparedness and resilience frameworks.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.8, rationale: 'Cross-sector industrial safety governance with MRV-like obligations, public access and land-use planning provisions.' },
  ],
  // Hydrogen and Gas Market Directive
  'hydrogen-gas-package': [
    { codeId: 'code-eff-poverty', origin: 'ai', confidence: 0.72, rationale: 'Recitals 54–56 include energy poverty measures for gas customers: price regulation for vulnerable households, disconnection safeguards.' },
    { codeId: 'code-renew-biogas', origin: 'ai', confidence: 0.8, rationale: 'Directive integrates sustainable biomethane into the natural gas network with priority connection rights for renewable gas producers.' },
    { codeId: 'code-renew-h2-green', origin: 'ai', confidence: 0.88, rationale: 'Recitals 13–14 establish certification of renewable hydrogen (RFNBO) and define GHG thresholds; biomethane integration in gas networks covered.' },
    { codeId: 'code-renew-h2-infra', origin: 'ai', confidence: 0.92, rationale: 'Creates hydrogen network operator rules, unbundling for hydrogen TSOs, third-party access, storage and cross-border hydrogen infrastructure.' },
    { codeId: 'code-renew-h2-low', origin: 'ai', confidence: 0.85, rationale: 'Recitals 13–14 introduce low-carbon hydrogen certification with life-cycle GHG criteria, filling gap not covered by RED III.' },
    { codeId: 'code-renew-hydrogen', origin: 'ai', confidence: 0.92, rationale: 'Directive establishes regulatory framework for renewable hydrogen markets, certification of RFNBO and low-carbon hydrogen, and backbone infrastructure.' },
    { codeId: 'code-sec-gas', origin: 'ai', confidence: 0.97, rationale: 'Recast of Directive 2009/73/EC; establishes common rules for internal markets in natural gas including security of supply and market design.' },
    { codeId: 'code-sec-gas-pkg', origin: 'ai', confidence: 0.99, rationale: 'Directive (EU) 2024/1788 is the Gas and Hydrogen Market Directive — the primary legislative reference for this code.' },
    { codeId: 'code-sec-gas-sos', origin: 'ai', confidence: 0.78, rationale: 'Directive addresses security of gas supply by diversifying away from Russian fossil gas (REPowerEU context) and setting SoS obligations.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'energy\'; directive creates regulatory framework for hydrogen markets and reformed natural gas rules.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.95, rationale: 'Core sectoral legislation governing gas and hydrogen internal markets, unbundling, network access and consumer protection.' },
  ],
  // TEN-E Regulation
  'ten-e-regulation': [
    { codeId: 'code-fin-cef', origin: 'ai', confidence: 0.88, rationale: 'Projects of Common Interest are eligible for EU financial assistance under the Connecting Europe Facility (CEF, Reg. 2021/1153).' },
    { codeId: 'code-renew-h2-infra', origin: 'ai', confidence: 0.92, rationale: 'Recital 16 and Annex create new TEN-E category for hydrogen transmission and storage infrastructure including electrolyser facilities.' },
    { codeId: 'code-renew-wind-off', origin: 'ai', confidence: 0.88, rationale: 'Recitals 22–23 establish offshore grid priority corridors for renewable energy (300 GW offshore wind target by 2050) and hybrid projects.' },
    { codeId: 'code-sec-elec-grid', origin: 'ai', confidence: 0.93, rationale: 'Priority corridors cover electricity transmission, offshore grids, interconnectors and smart electricity grids (Annex I and II).' },
    { codeId: 'code-sec-elec-tyndp', origin: 'ai', confidence: 0.98, rationale: 'Regulation is the TEN-E Regulation itself; establishes Projects of Common Interest, TYNDP basis and grid interconnection targets.' },
    { codeId: 'code-sec-gas-pkg', origin: 'ai', confidence: 0.78, rationale: 'Regulation amends Reg. 715/2009 and Dir. 2009/73/EC; smart gas grid TEN-E category integrates biomethane and low-carbon gases.' },
    { codeId: 'code-sec-ind-ccs', origin: 'ai', confidence: 0.8, rationale: 'Recitals 18–19 and Annex II create TEN-E category for CO2 transport and storage infrastructure for unavoidable industrial emissions.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.82, rationale: 'Art. 1 states TEN-E objectives include achieving climate neutrality by 2050; Paris Agreement alignment is a cross-cutting requirement.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is explicitly \'energy\'; regulation governs trans-European energy infrastructure (TEN-E) planning and permitting.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.95, rationale: 'Core sectoral infrastructure legislation for cross-border energy networks: electricity, hydrogen, smart grids and CO2 transport.' },
  ],
  // Gigabit Infrastructure Act
  'gigabit-infrastructure-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.95, rationale: 'Regulation directly governs digital infrastructure deployment (VHCNs, fibre, 5G) and mandates digital tools for permit applications.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.75, rationale: 'Streamlines permit-granting procedures, introduces tacit approval, reduces administrative burden — core better-regulation measures.' },
    { codeId: 'code-monitoring-data', origin: 'ai', confidence: 0.6, rationale: 'Requires single information points with georeferenced data on infrastructure and civil works, supporting digital data platforms.' },
    { codeId: 'code-sec-elec-grid', origin: 'ai', confidence: 0.55, rationale: 'Text explicitly includes coordination with electricity, gas, water and transport network operators for shared civil works and infrastructure.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is explicitly \'digital\'; Act reduces costs of deploying gigabit broadband networks across the EU.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting digital infrastructure governance: harmonised permit procedures, infrastructure sharing, single information points.' },
  ],
  // REPowerEU Plan
  'repowereu-plan': [
    { codeId: 'code-efficiency', origin: 'ai', confidence: 0.9, rationale: 'Proposes raising EED binding target to 13%; promotes heat pumps, EPBD, Ecodesign; EU Save Energy communication.' },
    { codeId: 'code-fin-repwr', origin: 'ai', confidence: 0.99, rationale: 'This is the REPowerEU Plan itself; RRF amendment adds dedicated REPowerEU chapters with EUR 300 bn total finance.' },
    { codeId: 'code-fin-rrf', origin: 'ai', confidence: 0.9, rationale: 'Member States invited to add REPowerEU chapters to RRPs; EUR 225 bn in remaining RRF loans mobilised.' },
    { codeId: 'code-gov-necps', origin: 'ai', confidence: 0.78, rationale: 'Calls for updated NECPs in 2024 to deliver REPowerEU objectives; NECPs underpin investor confidence and planning.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.75, rationale: 'Calls for Social Climate Fund, skills reskilling, and protection of vulnerable households from energy price impacts.' },
    { codeId: 'code-renew-biogas', origin: 'ai', confidence: 0.87, rationale: 'Biomethane Action Plan targets 35 bcm by 2030; EUR 37 bn investment; industrial biogas partnership; CAP/RRF support.' },
    { codeId: 'code-renew-h2-infra', origin: 'ai', confidence: 0.88, rationale: 'Maps hydrogen infrastructure needs: EUR 28-38 bn for EU-internal pipelines and storage; three major import corridors.' },
    { codeId: 'code-renew-hydrogen', origin: 'ai', confidence: 0.92, rationale: 'Sets 10 Mt domestic + 10 Mt imported renewable hydrogen by 2030; hydrogen corridors, backbone infrastructure, Hydrogen Bank.' },
    { codeId: 'code-renew-solar', origin: 'ai', confidence: 0.92, rationale: 'EU Solar Rooftop Initiative, legally binding solar obligation, EU Solar Industry Alliance, 600 GW target by 2030.' },
    { codeId: 'code-renew-wind', origin: 'ai', confidence: 0.88, rationale: 'Calls for doubling offshore wind deployment rate; supply chain strengthening and accelerated permitting for wind projects.' },
    { codeId: 'code-renewables', origin: 'ai', confidence: 0.97, rationale: 'Raises RED target to 45% by 2030; sets 320 GW solar by 2025 and 600 GW by 2030; doubles heat pump deployment.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.95, rationale: 'Core objective is ending EU dependence on Russian fossil fuels; diversifies gas supply via LNG and new pipeline PCIs.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'energy\'; REPowerEU is a comprehensive energy-independence and clean-transition plan.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.9, rationale: 'Mobilises EUR 300 billion via RRF, cohesion policy, CEF, InvestEU, Innovation Fund and EIB for the energy transition.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'Accelerates clean energy transition, maintains Fit-for-55 target of at least -55% GHG by 2030 and neutrality by 2050.' },
  ],
  // Empowering Consumers (Green Claims)
  'green-claims-directive': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.98, rationale: 'Core consumer-protection instrument banning unfair commercial practices, greenwashing claims, and misleading labels.' },
    { codeId: 'code-consumer-claims', origin: 'ai', confidence: 0.99, rationale: 'Directly enacts the Green Claims / Empowering Consumers Directive; bans generic environmental claims, carbon-offset claims.' },
    { codeId: 'code-consumer-empower', origin: 'ai', confidence: 0.97, rationale: 'Directive\'s title is \'Empowering consumers for the green transition\'; harmonised durability labels, reparability scores.' },
    { codeId: 'code-consumer-repair', origin: 'ai', confidence: 0.78, rationale: 'Mandates pre-contractual reparability score and repair information; bans false claims that repair is impossible.' },
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.65, rationale: 'Amends UCPD to add specific prohibition lists and third-party verification requirements, improving regulatory clarity.' },
    { codeId: 'code-sec-waste-esp', origin: 'ai', confidence: 0.72, rationale: 'Prohibition on planned obsolescence claims and requirement for reparability score align with ESPR/circular-design objectives.' },
    { codeId: 'domain-consumer', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'consumer\'; Directive amends consumer protection law (UCPD) to crack down on greenwashing.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting governance instrument affecting labelling, claims and consumer rights across all product sectors.' },
  ],
  // Soil Monitoring Law
  'soil-monitoring-law': [
    { codeId: 'code-adapt-eco', origin: 'ai', confidence: 0.7, rationale: 'Healthy soils enhance ecosystem resilience to drought and climate impacts; biodiversity-based adaptation co-benefit.' },
    { codeId: 'code-env-soil', origin: 'ai', confidence: 0.99, rationale: 'This is the Soil Monitoring Law itself (Directive EU 2024/3365); requires soil health indicators and healthy soils by 2050.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.95, rationale: 'Directly establishes soil monitoring networks and soil health assessment — core environmental governance instrument.' },
    { codeId: 'code-lulucf-soil', origin: 'ai', confidence: 0.82, rationale: 'Soil monitoring covers peatland and cropland carbon directly relevant to LULUCF soil/peat carbon sink accounting.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.9, rationale: 'Directive mandates Member State soil monitoring networks, data reporting and indicator-based assessments — core MRV function.' },
    { codeId: 'code-sec-agri-soil', origin: 'ai', confidence: 0.92, rationale: 'Soil health central to agricultural sustainability; monitoring covers biological, chemical and physical soil properties.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'environment\'; first dedicated EU law on soil monitoring and resilience.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting environmental law: MRV framework for soil health indicators, contaminated-site remediation, 2050 target.' },
  ],
  // EU Merger Regulation
  'eu-merger-regulation': [
    { codeId: 'code-gov-better', origin: 'ai', confidence: 0.65, rationale: 'Establishes procedural rules for notification, review periods, and remedies for merger clearance — regulatory framework instrument.' },
    { codeId: 'code-gov-enforce', origin: 'ai', confidence: 0.7, rationale: 'Provides enforcement mechanism including remedies (divestitures, behavioural conditions) and potential prohibition decisions.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'trade\'; regulation governs cross-border M&A concentrations in the EU internal market.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.8, rationale: 'Cross-cutting competition governance: exclusive Commission competence over large cross-border mergers above turnover thresholds.' },
  ],
  // Farm to Fork Strategy
  'farm-to-fork-strategy': [
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.78, rationale: 'Strategy calls for reversing biodiversity loss, protecting land/soil/water, integrated with Biodiversity Strategy 2030.' },
    { codeId: 'code-lulucf-cdr', origin: 'ai', confidence: 0.75, rationale: 'Proposes EU carbon farming certification for carbon removals in agriculture and forestry under the Climate Pact.' },
    { codeId: 'code-lulucf-soil', origin: 'ai', confidence: 0.78, rationale: 'Promotes EU carbon farming initiative to reward CO2 sequestration by farmers; carbon removal certification framework.' },
    { codeId: 'code-sec-agri', origin: 'ai', confidence: 0.99, rationale: 'This is the Farm to Fork Strategy itself — the EU\'s core agricultural and food systems sustainability framework.' },
    { codeId: 'code-sec-agri-cap', origin: 'ai', confidence: 0.85, rationale: 'CAP eco-schemes, strategic plans and green conditionality are key delivery mechanisms for F2F sustainability targets.' },
    { codeId: 'code-sec-agri-f2f', origin: 'ai', confidence: 0.99, rationale: 'COM(2020) 381 is the Farm to Fork strategy; sets 25% organic, 50% pesticide reduction, 20% fertiliser reduction by 2030.' },
    { codeId: 'code-sec-agri-fert', origin: 'ai', confidence: 0.9, rationale: 'Targets 50% reduction in nutrient losses and 20% reduction in fertiliser use; integrated nutrient management action plan.' },
    { codeId: 'code-sec-agri-food', origin: 'ai', confidence: 0.9, rationale: 'Addresses sustainable food processing, retail, labelling, healthy diets, and 50% reduction in food waste by 2030.' },
    { codeId: 'code-sec-agri-live', origin: 'ai', confidence: 0.83, rationale: 'Animal sector contributes 70% of agri GHG; targets methane cuts from livestock via feed additives and manure management.' },
    { codeId: 'code-sec-agri-organic', origin: 'ai', confidence: 0.93, rationale: 'Sets explicit target of 25% of EU agricultural land under organic farming by 2030; calls for an Action Plan on organics.' },
    { codeId: 'code-sec-agri-pest', origin: 'ai', confidence: 0.93, rationale: 'Targets 50% reduction in pesticide use and risk by 2030; revision of Sustainable Use of Pesticides Directive.' },
    { codeId: 'code-security-food', origin: 'ai', confidence: 0.8, rationale: 'Dedicates section to food security under climate change and crises; Commission contingency plan for supply disruptions.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.99, rationale: 'Policy domain is \'agriculture\'; Farm to Fork is the EU\'s comprehensive sustainable food systems strategy.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.88, rationale: 'Targets GHG reduction in food chain: 20% less fertiliser, 50% less pesticides, carbon farming, methane cuts from livestock.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.92, rationale: 'Sectoral policy covering agriculture, fisheries, food processing, retail and consumption across the full food value chain.' },
  ],
  // Collective Redress Directive
  'collective-redress-directive': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.97, rationale: 'Creates EU-wide procedural mechanism for consumer collective redress via qualified entities (injunctive + redress measures).' },
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.88, rationale: 'Directive explicitly references Aarhus Convention (recital 75) and strengthens consumers\' access to justice across the EU.' },
    { codeId: 'code-gov-enforce', origin: 'ai', confidence: 0.85, rationale: 'Provides enforcement tool through court/administrative injunctions and dissuasive penalties for non-compliance with EU consumer law.' },
    { codeId: 'code-justice-dist', origin: 'ai', confidence: 0.7, rationale: 'Enables redress for mass consumer harm; addresses power asymmetry between large traders and individual consumers.' },
    { codeId: 'code-justice-proc', origin: 'ai', confidence: 0.8, rationale: 'Ensures procedural justice: transparent standing criteria for qualified entities, opt-in/opt-out mechanisms, funding disclosure.' },
    { codeId: 'domain-consumer', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is \'consumer\'; Directive establishes representative actions to protect collective consumer interests.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.88, rationale: 'Cross-cutting access-to-justice mechanism covering over 60 EU directives including GDPR, energy, and financial services.' },
  ],
};

/** Back-compat flat view: policy id → array of code ids. Derived from
 *  POLICY_TAG_ASSIGNMENTS so existing consumers (seed, navigator chips,
 *  policy-codes API, coherence matrix) keep working unchanged. */
export const POLICY_MASTER_TAGS: Record<string, string[]> = Object.fromEntries(
  Object.entries(POLICY_TAG_ASSIGNMENTS).map(([policyId, assignments]) => [
    policyId,
    assignments.map(a => a.codeId),
  ])
);

/** The AI-generated assignments for one policy (empty array if none). */
export function getPolicyTagAssignments(policyId: string): PolicyTagAssignment[] {
  return POLICY_TAG_ASSIGNMENTS[policyId] ?? [];
}
