'use client';
/**
 * M·36 — Policy Targets · Progress-framework suggestions (beta).
 * --------------------------------------------------------------
 * Reads the sector summaries of the v5 clean target set against the indicator
 * assessment framework of the Advisory Board report "Towards EU climate
 * neutrality: progress, policy gaps and opportunities" (methodology §2,
 * pp. 33–37: GHG reductions ← outcomes ← mitigation levers ← enabling
 * conditions, tracked by indicators O1–O3, E1–E6, I1–I7, T1–T6, B1–B6, A1–A7,
 * L1–L8 against legal > political > proposed > scenario benchmarks).
 *
 * For each sectoral chapter it suggests: targets the register now carries that
 * the framework did not use as benchmarks, indicators worth adding, and levers
 * or enabling conditions without coverage. It closes with the requested
 * worked example for Land and marine ecosystems — a framework that combines
 * adaptation targets, outcomes and levers with the mitigation ones, drawn in
 * the structure of the report's Figure 5/6.
 */
import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import PageHero from '@/components/PageHero';

const VIZ_CSS = `
.fw-viz {
  --viz-mitigation: #0d9488;
  --viz-adaptation: #c2410c;
  --viz-both: #4f46e5;
  --viz-muted: #64748b;
}
html.dark .fw-viz {
  --viz-mitigation: #0fa093;
  --viz-adaptation: #d95926;
  --viz-both: #7b73e8;
  --viz-muted: #7a8699;
}
`;

interface ChapterCard {
  chapter: string;
  indicators: string;
  targets: string[];
  add: string[];
  gaps: string[];
}

const CHAPTERS: ChapterCard[] = [
  {
    chapter: 'Ch. 4 — Energy',
    indicators: 'E1 total emissions · E2 electricity mix · E3 grid intensity · E4 power capacity · E5 electrification · E6 methane',
    targets: [
      'EED sub-targets beyond the headline −11.7%/763 Mtoe: public bodies must cut final energy use 1.9% every year — a dated, binding benchmark for a public-sector lever the framework does not track.',
      'The heat side of the energy system: RED III renewables in heating & cooling (+0.8 pp/yr to 2025, +1.1 pp/yr to 2030) and in district heating (+2.2 pp/yr, indicative) — E1–E6 are electricity-heavy and carry no heat indicator.',
      'Hydrogen: RED III requires 42% of industrial hydrogen to be renewable by 2030 (60% by 2035) — a legal benchmark for a lever currently tracked only via scenarios.',
      '15% electricity interconnection by 2030 (Governance Regulation / RED III) — a binding-adjacent benchmark for grids, an enabling condition with no indicator today.',
      'Net-Zero Industry Act: 40% of deployment needs manufactured in the EU by 2030, and 50 Mt/yr CO2 injection capacity by 2030 — dated benchmarks for supply chains and CO2 storage.',
    ],
    add: [
      'E7 (suggested): renewable share in heating & cooling, benchmarked on the RED III annual increments.',
      'E8 (suggested): electrolyser capacity / renewable share of industrial hydrogen vs the 42%-by-2030 target.',
      'Enabling-condition indicators: interconnection level vs 15%, grid investment, EU manufacturing capacity vs the NZIA 40% benchmark, CO2 injection capacity vs 50 Mt.',
    ],
    gaps: [
      'Climate-proofing of the energy system (cooling water, hydro under drought, grid resilience) has neither targets nor indicators — an adaptation gap the future adaptation report could fill.',
    ],
  },
  {
    chapter: 'Ch. 5 — Industry',
    indicators: 'I1 emissions · I2 production & consumption · I3 circular material use rate · I4 product GHG intensity · I5 energy use · I6 energy mix · I7 low-carbon projects',
    targets: [
      'The circular economy now has dated law where the report leaned on scenarios: PPWR packaging waste per capita (−5% 2030, −10% 2035, −15% 2040), 70% packaging recycling by 2030 with material-specific rates, and re-use quotas from 2030; Waste Framework Directive 60%/65% municipal recycling (2030/2035); Single-Use Plastics recycled content (25% from 2025, 30% from 2030); Batteries recycling efficiencies (80% lead-acid / 70% lithium by 2030).',
      'F-gas Regulation phase-down steps (production rights 60% of 2011–13 levels in 2025–28, falling to 15% from 2036) — a stepped legal trajectory for non-CO2 industrial gases.',
      'Critical Raw Materials Act 2030 benchmarks (10% extraction / 40% processing / 25% recycling of EU consumption; ≤65% supply concentration) and NZIA (40% of deployment needs; 15% of world production by 2040) — enabling conditions for clean-tech value chains.',
      'The strengthened ETS delivers −62% by 2030 vs 2005 in ETS sectors — the natural legal benchmark for I1.',
    ],
    add: [
      'Benchmark I3 (CMUR) with the PPWR/WFD trajectories, and add packaging waste per capita and municipal recycling rate as lever indicators.',
      'Add an F-gas indicator (HFC production/consumption vs the phase-down cap) beside the methane tracking of Ch. 4.',
      'Track I7 against the NZIA capacity and CO2-injection benchmarks rather than project counts alone; add CRMA shares as enabling-condition indicators.',
    ],
    gaps: [
      'Product-level demand levers (material efficiency, substitution) still have no quantified targets — only the packaging re-use quotas gesture at them.',
    ],
  },
  {
    chapter: 'Ch. 6 — Transport',
    indicators: 'T1 emissions · T2 transport demand · T3 modal split · T4 GHG intensity · T5 ZEV shares · T6 fossil/biofuel shares',
    targets: [
      'AFIR converts charging/refuelling infrastructure into dated, binding milestones: power per registered EV (1.3/0.8 kW), TEN-T charging-pool coverage and power steps (2027/2030/2035), hydrogen stations every 200 km by 2030, shore-side electricity for 90% of port calls by end-2029, and aircraft-stand electrification (2024/2029) — the framework tracks no infrastructure indicator at all.',
      'ReFuelEU SAF blending (6% 2030 → 20% 2035 → 70% 2050, with synthetic-fuel sub-shares) and FuelEU maritime GHG-intensity steps (−2% 2025 → −80% 2050) give T6 legal trajectories for aviation and shipping.',
      'RED III transport target (29% renewables or −14.5% GHG intensity by 2030; advanced biofuels + RFNBO 5.5% in 2030) — a binding benchmark for T6b.',
      'Maritime ETS phase-in (40/70/100% of emissions surrendered 2024–26) supports the carbon-pricing lens on shipping.',
    ],
    add: [
      'T7 (suggested): recharging/refuelling infrastructure vs the AFIR milestones (kW per EV, TEN-T coverage, shore-side electricity share).',
      'T8 (suggested): SAF share of aviation fuel and average GHG intensity of marine fuels vs their legal step curves.',
      'Benchmark T3 (modal split) with the TEN-T urban-node/multimodal-hub deadlines as enabling conditions.',
    ],
    gaps: [
      'Transport demand (T2) still has no policy target — the only sector lever tracked purely against scenarios; the register confirms nothing has filled it.',
    ],
  },
  {
    chapter: 'Ch. 7 — Buildings',
    indicators: 'B1 emissions · B2 energy use · B3 retrofit rate · B4 surface area · B5 energy mix of new systems · B6 heat pumps',
    targets: [
      'The EPBD recast supplies legal benchmarks where the framework used scenarios: average primary energy of the residential stock −16% by 2030 and −20–22% by 2035 (B2), minimum energy performance thresholds for non-residential buildings (16%/26% worst stock by 2030/2033 — a direct B3 benchmark), and the zero-emission stock end-point in 2050.',
      'Renovation Wave: 35 million building units renovated by 2030 — an indicative benchmark for B3/B4.',
      'RED III indicative 2030 share of renewables in buildings (B5) and the EED public-bodies obligations (−1.9%/yr).',
      'Adaptation enters through the Nature Restoration Regulation urban targets: no net loss of urban green space and canopy by 2030, increasing trend from 2031.',
    ],
    add: [
      'Re-benchmark B2/B3 on the EPBD trajectories; add a public-sector renovation indicator.',
      'B7 (suggested): urban green space / canopy cover — the built-environment adaptation outcome now carries dated targets.',
    ],
    gaps: [
      'Heat pumps (B6) still have no target after the REPowerEU ambition lapsed — a lever with an indicator but no benchmark other than scenarios.',
      'Summer overheating / cooling demand has neither target nor indicator despite rising relevance for both mitigation and adaptation.',
    ],
  },
  {
    chapter: 'Ch. 8 — Agriculture',
    indicators: 'A1 emissions (incl. demand side) · A2 GHG intensity · A3 fertiliser use · A4 animal production · A5 animal-product consumption · A6 food waste · A7 bioenergy crops',
    targets: [
      'Food waste now has binding 2030 targets (−10% processing, −30% per capita retail/household) — A6 previously tracked a voluntary ambition.',
      'Zero Pollution 2030 targets: −50% nutrient losses (benchmark for A3), −50% pesticide use and risk, −50% antimicrobial sales — plus 75% of soils healthy by 2030 from the Soil Mission.',
      'The Nature Restoration Regulation reaches agriculture: restore 30% of drained farmed peatlands by 2030 (a quarter rewetted), 40%/50% by 2040/2050, and improving trends in grassland butterflies, cropland soil carbon and high-diversity landscape features — organic-soil emissions are a major lever absent from A1–A7.',
      'CAP finance benchmarks: ≥25% of direct payments for eco-schemes, ≥10% redistributive support, 40% of the CAP budget climate-relevant.',
    ],
    add: [
      'A8 (suggested): share of drained agricultural peatland restored/rewetted — the highest-leverage new mitigation-adaptation indicator in the sector.',
      'A9 (suggested): pesticide use & risk and antimicrobial sales vs the −50% targets; benchmark A3 on the nutrient-loss target.',
      'Enabling-condition indicators: eco-scheme uptake and CAP climate spending against the 25%/40% benchmarks.',
    ],
    gaps: [
      'The demand side (A5, diets/animal-product consumption) still has no target anywhere in the register — the sector’s most persistent policy gap.',
    ],
  },
  {
    chapter: 'Ch. 9 — LULUCF',
    indicators: 'L1 net removals · L2 land-use areas · L3/L4 (a)fforestation & deforestation · L5 net land take · L6 forest biomass · L7 other reductions · L8 bioenergy',
    targets: [
      'Beside the −310 Mt 2030 target and national 2026–30 targets already benchmarked in L1, the Climate Law caps removals counting toward 2030 at 225 Mt CO2e and the LULUCF Regulation caps flexibilities at 178 Mt — accounting context the summary tables should carry.',
      'The Nature Restoration Regulation supplies dated outcome targets the chapter lacked: restoration measures on ≥20% of land and sea by 2030 (all ecosystems needing it by 2050), condition-improvement steps for habitats (30% by 2030), 3 billion additional trees by 2030 (L3/L6), and biodiversity trend indicators (forest birds, connectivity, organic carbon, deadwood).',
      'Urban no-net-loss of green space (2030) intersects L5 net land take.',
    ],
    add: [
      'L9 (suggested): area under restoration measures vs the 20%-by-2030 trajectory; habitat-condition shares.',
      'L10 (suggested): sink-resilience indicators — burnt area, drought and pest damage to the sink — linking the mitigation sink to adaptation outcomes (see the worked example below).',
      'Benchmark L3/L6 with the 3-billion-trees commitment and the forest-ecosystem indicator set.',
    ],
    gaps: [
      'The framework treats the sink as a mitigation quantity only; its exposure to climate impacts (fires, droughts, pests) is precisely where adaptation targets, outcomes and levers need to be combined.',
    ],
  },
  {
    chapter: 'Chs. 10–15 — Cross-cutting',
    indicators: 'carbon pricing · whole-of-society · finance & investment · innovation · governance · labour & skills',
    targets: [
      'Governance (Ch. 14): the adopted 2040 target (−90% net vs 1990, European Climate Law) is now a legal benchmark — O1 trajectories and every sectoral 2031–2050 assessment can be re-anchored on it instead of the Advisory Board’s advised range.',
      'Carbon pricing (Ch. 10): maritime ETS phase-in (40/70/100%) and the 57% auction share are dated register rows; the ETS2 start for buildings/transport should join them once operative.',
      'Finance (Ch. 12): 30% of the 2021–27 MFF for climate, 40% of the CAP budget, and the Just Transition Fund objective are trackable mainstreaming benchmarks.',
      'Adaptation: the 2050 climate-resilience vision, the Mission on Adaptation (regions resilient by 2030) and the Water Resilience Strategy (+10% water efficiency by 2030, leakage plans) are the seeds of an adaptation progress framework — the register’s adaptation rows concentrate in ecosystems, water and health.',
    ],
    add: [
      'A dedicated adaptation chapter (or report) mirroring the mitigation framework: adaptation outcomes ← resilience levers ← enabling conditions, tracked by indicators — prototyped below for land and marine ecosystems.',
    ],
    gaps: [],
  },
];

/** One box of the worked-example framework figure. */
function Box({ kind, title, chips }: { kind: 'mitigation' | 'adaptation' | 'both'; title: string; chips: string[] }) {
  const color = `var(--viz-${kind})`;
  return (
    <div className="rounded-md border-2 p-2 bg-white dark:bg-[var(--mh-card)]" style={{ borderColor: color }}>
      <div className="flex items-start gap-1.5">
        <span className="mt-0.5 w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: color }} aria-hidden />
        <span className="text-[11.5px] font-semibold leading-tight text-tertiary-dark dark:text-[var(--mh-fg)]">{title}</span>
      </div>
      <div className="mt-1.5 flex flex-wrap gap-1">
        {chips.map((c) => (
          <span key={c} className="text-[9.5px] px-1.5 py-px rounded border border-grey-300 dark:border-[var(--mh-border)] bg-grey-50 dark:bg-[var(--mh-bg)] text-tertiary dark:text-[var(--mh-muted)]">{c}</span>
        ))}
      </div>
    </div>
  );
}

function Band({ label, note, children }: { label: string; note: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[140px_1fr] gap-2 items-start">
      <div className="pt-1">
        <div className="text-[11.5px] font-bold uppercase tracking-wide text-tertiary-dark dark:text-[var(--mh-fg)]">{label}</div>
        <div className="text-[10px] text-tertiary dark:text-[var(--mh-muted)] leading-snug mt-0.5">{note}</div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}

export default function FrameworkSuggestionsPage() {
  return (
    <div className="min-h-screen bg-grey-50 dark:bg-[var(--mh-bg)] fw-viz">
      <style dangerouslySetInnerHTML={{ __html: VIZ_CSS }} />
      <SiteHeader />
      <PageHero
        title="Progress-assessment framework — suggestions from the target register"
        subtitle="What the v5 clean target set adds to the indicator framework of “Towards EU climate neutrality” (methodology pp. 33–37): targets not yet used as benchmarks, indicators worth adding per sectoral chapter, and a worked example for Land and marine ecosystems combining adaptation targets, outcomes and levers with the mitigation ones."
      />

      <div className="max-w-[1100px] mx-auto px-3 sm:px-5 py-5">
        <div className="flex flex-wrap items-center gap-2 mb-4 text-[12px]">
          <Link href="/beta/policy-targets/sectors" className="px-2.5 py-1 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] hover:bg-grey-100">← Sector summaries</Link>
          <Link href="/beta/policy-targets" className="px-2.5 py-1 rounded border border-grey-300 dark:border-[var(--mh-border)] text-tertiary-dark dark:text-[var(--mh-fg)] hover:bg-grey-100">Full register</Link>
        </div>

        <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)] p-4 mb-5 text-[12.5px] leading-relaxed text-tertiary dark:text-[var(--mh-muted)]">
          <h2 className="text-[15px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)] mb-2">How to read these suggestions</h2>
          <p>
            The report&rsquo;s framework structures each sector as <strong>GHG emission reductions ← outcomes ← mitigation levers ← enabling conditions</strong>, tracks them with indicators (O1–O3, E1–E6, I1–I7, T1–T6, B1–B6, A1–A7, L1–L8), and benchmarks each indicator against a cascade of <em>legal &gt; political &gt; proposed objectives &gt; Commission scenarios</em>. The report itself notes that for most indicators no legal or political objective exists, so scenario outputs fill in. The clean target set changes that picture: many levers and enabling conditions have since acquired <em>dated, often binding</em> targets. The suggestions below list, per chapter, (1) register targets not yet used as benchmarks, (2) indicators worth adding or re-benchmarking, and (3) levers still without coverage — each traceable to a register row on the <Link href="/beta/policy-targets/sectors" className="text-secondary hover:underline">sector summaries</Link> page.
          </p>
        </div>

        {CHAPTERS.map((c) => (
          <details key={c.chapter} open className="mb-3 rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-white dark:bg-[var(--mh-card)]">
            <summary className="cursor-pointer px-4 py-2.5 font-bold text-[14px] text-tertiary-dark dark:text-[var(--mh-fg)]">
              {c.chapter} <span className="ml-2 font-normal text-[11px] text-tertiary dark:text-[var(--mh-muted)]">{c.indicators}</span>
            </summary>
            <div className="px-4 pb-3.5 text-[12.5px] leading-relaxed text-tertiary dark:text-[var(--mh-muted)]">
              <div className="font-semibold text-tertiary-dark dark:text-[var(--mh-fg)] mt-1">Targets the framework did not capture</div>
              <ul className="list-disc pl-5 space-y-1 mt-1">{c.targets.map((t) => <li key={t}>{t}</li>)}</ul>
              <div className="font-semibold text-tertiary-dark dark:text-[var(--mh-fg)] mt-2.5">Suggested indicator additions / re-benchmarks</div>
              <ul className="list-disc pl-5 space-y-1 mt-1">{c.add.map((t) => <li key={t}>{t}</li>)}</ul>
              {c.gaps.length > 0 && (<>
                <div className="font-semibold text-tertiary-dark dark:text-[var(--mh-fg)] mt-2.5">Levers still without targets</div>
                <ul className="list-disc pl-5 space-y-1 mt-1">{c.gaps.map((t) => <li key={t}>{t}</li>)}</ul>
              </>)}
            </div>
          </details>
        ))}

        {/* ── Worked example ── */}
        <section className="mt-8 mb-10">
          <h2 className="text-[16px] font-bold text-tertiary-dark dark:text-[var(--mh-fg)]">
            Worked example — Land and marine ecosystems: one framework for mitigation and adaptation
          </h2>
          <p className="mt-1.5 mb-4 text-[12.5px] leading-relaxed text-tertiary dark:text-[var(--mh-muted)] max-w-[860px]">
            Same structure as the report&rsquo;s Figure 5 (read bottom-up: enabling conditions activate levers, levers deliver outcomes, outcomes deliver the objectives), but the objective row now holds the adaptation end-points beside the sink target, and every band carries adaptation levers and outcomes with the dated targets the register supplies. Chips are candidate indicators: existing report indicators keep their L-codes; ✚ marks proposed additions.
          </p>

          <div className="rounded-lg border border-grey-200 dark:border-[var(--mh-border)] bg-grey-50 dark:bg-[var(--mh-bg)] p-3.5 space-y-1">
            <Band label="Objectives" note="the end-points the sector must deliver">
              <Box kind="mitigation" title="EU land sink: net −310 Mt CO2e by 2030; contribution to net zero 2050 (LULUCF Reg., Climate Law)" chips={['L1 net removals', '225 Mt counting cap']} />
              <Box kind="both" title="All ecosystems needing restoration under measures by 2050 (Nature Restoration Reg.)" chips={['✚ area under restoration']} />
              <Box kind="adaptation" title="Climate-resilient ecosystems in a climate-resilient EU by 2050 (EU Adaptation Strategy)" chips={['✚ resilience index (tbd)']} />
              <Box kind="adaptation" title="Marine and freshwater systems in good condition (8th EAP, MSFD/WFD lineage)" chips={['✚ % habitats in good condition']} />
            </Band>
            <Arrow />
            <Band label="Outcomes" note="what must be true of the land & sea system">
              <Box kind="mitigation" title="Carbon sink maintained and enhanced" chips={['L1', 'L6 forest biomass', '✚ cropland soil carbon (NRR Annex IV)']} />
              <Box kind="both" title="Habitats restored: measures on ≥20% land & sea by 2030; 30% of degraded habitats improving" chips={['✚ restoration coverage %', '✚ condition known 50%→100%']} />
              <Box kind="adaptation" title="Ecosystems withstand fires, drought, pests — sink losses from disturbance contained" chips={['✚ burnt area', '✚ drought/pest damage', 'L2 land-use areas']} />
              <Box kind="adaptation" title="Waters connected and functioning; pollution pressure down" chips={['✚ free-flowing river km', '✚ ecosystems under air-pollution threat −25%']} />
            </Band>
            <Arrow />
            <Band label="Levers" note="physical changes that deliver the outcomes">
              <Box kind="both" title="Peatland restoration & rewetting: 30% by 2030 → 50% by 2050 (NRR Art. 11)" chips={['✚ % drained peatland rewetted']} />
              <Box kind="both" title="Afforestation & forest management: 3 bn additional trees by 2030; biodiversity-supporting structure" chips={['L3/L4', '✚ forest bird index', '✚ connectivity/deadwood']} />
              <Box kind="adaptation" title="River barrier removal; urban greening (no net loss 2030, increasing from 2031)" chips={['✚ barriers removed', '✚ urban green space']} />
              <Box kind="adaptation" title="Pressure reduction: nutrients −50%, pesticides −50%, plastic litter at sea −50% by 2030" chips={['✚ nutrient losses', '✚ pesticide use & risk']} />
            </Band>
            <Arrow />
            <Band label="Enabling conditions" note="what activates the levers">
              <Box kind="both" title="National restoration plans (NRR Art. 14–15) and LULUCF national targets 2026–30" chips={['plan adoption & adequacy']} />
              <Box kind="both" title="Monitoring: habitat condition mapped (50% by 2030, all main groups by 2040)" chips={['✚ % condition known']} />
              <Box kind="both" title="Finance: CAP eco-schemes ≥25% of direct payments; 40% CAP climate share" chips={['eco-scheme uptake', 'CAP climate spend']} />
              <Box kind="adaptation" title="Knowledge & governance: Soil Mission (75% healthy soils), Mission on Adaptation regions" chips={['✚ % healthy soils']} />
            </Band>
          </div>

          <div className="mt-2 flex flex-wrap gap-3 text-[10.5px] text-tertiary dark:text-[var(--mh-muted)]">
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--viz-mitigation)' }} />Mitigation</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--viz-adaptation)' }} />Adaptation</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm" style={{ background: 'var(--viz-both)' }} />Both</span>
            <span>chips = candidate indicators · ✚ proposed addition · L-codes = existing report indicators</span>
          </div>

          <p className="mt-4 text-[12.5px] leading-relaxed text-tertiary dark:text-[var(--mh-muted)] max-w-[860px]">
            The point of the combined frame: the sink target (mitigation) is only deliverable if the adaptation outcomes hold — disturbance losses from fires, drought and pests are already eroding L1 — while most adaptation levers here (rewetting, restoration, urban greening) are themselves removal-positive. A progress assessment that scores both columns against the dated NRR/Zero-Pollution/CAP benchmarks would make that interdependence visible instead of leaving adaptation to a separate report with no indicator set.
          </p>
        </section>

        <p className="text-[11px] text-tertiary dark:text-[var(--mh-muted)] mb-8">
          Benchmarks referenced here are register rows from the v5 Masterfile (August 2026) — see the <Link href="/beta/policy-targets/sectors" className="text-secondary hover:underline">sector summaries</Link> for each target&rsquo;s verbatim text and EUR-Lex source. Report framework: ESABCC (2024), <em>Towards EU climate neutrality: progress, policy gaps and opportunities</em>, §2 (pp. 33–37).
        </p>
      </div>
    </div>
  );
}

function Arrow() {
  return <div aria-hidden className="text-center text-[16px] leading-none text-tertiary dark:text-[var(--mh-muted)] py-0.5">▲</div>;
}
