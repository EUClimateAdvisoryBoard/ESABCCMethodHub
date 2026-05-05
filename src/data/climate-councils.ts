/**
 * Seed catalogue of EU climate advisory councils.
 *
 * Source: "Mapping of climate advisory councils in Europe" (May 2026
 * overview, 67 bodies). The first time the /eu-climate-councils page
 * loads against an empty database, this seed is used to populate
 * `public.climate_councils`. Subsequent edits live in the database.
 *
 * Coordinates are approximate capitals or regional centroids — they
 * are used only to drop a Leaflet pin; precision below ~50 km is fine.
 */

export type CouncilStatus =
  | 'active_statutory'
  | 'active_no_statute'
  | 'inter_ministerial'
  | 'partial_proxy'
  | 'legislated_not_operational'
  | 'dormant'
  | 'abolished'
  | 'none';

export type CouncilLevel = 'eu' | 'national' | 'subnational';

export interface ClimateCouncil {
  id: string;
  countryCode: string;   // ISO-2, or 'EU'
  countryName: string;
  bodyName: string;
  bodyOriginal: string;
  level: CouncilLevel;
  region: string;        // '' for national/EU, region name for subnational
  status: CouncilStatus;
  established: string;
  statutory: string;     // 'Yes' | 'Secondary' | 'No' | ''
  url: string;
  legalBasisUrl: string;
  notes: string;
  lat: number;
  lon: number;
  /**
   * Free-form key/value pairs added by curators via the "More fields" button
   * in the edit drawer. The union of all keys used across the catalogue
   * defines the set of optional fields offered to every body.
   */
  customFields?: Record<string, string>;
}

export const COUNCIL_STATUS_LABELS: Record<CouncilStatus, string> = {
  active_statutory:           'Active (statutory anchoring)',
  active_no_statute:          'Active (no primary statute)',
  inter_ministerial:          'Inter-ministerial / network',
  partial_proxy:              'Partial proxy (not dedicated)',
  legislated_not_operational: 'Legislated, not operational',
  dormant:                    'Statutory but dormant / sparse',
  abolished:                  'Abolished',
  none:                       'No dedicated body',
};

// Heatmap palette matching the May 2026 PDF overview (page 2 colour key).
export const COUNCIL_STATUS_COLORS: Record<CouncilStatus, string> = {
  active_statutory:           '#1B5E20', // dark green
  active_no_statute:          '#43A047', // green
  inter_ministerial:          '#7CB342', // light green
  partial_proxy:              '#C5CA30', // yellow-green
  legislated_not_operational: '#F9A825', // amber/yellow
  dormant:                    '#EF6C00', // orange
  abolished:                  '#C62828', // red
  none:                       '#9E9E9E', // grey
};

export const COUNCIL_LEVEL_LABELS: Record<CouncilLevel, string> = {
  eu:          'EU level',
  national:    'National',
  subnational: 'Sub-national',
};

// ---------------------------------------------------------------------------
// 67 bodies, in PDF summary-table order.
// ---------------------------------------------------------------------------
export const SEED_COUNCILS: ClimateCouncil[] = [
  // 1. EU
  {
    id: 'eu-esabcc',
    countryCode: 'EU', countryName: 'European Union',
    bodyName: 'European Scientific Advisory Board on Climate Change (ESABCC)',
    bodyOriginal: 'European Scientific Advisory Board on Climate Change',
    level: 'eu', region: '',
    status: 'active_statutory',
    established: '2021 (law) / 2022 (operational)',
    statutory: 'Yes',
    url: 'https://climate-advisory-board.europa.eu/',
    legalBasisUrl: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32021R1119',
    notes: 'Benchmark EU-level body. 15 senior scientists, 4-year terms. Hosted at EEA in Copenhagen. Recommended -90 to -95% 2040 target; legally binding 90% net-GHG 2040 target entered into force April 2026.',
    lat: 55.6761, lon: 12.5683,
  },
  // 2. Albania
  {
    id: 'al-gnpnk',
    countryCode: 'AL', countryName: 'Albania',
    bodyName: 'Inter-Ministerial Group on Climate Change Policies (GNPNK)',
    bodyOriginal: 'Grupi Ndërministror i Politikave për Ndryshimet Klimatike',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2014', statutory: 'Secondary',
    url: 'https://www.mjedisi.gov.al/', legalBasisUrl: 'https://www.mjedisi.gov.al/',
    notes: 'Inter-ministerial coordination only; no independent scientific body.',
    lat: 41.3275, lon: 19.8187,
  },
  // 3. Austria APCC
  {
    id: 'at-apcc',
    countryCode: 'AT', countryName: 'Austria',
    bodyName: 'Climate Change Centre Austria / APCC',
    bodyOriginal: 'Climate Change Centre Austria / Austrian Panel on Climate Change',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2011', statutory: 'Secondary',
    url: 'https://ccca.ac.at/en/', legalBasisUrl: 'https://ccca.ac.at/en/home/',
    notes: 'Research network — APCC reports highly influential but NOT a statutory advisory body.',
    lat: 48.2082, lon: 16.3738,
  },
  // 4. Austria NKK
  {
    id: 'at-nkk',
    countryCode: 'AT', countryName: 'Austria',
    bodyName: 'National Climate Protection Committee',
    bodyOriginal: 'Nationales Klimaschutzkomitee (NKK)',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2011', statutory: 'Yes',
    url: 'https://www.bmk.gv.at/',
    legalBasisUrl: 'https://www.ris.bka.gv.at/GeltendeFassung.wxe?Abfrage=Bundesnormen&Gesetzesnummer=20007500',
    notes: 'Inter-ministerial coordination body under Klimaschutzgesetz 2011 § 4. Austria has NO dedicated independent scientific climate council at national level.',
    lat: 48.2082, lon: 16.3738,
  },
  // 5. Belgium FRDO-CFDD
  {
    id: 'be-frdo',
    countryCode: 'BE', countryName: 'Belgium',
    bodyName: 'Federal Council for Sustainable Development (FRDO-CFDD)',
    bodyOriginal: 'Conseil Fédéral du Développement Durable / Federale Raad Duurzame Ontwikkeling',
    level: 'national', region: '',
    status: 'partial_proxy', established: '1997', statutory: '',
    url: 'https://www.frdo-cfdd.be/',
    legalBasisUrl: 'https://www.ejustice.just.fgov.be/cgi_loi/change_lg.pl?language=fr&la=F&cn=1997050532&table_name=loi',
    notes: 'Belgium has NO dedicated federal climate council; advice provided via FRDO-CFDD (stakeholder) + CNC (intergovernmental coordination).',
    lat: 50.8503, lon: 4.3517,
  },
  // 6. Bulgaria NESIK
  {
    id: 'bg-nesik',
    countryCode: 'BG', countryName: 'Bulgaria',
    bodyName: 'National Expert Council on Climate Change',
    bodyOriginal: 'Национален експертен съвет по изменение на климата (НЕСИК)',
    level: 'national', region: '',
    status: 'dormant', established: '2014', statutory: 'Yes',
    url: 'https://www.moew.government.bg/',
    legalBasisUrl: 'https://lex.bg/laws/ldoc/2136220803',
    notes: 'Statutory but DORMANT since ~2016. Climateka Bulgaria advocacy calls for revival.',
    lat: 42.6977, lon: 23.3219,
  },
  // 7. Croatia
  {
    id: 'hr-isccc',
    countryCode: 'HR', countryName: 'Croatia',
    bodyName: 'Inter-Sectoral Commission for Coordination on Climate Change Mitigation and Adaptation Policy',
    bodyOriginal: 'Povjerenstvo za međusektorsku koordinaciju za politiku i mjere za ublažavanje i prilagodbu klimatskim promjenama',
    level: 'national', region: '',
    status: 'dormant', established: '2019 / 2025 (reconstituted)', statutory: 'Yes',
    url: 'https://mingor.gov.hr/',
    legalBasisUrl: 'https://narodne-novine.nn.hr/clanci/sluzbeni/2025_10_130_1897.html',
    notes: 'SAO report showed body met only once between 2018-2024; reconstituted 2025; INTER-MINISTERIAL not scientific/independent.',
    lat: 45.8150, lon: 15.9819,
  },
  // 8. Denmark Klimarådet
  {
    id: 'dk-klimaraadet',
    countryCode: 'DK', countryName: 'Denmark',
    bodyName: 'Danish Council on Climate Change',
    bodyOriginal: 'Klimarådet',
    level: 'national', region: '',
    status: 'active_statutory', established: '2014 / 2020 (strengthened)', statutory: 'Yes',
    url: 'https://klimaraadet.dk/en',
    legalBasisUrl: 'https://www.retsinformation.dk/eli/lta/2020/965',
    notes: "Europe's 2nd strongest body after UK CCC; ~20 FTE; budget cut from ~DKK 25 m/year to ~DKK 9.3 m from 2024. Annual Climate Programme to Folketing must address Council recommendations with Minister's position on each (Climate Act §7, stk. 2).",
    lat: 55.6761, lon: 12.5683,
  },
  // 9. Estonia
  {
    id: 'ee-kliimanoukogu',
    countryCode: 'EE', countryName: 'Estonia',
    bodyName: 'Climate Council',
    bodyOriginal: 'Kliimanõukogu',
    level: 'national', region: '',
    status: 'active_no_statute', established: '2023 (August)', statutory: 'No',
    url: 'https://kliimanoukogu.ee/',
    legalBasisUrl: 'https://kliimaministeerium.ee/en/climate-resilient-economy-act',
    notes: '17 members — scientists, economists, business figures (chair: Kaspar Oja). Climate-Resilient Economy Act drafting initiated 2023; as of May 2026 still not adopted by Riigikogu and unlikely before 2027 elections.',
    lat: 59.4370, lon: 24.7536,
  },
  // 10. Finland
  {
    id: 'fi-ilmastopaneeli',
    countryCode: 'FI', countryName: 'Finland',
    bodyName: 'Finnish Climate Change Panel',
    bodyOriginal: 'Suomen ilmastopaneeli',
    level: 'national', region: '',
    status: 'active_statutory', established: '2015 / reconstituted 2022', statutory: 'Yes',
    url: 'https://www.ilmastopaneeli.fi/en/the-finnish-climate-change-panel/',
    legalBasisUrl: 'https://www.finlex.fi/fi/laki/ajantasa/2022/20220423',
    notes: 'One of the largest scientific climate panels in Europe (15 scientists). Government must consult the Panel on national climate plans.',
    lat: 60.1699, lon: 24.9384,
  },
  // 11. Finland Sámi
  {
    id: 'fi-sami',
    countryCode: 'FI', countryName: 'Finland',
    bodyName: 'Sámi Climate Council',
    bodyOriginal: 'Saamelainen ilmastoneuvosto',
    level: 'national', region: '',
    status: 'active_statutory', established: '2023 (constituted August)', statutory: 'Yes',
    url: 'https://saamelainenilmastoneuvosto.fi/',
    legalBasisUrl: 'https://www.finlex.fi/fi/laki/ajantasa/2022/20220423',
    notes: 'World-first statutory indigenous climate advisory body; 12 members (half scientists, half holders of traditional Sámi knowledge); unique model for indigenous-knowledge integration. Hosted at University of Oulu (CERH).',
    lat: 65.0121, lon: 25.4651,
  },
  // 12. France HCC
  {
    id: 'fr-hcc',
    countryCode: 'FR', countryName: 'France',
    bodyName: 'High Council on Climate (HCC)',
    bodyOriginal: 'Haut Conseil pour le Climat',
    level: 'national', region: '',
    status: 'active_statutory', established: '2018 / 2019 (codified)', statutory: 'Yes',
    url: 'https://www.hautconseilclimat.fr/',
    legalBasisUrl: 'https://www.legifrance.gouv.fr/codes/article_lc/LEGIARTI000039370443',
    notes: "Unique 6-month statutory government response duty (Art. L.132-5 Code de l'environnement) — strongest formal response obligation in Europe after UK. 13 members (president + up to 12 experts), 5-year terms renewable once.",
    lat: 48.8566, lon: 2.3522,
  },
  // 13. Georgia
  {
    id: 'ge-ccc',
    countryCode: 'GE', countryName: 'Georgia',
    bodyName: 'Climate Change Council',
    bodyOriginal: 'კლიმატის ცვლილების საბჭო',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2020', statutory: '',
    url: 'https://mepa.gov.ge/',
    legalBasisUrl: 'https://matsne.gov.ge/en',
    notes: 'Ministerial body; not independent. Decree 54/2020.',
    lat: 41.7151, lon: 44.8271,
  },
  // 14. Germany Council of Experts
  {
    id: 'de-expertenrat',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'Council of Experts on Climate Change',
    bodyOriginal: 'Expertenrat für Klimafragen',
    level: 'national', region: '',
    status: 'active_statutory', established: '2020', statutory: 'Yes',
    url: 'https://expertenrat-klima.de/',
    legalBasisUrl: 'https://www.gesetze-im-internet.de/ksg/BJNR251310019.html',
    notes: 'Narrow mitigation-only mandate by statute. 5 experts, 5-year terms. Hosted by UBA. March 2026 statement on Klimaschutzprogramm 2026.',
    lat: 52.5200, lon: 13.4050,
  },
  // 15. Germany WBGU
  {
    id: 'de-wbgu',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'German Advisory Council on Global Change (WBGU)',
    bodyOriginal: 'Wissenschaftlicher Beirat der Bundesregierung Globale Umweltveränderungen',
    level: 'national', region: '',
    status: 'active_no_statute', established: '1992', statutory: 'Secondary',
    url: 'https://www.wbgu.de/',
    legalBasisUrl: 'https://www.wbgu.de/en/about-us',
    notes: 'Pre-dates climate councils; flagship report model influenced global climate governance.',
    lat: 52.5200, lon: 13.4050,
  },
  // 16. Germany SRU
  {
    id: 'de-sru',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'German Advisory Council on the Environment (SRU)',
    bodyOriginal: 'Sachverständigenrat für Umweltfragen',
    level: 'national', region: '',
    status: 'active_no_statute', established: '1971', statutory: '',
    url: 'https://www.umweltrat.de/',
    legalBasisUrl: 'https://www.umweltrat.de/EN/',
    notes: 'Long-running; biennial environmental reports have strong climate chapters. 7 members (typically university professors) from various disciplines, 4-year renewable terms.',
    lat: 52.5200, lon: 13.4050,
  },
  // 17. Greece EMEKA
  {
    id: 'gr-emeka',
    countryCode: 'GR', countryName: 'Greece',
    bodyName: 'Committee for the Study of Climate Change Impacts (EMEKA) — Bank of Greece',
    bodyOriginal: 'Επιτροπή Μελέτης Επιπτώσεων Κλιματικής Αλλαγής (ΕΜΕΚΑ)',
    level: 'national', region: '',
    status: 'active_no_statute', established: '2009', statutory: '',
    url: 'https://www.bankofgreece.gr/en/the-bank/climate-change-impacts-study-committee',
    legalBasisUrl: 'https://www.bankofgreece.gr/en/the-bank/climate-change-impacts-study-committee',
    notes: 'UNIQUE central-bank-based climate advisory model in Europe; most operationally independent Greek body; strong financial-risk focus.',
    lat: 37.9838, lon: 23.7275,
  },
  // 18. Greece ESP
  {
    id: 'gr-esp',
    countryCode: 'GR', countryName: 'Greece',
    bodyName: 'National Adaptation Council (ESP)',
    bodyOriginal: 'Εθνικό Συμβούλιο Προσαρμογής (ΕΣΠ)',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2016', statutory: 'Yes',
    url: 'https://www.climatecrisis.gov.gr/',
    legalBasisUrl: 'https://www.climateadapt.eea.europa.eu/',
    notes: 'Adaptation-only focus; minister-chaired; not scientifically independent.',
    lat: 37.9838, lon: 23.7275,
  },
  // 19. Greece EEKA
  {
    id: 'gr-eeka',
    countryCode: 'GR', countryName: 'Greece',
    bodyName: 'Scientific Committee of Experts on Climate Change (EEKA)',
    bodyOriginal: 'Επιτροπή Επιστημονικών Εμπειρογνωμόνων για την Κλιματική Αλλαγή (ΕΕΚΑ)',
    level: 'national', region: '',
    status: 'active_statutory', established: '2019 / 2022 (statutory)', statutory: 'Yes',
    url: 'https://ypen.gov.gr/',
    legalBasisUrl: 'https://www.et.gr/api/DownloadFeksApi/?fek_pdf=20220100105',
    notes: 'Ministerial-hosted — independence constrained by placement. 9 scientists + 4 associated members.',
    lat: 37.9838, lon: 23.7275,
  },
  // 20. Hungary NFFT
  {
    id: 'hu-nfft',
    countryCode: 'HU', countryName: 'Hungary',
    bodyName: 'National Council for Sustainable Development',
    bodyOriginal: 'Nemzeti Fenntartható Fejlődési Tanács (NFFT)',
    level: 'national', region: '',
    status: 'active_no_statute', established: '2008', statutory: 'Secondary',
    url: 'https://nfft.hu/',
    legalBasisUrl: 'https://nfft.hu/',
    notes: 'Uniquely parliament-based rather than government-based; broader SD focus.',
    lat: 47.4979, lon: 19.0402,
  },
  // 21. Hungary OKT
  {
    id: 'hu-okt',
    countryCode: 'HU', countryName: 'Hungary',
    bodyName: 'National Environmental Council',
    bodyOriginal: 'Országos Környezetvédelmi Tanács (OKT)',
    level: 'national', region: '',
    status: 'active_no_statute', established: '1995', statutory: '',
    url: 'https://www.okt.hu/',
    legalBasisUrl: 'https://njt.hu/jogszabaly/1995-53-00-00',
    notes: 'Tripartite advisory body on environment including climate.',
    lat: 47.4979, lon: 19.0402,
  },
  // 22. Hungary Ombudsman
  {
    id: 'hu-ombudsman',
    countryCode: 'HU', countryName: 'Hungary',
    bodyName: 'Ombudsman for Future Generations',
    bodyOriginal: 'Jövő Nemzedékek Szószólója',
    level: 'national', region: '',
    status: 'active_statutory', established: '2011 (re-constituted from 2007 role)', statutory: 'Yes',
    url: 'https://www.ajbh.hu/jovo-nemzedekek-szoszoloja',
    legalBasisUrl: 'https://www.ajbh.hu/en/web/ajbh-en/dr.-gyula-bandi',
    notes: "World's first national institution with a constitutional mandate to protect future generations.",
    lat: 47.4979, lon: 19.0402,
  },
  // 23. Ireland CCAC
  {
    id: 'ie-ccac',
    countryCode: 'IE', countryName: 'Ireland',
    bodyName: 'Climate Change Advisory Council (CCAC)',
    bodyOriginal: 'Climate Change Advisory Council',
    level: 'national', region: '',
    status: 'active_statutory', established: '2016 / 2021 (strengthened)', statutory: 'Yes',
    url: 'https://www.climatecouncil.ie/',
    legalBasisUrl: 'https://www.irishstatutebook.ie/eli/2021/act/32/enacted/en/html',
    notes: 'Among very few European councils with power to PROPOSE statutory carbon budgets; hybrid membership model.',
    lat: 53.3498, lon: -6.2603,
  },
  // 24. Lithuania
  {
    id: 'lt-nkkk',
    countryCode: 'LT', countryName: 'Lithuania',
    bodyName: 'National Climate Change Committee',
    bodyOriginal: 'Nacionalinis klimato kaitos komitetas',
    level: 'national', region: '',
    status: 'active_statutory', established: '2001 (committee) / 2023 (reformed under 2022 amendments)', statutory: 'Yes',
    url: 'https://am.lrv.lt/',
    legalBasisUrl: 'https://e-seimas.lrs.lt/portal/legalAct/lt/TAD/TAIS.346905',
    notes: 'Strongest Baltic body; 2023 reform created an all-scientist composition (11 members from research institutions, chair Dr. Arūnas Bukantis, VU) intended to collaborate with ESABCC.',
    lat: 54.6872, lon: 25.2797,
  },
  // 25. Luxembourg OPC
  {
    id: 'lu-opc',
    countryCode: 'LU', countryName: 'Luxembourg',
    bodyName: 'Climate Policy Observatory (OPC)',
    bodyOriginal: 'Observatoire de la Politique Climatique',
    level: 'national', region: '',
    status: 'active_statutory', established: '2021', statutory: 'Yes',
    url: 'https://environnement.public.lu/fr/klima/politique-climatique/observatoire-de-la-politique-climatique.html',
    legalBasisUrl: 'https://data.legilux.public.lu/filestore/eli/etat/leg/loi/2020/12/15/a994/jo/fr/html/eli-etat-leg-loi-2020-12-15-a994-jo-fr-html.html',
    notes: 'Very strong design for small state; 7 members on 5-year terms; founding membership included former IPCC Vice-Chair Jean-Pascal van Ypersele (current roster rotates).',
    lat: 49.6116, lon: 6.1319,
  },
  // 26. Malta NCAC
  {
    id: 'mt-ncac',
    countryCode: 'MT', countryName: 'Malta',
    bodyName: 'National Climate Action Council',
    bodyOriginal: 'National Climate Action Council (NCAC)',
    level: 'national', region: '',
    status: 'active_statutory', established: '2024', statutory: 'Yes',
    url: 'https://climateaction.gov.mt/ncac/',
    legalBasisUrl: 'https://legislation.mt/eli/cap/643/eng',
    notes: 'Climate Action Act 2024, Chapter 643, Article 5. 9 members. Chair: Prof. Simone Borg.',
    lat: 35.8989, lon: 14.5146,
  },
  // 27. Moldova
  {
    id: 'md-ncc',
    countryCode: 'MD', countryName: 'Moldova',
    bodyName: 'National Commission for Climate Change',
    bodyOriginal: 'Comisia Națională pentru Schimbări Climatice',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2014 / 2024 (reorganised)', statutory: 'Secondary',
    url: 'https://www.mediu.gov.md/',
    legalBasisUrl: 'https://www.legis.md/cautare/getResults?doc_id=144210&lang=ro',
    notes: 'Amnesty 2025 report flagged operational dysfunction; accession-driven reform.',
    lat: 47.0105, lon: 28.8638,
  },
  // 28. Netherlands Rli
  {
    id: 'nl-rli',
    countryCode: 'NL', countryName: 'Netherlands',
    bodyName: 'Council for the Environment and Infrastructure (Rli)',
    bodyOriginal: 'Raad voor de leefomgeving en infrastructuur',
    level: 'national', region: '',
    status: 'active_statutory', established: '2012', statutory: 'Yes',
    url: 'https://www.rli.nl/',
    legalBasisUrl: 'https://wetten.overheid.nl/BWBR0031932/2012-11-01',
    notes: 'Broader sustainability scope; not purely scientific; complements WKR.',
    lat: 52.0907, lon: 5.1214,
  },
  // 29. Netherlands WKR
  {
    id: 'nl-wkr',
    countryCode: 'NL', countryName: 'Netherlands',
    bodyName: 'Scientific Climate Council (WKR)',
    bodyOriginal: 'Wetenschappelijke Klimaatraad',
    level: 'national', region: '',
    status: 'active_statutory', established: '2023', statutory: 'Yes',
    url: 'https://www.wkr.nl/',
    legalBasisUrl: 'https://zoek.officielebekendmakingen.nl/stb-2025-350.html',
    notes: 'Made permanent by Verzamelwet KGG (Stb. 2025, 350), in force 1 Jan 2026, anchoring WKR in the Klimaatwet. Tripartite architecture with Rli (stakeholder) and PBL (monitoring).',
    lat: 52.3676, lon: 4.9041,
  },
  // 30. Poland
  {
    id: 'pl-pros',
    countryCode: 'PL', countryName: 'Poland',
    bodyName: 'State Council for Environmental Protection',
    bodyOriginal: 'Państwowa Rada Ochrony Środowiska (PROŚ)',
    level: 'national', region: '',
    status: 'partial_proxy', established: '1980s / reconstituted 2001', statutory: '',
    url: 'https://www.gov.pl/web/klimat/panstwowa-rada-ochrony-srodowiska',
    legalBasisUrl: 'https://isap.sejm.gov.pl/isap.nsf/DocDetails.xsp?id=WDU20010620627',
    notes: 'Poland has NO framework climate law and NO dedicated climate council.',
    lat: 52.2297, lon: 21.0122,
  },
  // 31. Portugal CAC
  {
    id: 'pt-cac',
    countryCode: 'PT', countryName: 'Portugal',
    bodyName: 'Climate Action Council (CAC)',
    bodyOriginal: 'Conselho para a Ação Climática',
    level: 'national', region: '',
    status: 'legislated_not_operational', established: '2021 (legislated); not yet constituted', statutory: 'Yes',
    url: '', legalBasisUrl: 'https://files.dre.pt/1s/2021/12/25200/0000500036.pdf',
    notes: 'Stark case of legal creation ≠ operational reality; 5 years after legislation, still not operational. Blocked by gender-parity legal challenge.',
    lat: 38.7223, lon: -9.1393,
  },
  // 32. Portugal CNADS
  {
    id: 'pt-cnads',
    countryCode: 'PT', countryName: 'Portugal',
    bodyName: 'National Council on Environment and Sustainable Development',
    bodyOriginal: 'Conselho Nacional do Ambiente e do Desenvolvimento Sustentável (CNADS)',
    level: 'national', region: '',
    status: 'partial_proxy', established: '1997', statutory: 'Yes',
    url: 'https://cnads.pt/',
    legalBasisUrl: 'https://dre.pt/application/file/a/406920',
    notes: 'Currently fills vacuum while CAC unconstituted; chaired by Prof. Filipe Duarte Santos.',
    lat: 38.7223, lon: -9.1393,
  },
  // 33. Romania CCDD
  {
    id: 'ro-ccdd',
    countryCode: 'RO', countryName: 'Romania',
    bodyName: 'Consultative Council for Sustainable Development',
    bodyOriginal: 'Consiliul Consultativ pentru Dezvoltare Durabilă (CCDD)',
    level: 'national', region: '',
    status: 'partial_proxy', established: '2018', statutory: '',
    url: 'http://romania-durabila.gov.ro/',
    legalBasisUrl: 'http://romania-durabila.gov.ro/',
    notes: 'Not climate-specific; EEAC member.',
    lat: 44.4268, lon: 26.1025,
  },
  // 34. Romania CISC
  {
    id: 'ro-cisc',
    countryCode: 'RO', countryName: 'Romania',
    bodyName: 'Inter-Ministerial Committee on Climate Change',
    bodyOriginal: 'Comitet Interministerial pentru Schimbări Climatice (CISC)',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2022', statutory: 'Secondary',
    url: 'https://mmediu.ro/',
    legalBasisUrl: 'https://mmediu.ro/',
    notes: 'Type 4 inter-ministerial body, not scientifically independent.',
    lat: 44.4268, lon: 26.1025,
  },
  // 35. Serbia
  {
    id: 'rs-nccc',
    countryCode: 'RS', countryName: 'Serbia',
    bodyName: 'National Council on Climate Change',
    bodyOriginal: 'Nacionalni savet za klimatske promene (NCCC)',
    level: 'national', region: '',
    status: 'dormant', established: '2021', statutory: '',
    url: 'https://www.ekologija.gov.rs/',
    legalBasisUrl: 'https://www.pravno-informacioni-sistem.rs/',
    notes: 'Active but very sparse meetings (4 since 2021). Strongest legal anchor in Western Balkans.',
    lat: 44.7866, lon: 20.4489,
  },
  // 36. Slovenia
  {
    id: 'si-podnebni-svet',
    countryCode: 'SI', countryName: 'Slovenia',
    bodyName: 'Climate Council',
    bodyOriginal: 'Podnebni svet',
    level: 'national', region: '',
    status: 'active_statutory', established: '2023', statutory: 'Yes',
    url: 'https://www.gov.si/',
    legalBasisUrl: 'https://pisrs.si/pregledPredpisa?id=ZAKO7949',
    notes: 'Strongest SE European body; 9 scientists nominated by universities, SAZU, NGOs.',
    lat: 46.0569, lon: 14.5058,
  },
  // 37. Spain CPECCTE
  {
    id: 'es-cpeccte',
    countryCode: 'ES', countryName: 'Spain',
    bodyName: 'Committee of Experts on Climate Change and Energy Transition (CPECCTE)',
    bodyOriginal: 'Comité de Personas Expertas sobre Cambio Climático y Transición Energética',
    level: 'national', region: '',
    status: 'legislated_not_operational', established: '2021 (legislated); RD pending', statutory: 'Yes',
    url: 'https://www.miteco.gob.es/en/cambio-climatico/participacion-publica/rd_comite_ccte.html',
    legalBasisUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2021-8447',
    notes: 'Delayed operationalisation — Law 7/2021 required establishment within 6 months; still pending in 2026.',
    lat: 40.4168, lon: -3.7038,
  },
  // 38. Sweden
  {
    id: 'se-klimatpolitiska',
    countryCode: 'SE', countryName: 'Sweden',
    bodyName: 'Swedish Climate Policy Council',
    bodyOriginal: 'Klimatpolitiska rådet',
    level: 'national', region: '',
    status: 'active_statutory', established: '2018', statutory: 'Yes',
    url: 'https://www.klimatpolitiskaradet.se/',
    legalBasisUrl: 'https://www.riksdagen.se/sv/dokument-och-lagar/dokument/svensk-forfattningssamling/forordning-20171268-med-instruktion-for_sfs-2017-1268/',
    notes: 'Politically vulnerable — 2024 motion proposed abolition; regulatory not statutory basis. 2026 report concluded Sweden will miss both 2030 and 2040 targets.',
    lat: 59.3293, lon: 18.0686,
  },
  // 39. Türkiye Coordination Board
  {
    id: 'tr-idukk',
    countryCode: 'TR', countryName: 'Türkiye',
    bodyName: 'Climate Change and Adaptation Coordination Board',
    bodyOriginal: 'İklim Değişikliği ve Uyum Koordinasyon Kurulu (İDUKK)',
    level: 'national', region: '',
    status: 'inter_ministerial', established: '2013 / 2025 (anchored)', statutory: 'Yes',
    url: 'https://iklim.gov.tr/',
    legalBasisUrl: 'https://www.resmigazete.gov.tr/eskiler/2025/07/20250709-1.htm',
    notes: 'Type 4 coordination; 2025 Climate Law (No. 7552) also established Carbon Market Board and 81 provincial climate boards.',
    lat: 39.9334, lon: 32.8597,
  },
  // 40. Türkiye Deliberative
  {
    id: 'tr-iklim-surasi',
    countryCode: 'TR', countryName: 'Türkiye',
    bodyName: 'Climate Council (Deliberative Assembly)',
    bodyOriginal: 'İklim Şurası',
    level: 'national', region: '',
    status: 'partial_proxy', established: '2022 (Konya, 21-25 Feb)', statutory: '',
    url: 'https://iklim.gov.tr/iklim-surasi-i-22',
    legalBasisUrl: 'https://iklim.gov.tr/',
    notes: 'One-off 2022; not recurrent. ~1,000 stakeholders; 217 recommendations adopted, informed 2053 strategy.',
    lat: 37.8746, lon: 32.4932,
  },
  // 41. Ukraine
  {
    id: 'ua-naukova-rada',
    countryCode: 'UA', countryName: 'Ukraine',
    bodyName: 'Scientific and Expert Council on Climate Change and Ozone Layer Protection',
    bodyOriginal: 'Науково-експертна рада з питань зміни клімату та збереження озонового шару',
    level: 'national', region: '',
    status: 'active_statutory', established: '2026 (constituted; law 2024)', statutory: 'Yes',
    url: 'https://www.kmu.gov.ua/',
    legalBasisUrl: 'https://zakon.rada.gov.ua/laws/show/3991-IX',
    notes: 'First primarily-scientific climate advisory body in any EU candidate country; driven by Ukraine Facility (€50bn) conditionality. 29 scientists.',
    lat: 50.4501, lon: 30.5234,
  },

  // ── Sub-national bodies (42 onwards) ────────────────────────────────────────

  // 42. Vienna
  {
    id: 'at-vienna-klimarat',
    countryCode: 'AT', countryName: 'Austria',
    bodyName: 'Vienna Climate Council',
    bodyOriginal: 'Wiener Klimarat',
    level: 'subnational', region: 'Vienna',
    status: 'active_statutory', established: '2023 / 2025 (statutory anchoring)', statutory: 'Yes',
    url: 'https://www.wien.gv.at/umwelt/klimarat',
    legalBasisUrl: 'https://www.wien.gv.at/umwelt/klimagesetz',
    notes: "Austria's only statutorily anchored climate council (Wiener Klimagesetz, 27 March 2025 — first Austrian Bundesland-level climate law).",
    lat: 48.2082, lon: 16.3738,
  },
  // 43. Brussels
  {
    id: 'be-brussels-cec',
    countryCode: 'BE', countryName: 'Belgium',
    bodyName: 'Brussels Committee of Climate Experts',
    bodyOriginal: "Comité d'Experts Climat bruxellois",
    level: 'subnational', region: 'Brussels',
    status: 'active_statutory', established: '2022 (constituted)', statutory: 'Yes',
    url: 'https://www.brupartners.brussels/fr/comite-dexperts-climat-bruxellois',
    legalBasisUrl: 'https://etaamb.openjustice.be/fr/ordonnance-du-17-juin-2021_n2021042326.html',
    notes: "Arguably Europe's strongest SUB-NATIONAL climate council; unique Climate Day (15 June) response obligation.",
    lat: 50.8503, lon: 4.3517,
  },
  // 44. Flanders
  {
    id: 'be-flanders-minaraad',
    countryCode: 'BE', countryName: 'Belgium',
    bodyName: 'Environment and Nature Council of Flanders',
    bodyOriginal: 'Milieu- en Natuurraad van Vlaanderen (Minaraad)',
    level: 'subnational', region: 'Flanders',
    status: 'partial_proxy', established: '1985', statutory: 'Yes',
    url: 'https://www.minaraad.be/',
    legalBasisUrl: 'https://www.minaraad.be/over-minaraad',
    notes: 'Flanders has no dedicated independent climate advisory council; relies on Minaraad (stakeholder) + SERV.',
    lat: 50.8503, lon: 4.3517,
  },
  // 45. Wallonia
  {
    id: 'be-wallonia-cec',
    countryCode: 'BE', countryName: 'Belgium',
    bodyName: 'Walloon Committee of Climate Experts',
    bodyOriginal: 'Comité des experts sur le climat',
    level: 'subnational', region: 'Wallonia',
    status: 'active_statutory', established: '2014 / 2023 (reinforced)', statutory: 'Yes',
    url: 'https://climat.wallonie.be/home/politiques-climatiques/gouvernance-climat/comite-des-experts.html',
    legalBasisUrl: 'https://wallex.wallonie.be/eli/loi-decret/2023/11/16/2023048516',
    notes: 'Substantially reinforced by 2023 Carbon Neutrality Decree; jury-based selection. Chair: Jean-Pascal van Ypersele.',
    lat: 50.4674, lon: 4.8720,
  },
  // 46. Other Länder
  {
    id: 'de-other-laender',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'Additional Land climate councils',
    bodyOriginal: 'Bayern, Niedersachsen, Berlin, Rheinland-Pfalz climate councils; NRW Adaptation Council',
    level: 'subnational', region: 'Other Länder',
    status: 'active_no_statute', established: '2020-2024', statutory: '',
    url: 'https://www.bmuv.de/',
    legalBasisUrl: 'https://www.bmuv.de/',
    notes: 'Germany has dense Länder-level climate council architecture — most active in EU.',
    lat: 51.1657, lon: 10.4515,
  },
  // 47. Baden-Württemberg
  {
    id: 'de-bw-klima',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'Baden-Württemberg Climate Council',
    bodyOriginal: 'Klima-Sachverständigenrat Baden-Württemberg',
    level: 'subnational', region: 'Baden-Württemberg',
    status: 'active_statutory', established: '2023', statutory: 'Yes',
    url: 'https://um.baden-wuerttemberg.de/de/klima-energie/klimaschutz/klima-sachverstaendigenrat',
    legalBasisUrl: 'https://www.landesrecht-bw.de/',
    notes: 'Strongest German sub-national body; built on KSG model. 5 scientists.',
    lat: 48.7758, lon: 9.1829,
  },
  // 48. Brandenburg
  {
    id: 'de-bb-klima',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'Brandenburg Scientific Climate Council',
    bodyOriginal: 'Wissenschaftlicher Klimabeirat Brandenburg',
    level: 'subnational', region: 'Brandenburg',
    status: 'active_no_statute', established: '2022', statutory: '',
    url: 'https://mluk.brandenburg.de/',
    legalBasisUrl: 'https://mluk.brandenburg.de/',
    notes: 'Notable for ESABCC Chair Edenhofer chairing regional body too.',
    lat: 52.4125, lon: 12.5316,
  },
  // 49. Hamburg
  {
    id: 'de-hh-klima',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'Hamburg Climate Council',
    bodyOriginal: 'Klimabeirat Hamburg',
    level: 'subnational', region: 'Hamburg',
    status: 'active_statutory', established: '2020', statutory: 'Yes',
    url: 'https://www.klimabeirat.hamburg/',
    legalBasisUrl: 'https://www.landesrecht-hamburg.de/bsha/document/jlr-KlSchGHArahmen',
    notes: 'Strengthened by Hamburger Zukunftsentscheid (Volksentscheid) of 12 October 2025; climate-neutrality target moved from 2045 to 2040.',
    lat: 53.5511, lon: 9.9937,
  },
  // 50. Hesse
  {
    id: 'de-he-klima',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'Hesse Scientific Climate Council',
    bodyOriginal: 'Wissenschaftlicher Klimabeirat Hessen',
    level: 'subnational', region: 'Hessen',
    status: 'active_statutory', established: '2022', statutory: 'Yes',
    url: 'https://umwelt.hessen.de/',
    legalBasisUrl: 'https://www.rv.hessenrecht.hessen.de/',
    notes: 'Standard German KSG model.',
    lat: 50.6521, lon: 9.1624,
  },
  // 51. Thuringia
  {
    id: 'de-th-klima',
    countryCode: 'DE', countryName: 'Germany',
    bodyName: 'Thuringia Climate Council',
    bodyOriginal: 'Klimarat Thüringen',
    level: 'subnational', region: 'Thüringen',
    status: 'active_statutory', established: '2018', statutory: 'Yes',
    url: 'https://umwelt.thueringen.de/',
    legalBasisUrl: 'https://landesrecht.thueringen.de/',
    notes: 'Early Land-level climate council.',
    lat: 50.8612, lon: 11.0529,
  },
  // 52. Lombardy
  {
    id: 'it-lombardy',
    countryCode: 'IT', countryName: 'Italy',
    bodyName: 'Lombardy Regional Climate Committee',
    bodyOriginal: 'Comitato regionale per il clima',
    level: 'subnational', region: 'Lombardy',
    status: 'legislated_not_operational', established: '2025', statutory: 'Yes',
    url: 'https://www.regione.lombardia.it/',
    legalBasisUrl: 'https://normelombardia.consiglio.regione.lombardia.it/normelombardia/accessibile/main.aspx?view=showdoc&iddoc=lr002025071800',
    notes: "Italy's first regional climate law (LR n. 11 of 18 July 2025) — precedent-setting.",
    lat: 45.4642, lon: 9.1900,
  },
  // 53. Emilia-Romagna
  {
    id: 'it-emilia-forum',
    countryCode: 'IT', countryName: 'Italy',
    bodyName: 'Permanent Forum on Climate Change',
    bodyOriginal: 'Forum Permanente per il Cambiamento Climatico',
    level: 'subnational', region: 'Emilia-Romagna',
    status: 'active_no_statute', established: '2019', statutory: '',
    url: 'https://ambiente.regione.emilia-romagna.it/',
    legalBasisUrl: 'https://ambiente.regione.emilia-romagna.it/',
    notes: 'Earliest Italian regional climate forum; platform rather than independent scientific council.',
    lat: 44.4949, lon: 11.3426,
  },
  // 54. Balearic
  {
    id: 'es-balearic',
    countryCode: 'ES', countryName: 'Spain',
    bodyName: 'Balearic Committee of Experts on Energy Transition and Climate Change',
    bodyOriginal: "Comitè d'Experts per a la Transició Energètica i el Canvi Climàtic",
    level: 'subnational', region: 'Balearic Islands',
    status: 'active_statutory', established: '2019', statutory: 'Yes',
    url: 'https://www.caib.es/sites/canviclimatic/',
    legalBasisUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2019-4220',
    notes: "One of Spain's earliest regional committees.",
    lat: 39.5696, lon: 2.6502,
  },
  // 55. Basque
  {
    id: 'es-basque',
    countryCode: 'ES', countryName: 'Spain',
    bodyName: 'Basque Climate Council',
    bodyOriginal: 'Consejo Vasco de Clima / Euskadiko Klima Kontseilua',
    level: 'subnational', region: 'Basque Country',
    status: 'active_statutory', established: '2024', statutory: 'Yes',
    url: 'https://www.ihobe.eus/',
    legalBasisUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2024-4604',
    notes: 'Under 2024 Basque climate law; BC3 provides scientific input ecosystem.',
    lat: 43.0210, lon: -2.6526,
  },
  // 56. Canary Islands
  {
    id: 'es-canary',
    countryCode: 'ES', countryName: 'Spain',
    bodyName: 'Canary Islands Climate Change Council',
    bodyOriginal: 'Consejo Canario de Cambio Climático',
    level: 'subnational', region: 'Canary Islands',
    status: 'active_statutory', established: '2022', statutory: 'Yes',
    url: 'https://www.gobiernodecanarias.org/transicionecologica/',
    legalBasisUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-1203',
    notes: 'Recent creation under 2022 regional climate law.',
    lat: 28.2916, lon: -16.6291,
  },
  // 57. Catalonia
  {
    id: 'es-catalonia',
    countryCode: 'ES', countryName: 'Spain',
    bodyName: 'Catalan Committee of Experts on Climate Change',
    bodyOriginal: "Comitè d'Experts sobre el Canvi Climàtic de Catalunya (CECCC)",
    level: 'subnational', region: 'Catalonia',
    status: 'active_statutory', established: '2017', statutory: 'Yes',
    url: 'https://canviclimatic.gencat.cat/en/ambits/el-comite-dexperts-sobre-canvi-climatic/',
    legalBasisUrl: 'https://www.boe.es/buscar/doc.php?id=BOE-A-2017-10338',
    notes: "Strongest appointment design in Spain: 3/5 parliamentary majority rule plus 'justify-or-adopt' duty — closer to UK CCC model than national Spanish body.",
    lat: 41.3851, lon: 2.1734,
  },
  // 58. Türkiye provincial
  {
    id: 'tr-provincial',
    countryCode: 'TR', countryName: 'Türkiye',
    bodyName: 'Provincial Climate Change Coordination Boards (81)',
    bodyOriginal: 'İl İklim Değişikliği Koordinasyon Kurulları',
    level: 'subnational', region: 'Provinces (81)',
    status: 'active_statutory', established: '2025', statutory: 'Yes',
    url: 'https://iklim.gov.tr/',
    legalBasisUrl: 'https://www.resmigazete.gov.tr/eskiler/2025/07/20250709-1.htm',
    notes: 'One Provincial Climate Change Coordination Board per province (81 in total), chaired by the Vali (Governor). All Local Climate Action Plans must be prepared by 31 December 2027.',
    lat: 39.9334, lon: 32.8597,
  },

  // ── Gaps: NONE / NO dedicated body / abolished (59-67) ─────────────────────

  // 59. Bosnia
  {
    id: 'ba-none',
    countryCode: 'BA', countryName: 'Bosnia and Herzegovina',
    bodyName: 'NONE — inter-entity working groups only',
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: 'Secondary',
    url: '',
    legalBasisUrl: 'https://www.mvteo.gov.ba/',
    notes: 'Entity structure (FBiH + RS + Brčko) fragments climate governance; no state-level climate law.',
    lat: 43.8563, lon: 18.4131,
  },
  // 60. Cyprus
  {
    id: 'cy-none',
    countryCode: 'CY', countryName: 'Cyprus',
    bodyName: 'NONE — Cyprus has NO framework climate law and NO dedicated climate advisory body',
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: '',
    url: '',
    legalBasisUrl: 'https://www.europarl.europa.eu/RegData/etudes/BRIE/2024/',
    notes: 'Weakest institutional case in EU27. Terra Cypria NGO and others advocate for framework climate law with advisory-body provisions.',
    lat: 35.1856, lon: 33.3823,
  },
  // 61. Czechia
  {
    id: 'cz-none',
    countryCode: 'CZ', countryName: 'Czechia',
    bodyName: 'NONE — draft Klimatická rada not adopted',
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: 'No',
    url: 'https://klimatickyzakon.cz/',
    legalBasisUrl: 'https://klimatickyzakon.cz/',
    notes: 'Pirate Party draft climate law of Nov 2023 (proposing independent Klimatická rada) was not adopted before Oct 2025 elections.',
    lat: 50.0755, lon: 14.4378,
  },
  // 62. Italy NONE
  {
    id: 'it-none',
    countryCode: 'IT', countryName: 'Italy',
    bodyName: 'NONE — Italy has NO framework climate law and NO national climate advisory body',
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: 'Secondary',
    url: '',
    legalBasisUrl: 'https://www.europarl.europa.eu/RegData/etudes/BRIE/2024/767178/EPRS_BRI(2024)767178_EN.pdf',
    notes: 'Largest EU MS without a national climate advisory council. Regional innovation emerging (Lombardy L.R. 11/2025).',
    lat: 41.9028, lon: 12.4964,
  },
  // 63. Latvia
  {
    id: 'lv-none',
    countryCode: 'LV', countryName: 'Latvia',
    bodyName: 'NONE — 2025 climate law did NOT create one',
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: '',
    url: '',
    legalBasisUrl: 'https://www.kem.gov.lv/lv/jaunums/saeima-atbalsta-likumu-ilgtspejigai-ekonomikai-un-klimata-parmainu-risinasanai',
    notes: 'Cabinet of Ministers approved draft Climate Law on 1 October 2024; first-reading vote in Saeima failed January 2025; draft remains pending as of May 2026.',
    lat: 56.9496, lon: 24.1052,
  },
  // 64. Montenegro
  {
    id: 'me-none',
    countryCode: 'ME', countryName: 'Montenegro',
    bodyName: "NONE — Montenegro's Law 73/2019 does NOT establish a climate council",
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: '',
    url: '',
    legalBasisUrl: 'https://www.gov.me/',
    notes: 'Often-cited "Savjet za klimatske promjene" is not legally established. NSSD covers SD broadly.',
    lat: 42.4304, lon: 19.2594,
  },
  // 65. North Macedonia
  {
    id: 'mk-none',
    countryCode: 'MK', countryName: 'North Macedonia',
    bodyName: 'NONE — inter-ministerial working group only',
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: 'Yes',
    url: '',
    legalBasisUrl: 'https://www.moepp.gov.mk/',
    notes: 'Inter-ministerial WG on climate exists; advisory body may follow climate law adoption.',
    lat: 41.9981, lon: 21.4254,
  },
  // 66. Slovakia
  {
    id: 'sk-none',
    countryCode: 'SK', countryName: 'Slovakia',
    bodyName: 'NONE — draft Rada pre klimatickú zodpovednosť not adopted',
    bodyOriginal: '',
    level: 'national', region: '',
    status: 'none', established: '', statutory: 'Yes',
    url: '',
    legalBasisUrl: 'https://www.nku.gov.sk/web/nku-en/-/as-the-earth-warms-slovakia-delays-climate-action',
    notes: 'Environment Ministry draft Climate Act of January 2023 (proposing Rada pre klimatickú zodpovednosť) halted after Fico government returned in October 2023.',
    lat: 48.1486, lon: 17.1077,
  },
  // 67. Valencia (abolished)
  {
    id: 'es-valencia-abolished',
    countryCode: 'ES', countryName: 'Spain',
    bodyName: 'Valencia Committee of Experts (ABOLISHED)',
    bodyOriginal: "Comitè d'Experts sobre Canvi Climàtic de la Comunitat Valenciana",
    level: 'subnational', region: 'Valencia',
    status: 'abolished', established: '2022 / 2025 (abolished by Ley 5/2025)', statutory: 'Yes',
    url: '',
    legalBasisUrl: 'https://www.boe.es/buscar/act.php?id=BOE-A-2023-4378',
    notes: 'ABOLISHED 30 May 2025 by Articles 265-266 of Ley 5/2025 (PP-led Generalitat). Cautionary case of political reversal.',
    lat: 39.4699, lon: -0.3763,
  },
];
