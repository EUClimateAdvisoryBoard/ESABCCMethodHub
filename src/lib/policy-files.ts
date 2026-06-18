/**
 * Policy Files registry — backbone of the File Tracker beta module.
 * ------------------------------------------------------------------
 * A "file" (dossier) is a single EU climate-relevant legislative act or
 * package that the Secretariat needs to follow over time — e.g. the LULUCF
 * Regulation, the EU ETS Directive, the 2040 climate target. Each file has a
 * stable id (kept in sync with `src/lib/rss-feeds.ts` and
 * `src/lib/policy-references.ts` so the live RSS tagger maps onto the same
 * ids), a sector, a legislative stage, a one-line description and a set of
 * matching keywords used to attach incoming news items to the right file.
 *
 * The File Tracker groups news chronologically *per file* so a reader can
 * open "LULUCF" and immediately see "there is this discussion now", rather
 * than scrolling a single undifferentiated newsfeed.
 */

export type FileSector =
  | 'Cross-cutting'
  | 'Energy'
  | 'Industry'
  | 'Transport'
  | 'Buildings'
  | 'Agriculture'
  | 'LULUCF'
  | 'Finance'
  | 'Governance';

export type FileStage =
  | 'In force'
  | 'Under revision'
  | 'Proposed'
  | 'Implementation';

export interface PolicyFile {
  /** Stable id, shared with rss-feeds / policy-references. */
  id: string;
  /** Full name of the act / dossier. */
  name: string;
  /** Short code shown on chips ("LULUCF", "ETS", "ESR"…). */
  shortCode: string;
  sector: FileSector;
  stage: FileStage;
  /** CELEX number where one exists (proposals may not have one yet). */
  celex?: string;
  /** One-line description of what the file regulates / why it matters. */
  summary: string;
  /** EUR-Lex (or other authoritative) landing URL. */
  url?: string;
  /** Lower-cased keywords/phrases used to attach news items to this file. */
  keywords: string[];
}

export interface FileNewsItem {
  id: string;
  /** Which policy file this item belongs to. */
  fileId: string;
  /** ISO date (YYYY-MM-DD). */
  date: string;
  title: string;
  summary: string;
  source: string;
  url: string;
  /** Coarse classification used for the timeline marker colour. */
  kind: 'proposal' | 'vote' | 'consultation' | 'milestone' | 'publication' | 'development';
}

/* ------------------------------------------------------------------ */
/*  The registry                                                       */
/* ------------------------------------------------------------------ */

export const POLICY_FILES: PolicyFile[] = [
  {
    id: 'eu-climate-law',
    name: 'European Climate Law & 2040 target',
    shortCode: '2040 target',
    sector: 'Cross-cutting',
    stage: 'Under revision',
    celex: '32021R1119',
    summary:
      'Makes the 2050 climate-neutrality goal and the −55% 2030 target legally binding; the 2025 amendment inserting the −90% 2040 target is in co-decision.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1119',
    keywords: ['climate law', 'climate neutrality', '2040 target', '2040 climate', '90%', 'net zero', 'net-zero', 'climate target'],
  },
  {
    id: 'eu-ets-directive',
    name: 'EU Emissions Trading System (ETS 1)',
    shortCode: 'ETS',
    sector: 'Industry',
    stage: 'In force',
    celex: '32003L0087',
    summary:
      'The EU cap-and-trade carbon market for power, industry and aviation; tightened under Fit for 55 with a steeper linear reduction factor and a phase-out of free allowances.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32003L0087',
    keywords: ['eu ets', 'emissions trading', 'emission trading', 'carbon market', 'carbon price', 'allowance', 'eua', 'ets directive'],
  },
  {
    id: 'ets2-buildings-transport',
    name: 'ETS2 — buildings, road transport & fuels',
    shortCode: 'ETS2',
    sector: 'Cross-cutting',
    stage: 'Implementation',
    celex: '32023L0959',
    summary:
      'A separate emissions-trading system for fuels used in buildings, road transport and small industry; price applies from 2027 (possible one-year delay under discussion).',
    url: 'https://climate.ec.europa.eu/eu-action/eu-emissions-trading-system-eu-ets/ets2-buildings-road-transport-and-additional-sectors_en',
    keywords: ['ets2', 'ets 2', 'second emissions trading', 'buildings and road transport', 'fuel ets'],
  },
  {
    id: 'effort-sharing-regulation',
    name: 'Effort Sharing Regulation',
    shortCode: 'ESR',
    sector: 'Cross-cutting',
    stage: 'In force',
    celex: '32018R0842',
    summary:
      'Binding national emission targets for the sectors outside ETS1 (transport, buildings, agriculture, waste, small industry); EU-wide −40% by 2030 vs 2005.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0842',
    keywords: ['effort sharing', 'esr', 'non-ets', 'national targets', 'member state targets'],
  },
  {
    id: 'lulucf-regulation',
    name: 'LULUCF Regulation',
    shortCode: 'LULUCF',
    sector: 'LULUCF',
    stage: 'In force',
    celex: '32018R0841',
    summary:
      'Governs the land-use, land-use-change and forestry sink; sets an EU net-removals target of −310 MtCO₂e by 2030. The eroding land sink is a live concern.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R0841',
    keywords: ['lulucf', 'land use', 'land-use', 'forestry', 'carbon sink', 'land sink', 'forest', 'soil carbon', 'removals'],
  },
  {
    id: 'renewable-energy-directive',
    name: 'Renewable Energy Directive (RED III)',
    shortCode: 'RED III',
    sector: 'Energy',
    stage: 'Implementation',
    celex: '32023L2413',
    summary:
      'Raises the 2030 EU renewables target to 42.5% (aiming 45%), speeds up permitting and tightens transport and industry sub-targets. Member-state transposition ongoing.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L2413',
    keywords: ['renewable energy', 'red iii', 'red ii', 'renewables directive', 'renewable target', 'permitting'],
  },
  {
    id: 'energy-efficiency-directive',
    name: 'Energy Efficiency Directive (EED recast)',
    shortCode: 'EED',
    sector: 'Energy',
    stage: 'Implementation',
    celex: '32023L1791',
    summary:
      'Makes "energy efficiency first" binding; an 11.7% reduction in EU final energy consumption by 2030 and an annual public-sector renovation obligation.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023L1791',
    keywords: ['energy efficiency', 'eed', 'energy savings', 'final energy consumption'],
  },
  {
    id: 'epbd-recast',
    name: 'Energy Performance of Buildings Directive (EPBD)',
    shortCode: 'EPBD',
    sector: 'Buildings',
    stage: 'Implementation',
    celex: '32024L1275',
    summary:
      'Zero-emission new buildings from 2030, minimum energy-performance trajectories for the worst-performing stock and a phase-out of fossil-fuel boiler subsidies.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024L1275',
    keywords: ['epbd', 'building performance', 'energy performance of buildings', 'zero-emission building', 'renovation'],
  },
  {
    id: 'cbam-regulation',
    name: 'Carbon Border Adjustment Mechanism (CBAM)',
    shortCode: 'CBAM',
    sector: 'Industry',
    stage: 'Implementation',
    celex: '32023R0956',
    summary:
      'A carbon price on imports of iron & steel, aluminium, cement, fertilisers, electricity and hydrogen; definitive regime with financial liability starts 2026.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0956',
    keywords: ['cbam', 'carbon border', 'border adjustment', 'carbon leakage', 'import carbon'],
  },
  {
    id: 'co2-cars-regulation',
    name: 'CO₂ standards for cars & vans',
    shortCode: 'CO₂ cars',
    sector: 'Transport',
    stage: 'In force',
    celex: '32023R0851',
    summary:
      '100% CO₂ reduction for new cars and vans from 2035 (the de-facto combustion-engine phase-out), with a 2026 review clause now under political pressure.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0851',
    keywords: ['co2 cars', 'car emission', 'vehicle emission', 'combustion engine', '2035', 'zero-emission vehicle', 'e-fuel'],
  },
  {
    id: 'afir-regulation',
    name: 'Alternative Fuels Infrastructure Regulation (AFIR)',
    shortCode: 'AFIR',
    sector: 'Transport',
    stage: 'Implementation',
    celex: '32023R1804',
    summary:
      'Mandatory EV-charging and hydrogen-refuelling deployment targets along the TEN-T network and minimum power per registered vehicle.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1804',
    keywords: ['afir', 'alternative fuel', 'charging infrastructure', 'recharging', 'hydrogen refuelling'],
  },
  {
    id: 'fueleu-maritime',
    name: 'FuelEU Maritime',
    shortCode: 'FuelEU',
    sector: 'Transport',
    stage: 'Implementation',
    celex: '32023R1805',
    summary:
      'A declining greenhouse-gas-intensity limit on energy used on board ships calling at EU ports, pushing renewable and low-carbon marine fuels.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1805',
    keywords: ['fueleu', 'maritime fuel', 'shipping emission', 'marine fuel'],
  },
  {
    id: 'refueleu-aviation',
    name: 'ReFuelEU Aviation',
    shortCode: 'ReFuelEU',
    sector: 'Transport',
    stage: 'Implementation',
    celex: '32023R2405',
    summary:
      'A rising sustainable-aviation-fuel (SAF) blending mandate at EU airports, starting 2% in 2025 and climbing to 70% by 2050.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R2405',
    keywords: ['refueleu', 'aviation fuel', 'sustainable aviation fuel', 'saf'],
  },
  {
    id: 'nature-restoration-law',
    name: 'Nature Restoration Regulation',
    shortCode: 'NRL',
    sector: 'LULUCF',
    stage: 'Implementation',
    celex: '32024R1991',
    summary:
      'Binding restoration targets covering at least 20% of EU land and sea by 2030, including rewetting drained peatlands relevant to the LULUCF sink.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1991',
    keywords: ['nature restoration', 'restoration law', 'ecosystem restoration', 'peatland', 'rewetting'],
  },
  {
    id: 'cap-strategic-plans',
    name: 'Common Agricultural Policy (CAP) & climate',
    shortCode: 'CAP',
    sector: 'Agriculture',
    stage: 'Under revision',
    summary:
      'The CAP Strategic Plans channel agri-climate spending (eco-schemes, conditionality); the post-2027 CAP reform and its climate architecture is being negotiated.',
    url: 'https://agriculture.ec.europa.eu/common-agricultural-policy/cap-overview/cap-strategic-plans_en',
    keywords: ['common agricultural policy', 'cap strategic', 'agricultural policy', 'eco-scheme', 'agriculture emission', 'farm'],
  },
  {
    id: 'methane-regulation',
    name: 'Methane Emissions Regulation (energy)',
    shortCode: 'Methane',
    sector: 'Energy',
    stage: 'Implementation',
    celex: '32024R1787',
    summary:
      'Measurement, reporting, verification and leak-detection-and-repair rules for oil, gas and coal, plus methane-intensity requirements on energy imports.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1787',
    keywords: ['methane', 'leak detection', 'flaring', 'venting'],
  },
  {
    id: 'social-climate-fund',
    name: 'Social Climate Fund',
    shortCode: 'SCF',
    sector: 'Finance',
    stage: 'Implementation',
    celex: '32023R0955',
    summary:
      'A €65bn+ fund to shield vulnerable households and micro-enterprises from the ETS2 price; member states must submit Social Climate Plans.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R0955',
    keywords: ['social climate fund', 'scf', 'energy poverty', 'social climate plan'],
  },
  {
    id: 'net-zero-industry-act',
    name: 'Net-Zero Industry Act (NZIA)',
    shortCode: 'NZIA',
    sector: 'Industry',
    stage: 'Implementation',
    celex: '32024R1735',
    summary:
      'Targets domestic manufacturing of strategic clean technologies (≥40% of EU deployment needs by 2030) with faster permitting and net-zero "valleys".',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1735',
    keywords: ['net-zero industry', 'nzia', 'clean tech manufacturing', 'clean industrial deal'],
  },
  {
    id: 'deforestation-regulation',
    name: 'EU Deforestation Regulation (EUDR)',
    shortCode: 'EUDR',
    sector: 'LULUCF',
    stage: 'Implementation',
    celex: '32023R1115',
    summary:
      'Bans placing deforestation-linked commodities (soy, beef, palm oil, cocoa, coffee, timber, rubber) on the EU market; application timeline repeatedly contested.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32023R1115',
    keywords: ['deforestation', 'eudr', 'forest degradation', 'commodity'],
  },
  {
    id: 'governance-regulation',
    name: 'Governance of the Energy Union (NECPs)',
    shortCode: 'Governance',
    sector: 'Governance',
    stage: 'Implementation',
    celex: '32018R1999',
    summary:
      'The five-yearly National Energy and Climate Plans (NECPs) and long-term strategies through which member states report progress to the 2030 and 2050 goals.',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32018R1999',
    keywords: ['governance regulation', 'necp', 'national energy and climate plan', 'energy union', 'long-term strategy'],
  },
];

export const POLICY_FILES_BY_ID: Record<string, PolicyFile> = Object.fromEntries(
  POLICY_FILES.map((f) => [f.id, f]),
);

export const FILE_SECTORS: FileSector[] = [
  'Cross-cutting',
  'Energy',
  'Industry',
  'Transport',
  'Buildings',
  'Agriculture',
  'LULUCF',
  'Finance',
  'Governance',
];

/* ------------------------------------------------------------------ */
/*  News → file matching                                               */
/* ------------------------------------------------------------------ */

/**
 * Return the ids of every file whose keywords appear in the given text.
 * Unlike `inferPolicyIds` in rss-feeds (which picks a single best id and
 * defaults to the Green Deal), this returns *all* matching files and nothing
 * when there is no match — the File Tracker only shows items it can confidently
 * attribute to a dossier.
 */
export function matchFilesForText(text: string): string[] {
  const haystack = text.toLowerCase();
  const ids: string[] = [];
  for (const file of POLICY_FILES) {
    if (file.keywords.some((kw) => haystack.includes(kw))) {
      ids.push(file.id);
    }
  }
  return ids;
}
