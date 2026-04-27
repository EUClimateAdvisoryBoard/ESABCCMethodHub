// ---------------------------------------------------------------------------
// Per-policy master-code assignments.
//
// Keys are Policy.id values from `@/data/policies`; values are arrays of
// master-code ids from the seeded tree (see `buildSeedSnapshot` in
// ./seed.ts for the catalog). Each entry was curated by reading the
// policy's title, domain and summary — these are the top-level tags the
// content-analysis workbench falls back to when AI pre-tagging hasn't
// been run yet.
//
// Rules of thumb used during curation:
//   - Every policy gets one of the five root codes at minimum.
//   - Sector-specific acts get their sectoral leaf (e.g. CBAM → code-cbam).
//   - The `domain-X` codes (auto-derived per `policy.domain`) are kept so
//     the horizontal-coherence matrix still rolls up by domain.
//   - Max 6 tags per policy to keep the matrix legible.
// ---------------------------------------------------------------------------

export const POLICY_MASTER_TAGS: Record<string, string[]> = {
  // ── Batch A: core climate & finance legislation ────────────────────
  // European Climate Law
  'eu-climate-law': ['code-gov-climatelaw', 'code-monitoring', 'code-target', 'code-target-2030', 'code-target-2050', 'root-mitigation'],
  // EU ETS Directive
  'eu-ets-directive': ['code-ets', 'code-pricing', 'code-sec-avi', 'code-sec-elec', 'code-sec-ind', 'root-mitigation'],
  // Effort Sharing Regulation
  'effort-sharing-regulation': ['code-esr', 'code-sec-agri', 'code-sec-build', 'code-sec-transp', 'code-sec-waste', 'root-mitigation'],
  // LULUCF Regulation
  'lulucf-regulation': ['code-lulucf', 'code-lulucf-forest', 'code-lulucf-soil', 'code-target-2030', 'root-mitigation'],
  // Renewable Energy Directive (RED II)
  'renewable-energy-directive': ['code-renew-biomass', 'code-renew-hydrogen', 'code-renew-solar', 'code-renew-wind', 'code-renewables', 'root-mitigation'],
  // Energy Efficiency Directive
  'energy-efficiency-directive': ['code-efficiency', 'code-sec-build', 'code-target-2030', 'root-mitigation'],
  // CBAM Regulation
  'cbam-regulation': ['code-cbam', 'code-pricing', 'code-sec-ind-alu', 'code-sec-ind-cement', 'code-sec-ind-steel', 'root-mitigation'],
  // EU Taxonomy Regulation
  'taxonomy-regulation': ['code-fin-priv', 'code-fin-taxonomy', 'code-monitoring', 'root-finance'],
  // Sustainable Finance Disclosure Regulation
  'sfdr': ['code-fin-priv', 'code-fin-sfdr', 'code-monitoring', 'root-finance'],
  // CO2 Standards for Cars
  'co2-cars-regulation': ['code-sec-altfuel', 'code-sec-road', 'code-sec-transp', 'code-target-2030', 'root-mitigation', 'root-sector'],
  // Alternative Fuels Infrastructure Regulation
  'afir-regulation': ['code-renew-hydrogen', 'code-sec-altfuel', 'code-sec-road', 'code-sec-transp', 'root-mitigation', 'root-sector'],
  // Energy Performance of Buildings Directive
  'epbd-recast': ['code-efficiency', 'code-sec-build', 'code-sec-build-heat', 'code-sec-build-nonres', 'code-sec-build-res', 'root-mitigation'],
  // European Green Deal
  'eu-green-deal': ['code-gov', 'code-target-2050', 'root-crosscut', 'root-mitigation', 'root-sector'],
  // Fit for 55 Package
  'fit-for-55': ['code-gov', 'code-target-2030', 'root-crosscut', 'root-mitigation'],
  // Social Climate Fund
  'social-climate-fund': ['code-ets2', 'code-fin-pub', 'code-jt-households', 'code-just-trans', 'root-finance'],
  // Methane Emissions Regulation
  'methane-regulation': ['code-monitoring', 'code-sec-gas', 'code-sec-ind', 'root-mitigation', 'root-sector'],
  // Nature Restoration Law
  'nature-restoration-law': ['code-adapt-eco', 'code-ecology', 'code-lulucf', 'code-lulucf-forest', 'root-adaptation', 'root-mitigation'],
  // Corporate Sustainability Reporting Directive
  'csrd': ['code-fin-csrd', 'code-fin-priv', 'code-monitoring', 'root-finance'],
  // FuelEU Maritime
  'fueleu-maritime': ['code-sec-altfuel', 'code-sec-mari', 'code-sec-transp', 'code-target-2050', 'root-mitigation', 'root-sector'],
  // ReFuelEU Aviation
  'refueleu-aviation': ['code-renew-hydrogen', 'code-sec-altfuel', 'code-sec-avi', 'code-sec-transp', 'root-mitigation', 'root-sector'],
  // Governance Regulation
  'governance-regulation': ['code-gov', 'code-gov-necps', 'code-monitoring', 'root-crosscut'],
  // Industrial Emissions Directive
  'industrial-emissions-directive': ['code-monitoring', 'code-sec-ind', 'code-sec-water', 'root-mitigation', 'root-sector'],
  // Net-Zero Industry Act
  'net-zero-industry-act': ['code-innov', 'code-renew-solar', 'code-renew-wind', 'code-sec-ind', 'code-sec-ind-ccs', 'root-sector'],
  // Critical Raw Materials Act
  'critical-raw-materials-act': ['code-innov', 'code-sec-ind', 'code-sec-waste', 'root-sector'],
  // Deforestation Regulation
  'deforestation-regulation': ['code-lulucf-forest', 'code-monitoring', 'code-sec-agri', 'code-sec-agri-crops', 'root-mitigation', 'root-sector'],
  // AI Act
  'ai-act': ['code-gov', 'code-monitoring', 'root-crosscut'],

  // ── Batch B: digital, trade, sectoral transport, social, finance ───
  // Digital Services Act
  'digital-services-act': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Digital Markets Act
  'digital-markets-act': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Data Act
  'data-act': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Cyber Resilience Act
  'cyber-resilience-act': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // EU-UK Trade and Cooperation Agreement
  'eu-uk-tca': ['code-gov', 'code-intl', 'root-crosscut'],
  // Batteries Regulation
  'batteries-regulation': ['code-sec-ind', 'code-sec-waste', 'root-mitigation', 'root-sector'],
  // Ecodesign for Sustainable Products Regulation
  'ecodesign-sustainable-products': ['code-efficiency', 'code-sec-ind', 'code-sec-waste', 'root-mitigation', 'root-sector'],
  // CAP Strategic Plans Regulation
  'cap-strategic-plans': ['code-fin-pub', 'code-sec-agri', 'root-finance', 'root-sector'],
  // European Health Data Space
  'ehds': ['code-adapt-health', 'code-gov', 'root-crosscut'],
  // Water Framework Directive
  'water-framework-directive': ['code-adapt-eco', 'code-ecology', 'code-sec-water', 'root-adaptation', 'root-sector'],
  // Marine Strategy Framework Directive
  'marine-strategy-framework-directive': ['code-adapt-eco', 'code-ecology', 'code-monitoring', 'code-sec-mari', 'root-adaptation'],
  // Zero Pollution Action Plan
  'zero-pollution-action-plan': ['code-adapt-health', 'code-ecology', 'code-gov', 'root-crosscut'],
  // REACH Regulation
  'reach-regulation': ['code-ecology', 'code-gov', 'code-sec-ind-chem', 'root-crosscut', 'root-sector'],
  // F-Gas Regulation
  'f-gas-regulation': ['code-sec-build-heat', 'code-sec-ind', 'code-target-2050', 'root-mitigation'],
  // Waste Framework Directive
  'waste-framework-directive': ['code-sec-waste', 'root-mitigation', 'root-sector'],
  // Single-Use Plastics Directive
  'single-use-plastics-directive': ['code-ecology', 'code-sec-waste', 'root-mitigation', 'root-sector'],
  // Packaging and Packaging Waste Regulation
  'packaging-waste-regulation': ['code-sec-ind', 'code-sec-waste', 'root-mitigation', 'root-sector'],
  // NIS2 Directive
  'nis2-directive': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // DORA (Digital Operational Resilience Act)
  'dora-regulation': ['code-fin-priv', 'code-gov', 'root-crosscut', 'root-finance'],
  // European Defence Industrial Strategy
  'european-defence-industrial-strategy': ['code-gov', 'code-innov', 'root-crosscut'],
  // EU Space Programme Regulation
  'eu-space-programme': ['code-innov', 'code-monitoring', 'code-sci-eea', 'root-crosscut'],
  // Foreign Subsidies Regulation
  'foreign-subsidies-regulation': ['code-gov', 'code-intl', 'root-crosscut'],
  // Anti-Coercion Instrument
  'anti-coercion-instrument': ['code-gov', 'code-intl', 'root-crosscut'],
  // Corporate Sustainability Due Diligence Directive (CSDDD)
  'csddd': ['code-fin-priv', 'code-gov', 'code-intl', 'code-target-2050', 'root-mitigation'],
  // TEN-T Regulation
  'ten-t-regulation': ['code-sec-rail', 'code-sec-road', 'code-sec-transp', 'root-mitigation', 'root-sector'],
  // CO2 Standards for Heavy-Duty Vehicles
  'co2-hdv-regulation': ['code-sec-altfuel', 'code-sec-road', 'code-sec-transp', 'code-target-2030', 'root-mitigation'],
  // Euro 7 Regulation
  'euro-7-regulation': ['code-ecology', 'code-sec-road', 'code-sec-transp', 'root-mitigation', 'root-sector'],
  // Horizon Europe
  'horizon-europe': ['code-fin-pub', 'code-innov', 'code-science', 'root-crosscut', 'root-finance'],
  // European Pillar of Social Rights Action Plan
  'social-rights-action-plan': ['code-jt-households', 'code-jt-workers', 'code-just-trans', 'root-crosscut'],
  // Platform Workers Directive
  'platform-workers-directive': ['code-gov', 'code-jt-workers', 'code-just-trans', 'root-crosscut'],
  // European Chips Act
  'european-chips-act': ['code-fin-pub', 'code-innov', 'root-crosscut', 'root-finance'],
  // General Data Protection Regulation (GDPR)
  'gdpr': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // ePrivacy Directive
  'eprivacy-directive': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // MiCA (Markets in Crypto-Assets)
  'mica-regulation': ['code-fin-priv', 'code-gov', 'root-crosscut', 'root-finance'],
  // Payment Services Directive (PSD2)
  'psd2-directive': ['code-fin-priv', 'code-gov', 'root-crosscut', 'root-finance'],
  // MiFID II
  'mifid2-directive': ['code-fin-priv', 'code-gov', 'root-crosscut', 'root-finance'],
  // Solvency II
  'solvency2-directive': ['code-fin-priv', 'code-gov', 'root-crosscut', 'root-finance'],
  // Capital Requirements Regulation (CRR)
  'crr-regulation': ['code-fin-priv', 'code-gov', 'root-crosscut', 'root-finance'],

  // ── Batch C: environment, energy market, social, consumer ──────────
  // European Green Bonds Regulation
  'green-bonds-regulation': ['code-fin-bonds', 'code-fin-priv', 'code-fin-taxonomy', 'root-finance'],
  // Anti-Money Laundering Regulation
  'aml-regulation': ['code-fin-priv', 'code-gov', 'code-gov-gov', 'root-crosscut', 'root-finance'],
  // Instant Payments Regulation
  'instant-payments-regulation': ['code-fin-priv', 'code-gov', 'root-crosscut', 'root-finance'],
  // Habitats Directive
  'habitats-directive': ['code-adapt-eco', 'code-ecology', 'code-lulucf', 'root-adaptation', 'root-crosscut'],
  // Birds Directive
  'birds-directive': ['code-adapt-eco', 'code-ecology', 'root-adaptation', 'root-crosscut'],
  // Environmental Impact Assessment Directive
  'eia-directive': ['code-ecology', 'code-gov', 'code-publeng', 'code-riskassess', 'root-crosscut'],
  // Air Quality Directive (recast)
  'air-quality-directive': ['code-adapt-health', 'code-ecology', 'code-monitoring', 'root-adaptation', 'root-crosscut'],
  // Drinking Water Directive
  'drinking-water-directive': ['code-adapt-health', 'code-ecology', 'code-sec-water', 'root-adaptation', 'root-sector'],
  // Medical Devices Regulation (MDR)
  'medical-devices-regulation': ['code-adapt-health', 'code-gov', 'code-gov-gov', 'root-crosscut'],
  // Clinical Trials Regulation
  'clinical-trials-regulation': ['code-adapt-health', 'code-gov', 'code-science', 'root-crosscut'],
  // General Food Law
  'general-food-law': ['code-adapt-health', 'code-gov', 'code-sec-agri', 'root-crosscut', 'root-sector'],
  // Organic Farming Regulation
  'organic-farming-regulation': ['code-adapt-agri', 'code-sec-agri', 'code-sec-agri-crops', 'root-adaptation', 'root-sector'],
  // General Product Safety Regulation
  'product-safety-regulation': ['code-gov', 'code-gov-gov', 'code-monitoring', 'root-crosscut'],
  // Asylum Procedures Regulation
  'asylum-procedures-regulation': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Return Directive
  'return-directive': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Erasmus+ Regulation
  'erasmus-plus': ['code-fin-pub', 'code-gov', 'code-publeng', 'code-science', 'root-crosscut'],
  // European Electronic Communications Code
  'eecc-directive': ['code-gov', 'code-gov-gov', 'code-innov', 'root-crosscut'],
  // Electricity Market Reform
  'electricity-market-regulation': ['code-renewables', 'code-sec-elec', 'code-sec-elec-grid', 'code-sec-elec-market', 'root-sector'],
  // European Defence Fund
  'european-defence-fund': ['code-fin-pub', 'code-gov', 'code-innov', 'root-crosscut', 'root-finance'],
  // Just Transition Fund
  'just-transition-fund': ['code-fin-jtf', 'code-fin-pub', 'code-just-trans', 'code-jt-regions', 'code-jt-workers', 'root-finance'],
  // International Procurement Instrument
  'ipi-regulation': ['code-gov', 'code-gov-gov', 'code-intl', 'root-crosscut'],
  // Whistleblower Protection Directive
  'whistleblower-directive': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Roaming Regulation
  'roaming-regulation': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Seveso III Directive
  'seveso-directive': ['code-disaster', 'code-ecology', 'code-publeng', 'code-riskassess', 'root-adaptation'],
  // Hydrogen and Gas Market Directive
  'hydrogen-gas-package': ['code-renew-hydrogen', 'code-sec-elec-market', 'code-sec-gas', 'root-mitigation', 'root-sector'],
  // TEN-E Regulation
  'ten-e-regulation': ['code-renew-hydrogen', 'code-sec-elec', 'code-sec-elec-grid', 'code-sec-ind-ccs', 'root-sector'],
  // Gigabit Infrastructure Act
  'gigabit-infrastructure-act': ['code-gov', 'code-innov', 'root-crosscut'],
  // REPowerEU Plan
  'repowereu-plan': ['code-efficiency', 'code-renewables', 'code-renew-hydrogen', 'code-sec-gas', 'root-mitigation'],
  // Empowering Consumers (Green Claims)
  'green-claims-directive': ['code-gov', 'code-monitoring', 'code-publeng', 'root-crosscut'],
  // Soil Monitoring Law
  'soil-monitoring-law': ['code-ecology', 'code-lulucf-soil', 'code-monitoring', 'code-sec-agri', 'root-crosscut'],
  // EU Merger Regulation
  'eu-merger-regulation': ['code-gov', 'code-gov-gov', 'root-crosscut'],
  // Farm to Fork Strategy
  'farm-to-fork-strategy': ['code-adapt-agri', 'code-sec-agri', 'code-sec-agri-crops', 'code-sec-agri-fert', 'root-sector'],
  // Collective Redress Directive
  'collective-redress-directive': ['code-gov', 'code-gov-gov', 'code-publeng', 'root-crosscut'],
};
