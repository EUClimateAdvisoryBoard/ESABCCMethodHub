import { NextRequest, NextResponse } from 'next/server';
import { callLLM, hasAnyLLMKey } from '@/lib/ai-summary';
import { getPolicyClockUserEvents } from '@/lib/policy-clock-events-store';

/**
 * Policy Clock API — the "Brussels bubble" calendar.
 *
 * Aggregates upcoming EU policy events from many sources:
 *   - Curated legislative milestones (Fit for 55, Green Deal implementation)
 *   - European Commission Work Programme items
 *   - European Parliament ENVI committee meeting agenda (RSS)
 *   - European Parliament plenary calendar
 *   - Council of the EU upcoming meetings (RSS / Council calendar)
 *   - Major policy revisions and consultations open / closing
 *
 * Returns a unified, categorised event list plus an AI-generated short
 * overview text of "what is happening in Brussels next week".
 *
 * Categories: revision | new_policy | commission_workprogramme |
 *             envi_committee | council_meeting | plenary | consultation |
 *             implementation
 *
 * GET /api/policy-clock                        — full event list + AI summary
 * GET /api/policy-clock?category=envi_committee
 * GET /api/policy-clock?from=2026-04-01&to=2026-12-31
 */

export interface PolicyClockEvent {
  id: string;
  date: string;            // ISO YYYY-MM-DD
  endDate?: string;        // for multi-day events (committee weeks, plenaries)
  time?: string;           // optional HH:MM
  title: string;
  description: string;
  category: PolicyClockCategory;
  source: string;          // human-readable source label
  sourceUrl?: string;
  policyId?: string | null;
  location?: string;
  importance: 'high' | 'medium' | 'normal';
  tags: string[];
}

export type PolicyClockCategory =
  | 'revision'
  | 'new_policy'
  | 'commission_workprogramme'
  | 'envi_committee'
  | 'council_meeting'
  | 'plenary'
  | 'consultation'
  | 'implementation';

// ── 1. Curated baseline ─────────────────────────────────────────────────
// Every date below is either:
//   (a) a legal deadline / application date set in the adopted regulation/directive,
//   (b) a review clause date specified in the legislation itself, or
//   (c) an indicative College agenda item from the Commission's published
//       "indicative planning" note (SEC document). These dates are explicitly
//       "tbc" and may be moved at the President's discretion.
// NO fabricated committee meeting, Council, or plenary dates — those come from
// live RSS feeds only. If a date cannot be verified against an OJ citation or
// a Commission indicative-planning SEC, it does not belong here.

const CURATED_EVENTS: PolicyClockEvent[] = [
  // ── Already in effect (kept for context on the timeline) ───────────────
  {
    id: 'impl-cbam-full',
    date: '2026-01-01',
    title: 'CBAM — full implementation',
    description:
      'Carbon Border Adjustment Mechanism enters full implementation. Importers must purchase CBAM certificates corresponding to the carbon price under the EU ETS. Reg. (EU) 2023/956, Art. 32.',
    category: 'implementation',
    source: 'OJ L 130, 16.5.2023',
    policyId: 'cbam-regulation',
    importance: 'high',
    tags: ['CBAM', 'trade', 'carbon-price'],
  },
  {
    id: 'impl-ets-aviation-full',
    date: '2026-01-01',
    title: 'ETS aviation — full scope',
    description:
      'EU ETS for aviation expands to all flights departing from EEA airports; previous exemptions end. Dir. 2023/958 amending Dir. 2003/87/EC.',
    category: 'implementation',
    source: 'OJ L 130, 16.5.2023',
    policyId: 'eu-ets-directive',
    importance: 'high',
    tags: ['ETS', 'aviation'],
  },
  {
    id: 'impl-ets-maritime-full',
    date: '2026-01-01',
    title: 'ETS maritime — full scope (100%)',
    description:
      'After 2024-25 phase-in, shipping companies must surrender allowances for 100% of verified emissions on intra-EU voyages and 50% on extra-EU voyages. Dir. 2023/959.',
    category: 'implementation',
    source: 'OJ L 130, 16.5.2023',
    policyId: 'eu-ets-directive',
    importance: 'high',
    tags: ['ETS', 'maritime'],
  },
  {
    id: 'impl-fueleu-maritime',
    date: '2026-01-01',
    title: 'FuelEU Maritime — in effect',
    description:
      'FuelEU Maritime regulation takes effect with 2% GHG intensity reduction for maritime fuels and onshore power supply obligations. Reg. (EU) 2023/1805, Art. 4.',
    category: 'implementation',
    source: 'OJ L 234, 22.9.2023',
    policyId: 'fueleu-maritime',
    importance: 'medium',
    tags: ['maritime', 'fuels'],
  },
  {
    id: 'impl-ets-free-phaseout',
    date: '2026-01-01',
    title: 'ETS free allowance phase-out begins (CBAM sectors)',
    description:
      'Free ETS allowances for CBAM-covered sectors (cement, iron & steel, aluminium, fertilisers, electricity, hydrogen) begin phasing out at 2.5%/yr, reaching full phase-out by 2034. Dir. 2023/959, Art. 10a.',
    category: 'implementation',
    source: 'OJ L 130, 16.5.2023',
    policyId: 'eu-ets-directive',
    importance: 'high',
    tags: ['ETS', 'CBAM', 'free-allocation'],
  },
  {
    id: 'impl-afir-first-targets',
    date: '2026-01-01',
    title: 'AFIR — first deployment targets',
    description:
      'Alternative Fuels Infrastructure Regulation first milestones: minimum public recharging power capacity along TEN-T core corridors and initial hydrogen refuelling stations. Reg. (EU) 2023/1804, Art. 3.',
    category: 'implementation',
    source: 'OJ L 234, 22.9.2023',
    policyId: 'afir-regulation',
    importance: 'medium',
    tags: ['transport', 'charging', 'hydrogen'],
  },
  {
    id: 'impl-green-bond-standard',
    date: '2026-03-01',
    title: 'EU Green Bonds Standard — application',
    description:
      'EU Green Bonds Standard becomes applicable. Issuers using the "European Green Bond" label must allocate proceeds to Taxonomy-aligned activities. Reg. (EU) 2023/2631, Art. 68.',
    category: 'implementation',
    source: 'OJ L 2023/2631, 30.11.2023',
    importance: 'medium',
    tags: ['green-bonds', 'taxonomy', 'finance'],
  },
  {
    id: 'impl-elec-market-reform',
    date: '2026-03-31',
    title: 'Electricity market reform — application',
    description:
      'Reformed EU electricity market design rules apply: two-way CfDs for public support to generation, strengthened consumer rights, provisions against price manipulation.',
    category: 'implementation',
    source: 'OJ L 2024/1747, 26.6.2024',
    importance: 'medium',
    tags: ['electricity', 'market-design', 'CfDs'],
  },
  {
    id: 'impl-social-climate-fund',
    date: '2026-04-01',
    title: 'Social Climate Fund — first disbursements',
    description:
      'First disbursements from the Social Climate Fund begin, supporting vulnerable households, micro-enterprises, and transport users. Reg. (EU) 2023/955, Art. 17.',
    category: 'implementation',
    source: 'OJ L 130, 16.5.2023',
    policyId: 'social-climate-fund',
    importance: 'high',
    tags: ['social-climate-fund', 'just-transition'],
  },
  // ── Q2 2026 — upcoming ────────────────────────────────────────────────
  {
    id: 'deadline-csrd-large',
    date: '2026-06-30',
    title: 'CSRD reporting — first reports due (large companies)',
    description:
      'First sustainability reports under CSRD due for large public-interest entities for FY 2025, using European Sustainability Reporting Standards (ESRS). Dir. (EU) 2022/2464, Art. 5(2).',
    category: 'implementation',
    source: 'OJ L 322, 16.12.2022',
    policyId: 'csrd',
    importance: 'high',
    tags: ['csrd', 'reporting', 'esrs'],
  },
  {
    id: 'impl-deforestation-large',
    date: '2026-06-30',
    title: 'Deforestation Regulation — application (large operators)',
    description:
      'EU Deforestation Regulation applicable for large operators. Products linked to deforestation (soy, beef, palm oil, wood, cocoa, coffee, rubber) may no longer be placed on the EU market. Reg. (EU) 2023/1115, Art. 38(1).',
    category: 'implementation',
    source: 'OJ L 150, 9.6.2023',
    policyId: 'deforestation-regulation',
    importance: 'high',
    tags: ['deforestation', 'supply-chain'],
  },
  {
    id: 'deadline-necp-updates',
    date: '2026-06-30',
    title: 'National Energy & Climate Plans — updates due',
    description:
      'Member States must submit updated NECPs reflecting raised ambition under Fit for 55 and REPowerEU. Reg. (EU) 2018/1999, Art. 14.',
    category: 'implementation',
    source: 'OJ L 328, 21.12.2018',
    policyId: 'governance-regulation',
    importance: 'high',
    tags: ['necp', 'governance', 'national-targets'],
  },
  // ── Q3 2026 ────────────────────────────────────────────────────────────
  {
    id: 'review-cbam-scope',
    date: '2026-07-01',
    title: 'CBAM scope review — Commission report due',
    description:
      'Commission reviews CBAM scope, assessing extension to organic chemicals, polymers and hydrogen; evaluating fertiliser methodology. Reg. (EU) 2023/956, Art. 30(2).',
    category: 'revision',
    source: 'OJ L 130, 16.5.2023',
    policyId: 'cbam-regulation',
    importance: 'high',
    tags: ['CBAM', 'scope-extension', 'review'],
  },
  {
    id: 'review-ets-msr',
    date: '2026-07-01',
    title: 'ETS Market Stability Reserve — scheduled review',
    description:
      'Review of the MSR intake rate, thresholds, and invalidation mechanism. Decision (EU) 2015/1814, Art. 3, as amended by Dir. 2023/959.',
    category: 'revision',
    source: 'OJ L 264, 9.10.2015 (amended)',
    policyId: 'eu-ets-directive',
    importance: 'medium',
    tags: ['ETS', 'MSR', 'allowance-surplus'],
  },
  {
    id: 'impl-taxonomy-env-objectives',
    date: '2026-07-01',
    title: 'Taxonomy — delegated acts for all 6 environmental objectives',
    description:
      'Updated Taxonomy delegated acts enter application, expanding technical screening criteria to biodiversity, circular economy, and pollution prevention. Reg. (EU) 2020/852, Art. 12.',
    category: 'implementation',
    source: 'OJ L 198, 22.6.2020',
    policyId: 'taxonomy-regulation',
    importance: 'medium',
    tags: ['taxonomy', 'sustainable-finance'],
  },
  {
    id: 'review-sfdr',
    date: '2026-07-01',
    title: 'SFDR review — Commission proposal due',
    description:
      'Commission publishes review of the Sustainable Finance Disclosure Regulation, simplifying product categorisation and enhancing anti-greenwashing. Reg. (EU) 2019/2088, Art. 19(3).',
    category: 'revision',
    source: 'OJ L 317, 9.12.2019',
    policyId: 'sfdr',
    importance: 'medium',
    tags: ['sfdr', 'sustainable-finance', 'greenwashing'],
  },
  {
    id: 'impl-h2-gas-transposition',
    date: '2026-07-01',
    title: 'Hydrogen & gas package — transposition deadline',
    description:
      'Member States must transpose the hydrogen and decarbonised gas market package: rules for dedicated hydrogen network, blending, third-party access.',
    category: 'implementation',
    source: 'OJ L 2024/1788, 15.7.2024',
    importance: 'medium',
    tags: ['hydrogen', 'gas', 'transposition'],
  },
  {
    id: 'impl-ai-act-full',
    date: '2026-08-02',
    title: 'AI Act — full application (general-purpose AI)',
    description:
      'EU AI Act fully applicable for GPAI systems, transparency, and governance structures. Reg. (EU) 2024/1689, Art. 113.',
    category: 'implementation',
    source: 'OJ L 2024/1689, 12.7.2024',
    policyId: 'ai-act',
    importance: 'medium',
    tags: ['ai-act', 'digital'],
  },
  {
    id: 'deadline-methane-reporting',
    date: '2026-08-04',
    title: 'Methane Regulation — first reporting obligations',
    description:
      'Energy-sector operators must submit methane emissions data using prescribed measurement methodologies. Reg. (EU) 2024/1787, Art. 12.',
    category: 'implementation',
    source: 'OJ L 2024/1787, 15.7.2024',
    policyId: 'methane-regulation',
    importance: 'high',
    tags: ['methane', 'oil-gas', 'reporting'],
  },
  {
    id: 'deadline-nature-restoration-plans',
    date: '2026-09-01',
    title: 'Nature Restoration Law — national plans due',
    description:
      'Member States must submit first national restoration plans covering targets for degraded ecosystems by 2030, 2040 and 2050. Reg. (EU) 2024/1991, Art. 15.',
    category: 'implementation',
    source: 'OJ L 2024/1991, 29.7.2024',
    policyId: 'nature-restoration-law',
    importance: 'high',
    tags: ['nature-restoration', 'biodiversity'],
  },
  {
    id: 'impl-fgas-phasedown',
    date: '2026-09-01',
    title: 'F-gas Regulation — next HFC phase-down step',
    description:
      'Next step in HFC phase-down, reducing the EU-wide quota. New service bans for certain equipment take effect. Reg. (EU) 2024/573, Art. 4 & Annex V.',
    category: 'implementation',
    source: 'OJ L 2024/573, 20.2.2024',
    policyId: 'f-gas-regulation',
    importance: 'medium',
    tags: ['f-gas', 'hfc', 'phase-down'],
  },
  {
    id: 'impl-data-act',
    date: '2026-09-12',
    title: 'Data Act — full application',
    description:
      'EU Data Act fully applicable. Rules on fair access to data from connected products, cloud switching, and data sharing with public bodies. Reg. (EU) 2023/2854, Art. 50.',
    category: 'implementation',
    source: 'OJ L 2023/2854, 22.12.2023',
    importance: 'medium',
    tags: ['data-act', 'digital'],
  },
  {
    id: 'deadline-air-quality-transposition',
    date: '2026-09-30',
    title: 'Air quality directive — transposition deadline',
    description:
      'Member States must transpose revised Ambient Air Quality Directive, aligning limit values more closely with WHO guidelines for PM2.5, NO2, and ozone.',
    category: 'implementation',
    source: 'Dir. (EU) 2024/2881',
    policyId: 'zero-pollution-action-plan',
    importance: 'medium',
    tags: ['air-quality', 'health', 'transposition'],
  },
  // ── Q4 2026 ────────────────────────────────────────────────────────────
  {
    id: 'impl-ecodesign-framework',
    date: '2026-10-01',
    title: 'Ecodesign for Sustainable Products — framework applies',
    description:
      'Framework provisions of the Ecodesign for Sustainable Products Regulation become applicable, enabling delegated acts for specific product groups. Reg. (EU) 2024/1781, Art. 72.',
    category: 'implementation',
    source: 'OJ L 2024/1781, 28.6.2024',
    policyId: 'ecodesign-sustainable-products',
    importance: 'medium',
    tags: ['ecodesign', 'circular-economy'],
  },
  {
    id: 'impl-cyber-resilience-first',
    date: '2026-11-01',
    title: 'Cyber Resilience Act — first obligations',
    description:
      'Manufacturers must report actively exploited vulnerabilities and cybersecurity incidents for connected products. Reg. (EU) 2024/2847, Art. 14.',
    category: 'implementation',
    source: 'OJ L 2024/2847, 20.11.2024',
    importance: 'medium',
    tags: ['cybersecurity', 'digital'],
  },
  {
    id: 'deadline-eed-renovation',
    date: '2026-12-01',
    title: 'Energy Efficiency Directive — 3% public building renovation',
    description:
      'Member States must demonstrate annual renovation of at least 3% of total floor area of public buildings owned by central government. Dir. (EU) 2023/1791, Art. 6.',
    category: 'implementation',
    source: 'OJ L 231, 20.9.2023',
    policyId: 'energy-efficiency-directive',
    importance: 'high',
    tags: ['energy-efficiency', 'buildings', 'renovation'],
  },
  {
    id: 'deadline-epbd-transposition',
    date: '2026-12-31',
    title: 'EPBD — first transposition deadline',
    description:
      'Member States must transpose key provisions of the recast EPBD into national law, including zero-emission building standards for new public buildings. Dir. (EU) 2024/1275, Art. 30.',
    category: 'implementation',
    source: 'OJ L 2024/1275, 8.5.2024',
    policyId: 'epbd-recast',
    importance: 'high',
    tags: ['buildings', 'energy-performance', 'transposition'],
  },
  // ── 2027 ──────────────────────────────────────────────────────────────
  {
    id: 'impl-ets2-2027',
    date: '2027-01-01',
    title: 'ETS2 — buildings & road transport launch',
    description:
      'New Emissions Trading System for buildings, road transport, and additional sectors starts. Fuel suppliers must surrender allowances. Dir. 2023/959, Art. 30k.',
    category: 'implementation',
    source: 'OJ L 130, 16.5.2023',
    policyId: 'eu-ets-directive',
    importance: 'high',
    tags: ['ETS2', 'buildings', 'transport'],
  },
  {
    id: 'deadline-csrd-sme',
    date: '2027-01-01',
    title: 'CSRD — listed SMEs begin reporting',
    description:
      'Listed SMEs begin reporting under CSRD using simplified ESRS standards. Two-year opt-out available until 2028. Dir. (EU) 2022/2464, Art. 5(3).',
    category: 'implementation',
    source: 'OJ L 322, 16.12.2022',
    policyId: 'csrd',
    importance: 'medium',
    tags: ['csrd', 'sme', 'reporting'],
  },
  {
    id: 'impl-packaging-waste',
    date: '2027-01-01',
    title: 'Packaging & Packaging Waste Regulation — application',
    description:
      'Key provisions apply: minimisation requirements, recyclability criteria, mandatory recycled content for plastic packaging, and reuse targets. Reg. (EU) 2025/40, Art. 65.',
    category: 'implementation',
    source: 'OJ L 2025/40, 17.1.2025',
    importance: 'medium',
    tags: ['packaging', 'circular-economy', 'waste'],
  },
  {
    id: 'impl-csddd-first-scope',
    date: '2027-02-01',
    title: 'CSDDD — application (largest companies)',
    description:
      'Corporate Sustainability Due Diligence Directive enters application for companies with >5,000 employees and >EUR 1.5bn turnover. Dir. (EU) 2024/1760, Art. 37.',
    category: 'implementation',
    source: 'OJ L 2024/1760, 5.7.2024',
    policyId: 'csddd',
    importance: 'high',
    tags: ['csddd', 'supply-chain', 'due-diligence'],
  },
  {
    id: 'deadline-deforestation-sme',
    date: '2027-06-30',
    title: 'Deforestation Regulation — SME compliance deadline',
    description:
      'EU Deforestation Regulation applicable to SMEs and non-large operators. Reg. (EU) 2023/1115, Art. 38(2).',
    category: 'implementation',
    source: 'OJ L 150, 9.6.2023',
    policyId: 'deforestation-regulation',
    importance: 'medium',
    tags: ['deforestation', 'sme'],
  },
  {
    id: 'impl-euro7-hd',
    date: '2027-07-01',
    title: 'Euro 7 — heavy-duty vehicles',
    description:
      'Euro 7 takes effect for new type-approvals of trucks and buses: tighter NOx limits, particle number limits, OBM requirements. Reg. (EU) 2024/1257, Art. 19.',
    category: 'implementation',
    source: 'OJ L 2024/1257, 8.5.2024',
    policyId: 'euro-7-regulation',
    importance: 'medium',
    tags: ['euro-7', 'transport', 'emissions'],
  },
  {
    id: 'impl-batteries-full',
    date: '2027-09-01',
    title: 'Batteries Regulation — full application',
    description:
      'Full application: digital battery passport for EV batteries, carbon footprint declarations, recycled content targets, end-of-life collection rates. Reg. (EU) 2023/1542, Art. 96.',
    category: 'implementation',
    source: 'OJ L 191, 28.7.2023',
    policyId: 'batteries-regulation',
    importance: 'medium',
    tags: ['batteries', 'circular-economy', 'ev'],
  },
  // ── Commission indicative planning — SEC(2026) 2563 final, 22.4.2026 ──
  // College agenda items for 22 Apr – 22 Jul 2026. All dates are "tbc" and
  // subject to change; proposals are contingent on Better Regulation impact
  // assessments. Only climate, energy, environment and agri-climate items
  // are surfaced here.
  {
    id: 'cwp-better-regulation-2026-04-28',
    date: '2026-04-28',
    title: 'Communication on better regulation and enforcement',
    description:
      'Commission College item (Strasbourg week). Horizontal communication on better regulation and enforcement. Lead: President / EVP Dombrovskis. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'medium',
    tags: ['better-regulation', 'horizontal', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-circular-economy-act-2026-05-06',
    date: '2026-05-06',
    title: 'Circular Economy Act — orientation debate',
    description:
      'Commission College orientation debate on the Circular Economy Act. Lead: President. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'high',
    tags: ['circular-economy', 'college-agenda', 'orientation-debate', 'indicative'],
  },
  {
    id: 'cwp-fertilisers-action-plan-2026-05-19',
    date: '2026-05-19',
    title: 'Fertilisers action plan',
    description:
      'Commission College item (Strasbourg week). Lead: EVP Fitto. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'medium',
    tags: ['fertilisers', 'agriculture', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-digital-ai-energy-roadmap-2026-05-27',
    date: '2026-05-27',
    title: 'Strategic Roadmap for Digitalisation and AI in Energy',
    description:
      'Part of the Tech Sovereignty package. Commission College adoption of a strategic roadmap for digitalisation and AI in energy. Lead: EVP Ribera. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'medium',
    tags: ['digitalisation', 'ai', 'energy', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-ocean-observation-2026-06-03',
    date: '2026-06-03',
    title: 'Ocean observation communication',
    description:
      'Commission College communication on ocean observation. Lead: EVP Fitto. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'normal',
    tags: ['oceans', 'environment', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-energy-package-2026-06-10',
    date: '2026-06-10',
    title: 'Energy package — Electrification action plan & energy security',
    description:
      'Commission College Energy package covering the Electrification action plan and the Strengthening energy security communication. Lead: EVP Ribera. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'high',
    tags: ['electrification', 'energy-security', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-coastal-regions-islands-2026-06-10',
    date: '2026-06-10',
    title: 'Coastal regions and islands package',
    description:
      'Commission College package with communications on coastal communities and on islands. Lead: EVP Fitto. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'normal',
    tags: ['coastal', 'islands', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-omnibus-energy-products-2026-06-24',
    date: '2026-06-24',
    title: 'Omnibus on energy product legislation',
    description:
      'Commission College simplification omnibus on energy product legislation. Leads: EVPs Ribera & Dombrovskis. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'high',
    tags: ['omnibus', 'energy', 'simplification', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-omnibus-taxation-2026-06-24',
    date: '2026-06-24',
    title: 'Omnibus on taxation',
    description:
      'Commission College simplification omnibus on taxation. Leads: EVPs Ribera & Dombrovskis. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'medium',
    tags: ['omnibus', 'taxation', 'simplification', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-sustainable-tourism-2026-06-24',
    date: '2026-06-24',
    title: 'Sustainable tourism strategy',
    description:
      'Commission College adoption of the Sustainable tourism strategy. Lead: EVP Fitto. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'normal',
    tags: ['tourism', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-livestock-strategy-2026-07-07',
    date: '2026-07-07',
    title: 'Livestock strategy',
    description:
      'Commission College adoption of the Livestock strategy (Strasbourg week). Lead: EVP Fitto. Indicative per SEC(2026) 2563 final.',
    category: 'commission_workprogramme',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    importance: 'medium',
    tags: ['livestock', 'agriculture', 'college-agenda', 'indicative'],
  },
  {
    id: 'cwp-ets-review-2026-07-15',
    date: '2026-07-15',
    title: 'ETS Review — Commission adoption',
    description:
      'Commission College scheduled adoption of the ETS Review. Lead: EVP Ribera. Indicative per SEC(2026) 2563 final — date is tbc and subject to Better Regulation impact-assessment completion.',
    category: 'revision',
    source: 'SEC(2026) 2563 final — Commission indicative planning',
    policyId: 'eu-ets-directive',
    importance: 'high',
    tags: ['ETS', 'review', 'college-agenda', 'indicative'],
  },
];

// ── 2. Live data sources ───────────────────────────────────────────────
// Light scrapes / RSS pulls that add fresher meeting items. Each source
// returns a list of PolicyClockEvent items; failures are silently skipped
// so the curated baseline always shows.

interface FeedSource {
  key: string;
  url: string;
  category: PolicyClockCategory;
  label: string;
}

const RSS_SOURCES: FeedSource[] = [
  {
    key: 'ep_envi',
    url: 'https://www.europarl.europa.eu/rss/committee/envi/en.xml',
    category: 'envi_committee',
    label: 'EP ENVI Committee',
  },
  {
    key: 'ep_top',
    url: 'https://www.europarl.europa.eu/rss/en/top-stories.xml',
    category: 'plenary',
    label: 'EP Top Stories',
  },
  {
    key: 'council_press',
    url: 'https://www.consilium.europa.eu/en/press/press-releases/?Page=1&format=xml',
    category: 'council_meeting',
    label: 'Council of the EU',
  },
  {
    key: 'ec_press',
    url: 'https://ec.europa.eu/commission/presscorner/api/documents?language=EN&commission=Commission2024',
    category: 'commission_workprogramme',
    label: 'European Commission',
  },
];

// Dates referenced in RSS items often appear as natural-language strings.
// We extract the future date if present, else fall back to the item's
// publication date (treated as "happening today / soon").
const DATE_RE = /\b(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\b/i;
const ISO_DATE_RE = /\b(20\d{2}-\d{2}-\d{2})\b/;
const MONTHS: Record<string, string> = {
  january: '01', february: '02', march: '03', april: '04', may: '05', june: '06',
  july: '07', august: '08', september: '09', october: '10', november: '11', december: '12',
};

function extractEventDate(text: string, fallback: string): string | null {
  const iso = ISO_DATE_RE.exec(text);
  if (iso) return iso[1];
  const m = DATE_RE.exec(text);
  if (m) {
    const day = m[1].padStart(2, '0');
    const month = MONTHS[m[2].toLowerCase()];
    return `${m[3]}-${month}-${day}`;
  }
  if (fallback) {
    const d = new Date(fallback);
    if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  return null;
}

interface RSSItem { title: string; link: string; pubDate: string; description: string; }

function parseRSSItems(xml: string): RSSItem[] {
  const items: RSSItem[] = [];
  const tag = (t: string, c: string) => {
    const re = new RegExp(`<${t}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${t}>|<${t}[^>]*>([\\s\\S]*?)<\\/${t}>`);
    const m = re.exec(c);
    return ((m?.[1] || m?.[2]) || '').trim();
  };
  const itemRe = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = itemRe.exec(xml)) !== null) {
    const c = m[1];
    items.push({
      title: tag('title', c),
      link: tag('link', c),
      pubDate: tag('pubDate', c) || tag('dc:date', c),
      description: tag('description', c).replace(/<[^>]+>/g, '').slice(0, 400),
    });
  }
  return items;
}

async function fetchFeedEvents(src: FeedSource): Promise<PolicyClockEvent[]> {
  try {
    const res = await fetch(src.url, {
      next: { revalidate: 1800 }, // cache 30 min — calendar refreshes regularly
      headers: { Accept: 'application/rss+xml, application/xml, text/xml, application/json' },
    });
    if (!res.ok) return [];
    const text = await res.text();

    // JSON variant (EC press corner)
    if (text.trim().startsWith('{') || text.trim().startsWith('[')) {
      try {
        const data = JSON.parse(text);
        const arr = Array.isArray(data) ? data : (data.results || data.items || []);
        return arr.slice(0, 30).map((item: Record<string, string>, idx: number): PolicyClockEvent | null => {
          const date = extractEventDate(`${item.title} ${item.description || ''}`, item.date || item.published || '');
          if (!date) return null;
          return {
            id: `${src.key}-${idx}-${date}`,
            date,
            title: item.title || item.headline || '',
            description: (item.description || item.summary || '').slice(0, 280),
            category: src.category,
            source: src.label,
            sourceUrl: item.url || item.link || '',
            importance: 'normal',
            tags: ['live'],
          };
        }).filter((x: PolicyClockEvent | null): x is PolicyClockEvent => !!x && !!x.title);
      } catch { return []; }
    }

    // RSS/XML
    const items = parseRSSItems(text);
    const today = new Date().toISOString().slice(0, 10);
    return items.slice(0, 30).map((item, idx): PolicyClockEvent | null => {
      const date = extractEventDate(`${item.title} ${item.description}`, item.pubDate);
      if (!date) return null;
      // Skip past items older than 14 days — clock is forward-looking.
      const cutoff = new Date(Date.now() - 14 * 86400000).toISOString().slice(0, 10);
      if (date < cutoff) return null;
      const importance = inferImportance(item.title, src.category);
      return {
        id: `${src.key}-${idx}-${date}`,
        date: date < today ? today : date, // surface ongoing items as "today"
        title: item.title.slice(0, 200),
        description: item.description,
        category: src.category,
        source: src.label,
        sourceUrl: item.link,
        importance,
        tags: ['live'],
      };
    }).filter((x): x is PolicyClockEvent => !!x);
  } catch {
    return [];
  }
}

function inferImportance(title: string, category: PolicyClockCategory): 'high' | 'medium' | 'normal' {
  const t = title.toLowerCase();
  if (/\b(vote|adopt|trilogue|first reading|final|launch|enter into force|agreement)\b/.test(t)) return 'high';
  if (category === 'council_meeting' || category === 'plenary') return 'high';
  if (/\b(hearing|debate|exchange|consultation|publication|report)\b/.test(t)) return 'medium';
  return 'normal';
}

// ── 3. AI weekly overview ───────────────────────────────────────────────

interface WeeklyOverview {
  text: string;
  generated: boolean;
  reason?: string;
}

async function buildWeeklyOverview(events: PolicyClockEvent[]): Promise<WeeklyOverview> {
  if (!hasAnyLLMKey()) {
    return {
      text: fallbackOverview(events),
      generated: false,
      reason: 'no-api-key',
    };
  }

  const today = new Date();
  const weekEnd = new Date(today.getTime() + 7 * 86400000);
  const start = today.toISOString().slice(0, 10);
  const end = weekEnd.toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= start && e.date <= end);
  if (upcoming.length === 0) {
    return {
      text: 'No major Brussels events scheduled in the next 7 days. Watch this space for revisions to the calendar.',
      generated: false,
      reason: 'no-upcoming',
    };
  }

  const compact = upcoming.slice(0, 30).map(e => `- [${e.date}] (${e.category}) ${e.title}`).join('\n');
  const prompt = `You are a Brussels EU climate policy briefer. The following are the events scheduled in the next 7 days:\n\n${compact}\n\nWrite a concise 3-4 sentence overview (max 80 words) of the major things happening in Brussels next week, written for an analyst audience. Highlight the 2-3 most important items by name. Do not list every event. Use a neutral, professional tone. No emoji, no headlines, no bullet points — plain paragraph only.`;

  const result = await callLLM(prompt, { maxTokens: 220, temperature: 0.4, longModel: false });
  if (result.text) {
    return { text: result.text.trim(), generated: true };
  }
  return {
    text: fallbackOverview(events),
    generated: false,
    reason: result.reason || 'api-error',
  };
}

function fallbackOverview(events: PolicyClockEvent[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const weekEnd = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
  const upcoming = events.filter(e => e.date >= today && e.date <= weekEnd);
  if (upcoming.length === 0) return 'No major Brussels events scheduled in the next 7 days.';
  const high = upcoming.filter(e => e.importance === 'high').slice(0, 3);
  const headline = high.length > 0
    ? `Key items: ${high.map(e => e.title).join('; ')}.`
    : `${upcoming.length} events scheduled.`;
  return `Next 7 days in Brussels: ${upcoming.length} scheduled events across ${new Set(upcoming.map(e => e.category)).size} categories. ${headline}`;
}

// ── Route handler ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const category = searchParams.get('category') as PolicyClockCategory | null;
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  const skipAI = searchParams.get('skip_ai') === '1';

  // Fetch live RSS + user-authored events in parallel; failures degrade gracefully.
  const [liveResults, userEvents] = await Promise.all([
    Promise.allSettled(RSS_SOURCES.map(fetchFeedEvents)),
    getPolicyClockUserEvents().catch(() => []),
  ]);
  const liveEvents = liveResults.flatMap(r => (r.status === 'fulfilled' ? r.value : []));

  // De-duplicate by title (live RSS may repeat curated items).
  const curatedTitles = new Set(CURATED_EVENTS.map(e => e.title.toLowerCase()));
  const dedupedLive = liveEvents.filter(e => !curatedTitles.has(e.title.toLowerCase()));

  // Convert user-authored events into the Policy Clock event shape.
  const userPolicyEvents: PolicyClockEvent[] = userEvents.map(ev => ({
    id: ev.id,
    date: ev.date,
    endDate: ev.endDate,
    time: ev.time,
    title: ev.title,
    description: ev.description || `Added by ${ev.addedBy}`,
    category: ev.category,
    source: ev.sourceLabel || 'User-added',
    sourceUrl: ev.sourceUrl,
    location: ev.location,
    importance: ev.importance,
    tags: ev.tags,
  }));

  let events: PolicyClockEvent[] = [...CURATED_EVENTS, ...dedupedLive, ...userPolicyEvents];

  // Filter by category if requested.
  if (category) events = events.filter(e => e.category === category);
  if (from) events = events.filter(e => e.date >= from);
  if (to) events = events.filter(e => e.date <= to);

  // Sort by date ascending.
  events.sort((a, b) => a.date.localeCompare(b.date));

  // Compute overview from the unfiltered upcoming set so the summary doesn't
  // depend on the active filter.
  const allEvents = [...CURATED_EVENTS, ...dedupedLive, ...userPolicyEvents]
    .sort((a, b) => a.date.localeCompare(b.date));
  const overview = skipAI
    ? { text: fallbackOverview(allEvents), generated: false, reason: 'skipped' }
    : await buildWeeklyOverview(allEvents);

  return NextResponse.json(
    {
      events,
      overview,
      counts: {
        total: events.length,
        live: dedupedLive.length,
        curated: CURATED_EVENTS.length,
        user: userPolicyEvents.length,
        by_category: countBy(events, e => e.category),
      },
      sources: RSS_SOURCES.map(s => ({ key: s.key, label: s.label })),
      last_updated: new Date().toISOString(),
    },
    {
      headers: {
        // Cache for 30 min on the edge so the calendar refreshes itself.
        'Cache-Control': 'public, max-age=1800, s-maxage=1800',
      },
    },
  );
}

function countBy<T, K extends string>(items: T[], key: (t: T) => K): Record<K, number> {
  const out = {} as Record<K, number>;
  for (const item of items) {
    const k = key(item);
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}
