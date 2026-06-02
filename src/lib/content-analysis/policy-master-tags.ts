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
    { codeId: 'code-gov', origin: 'ai', confidence: 0.85, rationale: 'Creates governance framework for tracking progress and GHG budget trajectory.' },
    { codeId: 'code-gov-climatelaw', origin: 'ai', confidence: 0.98, rationale: 'Title and Art.1 establish the European Climate Law framework for climate neutrality.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.96, rationale: 'Art.1 sets binding 2030 target of at least -55% net vs 1990.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.97, rationale: 'Art.2 sets binding climate neutrality by 2050 with negative emissions thereafter.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.98, rationale: 'Policy domain is climate; flagship climate framework regulation.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.97, rationale: 'Core mitigation framework: binding emission-reduction and neutrality objective for the Union.' },
  ],
  // EU ETS Directive
  'eu-ets-directive': [
    { codeId: 'code-ets', origin: 'ai', confidence: 0.98, rationale: 'Directive 2003/87/EC explicitly establishes the EU Emissions Trading System.' },
    { codeId: 'code-ets-aviation', origin: 'ai', confidence: 0.85, rationale: 'Chapter II and Annex I cover aviation activities within ETS scope.' },
    { codeId: 'code-ets-freealloc', origin: 'ai', confidence: 0.7, rationale: 'Fit-for-55 amendments referenced; allowance allocation to stationary installations.' },
    { codeId: 'code-pricing', origin: 'ai', confidence: 0.95, rationale: 'Allowances priced per tonne CO2e, transferable - a carbon-pricing mechanism.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'climate\' per batch metadata.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.98, rationale: 'Core cap-and-trade GHG mitigation instrument per Art.1 \'reductions of greenhouse gas emissions\'.' },
  ],
  // Effort Sharing Regulation
  'effort-sharing-regulation': [
    { codeId: 'code-esr', origin: 'ai', confidence: 0.97, rationale: 'Is the Effort Sharing Regulation itself, non-ETS MS burden sharing.' },
    { codeId: 'code-esr-flex', origin: 'ai', confidence: 0.9, rationale: 'Arts 5-7 provide banking/borrowing, ETS-ESR and LULUCF flexibilities.' },
    { codeId: 'code-esr-targets', origin: 'ai', confidence: 0.95, rationale: 'Annex I sets per-MS 2030 reduction targets vs 2005; raised to -40% under FF55.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.85, rationale: 'Contributes to economy-wide -55% 2030 Fit-for-55 target.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is climate.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'Core mitigation instrument setting binding GHG reduction obligations for non-ETS sectors.' },
  ],
  // LULUCF Regulation
  'lulucf-regulation': [
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.97, rationale: 'Directly governs land use, land-use change and forestry sector accounting and sinks.' },
    { codeId: 'code-lulucf-forest', origin: 'ai', confidence: 0.85, rationale: 'Accounting for afforested/deforested and managed forest land via forest reference levels.' },
    { codeId: 'code-lulucf-harv', origin: 'ai', confidence: 0.75, rationale: 'Includes harvested wood products as a land accounting category in Article 2.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.85, rationale: 'Sets 310 Mt CO2 net-removals target for 2030 within the 2030 climate framework.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is climate; matches domain-climate code.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'Regulates GHG emissions and removals; core climate-mitigation accounting framework.' },
  ],
  // Renewable Energy Directive (RED II)
  'renewable-energy-directive': [
    { codeId: 'code-renew-hydrogen', origin: 'ai', confidence: 0.7, rationale: 'Defines renewable hydrogen (electrolysis/biogas) within the directive\'s scope.' },
    { codeId: 'code-renew-red', origin: 'ai', confidence: 0.97, rationale: 'This is the Renewable Energy Directive (RED II/III) itself, setting RES targets and rules.' },
    { codeId: 'code-renewables', origin: 'ai', confidence: 0.95, rationale: 'Sets binding 42.5% renewable share target in gross final energy consumption by 2030.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.85, rationale: 'Binding 2030 renewable target, part of the Fit-for-55 framework.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'energy\'.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'RED II promotes renewable energy to cut GHG emissions toward EU climate goals.' },
  ],
  // Energy Efficiency Directive
  'energy-efficiency-directive': [
    { codeId: 'code-eff-eed', origin: 'ai', confidence: 0.97, rationale: 'Is the recast Energy Efficiency Directive (EU) 2023/1791.' },
    { codeId: 'code-efficiency', origin: 'ai', confidence: 0.97, rationale: 'Sets binding 2030 final energy consumption reduction target.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.85, rationale: '11.7% reduction tied to -55% 2030 climate ambition.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is energy.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'Demand-side efficiency measure central to EU climate ambition.' },
  ],
  // CBAM Regulation
  'cbam-regulation': [
    { codeId: 'code-cbam', origin: 'ai', confidence: 0.98, rationale: 'Art.1 establishes the Carbon Border Adjustment Mechanism on embedded emissions.' },
    { codeId: 'code-cbam-iron', origin: 'ai', confidence: 0.85, rationale: 'Art.2 lists iron & steel among CBAM-covered sectors.' },
    { codeId: 'code-cbam-trans', origin: 'ai', confidence: 0.9, rationale: 'Summary: transitional reporting phase from Oct 2023 before definitive regime 2026.' },
    { codeId: 'code-pricing', origin: 'ai', confidence: 0.92, rationale: 'CBAM extends carbon pricing to imports, complementing the ETS price signal.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance; border carbon levy with certificate surrender.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.9, rationale: 'Carbon pricing instrument addressing leakage to support emission-reduction goals.' },
  ],
  // EU Taxonomy Regulation
  'taxonomy-regulation': [
    { codeId: 'code-fin-tax-adapt', origin: 'ai', confidence: 0.82, rationale: 'Art.9(b) lists climate change adaptation as an environmental objective.' },
    { codeId: 'code-fin-tax-dnsh', origin: 'ai', confidence: 0.85, rationale: 'Art.3(b)/Art.17 enshrine the Do No Significant Harm principle.' },
    { codeId: 'code-fin-tax-mitig', origin: 'ai', confidence: 0.9, rationale: 'Art.10 defines substantial contribution to climate change mitigation.' },
    { codeId: 'code-fin-taxonomy', origin: 'ai', confidence: 0.98, rationale: 'Regulation 2020/852 establishes the EU Taxonomy classification system.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'finance\' per batch metadata.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.97, rationale: 'Framework to facilitate sustainable investment, channelling private capital (Recital 2).' },
  ],
  // Sustainable Finance Disclosure Regulation
  'sfdr': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.9, rationale: 'Targets capital markets transparency, sustainability risk and adverse impacts.' },
    { codeId: 'code-fin-sfdr', origin: 'ai', confidence: 0.97, rationale: 'Is the SFDR; disclosure regulation for asset managers/advisers.' },
    { codeId: 'code-fin-taxonomy', origin: 'ai', confidence: 0.7, rationale: 'Sustainable-investment definitions interface with EU Taxonomy classification.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'Private-finance disclosure regulation steering capital allocation.' },
  ],
  // CO2 Standards for Cars
  'co2-cars-regulation': [
    { codeId: 'code-sec-road-cars', origin: 'ai', confidence: 0.97, rationale: 'Sets light-duty CO2 standards including 100% reduction (2035 ICE phase-out).' },
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.8, rationale: '100% CO2 reduction effectively mandates zero-emission/EV uptake for new fleets.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.75, rationale: 'Amended under Fit for 55 with 55%/50% 2030 fleet targets supporting -55%.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is transport; matches domain-transport code.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector-specific legislation setting CO2 standards for road transport vehicles.' },
  ],
  // Alternative Fuels Infrastructure Regulation
  'afir-regulation': [
    { codeId: 'code-sec-altfuel', origin: 'ai', confidence: 0.97, rationale: 'AFIR is the Alternative Fuels Infrastructure Regulation establishing deployment targets.' },
    { codeId: 'code-sec-altfuel-ev', origin: 'ai', confidence: 0.95, rationale: 'Mandatory EV recharging deployment targets along the TEN-T network.' },
    { codeId: 'code-sec-altfuel-h2', origin: 'ai', confidence: 0.9, rationale: 'Sets mandatory hydrogen refuelling infrastructure targets.' },
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.72, rationale: 'Infrastructure designed to enable zero-emission vehicle (EV) uptake.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'transport\'.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector-specific transport-infrastructure regulation for alternative fuels.' },
  ],
  // Energy Performance of Buildings Directive
  'epbd-recast': [
    { codeId: 'code-sec-build', origin: 'ai', confidence: 0.97, rationale: 'Governs energy performance of EU building stock.' },
    { codeId: 'code-sec-build-epbd', origin: 'ai', confidence: 0.97, rationale: 'Is the EPBD recast Directive (EU) 2024/1275.' },
    { codeId: 'code-sec-build-mepsr', origin: 'ai', confidence: 0.9, rationale: 'Sets minimum energy performance standards for existing buildings.' },
    { codeId: 'code-sec-build-renov', origin: 'ai', confidence: 0.8, rationale: 'Linked to renovation wave, zero-emission stock by 2050.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is energy.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.95, rationale: 'Sector-specific buildings legislation.' },
  ],
  // European Green Deal
  'eu-green-deal': [
    { codeId: 'code-gov', origin: 'ai', confidence: 0.85, rationale: 'Sets the strategic policy framework and review of climate instruments by June 2021.' },
    { codeId: 'code-gov-climatelaw', origin: 'ai', confidence: 0.8, rationale: 'Announces proposal of a European Climate Law to enshrine 2050 neutrality.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.82, rationale: 'Commits to raise 2030 ambition towards -55% vs 1990.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.9, rationale: 'Aims for no net GHG emissions by 2050 as new growth strategy.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.97, rationale: 'Policy domain cross-cutting; blueprint communication for Fit for 55.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.95, rationale: 'Overarching cross-sector strategy spanning climate, energy, industry, transport, biodiversity.' },
  ],
  // Fit for 55 Package
  'fit-for-55': [
    { codeId: 'code-cbam', origin: 'ai', confidence: 0.82, rationale: 'Section 2.2 introduces the Carbon Border Adjustment Mechanism.' },
    { codeId: 'code-ets', origin: 'ai', confidence: 0.85, rationale: 'Strengthens EU ETS: lower cap, higher linear reduction factor, maritime inclusion.' },
    { codeId: 'code-gov-climatelaw', origin: 'ai', confidence: 0.8, rationale: 'Anchored in the European Climate Law binding 2030 and 2050 objectives.' },
    { codeId: 'code-target-2030', origin: 'ai', confidence: 0.95, rationale: 'Explicitly translates the Climate Law -55% by 2030 target into legislation.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'cross-cutting\' per batch metadata.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.97, rationale: 'Package delivers the EU\'s 2030 -55% net emission reduction target.' },
  ],
  // Social Climate Fund
  'social-climate-fund': [
    { codeId: 'code-ets2-scf', origin: 'ai', confidence: 0.9, rationale: 'SCF financed by the new ETS2 for buildings and road transport.' },
    { codeId: 'code-fin-scf', origin: 'ai', confidence: 0.97, rationale: 'Is the Social Climate Fund from ETS2 revenues for vulnerable households/transport.' },
    { codeId: 'code-jt-households', origin: 'ai', confidence: 0.85, rationale: 'Targets energy poverty and affordability for vulnerable households.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.88, rationale: 'Addresses social/distributional impacts of carbon pricing on vulnerable groups.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'Establishes a EUR65bn fund financed from ETS2 revenues.' },
  ],
  // Methane Emissions Regulation
  'methane-regulation': [
    { codeId: 'code-intl-trade', origin: 'ai', confidence: 0.7, rationale: 'Introduces import standards for fossil energy to address global methane leakage.' },
    { codeId: 'code-methane-energy', origin: 'ai', confidence: 0.97, rationale: 'First EU Methane Regulation for oil, gas and coal sector, LDAR and venting/flaring rules.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.85, rationale: 'Establishes measurement, reporting and verification (MRV) obligations for operators.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is energy; matches domain-energy code.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'Mitigates methane, a potent non-CO2 GHG, via reduction obligations.' },
  ],
  // Nature Restoration Law
  'nature-restoration-law': [
    { codeId: 'code-eco-nbs', origin: 'ai', confidence: 0.85, rationale: 'Defines and relies on nature-based solutions for restoration.' },
    { codeId: 'code-eco-nrl', origin: 'ai', confidence: 0.97, rationale: 'This is the Nature Restoration Law with binding restoration targets.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.88, rationale: 'Restores ecosystems to recover EU biodiversity by 2030/2050.' },
    { codeId: 'code-lulucf', origin: 'ai', confidence: 0.7, rationale: 'Ecosystem restoration delivers carbon sequestration / land-sink benefits.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.9, rationale: 'Matches policy domain \'climate\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Biodiversity/ecology measure with mitigation and adaptation co-benefits.' },
  ],
  // Corporate Sustainability Reporting Directive
  'csrd': [
    { codeId: 'code-fin-csrd', origin: 'ai', confidence: 0.97, rationale: 'Is the CSRD with ESRS reporting standards.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.92, rationale: 'Private-finance disclosure for capital markets.' },
    { codeId: 'code-fin-trans-plans', origin: 'ai', confidence: 0.82, rationale: 'Requires Paris-aligned transition plans and 2030/2050 targets.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'Corporate sustainability disclosure regime.' },
  ],
  // FuelEU Maritime
  'fueleu-maritime': [
    { codeId: 'code-renew-h2-green', origin: 'ai', confidence: 0.7, rationale: 'Art.5 sets RFNBO sub-target (2% from 2034) for energy used on board.' },
    { codeId: 'code-sec-mari', origin: 'ai', confidence: 0.95, rationale: 'Targets shipping emissions and alternative/renewable marine fuels.' },
    { codeId: 'code-sec-mari-fueleu', origin: 'ai', confidence: 0.98, rationale: 'Title is FuelEU Maritime; Art.4 sets well-to-wake GHG-intensity limit on marine fuels.' },
    { codeId: 'code-sec-mari-ports', origin: 'ai', confidence: 0.85, rationale: 'Art.6 mandates on-shore power supply for container/passenger ships at berth from 2030.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.97, rationale: 'Policy domain transport; regulation on maritime transport fuels.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.9, rationale: 'Reduces GHG intensity of marine energy to cut shipping emissions.' },
  ],
  // ReFuelEU Aviation
  'refueleu-aviation': [
    { codeId: 'code-renew-h2-green', origin: 'ai', confidence: 0.72, rationale: 'Synthetic aviation fuel = RFNBO from renewable hydrogen and captured CO2 (Art.3).' },
    { codeId: 'code-renewables', origin: 'ai', confidence: 0.7, rationale: 'SAF sustainability/GHG criteria defined under the Renewable Energy Directive.' },
    { codeId: 'code-sec-avi-refuel', origin: 'ai', confidence: 0.98, rationale: 'Regulation 2023/2405 is ReFuelEU Aviation, SAF blending mandates.' },
    { codeId: 'code-sec-avi-saf', origin: 'ai', confidence: 0.95, rationale: 'Mandates SAF shares incl. synthetic e-kerosene sub-quota (Art.4).' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'transport\' per batch metadata.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.95, rationale: 'Sector-specific regulation for sustainable air transport (Art.1).' },
  ],
  // Governance Regulation
  'governance-regulation': [
    { codeId: 'code-gov-gov', origin: 'ai', confidence: 0.97, rationale: 'Is EU Governance Regulation 2018/1999 itself.' },
    { codeId: 'code-gov-ltsnz', origin: 'ai', confidence: 0.85, rationale: 'Requires Member State long-term strategies.' },
    { codeId: 'code-gov-necps', origin: 'ai', confidence: 0.95, rationale: 'Requires integrated National Energy and Climate Plans.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.85, rationale: 'Creates monitoring, reporting and progress-reporting framework.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is cross-cutting.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.95, rationale: 'Cross-cutting governance framework for Energy Union and climate action.' },
  ],
  // Industrial Emissions Directive
  'industrial-emissions-directive': [
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.7, rationale: 'Integrated pollution prevention reduces industrial emissions to air, aiding air quality.' },
    { codeId: 'code-sec-ind', origin: 'ai', confidence: 0.85, rationale: 'Covers heavy-industry installations across air, water and soil emissions.' },
    { codeId: 'code-sec-ind-ied', origin: 'ai', confidence: 0.97, rationale: 'This is the Industrial Emissions Directive applying BAT and permit conditions.' },
    { codeId: 'domain-industry', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is industry; matches domain-industry code.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector legislation regulating industrial installations\' emissions and permits.' },
  ],
  // Net-Zero Industry Act
  'net-zero-industry-act': [
    { codeId: 'code-innov-cleantech', origin: 'ai', confidence: 0.85, rationale: 'Aims to scale up EU cleantech manufacturing and capture global market share.' },
    { codeId: 'code-jt-skills', origin: 'ai', confidence: 0.7, rationale: 'Establishes Net-Zero Industry Academies for workforce skills.' },
    { codeId: 'code-sec-ind-ccs', origin: 'ai', confidence: 0.78, rationale: 'Sets a 50 Mt/year CO2 injection capacity target and covers CCUS technologies.' },
    { codeId: 'code-sec-ind-nzia', origin: 'ai', confidence: 0.97, rationale: 'This is the Net-Zero Industry Act with the 40% domestic manufacturing benchmark.' },
    { codeId: 'domain-industry', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'industry\'.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Industry-focused regulation scaling clean-tech manufacturing capacity.' },
  ],
  // Critical Raw Materials Act
  'critical-raw-materials-act': [
    { codeId: 'code-sec-ind', origin: 'ai', confidence: 0.9, rationale: 'Heavy-industry input security framework.' },
    { codeId: 'code-sec-ind-crma', origin: 'ai', confidence: 0.97, rationale: 'Is the Critical Raw Materials Act with 2030 benchmarks.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.72, rationale: 'Addresses supply diversification and strategic autonomy.' },
    { codeId: 'domain-industry', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is industry.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Industry supply-chain legislation for green/digital transition.' },
  ],
  // Deforestation Regulation
  'deforestation-regulation': [
    { codeId: 'code-eco-defor', origin: 'ai', confidence: 0.98, rationale: 'EUDR on deforestation-free products; Art.4 bans non-deforestation-free commodities.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.88, rationale: 'Aims to reduce EU contribution to global biodiversity loss and forest degradation.' },
    { codeId: 'code-lulucf-forest', origin: 'ai', confidence: 0.72, rationale: 'Targets forest degradation; deforestation drives ~11% of global GHG (recital 1).' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.95, rationale: 'Policy domain agriculture; covers cattle, cocoa, coffee, palm, soya, wood commodities.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Biodiversity/ecology cross-cutting measure addressing deforestation footprint.' },
  ],
  // AI Act
  'ai-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.85, rationale: 'Comprehensive framework for AI systems, a digital-transition file.' },
    { codeId: 'code-digital-ai', origin: 'ai', confidence: 0.9, rationale: 'Regulation 2024/1689 lays down harmonised rules on artificial intelligence.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'digital\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Horizontal digital governance regulation; nearest cross-cutting root.' },
  ],
  // Digital Services Act
  'digital-services-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.8, rationale: 'Digital transition and data/platform governance regulation.' },
    { codeId: 'code-publeng-comm', origin: 'ai', confidence: 0.6, rationale: 'Content moderation and platform transparency touch climate misinformation/communication.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is digital.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Digital governance regulation; cross-cutting horizontal framework.' },
  ],
  // Digital Markets Act
  'digital-markets-act': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.7, rationale: 'Protects end users and business users via fairness and contestability rules.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.85, rationale: 'Governs digital platforms, data portability and interoperability for gatekeepers.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is digital; matches domain-digital code.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Cross-cutting digital-sector regulation; closest root for platform governance.' },
  ],
  // Data Act
  'data-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.9, rationale: 'Harmonised rules on access to and use of data from connected products.' },
    { codeId: 'code-digital-ai', origin: 'ai', confidence: 0.55, rationale: 'Data-sharing rules underpin data availability relevant to digital/AI uses.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'digital\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting data-governance regulation in the digital transition.' },
  ],
  // Cyber Resilience Act
  'cyber-resilience-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.85, rationale: 'Cybersecurity requirements for hardware/software products.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is digital.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.8, rationale: 'Digital product regulation, cross-cutting governance.' },
  ],
  // EU-UK Trade and Cooperation Agreement
  'eu-uk-tca': [
    { codeId: 'code-trade', origin: 'ai', confidence: 0.85, rationale: 'Governs EU-UK trade relationship at the climate-trade interface.' },
    { codeId: 'code-trade-fta', origin: 'ai', confidence: 0.78, rationale: 'Summary: level-playing-field commitments for environment, climate and labour standards.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.95, rationale: 'Policy domain trade; post-Brexit trade and cooperation agreement.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Trade-climate interface via level-playing-field environment/climate commitments.' },
  ],
  // Batteries Regulation
  'batteries-regulation': [
    { codeId: 'code-digital-dpp', origin: 'ai', confidence: 0.8, rationale: 'Art.14 mandates an electronic battery passport (digital product passport).' },
    { codeId: 'code-sec-elec-stor', origin: 'ai', confidence: 0.7, rationale: 'Covers EV and energy-storage batteries, key clean-energy enablers (Recital 1).' },
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.85, rationale: 'Establishes circular-economy obligations: recycled content, collection targets.' },
    { codeId: 'code-sec-waste-batt', origin: 'ai', confidence: 0.97, rationale: 'Regulation 2023/1542 is the Batteries Regulation, collection/recycling/2nd-life.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'circular_economy\' per batch metadata.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector regulation on batteries lifecycle, sustainability and recycling.' },
  ],
  // Ecodesign for Sustainable Products Regulation
  'ecodesign-sustainable-products': [
    { codeId: 'code-consumer-repair', origin: 'ai', confidence: 0.65, rationale: 'Reparability and durability requirements support right-to-repair aims.' },
    { codeId: 'code-digital-dpp', origin: 'ai', confidence: 0.85, rationale: 'Introduces Digital Product Passport under ESPR.' },
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.85, rationale: 'Sets durability, reparability, recyclability requirements in circular economy.' },
    { codeId: 'code-sec-waste-esp', origin: 'ai', confidence: 0.95, rationale: 'Is ESPR; ecodesign for sustainable products with digital product passport.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is circular_economy.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sectoral circular-economy product regulation.' },
  ],
  // CAP Strategic Plans Regulation
  'cap-strategic-plans': [
    { codeId: 'code-fin-mff-mainstr', origin: 'ai', confidence: 0.65, rationale: 'Eco-schemes and Green Deal alignment mainstream climate into farm spending.' },
    { codeId: 'code-sec-agri', origin: 'ai', confidence: 0.85, rationale: 'Reforms the Common Agricultural Policy with environmental conditionality.' },
    { codeId: 'code-sec-agri-cap', origin: 'ai', confidence: 0.97, rationale: 'This is the CAP Strategic Plans Regulation for the 2023-2027 reform.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is agriculture; matches domain-agriculture code.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector-specific agriculture policy reform via national CAP Strategic Plans.' },
  ],
  // European Health Data Space
  'ehds': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.85, rationale: 'Establishes interoperability/security framework for exchanging electronic health data.' },
    { codeId: 'code-health', origin: 'ai', confidence: 0.8, rationale: 'Health Data Space enabling individual control and secondary use for research.' },
    { codeId: 'domain-health', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'health\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.82, rationale: 'Cross-cutting health-data governance framework.' },
  ],
  // Water Framework Directive
  'water-framework-directive': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.75, rationale: 'Ecological/chemical status of waters, environmental protection.' },
    { codeId: 'code-sec-water', origin: 'ai', confidence: 0.93, rationale: 'Framework for protecting EU water resources.' },
    { codeId: 'code-sec-water-wfd', origin: 'ai', confidence: 0.97, rationale: 'Is the Water Framework Directive 2000/60/EC.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is environment.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector legislation governing water bodies.' },
  ],
  // Marine Strategy Framework Directive
  'marine-strategy-framework-directive': [
    { codeId: 'code-eco-ocean', origin: 'ai', confidence: 0.72, rationale: 'Protects marine ecosystems; relevant to ocean and blue-carbon habitats.' },
    { codeId: 'code-sec-water', origin: 'ai', confidence: 0.85, rationale: 'Establishes marine regions, monitoring and assessment of water quality.' },
    { codeId: 'code-sec-water-marine', origin: 'ai', confidence: 0.95, rationale: 'MSFD: marine strategies and good environmental status by 2020 (catalog leaf).' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Policy domain environment; protection of the marine environment.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.85, rationale: 'Sectoral water/marine legislation requiring good environmental status of marine waters.' },
  ],
  // Zero Pollution Action Plan
  'zero-pollution-action-plan': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.88, rationale: 'Targets air, water and soil pollution reduction to non-harmful levels by 2050.' },
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.8, rationale: 'Key 2030 targets to cut air pollution harmful to health.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'environment\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting Green Deal action plan integrating pollution prevention across policies.' },
  ],
  // REACH Regulation
  'reach-regulation': [
    { codeId: 'code-env-chem', origin: 'ai', confidence: 0.95, rationale: 'Is REACH; registration, evaluation, authorisation and restriction of chemicals.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.85, rationale: 'Manages environmental and health impacts of chemical substances via ECHA.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is environment.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.8, rationale: 'Cross-cutting environmental chemicals regulatory framework.' },
  ],
  // F-Gas Regulation
  'f-gas-regulation': [
    { codeId: 'code-fgas', origin: 'ai', confidence: 0.97, rationale: 'This is the F-Gas Regulation with HFC phase-down schedule.' },
    { codeId: 'code-sec-build-heatpump', origin: 'ai', confidence: 0.65, rationale: 'Bans/limits F-gases in heat pumps and air conditioning equipment.' },
    { codeId: 'code-target-2050', origin: 'ai', confidence: 0.75, rationale: 'Phase-down aligned with European Climate Law climate neutrality by 2050.' },
    { codeId: 'domain-climate', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is climate; matches domain-climate code.' },
    { codeId: 'root-mitigation', origin: 'ai', confidence: 0.95, rationale: 'Reduces high-GWP fluorinated GHG emissions to support climate neutrality.' },
  ],
  // Waste Framework Directive
  'waste-framework-directive': [
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.95, rationale: 'Core EU waste-management framework with recycling targets and waste plans.' },
    { codeId: 'code-sec-waste-cea', origin: 'ai', confidence: 0.72, rationale: 'Foundational to EU circular-economy policy and recycling objectives.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'circular_economy\'.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sectoral waste/circular-economy directive establishing the waste hierarchy.' },
  ],
  // Single-Use Plastics Directive
  'single-use-plastics-directive': [
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.92, rationale: 'Reduces plastic waste, EPR and collection targets.' },
    { codeId: 'code-sec-waste-plast', origin: 'ai', confidence: 0.97, rationale: 'Is the Single-Use Plastics Directive 2019/904.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is circular_economy.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Circular-economy waste legislation.' },
  ],
  // Packaging and Packaging Waste Regulation
  'packaging-waste-regulation': [
    { codeId: 'code-sec-waste', origin: 'ai', confidence: 0.88, rationale: 'Circular-economy measure: recycled content and waste reduction targets.' },
    { codeId: 'code-sec-waste-pkg', origin: 'ai', confidence: 0.97, rationale: 'PPWR on packaging and packaging waste with reuse and recyclability targets.' },
    { codeId: 'domain-circular_economy', origin: 'ai', confidence: 0.96, rationale: 'Policy domain circular_economy; directly applicable packaging-waste rules.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.88, rationale: 'Sectoral circular-economy/waste legislation on packaging.' },
  ],
  // NIS2 Directive
  'nis2-directive': [
    { codeId: 'code-security', origin: 'ai', confidence: 0.8, rationale: 'Strengthens cybersecurity / critical-infrastructure security obligations across sectors.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.6, rationale: 'Expanded scope covers critical infrastructure incl. energy sector resilience.' },
    { codeId: 'domain-security', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'security\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.65, rationale: 'Cybersecurity directive; nearest available cross-cutting root.' },
  ],
  // DORA (Digital Operational Resilience Act)
  'dora-regulation': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.7, rationale: 'Governs digital/ICT operational resilience and third-party providers.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.7, rationale: 'Sets ICT risk requirements for banks, insurers and investment firms.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.75, rationale: 'Financial-sector operational resilience regulation.' },
  ],
  // European Defence Industrial Strategy
  'european-defence-industrial-strategy': [
    { codeId: 'code-security', origin: 'ai', confidence: 0.75, rationale: 'Addresses the EU security nexus and defence investment/procurement.' },
    { codeId: 'code-security-def', origin: 'ai', confidence: 0.85, rationale: 'Strengthens EU defence industrial base addressing security challenges.' },
    { codeId: 'domain-security', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is security; matches domain-security code.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Cross-cutting strategy on defence industry and security; no direct mitigation focus.' },
  ],
  // EU Space Programme Regulation
  'eu-space-programme': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.65, rationale: 'Consolidates Galileo, Copernicus and EGNOS digital/space infrastructure.' },
    { codeId: 'code-monitoring-data', origin: 'ai', confidence: 0.8, rationale: 'Copernicus Earth observation is a key climate monitoring/data platform.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.9, rationale: 'Matches policy domain \'digital\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.75, rationale: 'Cross-cutting EU programme; Copernicus underpins climate observation/data.' },
  ],
  // Foreign Subsidies Regulation
  'foreign-subsidies-regulation': [
    { codeId: 'code-trade', origin: 'ai', confidence: 0.8, rationale: 'Addresses distortive non-EU subsidies in the single market.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is trade.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.75, rationale: 'Trade/internal-market governance instrument.' },
  ],
  // Anti-Coercion Instrument
  'anti-coercion-instrument': [
    { codeId: 'code-trade', origin: 'ai', confidence: 0.72, rationale: 'Trade instrument enabling countermeasures incl. trade restrictions.' },
    { codeId: 'code-trade-wto', origin: 'ai', confidence: 0.6, rationale: 'Graduated trade countermeasures intersect with WTO trade-rule context.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.95, rationale: 'Policy domain trade; deters third-country economic coercion.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Cross-cutting trade-defence governance tool, climate relevance only indirect.' },
  ],
  // Corporate Sustainability Due Diligence Directive (CSDDD)
  'csddd': [
    { codeId: 'code-eco-defor', origin: 'ai', confidence: 0.6, rationale: 'Environmental due diligence on value-chain impacts incl. deforestation-type harms.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.8, rationale: 'Sustainability due diligence for large companies, private-sector value chains.' },
    { codeId: 'code-fin-trans-plans', origin: 'ai', confidence: 0.92, rationale: 'Art.1(c)/Art.3 oblige companies to adopt Paris-aligned climate transition plans.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'trade\' per batch metadata.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.78, rationale: 'Corporate accountability/disclosure file requiring transition plans; private-finance steering.' },
  ],
  // TEN-T Regulation
  'ten-t-regulation': [
    { codeId: 'code-fin-cef', origin: 'ai', confidence: 0.7, rationale: 'TEN-T network funded via Connecting Europe Facility.' },
    { codeId: 'code-sec-rail', origin: 'ai', confidence: 0.85, rationale: 'New infrastructure requirements for rail and multimodal terminals.' },
    { codeId: 'code-sec-road-logi', origin: 'ai', confidence: 0.6, rationale: 'Multimodal terminals support freight logistics and modal shift.' },
    { codeId: 'code-sec-transp', origin: 'ai', confidence: 0.92, rationale: 'Revises trans-European transport network across modes.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is transport.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sectoral transport infrastructure network regulation.' },
  ],
  // CO2 Standards for Heavy-Duty Vehicles
  'co2-hdv-regulation': [
    { codeId: 'code-sec-road-ev', origin: 'ai', confidence: 0.75, rationale: 'Mandates 90%/100% zero-emission urban buses by 2030/2035.' },
    { codeId: 'code-sec-road-hdv', origin: 'ai', confidence: 0.97, rationale: 'Sets HDV CO2 reduction targets -45%/-65%/-90% to 2040.' },
    { codeId: 'code-target-2040', origin: 'ai', confidence: 0.7, rationale: 'Includes a -90% 2040 reduction target for new HDVs.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is transport; matches domain-transport code.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector legislation setting CO2 standards for heavy-duty vehicles.' },
  ],
  // Euro 7 Regulation
  'euro-7-regulation': [
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.8, rationale: 'Stricter NOx and particulate limits to reduce air pollution and health harm.' },
    { codeId: 'code-sec-road', origin: 'ai', confidence: 0.88, rationale: 'Emission standards for cars, vans, buses, trucks and trailers.' },
    { codeId: 'code-sec-waste-batt', origin: 'ai', confidence: 0.6, rationale: 'Introduces EV battery durability requirements.' },
    { codeId: 'domain-transport', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'transport\'.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sectoral road-transport regulation setting vehicle pollutant emission limits.' },
  ],
  // Horizon Europe
  'horizon-europe': [
    { codeId: 'code-fin-horizon', origin: 'ai', confidence: 0.95, rationale: 'Is the Horizon Europe R&I framework programme.' },
    { codeId: 'code-innov', origin: 'ai', confidence: 0.85, rationale: 'Supports research and innovation including climate missions.' },
    { codeId: 'code-innov-horizon', origin: 'ai', confidence: 0.85, rationale: 'Funds climate-relevant Horizon Europe missions.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is cross-cutting.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.85, rationale: 'EUR 95.5bn R&I framework programme funding.' },
  ],
  // European Pillar of Social Rights Action Plan
  'social-rights-action-plan': [
    { codeId: 'code-jt-households', origin: 'ai', confidence: 0.7, rationale: 'Targets 15 million fewer people at risk of poverty.' },
    { codeId: 'code-jt-skills', origin: 'ai', confidence: 0.75, rationale: 'Sets target of 60% of adults in training annually (skills/reskilling).' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.82, rationale: 'Explicitly aims for a fair green transition with social-protection targets.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.95, rationale: 'Policy domain cross-cutting; social-rights action plan with 2030 targets.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting just-transition framework ensuring a fair green and digital transition.' },
  ],
  // Platform Workers Directive
  'platform-workers-directive': [
    { codeId: 'code-digital-ai', origin: 'ai', confidence: 0.65, rationale: 'Regulates algorithmic management, transparency and contesting automated decisions.' },
    { codeId: 'code-jt-workers', origin: 'ai', confidence: 0.7, rationale: 'Improves working conditions and employment status of platform workers.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'digital\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.6, rationale: 'Labour/digital-governance directive; nearest cross-cutting root.' },
  ],
  // European Chips Act
  'european-chips-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.75, rationale: 'Strengthens EU semiconductor/digital technology ecosystem.' },
    { codeId: 'code-innov-cleantech', origin: 'ai', confidence: 0.7, rationale: 'Mobilises EUR43bn to scale up advanced chip manufacturing in EU.' },
    { codeId: 'code-innov-demo', origin: 'ai', confidence: 0.7, rationale: 'Supports first-of-a-kind production facilities.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is digital.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.75, rationale: 'Cross-cutting industrial/innovation framework for semiconductors.' },
  ],
  // General Data Protection Regulation (GDPR)
  'gdpr': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.65, rationale: 'Gives individuals control over personal data, consent and breach notification.' },
    { codeId: 'code-digital', origin: 'ai', confidence: 0.85, rationale: 'Establishes comprehensive personal data protection and processing rules.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is digital; matches domain-digital code.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.65, rationale: 'Cross-cutting data-protection framework; closest root for digital/data governance.' },
  ],
  // ePrivacy Directive
  'eprivacy-directive': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.82, rationale: 'Regulates privacy in electronic communications, cookies and tracking.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'digital\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.75, rationale: 'Cross-cutting digital/privacy directive for electronic communications.' },
  ],
  // MiCA (Markets in Crypto-Assets)
  'mica-regulation': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.7, rationale: 'Capital-markets rules for crypto issuance and service providers.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.85, rationale: 'Financial-markets regulation for crypto-assets.' },
  ],
  // Payment Services Directive (PSD2)
  'psd2-directive': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.55, rationale: 'Relates to private financial-sector/capital-markets regulation (closest available).' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.92, rationale: 'Policy domain finance; modernises EU payment services and open banking.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.5, rationale: 'Payments-regulation governance; no direct climate content, anchored cross-cutting.' },
  ],
  // MiFID II
  'mifid2-directive': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.78, rationale: 'Capital-markets framework: trading venues, intermediaries, investor protection.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'finance\' per batch metadata.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.8, rationale: 'Comprehensive regulation of EU financial markets and investment services.' },
  ],
  // Solvency II
  'solvency2-directive': [
    { codeId: 'code-adapt-fin', origin: 'ai', confidence: 0.6, rationale: 'Insurer capital/risk framework relevant to physical-risk pricing and insurance.' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.7, rationale: 'Capital, governance and disclosure framework for insurers/reinsurers.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.8, rationale: 'Insurance prudential regulation; risk-based capital framework.' },
  ],
  // Capital Requirements Regulation (CRR)
  'crr-regulation': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.75, rationale: 'Sets capital, liquidity and leverage requirements for banks/investment firms.' },
    { codeId: 'code-fin-stress', origin: 'ai', confidence: 0.6, rationale: 'Basel III prudential single rulebook underpins supervisory/climate stress testing.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is finance; matches domain-finance code.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.85, rationale: 'Prudential financial-sector regulation; closest root for banking rules.' },
  ],
  // European Green Bonds Regulation
  'green-bonds-regulation': [
    { codeId: 'code-fin-bonds', origin: 'ai', confidence: 0.97, rationale: 'Establishes the voluntary EU Green Bond Standard (EuGBS).' },
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.8, rationale: 'Private-finance labelling/disclosure with external review and impact reporting.' },
    { codeId: 'code-fin-taxonomy', origin: 'ai', confidence: 0.85, rationale: 'Requires proceeds allocated to EU Taxonomy-aligned activities.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'finance\'.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'Green-finance instrument creating the European Green Bond Standard.' },
  ],
  // Anti-Money Laundering Regulation
  'aml-regulation': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.65, rationale: 'Financial-sector due diligence and transparency rules.' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is finance.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.85, rationale: 'Single EU AML/CFT financial rulebook.' },
  ],
  // Instant Payments Regulation
  'instant-payments-regulation': [
    { codeId: 'code-fin-priv', origin: 'ai', confidence: 0.55, rationale: 'Private financial-sector/payment-services regulation (closest available leaf).' },
    { codeId: 'domain-finance', origin: 'ai', confidence: 0.92, rationale: 'Policy domain finance; mandates instant euro credit transfers.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.5, rationale: 'Payments regulation; no direct climate content, anchored cross-cutting.' },
  ],
  // Habitats Directive
  'habitats-directive': [
    { codeId: 'code-eco-n2000', origin: 'ai', confidence: 0.95, rationale: 'Establishes the Natura 2000 network under the Habitats & Birds directives.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.9, rationale: 'Cornerstone EU nature-conservation policy protecting habitats and species.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'environment\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Biodiversity/ecology is a cross-cutting root in the taxonomy.' },
  ],
  // Birds Directive
  'birds-directive': [
    { codeId: 'code-eco-n2000', origin: 'ai', confidence: 0.95, rationale: 'Designates Special Protection Areas under Natura 2000 network.' },
    { codeId: 'code-ecology', origin: 'ai', confidence: 0.9, rationale: 'Protects wild bird species, habitats and biodiversity.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is environment.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.85, rationale: 'Cross-cutting biodiversity/nature protection instrument.' },
  ],
  // Environmental Impact Assessment Directive
  'eia-directive': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.8, rationale: 'Assesses significant environmental effects of infrastructure/energy/industrial projects.' },
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.65, rationale: 'Ensures public participation in environmental decision-making (Aarhus interface).' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is environment; matches domain-environment code.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Cross-cutting environmental governance requiring impact assessment of projects.' },
  ],
  // Air Quality Directive (recast)
  'air-quality-directive': [
    { codeId: 'code-health', origin: 'ai', confidence: 0.82, rationale: 'Grants citizens compensation rights for health damage from air pollution.' },
    { codeId: 'code-health-air', origin: 'ai', confidence: 0.95, rationale: 'Revises EU air quality standards, tighter PM2.5/NO2 limits aligned with WHO.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'environment\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.82, rationale: 'Cross-cutting health/environment directive on air quality standards.' },
  ],
  // Drinking Water Directive
  'drinking-water-directive': [
    { codeId: 'code-environment', origin: 'ai', confidence: 0.7, rationale: 'Adds PFAS, microplastics parameters; environmental protection.' },
    { codeId: 'code-sec-water', origin: 'ai', confidence: 0.92, rationale: 'Updates drinking-water quality standards and access.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is environment.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Water-sector quality legislation.' },
  ],
  // Medical Devices Regulation (MDR)
  'medical-devices-regulation': [
    { codeId: 'code-health', origin: 'ai', confidence: 0.55, rationale: 'Health-domain measure on device safety and surveillance (closest available).' },
    { codeId: 'domain-health', origin: 'ai', confidence: 0.92, rationale: 'Policy domain health; overhauls medical-devices regulatory framework.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.5, rationale: 'Health product-safety regulation; no direct climate content, anchored cross-cutting.' },
  ],
  // Clinical Trials Regulation
  'clinical-trials-regulation': [
    { codeId: 'code-health', origin: 'ai', confidence: 0.75, rationale: 'Harmonises clinical-trial conduct, transparency and participant protection.' },
    { codeId: 'domain-health', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'health\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.6, rationale: 'Health is a cross-cutting root; clinical-trials governance file.' },
  ],
  // General Food Law
  'general-food-law': [
    { codeId: 'code-sec-agri-food', origin: 'ai', confidence: 0.8, rationale: 'Sets food-system principles, traceability and EFSA.' },
    { codeId: 'code-security-food', origin: 'ai', confidence: 0.6, rationale: 'Food safety and rapid alert system underpin food-system security.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is agriculture.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.8, rationale: 'Sectoral framework governing the food system and safety.' },
  ],
  // Organic Farming Regulation
  'organic-farming-regulation': [
    { codeId: 'code-consumer-claims', origin: 'ai', confidence: 0.6, rationale: 'Tightens controls against fraud in organic labelling, substantiating claims.' },
    { codeId: 'code-sec-agri', origin: 'ai', confidence: 0.8, rationale: 'Governs agricultural production rules, certification and import requirements.' },
    { codeId: 'code-sec-agri-organic', origin: 'ai', confidence: 0.95, rationale: 'This is the EU Organic Farming Regulation on organic production and labelling.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is agriculture; matches domain-agriculture code.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sector-specific agriculture legislation modernising organic farming rules.' },
  ],
  // General Product Safety Regulation
  'product-safety-regulation': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.88, rationale: 'Modernises EU product safety rules covering online marketplaces and recalls.' },
    { codeId: 'domain-consumer', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'consumer\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.78, rationale: 'Cross-cutting consumer-protection regulation modernising product safety.' },
  ],
  // Asylum Procedures Regulation
  'asylum-procedures-regulation': [
    { codeId: 'code-migration', origin: 'ai', confidence: 0.8, rationale: 'Unified EU asylum procedure across Member States.' },
    { codeId: 'domain-migration', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is migration.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Migration governance instrument, cross-cutting.' },
  ],
  // Return Directive
  'return-directive': [
    { codeId: 'code-migration', origin: 'ai', confidence: 0.6, rationale: 'Migration policy; closest taxonomy node for mobility governance.' },
    { codeId: 'domain-migration', origin: 'ai', confidence: 0.92, rationale: 'Policy domain migration; common standards for returning irregular migrants.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.55, rationale: 'Migration governance; only indirectly linked to climate-driven mobility.' },
  ],
  // Erasmus+ Regulation
  'erasmus-plus': [
    { codeId: 'code-education', origin: 'ai', confidence: 0.8, rationale: 'Establishes the Erasmus+ education/mobility programme 2021-2027.' },
    { codeId: 'domain-education', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'education\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.6, rationale: 'Education is a cross-cutting root in the taxonomy.' },
  ],
  // European Electronic Communications Code
  'eecc-directive': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.75, rationale: 'Updates EU telecom rules, spectrum, 5G/fibre investment.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is digital.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Cross-cutting digital telecom regulatory framework.' },
  ],
  // Electricity Market Reform
  'electricity-market-regulation': [
    { codeId: 'code-eff-poverty', origin: 'ai', confidence: 0.6, rationale: 'Protects consumers from price volatility and enables energy sharing.' },
    { codeId: 'code-sec-elec-cfd', origin: 'ai', confidence: 0.85, rationale: 'Introduces two-way contracts for difference for public support.' },
    { codeId: 'code-sec-elec-market', origin: 'ai', confidence: 0.9, rationale: 'Reforms market design with CfDs, PPAs and demand response/flexibility.' },
    { codeId: 'code-sec-elec-ppa', origin: 'ai', confidence: 0.8, rationale: 'Enables power purchase agreements to integrate renewables.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is energy; matches domain-energy code.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Reforms electricity market design; sector-specific power legislation.' },
  ],
  // European Defence Fund
  'european-defence-fund': [
    { codeId: 'code-security', origin: 'ai', confidence: 0.7, rationale: 'Supports EU security via collaborative defence research and development.' },
    { codeId: 'code-security-def', origin: 'ai', confidence: 0.85, rationale: 'First EU defence R&D fund supporting defence technologies and capabilities.' },
    { codeId: 'domain-security', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'security\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.75, rationale: 'Cross-cutting EU funding instrument in the security/defence sphere.' },
  ],
  // Just Transition Fund
  'just-transition-fund': [
    { codeId: 'code-fin-jtf', origin: 'ai', confidence: 0.97, rationale: 'Is the Just Transition Fund.' },
    { codeId: 'code-jt-regions', origin: 'ai', confidence: 0.85, rationale: 'Supports coal and carbon-intensive transition regions.' },
    { codeId: 'code-jt-workers', origin: 'ai', confidence: 0.8, rationale: 'Funds worker retraining and SME diversification.' },
    { codeId: 'code-just-trans', origin: 'ai', confidence: 0.9, rationale: 'Addresses social/economic impacts on fossil-dependent regions.' },
    { codeId: 'domain-cross-cutting', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is cross-cutting.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.95, rationale: 'EUR 17.5bn fund for green-transition regional impacts.' },
  ],
  // International Procurement Instrument
  'ipi-regulation': [
    { codeId: 'code-trade', origin: 'ai', confidence: 0.68, rationale: 'Trade instrument on public-procurement market access.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.95, rationale: 'Policy domain trade; opens foreign procurement markets via reciprocity.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.6, rationale: 'Cross-cutting trade-procurement governance tool; climate relevance indirect.' },
  ],
  // Whistleblower Protection Directive
  'whistleblower-directive': [
    { codeId: 'code-gov-access', origin: 'ai', confidence: 0.62, rationale: 'Reporting channels and remedies relate to access-to-justice/transparency on EU-law breaches.' },
    { codeId: 'code-justice-proc', origin: 'ai', confidence: 0.6, rationale: 'Procedural justice: protected reporting, voice and remedies against retaliation.' },
    { codeId: 'domain-justice', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'justice\' per batch metadata.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.6, rationale: 'Justice/governance is a cross-cutting root; whistleblower-protection file.' },
  ],
  // Roaming Regulation
  'roaming-regulation': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.7, rationale: 'Extends Roam Like At Home and mobile QoS rules in the digital market.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is digital.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.65, rationale: 'Cross-cutting digital single-market consumer measure.' },
  ],
  // Seveso III Directive
  'seveso-directive': [
    { codeId: 'code-disaster', origin: 'ai', confidence: 0.65, rationale: 'Requires emergency plans and public information for industrial hazard response.' },
    { codeId: 'code-env-chem', origin: 'ai', confidence: 0.7, rationale: 'Concerns hazardous/dangerous chemical substances at industrial establishments.' },
    { codeId: 'code-environment', origin: 'ai', confidence: 0.8, rationale: 'Prevents major accidents with dangerous substances, protecting people/environment.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is environment; matches domain-environment code.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Cross-cutting industrial-accident prevention and environmental safety governance.' },
  ],
  // Hydrogen and Gas Market Directive
  'hydrogen-gas-package': [
    { codeId: 'code-renew-h2-infra', origin: 'ai', confidence: 0.85, rationale: 'Supports a European hydrogen backbone and network access rules.' },
    { codeId: 'code-sec-gas', origin: 'ai', confidence: 0.82, rationale: 'Reforms natural gas market rules alongside new hydrogen rules.' },
    { codeId: 'code-sec-gas-pkg', origin: 'ai', confidence: 0.95, rationale: 'This is the decarbonised gas & hydrogen market package.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.95, rationale: 'Matches policy domain \'energy\'.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.9, rationale: 'Sectoral gas/hydrogen market regulatory framework.' },
  ],
  // TEN-E Regulation
  'ten-e-regulation': [
    { codeId: 'code-renew-h2-infra', origin: 'ai', confidence: 0.75, rationale: 'Covers hydrogen networks and CO2 transport infrastructure.' },
    { codeId: 'code-sec-elec-grid', origin: 'ai', confidence: 0.88, rationale: 'Funds grids, offshore grids, smart grids.' },
    { codeId: 'code-sec-elec-tyndp', origin: 'ai', confidence: 0.95, rationale: 'Is the revised TEN-E Regulation for PCIs.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is energy.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.92, rationale: 'Cross-border energy infrastructure framework.' },
  ],
  // Gigabit Infrastructure Act
  'gigabit-infrastructure-act': [
    { codeId: 'code-digital', origin: 'ai', confidence: 0.58, rationale: 'Digital-transition measure on high-speed network infrastructure.' },
    { codeId: 'domain-digital', origin: 'ai', confidence: 0.92, rationale: 'Policy domain digital; speeds broadband deployment for 2030 connectivity targets.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.55, rationale: 'Digital-infrastructure governance; no direct climate content, anchored cross-cutting.' },
  ],
  // REPowerEU Plan
  'repowereu-plan': [
    { codeId: 'code-fin-repwr', origin: 'ai', confidence: 0.95, rationale: 'This is the REPowerEU plan: gas phase-out, RES acceleration, NGEU instrument.' },
    { codeId: 'code-renewables', origin: 'ai', confidence: 0.8, rationale: 'Accelerates renewables deployment to cut Russian fossil-fuel dependence.' },
    { codeId: 'code-sec-gas-sos', origin: 'ai', confidence: 0.7, rationale: 'Diversifies energy supply and addresses gas security after the invasion of Ukraine.' },
    { codeId: 'code-security-energy', origin: 'ai', confidence: 0.85, rationale: 'Ends EU dependence on Russian fossil fuels via supply diversification by 2027.' },
    { codeId: 'domain-energy', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is \'energy\' per batch metadata.' },
    { codeId: 'root-finance', origin: 'ai', confidence: 0.82, rationale: 'Plan mobilises ~EUR 300bn investment for energy independence.' },
  ],
  // Empowering Consumers (Green Claims)
  'green-claims-directive': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.85, rationale: 'Strengthens consumer protection on sustainability claims and durability.' },
    { codeId: 'code-consumer-claims', origin: 'ai', confidence: 0.88, rationale: 'Bans unsubstantiated environmental claims and regulates green labelling.' },
    { codeId: 'code-consumer-empower', origin: 'ai', confidence: 0.92, rationale: 'Is the Empowering Consumers for the Green Transition Directive.' },
    { codeId: 'domain-consumer', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is consumer.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.9, rationale: 'Cross-cutting consumer-protection measure against greenwashing.' },
  ],
  // Soil Monitoring Law
  'soil-monitoring-law': [
    { codeId: 'code-env-soil', origin: 'ai', confidence: 0.9, rationale: 'First dedicated EU soil law on soil health monitoring and strategy.' },
    { codeId: 'code-monitoring', origin: 'ai', confidence: 0.75, rationale: 'Requires Member States to establish soil monitoring networks and assessment.' },
    { codeId: 'code-sec-agri-soil', origin: 'ai', confidence: 0.8, rationale: 'Soil Monitoring Law with soil-health indicators and soil carbon relevance.' },
    { codeId: 'domain-environment', origin: 'ai', confidence: 0.9, rationale: 'Policy domain is environment; matches domain-environment code.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.7, rationale: 'Cross-cutting environmental monitoring framework for soil health.' },
  ],
  // EU Merger Regulation
  'eu-merger-regulation': [
    { codeId: 'code-trade', origin: 'ai', confidence: 0.6, rationale: 'Governs cross-border M&A and effective competition in the single market.' },
    { codeId: 'domain-trade', origin: 'ai', confidence: 0.9, rationale: 'Matches policy domain \'trade\'.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.6, rationale: 'Cross-cutting competition regulation on cross-border merger control.' },
  ],
  // Farm to Fork Strategy
  'farm-to-fork-strategy': [
    { codeId: 'code-sec-agri', origin: 'ai', confidence: 0.92, rationale: 'Agriculture and food sustainability targets.' },
    { codeId: 'code-sec-agri-f2f', origin: 'ai', confidence: 0.97, rationale: 'Is the Farm to Fork Strategy.' },
    { codeId: 'code-sec-agri-organic', origin: 'ai', confidence: 0.85, rationale: '25% organic farmland target by 2030.' },
    { codeId: 'code-sec-agri-pest', origin: 'ai', confidence: 0.85, rationale: '50% pesticide use/risk reduction target by 2030.' },
    { codeId: 'domain-agriculture', origin: 'ai', confidence: 0.95, rationale: 'Policy domain is agriculture.' },
    { codeId: 'root-sector', origin: 'ai', confidence: 0.92, rationale: 'Sustainable food-system strategy across the chain.' },
  ],
  // Collective Redress Directive
  'collective-redress-directive': [
    { codeId: 'code-consumer', origin: 'ai', confidence: 0.6, rationale: 'Consumer-protection redress across 60+ EU consumer instruments.' },
    { codeId: 'code-justice-proc', origin: 'ai', confidence: 0.62, rationale: 'Provides procedural access to redress (participation/standing) for consumers.' },
    { codeId: 'domain-consumer', origin: 'ai', confidence: 0.92, rationale: 'Policy domain consumer; representative actions on behalf of consumer groups.' },
    { codeId: 'root-crosscut', origin: 'ai', confidence: 0.55, rationale: 'Consumer/justice procedural mechanism; climate relevance only via covered laws.' },
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
