'use client';
import { useState } from 'react';
import { Tooltip } from '@/components/ui/Tooltip';

/** Inline indicator metadata for chips in activity boxes. */
const INDICATOR_INFO: Record<string, { name: string; detail: string }> = {
  E2:  { name: 'Fossil-fuel share',       detail: 'Share of fossil fuels in primary energy supply (gross inland consumption). Target: phase-out by 2040–50.' },
  E3:  { name: 'Renewables share',         detail: 'Share of renewables in gross final energy consumption. EU target: ≥42.5 % by 2030 (RED III).' },
  E6:  { name: 'Methane emissions',        detail: 'Methane emissions from fossil-fuel extraction, processing and distribution. Tracked under the EU Methane Regulation.' },
  E4a: { name: 'Solar PV capacity',        detail: 'Installed solar PV capacity (GW). EU Solar Strategy target: 600 GW by 2030.' },
  E4b: { name: 'Wind capacity',            detail: 'Installed onshore + offshore wind capacity (GW). REPowerEU target: 510 GW wind by 2030.' },
  E5:  { name: 'Grid investment',          detail: 'Investment in electricity grids, storage and interconnectors enabling system integration of variable RES.' },
  O2:  { name: 'Final energy demand',      detail: 'Final energy consumption and primary-energy intensity. EED 2023 target: −11.7 % final demand vs 2020 reference by 2030.' },
  E1:  { name: 'GHG supply intensity',     detail: 'GHG intensity of the energy-supply sector (tCO₂eq/TJ). Tracks progress toward a net-zero electricity mix.' },
  E7:  { name: 'Infrastructure resilience',detail: 'New adaptation indicator tracking physical resilience of energy infrastructure to climate hazards (EUCRA, EEA 2024).' },
};

function IndicatorChip({ codes, x, y, w }: { codes: string[]; x: number; y: number; w: number }) {
  return (
    <foreignObject x={x} y={y} width={w} height={22} overflow="visible">
      <div
        // @ts-expect-error – xmlns required for foreignObject HTML content
        xmlns="http://www.w3.org/1999/xhtml"
        style={{ display: 'flex', gap: 3, justifyContent: 'center', flexWrap: 'wrap' }}
      >
        {codes.map((code) => {
          const info = INDICATOR_INFO[code];
          return (
            <Tooltip
              key={code}
              content={
                info ? (
                  <span style={{ display: 'block', maxWidth: 240 }}>
                    <span style={{ display: 'block', fontWeight: 600, lineHeight: 1.3 }}>{code} — {info.name}</span>
                    <span style={{ display: 'block', fontSize: 10, marginTop: 3, opacity: 0.9 }}>{info.detail}</span>
                  </span>
                ) : code
              }
            >
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center',
                  background: '#fff', borderRadius: 4,
                  padding: '1px 5px', fontSize: 10,
                  fontFamily: 'monospace', fontWeight: 700,
                  color: '#1a1a18', cursor: 'help',
                  boxShadow: '0 0 0 1px rgba(0,0,0,0.12)',
                }}
              >
                {code}
              </span>
            </Tooltip>
          );
        })}
      </div>
    </foreignObject>
  );
}

/**
 * Adaptation–Mitigation Assessment Framework — EU Energy Supply Sector
 *
 * Diagram 1: Full assessment framework (4 layers: impact → outcomes →
 *   activities/levers → enablers). Indicators are embedded inside lever boxes.
 *   Adaptation additions (coral) appear on the right of each layer. Toggle
 *   shows/hides the mitigation and adaptation elements independently.
 *
 * Diagram 2: Hazard detail — five hazards → seven impacts → mitigation levers.
 */
export default function AdaptationMitigationToC() {
  const [showMitigation, setShowMitigation] = useState(true);
  const [showAdaptation, setShowAdaptation] = useState(true);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-xl border border-grey-200 bg-white p-5">
        <h2 className="text-sm font-semibold text-tertiary-dark mb-1">
          Adaptation–Mitigation Assessment Framework — EU Energy Supply Sector
        </h2>
        <p className="text-xs text-tertiary max-w-3xl mb-3">
          An integrated framework showing how climate adaptation considerations interact with the
          existing mitigation policy logic. Based on EUCRA Chapter 8 (EEA, 2024). Read bottom-up:
          enablers → activities → outcomes → impact.
        </p>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <span className="inline-flex items-center gap-1.5 rounded-md bg-teal-50 border border-teal-200 px-2 py-1 text-teal-800 font-medium">
            Existing mitigation framework
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-orange-50 border border-orange-300 px-2 py-1 text-orange-900 font-medium">
            New adaptation additions
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md bg-red-50 border border-red-300 px-2 py-1 text-red-900 font-medium">
            Adaptation risk / pressure
          </span>
        </div>
      </div>

      {/* Explainer */}
      <details className="rounded-xl border border-grey-200 bg-white">
        <summary className="cursor-pointer px-5 py-3 text-sm font-semibold text-tertiary-dark select-none list-none flex items-center justify-between">
          <span>How this framework was developed — methodology note</span>
          <span className="text-tertiary text-xs font-normal ml-2 shrink-0">click to expand</span>
        </summary>
        <div className="px-5 pb-5 pt-1 space-y-3 text-xs text-tertiary max-w-4xl">
          <p>
            The EU energy-supply sector has a well-established mitigation policy framework, built
            around five levers (fossil-fuel phase-out, methane reduction, fast RES roll-out, targeted
            CCU/CCS, and system integration) that drive four outcomes (lower GHG from supply, lower
            energy demand, energy affordability, and energy-system resilience) toward the overarching
            impact goal of a decarbonised EU energy supply by 2050.
          </p>
          <p className="font-semibold text-tertiary-dark">Integrating adaptation — the WIRES framework</p>
          <p>
            Climate adaptation was integrated using the four interlinkage types from the WIRES
            (Wiederkehr et al. 2018) adaptation–mitigation framework:
          </p>
          <ol className="list-decimal list-inside space-y-1.5 pl-2">
            <li>
              <span className="font-medium text-teal-800">Adaptation supports mitigation</span> — some
              adaptation measures help the mitigation levers work better. Hardening energy
              infrastructure (heat-proofing cables, cooling systems for thermal plant) protects the
              physical assets through which the energy transition is delivered.
            </li>
            <li>
              <span className="font-medium" style={{ color: '#712B13' }}>Mitigation supports adaptation</span> — the
              Fast RES roll-out and System integration levers create distributed, weather-dependent
              generation, which can{' '}
              <span className="italic">increase</span> physical resilience by diversifying the
              supply mix (teal synergy arrows).
            </li>
            <li>
              <span className="font-medium text-red-800">Trade-offs / risks</span> — Targeted
              CCU/CCS is water-intensive. Under hotter, drier conditions this creates a water-stress
              risk that could undermine the lever's feasibility (red risk arrow). Similarly, cooling
              and desalination demand driven by climate adaptation increases final energy demand,
              creating pressure on the Energy demand outcome (red adaptation demand pressure box).
            </li>
            <li>
              <span className="font-medium text-amber-800">Joint processes</span> — Affordability of
              energy is a cross-cutting social dimension. Climate impacts (e.g., extreme-heat events)
              increase cooling demand disproportionately for lower-income households, amplifying
              energy-poverty risks — so the Affordability outcome feeds the adaptation demand
              pressure box.
            </li>
          </ol>
          <p>
            The diagram shows the <span className="font-medium">existing mitigation framework</span> in
            teal and all <span className="font-medium" style={{ color: '#712B13' }}>new adaptation
            additions</span> in coral. Synergy arrows are teal-dashed; risk arrows are red-dashed.
            Indicator chips (hover for details) show the ESABCC monitoring codes that track each
            layer.
          </p>
          <p className="text-tertiary-light text-[11px]">
            Source: ESABCC Advisory Board (2024) assessment framework; EEA European Climate Risk
            Assessment (EUCRA, 2024); Wiederkehr et al. (2018) WIRES Climate Change adaptation–
            mitigation interlinkage typology.
          </p>
        </div>
      </details>

      {/* Toggles */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setShowMitigation((m) => !m)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
            showMitigation
              ? 'bg-teal-700 text-white border-teal-700'
              : 'bg-white border-teal-300 text-teal-800 hover:bg-teal-50'
          }`}
        >
          {showMitigation ? '✓ ' : ''}Mitigation framework
        </button>
        <button
          onClick={() => setShowAdaptation((a) => !a)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-colors ${
            showAdaptation
              ? 'bg-orange-700 text-white border-orange-700'
              : 'bg-white border-orange-300 text-orange-800 hover:bg-orange-50'
          }`}
        >
          {showAdaptation ? '✓ ' : ''}Adaptation additions
        </button>
      </div>

      {/* ── Diagram 1: Full Assessment Framework ── */}
      <div className="rounded-xl border border-grey-200 bg-white p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-tertiary-dark mb-1">
          Assessment framework — full policy logic
        </h3>
        <p className="text-xs text-tertiary mb-4">
          Read bottom-up: enablers → activities (with indicators) → outcomes → impact. Adaptation
          elements sit to the right of their mitigation counterparts at each layer.
        </p>
        <style>{tocStyles}</style>
        {/*
          Row Y positions (top → bottom):
            Impact:          y=18,  h=52  → bottom=70
            HR at y=80
            Outcomes:        y=88,  h=62  → bottom=150
            Adapt. demand:   y=158, h=36  → bottom=194
            HR at y=204
            Activities:      y=212, h=76  → bottom=288
            Badges:          y=290, h=20  → bottom=310
            HR at y=316
            Enablers:        y=324, h=90  → bottom=414
            Legend:          y=422, h=82  → bottom=504
          viewBox: 0 0 680 510
        */}
        <svg
          viewBox="0 0 730 510"
          xmlns="http://www.w3.org/2000/svg"
          className="toc-svg"
          style={{ display: 'block', width: '100%', minWidth: 680 }}
          role="img"
          aria-label="Adaptation–Mitigation Assessment Framework for EU energy supply"
        >
          <defs>
            <marker id="toc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>

          {/* Vertical rail divider */}
          <line x1="88" y1="0" x2="88" y2="510" stroke="#d3d1c7" strokeWidth="0.5"/>

          {/* Horizontal layer dividers */}
          <line x1="0" y1="80"  x2="730" y2="80"  stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>
          <line x1="0" y1="204" x2="730" y2="204" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>
          <line x1="0" y1="316" x2="730" y2="316" stroke="#d3d1c7" strokeWidth="0.5" strokeDasharray="3 4"/>

          {/* LEFT RAIL LABELS */}
          <g className="toc-c-gray">
            <rect x="2" y="18"  width="82" height="52"  rx="6" strokeWidth="0.5"/>
            <text className="toc-th" x="43" y="37"  textAnchor="middle" dominantBaseline="central">Impact</text>
            <text className="toc-ts" x="43" y="55"  textAnchor="middle" dominantBaseline="central">long-run goal</text>
          </g>
          <g className="toc-c-gray">
            {/* spans outcome row + adaptation demand row */}
            <rect x="2" y="88"  width="82" height="106" rx="6" strokeWidth="0.5"/>
            <text className="toc-th" x="43" y="114" textAnchor="middle" dominantBaseline="central">Outcomes</text>
            <text className="toc-ts" x="43" y="132" textAnchor="middle" dominantBaseline="central">intermediate</text>
          </g>
          <g className="toc-c-gray">
            {/* spans activities + badge rows */}
            <rect x="2" y="212" width="82" height="98"  rx="6" strokeWidth="0.5"/>
            <text className="toc-th" x="43" y="238" textAnchor="middle" dominantBaseline="central">Activities</text>
            <text className="toc-ts" x="43" y="256" textAnchor="middle" dominantBaseline="central">levers</text>
          </g>
          <g className="toc-c-gray">
            <rect x="2" y="324" width="82" height="90"  rx="6" strokeWidth="0.5"/>
            <text className="toc-th" x="43" y="350" textAnchor="middle" dominantBaseline="central">Enablers</text>
            <text className="toc-ts" x="43" y="368" textAnchor="middle" dominantBaseline="central">enabling</text>
            <text className="toc-ts" x="43" y="384" textAnchor="middle" dominantBaseline="central">conditions</text>
          </g>

          {/* ══════════════ IMPACT ROW ══════════════ */}
          {showMitigation && (
            <g className="toc-c-teal">
              <rect x="96" y="18" width="270" height="52" rx="8" strokeWidth="0.5"/>
              <text className="toc-th" x="231" y="37" textAnchor="middle" dominantBaseline="central">Decarbonised EU energy supply</text>
              <text className="toc-ts" x="231" y="55" textAnchor="middle" dominantBaseline="central">E1: energy supply GHG → net zero by 2050</text>
            </g>
          )}
          {showAdaptation && (
            <g className="toc-c-coral">
              <rect x="374" y="18" width="298" height="52" rx="8" strokeWidth="0.5"/>
              <text className="toc-th" x="523" y="37" textAnchor="middle" dominantBaseline="central">Climate-resilient energy system</text>
              <text className="toc-ts" x="523" y="55" textAnchor="middle" dominantBaseline="central">New: E7 infrastructure resilience → 2050</text>
            </g>
          )}

          {/* ══════════════ OUTCOMES ROW (y=88, h=62, bottom=150) ══════════════
              4 boxes: GHG | Energy demand | Affordability | Resilience
              widths: 130 | 130 | 130 | 168   (gaps of 6px)
              x:       96   232   368   504
          */}

          {showMitigation && (
            <>
              {/* ↓ GHG from supply */}
              <g className="toc-c-teal">
                <rect x="96" y="88" width="130" height="62" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="161" y="107" textAnchor="middle" dominantBaseline="central">↓ GHG from supply</text>
                <text className="toc-ts" x="161" y="127" textAnchor="middle" dominantBaseline="central">E2, E3 indicators</text>
              </g>
              {/* ↓ Energy demand */}
              <g className="toc-c-teal">
                <rect x="232" y="88" width="130" height="62" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="297" y="107" textAnchor="middle" dominantBaseline="central">↓ Energy demand</text>
                <text className="toc-ts" x="297" y="127" textAnchor="middle" dominantBaseline="central">O2: final + primary demand</text>
              </g>
              {/* Affordability — amber (cross-cutting social outcome) */}
              <g className="toc-c-amber">
                <rect x="368" y="88" width="130" height="62" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="433" y="103" textAnchor="middle" dominantBaseline="central">Affordability of</text>
                <text className="toc-th" x="433" y="119" textAnchor="middle" dominantBaseline="central">energy</text>
                <text className="toc-ts" x="433" y="138" textAnchor="middle" dominantBaseline="central">social vulnerability</text>
              </g>
              {/* Outcome → Impact arrows */}
              <line x1="161" y1="88" x2="190" y2="70" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
              <line x1="297" y1="88" x2="245" y2="70" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
              <line x1="433" y1="88" x2="285" y2="70" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
            </>
          )}

          {showAdaptation && (
            <>
              {/* Increased resilience outcome */}
              <g className="toc-c-coral">
                <rect x="504" y="88" width="168" height="62" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="588" y="102" textAnchor="middle" dominantBaseline="central">Increased resilience</text>
                <text className="toc-th" x="588" y="118" textAnchor="middle" dominantBaseline="central">of energy supply &amp;</text>
                <text className="toc-th" x="588" y="134" textAnchor="middle" dominantBaseline="central">infrastructure</text>
              </g>
              <IndicatorChip codes={['E7']} x={544} y={146} w={88}/>
              {/* Resilience outcome → Adaptation impact */}
              <line x1="588" y1="88" x2="556" y2="70" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#toc-arrow)"/>
            </>
          )}

          {/* Adaptation demand pressure box (y=158, h=36) — shown when adaptation on */}
          {showAdaptation && (
            <g className="toc-c-red">
              <rect x="228" y="158" width="274" height="36" rx="6" strokeWidth="0.5"/>
              <text className="toc-th" x="365" y="170" textAnchor="middle" dominantBaseline="central">⚠ Adaptation demand pressure</text>
              <text className="toc-ts" x="365" y="186" textAnchor="middle" dominantBaseline="central">cooling &amp; desalination ↑ O2 pressure</text>
            </g>
          )}
          {/* Arrow: adaptation demand → energy demand outcome (only if both visible) */}
          {showAdaptation && showMitigation && (
            <>
              <path d="M305 158 L297 150" fill="none" stroke="#A32D2D" strokeWidth="0.5" strokeDasharray="3 3" markerEnd="url(#toc-arrow)"/>
              {/* Arrow: Affordability → adaptation demand pressure */}
              <path d="M433 150 L415 158" fill="none" stroke="#A32D2D" strokeWidth="0.5" strokeDasharray="3 3" markerEnd="url(#toc-arrow)"/>
            </>
          )}

          {/* ══════════════ ACTIVITIES ROW (y=212, h=76, bottom=288) ══════════════
              Mitigation levers (x=96 to x=498) + Adaptation lever (x=506 to x=672)
              5 levers: w=76 each, gap=5
              x: 96, 177, 258, 339, 420   (each w=75, gap=6)
              Adaptation: x=506, w=166
          */}

          {showMitigation && (
            <>
              {/* Fossil fuel phase-out [E2/E3] */}
              <g className="toc-c-gray">
                <rect x="96" y="212" width="75" height="76" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="133" y="232" textAnchor="middle" dominantBaseline="central">Fossil fuel</text>
                <text className="toc-th" x="133" y="248" textAnchor="middle" dominantBaseline="central">phase-out</text>
              </g>
              <IndicatorChip codes={['E2','E3']} x={97} y={268} w={73}/>
              {/* Methane reduction [E6] */}
              <g className="toc-c-gray">
                <rect x="177" y="212" width="75" height="76" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="214" y="232" textAnchor="middle" dominantBaseline="central">Methane</text>
                <text className="toc-th" x="214" y="248" textAnchor="middle" dominantBaseline="central">reduction</text>
              </g>
              <IndicatorChip codes={['E6']} x={178} y={268} w={73}/>
              {/* Fast RES roll-out [E4a/b] */}
              <g className="toc-c-gray">
                <rect x="258" y="212" width="75" height="76" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="295" y="232" textAnchor="middle" dominantBaseline="central">Fast RES</text>
                <text className="toc-th" x="295" y="248" textAnchor="middle" dominantBaseline="central">roll-out</text>
              </g>
              <IndicatorChip codes={['E4a','E4b']} x={259} y={268} w={73}/>
              {/* Targeted CCU/CCS [E1/E6] */}
              <g className="toc-c-gray">
                <rect x="339" y="212" width="75" height="76" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="376" y="232" textAnchor="middle" dominantBaseline="central">Targeted</text>
                <text className="toc-th" x="376" y="248" textAnchor="middle" dominantBaseline="central">CCU/CCS</text>
              </g>
              <IndicatorChip codes={['E1','E6']} x={340} y={268} w={73}/>
              {/* System integration [E5/O2] */}
              <g className="toc-c-gray">
                <rect x="420" y="212" width="75" height="76" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="457" y="232" textAnchor="middle" dominantBaseline="central">System</text>
                <text className="toc-th" x="457" y="248" textAnchor="middle" dominantBaseline="central">integration</text>
              </g>
              <IndicatorChip codes={['E5','O2']} x={421} y={268} w={73}/>

              {/* Synergy / risk badges (y=290, h=20) */}
              <g className="toc-c-teal">
                <rect x="258" y="290" width="75" height="20" rx="5" strokeWidth="0.5"/>
                <text className="toc-ts" x="295" y="300" textAnchor="middle" dominantBaseline="central">↔ synergy</text>
              </g>
              <g className="toc-c-red">
                <rect x="339" y="290" width="75" height="20" rx="5" strokeWidth="0.5"/>
                <text className="toc-ts" x="376" y="300" textAnchor="middle" dominantBaseline="central">⚠ water risk</text>
              </g>
              <g className="toc-c-teal">
                <rect x="420" y="290" width="75" height="20" rx="5" strokeWidth="0.5"/>
                <text className="toc-ts" x="457" y="300" textAnchor="middle" dominantBaseline="central">↔ synergy</text>
              </g>

              {/* Activity → Outcome arrows (solid gray) */}
              <line x1="133" y1="212" x2="155" y2="150" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
              <line x1="214" y1="212" x2="163" y2="150" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
              <line x1="295" y1="212" x2="170" y2="150" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
              <line x1="376" y1="212" x2="177" y2="150" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
              <line x1="457" y1="212" x2="297" y2="150" stroke="#5F5E5A" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
            </>
          )}

          {showAdaptation && (
            <>
              {/* Physical resilience lever */}
              <g className="toc-c-coral">
                <rect x="506" y="212" width="166" height="76" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="589" y="228" textAnchor="middle" dominantBaseline="central">Physical resilience</text>
                <text className="toc-th" x="589" y="244" textAnchor="middle" dominantBaseline="central">of energy infra.</text>
                <text className="toc-ts" x="589" y="261" textAnchor="middle" dominantBaseline="central">Hardening · redundancy</text>
                <text className="toc-ts" x="589" y="277" textAnchor="middle" dominantBaseline="central">climate-proofing</text>
              </g>
              {/* Physical resilience → Resilience outcome */}
              <line x1="589" y1="212" x2="588" y2="150" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#toc-arrow)"/>
            </>
          )}

          {/* Synergy/risk arrows from mitigation levers → Resilience outcome
              Route via right-side bypass lane (x≈695–715) to avoid crossing the
              adaptation demand pressure box (x=228–502, y=158–194) and
              Physical resilience lever (x=506–672, y=212–288). */}
          {showMitigation && showAdaptation && (
            <>
              {/* Fast RES (↔ synergy) — sweeps right, comes in at top of Resilience box */}
              <path
                d="M295 310 C295 335 700 335 700 100 C700 88 685 88 672 88"
                fill="none" stroke="#0F6E56" strokeWidth="0.8" strokeDasharray="5 3"
                markerEnd="url(#toc-arrow)"
              />
              {/* System integration (↔ synergy) — staggered right lane */}
              <path
                d="M457 310 C457 340 708 340 708 119 C708 108 690 108 672 108"
                fill="none" stroke="#0F6E56" strokeWidth="0.8" strokeDasharray="5 3"
                markerEnd="url(#toc-arrow)"
              />
              {/* CCU/CCS (⚠ water risk) — outermost right lane, enters at bottom of Resilience box */}
              <path
                d="M376 310 C376 346 716 346 716 135 C716 124 693 124 672 124"
                fill="none" stroke="#A32D2D" strokeWidth="0.8" strokeDasharray="5 3"
                markerEnd="url(#toc-arrow)"
              />
            </>
          )}

          {/* ══════════════ ENABLERS ROW (y=324, h=90, bottom=414) ══════════════ */}

          {showMitigation && (
            <>
              <g className="toc-c-amber">
                <rect x="96" y="324" width="402" height="90" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="104" y="340" dominantBaseline="central">Enabling conditions</text>
                <text className="toc-ts" x="114" y="358">• Carbon pricing &amp; EU ETS</text>
                <text className="toc-ts" x="114" y="374">• Grid, storage &amp; interconnectors</text>
                <text className="toc-ts" x="114" y="390">• R&amp;D, innovation &amp; skills</text>
                <text className="toc-ts" x="312" y="358">• Public &amp; private investment</text>
                <text className="toc-ts" x="312" y="374">• Policy &amp; regulatory framework</text>
                <text className="toc-ts" x="312" y="390">• Cross-sectoral coordination</text>
              </g>
              {/* Enablers → activity arrows */}
              <line x1="200" y1="324" x2="147" y2="288" stroke="#854F0B" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
              <line x1="350" y1="324" x2="376" y2="288" stroke="#854F0B" strokeWidth="0.5" markerEnd="url(#toc-arrow)"/>
            </>
          )}

          {showAdaptation && (
            <>
              <g className="toc-c-coral">
                <rect x="506" y="324" width="166" height="90" rx="8" strokeWidth="0.5"/>
                <text className="toc-th" x="514" y="340" dominantBaseline="central">Risk assessment</text>
                <text className="toc-ts" x="514" y="358">&amp; adaptive capacity planning</text>
                <text className="toc-ts" x="516" y="375">• Hazard mapping of assets</text>
                <text className="toc-ts" x="516" y="391">• Resilience investment</text>
                <text className="toc-ts" x="516" y="407">• Co-condition w/ decarb. finance</text>
              </g>
              {/* Adaptation enabler → physical resilience lever */}
              <line x1="589" y1="324" x2="589" y2="288" stroke="#993C1D" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#toc-arrow)"/>
            </>
          )}

          {/* ══════════════ LEGEND ══════════════ */}
          <rect x="96" y="422" width="576" height="82" rx="8" fill="none" stroke="#d3d1c7" strokeWidth="0.5"/>
          <text className="toc-th" x="112" y="438" dominantBaseline="central">Legend</text>
          <rect x="112" y="450" width="10" height="10" rx="2" fill="#E1F5EE" stroke="#0F6E56" strokeWidth="0.5"/>
          <text className="toc-ts" x="128" y="455" dominantBaseline="central">Mitigation framework (teal)</text>
          <rect x="112" y="468" width="10" height="10" rx="2" fill="#FAECE7" stroke="#993C1D" strokeWidth="0.5"/>
          <text className="toc-ts" x="128" y="473" dominantBaseline="central">Adaptation additions (coral)</text>
          <rect x="112" y="486" width="10" height="10" rx="2" fill="#FCEBEB" stroke="#A32D2D" strokeWidth="0.5"/>
          <text className="toc-ts" x="128" y="491" dominantBaseline="central">Risk / pressure (red)</text>
          <rect x="330" y="450" width="10" height="10" rx="2" fill="#FAEEDA" stroke="#854F0B" strokeWidth="0.5"/>
          <text className="toc-ts" x="346" y="455" dominantBaseline="central">Enabling conditions (amber)</text>
          <rect x="330" y="468" width="10" height="10" rx="2" fill="#F1EFE8" stroke="#5F5E5A" strokeWidth="0.5"/>
          <text className="toc-ts" x="346" y="473" dominantBaseline="central">Mitigation levers (gray)</text>
          <text className="toc-ts" x="530" y="455" dominantBaseline="central">↔  synergy with adaptation</text>
          <text className="toc-ts" x="530" y="471" dominantBaseline="central">⚠  risk to adaptation</text>
          <text className="toc-ts" x="530" y="487" dominantBaseline="central">- -  adaptation link</text>
        </svg>
      </div>

      {/* ── Diagram 2: Hazard detail ── */}
      <div className="rounded-xl border border-grey-200 bg-white p-5 overflow-x-auto">
        <h3 className="text-sm font-semibold text-tertiary-dark mb-1">
          Detail: climate hazard pathways into mitigation levers
        </h3>
        <p className="text-xs text-tertiary mb-4">
          Zooms into the Activities row above. Read bottom-up: climate hazards → physical impacts →
          disruption of specific mitigation levers.
        </p>
        <svg
          viewBox="0 0 680 530"
          xmlns="http://www.w3.org/2000/svg"
          className="toc-svg"
          style={{ display: 'block', width: '100%', minWidth: 640 }}
          role="img"
          aria-label="Climate hazard pathways into energy supply mitigation levers"
        >
          <defs>
            <marker id="hazard-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
              <path d="M2 1L8 5L2 9" fill="none" stroke="context-stroke" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </marker>
          </defs>

          {/* LEVERS */}
          <g className="toc-c-gray"><rect x="96"  y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="145" y="40" textAnchor="middle" dominantBaseline="central">Fossil fuel</text><text className="toc-th" x="145" y="58" textAnchor="middle" dominantBaseline="central">phase-out</text></g>
          <g className="toc-c-gray"><rect x="206" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="255" y="40" textAnchor="middle" dominantBaseline="central">Methane</text><text className="toc-th" x="255" y="58" textAnchor="middle" dominantBaseline="central">reduction</text></g>
          <g className="toc-c-gray"><rect x="316" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="365" y="40" textAnchor="middle" dominantBaseline="central">Fast RES</text><text className="toc-th" x="365" y="58" textAnchor="middle" dominantBaseline="central">roll-out</text></g>
          <g className="toc-c-gray"><rect x="426" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="475" y="40" textAnchor="middle" dominantBaseline="central">Targeted</text><text className="toc-th" x="475" y="58" textAnchor="middle" dominantBaseline="central">CCU/CCS</text></g>
          <g className="toc-c-gray"><rect x="536" y="20" width="98" height="52" rx="8" strokeWidth="0.5"/><text className="toc-th" x="585" y="40" textAnchor="middle" dominantBaseline="central">System</text><text className="toc-th" x="585" y="58" textAnchor="middle" dominantBaseline="central">integration</text></g>

          {/* Layer label: Impacts */}
          <text className="toc-ts" x="52" y="208" textAnchor="middle" dominantBaseline="central" fontWeight="600">Impacts</text>

          {/* IMPACTS */}
          <g className="toc-c-red"><rect x="96"  y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="137" y="196" textAnchor="middle" dominantBaseline="central">↑ cooling</text><text className="toc-ts" x="137" y="212" textAnchor="middle" dominantBaseline="central">demand</text><text className="toc-ts" x="137" y="226" textAnchor="middle" dominantBaseline="central">↑ O2 pressure</text></g>
          <g className="toc-c-red"><rect x="186" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="227" y="196" textAnchor="middle" dominantBaseline="central">↓ grid</text><text className="toc-ts" x="227" y="212" textAnchor="middle" dominantBaseline="central">capacity</text><text className="toc-ts" x="227" y="226" textAnchor="middle" dominantBaseline="central">lines/transformers</text></g>
          <g className="toc-c-red"><rect x="276" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="317" y="196" textAnchor="middle" dominantBaseline="central">↓ hydro</text><text className="toc-ts" x="317" y="212" textAnchor="middle" dominantBaseline="central">production</text><text className="toc-ts" x="317" y="226" textAnchor="middle" dominantBaseline="central">drought risk</text></g>
          <g className="toc-c-red"><rect x="366" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="407" y="196" textAnchor="middle" dominantBaseline="central">↓ thermal</text><text className="toc-ts" x="407" y="212" textAnchor="middle" dominantBaseline="central">production</text><text className="toc-ts" x="407" y="226" textAnchor="middle" dominantBaseline="central">heat stress</text></g>
          <g className="toc-c-red"><rect x="456" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="497" y="196" textAnchor="middle" dominantBaseline="central">↑ desalin-</text><text className="toc-th" x="497" y="212" textAnchor="middle" dominantBaseline="central">ation need</text><text className="toc-ts" x="497" y="226" textAnchor="middle" dominantBaseline="central">energy demand</text></g>
          <g className="toc-c-red"><rect x="546" y="178" width="82" height="54" rx="6" strokeWidth="0.5"/><text className="toc-th" x="587" y="192" textAnchor="middle" dominantBaseline="central">Damage:</text><text className="toc-ts" x="587" y="208" textAnchor="middle" dominantBaseline="central">transport +</text><text className="toc-ts" x="587" y="222" textAnchor="middle" dominantBaseline="central">storage infra</text></g>

          {/* Layer label: Hazards */}
          <text className="toc-ts" x="52" y="378" textAnchor="middle" dominantBaseline="central" fontWeight="600">Hazards</text>

          {/* HAZARDS */}
          <g className="toc-c-blue"><rect x="96"  y="360" width="108" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="150" y="378" textAnchor="middle" dominantBaseline="central">Warming / heatwaves</text></g>
          <g className="toc-c-blue"><rect x="214" y="360" width="108" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="268" y="378" textAnchor="middle" dominantBaseline="central">Drought / ↓ precip.</text></g>
          <g className="toc-c-blue"><rect x="332" y="360" width="88"  height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="376" y="378" textAnchor="middle" dominantBaseline="central">Wildfires</text></g>
          <g className="toc-c-blue"><rect x="430" y="360" width="108" height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="484" y="378" textAnchor="middle" dominantBaseline="central">Floods / landslides</text></g>
          <g className="toc-c-blue"><rect x="548" y="360" width="86"  height="36" rx="6" strokeWidth="0.5"/><text className="toc-th" x="591" y="378" textAnchor="middle" dominantBaseline="central">Extreme weather</text></g>

          {/* Hazard → impact arrows */}
          <path d="M150 360 L137 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M150 360 L210 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M150 360 L390 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M268 360 L300 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M268 360 L480 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M376 360 L220 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M376 360 L570 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M484 360 L570 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>
          <path d="M591 360 L587 234" fill="none" stroke="#E24B4A" strokeWidth="0.5" markerEnd="url(#hazard-arrow)"/>

          {/* Impact → lever arrows (dashed) */}
          <path d="M137 178 L145 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M227 178 L585 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M317 178 L365 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M407 178 L165 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M497 178 L475 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>
          <path d="M587 178 L585 74" fill="none" stroke="#E24B4A" strokeWidth="0.5" strokeDasharray="4 3" markerEnd="url(#hazard-arrow)"/>

          {/* Legend */}
          <rect x="96" y="422" width="504" height="96" rx="8" fill="none" stroke="#d3d1c7" strokeWidth="0.5"/>
          <text className="toc-th" x="112" y="440" dominantBaseline="central">How to read this diagram</text>
          <text className="toc-ts" x="112" y="458" dominantBaseline="central">Solid red lines: hazard causes this impact</text>
          <text className="toc-ts" x="112" y="476" dominantBaseline="central">Dashed red lines: impact undermines this lever</text>
          <text className="toc-ts" x="112" y="494" dominantBaseline="central">This zooms into the Activities row of the full framework above</text>
          <rect x="400" y="446" width="12" height="12" rx="3" fill="#E6F1FB" stroke="#185FA5" strokeWidth="0.5"/>
          <text className="toc-ts" x="418" y="452" dominantBaseline="central">Climate hazards</text>
          <rect x="400" y="466" width="12" height="12" rx="3" fill="#FCEBEB" stroke="#A32D2D" strokeWidth="0.5"/>
          <text className="toc-ts" x="418" y="472" dominantBaseline="central">Climate impacts</text>
          <rect x="400" y="486" width="12" height="12" rx="3" fill="#F1EFE8" stroke="#5F5E5A" strokeWidth="0.5"/>
          <text className="toc-ts" x="418" y="492" dominantBaseline="central">Mitigation levers</text>
        </svg>
      </div>

      <p className="text-xs text-tertiary-light px-1">
        Source: Advisory Board (2024) assessment framework for the energy supply sector, adapted to
        integrate climate adaptation considerations from the European Climate Risk Assessment (EUCRA,
        EEA 2024).
      </p>
    </div>
  );
}

const tocStyles = `
  .toc-svg { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; }
  .toc-th  { font-size: 13px; font-weight: 600; fill: #1a1a18; }
  .toc-ts  { font-size: 11px; font-weight: 400; fill: #5F5E5A; }

  .toc-c-teal   rect { fill: #E1F5EE; stroke: #0F6E56; }
  .toc-c-teal   .toc-th { fill: #085041; }
  .toc-c-teal   .toc-ts { fill: #0F6E56; }

  .toc-c-coral  rect { fill: #FAECE7; stroke: #993C1D; }
  .toc-c-coral  .toc-th { fill: #712B13; }
  .toc-c-coral  .toc-ts { fill: #993C1D; }

  .toc-c-red    rect { fill: #FCEBEB; stroke: #A32D2D; }
  .toc-c-red    .toc-th { fill: #791F1F; }
  .toc-c-red    .toc-ts { fill: #A32D2D; }

  .toc-c-amber  rect { fill: #FAEEDA; stroke: #854F0B; }
  .toc-c-amber  .toc-th { fill: #633806; }
  .toc-c-amber  .toc-ts { fill: #854F0B; }

  .toc-c-gray   rect { fill: #F1EFE8; stroke: #5F5E5A; }
  .toc-c-gray   .toc-th { fill: #444441; }
  .toc-c-gray   .toc-ts { fill: #5F5E5A; }

  .toc-c-blue   rect { fill: #E6F1FB; stroke: #185FA5; }
  .toc-c-blue   .toc-th { fill: #0C447C; }
  .toc-c-blue   .toc-ts { fill: #185FA5; }

  @media (prefers-color-scheme: dark) {
    .toc-th  { fill: #e8e6de; }
    .toc-ts  { fill: #9c9a92; }

    .toc-c-teal   rect { fill: #085041; stroke: #5DCAA5; }
    .toc-c-teal   .toc-th { fill: #9FE1CB; }
    .toc-c-teal   .toc-ts { fill: #1D9E75; }

    .toc-c-coral  rect { fill: #712B13; stroke: #D85A30; }
    .toc-c-coral  .toc-th { fill: #F5C4B3; }
    .toc-c-coral  .toc-ts { fill: #F0997B; }

    .toc-c-red    rect { fill: #791F1F; stroke: #E24B4A; }
    .toc-c-red    .toc-th { fill: #F7C1C1; }
    .toc-c-red    .toc-ts { fill: #F09595; }

    .toc-c-amber  rect { fill: #633806; stroke: #BA7517; }
    .toc-c-amber  .toc-th { fill: #FAC775; }
    .toc-c-amber  .toc-ts { fill: #EF9F27; }

    .toc-c-gray   rect { fill: #2C2C2A; stroke: #5F5E5A; }
    .toc-c-gray   .toc-th { fill: #D3D1C7; }
    .toc-c-gray   .toc-ts { fill: #B4B2A9; }

    .toc-c-blue   rect { fill: #0C447C; stroke: #378ADD; }
    .toc-c-blue   .toc-th { fill: #B5D4F4; }
    .toc-c-blue   .toc-ts { fill: #85B7EB; }
  }
`;
