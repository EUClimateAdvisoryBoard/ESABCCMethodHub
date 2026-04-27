'use client';
import { useState, useRef, useEffect } from 'react';
import CommentSection from '@/components/CommentSection';
import ClimadaExplorer from '@/components/ClimadaExplorer';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import Chart from 'chart.js/auto';

// ── ESABCC 6 Guiding Principles for Effective EU Adaptation ─────────────
// Source: European Scientific Advisory Board on Climate Change (ESABCC),
// "Strengthening Resilience to Climate Change: Recommendations for an
// Effective EU Adaptation Policy Framework" (February 2026).
const PRINCIPLES = [
  { num: 1, title: 'Lead with a vision', desc: 'Set a clear long-term vision for a climate-resilient EU by 2050 and beyond, backed by sectoral strategies and measurable adaptation targets that guide policy and investment decisions.', icon: '🎯' },
  { num: 2, title: 'Anticipate and act', desc: 'Move from reactive to anticipatory adaptation by mandating and harmonising climate risk assessments across EU policies, using common scenarios and preparing for 2.8–3.3 °C warming with stress-testing against more adverse pathways.', icon: '🔭' },
  { num: 3, title: 'Integrate policies', desc: 'Embed climate-resilience-by-design across all EU policies, programmes and investment decisions, breaking silos between mitigation, adaptation, disaster risk management, and sectoral policy.', icon: '🧩' },
  { num: 4, title: 'Promote just and fair resilience', desc: 'Ensure adaptation is equitable and just — protecting the most vulnerable populations and regions, and ensuring a fair distribution of costs, benefits and responsibilities across Europe.', icon: '⚖' },
  { num: 5, title: 'Strengthen private adaptation', desc: 'Mobilise and align private finance, firms and households with climate resilience objectives through incentives, risk disclosure, insurance mechanisms and risk-sharing instruments.', icon: '💶' },
  { num: 6, title: 'Learn and improve', desc: 'Establish and continuously update a robust monitoring, evaluation and learning (MEL) system to track adaptation progress, share lessons, and enable iterative policy improvement.', icon: '📊' },
];

// ── Warming scenarios ───────────────────────────────────────────────────
const WARMING_SCENARIOS = [
  { id: 'ssp1-1.9', label: 'SSP1-1.9', warming: '+1.4°C', color: '#007B6C' },
  { id: 'ssp1-2.6', label: 'SSP1-2.6', warming: '+1.8°C', color: '#0065A4' },
  { id: 'ssp2-4.5', label: 'SSP2-4.5 (Intermediate)', warming: '+2.7°C', color: '#004B7F' },
  { id: 'ssp3-7.0', label: 'SSP3-7.0', warming: '+3.6°C', color: '#FF9933' },
  { id: 'ssp5-8.5', label: 'SSP5-8.5', warming: '+4.4°C', color: '#B83230' },
];

// ── Regional warming anomalies (°C relative to 1850-1900 baseline) ──────
const REGIONAL_WARMING: Record<string, Record<string, number>> = {
  'ssp1-1.9': { 'Mediterranean': 1.8, 'Central Europe': 1.7, 'Northern Europe': 2.2, 'Alpine': 2.0, 'Atlantic': 1.4, 'Arctic': 2.8 },
  'ssp1-2.6': { 'Mediterranean': 2.2, 'Central Europe': 2.1, 'Northern Europe': 2.8, 'Alpine': 2.5, 'Atlantic': 1.7, 'Arctic': 3.5 },
  'ssp2-4.5': { 'Mediterranean': 3.4, 'Central Europe': 3.1, 'Northern Europe': 4.0, 'Alpine': 3.6, 'Atlantic': 2.5, 'Arctic': 5.2 },
  'ssp3-7.0': { 'Mediterranean': 4.5, 'Central Europe': 4.2, 'Northern Europe': 5.4, 'Alpine': 4.8, 'Atlantic': 3.4, 'Arctic': 7.0 },
  'ssp5-8.5': { 'Mediterranean': 5.8, 'Central Europe': 5.3, 'Northern Europe': 6.8, 'Alpine': 6.0, 'Atlantic': 4.3, 'Arctic': 9.2 },
};

// ── Impact chains by warming level ──────────────────────────────────────
const IMPACT_CHAINS = [
  { level: '+1.5°C', color: '#007B6C', impacts: [
    { sector: 'Health', detail: 'Moderate increase in heat-related mortality (+15-25% in Southern Europe). Extended pollen seasons. Minor increase in vector-borne disease range.' },
    { sector: 'Agriculture', detail: 'Crop yield changes: slight gains in Northern Europe (+5%), slight losses in Mediterranean (-5-10%). Water stress begins in Southern regions.' },
    { sector: 'Infrastructure', detail: 'Marginal increase in flood damage (+5-10%). Permafrost thaw affects Arctic infrastructure. Sea level rise: 0.3-0.6m by 2100.' },
    { sector: 'Ecosystems', detail: '~10% of species at risk of local extinction. Coral bleaching events more frequent. Alpine ecosystems shifting upward.' },
  ]},
  { level: '+2.0°C', color: '#004B7F', impacts: [
    { sector: 'Health', detail: 'Severe heat waves become 2x more frequent. Heat mortality doubles in Southern Europe. Dengue risk expands to Southern France, Northern Italy.' },
    { sector: 'Agriculture', detail: 'Mediterranean crop yields decline 10-25%. Irrigation water demand increases 15-20%. Wine regions shift northward ~200km.' },
    { sector: 'Infrastructure', detail: 'Flood damages increase 50-100%. Transport disruption from extreme events. Cooling demand increases 25-40%.' },
    { sector: 'Ecosystems', detail: '~20% species at extinction risk. Mediterranean forests face dieback. Marine heatwaves cause fishery disruption.' },
  ]},
  { level: '+3.0°C', color: '#FF9933', impacts: [
    { sector: 'Health', detail: 'Extreme heat mortality increases 3-5x in Southern Europe. Outdoor work impossible for 20-30% of summer days. Mental health crisis from repeat disasters.' },
    { sector: 'Agriculture', detail: 'Major food system disruption. Mediterranean becomes semi-arid. Crop yields down 20-40% in Southern Europe. Northern Europe gains not sufficient to compensate.' },
    { sector: 'Infrastructure', detail: 'Annual flood damages exceed €45 billion. Coastal infrastructure at risk from 0.5-1.0m sea level rise. Energy system faces compound stress.' },
    { sector: 'Ecosystems', detail: '~40% species at risk. Mediterranean ecosystems collapse. Alpine glaciers largely disappear. Major biodiversity loss across Europe.' },
  ]},
  { level: '+4.0°C', color: '#B83230', impacts: [
    { sector: 'Health', detail: 'Catastrophic heat events. Southern Europe largely uninhabitable in summer. Mass climate-driven migration within Europe. Pandemic risk increases.' },
    { sector: 'Agriculture', detail: 'Food system failure in Mediterranean. Global food price shocks. Desertification of Southern Iberia, Sicily, Greece. Water conflicts intensify.' },
    { sector: 'Infrastructure', detail: 'Annual damages >€100 billion. Major coastal cities at risk (Venice, Amsterdam, Hamburg). Infrastructure designed for historical climate fails systematically.' },
    { sector: 'Ecosystems', detail: 'Mass extinction event. >50% of European species at risk. Marine ecosystem collapse. Irreversible tipping points crossed.' },
  ]},
];

// ── Risk hotspot categories ─────────────────────────────────────────────
const RISK_LAYERS = [
  { id: 'heat', label: 'Urban Heat Islands', color: '#B83230', cities: ['Madrid (+4.2°C UHI)', 'Athens (+3.8°C)', 'Rome (+3.5°C)', 'Paris (+3.2°C)', 'Berlin (+2.8°C)', 'Vienna (+2.6°C)'] },
  { id: 'flood', label: 'Flood Risk Zones', color: '#004B7F', areas: ['Rhine basin', 'Danube basin', 'Po valley', 'Seine basin', 'North Sea coast', 'Baltic coast'] },
  { id: 'drought', label: 'Drought Risk', color: '#FF9933', areas: ['Iberian Peninsula', 'Southern France', 'Southern Italy', 'Greece', 'Central Plains', 'Balkans'] },
  { id: 'sealevel', label: 'Sea Level Rise', color: '#0065A4', areas: ['Netherlands — Lowest land elevation −6.7 m (Zuidplaspolder; elevation, not projected SLR)', 'Northern Germany', 'Venice lagoon', 'Danish coast', 'Belgian coast', 'Thames estuary'] },
  { id: 'wildfire', label: 'Wildfire Risk', color: '#D97706', areas: ['Portugal', 'Spain', 'Southern France', 'Greece', 'Sardinia/Corsica', 'Croatia coast'] },
];

// ── Sector tabs ─────────────────────────────────────────────────────────
const SECTOR_TABS = ['Health', 'Agriculture', 'Infrastructure', 'Ecosystems', 'Urban'];

const SECTOR_DATA: Record<string, { metrics: { label: string; value: string; sub: string }[]; text: string }> = {
  Health: {
    metrics: [
      { label: 'Heat mortality (1.5°C)', value: '~2,750/yr baseline → ~30,000/yr at +1.5°C', sub: 'PESETA IV, JRC' },
      { label: 'Dengue suitability', value: '+46%', sub: 'Climate suitability increase 1951-2023 (Lancet Countdown)' },
      { label: 'Air quality deaths', value: '+15%', sub: 'Ozone-related mortality under warming' },
    ],
    text: 'The JRC PESETA IV study projects heat-related mortality in the EU to increase to ~96,000 deaths/year under +3°C warming (from ~2,750 baseline, rising to ~30,000/yr at +1.5°C). Southern European countries face the highest risk. Adaptation measures (early warning systems, urban cooling, green infrastructure) can reduce impacts by 60-80%. Sources: EEA Climate and Health, Lancet Countdown Europe 2024.'
  },
  Agriculture: {
    metrics: [
      { label: 'Crop yield change', value: '-15 to -25%', sub: 'Mediterranean under SSP2-4.5 by 2050' },
      { label: 'Water stress', value: '+40%', sub: 'Irrigation demand increase Southern EU' },
      { label: 'Soil degradation', value: '25% of EU', sub: 'Land at risk of desertification' },
    ],
    text: 'European agriculture faces asymmetric impacts: Northern regions may see modest gains (+5-10% yields for some crops), while Southern/Mediterranean regions face severe losses. The CAP needs climate-proofing. Drought frequency in the Mediterranean doubles under +2°C. Sources: JRC PESETA IV, EEA Agriculture & Climate 2024, Copernicus C3S.'
  },
  Infrastructure: {
    metrics: [
      { label: 'Annual flood damage', value: '€12 bn', sub: 'PESETA IV near-term 2050 projection (from €8 bn)' },
      { label: 'Transport disruption', value: '+40 days/yr', sub: 'Rail/road closures from extreme events' },
      { label: 'Energy system stress', value: '15-25%', sub: 'Peak cooling demand increase' },
    ],
    text: 'Infrastructure not designed for future climate conditions. The EU Climate Mission aims to support 150 regions in adaptation. Key priorities: flood defenses, heat-resilient transport, climate-proof energy systems. Estimated adaptation investment need: €40-80 billion/year. Sources: EEA, JRC PESETA IV, European Commission.'
  },
  Ecosystems: {
    metrics: [
      { label: 'Species at risk', value: '20-40%', sub: 'European species under +2-3°C warming' },
      { label: 'Forest dieback', value: '30% area', sub: 'Mediterranean forests at risk' },
      { label: 'Marine heatwaves', value: '3-5x', sub: 'Frequency increase by 2050' },
    ],
    text: 'Climate change is the fastest-growing threat to European biodiversity, compounding habitat loss and pollution. The EU Biodiversity Strategy aims to protect 30% of land and sea. Nature-based solutions provide co-benefits for adaptation. Alpine ecosystems are among the most vulnerable globally. Sources: EEA Biodiversity Report, IPBES Europe Assessment.'
  },
  Urban: {
    metrics: [
      { label: 'Urban heat island', value: '+2-5°C', sub: 'Above rural areas in major EU cities' },
      { label: 'Soil sealing', value: '~2.7%', sub: 'Of EU land area is sealed (impervious)' },
      { label: 'Urban flooding', value: '+60%', sub: 'Increase in pluvial flood events' },
    ],
    text: 'Cities are hotspots of climate vulnerability due to soil sealing (Versiegelung), urban heat island effects, and concentrated populations. The EU Mission on Adaptation targets 150 regions and communities. Key measures: green roofs, urban forests, permeable surfaces, blue-green infrastructure. Satellite data (Copernicus Urban Atlas) shows sealing rates increasing. Sources: EEA Urban Adaptation, Copernicus Land Monitoring Service.'
  },
};

function useChart(ref: React.RefObject<HTMLCanvasElement | null>, config: () => object, deps: unknown[]) {
  const chart = useRef<Chart | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    chart.current?.destroy();
    chart.current = new Chart(ref.current, config() as any);
    return () => { chart.current?.destroy(); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export default function ClimateAdaptationPage() {
  const [selectedScenario, setSelectedScenario] = useState('ssp2-4.5');
  const [expandedImpact, setExpandedImpact] = useState<number | null>(0);
  const [activeRisk, setActiveRisk] = useState('heat');
  const [sectorTab, setSectorTab] = useState('Health');

  const warmingRef = useRef<HTMLCanvasElement>(null);
  const impactRef = useRef<HTMLCanvasElement>(null);

  const scenarioData = REGIONAL_WARMING[selectedScenario];

  useChart(warmingRef, () => ({
    type: 'bar',
    data: {
      labels: Object.keys(scenarioData),
      datasets: [{
        label: `Regional warming under ${WARMING_SCENARIOS.find(s => s.id === selectedScenario)?.label}`,
        data: Object.values(scenarioData),
        backgroundColor: Object.values(scenarioData).map(v =>
          v < 2 ? '#007B6C' : v < 3 ? '#004B7F' : v < 4 ? '#FF9933' : v < 5 ? '#B83230' : '#8B0000'
        ),
      }],
    },
    options: {
      responsive: true, indexAxis: 'y' as const,
      plugins: { title: { display: true, text: `Regional Warming Anomalies in Europe (°C by 2100)`, font: { size: 13 } }, legend: { display: false } },
      scales: { x: { title: { display: true, text: '°C warming' }, min: 0 } },
    },
  }), [selectedScenario, scenarioData]);

  useChart(impactRef, () => ({
    type: 'bar',
    data: {
      labels: WARMING_SCENARIOS.map(s => s.label),
      datasets: [
        { label: 'GDP loss (%)', data: [0.3, 0.6, 1.2, 1.9, 2.5], backgroundColor: WARMING_SCENARIOS.map(s => s.color) },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'EU GDP Loss from Climate Damages by Scenario', font: { size: 13 } }, legend: { display: false } },
      scales: { y: { title: { display: true, text: '% GDP loss' } } },
    },
  }), []);

  const currentSector = SECTOR_DATA[sectorTab];
  const activeRiskData = RISK_LAYERS.find(r => r.id === activeRisk);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Climate Adaptation"
        subtitle="Warming scenarios, impact chains and climate risk hotspots across Europe."
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── 6 Principles ─────────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">ESABCC 6 Guiding Principles for EU Climate Adaptation</h2>
          <p className="text-xs text-tertiary mb-4">
            From <em>Strengthening Resilience to Climate Change — Recommendations for an Effective EU Adaptation
            Policy Framework</em>, European Scientific Advisory Board on Climate Change (ESABCC), February 2026.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PRINCIPLES.map(p => (
              <div key={p.num} className="bg-white rounded-lg border border-grey-200 p-4 hover:shadow-md transition">
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{p.icon}</span>
                  <div>
                    <span className="text-[10px] font-bold text-secondary">PRINCIPLE {p.num}</span>
                    <h3 className="text-sm font-bold text-tertiary-dark">{p.title}</h3>
                  </div>
                </div>
                <p className="text-xs text-tertiary leading-relaxed">{p.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* ── Warming Scenarios ────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">Warming Scenario Explorer</h2>
          <p className="text-sm text-tertiary mb-4">Regional warming projections for Europe under different SSP scenarios. Data: IPCC AR6, Copernicus C3S, IIASA.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {WARMING_SCENARIOS.map(s => (
              <button key={s.id} onClick={() => setSelectedScenario(s.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                  selectedScenario === s.id ? 'text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                }`} style={selectedScenario === s.id ? { backgroundColor: s.color } : {}}>
                {s.label} ({s.warming})
              </button>
            ))}
          </div>
          <div className="bg-white rounded-lg border border-grey-200 p-4">
            <canvas ref={warmingRef} />
          </div>
          <p className="text-[10px] text-grey-400 mt-2">Source: IPCC AR6 WGI, Copernicus C3S regional projections. Values represent regional mean temperature change relative to 1850-1900 baseline.</p>
        </section>

        {/* ── Impact Chains ───────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">Impact Chains by Warming Level</h2>
          <p className="text-sm text-tertiary mb-1">
            Cascading climate impacts across European sectors at different global warming levels, drawing on the
            <strong> EEA European Climate Risk Assessment (EUCRA, 2024)</strong>, which identifies 36 major climate
            risks for Europe and assesses cross-sectoral cascades, complemented by IPCC AR6 WGII Chapter 13 and JRC PESETA IV.
          </p>
          <p className="text-xs text-tertiary mb-4">
            EUCRA is the first comprehensive pan-European climate risk assessment and is used here as the primary
            source for impact-chain characterisation across warming levels.
          </p>
          <div className="space-y-3">
            {IMPACT_CHAINS.map((chain, ci) => (
              <div key={ci} className="bg-white rounded-lg border border-grey-200 overflow-hidden">
                <button onClick={() => setExpandedImpact(expandedImpact === ci ? null : ci)}
                  className="w-full flex items-center justify-between p-4 hover:bg-grey-50 transition">
                  <div className="flex items-center gap-3">
                    <span className="text-xl font-bold" style={{ color: chain.color }}>{chain.level}</span>
                    <span className="text-sm text-tertiary-dark font-medium">Global Warming</span>
                  </div>
                  <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"
                    className={`transition-transform ${expandedImpact === ci ? 'rotate-180' : ''}`}>
                    <path d="M6 9l6 6 6-6"/>
                  </svg>
                </button>
                {expandedImpact === ci && (
                  <div className="px-4 pb-4 border-t border-grey-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                      {chain.impacts.map(imp => (
                        <div key={imp.sector} className="border border-grey-200 rounded p-3">
                          <h4 className="text-xs font-bold text-tertiary-dark mb-1" style={{ color: chain.color }}>{imp.sector}</h4>
                          <p className="text-xs text-tertiary leading-relaxed">{imp.detail}</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-grey-400 mt-2">Sources: EEA EUCRA 2024 (primary), IPCC AR6 WGII Chapter 13, JRC PESETA IV</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* ── CLIMADA Climate Risk Explorer ───────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-1">CLIMADA Global Climate Risk Explorer</h2>
          <p className="text-sm text-tertiary mb-1">
            Interactive climate hazard &amp; exposure data powered by{' '}
            <a
              href="https://github.com/CLIMADA-project/climada_python"
              target="_blank" rel="noopener noreferrer"
              className="text-secondary hover:underline font-medium"
            >
              CLIMADA
            </a>
            {' '}— ETH Zurich's open-source framework for climate risk assessment. Select a hazard and
            scenario to see expected annual impact anywhere in the world, click any country on the map
            to load its live CLIMADA datasets.
          </p>
          <p className="text-xs text-tertiary mb-4">
            CLIMADA provides global coverage of tropical cyclones, river floods, European winter storms,
            wildfires and droughts at the headline 150 arcsec (≈4.6 km) grid, combined with the LitPop
            asset-exposure model (nightlights × population × economic indicators). More than 200 countries
            are covered through a public REST API under CC BY 4.0.
          </p>
          <ClimadaExplorer />
        </section>

        {/* ── Climate Risk Hotspots ───────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">Climate Risk Hotspots in Europe</h2>
          <p className="text-sm text-tertiary mb-4">Toggle risk layers to identify high-risk areas. Data: Copernicus Land Monitoring, EEA, JRC.</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {RISK_LAYERS.map(r => (
              <button key={r.id} onClick={() => setActiveRisk(r.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                  activeRisk === r.id ? 'text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                }`} style={activeRisk === r.id ? { backgroundColor: r.color } : {}}>
                {r.label}
              </button>
            ))}
          </div>
          {activeRiskData && (
            <div className="bg-white rounded-lg border border-grey-200 p-5">
              <h3 className="text-sm font-bold mb-3" style={{ color: activeRiskData.color }}>{activeRiskData.label}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(('cities' in activeRiskData && activeRiskData.cities) ? activeRiskData.cities : ('areas' in activeRiskData ? activeRiskData.areas : [])).map((item: string) => (
                  <div key={item} className="flex items-center gap-2 text-xs text-tertiary-dark border border-grey-100 rounded px-3 py-2">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: activeRiskData.color }} />
                    {item}
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-grey-400 mt-3">Sources: Copernicus Urban Atlas, EEA Climate Risk Assessment, JRC PESETA IV</p>
            </div>
          )}
        </section>

        {/* ── Sector Impacts ──────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-4">Sector-Specific Climate Impacts</h2>
          <div className="flex flex-wrap gap-2 mb-4">
            {SECTOR_TABS.map(t => (
              <button key={t} onClick={() => setSectorTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded transition ${
                  sectorTab === t ? 'bg-secondary text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                }`}>
                {t}
              </button>
            ))}
          </div>
          {currentSector && (
            <div className="bg-white rounded-lg border border-grey-200 p-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                {currentSector.metrics.map(m => (
                  <div key={m.label} className="border border-grey-200 rounded p-3">
                    <p className="text-xl font-bold text-primary">{m.value}</p>
                    <p className="text-xs font-semibold text-tertiary-dark">{m.label}</p>
                    <p className="text-[10px] text-tertiary">{m.sub}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-tertiary leading-relaxed">{currentSector.text}</p>
            </div>
          )}
        </section>

        {/* ── Economic Impact Chart ───────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">Economic Impact of Climate Change in Europe</h2>
          <div className="bg-white rounded-lg border border-grey-200 p-4">
            <canvas ref={impactRef} />
          </div>
          <p className="text-[10px] text-grey-400 mt-2">
            Sources: JRC PESETA IV (likely under-estimates damages — excludes tipping points, non-market impacts,
            and several compound hazards), Swiss Re Institute, NGFS. GDP losses are cumulative projections
            accounting for physical risk damages.
          </p>
          <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs text-tertiary-dark">
              <strong className="text-amber-800">Recommended reading:</strong>{' '}
              <a
                href="https://www.accreu.eu/wp-content/uploads/2025/12/ACCREU-Policy-Brief-2-Economics-of-Climate-Change-and-Adaptation-in-Europe.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline font-medium"
              >
                ACCREU Policy Brief 2 — The Economics of Climate Change and Adaptation in Europe (2025)
              </a>
              . The ACCREU project argues that standard assessments such as PESETA IV systematically under-estimate
              climate damages in Europe and presents an updated economic framing for adaptation investment.
            </p>
          </div>
        </section>

        {/* ── Data Sources ────────────────────────────────────────── */}
        <section className="bg-surface-teal rounded-lg p-5">
          <h2 className="text-sm font-bold text-tertiary-dark mb-3">Data Sources & Methodology</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-tertiary">
            {[
              { name: 'CLIMADA (ETH Zurich)', desc: 'Open-source (GPL-3.0) Python framework for global climate risk assessment with a public REST data API (CC BY 4.0)' },
              { name: 'EEA EUCRA (2024)', desc: 'First European Climate Risk Assessment — 36 major climate risks for Europe, used as primary source for impact chains' },
              { name: 'ESABCC (2026)', desc: 'Strengthening Resilience to Climate Change — Recommendations for an effective EU adaptation policy framework (6 guiding principles)' },
              { name: 'ACCREU Policy Brief (2025)', desc: 'The Economics of Climate Change and Adaptation in Europe — updated damage estimates correcting PESETA IV under-estimates' },
              { name: 'Copernicus C3S', desc: 'Climate projections, reanalysis data, satellite monitoring' },
              { name: 'IIASA', desc: 'SSP scenarios and integrated assessment model outputs' },
              { name: 'JRC PESETA IV', desc: 'EU-specific climate impact projections across sectors (likely under-estimates damages)' },
              { name: 'IPCC AR6 WGII', desc: 'Chapter 13 (Europe) and Cross-Chapter Papers' },
            ].map(s => (
              <div key={s.name} className="flex gap-2">
                <span className="font-semibold text-tertiary-dark shrink-0">{s.name}:</span>
                <span>{s.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comment Section ─────────────────────────────────────── */}
        <section className="bg-white rounded-lg border border-grey-200 p-5">
          <CommentSection policyId="climate-adaptation" />
        </section>
      </div>
    </div>
  );
}
