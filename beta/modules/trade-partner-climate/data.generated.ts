/**
 * Trade-Partner Climate Policy & Article 6 Tracker — snapshot register
 * (beta module M · 52).
 *
 * GENERATED: AI-compiled — pending Secretariat verification.
 *
 * Compile date: 2026-08. Knowledge currency: entries reflect public
 * reporting up to roughly early 2026; developments after that are NOT
 * captured, so the register must be read as stale by up to two quarters.
 * Partner-policy status changes weekly — this is a snapshot, not a feed.
 *
 * PARTIALLY FACT-CHECKED 2026-08-06 (see
 * docs-internal/beta-modules-m45-m52-factcheck-2026-08.md): the NDC column
 * for the United States, the United Kingdom and China has been verified
 * and two `uncertain` flags closed. Carbon-price levels, coverage shares
 * and Article 6 volumes have NOT been re-checked and stay as compiled.
 * The header note below that Eurostat and EUR-Lex are blocked from this
 * sandbox is FALSE: Eurostat answers over plain HTTPS and EUR-Lex texts
 * are reachable through the Publications Office Cellar service.
 *
 * Documents and trackers drawn on (no live pulls run at compile time):
 *  - World Bank, State and Trends of Carbon Pricing 2025 (May 2025) and
 *    the Carbon Pricing Dashboard — carbon-price levels and coverage.
 *  - ICAP ETS Status Report 2025 and the ICAP ETS map — system status.
 *  - UNFCCC NDC Registry — 2035 NDC submissions.
 *  - UNFCCC Article 6 reporting (CARP), the IGES Article 6.2 database and
 *    the UNEP-CCC Article 6 pipeline — agreements, authorisations, first
 *    transfers. All volumes are order-of-magnitude only.
 *  - Official announcements (White House, gov.uk, MEE, METI, Planalto,
 *    Türkiye Official Gazette) for the rollback/counterweight ledger.
 *
 * Rules applied: prices are ranges with a source year, `uncertain: true`
 * wherever the compile could not pin an auction or settlement value;
 * statuses use the deterministic vocabulary in-force / adopted /
 * proposed / rolled-back / none; every volume is an order-of-magnitude
 * [lo, hi] range, never a point value; entries that could not be tied to
 * at least one named public source were dropped rather than guessed.
 */

export const COMPILE_DATE = '2026-08';
export const KNOWLEDGE_CUTOFF_NOTE =
  'Compiled 2026-08 from public reporting current to roughly early 2026; later developments are not captured.';

/* ------------------------------------------------------------- types */

/** Deterministic status vocabulary — the only values any status cell may take. */
export type PolicyStatus = 'in-force' | 'adopted' | 'proposed' | 'rolled-back' | 'none';

export type Confidence = 'reported' | 'unverified';

export interface SourceLink {
  label: string;
  url: string;
}

export interface StatusCell {
  status: PolicyStatus;
  /** Short display line, e.g. "UK ETS · ≈£45–55/t (mid-2025)". */
  headline: string;
  /** One- or two-sentence sourced note. */
  note: string;
  /** Year(s) the value refers to, where a value is quoted. */
  sourceYear?: string;
  /** True where the compile could not fully corroborate the value. */
  uncertain?: boolean;
}

export interface Partner {
  id: string;
  name: string;
  carbonPrice: StatusCell & { coverageNote?: string };
  ndc2035: StatusCell;
  cbam: StatusCell;
  linkage: StatusCell;
  sources: SourceLink[];
}

/* -------------------------------------------------- partner register */

export const PARTNERS: Partner[] = [
  {
    id: 'us',
    name: 'United States',
    carbonPrice: {
      status: 'none',
      headline: 'No federal carbon price; state schemes only',
      coverageNote:
        'California–Québec cap-and-trade ≈US$25–30/t (2025 auctions, ≈75–80 % of state emissions); RGGI ≈US$18–25/t; Washington cap-and-invest ≈US$40–50/t. National coverage from state schemes is on the order of a tenth of US emissions.',
      note:
        'No federal instrument, and the 2025–26 federal direction is deregulatory. The state programmes remain in force and survived the November 2024 Washington repeal vote.',
      sourceYear: '2025',
      uncertain: true,
    },
    ndc2035: {
      status: 'rolled-back',
      headline: 'Withdrawn — Paris exit effective January 2026',
      note:
        'The December 2024 NDC (61–66 % below 2005 by 2035) was overtaken by the 20 January 2025 executive order to withdraw from the Paris Agreement; withdrawal took effect 27 January 2026 under Article 28.',
      sourceYear: '2025–26',
    },
    cbam: {
      status: 'none',
      headline: 'No CBAM-type measure; hostile to the EU CBAM',
      note:
        'No federal border-adjustment instrument. The administration has framed the EU CBAM as a trade barrier; retaliation has been threatened in trade talks. Congressional foreign-pollution-fee bills exist but had not advanced at compile.',
      uncertain: true,
    },
    linkage: {
      status: 'none',
      headline: 'No EU-ETS linkage prospect',
      note: 'No federal system to link. Sub-national linkage (California–Québec) is with Québec, not the EU.',
    },
    sources: [
      { label: 'World Bank Carbon Pricing Dashboard', url: 'https://carbonpricingdashboard.worldbank.org/' },
      { label: 'CARB cap-and-trade programme', url: 'https://ww2.arb.ca.gov/our-work/programs/cap-and-trade-program' },
      { label: 'RGGI', url: 'https://www.rggi.org/' },
      {
        label: 'White House EO, 20 Jan 2025 — Paris withdrawal',
        url: 'https://www.whitehouse.gov/presidential-actions/2025/01/putting-america-first-in-international-environmental-agreements/',
      },
    ],
  },
  {
    id: 'uk',
    name: 'United Kingdom',
    carbonPrice: {
      status: 'in-force',
      headline: 'UK ETS · ≈£45–55/t (mid-2025)',
      coverageNote:
        'UK ETS covers roughly a quarter of UK emissions (power, energy-intensive industry, domestic aviation); a £18/t carbon price support tops up the power sector.',
      note:
        'UKA prices traded around £35–40/t through 2024 and rose towards £50/t after the May 2025 linkage announcement narrowed the expected gap to the EUA price.',
      sourceYear: '2024–25',
      uncertain: true,
    },
    ndc2035: {
      status: 'adopted',
      headline: '81 % below 1990 by 2035 — submitted 30 January 2025',
      note: 'Announced at COP29 (November 2024) and submitted to the UNFCCC registry on 30 January 2025, all sectors and all gases, in line with Climate Change Committee advice. Verified 2026-08-06 against the UK submission and its ICTU annex.',
      sourceYear: '2025',
    },
    cbam: {
      status: 'proposed',
      headline: 'UK CBAM confirmed for January 2027',
      note:
        'Government confirmed a UK CBAM from 1 January 2027 (aluminium, cement, fertilisers, hydrogen, iron and steel); primary legislation was still in progress at compile.',
      sourceYear: '2024–25',
      uncertain: true,
    },
    linkage: {
      status: 'adopted',
      headline: 'EU-ETS linkage agreed in principle, May 2025',
      note:
        'The 19 May 2025 UK–EU summit Common Understanding commits both sides to work towards linking the UK and EU emissions trading systems, which would also exempt linked sectors from the two CBAMs. Agreed in principle; the linkage treaty was not yet concluded at compile.',
      sourceYear: '2025',
    },
    sources: [
      { label: 'UK–EU summit Common Understanding, 19 May 2025', url: 'https://www.gov.uk/government/publications/uk-eu-summit-key-documents' },
      { label: 'ICAP — UK ETS', url: 'https://icapcarbonaction.com/en/ets' },
      {
        label: 'UK CBAM consultation outcome (Jan 2027 start)',
        url: 'https://www.gov.uk/government/consultations/introduction-of-a-uk-carbon-border-adjustment-mechanism-from-january-2027',
      },
    ],
  },
  {
    id: 'china',
    name: 'China',
    carbonPrice: {
      status: 'in-force',
      headline: 'National ETS · ≈CNY 70–100/t (≈€9–13)',
      coverageNote:
        'Expanded in March 2025 from power to steel, cement and aluminium smelting — roughly 60 % of national CO2 (≈8 Gt) once phased in. Intensity-based benchmarks, not an absolute cap.',
      note:
        'Prices averaged near CNY 100/t in 2024 and eased into the CNY 70–90 range during 2025 amid generous benchmark allocation. Order-of-magnitude only.',
      sourceYear: '2024–25',
      uncertain: true,
    },
    ndc2035: {
      status: 'adopted',
      headline: '7–10 % below peak by 2035 — submitted 3 November 2025',
      note:
        'Announced by Xi Jinping at the UN climate summit on 24 September 2025 — the first absolute, economy-wide, all-gas Chinese target — and formally submitted to the UNFCCC on 3 November 2025, ahead of COP30 in Belém. The compile could not verify the submission and flagged it; verified 2026-08-06.',
      sourceYear: '2025',
    },
    cbam: {
      status: 'none',
      headline: 'No CBAM-type measure; opposed to the EU CBAM',
      note:
        'Consistently criticises CBAM as a unilateral trade measure, including at the WTO, while expanding its own ETS — which lowers its future CBAM exposure.',
    },
    linkage: {
      status: 'none',
      headline: 'No linkage prospect; carbon-market dialogue only',
      note:
        'EU–China cooperation on emissions trading continues at technical level; intensity-based design and MRV differences rule out linkage on any near horizon.',
      uncertain: true,
    },
    sources: [
      { label: 'ICAP — China national ETS', url: 'https://icapcarbonaction.com/en/ets' },
      { label: 'Ministry of Ecology and Environment (MEE)', url: 'https://english.mee.gov.cn/' },
      { label: 'World Bank, State and Trends of Carbon Pricing 2025', url: 'https://www.worldbank.org/en/publication/state-and-trends-of-carbon-pricing' },
    ],
  },
  {
    id: 'india',
    name: 'India',
    carbonPrice: {
      status: 'adopted',
      headline: 'CCTS adopted; no traded price yet',
      coverageNote:
        'Carbon Credit Trading Scheme (2023, under the Energy Conservation Act): intensity targets for obligated entities in heavy industry plus an offset mechanism; first compliance cycles from around 2025–26 to 2026–27.',
      note: 'No compliance price had formed at compile; the scheme succeeds the PAT energy-efficiency certificates.',
      sourceYear: '2025',
      uncertain: true,
    },
    ndc2035: {
      status: 'none',
      headline: 'No 2035 NDC on the registry at compile',
      note:
        'The 2030 NDC (45 % emissions-intensity cut vs 2005; 50 % non-fossil capacity) stands; no 2035 submission could be verified at compile.',
      uncertain: true,
    },
    cbam: {
      status: 'none',
      headline: 'No CBAM-type measure; strongly opposed',
      note:
        'Has called CBAM discriminatory, raised it at the WTO with the BASIC group, and floated retaliatory duties; CBAM features in EU–India FTA negotiations.',
    },
    linkage: {
      status: 'none',
      headline: 'No linkage prospect',
      note: 'CCTS is intensity-based and domestic in scope; no linkage discussion exists.',
    },
    sources: [
      { label: 'Bureau of Energy Efficiency (CCTS)', url: 'https://beeindia.gov.in/' },
      { label: 'World Bank Carbon Pricing Dashboard', url: 'https://carbonpricingdashboard.worldbank.org/' },
      { label: 'UNFCCC NDC Registry', url: 'https://unfccc.int/NDCREG' },
    ],
  },
  {
    id: 'turkiye',
    name: 'Türkiye',
    carbonPrice: {
      status: 'adopted',
      headline: 'ETS legislated July 2025; pilot phase first',
      coverageNote:
        'Climate Law No. 7552 (Official Gazette, July 2025) establishes a national ETS with a pilot phase of roughly three years before full operation; no price had formed at compile.',
      note: 'Design is explicitly shaped to limit EU CBAM exposure of Turkish exporters.',
      sourceYear: '2025',
      uncertain: true,
    },
    ndc2035: {
      status: 'none',
      headline: 'No 2035 NDC verified at compile',
      note: 'The 2030 target (41 % below business-as-usual) stands; a 2035 submission could not be verified at compile.',
      uncertain: true,
    },
    cbam: {
      status: 'none',
      headline: 'No own CBAM; pragmatic alignment with the EU CBAM',
      note:
        'Rather than contesting CBAM, Türkiye is building the domestic carbon-pricing infrastructure that would let its exporters credit a home price against CBAM liabilities.',
    },
    linkage: {
      status: 'none',
      headline: 'No formal linkage prospect; long-run candidate',
      note: 'The customs union and CBAM exposure make Türkiye a frequently named long-run linkage or alignment candidate, but nothing formal exists.',
      uncertain: true,
    },
    sources: [
      { label: 'ICAP ETS map — Türkiye', url: 'https://icapcarbonaction.com/en/ets' },
      { label: 'World Bank, State and Trends of Carbon Pricing 2025', url: 'https://www.worldbank.org/en/publication/state-and-trends-of-carbon-pricing' },
    ],
  },
  {
    id: 'japan',
    name: 'Japan',
    carbonPrice: {
      status: 'adopted',
      headline: 'GX-ETS mandatory from FY2026; no national price yet',
      coverageNote:
        'Voluntary GX-ETS since FY2023; a May 2025 amendment to the GX Promotion Act makes participation mandatory from FY2026 for emitters of ≥100 ktCO2/yr, with a fossil-fuel levy to follow from FY2028. Tokyo and Saitama cap-and-trade schemes have been in force since 2010–11.',
      note: 'No liquid national allowance price had formed during the voluntary phase.',
      sourceYear: '2025',
      uncertain: true,
    },
    ndc2035: {
      status: 'adopted',
      headline: '60 % below FY2013 by FY2035 — submitted',
      note: 'Submitted to the UNFCCC registry in February 2025, alongside a 73 % target for FY2040.',
      sourceYear: '2025',
    },
    cbam: {
      status: 'none',
      headline: 'No CBAM-type measure; studying, not contesting',
      note: 'Officially neutral-to-cautious: studying carbon-leakage measures within the GX framework rather than opposing CBAM at the WTO.',
      uncertain: true,
    },
    linkage: {
      status: 'none',
      headline: 'No EU linkage; JCM is Japan’s own Article 6 channel',
      note:
        'The Joint Crediting Mechanism (≈30 partner countries) is Japan’s bilateral Article 6.2 vehicle with a public-private target of the order of 100 Mt cumulative by 2030 — far ahead of issuance to date.',
      uncertain: true,
    },
    sources: [
      { label: 'GX League (METI)', url: 'https://gx-league.go.jp/' },
      { label: 'ICAP — Japan / Tokyo', url: 'https://icapcarbonaction.com/en/ets' },
      { label: 'UNFCCC NDC Registry', url: 'https://unfccc.int/NDCREG' },
    ],
  },
  {
    id: 'brazil',
    name: 'Brazil',
    carbonPrice: {
      status: 'adopted',
      headline: 'SBCE cap-and-trade law enacted Dec 2024; no price yet',
      coverageNote:
        'Law 15.042/2024 (December 2024) creates the Brazilian ETS (SBCE) for emitters above 25 ktCO2e/yr, phased in over roughly five to six years; agriculture is excluded.',
      note: 'Regulation and registry build-out were under way at compile; no compliance price had formed.',
      sourceYear: '2024–25',
      uncertain: true,
    },
    ndc2035: {
      status: 'adopted',
      headline: '59–67 % below 2005 by 2035 — submitted',
      note: 'Submitted in November 2024 ahead of hosting COP30 in Belém (November 2025).',
      sourceYear: '2024',
    },
    cbam: {
      status: 'none',
      headline: 'No own CBAM; critical of the EU CBAM',
      note:
        'Has criticised CBAM as unilateral (with the BASIC group at the WTO) while simultaneously building the domestic carbon market that would reduce exposure.',
    },
    linkage: {
      status: 'none',
      headline: 'No linkage prospect; large potential Article 6 host',
      note: 'Interest centres on selling credits (forestry, restoration) under Article 6 rather than on linking cap-and-trade systems.',
      uncertain: true,
    },
    sources: [
      { label: 'Law 15.042/2024 (Planalto)', url: 'https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2024/lei/L15042.htm' },
      { label: 'World Bank Carbon Pricing Dashboard', url: 'https://carbonpricingdashboard.worldbank.org/' },
      { label: 'UNFCCC NDC Registry', url: 'https://unfccc.int/NDCREG' },
    ],
  },
  {
    id: 'gulf',
    name: 'Gulf states (Saudi Arabia & UAE)',
    carbonPrice: {
      status: 'none',
      headline: 'No carbon price in either jurisdiction',
      coverageNote:
        'Neither Saudi Arabia nor the UAE prices carbon; Saudi Arabia runs a voluntary offset exchange (RVCMC) and both position themselves as Article 6 buyers and hosts.',
      note: 'No pricing instrument was proposed in either country at compile.',
      sourceYear: '2025',
    },
    ndc2035: {
      status: 'adopted',
      headline: 'UAE submitted (47 % below 2019); Saudi Arabia none at compile',
      note:
        'The UAE submitted its 2035 NDC in November 2024. No Saudi 2035 submission could be verified at compile — the status shown reflects the UAE only.',
      sourceYear: '2024',
      uncertain: true,
    },
    cbam: {
      status: 'none',
      headline: 'No CBAM-type measure; opposed',
      note: 'Saudi Arabia has been among the most vocal critics of CBAM at the WTO; the UAE has raised concerns through trade channels while courting clean-tech investment.',
    },
    linkage: {
      status: 'none',
      headline: 'No linkage prospect',
      note: 'No ETS exists to link; engagement with EU carbon policy runs through trade diplomacy and Article 6 crediting.',
    },
    sources: [
      { label: 'World Bank Carbon Pricing Dashboard', url: 'https://carbonpricingdashboard.worldbank.org/' },
      { label: 'UNFCCC NDC Registry', url: 'https://unfccc.int/NDCREG' },
    ],
  },
];

/* -------------------------------------------- Article 6 supply pipeline */

export interface HostRow {
  host: string;
  buyers: string;
  /** Cumulative authorised volume to date, order-of-magnitude [lo, hi] Mt. */
  authorisedMt: [number, number];
  /** Credits actually issued / first-transferred to date, [lo, hi] Mt. */
  issuedMt: [number, number];
  note: string;
  confidence: Confidence;
}

export const ARTICLE6_HOSTS: HostRow[] = [
  {
    host: 'Suriname',
    buyers: 'open offer',
    authorisedMt: [4, 5],
    issuedMt: [4, 5],
    note: 'First state to offer authorised ITMOs (≈4.8 Mt of ART-TREES forestry credits, 2023); buyers were still scarce at compile — quality debate centres on forestry crediting baselines.',
    confidence: 'unverified',
  },
  {
    host: 'Ghana',
    buyers: 'Switzerland (KliK), Sweden, Singapore',
    authorisedMt: [1, 5],
    issuedMt: [0, 0.5],
    note: 'Most active Article 6.2 host: clean-cooking and sustainable-rice programmes authorised; first ITMO issuances reported 2024–25 at well under a megatonne.',
    confidence: 'unverified',
  },
  {
    host: 'Thailand',
    buyers: 'Switzerland (KliK)',
    authorisedMt: [0.5, 2],
    issuedMt: [0, 0.01],
    note: 'The Bangkok e-bus programme delivered the world’s first ITMO transfer (January 2024, roughly two kilotonnes) — a proof of plumbing, not of volume.',
    confidence: 'reported',
  },
  {
    host: 'JCM partner countries (≈30, Japan buying)',
    buyers: 'Japan',
    authorisedMt: [1, 5],
    issuedMt: [0.3, 1],
    note: 'Joint Crediting Mechanism issuance to date is under a megatonne cumulatively; the public-private ambition of ≈100 Mt cumulative by 2030 remains far ahead of delivery.',
    confidence: 'unverified',
  },
  {
    host: 'Other bilateral hosts (Peru, Chile, Morocco, Kenya, Vanuatu, …)',
    buyers: 'Switzerland, Singapore, Sweden, Norway, …',
    authorisedMt: [5, 30],
    issuedMt: [0, 0.5],
    note: 'Several dozen framework agreements were signed by 2025 (order 60–100 across all buyers), but agreements are not authorisations: most listed volumes remain at MoU stage.',
    confidence: 'unverified',
  },
  {
    host: 'Article 6.4 mechanism (PACM)',
    buyers: 'open market',
    authorisedMt: [0, 0],
    issuedMt: [0, 0],
    note: 'First methodologies adopted 2025; on the order of a thousand CDM activities requested transition. First credits were expected from 2026 — none issued at compile.',
    confidence: 'unverified',
  },
];

export interface SupplyTier {
  key: 'issued' | 'authorised' | 'pipeline';
  label: string;
  /** Order-of-magnitude [lo, hi] Mt, read as cumulative volume relevant to 2036–40. */
  range: [number, number];
  note: string;
}

/**
 * Three nested tiers of plausible cumulative supply against the 2036–40
 * demand window. The `pipeline` tier is ADDITIONAL to `authorised` (it is
 * the face-value scale-up of agreements plus the PACM/CDM-transition
 * pipeline), so face-value total = authorised + pipeline.
 * All ranges are AI-compiled orders of magnitude, not published totals.
 */
export const SUPPLY_TIERS: Record<SupplyTier['key'], SupplyTier> = {
  issued: {
    key: 'issued',
    label: 'Issued / first-transferred to date',
    range: [0, 2],
    note: 'Everything actually moved under Article 6 so far — kilotonnes to low megatonnes, dominated by Suriname’s unsold forestry offer.',
  },
  authorised: {
    key: 'authorised',
    label: 'Host authorisations announced to date',
    range: [10, 40],
    note: 'Cumulative volumes named in host-country authorisations and LoAs across the 6.2 pipeline; order of magnitude only.',
  },
  pipeline: {
    key: 'pipeline',
    label: 'Agreements + PACM pipeline at face value (additional)',
    range: [150, 700],
    note: 'What signed cooperation agreements, the JCM ambition and the CDM-transition pipeline would deliver by the late 2030s if everything scaled as marketed — the speculative tier.',
  },
};

export const DEMAND_SOURCE: SourceLink = {
  label: 'ETS Directive proposal COM(2026) 616 — ≈260 Mt international credits, 2036–40',
  url: 'https://climate.ec.europa.eu/document/download/c0b4ca8e-0e12-4b4e-9976-98c0b4224410_en',
};

/* --------------------------------------------------- rollback watch */

export interface LedgerEntry {
  date: string; // YYYY-MM
  partner: string;
  kind: 'rollback' | 'counterweight';
  title: string;
  note: string;
  source: SourceLink;
  confidence: Confidence;
}

/** Newest first. Coverage runs to roughly early 2026 (see KNOWLEDGE_CUTOFF_NOTE). */
export const ROLLBACK_LEDGER: LedgerEntry[] = [
  {
    date: '2025-09',
    partner: 'China',
    kind: 'counterweight',
    title: 'First absolute-cut NDC announced: 7–10 % below peak by 2035',
    note: 'Announced by Xi Jinping at the UN on 24 September 2025 — economy-wide, all gases. Widely judged conservative against 2035 modelling, but a structural shift from intensity to absolute targets.',
    source: { label: 'UNFCCC NDC Registry', url: 'https://unfccc.int/NDCREG' },
    confidence: 'reported',
  },
  {
    date: '2025-09',
    partner: 'US (states)',
    kind: 'counterweight',
    title: 'California moves to extend cap-and-trade to 2045',
    note: 'Legislative deal reported in September 2025 to reauthorise the programme (rebranded cap-and-invest) beyond 2030. Detail and bill numbers unverified at compile.',
    source: { label: 'CARB cap-and-trade programme', url: 'https://ww2.arb.ca.gov/our-work/programs/cap-and-trade-program' },
    confidence: 'unverified',
  },
  {
    date: '2025-07',
    partner: 'US',
    kind: 'rollback',
    title: 'Budget law phases out IRA clean-energy tax credits',
    note: 'The reconciliation act signed 4 July 2025 terminates wind and solar credits for projects not in service by end-2027 (narrow start-of-construction window) and ended EV purchase credits in September 2025.',
    source: { label: 'H.R.1, 119th Congress', url: 'https://www.congress.gov/bill/119th-congress/house-bill/1' },
    confidence: 'reported',
  },
  {
    date: '2025-07',
    partner: 'US',
    kind: 'rollback',
    title: 'EPA proposes rescinding the GHG endangerment finding',
    note: 'Following the March 2025 deregulation announcement, EPA proposed in July 2025 to rescind the 2009 endangerment finding — the legal basis for federal GHG standards. Litigation certain; outcome open.',
    source: { label: 'US EPA newsroom', url: 'https://www.epa.gov/newsreleases' },
    confidence: 'unverified',
  },
  {
    date: '2025-07',
    partner: 'Türkiye',
    kind: 'counterweight',
    title: 'Climate Law No. 7552 enacted, establishing a national ETS',
    note: 'Published in the Official Gazette in July 2025; ETS pilot phase of roughly three years, motivated in part by EU CBAM exposure.',
    source: { label: 'ICAP ETS map — Türkiye', url: 'https://icapcarbonaction.com/en/ets' },
    confidence: 'unverified',
  },
  {
    date: '2025-05',
    partner: 'UK / EU',
    kind: 'counterweight',
    title: 'UK and EU agree in principle to link their ETSs',
    note: 'Common Understanding at the 19 May 2025 summit commits both sides to work towards ETS linkage, with mutual CBAM exemption for linked sectors; UKA prices rose sharply on the news.',
    source: { label: 'UK–EU summit key documents, gov.uk', url: 'https://www.gov.uk/government/publications/uk-eu-summit-key-documents' },
    confidence: 'reported',
  },
  {
    date: '2025-05',
    partner: 'Japan',
    kind: 'counterweight',
    title: 'GX-ETS made mandatory from FY2026',
    note: 'Diet passed the GX Promotion Act amendment in May 2025, converting the voluntary scheme into a mandatory ETS for large emitters, with a fossil-fuel levy from FY2028. Exact passage date unverified.',
    source: { label: 'GX League (METI)', url: 'https://gx-league.go.jp/' },
    confidence: 'unverified',
  },
  {
    date: '2025-03',
    partner: 'China',
    kind: 'counterweight',
    title: 'National ETS expanded to steel, cement and aluminium',
    note: 'MEE work plan of March 2025 brings roughly 1,500 additional entities into the scheme, lifting coverage to about 60 % of national CO2 once phased in.',
    source: { label: 'MEE (English)', url: 'https://english.mee.gov.cn/' },
    confidence: 'reported',
  },
  {
    date: '2025-03',
    partner: 'Canada (other notable)',
    kind: 'rollback',
    title: 'Consumer carbon price set to zero',
    note: 'The incoming Carney government zeroed the consumer fuel charge with effect from 1 April 2025; industrial output-based pricing was retained. Included as a notable non-register reversal.',
    source: { label: 'Government of Canada — carbon pollution pricing', url: 'https://www.canada.ca/en/services/environment/weather/climatechange/climate-action/pricing-carbon-pollution.html' },
    confidence: 'reported',
  },
  {
    date: '2025-01',
    partner: 'US',
    kind: 'rollback',
    title: 'Executive order to withdraw from the Paris Agreement',
    note: 'Signed 20 January 2025; under Article 28 the withdrawal took effect on 27 January 2026. The December 2024 US NDC (61–66 % below 2005 by 2035) is thereby moot at federal level.',
    source: {
      label: 'White House EO, 20 Jan 2025',
      url: 'https://www.whitehouse.gov/presidential-actions/2025/01/putting-america-first-in-international-environmental-agreements/',
    },
    confidence: 'reported',
  },
  {
    date: '2025-01',
    partner: 'US (states)',
    kind: 'rollback',
    title: 'New York pauses cap-and-invest rollout',
    note: 'The planned economy-wide cap-and-invest regulations were not advanced in the January 2025 budget cycle; reporting rules proceeded without the cap. Status unverified at compile.',
    source: { label: 'World Bank Carbon Pricing Dashboard', url: 'https://carbonpricingdashboard.worldbank.org/' },
    confidence: 'unverified',
  },
  {
    date: '2024-11',
    partner: 'US (states)',
    kind: 'counterweight',
    title: 'Washington voters keep the Climate Commitment Act',
    note: 'Initiative 2117 to repeal the state cap-and-invest programme was defeated by a wide margin in November 2024; auctions and California–Québec linkage talks continued.',
    source: { label: 'Washington cap-and-invest (Ecology)', url: 'https://ecology.wa.gov/air-climate/climate-commitment-act' },
    confidence: 'reported',
  },
];
