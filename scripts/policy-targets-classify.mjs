// ---------------------------------------------------------------------------
// Classification helpers for the M·36 Policy Targets Register.
//
// Three things live here, all deterministic so `npm run build:policy-targets`
// reproduces them:
//
//   1. sectorsOf()  — the eight sectors/systems a target is relevant to
//                     (Energy · Buildings and built environment · Agri-food ·
//                     Transport and mobility · Industry · Land and marine
//                     ecosystems · Water · Health). A target can carry several,
//                     or none — rows with none stay in the register for review.
//   2. climateOf()  — mitigation / adaptation / both / none, decided by the
//                     MECHANISM the target works through, plus the written
//                     argument for that call (register column "climate argument").
//                     Mitigation = cuts GHGs, increases removals, or enables
//                     either. Adaptation = reduces vulnerability or exposure of
//                     people, assets, ecosystems or services, raises adaptive
//                     capacity, or seizes an opportunity from a changing climate.
//   3. duplicatesOf() — cross-policy duplicate / near-duplicate target texts.
//
// Requested by the ESABCC reviewer, July 2026. The rules these implement — and
// the rules for what belongs in the register at all — are written up in
// docs-internal/policy-targets-what-counts-as-a-target.md; what each correction
// pass changed is in docs-internal/policy-targets-human-review-2026-07.md.
// ---------------------------------------------------------------------------

const lc = (s) => (s || '').toLowerCase();

// Terms match on word boundaries, so "ets" does not fire inside "targets" and
// "port" does not fire inside "support". A trailing "*" makes the term a stem:
// "industr*" matches industry / industrial / industries.
const RE_CACHE = new Map();
function termRe(term) {
  if (!RE_CACHE.has(term)) {
    const stem = term.endsWith('*');
    const body = (stem ? term.slice(0, -1) : term).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    RE_CACHE.set(term, new RegExp(`\\b${body}${stem ? '' : '\\b'}`));
  }
  return RE_CACHE.get(term);
}
const hasAny = (s, words) => words.filter((w) => termRe(w).test(s));

// ─── 1. Sectors / systems ───────────────────────────────────────────────────
// `any` fires the sector. `strong` additionally fires it when the row's own
// policy is sector-agnostic. `veto` suppresses a false positive.
export const SECTOR_DEFS = [
  {
    key: 'energy',
    label: 'Energy',
    any: ['renewable energy', 'energy from renewable', 'renewable sources', 'energy efficiency', 'energy-efficient', 'energy efficient', 'energy saving*',
      'final energy consumption', 'primary energy', 'energy system*', 'energy union', 'electricity', 'power output',
      'grid', 'grids', 'interconnect*', 'district heating', 'heating and cooling', 'hydrogen', 'natural gas',
      'fossil fuel*', 'coal', 'lignite', 'oil and gas', 'energy poverty', 'biomethane', 'biofuel*', 'rfnbo*',
      'renewable fuels of non-biological origin', 'energy infrastructure', 'offshore renewable', 'wind',
      'solar', 'photovoltaic*', 'heat pump*', 'energy demand', 'energy supply', 'energy price*', 'power plant*',
      'combustion plant*', 'energy storage', 'flaring', 'venting', 'methane emission*', 'nuclear'],
    veto: [],
  },
  {
    key: 'buildings',
    label: 'Buildings and built environment',
    any: ['building', 'buildings', 'renovation*', 'renovate*', 'housing', 'household*', 'dwelling*',
      'construction product*', 'built environment', 'zero-emission building*', 'nearly zero-energy',
      'building stock', 'boiler*', 'heating system*', 'energy performance certificate*', 'urban', 'cities',
      'city', 'life-cycle global warming potential', 'whole life-cycle carbon'],
    veto: ['capacity building', 'building on', 'building a water-smart economy', 'urban wastewater'],
  },
  {
    key: 'agrifood',
    label: 'Agri-food',
    any: ['agricultur*', 'farm', 'farms', 'farmer*', 'farming', 'livestock', 'cap strategic plan*',
      'common agricultural policy', 'food', 'crop*', 'arable', 'grassland*', 'pesticide*', 'fertilis*',
      'fertiliz*', 'nutrient*', 'manure', 'aquaculture', 'fisher*', 'rural development', 'soil health',
      'organic farming', 'antimicrobial*', 'eco-scheme*'],
    veto: [],
  },
  {
    key: 'transport',
    label: 'Transport and mobility',
    any: ['transport*', 'mobility', 'vehicle*', 'passenger car*', 'light commercial vehicle*', 'heavy-duty',
      'recharging', 'refuelling', 'charging point*', 'aviation', 'aircraft', 'airport*', 'maritime', 'ship',
      'ships', 'shipping', 'vessel*', 'port', 'ports', 'rail', 'railway*', 'road network', 'ten-t', 'car', 'cars',
      'lorr*', 'bus', 'buses', 'inland waterway*', 'zero-emission vehicle*', 'sustainable aviation fuel*', 'shore-side', 'onshore power supply', 'traffic', 'modal shift', 'fleet*',
      'tyre*', 'euro 7'],
    veto: [],
  },
  {
    key: 'industry',
    label: 'Industry',
    any: ['industr*', 'manufactur*', 'net-zero technolog*', 'production process*', 'industrial installation*',
      'cbam', 'carbon border', 'emissions trading', 'steel', 'cement', 'chemical*', 'refiner*', 'raw material*',
      'battery', 'batteries', 'packaging', 'waste', 'recycl*', 'circular econom*', 'ecodesign',
      'fluorinated greenhouse gas*', 'hydrofluorocarbon*', 'switchgear', 'best available techniques',
      'carbon capture', 'co2 injection', 'storage site*', 'value chain*', 'supply chain*', 'smelter*',
      'clean tech*', 'clean industrial deal'],
    veto: ['battery electric', 'waste heat', 'wastewater', 'waste water'],
  },
  {
    key: 'ecosystems',
    label: 'Land and marine ecosystems',
    any: ['ecosystem*', 'habitat*', 'biodiversity', 'nature restoration', 'restoration measure*', 'restore*',
      'restoration', 'forest*', 'afforest*', 'deforest*', 'peatland*', 'wetland*', 'lulucf', 'land use',
      'carbon sink*', 'natura 2000', 'species', 'marine', 'sea', 'seas', 'ocean*', 'coastal', 'soil', 'soils',
      'pollinator*', 'tree', 'trees', 'river', 'rivers', 'free-flowing', 'good environmental status',
      'favourable reference area', 'nature-based solution*'],
    veto: [],
  },
  {
    key: 'water',
    label: 'Water',
    any: ['water', 'waters', 'drought*', 'flood*', 'river basin*', 'groundwater', 'surface water',
      'wastewater', 'drinking water', 'sanitation', 'water reuse', 'water efficiency', 'leakage*',
      'irrigation', 'good ecological status', 'hydrolog*', 'aquifer*', 'water scarcity'],
    veto: [],
  },
  {
    key: 'health',
    label: 'Health',
    any: ['health', 'premature death*', 'disease*', 'epidemic*', 'pandemic*', 'sanitation', 'air quality',
      'air pollution', 'noise', 'well-being', 'mortality', 'morbidity', 'patient*', 'heat stress', 'heatwave*',
      'vector-borne', 'antimicrobial resistance', 'occupational safety', 'mental health', 'human health',
      'public health'],
    veto: ['health of the ecosystem', 'soil health', 'healthy soils', 'good health of forests',
      'health of ecosystems', 'ecosystem health'],
  },
];

// Acts that are unambiguously about one system: rows whose own text carries no
// sector vocabulary inherit the act's system rather than being left blank.
const POLICY_PRIORS = {
  'afir-regulation': ['transport'], 'co2-cars-regulation': ['transport'], 'euro-7-regulation': ['transport'],
  'refueleu-aviation': ['transport'], 'fueleu-maritime': ['transport'], 'ten-t-regulation': ['transport'],
  'epbd-recast': ['buildings'], 'renovation-wave': ['buildings'],
  'energy-efficiency-directive': ['energy'], 'renewable-energy-directive': ['energy'],
  'ten-e-regulation': ['energy'], 'methane-regulation': ['energy'], 'eu-ets-directive': ['industry', 'energy'],
  'cap-strategic-plans': ['agrifood'], 'deforestation-regulation': ['ecosystems'],
  'lulucf-regulation': ['ecosystems'], 'nature-restoration-law': ['ecosystems'],
  'birds-directive': ['ecosystems'], 'habitats-directive': ['ecosystems'],
  'marine-strategy-framework-directive': ['ecosystems', 'water'], 'water-framework-directive': ['water'],
  'floods-directive': ['water'], 'water-resilience-strategy': ['water'],
  'batteries-regulation': ['industry'], 'packaging-waste-regulation': ['industry'],
  'waste-framework-directive': ['industry'], 'single-use-plastics-directive': ['industry'],
  'net-zero-industry-act': ['industry'], 'critical-raw-materials-act': ['industry'],
  'cbam-regulation': ['industry'], 'industrial-emissions-directive': ['industry'],
  'f-gas-regulation': ['industry'], 'ecodesign-sustainable-products': ['industry'],
  'european-health-union': ['health'], 'cross-border-health-threats': ['health'],
  'one-health-amr': ['health'], 'mental-health-approach': ['health'],
  'osh-framework-directive': ['health'],
};

export function sectorsOf(row) {
  const hay = lc(`${row.target_text} ${row.article || ''}`);
  const hits = {};
  for (const def of SECTOR_DEFS) {
    // Strip the veto phrases first, so a match that exists only inside one
    // ("soil health" → Health, "capacity building" → Buildings) does not fire.
    let stripped = hay;
    for (const v of def.veto) stripped = stripped.split(v).join(' ');
    const words = hasAny(stripped, def.any);
    if (words.length) hits[def.key] = words.slice(0, 4);
  }
  let keys = Object.keys(hits);
  if (!keys.length) {
    const prior = POLICY_PRIORS[row.policy_id];
    if (prior) {
      keys = [...prior];
      for (const k of prior) hits[k] = ['(act-level: this act addresses only this system)'];
    }
  }
  return { sectors: keys, evidence: hits };
}

// ─── 2. Climate relevance + the argument for it ─────────────────────────────
// Each mechanism is [id, human-readable clause, trigger phrases].
const MITIGATION_MECHANISMS = [
  ['M1', 'cuts greenhouse gases directly (emission limits, reduction targets or a carbon price on the emitting activity)',
    ['greenhouse gas emission reduction', 'reduce greenhouse gas', 'emission reduction*', 'emissions reduction*',
      'reduce emissions*', 'reducing emissions*', 'emission limit*', 'specific emissions target*',
      'net greenhouse gas emissions', 'ghg intensity', 'greenhouse gas intensity', 'co2 emissions', 'methane',
      'fluorinated greenhouse gas*', 'hydrofluorocarbon*', 'emissions trading', 'allowance*', 'carbon price',
      'phase-out', 'global warming potential', 'climate action', 'climate objective*', 'climate target*', 'climate and energy target*',
      'climate neutrality', 'climate-neutral', 'net zero', 'net-zero', 'carbon footprint', 'decarbonis*', 'decarboniz*',
      'average emissions', 'average specific emissions', 'fleet-wide target*', 'emission*']],
  ['M2', 'increases removals or protects the sink (land, forests or engineered storage)',
    ['removal*', 'removals by sinks', 'carbon sink*', 'net carbon sink', 'lulucf', 'carbon capture',
      'co2 injection', 'storage site*', 'geological storage', 'afforest*', 'reforest*', 'carbon-rich soil*', 'peatland*']],
  ['M3', 'cuts energy demand, which cuts the emissions of supplying that energy',
    ['energy efficiency', 'energy savings', 'final energy consumption', 'primary energy consumption',
      'energy demand', 'renovation', 'zero-emission building', 'nearly zero-energy', 'energy performance']],
  ['M4', 'switches supply or fuels to low-carbon sources',
    ['renewable energy', 'energy from renewable', 'renewable sources', 'share of renewable', 'hydrogen',
      'sustainable aviation fuel*', 'synthetic aviation fuel*', 'rfnbo*', 'renewable fuels of non-biological origin',
      'zero-emission vehicle*', 'zero- and low-emission', 'biomethane', 'low-carbon', 'low carbon', 'electrification', 'solar', 'wind', 'photovoltaic*', 'heat pump*',
      'district heating', 'renewable energy installation*']],
  ['M5', 'builds the enabling conditions for the above (infrastructure, permitting, finance, standards or planning)',
    ['recharging', 'refuelling', 'charging point*', 'shore-side', 'onshore power supply', 'grid', 'interconnect*',
      'permit-granting*', 'climate mainstreaming', 'climate expenditure', 'climate contribution', 'transition plan*',
      'net-zero technolog*', 'manufacturing capacity*', 'just transition', 'energy infrastructure', 'trans-european*',
      'auctioning revenue*', 'financial incentive*', 'eco-scheme*', 'climate proofing', 'pre-cabling', 'ducting',
      'strategic raw material*', 'critical raw material*', 'extraction capacity', 'processing capacity',
      'recycling capacity', 'climate expenditure', 'climate spending']],
  ['M6', 'cuts material and product emissions through circularity (less primary production means fewer process emissions)',
    ['recycled content', 'recycl*', 'reuse', 're-use', 'waste prevention*', 'waste generation', 'circular econom*',
      'collection rate*', 'packaging', 'single-use plastic*', 'municipal waste', 'ecodesign']],
];

const ADAPTATION_MECHANISMS = [
  ['A1', 'reduces the exposure or vulnerability of people, assets or infrastructure to climate impacts',
    ['adaptation', 'adapt to climate', 'climate proofing*', 'climate-proof', 'resilience', 'resilient',
      'flood risk', 'flood*', 'drought*', 'water scarcity', 'heatwave', 'heat stress', 'sea level',
      'extreme weather*', 'natural disaster*', 'disaster risk*', 'critical infrastructure', 'vulnerability*',
      'protection gap', 'climate risk*']],
  ['A2', 'keeps ecosystems and soils in a condition where they buffer climate impacts (retention, cooling, storm and flood protection)',
    ['restoration*', 'restore*', 'ecosystem*', 'habitat*', 'good ecological status', 'good environmental status',
      'soil health', 'healthy soils', 'nature-based solution*', 'free-flowing river', 'wetland*', 'peatland*',
      'favourable reference area', 'biodiversity', 'green infrastructure', 'water retention',
      'nutrient loss*', 'soil pollution', 'litter at sea', 'marine litter']],
  ['A3', 'raises adaptive capacity (risk assessment, early warning, monitoring, planning, skills, insurance or finance)',
    ['risk assessment*', 'early warning*', 'preparedness', 'contingency', 'monitoring and reporting',
      'adaptation strategy*', 'adaptation plan*', 'risk management plan*', 'insurance*', 'climate-adapt',
      'knowledge', 'training', 'observatory', 'stress test', 'scenario*']],
  ['A4', 'protects human health from climate-sensitive hazards (heat, air quality, water quality, disease)',
    ['health impact*', 'premature death*', 'human health', 'public health', 'disease*', 'epidemic*', 'sanitation',
      'drinking water', 'air quality', 'air pollution', 'noise', 'well-being', 'surveillance']],
  ['A5', 'seizes an opportunity created by a changing climate (new markets, diversified livelihoods)',
    ['new market opportunit*', 'diversif*', 'climate projections', 'future climate']],
];

// Phrases that make an "emission"/"resilience" hit spurious.
// Phrases where an "emission"/"resilience" hit would be spurious: the sentence
// is about air pollutants, noise or economic robustness, not greenhouse gases
// or climate impacts. They are stripped before the mechanisms are matched.
const CLIMATE_VETO = ['economic resilience', 'supply chain resilience', 'financial resilience',
  'resilience of the internal market', 'industrial resilience',
  'air pollutant emissions', 'emissions of air pollutants', 'pollutant emissions', 'noise emissions',
  'particulate matter emissions', 'ammonia emissions', 'emission of pollutants',
  'destruction and removal efficiency'];

function fire(hay, mechanisms) {
  const out = [];
  for (const [id, clause, words] of mechanisms) {
    // Quote the words as they appear in the target, not the pattern that found
    // them, so the argument reads as evidence rather than as machinery.
    const found = [];
    for (const w of words) {
      const m = termRe(w).exec(hay);
      if (m) found.push(hay.slice(m.index, m.index + m[0].length + (w.endsWith('*') ? /\w*/.exec(hay.slice(m.index + m[0].length))[0].length : 0)));
    }
    if (found.length) out.push({ id, clause, evidence: found.slice(0, 3) });
  }
  return out;
}

export function climateOf(row) {
  let hay = lc(`${row.target_text} ${row.article || ''}`);
  for (const v of CLIMATE_VETO) hay = hay.split(v).join(' ');
  const mit = fire(hay, MITIGATION_MECHANISMS);
  const ada = fire(hay, ADAPTATION_MECHANISMS);
  const relevance = mit.length && ada.length ? 'both' : mit.length ? 'mitigation' : ada.length ? 'adaptation' : 'none';
  const say = (side, list) => `${side}: ${list.map((m) => `${m.clause} (“${m.evidence[0]}”)`).join('; ')}.`;
  let argument;
  if (relevance === 'none') {
    argument = 'Neither: the target sets no outcome that lowers emissions or raises removals, and none that reduces '
      + 'climate vulnerability, exposure or adaptive capacity — it is kept in the register for review.';
  } else {
    const parts = [];
    if (mit.length) parts.push(say('Mitigation', mit));
    if (ada.length) parts.push(say('Adaptation', ada));
    argument = parts.join(' ');
  }
  return { relevance, argument, mitigation: mit.map((m) => m.id), adaptation: ada.map((m) => m.id) };
}

// ─── 3. Duplicate / near-duplicate target texts across policies ─────────────
const STOP = new Set(('the a an of and or to in for by on with that this shall be is are as at from its their which '
  + 'not more than least such other any all each may must will where under into per within between been also').split(' '));

function bag(s) {
  const words = lc(s).replace(/[^a-z0-9%\s]/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
  return new Set(words);
}
const jaccard = (a, b) => {
  let inter = 0;
  for (const w of a) if (b.has(w)) inter++;
  return inter / (a.size + b.size - inter || 1);
};

/**
 * For every row, the closest target text in a DIFFERENT policy.
 * ≥0.45 → duplicate wording; ≥0.25 → restates / closely similar. Rows whose text
 * names another tracked act (common in Commission communications, which collate
 * targets set elsewhere) are marked as citing it even below the threshold.
 */
export function duplicatesOf(rows, policyTitles = new Map()) {
  const bags = rows.map((r) => bag(r.target_text));
  const cites = rows.map((r) => {
    const hay = lc(r.target_text);
    const named = [];
    for (const [pid, names] of policyTitles) {
      if (pid === r.policy_id) continue;
      if (names.some((n) => n.length > 12 && hay.includes(lc(n)))) named.push(pid);
    }
    return named;
  });
  return rows.map((r, i) => {
    let best = null;
    for (let j = 0; j < rows.length; j++) {
      if (i === j || rows[j].policy_id === r.policy_id) continue;
      const s = jaccard(bags[i], bags[j]);
      const boosted = cites[i].includes(rows[j].policy_id) ? s + 0.12 : s;
      if (!best || boosted > best.score) best = { score: boosted, raw: s, row: rows[j] };
    }
    if (!best || best.score < 0.25) return '';
    const kind = best.score >= 0.45 ? 'Duplicate wording' : 'Similar target';
    const cited = cites[i].includes(best.row.policy_id) ? '; cited in the text' : '';
    return `${kind}: ${best.row.policy_short} — ${best.row.article || 'n/a'} (similarity ${best.raw.toFixed(2)}${cited})`;
  });
}
