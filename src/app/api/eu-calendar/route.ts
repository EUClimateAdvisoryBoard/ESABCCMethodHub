import { NextResponse } from 'next/server';

export interface CalendarEvent {
  date: string;
  title: string;
  policy_id: string | null;
  type: 'deadline' | 'review' | 'implementation' | 'transposition';
  description: string;
}

/**
 * Curated list of upcoming EU legislative milestones.
 * Last updated: 2026-03-26
 */
const LEGISLATIVE_EVENTS: CalendarEvent[] = [
  // ─── 2026 Q1 ────────────────────────────────────────────────────────
  {
    date: '2026-01-01',
    title: 'CBAM full implementation',
    policy_id: 'cbam-regulation',
    type: 'implementation',
    description:
      'Carbon Border Adjustment Mechanism enters full implementation. Importers must purchase CBAM certificates corresponding to the carbon price that would have been paid under the EU ETS.',
  },
  {
    date: '2026-01-01',
    title: 'ETS aviation — full scope application',
    policy_id: 'eu-ets-directive',
    type: 'implementation',
    description:
      'EU ETS for aviation expands to cover all flights departing from EEA airports, ending the previous exemptions. Airlines must surrender allowances for the full scope of intra- and extra-EEA flights.',
  },
  {
    date: '2026-01-01',
    title: 'ETS maritime — full scope',
    policy_id: 'eu-ets-directive',
    type: 'implementation',
    description:
      'EU ETS obligations for maritime transport reach full scope. After the 2024-2025 phase-in, shipping companies must surrender allowances for 100% of verified emissions on intra-EU voyages and 50% on extra-EU voyages.',
  },
  {
    date: '2026-01-01',
    title: 'FuelEU Maritime in effect',
    policy_id: 'fueleu-maritime',
    type: 'implementation',
    description:
      'FuelEU Maritime regulation takes effect with a 2% GHG intensity reduction requirement for maritime fuels and initial onshore power supply obligations for container and passenger ships.',
  },
  {
    date: '2026-01-01',
    title: 'ETS free allowance phase-out begins (CBAM sectors)',
    policy_id: 'eu-ets-directive',
    type: 'implementation',
    description:
      'Free ETS allowances for CBAM-covered sectors (cement, iron & steel, aluminium, fertilisers, electricity, hydrogen) begin phasing out at 2.5% per year, reaching full phase-out by 2034.',
  },
  {
    date: '2026-01-01',
    title: 'MiCA — full application',
    policy_id: null,
    type: 'implementation',
    description:
      'Markets in Crypto-Assets Regulation (MiCA) is fully applicable. All crypto-asset service providers must be authorised, and transparency and consumer-protection rules apply across the EU.',
  },
  {
    date: '2026-01-01',
    title: 'Euro 7 — light-duty vehicle rules apply',
    policy_id: 'euro-7-regulation',
    type: 'implementation',
    description:
      'Euro 7 emissions standard takes effect for new type-approvals of light-duty vehicles (cars and vans), introducing tighter real-driving emission limits and brake-particle and tyre-abrasion limits.',
  },
  {
    date: '2026-01-01',
    title: 'AFIR — first deployment targets',
    policy_id: 'afir-regulation',
    type: 'deadline',
    description:
      'Alternative Fuels Infrastructure Regulation first deployment milestones: Member States must ensure minimum public recharging power capacity along TEN-T core corridors and initial hydrogen refuelling stations.',
  },
  {
    date: '2026-02-01',
    title: 'CBAM — first certificate purchases',
    policy_id: 'cbam-regulation',
    type: 'deadline',
    description:
      'Importers of CBAM-covered goods must purchase their first CBAM certificates from national authorities, reflecting the EU ETS carbon price for embedded emissions in imported products.',
  },
  {
    date: '2026-03-01',
    title: 'Green Bonds Standard — application',
    policy_id: null,
    type: 'implementation',
    description:
      'EU Green Bonds Standard becomes applicable. Issuers using the "European Green Bond" label must allocate proceeds to Taxonomy-aligned activities and publish allocation and impact reports.',
  },
  {
    date: '2026-03-31',
    title: 'Electricity market reform — application',
    policy_id: null,
    type: 'implementation',
    description:
      'Reformed EU electricity market design rules apply, introducing two-way contracts for difference for public support to generation, strengthened consumer rights, and provisions against price manipulation.',
  },
  // ─── 2026 Q2 ────────────────────────────────────────────────────────
  {
    date: '2026-04-01',
    title: 'Social Climate Fund — first disbursements',
    policy_id: 'social-climate-fund',
    type: 'implementation',
    description:
      'First disbursements from the Social Climate Fund begin, supporting vulnerable households, micro-enterprises, and transport users affected by the inclusion of buildings and road transport in emissions trading.',
  },
  {
    date: '2026-06-01',
    title: 'Climate Law — 2040 target proposal',
    policy_id: 'eu-climate-law',
    type: 'review',
    description:
      'European Commission expected to table the legislative proposal for the EU\'s 2040 climate target (recommended at 90% net GHG reduction), including an updated impact assessment and policy pathway.',
  },
  {
    date: '2026-06-30',
    title: 'CSRD reporting — large companies',
    policy_id: 'csrd',
    type: 'deadline',
    description:
      'First sustainability reports under the Corporate Sustainability Reporting Directive due for large public-interest entities for fiscal year 2025, using European Sustainability Reporting Standards (ESRS).',
  },
  {
    date: '2026-06-30',
    title: 'Deforestation Regulation — application (large operators)',
    policy_id: 'deforestation-regulation',
    type: 'implementation',
    description:
      'EU Deforestation Regulation becomes applicable for large operators. Products linked to deforestation (soy, beef, palm oil, wood, cocoa, coffee, rubber) may no longer be placed on the EU market.',
  },
  {
    date: '2026-06-30',
    title: 'National Energy and Climate Plans — updates due',
    policy_id: 'governance-regulation',
    type: 'deadline',
    description:
      'Member States must submit updated National Energy and Climate Plans to the Commission, reflecting raised ambition under Fit for 55 and REPowerEU, covering 2025-2030 trajectories.',
  },
  {
    date: '2026-06-30',
    title: 'REPowerEU — implementation review',
    policy_id: null,
    type: 'review',
    description:
      'European Commission reviews progress on REPowerEU plan implementation, assessing energy diversification, accelerated renewables deployment, energy savings, and fossil fuel import reduction.',
  },
  // ─── 2026 Q3 ────────────────────────────────────────────────────────
  {
    date: '2026-07-01',
    title: 'CBAM scope review — fertilisers & extension',
    policy_id: 'cbam-regulation',
    type: 'review',
    description:
      'European Commission reviews the scope of CBAM, including assessment of extending coverage to organic chemicals, polymers, and hydrogen, and evaluating the fertilisers sector methodology.',
  },
  {
    date: '2026-07-01',
    title: 'ETS Market Stability Reserve — review',
    policy_id: 'eu-ets-directive',
    type: 'review',
    description:
      'Scheduled review of the EU ETS Market Stability Reserve, assessing the intake rate, thresholds, and invalidation mechanism to ensure the MSR effectively manages the allowance surplus.',
  },
  {
    date: '2026-07-01',
    title: 'Taxonomy — new delegated acts (environmental objectives)',
    policy_id: 'taxonomy-regulation',
    type: 'implementation',
    description:
      'Updated Taxonomy delegated acts enter application, expanding technical screening criteria for all six environmental objectives including biodiversity, circular economy, and pollution prevention.',
  },
  {
    date: '2026-07-01',
    title: 'SFDR review — Commission proposal',
    policy_id: 'sfdr',
    type: 'review',
    description:
      'European Commission publishes the review of the Sustainable Finance Disclosure Regulation, proposing simplification of product categorisation and enhanced anti-greenwashing requirements.',
  },
  {
    date: '2026-07-01',
    title: 'Hydrogen & gas package — transposition deadline',
    policy_id: null,
    type: 'transposition',
    description:
      'Member States must transpose the hydrogen and decarbonised gas market package, establishing rules for a dedicated hydrogen network, blending, and third-party access to hydrogen infrastructure.',
  },
  {
    date: '2026-08-02',
    title: 'AI Act — full application (general-purpose AI)',
    policy_id: 'ai-act',
    type: 'implementation',
    description:
      'The EU Artificial Intelligence Act becomes fully applicable for general-purpose AI systems, transparency obligations, and governance structures. Codes of practice for GPAI models apply.',
  },
  {
    date: '2026-08-02',
    title: 'AI Act — high-risk AI systems obligations',
    policy_id: 'ai-act',
    type: 'implementation',
    description:
      'Obligations for high-risk AI systems under Annex III take effect, including conformity assessments, risk management systems, data governance, human oversight, and post-market monitoring.',
  },
  {
    date: '2026-08-04',
    title: 'Methane Regulation — reporting starts',
    policy_id: 'methane-regulation',
    type: 'deadline',
    description:
      'First reporting obligations under the EU Methane Regulation for energy-sector operators. Companies must submit methane emissions data using prescribed measurement methodologies.',
  },
  {
    date: '2026-09-01',
    title: 'Nature Restoration — national plans due',
    policy_id: 'nature-restoration-law',
    type: 'deadline',
    description:
      'Member States must submit their first national restoration plans to the European Commission, covering restoration targets for degraded ecosystems by 2030, 2040, and 2050.',
  },
  {
    date: '2026-09-01',
    title: 'F-gas Regulation — phase-down step',
    policy_id: 'f-gas-regulation',
    type: 'implementation',
    description:
      'Next step in the HFC phase-down schedule under the revised F-gas Regulation, reducing the EU-wide quota for hydrofluorocarbons placed on the market. New service bans for certain equipment take effect.',
  },
  {
    date: '2026-09-12',
    title: 'Data Act — full application',
    policy_id: 'data-act',
    type: 'implementation',
    description:
      'EU Data Act becomes fully applicable. Rules on fair access to and use of data generated by connected products, cloud switching, and data sharing with public bodies enter into force.',
  },
  {
    date: '2026-09-30',
    title: 'Air quality directive — transposition',
    policy_id: 'zero-pollution-action-plan',
    type: 'transposition',
    description:
      'Member States must transpose the revised Ambient Air Quality Directive, aligning limit values more closely with WHO guidelines for PM2.5, NO₂, and ozone, and strengthening access to justice.',
  },
  // ─── 2026 Q4 ────────────────────────────────────────────────────────
  {
    date: '2026-10-01',
    title: 'Ecodesign for Sustainable Products Regulation',
    policy_id: 'ecodesign-sustainable-products',
    type: 'implementation',
    description:
      'Framework provisions of the Ecodesign for Sustainable Products Regulation become applicable, enabling the Commission to adopt delegated acts setting ecodesign requirements for specific product groups.',
  },
  {
    date: '2026-10-17',
    title: 'NIS2 — enforcement review',
    policy_id: 'nis2-directive',
    type: 'review',
    description:
      'Commission reviews the implementation and enforcement of the NIS2 Directive across Member States, assessing cybersecurity risk management, incident reporting, and supply-chain security compliance.',
  },
  {
    date: '2026-10-17',
    title: 'Platform Workers Directive — transposition deadline',
    policy_id: 'platform-workers-directive',
    type: 'transposition',
    description:
      'Member States must transpose the Platform Workers Directive into national law, establishing a rebuttable presumption of employment, algorithmic management transparency, and data protection rules.',
  },
  {
    date: '2026-11-01',
    title: 'Cyber Resilience Act — first obligations',
    policy_id: 'cyber-resilience-act',
    type: 'implementation',
    description:
      'First obligations under the Cyber Resilience Act take effect, requiring manufacturers to report actively exploited vulnerabilities and cybersecurity incidents for connected products.',
  },
  {
    date: '2026-11-01',
    title: 'European Defence Fund — mid-term review',
    policy_id: 'european-defence-industrial-strategy',
    type: 'review',
    description:
      'Mid-term evaluation of the European Defence Fund published, assessing effectiveness of R&D funding, cross-border collaboration, and contribution to EU defence capability gaps.',
  },
  {
    date: '2026-11-17',
    title: 'Digital Services Act — ongoing enforcement',
    policy_id: 'digital-services-act',
    type: 'review',
    description:
      'European Commission conducts its first comprehensive review of DSA enforcement, including assessment of very large online platform compliance and systemic risk mitigation measures.',
  },
  {
    date: '2026-11-30',
    title: 'Digital Markets Act — ongoing enforcement',
    policy_id: 'digital-markets-act',
    type: 'review',
    description:
      'European Commission reviews gatekeeper compliance with Digital Markets Act obligations, including interoperability, data portability, and fair ranking requirements for designated core platform services.',
  },
  {
    date: '2026-12-01',
    title: 'Energy Efficiency Directive — renovation wave',
    policy_id: 'energy-efficiency-directive',
    type: 'deadline',
    description:
      'Milestone under the Energy Efficiency Directive recast: Member States must demonstrate annual renovation of at least 3% of the total floor area of public buildings owned by central government.',
  },
  {
    date: '2026-12-31',
    title: 'EPBD first transposition deadline',
    policy_id: 'epbd-recast',
    type: 'transposition',
    description:
      'Member States must transpose key provisions of the recast Energy Performance of Buildings Directive into national law, including zero-emission building standards for new public buildings.',
  },
  {
    date: '2026-12-31',
    title: 'TEN-T — core network completion progress review',
    policy_id: 'ten-t-regulation',
    type: 'review',
    description:
      'European Commission reviews progress toward 2030 TEN-T core network completion milestones, assessing cross-border infrastructure, rail corridor development, and ERTMS deployment.',
  },
  {
    date: '2026-12-31',
    title: 'GDPR — review and evaluation report',
    policy_id: null,
    type: 'review',
    description:
      'European Commission publishes its periodic evaluation of the General Data Protection Regulation, assessing international data transfers, enforcement consistency, and effectiveness of cooperation mechanisms.',
  },
  // ─── 2027 Q1 ────────────────────────────────────────────────────────
  {
    date: '2027-01-01',
    title: 'ETS2 — buildings & transport emissions trading launch',
    policy_id: 'eu-ets-directive',
    type: 'implementation',
    description:
      'The new Emissions Trading System for buildings, road transport, and additional sectors (ETS2) begins. Fuel suppliers must surrender allowances for CO₂ emissions from these sectors.',
  },
  {
    date: '2027-01-01',
    title: 'CSRD reporting — listed SMEs',
    policy_id: 'csrd',
    type: 'deadline',
    description:
      'Listed SMEs begin reporting under the Corporate Sustainability Reporting Directive using simplified ESRS standards. A two-year opt-out is available until 2028 for those not yet ready.',
  },
  {
    date: '2027-01-01',
    title: 'Packaging & Packaging Waste Regulation — application',
    policy_id: 'packaging-waste-regulation',
    type: 'implementation',
    description:
      'Key provisions of the Packaging and Packaging Waste Regulation apply, including minimisation requirements, recyclability criteria, mandatory recycled content for plastic packaging, and reuse targets.',
  },
  {
    date: '2027-02-01',
    title: 'CSDDD — first scope (largest companies)',
    policy_id: 'csddd',
    type: 'implementation',
    description:
      'Corporate Sustainability Due Diligence Directive enters application for the largest companies (>5,000 employees, >€1.5bn turnover). They must identify, prevent, and mitigate adverse human rights and environmental impacts.',
  },
  // ─── 2027 Q2 ────────────────────────────────────────────────────────
  {
    date: '2027-06-30',
    title: 'Deforestation Regulation — SME compliance deadline',
    policy_id: 'deforestation-regulation',
    type: 'deadline',
    description:
      'EU Deforestation Regulation becomes applicable to SMEs and non-large operators. Small and medium-sized enterprises must comply with due diligence obligations for deforestation-free supply chains.',
  },
  {
    date: '2027-06-30',
    title: 'Net-Zero Industry Act — first review',
    policy_id: 'net-zero-industry-act',
    type: 'review',
    description:
      'European Commission publishes its first review of the Net-Zero Industry Act, assessing progress toward the 40% domestic manufacturing benchmark for key clean technologies.',
  },
  {
    date: '2027-06-30',
    title: 'Soil Monitoring Law — first review',
    policy_id: null,
    type: 'review',
    description:
      'First review milestone for the Soil Monitoring and Resilience Directive, assessing Member State soil health monitoring frameworks, contaminated site registers, and sustainable soil management practices.',
  },
  // ─── 2027 Q3–Q4 ────────────────────────────────────────────────────
  {
    date: '2027-07-01',
    title: 'Euro 7 — heavy-duty vehicle rules apply',
    policy_id: 'euro-7-regulation',
    type: 'implementation',
    description:
      'Euro 7 emissions standard takes effect for new type-approvals of heavy-duty vehicles (trucks and buses), including tighter NOx limits, particle number limits, and on-board monitoring requirements.',
  },
  {
    date: '2027-09-01',
    title: 'Batteries Regulation — full application',
    policy_id: 'batteries-regulation',
    type: 'implementation',
    description:
      'Full application of the Batteries Regulation, including digital battery passport requirements for EV batteries, carbon footprint declarations, recycled content targets, and end-of-life collection rates.',
  },
  {
    date: '2027-12-01',
    title: 'Cyber Resilience Act — full application',
    policy_id: 'cyber-resilience-act',
    type: 'implementation',
    description:
      'Full application of the Cyber Resilience Act. All connected products placed on the EU market must meet essential cybersecurity requirements, vulnerability handling, and conformity assessment.',
  },
  // ─── 2028 ───────────────────────────────────────────────────────────
  {
    date: '2028-01-01',
    title: 'CSDDD — second scope (mid-sized companies)',
    policy_id: 'csddd',
    type: 'implementation',
    description:
      'Corporate Sustainability Due Diligence Directive extends to companies with >1,000 employees and >€450m turnover. The broader scope brings significantly more companies under supply-chain due diligence obligations.',
  },
  {
    date: '2028-01-01',
    title: 'ETS free allowance phase-out — next step',
    policy_id: 'eu-ets-directive',
    type: 'implementation',
    description:
      'ETS free allowances for CBAM-covered sectors continue phasing down. By 2028, free allocation is reduced by a further step on the linear path to full phase-out by 2034.',
  },
  {
    date: '2028-06-30',
    title: 'Critical Raw Materials Act — first review',
    policy_id: 'critical-raw-materials-act',
    type: 'review',
    description:
      'European Commission reviews the Critical Raw Materials Act, assessing progress toward strategic autonomy benchmarks: 10% extraction, 40% processing, and 25% recycling of strategic raw materials domestically by 2030.',
  },
  {
    date: '2028-07-01',
    title: 'ReFuelEU Aviation — SAF blending increase',
    policy_id: 'refueleu-aviation',
    type: 'implementation',
    description:
      'ReFuelEU Aviation mandates an increased share of sustainable aviation fuel blending at EU airports, advancing toward the 2030 target of 6% SAF with sub-targets for synthetic fuels.',
  },
  {
    date: '2028-12-31',
    title: 'Effort Sharing Regulation — 2028 compliance check',
    policy_id: 'effort-sharing-regulation',
    type: 'deadline',
    description:
      'Member States must demonstrate compliance with annual ESR emission allocation targets for non-ETS sectors. The trajectory tightens toward the 2030 target of -40% compared to 2005.',
  },
];

export async function GET() {
  // Sort events by date
  const events = [...LEGISLATIVE_EVENTS].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return NextResponse.json(
    { events, last_updated: '2026-03-26' },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400',
      },
    }
  );
}
