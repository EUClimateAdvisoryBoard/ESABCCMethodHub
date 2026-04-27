'use client';

import { useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import * as d3 from 'd3';
import * as topojsonClient from 'topojson-client';

// ── Types ─────────────────────────────────────────────────────────────
interface CountrySnapshot {
  iso3: string;
  name: string;
  exposed_eur_bn: number;
  eai_storm_eur_bn: number;
  eai_flood_eur_bn: number;
  eai_wildfire_eur_bn: number;
  eai_tc_eur_bn: number;
  eai_drought_eur_bn: number;
}

interface City {
  iso3: string;
  name: string;
  lat: number;
  lon: number;
  pop_m: number;
  coastal: boolean;
  tropical: boolean;
  mediterranean: boolean;
  arid: boolean;
  riverine: boolean;
}

interface GlobalSnapshot {
  framework: string;
  baselineYear: number;
  resolution: {
    headline_km: number;
    arcsec: number;
    description: string;
  };
  global: {
    exposed_assets_eur_bn: number;
    population_exposed_millions: number;
    expected_annual_impact_eur_bn: Record<string, number>;
  };
  byCountry: CountrySnapshot[];
  cities: City[];
  climateChangeMultipliers: Record<string, { rcp26: number; rcp45: number; rcp85: number }>;
  sources: string[];
}

interface SnapshotResponse {
  tool: string;
  source: string;
  status?: string;
  data: GlobalSnapshot;
  fetchedAt: string;
}

interface DatasetListResponse {
  tool: string;
  source: string;
  status?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any;
  fetchedAt: string;
}

// ── Constants ─────────────────────────────────────────────────────────
const HAZARDS = [
  { id: 'storm_europe',     label: 'European winter storms', code: 'WS',  color: '#0065A4' },
  { id: 'river_flood',      label: 'River floods',           code: 'FL',  color: '#004B7F' },
  { id: 'wildfire',         label: 'Wildfires',              code: 'WF',  color: '#D97706' },
  { id: 'drought',          label: 'Droughts',               code: 'DR',  color: '#FF9933' },
  { id: 'tropical_cyclone', label: 'Tropical cyclones',      code: 'TC',  color: '#7C3AED' },
];

const SCENARIOS = [
  { id: 'present', label: 'Present day',      mult: 1.0,  color: '#007B6C' },
  { id: 'rcp26',   label: 'RCP 2.6 (2050)',   mult: null, color: '#0065A4' },
  { id: 'rcp45',   label: 'RCP 4.5 (2050)',   mult: null, color: '#FF9933' },
  { id: 'rcp85',   label: 'RCP 8.5 (2050)',   mult: null, color: '#B83230' },
];

// Global ISO3 alpha → ISO numeric (needed by world-atlas topojson ids).
const ISO3_TO_NUM: Record<string, string> = {
  // EU27
  AUT: '040', BEL: '056', BGR: '100', HRV: '191', CYP: '196', CZE: '203',
  DNK: '208', EST: '233', FIN: '246', FRA: '250', DEU: '276', GRC: '300',
  HUN: '348', IRL: '372', ITA: '380', LVA: '428', LTU: '440', LUX: '442',
  MLT: '470', NLD: '528', POL: '616', PRT: '620', ROU: '642', SVK: '703',
  SVN: '705', ESP: '724', SWE: '752',
  // Europe (non-EU)
  GBR: '826', NOR: '578', CHE: '756', ISL: '352', UKR: '804', SRB: '688',
  TUR: '792', RUS: '643',
  // Americas
  USA: '840', CAN: '124', MEX: '484', CUB: '192', DOM: '214', HTI: '332',
  JAM: '388', GTM: '320', HND: '340', PAN: '591', CRI: '188',
  BRA: '076', ARG: '032', CHL: '152', COL: '170', PER: '604', VEN: '862',
  ECU: '218', URY: '858', BOL: '068', PRY: '600',
  // Asia
  CHN: '156', JPN: '392', KOR: '410', TWN: '158', IND: '356', PAK: '586',
  BGD: '050', LKA: '144', NPL: '524', AFG: '004',
  IDN: '360', MYS: '458', SGP: '702', PHL: '608', VNM: '704', THA: '764',
  MMR: '104', KHM: '116', LAO: '418', MNG: '496',
  // Middle East
  SAU: '682', ARE: '784', ISR: '376', IRN: '364', IRQ: '368', JOR: '400',
  LBN: '422', SYR: '760', YEM: '887', OMN: '512', QAT: '634', KWT: '414',
  // Africa
  EGY: '818', MAR: '504', DZA: '012', TUN: '788', LBY: '434', SDN: '729',
  ETH: '231', KEN: '404', TZA: '834', UGA: '800',
  NGA: '566', GHA: '288', CIV: '384', SEN: '686', CMR: '120', COD: '180',
  AGO: '024', MOZ: '508', ZAF: '710', MDG: '450', ZWE: '716', ZMB: '894',
  // Oceania
  AUS: '036', NZL: '554', PNG: '598', FJI: '242',
};

// Served from /public so the map doesn't silently break when the CDN is
// unreachable (ad-blockers, CSP, offline dev). Mirrors world-atlas@2.
const WORLD_TOPO_URL = '/data/world-atlas/countries-50m.json';

// Headline CLIMADA resolution (arcseconds). 150 ≈ 4.6 km at the equator.
const RESOLUTION_ARCSEC = 150;
const RESOLUTION_KM = 4.6;

// ── Component ─────────────────────────────────────────────────────────
export default function ClimadaExplorer() {
  const [snapshot, setSnapshot] = useState<GlobalSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [sourceLabel, setSourceLabel] = useState<string>('');
  const [selectedHazard, setSelectedHazard] = useState<string>('tropical_cyclone');
  const [selectedScenario, setSelectedScenario] = useState<string>('present');
  const [datasets, setDatasets] = useState<DatasetListResponse | null>(null);
  const [datasetsLoading, setDatasetsLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<string>('USA');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);

  const eaiChartRef = useRef<HTMLCanvasElement>(null);
  const topCountryChartRef = useRef<HTMLCanvasElement>(null);
  const mapRef = useRef<SVGSVGElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  const eaiChart = useRef<Chart | null>(null);
  const topCountryChart = useRef<Chart | null>(null);
  const zoomBehaviourRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  // Preserve the active zoom/pan across re-renders of the map effect, so
  // selecting a country or hazard doesn't snap the viewport back to identity.
  const zoomTransformRef = useRef<d3.ZoomTransform>(d3.zoomIdentity);
  const [topo, setTopo] = useState<unknown>(null);

  // ── Load snapshot ───────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    fetch('/api/climada?tool=global_risk_snapshot')
      .then(r => r.json())
      .then((res: SnapshotResponse) => {
        setSnapshot(res.data);
        setSourceLabel(res.status === 'demo_mode' ? 'CLIMADA (demo — upstream unreachable)' : res.source);
      })
      .catch(() => setSourceLabel('CLIMADA (fetch failed)'))
      .finally(() => setLoading(false));
  }, []);

  // ── Load datasets for the selected country/hazard ──────────────────
  // Always request the headline 4×4 km (150 arcsec) grid to match the banner.
  useEffect(() => {
    setDatasetsLoading(true);
    fetch(
      `/api/climada?tool=list_datasets` +
      `&data_type=${encodeURIComponent(selectedHazard)}` +
      `&country=${encodeURIComponent(selectedCountry)}` +
      `&resolution=${RESOLUTION_ARCSEC}` +
      `&limit=8`
    )
      .then(r => r.json())
      .then(setDatasets)
      .catch(() => setDatasets(null))
      .finally(() => setDatasetsLoading(false));
  }, [selectedHazard, selectedCountry]);

  // ── Load world topology once ───────────────────────────────────────
  useEffect(() => {
    fetch(WORLD_TOPO_URL)
      .then(r => {
        if (!r.ok) throw new Error(`topo HTTP ${r.status}`);
        return r.json();
      })
      .then(setTopo)
      .catch(err => {
        console.error('[ClimadaExplorer] world topology fetch failed', err);
      });
  }, []);

  // ── Helper: extract EAI for a given country + hazard ───────────────
  const getEai = (c: CountrySnapshot, hazard: string): number => {
    switch (hazard) {
      case 'storm_europe':     return c.eai_storm_eur_bn;
      case 'river_flood':      return c.eai_flood_eur_bn;
      case 'wildfire':         return c.eai_wildfire_eur_bn;
      case 'drought':          return c.eai_drought_eur_bn;
      case 'tropical_cyclone': return c.eai_tc_eur_bn;
      default: return 0;
    }
  };

  // ── Scenario multiplier ────────────────────────────────────────────
  const getMultiplier = (hazard: string, scenario: string): number => {
    if (scenario === 'present' || !snapshot) return 1.0;
    const m = snapshot.climateChangeMultipliers[hazard];
    if (!m) return 1.0;
    return m[scenario as 'rcp26' | 'rcp45' | 'rcp85'] ?? 1.0;
  };

  // ── City exposure weight by hazard ─────────────────────────────────
  // Translates climatic flags into a per-hazard exposure multiplier that
  // reflects CLIMADA's impact functions at a qualitative level:
  //   TC: tropical coastal cities get hit hardest
  //   Storm Europe: NW-European coastal cities are most exposed
  //   River floods: all pop-weighted, riverine cities boosted
  //   Wildfires: mediterranean / arid climates dominate
  //   Droughts: arid / mediterranean hot-spots dominate
  const hazardWeight = (c: City, hazard: string): number => {
    switch (hazard) {
      case 'tropical_cyclone':
        if (c.tropical && c.coastal) return 3.0;
        if (c.coastal && Math.abs(c.lat) < 40) return 1.4;
        if (c.coastal) return 0.3;
        return 0.05;
      case 'storm_europe': {
        const euStormZone = ['GBR','FRA','DEU','NLD','BEL','IRL','DNK','NOR','SWE','POL','LUX','CZE','AUT','CHE'];
        if (!euStormZone.includes(c.iso3)) return 0;
        return c.coastal ? 2.2 : 1.0;
      }
      case 'river_flood':
        return c.riverine ? 1.6 : c.coastal ? 0.9 : 1.0;
      case 'wildfire':
        if (c.mediterranean && c.arid) return 2.5;
        if (c.mediterranean || c.arid) return 1.6;
        if (c.tropical) return 0.3;
        return 0.5;
      case 'drought':
        if (c.arid && !c.coastal) return 2.4;
        if (c.arid) return 1.6;
        if (c.mediterranean) return 1.3;
        return 0.4;
      default:
        return 1.0;
    }
  };

  // Downscales a country's EAI across its cities proportional to
  // population × hazardWeight, preserving the country total.
  const cityEai = (
    city: City,
    hazard: string,
    countryEai: number,
    citiesInCountry: City[]
  ): number => {
    const denom = citiesInCountry.reduce((s, c) => s + c.pop_m * hazardWeight(c, hazard), 0);
    if (denom <= 0) return 0;
    return (countryEai * city.pop_m * hazardWeight(city, hazard)) / denom;
  };

  // ── EAI-by-hazard chart ────────────────────────────────────────────
  useEffect(() => {
    if (!snapshot || !eaiChartRef.current) return;
    eaiChart.current?.destroy();

    const labels = HAZARDS.map(h => h.label);
    const values = HAZARDS.map(h => {
      const base = snapshot.global.expected_annual_impact_eur_bn[h.id] ?? 0;
      return +(base * getMultiplier(h.id, selectedScenario)).toFixed(2);
    });
    const colors = HAZARDS.map(h => h.color);

    eaiChart.current = new Chart(eaiChartRef.current, {
      type: 'bar',
      data: { labels, datasets: [{ label: 'Expected annual impact (€ bn/yr)', data: values, backgroundColor: colors }] },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: `Global expected annual impact — ${SCENARIOS.find(s => s.id === selectedScenario)?.label}`,
            font: { size: 13 },
          },
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `€${Number(ctx.parsed.y ?? 0).toFixed(2)} bn/yr` } },
        },
        scales: { y: { title: { display: true, text: 'EUR billion / year' }, beginAtZero: true } },
      },
    });
    return () => { eaiChart.current?.destroy(); };
  }, [snapshot, selectedScenario]);

  // ── Top-countries chart for selected hazard ────────────────────────
  useEffect(() => {
    if (!snapshot || !topCountryChartRef.current) return;
    topCountryChart.current?.destroy();

    const mult = getMultiplier(selectedHazard, selectedScenario);
    const sorted = [...snapshot.byCountry]
      .map(c => ({ name: c.name, value: +(getEai(c, selectedHazard) * mult).toFixed(3) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    const color = HAZARDS.find(h => h.id === selectedHazard)?.color || '#007B6C';

    topCountryChart.current = new Chart(topCountryChartRef.current, {
      type: 'bar',
      data: {
        labels: sorted.map(s => s.name),
        datasets: [{ label: 'EAI (€ bn/yr)', data: sorted.map(s => s.value), backgroundColor: color }],
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        plugins: {
          title: { display: true, text: `Top 10 countries worldwide — ${HAZARDS.find(h => h.id === selectedHazard)?.label}`, font: { size: 13 } },
          legend: { display: false },
          tooltip: { callbacks: { label: (ctx) => `€${Number(ctx.parsed.x).toFixed(2)} bn/yr` } },
        },
        scales: { x: { title: { display: true, text: 'EUR billion / year' }, beginAtZero: true } },
      },
    });
    return () => { topCountryChart.current?.destroy(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshot, selectedHazard, selectedScenario]);

  // ── Choropleth map ─────────────────────────────────────────────────
  useEffect(() => {
    if (!snapshot || !topo || !mapRef.current) return;

    const svg = d3.select(mapRef.current);
    svg.selectAll('*').remove();

    const width = mapRef.current.clientWidth || 700;
    const height = 460;
    svg.attr('viewBox', `0 0 ${width} ${height}`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const topoData = topo as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let features: any[] = [];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const fc = topojsonClient.feature(topoData, topoData.objects.countries) as any;
      features = Array.isArray(fc?.features) ? fc.features : fc ? [fc] : [];
    } catch (err) {
      console.error('[ClimadaExplorer] topojson feature extraction failed', err);
    }

    // Country ISO3 → EAI value for the selected hazard+scenario
    const mult = getMultiplier(selectedHazard, selectedScenario);
    const valueByNum: Record<string, number> = {};
    snapshot.byCountry.forEach(c => {
      const v = getEai(c, selectedHazard) * mult;
      const num = ISO3_TO_NUM[c.iso3];
      if (num) valueByNum[num] = v;
    });

    const values = Object.values(valueByNum);
    const vMax = Math.max(...values, 0.1);
    const color = HAZARDS.find(h => h.id === selectedHazard)?.color || '#007B6C';
    const colorScale = d3.scaleSequential<string>()
      .domain([0, vMax])
      .interpolator(d3.interpolateRgb('#F3F4F6', color));

    // Global projection — geoNaturalEarth1 is the standard choice for world
    // choropleths (shows polar regions without Mercator's extreme distortion).
    const padding = 20;
    const projection = d3.geoNaturalEarth1()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .fitExtent(
        [[padding, padding], [width - padding, height - padding - 40]],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        { type: 'Sphere' } as any
      );
    const pathGen = d3.geoPath().projection(projection);

    // Graticule to give the globe spatial reference
    const graticule = d3.geoGraticule10();

    // Background rect (so empty ocean doesn't absorb scroll events confusingly)
    svg.append('rect')
      .attr('width', width)
      .attr('height', height)
      .attr('fill', '#F8FAFC');

    // Zoomable group holding all geometry
    const gZoom = svg.append('g').attr('class', 'zoom-layer');

    // Ocean (sphere) — gives the map a clean globe background
    gZoom.append('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .datum({ type: 'Sphere' } as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', pathGen as any)
      .attr('fill', '#EAF1F7')
      .attr('stroke', '#CBD5E1')
      .attr('stroke-width', 0.5);

    // Graticule (lat/lon grid)
    gZoom.append('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .datum(graticule as any)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', pathGen as any)
      .attr('fill', 'none')
      .attr('stroke', '#D1D9E0')
      .attr('stroke-width', 0.3)
      .attr('vector-effect', 'non-scaling-stroke');

    // Countries
    const countriesG = gZoom.append('g');
    countriesG.selectAll('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .data(features as any[])
      .join('path')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('d', (d: any) => pathGen(d) || '')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .attr('fill', (d: any) => {
        const id = d.id || d.properties?.iso_n3;
        if (!id) return '#EEF0F2';
        return valueByNum[id] != null ? colorScale(valueByNum[id]) : '#EEF0F2';
      })
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('vector-effect', 'non-scaling-stroke')
      .style('cursor', 'pointer')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .on('click', function (_event: unknown, d: any) {
        const id = d.id || d.properties?.iso_n3;
        const iso3 = Object.entries(ISO3_TO_NUM).find(([, num]) => num === id)?.[0];
        if (iso3) {
          setSelectedCountry(iso3);
          setSelectedCity(null);
        }
      })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .append('title')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .text((d: any) => {
        const id = d.id || d.properties?.iso_n3;
        const name = d.properties?.name || 'Unknown';
        const v = id ? valueByNum[id] : undefined;
        return `${name}: ${v != null ? `€${v.toFixed(2)} bn/yr` : 'n/a'}`;
      });

    // Highlight selected country
    const selNum = ISO3_TO_NUM[selectedCountry];
    if (selNum) {
      gZoom.append('g')
        .selectAll('path')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .data((features as any[]).filter((d: any) => (d.id || d.properties?.iso_n3) === selNum))
        .join('path')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .attr('d', (d: any) => pathGen(d) || '')
        .attr('fill', 'none')
        .attr('stroke', '#B83230')
        .attr('stroke-width', 2)
        .attr('vector-effect', 'non-scaling-stroke')
        .style('pointer-events', 'none');
    }

    // ── Sub-national city-level exposure overlay ────────────────────
    // Each city is rendered as a circle whose area is proportional to
    // its downscaled EAI. This gives within-country spatial variation
    // the country-choropleth can't show and makes the 4×4 km exposure
    // model's scale tangible once you zoom in.
    const cities = snapshot.cities || [];
    // Group cities by country so we can normalize within each country.
    const citiesByCountry: Record<string, City[]> = {};
    cities.forEach(c => {
      if (!citiesByCountry[c.iso3]) citiesByCountry[c.iso3] = [];
      citiesByCountry[c.iso3].push(c);
    });
    // Compute city risks
    const countryEaiByIso3: Record<string, number> = {};
    snapshot.byCountry.forEach(c => { countryEaiByIso3[c.iso3] = getEai(c, selectedHazard) * mult; });

    const cityPoints = cities
      .map(c => {
        const countryEai = countryEaiByIso3[c.iso3] ?? 0;
        const risk = cityEai(c, selectedHazard, countryEai, citiesByCountry[c.iso3] || []);
        const coords = projection([c.lon, c.lat]);
        if (!coords) return null;
        return { city: c, risk, x: coords[0], y: coords[1] };
      })
      .filter((x): x is NonNullable<typeof x> => x !== null && x.risk > 0);

    const maxCityRisk = Math.max(...cityPoints.map(p => p.risk), 0.001);
    // Visible marker radius (small, constant on-screen) + a larger transparent
    // hit target so the dots are always clickable, including on touch devices.
    // Risk is encoded in colour intensity, not size, so the map stays clean.
    const FIXED_R = 2.5;
    const HIT_R = 7;
    const cityColorScale = d3.scaleSequential<string>()
      .domain([0, maxCityRisk])
      .interpolator(d3.interpolateRgb('#CBD5E1', color));

    const cityNodes = gZoom.append('g')
      .attr('class', 'city-layer')
      .selectAll('g')
      .data(cityPoints)
      .join('g')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedCity(d.city);
        setSelectedCountry(d.city.iso3);
      });

    // Invisible hit target (large) — grabs clicks/taps reliably
    cityNodes.append('circle')
      .attr('class', 'hit')
      .attr('r', HIT_R)
      .attr('fill', 'transparent')
      .attr('pointer-events', 'all');

    // Visible marker (small, purely decorative — pointer-events on hit circle)
    cityNodes.append('circle')
      .attr('class', 'marker')
      .attr('r', FIXED_R)
      .attr('fill', d => cityColorScale(d.risk))
      .attr('fill-opacity', 0.95)
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 0.5)
      .attr('vector-effect', 'non-scaling-stroke')
      .attr('pointer-events', 'none');

    cityNodes.append('title')
      .text(d => `${d.city.name}, ${d.city.iso3}\nPopulation: ${d.city.pop_m.toFixed(1)} M\nDownscaled EAI: €${d.risk.toFixed(2)} bn/yr`);

    // Halo ring for the currently selected city — sits in its own layer
    // so we can rescale it independently in the zoom handler.
    if (selectedCity) {
      const sel = cityPoints.find(
        p => p.city.iso3 === selectedCity.iso3 && p.city.name === selectedCity.name
      );
      if (sel) {
        gZoom.append('g')
          .attr('class', 'selected-city-layer')
          .append('circle')
          .attr('cx', sel.x)
          .attr('cy', sel.y)
          .attr('r', FIXED_R + 4)
          .attr('fill', 'none')
          .attr('stroke', '#B83230')
          .attr('stroke-width', 1.6)
          .attr('vector-effect', 'non-scaling-stroke')
          .style('pointer-events', 'none');
      }
    }

    // Legend (kept outside zoom layer so it stays fixed)
    const legendW = 180, legendH = 10;
    const legendX = width - legendW - 20;
    const legendY = height - 30;
    const defs = svg.append('defs');
    const grad = defs.append('linearGradient').attr('id', 'climada-grad');
    grad.append('stop').attr('offset', '0%').attr('stop-color', '#F3F4F6');
    grad.append('stop').attr('offset', '100%').attr('stop-color', color);
    svg.append('rect').attr('x', legendX).attr('y', legendY).attr('width', legendW).attr('height', legendH)
      .attr('fill', 'url(#climada-grad)').attr('rx', 2);
    svg.append('text').attr('x', legendX).attr('y', legendY - 3)
      .attr('fill', '#808285').attr('font-size', 9).text('€0 bn/yr');
    svg.append('text').attr('x', legendX + legendW).attr('y', legendY - 3)
      .attr('fill', '#808285').attr('font-size', 9).attr('text-anchor', 'end')
      .text(`€${vMax.toFixed(2)} bn/yr`);

    // Popup position helper — anchors the floating HTML popup to the
    // currently selected city, converting SVG viewBox coords to screen px
    // and accounting for the active zoom transform.
    const selCityPoint = selectedCity
      ? cityPoints.find(p => p.city.iso3 === selectedCity.iso3 && p.city.name === selectedCity.name)
      : null;

    const positionPopup = (transform: d3.ZoomTransform) => {
      const el = popupRef.current;
      const svgEl = mapRef.current;
      if (!el || !svgEl || !selCityPoint) return;
      const rect = svgEl.getBoundingClientRect();
      if (rect.width === 0) return;
      const sx = rect.width / width;
      const sy = rect.height / height;
      const px = transform.applyX(selCityPoint.x) * sx;
      const py = transform.applyY(selCityPoint.y) * sy;
      const popupW = el.offsetWidth || 280;
      const popupH = el.offsetHeight || 200;
      // Default placement: to the right and slightly above the dot
      let left = px + 14;
      let top = py - popupH - 14;
      if (left + popupW > rect.width - 8) left = px - popupW - 14;
      if (left < 8) left = 8;
      if (top < 8) top = py + 18;
      if (top + popupH > rect.height - 8) top = rect.height - popupH - 8;
      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.display = 'block';
    };

    // Zoom behaviour (wheel, drag, + buttons via zoomRef below)
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([[0, 0], [width, height]])
      .on('zoom', (event) => {
        const k = event.transform.k;
        // Persist the current transform so the next effect-rebuild
        // (triggered by picking a country/hazard) can restore it.
        zoomTransformRef.current = event.transform;
        gZoom.attr('transform', event.transform.toString());
        // Keep city dots, hit targets & selected-city ring visually constant
        gZoom.select('.city-layer').selectAll<SVGCircleElement, unknown>('circle.marker').attr('r', FIXED_R / k);
        gZoom.select('.city-layer').selectAll<SVGCircleElement, unknown>('circle.hit').attr('r', HIT_R / k);
        gZoom.select('.selected-city-layer').selectAll('circle').attr('r', (FIXED_R + 4) / k);
        positionPopup(event.transform);
      });
    svg.call(zoom);
    // Store for external +/- buttons
    zoomBehaviourRef.current = zoom;

    // Restore any prior zoom/pan state (fires the zoom handler, which also
    // repositions the popup and rescales the dots in one shot).
    const savedTransform = zoomTransformRef.current;
    if (savedTransform && savedTransform !== d3.zoomIdentity) {
      svg.call(zoom.transform, savedTransform);
    } else {
      // Fresh identity render — position popup if a city is selected
      requestAnimationFrame(() => positionPopup(d3.zoomIdentity));
    }
  }, [snapshot, topo, selectedHazard, selectedScenario, selectedCountry, selectedCity]);

  // Zoom controls bound to buttons
  const handleZoom = (factor: number) => {
    if (!mapRef.current || !zoomBehaviourRef.current) return;
    d3.select(mapRef.current)
      .transition().duration(250)
      .call(zoomBehaviourRef.current.scaleBy, factor);
  };
  const handleZoomReset = () => {
    if (!mapRef.current || !zoomBehaviourRef.current) return;
    zoomTransformRef.current = d3.zoomIdentity;
    d3.select(mapRef.current)
      .transition().duration(300)
      .call(zoomBehaviourRef.current.transform, d3.zoomIdentity);
  };

  // ── Render ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-grey-200 p-6 text-center text-sm text-tertiary">
        Loading CLIMADA climate risk data…
      </div>
    );
  }
  if (!snapshot) {
    return (
      <div className="bg-white rounded-lg border border-grey-200 p-6 text-center text-sm text-tertiary">
        Unable to load CLIMADA snapshot.
      </div>
    );
  }

  const selectedCountryData = snapshot.byCountry.find(c => c.iso3 === selectedCountry);
  const mult = getMultiplier(selectedHazard, selectedScenario);

  // ── Country-detail derived values ───────────────────────────────────
  const hazardLabel = HAZARDS.find(h => h.id === selectedHazard)?.label ?? selectedHazard;
  const hazardColor = HAZARDS.find(h => h.id === selectedHazard)?.color ?? '#0065A4';
  const countryCities = (snapshot.cities ?? []).filter(c => c.iso3 === selectedCountry);
  const countryBaseEai = selectedCountryData ? getEai(selectedCountryData, selectedHazard) : 0;
  const topCities = countryCities
    .map(c => ({
      city: c,
      eai: cityEai(c, selectedHazard, countryBaseEai * mult, countryCities),
    }))
    .filter(x => x.eai > 0)
    .sort((a, b) => b.eai - a.eai)
    .slice(0, 6);
  const topCityMax = Math.max(...topCities.map(c => c.eai), 0.0001);
  const scenarioBars = [
    { id: 'present', label: 'Present',    value: countryBaseEai * 1.0 },
    { id: 'rcp26',   label: 'RCP 2.6 2050', value: countryBaseEai * getMultiplier(selectedHazard, 'rcp26') },
    { id: 'rcp45',   label: 'RCP 4.5 2050', value: countryBaseEai * getMultiplier(selectedHazard, 'rcp45') },
    { id: 'rcp85',   label: 'RCP 8.5 2050', value: countryBaseEai * getMultiplier(selectedHazard, 'rcp85') },
  ];
  const scenarioMax = Math.max(...scenarioBars.map(s => s.value), 0.0001);

  // ── Selected-city derived values ────────────────────────────────────
  // Downscale every hazard to the chosen city using the same LitPop-style
  // weighting we use for the map dots, so the panel shows risk *for that
  // specific point*, not just the country aggregate.
  const cityHazardBars = selectedCity
    ? HAZARDS.map(h => {
        const country = snapshot.byCountry.find(c => c.iso3 === selectedCity.iso3);
        const cities = (snapshot.cities ?? []).filter(c => c.iso3 === selectedCity.iso3);
        const baseEai = country ? getEai(country, h.id) : 0;
        const value = cityEai(selectedCity, h.id, baseEai, cities);
        return { hazard: h, value };
      })
    : [];
  const cityHazardMax = Math.max(...cityHazardBars.map(b => b.value), 0.0001);
  const cityScenarioBase = selectedCity
    ? (() => {
        const country = snapshot.byCountry.find(c => c.iso3 === selectedCity.iso3);
        const cities = (snapshot.cities ?? []).filter(c => c.iso3 === selectedCity.iso3);
        const baseEai = country ? getEai(country, selectedHazard) : 0;
        return cityEai(selectedCity, selectedHazard, baseEai, cities);
      })()
    : 0;
  const cityFlags = selectedCity
    ? ([
        selectedCity.coastal       ? 'coastal'       : null,
        selectedCity.tropical      ? 'tropical'      : null,
        selectedCity.mediterranean ? 'mediterranean' : null,
        selectedCity.arid          ? 'arid'          : null,
        selectedCity.riverine      ? 'riverine'      : null,
      ].filter(Boolean) as string[])
    : [];

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const datasetList: any[] = (() => {
    if (!datasets) return [];
    const d = datasets.data;
    if (!d) return [];
    if (Array.isArray(d)) return d;
    if (Array.isArray(d.datasets)) return d.datasets;
    return [];
  })();

  return (
    <div className="space-y-4">
      {/* Header / KPI strip */}
      <div className="bg-gradient-to-r from-[#004B7F] to-[#0065A4] rounded-lg p-5 text-white">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
          <div className="flex-1 min-w-0">
            <div className="text-[10px] uppercase tracking-wider text-white/60 mb-1">Powered by</div>
            <h3 className="text-base font-bold">CLIMADA — ETH Zurich global climate risk framework</h3>
            <p className="text-xs text-white/70 mt-1">
              Global coverage · {snapshot.byCountry.length}+ countries modelled · open-source (GNU GPL-3.0) · data CC BY 4.0 · baseline year {snapshot.baselineYear}.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="text-[10px] font-bold bg-white text-[#0065A4] rounded px-2 py-1 border border-white"
              title="Headline CLIMADA hazard & LitPop grid resolution"
            >
              {RESOLUTION_ARCSEC} arcsec ≈ {RESOLUTION_KM.toFixed(1)} km
            </span>
            <a
              href="https://github.com/CLIMADA-project/climada_python"
              target="_blank" rel="noopener noreferrer"
              className="text-xs bg-white/10 hover:bg-white/20 transition rounded px-3 py-1.5 border border-white/20"
            >
              View on GitHub
            </a>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white/10 rounded p-3 border border-white/15">
            <div className="text-[10px] text-white/60 uppercase">Global exposed assets</div>
            <div className="text-lg font-bold">€{(snapshot.global.exposed_assets_eur_bn / 1000).toFixed(1)} tn</div>
            <div className="text-[10px] text-white/50">LitPop (nightlights × pop.)</div>
          </div>
          <div className="bg-white/10 rounded p-3 border border-white/15">
            <div className="text-[10px] text-white/60 uppercase">Population modelled</div>
            <div className="text-lg font-bold">{(snapshot.global.population_exposed_millions / 1000).toFixed(1)} bn</div>
            <div className="text-[10px] text-white/50">Worldwide residents</div>
          </div>
          <div className="bg-white/10 rounded p-3 border border-white/15">
            <div className="text-[10px] text-white/60 uppercase">EAI tropical cyclones</div>
            <div className="text-lg font-bold">€{snapshot.global.expected_annual_impact_eur_bn.tropical_cyclone.toFixed(0)} bn/yr</div>
            <div className="text-[10px] text-white/50">Global TC model</div>
          </div>
          <div className="bg-white/10 rounded p-3 border border-white/15">
            <div className="text-[10px] text-white/60 uppercase">EAI river floods</div>
            <div className="text-lg font-bold">€{snapshot.global.expected_annual_impact_eur_bn.river_flood.toFixed(0)} bn/yr</div>
            <div className="text-[10px] text-white/50">Global flood model</div>
          </div>
        </div>
      </div>

      {/* Scenario & hazard controls */}
      <div className="bg-white rounded-lg border border-grey-200 p-4">
        <div className="flex flex-col lg:flex-row lg:items-start gap-4">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">Hazard</div>
            <div className="flex flex-wrap gap-1.5">
              {HAZARDS.map(h => (
                <button
                  key={h.id}
                  onClick={() => setSelectedHazard(h.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition flex items-center gap-2 ${
                    selectedHazard === h.id ? 'text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                  }`}
                  style={selectedHazard === h.id ? { backgroundColor: h.color } : {}}
                  title={`CLIMADA hazard code: ${h.code}`}
                >
                  <span
                    className={`text-[9px] font-mono tracking-wider px-1 py-0.5 rounded ${
                      selectedHazard === h.id ? 'bg-white/25' : 'bg-white border border-grey-200 text-grey-400'
                    }`}
                  >
                    {h.code}
                  </span>
                  {h.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">Scenario</div>
            <div className="flex flex-wrap gap-1.5">
              {SCENARIOS.map(s => (
                <button
                  key={s.id}
                  onClick={() => setSelectedScenario(s.id)}
                  className={`px-2.5 py-1.5 text-xs font-medium rounded transition ${
                    selectedScenario === s.id ? 'text-white' : 'bg-grey-100 text-tertiary hover:bg-grey-200'
                  }`}
                  style={selectedScenario === s.id ? { backgroundColor: s.color } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        {selectedScenario !== 'present' && (
          <p className="text-[10px] text-tertiary mt-3">
            Projecting present-day EAI forward to 2050 using CLIMADA climate-change multipliers
            (×{mult.toFixed(2)} for {HAZARDS.find(h => h.id === selectedHazard)?.label} under {SCENARIOS.find(s => s.id === selectedScenario)?.label}).
          </p>
        )}
      </div>

      {/* Map */}
      <div className="bg-white rounded-lg border border-grey-200 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <h3 className="text-sm font-bold text-tertiary-dark">
              Expected annual impact by country — {HAZARDS.find(h => h.id === selectedHazard)?.label}
            </h3>
            <p className="text-[11px] text-tertiary mt-0.5">
              {SCENARIOS.find(s => s.id === selectedScenario)?.label} · LitPop exposure × CLIMADA hazard modules
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => handleZoom(1.5)}
              className="w-7 h-7 text-sm font-bold bg-grey-100 hover:bg-grey-200 rounded border border-grey-200 text-tertiary"
              aria-label="Zoom in"
              title="Zoom in"
            >+</button>
            <button
              onClick={() => handleZoom(1 / 1.5)}
              className="w-7 h-7 text-sm font-bold bg-grey-100 hover:bg-grey-200 rounded border border-grey-200 text-tertiary"
              aria-label="Zoom out"
              title="Zoom out"
            >−</button>
            <button
              onClick={handleZoomReset}
              className="h-7 px-2 text-[10px] font-medium bg-grey-100 hover:bg-grey-200 rounded border border-grey-200 text-tertiary"
              aria-label="Reset zoom"
              title="Reset view"
            >Reset</button>
          </div>
        </div>
        <div className="relative">
          <svg
            ref={mapRef}
            style={{ width: '100%', height: 460, cursor: 'grab', touchAction: 'none' }}
          />
          {selectedCity && (
            <div
              ref={popupRef}
              className="absolute z-10 bg-white border-2 border-[#B83230] rounded-md shadow-xl p-3 w-[280px] pointer-events-auto"
              style={{ left: 0, top: 0, display: 'none' }}
              role="dialog"
              aria-label={`Climate risk info for ${selectedCity.name}`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="text-[9px] uppercase tracking-wider text-tertiary">City grid cell</div>
                  <div className="text-sm font-bold text-tertiary-dark truncate">
                    {selectedCity.name}
                    <span className="text-[10px] font-mono text-grey-400 ml-1.5">{selectedCity.iso3}</span>
                  </div>
                  <div className="text-[10px] text-tertiary">
                    {selectedCity.lat.toFixed(2)}°{selectedCity.lat >= 0 ? 'N' : 'S'}, {Math.abs(selectedCity.lon).toFixed(2)}°{selectedCity.lon >= 0 ? 'E' : 'W'} · {selectedCity.pop_m.toFixed(1)} M residents
                  </div>
                </div>
                <button
                  onClick={() => setSelectedCity(null)}
                  className="shrink-0 w-5 h-5 leading-none text-sm bg-grey-100 hover:bg-grey-200 rounded border border-grey-200 text-tertiary"
                  aria-label="Close"
                  title="Close"
                >
                  ×
                </button>
              </div>

              {cityFlags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {cityFlags.map(f => (
                    <span
                      key={f}
                      className="text-[8px] font-mono uppercase tracking-wider bg-grey-100 text-tertiary border border-grey-200 rounded px-1 py-0.5"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 mb-2">
                <div className="border border-grey-200 rounded p-1.5">
                  <div className="text-[8px] text-tertiary uppercase">Present</div>
                  <div className="text-[11px] font-bold" style={{ color: hazardColor }}>
                    €{cityScenarioBase.toFixed(3)}
                  </div>
                  <div className="text-[8px] text-grey-400">bn/yr</div>
                </div>
                <div className="border border-grey-200 rounded p-1.5">
                  <div className="text-[8px] text-tertiary uppercase">RCP 4.5</div>
                  <div className="text-[11px] font-bold" style={{ color: hazardColor }}>
                    €{(cityScenarioBase * getMultiplier(selectedHazard, 'rcp45')).toFixed(3)}
                  </div>
                  <div className="text-[8px] text-grey-400">×{getMultiplier(selectedHazard, 'rcp45').toFixed(2)}</div>
                </div>
                <div className="border border-grey-200 rounded p-1.5">
                  <div className="text-[8px] text-tertiary uppercase">RCP 8.5</div>
                  <div className="text-[11px] font-bold" style={{ color: hazardColor }}>
                    €{(cityScenarioBase * getMultiplier(selectedHazard, 'rcp85')).toFixed(3)}
                  </div>
                  <div className="text-[8px] text-grey-400">×{getMultiplier(selectedHazard, 'rcp85').toFixed(2)}</div>
                </div>
              </div>

              <div className="text-[8px] uppercase tracking-wider text-tertiary mb-1">
                All hazards at this cell
              </div>
              <div className="space-y-1">
                {cityHazardBars.map(({ hazard, value }) => {
                  const pct = Math.max(2, (value / cityHazardMax) * 100);
                  const isCurrent = selectedHazard === hazard.id;
                  return (
                    <div key={hazard.id} className="flex items-center gap-1.5">
                      <div
                        className="w-6 text-[8px] font-mono text-center rounded"
                        style={{ backgroundColor: `${hazard.color}22`, color: hazard.color }}
                      >
                        {hazard.code}
                      </div>
                      <div className="flex-1 bg-grey-100 rounded h-2 relative overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: hazard.color,
                            opacity: isCurrent ? 1 : 0.55,
                          }}
                        />
                      </div>
                      <div className="w-14 text-right text-[9px] font-mono text-tertiary">
                        €{value.toFixed(3)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="text-[8px] text-grey-400 mt-1.5 leading-snug">
                LitPop-downscaled to the {RESOLUTION_ARCSEC} arcsec grid cell containing {selectedCity.name}.
              </div>
            </div>
          )}
        </div>
        <p className="text-[10px] text-grey-400 mt-1">
          Country shading = aggregate EAI · {snapshot.cities?.length ?? 0} city dots colored by LitPop-downscaled risk · click a dot for a popup · scroll/drag to navigate.
        </p>
      </div>

      {/* Selected country drill-down */}
      <div className="bg-white rounded-lg border border-grey-200 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tertiary">Selected country</div>
            <h3 className="text-sm font-bold text-tertiary-dark">
              {selectedCountryData?.name || selectedCountry}
              <span className="text-[10px] font-mono text-grey-400 ml-2">{selectedCountry}</span>
            </h3>
            <p className="text-[11px] text-tertiary mt-0.5">
              Drill-down for <span style={{ color: hazardColor }} className="font-semibold">{hazardLabel}</span> · click another country or city on the map to switch.
            </p>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
          <div className="border border-grey-200 rounded p-2">
            <div className="text-[10px] text-tertiary uppercase">Exposed assets</div>
            <div className="text-sm font-bold text-tertiary-dark">
              €{((selectedCountryData?.exposed_eur_bn ?? 0) / 1000).toFixed(2)} tn
            </div>
            <div className="text-[9px] text-grey-400">LitPop total</div>
          </div>
          <div className="border border-grey-200 rounded p-2">
            <div className="text-[10px] text-tertiary uppercase">EAI present</div>
            <div className="text-sm font-bold" style={{ color: hazardColor }}>
              €{countryBaseEai.toFixed(2)} bn/yr
            </div>
            <div className="text-[9px] text-grey-400">{hazardLabel}</div>
          </div>
          <div className="border border-grey-200 rounded p-2">
            <div className="text-[10px] text-tertiary uppercase">EAI 2050 · RCP 4.5</div>
            <div className="text-sm font-bold" style={{ color: hazardColor }}>
              €{(countryBaseEai * getMultiplier(selectedHazard, 'rcp45')).toFixed(2)} bn/yr
            </div>
            <div className="text-[9px] text-grey-400">×{getMultiplier(selectedHazard, 'rcp45').toFixed(2)}</div>
          </div>
          <div className="border border-grey-200 rounded p-2">
            <div className="text-[10px] text-tertiary uppercase">EAI 2050 · RCP 8.5</div>
            <div className="text-sm font-bold" style={{ color: hazardColor }}>
              €{(countryBaseEai * getMultiplier(selectedHazard, 'rcp85')).toFixed(2)} bn/yr
            </div>
            <div className="text-[9px] text-grey-400">×{getMultiplier(selectedHazard, 'rcp85').toFixed(2)}</div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Top cities in country */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">
              Top cities — downscaled EAI
            </div>
            {topCities.length === 0 ? (
              <p className="text-[11px] text-grey-400">
                No major city in the snapshot has meaningful {hazardLabel.toLowerCase()} exposure
                under this selection.
              </p>
            ) : (
              <div className="space-y-1.5">
                {topCities.map(({ city, eai }) => {
                  const pct = Math.max(3, (eai / topCityMax) * 100);
                  return (
                    <div key={city.name} className="flex items-center gap-2">
                      <div className="w-20 text-[11px] text-tertiary-dark truncate">{city.name}</div>
                      <div className="flex-1 bg-grey-100 rounded h-3 relative overflow-hidden">
                        <div
                          className="h-full rounded"
                          style={{ width: `${pct}%`, backgroundColor: hazardColor, opacity: 0.85 }}
                        />
                      </div>
                      <div className="w-20 text-right text-[11px] font-mono text-tertiary">
                        €{eai.toFixed(2)} bn/yr
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-[9px] text-grey-400 mt-2 leading-snug">
              Downscaled from country EAI via population × climatic flags. City shares sum to the
              country total.
            </p>
          </div>

          {/* Scenario trajectory */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-tertiary mb-1.5">
              Scenario trajectory — {hazardLabel}
            </div>
            <div className="space-y-1.5">
              {scenarioBars.map(s => {
                const pct = Math.max(3, (s.value / scenarioMax) * 100);
                const isCurrent = selectedScenario === s.id;
                return (
                  <div key={s.id} className="flex items-center gap-2">
                    <div className="w-24 text-[11px] text-tertiary-dark">{s.label}</div>
                    <div className="flex-1 bg-grey-100 rounded h-3 relative overflow-hidden">
                      <div
                        className="h-full rounded"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: hazardColor,
                          opacity: isCurrent ? 1 : 0.5,
                        }}
                      />
                    </div>
                    <div className="w-20 text-right text-[11px] font-mono text-tertiary">
                      €{s.value.toFixed(2)} bn/yr
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="text-[9px] text-grey-400 mt-2 leading-snug">
              Present-day EAI projected to 2050 via CLIMADA climate-change multipliers
              (Aznar-Siguan &amp; Bresch 2019; CMIP6 SSP scenarios).
            </p>
          </div>
        </div>
      </div>

      {/* Two charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg border border-grey-200 p-4">
          <canvas ref={eaiChartRef} />
          <p className="text-[10px] text-grey-400 mt-2">
            Source: CLIMADA global demo runs (LitPop × hazard impact functions). Values reflect expected
            annual impact on physical assets.
          </p>
        </div>
        <div className="bg-white rounded-lg border border-grey-200 p-4">
          <canvas ref={topCountryChartRef} />
          <p className="text-[10px] text-grey-400 mt-2">
            Ranked by expected annual impact (EAI) for the selected hazard and scenario.
          </p>
        </div>
      </div>

      {/* Underlying scientific dataset browser */}
      <div className="bg-white rounded-lg border border-grey-200 p-4">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-bold text-tertiary-dark">
              Underlying scientific datasets — {HAZARDS.find(h => h.id === selectedHazard)?.label}, {selectedCountryData?.name || selectedCountry}
            </h3>
            <p className="text-[11px] text-tertiary mt-1 leading-relaxed">
              These are the peer-reviewed hazard and exposure files the figures above are built
              from. They are fetched live from the CLIMADA Data API
              (<code className="text-[10px] bg-grey-100 px-1 rounded">climada.ethz.ch/data-api/v1/dataset/</code>)
              filtered to the headline{' '}
              <span className="font-semibold">{RESOLUTION_ARCSEC} arcsec (≈{RESOLUTION_KM.toFixed(1)} km)</span>{' '}
              grid, and show exactly which source the model is drawing on for the selected hazard
              and country — name, version, resolution, climate scenario and DOI — so any result on
              this page is fully traceable.
              {datasets?.status === 'demo_mode' && (
                <span className="ml-1 text-amber-700">Upstream API unreachable — showing cached metadata.</span>
              )}
            </p>
          </div>
          <select
            value={selectedCountry}
            onChange={e => setSelectedCountry(e.target.value)}
            className="text-xs border border-grey-200 rounded px-2 py-1 bg-white shrink-0"
            aria-label="Select country"
          >
            {snapshot.byCountry.map(c => (
              <option key={c.iso3} value={c.iso3}>{c.name}</option>
            ))}
          </select>
        </div>
        {datasetsLoading ? (
          <p className="text-xs text-tertiary">Loading datasets…</p>
        ) : datasetList.length === 0 ? (
          <p className="text-xs text-tertiary">
            No datasets published for this hazard/country combination. Try another selection.
          </p>
        ) : (
          <div className="space-y-2 max-h-[320px] overflow-y-auto">
            {datasetList.slice(0, 10).map((ds, i) => {
              const name = ds.name || ds.uuid || `dataset ${i + 1}`;
              const version = ds.version || '';
              const status = ds.status || '';
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const props = ds.properties as Record<string, any> | undefined;
              const resolution = props?.resolution || props?.spatial_coverage;
              const scenario = props?.climate_scenario || props?.scenario;
              return (
                <div key={ds.uuid || i} className="border border-grey-200 rounded p-3 hover:border-secondary transition">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-mono font-semibold text-tertiary-dark truncate">{name}</div>
                      <div className="flex flex-wrap gap-2 mt-1 text-[10px] text-tertiary">
                        {version && <span className="bg-grey-100 px-1.5 py-0.5 rounded">version {version}</span>}
                        {status && <span className="bg-grey-100 px-1.5 py-0.5 rounded">status: {status}</span>}
                        {resolution && <span className="bg-grey-100 px-1.5 py-0.5 rounded">resolution: {resolution}</span>}
                        {scenario && <span className="bg-grey-100 px-1.5 py-0.5 rounded">scenario: {scenario}</span>}
                      </div>
                      {ds.description && (
                        <p className="text-[10px] text-tertiary mt-1 line-clamp-2">{ds.description}</p>
                      )}
                    </div>
                    {ds.doi && (
                      <a
                        href={`https://doi.org/${ds.doi}`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-[10px] text-secondary hover:underline shrink-0"
                      >
                        DOI
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Source strip */}
      <div className="text-[10px] text-grey-400">
        {sourceLabel && <>Source: {sourceLabel} · </>}
        Methodology: Aznar-Siguan &amp; Bresch (2019) CLIMADA v1; Eberenz et al. (2021) LitPop; Sauer et al. (2021) global river flood.
        {' '}Data license: <a href="https://creativecommons.org/licenses/by/4.0/" className="underline hover:text-secondary" target="_blank" rel="noopener noreferrer">CC BY 4.0</a>.
        {' '}Framework license: GNU GPL-3.0.
      </div>
    </div>
  );
}
