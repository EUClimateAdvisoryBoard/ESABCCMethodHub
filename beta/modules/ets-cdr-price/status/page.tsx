'use client';

/**
 * ETS Endgame & CDR Safety Valve — "Status quo of CDR in the EU" subpage.
 *
 * A reality-check companion to the interactive model: where carbon dioxide
 * removal in Europe actually stands today, the project pipeline (operational
 * / FID-taken / announced-but-pre-FID), the land sink (LULUCF), and the gap
 * between what is committed and the 68–86 Mt/yr of permanent removals the
 * Ariadne/PIK studies say the EU ETS would need for CDR to work as a price
 * safety valve.
 *
 * The figures are a CURATED, illustrative snapshot (mid-2026) compiled from
 * public sources, not an exhaustive registry. Nameplate capacities are "when
 * fully operational". Aggregate rows stand in for long tails of small
 * projects. Sources are listed at the foot of the page.
 */

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';

type Method = 'BECCS' | 'DACCS' | 'Biochar' | 'ERW' | 'Other';
type Status = 'operational' | 'fid' | 'announced';

type Project = {
  name: string;
  country: string;
  method: Method;
  cap: number; // ktCO2/yr nameplate
  status: Status;
  online: string;
  note: string;
};

const METHOD: Record<Method, { color: string; label: string; permanence: string; cost: string; blurb: string }> = {
  BECCS: {
    color: '#007B6C',
    label: 'BECCS',
    permanence: 'Permanent (geological, >1000 yr)',
    cost: '≈ €60–90/t',
    blurb: 'Bioenergy with carbon capture & storage: capture biogenic CO₂ from biomass combustion (CHP, pulp, waste-to-energy) and inject it underground. Europe’s cheapest at-scale permanent removal — but limited by sustainable biomass.',
  },
  DACCS: {
    color: '#004B7F',
    label: 'DACCS',
    permanence: 'Permanent (geological, >1000 yr)',
    cost: '≈ €110–600/t',
    blurb: 'Direct air capture with storage: pull CO₂ straight from ambient air and store it. Unlimited in principle and land-light, but today energy-hungry and expensive; Europe’s plants are still mostly pilot-scale.',
  },
  Biochar: {
    color: '#FF9933',
    label: 'Biochar',
    permanence: 'Durable (decades–centuries)',
    cost: '≈ €100–150/t',
    blurb: 'Pyrogenic carbon capture & storage: biomass pyrolysed into stable char applied to soils. The largest delivered novel-CDR category in Europe today, but shorter and less certain permanence than geological storage.',
  },
  ERW: {
    color: '#6667AB',
    label: 'Enhanced weathering',
    permanence: 'Durable (centuries+)',
    cost: '≈ €100–200/t',
    blurb: 'Spreading crushed silicate rock on land/fields to accelerate natural CO₂ mineralisation. Promising and cheap in theory; measurement, reporting & verification (MRV) is still immature.',
  },
  Other: {
    color: '#54728C',
    label: 'Other / early-stage',
    permanence: 'Varies',
    cost: 'n/a',
    blurb: 'Ocean alkalinity, mineralisation and other frontier approaches — pilot scale only.',
  },
};

const STATUS: Record<Status, { label: string; bg: string; text: string; ring: string }> = {
  operational: { label: 'Operational', bg: 'bg-surface-green', text: 'text-secondary-dark', ring: 'border-secondary/40' },
  fid: { label: 'FID / contracted', bg: 'bg-surface-blue', text: 'text-primary', ring: 'border-primary/40' },
  announced: { label: 'Announced (pre-FID)', bg: 'bg-surface-yellow', text: 'text-tertiary-dark', ring: 'border-grey-400' },
};

// Curated snapshot — see header comment. Capacities in ktCO2/yr.
const PROJECTS: Project[] = [
  { name: 'Stockholm Exergi — Värtan CHP', country: 'SE', method: 'BECCS', cap: 800, status: 'fid', online: '2028', note: 'FID Mar 2025; offtake Microsoft & Frontier; €260m EIB loan. World’s first large-scale BECCS.' },
  { name: 'Ørsted Kalundborg Hub (Asnæs + Avedøre)', country: 'DK', method: 'BECCS', cap: 430, status: 'fid', online: '2026', note: '20-yr Danish state contract (2023); biogenic CO₂ shipped to Northern Lights for storage.' },
  { name: 'Vantaa Energy waste-to-energy BECCS', country: 'FI', method: 'BECCS', cap: 350, status: 'announced', online: '2030', note: 'Biogenic share of waste-to-energy capture (planned).' },
  { name: 'Nordic pulp & bio-CHP BECCS (aggregate)', country: 'SE/FI', method: 'BECCS', cap: 3000, status: 'announced', online: '2030+', note: 'Stora Enso, UPM, Göteborg Energi and others exploring — illustrative pre-FID pipeline.' },
  { name: 'Climeworks Mammoth', country: 'IS·EEA', method: 'DACCS', cap: 36, status: 'operational', online: '2024', note: 'Largest DAC plant operating; mineral storage with Carbfix.' },
  { name: 'Climeworks Orca', country: 'IS·EEA', method: 'DACCS', cap: 4, status: 'operational', online: '2021', note: 'First commercial DAC + storage facility.' },
  { name: 'European DAC pilots (~35 plants)', country: 'DE/NL/+', method: 'DACCS', cap: 7, status: 'operational', online: '2024', note: 'Many sub-kilotonne research & pilot units across the EU.' },
  { name: 'Removr DAC scale-up', country: 'NO·EEA', method: 'DACCS', cap: 2, status: 'announced', online: '2026', note: 'Norwegian DAC demonstrator.' },
  { name: 'Large EU DACCS projects (aggregate)', country: 'EU', method: 'DACCS', cap: 1000, status: 'announced', online: '2030+', note: 'Several pre-FID projects seeking offtake/subsidy — illustrative.' },
  { name: 'European biochar (Puro.earth / Carbonfuture network)', country: 'EU', method: 'Biochar', cap: 150, status: 'operational', online: '2024', note: 'Largest delivered novel-CDR category in Europe; many distributed producers.' },
  { name: 'InPlanet & EU enhanced-weathering trials', country: 'DE/+', method: 'ERW', cap: 10, status: 'announced', online: '2026', note: 'Field-trial scale; MRV maturing.' },
  { name: 'Mineralisation & ocean CDR pilots', country: 'EU', method: 'Other', cap: 5, status: 'announced', online: '2027', note: 'Frontier approaches, early-stage.' },
];

// Land sink (kept separate — reversible, not the ETS valve).
const LULUCF = { sink2023: -198, target2030: -310, gapLow: 40, gapHigh: 55 };

// Safety-valve requirement from the Ariadne/PIK studies, plus the EU 2040 goal.
const VALVE = { low: 68, high: 86, mid: 77 };
const EU2040_INDUSTRIAL = 60; // ">60 Mt of industrial removals in 2040"

const START = 2025;
const END = 2050;
const YEARS = Array.from({ length: END - START + 1 }, (_, i) => START + i);
const fmt = (n: number, d = 0) => n.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/* ---- compact SVG line chart (committed capacity vs the valve trajectory) ---- */

type Series = { label: string; color: string; dash?: boolean; points: { x: number; y: number }[] };

function LineChart({ series, yMax, yLabel, height = 280 }: { series: Series[]; yMax: number; yLabel: string; height?: number }) {
  const W = 720;
  const H = height;
  const m = { l: 46, r: 16, t: 16, b: 28 };
  const iw = W - m.l - m.r;
  const ih = H - m.t - m.b;
  const sx = (x: number) => m.l + ((x - START) / (END - START)) * iw;
  const sy = (y: number) => m.t + ih - (Math.min(y, yMax) / yMax) * ih;
  const xticks = [2025, 2030, 2035, 2040, 2045, 2050];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={yLabel}>
      {Array.from({ length: 6 }, (_, i) => {
        const v = (yMax / 5) * i;
        const y = sy(v);
        return (
          <g key={i}>
            <line x1={m.l} x2={W - m.r} y1={y} y2={y} stroke="#E6E7E8" />
            <text x={m.l - 6} y={y + 3} textAnchor="end" fontSize={10} className="fill-grey-500">{fmt(v)}</text>
          </g>
        );
      })}
      {xticks.map((yr) => (
        <text key={yr} x={sx(yr)} y={H - 9} textAnchor="middle" fontSize={10} className="fill-grey-500">{yr}</text>
      ))}
      <text x={m.l} y={m.t - 4} fontSize={10} className="fill-tertiary">{yLabel}</text>
      {series.map((s) => (
        <path
          key={s.label}
          d={s.points.map((p, i) => `${i ? 'L' : 'M'} ${sx(p.x).toFixed(1)} ${sy(p.y).toFixed(1)}`).join(' ')}
          fill="none"
          stroke={s.color}
          strokeWidth={2.25}
          strokeDasharray={s.dash ? '5 4' : undefined}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}

export default function CdrStatusPage() {
  const [includeAnnounced, setIncludeAnnounced] = useState(false);

  const sums = useMemo(() => {
    const by = (s: Status) => PROJECTS.filter((p) => p.status === s).reduce((a, b) => a + b.cap, 0) / 1000;
    const op = by('operational');
    const fid = by('fid');
    const ann = by('announced');
    return { op, fid, ann, committed: op + fid, pipeline: op + fid + ann };
  }, []);

  const counted = includeAnnounced ? sums.pipeline : sums.committed;
  const fidGap = VALVE.mid - counted;
  const scaleFactor = counted > 0 ? VALVE.mid / counted : Infinity;

  // upscaling trajectories
  const committedLine = useMemo(() => {
    // operational by 2025, FID online ramped to 2028, announced (if counted) ramped to 2032, then flat
    return YEARS.map((t) => {
      let v = sums.op;
      v += sums.fid * Math.min(1, Math.max(0, (t - 2025) / 3)); // ramps 2025→2028
      if (includeAnnounced) v += sums.ann * Math.min(1, Math.max(0, (t - 2027) / 5)); // ramps 2027→2032
      return { x: t, y: v };
    });
  }, [sums, includeAnnounced]);

  const valveLine = useMemo(
    () => YEARS.map((t) => ({ x: t, y: VALVE.mid * Math.min(1, Math.max(0, (t - 2031) / (END - 2031))) })),
    [],
  );

  const upMax = Math.ceil(VALVE.high / 10) * 10;

  // gap bars (Mt/yr)
  const bars = [
    { label: 'Operational today', mt: sums.op, color: '#54728C', note: 'engineered/novel CDR running now' },
    { label: '+ FID / contracted', mt: sums.committed, color: '#004B7F', note: 'financed & under construction' },
    { label: '+ Announced pipeline', mt: sums.pipeline, color: '#478EA5', note: 'incl. pre-FID projects' },
    { label: 'EU 2040 industrial-removal goal', mt: EU2040_INDUSTRIAL, color: '#FF9933', note: '">60 Mt" in the 2040 target', target: true },
    { label: 'Safety-valve need by 2050', mt: VALVE.mid, color: '#B83230', note: `${VALVE.low}–${VALVE.high} Mt/yr (Ariadne/PIK)`, target: true, range: [VALVE.low, VALVE.high] as [number, number] },
  ];
  const barMax = Math.ceil(VALVE.high / 10) * 10;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 sm:py-8">
        <Link href="/beta/ets-cdr-price" className="mb-3 inline-flex items-center gap-1.5 text-xs text-secondary hover:text-primary sm:text-sm">
          ← Back to the ETS Endgame &amp; CDR Safety Valve model
        </Link>

        <div className="mb-2 text-[11px] uppercase tracking-[0.12em] text-tertiary">Status quo · curated snapshot (mid-2026)</div>
        <h1 className="text-2xl font-bold text-tertiary-dark sm:text-3xl">The state of carbon removal in the EU</h1>
        <p className="mt-2 max-w-3xl text-sm text-tertiary sm:text-base">
          The model next door assumes permanent removals can be scaled into a price safety valve. This page asks the
          blunt question: <strong>where is CDR in Europe actually today?</strong> It maps the land sink, the operational
          plants, what has reached a final investment decision (FID), the pre-FID pipeline — and the distance still to
          climb to reach the <strong>{VALVE.low}–{VALVE.high} Mt/yr</strong> of permanent removals the studies say the
          valve needs by 2050.
        </p>

        {/* KPI strip */}
        <section className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {[
            { l: 'Operational novel CDR', v: `${fmt(sums.op, 2)} Mt/yr`, s: 'biochar + DAC running now' },
            { l: 'Permanent CDR with FID', v: `${fmt(sums.committed, 1)} Mt/yr`, s: 'Stockholm Exergi + Ørsted' },
            { l: 'Safety-valve need 2050', v: `${VALVE.low}–${VALVE.high} Mt/yr`, s: 'Ariadne / PIK LIMES-EU' },
            { l: 'LULUCF land sink 2023', v: `${fmt(LULUCF.sink2023)} Mt`, s: `target ${fmt(LULUCF.target2030)} Mt by 2030` },
          ].map((c) => (
            <div key={c.l} className="rounded-lg border border-grey-200 bg-grey-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-[0.08em] text-tertiary">{c.l}</p>
              <p className="mt-0.5 font-mono text-lg font-bold text-tertiary-dark tabular-nums">{c.v}</p>
              <p className="text-[10.5px] text-tertiary">{c.s}</p>
            </div>
          ))}
        </section>

        {/* THE GAP */}
        <section className="mt-8 rounded-lg border border-grey-200 bg-white p-4">
          <h2 className="text-[15px] font-bold text-tertiary-dark">The gap to a working valve</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            Permanent removals in Europe (BECCS, DACCS, biochar, weathering) — what exists, what is financed, what is
            merely announced — set against the EU&rsquo;s 2040 industrial-removal goal and the safety-valve requirement.
            The bars are annual capacity in Mt CO₂/yr.
          </p>
          <div className="mt-4 space-y-2.5">
            {bars.map((b) => (
              <div key={b.label} className="grid grid-cols-[180px_1fr_auto] items-center gap-2 sm:grid-cols-[230px_1fr_auto]">
                <span className={`text-[11.5px] leading-tight ${b.target ? 'font-bold text-tertiary-dark' : 'text-tertiary'}`}>{b.label}</span>
                <div className="relative h-5 rounded bg-grey-100">
                  <div
                    className="absolute inset-y-0 left-0 rounded"
                    style={{ width: `${Math.max(0.6, (b.mt / barMax) * 100)}%`, backgroundColor: b.color, opacity: b.target ? 0.95 : 0.85 }}
                  />
                  {b.range && (
                    <div
                      className="absolute inset-y-0 rounded border-2 border-dashed"
                      style={{ left: `${(b.range[0] / barMax) * 100}%`, width: `${((b.range[1] - b.range[0]) / barMax) * 100}%`, borderColor: b.color }}
                    />
                  )}
                </div>
                <span className="w-24 text-right font-mono text-[11.5px] tabular-nums text-tertiary-dark">
                  {b.mt < 1 ? fmt(b.mt, 2) : fmt(b.mt, b.mt < 10 ? 1 : 0)} Mt
                </span>
              </div>
            ))}
          </div>
          <div className="mt-4 rounded-md bg-surface-orange p-3 text-[12px] leading-relaxed text-tertiary-dark">
            Today&rsquo;s <strong>FID-backed</strong> permanent CDR is about <strong>{fmt(sums.committed, 1)} Mt/yr</strong>.
            To act as the valve the studies model — <strong>{VALVE.mid} Mt/yr</strong> by 2050 — Europe needs roughly a{' '}
            <strong>{fmt(scaleFactor, 0)}×</strong> scale-up, an extra <strong>~{fmt(fidGap, 0)} Mt/yr</strong>. That
            distance — between what is bankable now and what the price signal must call forth — is exactly the
            investment gap a credible ETS-CDR sequencing path is meant to close.
          </div>
        </section>

        {/* UPSCALING */}
        <section className="mt-8 rounded-lg border border-grey-200 bg-white p-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-bold text-tertiary-dark">Upscaling: committed capacity vs the valve trajectory</h2>
            <label className="inline-flex items-center gap-1.5 text-[11px] text-tertiary">
              <input type="checkbox" checked={includeAnnounced} onChange={(e) => setIncludeAnnounced(e.target.checked)} className="accent-primary" />
              include announced (pre-FID) pipeline
            </label>
          </div>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            The committed line is today&rsquo;s operational plants plus projects that have reached FID
            {includeAnnounced ? ', plus the announced pipeline' : ''}. The dashed line is the ramp to {VALVE.mid} Mt/yr
            the valve needs (admission from ~2031, the model&rsquo;s default). The widening gap is the build-out the ETS
            price signal has to finance.
          </p>
          <LineChart
            yMax={upMax}
            yLabel="Mt CO₂/yr"
            series={[
              { label: 'Committed', color: '#007B6C', points: committedLine },
              { label: 'Valve need', color: '#B83230', dash: true, points: valveLine },
            ]}
          />
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-tertiary">
            <span className="inline-flex items-center gap-1.5">
              <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#007B6C" strokeWidth="3" /></svg>
              Committed capacity {includeAnnounced ? '(+ announced)' : '(operational + FID)'}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <svg width="22" height="8"><line x1="0" y1="4" x2="22" y2="4" stroke="#B83230" strokeWidth="3" strokeDasharray="4 3" /></svg>
              Trajectory needed for the valve
            </span>
          </div>
        </section>

        {/* PROJECT TABLE */}
        <section className="mt-8 rounded-lg border border-grey-200 bg-white p-4">
          <h2 className="text-[15px] font-bold text-tertiary-dark">Project pipeline</h2>
          <p className="mt-1 text-[12px] text-tertiary">
            A curated, non-exhaustive snapshot. Capacities are nameplate (when fully operational); aggregate rows stand
            in for long tails of small projects. EEA = Iceland/Norway (in the carbon market&rsquo;s neighbourhood, not the EU-27).
          </p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                <tr className="border-b border-grey-300 text-left text-[10.5px] uppercase tracking-[0.06em] text-tertiary">
                  <th className="py-1.5 pr-3 font-semibold">Project</th>
                  <th className="px-2 font-semibold">Country</th>
                  <th className="px-2 font-semibold">Method</th>
                  <th className="px-2 text-right font-semibold">ktCO₂/yr</th>
                  <th className="px-2 font-semibold">Status</th>
                  <th className="px-2 font-semibold">Online</th>
                </tr>
              </thead>
              <tbody>
                {[...PROJECTS].sort((a, b) => b.cap - a.cap).map((pr) => (
                  <tr key={pr.name} className="border-b border-grey-100 align-top">
                    <td className="py-2 pr-3">
                      <div className="font-semibold text-tertiary-dark">{pr.name}</div>
                      <div className="text-[10.5px] leading-snug text-tertiary">{pr.note}</div>
                    </td>
                    <td className="px-2 font-mono text-[11px] text-tertiary">{pr.country}</td>
                    <td className="px-2">
                      <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: METHOD[pr.method].color }}>
                        {METHOD[pr.method].label}
                      </span>
                    </td>
                    <td className="px-2 text-right font-mono tabular-nums text-tertiary-dark">{fmt(pr.cap)}</td>
                    <td className="px-2">
                      <span className={`inline-block whitespace-nowrap rounded border px-1.5 py-0.5 text-[10px] font-semibold ${STATUS[pr.status].bg} ${STATUS[pr.status].text} ${STATUS[pr.status].ring}`}>
                        {STATUS[pr.status].label}
                      </span>
                    </td>
                    <td className="px-2 font-mono text-[11px] text-tertiary">{pr.online}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* METHODS */}
        <section className="mt-8">
          <h2 className="text-[15px] font-bold text-tertiary-dark">The removal methods, compared</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {(Object.keys(METHOD) as Method[]).map((mk) => {
              const m = METHOD[mk];
              return (
                <div key={mk} className="rounded-lg border border-grey-200 bg-white p-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: m.color }} />
                    <span className="text-[13px] font-bold text-tertiary-dark">{m.label}</span>
                  </div>
                  <p className="mt-1 text-[11.5px] leading-relaxed text-tertiary">{m.blurb}</p>
                  <p className="mt-1.5 font-mono text-[10.5px] text-tertiary">
                    {m.permanence} · cost {m.cost}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* LULUCF */}
        <section className="mt-8 rounded-lg border border-grey-200 bg-surface-green p-4">
          <h2 className="text-[15px] font-bold text-tertiary-dark">The land sink (LULUCF) — and why it is not the valve</h2>
          <p className="mt-1 max-w-3xl text-[12px] leading-relaxed text-tertiary">
            By far the EU&rsquo;s largest carbon removal is still its forests and soils: a net sink of about{' '}
            <strong>{fmt(-LULUCF.sink2023)} Mt CO₂</strong> in 2023. But the sink has been{' '}
            <strong>shrinking</strong> — more harvesting, slower forest growth, fires, drought and pests — and Member
            State projections leave a <strong>{LULUCF.gapLow}–{LULUCF.gapHigh} Mt</strong> gap to the EU&rsquo;s{' '}
            <strong>{fmt(-LULUCF.target2030)} Mt</strong> removal target for 2030. Crucially, this sink is{' '}
            <strong>reversible</strong> (a fire can release it) and is governed under the separate LULUCF Regulation —
            so it cannot back a tradable allowance. The price safety valve in the model relies specifically on{' '}
            <strong>permanent, verifiable</strong> removals (BECCS/DACCS), which is why the tiny engineered numbers
            above — not the large land sink — are the ones that matter for the ETS endgame.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[
              { l: 'Net sink 2023', v: `${fmt(LULUCF.sink2023)} Mt` },
              { l: '2030 target', v: `${fmt(LULUCF.target2030)} Mt` },
              { l: 'Gap to target', v: `${LULUCF.gapLow}–${LULUCF.gapHigh} Mt` },
            ].map((c) => (
              <div key={c.l} className="rounded-md bg-white/70 p-2 text-center">
                <p className="font-mono text-base font-bold text-tertiary-dark">{c.v}</p>
                <p className="text-[10px] text-tertiary">{c.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* tie-back */}
        <section className="mt-8 rounded-lg border border-primary/30 bg-surface-blue p-4">
          <h2 className="text-[15px] font-bold text-tertiary-dark">What this means for the model next door</h2>
          <ul className="mt-2 space-y-1.5 text-[12px] leading-relaxed text-tertiary">
            <li>• The model&rsquo;s <em>physical CDR availability</em> slider asks you to assume tens of Mt/yr by 2050. Reality today: ~{fmt(sums.committed, 1)} Mt/yr with FID. The default ramp is an <strong>aspiration</strong>, not a baseline.</li>
            <li>• The <em>CDR capacity ramp starts</em> and <em>admission year</em> levers matter precisely because the build-out is slow: a plant takes ~3–5 years from FID to operation (Stockholm Exergi: FID 2025 → online 2028).</li>
            <li>• Set the model&rsquo;s availability near today&rsquo;s pipeline and the safety valve barely bites — the price still spikes. That is the real-world warning behind the &ldquo;delayed CDR&rdquo; scenario.</li>
            <li>• Biomass limits are real: most committed capacity is BECCS, which competes for sustainable biomass — the studies&rsquo; reason for a <em>limited</em> admitted volume rather than an open valve.</li>
          </ul>
          <Link href="/beta/ets-cdr-price" className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-primary bg-white px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-primary hover:text-white">
            ← Try it in the interactive model
          </Link>
        </section>

        {/* sources */}
        <section className="mt-8 max-w-3xl space-y-2 border-t border-grey-200 pt-4 text-[11px] leading-relaxed text-tertiary">
          <p className="text-[12px] font-bold text-tertiary-dark">Sources &amp; caveats</p>
          <p>
            Curated, illustrative snapshot (mid-2026) — not an exhaustive registry. Capacities are nameplate; aggregate
            rows approximate long tails of small projects and should be read as orders of magnitude. EEA projects
            (Iceland, Norway) are shown for context. Figures drawn from: EU Climate Action Progress Report 2025 &amp; EEA
            (LULUCF land sink and 2030 target); Stockholm Exergi / EIB / Capsol (BECCS FID, 800 kt, 2028); Ørsted
            (Kalundborg 430 kt, 2026); IEA DAC database &amp; AlliedOffsets / European Parliament STUD 2025 (European DAC
            capacity); Puro.earth / Carbonfuture (biochar); EU 2040 Climate Target Communication &amp; Industrial Carbon
            Management Strategy (2040 industrial-removal goal); and the Ariadne dossier &amp; Sultani et&nbsp;al. (Joule
            2026, LIMES-EU) for the 68–86 Mt/yr safety-valve requirement.
          </p>
          <ul className="space-y-1">
            <li>
              EU land-use progress:{' '}
              <a className="text-primary underline" href="https://climate.ec.europa.eu/eu-action/climate-strategies-targets/progress-climate-action/eu-climate-action-progress-report-2025/chapter-4-land-use-sector_en" target="_blank" rel="noreferrer">climate.ec.europa.eu</a>
            </li>
            <li>
              Stockholm Exergi BECCS FID:{' '}
              <a className="text-primary underline" href="https://www.eib.org/en/press/all/2025-172-eib-finances-ground-breaking-carbon-capture-plant-in-stockholm" target="_blank" rel="noreferrer">eib.org</a>{' '}
              · Ørsted Kalundborg:{' '}
              <a className="text-primary underline" href="https://orsted.com/en/media/news/2023/05/20230515676011" target="_blank" rel="noreferrer">orsted.com</a>
            </li>
            <li>
              EU 2040 target &amp; removals:{' '}
              <a className="text-primary underline" href="https://tracker.carbongap.org/policy/2040-targets/" target="_blank" rel="noreferrer">tracker.carbongap.org</a>{' '}
              · DAC in the EU:{' '}
              <a className="text-primary underline" href="https://www.europarl.europa.eu/RegData/etudes/STUD/2025/772474/ECTI_STU(2025)772474_EN.pdf" target="_blank" rel="noreferrer">European Parliament (2025)</a>
            </li>
          </ul>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
