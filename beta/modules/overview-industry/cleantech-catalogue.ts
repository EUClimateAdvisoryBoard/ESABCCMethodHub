/**
 * Overview Industry — Clean Tech catalogue (data model + seed data).
 * ------------------------------------------------------------------
 * A collapsible catalogue that maps the EU-27 industry emission profile down
 * to its energy-intensive subsectors, then — for each subsector — to the
 * mitigation ("clean tech") options available to decarbonise it, and finally
 * to the per-option evidence: marginal abatement cost (MAC), technology
 * readiness (TRL), commercial availability, the real project pipeline (incl.
 * whether a Final Investment Decision has been taken), and a plain-language
 * rationale for why costs are high, what holds readiness back, and what makes
 * scaling hard.
 *
 * SCOPE (hard): the explorer catalogue (`CATALOGUE`) shows ONLY subsectors that
 * are activities under NACE Rev. 2.1 **Section C — Manufacturing** (divisions
 * 10–33, per Eurostat / Commission Delegated Regulation (EU) 2023/137). Every
 * one of the 14 subsectors maps into a Section C division (10 food, 11
 * beverages, 12 tobacco, 17 paper, 19 coke & refined petroleum, 20 chemicals,
 * 23 non-metallic minerals, 24 basic metals). The four decarbonisation levers
 * that are NOT manufacturing activities — electrification of heat & steam
 * supply, CO₂ transport & storage, clean-hydrogen supply, and material
 * efficiency / waste recovery — are classified by NACE in Sections D, E and H,
 * so they are held OUT of the subsector catalogue and listed separately as
 * `CROSS_CUTTING_ENABLERS` (see `MANUFACTURING_SECTION`). This keeps the tree a
 * clean "NACE Manufacturing" object while still surfacing the enablers those
 * manufacturing subsectors depend on.
 *
 * SOURCING RULE (hard): every data point carries a `source` with a real,
 * working link. Nothing here is invented. Figures are drawn from EU official
 * data (EEA, EU ETS), the IPCC AR6 WG3 Industry chapter, IEA technology
 * roadmaps and databases, and peer-reviewed / high-quality grey literature
 * (Material Economics, Fraunhofer, LeadIT, company/project disclosures). MAC
 * and TRL bands are inherently study- and assumption-dependent; each is
 * attributed to the specific source it came from and should be read as
 * "as reported by <source>", not as a single settled number.
 *
 * This is a curated FIRST BUILD (v0.1): broad across the high-emitting
 * subsectors and the principal levers, deliberately extensible. Gaps are
 * marked rather than filled with guesses. The catalogue is designed to be
 * mined for recurring themes and bottlenecks that can inform policy.
 */

export interface Source {
  /** Publishing organisation, e.g. "IEA", "EEA", "IPCC". */
  org: string;
  /** Document / page title. */
  title: string;
  /** Real, working URL to the source. */
  url: string;
  /** Publication year, when known. */
  year?: string;
}

/** A single evidenced value: the figure/text plus the source it came from. */
export interface Sourced {
  /** The value, e.g. "€40–120/tCO₂", "TRL 8–9", "≈27% of EU industry GHG". */
  value: string;
  /** Optional qualifier ("global figure", "study central case", …). */
  note?: string;
  source: Source;
}

export type ProjectStatus =
  | 'operational'
  | 'construction'
  | 'fid'
  | 'announced'
  | 'pilot'
  | 'cancelled';

export interface Project {
  name: string;
  company?: string;
  location?: string;
  /** Nameplate capacity / scale when built, as reported. */
  capacity?: string;
  status: ProjectStatus;
  /** Explicit note on the Final Investment Decision, when known. */
  fid?: string;
  year?: string;
  source: Source;
}

export interface Rationale {
  /** Why are abatement costs high right now? */
  costDrivers: Sourced;
  /** What is holding technology readiness back? */
  readinessBarriers: Sourced;
  /** What is the problem with scaling it up? */
  scaleProblems: Sourced;
}

export interface Technology {
  id: string;
  name: string;
  description: string;
  mac?: Sourced;
  trl?: Sourced;
  availability?: Sourced;
  projects: Project[];
  rationale: Rationale;
}

/**
 * Industry branch grouping, for colour-coding the diagram. The first four are
 * NACE Rev. 2.1 Section C (Manufacturing) branches shown in the explorer;
 * 'Cross-cutting levers' is reserved for the enablers that sit OUTSIDE Section C
 * (`CROSS_CUTTING_ENABLERS`) and never appears in the manufacturing tree.
 */
export type Branch =
  | 'Metals'
  | 'Non-metallic minerals'
  | 'Chemicals & refining'
  | 'Other manufacturing'
  | 'Cross-cutting levers';

export interface Subsector {
  id: string;
  name: string;
  /** Industry branch grouping, for colour-coding the diagram. */
  branch: Branch;
  /** Short characterisation of the subsector. */
  summary: string;
  /**
   * NACE Rev. 2.1 codes (divisions/groups/classes) this subsector maps to,
   * per the official Eurostat classification (see `nace-2-1.ts`, retrieved in
   * full from the EU Publications Office ShowVoc dataset).
   */
  nace: string[];
  /** Caveat on the NACE mapping where it is partial or indicative. */
  naceNote?: string;
  /** Evidenced statements about this subsector's EU emissions profile. */
  emissions: Sourced[];
  technologies: Technology[];
}

/** Headline, evidenced facts about the EU-27 industry emission profile. */
export interface OverviewFact {
  label: string;
  value: string;
  detail: string;
  source: Source;
}

/* ------------------------------------------------------------- shared srcs */

const S = {
  eeaBrief: {
    org: 'European Environment Agency (EEA)',
    title:
      'Zero pollution, decarbonisation and circular economy in energy-intensive industries',
    url: 'https://www.eea.europa.eu/en/analysis/publications/zero-pollution-decarbonisation-and-circular-economy-in-energy-intensive-industries',
    year: '2026',
  } as Source,
  eeaEts: {
    org: 'European Environment Agency (EEA)',
    title: 'Greenhouse gas emissions under the EU Emissions Trading System (indicator)',
    url: 'https://www.eea.europa.eu/en/analysis/indicators/greenhouse-gas-emissions-under-the',
    year: '2025',
  } as Source,
  ipcc11: {
    org: 'IPCC',
    title: 'AR6 WGIII, Chapter 11: Industry',
    url: 'https://www.ipcc.ch/report/ar6/wg3/chapter/chapter-11/',
    year: '2022',
  } as Source,
  ieaSteel: {
    org: 'IEA',
    title: 'Iron and Steel Technology Roadmap',
    url: 'https://www.iea.org/reports/iron-and-steel-technology-roadmap',
    year: '2020',
  } as Source,
  ieaEtpGuide: {
    org: 'IEA',
    title: 'ETP Clean Energy Technology Guide (technology readiness levels)',
    url: 'https://www.iea.org/data-and-statistics/data-tools/etp-clean-energy-technology-guide',
    year: '2024',
  } as Source,
  ieaPetchem: {
    org: 'IEA',
    title: 'The Future of Petrochemicals',
    url: 'https://www.iea.org/reports/the-future-of-petrochemicals',
    year: '2018',
  } as Source,
  ieaAmmonia: {
    org: 'IEA',
    title: 'Ammonia Technology Roadmap',
    url: 'https://www.iea.org/reports/ammonia-technology-roadmap',
    year: '2021',
  } as Source,
  ieaCement: {
    org: 'IEA / CSI',
    title: 'Technology Roadmap: Low-Carbon Transition in the Cement Industry',
    url: 'https://www.iea.org/reports/technology-roadmap-low-carbon-transition-in-the-cement-industry',
    year: '2018',
  } as Source,
  ieaH2: {
    org: 'IEA',
    title: 'Global Hydrogen Review 2024',
    url: 'https://www.iea.org/reports/global-hydrogen-review-2024',
    year: '2024',
  } as Source,
  ieaHeatPumps: {
    org: 'IEA',
    title: 'The Future of Heat Pumps',
    url: 'https://www.iea.org/reports/the-future-of-heat-pumps',
    year: '2022',
  } as Source,
  matecon: {
    org: 'Material Economics',
    title: 'Industrial Transformation 2050 — Pathways to Net-Zero Emissions from EU Heavy Industry',
    url: 'https://materialeconomics.com/node/13',
    year: '2019',
  } as Source,
  leadit: {
    org: 'LeadIT (SEI)',
    title: 'Green Steel Tracker',
    url: 'https://www.industrytransition.org/green-steel-tracker/',
    year: '2026',
  } as Source,
  eprsSteel: {
    org: 'European Parliament (EPRS)',
    title: 'Carbon-free steel production — Cost reduction options and usage of existing gas infrastructure',
    url: 'https://www.europarl.europa.eu/RegData/etudes/STUD/2021/690008/EPRS_STU(2021)690008_EN.pdf',
    year: '2021',
  } as Source,
  sandbag2023: {
    org: 'Sandbag (EEA EU ETS Data Viewer / EUTL)',
    title: 'A closer look at 2023 emissions',
    url: 'https://sandbag.be/2024/10/07/a-closer-look-at-2023-emissions/',
    year: '2024',
  } as Source,
  sandbagChem: {
    org: 'Sandbag (EU ETS / EUTL)',
    title: 'Chemicals in the CBAM: Time to step up',
    url: 'https://sandbag.be/2025/11/25/chemicals-in-the-cbam-time-to-step-up/',
    year: '2025',
  } as Source,
  eeaChem: {
    org: 'European Environment Agency (EEA)',
    title: 'Total greenhouse gas emissions in the chemical industry (indicator)',
    url: 'https://www.eea.europa.eu/en/european-zero-pollution-dashboards/indicators/total-greenhouse-gas-emissions-in-the-chemical-industry',
    year: '2021',
  } as Source,
  naceSectionC: {
    org: 'Eurostat',
    title:
      'NACE Rev. 2.1 — Statistical classification of economic activities in the European Union (2025 edition): Section C “Manufacturing” spans divisions 10–33',
    url: 'https://ec.europa.eu/eurostat/web/products-manuals-and-guidelines/w/ks-gq-24-007',
    year: '2025',
  } as Source,
  naceRegulation: {
    org: 'European Commission (EUR-Lex)',
    title:
      'Commission Delegated Regulation (EU) 2023/137 establishing NACE Rev. 2.1 (applicable from 1 January 2025)',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=legissum:24030103_2',
    year: '2023',
  } as Source,
};

/* --------------------------------------------------------------- overview */

export const OVERVIEW_FACTS: OverviewFact[] = [
  {
    label: 'Energy-intensive industry share',
    value: '≈ 27%',
    detail:
      "Energy-intensive industries account for just under 27% of total EU industry greenhouse-gas emissions (CO₂e). The six branches analysed — iron & steel, cement & lime, aluminium, pulp & paper, glass & clay, chemicals — together use more than 60% of all manufacturing energy.",
    source: S.eeaBrief,
  },
  {
    label: 'Trend since 2005',
    value: '−42%',
    detail:
      'GHG emissions from EU energy-intensive industries fell 42% between 2005 and 2023, with the largest cuts in chemicals (−49%), aluminium (−45%) and pulp & paper (−51%).',
    source: S.eeaBrief,
  },
  {
    label: 'Process emissions are the hard core',
    value: '≈ 60%',
    detail:
      'About 60% of cement-sector GHG is released by the chemical process of limestone calcination — emissions inherent to the chemistry, not the fuel, which is why fuel-switching alone cannot decarbonise cement, lime, or the process CO₂ in steel and ammonia.',
    source: S.eeaBrief,
  },
  {
    label: 'External cost of pollution',
    value: '≈ €73 bn/yr',
    detail:
      'The external costs of air and GHG pollution from EU energy-intensive industries remain around €73 billion per year — the policy prize from decarbonisation is not only climate but health and clean-air co-benefits.',
    source: S.eeaBrief,
  },
  {
    label: 'EU ETS direction of travel',
    value: '−7% in 2024',
    detail:
      'Emissions from ETS stationary installations fell 7% in 2024; combustion and cement-clinker emissions continued to fall, while oil-refining and iron & steel stayed broadly stable — the hard-to-abate core is where progress stalls.',
    source: S.eeaEts,
  },
  {
    label: 'Three levers, quantified',
    value: 'Circularity · clean processes · CCS',
    detail:
      'Material Economics finds EU heavy industry can reach net zero by 2050 via material efficiency & circularity (58–171 MtCO₂/yr), new clean production processes (143–241 MtCO₂/yr) and CCS/CCU (45–235 MtCO₂/yr) — the catalogue below maps these levers onto each subsector.',
    source: S.matecon,
  },
];

/* -------------------------------------------------------------- catalogue */

export const CATALOGUE: Subsector[] = [
  /* ============================================================ METALS === */
  {
    id: 'steel',
    name: 'Iron & steel',
    branch: 'Metals',
    summary:
      'The single largest industrial CO₂ source in the EU. Primary steel via the coal-based blast furnace / basic-oxygen-furnace (BF-BOF) route carries both energy and process (coke reduction) emissions; secondary steel via scrap + electric-arc furnace (EAF) is already low-carbon if powered by clean electricity.',
    nace: ['24.1', '24.2', '24.3', '24.51', '24.52', '19.10'],
    naceNote:
      'core route = 24.10 (basic iron & steel and ferro-alloys); 24.2–24.3 first processing of steel; 24.51–24.52 casting of iron/steel; 19.10 coke oven products is the value-chain upstream',
    emissions: [
      {
        value: '≈ 96 Mt CO₂ (EU ETS, 2023)',
        note: 'EUTL "pig iron or steel" activity; ~145 Mt on a value-chain basis incl. coke ovens & captive power',
        source: S.sandbag2023,
      },
      {
        value: 'Broadly stable in the EU ETS (2024)',
        note: 'iron & steel is one of the sectors where ETS emissions did not fall in 2024',
        source: S.eeaEts,
      },
      {
        value: '≈ 7–8% of global energy-system CO₂',
        note: 'sector context (global)',
        source: S.ieaSteel,
      },
    ],
    technologies: [
      {
        id: 'steel-h2dri',
        name: 'Hydrogen direct reduction (H₂-DRI) + EAF',
        description:
          'Reduce iron ore with (green) hydrogen instead of coke to make direct-reduced iron, then melt in an electric-arc furnace. The reduction step emits water, not CO₂; near-zero if hydrogen and power are renewable.',
        mac: {
          value: '≈ €73–166/tCO₂ by 2030',
          note: 'cleaner steel routes; environmental premium of 5–24% on steel price',
          source: S.eprsSteel,
        },
        trl: {
          value: 'TRL 6–8 (demonstration → first-of-a-kind commercial)',
          source: S.ieaEtpGuide,
        },
        availability: {
          value: 'First commercial-scale plants building now; ~90% CO₂ cut vs BF-BOF',
          source: S.eprsSteel,
        },
        projects: [
          {
            name: 'Stegra (formerly H2 Green Steel), Boden',
            company: 'Stegra',
            location: 'Boden, Sweden',
            capacity: '2.1 Mt/yr DRI · 2.5 Mt/yr steel · 700 MW electrolyser (phase 1)',
            status: 'construction',
            fid: 'FID 2023–24; under construction, ~60% complete (Oct 2025), first steel targeted 2026; ~60% of output under offtake (Mercedes-Benz, Porsche, Volvo, IKEA)',
            year: '2024',
            source: {
              org: 'Mission Possible Partnership',
              title: 'Stegra — bright spot',
              url: 'https://buildcleannow.missionpossiblepartnership.org/bright-spot/stegra/',
              year: '2024',
            },
          },
          {
            name: 'SSAB Luleå green-steel mill',
            company: 'SSAB',
            location: 'Luleå, Sweden',
            capacity: '2.5 Mt/yr (mini-mill, two EAFs; ≈€4.5bn)',
            status: 'construction',
            fid: 'FID April 2024; groundbreaking Sep 2025; start-up slipped 12 months to end-2029 on grid delays',
            year: '2025',
            source: { org: 'SteelOrbis', title: "Sweden's SSAB breaks ground for Luleå green steel mill", url: 'https://www.steelorbis.com/steel-news/latest-news/swedens-ssab-breaks-ground-for-lule-green-steel-mill-1410529.htm', year: '2025' },
          },
          {
            name: 'thyssenkrupp tkH2Steel DRI plant',
            company: 'thyssenkrupp Steel',
            location: 'Duisburg, Germany',
            capacity: '2.5 Mt/yr DRI (hydrogen-ready)',
            status: 'construction',
            fid: 'Under construction (~2027), but green-H₂ tender postponed indefinitely (Mar 2025); runs on natural gas until ~2028',
            year: '2025',
            source: { org: 'EUROMETAL', title: 'Thyssenkrupp Steel pauses German green hydrogen tender on high prices', url: 'https://eurometal.net/thyssenkrupp-steel-pauses-german-green-hydrogen-tender-on-high-prices/', year: '2025' },
          },
          {
            name: 'ArcelorMittal EU DRI-EAF projects (Bremen & Eisenhüttenstadt)',
            company: 'ArcelorMittal',
            location: 'Germany',
            capacity: 'Planned H2-DRI + EAF',
            status: 'cancelled',
            fid: 'Cancelled June 2025 — forwent a €1.3bn German state grant, citing high power prices and lack of viable green hydrogen',
            year: '2025',
            source: { org: 'EUROMETAL', title: 'ArcelorMittal cancels DRI-EAF decarbonisation investment in Germany', url: 'https://eurometal.net/arcelormittal-cancels-dri-eaf-decarbonisation-investment-in-germany/', year: '2025' },
          },
          {
            name: 'European green-steel pipeline (SALCOS, thyssenkrupp, HYBRIT…)',
            company: 'Multiple',
            location: 'EU',
            capacity: 'Tracked publicly',
            status: 'announced',
            fid: 'Mixed — new project announcements fell from ~15 (2021) to 2 (2025); several EU projects delayed pending policy & power-cost certainty',
            source: S.leadit,
          },
        ],
        rationale: {
          costDrivers: {
            value:
              'Cost is dominated by the price of green hydrogen and clean electricity: producing ~50–60 kg H₂ per tonne of steel makes electricity/hydrogen cost the single biggest lever, and today green H₂ is far dearer than coke.',
            source: S.eprsSteel,
          },
          readinessBarriers: {
            value:
              'The DRI-EAF chain is proven, but at full commercial scale with 100% hydrogen it is first-of-a-kind; matching hydrogen supply, storage and quality DRI-grade ore (pellets) at scale is unproven.',
            source: S.ieaSteel,
          },
          scaleProblems: {
            value:
              'Requires vast new firm renewable power and electrolyser capacity per plant plus DRI-grade iron-ore pellet supply that is globally scarce; 2025 saw EU project momentum slow as these enablers lagged.',
            source: S.leadit,
          },
        },
      },
      {
        id: 'steel-scrap-eaf',
        name: 'Scrap-based EAF (secondary steel)',
        description:
          'Melt recycled steel scrap in an electric-arc furnace. Commercially mature and already ~4–5× less carbon-intensive than primary steel where the grid is clean.',
        trl: { value: 'TRL 9 (mature, commercial)', source: S.ieaEtpGuide },
        availability: {
          value: 'Widely deployed across the EU today',
          source: S.ieaSteel,
        },
        projects: [
          {
            name: 'Existing EU EAF fleet',
            location: 'EU',
            status: 'operational',
            fid: 'n/a — established technology',
            source: S.ieaSteel,
          },
        ],
        rationale: {
          costDrivers: {
            value:
              'Competitive today; the binding constraint is not process cost but scrap price/quality and electricity cost.',
            source: S.ieaSteel,
          },
          readinessBarriers: {
            value:
              'Mature; the limit is metallurgical — residual (tramp) elements like copper in scrap cap the quality of steel that can be made from 100% scrap.',
            source: S.matecon,
          },
          scaleProblems: {
            value:
              'Scrap availability is finite and set by past steel demand; the EU cannot meet all steel demand from scrap, so primary low-carbon routes remain essential.',
            source: S.matecon,
          },
        },
      },
      {
        id: 'steel-ng-dri',
        name: 'Natural-gas DRI + EAF (transitional)',
        description:
          'DRI using natural gas (optionally blended with hydrogen) as reductant. Cuts emissions ~40–60% vs BF-BOF and can be retrofitted to hydrogen later — a transition asset.',
        trl: { value: 'TRL 9 for NG-DRI; H₂-ready designs emerging', source: S.ieaEtpGuide },
        availability: { value: 'Commercial; being built as "H₂-ready"', source: S.ieaSteel },
        projects: [
          {
            name: 'H₂-ready DRI investments (EU)',
            location: 'EU',
            status: 'announced',
            fid: 'Several announced as gas-first, hydrogen-ready',
            source: S.leadit,
          },
        ],
        rationale: {
          costDrivers: {
            value: 'Exposed to natural-gas price volatility, sharply worsened by the 2022 EU energy crisis.',
            source: S.ieaSteel,
          },
          readinessBarriers: {
            value: 'Technology mature; the open question is the pace of switching gas → hydrogen.',
            source: S.ieaSteel,
          },
          scaleProblems: {
            value: 'A gas-based bridge risks lock-in if the hydrogen switch is delayed.',
            source: S.ipcc11,
          },
        },
      },
      {
        id: 'steel-bf-ccs',
        name: 'BF-BOF + CCUS / top-gas recycling',
        description:
          'Keep the blast furnace but capture its CO₂ (incl. top-gas recycling, smelting-reduction variants like HIsarna). Suits sites near CO₂ transport & storage.',
        trl: { value: 'TRL 5–7 (large pilot / demonstration)', source: S.ieaEtpGuide },
        availability: { value: 'Demonstration; depends on shared CO₂ infrastructure', source: S.ieaSteel },
        projects: [
          {
            name: 'Steel CCUS clusters (e.g. North Sea storage links)',
            location: 'EU',
            status: 'announced',
            fid: 'Dependent on CO₂ transport & storage networks reaching FID',
            source: S.ieaSteel,
          },
        ],
        rationale: {
          costDrivers: {
            value: 'Adds capture energy penalty plus CO₂ transport & storage fees on top of an unchanged furnace.',
            source: S.ipcc11,
          },
          readinessBarriers: {
            value: 'Capture rates on dilute, multi-point steel off-gases are harder than on a single clean stack.',
            source: S.ieaSteel,
          },
          scaleProblems: {
            value: 'Stranded without nearby CO₂ pipelines/storage; competes with H₂-DRI for the same decarbonisation capital.',
            source: S.matecon,
          },
        },
      },
      {
        id: 'steel-electrolysis',
        name: 'Iron ore electrolysis (electrowinning / molten oxide)',
        description:
          'Make iron directly from ore by electrolysis (aqueous electrowinning, e.g. SIDERWIN/ΣIDERWIN; or molten-oxide electrolysis). Skips carbon entirely; earliest-stage of the primary routes.',
        trl: { value: 'TRL 3–5 (lab → pilot)', source: S.ieaEtpGuide },
        availability: { value: 'Pilot; not before the 2030s at scale', source: S.ipcc11 },
        projects: [
          {
            name: 'SIDERWIN pilot (electrowinning)',
            location: 'EU',
            status: 'pilot',
            fid: 'Research/pilot stage',
            source: S.ipcc11,
          },
        ],
        rationale: {
          costDrivers: {
            value: 'Very electricity-intensive and pre-commercial, so unit costs are unknown/high.',
            source: S.ipcc11,
          },
          readinessBarriers: {
            value: 'Fundamental scale-up of electrolysis cells and electrodes for iron is unproven at industrial size.',
            source: S.ieaSteel,
          },
          scaleProblems: {
            value: 'A decade-plus and enormous clean-power build-out from commercial relevance.',
            source: S.ipcc11,
          },
        },
      },
    ],
  },
  {
    id: 'aluminium',
    name: 'Aluminium',
    branch: 'Metals',
    summary:
      'Primary aluminium is dominated by (a) indirect emissions from the huge electricity draw of smelting and (b) direct process CO₂ from the consumable carbon anodes. Secondary (recycled) aluminium needs ~5% of the energy. EU aluminium GHG fell ~45% since 2005.',
    nace: ['24.42'],
    naceNote: '24.42 covers both alumina refining and primary/secondary aluminium production',
    emissions: [
      {
        value: '≈ 2.75 Mt CO₂ direct (2022)',
        note: 'mainly anode process CO₂; far larger power-related emissions are indirect (EU smelting ≈93% hydropower). Sector ≈24 Mt CO₂e/yr incl. indirect',
        source: { org: 'JRC (European Commission)', title: 'Aluminium factsheet (JRC144120)', url: 'https://publications.jrc.ec.europa.eu/repository/bitstream/JRC144120/Aluminium_factsheet_JRC144120.pdf', year: '2026' },
      },
      { value: '−45% (2005–2023)', note: 'one of the three deepest EU cuts among energy-intensive industries', source: S.eeaBrief },
    ],
    technologies: [
      {
        id: 'alu-inert-anode',
        name: 'Inert anodes (ELYSIS)',
        description:
          'Replace consumable carbon anodes with inert anodes that emit oxygen instead of CO₂, eliminating direct process emissions from smelting.',
        trl: { value: 'TRL 6–7 (industrial-scale prototype cells)', source: S.ieaEtpGuide },
        availability: {
          value: 'Commercial-scale prototype (450 kA) cells starting up; commercialisation this decade',
          source: {
            org: 'ELYSIS',
            title: 'Carbon-free aluminium smelting advances commercial demonstration and operates at industrial scale',
            url: 'https://elysis.com/en/carbon-free-aluminium-smelting-a-step-closer-elysis-advances-commercial-demonstration-and-operates',
            year: '2021',
          },
        },
        projects: [
          {
            name: 'ELYSIS industrial prototype cells, Alma smelter',
            company: 'ELYSIS (Rio Tinto + Alcoa JV)',
            location: 'Quebec, Canada (tech relevant to EU smelters)',
            capacity: '450 kA commercial-scale cells',
            status: 'pilot',
            fid: 'Prototype cell construction/start-up from 2024; first technology licence issued',
            year: '2024',
            source: {
              org: 'ELYSIS',
              title: 'Start of construction of commercial-scale inert anode cells',
              url: 'https://elysis.com/en/start-of-construction-of-commercial-scale-inert-anode-cells',
            },
          },
        ],
        rationale: {
          costDrivers: {
            value: 'Novel electrode materials must survive an extremely corrosive high-temperature bath; durable versions are costly and pre-commercial.',
            source: S.ipcc11,
          },
          readinessBarriers: {
            value: 'Proving anode lifetime and cell performance at full smelter scale over years, not months.',
            source: {
              org: 'ELYSIS',
              title: 'Carbon-free aluminium smelting advances to industrial scale',
              url: 'https://elysis.com/en/carbon-free-aluminium-smelting-a-step-closer-elysis-advances-commercial-demonstration-and-operates',
              year: '2021',
            },
          },
          scaleProblems: {
            value: 'Retrofitting the global smelter fleet is a multi-decade capital cycle; only cuts process CO₂ — the far larger power-related emissions still need clean electricity.',
            source: S.ipcc11,
          },
        },
      },
      {
        id: 'alu-secondary',
        name: 'Secondary (recycled) aluminium',
        description:
          'Remelt scrap aluminium using ~5% of the energy of primary smelting. The largest near-term lever if collection and sorting improve.',
        trl: { value: 'TRL 9 (mature)', source: S.ieaEtpGuide },
        availability: { value: 'Widely deployed; expandable with better scrap circularity', source: S.matecon },
        projects: [
          { name: 'EU recycling capacity', location: 'EU', status: 'operational', fid: 'n/a — established', source: S.matecon },
        ],
        rationale: {
          costDrivers: {
            value: 'Economically attractive; limited by scrap collection, sorting and alloy contamination, not process cost.',
            source: S.matecon,
          },
          readinessBarriers: { value: 'Mature; challenge is scrap quality and alloy separation.', source: S.matecon },
          scaleProblems: {
            value: 'Supply is capped by available end-of-life scrap; cannot alone meet growing demand.',
            source: S.matecon,
          },
        },
      },
      {
        id: 'alu-renewable-power',
        name: 'Renewable-powered smelting',
        description:
          'Cut the dominant indirect emissions by sourcing smelter electricity from renewables via PPAs and clean-grid siting.',
        trl: { value: 'TRL 9 (power sourcing, not a new process)', source: S.ieaEtpGuide },
        availability: { value: 'Available now via power purchase agreements', source: S.ipcc11 },
        projects: [
          { name: 'Renewable PPAs at EU smelters', location: 'EU', status: 'operational', fid: 'Commercial contracts', source: S.ipcc11 },
        ],
        rationale: {
          costDrivers: { value: 'Exposed to EU industrial power prices, which spiked during the energy crisis and threaten smelter competitiveness.', source: S.ipcc11 },
          readinessBarriers: { value: 'No technology barrier; the constraint is access to affordable firm clean power.', source: S.ipcc11 },
          scaleProblems: { value: 'Needs large volumes of 24/7 clean power; grid build-out and price are the limits.', source: S.ipcc11 },
        },
      },
    ],
  },
  {
    id: 'nonferrous',
    name: 'Other non-ferrous metals (copper, zinc, nickel)',
    branch: 'Metals',
    summary:
      'Copper, zinc and nickel production combines electricity-intensive electrolysis/smelting with process heat. Decarbonisation leans on electrification, clean power and recycling; a smaller EU emitter than steel/aluminium but strategically critical for the transition itself.',
    nace: ['24.43', '24.44', '24.45'],
    naceNote:
      'group 24.4 also contains precious metals (24.41), aluminium (24.42, own subsector) and nuclear-fuel processing (24.46)',
    emissions: [
      { value: '≈ 52 Mt CO₂e — whole EU non-ferrous sector', note: 'EU28+EFTA 2015, 18 Mt direct + 37 Mt indirect; INCLUDES aluminium (dominant) — a copper/zinc/nickel-only figure is not isolable in public data', source: { org: 'Eurometaux / VUB-IES', title: 'Metals for a Climate Neutral Europe — a 2050 Blueprint', url: 'https://eurometaux.eu/media/2005/full-report-8-56-17.pdf', year: '2019' } },
      { value: 'Part of the ~27% energy-intensive industry share', source: S.eeaBrief },
    ],
    technologies: [
      {
        id: 'nonferrous-electrification',
        name: 'Electrification & clean-power sourcing',
        description: 'Electrify furnaces/electrowinning and source clean electricity; recycle secondary metal.',
        trl: { value: 'TRL 8–9 for core routes; mature recycling', source: S.ieaEtpGuide },
        availability: { value: 'Largely available; incremental efficiency + clean power', source: S.ipcc11 },
        projects: [
          { name: 'EU non-ferrous decarbonisation (electrification + recycling)', location: 'EU', status: 'operational', fid: 'Incremental investments', source: S.ipcc11 },
        ],
        rationale: {
          costDrivers: { value: 'Power price exposure dominates; some high-temperature steps still need fuel or hydrogen.', source: S.ipcc11 },
          readinessBarriers: { value: 'Mature core processes; residual high-temperature and off-gas steps are harder.', source: S.ipcc11 },
          scaleProblems: { value: 'Rising demand for transition metals can outpace efficiency gains; recycling supply is finite.', source: S.matecon },
        },
      },
    ],
  },

  /* ============================================ NON-METALLIC MINERALS === */
  {
    id: 'cement',
    name: 'Cement & clinker',
    branch: 'Non-metallic minerals',
    summary:
      'The hardest of the hard-to-abate: ~60% of cement CO₂ comes from calcining limestone (CaCO₃ → CaO + CO₂) — inherent to the chemistry. Fuel switching and efficiency only touch the other ~40%, so cement cannot reach near-zero without carbon capture, clinker substitution, or novel chemistries.',
    nace: ['23.51'],
    naceNote: 'downstream concrete, mortar and plaster products are 23.6 (outside this catalogue)',
    emissions: [
      {
        value: '≈ 124 Mt CO₂ (EU ETS, 2023; cement clinker + lime combined)',
        note: 'EUTL "cement clinker or lime" activity type',
        source: S.sandbag2023,
      },
      { value: '≈ 60% of sector GHG is process CO₂ (calcination)', source: S.eeaBrief },
      { value: 'Cement-clinker ETS emissions continued to fall in 2024', source: S.eeaEts },
    ],
    technologies: [
      {
        id: 'cement-clinker-sub',
        name: 'Clinker substitution / calcined clay (LC3)',
        description:
          'Replace clinker with supplementary cementitious materials (slag, fly ash) and, increasingly, limestone + calcined clay (LC3). Calcined clay is fired at lower temperature and releases no process CO₂.',
        mac: { value: 'Low-cost / near-cost-neutral lever', note: 'cheapest first step', source: S.matecon },
        trl: { value: 'High TRL — commercial (LC3 up to ~50% clinker replacement, ~40% CO₂ cut)', source: {
          org: 'MDPI (Sustainability, peer-reviewed)',
          title: 'Limestone Calcined Clay Cement (LC3): From Laboratory Innovation to Sustainable Industrial Application',
          url: 'https://www.mdpi.com/2071-1050/18/7/3473',
          year: '2026',
        } },
        availability: { value: 'Deployed; growth limited by standards & material availability', source: S.ieaCement },
        projects: [
          { name: 'LC3 and blended-cement rollouts', location: 'EU / global', status: 'operational', fid: 'Commercial products', source: S.ieaCement },
        ],
        rationale: {
          costDrivers: { value: 'Often cost-neutral or cheaper; barrier is regulatory (product standards) and buyer acceptance, not cost.', source: S.matecon },
          readinessBarriers: { value: 'Mature chemistry; clay calcination quality control and standards adoption are the frontier.', source: S.ieaCement },
          scaleProblems: { value: 'Traditional SCMs (slag/fly ash) shrink as steel/coal decarbonise; suitable clay deposits and standards cap substitution.', source: S.matecon },
        },
      },
      {
        id: 'cement-ccs',
        name: 'Carbon capture (post-combustion, oxyfuel, LEILAC direct separation)',
        description:
          'Capture the unavoidable process CO₂ — via amine post-combustion (proven), oxyfuel, calcium looping, or direct separation (LEILAC) that isolates process CO₂ without a solvent. The only route to near-zero for the calcination CO₂.',
        mac: {
          value: '≈ €30–107/tCO₂ avoided (post-combustion)',
          note: 'IEAGHG: ~€59/t (3 Mt/yr plant) to ~€107/t (1 Mt/yr new EU plant); oxyfuel ~€37–42/t; falls sharply with scale',
          source: {
            org: 'IEAGHG',
            title: 'Cost of CO₂ capture in the industrial sector: cement and iron & steel industries (2018-TR03)',
            url: 'https://ieaghg.org/publications/cost-of-co2-capture-in-the-industrial-sector-cement-and-iron-and-steel-industries/',
            year: '2018',
          },
        },
        trl: { value: 'TRL 7–9 post-combustion (first full-scale plant operating); oxyfuel/LEILAC/calcium-looping TRL 4–7', source: S.ieaEtpGuide },
        availability: {
          value: "World's first industrial-scale cement CCS operating since 2025 (Brevik)",
          source: {
            org: 'Heidelberg Materials',
            title: 'World premiere: CCS cement facility opens in Norway (Brevik CCS)',
            url: 'https://www.heidelbergmaterials.com/en/pr-2025-06-18',
            year: '2025',
          },
        },
        projects: [
          {
            name: 'Brevik CCS',
            company: 'Heidelberg Materials (Aker Solutions amine capture)',
            location: 'Brevik, Norway',
            capacity: '≈ 400 kt CO₂/yr (~50% of plant); "evoZero" cement',
            status: 'operational',
            fid: 'FID 2020 (Norway Longship, Parliament approval Dec 2020); operational summer 2025 — CO₂ shipped to Northern Lights',
            year: '2025',
            source: {
              org: 'Heidelberg Materials',
              title: 'World premiere: CCS cement facility opens in Norway',
              url: 'https://www.heidelbergmaterials.com/en/pr-2025-06-18',
              year: '2025',
            },
          },
          {
            name: 'Padeswood CCS',
            company: 'Heidelberg Materials',
            location: 'Padeswood, North Wales, UK',
            capacity: '≈ 800 kt CO₂/yr (nearly all plant emissions); CO₂ to HyNet',
            status: 'fid',
            fid: 'FID taken 25 September 2025 (after UK Government funding); construction from late 2025, operation ~2029',
            year: '2025',
            source: {
              org: 'Heidelberg Materials',
              title: 'Heidelberg Materials takes Final Investment Decision for CCS project in UK',
              url: 'https://www.heidelbergmaterials.com/en/pr-2025-09-25',
              year: '2025',
            },
          },
          {
            name: 'LEILAC-2 (direct separation) & CLEANKER (calcium looping)',
            company: 'Calix / Heidelberg Materials; Buzzi Unicem consortium',
            location: 'Hannover, Germany; Vernasca, Italy',
            capacity: 'LEILAC-2 ≈ 100 kt CO₂/yr; CLEANKER pilot',
            status: 'pilot',
            fid: 'EU-funded demonstrations (not commercial FIDs) — LEILAC-2 targeting operation ~2025',
            year: '2025',
            source: {
              org: 'Project LEILAC (Calix)',
              title: 'LEILAC: capturing CO₂ in cement precalciners',
              url: 'https://calix.global/news/leilac-capturing-co2-in-cement-precalciners/',
              year: '2021',
            },
          },
        ],
        rationale: {
          costDrivers: { value: 'Capture plant capex + a large energy penalty to regenerate solvent, plus per-tonne CO₂ transport & storage charges.', source: S.ieaCement },
          readinessBarriers: { value: 'Post-combustion now proven at Brevik; oxyfuel, calcium looping and LEILAC still at demonstration.', source: S.ieaEtpGuide },
          scaleProblems: { value: 'Every plant needs access to CO₂ transport & storage; building that shared network is the rate-limiter, not the capture kit.', source: S.ieaCement },
        },
      },
      {
        id: 'cement-altfuels',
        name: 'Alternative fuels & kiln electrification',
        description:
          'Substitute fossil kiln fuel with biomass/waste-derived fuels and, prospectively, electrify calcination. Cuts the ~40% energy-related emissions but not the process CO₂.',
        trl: { value: 'Alt-fuels TRL 9; electrified calcination TRL 4–6', source: S.ieaEtpGuide },
        availability: { value: 'Alternative fuels widespread; electric kilns at pilot', source: S.ieaCement },
        projects: [
          { name: 'Alternative-fuel co-processing (EU kilns)', location: 'EU', status: 'operational', fid: 'Established practice', source: S.ieaCement },
        ],
        rationale: {
          costDrivers: { value: 'Alt-fuel logistics and pre-treatment; electrification adds power cost and is unproven for calcination.', source: S.ieaCement },
          readinessBarriers: { value: 'Fuel switching mature; high-temperature electric calcination is early-stage.', source: S.ieaEtpGuide },
          scaleProblems: { value: 'Cannot address process CO₂; sustainable biomass/waste supply is limited.', source: S.ipcc11 },
        },
      },
    ],
  },
  {
    id: 'lime',
    name: 'Lime',
    branch: 'Non-metallic minerals',
    summary:
      'Like cement, lime is a process-CO₂ sector: burning limestone to quicklime releases CO₂ from the rock itself. High-purity CO₂ off-gas actually makes lime a favourable early target for capture.',
    nace: ['23.52'],
    naceNote: '23.52 also includes plaster',
    emissions: [
      { value: 'Process-dominated (calcination of limestone)', source: S.eeaBrief },
      {
        value: 'Reported with cement in the EU ETS (combined ≈ 124 Mt, 2023)',
        note: 'lime is not split out as a standalone EUTL activity',
        source: S.sandbag2023,
      },
    ],
    technologies: [
      {
        id: 'lime-ccs',
        name: 'Carbon capture (oxyfuel / LEILAC / post-combustion)',
        description:
          'Capture the process CO₂ from lime kilns. The relatively pure CO₂ stream lends itself to oxyfuel and direct-separation approaches.',
        trl: { value: 'TRL 6–8 (demonstration → early commercial)', source: S.ieaEtpGuide },
        availability: { value: 'Demonstration; shares the CO₂ transport & storage dependency with cement', source: S.ieaCement },
        projects: [
          { name: 'Lime-sector CCS demonstrations', location: 'EU', status: 'announced', fid: 'Dependent on CO₂ infrastructure', source: S.ieaCement },
        ],
        rationale: {
          costDrivers: { value: 'Capture energy penalty + CO₂ transport & storage costs, on a relatively low-margin product.', source: S.ieaCement },
          readinessBarriers: { value: 'Capture chemistry known; full-scale lime demonstrations still few.', source: S.ieaEtpGuide },
          scaleProblems: { value: 'Same CO₂-network bottleneck as cement; many kilns are small and dispersed.', source: S.ieaCement },
        },
      },
    ],
  },
  {
    id: 'glass',
    name: 'Glass',
    branch: 'Non-metallic minerals',
    summary:
      'Container, flat and fibre glass melt raw materials at ~1,500 °C. Emissions are mostly energy (melting) plus some process CO₂ from carbonate raw materials. Levers: electric/hybrid furnaces, oxy-fuel, hydrogen firing and higher recycled-cullet use.',
    nace: ['23.11', '23.12', '23.13', '23.14', '23.15'],
    emissions: [
      {
        value: '≈ 22 Mt CO₂ direct/yr',
        note: 'melting-furnace combustion plus process CO₂ from carbonate raw materials',
        source: { org: 'European Commission (CINEA)', title: 'How LIFE is reducing emissions from glass production', url: 'https://cinea.ec.europa.eu/news-events/news/how-life-reducing-emissions-glass-production-2022-03-16_en', year: '2022' },
      },
      { value: 'Part of "glass & clay", within the ~27% share', source: S.eeaBrief },
    ],
    technologies: [
      {
        id: 'glass-electric-hybrid',
        name: 'Electric & hybrid furnaces',
        description:
          'All-electric melting (for suitable glass types) or hybrid furnaces that combine electricity with fuel, cutting combustion emissions as the grid cleans up.',
        trl: { value: 'All-electric mature for some products; large hybrid furnaces TRL 6–8', source: S.ieaEtpGuide },
        availability: { value: 'Available; scale/colour limits for all-electric', source: S.ipcc11 },
        projects: [
          { name: 'EU hybrid/electric furnace investments', location: 'EU', status: 'construction', fid: 'Several announced/underway by major glassmakers', source: S.ipcc11 },
        ],
        rationale: {
          costDrivers: { value: 'Higher power cost vs gas; electricity-price exposure.', source: S.ipcc11 },
          readinessBarriers: { value: 'All-electric melting is limited by glass type, colour and furnace size.', source: S.ipcc11 },
          scaleProblems: { value: 'Furnaces are rebuilt only every ~12–15 years, so switchover is slow and capital-locked.', source: S.ipcc11 },
        },
      },
      {
        id: 'glass-cullet',
        name: 'Recycled cullet & oxy-fuel / hydrogen firing',
        description:
          'Every extra tonne of recycled cullet cuts both energy and process CO₂; oxy-fuel and (trial) hydrogen firing reduce combustion emissions further.',
        trl: { value: 'Cullet mature; hydrogen firing at trial (TRL 5–7)', source: S.ieaEtpGuide },
        availability: { value: 'Cullet available now; hydrogen firing in trials', source: S.ipcc11 },
        projects: [
          { name: 'Cullet-rate improvement + hydrogen firing trials', location: 'EU', status: 'pilot', fid: 'Trials/roadmaps', source: S.ipcc11 },
        ],
        rationale: {
          costDrivers: { value: 'Cullet economics hinge on collection systems; hydrogen firing is costly and supply-limited.', source: S.ipcc11 },
          readinessBarriers: { value: 'Hydrogen combustion in glass furnaces affects flame and glass quality — under test.', source: S.ipcc11 },
          scaleProblems: { value: 'Cullet supply and quality cap substitution; hydrogen availability limits firing.', source: S.ieaH2 },
        },
      },
    ],
  },
  {
    id: 'ceramics',
    name: 'Ceramics (bricks, tiles, refractories)',
    branch: 'Non-metallic minerals',
    summary:
      'Dispersed, mostly SME sector firing clay products in kilns. Emissions are energy-dominated with some process CO₂. Levers: electrification, hydrogen firing, heat recovery and efficiency.',
    nace: ['23.2', '23.3', '23.4'],
    naceNote: 'refractory products (23.2), clay building materials (23.3) and porcelain & other ceramics (23.4)',
    emissions: [
      {
        value: '≈ 19 Mt CO₂/yr (~1% of EU ETS industry)',
        note: '~64% combustion, ~19% indirect electricity, ~17% process (up to 30–60% process in bricks/heavy clay)',
        source: { org: 'Cerame-Unie', title: 'Ceramic industry position on the EU ETS review', url: 'https://cerameunie.eu/topics/climate-energy/emissions-trading-system/ceramic-industry-position-the-eu-ets-review/', year: '2023' },
      },
      { value: 'Part of "glass & clay", within the ~27% share', source: S.eeaBrief },
    ],
    technologies: [
      {
        id: 'ceramics-electrify-h2',
        name: 'Kiln electrification & hydrogen firing',
        description:
          'Electrify drying/firing where possible and trial hydrogen as a kiln fuel; recover waste heat to cut energy demand.',
        trl: { value: 'Electrification/heat recovery TRL 7–9; hydrogen firing TRL 5–6', source: S.ieaEtpGuide },
        availability: { value: 'Efficiency & partial electrification now; hydrogen at trial', source: S.ipcc11 },
        projects: [
          { name: 'Ceramics hydrogen-firing trials', location: 'EU', status: 'pilot', fid: 'Sector trials', source: S.ipcc11 },
        ],
        rationale: {
          costDrivers: { value: 'Small dispersed plants and thin margins limit capital for novel kilns; power and hydrogen cost.', source: S.ipcc11 },
          readinessBarriers: { value: 'Hydrogen firing and full electrification of high-temperature kilns still being proven.', source: S.ieaEtpGuide },
          scaleProblems: { value: 'Fragmented SME structure makes fleet-wide investment slow; hydrogen supply scarce.', source: S.ieaH2 },
        },
      },
    ],
  },

  /* ============================================ CHEMICALS & REFINING === */
  {
    id: 'ammonia',
    name: 'Ammonia / nitrogen fertilisers',
    branch: 'Chemicals & refining',
    summary:
      'Ammonia (for fertiliser) is made from hydrogen + nitrogen; today the hydrogen comes from natural gas via steam-methane reforming, emitting CO₂. Switch the hydrogen to electrolysis ("green") or add CCS to the reformer ("blue").',
    nace: ['20.15'],
    naceNote: 'ammonia synthesis and nitrogen fertilisers; merchant industrial-gas ammonia falls under 20.11',
    emissions: [
      { value: 'A defined "hard-to-abate" hydrogen/feedstock emitter', source: S.matecon },
    ],
    technologies: [
      {
        id: 'ammonia-green-h2',
        name: 'Electrolytic ("green") hydrogen',
        description:
          'Produce the hydrogen for ammonia by water electrolysis with renewable power, eliminating feedstock CO₂.',
        mac: {
          value: '≈ US$820/t NH₃ (~US$400/t above conventional)',
          note: 'needs power below ~US$40/MWh for parity — implies an abatement cost of hundreds of $/tCO₂',
          source: { org: 'IEA', title: 'Ammonia Technology Roadmap — Executive Summary', url: 'https://www.iea.org/reports/ammonia-technology-roadmap/executive-summary', year: '2021' },
        },
        trl: { value: 'Electrolysis + Haber-Bosch both mature; integration scaling (TRL 7–8)', source: S.ieaAmmonia },
        availability: { value: 'First commercial green-ammonia plants operating', source: S.ieaAmmonia },
        projects: [
          {
            name: 'Yara Herøya renewable hydrogen/ammonia plant',
            company: 'Yara International',
            location: 'Porsgrunn/Herøya, Norway',
            capacity: '24 MW PEM electrolyser; ~20,500 t/yr green ammonia; cuts ~41,000 tCO₂/yr',
            status: 'operational',
            fid: 'FID January 2022 (Enova grant); inaugurated June 2024',
            year: '2024',
            source: { org: 'Yara International', title: 'Yara opens renewable hydrogen plant: a major milestone', url: 'https://www.yara.com/corporate-releases/yara-opens-renewable-hydrogen-plant-a-major-milestone/', year: '2024' },
          },
          { name: 'EU green-ammonia pipeline', location: 'EU', status: 'announced', fid: 'Several announced; FIDs gated by hydrogen cost & offtake', source: S.ieaH2 },
        ],
        rationale: {
          costDrivers: { value: 'Green hydrogen is much dearer than SMR hydrogen at current electrolyser and power costs.', source: S.ieaAmmonia },
          readinessBarriers: { value: 'Components mature; running Haber-Bosch on variable renewable-fed hydrogen at scale is the integration challenge.', source: S.ieaAmmonia },
          scaleProblems: { value: 'Needs enormous electrolyser + renewable build-out; global fertiliser markets are price-sensitive and trade-exposed.', source: S.ieaAmmonia },
        },
      },
      {
        id: 'ammonia-blue-h2',
        name: 'Blue hydrogen (SMR/ATR + CCS)',
        description:
          'Keep gas-based hydrogen but capture the CO₂ (autothermal reforming captures a higher share). A transitional route where cheap gas and storage exist.',
        trl: { value: 'TRL 7–9 (reforming + capture proven)', source: S.ieaEtpGuide },
        availability: { value: 'Available where CO₂ storage exists', source: S.ieaAmmonia },
        projects: [
          { name: 'Blue-ammonia / CCS-on-reformer projects', location: 'EU / global', status: 'announced', fid: 'Gated by CO₂ storage access', source: S.ieaAmmonia },
        ],
        rationale: {
          costDrivers: { value: 'Capture capex/energy + CO₂ storage fees; residual upstream methane emissions.', source: S.ieaAmmonia },
          readinessBarriers: { value: 'Proven components; capture rate and methane-leak integrity are the scrutiny points.', source: S.ipcc11 },
          scaleProblems: { value: 'Depends on CO₂ storage build-out and continued gas supply; risk of lock-in.', source: S.matecon },
        },
      },
    ],
  },
  {
    id: 'hvc',
    name: 'High-value chemicals / steam cracking',
    branch: 'Chemicals & refining',
    summary:
      'Steam crackers make ethylene, propylene and aromatics — the building blocks of plastics — by heating naphtha/gas to ~850 °C in fossil-fired furnaces. Levers: electric crackers, chemical/feedstock recycling, bio/renewable feedstock, and CCS.',
    nace: ['20.14', '20.16', '20.17'],
    naceNote:
      'other organic basic chemicals (20.14, incl. olefins & aromatics), plastics (20.16) and synthetic rubber (20.17) in primary forms',
    emissions: [
      {
        value: '≈ 155.5 Mt CO₂e — whole EU chemical industry (2021; 67% combustion / 33% process)',
        note: 'EEA inventory-based indicator, broader than the ETS scope',
        source: S.eeaChem,
      },
      {
        value: 'Refining + chemicals ≈ 203 Mt = 36% of EU ETS industry (2023)',
        source: S.sandbagChem,
      },
      { value: 'Core of the "plastics" hard-to-abate cluster', source: S.matecon },
      { value: 'EU chemicals GHG −49% since 2005 (largest cut of the six branches)', source: S.eeaBrief },
    ],
    technologies: [
      {
        id: 'hvc-ecracker',
        name: 'Electric steam crackers',
        description:
          'Heat the cracking furnace with renewable electricity instead of burning fuel gas — cutting furnace CO₂ by up to ~90%.',
        trl: { value: 'TRL 6–7 (large demonstration operating since 2024)', source: S.ieaEtpGuide },
        availability: {
          value: "World's first large-scale demonstration running (Ludwigshafen, from 2024)",
          source: {
            org: 'BASF / SABIC / Linde',
            title: "Start-up of the world's first large-scale electrically heated steam cracking furnace",
            url: 'https://www.basf.com/global/en/media/news-releases/2024/04/p-24-177',
            year: '2024',
          },
        },
        projects: [
          {
            name: 'BASF-SABIC-Linde electric cracker demonstration',
            company: 'BASF, SABIC, Linde',
            location: 'Ludwigshafen, Germany',
            capacity: '6 MW demonstration furnace; ~90% CO₂ cut potential',
            status: 'operational',
            fid: 'Demonstration operating since April 2024 (agreement 2021)',
            year: '2024',
            source: {
              org: 'BASF / SABIC / Linde',
              title: "World's first large-scale electrically heated steam cracking furnace starts up",
              url: 'https://www.basf.com/global/en/media/news-releases/2024/04/p-24-177',
              year: '2024',
            },
          },
        ],
        rationale: {
          costDrivers: { value: 'Large new clean-power demand replaces "free" fuel gas that the cracker already produces, changing site economics.', source: S.ieaPetchem },
          readinessBarriers: { value: 'Demonstration proven; scaling to full commercial furnace trains is the next step.', source: S.ieaEtpGuide },
          scaleProblems: { value: 'Retrofitting the huge installed cracker fleet needs vast firm clean power and long asset cycles.', source: S.ieaPetchem },
        },
      },
      {
        id: 'hvc-recycling',
        name: 'Chemical recycling & renewable feedstock',
        description:
          'Feed crackers with pyrolysis oil from plastic waste, or bio-naphtha, displacing fossil feedstock and closing the carbon loop.',
        trl: { value: 'Pyrolysis TRL 6–8; bio-naphtha available (drop-in)', source: S.ieaEtpGuide },
        availability: { value: 'Scaling; mass-balance certified products emerging', source: S.matecon },
        projects: [
          { name: 'Chemical-recycling / bio-feedstock investments', location: 'EU', status: 'construction', fid: 'Several under construction', source: S.matecon },
        ],
        rationale: {
          costDrivers: { value: 'Feedstock (clean waste plastic, bio-naphtha) is costly and supply-constrained; pyrolysis-oil upgrading adds cost.', source: S.matecon },
          readinessBarriers: { value: 'Pyrolysis-oil quality/contaminants for cracker feed still being proven at scale.', source: S.ieaPetchem },
          scaleProblems: { value: 'Limited by clean waste-plastic collection and sustainable biomass; competes with fuels for the same feedstock.', source: S.matecon },
        },
      },
    ],
  },
  {
    id: 'chloralkali',
    name: 'Chlor-alkali',
    branch: 'Chemicals & refining',
    summary:
      'Electrolysis of brine to chlorine, caustic soda and hydrogen — already electricity-based, so its footprint is essentially the grid plus efficiency. Levers: clean power, oxygen-depolarised cathodes and using the by-product hydrogen.',
    nace: ['20.13'],
    naceNote: 'chlorine, caustic soda and other inorganic basic chemicals',
    emissions: [
      { value: 'Emissions track the electricity grid (electro-intensive)', source: S.ipcc11 },
    ],
    technologies: [
      {
        id: 'chloralkali-odc',
        name: 'Oxygen-depolarised cathodes & clean power',
        description:
          'ODC membrane cells cut electricity use ~30%; sourcing clean power removes the indirect emissions; by-product hydrogen is used or sold.',
        trl: { value: 'ODC TRL 8–9; clean-power sourcing mature', source: S.ieaEtpGuide },
        availability: { value: 'Available; efficiency + power sourcing', source: S.ipcc11 },
        projects: [
          { name: 'Membrane/ODC upgrades + PPAs (EU)', location: 'EU', status: 'operational', fid: 'Incremental', source: S.ipcc11 },
        ],
        rationale: {
          costDrivers: { value: 'Power price is the dominant cost; ODC retrofits need capital.', source: S.ipcc11 },
          readinessBarriers: { value: 'Largely mature; ODC deployment is an efficiency retrofit decision.', source: S.ieaEtpGuide },
          scaleProblems: { value: 'Decarbonisation is essentially "clean the grid"; limited process-side novelty needed.', source: S.ipcc11 },
        },
      },
    ],
  },
  {
    id: 'methanol',
    name: 'Methanol',
    branch: 'Chemicals & refining',
    summary:
      'A key chemical building block and emerging fuel. Low-carbon routes: e-methanol (captured CO₂ + green hydrogen) and bio-methanol, plus methanol-to-olefins as an alternative route to plastics feedstock.',
    nace: ['20.14'],
    naceNote: 'methanol is part of 20.14 (other organic basic chemicals) — it has no NACE class of its own',
    emissions: [
      { value: 'Feedstock/process CO₂ emitter within chemicals', source: S.matecon },
    ],
    technologies: [
      {
        id: 'methanol-e-bio',
        name: 'E-methanol & bio-methanol',
        description:
          'Synthesise methanol from captured CO₂ + green hydrogen, or from biomass/biogas, displacing fossil-derived methanol.',
        trl: { value: 'TRL 7–8 (first commercial plants operating/building)', source: S.ieaEtpGuide },
        availability: { value: 'First commercial e-/bio-methanol plants online', source: S.ieaH2 },
        projects: [
          {
            name: 'Kassø e-methanol facility',
            company: 'European Energy & Mitsui',
            location: 'Kassø, Denmark',
            capacity: '42,000 t/yr e-methanol',
            status: 'operational',
            fid: "FID taken; world's first large-scale commercial e-methanol plant, inaugurated May 2025 (offtakers Maersk, LEGO, Novo Nordisk)",
            year: '2025',
            source: { org: 'European Energy', title: 'Kassø e-methanol facility officially inaugurated', url: 'https://europeanenergy.com/2025/05/13/kasso-e-methanol-facility-officially-inaugurated/', year: '2025' },
          },
          {
            name: 'FlagshipONE e-methanol',
            company: 'Ørsted',
            location: 'Örnsköldsvik, Sweden',
            capacity: '≈55,000 t/yr e-methanol (planned)',
            status: 'cancelled',
            fid: 'FID 2022 and under construction, but discontinued August 2024 (>$220m impairment) citing slow e-fuel demand',
            year: '2024',
            source: { org: 'The Maritime Executive', title: 'Ørsted Pulls Plug on Shipping E-Methanol Fuel Project', url: 'https://maritime-executive.com/article/oersted-pulls-plug-on-shipping-e-methanol-fuel-project-citing-slower-demand', year: '2025' },
          },
        ],
        rationale: {
          costDrivers: { value: 'Green hydrogen and captured-CO₂ cost make e-methanol far dearer than fossil methanol.', source: S.ieaH2 },
          readinessBarriers: { value: 'Synthesis proven; integrating CO₂ capture + variable hydrogen at scale is the step.', source: S.ieaH2 },
          scaleProblems: { value: 'Hydrogen and sustainable-CO₂/biomass supply cap volumes; strong fuel-market competition for output.', source: S.ieaH2 },
        },
      },
    ],
  },
  {
    id: 'refining',
    name: 'Petroleum refining',
    branch: 'Chemicals & refining',
    summary:
      'Refineries emit from process furnaces, hydrogen production and utilities. As transport fuels decline, refineries pivot to petrochemicals, biofuels/HVO and hydrogen hubs. Levers: electrification of heat, clean hydrogen, CCS and co-processing.',
    nace: ['19.20'],
    naceNote: 'refined petroleum and fossil fuel products; on-site fuel-gas manufacture is also 19.20',
    emissions: [
      {
        value: '≈ 105 Mt CO₂ (EU ETS, 2023)',
        note: 'EUTL "refining of mineral oil"; combustion-dominated',
        source: S.sandbag2023,
      },
      { value: 'Oil-refining ETS emissions stayed broadly stable in 2024', source: S.eeaEts },
    ],
    technologies: [
      {
        id: 'refining-ccs-h2-elec',
        name: 'CCS, clean hydrogen & electrification',
        description:
          'Capture CO₂ from concentrated refinery sources (esp. hydrogen units), switch to green/blue hydrogen, electrify process heat, and co-process bio-feedstocks (HVO).',
        trl: { value: 'CCS on hydrogen units TRL 8–9; heat electrification TRL 6–8', source: S.ieaEtpGuide },
        availability: { value: 'Available at cluster scale where CO₂ networks exist', source: S.ipcc11 },
        projects: [
          {
            name: 'Porthos (Rotterdam industrial/refinery CCS)',
            company: 'Port of Rotterdam / EBN / Gasunie (Shell, ExxonMobil, Air Liquide, Air Products emitters)',
            location: 'Rotterdam, Netherlands',
            capacity: '≈ 2.5 Mt CO₂/yr from refineries & hydrogen plants',
            status: 'fid',
            fid: 'FID taken October 2023; construction from 2024; operation expected ~2026–2028',
            year: '2023',
            source: {
              org: 'Rigzone',
              title: "Porthos Makes FID on Netherlands' First CCS Project",
              url: 'https://www.rigzone.com/news/porthos_makes_fid_on_netherlands_first_ccs_project-20-oct-2023-174412-article/',
              year: '2023',
            },
          },
        ],
        rationale: {
          costDrivers: { value: 'Capture + CO₂ transport & storage fees; green hydrogen premium; power cost for electrified heat.', source: S.ipcc11 },
          readinessBarriers: { value: 'Concentrated streams (hydrogen units) are capture-ready; dispersed furnace CO₂ is harder.', source: S.ipcc11 },
          scaleProblems: { value: 'Depends on shared CO₂ infrastructure and declining-then-repurposed demand; long asset lives.', source: S.matecon },
        },
      },
    ],
  },

  /* ============================================== OTHER MANUFACTURING === */
  {
    id: 'pulppaper',
    name: 'Pulp & paper',
    branch: 'Other manufacturing',
    summary:
      'Mostly medium-temperature heat and drying, much of it already biomass-fired (black liquor). The deepest EU cut of the six branches (−51% since 2005). Levers: electrification, high-temperature heat pumps, biomass and efficiency.',
    nace: ['17.11', '17.12'],
    naceNote: 'pulp (17.11) and paper & paperboard (17.12); converting into articles is 17.2',
    emissions: [
      { value: '≈ 27 Mt CO₂ direct fossil (2022)', note: 'predominantly energy/combustion; down ~50% since 2005 (large biogenic share excluded)', source: { org: 'CEPI', title: 'Key Statistics 2022 — European pulp & paper industry', url: 'https://www.cepi.org/wp-content/uploads/2023/07/2022-Key-Statistics-FINAL.pdf', year: '2022' } },
      { value: 'EU pulp & paper GHG −51% since 2005', source: S.eeaBrief },
    ],
    technologies: [
      {
        id: 'pulppaper-electrify-hp',
        name: 'Electrification, heat pumps & biomass',
        description:
          'Replace fossil boilers with electric boilers and high-temperature heat pumps for drying, and expand on-site biomass use.',
        trl: { value: 'Electric boilers/biomass TRL 9; high-temp heat pumps TRL 6–8', source: S.ieaEtpGuide },
        availability: { value: 'Available now for much of the heat demand', source: S.ieaHeatPumps },
        projects: [
          { name: 'Mill electrification & heat-pump retrofits', location: 'EU', status: 'operational', fid: 'Incremental investments', source: S.ieaHeatPumps },
        ],
        rationale: {
          costDrivers: { value: 'Power vs gas price spread; heat-pump capex for higher temperatures.', source: S.ieaHeatPumps },
          readinessBarriers: { value: 'Core tech mature; the 150–200 °C heat-pump frontier is still emerging.', source: S.ieaHeatPumps },
          scaleProblems: { value: 'Grid capacity at mills and sustainable biomass limits; mostly an investment-pace question.', source: S.ipcc11 },
        },
      },
    ],
  },
  {
    id: 'fooddrink',
    name: 'Food, beverages & tobacco',
    branch: 'Other manufacturing',
    summary:
      'Large, distributed sector dominated by low- and medium-temperature heat (washing, pasteurising, drying) — the most electrifiable heat demand in industry. Levers: heat pumps, electric boilers, mechanical vapour recompression, solar thermal and biomass/biogas.',
    nace: ['10', '11', '12'],
    naceNote: 'whole divisions: food products (10), beverages (11) and tobacco products (12)',
    emissions: [
      { value: '≈ 94 Mt CO₂e/yr — EU food & drink manufacturing', note: '~5th-largest EU industrial emitter; ~two-thirds of energy is heat, one-third electricity', source: { org: 'FoodDrinkEurope (Ricardo roadmap)', title: 'Our climate journey: the road to net-zero', url: 'https://www.fooddrinkeurope.eu/our-climate-journey-the-road-to-net-zero/', year: '2021' } },
      { value: 'Distributed low/medium-temperature heat; broadly electrifiable', source: S.ieaHeatPumps },
    ],
    technologies: [
      {
        id: 'food-heatpumps',
        name: 'Industrial heat pumps & electric boilers',
        description:
          'Supply low/medium-temperature process heat efficiently with heat pumps (and electric boilers for backup), the natural fit for food & drink temperatures.',
        trl: { value: 'Electric boilers TRL 9; industrial heat pumps TRL 7–9 (up to ~150 °C)', source: S.ieaHeatPumps },
        availability: { value: 'Available now for most food/beverage heat', source: S.ieaHeatPumps },
        projects: [
          { name: 'Food & beverage heat-pump/electrification retrofits', location: 'EU', status: 'operational', fid: 'Widespread incremental investment', source: S.ieaHeatPumps },
        ],
        rationale: {
          costDrivers: { value: 'Electricity-to-gas price ratio and capex payback drive uptake more than technology.', source: S.ieaHeatPumps },
          readinessBarriers: { value: 'Mature to ~150 °C; higher-temperature heat pumps are the growth frontier.', source: S.ieaHeatPumps },
          scaleProblems: { value: 'Slow because it is a huge number of small sites and retrofit decisions, not one big plant.', source: S.ieaHeatPumps },
        },
      },
      {
        id: 'food-solar-thermal',
        name: 'Solar thermal process heat (SHIP)',
        description:
          'Solar collectors (flat-plate, evacuated-tube, concentrating) supply low/medium-temperature heat for washing, CIP, pasteurising and preheating, usually paired with thermal storage.',
        trl: { value: 'High TRL — commercially mature to ~150 °C (higher with concentrators)', source: {
          org: 'IEA SHC (Solar Heating & Cooling Programme), Task 64/66',
          title: 'Solar Process Heat (IEA SHC Task 64/66)',
          url: 'https://task64.iea-shc.org/',
          year: '2024',
        } },
        availability: {
          value: 'Deployed at scale; food & beverage ≈47% of global SHIP projects',
          source: {
            org: 'Heat Changers',
            title: 'From breweries to mines: how industries are turning to solar heat',
            url: 'https://heat-changers.com/en/solar-heat-for-industries/',
            year: '2024',
          },
        },
        projects: [
          {
            name: 'HEINEKEN Seville solar thermal plant',
            company: 'HEINEKEN España + ENGIE',
            location: 'Seville, Spain',
            capacity: '30 MW concentrating solar + 68 MWh storage; ~50% of brewery heat',
            status: 'operational',
            fid: 'Built & operational (inaugurated Sept 2023; ~€21m)',
            year: '2023',
            source: {
              org: 'The HEINEKEN Company',
              title: 'HEINEKEN Spain and ENGIE launch the largest industrial solar thermal plant in Europe',
              url: 'https://www.theheinekencompany.com/newsroom/heineken-spain-and-engie-spain-launch-the-largest-industrial-solar-thermal-plant-in-europe/',
              year: '2023',
            },
          },
        ],
        rationale: {
          costDrivers: {
            value: 'Up-front capital (collector field + storage) dominates; Fraunhofer ISE finds 3–8 year paybacks with efficiency grants depending on solar resource and gas/CO₂ price.',
            source: {
              org: 'Fraunhofer ISE',
              title: 'Solar Thermal Energy Reduces Process Heat Costs for Industry',
              url: 'https://www.ise.fraunhofer.de/en/press-media/press-releases/2025/new-study-by-fraunhofer-ise-solar-thermal-energy-reduces-process-heat-costs-for-industry.html',
              year: '2025',
            },
          },
          readinessBarriers: {
            value: 'Intermittent, so needs thermal storage; land/roof area is a hard constraint (≈2 m² land per m² collector).',
            source: {
              org: 'solarthermalworld.org (IEA SHC)',
              title: "Technical tour to Europe's largest solar industrial heat plant at Heineken Spain",
              url: 'https://solarthermalworld.org/news/technical-tour-to-europes-largest-solar-industrial-heat-plant-at-heineken-spain/',
              year: '2023',
            },
          },
          scaleProblems: {
            value: 'Even in central Europe solar can realistically cover only ~2–4% of industrial heat; complements rather than replaces fossil heat, limited by on-site area.',
            source: {
              org: 'IEA SHC Task 64/66',
              title: 'Solar Process Heat',
              url: 'https://task64.iea-shc.org/',
              year: '2024',
            },
          },
        },
      },
      {
        id: 'food-biomass-biogas',
        name: 'Biomass & biogas boilers',
        description:
          'Burn solid biomass or anaerobic-digestion biogas from food by-products/manure to raise process steam/hot water — the largest current source of non-fossil industrial heat.',
        mac: {
          value: '≈ €115/tCO₂e (biogas AD, heat+power) to €280/tCO₂e (biomethane); on-farm AD −117 to +79/tCO₂e',
          source: {
            org: 'Bioengineered (PMC), citing Irish Climate Action Plan',
            title: 'A perspective on methodologies and system boundaries to develop abatement cost for on-farm anaerobic digestion',
            url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10506441/',
            year: '2023',
          },
        },
        trl: {
          value: 'TRL 7–9 (commercial biomass boilers; some advanced conversion in demo)',
          source: {
            org: 'IEA Bioenergy',
            title: 'Decarbonizing industrial process heat: the role of biomass',
            url: 'https://www.ieabioenergy.com/blog/publications/decarbonizing-industrial-process-heat-the-role-of-biomass/',
            year: '2022',
          },
        },
        availability: {
          value: 'Commercially available; active in dairy, sugar, bakery, brewing',
          source: {
            org: 'IEA Bioenergy',
            title: 'Bioenergy for High Temperature Heat in Industry',
            url: 'https://www.ieabioenergy.com/blog/task/bioenergy-for-high-temperature-heat-in-industry/',
            year: '2022',
          },
        },
        projects: [
          {
            name: 'Arla Foods biomass district-heat switch, Falkenberg',
            company: 'Arla Foods + Falkenberg Energi',
            location: 'Falkenberg, Sweden',
            capacity: 'Woodchip + biogas back-up; ~3,000 tCO₂/yr avoided',
            status: 'operational',
            fid: 'Commissioned Dec 2024; part-funded by Swedish Climate Leap + EU',
            year: '2024',
            source: {
              org: 'Bioenergy International',
              title: 'Arla switches from fossil gas to biomass-fired district heat',
              url: 'https://bioenergyinternational.com/arla-switches-from-fossil-gas-to-biomass-fired-district-heat/',
              year: '2024',
            },
          },
        ],
        rationale: {
          costDrivers: {
            value: 'Feedstock cost/pre-treatment dominate; secure economics need long-term fuel-supply contracts; multiple revenue streams (heat/power/biomethane/digestate) swing AD cost from negative to positive.',
            source: {
              org: 'IEA Bioenergy',
              title: 'Decarbonizing industrial process heat: the role of biomass',
              url: 'https://www.ieabioenergy.com/blog/publications/decarbonizing-industrial-process-heat-the-role-of-biomass/',
              year: '2022',
            },
          },
          readinessBarriers: {
            value: 'Core combustion is commercial; advanced gasification/pyrolysis for higher-temperature or cleaner heat still crossing the demonstration "valley of death".',
            source: {
              org: 'IEA Bioenergy',
              title: 'Decarbonizing industrial process heat: the role of biomass',
              url: 'https://www.ieabioenergy.com/blog/publications/decarbonizing-industrial-process-heat-the-role-of-biomass/',
              year: '2022',
            },
          },
          scaleProblems: {
            value: 'Sustainable feedstock is limited and competes with food/land use (ILUC risk), which is why the EU caps food/feed-crop bioenergy and steers demand to residues/wastes.',
            source: {
              org: 'European Commission (DG ENER)',
              title: 'Biofuels — Energy',
              url: 'https://energy.ec.europa.eu/topics/renewable-energy/bioenergy/biofuels_en',
              year: '2024',
            },
          },
        },
      },
    ],
  },
];

/* ======================================= CROSS-CUTTING ENABLERS (non-C) === */

/**
 * Cross-cutting decarbonisation ENABLERS that are NOT NACE Section C
 * (Manufacturing) activities and therefore sit OUTSIDE the subsector catalogue
 * above. NACE classifies them in other sections — Section D (electricity, gas &
 * steam supply, incl. network hydrogen 35.21), Section E (waste recovery 38.2,
 * permanent CO₂ storage 38.32) and Section H (pipeline transport 49.50). They
 * are surfaced separately because every manufacturing subsector's deep
 * decarbonisation depends on them. Same data shape as `Subsector`, all
 * `branch: 'Cross-cutting levers'`.
 */
export const CROSS_CUTTING_ENABLERS: Subsector[] = [
  {
    id: 'x-heat',
    name: 'Electrification of heat & heat pumps',
    branch: 'Cross-cutting levers',
    summary:
      'Roughly two-thirds of industrial energy is heat. Electric boilers, resistive/plasma heating and industrial heat pumps can decarbonise low- and medium-temperature heat directly; the high-temperature (>500 °C) frontier remains the hard part.',
    nace: ['35.1', '35.30'],
    naceNote:
      'demand-side lever across all manufacturing divisions; supply side = electric power (35.1, incl. renewable generation 35.12 and storage 35.16) and steam & air conditioning supply (35.30)',
    emissions: [
      { value: 'Heat is ~two-thirds of industrial energy use — the master lever', source: S.ieaHeatPumps },
    ],
    technologies: [
      {
        id: 'x-heatpumps',
        name: 'Industrial heat pumps (high-temperature frontier)',
        description:
          'Move heat rather than burn fuel; commercial to ~150 °C with 150–200 °C models emerging. The most efficient way to electrify low/medium-temperature heat.',
        trl: {
          value: 'TRL 8–9 to ~150 °C; higher-temperature models up to ~200 °C emerging (TRL 6–8)',
          source: { org: 'Agora Industry / Fraunhofer ISI', title: 'Direct electrification of industrial process heat', url: 'https://www.agora-industry.org/publications/direct-electrification-of-industrial-process-heat', year: '2024' },
        },
        availability: {
          value: 'Available now; EHPA estimates heat pumps could already supply ~37% of EU industry process heat',
          source: { org: 'European Heat Pump Association (EHPA)', title: 'EU industry can cut a quarter of CO₂ emissions through heat pumps', url: 'https://ehpa.org/news-and-resources/press-releases/eu-industry-can-cut-quarter-of-co2-emissions-through-heat-pumps/', year: '2024' },
        },
        projects: [
          {
            name: 'Esbjerg mega heat pump (seawater CO₂/R744)',
            company: 'MAN Energy Solutions / DIN Forsyning',
            location: 'Esbjerg, Denmark',
            capacity: '≈ 60–70 MW heat',
            status: 'operational',
            fid: 'Built & commissioned — first heat delivered November 2024',
            year: '2024',
            source: { org: 'MAN Energy Solutions', title: 'Mega Heat Pump Delivers First Heat in Esbjerg', url: 'https://www.man-es.com/company/press-releases/press-details/2024/11/28/mega-heat-pump-delivers-first-heat-in-esbjerg', year: '2024' },
          },
          {
            name: 'EU pilot auction for industrial heat decarbonisation',
            company: 'European Commission (Innovation Fund)',
            location: 'EU-wide',
            capacity: '€1 billion budget',
            status: 'announced',
            fid: 'Terms & conditions published October 2025 — policy instrument, not a plant',
            year: '2025',
            source: { org: 'European Commission (DG CLIMA)', title: 'First pilot auction for industrial heat decarbonisation (€1bn)', url: 'https://climate.ec.europa.eu/news-other-reads/news/commission-publishes-terms-and-conditions-first-pilot-auction-industrial-heat-decarbonisation-budget-2025-10-10_en', year: '2025' },
          },
        ],
        rationale: {
          costDrivers: { value: 'Electricity-to-gas price ratio and capex payback; high-temperature units cost more.', source: S.ieaHeatPumps },
          readinessBarriers: { value: 'Temperature ceiling: pushing reliably above ~150–200 °C is the technical frontier.', source: S.ieaHeatPumps },
          scaleProblems: { value: 'Enormous number of dispersed retrofits + grid capacity; slow by attrition, not by tech.', source: S.ieaHeatPumps },
        },
      },
    ],
  },
  {
    id: 'x-ccs',
    name: 'CO₂ capture, transport & storage networks',
    branch: 'Cross-cutting levers',
    summary:
      'For process CO₂ (cement, lime, steel, chemicals) capture is only useful if the CO₂ can be transported and permanently stored. Shared open-access networks are the enabling infrastructure — and the common bottleneck.',
    nace: ['49.50', '38.32'],
    naceNote:
      'per the NACE 2.1 explanatory notes: storage of captured CO₂ = 38.32 (landfilling or permanent storage); pipeline transport = 49.50; capture itself is classified with the emitting activity',
    emissions: [
      { value: 'The only near-zero route for unavoidable process CO₂', source: S.matecon },
    ],
    technologies: [
      {
        id: 'x-ccs-networks',
        name: 'Shared CO₂ transport & storage (Northern Lights, Porthos, Aramis)',
        description:
          'Open-access CO₂ shipping/pipeline + offshore storage that many industrial emitters can connect to — turning site-level capture into a working value chain.',
        trl: { value: 'TRL 8–9 (first networks operating / in construction)', source: S.ieaEtpGuide },
        availability: {
          value: 'First cross-border network operating since 2025 (Northern Lights)',
          source: {
            org: 'Equinor (Northern Lights JV)',
            title: 'First CO₂ volumes stored at Northern Lights',
            url: 'https://www.equinor.com/news/20250825-first-co2-volumes-stored-at-northern-lights',
            year: '2025',
          },
        },
        projects: [
          {
            name: 'Northern Lights',
            company: 'Equinor, Shell, TotalEnergies',
            location: 'Norway (North Sea storage)',
            capacity: 'Phase 1: 1.5 Mt/yr (operating); Phase 2 → ≥5 Mt/yr by ~2028',
            status: 'operational',
            fid: 'Phase 1 operational Aug 2025; Phase 2 FID March 2025',
            year: '2025',
            source: {
              org: 'Equinor',
              title: 'First CO₂ volumes stored at Northern Lights',
              url: 'https://www.equinor.com/news/20250825-first-co2-volumes-stored-at-northern-lights',
              year: '2025',
            },
          },
          {
            name: 'Porthos',
            company: 'Port of Rotterdam / EBN / Gasunie',
            location: 'Rotterdam, Netherlands',
            capacity: '≈ 2.5 Mt/yr (~37 Mt over 15 yr)',
            status: 'fid',
            fid: 'FID October 2023; construction from 2024; operation expected H2 2027',
            year: '2023',
            source: {
              org: 'Porthos',
              title: 'Project — Porthos',
              url: 'https://www.porthosco2.nl/en/project/',
              year: '2024',
            },
          },
          {
            name: 'Aramis',
            company: 'TotalEnergies, Shell, EBN, Gasunie',
            location: 'Rotterdam (Maasvlakte) → North Sea storage',
            capacity: '≥5 Mt/yr initially, expandable to ~22 Mt/yr',
            status: 'announced',
            fid: 'FID not yet taken (expected 2026); €726m Dutch government support committed',
            year: '2026',
            source: {
              org: 'Aramis CCS',
              title: 'About the Aramis project (open-access CO₂ transport & storage; FID expected 2026)',
              url: 'https://www.aramis-ccs.com/project/',
              year: '2025',
            },
          },
          {
            name: 'Project Greensand',
            company: 'INEOS, Harbour Energy, Nordsøfonden',
            location: 'Danish North Sea (Nini field)',
            capacity: '≈0.4 Mt/yr initially → up to 8 Mt/yr',
            status: 'fid',
            fid: 'FID on first commercial phase (2024/25); storage from end-2025/2026 — first full-scale CO₂ storage in the EU',
            year: '2025',
            source: { org: 'Clean Air Task Force', title: 'Carbon capture and storage in Europe: slow but significant progress in 2025', url: 'https://www.catf.us/2025/11/carbon-capture-storage-europe-slow-but-significant-progress-2025/', year: '2025' },
          },
          {
            name: 'Stockholm Exergi BECCS',
            company: 'Stockholm Exergi',
            location: 'Stockholm, Sweden',
            capacity: '≈0.8 Mt/yr biogenic CO₂',
            status: 'fid',
            fid: 'FID March 2025; construction underway',
            year: '2025',
            source: { org: 'Clean Air Task Force', title: 'Carbon capture and storage in Europe: slow but significant progress in 2025', url: 'https://www.catf.us/2025/11/carbon-capture-storage-europe-slow-but-significant-progress-2025/', year: '2025' },
          },
        ],
        rationale: {
          costDrivers: { value: 'Pipelines/ships + offshore wells are large fixed-cost infrastructure; per-tonne fees stay high until volumes fill the network.', source: S.ieaCement },
          readinessBarriers: { value: 'Technically ready; the hard part is the chicken-and-egg of capture projects and storage each waiting for the other.', source: S.matecon },
          scaleProblems: { value: 'Needs coordinated planning, cross-border permitting and public acceptance to scale from Mt to hundreds of Mt.', source: S.ipcc11 },
        },
      },
    ],
  },
  {
    id: 'x-hydrogen',
    name: 'Clean hydrogen supply',
    branch: 'Cross-cutting levers',
    summary:
      'Clean hydrogen underpins green steel, green ammonia, e-fuels and some high-temperature heat. The constraint is producing it cheaply from electrolysis + renewables at the scale industry needs.',
    nace: ['20.11', '35.21'],
    naceNote:
      'per the NACE 2.1 explanatory notes: hydrogen production not for network energy supply = 20.11 (industrial gases); gaseous fuels incl. hydrogen for supply through a network = 35.21; hydrogen storage = 35.24',
    emissions: [
      { value: 'Enabling input for steel, ammonia, methanol, e-fuels', source: S.ieaH2 },
    ],
    technologies: [
      {
        id: 'x-electrolysers',
        name: 'Electrolysers & clean-hydrogen production',
        description:
          'Split water with renewable electricity to make hydrogen with no direct CO₂. Cost and deployment are scaling but remain the gating factor for hydrogen-based industry.',
        trl: { value: 'Alkaline/PEM electrolysis TRL 8–9; scaling to GW class', source: S.ieaH2 },
        availability: { value: 'Available; project pipeline large but FIDs lag announcements', source: S.ieaH2 },
        projects: [
          {
            name: 'ELYgator (Air Liquide)',
            company: 'Air Liquide',
            location: 'Maasvlakte, Rotterdam, Netherlands',
            capacity: '200 MW electrolyser (>€500m)',
            status: 'fid',
            fid: 'FID taken July 2025; operation expected end-2027, powered by OranjeWind offshore wind',
            year: '2025',
            source: { org: 'Argus Media', title: 'Air Liquide takes FID on Dutch 200MW green H₂ plant', url: 'https://www.argusmedia.com/en/news-and-insights/latest-market-news/2713299-air-liquide-takes-fid-on-dutch-200mw-green-h2-plant', year: '2025' },
          },
          {
            name: 'Holland Hydrogen I (Shell)',
            company: 'Shell',
            location: 'Maasvlakte, Rotterdam, Netherlands',
            capacity: '200 MW electrolyser (up to 80 t/day H₂)',
            status: 'construction',
            fid: 'FID 2022; under construction, commissioning due 2026',
            year: '2025',
            source: { org: 'Energy Institute (New Energy World)', title: 'Major hydrogen project advances in the Netherlands', url: 'https://knowledge.energyinst.org/new-energy-world/article?id=139775', year: '2025' },
          },
          { name: 'EU electrolyser & hydrogen-valley projects', location: 'EU', status: 'announced', fid: 'Pipeline large; final investment decisions lagging on cost/offtake', source: S.ieaH2 },
        ],
        rationale: {
          costDrivers: { value: 'Green hydrogen cost is set by electrolyser capex + clean-power price; still well above fossil hydrogen.', source: S.ieaH2 },
          readinessBarriers: { value: 'Electrolysers proven; the gap is GW-scale manufacturing, cheap firm power and demand certainty.', source: S.ieaH2 },
          scaleProblems: { value: 'A minority of announced capacity has reached FID; deployment is far below what net-zero pathways require.', source: S.ieaH2 },
        },
      },
    ],
  },
  {
    id: 'x-circular',
    name: 'Material efficiency & circular economy',
    branch: 'Cross-cutting levers',
    summary:
      'The cheapest tonne of CO₂ is the material never made. Using less material, recycling more, extending product life and substituting materials cuts demand for primary steel, plastics, cement and aluminium — often at negative cost.',
    nace: ['38.2'],
    naceNote:
      'waste recovery: materials recovery (38.21), energy recovery (38.22), other (38.23); demand-side material-efficiency measures span all manufacturing divisions',
    emissions: [
      { value: 'Circularity/material efficiency: 58–171 MtCO₂/yr by 2050 (EU heavy industry)', source: S.matecon },
    ],
    technologies: [
      {
        id: 'x-circular-levers',
        name: 'Recycling, reuse, lighter design & substitution',
        description:
          'Higher recycling rates, reuse, material-light design, longer product lifetimes and low-carbon material substitution — a demand-side lever that shrinks the hard-to-abate problem itself.',
        mac: { value: 'Often negative or low cost', note: 'much of the potential is cost-saving', source: S.matecon },
        trl: { value: 'Mostly mature; constraint is systems, standards & incentives', source: S.matecon },
        availability: { value: 'Available now; underused', source: S.matecon },
        projects: [
          { name: 'Circular-economy measures across value chains', location: 'EU', status: 'operational', fid: 'Policy- and market-driven', source: S.matecon },
        ],
        rationale: {
          costDrivers: { value: 'Much is cheap or cost-saving; barriers are split incentives, standards and value-chain coordination, not technology cost.', source: S.matecon },
          readinessBarriers: { value: 'Technologies mostly exist; the gap is business models, design norms and recycling systems.', source: S.ipcc11 },
          scaleProblems: { value: 'Recycled-feedstock quality (e.g. steel tramp elements, mixed plastics) and demand for primary material limit how far it scales.', source: S.matecon },
        },
      },
    ],
  },
];

/**
 * The NACE Section C (Manufacturing) branches shown in the explorer, for the
 * diagram legend / colouring. 'Cross-cutting levers' is intentionally NOT here
 * — those enablers sit outside Section C and are rendered separately.
 */
export const BRANCHES = [
  'Metals',
  'Non-metallic minerals',
  'Chemicals & refining',
  'Other manufacturing',
] as const;

/** Colour per branch, incl. the out-of-scope 'Cross-cutting levers' enablers. */
export const BRANCH_COLORS: Record<Branch, string> = {
  Metals: '#3D5265',
  'Non-metallic minerals': '#B83230',
  'Chemicals & refining': '#6667AB',
  'Other manufacturing': '#007B6C',
  'Cross-cutting levers': '#FF9933',
};

/**
 * NACE Rev. 2.1 Section C — Manufacturing — the exact scope of the explorer.
 * Section C spans divisions 10–33; every catalogue subsector is one of these
 * manufacturing activities. Sourced to the official Eurostat classification and
 * the Regulation that established it.
 */
export const MANUFACTURING_SECTION = {
  code: 'C',
  label: 'Manufacturing',
  divisionRange: '10–33',
  /** The Section C divisions the catalogue actually covers (code → label). */
  divisionsCovered: [
    { code: '10', label: 'Manufacture of food products' },
    { code: '11', label: 'Manufacture of beverages' },
    { code: '12', label: 'Manufacture of tobacco products' },
    { code: '17', label: 'Manufacture of paper and paper products' },
    { code: '19', label: 'Manufacture of coke and refined petroleum products' },
    { code: '20', label: 'Manufacture of chemicals and chemical products' },
    { code: '23', label: 'Manufacture of other non-metallic mineral products' },
    { code: '24', label: 'Manufacture of basic metals' },
  ] as const,
  note: 'Every subsector in the explorer is a NACE Rev. 2.1 Section C (Manufacturing) activity, i.e. one of divisions 10–33. Enabling levers outside manufacturing — electricity, gas & steam supply (Section D), waste recovery & permanent CO₂ storage (Section E) and pipeline transport (Section H) — are shown separately as cross-cutting enablers, not as subsectors.',
  source: S.naceSectionC,
  regulation: S.naceRegulation,
} as const;

/* ---------------------------------------------------------- chart metrics */

/**
 * Numeric metrics per technology (keyed by Technology.id) for the charts:
 * marginal abatement cost band in €/tCO₂ and a technology-readiness band (1–9).
 * Populated only where a numeric value is sourced in the catalogue above
 * (EPRS, IEAGHG, arXiv, PMC, Material Economics, IEA ETP Guide …); `mac` is
 * omitted where no defensible number exists (kept as qualitative text only).
 * Cost-negative entries are demand-side / circular / efficiency levers.
 */
export interface TechMetric {
  macLowEur?: number;
  macHighEur?: number;
  trlLow: number;
  trlHigh: number;
  costNote?: string;
  /** Provenance for the numeric MAC band (shown next to the cost bar). */
  macSource?: Source;
}

const MAC_SRC = {
  agoraSteel: { org: 'Agora Industry', title: '15 insights on the global steel transformation', url: 'https://www.agora-industry.org/publications/15-insights-on-the-global-steel-transformation', year: '2024' } as Source,
  natureSteel: { org: 'Wu et al., Nature (via PMC)', title: 'Technological pathways for cost-effective steel decarbonization', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC12589104/', year: '2024' } as Source,
  ieaghgCement: { org: 'IEAGHG', title: 'Cost of CO₂ capture in the industrial sector: cement and iron & steel industries (2018-TR03)', url: 'https://ieaghg.org/publications/cost-of-co2-capture-in-the-industrial-sector-cement-and-iron-and-steel-industries/', year: '2018' } as Source,
  jrcAlu: { org: 'JRC (Zore), EUR/JRC136525', title: 'Decarbonisation options for the aluminium industry', url: 'https://publications.jrc.ec.europa.eu/repository/bitstream/JRC136525/JRC136525_01.pdf', year: '2024' } as Source,
  glassStudy: { org: 'ScienceDirect (techno-economic study)', title: 'Glassmaking decarbonization via calcium looping & power-to-gas', url: 'https://www.sciencedirect.com/science/article/pii/S2352550923001859', year: '2023' } as Source,
  natureAmmonia: { org: 'Rosa & Gabrielli et al., Nature Communications (PMC)', title: 'Effects of emissions caps on low-carbon hydrogen in the European ammonia industry', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC11069508/', year: '2024' } as Source,
  arxivMethanol: { org: 'arXiv (peer-reviewed preprint)', title: 'Scaling green hydrogen and CCUS via cement-methanol co-production', url: 'https://arxiv.org/pdf/2509.13674', year: '2025' } as Source,
  pmcBiogas: { org: 'Bioengineered (PMC)', title: 'Abatement cost for on-farm anaerobic digestion', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC10506441/', year: '2023' } as Source,
  agoraBreakthrough: { org: 'Agora Industry / Wuppertal Institute', title: 'Breakthrough strategies for climate-neutral industry in Europe', url: 'https://www.agora-industry.org/publications/breakthrough-strategies-for-climate-neutral-industry-in-europe-study', year: '2021' } as Source,
  ieaghgRefining: { org: 'Frontiers in Chem. Eng. (citing IEAGHG 2017)', title: 'A pathway towards net-zero emissions in oil refineries', url: 'https://www.frontiersin.org/journals/chemical-engineering/articles/10.3389/fceng.2022.804163/full', year: '2022' } as Source,
  natureBlueAmmonia: { org: 'IEA / Nature Communications', title: 'Cost of CO₂-free ammonia; emissions-cap effects on EU low-carbon hydrogen', url: 'https://www.nature.com/articles/s41467-024-48145-z', year: '2024' } as Source,
  jco2uLime: { org: 'Journal of CO₂ Utilization (Hornberger et al.)', title: 'Efficient CO₂ capture from lime plants via indirectly-heated carbonate looping', url: 'https://www.sciencedirect.com/science/article/pii/S277265682300091X', year: '2023' } as Source,
  lbnlHeatPump: { org: 'LBNL / Global Efficiency Intelligence', title: 'Electrification of manufacturing with industrial heat pumps', url: 'https://eta-publications.lbl.gov/sites/default/files/us_industrial_heat_pump-final.pdf', year: '2024' } as Source,
};

export const TECH_METRICS: Record<string, TechMetric> = {
  'steel-h2dri': { macLowEur: 73, macHighEur: 166, trlLow: 6, trlHigh: 8, macSource: S.eprsSteel },
  'steel-scrap-eaf': { macLowEur: -67, macHighEur: -42, trlLow: 9, trlHigh: 9, costNote: 'cost-saving', macSource: MAC_SRC.natureSteel },
  'steel-ng-dri': { trlLow: 9, trlHigh: 9 },
  'steel-bf-ccs': { macLowEur: 24, macHighEur: 69, trlLow: 5, trlHigh: 7, macSource: MAC_SRC.natureSteel },
  'steel-electrolysis': { trlLow: 3, trlHigh: 5 },
  'alu-inert-anode': { macLowEur: 180, macHighEur: 300, trlLow: 6, trlHigh: 7, macSource: MAC_SRC.jrcAlu },
  'alu-secondary': { macLowEur: -30, macHighEur: 0, trlLow: 9, trlHigh: 9, costNote: 'cost-saving', macSource: S.matecon },
  'alu-renewable-power': { trlLow: 9, trlHigh: 9 },
  'nonferrous-electrification': { trlLow: 8, trlHigh: 9 },
  'cement-clinker-sub': { macLowEur: -30, macHighEur: 10, trlLow: 9, trlHigh: 9, costNote: 'cost-neutral to cheaper', macSource: S.matecon },
  'cement-ccs': { macLowEur: 40, macHighEur: 107, trlLow: 6, trlHigh: 9, costNote: 'oxyfuel ~€40 → post-comb EU ~€107', macSource: MAC_SRC.ieaghgCement },
  'cement-altfuels': { macLowEur: -20, macHighEur: 20, trlLow: 4, trlHigh: 9, costNote: 'often cost-saving', macSource: S.ieaCement },
  'lime-ccs': { macLowEur: 33, macHighEur: 43, trlLow: 6, trlHigh: 8, costNote: 'carbonate looping', macSource: MAC_SRC.jco2uLime },
  'glass-electric-hybrid': { macLowEur: 202, macHighEur: 300, trlLow: 6, trlHigh: 9, costNote: 'from ~€202 (large plant, incl. CCS); upper end estimated', macSource: MAC_SRC.glassStudy },
  'glass-cullet': { macLowEur: -20, macHighEur: 0, trlLow: 5, trlHigh: 9, costNote: 'cost-saving', macSource: S.ipcc11 },
  'ceramics-electrify-h2': { trlLow: 5, trlHigh: 9 },
  'ammonia-green-h2': { macLowEur: 183, macHighEur: 362, trlLow: 7, trlHigh: 8, macSource: MAC_SRC.natureAmmonia },
  'ammonia-blue-h2': { macLowEur: 46, macHighEur: 187, trlLow: 7, trlHigh: 9, costNote: 'SMR/ATR + CCS', macSource: MAC_SRC.natureBlueAmmonia },
  'hvc-ecracker': { macLowEur: 100, macHighEur: 170, trlLow: 6, trlHigh: 7, costNote: 'chem-sector proxy', macSource: MAC_SRC.agoraBreakthrough },
  'hvc-recycling': { trlLow: 6, trlHigh: 8 },
  'chloralkali-odc': { trlLow: 8, trlHigh: 9 },
  'methanol-e-bio': { macLowEur: 120, macHighEur: 150, trlLow: 7, trlHigh: 8, costNote: 'over $120/tCO₂', macSource: MAC_SRC.arxivMethanol },
  'refining-ccs-h2-elec': { macLowEur: 153, macHighEur: 170, trlLow: 6, trlHigh: 9, costNote: 'post-combustion CCS', macSource: MAC_SRC.ieaghgRefining },
  'pulppaper-electrify-hp': { macLowEur: 45, macHighEur: 147, trlLow: 6, trlHigh: 9, costNote: 'US proxy (LBNL)', macSource: MAC_SRC.lbnlHeatPump },
  'food-heatpumps': { macLowEur: 45, macHighEur: 147, trlLow: 7, trlHigh: 9, costNote: 'US proxy (LBNL)', macSource: MAC_SRC.lbnlHeatPump },
  'food-solar-thermal': { trlLow: 8, trlHigh: 9 },
  'food-biomass-biogas': { macLowEur: 100, macHighEur: 280, trlLow: 7, trlHigh: 9, macSource: MAC_SRC.pmcBiogas },
  'x-heatpumps': { macLowEur: 45, macHighEur: 147, trlLow: 6, trlHigh: 9, costNote: 'US proxy (LBNL)', macSource: MAC_SRC.lbnlHeatPump },
  'x-ccs-networks': { trlLow: 8, trlHigh: 9 },
  'x-electrolysers': { macLowEur: 183, macHighEur: 187, trlLow: 8, trlHigh: 9, costNote: 'green H₂ vs SMR', macSource: MAC_SRC.natureAmmonia },
  'x-circular': { macLowEur: -50, macHighEur: 10, trlLow: 8, trlHigh: 9, costNote: 'often negative-cost (demand-side)', macSource: S.matecon },
};

/**
 * Representative photo per subsector (keyed by Subsector.id). Values are
 * Wikimedia Commons file names; the component builds a stable Special:FilePath
 * URL (resized) and links back to the Commons file page for attribution/licence.
 */
export const SUBSECTOR_IMAGES: Record<string, string> = {
  steel: 'SteelMill_interior.jpg',
  aluminium: 'Aluminum_smelter_-_near_Bellingham.jpg',
  nonferrous: 'Chino_copper_mine.jpg',
  cement: 'KilnBZ.JPG',
  lime: 'Lime_plant,_Wyoming.jpg',
  glass: 'Glass_bubble.jpg',
  ceramics: 'Brickyard5.jpg',
  ammonia: 'SMR+WGS-1.png',
  hvc: 'TASNEE_001.jpg',
  methanol: 'Methanol_by_Danny_S._-_001.JPG',
  refining: 'Anacortes_Refinery_31911.JPG',
  pulppaper: 'Canadian_Kraft_Paper_mill_(The_Pas,_MB).jpg',
  fooddrink: '8210_Brewery_in_Abbaye_Notre-Dame_de_Saint-Remy_Rochefort_2007_Luca_Galuzzi.jpg',
  'x-heat': 'Heat_pump_unit.webp',
  'x-ccs': 'CBO-how-carbon-capture-works.png',
  'x-hydrogen': 'Aa-battery-electrolysis.jpg',
  'x-circular': 'RecyclingSymbolGreen.png',
};

/**
 * Top-level EU ETS 2023 industry emissions split by activity (Mt CO₂), for the
 * overview doughnut. Verified against Sandbag's read of the EEA EU ETS Data
 * Viewer / EUTL. "Other ETS industry" is the residual of the 569 Mt industry
 * total once steel, cement+lime and refining are removed (chemicals, etc.).
 */
export const EMISSIONS_SPLIT: { name: string; mt: number; color: string }[] = [
  { name: 'Iron & steel', mt: 96, color: BRANCH_COLORS.Metals },
  { name: 'Cement & lime', mt: 124, color: BRANCH_COLORS['Non-metallic minerals'] },
  { name: 'Refineries', mt: 105, color: BRANCH_COLORS['Chemicals & refining'] },
  { name: 'Other ETS industry (chemicals, etc.)', mt: 244, color: '#94A3B8' },
];

export const EMISSIONS_SPLIT_TOTAL_MT = 569;

export const EMISSIONS_SPLIT_SOURCE: Source = {
  org: 'Sandbag (EEA EU ETS Data Viewer / EUTL)',
  title: 'A closer look at 2023 emissions — EU ETS industry by activity (569 Mt total)',
  url: 'https://sandbag.be/2024/10/07/a-closer-look-at-2023-emissions/',
  year: '2024',
};

/**
 * EU industry EMISSIONS MAP — one block per subsector (or group of subsectors
 * that public data cannot split), sized by the best available sourced Mt CO₂
 * figure, for the proportional overview treemap. Blocks flagged `etsBasis`
 * are on the EU ETS 2023 stationary-industry basis (569 Mt total) and get a
 * "% of EU ETS industry" share; the rest carry their own scope label
 * (sector-association or inventory figures, shown for scale with a caveat).
 * Every block cites the source its Mt figure came from — nothing is invented.
 */
export interface EmissionsMapBlock {
  /** Subsector ids covered by this block; the first is primary (image, click target). */
  subsectorIds: string[];
  label: string;
  branch: Branch;
  /** Best available sourced emissions figure, Mt CO₂(e)/yr. */
  mt: number;
  /** Scope of the Mt figure, shown as a badge, e.g. "EU ETS 2023". */
  scope: string;
  /** True when the figure is on the EU ETS 2023 industry basis (569 Mt total). */
  etsBasis: boolean;
  note?: string;
  source: Source;
}

export const EMISSIONS_MAP: EmissionsMapBlock[] = [
  {
    subsectorIds: ['steel'],
    label: 'Iron & steel',
    branch: 'Metals',
    mt: 96,
    scope: 'EU ETS 2023',
    etsBasis: true,
    note: 'EUTL "pig iron or steel" activity; ~145 Mt on a value-chain basis incl. coke ovens & captive power',
    source: S.sandbag2023,
  },
  {
    subsectorIds: ['aluminium'],
    label: 'Aluminium',
    branch: 'Metals',
    mt: 2.75,
    scope: 'direct CO₂, 2022',
    etsBasis: false,
    note: 'direct (anode) process CO₂ only — the far larger power-related emissions (sector ≈24 Mt CO₂e incl. indirect) are not shown',
    source: { org: 'JRC (European Commission)', title: 'Aluminium factsheet (JRC144120)', url: 'https://publications.jrc.ec.europa.eu/repository/bitstream/JRC144120/Aluminium_factsheet_JRC144120.pdf', year: '2026' },
  },
  {
    subsectorIds: ['cement', 'lime'],
    label: 'Cement & lime',
    branch: 'Non-metallic minerals',
    mt: 124,
    scope: 'EU ETS 2023',
    etsBasis: true,
    note: 'EUTL "cement clinker or lime" activity — lime is not split out as a standalone EUTL activity, so this block covers both subsectors',
    source: S.sandbag2023,
  },
  {
    subsectorIds: ['glass'],
    label: 'Glass',
    branch: 'Non-metallic minerals',
    mt: 22,
    scope: 'direct CO₂',
    etsBasis: false,
    note: 'melting-furnace combustion plus process CO₂ from carbonate raw materials',
    source: { org: 'European Commission (CINEA)', title: 'How LIFE is reducing emissions from glass production', url: 'https://cinea.ec.europa.eu/news-events/news/how-life-reducing-emissions-glass-production-2022-03-16_en', year: '2022' },
  },
  {
    subsectorIds: ['ceramics'],
    label: 'Ceramics',
    branch: 'Non-metallic minerals',
    mt: 19,
    scope: 'sector, direct + indirect',
    etsBasis: false,
    note: '~64% combustion, ~19% indirect electricity, ~17% process CO₂',
    source: { org: 'Cerame-Unie', title: 'Ceramic industry position on the EU ETS review', url: 'https://cerameunie.eu/topics/climate-energy/emissions-trading-system/ceramic-industry-position-the-eu-ets-review/', year: '2023' },
  },
  {
    subsectorIds: ['refining'],
    label: 'Petroleum refining',
    branch: 'Chemicals & refining',
    mt: 105,
    scope: 'EU ETS 2023',
    etsBasis: true,
    note: 'EUTL "refining of mineral oil"; combustion-dominated',
    source: S.sandbag2023,
  },
  {
    subsectorIds: ['hvc', 'ammonia', 'chloralkali', 'methanol'],
    label: 'Chemicals (HVC, ammonia, chlor-alkali, methanol)',
    branch: 'Chemicals & refining',
    mt: 98,
    scope: 'EU ETS 2023 (derived)',
    etsBasis: true,
    note: 'derived: refining + chemicals ≈ 203 Mt (36% of EU ETS industry, 2023) minus 105 Mt refining; chemicals are not a single EUTL activity',
    source: S.sandbagChem,
  },
  {
    subsectorIds: ['pulppaper'],
    label: 'Pulp & paper',
    branch: 'Other manufacturing',
    mt: 27,
    scope: 'sector direct fossil CO₂, 2022',
    etsBasis: false,
    note: 'predominantly energy/combustion; down ~50% since 2005 (large biogenic share excluded)',
    source: { org: 'CEPI', title: 'Key Statistics 2022 — European pulp & paper industry', url: 'https://www.cepi.org/wp-content/uploads/2023/07/2022-Key-Statistics-FINAL.pdf', year: '2022' },
  },
  {
    subsectorIds: ['fooddrink'],
    label: 'Food, beverages & tobacco',
    branch: 'Other manufacturing',
    mt: 94,
    scope: 'sector CO₂e (incl. non-ETS sites)',
    etsBasis: false,
    note: '~5th-largest EU industrial emitter; many small sites fall outside the EU ETS, so this is a sector-wide figure, not an ETS one',
    source: { org: 'FoodDrinkEurope (Ricardo roadmap)', title: 'Our climate journey: the road to net-zero', url: 'https://www.fooddrinkeurope.eu/our-climate-journey-the-road-to-net-zero/', year: '2021' },
  },
];

/**
 * Subsectors that cannot be sized in the map from public data, listed as
 * chips under the treemap instead of being drawn with an invented number.
 */
export const EMISSIONS_MAP_UNSIZED: { subsectorId: string; label: string; reason: string }[] = [
  {
    subsectorId: 'nonferrous',
    label: 'Other non-ferrous metals',
    reason: 'no isolable copper/zinc/nickel-only EU figure — public data reports the non-ferrous sector incl. aluminium (≈52 Mt CO₂e, 2015, incl. indirect)',
  },
];

/**
 * Indicative SECTOR-LEVEL marginal-abatement-cost curve (MACC): one block per
 * subsector, WIDTH = 2050 abatement potential (~near-full decarbonisation of the
 * sector baseline, Mt CO2/yr), HEIGHT = representative EUR/tCO2 cost of the
 * sector's PRIMARY near-zero route. Sorted cheapest -> costliest it reads as a
 * classic MACC. Each block cites its potential source AND its cost source.
 *
 * CAVEATS (shown in the UI): (1) simplified/indicative - each sector is a single
 * primary route, so cheaper partial levers (steel scrap-EAF, clinker
 * substitution) are not drawn separately; (2) cross-cutting levers
 * (electrification, CCS, hydrogen, circularity) overlap and re-slice the same
 * emissions, so they are NOT added here to avoid double-counting; (3) baselines
 * mix EU-27 ETS-activity and sector-association scopes / base years.
 */
export interface MaccBlock {
  subsectorId: string;
  label: string;
  potentialMt: number;
  macLow: number;
  macHigh: number;
  route: string;
  potentialSource: Source;
  macSource: Source;
}

const POT_SRC = {
  agoraSteel: { org: 'Agora Industry / Wuppertal', title: 'Breakthrough strategies for climate-neutral industry in Europe', url: 'https://www.agora-industry.org/publications/breakthrough-strategies-for-climate-neutral-industry-in-europe-study', year: '2021' } as Source,
  jrcCapture: { org: 'JRC / CaptureMap', title: 'Industrial CO2 in Europe (point sources)', url: 'https://www.capturemap.no/industrial-co2-in-europe/', year: '2022' } as Source,
  eeaChem: { org: 'EEA', title: 'Total GHG emissions in the chemical industry', url: 'https://www.eea.europa.eu/en/european-zero-pollution-dashboards/indicators/total-greenhouse-gas-emissions-in-the-chemical-industry', year: '2021' } as Source,
  fertEurope: { org: 'Fertilizers Europe', title: 'Ammonia Roadmap for the European fertilizer industry', url: 'https://www.fertilizerseurope.com/wp-content/uploads/2023/11/Ammonia-Roadmap-Fertilizer-Europe-FINAL-Sept-22-2023.pdf', year: '2023' } as Source,
  cepi: { org: 'CEPI', title: 'Key Statistics 2022 - European pulp & paper industry', url: 'https://www.cepi.org/wp-content/uploads/2023/07/2022-Key-Statistics-FINAL.pdf', year: '2022' } as Source,
};

export const SECTOR_MACC: MaccBlock[] = [
  { subsectorId: 'cement', label: 'Cement', potentialMt: 110, macLow: 40, macHigh: 107, route: 'CCS (oxyfuel -> post-combustion)', potentialSource: POT_SRC.jrcCapture, macSource: MAC_SRC.ieaghgCement },
  { subsectorId: 'pulppaper', label: 'Pulp & paper', potentialMt: 27, macLow: 45, macHigh: 147, route: 'electrification / heat pumps', potentialSource: POT_SRC.cepi, macSource: MAC_SRC.lbnlHeatPump },
  { subsectorId: 'steel', label: 'Iron & steel', potentialMt: 145, macLow: 73, macHigh: 166, route: 'H2-DRI + EAF (primary)', potentialSource: POT_SRC.agoraSteel, macSource: S.eprsSteel },
  { subsectorId: 'hvc', label: 'Chemicals (HVC)', potentialMt: 119, macLow: 100, macHigh: 170, route: 'electrification + recycling', potentialSource: POT_SRC.eeaChem, macSource: MAC_SRC.agoraBreakthrough },
  { subsectorId: 'refining', label: 'Refining', potentialMt: 120, macLow: 153, macHigh: 170, route: 'CCS + clean H2 + electrification', potentialSource: POT_SRC.jrcCapture, macSource: MAC_SRC.ieaghgRefining },
  { subsectorId: 'ammonia', label: 'Ammonia', potentialMt: 36, macLow: 183, macHigh: 362, route: 'electrolytic (green) hydrogen', potentialSource: POT_SRC.fertEurope, macSource: MAC_SRC.natureAmmonia },
  { subsectorId: 'glass', label: 'Glass', potentialMt: 18, macLow: 202, macHigh: 300, route: 'electric/hybrid + CCS', potentialSource: POT_SRC.jrcCapture, macSource: MAC_SRC.glassStudy },
];
