'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Chart from 'chart.js/auto';
import CommentSection from '@/components/CommentSection';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';

/**
 * Maritime & Aviation Bunkering
 *
 * Scope: international bunkers only — i.e. fuel uplifted in EU ports and
 * airports for voyages/flights leaving the EU. Runs a least-cost
 * fuel-route optimization for each sector and compares the resulting
 * marginal abatement cost with other EU sectors.
 */

type Fuel = {
  name: string;
  sector: string;
  cost_eur_per_gj: number;
  ci_kg_co2_per_gj: number;
  trl: number;
  max_share_2030: number;
};

type FuelMix = {
  sector: string;
  shares: Record<string, number>;
  energy_pj: Record<string, number>;
  total_cost_beur: number;
  avg_cost_eur_per_gj: number;
  ci_kg_per_gj: number;
  co2_mt: number;
  abatement_mt: number;
  target_ci_kg_per_gj: number;
  status: string;
};

type MACPoint = {
  target_ci: number;
  avg_cost_eur_per_gj: number;
  co2_mt: number;
  abatement_mt: number;
  marginal_cost_eur_per_t?: number;
};

type SectorRow = { sector: string; abatement_mt: number; mac_eur_per_t: number };

type Response = {
  shipping: FuelMix;
  aviation: FuelMix;
  mac: {
    shipping_curve: MACPoint[];
    aviation_curve: MACPoint[];
    sector_comparison: SectorRow[];
  };
  fuels: Record<string, Fuel>;
  demand: Record<string, number>;
};

const FUEL_COLORS: Record<string, string> = {
  'Heavy Fuel Oil (VLSFO)':  '#404040',
  'Marine Gas Oil':          '#6B7280',
  'LNG (marine)':            '#78716C',
  'Bio-methanol':            '#84CC16',
  'E-methanol':              '#16A34A',
  'Green ammonia':           '#059669',
  'Liquid hydrogen (ship)':  '#14B8A6',
  'Jet A-1 (fossil)':        '#404040',
  'HEFA SAF (bio)':          '#84CC16',
  'Alcohol-to-Jet SAF':      '#22C55E',
  'Fischer-Tropsch SAF':     '#16A34A',
  'E-kerosene (PtL)':        '#059669',
  'Liquid hydrogen (aero)':  '#0EA5E9',
};

type Preset = {
  id: string;
  label: string;
  ship: number;
  aero: number;
  note: string;
};

// Shipping CI derived from FuelEU Maritime WtW reduction schedule against the
// 2020 baseline of 91.16 gCO2eq/MJ (−2 % 2025, −6 % 2030, −14.5 % 2035,
// −31 % 2040, −62 % 2045, −80 % 2050). Aviation CI derived from ReFuelEU
// Aviation volumetric SAF blending mandates (2 % 2025 → 70 % 2050, incl.
// e-kerosene sub-mandate) weighted against Jet A-1 at ~89 kg CO₂e/GJ.
const PRESETS: Preset[] = [
  { id: 'bau',    label: 'Business as usual (fossil)',  ship: 88, aero: 87, note: 'No switching beyond current VLSFO / Jet A-1 baseline.' },
  { id: '2030',   label: 'FuelEU / ReFuelEU 2030',      ship: 86, aero: 85, note: 'FuelEU Maritime −6 % vs 2020; ReFuelEU 6 % SAF (1.2 % e-SAF avg 2030–31; rises to 2 % avg 2032–34, 5 % in 2035).' },
  { id: '2035',   label: 'FuelEU / ReFuelEU 2035',      ship: 78, aero: 76, note: 'FuelEU Maritime −14.5 %; ReFuelEU 20 % SAF (5 % synthetic).' },
  { id: '2040',   label: 'FuelEU / ReFuelEU 2040',      ship: 63, aero: 67, note: 'FuelEU Maritime −31 %; ReFuelEU 34 % SAF (10 % synthetic).' },
  { id: '2045',   label: 'FuelEU / ReFuelEU 2045',      ship: 35, aero: 53, note: 'FuelEU Maritime −62 %; ReFuelEU 42 % SAF (15 % synthetic).' },
  { id: '2050',   label: 'FuelEU / ReFuelEU 2050',      ship: 18, aero: 35, note: 'FuelEU Maritime −80 %; ReFuelEU 70 % SAF (35 % synthetic).' },
  { id: 'nz2050', label: 'ESABCC / IEA NZE 2050',       ship:  5, aero: 10, note: 'Deep bunker decarbonisation consistent with EU climate-neutrality and IEA Net Zero Emissions scenario.' },
];

type SourceRow = { fuel: string; cost: string; ci: string; source: string };

const SHIP_SOURCES: SourceRow[] = [
  { fuel: 'Heavy Fuel Oil (VLSFO)', cost: '€14/GJ', ci: '90 kg/GJ', source: 'Ship & Bunker 2023–24 Rotterdam prices; DNV Maritime Forecast 2030 (well-to-wake CI incl. refining).' },
  { fuel: 'Marine Diesel Oil (MDO)', cost: '€18/GJ', ci: '91 kg/GJ', source: 'FuelEU Maritime Annex II (90.8 gCO2eq/MJ default WtW); IEA WEO 2023; IMO 4th GHG Study 2020.' },
  { fuel: 'LNG (marine)',            cost: '€17/GJ', ci: '75 kg/GJ', source: 'IEA WEO 2023; Transport & Environment 2023 “LNG in shipping” (includes methane slip).' },
  { fuel: 'Bio-methanol',            cost: '€32/GJ', ci: '28 kg/GJ', source: 'IRENA Innovation Outlook Renewable Methanol 2021; Methanol Institute 2023.' },
  { fuel: 'E-methanol',              cost: '€45/GJ', ci: '6 kg/GJ',  source: 'IRENA 2021; Maersk Mc-Kinney Møller Center for Zero-Carbon Shipping 2023.' },
  { fuel: 'Green ammonia',           cost: '€50/GJ', ci: '10 kg/GJ', source: 'IRENA/AEA Innovation Outlook Renewable Ammonia 2022; DNV 2023. Midpoint of 8-15 gCO2e/MJ range (incl. N2O).' },
  { fuel: 'Liquid hydrogen (ship)',  cost: '€55/GJ', ci: '10 kg/GJ', source: 'IEA The Future of Hydrogen 2019 (updated 2023); DNV Maritime Forecast 2030. Includes liquefaction energy.' },
];

const AERO_SOURCES: SourceRow[] = [
  { fuel: 'Jet A-1 (fossil)',        cost: '€16/GJ', ci: '89 kg/GJ', source: 'IATA Fuel Price Monitor 2023–24; EU ETS Aviation monitoring guidance (WtW).' },
  { fuel: 'HEFA SAF (bio)',          cost: '€38/GJ', ci: '25 kg/GJ', source: 'ICCT 2021 “Long-term cost of SAF”; EC ReFuelEU Aviation Impact Assessment SWD(2021) 633.' },
  { fuel: 'Alcohol-to-Jet SAF',      cost: '€42/GJ', ci: '22 kg/GJ', source: 'ICCT 2021; IEA Renewables 2023.' },
  { fuel: 'Fischer-Tropsch SAF',     cost: '€48/GJ', ci: '15 kg/GJ', source: 'ICCT 2021; IEA Bioenergy Task 39 2022.' },
  { fuel: 'E-kerosene (PtL)',        cost: '€60/GJ', ci: '5 kg/GJ',  source: 'Transport & Environment 2023 “Roadmap to climate-neutral aviation”; Fraunhofer ISE 2022.' },
  { fuel: 'Liquid hydrogen (aero)',  cost: '€65/GJ', ci: '10 kg/GJ', source: 'Clean Aviation JU Strategic Research & Innovation Agenda 2022; IEA Hydrogen 2023. Includes liquefaction energy.' },
];

const OTHER_SECTOR_SOURCES: { sector: string; mac: string; source: string }[] = [
  { sector: 'Power',             mac: '€45/t',  source: 'EC 2040 Impact Assessment SWD(2024) 63; IEA NZE Scenario 2023.' },
  { sector: 'Industry (light)',  mac: '€80/t',  source: 'EC 2040 Impact Assessment; ESABCC Scientific Advice for 2040 target (2023).' },
  { sector: 'Industry (heavy)',  mac: '€180/t', source: 'EC 2040 Impact Assessment; IEA Net Zero Roadmap 2023 (cement, steel, chemicals).' },
  { sector: 'Buildings',         mac: '€110/t', source: 'EC 2040 Impact Assessment; IEA WEO 2023; Fraunhofer ISI 2022.' },
  { sector: 'Road transport',    mac: '€140/t', source: 'EC 2040 Impact Assessment; ICCT 2023 EU passenger-car cost curves.' },
  { sector: 'Agriculture',       mac: '€220/t', source: 'ESABCC Scientific Advice 2040; EC Farm to Fork / CAP modelling 2023.' },
];

export default function MaritimeAviationPage() {
  const [shipCI, setShipCI] = useState(30);
  const [aeroCI, setAeroCI] = useState(35);
  const [data, setData] = useState<Response | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [serviceOnline, setServiceOnline] = useState<boolean | null>(null);

  const shipMixRef = useRef<HTMLCanvasElement>(null);
  const aeroMixRef = useRef<HTMLCanvasElement>(null);
  const macRef = useRef<HTMLCanvasElement>(null);
  const curveRef = useRef<HTMLCanvasElement>(null);
  const charts = useRef<Chart[]>([]);

  useEffect(() => {
    fetch('/api/maritime-aviation')
      .then(r => r.json())
      .then(d => setServiceOnline(d.status === 'ok'))
      .catch(() => setServiceOnline(false));
  }, []);

  const run = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await fetch('/api/maritime-aviation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shipping_target_ci: shipCI,
          aviation_target_ci: aeroCI,
        }),
      });
      const json = await r.json();
      if (!r.ok) {
        setError(json.hint || json.error || 'request failed');
        return;
      }
      setData(json as Response);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [shipCI, aeroCI]);

  // Auto-run once when service is online
  useEffect(() => {
    if (serviceOnline) run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceOnline]);

  // Render charts
  useEffect(() => {
    charts.current.forEach(c => c.destroy());
    charts.current = [];
    if (!data) return;

    const drawMix = (canvas: HTMLCanvasElement | null, mix: FuelMix, title: string) => {
      if (!canvas) return;
      const labels = Object.keys(mix.shares).filter(k => mix.shares[k] > 0.001);
      const values = labels.map(l => mix.shares[l] * 100);
      const bg = labels.map(l => FUEL_COLORS[l] || '#888');
      const c = new Chart(canvas, {
        type: 'bar',
        data: { labels, datasets: [{ label: 'Share', data: values, backgroundColor: bg }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          indexAxis: 'y',
          plugins: {
            legend: { display: false },
            title: { display: true, text: title },
            tooltip: { callbacks: { label: ctx => `${(ctx.parsed.x ?? 0).toFixed(1)}%` } },
          },
          scales: { x: { title: { display: true, text: 'Share of energy (%)' }, max: 100 } },
        },
      });
      charts.current.push(c);
    };

    drawMix(shipMixRef.current, data.shipping, `Shipping fuel mix — CI ${data.shipping.ci_kg_per_gj.toFixed(1)} kg/GJ`);
    drawMix(aeroMixRef.current, data.aviation, `Aviation fuel mix — CI ${data.aviation.ci_kg_per_gj.toFixed(1)} kg/GJ`);

    // MAC curves (shipping vs aviation)
    if (curveRef.current) {
      const ship = data.mac.shipping_curve;
      const aero = data.mac.aviation_curve;
      const c = new Chart(curveRef.current, {
        type: 'line',
        data: {
          datasets: [
            {
              label: 'International shipping',
              data: ship.map(p => ({ x: p.abatement_mt, y: p.marginal_cost_eur_per_t || 0 })),
              borderColor: '#1F4E79',
              backgroundColor: '#1F4E79',
              showLine: true,
              stepped: true,
            },
            {
              label: 'International aviation',
              data: aero.map(p => ({ x: p.abatement_mt, y: p.marginal_cost_eur_per_t || 0 })),
              borderColor: '#4A90C5',
              backgroundColor: '#4A90C5',
              showLine: true,
              stepped: true,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            title: { display: true, text: 'Bunker MAC curves (built-in LP)' },
            legend: { position: 'bottom' },
          },
          scales: {
            x: { type: 'linear', title: { display: true, text: 'Abatement (Mt CO₂ / yr)' } },
            y: { title: { display: true, text: 'Marginal abatement cost (€ / t CO₂)' }, min: 0 },
          },
        },
      });
      charts.current.push(c);
    }

    // Sector comparison MAC bar chart (horizontal)
    if (macRef.current) {
      const rows = data.mac.sector_comparison;
      const labels = rows.map(r => r.sector);
      const values = rows.map(r => r.mac_eur_per_t);
      const colors = rows.map(r =>
        r.sector.toLowerCase().includes('bunker') ? '#B83230' : '#0065A4',
      );
      const c = new Chart(macRef.current, {
        type: 'bar',
        data: {
          labels,
          datasets: [{ label: '€/t CO₂', data: values, backgroundColor: colors }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            title: { display: true, text: 'Sector MAC — bunkers highlighted' },
            tooltip: {
              callbacks: {
                afterLabel: ctx => {
                  const row = rows[ctx.dataIndex];
                  return `Abatement: ${row.abatement_mt.toFixed(0)} Mt/yr`;
                },
              },
            },
          },
          scales: {
            x: { title: { display: true, text: '€ / t CO₂' } },
          },
        },
      });
      charts.current.push(c);
    }

    return () => {
      charts.current.forEach(c => c.destroy());
      charts.current = [];
    };
  }, [data]);

  const downloadReport = async () => {
    const r = await fetch('/api/maritime-aviation?kind=report', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        shipping_target_ci: shipCI,
        aviation_target_ci: aeroCI,
      }),
    });
    if (!r.ok) {
      setError('report download failed');
      return;
    }
    const blob = await r.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'maritime_aviation_bunker.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Maritime & Aviation Bunkering"
        subtitle="Least-cost fuel-mix optimization for international shipping and aviation bunkers, with marginal abatement cost comparison across sectors."
      >
        <p className="text-[11px] text-[#3D5265]/70">
          Service:{' '}
          {serviceOnline === null ? 'checking…' :
            serviceOnline ? <span className="text-[#00928F]">online</span> :
              <span className="text-[#B83230]">offline — start the pypsa-service backend</span>}
        </p>
      </PageHero>

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-8 grid grid-cols-1 lg:grid-cols-[300px,1fr] gap-6">
        {/* Controls */}
        <aside className="bg-white rounded-xl border border-grey-200 p-4 h-fit lg:sticky lg:top-[88px]">
          <h2 className="text-sm font-bold text-tertiary-dark mb-3">Carbon intensity targets</h2>

          <div className="mb-3">
            <p className="text-[11px] font-semibold text-tertiary-dark mb-1">Policy presets</p>
            <div className="grid grid-cols-1 gap-1">
              {PRESETS.map(p => {
                const active = shipCI === p.ship && aeroCI === p.aero;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setShipCI(p.ship); setAeroCI(p.aero); }}
                    title={p.note}
                    className={`text-left text-[10px] px-2 py-1 rounded border transition ${
                      active
                        ? 'bg-[#1F4E79] text-white border-[#1F4E79]'
                        : 'bg-white text-tertiary-dark border-grey-200 hover:border-[#1F4E79]'
                    }`}
                  >
                    <span className="font-semibold">{p.label}</span>
                    <span className={`block ${active ? 'text-white/80' : 'text-tertiary-light'}`}>
                      Ship {p.ship} · Aero {p.aero} kg/GJ
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <label className="block text-[11px] text-tertiary mb-1">
            Shipping: <b>{shipCI} kg CO₂e / GJ</b>
          </label>
          <p className="text-[10px] text-tertiary-light mb-1">
            FuelEU Maritime (2020 baseline 91 kg/GJ): 2030 ≈ 86, 2035 ≈ 78, 2040 ≈ 63, 2045 ≈ 35, 2050 ≈ 18
          </p>
          <input type="range" min={5} max={92} step={1}
            value={shipCI}
            onChange={e => setShipCI(+e.target.value)}
            className="w-full mb-3" />

          <label className="block text-[11px] text-tertiary mb-1">
            Aviation: <b>{aeroCI} kg CO₂e / GJ</b>
          </label>
          <p className="text-[10px] text-tertiary-light mb-1">
            ReFuelEU Aviation SAF mandate (Jet A-1 ≈ 89 kg/GJ): 2030 ≈ 85, 2035 ≈ 76, 2040 ≈ 67, 2045 ≈ 53, 2050 ≈ 35
          </p>
          <input type="range" min={5} max={92} step={1}
            value={aeroCI}
            onChange={e => setAeroCI(+e.target.value)}
            className="w-full mb-3" />

          <button
            onClick={run}
            disabled={busy || serviceOnline === false}
            className="w-full px-3 py-2.5 bg-[#1F4E79] hover:bg-[#0E3558] text-white rounded font-medium text-sm disabled:opacity-50"
          >
            {busy ? 'Solving…' : 'Re-run optimization'}
          </button>

          {data && (
            <button
              onClick={downloadReport}
              className="w-full mt-2 px-3 py-2 bg-secondary hover:bg-secondary-dark text-white rounded font-medium text-xs"
            >
              ⭳ Download PDF report
            </button>
          )}

          {error && (
            <div className="mt-3 text-[11px] text-red-700 bg-red-50 border border-red-200 rounded p-2">
              {error}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-grey-100">
            <h3 className="text-[11px] font-bold text-tertiary-dark mb-2">Scope reminder</h3>
            <p className="text-[11px] text-tertiary leading-relaxed">
              International bunkers are excluded from national inventories
              under UNFCCC rules. The EU ETS Aviation scope and FuelEU
              Maritime / ReFuelEU Aviation regulations cover part of this
              activity. This tool is limited to these international flows
              only. EU ETS was extended to maritime transport from 1 January
              2024, phased in at 40% of emissions in 2024, 70% in 2025, and
              100% from 2026 (with 50% of extra-EEA voyage emissions
              included).
            </p>
          </div>
        </aside>

        {/* Results */}
        <main className="space-y-4">
          {!data && (
            <div className="bg-white rounded-xl border border-grey-200 p-8 text-center text-tertiary">
              <p className="text-sm">
                {busy ? 'Running fuel-route optimization…' : 'Adjust targets and click re-run.'}
              </p>
            </div>
          )}

          {data && (
            <>
              {/* KPIs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[data.shipping, data.aviation].map((s, idx) => (
                  <div key={idx} className="bg-white rounded-xl border border-grey-200 p-4">
                    <h3 className="text-sm font-bold text-tertiary-dark mb-2">
                      {idx === 0 ? 'International shipping' : 'International aviation'}
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <Kpi label="Avg cost" value={`${s.avg_cost_eur_per_gj} €/GJ`} />
                      <Kpi label="Total cost" value={`${s.total_cost_beur} B€/yr`} />
                      <Kpi label="CI achieved" value={`${s.ci_kg_per_gj} kg/GJ`} />
                      <Kpi label="Residual CO₂" value={`${s.co2_mt} Mt/yr`} />
                      <Kpi label="Abatement" value={`${s.abatement_mt} Mt/yr`} />
                      <Kpi label="Demand" value={`${data.demand[s.sector]} PJ/yr`} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Fuel mixes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl border border-grey-200 p-4">
                  <div className="h-64"><canvas ref={shipMixRef} /></div>
                </div>
                <div className="bg-white rounded-xl border border-grey-200 p-4">
                  <div className="h-64"><canvas ref={aeroMixRef} /></div>
                </div>
              </div>

              {/* MAC curves */}
              <div className="bg-white rounded-xl border border-grey-200 p-4">
                <div className="h-72"><canvas ref={curveRef} /></div>
              </div>

              {/* Sector comparison */}
              <div className="bg-white rounded-xl border border-grey-200 p-4">
                <div className="h-96"><canvas ref={macRef} /></div>
                <p className="text-[10px] text-tertiary-light mt-2">
                  Bunker MAC values come from the built-in fuel-route LP above;
                  other sector values are illustrative 2030 midpoints from the
                  EC 2040 Impact Assessment, IEA NZE, and ESABCC 2040 advice.
                </p>
              </div>
            </>
          )}

          <div className="bg-white rounded-xl border border-grey-200 p-4">
            <h2 className="text-sm font-bold text-tertiary-dark mb-2">
              About the fuel-route model
            </h2>
            <p className="text-[12px] text-tertiary leading-relaxed mb-2">
              For each sector we solve a small linear programme: minimise
              total fuel cost subject to (i) meeting the annual energy demand
              and (ii) a maximum weighted-average CO<sub>2</sub>e intensity.
              Fuel options include VLSFO / MGO / LNG / bio-methanol /
              e-methanol / green ammonia / liquid H<sub>2</sub> for shipping,
              and Jet A-1 / HEFA / ATJ / FT SAF / e-kerosene / LH
              <sub>2</sub> for aviation. Each fuel has a 2030 supply-side cap
              reflecting TRL and feedstock constraints.
            </p>
            <p className="text-[11px] text-tertiary-light">
              The marginal abatement cost (MAC) shown on the curve is computed
              endogenously: for each step on the CI sweep we take the change
              in total fuel bill (B€) divided by the change in residual CO<sub>2</sub>
              (Mt), i.e. €/t CO₂ avoided relative to the previous feasible
              point on the curve. Cross-sector MAC values are exogenous and
              come from the literature listed below.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-grey-200 p-4">
            <h2 className="text-sm font-bold text-tertiary-dark mb-2">
              Data sources — fuel cost &amp; carbon intensity
            </h2>
            <p className="text-[11px] text-tertiary mb-3">
              Cost and well-to-wake CI assumptions behind each fuel in the LP.
              All values are 2030 midpoints of published ranges; update them
              in <code className="bg-grey-100 px-1 rounded">pypsa-service/app/maritime_aviation.py</code>{' '}
              (<code className="bg-grey-100 px-1 rounded">FUELS</code> dict).
            </p>

            <h3 className="text-[11px] font-bold text-tertiary-dark mt-3 mb-1">Shipping fuels</h3>
            <div className="responsive-table overflow-x-auto">
              <table className="w-full text-[10px] sm:text-[10px] border-collapse">
                <thead>
                  <tr className="bg-grey-50 text-tertiary-dark">
                    <th className="text-left p-1.5 border-b border-grey-200">Fuel</th>
                    <th className="text-left p-1.5 border-b border-grey-200">Cost</th>
                    <th className="text-left p-1.5 border-b border-grey-200">CI</th>
                    <th className="text-left p-1.5 border-b border-grey-200">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {SHIP_SOURCES.map(s => (
                    <tr key={s.fuel} className="align-top">
                      <td data-label="Fuel" className="p-1.5 border-b border-grey-100 font-medium text-tertiary-dark whitespace-nowrap">{s.fuel}</td>
                      <td data-label="Cost" className="p-1.5 border-b border-grey-100 whitespace-nowrap">{s.cost}</td>
                      <td data-label="CI" className="p-1.5 border-b border-grey-100 whitespace-nowrap">{s.ci}</td>
                      <td data-label="Source" className="p-1.5 border-b border-grey-100 text-tertiary">{s.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-[11px] font-bold text-tertiary-dark mt-4 mb-1">Aviation fuels</h3>
            <div className="responsive-table overflow-x-auto">
              <table className="w-full text-[10px] sm:text-[10px] border-collapse">
                <thead>
                  <tr className="bg-grey-50 text-tertiary-dark">
                    <th className="text-left p-1.5 border-b border-grey-200">Fuel</th>
                    <th className="text-left p-1.5 border-b border-grey-200">Cost</th>
                    <th className="text-left p-1.5 border-b border-grey-200">CI</th>
                    <th className="text-left p-1.5 border-b border-grey-200">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {AERO_SOURCES.map(s => (
                    <tr key={s.fuel} className="align-top">
                      <td data-label="Fuel" className="p-1.5 border-b border-grey-100 font-medium text-tertiary-dark whitespace-nowrap">{s.fuel}</td>
                      <td data-label="Cost" className="p-1.5 border-b border-grey-100 whitespace-nowrap">{s.cost}</td>
                      <td data-label="CI" className="p-1.5 border-b border-grey-100 whitespace-nowrap">{s.ci}</td>
                      <td data-label="Source" className="p-1.5 border-b border-grey-100 text-tertiary">{s.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-[11px] font-bold text-tertiary-dark mt-4 mb-1">
              Cross-sector MAC benchmarks (exogenous)
            </h3>
            <p className="text-[10px] text-tertiary-light mb-1">
              Used for the bar chart comparing bunker MAC against the rest of
              the EU economy. These are not re-optimised — they are illustrative
              2030 midpoints from EU / IEA / ESABCC modelling.
            </p>
            <div className="responsive-table overflow-x-auto">
              <table className="w-full text-[10px] sm:text-[10px] border-collapse">
                <thead>
                  <tr className="bg-grey-50 text-tertiary-dark">
                    <th className="text-left p-1.5 border-b border-grey-200">Sector</th>
                    <th className="text-left p-1.5 border-b border-grey-200">MAC</th>
                    <th className="text-left p-1.5 border-b border-grey-200">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {OTHER_SECTOR_SOURCES.map(s => (
                    <tr key={s.sector} className="align-top">
                      <td data-label="Sector" className="p-1.5 border-b border-grey-100 font-medium text-tertiary-dark whitespace-nowrap">{s.sector}</td>
                      <td data-label="MAC" className="p-1.5 border-b border-grey-100 whitespace-nowrap">{s.mac}</td>
                      <td data-label="Source" className="p-1.5 border-b border-grey-100 text-tertiary">{s.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <h3 className="text-[11px] font-bold text-tertiary-dark mt-4 mb-1">
              Bunker demand baseline
            </h3>
            <ul className="text-[10px] text-tertiary list-disc pl-4 space-y-0.5">
              <li>
                <b>International shipping</b> — 1,750 PJ/yr (≈ 42 Mt HFO-eq).
                Eurostat 2022 international maritime bunkers; EU MRV 2023.
              </li>
              <li>
                <b>International aviation</b> — 1,600 PJ/yr (≈ 37 Mt Jet A-1).
                Eurostat 2023 international aviation bunkers; EUROCONTROL.
              </li>
            </ul>

            <p className="text-[10px] text-tertiary-light mt-3">
              Full references: IEA <i>Net Zero by 2050</i> &amp; <i>WEO 2023</i>,
              IRENA <i>Innovation Outlook: Renewable Methanol (2021)</i> and{' '}
              <i>Renewable Ammonia (2022)</i>, Transport &amp; Environment 2023,
              DNV <i>Maritime Forecast to 2030</i>, ICCT 2021 <i>Long-term cost
              of SAF</i>, EC SWD(2024) 63 <i>2040 Climate Target Impact
              Assessment</i>, EC SWD(2021) 633 <i>ReFuelEU Aviation IA</i>,
              EC <i>FuelEU Maritime IA</i>, ESABCC <i>Scientific advice for the
              2040 target</i> (2023), IMO <i>4th GHG Study</i> (2020), Clean
              Aviation JU SRIA 2022, Fraunhofer ISE 2022.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-grey-200 p-4">
            <CommentSection policyId="maritime-aviation" />
          </div>
        </main>
      </div>
    </div>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-grey-50 rounded-lg p-2">
      <p className="text-[9px] text-tertiary uppercase tracking-wide">{label}</p>
      <p className="font-bold text-tertiary-dark text-[12px]">{value}</p>
    </div>
  );
}
