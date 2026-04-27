'use client';
import { useState, useRef, useEffect } from 'react';
import CommentSection from '@/components/CommentSection';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';
import Chart from 'chart.js/auto';

// ── NGFS Scenarios ──────────────────────────────────────────────────────
const NGFS_SCENARIOS = [
  { id: 'nz2050', name: 'Net Zero 2050', type: 'Orderly', transition: 'High', physical: 'Low', color: '#007B6C',
    desc: 'Ambitious, immediate policy action. 1.5°C pathway with smooth transition. Carbon price reaches ~$250-300/tCO2 by 2030.' },
  { id: 'below2', name: 'Below 2°C', type: 'Orderly', transition: 'Moderate', physical: 'Moderate', color: '#0065A4',
    desc: 'Gradual tightening of policies. 67% chance of limiting warming below 2°C. Carbon price $100/tCO2 by 2030.' },
  { id: 'fragworld', name: 'Fragmented World', type: 'Disorderly', transition: 'High', physical: 'High', color: '#6667AB',
    desc: 'Delayed and divergent climate ambition globally. Countries with net-zero targets only partially achieve them. End-of-century warming ~2.3°C.' },
  { id: 'lowdem', name: 'Low Demand', type: 'Orderly', transition: 'Low', physical: 'Low', color: '#16A34A',
    desc: 'Significant behavioural changes reduce energy demand, complementing carbon pricing and technology. Reaches net zero around 2050 with lower economic pressure.' },
  { id: 'delayed', name: 'Delayed Transition', type: 'Disorderly', transition: 'Very High', physical: 'Moderate', color: '#A530B8',
    desc: 'Action delayed until 2030 then rapid. Sudden repricing of assets. Carbon price spike >$300/tCO2 by 2035.' },
  { id: 'ndc', name: 'NDCs (Current Pledges)', type: 'Hot House', transition: 'Low', physical: 'High', color: '#FF9933',
    desc: 'Only existing NDC pledges implemented. ~2.5°C warming. Rising physical damages but limited transition risk.' },
  { id: 'curpol', name: 'Current Policies', type: 'Hot House', transition: 'Minimal', physical: 'Very High', color: '#B83230',
    desc: 'No new policies beyond existing. ~3°C+ warming. Severe physical risk. GDP losses accelerate after 2050.' },
];

// ── GDP damage data ─────────────────────────────────────────────────────
// Source: NGFS Phase IV (2023), Burke/Hsiang damage function.
// Note: Phase V (Nov 2024) projected 2–4× higher physical damages using
// Kotz et al. (2024), but that paper was retracted from Nature in late 2025.
// Values below use Phase IV as the more reliable baseline.
const GDP_DAMAGE_DATA = {
  years: [2030, 2040, 2050, 2060, 2070, 2080, 2090, 2100],
  scenarios: [
    { label: 'Net Zero 2050', data: [0.5, 1.0, 2.0, 2.8, 3.5, 4.0, 4.3, 4.5], color: '#007B6C' },
    { label: 'Below 2°C', data: [0.5, 1.2, 2.5, 3.8, 5.0, 6.0, 6.8, 7.5], color: '#0065A4' },
    { label: 'Current Policies', data: [0.5, 1.5, 5.0, 7.5, 9.0, 10.5, 12.0, 13.0], color: '#B83230' },
  ],
};

// ── Insurance gap data ──────────────────────────────────────────────────
const INSURANCE_DATA = {
  years: ['2000', '2005', '2010', '2015', '2020', '2024'],
  totalLoss: [10, 14, 16, 22, 32, 42],
  insuredLoss: [3, 4, 5, 6, 8, 11],
};

// ── Green bond data ─────────────────────────────────────────────────────
const GREEN_BONDS = {
  years: ['2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
  issuance: [10, 25, 45, 65, 90, 180, 160, 200, 314, 235],
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

function ExportBar({ id }: { id: string }) {
  const download = (fmt: string) => {
    const canvas = document.getElementById(id)?.querySelector('canvas');
    if (!canvas) return;
    if (fmt === 'png') canvas.toBlob(b => { if (b) { const a = document.createElement('a'); a.href = URL.createObjectURL(b); a.download = `${id}.png`; a.click(); } });
  };
  return (
    <div className="flex gap-1.5 mt-2">
      <button onClick={() => download('png')} className="text-[10px] px-2 py-0.5 rounded bg-grey-100 text-tertiary hover:bg-grey-200 transition">PNG</button>
    </div>
  );
}

export default function ClimateFinancePage() {
  const gdpRef = useRef<HTMLCanvasElement>(null);
  const insuranceRef = useRef<HTMLCanvasElement>(null);
  const greenBondRef = useRef<HTMLCanvasElement>(null);
  const sectorRef = useRef<HTMLCanvasElement>(null);

  useChart(gdpRef, () => ({
    type: 'line',
    data: {
      labels: GDP_DAMAGE_DATA.years,
      datasets: GDP_DAMAGE_DATA.scenarios.map(s => ({
        label: s.label, data: s.data, borderColor: s.color, backgroundColor: s.color + '20',
        fill: true, tension: 0.3, pointRadius: 3,
      })),
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'EU GDP Loss from Climate Damages (% of GDP)', font: { size: 13 } }, legend: { position: 'bottom' as const } },
      scales: { y: { title: { display: true, text: '% GDP loss' }, min: 0 } },
    },
  }), []);

  useChart(insuranceRef, () => ({
    type: 'bar',
    data: {
      labels: INSURANCE_DATA.years,
      datasets: [
        { label: 'Total Climate Losses', data: INSURANCE_DATA.totalLoss, backgroundColor: '#B8323088', borderColor: '#B83230', borderWidth: 1 },
        { label: 'Insured Losses', data: INSURANCE_DATA.insuredLoss, backgroundColor: '#007B6C88', borderColor: '#007B6C', borderWidth: 1 },
      ],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'EU Climate Losses: Total vs Insured (€ billion)', font: { size: 13 } }, legend: { position: 'bottom' as const } },
      scales: { y: { title: { display: true, text: '€ billion' } } },
    },
  }), []);

  useChart(greenBondRef, () => ({
    type: 'bar',
    data: {
      labels: GREEN_BONDS.years,
      datasets: [{ label: 'EU Green Bond Issuance', data: GREEN_BONDS.issuance, backgroundColor: '#007B6C', borderRadius: 3 }],
    },
    options: {
      responsive: true,
      plugins: { title: { display: true, text: 'EU Green Bond Issuance (€ billion)', font: { size: 13 } }, legend: { display: false } },
      scales: { y: { title: { display: true, text: '€ billion' } } },
    },
  }), []);

  useChart(sectorRef, () => ({
    type: 'bar',
    data: {
      labels: ['Fossil fuels', 'Real estate', 'Agriculture', 'Transport', 'Manufacturing', 'Utilities'],
      datasets: [
        { label: 'Physical risk exposure', data: [15, 25, 30, 12, 18, 22], backgroundColor: '#B83230' },
        { label: 'Transition risk exposure', data: [45, 10, 8, 20, 15, 30], backgroundColor: '#6667AB' },
      ],
    },
    options: {
      responsive: true, indexAxis: 'y' as const,
      plugins: { title: { display: true, text: 'EU Bank Sector Exposure to Climate Risks (%)', font: { size: 13 } }, legend: { position: 'bottom' as const } },
      scales: { x: { title: { display: true, text: '% of sector loans at risk' }, stacked: true }, y: { stacked: true } },
    },
  }), []);

  return (
    <div className="min-h-screen bg-white">
      <SiteHeader />
      <PageHero
        title="Climate Finance"
        subtitle="NGFS scenarios, climate damage projections, insurance gaps, green bonds and central bank stress tests."
      />

      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-10 space-y-8">

        {/* ── NGFS Scenarios ──────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">NGFS Climate Scenarios</h2>
          <p className="text-sm text-tertiary mb-4">The Network for Greening the Financial System defines 7 reference scenarios for climate financial risk assessment. Source: NGFS Phase 5 (2024).</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {NGFS_SCENARIOS.map(s => (
              <div key={s.id} className="bg-white rounded-lg border border-grey-200 overflow-hidden hover:shadow-md transition">
                <div className="h-1.5" style={{ backgroundColor: s.color }} />
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-tertiary-dark">{s.name}</h3>
                    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                      s.type === 'Orderly' ? 'bg-green-50 text-green-700' :
                      s.type === 'Disorderly' ? 'bg-amber-50 text-amber-700' :
                      'bg-red-50 text-red-700'
                    }`}>{s.type}</span>
                  </div>
                  <p className="text-xs text-tertiary leading-relaxed mb-3">{s.desc}</p>
                  <div className="flex gap-3 text-[10px]">
                    <span className="text-tertiary-dark"><span className="font-semibold">Transition:</span> {s.transition}</span>
                    <span className="text-tertiary-dark"><span className="font-semibold">Physical:</span> {s.physical}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Climate Damage Charts ──────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-4">Climate Damage Projections</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div id="chart-gdp" className="bg-white rounded-lg border border-grey-200 p-4">
              <canvas ref={gdpRef} />
              <ExportBar id="chart-gdp" />
            </div>
            <div id="chart-sector" className="bg-white rounded-lg border border-grey-200 p-4">
              <canvas ref={sectorRef} />
              <ExportBar id="chart-sector" />
            </div>
          </div>
          <p className="text-[10px] text-grey-400 mt-2">Sources: NGFS Phase IV (2023); Phase V physical risk estimates under review following Kotz et al. retraction. ECB Fit-for-55 Climate Scenario Analysis 2024, Swiss Re sigma 2024</p>
        </section>

        {/* ── Insurance Gap ──────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">Insurance & Insurability</h2>
          <p className="text-sm text-tertiary mb-4">Only ~20% of climate-related losses in the EU are insured (ECB/EIOPA 2024) — the &ldquo;protection gap&rdquo; is widening as extreme events intensify.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Protection gap', value: '~80%', sub: 'Of EU climate losses are uninsured', color: '#B83230' },
              { label: 'Annual weather losses', value: '€44.9 bn', sub: 'EU average 2020-2024 (EEA 2024 prices)', color: '#FF9933' },
              { label: 'Insurance penetration', value: '23-35%', sub: 'Varies by country (FR ~75% vs RO ~5%)', color: '#004B7F' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-lg border border-grey-200 p-4">
                <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
                <p className="text-xs font-semibold text-tertiary-dark">{m.label}</p>
                <p className="text-[10px] text-tertiary">{m.sub}</p>
              </div>
            ))}
          </div>

          <div id="chart-insurance" className="bg-white rounded-lg border border-grey-200 p-4">
            <canvas ref={insuranceRef} />
            <ExportBar id="chart-insurance" />
          </div>
          <p className="text-[10px] text-grey-400 mt-2">Sources: EIOPA, Swiss Re sigma, Munich Re NatCatSERVICE, ECB/ESRB Report on Insurance Protection Gap 2024</p>
        </section>

        {/* ── Green Finance ───────────────────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-2">Green Finance & EU Taxonomy</h2>
          <p className="text-sm text-tertiary mb-4">EU green bond issuance and sustainable finance flows. The EU Green Deal requires an estimated additional investment of €620 billion/year.</p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            {[
              { label: 'Green Deal investment gap', value: '€620 bn/yr', sub: 'Additional annual investment needed', color: '#007B6C' },
              { label: 'NextGenerationEU green bonds', value: '~€78.5 bn', sub: 'Outstanding (Aug 2025); broader EU green bond market ~€1 tn cumulative issuance', color: '#6667AB' },
              { label: 'Taxonomy-aligned capex', value: '~16%', sub: 'Of EU corporate capex is Taxonomy-aligned (EY Barometer 2025)', color: '#004B7F' },
            ].map(m => (
              <div key={m.label} className="bg-white rounded-lg border border-grey-200 p-4">
                <p className="text-2xl font-bold" style={{ color: m.color }}>{m.value}</p>
                <p className="text-xs font-semibold text-tertiary-dark">{m.label}</p>
                <p className="text-[10px] text-tertiary">{m.sub}</p>
              </div>
            ))}
          </div>

          <div id="chart-greenbond" className="bg-white rounded-lg border border-grey-200 p-4">
            <canvas ref={greenBondRef} />
            <ExportBar id="chart-greenbond" />
          </div>
          <p className="text-[10px] text-grey-400 mt-2">Sources: Climate Bonds Initiative, European Commission, ECB</p>
        </section>

        {/* ── Central Bank Stress Tests ───────────────────────────── */}
        <section>
          <h2 className="text-lg font-bold text-tertiary-dark mb-3">ECB Climate Stress Test Results</h2>
          <div className="bg-white rounded-lg border border-grey-200 p-5 space-y-4">
            <p className="text-sm text-tertiary">
              The joint ESA/ECB 2024 Fit-for-55 climate scenario analysis assessed 110 banks, 2,331 insurers and 629 IORPs under ESRB-developed scenarios.
              Key findings for the EU banking sector:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { title: 'Transition risk losses', value: '€70 bn', desc: 'Cumulative credit losses under disorderly transition by 2030. Energy-intensive sectors most affected.' },
                { title: 'Physical risk exposure', value: '€175 bn', desc: 'Loan portfolio exposed to flood, heat, and drought risk. Southern European banks most vulnerable.' },
                { title: 'Stranded asset risk', value: '€250 bn', desc: 'Fossil fuel-related assets at risk of stranding. Oil & gas loans face 20-30% impairment under Net Zero.' },
                { title: 'Adaptation investment', value: '€40 bn/yr', desc: 'Additional lending needed for climate-resilient infrastructure. Currently underfunded by 60%.' },
              ].map(item => (
                <div key={item.title} className="border border-grey-200 rounded p-4">
                  <p className="text-xl font-bold text-accent-violet">{item.value}</p>
                  <p className="text-xs font-bold text-tertiary-dark mb-1">{item.title}</p>
                  <p className="text-xs text-tertiary">{item.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-grey-400">Sources: ECB Fit-for-55 Climate Scenario Analysis 2024, ECB/EIOPA, EBA Risk Assessment 2024</p>
          </div>
        </section>

        {/* ── Sources ─────────────────────────────────────────────── */}
        <section className="bg-surface-blue rounded-lg p-5">
          <h2 className="text-sm font-bold text-tertiary-dark mb-3">Sources & Methodology</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-tertiary">
            {[
              { name: 'NGFS', desc: 'Climate scenarios for central banks and supervisors (Phase 5, 2024)' },
              { name: 'ECB', desc: 'Climate stress test results and financial stability reviews' },
              { name: 'EIOPA', desc: 'Insurance protection gap analysis and Solvency II climate scenarios' },
              { name: 'Swiss Re sigma', desc: 'Natural catastrophe loss data and insurance market analysis' },
              { name: 'Munich Re', desc: 'NatCatSERVICE — global natural disaster loss database' },
              { name: 'European Commission', desc: 'Sustainable finance strategy, EU Taxonomy, Green Bond Standard' },
            ].map(s => (
              <div key={s.name} className="flex gap-2">
                <span className="font-semibold text-tertiary-dark shrink-0">{s.name}:</span><span>{s.desc}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── Comments ────────────────────────────────────────────── */}
        <section className="bg-white rounded-lg border border-grey-200 p-5">
          <CommentSection policyId="climate-finance" />
        </section>
      </div>
    </div>
  );
}
