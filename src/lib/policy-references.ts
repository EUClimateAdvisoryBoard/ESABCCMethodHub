/**
 * Cross-link utility: EU policies ↔ literature references.
 * ---------------------------------------------------------
 * For each `Policy.id` we keep a small hand-curated keyword list
 * (e.g. "ETS", "emissions trading", "carbon market"). The function
 * `getPolicyReferences(policyId)` scans the bundled references corpus
 * for hits against that list and returns a ranked list.
 *
 * Not a replacement for a real semantic link: it is explicit, easy
 * to audit, and fast enough at the corpus sizes we actually work
 * with. The policy-text navigator uses it to populate the
 * "Relevant references" panel next to each act.
 *
 * Keep the keyword list tight — one or two words per bullet, no
 * common English terms. Broad keywords hurt precision more than
 * they help recall.
 */
import { references, Reference } from '@/data/references';

// Map policy IDs to search keywords that would appear in related references
const POLICY_KEYWORDS: Record<string, string[]> = {
  'eu-climate-law': ['climate law', 'climate neutrality', '2021/1119', 'net zero', 'net-zero', '2050 target', 'European Climate Law'],
  'eu-ets-directive': ['emission trading', 'EU ETS', 'emissions trading', '2003/87', 'carbon market', 'allowance', 'carbon pricing'],
  'effort-sharing-regulation': ['effort sharing', 'ESR', '2018/842', 'non-ETS', 'member state targets'],
  'lulucf-regulation': ['LULUCF', 'land use', 'land-use', 'forestry', '2018/841', 'carbon sink', 'carbon removal'],
  'renewable-energy-directive': ['renewable energy', 'RED II', 'RED III', '2018/2001', 'renewables directive'],
  'energy-efficiency-directive': ['energy efficiency', 'EED', '2012/27', '2023/1791', 'energy savings'],
  'cbam-regulation': ['CBAM', 'carbon border', 'border adjustment', '2023/956', 'carbon leakage'],
  'taxonomy-regulation': ['taxonomy', 'sustainable finance', '2020/852', 'green taxonomy'],
  'sfdr': ['SFDR', 'sustainable finance disclosure', '2019/2088', 'ESG disclosure'],
  'co2-cars-regulation': ['CO2 cars', 'vehicle emission', 'car emission', '2019/631', 'zero-emission vehicle', 'combustion engine ban'],
  'afir-regulation': ['AFIR', 'alternative fuel', 'charging infrastructure', '2023/1804'],
  'epbd-recast': ['EPBD', 'building performance', 'energy performance of buildings', 'building directive', '2024/1275', 'zero-emission building'],
  'eu-green-deal': ['green deal', 'European Green Deal'],
  'fit-for-55': ['fit for 55', 'Fit for 55', 'Fit-for-55'],
  'social-climate-fund': ['social climate fund', 'SCF', '2023/955', 'energy poverty'],
  'methane-regulation': ['methane regulation', 'methane emission', '2024/1787'],
  'nature-restoration-law': ['nature restoration', 'NRL', '2024/1991', 'ecosystem restoration'],
  'csrd': ['CSRD', 'sustainability reporting', '2022/2464', 'corporate sustainability', 'ESRS'],
  'fueleu-maritime': ['FuelEU Maritime', 'maritime fuel', '2023/1805', 'shipping emission'],
  'refueleu-aviation': ['ReFuelEU Aviation', 'sustainable aviation fuel', '2023/2405', 'SAF mandate'],
  'governance-regulation': ['governance regulation', '2018/1999', 'energy union governance', 'NECP', 'National Energy and Climate Plan'],
  'industrial-emissions-directive': ['industrial emissions', 'IED recast', '2010/75', 'BREF', '2024/1785'],
  'net-zero-industry-act': ['net-zero industry', 'NZIA', '2024/1735', 'clean tech manufacturing'],
  'critical-raw-materials-act': ['critical raw materials', 'CRMA', 'CRM Act', '2024/1252', 'rare earth'],
  'deforestation-regulation': ['deforestation', 'EUDR', '2023/1115', 'forest degradation'],
  'batteries-regulation': ['batteries regulation', '2023/1542', 'battery recycling', 'battery passport'],
  'ecodesign-sustainable-products': ['ecodesign', 'ESPR', 'sustainable products', 'digital product passport'],
  'cap-strategic-plans': ['common agricultural policy', 'CAP strategic', 'agricultural policy'],
  'f-gas-regulation': ['fluorinated gas', 'F-gas', 'HFC', '2024/573'],
  'waste-framework-directive': ['waste framework', '2008/98', 'waste hierarchy', 'circular economy'],
  'packaging-waste-regulation': ['packaging waste', 'PPWR', 'packaging regulation'],
  'csddd': ['CSDDD', 'due diligence', 'corporate sustainability due diligence', '2024/1760'],
  'euro-7-regulation': ['Euro 7', 'vehicle emission standard', '2024/1257'],
  // Additional climate/energy-relevant policies
  'co2-hdv-regulation': ['CO2 heavy-duty', 'HDV emission', 'truck emission', '2024/1610', 'zero-emission bus'],
  'water-framework-directive': ['water framework', 'WFD', '2000/60', 'river basin'],
  'single-use-plastics-directive': ['single-use plastic', '2019/904', 'plastic pollution'],
  'habitats-directive': ['habitats directive', 'Natura 2000', '92/43', 'habitat conservation'],
  'just-transition-fund': ['just transition', 'JTF', 'coal region'],
  'hydrogen-gas-package': ['hydrogen package', 'gas decarbonisation', 'hydrogen network'],
  'green-bonds-regulation': ['green bond standard', 'European green bond', '2023/2631'],
  'ten-t-regulation': ['TEN-T', 'trans-European transport', 'transport network'],
};

// Cache for policy-reference mappings
let cache: Record<string, Reference[]> | null = null;

export function getReferencesForPolicy(policyId: string, limit = 20): Reference[] {
  if (!cache) buildCache();
  return (cache![policyId] || []).slice(0, limit);
}

export function getPolicyIdsForReference(ref: Reference): string[] {
  if (!cache) buildCache();
  const result: string[] = [];
  for (const [policyId, refs] of Object.entries(cache!)) {
    if (refs.some(r => r.id === ref.id)) {
      result.push(policyId);
    }
  }
  return result;
}

function buildCache() {
  cache = {};
  for (const [policyId, keywords] of Object.entries(POLICY_KEYWORDS)) {
    const matched = new Set<string>();
    const results: Reference[] = [];

    for (const ref of references) {
      if (matched.has(ref.id)) continue;
      const searchText = `${ref.title} ${ref.fullCitation} ${ref.journal || ''}`.toLowerCase();
      for (const kw of keywords) {
        if (searchText.includes(kw.toLowerCase())) {
          matched.add(ref.id);
          results.push(ref);
          break;
        }
      }
    }

    // Sort by year descending
    results.sort((a, b) => parseInt(b.year) - parseInt(a.year));
    cache[policyId] = results;
  }
}
