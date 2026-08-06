/**
 * Grid & Interconnection Security Ledger — compiled data (beta module M · 50).
 *
 * GENERATED — AI-compiled 2026-08 — pending Secretariat verification.
 *
 * Provenance and compile rules:
 *   - Interconnection ratios: the per-member-state levels are taken from the
 *     table of 2017 interconnection levels in the Commission Communication on
 *     strengthening Europe's energy networks, COM(2017) 718 final (the last
 *     complete per-MS table the compiling agent could anchor to a single
 *     locator), with the basis year stated on every row. They are ORDERS OF
 *     MAGNITUDE, not current values: interconnectors commissioned since 2017
 *     are flagged in the row notes but NOT folded into the numbers, because
 *     no post-2017 full table could be verified from this sandbox (ENTSO-E,
 *     Eurostat, EEA and EUR-Lex hosts are blocked here). Definitions differ
 *     across monitoring reports (import capacity ÷ installed generation vs
 *     peak-load-based measures); ratios are indicative and NOT comparable
 *     with NECP self-reported levels without checking the definition used.
 *   - Investment figures: each row carries its own document locator
 *     (COM number and section, or report name). Figures the agent could not
 *     confidently locate were dropped, not guessed (see DROPPED note below).
 *   - Incident ledger: compiled from official statements and major-outlet
 *     reporting as recalled at compile time. Attribution is ALWAYS quoted or
 *     paraphrased from the investigating authority named in the entry, never
 *     asserted by the module. Anything that could not be confidently sourced
 *     is flagged in `unverifiedNote` — several court-outcome details are so
 *     flagged. Quote kind 'reported-quote' means the words are as widely
 *     reported and still need re-verification against the primary statement.
 *   - URLs: outbound fetches from this sandbox are proxied/blocked, so links
 *     could NOT be live-verified. Where a deep link was uncertain, the
 *     institution's stable root is given together with a textual locator
 *     (document number, date) sufficient to find the source.
 *
 * DROPPED for lack of confident sourcing (coverage gaps, not denials):
 *   - ENTSO-E TYNDP monetary investment-need figures (only the cross-border
 *     capacity need in GW is carried, at medium uncertainty);
 *   - 2022 drone observations near Norwegian offshore installations;
 *   - any per-incident repair-cost figures.
 */

import type { LedgerEntry, LedgerSource, MemberStateRatio, PaceInputs, Uncertainty } from './model';

/* --------------------------------------------- panel 1 · interconnection */

/** The target card: text and origin locators for the 15 %-by-2030 target. */
export const TARGET_CARD = {
  headline: '15 % electricity interconnection by 2030',
  /**
   * Paraphrase of EUCO 169/14 para. 4 — the European Council endorsed
   * extending the 10 %-by-2020 electricity interconnection objective to
   * 15 % by 2030, to be achieved primarily through projects of common
   * interest. Not a verbatim enacting-terms quote: the target sits in
   * European Council conclusions and is carried into Union law only as an
   * NECP reporting dimension, not as a binding obligation.
   */
  origin: [
    {
      label:
        'European Council conclusions, 23–24 October 2014 (EUCO 169/14), para. 4 — endorses the 15 % by 2030 objective, extending the 10 %-by-2020 target',
      url: 'https://www.consilium.europa.eu/uedocs/cms_data/docs/pressdata/en/ec/145397.pdf',
    },
    {
      label:
        'Regulation (EU) 2018/1999 (Governance Regulation), Annex I part 1 section A.2.4.1 — NECPs must state the level of electricity interconnectivity the Member State aims for in 2030 in view of the 15 % target (consolidated versions listed at ELI)',
      url: 'https://eur-lex.europa.eu/eli/reg/2018/1999',
    },
    {
      label:
        'COM(2017) 718 final — Communication on strengthening Europe’s energy networks: indicator definition (import capacity ÷ installed generation), 2017 per-MS levels, and the expert-group urgency thresholds',
      url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52017DC0718',
    },
  ] as LedgerSource[],
  /** Legal nature, stated plainly. */
  natureNote:
    'A European Council political objective, not a binding legal obligation on Member States. The Governance Regulation makes it a mandatory NECP reporting dimension; the 2017 Commission expert group added urgency indicators (wholesale price differential above roughly €2/MWh; nominal transmission capacity below 30 % of peak load or of installed renewable capacity) — threshold values at medium uncertainty, pending verification against COM(2017) 718.',
};

/**
 * Per-member-state interconnection levels — 2017 basis (COM(2017) 718
 * final), indicative orders of magnitude. See file header: NOT current
 * values; commissioned-since links are noted, not folded in.
 */
export const MEMBER_STATE_RATIOS: MemberStateRatio[] = [
  { code: 'AT', name: 'Austria', ratioPct: 15, basisYear: 2017, uncertainty: 'medium' },
  { code: 'BE', name: 'Belgium', ratioPct: 19, basisYear: 2017, uncertainty: 'medium', note: 'Nemo Link to GB (2019) and ALEGrO to DE (2020) commissioned since — current level higher.' },
  { code: 'BG', name: 'Bulgaria', ratioPct: 7, basisYear: 2017, uncertainty: 'high', note: 'IBS internal reinforcements and Greece–Bulgaria links since; level likely higher.' },
  { code: 'HR', name: 'Croatia', ratioPct: 52, basisYear: 2017, uncertainty: 'medium' },
  { code: 'CY', name: 'Cyprus', ratioPct: 0, basisYear: 2017, uncertainty: 'low', note: 'Isolated system — still 0 %. The Great Sea Interconnector to Greece is under development.' },
  { code: 'CZ', name: 'Czechia', ratioPct: 17, basisYear: 2017, uncertainty: 'medium' },
  { code: 'DK', name: 'Denmark', ratioPct: 51, basisYear: 2017, uncertainty: 'medium', note: 'Viking Link to GB (2023) commissioned since; GB links count in the indicator but are now third-country links.' },
  { code: 'EE', name: 'Estonia', ratioPct: 63, basisYear: 2017, uncertainty: 'medium', note: 'EstLink 2 was out of service Dec 2024 – Jun 2025 after cable damage (see ledger).' },
  { code: 'FI', name: 'Finland', ratioPct: 29, basisYear: 2017, uncertainty: 'medium' },
  { code: 'FR', name: 'France', ratioPct: 9, basisYear: 2017, uncertainty: 'medium', note: 'IFA2 to GB (2021) and Savoy–Piedmont to IT (2021) since; Celtic Interconnector to IE under construction.' },
  { code: 'DE', name: 'Germany', ratioPct: 9, basisYear: 2017, uncertainty: 'medium', note: 'NordLink to NO (2021) and ALEGrO to BE (2020) since.' },
  { code: 'EL', name: 'Greece', ratioPct: 11, basisYear: 2017, uncertainty: 'high', note: 'Crete–Peloponnese/Attica links (2021–2023) are internal, not interconnection; EuroAsia/Great Sea link under development.' },
  { code: 'HU', name: 'Hungary', ratioPct: 58, basisYear: 2017, uncertainty: 'medium' },
  { code: 'IE', name: 'Ireland', ratioPct: 7, basisYear: 2017, uncertainty: 'medium', note: 'Greenlink to GB (2025) since; Celtic Interconnector to FR (first EU link) under construction.' },
  { code: 'IT', name: 'Italy', ratioPct: 8, basisYear: 2017, uncertainty: 'medium' },
  { code: 'LV', name: 'Latvia', ratioPct: 45, basisYear: 2017, uncertainty: 'high', note: 'Third Estonia–Latvia interconnector (2020) since.' },
  { code: 'LT', name: 'Lithuania', ratioPct: 88, basisYear: 2017, uncertainty: 'high', note: 'Includes NordBalt and LitPol Link; links to BY/RU severed with the Feb 2025 desynchronisation (see ledger).' },
  { code: 'LU', name: 'Luxembourg', ratioPct: 245, basisYear: 2017, uncertainty: 'medium', note: 'Above 100 % because the denominator is installed generation, which is small relative to imports.' },
  { code: 'MT', name: 'Malta', ratioPct: 24, basisYear: 2017, uncertainty: 'medium', note: 'Single interconnector to Sicily; a second is planned.' },
  { code: 'NL', name: 'Netherlands', ratioPct: 18, basisYear: 2017, uncertainty: 'medium' },
  { code: 'PL', name: 'Poland', ratioPct: 4, basisYear: 2017, uncertainty: 'medium', note: 'Harmony Link to LT postponed/reconfigured; level remains among the lowest.' },
  { code: 'PT', name: 'Portugal', ratioPct: 9, basisYear: 2017, uncertainty: 'medium', note: 'Effectively bounded by the Spain–France bottleneck.' },
  { code: 'RO', name: 'Romania', ratioPct: 7, basisYear: 2017, uncertainty: 'high' },
  { code: 'SK', name: 'Slovakia', ratioPct: 61, basisYear: 2017, uncertainty: 'medium' },
  { code: 'SI', name: 'Slovenia', ratioPct: 84, basisYear: 2017, uncertainty: 'medium' },
  { code: 'ES', name: 'Spain', ratioPct: 6, basisYear: 2017, uncertainty: 'medium', note: 'Long-standing lowest tier; Biscay Gulf link to FR under construction (planned late 2020s).' },
  { code: 'SE', name: 'Sweden', ratioPct: 26, basisYear: 2017, uncertainty: 'medium' },
];

/* --------------------------------------------- panel 2 · investment gap */

export interface InvestmentRow {
  id: string;
  label: string;
  /** Value with unit spelled out in the string — rows are NOT comparable. */
  figure: string;
  locator: string;
  scopeNote: string;
  uncertainty: Uncertainty;
  url: string;
}

/**
 * Need-side and realised-side rows. Deliberately kept as labelled,
 * non-comparable rows (different scopes, periods and voltage levels);
 * only the pace computation below reduces anything to one number, and it
 * says exactly which rows it uses.
 */
export const INVESTMENT_ROWS: InvestmentRow[] = [
  {
    id: 'com-2022-552-need',
    label: 'Electricity grid investment need, 2020–2030 (Commission)',
    figure: '≈ €584 bn over 2020–2030, of which ≈ €400 bn in distribution grids (incl. ≈ €170 bn for digitalisation)',
    locator: 'COM(2022) 552 final — Digitalising the energy system: EU action plan, 18 Oct 2022, section 2',
    scopeNote: 'EU-27, transmission + distribution. The origin of the €584 bn figure later reused by the Grid Action Plan. Distribution breakdown at medium uncertainty.',
    uncertainty: 'medium',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52022DC0552',
  },
  {
    id: 'com-2023-757-need',
    label: 'EU Action Plan for Grids (restates the need)',
    figure: '≈ €584 bn in electricity grid investment this decade',
    locator: 'COM(2023) 757 final — Grids, the missing link: an EU Action Plan for Grids, 28 Nov 2023, section 1',
    scopeNote: 'Same headline number as COM(2022) 552; the Action Plan’s contribution is the 14-point delivery plan, not a new estimate.',
    uncertainty: 'low',
    url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023DC0757',
  },
  {
    id: 'tyndp-cross-border',
    label: 'Cross-border capacity need (ENTSO-E TYNDP)',
    figure: '≈ 64 GW of additional cross-border capacity needed by 2030 (TYNDP 2022 System Needs study; later cycles revise upwards towards 2040)',
    locator: 'ENTSO-E TYNDP 2022, System Needs study — headline capacity figure',
    scopeNote: 'Transmission only, cross-border only — a physical-capacity need, not a € figure. TYNDP monetary figures were dropped from this module pending verification (see file header).',
    uncertainty: 'medium',
    url: 'https://tyndp.entsoe.eu/',
  },
  {
    id: 'eurelectric-dso-pace',
    label: 'Realised distribution-grid investment (Eurelectric)',
    figure: '≈ €23 bn/yr current EU DSO investment; ≈ €67 bn/yr needed on average to 2050',
    locator: 'Eurelectric, “Grids for Speed” report, May 2024 — headline figures',
    scopeNote: 'Distribution only. Industry (DSO association) estimate, not an official statistic.',
    uncertainty: 'medium',
    url: 'https://www.eurelectric.org/',
  },
];

/**
 * Inputs to the pace-ratio computation in model.ts. The realised-pace range
 * is AI-COMPILED and the weakest number in this module: ≈ €23 bn/yr DSO
 * investment (Eurelectric, Grids for Speed 2024) plus an assumed TSO order
 * of €10–15 bn/yr for which no single citable EU-wide figure could be
 * verified from this sandbox. High uncertainty; pending verification.
 */
export const PACE_INPUTS: PaceInputs = {
  needBn: 584,
  periodStartYear: 2021,
  periodEndYear: 2030,
  realisedAnnualBn: { low: 30, central: 35, high: 40 },
};

export const PACE_BASIS_NOTE =
  'Need: €584 bn over 2020–2030 (COM(2022) 552, restated in COM(2023) 757), spread evenly over 2021–2030. Realised: €30–40 bn/yr, AI-compiled from Eurelectric’s ≈ €23 bn/yr DSO figure plus an assumed €10–15 bn/yr TSO order of magnitude — the assumed TSO leg is unverified. The ratio is indicative of pace, not a measured statistic.';

/* ---------------------------------------------- panel 3 · incident ledger */

export const LEDGER: LedgerEntry[] = [
  {
    id: 'viasat-2022',
    date: '2022-02-24',
    title: 'Viasat KA-SAT cyberattack — remote control of ~5,800 German wind turbines lost',
    assetType: 'cyber-ot',
    attribution: 'state-attributed',
    summary:
      'A cyberattack on Viasat’s KA-SAT satellite network in the first hours of Russia’s full-scale invasion of Ukraine disabled modems across Europe. As collateral damage, remote monitoring and control of roughly 5,800 Enercon wind turbines in Germany was lost for weeks; the turbines kept producing on automatic mode.',
    authorityPosition:
      'Council of the EU / High Representative declaration, 10 May 2022: the EU and its Member States strongly condemned the malicious cyber activity against the KA-SAT network, which they attributed to the Russian Federation.',
    quoteKind: 'paraphrase',
    uncertainty: 'low',
    sources: [
      {
        label: 'Council of the EU — HR declaration on malicious cyber activity against Ukraine (KA-SAT), 10 May 2022',
        url: 'https://www.consilium.europa.eu/en/press/press-releases/2022/05/10/russian-cyber-operations-against-ukraine-declaration-by-the-high-representative-on-behalf-of-the-european-union/',
      },
    ],
  },
  {
    id: 'nord-stream-2022',
    date: '2022-09-26',
    title: 'Nord Stream 1 & 2 pipeline explosions, Baltic Sea near Bornholm',
    assetType: 'gas-pipeline',
    attribution: 'sabotage-confirmed',
    summary:
      'Underwater explosions ruptured three of the four strings of the Nord Stream 1 and 2 gas pipelines in the Danish and Swedish exclusive economic zones. Neither pipeline was supplying gas to the EU at the time (NS1 suspended, NS2 never in service), but it remains the largest single act of destruction of EU-adjacent energy infrastructure since 2022.',
    authorityPosition:
      'Copenhagen Police (with the Danish Security and Intelligence Service), February 2024: the investigation concluded there was deliberate sabotage of the pipelines, but found no grounds to pursue a criminal case in Denmark. The Swedish Prosecution Authority closed its parallel investigation the same month for lack of Swedish jurisdiction. Germany’s Federal Public Prosecutor continues to investigate and has obtained arrest warrants for Ukrainian suspects (2024–2025). No authority has published a final finding on who ordered the act.',
    quoteKind: 'paraphrase',
    uncertainty: 'low',
    unverifiedNote:
      'The state of the German proceedings (arrests in Poland and Italy, extradition rulings, 2024–2025) is compiled from press reporting and needs verification against the Generalbundesanwalt’s own statements.',
    sources: [
      { label: 'Danish Police — Nord Stream investigation conclusion, 26 Feb 2024 (politi.dk, news archive)', url: 'https://politi.dk/' },
      { label: 'Swedish Prosecution Authority — decision to close the Nord Stream investigation, 7 Feb 2024 (press releases)', url: 'https://www.aklagare.se/en/' },
    ],
  },
  {
    id: 'balticconnector-2023',
    date: '2023-10-08',
    title: 'Balticconnector gas pipeline and EE–SE telecom cable damaged',
    assetType: 'gas-pipeline',
    attribution: 'investigation-ongoing',
    summary:
      'The Balticconnector gas pipeline between Finland and Estonia lost pressure and was found damaged; a telecom cable between Estonia and Sweden was damaged in the same window. The pipeline was repaired and returned to service in April 2024.',
    authorityPosition:
      'Finland’s National Bureau of Investigation (KRP): the damage was caused by the anchor of the Hong Kong-flagged container vessel Newnew Polar Bear, recovered from the seabed next to the pipeline; whether the act was intentional or the result of poor seamanship remained under investigation. Chinese authorities were later reported to have acknowledged the vessel caused the damage accidentally in a storm.',
    quoteKind: 'paraphrase',
    uncertainty: 'medium',
    unverifiedNote:
      'The reported Chinese acknowledgement (mid-2024) is press-sourced and unverified against any primary statement; the final Finnish finding on intent could not be confirmed at compile time.',
    sources: [
      { label: 'Finnish Police / National Bureau of Investigation — Balticconnector investigation updates (poliisi.fi, news archive, Oct–Nov 2023)', url: 'https://poliisi.fi/en/' },
    ],
  },
  {
    id: 'brandenburg-pylon-2024',
    date: '2024-03-05',
    title: 'Arson attack on a high-voltage pylon near Grünheide, Brandenburg',
    assetType: 'grid-substation',
    attribution: 'investigation-ongoing',
    summary:
      'An arson attack on a 110 kV transmission pylon cut power to tens of thousands of households and halted production at the nearby Tesla Gigafactory for about a week. Included as the clearest recent case of onshore grid sabotage inside the EU that is unrelated to state actors.',
    authorityPosition:
      'Brandenburg police and the public prosecutor treated the fire as arson and investigated a claim of responsibility published in the name of a far-left group (“Vulkangruppe”); the module records the claim only as reported by the investigating authorities, not as established.',
    quoteKind: 'paraphrase',
    uncertainty: 'medium',
    unverifiedNote: 'Outcome of the criminal investigation not confirmed at compile time.',
    sources: [
      { label: 'Brandenburg Police — press portal (news archive, March 2024)', url: 'https://polizei.brandenburg.de/' },
    ],
  },
  {
    id: 'clion-bcs-2024',
    date: '2024-11-17',
    title: 'C-Lion1 (FI–DE) and BCS East-West (LT–SE) telecom cables cut',
    assetType: 'telecom-cable',
    attribution: 'investigation-ongoing',
    summary:
      'Within roughly 24 hours on 17–18 November 2024, the C-Lion1 cable between Finland and Germany and the BCS East-West Interlink between Lithuania and Sweden were severed in the Baltic Sea. The Chinese bulk carrier Yi Peng 3, which had passed both sites, was investigated; it lay at anchor in the Kattegat under observation for a month before departing.',
    authorityPosition:
      'The foreign ministers of Finland and Germany, joint statement 18 November 2024: expressed deep concern, stating that the incident immediately raised suspicions of intentional damage and that European security is threatened not only by Russia’s war but also by hybrid warfare by malicious actors. Swedish, Finnish and German investigations were opened; no published conclusion on intent at compile time.',
    quoteKind: 'paraphrase',
    uncertainty: 'medium',
    sources: [
      { label: 'German Federal Foreign Office — joint DE–FI statement on the severed undersea cable, 18 Nov 2024 (newsroom)', url: 'https://www.auswaertiges-amt.de/en/' },
    ],
  },
  {
    id: 'estlink2-2024',
    date: '2024-12-25',
    title: 'EstLink 2 HVDC interconnector (FI–EE, 650 MW) and telecom cables damaged',
    assetType: 'power-cable',
    attribution: 'investigation-ongoing',
    summary:
      'On 25 December 2024 the EstLink 2 electricity interconnector between Finland and Estonia went offline; several telecom cables were damaged in the same period. Finnish authorities boarded and detained the Cook Islands-flagged tanker Eagle S, widely described as part of Russia’s “shadow fleet”, and investigators reported an anchor-drag track of dozens of kilometres on the seabed. EstLink 2 returned to service in June 2025. The outage materially tightened the Baltic electricity market for half a year.',
    authorityPosition:
      'Finnish Police / Border Guard: opened a criminal investigation of the Eagle S’s crew on suspicion of aggravated criminal mischief and aggravated interference with telecommunications, on the working hypothesis that the ship’s dragged anchor caused the damage. Charges were brought against the master and two officers in 2025.',
    quoteKind: 'paraphrase',
    uncertainty: 'medium',
    unverifiedNote:
      'Reports indicate the Helsinki District Court dismissed the case in autumn 2025 on jurisdictional grounds; this outcome is unverified and the attribution status is therefore kept at “investigation ongoing”.',
    sources: [
      { label: 'Finnish Police — Eagle S / EstLink 2 investigation releases (poliisi.fi, news archive, Dec 2024 – 2025)', url: 'https://poliisi.fi/en/' },
      { label: 'Fingrid — EstLink 2 outage and return-to-service announcements (newsroom, Dec 2024 / Jun 2025)', url: 'https://www.fingrid.fi/en/' },
    ],
  },
  {
    id: 'nato-baltic-sentry-2025',
    date: '2025-01-14',
    title: 'NATO launches Baltic Sentry to patrol critical undersea infrastructure',
    assetType: 'milestone',
    attribution: 'not-applicable',
    summary:
      'Following the cable incidents, NATO allies meeting in Helsinki launched Baltic Sentry: enhanced patrols of the Baltic Sea with frigates, maritime patrol aircraft and naval drones to deter damage to critical undersea infrastructure. Recorded as a resilience milestone — the protective counterpart to the incident entries.',
    authorityPosition:
      'NATO, 14 January 2025: announced the activity as a direct response to the damage to undersea cables, to improve allies’ ability to respond to destabilising acts.',
    quoteKind: 'paraphrase',
    uncertainty: 'low',
    sources: [
      { label: 'NATO — Baltic Sentry announcement, Baltic Sea Allies summit, Helsinki, 14 Jan 2025 (nato.int newsroom)', url: 'https://www.nato.int/' },
    ],
  },
  {
    id: 'lv-se-cable-2025',
    date: '2025-01-26',
    title: 'Latvia–Sweden fibre-optic cable damaged; vessel seized, later cleared',
    assetType: 'telecom-cable',
    attribution: 'accident-concluded',
    summary:
      'A fibre-optic cable of the Latvian state radio and television centre (LVRTC) between Ventspils and Gotland was damaged. Sweden seized the Maltese-flagged bulk carrier Vezhen. Included as the counter-example that keeps the ledger honest: not every cable break is sabotage, and the investigating authority said so.',
    authorityPosition:
      'Swedish Prosecution Authority, February 2025: concluded the damage was not sabotage but an accident — a combination of weather conditions, deficiencies in equipment and poor seamanship led to the anchor dropping and dragging; the vessel was released.',
    quoteKind: 'paraphrase',
    uncertainty: 'medium',
    sources: [
      { label: 'Swedish Prosecution Authority — decision in the Vezhen investigation, Feb 2025 (press releases)', url: 'https://www.aklagare.se/en/' },
    ],
  },
  {
    id: 'baltic-desync-2025',
    date: '2025-02-09',
    title: 'Baltic states desynchronise from BRELL and join the Continental European grid',
    assetType: 'milestone',
    attribution: 'not-applicable',
    summary:
      'On 8 February 2025 Estonia, Latvia and Lithuania disconnected from the Russian-controlled IPS/UPS (BRELL) system after operating in it since the Soviet era, ran in isolated mode, and on 9 February synchronised with the Continental European grid via the LitPol Link. The single largest positive resilience milestone in this ledger: frequency control for the Baltic states no longer depends on Moscow.',
    authorityPosition:
      'ENTSO-E and the European Commission welcomed the synchronisation as the completion of a long-prepared, EU co-funded (CEF) project of common interest; the Commission described it as a historic moment for European energy security.',
    quoteKind: 'paraphrase',
    uncertainty: 'low',
    sources: [
      { label: 'ENTSO-E — Baltic synchronisation with the Continental Europe Synchronous Area, 9 Feb 2025 (newsroom)', url: 'https://www.entsoe.eu/' },
      { label: 'European Commission — statement on Baltic synchronisation, 9 Feb 2025 (press corner)', url: 'https://ec.europa.eu/commission/presscorner/' },
    ],
  },
  {
    id: 'cable-security-plan-2025',
    date: '2025-02-21',
    title: 'EU Action Plan on Cable Security (Joint Communication)',
    assetType: 'milestone',
    attribution: 'not-applicable',
    summary:
      'The Commission and the High Representative presented a Joint Communication on an EU Action Plan on Cable Security: prevention, detection, response/repair (including a proposed EU cable-vessel reserve) and deterrence for submarine power and data cables. The policy counterpart to the incident cluster of 2023–2025.',
    authorityPosition: 'Not applicable — policy instrument, no incident to attribute.',
    quoteKind: 'paraphrase',
    uncertainty: 'medium',
    unverifiedNote: 'Document number believed to be JOIN(2025) 9 final; number unverified from this sandbox.',
    sources: [
      { label: 'European Commission / HR — Joint Communication, EU Action Plan on Cable Security, 21 Feb 2025 (digital-strategy.ec.europa.eu)', url: 'https://digital-strategy.ec.europa.eu/en/library' },
    ],
  },
  {
    id: 'iberia-blackout-2025',
    date: '2025-04-28',
    title: 'Iberian Peninsula blackout — hostile action ruled out by investigators',
    assetType: 'grid-system',
    attribution: 'technical-failure',
    summary:
      'A cascading voltage event caused a near-total loss of supply across mainland Spain and Portugal for most of a day — the most severe European blackout in decades. Included in a security ledger precisely because the investigations found no attack: it marks the boundary between hostile-action risk and ordinary system-security risk.',
    authorityPosition:
      'Spanish government inquiry committee (report, 17 June 2025): attributed the blackout to a chain of overvoltage-driven disconnections and insufficient voltage-control resources, and found no evidence of a cyberattack on the system operator’s control systems. An ENTSO-E expert panel is conducting the formal European investigation.',
    quoteKind: 'paraphrase',
    uncertainty: 'medium',
    unverifiedNote: 'Report date and precise technical characterisation compiled from press summaries of the government report; verify against the MITECO publication and the ENTSO-E factual report.',
    sources: [
      { label: 'Spanish Ministry for the Ecological Transition (MITECO) — committee report on the 28 April 2025 blackout, June 2025', url: 'https://www.miteco.gob.es/' },
      { label: 'ENTSO-E — expert panel investigation into the Iberian blackout (newsroom)', url: 'https://www.entsoe.eu/' },
    ],
  },
  {
    id: 'cannes-substation-2025',
    date: '2025-05-24',
    title: 'Substation arson and pylon sabotage cut power in Cannes and Nice',
    assetType: 'grid-substation',
    attribution: 'investigation-ongoing',
    summary:
      'A fire at a substation cut power to a reported ~160,000 households in the Cannes area on the final day of the Cannes Film Festival; the following day a substation in Nice was attacked and a pylon damaged. Anarchist claims of responsibility circulated online.',
    authorityPosition:
      'French prosecutors (Grasse and Nice) opened investigations into suspected arson and deliberate damage (“acte de malveillance”); the online claims of responsibility were being assessed, not confirmed, by investigators at compile time.',
    quoteKind: 'paraphrase',
    uncertainty: 'high',
    unverifiedNote:
      'Affected-household count and the attribution of the Nice incident are press-sourced; no consolidated official account could be verified. Weakest entry in the ledger — retained because it is the clearest 2025 case of onshore substation sabotage in the EU, but treat every detail as pending verification.',
    sources: [
      { label: 'Préfecture des Alpes-Maritimes / French prosecutor statements as reported, 24–25 May 2025 (press)', url: 'https://www.alpes-maritimes.gouv.fr/' },
    ],
  },
];

/* -------------------------------------------------------------- sources */

/** Page-level source list (deduplicated key documents). */
export const SOURCES: LedgerSource[] = [
  { label: 'European Council conclusions, 23–24 Oct 2014 (EUCO 169/14) — origin of the 15 % by 2030 interconnection objective', url: 'https://www.consilium.europa.eu/uedocs/cms_data/docs/pressdata/en/ec/145397.pdf' },
  { label: 'Regulation (EU) 2018/1999 — Governance Regulation, Annex I (NECP interconnectivity reporting); consolidated versions at ELI', url: 'https://eur-lex.europa.eu/eli/reg/2018/1999' },
  { label: 'COM(2017) 718 final — strengthening Europe’s energy networks (indicator definition; 2017 per-MS levels used here)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52017DC0718' },
  { label: 'COM(2022) 552 final — Digitalising the energy system: EU action plan (origin of the €584 bn grid-investment need)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52022DC0552' },
  { label: 'COM(2023) 757 final — Grids, the missing link: an EU Action Plan for Grids', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52023DC0757' },
  { label: 'ENTSO-E — Ten-Year Network Development Plan (TYNDP) and System Needs studies', url: 'https://tyndp.entsoe.eu/' },
  { label: 'Eurelectric — Grids for Speed (May 2024): DSO investment pace figures', url: 'https://www.eurelectric.org/' },
  { label: 'Council of the EU — HR declaration attributing the KA-SAT cyberattack to the Russian Federation, 10 May 2022', url: 'https://www.consilium.europa.eu/en/press/press-releases/2022/05/10/russian-cyber-operations-against-ukraine-declaration-by-the-high-representative-on-behalf-of-the-european-union/' },
  { label: 'Danish Police — Nord Stream investigation conclusion (Feb 2024)', url: 'https://politi.dk/' },
  { label: 'Swedish Prosecution Authority — Nord Stream closure (Feb 2024) and Vezhen decision (Feb 2025)', url: 'https://www.aklagare.se/en/' },
  { label: 'Finnish Police / NBI — Balticconnector (2023) and Eagle S / EstLink 2 (2024–25) investigations', url: 'https://poliisi.fi/en/' },
  { label: 'ENTSO-E — Baltic synchronisation with Continental Europe (9 Feb 2025); Iberian blackout expert panel', url: 'https://www.entsoe.eu/' },
  { label: 'NATO — Baltic Sentry (14 Jan 2025)', url: 'https://www.nato.int/' },
  { label: 'European Commission / HR — EU Action Plan on Cable Security (21 Feb 2025)', url: 'https://digital-strategy.ec.europa.eu/en/library' },
  { label: 'MITECO — committee report on the 28 April 2025 Iberian blackout (June 2025)', url: 'https://www.miteco.gob.es/' },
];
