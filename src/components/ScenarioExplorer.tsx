'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { exportToExcel, exportChartAsPng, exportChartAsSvg, exportChartAsCsv, buildProvenance } from '@/components/charts/exportUtils';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import OnboardingTour from '@/components/OnboardingTour';
import ScenarioViewsMenu from '@/components/ScenarioViewsMenu';
import ScenarioViewChips from '@/components/ScenarioViewChips';
import { EmptyState, LoadingState, ErrorState } from '@/components/ui/StateView';
import Skeleton from '@/components/ui/Skeleton';
import { FilterPill, FilterPillRow } from '@/components/ui/FilterPill';

const ScenarioChart = dynamic(() => import('@/components/ScenarioChart'), { ssr: false });
const FanChart = dynamic(() => import('@/components/charts/FanChart'), { ssr: false });
const BarChartComponent = dynamic(() => import('@/components/charts/BarChart'), { ssr: false });
const BoxPlot = dynamic(() => import('@/components/charts/BoxPlot'), { ssr: false });
const WorldMap = dynamic(() => import('@/components/charts/WorldMap'), { ssr: false });
const DifferenceChart = dynamic(() => import('@/components/charts/DifferenceChart'), { ssr: false });
const EurostatExplorer = dynamic(() => import('@/components/EurostatExplorer'), { ssr: false });
const PolicyGapExplorer = dynamic(() => import('@/components/PolicyGapExplorer'), { ssr: false });
const ScenarioPolicyAlignment = dynamic(() => import('@/components/ScenarioPolicyAlignment'), { ssr: false });

// ── Types ──────────────────────────────────────────────────────────────────

interface Database { key: string; label: string; description: string }
interface Run { id: number; model: string; scenario: string; category: string; meta: Record<string, string> }
type RunMap = Record<number, { model: string; scenario: string; category: string }>;
interface ChartData {
  variable: string;
  series: { label: string; points: { year: number; value: number }[]; category?: string }[];
  unit: string;
  region?: string;
  chartType?: 'line' | 'fan' | 'bar' | 'box' | 'map';
  /** True for historical observation data (e.g. Eurostat) — disables percentile aggregation */
  historical?: boolean;
}
interface BarGroup { label: string; values: { name: string; value: number }[] }
interface BoxData { label: string; values: number[] }
interface MapRegion { region: string; value: number }

// ── Climate categories (IPCC AR6 C1-C8) ─────────────────────────────────
const CLIMATE_CATEGORIES: Record<string, { label: string; color: string; description: string }> = {
  'C1': { label: 'C1: <1.5°C no/low OS', color: '#004B7F', description: 'Below 1.5°C with no or limited overshoot' },
  'C2': { label: 'C2: <1.5°C high OS', color: '#0065A4', description: 'Return to below 1.5°C by 2100 after high overshoot (>0.1°C above 1.5°C at peak)' },
  'C3': { label: 'C3: Likely <2°C', color: '#007B6C', description: 'Likely below 2°C' },
  'C4': { label: 'C4: Below 2°C', color: '#54728C', description: 'Below 2°C' },
  'C5': { label: 'C5: Below 2.5°C', color: '#FF9933', description: 'Below 2.5°C' },
  'C6': { label: 'C6: Below 3°C', color: '#A530B8', description: 'Below 3°C' },
  'C7': { label: 'C7: Below 4°C', color: '#B83230', description: 'Below 4°C' },
  'C8': { label: 'C8: Above 4°C', color: '#6667AB', description: 'Above 4°C' },
};

// ── SSP-RCP narrative classification ─────────────────────────────────────
const SSP_NARRATIVES: Record<string, { label: string; color: string; description: string }> = {
  'SSP1': { label: 'SSP1: Sustainability', color: '#007B6C', description: 'Taking the Green Road — low challenges to mitigation & adaptation' },
  'SSP2': { label: 'SSP2: Middle of the Road', color: '#004B7F', description: 'Middle of the Road — moderate challenges' },
  'SSP3': { label: 'SSP3: Regional Rivalry', color: '#B83230', description: 'A Rocky Road — high challenges to mitigation & adaptation' },
  'SSP4': { label: 'SSP4: Inequality', color: '#A530B8', description: 'A Road Divided — low challenges to mitigation, high to adaptation' },
  'SSP5': { label: 'SSP5: Fossil-fueled', color: '#FF9933', description: 'Taking the Highway — high challenges to mitigation, low to adaptation' },
};

// ── RCP Scenario Classification ──────────────────────────────────────────
const RCP_SCENARIOS: Record<string, { label: string; color: string; description: string; warming: string }> = {
  'RCP2.6': { label: 'RCP2.6', color: '#004B7F', description: 'Peak-and-decline — strong mitigation', warming: '0.3-1.7°C by 2100' },
  'RCP4.5': { label: 'RCP4.5', color: '#007B6C', description: 'Intermediate — stabilisation scenario', warming: '1.1-2.6°C by 2100' },
  'RCP6.0': { label: 'RCP6.0', color: '#FF9933', description: 'High — stabilisation without overshoot', warming: '1.4-3.1°C by 2100 (AR5)' },
  'RCP7.0': { label: 'RCP7.0', color: '#E05500', description: 'High — regional rivalry baseline (CMIP6)', warming: '2.8-4.6°C by 2100 (AR6, as SSP3-7.0)' },
  'RCP8.5': { label: 'RCP8.5', color: '#B83230', description: 'Very high — business as usual', warming: '2.6-4.8°C by 2100' },
};

/** Combined SSP-RCP scenario pairs */
const SSP_RCP_COMBINATIONS: Record<string, { ssp: string; rcp: string; label: string; description: string }> = {
  'SSP1-RCP2.6': { ssp: 'SSP1', rcp: 'RCP2.6', label: 'SSP1-2.6: Sustainable + Strong Mitigation', description: 'Sustainability pathway with aggressive mitigation' },
  'SSP2-RCP4.5': { ssp: 'SSP2', rcp: 'RCP4.5', label: 'SSP2-4.5: Middle Road (Baseline)', description: 'Middle-of-the-road development with intermediate forcing' },
  'SSP3-RCP7.0': { ssp: 'SSP3', rcp: 'RCP7.0', label: 'SSP3-7.0: Regional Rivalry + High Forcing', description: 'Regional rivalry with high forcing (standard CMIP6/AR6 pairing)' },
  'SSP5-RCP8.5': { ssp: 'SSP5', rcp: 'RCP8.5', label: 'SSP5-8.5: Fossil-fueled + Very High Forcing', description: 'Fossil-fueled development with very high forcing' },
};

/** European warming projections under each RCP (IPCC AR5 global ranges; Europe warms faster) */
const EUROPE_RCP_WARMING: Record<string, { by2050: string; by2100: string }> = {
  'RCP2.6': { by2050: '+1.0-1.8°C', by2100: '+0.5-2.0°C' },
  'RCP4.5': { by2050: '+1.2-2.2°C', by2100: '+1.5-3.2°C' },
  'RCP6.0': { by2050: '+1.1-2.0°C', by2100: '+2.0-3.8°C' },
  'RCP8.5': { by2050: '+1.5-2.8°C', by2100: '+3.5-5.5°C' },
};

/** Infer RCP from scenario name */
function inferRCP(scenarioName: string): string {
  const upper = scenarioName.toUpperCase();
  if (/RCP\s*2[.\s]*6|26/.test(upper) && /RCP/.test(upper)) return 'RCP2.6';
  if (/RCP\s*4[.\s]*5|45/.test(upper) && /RCP/.test(upper)) return 'RCP4.5';
  if (/RCP\s*6[.\s]*0|60/.test(upper) && /RCP/.test(upper)) return 'RCP6.0';
  if (/RCP\s*7[.\s]*0|70/.test(upper) && /RCP/.test(upper)) return 'RCP7.0';
  if (/RCP\s*8[.\s]*5|85/.test(upper) && /RCP/.test(upper)) return 'RCP8.5';
  return '';
}

// ── ESABCC 2040 Target Advice ────────────────────────────────────────────
// The European Scientific Advisory Board on Climate Change (ESABCC) published
// its scientific advice on the 2040 EU climate target in June 2023 (initial framing report) and June 2024 (formal recommendation of 90-95% reduction).
// Key recommendations:
// - Net GHG reduction of 90-95% by 2040 compared to 1990 levels
// - Aligned with 1.5°C global warming limit (no/limited overshoot → C1/C2)
// - EU fair share of remaining global carbon budget
// - Rapid phase-out of fossil fuels, strong energy efficiency
// - Limited reliance on carbon dioxide removal (CDR)
const ESABCC_2040_CRITERIA = {
  label: 'ESABCC 2040 Advice',
  description: 'Scenarios aligned with the ESABCC scientific advice: 90-95% net GHG reduction by 2040 vs 1990, 1.5°C compatible (C1/C2)',
  // Only C1 and C2 categories qualify (1.5°C with no/low or high overshoot)
  categories: ['C1', 'C2'],
  // Prefer sustainability-oriented pathways
  preferredNarratives: ['SSP1', 'SSP2'],
  // EU-focused databases
  euDatabase: 'eu-cab',
  // Key benchmark: EU GHG should be ~90-95% below 1990 by 2040
  benchmarks: [
    { year: 2030, variable: 'Emissions|CO2', minReduction: 0.55, label: '≥55% reduction by 2030 (EU Climate Law)' },
    { year: 2040, variable: 'Emissions|CO2', minReduction: 0.90, label: '≥90% reduction by 2040 (ESABCC advice)' },
    { year: 2050, variable: 'Emissions|CO2', minReduction: 1.00, label: 'Net-zero by 2050 (EU Climate Law)' },
  ],
};

/** Infer SSP narrative from scenario name */
function inferSSP(scenarioName: string): string {
  const upper = scenarioName.toUpperCase();
  if (/SSP1/.test(upper) || /SPA1/.test(upper) || /SUSDEV/.test(upper) || /GREEN/.test(upper)) return 'SSP1';
  if (/SSP2/.test(upper) || /SPA2/.test(upper) || /MIDDLE/.test(upper)) return 'SSP2';
  if (/SSP3/.test(upper) || /SPA3/.test(upper) || /RIVAL/.test(upper)) return 'SSP3';
  if (/SSP4/.test(upper) || /SPA4/.test(upper) || /INEQU/.test(upper)) return 'SSP4';
  if (/SSP5/.test(upper) || /SPA5/.test(upper) || /FOSSIL/.test(upper)) return 'SSP5';
  return '';
}

/** Normalize category string to C1-C8 */
function normalizeCategory(raw: string): string {
  if (!raw) return '';
  const upper = raw.toUpperCase().trim();
  const match = upper.match(/C([1-8])/);
  if (match) return `C${match[1]}`;
  // Handle text descriptions
  if (upper.includes('1.5') && (upper.includes('NO') || upper.includes('LOW') || upper.includes('LIMITED'))) return 'C1';
  if (upper.includes('1.5') && upper.includes('HIGH')) return 'C2';
  if (upper.includes('LIKELY') && upper.includes('2')) return 'C3';
  if (upper.includes('BELOW 2') || upper.includes('<2')) return 'C4';
  if (upper.includes('2.5')) return 'C5';
  if (upper.includes('BELOW 3') || upper.includes('<3')) return 'C6';
  if (upper.includes('BELOW 4') || upper.includes('<4')) return 'C7';
  if (upper.includes('ABOVE 4') || upper.includes('>4')) return 'C8';
  return raw;
}

// ── Region quick-picks ────────────────────────────────────────────────────
// EU-first ordering: EU regions are the default focus, the rest are optional
// comparators. The first entry is the default selection on first render.
const REGION_PICKS = [
  { label: 'EU27', names: ['EU27','EU27_2020','EU27+UK','EU','Europe','EU-27','Europe (EU27)','Europe (EU27+UK)','EU27 & UK','EU28','Europe (EU28)'] },
  { label: 'Euro area', names: ['EA20','EA19','Euro area','Euro area (EA20)'] },
  { label: 'Germany', names: ['Germany','DE'] },
  { label: 'France', names: ['France','FR'] },
  { label: 'Italy', names: ['Italy','IT'] },
  { label: 'Spain', names: ['Spain','ES'] },
  { label: 'Poland', names: ['Poland','PL'] },
  { label: 'Netherlands', names: ['Netherlands','NL'] },
  // ── Non-EU comparators (collapsed to the right) ──
  { label: 'World', names: ['World'] },
  { label: 'USA', names: ['USA','United States','US','R10NORTH_AM','North America'] },
  { label: 'China', names: ['China','CHN','R10CHINA+'] },
  { label: 'India', names: ['India','IND','R10INDIA+'] },
  { label: 'United Kingdom', names: ['United Kingdom','UK','GB'] },
  { label: 'Africa', names: ['Africa','R10AFRICA','Sub-Saharan Africa'] },
  { label: 'Latin Am.', names: ['Latin America','R10LATIN_AM','South America'] },
  { label: 'Asia Pacific', names: ['Asia','R10PAC_OECD','R10REST_ASIA','Southeast Asia'] },
];

// ── Dashboard presets ─────────────────────────────────────────────────────
const DASHBOARD_PRESETS: Record<string, { label: string; description: string; variables: string[] }> = {
  esabcc2040: {
    label: 'ESABCC 2040 Advice',
    description: 'Key indicators for the ESABCC 2040 target: emissions, renewables, energy efficiency, carbon removal',
    variables: [
      'Emissions|CO2',
      'Emissions|Kyoto Gases',
      'Emissions|CO2|Energy and Industrial Processes',
      'Primary Energy',
      'Primary Energy|Solar',
      'Primary Energy|Wind',
      'Primary Energy|Fossil',
      'Primary Energy|Coal',
      'Primary Energy|Oil',
      'Primary Energy|Gas',
      'Primary Energy|Nuclear',
      'Primary Energy|Biomass',
      'Secondary Energy|Electricity',
      'Secondary Energy|Electricity|Solar',
      'Secondary Energy|Electricity|Wind',
      'Final Energy',
      'Final Energy|Electricity',
      'Capacity|Electricity|Solar',
      'Capacity|Electricity|Wind',
      'Capacity|Electricity|Nuclear',
      'Carbon Sequestration|CCS',
      'Emissions|CO2|AFOLU',
      'Investment|Energy Supply',
      'AR6 climate diagnostics|Surface Temperature (GSAT)|MAGICCv7.5.3|50.0th Percentile',
    ],
  },
  emissions: {
    label: 'Emissions Overview',
    description: 'CO2, CH4, N2O and total Kyoto gas emissions',
    variables: [
      'Emissions|CO2',
      'Emissions|CO2|Energy and Industrial Processes',
      'Emissions|CH4',
      'Emissions|N2O',
      'Emissions|Kyoto Gases',
      'Emissions|CO2|AFOLU',
    ],
  },
  energy: {
    label: 'Energy System',
    description: 'Primary energy by source and final energy demand',
    variables: [
      'Primary Energy',
      'Primary Energy|Coal',
      'Primary Energy|Gas',
      'Primary Energy|Oil',
      'Primary Energy|Nuclear',
      'Primary Energy|Solar',
      'Primary Energy|Wind',
      'Primary Energy|Biomass',
      'Secondary Energy|Electricity',
      'Final Energy',
    ],
  },
  carbon: {
    label: 'Carbon & Prices',
    description: 'Carbon price, CCS, and negative emissions',
    variables: [
      'Price|Carbon',
      'Carbon Sequestration|CCS',
      'Emissions|CO2',
    ],
  },
  temperature: {
    label: 'Climate & Temperature',
    description: 'Global temperature projections',
    variables: [
      'AR6 climate diagnostics|Surface Temperature (GSAT)|MAGICCv7.5.3|50.0th Percentile',
      'AR6 climate diagnostics|Surface Temperature (GSAT)|MAGICCv7.5.3|5.0th Percentile',
      'AR6 climate diagnostics|Surface Temperature (GSAT)|MAGICCv7.5.3|95.0th Percentile',
    ],
  },
  gdp: {
    label: 'Economy & Society',
    description: 'GDP, population and investment',
    variables: [
      'GDP|PPP',
      'GDP|MER',
      'Population',
      'Investment|Energy Supply',
    ],
  },
  capacity: {
    label: 'Power Capacity',
    description: 'Electricity generation capacity by technology',
    variables: [
      'Capacity|Electricity|Wind',
      'Capacity|Electricity|Solar',
      'Capacity|Electricity|Nuclear',
      'Capacity|Electricity|Gas',
      'Capacity|Electricity|Coal',
      'Capacity|Electricity|Biomass',
    ],
  },
  socioeconomics: {
    label: 'Socioeconomics & Behavior',
    description: 'Transport electrification, CDR scale-up, dietary shifts, land use, and demand patterns',
    variables: [
      'Population',
      'GDP|PPP',
      'Final Energy|Transportation',
      'Final Energy|Transportation|Electricity',
      'Final Energy|Transportation|Liquids',
      'Final Energy|Residential and Commercial',
      'Final Energy|Industry',
      'Final Energy|Industry|Electricity',
      'Carbon Sequestration|CCS',
      'Carbon Sequestration|Direct Air Capture',
      'Carbon Sequestration|CCS|Biomass',
      'Food Demand',
      'Food Demand|Crops',
      'Food Demand|Livestock',
      'Agricultural Production',
      'Emissions|CO2|AFOLU',
      'Emissions|CH4|AFOLU',
      'Land Cover|Forest',
      'Land Cover|Cropland',
      'Land Cover|Pasture',
      'Emissions|CO2|Transport',
      'Energy Intensity of GDP|PPP',
      'Carbon Intensity of GDP|PPP',
    ],
  },
  policyGap: {
    label: 'Policy Gap Analysis',
    description: 'ESABCC 2023: Gap between current EU NDC trajectory and Paris-aligned pathways with EU Climate Law benchmarks',
    variables: [
      'Emissions|CO2',
      'Emissions|Kyoto Gases',
      'Primary Energy',
      'Final Energy',
      'Emissions|CO2|Energy and Industrial Processes',
      'Emissions|CH4',
      'Emissions|N2O',
      'Carbon Sequestration|CCS',
    ],
  },
  regionalDeepDive: {
    label: 'EU Regional Deep Dive',
    description: 'Regional climate impacts across European sub-regions: temperature, precipitation, sea level, extremes',
    variables: [
      'AR6 climate diagnostics|Surface Temperature (GSAT)|MAGICCv7.5.3|50.0th Percentile',
      'AR6 climate diagnostics|Surface Temperature (GSAT)|MAGICCv7.5.3|5.0th Percentile',
      'AR6 climate diagnostics|Surface Temperature (GSAT)|MAGICCv7.5.3|95.0th Percentile',
      'Temperature|Global Mean',
      'Emissions|CO2',
      'Emissions|Kyoto Gases',
      'Primary Energy',
      'Final Energy',
      'Secondary Energy|Electricity',
    ],
  },
  sectoralDecarb: {
    label: 'Sectoral Decarbonization',
    description: 'Sector-specific emission trajectories for EU: energy, industry, transport, buildings, agriculture, LULUCF',
    variables: [
      'Emissions|CO2',
      'Emissions|CO2|Energy and Industrial Processes',
      'Emissions|CO2|Energy',
      'Emissions|CO2|Industrial Processes',
      'Emissions|CO2|Transport',
      'Emissions|CO2|Buildings',
      'Emissions|CO2|Residential and Commercial',
      'Emissions|CO2|AFOLU',
      'Emissions|CH4|AFOLU',
      'Emissions|CO2|Electricity and Heat',
      'Final Energy|Industry',
      'Final Energy|Transportation',
      'Final Energy|Residential and Commercial',
    ],
  },
  carbonBudget: {
    label: 'Carbon Budget Analysis',
    description: 'EU fair share of remaining global carbon budget, cumulative emissions, and budget depletion timeline',
    variables: [
      'Emissions|CO2',
      'Emissions|Kyoto Gases',
      'Cumulative Emissions|CO2',
      'Carbon Sequestration|CCS',
      'Carbon Sequestration|Direct Air Capture',
      'Carbon Sequestration|CCS|Biomass',
      'Emissions|CO2|Energy and Industrial Processes',
      'Emissions|CO2|AFOLU',
    ],
  },
};

// ── Smart chart relevance ─────────────────────────────────────────────────
//
// Given the user's current filter selection, compute how "relevant" each
// chart is. The score is 0–100, with reasons explaining why the chart
// matched. The Scenario Explorer uses this to:
//   • Show a relevance badge under each chart
//   • Hide low-relevance charts when "Smart filter" is on
//   • Help the user understand why a particular chart is shown
//
// Heuristics (additive):
//   +30  variable matches an explicit selection
//   +20  category filter aligns with chart's expected focus (e.g. C1/C2 →
//        emissions/mitigation; C5–C8 → risk/temperature)
//   +20  region matches selected regions
//   +15  variable theme matches current preset's theme
//   +15  number of series ≥ 5 (statistical aggregation is meaningful)
//   +10  source matches default focus (Eurostat = historical, IIASA = projection)
//   −20  chart is statistical aggregation (fan/box) but only 1 series

interface RelevanceResult {
  score: number;
  reasons: string[];
  relevant: boolean;
}

interface RelevanceContext {
  selVariable: string;
  selRegions: string[];
  selCategories: string[];
  esabccMode: boolean;
  policyGapMode: boolean;
  activePreset: string;
  activeDb: string;
}

function computeChartRelevance(
  chart: Pick<ChartData, 'variable' | 'region' | 'series' | 'chartType' | 'historical'>,
  ctx: RelevanceContext,
): RelevanceResult {
  let score = 50; // baseline
  const reasons: string[] = [];
  const v = (chart.variable || '').toLowerCase();

  // Direct variable match — strongest signal
  if (ctx.selVariable && chart.variable === ctx.selVariable) {
    score += 30;
    reasons.push('matches selected variable');
  }

  // Region match
  if (chart.region && ctx.selRegions.includes(chart.region)) {
    score += 20;
    reasons.push(`region: ${chart.region}`);
  }

  // Category alignment
  const hasParisCats = ctx.selCategories.some(c => ['C1', 'C2'].includes(c));
  const hasRiskCats = ctx.selCategories.some(c => ['C5', 'C6', 'C7', 'C8'].includes(c));
  if (hasParisCats && /(emission|mitigation|carbon|renewable|energy)/i.test(v)) {
    score += 20;
    reasons.push('aligned with Paris-aligned filter (C1–C2)');
  }
  if (hasRiskCats && /(temperature|warming|risk|impact|sea level)/i.test(v)) {
    score += 20;
    reasons.push('aligned with current-policy filter (C5–C8)');
  }

  // ESABCC mode boosts mitigation indicators
  if (ctx.esabccMode && /(emission|renewable|primary energy|capacity|carbon sequestration)/i.test(v)) {
    score += 15;
    reasons.push('relevant to ESABCC 2040 advice');
  }

  // Policy gap mode boosts emissions/CO2
  if (ctx.policyGapMode && /^emissions/i.test(v)) {
    score += 15;
    reasons.push('relevant to policy gap analysis');
  }

  // Statistical chart types need ≥5 series to be meaningful
  if ((chart.chartType === 'fan' || chart.chartType === 'box') && chart.series.length < 5) {
    score -= 30;
    reasons.push('insufficient series for distribution');
  } else if (chart.chartType === 'fan' || chart.chartType === 'box') {
    score += 10;
  }

  // Historical sources are inherently relevant when the user picked Eurostat
  if (chart.historical && ctx.activeDb === 'eurostat') {
    score += 10;
    reasons.push('historical observation');
  }

  // Bar / box at multi-variable level — only relevant when comparing
  if ((chart.chartType === 'bar' || chart.chartType === 'box') &&
      /comparison|distribution/i.test(chart.variable)) {
    score += 5;
    reasons.push('cross-variable view');
  }

  // Temperature charts in EU-only views are noisy — global only
  if (/temperature.*gsat/i.test(v) && chart.region && /^(EU|DE|FR|IT|ES|PL|NL|EA)/i.test(chart.region)) {
    score -= 25;
    reasons.push('global temperature does not vary by EU region');
  }

  // Clamp to 0–100
  score = Math.max(0, Math.min(100, score));
  return { score, reasons, relevant: score >= 55 };
}

// ── Helper: fetch with abort ───────────────────────────────────────────────

// Client-side sessionStorage cache for metadata (avoids re-fetching on page revisit)
const CLIENT_CACHE_TTL = 15 * 60 * 1000; // 15 min
function clientCacheGet(key: string): unknown | null {
  if (typeof sessionStorage === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(`esabcc_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw);
    if (Date.now() - ts < CLIENT_CACHE_TTL) return data;
    sessionStorage.removeItem(`esabcc_${key}`);
  } catch { /* ignore */ }
  return null;
}
function clientCacheSet(key: string, data: unknown) {
  if (typeof sessionStorage === 'undefined') return;
  try { sessionStorage.setItem(`esabcc_${key}`, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* quota exceeded, ignore */ }
}

async function apiFetch(params: Record<string, string>, signal?: AbortSignal) {
  // Check client cache for cacheable actions
  const action = params.action;
  const cacheableActions = ['models', 'scenarios', 'variables', 'regions', 'runs', 'databases'];
  const cacheKey = `${params.db || ''}:${action}`;
  if (action && cacheableActions.includes(action)) {
    const cached = clientCacheGet(cacheKey);
    if (cached) return cached;
  }

  const sp = new URLSearchParams(params);
  const res = await fetch(`/api/scenarios?${sp}`, { signal });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `API ${res.status}`);
  }
  const data = await res.json();
  // Cache metadata responses
  if (action && cacheableActions.includes(action)) {
    clientCacheSet(cacheKey, data);
  }
  return data;
}

// ── Component ──────────────────────────────────────────────────────────────

export default function ScenarioExplorer() {
  // Top-level mode: 'statistics' shows the Eurostat-style picker, 'scenarios'
  // shows the IIASA scenario projection workflow. Default to 'statistics' so
  // newcomers see open EU historical data first.
  const [topMode, setTopMode] = useState<'statistics' | 'scenarios' | 'policy-gap'>('statistics');

  // Database — used only in 'scenarios' mode. Default to the EU Climate
  // Advisory Board database since Eurostat now lives in 'statistics' mode.
  const [databases, setDatabases] = useState<Database[]>([]);
  const [activeDb, setActiveDb] = useState('eu-cab');

  // Metadata lists
  const [models, setModels] = useState<string[]>([]);
  const [scenarios, setScenarios] = useState<string[]>([]);
  const [variables, setVariables] = useState<string[]>([]);
  const [regions, setRegions] = useState<string[]>([]);
  const [runs, setRuns] = useState<Run[]>([]);
  const runMap = useRef<RunMap>({});

  // Filter selections
  const [selModels, setSelModels] = useState<string[]>([]);
  const [selScenarios, setSelScenarios] = useState<string[]>([]);
  const [selVariable, setSelVariable] = useState('');
  const [selRegions, setSelRegions] = useState<string[]>([]);
  const [activePreset, setActivePreset] = useState('emissions');

  // Category & narrative filters
  const [selCategories, setSelCategories] = useState<string[]>([]);   // C1, C2, ... C8
  const [selNarratives, setSelNarratives] = useState<string[]>([]);   // SSP1, SSP2, ... SSP5
  const [selRCPs, setSelRCPs] = useState<string[]>([]);               // RCP2.6, RCP4.5, RCP6.0, RCP8.5
  const [esabccMode, setEsabccMode] = useState(false);                // ESABCC 2040 advice filter
  const [policyGapMode, setPolicyGapMode] = useState(false);          // ESABCC Policy Gap Analysis
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);
  const [availableNarratives, setAvailableNarratives] = useState<string[]>([]);
  const [availableRCPs, setAvailableRCPs] = useState<string[]>([]);

  // Data & UI
  const [charts, setCharts] = useState<ChartData[]>([]);
  const [barGroups, setBarGroups] = useState<BarGroup[]>([]);
  const [boxData, setBoxData] = useState<BoxData[]>([]);
  const [mapData, setMapData] = useState<MapRegion[]>([]);
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'dashboard' | 'single'>('dashboard');
  const [showFilters, setShowFilters] = useState(false);
  // Smart relevance: hide charts whose computed relevance is low given the
  // current filter selection. Default ON so users see a focused view.
  const [smartRelevance, setSmartRelevance] = useState(true);

  // Regional comparison mode
  const [comparisonMode, setComparisonMode] = useState(false);
  const [compRegionA, setCompRegionA] = useState('');
  const [compRegionB, setCompRegionB] = useState('');
  const [compCharts, setCompCharts] = useState<{ variable: string; unit: string; years: number[]; medianA: (number | null)[]; medianB: (number | null)[]; diff: (number | null)[] }[]>([]);
  // Regional Deep Dive region-picker modal
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [pickerRegionA, setPickerRegionA] = useState('');
  const [pickerRegionB, setPickerRegionB] = useState('');

  // Search filters
  const [modelSearch, setModelSearch] = useState('');
  const [scenarioSearch, setScenarioSearch] = useState('');
  const [variableSearch, setVariableSearch] = useState('');
  const [regionSearch, setRegionSearch] = useState('');

  const abortRef = useRef<AbortController | null>(null);
  const chartRefs = useRef<Record<number, HTMLDivElement | null>>({});

  // ── Load databases on mount ────────────────────────────────────────────
  useEffect(() => {
    apiFetch({ action: 'databases' }).then(setDatabases).catch(() => {});
  }, []);

  // ── toList helper ──────────────────────────────────────────────────────
  const toList = useCallback((d: unknown): string[] => {
    if (!Array.isArray(d)) return [];
    return d.map((x: unknown) => {
      if (typeof x === 'string') return x;
      if (x && typeof x === 'object') return (x as Record<string, string>).name || (x as Record<string, string>).variable || '';
      return '';
    }).filter(Boolean).sort();
  }, []);

  // ── Find matching region by quick-pick ─────────────────────────────────
  const findRegion = useCallback((regionList: string[], pickNames: string[]) => {
    const nonModel = regionList.filter(r => !r.includes('|'));
    const searchIn = nonModel.length > 0 ? nonModel : regionList;
    for (const name of pickNames) {
      const match = searchIn.find(r => r.toLowerCase() === name.toLowerCase());
      if (match) return match;
    }
    for (const name of pickNames) {
      const match = searchIn.find(r => r.toLowerCase().includes(name.toLowerCase()));
      if (match) return match;
    }
    return null;
  }, []);

  // ── Load metadata when DB changes ──────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading('Loading database metadata...');
    setError(null);
    setCharts([]);
    setSelModels([]);
    setSelScenarios([]);
    setSelVariable('');
    setSelRegions([]);
    setSelCategories([]);
    setSelNarratives([]);

    Promise.all([
      apiFetch({ action: 'models', db: activeDb }),
      apiFetch({ action: 'scenarios', db: activeDb }),
      apiFetch({ action: 'variables', db: activeDb }),
      apiFetch({ action: 'regions', db: activeDb }),
      apiFetch({ action: 'runs', db: activeDb }),
    ]).then(([mods, scens, vars, regs, rns]) => {
      if (cancelled) return;

      const modList = toList(mods);
      const scenList = toList(scens);
      const varList = toList(vars);
      const regionList = toList(regs);

      setModels(modList);
      setScenarios(scenList);
      setVariables(varList);
      setRegions(regionList);

      // Auto-select region: prefer EU27 (EU-focused default), fall back to
      // World only if EU27 is not in the dataset.
      const euRegion = findRegion(regionList, REGION_PICKS[0].names);
      const worldRegion = findRegion(regionList, ['World']);
      const defaultRegion = euRegion || worldRegion || regionList.find(r => !r.includes('|')) || regionList[0] || '';
      if (defaultRegion) setSelRegions([defaultRegion]);

      // Auto-select variable: prefer Emissions|CO2
      const standardVars = varList.filter(v => !/^[A-Z][A-Za-z0-9/]+\s+\d/.test(v));
      const sv = standardVars.length > 0 ? standardVars : varList;
      const defaultVar = sv.find(v => v === 'Emissions|Kyoto Gases')
        || sv.find(v => v === 'Emissions|CO2')
        || sv.find(v => /^Emissions\|CO2$/i.test(v))
        || sv.find(v => /^Emissions\|/i.test(v))
        || sv[0] || '';
      setSelVariable(defaultVar);

      // Build run map & extract categories/narratives
      const rawRuns: Run[] = (Array.isArray(rns) ? rns : []).map((r: Record<string, unknown>) => ({
        id: Number(r.id ?? r.run_id ?? 0),
        model: String(r.model || ''),
        scenario: String(r.scenario || ''),
        category: normalizeCategory(String(r.category || '')),
        meta: (r.meta || {}) as Record<string, string>,
      }));
      setRuns(rawRuns);
      const map: RunMap = {};
      rawRuns.forEach(r => {
        if (r.id) map[r.id] = { model: r.model, scenario: r.scenario, category: r.category };
      });
      runMap.current = map;

      // Extract available categories (C1-C8), SSP narratives, and RCPs
      const cats = new Set<string>();
      const narrs = new Set<string>();
      const rcps = new Set<string>();
      rawRuns.forEach(r => {
        if (r.category) cats.add(r.category);
        const ssp = inferSSP(r.scenario);
        if (ssp) narrs.add(ssp);
        const rcp = inferRCP(r.scenario);
        if (rcp) rcps.add(rcp);
      });
      const sortedCats = [...cats].sort();
      const sortedNarrs = [...narrs].sort();
      const sortedRCPs = [...rcps].sort();
      setAvailableCategories(sortedCats);
      setAvailableNarratives(sortedNarrs);
      setAvailableRCPs(sortedRCPs);

      // Auto-select C1-C3 if available (ambitious climate targets)
      const defaultCats = sortedCats.filter(c => ['C1', 'C2', 'C3'].includes(c));
      if (defaultCats.length > 0) setSelCategories(defaultCats);

      // If categories are available, don't pre-select scenarios
      // (the C1-C3 filter will handle the selection instead)
      // Otherwise, auto-select top 5 most common
      if (sortedCats.length === 0) {
        const standardScens = scenList.filter(s => !/\|\s*[A-Z][A-Za-z0-9/]+\s+\d/.test(s));
        const counts: Record<string, number> = {};
        rawRuns.forEach(r => {
          if (r.scenario && (standardScens.length === 0 || standardScens.includes(r.scenario)))
            counts[r.scenario] = (counts[r.scenario] || 0) + 1;
        });
        const topScens = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([n]) => n);
        if (topScens.length > 0) setSelScenarios(topScens);
      }

      setLoading(null);
    }).catch(err => {
      if (!cancelled) { setError(err.message); setLoading(null); }
    });

    return () => { cancelled = true; };
  }, [activeDb, toList, findRegion]);

  // ── Fetch single variable for one region ──────────────────────────────
  const fetchVariableForRegion = useCallback(async (variable: string, region: string, signal?: AbortSignal): Promise<ChartData | null> => {
    let matchingRuns = runs;
    if (selModels.length > 0) matchingRuns = matchingRuns.filter(r => selModels.includes(r.model));
    if (selScenarios.length > 0) matchingRuns = matchingRuns.filter(r => selScenarios.includes(r.scenario));
    if (selCategories.length > 0) matchingRuns = matchingRuns.filter(r => r.category && selCategories.includes(r.category));
    if (selNarratives.length > 0) matchingRuns = matchingRuns.filter(r => {
      const ssp = inferSSP(r.scenario);
      return ssp && selNarratives.includes(ssp);
    });
    if (selRCPs.length > 0) matchingRuns = matchingRuns.filter(r => {
      const rcp = inferRCP(r.scenario);
      return rcp && selRCPs.includes(rcp);
    });

    const runIds = matchingRuns.map(r => r.id).filter(Boolean);
    if (runIds.length === 0) return null;

    const limitedIds = runIds.slice(0, 30);

    const result = await apiFetch({
      action: 'datapoints', db: activeDb,
      runs: limitedIds.join(','),
      variables: variable,
      region,
    }, signal);

    let points: Record<string, unknown>[] = [];
    if (Array.isArray(result)) points = result;
    else if (result && typeof result === 'object') {
      const w = result as Record<string, unknown>;
      points = (Array.isArray(w.data) ? w.data : Array.isArray(w.datapoints) ? w.datapoints : []) as Record<string, unknown>[];
    }

    const byRun: Record<number, { year: number; value: number }[]> = {};
    let unit = '';
    points.forEach((p: Record<string, unknown>) => {
      const runId = Number(p.run_id ?? p.runId ?? p.run ?? p.run__id ?? 0);
      const year = Number(p.step_year ?? p.year ?? p.step ?? p.time ?? 0);
      const value = p.value != null ? Number(p.value) : NaN;
      if (!unit && p.unit) unit = String(p.unit);
      if (runId && year && !isNaN(value)) {
        if (!byRun[runId]) byRun[runId] = [];
        byRun[runId].push({ year, value });
      }
    });

    const series = Object.entries(byRun).map(([rid, pts]) => {
      const info = runMap.current[Number(rid)];
      const cat = info?.category || '';
      const label = info
        ? `${info.model} | ${info.scenario}${cat ? ` [${cat}]` : ''}`
        : `Run ${rid}`;
      return { label, points: pts.sort((a, b) => a.year - b.year), category: cat };
    });

    if (series.length === 0) return null;
    // Mark historical observation data so the chart skips percentile aggregation.
    const historical = activeDb === 'eurostat';
    return { variable, series, unit, region, historical };
  }, [activeDb, selModels, selScenarios, selCategories, selNarratives, selRCPs, runs]);

  // ── Fetch dashboard (multiple variables × regions) ──────────────────
  const fetchDashboard = useCallback(async () => {
    if (selRegions.length === 0) { setError('Select at least one region.'); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const preset = DASHBOARD_PRESETS[activePreset];
    const varsToFetch = preset.variables.filter(v => variables.includes(v));

    if (varsToFetch.length === 0) {
      setError(`No matching variables found in this database for "${preset.label}". Try a different preset or database.`);
      return;
    }

    const multiRegion = selRegions.length > 1;
    setLoading(`Loading ${varsToFetch.length} variables × ${selRegions.length} region${multiRegion ? 's' : ''} for ${preset.label}...`);
    setError(null);
    setCharts([]);

    try {
      // Fetch all variable × region combinations
      const fetchJobs = varsToFetch.flatMap(v => selRegions.map(r => ({ variable: v, region: r })));
      const results = await Promise.allSettled(
        fetchJobs.map(j => fetchVariableForRegion(j.variable, j.region, ctrl.signal))
      );

      const newCharts: ChartData[] = [];
      // Historical sources (Eurostat, EEA) have a single observation line per
      // region — no scenario distribution to compute, so we skip fan/box/bar.
      const isHistoricalSource = activeDb === 'eurostat';

      if (multiRegion) {
        // Multi-region: group by variable, facet by region
        for (const variable of varsToFetch) {
          for (const region of selRegions) {
            const idx = fetchJobs.findIndex(j => j.variable === variable && j.region === region);
            const r = results[idx];
            if (r.status === 'fulfilled' && r.value) {
              newCharts.push({ ...r.value, region, chartType: 'line' });
            }
          }
          // Fan chart only for projection sources with >=5 scenarios
          if (!isHistoricalSource && newCharts.length > 0 && newCharts.length <= selRegions.length) {
            const first = results.find((r, i) => r.status === 'fulfilled' && r.value && fetchJobs[i].variable === variable);
            if (first && first.status === 'fulfilled' && first.value && first.value.series.length >= 5) {
              newCharts.push({ ...first.value, chartType: 'fan' });
            }
          }
        }
      } else {
        // Single region: original layout
        const regionResults = results.filter((_, i) => fetchJobs[i].region === selRegions[0]);
        regionResults.forEach(r => {
          if (r.status === 'fulfilled' && r.value) {
            newCharts.push({ ...r.value, region: selRegions[0], chartType: 'line' });
            if (!isHistoricalSource && newCharts.length === 1 && r.value.series.length >= 5) {
              newCharts.push({ ...r.value, region: selRegions[0], chartType: 'fan' });
            }
          }
        });
      }

      // Collect data from first region for bar/box/map charts
      const firstRegionData = results
        .filter((_, i) => fetchJobs[i].region === selRegions[0])
        .map(r => r.status === 'fulfilled' ? r.value : null)
        .filter((v): v is ChartData => v != null && v.series.length > 0);
      const firstUnit = firstRegionData[0]?.unit || '';

      // Bar / box / cross-variable comparison charts only make sense for
      // multi-scenario projection data. Skip them for historical sources
      // (Eurostat) where each variable has a single observation line.
      if (!isHistoricalSource && firstRegionData.length >= 2) {
        const targetYears = [2030, 2050, 2100];
        const bg: BarGroup[] = targetYears.map(year => ({
          label: String(year),
          values: firstRegionData.map(c => {
            const vals = c.series
              .map(s => s.points.find(p => p.year === year)?.value)
              .filter((v): v is number => v != null);
            const median = vals.length > 0 ? vals.sort((a, b) => a - b)[Math.floor(vals.length / 2)] : 0;
            return { name: c.variable.split('|').pop() || c.variable, value: median };
          }).filter(v => v.value !== 0),
        })).filter(g => g.values.length > 0);

        if (bg.length > 0) {
          newCharts.push({ variable: `${preset.label} — Comparison`, series: [], unit: firstRegionData[0].unit, chartType: 'bar' });
        }

        const bd: BoxData[] = firstRegionData.map(c => {
          const vals = c.series.map(s => s.points.find(p => p.year === 2050)?.value).filter((v): v is number => v != null);
          return { label: c.variable.split('|').pop() || c.variable, values: vals };
        }).filter(b => b.values.length >= 3);

        if (bd.length >= 2) {
          newCharts.push({ variable: `${preset.label} — Distribution at 2050`, series: [], unit: firstRegionData[0].unit, chartType: 'box' });
        }

        setBarGroups(bg);
        setBoxData(bd);
      } else if (isHistoricalSource) {
        // Clear any leftover bar/box state from a previous projection-source view
        setBarGroups([]);
        setBoxData([]);
      }

      // Add world map when multiple regions are selected
      if (multiRegion && varsToFetch.length > 0) {
        const firstVar = varsToFetch[0];
        const md: MapRegion[] = [];
        for (const region of selRegions) {
          const idx = fetchJobs.findIndex(j => j.variable === firstVar && j.region === region);
          const r = results[idx];
          if (r.status === 'fulfilled' && r.value && r.value.series.length > 0) {
            // Use median at 2050 (or latest available year)
            const vals = r.value.series
              .map(s => {
                const pt = s.points.find(p => p.year === 2050) || s.points[s.points.length - 1];
                return pt?.value;
              })
              .filter((v): v is number => v != null && !isNaN(v))
              .sort((a, b) => a - b);
            if (vals.length > 0) {
              md.push({ region, value: vals[Math.floor(vals.length / 2)] });
            }
          }
        }
        if (md.length > 0) {
          setMapData(md);
          newCharts.push({
            variable: `${firstVar} — Regional Comparison (Median at 2050)`,
            series: [], unit: firstUnit, chartType: 'map',
          });
        }
      }

      if (newCharts.length === 0) {
        setError('No data found for any variable in this preset. Try "World" region or different scenarios.');
      }
      setCharts(newCharts);
      setLoading(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
        setLoading(null);
      }
    }
  }, [activePreset, selRegions, variables, fetchVariableForRegion]);

  // ── Fetch single variable ─────────────────────────────────────────────
  const fetchSingle = useCallback(async () => {
    if (!selVariable || selRegions.length === 0) { setError('Select a variable and region.'); return; }

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    setLoading(`Loading ${selVariable}...`);
    setError(null);
    setCharts([]);

    try {
      const singleCharts: ChartData[] = [];
      for (const region of selRegions) {
        const result = await fetchVariableForRegion(selVariable, region, ctrl.signal);
        if (result) {
          singleCharts.push({ ...result, region, chartType: 'line' });
          if (singleCharts.length === 1 && result.series.length >= 5) {
            singleCharts.push({ ...result, region, chartType: 'fan' });
          }
          if (result.series.length >= 3) {
            const years = [2030, 2050, 2100];
            const bd: BoxData[] = years.map(y => ({
              label: String(y),
              values: result.series.map(s => s.points.find(p => p.year === y)?.value).filter((v): v is number => v != null),
            })).filter(b => b.values.length >= 3);
            if (bd.length > 0 && singleCharts.length <= 3) {
              setBoxData(bd);
              singleCharts.push({ variable: `${selVariable} — ${region} Distribution`, series: [], unit: result.unit, region, chartType: 'box' });
            }
          }
        }
      }
      if (singleCharts.length === 0) {
        setError('No data found. Try a different region or broader scenario selection.');
      }
      setCharts(singleCharts);
      setLoading(null);
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        setError((err as Error).message);
        setLoading(null);
      }
    }
  }, [selVariable, selRegions, fetchVariableForRegion]);

  // ── Regional comparison fetch ──────────────────────────────────────────
  const fetchComparison = useCallback(async (overrideA?: string, overrideB?: string, overridePreset?: string) => {
    const regionA = overrideA ?? compRegionA;
    const regionB = overrideB ?? compRegionB;
    if (!regionA || !regionB || regionA === regionB) return;
    const presetKey = overridePreset ?? activePreset;
    const preset = DASHBOARD_PRESETS[presetKey];
    const varsToFetch = preset.variables.filter(v => variables.includes(v));
    if (varsToFetch.length === 0) return;

    setLoading(`Comparing ${regionA} vs ${regionB}...`);
    setError(null);

    try {
      const ctrl = new AbortController();
      // Fetch all variables for both regions
      const jobsA = varsToFetch.map(v => fetchVariableForRegion(v, regionA, ctrl.signal));
      const jobsB = varsToFetch.map(v => fetchVariableForRegion(v, regionB, ctrl.signal));
      const [resultsA, resultsB] = await Promise.all([
        Promise.allSettled(jobsA),
        Promise.allSettled(jobsB),
      ]);

      const newCompCharts: typeof compCharts = [];

      for (let i = 0; i < varsToFetch.length; i++) {
        const rA = resultsA[i];
        const rB = resultsB[i];
        if (rA.status !== 'fulfilled' || !rA.value || rB.status !== 'fulfilled' || !rB.value) continue;

        const dataA = rA.value;
        const dataB = rB.value;
        const allYears = [...new Set([
          ...dataA.series.flatMap(s => s.points.map(p => p.year)),
          ...dataB.series.flatMap(s => s.points.map(p => p.year)),
        ])].sort((a, b) => a - b);

        if (allYears.length === 0) continue;

        const medianA: (number | null)[] = [];
        const medianB: (number | null)[] = [];
        const diff: (number | null)[] = [];

        for (const year of allYears) {
          const valsA = dataA.series.map(s => s.points.find(p => p.year === year)?.value).filter((v): v is number => v != null).sort((a, b) => a - b);
          const valsB = dataB.series.map(s => s.points.find(p => p.year === year)?.value).filter((v): v is number => v != null).sort((a, b) => a - b);
          const mA = valsA.length > 0 ? valsA[Math.floor(valsA.length / 2)] : null;
          const mB = valsB.length > 0 ? valsB[Math.floor(valsB.length / 2)] : null;
          medianA.push(mA);
          medianB.push(mB);
          diff.push(mA != null && mB != null ? mA - mB : null);
        }

        newCompCharts.push({
          variable: varsToFetch[i],
          unit: dataA.unit,
          years: allYears,
          medianA,
          medianB,
          diff,
        });
      }

      setCompCharts(newCompCharts);
      setLoading(null);
      if (newCompCharts.length === 0) setError('No overlapping data found for these two regions.');
    } catch (err) {
      setError((err as Error).message);
      setLoading(null);
    }
  }, [compRegionA, compRegionB, activePreset, variables, fetchVariableForRegion]);

  // ── Auto-fetch on load ────────────────────────────────────────────────
  const autoFetched = useRef(false);
  useEffect(() => {
    if (selRegions.length > 0 && runs.length > 0 && charts.length === 0 && !loading && !autoFetched.current) {
      autoFetched.current = true;
      if (viewMode === 'dashboard') fetchDashboard();
      else if (selVariable) fetchSingle();
    }
  }, [selRegions, runs, charts, loading, viewMode, selVariable, fetchDashboard, fetchSingle]);

  useEffect(() => {
    autoFetched.current = false;
    // Auto-deactivate ESABCC mode if switching away from EU database
    if (esabccMode) {
      const isEu = activeDb.toLowerCase().includes('eu') || activeDb.toLowerCase().includes('cab');
      if (!isEu) {
        setEsabccMode(false);
        setActivePreset('emissions');
      }
    }
  }, [activeDb]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── ESABCC mode toggle handler ────────────────────────────────────────
  const toggleEsabcc = useCallback(() => {
    setEsabccMode(prev => {
      const next = !prev;
      setCharts([]);
      autoFetched.current = false;
      if (next) {
        // Activate ESABCC filter: select C1+C2, prefer SSP1/SSP2
        setSelCategories(availableCategories.filter(c => ESABCC_2040_CRITERIA.categories.includes(c)));
        const matchingNarrs = availableNarratives.filter(n => ESABCC_2040_CRITERIA.preferredNarratives.includes(n));
        if (matchingNarrs.length > 0) setSelNarratives(matchingNarrs);
        // Switch to EU region if available
        const euRegion = findRegion(regions, REGION_PICKS[1].names);
        if (euRegion) setSelRegions([euRegion]);
      } else {
        // Deactivate: revert to C1-C3 default
        const defaultCats = availableCategories.filter(c => ['C1', 'C2', 'C3'].includes(c));
        setSelCategories(defaultCats);
        setSelNarratives([]);
      }
      return next;
    });
  }, [availableCategories, availableNarratives, regions, findRegion]);

  // ── Policy Gap Analysis toggle handler ─────────────────────────────────
  const togglePolicyGap = useCallback(() => {
    setPolicyGapMode(prev => {
      const next = !prev;
      setCharts([]);
      autoFetched.current = false;
      if (next) {
        // Activate Policy Gap: show gap between current policies (C5-C8) and Paris-aligned (C1/C2)
        // Include C3/C4 as intermediate reference (below 2°C)
        const gapCats = availableCategories.filter(c => ['C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'].includes(c));
        if (gapCats.length > 0) setSelCategories(gapCats);
        // Switch to policyGap preset
        setActivePreset('policyGap');
        // Switch to EU region if available
        const euRegion = findRegion(regions, REGION_PICKS[1].names);
        if (euRegion) setSelRegions([euRegion]);
        setEsabccMode(false);
      } else {
        // Deactivate: revert to C1-C3 default
        const defaultCats = availableCategories.filter(c => ['C1', 'C2', 'C3'].includes(c));
        setSelCategories(defaultCats);
        setActivePreset('emissions');
      }
      return next;
    });
  }, [availableCategories, regions, findRegion]);

  // ── Sectoral Decarbonization handler ──────────────────────────────────
  const activateSectoralDecarb = useCallback(() => {
    setCharts([]);
    autoFetched.current = false;
    setActivePreset('sectoralDecarb');
    // Focus on EU region
    const euRegion = findRegion(regions, REGION_PICKS[1].names);
    if (euRegion) setSelRegions([euRegion]);
    // Select C1-C3 for ambitious pathways
    const ambitiousCats = availableCategories.filter(c => ['C1', 'C2', 'C3'].includes(c));
    if (ambitiousCats.length > 0) setSelCategories(ambitiousCats);
  }, [regions, findRegion, availableCategories]);

  // ── Carbon Budget Analysis handler ────────────────────────────────────
  const activateCarbonBudget = useCallback(() => {
    setCharts([]);
    autoFetched.current = false;
    setActivePreset('carbonBudget');
    // Focus on EU region
    const euRegion = findRegion(regions, REGION_PICKS[1].names);
    if (euRegion) setSelRegions([euRegion]);
    // Select C1-C2 for budget-compatible pathways
    const budgetCats = availableCategories.filter(c => ['C1', 'C2'].includes(c));
    if (budgetCats.length > 0) setSelCategories(budgetCats);
  }, [regions, findRegion, availableCategories]);

  // ── PDF Export handler ────────────────────────────────────────────────
  const handleExportPDF = useCallback(async () => {
    // Collect all chart canvases and export as downloadable HTML report
    const chartArea = document.querySelector('[data-chart-area]');
    const canvases = chartArea
      ? Array.from(chartArea.querySelectorAll('canvas'))
      : Array.from(document.querySelectorAll('canvas'));

    if (canvases.length === 0) {
      alert('No charts to export. Please load some data first.');
      return;
    }

    const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const regionStr = selRegions.join(', ') || 'All';
    const presetStr = DASHBOARD_PRESETS[activePreset]?.label || activePreset;
    const filterParts: string[] = [];
    if (selCategories.length > 0) filterParts.push('Categories: ' + selCategories.join(', '));
    if (selNarratives.length > 0) filterParts.push('SSP: ' + selNarratives.join(', '));
    if (selRCPs.length > 0) filterParts.push('RCP: ' + selRCPs.join(', '));
    if (esabccMode) filterParts.push('ESABCC 2040 Advice mode');
    if (policyGapMode) filterParts.push('Policy Gap Analysis mode');

    const chartImages = canvases.map(c => {
      try { return c.toDataURL('image/png'); } catch { return null; }
    }).filter(Boolean);

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>ESABCC Figure Report</title>
<style>
body{font-family:Arial,Helvetica,sans-serif;margin:40px;color:#333}
.header{border-bottom:3px solid #003399;padding-bottom:12px;margin-bottom:24px}
.header h1{font-size:22px;font-weight:bold;color:#003399;margin:0}
.header p{font-size:11px;color:#555;margin:4px 0 0 0}
.chart{page-break-inside:avoid;margin:20px 0;text-align:center}
.chart img{max-width:100%;border:1px solid #eee;border-radius:4px}
.footer{margin-top:30px;font-size:9px;color:#999;border-top:1px solid #ddd;padding-top:8px}
@media print{@page{size:A4 landscape;margin:1cm}}
</style></head><body>
<div class="header">
<h1>ESABCC Scenario Explorer &mdash; Figure Report</h1>
<p>Generated: ${dateStr} | Database: ${activeDb} | Region${selRegions.length > 1 ? 's' : ''}: ${regionStr} | Preset: ${presetStr}</p>
<p>Filters: ${filterParts.length > 0 ? filterParts.join(' | ') : 'None'}</p>
</div>
${chartImages.map((src, i) => `<div class="chart"><img src="${src}" alt="Chart ${i + 1}" /></div>`).join('\n')}
<div class="footer">Data sourced from IIASA Scenario Explorer API. European Scientific Advisory Board on Climate Change (ESABCC).</div>
</body></html>`;

    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ESABCC_Figure_Report_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [activeDb, selRegions, activePreset, selCategories, selNarratives, selRCPs, esabccMode, policyGapMode]);

  // ── Filtered lists ─────────────────────────────────────────────────────
  const filteredModels = models.filter(m => !modelSearch || m.toLowerCase().includes(modelSearch.toLowerCase()));
  const filteredScenarios = scenarios.filter(s => !scenarioSearch || s.toLowerCase().includes(scenarioSearch.toLowerCase()));
  const filteredVariables = variables.filter(v => !variableSearch || v.toLowerCase().includes(variableSearch.toLowerCase()));
  const filteredRegions = regions.filter(r => !regionSearch || r.toLowerCase().includes(regionSearch.toLowerCase()));

  // Available region quick-picks for this database
  const availablePicks = REGION_PICKS.filter(pick => findRegion(regions, pick.names));

  // ESABCC 2040 requires EU-relevant database and EU27 region
  const euRegionMatch = findRegion(regions, REGION_PICKS[1].names);
  const hasEuRegionSelected = euRegionMatch ? selRegions.includes(euRegionMatch) : false;
  const isEuDatabase = activeDb.toLowerCase().includes('eu') || activeDb.toLowerCase().includes('cab');
  const esabcc2040Available = isEuDatabase || hasEuRegionSelected;
  const esabcc2040Tooltip = !esabcc2040Available
    ? 'ESABCC 2040 Advice requires an EU-focused database (e.g. EU CAB) and/or EU27 region selected'
    : '';

  // ── Saved-view state serializer ────────────────────────────────────────
  // Captures every filter the explorer carries so it can be restored later
  // from `scenario_views`. Schema-on-read on the server side, so adding new
  // fields here is safe — older saved views will simply ignore the gap.
  const getViewState = useCallback(() => ({
    v: 1,
    topMode,
    activeDb,
    activePreset,
    selModels,
    selScenarios,
    selVariable,
    selRegions,
    selCategories,
    selNarratives,
    selRCPs,
    esabccMode,
    policyGapMode,
    viewMode,
    smartRelevance,
    comparisonMode,
    compRegionA,
    compRegionB,
  }), [
    topMode, activeDb, activePreset, selModels, selScenarios, selVariable, selRegions,
    selCategories, selNarratives, selRCPs, esabccMode, policyGapMode, viewMode,
    smartRelevance, comparisonMode, compRegionA, compRegionB,
  ]);

  const applyViewState = useCallback((raw: unknown) => {
    if (!raw || typeof raw !== 'object') return;
    const s = raw as Record<string, unknown>;
    const setStr = (v: unknown, fn: (x: string) => void) => {
      if (typeof v === 'string') fn(v);
    };
    const setStrArr = (v: unknown, fn: (x: string[]) => void) => {
      if (Array.isArray(v) && v.every(x => typeof x === 'string')) fn(v as string[]);
    };
    const setBool = (v: unknown, fn: (x: boolean) => void) => {
      if (typeof v === 'boolean') fn(v);
    };
    if (s.topMode === 'statistics' || s.topMode === 'scenarios' || s.topMode === 'policy-gap') {
      setTopMode(s.topMode);
    }
    setStr(s.activeDb, setActiveDb);
    setStr(s.activePreset, setActivePreset);
    setStrArr(s.selModels, setSelModels);
    setStrArr(s.selScenarios, setSelScenarios);
    setStr(s.selVariable, setSelVariable);
    setStrArr(s.selRegions, setSelRegions);
    setStrArr(s.selCategories, setSelCategories);
    setStrArr(s.selNarratives, setSelNarratives);
    setStrArr(s.selRCPs, setSelRCPs);
    setBool(s.esabccMode, setEsabccMode);
    setBool(s.policyGapMode, setPolicyGapMode);
    if (s.viewMode === 'dashboard' || s.viewMode === 'single') setViewMode(s.viewMode);
    setBool(s.smartRelevance, setSmartRelevance);
    setBool(s.comparisonMode, setComparisonMode);
    setStr(s.compRegionA, setCompRegionA);
    setStr(s.compRegionB, setCompRegionB);
  }, []);

  // Read `?view=<id>` once on mount, then strip it from the URL after the
  // ScenarioViewsMenu auto-loads — keeps subsequent edits from being
  // bookmarked under the original id.
  const [autoLoadId, setAutoLoadId] = useState<string | null>(null);
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const id = new URLSearchParams(window.location.search).get('view');
    if (id) setAutoLoadId(id);
  }, []);
  const handleAutoLoaded = useCallback(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    url.searchParams.delete('view');
    window.history.replaceState({}, '', url.toString());
  }, []);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <OnboardingTour
        moduleKey="scenarios"
        steps={[
          { title: 'Three modes', body: 'Toggle between Eurostat statistics, IPCC AR6 / IIASA scenarios, and the ESABCC policy-gap charts.' },
          { title: 'Saved views', body: 'Save filter snapshots and share via URL — your team will see the same chart on click.' },
          { title: 'Scenario × Policy alignment', body: 'In Policy Gap mode, scroll past the chart to see the EU policies addressing each sector.' },
        ]}
      />
      <PageHero
        title="Data & Scenario Explorer"
        subtitle={
          topMode === 'statistics' ? (
            <>
              Browse historical EU statistics from{' '}
              <a href="https://ec.europa.eu/eurostat/databrowser/explore/all/all_themes" target="_blank" rel="noopener noreferrer" className="text-[#00928F] hover:underline font-medium">
                Eurostat
              </a>
              . Pick variables (grouped by topic) and regions, then load the data.
            </>
          ) : topMode === 'policy-gap' ? (
            <>
              Interactive progress indicators from the{' '}
              <a href="https://climate-advisory-board.europa.eu/reports-and-publications/towards-eu-climate-neutrality-progress-policy-gaps-and-opportunities" target="_blank" rel="noopener noreferrer" className="text-[#608c95] hover:underline font-medium">
                ESABCC Assessment Report 2024
              </a>
              . Charts auto-update from Eurostat &amp; EEA data.
            </>
          ) : (
            <>
              Explore climate mitigation scenarios from{' '}
              <a href="https://data.ece.iiasa.ac.at" target="_blank" rel="noopener noreferrer" className="text-[#00928F] hover:underline font-medium">
                IIASA / ESABCC / NGFS
              </a>{' '}
              and other scenario databases. Select a database, region and analysis preset.
            </>
          )
        }
      />
      <div className="max-w-[1600px] mx-auto px-3 sm:px-6 pt-4 sm:pt-6 pb-8 overflow-x-hidden">
        <div className="mb-4 sm:mb-6">
          <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExportPDF}
            disabled={charts.length === 0}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition border ${
              charts.length === 0
                ? 'bg-grey-100 text-grey-400 border-grey-200 cursor-not-allowed opacity-60'
                : 'bg-[#003399] text-white border-[#003399] hover:bg-[#002266]'
            }`}
            title={charts.length === 0 ? 'Load data first to export a figure report' : 'Export all visible charts as a styled PDF report'}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/>
            </svg>
            Export Figure Report (PDF)
          </button>
          <Link
            href="/scenarios/upload"
            title="Open the public submission portal — share this URL with modellers to collect scenario data directly into our database"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition border border-accent-orange text-accent-orange hover:bg-surface-orange">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><path d="M17 8l-5-5-5 5"/><path d="M12 3v12"/>
            </svg>
            Submit / Request Scenario Data
          </Link>
          <Link
            href="/scenarios/submissions"
            title="Secretariat review — screen and analyse incoming scenario submissions"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition border border-grey-300 text-tertiary-dark hover:border-primary hover:text-primary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 12l2 2 4-4"/><path d="M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z"/>
            </svg>
            Review Submissions
          </Link>
          <ScenarioViewsMenu
            getState={getViewState}
            applyState={applyViewState}
            autoLoadId={autoLoadId}
            onAutoLoaded={handleAutoLoaded}
          />
        </div>
      </div>

      {/* One-tap saved-view recall row. Renders nothing when the user has
          no saved views, so first-time users see a quiet header. */}
      <div className="mb-3">
        <ScenarioViewChips applyState={applyViewState} activeViewId={autoLoadId} />
      </div>

      {/* Top-level mode toggle: Statistics vs Policy Gap vs Scenarios */}
      <div className="flex items-center gap-2 mb-4 border-b border-grey-200 overflow-x-auto scroll-x">
        <button
          onClick={() => setTopMode('statistics')}
          className={`px-3 sm:px-4 py-2.5 sm:py-2 text-[13px] sm:text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap touch-target ${
            topMode === 'statistics'
              ? 'border-primary text-primary'
              : 'border-transparent text-tertiary hover:text-primary'
          }`}>
            Statistics (Eurostat)
        </button>
        <button
          onClick={() => setTopMode('policy-gap')}
          className={`px-3 sm:px-4 py-2.5 sm:py-2 text-[13px] sm:text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap touch-target ${
            topMode === 'policy-gap'
              ? 'border-[#608c95] text-[#608c95]'
              : 'border-transparent text-tertiary hover:text-[#608c95]'
          }`}>
            Policy Gap
        </button>
        <button
          onClick={() => setTopMode('scenarios')}
          className={`px-3 sm:px-4 py-2.5 sm:py-2 text-[13px] sm:text-sm font-medium border-b-2 transition -mb-px whitespace-nowrap touch-target ${
            topMode === 'scenarios'
              ? 'border-primary text-primary'
              : 'border-transparent text-tertiary hover:text-primary'
          }`}>
            Scenario projections
        </button>
        <span className="ml-auto text-[10px] text-tertiary italic hidden lg:inline">
          {topMode === 'statistics'
            ? 'Historical observation data — pick a topic group, then variables and regions.'
            : topMode === 'policy-gap'
            ? 'ESABCC progress indicators — auto-updated from Eurostat & EEA, with policy benchmarks.'
            : 'Model projection scenarios — pick a database, then a preset or single variable.'}
        </span>
      </div>

      {/* ── Statistics mode ─────────────────────────────────────────── */}
      {topMode === 'statistics' && <EurostatExplorer />}

      {/* ── Policy Gap mode ────────────────────────────────────────── */}
      {topMode === 'policy-gap' && (
        <div className="space-y-4">
          <PolicyGapExplorer />
          {/* #14 — surface the EU policies that map to each gap sector. */}
          <ScenarioPolicyAlignment />
        </div>
      )}

      {/* ── Scenario projections mode ────────────────────────────────── */}
      {topMode === 'scenarios' && (<>
      {/* Database selector */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4">
        {databases.map(db => (
          <button key={db.key} onClick={() => setActiveDb(db.key)}
            className={`px-2.5 sm:px-4 py-1.5 sm:py-2 rounded text-xs sm:text-sm font-medium transition border ${
              activeDb === db.key ? 'bg-primary text-white border-primary' : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary hover:text-primary'
            }`} title={db.description}>
            {db.label}
          </button>
        ))}
      </div>

      {/* Region quick-picks */}
      <div className="mb-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-xs font-bold text-tertiary uppercase tracking-wider">Region{selRegions.length > 1 ? 's' : ''}</span>
          {selRegions.map(r => (
            <span key={r} className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded">{r}</span>
          ))}
          {selRegions.length > 1 && (
            <button onClick={() => { setSelRegions(selRegions.slice(0, 1)); setCharts([]); autoFetched.current = false; }}
              className="text-[10px] text-primary hover:underline">Keep first only</button>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {availablePicks.map(pick => {
            const match = findRegion(regions, pick.names);
            const isActive = match ? selRegions.includes(match) : false;
            return (
              <button key={pick.label} onClick={() => {
                if (!match) return;
                setCharts([]); autoFetched.current = false;
                setSelRegions(prev => {
                  if (prev.includes(match)) return prev.length > 1 ? prev.filter(r => r !== match) : prev;
                  return [...prev, match];
                });
              }}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
                  isActive ? 'bg-secondary text-white border-secondary' : 'bg-white text-tertiary-dark border-grey-200 hover:border-secondary hover:text-secondary'
                }`}>
                {pick.label}
              </button>
            );
          })}
          <button onClick={() => setShowFilters(!showFilters)}
            className="px-3 py-1.5 rounded-full text-xs font-medium border border-grey-200 text-tertiary hover:text-primary hover:border-primary transition">
            {showFilters ? 'Hide filters' : 'More filters...'}
          </button>
        </div>
      </div>

      {/* View mode + preset selector */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex gap-1 bg-grey-50 rounded p-0.5">
          <button onClick={() => { setViewMode('dashboard'); setCharts([]); autoFetched.current = false; }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'dashboard' ? 'bg-white shadow text-primary' : 'text-tertiary hover:text-tertiary-dark'}`}>
            Dashboard
          </button>
          <button onClick={() => { setViewMode('single'); setCharts([]); autoFetched.current = false; }}
            className={`px-3 py-1.5 rounded text-xs font-medium transition ${viewMode === 'single' ? 'bg-white shadow text-primary' : 'text-tertiary hover:text-tertiary-dark'}`}>
            Single Variable
          </button>
        </div>

        {viewMode === 'dashboard' && (
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(DASHBOARD_PRESETS).map(([key, preset]) => {
              const isEsabcc = key === 'esabcc2040';
              const blocked = isEsabcc && !esabcc2040Available;
              const handleClick = () => {
                if (blocked) return;
                // Special handlers for presets that auto-configure filters
                if (key === 'regionalDeepDive') {
                  setPickerRegionA('');
                  setPickerRegionB('');
                  setRegionPickerOpen(true);
                  return;
                }
                if (key === 'sectoralDecarb') { activateSectoralDecarb(); return; }
                if (key === 'carbonBudget') { activateCarbonBudget(); return; }
                setActivePreset(key); setCharts([]); autoFetched.current = false;
              };
              return (
                <button key={key}
                  onClick={handleClick}
                  disabled={blocked}
                  className={`px-3 py-1.5 rounded text-xs font-medium transition border ${
                    blocked ? 'bg-grey-100 text-grey-400 border-grey-200 cursor-not-allowed opacity-60' :
                    activePreset === key ? 'bg-primary text-white border-primary' : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary'
                  }`}
                  title={blocked ? esabcc2040Tooltip : preset.description}>
                  {preset.label}
                </button>
              );
            })}
          </div>
        )}

        {viewMode === 'single' && (
          <select value={selVariable} onChange={e => { setSelVariable(e.target.value); setCharts([]); autoFetched.current = false; }}
            className="flex-1 min-w-0 px-3 py-1.5 text-xs sm:text-sm border border-grey-200 rounded focus:outline-none focus:border-primary bg-white">
            <option value="">Select variable...</option>
            {variables.filter(v => !/^[A-Z][A-Za-z0-9/]+\s+\d/.test(v)).slice(0, 500).map(v => (
              <option key={v} value={v}>{v}</option>
            ))}
          </select>
        )}

        <button onClick={viewMode === 'dashboard' ? fetchDashboard : fetchSingle}
          disabled={!!loading || selRegions.length === 0}
          className="px-6 py-1.5 rounded text-xs sm:text-sm font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-40 transition whitespace-nowrap">
          {loading ? 'Loading...' : 'Load Data'}
        </button>
      </div>

      {/* ── ESABCC Analysis Panel ──────────────────────────────────── */}
      {availableCategories.length > 0 && (
        <div className="mb-4 bg-gradient-to-r from-[#003399]/5 to-accent-red/5 border border-grey-200 rounded-xl p-3 sm:p-4">
          <div className="flex items-center gap-2 mb-3">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#003399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
            </svg>
            <span className="text-sm font-bold text-tertiary-dark">ESABCC Analysis</span>
            {(esabccMode || policyGapMode) && (
              <button onClick={() => {
                if (esabccMode) toggleEsabcc();
                if (policyGapMode) togglePolicyGap();
              }} className="ml-auto text-[10px] text-tertiary hover:text-primary transition">
                Reset
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            {/* 2040 Advice */}
            <button
              onClick={() => {
                if (policyGapMode) togglePolicyGap();
                if (!esabccMode) { if (esabcc2040Available) toggleEsabcc(); }
                else toggleEsabcc();
              }}
              disabled={!esabcc2040Available && !esabccMode}
              title={!esabcc2040Available && !esabccMode ? esabcc2040Tooltip : 'ESABCC 2040 Advice: Show only C1/C2 Paris-aligned scenarios'}
              className={`relative text-left p-3 rounded-lg border-2 transition ${
                !esabcc2040Available && !esabccMode
                  ? 'bg-grey-50 text-grey-400 border-grey-200 cursor-not-allowed opacity-60'
                  : esabccMode
                    ? 'bg-[#003399] text-white border-[#003399] shadow-md'
                    : 'bg-white text-tertiary-dark border-grey-200 hover:border-[#003399]'
              }`}>
              <div className="text-xs font-bold mb-1">2040 Advice</div>
              <div className={`text-[10px] leading-snug ${esabccMode ? 'text-white/80' : 'text-tertiary'}`}>
                90-95% GHG reduction by 2040. C1/C2 pathways only.
              </div>
              {esabccMode && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />}
            </button>

            {/* Policy Gap */}
            <button
              onClick={() => {
                if (esabccMode) toggleEsabcc();
                togglePolicyGap();
              }}
              className={`relative text-left p-3 rounded-lg border-2 transition ${
                policyGapMode
                  ? 'bg-accent-red text-white border-accent-red shadow-md'
                  : 'bg-white text-tertiary-dark border-grey-200 hover:border-accent-red'
              }`}>
              <div className="text-xs font-bold mb-1">Policy Gap</div>
              <div className={`text-[10px] leading-snug ${policyGapMode ? 'text-white/80' : 'text-tertiary'}`}>
                Gap between current policies (C5-C8) and Paris-aligned (C1/C2).
              </div>
              {policyGapMode && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />}
            </button>

            {/* Regional Deep Dive */}
            <button
              onClick={() => {
                if (esabccMode) toggleEsabcc();
                if (policyGapMode) togglePolicyGap();
                setPickerRegionA('');
                setPickerRegionB('');
                setRegionPickerOpen(true);
              }}
              className={`relative text-left p-3 rounded-lg border-2 transition ${
                activePreset === 'regionalDeepDive'
                  ? 'bg-secondary text-white border-secondary shadow-md'
                  : 'bg-white text-tertiary-dark border-grey-200 hover:border-secondary'
              }`}>
              <div className="text-xs font-bold mb-1">Regional Deep Dive</div>
              <div className={`text-[10px] leading-snug ${activePreset === 'regionalDeepDive' ? 'text-white/80' : 'text-tertiary'}`}>
                Pick two regions to open an in-depth side-by-side comparison.
              </div>
              {activePreset === 'regionalDeepDive' && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />}
            </button>

            {/* Carbon Budget */}
            <button
              onClick={() => {
                if (esabccMode) toggleEsabcc();
                if (policyGapMode) togglePolicyGap();
                activateCarbonBudget();
              }}
              className={`relative text-left p-3 rounded-lg border-2 transition ${
                activePreset === 'carbonBudget'
                  ? 'bg-[#6667AB] text-white border-[#6667AB] shadow-md'
                  : 'bg-white text-tertiary-dark border-grey-200 hover:border-[#6667AB]'
              }`}>
              <div className="text-xs font-bold mb-1">Carbon Budget</div>
              <div className={`text-[10px] leading-snug ${activePreset === 'carbonBudget' ? 'text-white/80' : 'text-tertiary'}`}>
                EU fair share of remaining 1.5°C carbon budget.
              </div>
              {activePreset === 'carbonBudget' && <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-white animate-pulse" />}
            </button>
          </div>

          {/* Active analysis description */}
          {esabccMode && (
            <div className="mt-3 p-2.5 bg-[#003399]/10 rounded-lg text-[11px] text-[#003399] leading-relaxed">
              <strong>ESABCC 2040 Advice:</strong> Showing C1/C2 scenarios aligned with 90-95% net GHG reduction by 2040 vs 1990.
              Net-zero by 2050. SSP1/SSP2 pathways. EU equity-based carbon budget.
              <span className="block mt-1 text-[10px] opacity-70">
                Benchmarks: {ESABCC_2040_CRITERIA.benchmarks.map((b, i) => <span key={i} className="mr-2">{b.label}</span>)}
              </span>
              <span className="block mt-1 text-[10px] opacity-80">
                Sources:{' '}
                <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1119"
                   target="_blank" rel="noopener noreferrer"
                   className="underline hover:no-underline">
                  EU Climate Law – Reg. 2021/1119 (EUR-Lex)
                </a>
                {' · '}
                <a href="https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040-climate-target"
                   target="_blank" rel="noopener noreferrer"
                   className="underline hover:no-underline">
                  ESABCC 2040 advice (June 2023/2024)
                </a>
                {' · '}
                <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=OJ:L:2016:282:TOC"
                   target="_blank" rel="noopener noreferrer"
                   className="underline hover:no-underline">
                  Paris Agreement (OJ L 282/4, EUR-Lex)
                </a>
              </span>
            </div>
          )}
          {policyGapMode && (
            <div className="mt-3 p-2.5 bg-accent-red/10 rounded-lg text-[11px] text-accent-red leading-relaxed">
              <strong>Policy Gap Analysis:</strong> Comparing current policies (C5-C8, red dashed) vs Paris-aligned (C1/C2, blue solid).
              Orange shaded area = implementation gap. C3/C4 shown as intermediate reference.
              <span className="block mt-1 text-[10px] opacity-70">
                EU Climate Law: {ESABCC_2040_CRITERIA.benchmarks.map((b, i) => <span key={i} className="mr-2">{b.label}</span>)}
              </span>
              <span className="block mt-1 text-[10px] opacity-80">
                Source:{' '}
                <a href="https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1119"
                   target="_blank" rel="noopener noreferrer"
                   className="underline hover:no-underline">
                  Regulation (EU) 2021/1119 – European Climate Law (EUR-Lex)
                </a>
              </span>
            </div>
          )}
          {activePreset === 'regionalDeepDive' && (
            <div className="mt-3 p-2.5 bg-secondary/10 rounded-lg text-[11px] text-secondary leading-relaxed">
              <strong>Regional Deep Dive:</strong> EU sub-regions compared side-by-side. Mediterranean faces disproportionate warming, water stress, and wildfire risk.
              Temperature, precipitation, sea level, and extreme events.
            </div>
          )}
          {activePreset === 'carbonBudget' && (
            <div className="mt-3 p-2.5 bg-[#6667AB]/10 rounded-lg text-[11px] text-[#6667AB] leading-relaxed">
              <strong>Carbon Budget:</strong> EU fair share ~50-75 GtCO2 from 2020. At current rates (~2.5 GtCO2/yr), budget exhausted by 2040-2050.
              C1/C2 compatible pathways only.
              <span className="block mt-1 text-[10px] opacity-80">
                Source:{' '}
                <a href="https://climate-advisory-board.europa.eu/reports-and-publications/scientific-advice-for-the-determination-of-an-eu-wide-2040-climate-target"
                   target="_blank" rel="noopener noreferrer"
                   className="underline hover:no-underline">
                  ESABCC 2040 advice – EU carbon budget methodology
                </a>
                {' · '}
                <a href="https://www.ipcc.ch/report/ar6/wg3/"
                   target="_blank" rel="noopener noreferrer"
                   className="underline hover:no-underline">
                  IPCC AR6 WG3
                </a>
              </span>
            </div>
          )}
        </div>
      )}

      {/* Climate Category & SSP Narrative Filters */}
      {(availableCategories.length > 0 || availableNarratives.length > 0) && (
        <div className="mb-4 flex flex-col sm:flex-row gap-3">
          {/* C1-C8 Climate Categories */}
          {availableCategories.length > 0 && (
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">Climate Category</span>
                {selCategories.length > 0 && (
                  <button onClick={() => { setSelCategories([]); setCharts([]); autoFetched.current = false; }}
                    className="text-[10px] text-primary hover:underline">Clear</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableCategories.map(cat => {
                  const info = CLIMATE_CATEGORIES[cat];
                  const isActive = selCategories.includes(cat);
                  return (
                    <button key={cat}
                      onClick={() => {
                        setSelCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
                        setCharts([]); autoFetched.current = false;
                      }}
                      title={info?.description || cat}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition border ${
                        isActive ? 'text-white border-transparent' : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary'
                      }`}
                      style={isActive ? { backgroundColor: info?.color || '#004B7F', borderColor: info?.color || '#004B7F' } : {}}>
                      {info?.label || cat}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* SSP Narratives */}
          {availableNarratives.length > 0 && (
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">SSP Narrative</span>
                {selNarratives.length > 0 && (
                  <button onClick={() => { setSelNarratives([]); setCharts([]); autoFetched.current = false; }}
                    className="text-[10px] text-primary hover:underline">Clear</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableNarratives.map(ssp => {
                  const info = SSP_NARRATIVES[ssp];
                  const isActive = selNarratives.includes(ssp);
                  return (
                    <button key={ssp}
                      onClick={() => {
                        setSelNarratives(prev => prev.includes(ssp) ? prev.filter(s => s !== ssp) : [...prev, ssp]);
                        setCharts([]); autoFetched.current = false;
                      }}
                      title={info?.description || ssp}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition border ${
                        isActive ? 'text-white border-transparent' : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary'
                      }`}
                      style={isActive ? { backgroundColor: info?.color || '#004B7F', borderColor: info?.color || '#004B7F' } : {}}>
                      {info?.label || ssp}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* RCP Scenarios */}
          {availableRCPs.length > 0 && (
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[10px] font-bold text-tertiary uppercase tracking-wider">RCP Forcing</span>
                {selRCPs.length > 0 && (
                  <button onClick={() => { setSelRCPs([]); setCharts([]); autoFetched.current = false; }}
                    className="text-[10px] text-primary hover:underline">Clear</button>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {availableRCPs.map(rcp => {
                  const info = RCP_SCENARIOS[rcp];
                  const isActive = selRCPs.includes(rcp);
                  return (
                    <button key={rcp}
                      onClick={() => {
                        setSelRCPs(prev => prev.includes(rcp) ? prev.filter(r => r !== rcp) : [...prev, rcp]);
                        setCharts([]); autoFetched.current = false;
                      }}
                      title={`${info?.description || rcp} — ${info?.warming || ''}`}
                      className={`px-2 py-1 rounded text-[10px] font-medium transition border ${
                        isActive ? 'text-white border-transparent' : 'bg-white text-tertiary-dark border-grey-200 hover:border-primary'
                      }`}
                      style={isActive ? { backgroundColor: info?.color || '#004B7F', borderColor: info?.color || '#004B7F' } : {}}>
                      {info?.label || rcp}
                    </button>
                  );
                })}
              </div>
              {/* European warming projections for selected RCPs */}
              {selRCPs.length > 0 && (
                <div className="mt-1.5 text-[9px] text-tertiary bg-grey-50 px-2 py-1 rounded border border-grey-100">
                  <strong>European warming projections:</strong>{' '}
                  {selRCPs.map(rcp => {
                    const w = EUROPE_RCP_WARMING[rcp];
                    return w ? `${rcp}: ${w.by2050} by 2050, ${w.by2100} by 2100` : rcp;
                  }).join(' | ')}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Combined SSP-RCP scenario info */}
      {selNarratives.length > 0 && selRCPs.length > 0 && (
        <div className="mb-3 text-[10px] text-tertiary bg-surface-blue px-3 py-2 rounded border border-primary/20">
          <strong>Combined SSP-RCP scenarios:</strong>{' '}
          {Object.entries(SSP_RCP_COMBINATIONS)
            .filter(([, combo]) => selNarratives.includes(combo.ssp) && selRCPs.includes(combo.rcp))
            .map(([key, combo]) => (
              <span key={key} className="inline-block bg-primary/10 text-primary px-1.5 py-0.5 rounded mr-1 font-medium">
                {combo.label}
              </span>
            ))}
          {Object.entries(SSP_RCP_COMBINATIONS)
            .filter(([, combo]) => selNarratives.includes(combo.ssp) && selRCPs.includes(combo.rcp)).length === 0 && (
            <span className="italic">No standard SSP-RCP combinations match current selection</span>
          )}
        </div>
      )}

      {/* Active filter summary */}
      {(selCategories.length > 0 || selNarratives.length > 0 || selRCPs.length > 0) && !esabccMode && !policyGapMode && (
        <div className="mb-4 text-[10px] text-tertiary bg-grey-50 px-3 py-2 rounded border border-grey-100">
          Filtering: {selCategories.length > 0 && <strong>{selCategories.join(', ')}</strong>}
          {selCategories.length > 0 && (selNarratives.length > 0 || selRCPs.length > 0) && ' + '}
          {selNarratives.length > 0 && <strong>{selNarratives.map(s => SSP_NARRATIVES[s]?.label || s).join(', ')}</strong>}
          {selNarratives.length > 0 && selRCPs.length > 0 && ' + '}
          {selRCPs.length > 0 && <strong>{selRCPs.map(r => RCP_SCENARIOS[r]?.label || r).join(', ')}</strong>}
          {' '}— showing median & distribution for selected scenario pathways
        </div>
      )}

      {/* Error / Loading — design-system primitives so the banner has the
          right ARIA roles, dismiss affordance, and visual taxonomy. */}
      {error && (
        <div className="mb-4">
          <ErrorState
            title="We couldn't load this slice of the dataset"
            body={error}
            primaryAction={{ label: 'Dismiss', onClick: () => setError(null) }}
            hint="If this persists, try a smaller variable set or a single region — the AR6 snapshot is large."
          />
        </div>
      )}
      {loading && (
        <div className="mb-4">
          <LoadingState label={loading} inline />
        </div>
      )}

      {/* Active-filter summary chips — sticky on scroll. Shows the user's
          current selection at a glance + one-tap clear. The full per-filter
          checkbox panels still live below for fine-grained editing.
          Brief item M·02 #3. */}
      {(selRegions.length > 0 || selVariable || selModels.length > 0 || selScenarios.length > 0) && (
        <FilterPillRow sticky className="mb-3">
          <span
            className="uppercase tracking-wide font-semibold text-[var(--mh-muted)] pr-1"
            style={{ fontSize: 'var(--mh-text-2xs)' }}
          >
            Filtered by
          </span>
          {selRegions.length > 0 && (
            <FilterPill
              label={selRegions.length === 1 ? `Region: ${selRegions[0]}` : 'Regions'}
              count={selRegions.length}
              active
              onClick={() => setShowFilters(true)}
              onClear={() => setSelRegions([])}
            />
          )}
          {selVariable && (
            <FilterPill
              label={`Variable: ${(selVariable.split('|').pop() || selVariable).slice(0, 32)}`}
              active
              onClick={() => setShowFilters(true)}
              onClear={() => setSelVariable('')}
            />
          )}
          {selModels.length > 0 && (
            <FilterPill
              label="Models"
              count={selModels.length}
              active
              onClick={() => setShowFilters(true)}
              onClear={() => setSelModels([])}
            />
          )}
          {selScenarios.length > 0 && (
            <FilterPill
              label="Scenarios"
              count={selScenarios.length}
              active
              onClick={() => setShowFilters(true)}
              onClear={() => setSelScenarios([])}
            />
          )}
          <button
            type="button"
            onClick={() => {
              setSelRegions([]);
              setSelVariable('');
              setSelModels([]);
              setSelScenarios([]);
            }}
            className="mh-focus mh-motion-fast text-[var(--mh-muted)] hover:text-[var(--mh-status-danger)] underline"
            style={{ fontSize: 'var(--mh-text-2xs)' }}
          >
            Clear all
          </button>
        </FilterPillRow>
      )}

      {/* Expandable filter panel */}
      {showFilters && (
        <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Region filter */}
          <FilterPanel title="Regions" badge={selRegions.length ? `${selRegions.length}` : 'none'}>
            <input type="text" placeholder="Search regions..."
              value={regionSearch} onChange={e => setRegionSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-grey-200 rounded mb-1.5 focus:outline-none focus:border-primary" />
            {selRegions.length > 0 && (
              <button onClick={() => { setSelRegions(selRegions.slice(0, 1)); }} className="text-[10px] text-primary hover:underline mb-1">Keep first only</button>
            )}
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredRegions.filter(r => !r.includes('|')).concat(filteredRegions.filter(r => r.includes('|'))).map(r => (
                <label key={r} className="flex items-start gap-1.5 px-1.5 py-0.5 rounded cursor-pointer text-xs hover:bg-grey-50 text-tertiary-dark">
                  <input type="checkbox" checked={selRegions.includes(r)}
                    onChange={e => {
                      setCharts([]); autoFetched.current = false;
                      setSelRegions(prev => e.target.checked ? [...prev, r] : prev.filter(x => x !== r));
                    }} className="accent-primary mt-0.5 shrink-0" />
                  <span className="break-words min-w-0" title={r}>{r}</span>
                </label>
              ))}
            </div>
          </FilterPanel>

          {/* Variable filter */}
          <FilterPanel title="Variable" badge={selVariable ? selVariable.split('|').pop() || '' : 'none'}>
            <input type="text" placeholder="Search variables..."
              value={variableSearch} onChange={e => setVariableSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-grey-200 rounded mb-1.5 focus:outline-none focus:border-primary" />
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredVariables.filter(v => !/^[A-Z][A-Za-z0-9/]+\s+\d/.test(v)).slice(0, 200).map(v => (
                <label key={v} className="flex items-start gap-1.5 px-1.5 py-0.5 rounded cursor-pointer text-xs hover:bg-grey-50 text-tertiary-dark">
                  <input type="radio" name="variable" checked={selVariable === v}
                    onChange={() => { setSelVariable(v); if (viewMode === 'single') { setCharts([]); autoFetched.current = false; } }} className="accent-secondary mt-0.5 shrink-0" />
                  <span className="break-words min-w-0" title={v}>{v}</span>
                </label>
              ))}
            </div>
          </FilterPanel>

          {/* Model filter */}
          <FilterPanel title="Models" badge={selModels.length ? `${selModels.length}` : 'all'}>
            <input type="text" placeholder="Search models..."
              value={modelSearch} onChange={e => setModelSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-grey-200 rounded mb-1.5 focus:outline-none focus:border-primary" />
            {selModels.length > 0 && (
              <button onClick={() => setSelModels([])} className="text-[10px] text-primary hover:underline mb-1">Clear</button>
            )}
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredModels.map(m => (
                <label key={m} className="flex items-start gap-1.5 px-1.5 py-0.5 rounded cursor-pointer text-xs hover:bg-grey-50 text-tertiary-dark">
                  <input type="checkbox" checked={selModels.includes(m)}
                    onChange={e => setSelModels(e.target.checked ? [...selModels, m] : selModels.filter(x => x !== m))}
                    className="accent-primary mt-0.5 shrink-0" />
                  <span className="break-words min-w-0" title={m}>{m}</span>
                </label>
              ))}
            </div>
          </FilterPanel>

          {/* Scenario filter */}
          <FilterPanel title="Scenarios" badge={selScenarios.length ? `${selScenarios.length}` : 'all'}>
            <input type="text" placeholder="Search scenarios..."
              value={scenarioSearch} onChange={e => setScenarioSearch(e.target.value)}
              className="w-full px-2 py-1 text-xs border border-grey-200 rounded mb-1.5 focus:outline-none focus:border-primary" />
            {selScenarios.length > 0 && (
              <button onClick={() => setSelScenarios([])} className="text-[10px] text-primary hover:underline mb-1">Clear</button>
            )}
            <div className="max-h-48 overflow-y-auto space-y-0.5">
              {filteredScenarios.filter(s => !/\|\s*[A-Z][A-Za-z0-9/]+\s+\d/.test(s)).map(s => (
                <label key={s} className="flex items-start gap-1.5 px-1.5 py-0.5 rounded cursor-pointer text-xs hover:bg-grey-50 text-tertiary-dark">
                  <input type="checkbox" checked={selScenarios.includes(s)}
                    onChange={e => setSelScenarios(e.target.checked ? [...selScenarios, s] : selScenarios.filter(x => x !== s))}
                    className="accent-secondary mt-0.5 shrink-0" />
                  <span className="break-words min-w-0" title={s}>{s}</span>
                </label>
              ))}
            </div>
          </FilterPanel>
        </div>
      )}

      {/* Stats bar */}
      <div className="flex flex-wrap gap-3 mb-4 text-[10px] sm:text-xs text-tertiary">
        <span><strong>{models.length}</strong> models</span>
        <span><strong>{scenarios.length}</strong> scenarios</span>
        <span><strong>{variables.length}</strong> variables</span>
        <span><strong>{regions.length}</strong> regions</span>
        <span><strong>{runs.length}</strong> runs</span>
        {selScenarios.length > 0 && <span className="text-primary"><strong>{selScenarios.length}</strong> scenarios selected</span>}
      </div>

      {/* Preset-specific info panel for sectoralDecarb (the only one not in the analysis panel) */}
      {activePreset === 'sectoralDecarb' && viewMode === 'dashboard' && (
        <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg text-xs text-primary">
          <strong>Sectoral Decarbonization Pathways:</strong> EU sector-specific emission trajectories showing required vs projected decarbonization rates.
          <span className="block mt-1">
            Sectors: Energy &amp; Heat | Industry | Transport | Buildings (Residential &amp; Commercial) | Agriculture &amp; LULUCF
          </span>
          <span className="block mt-1 text-[10px] opacity-75">
            Compare sectoral emission intensities across C1-C3 compatible scenarios to identify sectors requiring accelerated action.
          </span>
        </div>
      )}

      {/* Export toolbar */}
      {charts.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <button
            onClick={() => exportToExcel(charts, barGroups, boxData, {
              database: activeDb,
              regions: selRegions,
              categories: selCategories,
              narratives: selNarratives,
              preset: DASHBOARD_PRESETS[activePreset]?.label || activePreset,
            })}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#217346] text-white hover:bg-[#1a5c38] transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M8 13h2"/><path d="M8 17h2"/><path d="M14 13h2"/><path d="M14 17h2"/></svg>
            Export Excel
          </button>
          <button
            onClick={() => setSmartRelevance(!smartRelevance)}
            title="When on, charts that don't match your current filters are hidden and each chart shows why it was kept."
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              smartRelevance ? 'bg-secondary text-white hover:bg-secondary-dark' : 'bg-grey-200 text-tertiary-dark hover:bg-grey-300'
            }`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 21l-6-6"/><circle cx="11" cy="11" r="8"/></svg>
            Smart filter: {smartRelevance ? 'On' : 'Off'}
          </button>
          <button
            onClick={() => setComparisonMode(!comparisonMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition ${
              comparisonMode ? 'bg-accent-red text-white' : 'bg-primary text-white hover:bg-primary-dark'
            }`}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
            {comparisonMode ? 'Close Comparison' : 'In-depth Regional Comparison'}
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium bg-[#003399] text-white hover:bg-[#002266] transition">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6"/><path d="M12 18v-6"/><path d="M9 15l3 3 3-3"/>
            </svg>
            Export PDF
          </button>
          <span className="text-[10px] text-tertiary">Per-chart PNG/SVG below each chart.</span>
        </div>
      )}

      {/* Regional comparison panel */}
      {comparisonMode && (
        <div className="mb-4 bg-white rounded-lg border border-grey-200 shadow-sm p-4">
          <h3 className="text-sm font-bold text-tertiary-dark mb-2">In-depth Regional Comparison</h3>
          <p className="text-[10px] text-tertiary mb-3">Select two regions to compare median pathways and see the difference (Region A − Region B) for each variable.</p>
          <div className="flex flex-wrap items-end gap-3 mb-3">
            <div>
              <label className="text-[10px] font-medium text-tertiary-dark block mb-1">Region A</label>
              <select value={compRegionA} onChange={e => setCompRegionA(e.target.value)}
                className="px-2 py-1.5 text-xs border border-grey-200 rounded focus:outline-none focus:border-primary bg-white text-tertiary-dark min-w-[180px]">
                <option value="">Select region...</option>
                {availablePicks.map(pick => {
                  const match = findRegion(regions, pick.names);
                  return match ? <option key={match} value={match}>{pick.label}</option> : null;
                })}
              </select>
            </div>
            <div className="text-xs font-bold text-tertiary self-center pb-1">vs</div>
            <div>
              <label className="text-[10px] font-medium text-tertiary-dark block mb-1">Region B</label>
              <select value={compRegionB} onChange={e => setCompRegionB(e.target.value)}
                className="px-2 py-1.5 text-xs border border-grey-200 rounded focus:outline-none focus:border-primary bg-white text-tertiary-dark min-w-[180px]">
                <option value="">Select region...</option>
                {availablePicks.filter(pick => {
                  const match = findRegion(regions, pick.names);
                  return match && match !== compRegionA;
                }).map(pick => {
                  const match = findRegion(regions, pick.names);
                  return match ? <option key={match} value={match}>{pick.label}</option> : null;
                })}
              </select>
            </div>
            <button onClick={() => fetchComparison()}
              disabled={!compRegionA || !compRegionB || compRegionA === compRegionB || !!loading}
              className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition">
              Compare
            </button>
          </div>

          {/* Comparison charts */}
          {compCharts.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
              {compCharts.map((cc, i) => (
                <div key={i} className="border border-grey-100 rounded p-2">
                  <DifferenceChart
                    variable={cc.variable}
                    unit={cc.unit}
                    years={cc.years}
                    medianA={cc.medianA}
                    medianB={cc.medianB}
                    diff={cc.diff}
                    regionA={compRegionA}
                    regionB={compRegionB}
                    compact
                  />
                  <div className="mt-1 text-[9px] text-tertiary text-right">
                    {cc.diff.filter(d => d !== null).length > 0 && (() => {
                      const lastDiff = cc.diff.filter((d): d is number => d !== null);
                      const lastVal = lastDiff[lastDiff.length - 1];
                      const y2050 = cc.years.indexOf(2050);
                      const diff2050 = y2050 >= 0 ? cc.diff[y2050] : null;
                      return diff2050 != null
                        ? `Δ at 2050: ${diff2050 >= 0 ? '+' : ''}${diff2050.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${cc.unit}`
                        : `Latest Δ: ${lastVal >= 0 ? '+' : ''}${lastVal.toLocaleString(undefined, { maximumFractionDigits: 1 })} ${cc.unit}`;
                    })()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Regional Deep Dive — region picker modal */}
      {regionPickerOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setRegionPickerOpen(false)}>
          <div
            className="bg-white rounded-lg shadow-xl border border-grey-200 w-full max-w-md p-5"
            onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-tertiary-dark">Regional Deep Dive</h3>
                <p className="text-[11px] text-tertiary mt-1">
                  Select two regions for an in-depth side-by-side comparison of temperature,
                  precipitation, sea level and extreme events.
                </p>
              </div>
              <button
                onClick={() => setRegionPickerOpen(false)}
                className="text-tertiary hover:text-tertiary-dark text-xl leading-none px-1"
                aria-label="Close">×</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-medium text-tertiary-dark block mb-1">Region A</label>
                <select
                  value={pickerRegionA}
                  onChange={e => setPickerRegionA(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-grey-200 rounded focus:outline-none focus:border-primary bg-white text-tertiary-dark">
                  <option value="">Select region...</option>
                  {availablePicks.map(pick => {
                    const match = findRegion(regions, pick.names);
                    return match ? <option key={match} value={match}>{pick.label}</option> : null;
                  })}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-medium text-tertiary-dark block mb-1">Region B</label>
                <select
                  value={pickerRegionB}
                  onChange={e => setPickerRegionB(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-grey-200 rounded focus:outline-none focus:border-primary bg-white text-tertiary-dark">
                  <option value="">Select region...</option>
                  {availablePicks.filter(pick => {
                    const match = findRegion(regions, pick.names);
                    return match && match !== pickerRegionA;
                  }).map(pick => {
                    const match = findRegion(regions, pick.names);
                    return match ? <option key={match} value={match}>{pick.label}</option> : null;
                  })}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-5">
              <button
                onClick={() => setRegionPickerOpen(false)}
                className="px-3 py-1.5 rounded text-xs font-medium bg-grey-100 text-tertiary-dark hover:bg-grey-200 transition">
                Cancel
              </button>
              <button
                disabled={!pickerRegionA || !pickerRegionB || pickerRegionA === pickerRegionB || !!loading}
                onClick={() => {
                  const a = pickerRegionA;
                  const b = pickerRegionB;
                  setActivePreset('regionalDeepDive');
                  setCompRegionA(a);
                  setCompRegionB(b);
                  setComparisonMode(true);
                  setCharts([]);
                  autoFetched.current = false;
                  setRegionPickerOpen(false);
                  fetchComparison(a, b, 'regionalDeepDive');
                }}
                className="px-3 py-1.5 rounded text-xs font-medium bg-primary text-white hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition">
                Compare
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Charts — facet_wrap by variable when multi-region */}
      {charts.length > 0 && (() => {
        // Wrap all chart output in a div with data-chart-area for PDF export
        const multiRegion = selRegions.length > 1;

        // ── Smart relevance: compute per-chart relevance + optionally filter
        const relevanceCtx: RelevanceContext = {
          selVariable, selRegions, selCategories, esabccMode, policyGapMode, activePreset, activeDb,
        };
        const relMap = new Map<ChartData, RelevanceResult>();
        for (const c of charts) relMap.set(c, computeChartRelevance(c, relevanceCtx));

        // Per-chart provenance footer used by every PNG / SVG / CSV export
        // below — keeps "MethodHub · IIASA AR6 · accessed 2026-04-26 · …"
        // consistent across formats. Brief item M·02 #8.
        const chartProvenance = (c: ChartData) => buildProvenance({
          database: activeDb,
          preset: activePreset,
          region: c.region || (selRegions.length === 1 ? selRegions[0] : null),
          scenario: c.series?.[0]?.label || null,
        });
        const visibleCharts = smartRelevance
          ? charts.filter(c => relMap.get(c)?.relevant !== false)
          : charts;
        const hiddenCount = charts.length - visibleCharts.length;

        // Group line charts by variable for facet_wrap, keep others as-is
        if (multiRegion) {
          const lineCharts = visibleCharts.filter(c => !c.chartType || c.chartType === 'line');
          const otherCharts = visibleCharts.filter(c => c.chartType && c.chartType !== 'line');
          // Group by variable
          const varGroups: Record<string, ChartData[]> = {};
          lineCharts.forEach(c => {
            const key = c.variable;
            if (!varGroups[key]) varGroups[key] = [];
            varGroups[key].push(c);
          });
          const groupEntries = Object.entries(varGroups);
          let refIdx = 0;

          return (
            <div className="space-y-4" data-chart-area>
              {hiddenCount > 0 && (
                <div className="flex items-center justify-between text-[11px] bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
                  <span className="text-blue-900">
                    Smart filter is hiding <strong>{hiddenCount}</strong> chart{hiddenCount > 1 ? 's' : ''} that don&rsquo;t match your current filters
                  </span>
                  <button onClick={() => setSmartRelevance(false)} className="text-blue-700 hover:text-blue-900 underline">Show all</button>
                </div>
              )}
              {/* Facet-wrapped line chart groups */}
              {groupEntries.map(([variable, regionCharts]) => {
                const varShort = variable.split('|').pop() || variable;
                const unit = regionCharts[0]?.unit || '';
                const cols = regionCharts.length <= 2 ? regionCharts.length : regionCharts.length <= 4 ? 2 : 3;
                const groupStartIdx = refIdx;
                const facets = regionCharts.map((c, ri) => {
                  const idx = refIdx++;
                  const chartFilename = `ESABCC_${variable.replace(/\|/g, '_').slice(0, 40)}_${c.region || ''}_line`;
                  return (
                    <div key={ri} ref={el => { chartRefs.current[idx] = el; }} className="min-w-0 border border-grey-100 rounded p-1.5">
                      <div className="mb-0.5 text-[9px] font-semibold text-secondary bg-secondary/10 px-1.5 py-0.5 rounded inline-block truncate max-w-full">{c.region}</div>
                      <ScenarioChart series={c.series} unit={c.unit} variable={varShort} region={c.region || ''} compact policyGapMode={policyGapMode} historical={c.historical} />
                      <div className="mt-0.5 flex items-center justify-end gap-1 text-[9px] text-tertiary">
                        <button onClick={() => exportChartAsCsv(c, chartFilename, chartProvenance(c))}
                          className="px-1 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark" title="Download CSV">CSV</button>
                        <button onClick={() => { const el = chartRefs.current[idx]; if (el) exportChartAsPng(el, chartFilename, chartProvenance(c)); }}
                          className="px-1 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark">PNG</button>
                        <button onClick={() => { const el = chartRefs.current[idx]; if (el) exportChartAsSvg(el, chartFilename, chartProvenance(c)); }}
                          className="px-1 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark">SVG</button>
                      </div>
                    </div>
                  );
                });

                // Always side-by-side: grid-cols-2 for 2, grid-cols-2 lg:grid-cols-3 for 3+
                const gridClass = cols >= 3 ? 'grid-cols-2 lg:grid-cols-3' : 'grid-cols-2';

                // Use the highest-scoring chart in the group to summarise relevance
                const groupRel = regionCharts
                  .map(c => relMap.get(c))
                  .filter((r): r is RelevanceResult => !!r)
                  .sort((a, b) => b.score - a.score)[0];
                return (
                  <div key={variable} ref={el => { chartRefs.current[groupStartIdx] = el; }}
                    className="bg-white rounded-lg shadow-sm border border-grey-200 p-2 sm:p-3">
                    <h3 className="text-xs sm:text-sm font-bold text-primary mb-0.5">{varShort}</h3>
                    <p className="text-[9px] text-tertiary mb-1.5">{unit} — {regionCharts.length} region{regionCharts.length > 1 ? 's' : ''}</p>
                    <div className={`grid gap-2 ${gridClass}`}>
                      {facets}
                    </div>
                    {groupRel && groupRel.reasons.length > 0 && (
                      <div className="mt-1.5 flex items-start gap-1.5 text-[9px] text-tertiary border-t border-grey-100 pt-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full mt-0.5 ${
                          groupRel.score >= 75 ? 'bg-green-500' : groupRel.score >= 55 ? 'bg-blue-400' : 'bg-grey-300'
                        }`} />
                        <span title={`Relevance: ${groupRel.score}/100`}>
                          <strong className="text-tertiary-dark">Why:</strong> {groupRel.reasons.join(' · ')}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Non-line charts (fan, bar, box, map) rendered individually */}
              {otherCharts.length > 0 && (
                <div className={`grid gap-4 ${otherCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                  {otherCharts.map((c, oi) => {
                    const idx = refIdx++;
                    const chartFilename = `ESABCC_${(c.variable || '').replace(/\|/g, '_').slice(0, 40)}_${c.chartType || 'other'}`;
                    return (
                      <div key={oi} ref={el => { chartRefs.current[idx] = el; }} className={`bg-white rounded-lg shadow-sm border border-grey-200 p-3 sm:p-4 ${
                        c.chartType === 'map' ? 'md:col-span-2' : ''
                      }`}>
                        {c.chartType === 'fan' && (
                          <FanChart series={c.series} unit={c.unit} variable={c.variable} region={c.region || ''} compact />
                        )}
                        {c.chartType === 'bar' && barGroups.length > 0 && (
                          <BarChartComponent groups={barGroups} unit={c.unit} title={c.variable} compact />
                        )}
                        {c.chartType === 'box' && boxData.length > 0 && (
                          <BoxPlot boxes={boxData} unit={c.unit} title={c.variable} compact />
                        )}
                        {c.chartType === 'map' && mapData.length > 0 && (
                          <WorldMap data={mapData} unit={c.unit} title={c.variable} compact={false} />
                        )}
                        <div className="mt-2 flex items-center justify-between text-[10px] text-tertiary">
                          <span>
                            {c.chartType === 'fan' ? 'Quantile distribution' :
                             c.chartType === 'bar' ? 'Cross-variable comparison' :
                             c.chartType === 'box' ? 'Scenario spread' :
                             c.chartType === 'map' ? 'Regional map' : ''}
                          </span>
                          <div className="flex items-center gap-1.5">
                            {c.unit && <span className="bg-grey-100 px-1.5 py-0.5 rounded">{c.unit}</span>}
                            <button onClick={() => exportChartAsCsv(c, chartFilename, chartProvenance(c))}
                              className="px-1.5 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark" title="Download CSV">CSV</button>
                            <button onClick={() => { const el = chartRefs.current[idx]; if (el) exportChartAsPng(el, chartFilename, chartProvenance(c)); }}
                              className="px-1.5 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark">PNG</button>
                            <button onClick={() => { const el = chartRefs.current[idx]; if (el) exportChartAsSvg(el, chartFilename, chartProvenance(c)); }}
                              className="px-1.5 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark">SVG</button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        }

        // Single region: simple grid as before
        return (
          <div className="space-y-3" data-chart-area>
            {hiddenCount > 0 && (
              <div className="flex items-center justify-between text-[11px] bg-blue-50 border border-blue-200 rounded px-3 py-1.5">
                <span className="text-blue-900">
                  Smart filter is hiding <strong>{hiddenCount}</strong> chart{hiddenCount > 1 ? 's' : ''} that don&rsquo;t match your current filters
                </span>
                <button onClick={() => setSmartRelevance(false)} className="text-blue-700 hover:text-blue-900 underline">Show all</button>
              </div>
            )}
            <div className={`grid gap-4 ${visibleCharts.length === 1 ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
            {visibleCharts.map((c, i) => {
              const isCompact = visibleCharts.length > 1;
              const rel = relMap.get(c);
              const chartRegion = c.region || selRegions[0] || '';
              const chartFilename = `ESABCC_${(c.variable || '').replace(/\|/g, '_').slice(0, 40)}_${c.chartType || 'line'}`;
              return (
                <div key={i} ref={el => { chartRefs.current[i] = el; }} className={`bg-white rounded-lg shadow-sm border border-grey-200 p-3 sm:p-4 ${
                  c.chartType === 'map' ? 'md:col-span-2' : ''
                }`}>
                  {(!c.chartType || c.chartType === 'line') && (
                    <ScenarioChart series={c.series} unit={c.unit} variable={c.variable} region={chartRegion} compact={isCompact} policyGapMode={policyGapMode} historical={c.historical} />
                  )}
                  {c.chartType === 'fan' && (
                    <FanChart series={c.series} unit={c.unit} variable={c.variable} region={chartRegion} compact={isCompact} />
                  )}
                  {c.chartType === 'bar' && barGroups.length > 0 && (
                    <BarChartComponent groups={barGroups} unit={c.unit} title={c.variable} compact={isCompact} />
                  )}
                  {c.chartType === 'box' && boxData.length > 0 && (
                    <BoxPlot boxes={boxData} unit={c.unit} title={c.variable} compact={isCompact} />
                  )}
                  {c.chartType === 'map' && mapData.length > 0 && (
                    <WorldMap data={mapData} unit={c.unit} title={c.variable} compact={isCompact} />
                  )}
                  <div className="mt-2 flex items-center justify-between text-[10px] text-tertiary">
                    <span>
                      {c.chartType === 'fan' ? 'Quantile distribution' :
                       c.chartType === 'bar' ? 'Cross-variable comparison' :
                       c.chartType === 'box' ? 'Scenario spread' :
                       c.chartType === 'map' ? 'Regional map' :
                       `${c.series.length} series`}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {c.unit && <span className="bg-grey-100 px-1.5 py-0.5 rounded">{c.unit}</span>}
                      <button onClick={() => exportChartAsCsv(c, chartFilename, chartProvenance(c))}
                        className="px-1.5 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark" title="Download CSV">CSV</button>
                      <button onClick={() => { const el = chartRefs.current[i]; if (el) exportChartAsPng(el, chartFilename, chartProvenance(c)); }}
                        className="px-1.5 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark">PNG</button>
                      <button onClick={() => { const el = chartRefs.current[i]; if (el) exportChartAsSvg(el, chartFilename, chartProvenance(c)); }}
                        className="px-1.5 py-0.5 rounded bg-grey-100 hover:bg-grey-200 transition text-tertiary-dark">SVG</button>
                    </div>
                  </div>
                  {/* Relevance badge — explains why the chart is shown */}
                  {rel && rel.reasons.length > 0 && (
                    <div className="mt-1.5 flex items-start gap-1.5 text-[10px] text-tertiary border-t border-grey-100 pt-1.5">
                      <span className={`inline-block w-1.5 h-1.5 rounded-full mt-1 ${
                        rel.score >= 75 ? 'bg-green-500' : rel.score >= 55 ? 'bg-blue-400' : 'bg-grey-300'
                      }`} />
                      <span title={`Relevance score: ${rel.score}/100`}>
                        <strong className="text-tertiary-dark">Why this chart:</strong> {rel.reasons.join(' · ')}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
            </div>
          </div>
        );
      })()}

      {/* Skeleton chart while loading with nothing yet on screen. Reserves
          the same vertical real-estate as the real chart row so layout
          doesn't jump when data lands (zero CLS). Brief item M·02 #5. */}
      {charts.length === 0 && loading && (
        <div className="bg-[var(--mh-card)] rounded-lg shadow-sm border border-[var(--mh-border)] p-4 sm:p-5" aria-busy="true">
          <div className="flex items-baseline justify-between mb-3">
            <Skeleton.Heading width={220} />
            <Skeleton.Block width={88} height={20} rounded="pill" />
          </div>
          <Skeleton.Block height={320} rounded="md" />
          <div className="flex gap-2 mt-3">
            <Skeleton.Block width={64} height={16} rounded="pill" />
            <Skeleton.Block width={84} height={16} rounded="pill" />
            <Skeleton.Block width={72} height={16} rounded="pill" />
          </div>
        </div>
      )}

      {/* Empty state — uses the design-system EmptyState so the page has
          the same shape as M·01's empty library. */}
      {charts.length === 0 && !loading && !error && (
        <EmptyState
          title="Pick a region, then load data"
          body="Choose a dashboard preset or a single variable above, then click Load Data. Defaults load automatically when a region is selected."
          illustration={
            <svg aria-hidden="true" width="48" height="48" fill="none" stroke="var(--mh-muted)" strokeWidth="1.5" viewBox="0 0 24 24">
              <path d="M3 3v18h18" /><path d="M7 16l4-8 4 5 5-9" />
            </svg>
          }
        />
      )}
      </>)}
      </div>
    </div>
  );
}

// ── Collapsible filter panel ───────────────────────────────────────────────

function FilterPanel({ title, badge, children }: { title: string; badge: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded shadow-sm border border-grey-200">
      <div className="flex items-center justify-between px-3 py-2 border-b border-grey-100">
        <span className="text-xs font-bold text-tertiary-dark">{title}</span>
        <span className="text-[10px] text-tertiary bg-grey-100 px-1.5 py-0.5 rounded">{badge}</span>
      </div>
      <div className="px-3 py-2">{children}</div>
    </div>
  );
}
