/**
 * Summer 2026 Economic Damage Ledger — sourced records (beta module M · 54).
 *
 * PROVENANCE (read before citing anything)
 * ----------------------------------------
 * AI-compiled 2026-08-11 by seven parallel research agents (heatwaves,
 * wildfires, rivers/drought, agriculture, energy system, preparedness
 * evidence, climatological build-up), each instructed to fetch primary
 * sources and to report "not found" rather than fill gaps by analogy.
 * Pending Secretariat verification throughout.
 *
 * Every record carries a compile-time confidence flag (see model.ts):
 *   verified  — primary page/PDF/API fetched, figure read from retrieved text
 *               (EFFIS statistics API, Pegelonline REST API, C3S bulletins,
 *               EEA indicator, ECA SR 15/2024 PDF, PESETA IV PDF, Cellar
 *               full text of COM(2024) 91, Munich Re half-year release…);
 *   secondary — reputable secondary report fetched (agency syndications of
 *               Reuters/Bloomberg where the original is paywalled);
 *   snippet   — search-result snippet only; must be re-verified before any
 *               use outside the hub.
 *
 * Deliberate omissions (support could not be found — dropped, not guessed):
 * an EU-wide 2026 fire-season fatality count; a consolidated 2026 drought
 * damage total; a 2026 agricultural-reserve mobilisation for the summer;
 * official euro figures for the French nuclear curtailments; an
 * "Eastern Europe >$30bn" claim with no traceable primary source; the
 * winter Alpine snowpack outside Italy; a peer-reviewed 2026 mortality
 * total (interim tallies are flagged as provisional).
 *
 * The season is still running (compile date 2026-08-11, August episode in
 * progress); 2026 figures are partial by construction.
 */

import type {
  ChainLink,
  DamageEvent,
  PreparednessRow,
  SourceRef,
  SummerBenchmark,
} from './model';

export const COMPILED = '2026-08-11';

/* ------------------------------------------------------- headline anchors */

/** EU-wide burnt area, cumulative through week 31 (mapped 2026-08-05). */
export const EFFIS_2026_HA = 505042;
export const EFFIS_2026_FIRES = 1553;
/** 2006-onwards average at the same week, same EFFIS weekly product. */
export const EFFIS_AVG_HA = 197347;
export const EFFIS_2025_SAME_WEEK_HA = 379392;
export const EFFIS_2022_SAME_WEEK_HA = 611945;
export const EFFIS_SOURCE: SourceRef = {
  label: 'Copernicus EFFIS statistics API, weekly burnt area, aoi=EU, week 31',
  url: 'https://api2.effis.emergency.copernicus.eu/statistics/v2/effis/weeklyaoi?aoi=EU&year=2026',
  date: '2026-08-11',
  locator: 'banfcumulative / area_ha_avg fields; live pull, same endpoints as scripts/refresh-wildfire-effis-data.mjs',
};

/** Kaub gauge reading (Pegelstand, cm) on the compile date, and the record context. */
export const KAUB_CM_TODAY = 15;
export const KAUB_SOURCE: SourceRef = {
  label: 'WSV Pegelonline REST API, station KAUB, water level',
  url: 'https://www.pegelonline.wsv.de/webservices/rest-api/v2/stations/KAUB/W/measurements.json?start=P10D',
  date: '2026-08-11',
  locator: '10:45 CEST reading 15 cm; 10-day series 28 cm (1 Aug) → 14 cm (11 Aug); state flag "low"',
};

/** Europe warming above pre-industrial, latest five-year averages. */
export const EU_WARMING_C = 2.5;
export const EU_WARMING_SOURCE: SourceRef = {
  label: 'C3S European State of the Climate 2025 — why is Europe warming so quickly',
  url: 'https://climate.copernicus.eu/esotc/2025/why-europe-warming-so-quickly',
  date: '2026-04-29',
  locator: '"Europe has warmed by around 2.5°C compared to pre-industrial levels"; ~0.56°C/decade since the mid-1990s, more than double the global ~0.27°C/decade',
};

/* -------------------------------------------- the build-up chain (§ why) */

export const BUILDUP: ChainLink[] = [
  {
    id: 'winter',
    stage: 'Winter 2025/26',
    finding:
      'Not a warm winter — the European winter averaged just +0.09 °C against 1991–2020, one of the two coldest in 13 years — but precipitation split: exceptionally wet in the west and south (February atmospheric rivers, floods in France, Spain and Portugal), drier than average across central Europe, Fennoscandia and the Baltics. The region that became the summer drought core was under-supplied before spring began.',
    status: 'verified',
    sources: [
      {
        label: 'C3S winter/February 2026 climate bulletin press release',
        url: 'https://climate.copernicus.eu/copernicus-exceptionally-wet-conditions-western-europe-during-fifth-warmest-february-globally-0',
        date: '2026-03-10',
        locator: 'winter section: +0.09 °C anomaly; precipitation split west/centre',
      },
    ],
  },
  {
    id: 'snow',
    stage: 'Snowpack, Dec–May',
    finding:
      'The honest snow story is not "record-low winter snowpack". Italian snow water equivalent swung from −52 % in mid-December to roughly −11 % nationally by mid-April (Po basin −1 %, near average) — and was then stripped by early heat: −48 % by mid-May, with the Adige basin beyond −56 %. CIMA called it "a real acceleration in the transfer of water from snow toward soils and rivers… especially in view of the summer season". The reservoir emptied months early.',
    status: 'verified',
    sources: [
      {
        label: 'CIMA Research Foundation, "From snow to rivers: why Italy\'s −48% SWE deficit matters"',
        url: 'https://www.cimafoundation.org/en/news/from-snow-to-rivers-why-italys-48-swe-deficit-matters-for-summer-water-resources/',
        date: '2026-05-14',
        locator: '−48 % national SWE; Adige >−56 %; quoted assessment',
      },
      {
        label: 'CIMA Italy snow updates (December −52 % → April ≈−11 % timeline)',
        url: 'https://www.cimafoundation.org/en/italy-snow-updates/',
        date: '2025-12 – 2026-04',
        locator: 'S3M model national SWE series — timeline figures seen in search digests of the update series (snippet)',
      },
    ],
  },
  {
    id: 'spring',
    stage: 'Spring 2026',
    finding:
      'Spring was drier than average over most of Europe — most widespread in March, most intense in April. Austria recorded its driest spring since national records began in 1857; Czechia its driest since 1961. By May, persistent high pressure "inhibited precipitation while unusually high temperatures… sustained and exacerbated the low levels of surface soil moisture", and river flow was already below average across central and eastern Europe — the Rhine and Danube named months before the summer chokepoints made news.',
    status: 'verified',
    sources: [
      {
        label: 'C3S hydrological bulletin, May 2026',
        url: 'https://climate.copernicus.eu/precipitation-relative-humidity-soil-moisture-and-river-flow-may-2026',
        date: '2026-06',
        locator: 'precipitation, soil-moisture and river-flow sections; Austria/Czechia records; Rhine and Danube named',
      },
    ],
  },
  {
    id: 'sea',
    stage: 'The seas, June–July',
    finding:
      'The Mediterranean logged its warmest June on record (24.3 °C basin average), with marine heatwaves across 98 % of the basin and local anomalies up to +8 °C off southern France, Corsica and Sardinia. In July the extra-polar ocean set a new July record (20.96 °C), with record sea-surface temperatures on Europe\'s Atlantic coast and in the western Mediterranean. No official source states the sea→land amplification mechanism for 2026 explicitly, so this link is shown as context, not asserted causation.',
    status: 'verified',
    sources: [
      {
        label: 'Copernicus Marine Service, "Persistent ocean warmth and expanding marine heatwaves mark first half of 2026"',
        url: 'https://marine.copernicus.eu/press/press-releases/persistent-ocean-warmth-and-expanding-marine-heatwaves-mark-first-half-2026',
        date: '2026-07-01',
        locator: 'Mediterranean June record 24.3 °C; 98 % of basin under marine heatwave',
      },
      {
        label: 'C3S July 2026 bulletin press release',
        url: 'https://climate.copernicus.eu/copernicus-highest-july-global-ocean-surface-temperatures-exceptionally-hot-dry-conditions-fuel',
        date: '2026-08-10',
        locator: 'extra-polar SST July record 20.96 °C; record SSTs around Europe',
      },
      {
        label: 'ESA Mediterranean SST anomaly image (via phys.org mirror; ESA original 403 from this sandbox)',
        url: 'https://phys.org/news/2026-07-image-mediterranean-sea-june-surface.html',
        date: '2026-07',
        locator: 'anomalies up to +8 °C on 29 June',
      },
    ],
  },
  {
    id: 'blocking',
    stage: 'The weather pattern',
    finding:
      'The heat arrived on repeated blocking highs — the late-July/August episode a textbook omega block parking a heat dome over western and central Europe. The pattern itself is not new; the temperatures inside it are. The peer-reviewed anchor: Rousi et al. (2022) find western European heatwave trends "three-to-four times faster compared to the rest of the northern midlatitudes over the past 42 years", with the rising persistence of double-jet states explaining "almost all of the accelerated heatwave trend in western Europe".',
    status: 'verified',
    sources: [
      {
        label: 'Rousi et al., "Accelerated western European heatwave trends linked to more-persistent double jets over Eurasia", Nature Communications 13, 3851 (2022)',
        url: 'https://www.nature.com/articles/s41467-022-31432-y',
        date: '2022-07-04',
        locator: 'abstract, verbatim trend and double-jet attribution claims',
      },
      {
        label: 'Severe Weather Europe, omega-block / heat-dome forecast discussion (specialist outlet — descriptive, not authoritative)',
        url: 'https://www.severe-weather.eu/global-weather/extreme-heatwave-excessive-heat-dome-mediterranean-forecast-europe-july-august-2026-mk/',
        date: '2026-07-28',
        locator: 'late-July/August 2026 omega block description',
      },
    ],
  },
  {
    id: 'attribution',
    stage: 'The attribution',
    finding:
      'World Weather Attribution on the June episode: "Over the region studied this heatwave is the most severe ever recorded" — daytime temperatures about 3.5 °C hotter than the same weather pattern would have delivered in 1976, about 2 °C hotter than in 2003, and events of this kind "tens to hundreds of times more likely since only 2003 and virtually impossible just 50 years ago". A second WWA study on the April–June drought: western-Europe soil drought about 5 times more likely, eastern-domain deficits about 11 times more probable, with human-induced climate change turning moderate-to-severe droughts into extreme-to-exceptional ones.',
    status: 'verified',
    sources: [
      {
        label: 'World Weather Attribution, June 2026 European heatwave study',
        url: 'https://www.worldweatherattribution.org/fossil-fuel-emissions-have-rapidly-worsened-european-heatwaves-in-just-a-few-decades/',
        date: '2026-06-26',
        locator: 'headline findings; 3.5 °C vs 1976, 2 °C vs 2003; intermittently unreachable (503) — quotes taken from a successful fetch',
      },
      {
        label: 'World Weather Attribution, 2026 European drought study',
        url: 'https://www.worldweatherattribution.org/increasingly-hot-europe-faces-more-severe-droughts-and-growing-challenges-for-water-and-land-management/',
        date: '2026-07-23',
        locator: '~5× west / ~11× east likelihood multipliers',
      },
    ],
  },
  {
    id: 'gaps',
    stage: 'What could not be sourced',
    finding:
      'Three links in the causal story could not be verified and are left open rather than filled by analogy with 2018 or 2022: the winter Alpine snowpack outside Italy (Swiss, Austrian and French services were not reached), the pan-European groundwater baseline entering summer, and an official statement of the sea-to-land heat amplification mechanism for 2026 specifically.',
    status: 'open',
    sources: [],
  },
];

/* ------------------------------------- the escalation series (§ over the years) */

/**
 * NOT one comparable series — three methodologies, flagged per entry via
 * heatDeaths.basis: full-Europe epidemiological estimates (2003, 2022–24),
 * a cities-only study covering ~30 % of Europe's population (2025, an
 * undercount relative to the series), and a provisional in-season tally of
 * heterogeneous national figures (2026). The chart must keep them visually
 * distinct.
 */
export const ESCALATION: SummerBenchmark[] = [
  {
    year: 2003,
    label: 'The wake-up call',
    heatDeaths: {
      value: 70000, lo: 70000, hi: 70000, basis: 'europe',
      note: '">70,000" excess deaths across 16 countries; the study gives no formal CI at the headline',
    },
    note: 'The August 2003 heatwave killed more than 70,000 people and triggered the first generation of national heat-health action plans (France\'s among them).',
    confidence: 'snippet',
    sources: [
      {
        label: 'Robine et al., "Death toll exceeded 70,000 in Europe during the summer of 2003", C R Biologies 331(2), 171–178 (2008)',
        url: 'https://www.sciencedirect.com/science/article/pii/S1631069107003770',
        date: '2008',
        locator: 'title claim; citation confirmed across publisher and repository records, paper not fetched',
      },
    ],
  },
  {
    year: 2019,
    label: 'National records fall',
    heatDeaths: null,
    note: 'July 2019 broke all-time national maxima in Belgium, Germany, the Netherlands and the UK, with records in France and Luxembourg; Paris hit 42.6 °C and the Netherlands passed 40 °C for the first time.',
    confidence: 'snippet',
    sources: [
      {
        label: 'ECMWF Newsletter 161, "2019 western European heatwaves"',
        url: 'https://www.ecmwf.int/en/newsletter/161/news/2019-western-european-heatwaves',
        date: '2019',
        locator: 'records list',
      },
      {
        label: 'World Weather Attribution, July 2019 heatwave study',
        url: 'https://www.worldweatherattribution.org/human-contribution-to-the-record-breaking-july-2019-heat-wave-in-western-europe/',
        date: '2019-08',
        locator: 'study page',
      },
    ],
  },
  {
    year: 2022,
    label: 'The deadliest recent summer',
    heatDeaths: {
      value: 61672, lo: 37643, hi: 86807, basis: 'europe',
      note: '61,672 (95 % CI 37,643–86,807), 30 May–4 September; Italy 18,010, Spain 11,324, Germany 8,173',
    },
    note: 'Europe\'s hottest summer on record at the time (+1.34 °C vs 1991–2020). The Commission itself put the toll at "between 60,000 and 70,000" in COM(2024) 91.',
    confidence: 'snippet',
    sources: [
      {
        label: 'Ballester et al., "Heat-related mortality in Europe during the summer of 2022", Nature Medicine 29, 1857–1866 (2023)',
        url: 'https://www.nature.com/articles/s41591-023-02419-z',
        date: '2023-07',
        locator: 'headline estimate; figures confirmed via institutional mirrors, nature.com behind login from this sandbox',
      },
      {
        label: 'COM(2024) 91 final, "Managing climate risks", full text via Cellar',
        url: 'https://publications.europa.eu/resource/celex/52024DC0091',
        date: '2024-03-12',
        locator: 'Introduction: "between 60,000 and 70,000 Europeans died from record breaking heat" — fetched and verified verbatim',
      },
    ],
  },
  {
    year: 2023,
    label: 'The new normal holds',
    heatDeaths: {
      value: 47690, lo: 47690, hi: 47690, basis: 'europe',
      note: '47,690 across 35 countries — second-highest burden of 2015–2023; the study estimates the toll would have been ~80 % higher without present-century adaptation',
    },
    note: 'Second-worst mortality year of the 2015–2023 study period — and the study\'s own adaptation finding cuts both ways: adaptation works, and it is being outrun.',
    confidence: 'snippet',
    sources: [
      {
        label: 'ISGlobal-led study, Nature Medicine (2024)',
        url: 'https://www.nature.com/articles/s41591-024-03186-1',
        date: '2024-08',
        locator: 'headline estimate; confirmed via ISGlobal press page',
      },
    ],
  },
  {
    year: 2024,
    label: 'Hottest European summer on record',
    heatDeaths: {
      value: 62775, lo: 62775, hi: 62775, basis: 'europe',
      note: '62,775 heat-related deaths, 654 regions in 32 countries',
    },
    note: 'Summer 2024 set the European seasonal record (+1.54 °C vs 1991–2020, beating 2022\'s +1.34 °C) and the mortality series kept pace.',
    confidence: 'snippet',
    sources: [
      {
        label: 'Nature Medicine (2025) 2024 heat-mortality study',
        url: 'https://www.nature.com/articles/s41591-025-03954-7',
        date: '2025',
        locator: 'headline estimate; confirmed via EEA Climate-ADAPT summary',
      },
      {
        label: 'C3S, "Summer 2024 — hottest on record globally and for Europe"',
        url: 'https://climate.copernicus.eu/copernicus-summer-2024-hottest-record-globally-and-europe',
        date: '2024-09',
        locator: '+1.54 °C seasonal anomaly',
      },
    ],
  },
  {
    year: 2025,
    label: 'Attribution goes mainstream',
    heatDeaths: {
      value: 24400, lo: 24400, hi: 24400, basis: 'cities',
      note: '~24,400 deaths across 854 cities covering only ~30 % of Europe\'s population — an undercount relative to the full-Europe series; ~16,500 (68 %) attributed to climate change',
    },
    note: 'The 854-city rapid-attribution study made "how many of these deaths are climate change" a same-season question. The ESABCC\'s February 2026 adaptation report cites "an estimated 24,000" summer-2025 heat deaths. EU wildfires also set their season record: 1,079,538 ha (JRC).',
    confidence: 'snippet',
    sources: [
      {
        label: 'Imperial/LSHTM 854-city study of summer 2025 heat mortality',
        url: 'https://www.lshtm.ac.uk/newsevents/news/2025/climate-change-driven-summer-heat-caused-16500-additional-deaths-across-europe',
        date: '2025-09-17',
        locator: 'headline estimates; institutional press pages',
      },
      {
        label: 'JRC, "2025 was the EU\'s most destructive wildfire season on record"',
        url: 'https://joint-research-centre.ec.europa.eu/jrc-news-and-updates/2025-was-eus-most-destructive-wildfire-season-record-2026-03-31_en',
        date: '2026-03-31',
        locator: '1,079,538 ha, 7,783 fires, ~double the 2006–2024 average — fetched',
      },
      {
        label: 'ESABCC, "Strengthening resilience to climate change" (adaptation report)',
        url: 'https://climate-advisory-board.europa.eu/reports-and-publications/strengthening-resilience-to-climate-change-recommendations-for-an-effective-eu-adaptation-policy-framework',
        date: '2026-02-17',
        locator: '"an estimated 24,000 in summer 2025" — fetched',
      },
    ],
  },
  {
    year: 2026,
    label: 'This summer — season still running',
    heatDeaths: {
      value: 25000, lo: 25000, hi: 30891, basis: 'running',
      note: 'Provisional: Reuters (10 Aug) reports ">25,000 heat deaths across Europe"; a running aggregation of heterogeneous national figures reaches ~30,891 (Germany ~11,900 per RKI, France 5,764 excess per Santé publique France…). No peer-reviewed total exists yet; expect one in autumn.',
    },
    note: 'Western Europe\'s hottest June on record (+3.06 °C) and hottest June–July combined (+2.79 °C); WWA calls the June event the most severe recorded in the region studied. The rest of this page is this year\'s ledger.',
    confidence: 'secondary',
    sources: [
      {
        label: 'Reuters analysis of the 2026 heat economy (via Insurance Journal syndication)',
        url: 'https://www.insurancejournal.com/news/international/2026/08/10/880818.htm',
        date: '2026-08-10',
        locator: '">25,000 heat deaths across Europe and >10,000 in Germany" — syndication fetched',
      },
      {
        label: 'C3S June and July 2026 bulletin press releases',
        url: 'https://climate.copernicus.eu/copernicus-record-heatwave-brings-hottest-june-western-europe-during-second-warmest-june-globally',
        date: '2026-07-09 / 2026-08-10',
        locator: 'June record 20.74 °C (+3.06 °C); June–July combined 21.62 °C (+2.79 °C) — both fetched',
      },
      {
        label: 'Clean Energy Wire on RKI German heat-death tally',
        url: 'https://www.cleanenergywire.org/news/heat-related-deaths-germany-near-12000-already-middle-summer-2026',
        date: '2026-08-07',
        locator: '~11,900 heat-related deaths Jan–Jul 2026, ~9,600 in the week 22–28 June — fetched',
      },
    ],
  },
];

/* --------------------------------------------------- the 2026 event ledger */

export const EVENTS: DamageEvent[] = [
  /* ------------------------------------------------------------- heat */
  {
    id: 'heat-june',
    strand: 'heat',
    title: 'The June heatwave — the season\'s most severe episode',
    window: '17 June – 2 July 2026',
    region: 'Western and central Europe',
    what:
      'Western Europe\'s hottest June on record (+3.06 °C vs 1991–2020). WMO logged national or June records across the continent — 252 German stations set all-time highs, Spain 42.7 °C at Bilbao, France a 43.8 °C peak and its first national daily-mean of 30 °C. EuroMOMO-based reporting puts excess deaths above 10,000 for the episode (more than 9,000 aged 65+); Santé publique France recorded ≥5,764 excess deaths — its highest heatwave excess since 2003; a Zenodo rapid preprint estimates 20,390 heat deaths for the single week 22–28 June. Allianz estimates the two-week episode alone cut EU GDP by 0.3 percentage points. France closed over 1,350 schools on the peak Monday; Belgium\'s SNCB cancelled 100 trains a day; ~3,400 flights were delayed in the 25–26 June wave.',
    physical: [
      { label: 'Excess deaths (episode, EuroMOMO via Euronews)', value: '>10,000' },
      { label: 'France excess deaths, 17 Jun–2 Jul (SpF)', value: '≥5,764' },
      { label: 'GDP effect of the episode (Allianz)', value: '−0.3 pp EU' },
      { label: 'German stations at all-time highs (WMO)', value: '252' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      {
        label: 'C3S June 2026 bulletin press release',
        url: 'https://climate.copernicus.eu/copernicus-record-heatwave-brings-hottest-june-western-europe-during-second-warmest-june-globally',
        date: '2026-07-09',
        locator: 'record June 20.74 °C, +3.06 °C — fetched',
      },
      {
        label: 'WMO, "Records fall as extreme heat grips Europe"',
        url: 'https://wmo.int/media/news/records-fall-extreme-heat-grips-europe',
        date: '2026-07-09',
        locator: 'national records list; 252 German stations — fetched',
      },
      {
        label: 'Euronews on EuroMOMO excess-mortality data',
        url: 'https://www.euronews.com/my-europe/2026/07/13/europe-records-10000-excess-deaths-during-june-heatwaves-new-data-shows',
        date: '2026-07-13',
        locator: '>10,000 excess deaths, >9,000 aged 65+ — fetched (EuroMOMO bulletin itself not fetched)',
      },
      {
        label: 'Euronews Health on the Santé publique France tally',
        url: 'https://www.euronews.com/health/2026/07/23/over-5800-excess-deaths-recorded-in-france-during-the-june-heatwave',
        date: '2026-07-23',
        locator: '≥5,764 excess deaths (21,674 observed vs 15,910 expected); highest heatwave excess since 2003 — snippet only',
      },
      {
        label: 'Callahan, Europe-wide rapid heat-mortality estimate (preprint, not peer-reviewed)',
        url: 'https://zenodo.org/records/21083733',
        date: '2026-06-30',
        locator: '20,390 heat-related deaths, 22–28 June 2026 — fetched',
      },
      {
        label: 'Reuters via Insurance Journal (Allianz −0.3 pp)',
        url: 'https://www.insurancejournal.com/news/international/2026/08/10/880818.htm',
        date: '2026-08-10',
        locator: '"the two-week June heatwave alone will cut the GDP of Europe by 0.3 percentage points" — syndication fetched',
      },
      {
        label: 'France 24 on school closures',
        url: 'https://www.france24.com/en/live-news/20260622-some-france-schools-closed-for-day-of-searing-heat',
        date: '2026-06-22',
        locator: '>1,350 of ~60,000 schools closed on the peak Monday — snippet only (403 from this sandbox)',
      },
      {
        label: 'RailwayPro on rail disruption',
        url: 'https://www.railwaypro.com/wp/heatwave-disrupts-european-rail-traffic/',
        date: '2026-06-25',
        locator: 'SNCB 100 cancellations/day, 200 trainsets withdrawn — fetched',
      },
    ],
  },
  {
    id: 'heat-august',
    strand: 'heat',
    title: 'The July and August episodes — the heat keeps returning',
    window: '4 July – ongoing (fourth and fifth episodes)',
    region: 'Western, central and southern Europe',
    what:
      'By end-July western Europe had seen its third and fourth heatwaves since May; June–July combined was the region\'s hottest on record. July was France\'s hottest month ever recorded and its third-driest July. Austria broke its all-time national record on two consecutive days (41.2 °C at Bad Deutsch-Altenburg on 5 August); Italy put 25 of 27 monitored cities on maximum heat alert on 4 August. Another heat blast began around 10 August — this ledger closes mid-season.',
    physical: [
      { label: 'June–July combined, western Europe (C3S)', value: '+2.79 °C, record' },
      { label: 'Austria all-time record, 5 Aug', value: '41.2 °C' },
      { label: 'Italian cities on maximum alert, 4 Aug', value: '25 of 27' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      {
        label: 'C3S July 2026 bulletin press release',
        url: 'https://climate.copernicus.eu/copernicus-highest-july-global-ocean-surface-temperatures-exceptionally-hot-dry-conditions-fuel',
        date: '2026-08-10',
        locator: 'third and fourth heatwaves; June–July record 21.62 °C — fetched',
      },
      {
        label: 'The Local Austria on the national record',
        url: 'https://www.thelocal.at/20260805/austria-breaks-national-heat-record-for-second-day-running/',
        date: '2026-08-05',
        locator: '41.2 °C Bad Deutsch-Altenburg (previous 40.5 °C, 2013) — snippet only; reported peak varies 40.8–41.2 °C across outlets',
      },
      {
        label: 'Connexion France / The Local France on the July records and water restrictions',
        url: 'https://www.connexionfrance.com/practical/french-drought-update-all-departments-face-tap-water-limits-or-warnings/807215',
        date: '2026-08-04',
        locator: 'hottest month on record, third-driest July, ~70 % rainfall deficit — snippet only',
      },
    ],
  },
  {
    id: 'heat-season-economy',
    strand: 'heat',
    title: 'What the heat is doing to the economy — season estimates',
    window: 'Summer 2026, in-season estimates',
    region: 'EU',
    what:
      'The only whole-season figure so far is a bank estimate: Triodos puts 2026 heat-related disruption at roughly 1 % of EU GDP (≈€180bn), with labour-productivity losses alone ≈0.6 % of GDP and France worst hit (≈−1.4 % of GDP) — against a Commission growth forecast of 1.1 %, that absorbs most of the year\'s growth. It is an in-year bank estimate, not an official statistic, and the same number circulates unattributed on Wikipedia. Reuters\' summary of the analyst consensus is simply "hundreds of billions of euros". For calibration: Allianz\'s 2025-note methodology equates one day above 32 °C to half a day of strikes, and its 2026 stress scenario puts cumulative 2026–2030 losses for the most-exposed economies at 5–7 % of GDP.',
    physical: [
      { label: 'Labour-productivity loss (Triodos)', value: '≈0.6 % EU GDP' },
      { label: 'France heat effect on 2026 GDP (Triodos)', value: '≈−1.4 %' },
      { label: 'One extreme-heat day equals (Allianz method)', value: '½ strike day' },
    ],
    euro: [
      {
        lo: 180, hi: 180,
        scope: 'Heat-related disruption, whole 2026 season, EU-wide GDP flow — single bank estimate (≈1 % of EU GDP), not an official statistic',
        kind: 'bank',
        asOf: '2026-08',
        confidence: 'secondary',
        source: {
          label: 'Triodos Bank estimate, Reuters syndication via Zawya',
          url: 'https://www.zawya.com/en/economy/uk-and-europe/europes-extreme-heat-could-wipe-out-eu-growth-in-2026-426753',
          date: '2026-08',
          locator: '≈1 % of EU GDP ≈ €180bn; productivity ≈0.6 %; France ≈−1.4 % — syndication fetched',
        },
      },
    ],
    confidence: 'secondary',
    sources: [
      {
        label: 'Reuters heat-economy analysis via Insurance Journal',
        url: 'https://www.insurancejournal.com/news/international/2026/08/10/880818.htm',
        date: '2026-08-10',
        locator: '"hundreds of billions of euros"; Allianz, ING, MBH quotes — syndication fetched',
      },
      {
        label: 'Allianz Research, "Global boiling — Heatwave may cost −0.5pp of GDP in Europe" (2025 note, methodology reference)',
        url: 'https://www.allianz.com/content/dam/onemarketing/azcom/Allianz_com/economic-research/publications/specials/en/2025/july/20250701_Heatwaves_EconImplications.pdf',
        date: '2025-07-01',
        locator: 'p. 1: "one day of extreme heat (above 32°C) is equivalent to half a day of strikes" — PDF fetched',
      },
      {
        label: 'Allianz Research, "Too hot to grow" (2026 stress scenario)',
        url: 'https://www.allianz.com/en/economic_research/insights/publications/specials_fmo/260528-heat-economics.html',
        date: '2026-05-28',
        locator: 'cumulative 2026–2030 losses 5–7 % for most-exposed economies — fetched',
      },
    ],
  },

  /* --------------------------------------------------------- wildfire */
  {
    id: 'fire-season',
    strand: 'wildfire',
    title: 'The EU fire season — 2.6× the average, second only to 2022 at this date',
    window: '1 January – 5 August 2026 (week 31), season ongoing',
    region: 'EU-27, worst: Spain, France, Italy, Portugal, Greece',
    what:
      'EFFIS weekly statistics (live API pull on the compile date): 505,042 ha burnt across 1,553 fires by week 31 — 2.6 times the 2006-onwards average for the date (197,347 ha), a third ahead of 2025\'s pace, behind only 2022 (611,945 ha at the same week). Per-country rapid damage assessment: Spain 256,574 ha, France 93,301 ha (already far above its 2025 full year of 36,951 ha), Italy 78,898 ha, Portugal 51,975 ha, Greece 30,493 ha. Note the product caveat: Spain\'s national provisional tally (172,396–186,544 ha, late July/early August) sits well below the EFFIS satellite product — analyses must stay inside one product. The only whole-season euro figures are a Financial Times restoration-only tally (>€3.1bn across the five worst-hit countries, explicitly excluding homes, businesses, crops, tourism and insurance) and a broad private forecast (AccuWeather, €15.6–19.1bn including indirect and health costs).',
    physical: [
      { label: 'EU burnt area, week 31 (EFFIS)', value: '505,042 ha' },
      { label: 'vs 2006+ average at same week', value: '2.6×' },
      { label: 'Displaced across south-west Europe (ECHO)', value: '>300,000' },
      { label: 'Fatalities', value: 'no consolidated count' },
    ],
    euro: [
      {
        lo: 3.1, hi: 3.1,
        scope: 'Restoration and reforestation costs only, five worst-hit eurozone countries, season to 4 Aug — explicitly excludes homes, businesses, crops, tourism, insurance',
        kind: 'analysis',
        asOf: '2026-08-04',
        confidence: 'secondary',
        source: {
          label: 'Financial Times analysis, via Brussels Signal / To Vima',
          url: 'https://www.tovima.com/world/europes-wildfires-already-cost-over-e3-billion-in-2026',
          date: '2026-08-04',
          locator: '>€3.1bn restoration; quoted economist: true toll "could be more than three times higher" — syndications fetched',
        },
      },
      {
        lo: 15.6, hi: 19.1,
        scope: 'Total damage and economic loss for the 2026 European wildfire season, incl. indirect impacts, emergency response and health costs — private forecast, broad methodology, not an official assessment',
        kind: 'private-forecast',
        asOf: '2026-08-05',
        confidence: 'verified',
        source: {
          label: 'AccuWeather press estimate',
          url: 'https://www.accuweather.com/en/press/record-challenging-european-wildfires-cause-an-estimated-%E2%82%AC15-6-%E2%82%AC19-1-billion-18-22-billion-in-total-damage-and-economic-loss-accuweather-experts-say/1919395',
          date: '2026-08-05',
          locator: '€15.6–19.1bn ($18–22bn) — fetched',
        },
      },
    ],
    confidence: 'verified',
    sources: [
      EFFIS_SOURCE,
      {
        label: 'EFFIS per-country rapid damage assessment (live API pull)',
        url: 'https://api2.effis.emergency.copernicus.eu/statistics/v2/effis/estimatesbycountry?country=ESP',
        date: '2026-08-11',
        locator: 'ba/nf fields per ISO3 country — fetched',
      },
      {
        label: 'European Commission ECHO news on displacement',
        url: 'https://civil-protection-humanitarian-aid.ec.europa.eu/news-stories/news/eu-sends-planes-and-firefighters-wildfires-ravage-france-and-spain-2026-07-27_en',
        date: '2026-07-27',
        locator: '"more than 300,000 displaced" — fetched',
      },
      {
        label: 'Yahoo Finance on the Spanish national tally and firefighting-cost arithmetic',
        url: 'https://finance.yahoo.com/economy/articles/spains-wave-wildfires-costs-3-182531432.html',
        date: '2026-07-28',
        locator: '172,396 ha national provisional figure (Ministry for the Ecological Transition) — fetched',
      },
    ],
  },
  {
    id: 'fire-gironde',
    strand: 'wildfire',
    title: 'Gironde megafire — among the largest French fires since the Second World War',
    window: 'Mid–late July 2026',
    region: 'Gironde, France',
    what:
      'Roughly 42,000 ha burnt by 26 July; about 220,000 people evacuated (208,000 back home by 2 August); 240 homes destroyed. France burnt 63,000 ha in July alone, and CAMS reports the country\'s cumulative fire-carbon emissions by late July were comparable to or higher than the extreme years 2022 and 2023 — "on course to be one of the most extreme fire years of the past 24 years". Commissioner Lahbib toured the fire zone and called it Europe\'s "wake up call".',
    physical: [
      { label: 'Burnt area (by 26 Jul)', value: '≈42,000 ha' },
      { label: 'Evacuated', value: '≈220,000' },
      { label: 'Homes destroyed', value: '240' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      {
        label: 'Euronews wildfire update',
        url: 'https://www.euronews.com/my-europe/2026/08/02/europes-wildfires-update-greece-still-battling-outbreaks-in-spain',
        date: '2026-08-02',
        locator: 'Gironde figures; France 63,000 ha since 1 July — fetched',
      },
      {
        label: 'CAMS on western-European fire emissions',
        url: 'https://atmosphere.copernicus.eu/extreme-wildfires-western-europe-expose-millions-dangerous-air-pollution-levels',
        date: '2026-07',
        locator: 'France/Spain emissions assessment (qualitative) — fetched',
      },
      {
        label: 'Euronews, Lahbib in Gironde',
        url: 'https://www.euronews.com/2026/07/31/this-is-our-wake-up-call-eu-crisis-chief-slams-climate-deniers-after-french-fires',
        date: '2026-07-31',
        locator: '"Climate change is not knocking at our door. It is here." — fetched',
      },
    ],
  },
  {
    id: 'fire-spain',
    strand: 'wildfire',
    title: 'Spain — the Madrid/Ávila fire complex and a €1.7–3.3bn suppression bill',
    window: 'Late July – August 2026, ongoing',
    region: 'Madrid, Castilla y León, Castilla-La Mancha, Valencia',
    what:
      'Fires west of Madrid merged into a front reported near 80,000 ha by 29 July — the Sierra Oeste complex alone passed 70,000 ha, and the Ávila fire is reported as the largest in Spain\'s recorded history (both figures press-reported, not officially consolidated). Spain\'s only season cost figures so far are arithmetic, not assessment: 172,396 ha (national tally, 28 July) times the €10,000–19,000/ha suppression-and-immediate-cost range used by the Navarra Forestry Agency and Asemfo gives €1.7–3.3bn, excluding restoration. For 2025, Spain\'s comparators are ~€7.6bn (Forescat) against an EU Solidarity Fund award of just €120.55m.',
    physical: [
      { label: 'Spain burnt area 2026 (EFFIS RDA)', value: '256,574 ha' },
      { label: 'Spain burnt area 2026 (national tally, 28 Jul)', value: '172,396 ha' },
      { label: 'Evacuated in Spain (press)', value: '≈90,000' },
    ],
    euro: [
      {
        lo: 1.7, hi: 3.3,
        scope: 'Firefighting and immediate suppression costs only, Spain, season to 28 July — per-hectare arithmetic (€10k–19k/ha), excludes restoration and all damage classes',
        kind: 'industry',
        asOf: '2026-07-28',
        confidence: 'verified',
        source: {
          label: 'Yahoo Finance, per-ha figures from Navarra Forestry Agency / Asemfo',
          url: 'https://finance.yahoo.com/economy/articles/spains-wave-wildfires-costs-3-182531432.html',
          date: '2026-07-28',
          locator: '172,396 ha × €10,000–19,000/ha — fetched',
        },
      },
    ],
    confidence: 'secondary',
    sources: [
      {
        label: 'Euronews wildfire update (Sierra Oeste >70,000 ha)',
        url: 'https://www.euronews.com/my-europe/2026/08/02/europes-wildfires-update-greece-still-battling-outbreaks-in-spain',
        date: '2026-08-02',
        locator: 'fetched',
      },
      {
        label: 'CNN live coverage of the merged fire front',
        url: 'https://www.cnn.com/2026/07/25/world/live-news/france-spain-wildfires-evacuations',
        date: '2026-07-25',
        locator: '≈80,000 ha front; Ávila fire "largest in recorded history" — snippet only (CNN blocked from this sandbox)',
      },
      {
        label: 'EFFIS per-country RDA, Spain',
        url: 'https://api2.effis.emergency.copernicus.eu/statistics/v2/effis/estimatesbycountry?country=ESP',
        date: '2026-08-11',
        locator: '256,574 ha, 407 fires — fetched',
      },
    ],
  },
  {
    id: 'fire-greece',
    strand: 'wildfire',
    title: 'Greece — the Porto Germeno fire and five deaths in a week',
    window: '31 July – August 2026',
    region: 'Attica / Boeotia, plus Crete and Paros',
    what:
      'The Porto Germeno megafire west of Athens burnt more than 10,000 ha across Attica and Boeotia within days. Two aircrew — a Greek coordinator and a Danish pilot — were killed when firefighting helicopters collided at Psatha on 2 August; three firefighters died in Greece the same week. Greece activated the EU Civil Protection Mechanism on 2 August, the seventh wildfire activation of the season.',
    physical: [
      { label: 'Porto Germeno burnt area (by 2 Aug)', value: '>10,000 ha' },
      { label: 'Deaths in Greece that week', value: '5' },
      { label: 'Greece 2026 burnt area (EFFIS RDA)', value: '30,493 ha' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      {
        label: 'Euronews wildfire update',
        url: 'https://www.euronews.com/my-europe/2026/08/02/europes-wildfires-update-greece-still-battling-outbreaks-in-spain',
        date: '2026-08-02',
        locator: 'Porto Germeno; helicopter collision — fetched',
      },
      {
        label: 'Commission UCPM wildfire page (2026 activations)',
        url: 'https://civil-protection-humanitarian-aid.ec.europa.eu/what/civil-protection/wildfires_en',
        date: '2026-08-03',
        locator: 'seven activations 2026: GR, ES, TN, FR ×2, PT, NL, CZ — fetched',
      },
    ],
  },

  /* ------------------------------------------------------------ water */
  {
    id: 'water-rhine',
    strand: 'water',
    title: 'Rhine at Kaub — lowest since records began in 1880',
    window: 'Late July – ongoing',
    region: 'Middle Rhine (Kaub chokepoint), Germany',
    what:
      'The barge clearance level at Kaub fell to 21 cm around 4 August — reported as the lowest since records began in 1880 — and kept falling: the Pegelonline API read 15 cm on the compile date, with the shipping association BDB warning of a first-ever drop into single digits, at which point "the Rhine is then no longer navigable along its entire length and thus split in two". Barges are sailing at fractions of capacity (a tanker that loads ~1,200 t past Duisburg limited to ~460 t through Kaub); Rotterdam–Karlsruhe diesel freight is the most expensive since Bloomberg began compiling it in 2009; Shell, BASF, Lanxess and Evonik all report logistics impacts, and four Länder relaxed trucking rules to move cargo by road. The Kiel Institute estimates the episode could shave 0.1–0.2 % off German GDP over July–September — the canonical Kiel research finding being that a month with 30 low-water days cuts German industrial production by about 1 %.',
    physical: [
      { label: 'Kaub gauge, 11 Aug (Pegelonline API)', value: '15 cm' },
      { label: 'Record context', value: 'lowest since 1880' },
      { label: 'German GDP effect Q3 (Kiel Institute)', value: '−0.1 to −0.2 %' },
      { label: 'Example load reduction through Kaub', value: '≈−62 %' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      KAUB_SOURCE,
      {
        label: 'Bloomberg via gCaptain, "Rhine Set for More Disruption After Hitting Lowest on Record"',
        url: 'https://gcaptain.com/rhine-set-for-more-disruption-after-hitting-lowest-on-record/',
        date: '2026-08-04',
        locator: '21 cm "lowest since records began in 1880"; diesel freight record; Kiel 0.1–0.2 % GDP; company impacts — syndication fetched',
      },
      {
        label: 'Insurance Journal on the BDB warning',
        url: 'https://www.insurancejournal.com/news/international/2026/08/10/880824.htm',
        date: '2026-08-10',
        locator: 'single-digit forecast; "split in two" quote; Länder trucking relaxations — fetched',
      },
      {
        label: 'Ademmer, Jannsen & Meuchelböck, "Extreme Weather Events and Economic Activity: The Case of Low Water Levels on the Rhine River", German Economic Review 24(2), 2023',
        url: 'https://www.kielinstitut.de/publications/extreme-weather-events-and-economic-activity-the-case-of-low-water-levels-on-the-rhine-river-6245/',
        date: '2023',
        locator: 'abstract: "In a month with 30 days of low water, industrial production in Germany declines by about 1 percent" — publication page fetched',
      },
      {
        label: 'Contargo low-water surcharge notice',
        url: 'https://www.contargo.net/en/business/auxiliary-conditions/low-water/',
        date: '2026-08-11',
        locator: 'surcharge scale from Kaub <150 cm; possible service suspension notice — fetched',
      },
    ],
  },
  {
    id: 'water-danube',
    strand: 'water',
    title: 'Danube at record lows — grain exports squeezed, reactors throttled',
    window: 'July – ongoing',
    region: 'Danube basin (Romania, Hungary, Bulgaria, Serbia)',
    what:
      'The Danube fell 28 cm below its 2018 record low — a level that was itself a metre below the 100-year design minimum used for the river\'s nuclear plants. Romania\'s Cernavodă 1 shut down around 27 July; Hungary\'s Paks — about half of the country\'s electricity — came within 24–72 hours of full shutdown in early August, and Bulgaria\'s Kozloduy was next in line as the river fell ~2 cm a day. On the freight side the low water is squeezing Black Sea grain flows through Constanța: fewer barge rotations, longer waits, freight rates above seasonal norms, and Romania reported lowest levels since 1996 with July flow at less than half the norm.',
    physical: [
      { label: 'Danube vs 2018 record', value: '−28 cm' },
      { label: 'Cernavodă 1 (650 MWe)', value: 'shut ~27 Jul' },
      { label: 'Hungary GDP cost per week of Paks outage (MBH Bank)', value: '≈0.1 pp' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      {
        label: 'World Nuclear News, "Danube\'s record low leads to Hungary, Romania nuclear shutdowns"',
        url: 'https://www.world-nuclear-news.org/articles/danubes-record-low-leads-to-hungary-romania-nuclear-shutdowns',
        date: '2026-07-30',
        locator: '−28 cm vs 2018; design-minimum context; Cernavodă/Paks status — fetched',
      },
      {
        label: 'Bloomberg via gCaptain, "Record-Low Danube Strains Vital Route for Black Sea Grain"',
        url: 'https://gcaptain.com/record-low-danube-strains-vital-route-for-black-sea-grain/',
        date: '2026-08-10',
        locator: 'Constanța terminal quotes; freight above seasonal norms — syndication fetched',
      },
      {
        label: 'Reuters via Insurance Journal (MBH Bank estimate)',
        url: 'https://www.insurancejournal.com/news/international/2026/08/10/880818.htm',
        date: '2026-08-10',
        locator: '≈0.1 pp of Hungarian GDP per week of Paks outage — syndication fetched',
      },
    ],
  },
  {
    id: 'water-drought',
    strand: 'water',
    title: 'The drought underneath it all',
    window: 'Spring – ongoing',
    region: 'France, southern Germany, Alps, northern Italy, Danube basin, UK',
    what:
      'The JRC\'s Combined Drought Indicator (late-July analysis) keeps alert conditions across south-east England, France, southern Germany, Switzerland, northern Italy and the Danube basin, with unusually low streamflow across the low-flow index. In mid-July more than 85 % of France was under drought warning or alert — against ~65 % at the same point in 2025 and under 2 % in 2024 — and by early August every mainland French department was under tap-water limits or warnings. WWA attribution puts the western-Europe soil drought at about 5 times more likely with current warming, and the eastern-domain moisture deficits at about 11 times more probable. The standard cost reference: JRC/PESETA IV puts current EU+UK drought losses at €9.4bn a year, rising towards €45bn a year at 3 °C by 2100 — around half of it falling on agriculture.',
    physical: [
      { label: 'France under drought warning/alert, mid-July (EDO)', value: '>85 %' },
      { label: 'Same date 2024', value: '<2 %' },
      { label: 'EU+UK drought losses today (JRC)', value: '€9.4bn/yr' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      {
        label: 'JRC EDO, current drought situation in Europe (CDI, 21–31 July period)',
        url: 'https://joint-research-centre.ec.europa.eu/european-and-global-drought-observatories/current-drought-situation-europe_en',
        date: '2026-08-07',
        locator: 'alert/warning zones — fetched',
      },
      {
        label: 'World Weather Attribution drought study (France 85 % statistic via EDO)',
        url: 'https://www.worldweatherattribution.org/increasingly-hot-europe-faces-more-severe-droughts-and-growing-challenges-for-water-and-land-management/',
        date: '2026-07-23',
        locator: 'likelihood multipliers fetched; the 85 %/65 %/2 % France series seen in snippets of this page — snippet',
      },
      {
        label: 'JRC PESETA IV droughts project page',
        url: 'https://joint-research-centre.ec.europa.eu/projects-and-activities/peseta-climate-change-projects/jrc-peseta-iv/droughts_en',
        date: '2020',
        locator: '"from 9.4 €billion/year now to 45 €billion/year with 3°C global warming in 2100" — fetched',
      },
    ],
  },

  /* ------------------------------------------------------ agriculture */
  {
    id: 'agri-harvest',
    strand: 'agriculture',
    title: 'The harvest the June heatwave took',
    window: 'June – July 2026',
    region: 'EU (worst: France, Hungary, Spain, northern Italy)',
    what:
      'ECIU\'s analysis of the COCERAL grain-forecast revisions attributes roughly 9 million tonnes of lost EU+UK cereal production to the June heatwave — about €2.0bn of farmer revenue (€1.8bn net of offsetting revisions), led by France\'s maize (−3.4 Mt, ≈€891m), Hungary (−2.4 Mt) and Spain (−1.4 Mt). The JRC\'s MARS bulletin cut EU yield forecasts for every spring and summer crop — grain maize and sunflower by 6–7 % — citing "exceptional heat and limited rainfall" that "depleted soil moisture, constrained biomass accumulation and affected flowering", and warned of further cuts as the heat persisted. Forward price effects are already being estimated: Oxford Economics sees the weather effect adding up to a percentage point to euro-area food inflation next year; the verified reference for the mechanism is the ECB-linked finding that the 2022 heat alone lifted European food inflation by 0.67 points.',
    physical: [
      { label: 'Cereal production lost to June heat (ECIU/COCERAL)', value: '≈9 Mt' },
      { label: 'Grain maize & sunflower forecast cut (JRC MARS)', value: '−6–7 %' },
      { label: 'Food-inflation effect of 2022 heat (reference)', value: '+0.67 pp' },
    ],
    euro: [
      {
        lo: 1.8, hi: 2.0,
        scope: 'Farmer revenue lost to the June heatwave via cereal-harvest downgrades, EU+UK — forecast-revision arithmetic, one crop group only, not total agricultural damage',
        kind: 'analysis',
        asOf: '2026-07-22',
        confidence: 'verified',
        source: {
          label: 'ECIU press release, COCERAL forecast analysis',
          url: 'https://eciu.net/media/press-releases/june-heatwave-knocks-2-billion-off-european-harvest-prospects-new-analysis',
          date: '2026-07-22',
          locator: '≈€2.0bn gross, €1.8bn net; per-country tonnages — fetched',
        },
      },
    ],
    confidence: 'verified',
    sources: [
      {
        label: 'JRC MARS Bulletin Vol. 34 No 6 news item',
        url: 'https://joint-research-centre.ec.europa.eu/jrc-news-and-updates/heatwaves-impact-summer-and-winter-crops-2026-07-27_en',
        date: '2026-07-27',
        locator: 'yield-cut quotes — fetched; bulletin record publications.jrc.ec.europa.eu/repository/handle/JRC146186',
      },
      {
        label: 'Euronews Business on heatflation estimates',
        url: 'https://www.euronews.com/business/2026/07/16/why-this-summers-heatwaves-could-raise-food-prices-next-year',
        date: '2026-07-16',
        locator: 'Oxford Economics +1 pp; Deutsche Bank +0.8 %; the 0.67 pp 2022 reference — fetched',
      },
      {
        label: 'Kotz, Kuik, Lis & Nickel, "Global warming and heat extremes to enhance inflationary pressures", Communications Earth & Environment 5, 116 (2024)',
        url: 'https://www.nature.com/articles/s43247-023-01173-x',
        date: '2024',
        locator: '2022 heat → +0.67 (0.43–0.93) pp European food inflation — citation verified via secondary records, paper page behind login from this sandbox',
      },
    ],
  },
  {
    id: 'agri-livestock',
    strand: 'agriculture',
    title: 'Livestock in the heat — millions of birds, a fifth of the milk',
    window: 'Late June – August 2026',
    region: 'France (Brittany), Belgium, Italy',
    what:
      'The late-June heatwave killed an estimated 2.5–3 million broiler chickens in France (per Le Monde\'s reporting), overwhelming rendering capacity and forcing authorised on-farm burial; Belgium reported heat stress cutting feed intake, milk yields and growth in cattle and pigs. In Italy, Coldiretti reports barn milk output down 20 % in the August heat, drought across more than 60 % of national territory, and maize losses of up to 70 % in some areas — its "circa €20bn" figure for climate damage to Italian agriculture explicitly covers the last four years, not 2026 alone. No consolidated 2026 euro figure for EU livestock losses exists yet.',
    physical: [
      { label: 'Broilers killed, France (Le Monde est.)', value: '2.5–3 million' },
      { label: 'Italian barn milk output (Coldiretti)', value: '−20 %' },
      { label: 'Italy under drought (Coldiretti/Copernicus)', value: '>60 % of territory' },
    ],
    euro: [],
    confidence: 'secondary',
    sources: [
      {
        label: 'FoodIngredientsFirst (Le Monde figures)',
        url: 'https://www.foodingredientsfirst.com/news/livestock-heatwave-broiler-deaths-climate.html',
        date: '2026-07-06',
        locator: '2.5–3 million broilers; Belgium heat-stress impacts — fetched',
      },
      {
        label: 'LaPresse, Coldiretti drought alarm',
        url: 'https://www.lapresse.it/cronaca/2026/08/07/caldo-record-coldiretti-allarme-siccita-per-oltre-il-60-del-territorio/',
        date: '2026-08-07',
        locator: 'milk −20 %; >60 % territory; €20bn over four years — fetched',
      },
    ],
  },

  /* ----------------------------------------------------------- energy */
  {
    id: 'energy-nuclear-fr',
    strand: 'energy',
    title: 'French nuclear versus warm rivers — three episodes of curtailment',
    window: '23 June – ongoing',
    region: 'France (Garonne, Rhône, Seine, Meuse, Gironde estuary)',
    what:
      'Each heat episode forced EDF to throttle the fleet as river temperatures approached regulatory discharge limits: about 4 GW (6 % of capacity) cut in the June peak with Golfech 2 down for eight days; up to 6.4 GW reported cut in mid-July with three reactors fully offline (Golfech 2, Bugey 3, Chooz 2) and seven more at reduced power; and in the late-July episode roughly 15 reactors affected across six European plants, Golfech 2 shut again. France\'s afternoon export surplus thinned from 11–12 GW in early June to 2.9 GW on the hottest day. The economy ministry granted a temporary exemption from the Rhône temperature limits near Bugey — an environmental trade-off made in-season. EDF\'s own context figures: heat and low flow have cost an average of 0.3 % of annual nuclear output since 2000, and the company runs a €8.7bn, 15-year climate-adaptation programme. No official euro figure for the 2026 curtailments exists.',
    physical: [
      { label: 'June peak curtailment', value: '≈4 GW (6 %)' },
      { label: 'Mid-July reported cut', value: '6.4 GW' },
      { label: 'Late-July reactors affected, Europe-wide', value: '≈15 at 6 plants' },
      { label: 'EDF climate-adaptation programme', value: '€8.7bn / 15 yr' },
    ],
    euro: [],
    confidence: 'verified',
    sources: [
      {
        label: 'Euronews, "France shuts down nuclear reactors as heatwave intensifies"',
        url: 'https://www.euronews.com/business/2026/07/13/france-shuts-down-nuclear-reactors-as-heatwave-intensifies',
        date: '2026-07-13',
        locator: 'three reactors with return dates; ~6 % of fleet; Bugey exemption; EDF 0.3 % and €8.7bn figures — fetched',
      },
      {
        label: 'Montel News, June curtailment',
        url: 'https://montelnews.com/news/71fed808-f624-4bc4-8b9b-b4db6a863f70/43c-heat-cuts-6-of-french-nuclear-capacity-more-curbs-possible',
        date: '2026-06-23',
        locator: '4 GW / 6 %; Golfech 2 eight days — fetched (partial paywall)',
      },
      {
        label: 'Power Technology, "Europe\'s heatwave strains nuclear output"',
        url: 'https://www.power-technology.com/news/europes-heatwave-strains-nuclear-output/',
        date: '2026-07-31',
        locator: 'late-July episode reactor list; ~15 reactors, 6 plants — fetched',
      },
      {
        label: 'pv magazine, "When the rivers ran warm"',
        url: 'https://www.pv-magazine.com/2026/07/01/when-the-rivers-ran-warm-how-a-heatwave-thinned-frances-nuclear-export-cushion/',
        date: '2026-07-01',
        locator: 'export surplus 11–12 GW → 2.9 GW — fetched',
      },
    ],
  },
  {
    id: 'energy-prices',
    strand: 'energy',
    title: 'Cooling demand meets a stressed grid — record prices and local blackouts',
    window: '23 June – early August 2026',
    region: 'Belgium, Germany, Italy, France',
    what:
      'On 24 June Belgium\'s day-ahead 15-minute price spiked to €1,038/MWh for the evening peak — the highest since 15-minute trading began — as air-conditioning demand met a wind drought and 2.3 GW of nuclear on outage. German wholesale prices reached ~€200/MWh with daily consumption up ~10 % over the heat fortnight. Italy hit its 2026 demand high of 55 GW; heat-stressed underground cables blacked out parts of Turin (>15 hours) and Naples\' historic centre; around 68,000 French households lost power in the June episode. These are the quantified fragments — no aggregate 2026 figure for heat-related energy-system costs exists.',
    physical: [
      { label: 'Belgian 15-min day-ahead peak, 24 Jun', value: '€1,038/MWh' },
      { label: 'Italian demand peak, 23 Jun (Terna)', value: '55 GW' },
      { label: 'Turin blackout', value: '>15 h' },
    ],
    euro: [],
    confidence: 'snippet',
    sources: [
      {
        label: 'Kpler, "Belgium breaches €1,000/MWh…" (with IndexBox and 10senergy corroboration)',
        url: 'https://www.kpler.com/blog/belgium-breaches-1-000-eu-mwh-as-low-wind-and-heatwave-spikes-evening-peak',
        date: '2026-06',
        locator: '€1,038.25/MWh for the 24 June 20:45 product — snippet only, three independent snippets agree',
      },
      {
        label: 'The Local Italy, blackouts and demand records',
        url: 'https://www.thelocal.it/20260626/italian-cities-face-more-blackouts-with-temperatures-set-to-rise-again/',
        date: '2026-06-26',
        locator: '55 GW Terna; Turin/Naples outages; cable failures — fetched',
      },
      {
        label: 'The Cooldown (Euronews figures on German prices/demand)',
        url: 'https://www.thecooldown.com/green-business/western-europe-june-heat-power-prices/',
        date: '2026-07-19',
        locator: '~€200/MWh; 1,267→1,396 GWh/day — fetched (secondary of Euronews)',
      },
    ],
  },
];

/* ----------------------------------------------- backdrop and stake rows */

export type BackdropRow = {
  id: string;
  label: string;
  value: string;
  detail: string;
  confidence: 'verified' | 'secondary' | 'snippet';
  sources: SourceRef[];
};

/** What the damage ledger sits on top of — the recorded past and the priced future. */
export const BACKDROP: BackdropRow[] = [
  {
    id: 'eea-cumulative',
    label: 'Recorded EU losses from weather and climate extremes, 1980–2024',
    value: '€822bn',
    detail:
      'Over €208bn (25 %) of it in 2021–2024 alone; the five costliest years are 2021, 2022, 2023, 2024 and 1999 — four of the five are the last four complete years. Less than 20 % of total losses were insured.',
    confidence: 'verified',
    sources: [
      {
        label: 'EEA indicator: economic losses from weather- and climate-related extremes in Europe',
        url: 'https://www.eea.europa.eu/en/analysis/indicators/economic-losses-from-climate-related',
        date: '2025-10-14',
        locator: 'headline figures and costliest-years list — fetched',
      },
    ],
  },
  {
    id: 'eca-decade',
    label: 'Average annual EU losses over the last decade (ECA)',
    value: '€26bn/yr',
    detail:
      '"During the last decade average economic losses from extreme climate-related events in the EU amounted to €26 billion per year" — the same report that found EU adaptation "not keeping up with ambition".',
    confidence: 'verified',
    sources: [
      {
        label: 'European Court of Auditors, Special report 15/2024',
        url: 'https://www.eca.europa.eu/ECAPublications/SR-2024-15/SR-2024-15_EN.pdf',
        date: '2024-07',
        locator: 'executive summary §II — PDF fetched, quote verbatim',
      },
    ],
  },
  {
    id: 'esabcc-current',
    label: 'Current damages per the ESABCC adaptation report',
    value: '≈€45bn/yr',
    detail:
      'The Board\'s February 2026 adaptation report: economic damages "around EUR 45 billion per year", with adaptation efforts "insufficient to prevent avoidable impacts and to manage escalating climate risks".',
    confidence: 'verified',
    sources: [
      {
        label: 'ESABCC, "Strengthening resilience to climate change"',
        url: 'https://climate-advisory-board.europa.eu/reports-and-publications/strengthening-resilience-to-climate-change-recommendations-for-an-effective-eu-adaptation-policy-framework',
        date: '2026-02-17',
        locator: 'report page — fetched',
      },
    ],
  },
  {
    id: 'munichre-h1',
    label: 'Insurer view of Europe, first half of 2026',
    value: '≈$22bn losses, ≈$7bn insured',
    detail:
      'Munich Re\'s half-year review — dominated by the nine winter storms (Kristin alone $7.7bn). It closes on 30 June and explicitly notes heatwave losses are hard to quantify (productivity, not property), so nearly everything in this ledger sits outside it.',
    confidence: 'verified',
    sources: [
      {
        label: 'Munich Re, natural disaster review for the first half of 2026',
        url: 'https://www.munichre.com/en/company/media-relations/media-information-and-corporate-news/media-information/2026/natural-disaster-figures-first-half-2026.html',
        date: '2026-07-30',
        locator: 'European figures; heatwave caveat — fetched',
      },
    ],
  },
  {
    id: 'usman-2025',
    label: 'What last summer ended up costing (the 2025 reference)',
    value: '€43bn → €126bn',
    detail:
      'The Mannheim/ECB-economist study of the 2025 extreme summer: €43bn of short-run losses in 2025, rising to €126bn by 2029 as the impacts propagate — the reason an early-August 2026 tally is a floor, not a total.',
    confidence: 'verified',
    sources: [
      {
        label: 'Usman et al. via EEA Climate-ADAPT news',
        url: 'https://climate-adapt.eea.europa.eu/en/news-archive/extreme-weather-events-in-summer-2025-europe-faces-long-term-losses-of-126-billion-euros/',
        date: '2025-09-16',
        locator: '€43bn / €126bn; ~a quarter of EU regions affected — fetched',
      },
    ],
  },
  {
    id: 'peseta-stake',
    label: 'The priced future (JRC PESETA IV)',
    value: '≥€175bn/yr at 3 °C',
    detail:
      '"Exposing present economy to global warming of 3°C would result in an annual welfare loss of at least 175 €billion (1.38% of GDP)" — €83bn/yr at 2 °C, €42bn/yr at 1.5 °C. COM(2024) 91\'s own framing: in the best case Europe "will have to learn to live with climate that is 3 degrees warmer".',
    confidence: 'verified',
    sources: [
      {
        label: 'JRC PESETA IV final summary report',
        url: 'https://joint-research-centre.ec.europa.eu/system/files/2020-05/pesetaiv_summary_final_report.pdf',
        date: '2020-05',
        locator: 'summary — PDF fetched, quote verbatim',
      },
      {
        label: 'COM(2024) 91 final, full text via Cellar',
        url: 'https://publications.europa.eu/resource/celex/52024DC0091',
        date: '2024-03-12',
        locator: '§1.1 — fetched, quote verbatim',
      },
    ],
  },
];

/* --------------------------------------------------- preparedness ledger */

export const PREPAREDNESS: PreparednessRow[] = [
  {
    id: 'risk-assessment',
    dimension: 'Risk assessment vs action',
    gap: {
      claim:
        'The EEA\'s European Climate Risk Assessment (March 2024) identifies 36 major climate risks; more than half demand more action now, eight are particularly urgent — and its press headline is the thesis of this page.',
      quote:
        '"Europe is not prepared for rapidly growing climate risks… Europe\'s policies and adaptation actions are not keeping pace with the rapidly growing risks."',
      sources: [
        {
          label: 'EEA press release on EUCRA',
          url: 'https://www.eea.europa.eu/en/newsroom/news/europe-is-not-prepared-for',
          date: '2024-03-11',
          locator: 'quotes verbatim from the fetched release; EUCRA gives no numeric count of "critical" risks — "many" is its own word',
        },
      ],
    },
    steelman: {
      claim:
        'Adaptation governance has genuinely spread: all EEA member countries now have national adaptation policies, 24 member states report strategies, 21 report plans, and 17 of 32 countries anchor adaptation in law.',
      sources: [
        {
          label: 'EEA briefing, "From adaptation planning to action"',
          url: 'https://www.eea.europa.eu/en/analysis/publications/from-adaptation-planning-to-action',
          date: '2025-11-06',
          locator: 'figures verbatim from the fetched briefing — which also lists the remaining barriers',
        },
      ],
    },
  },
  {
    id: 'audit',
    dimension: 'The auditors\' verdict',
    gap: {
      claim:
        'The European Court of Auditors\' dedicated adaptation audit is titled "Action not keeping up with ambition": member states sometimes used outdated science, municipal awareness of EU adaptation tools was largely absent across 400 surveyed municipalities, and of 36 sampled projects 13 had little or no adaptive impact — two risked maladaptation.',
      quote:
        '"Due to these weaknesses, there is a risk that the EU adaptation policy and action might not keep pace with climate change."',
      sources: [
        {
          label: 'ECA Special report 15/2024, executive summary',
          url: 'https://www.eca.europa.eu/ECAPublications/SR-2024-15/SR-2024-15_EN.pdf',
          date: '2024-07',
          locator: '§§V–VII — PDF fetched, quotes verbatim',
        },
      ],
    },
    steelman: {
      claim:
        'The same audit found 19 of the 36 sampled projects addressed climate risks effectively — the delivery machine works where it is pointed well.',
      sources: [
        {
          label: 'ECA Special report 15/2024',
          url: 'https://www.eca.europa.eu/ECAPublications/SR-2024-15/SR-2024-15_EN.pdf',
          date: '2024-07',
          locator: '§VII — same fetched PDF',
        },
      ],
    },
  },
  {
    id: 'insurance',
    dimension: 'Who pays when it burns',
    gap: {
      claim:
        'Only about a quarter of EU climate-catastrophe losses have been insured over past decades (EIOPA; the EEA\'s 1980–2024 series says under 20 %), and per EIOPA\'s 2025 Eurobarometer only 17 % of respondents hold natural-catastrophe property cover. The ECB and EIOPA warn the gap "is likely to widen further".',
      sources: [
        {
          label: 'EIOPA speech, "Insurance protection gaps in a changing climate"',
          url: 'https://www.eiopa.europa.eu/insurance-protection-gaps-changing-climate-2026-04-16_en',
          date: '2026-04-16',
          locator: '~25 % insured; 17 % Eurobarometer — fetched',
        },
        {
          label: 'ECB/EIOPA press release on a European approach to natural catastrophes',
          url: 'https://www.ecb.europa.eu/press/pr/date/2024/html/ecb.pr241218~b6df28c7af.en.html',
          date: '2024-12-18',
          locator: '"likely to widen further" — fetched',
        },
      ],
    },
    steelman: {
      claim:
        'A concrete fix is on the table: the ECB/EIOPA proposal for an EU public-private reinsurance scheme plus a conditional public disaster fund — proposed in December 2024, though not yet delivered.',
      sources: [
        {
          label: 'ECB/EIOPA proposal press release',
          url: 'https://www.ecb.europa.eu/press/pr/date/2024/html/ecb.pr241218~b6df28c7af.en.html',
          date: '2024-12-18',
          locator: 'two-pillar proposal — fetched',
        },
      ],
    },
  },
  {
    id: 'finance',
    dimension: 'The adaptation finance gap',
    gap: {
      claim:
        'The EEA puts EU adaptation needs at €53–137bn a year by 2050 (the Commission\'s own January 2026 study says ≈€70bn a year) against committed funding of just €15–16bn a year — a gap of roughly four to eight times.',
      sources: [
        {
          label: 'EEA Briefing 18/2025, costs and benefits of adaptation',
          url: 'https://www.eea.europa.eu/en/analysis/publications/costs-and-benefits-of-adaptation-actions-in-europe',
          date: '2026-01-12',
          locator: '€53–137bn needs; €15–16bn committed — fetched',
        },
        {
          label: 'DG CLIMA news, "EU needs to invest €70 billion per year in climate adaptation"',
          url: 'https://climate.ec.europa.eu/news-other-reads/news/eu-needs-invest-eu70-billion-year-climate-adaptation-2050-2026-01-23_en',
          date: '2026-01-23',
          locator: '€70bn/yr; €30bn infrastructure / €21bn ecosystems / €12bn food security — fetched',
        },
      ],
    },
    steelman: {
      claim:
        'The economics favour closing it: the EEA cites over $10.50 of benefit per adaptation dollar over ten years, and PESETA IV found EU coastal dyke-raising costs two orders of magnitude below the flood losses it avoids.',
      quote:
        '"The average annual cost of adaptation over the period 2020-2100 would be less than 2 €billion/year for the EU and UK, which is about two orders lower than the avoided coastal flood losses by the end of the century."',
      sources: [
        {
          label: 'JRC PESETA IV final summary report',
          url: 'https://joint-research-centre.ec.europa.eu/system/files/2020-05/pesetaiv_summary_final_report.pdf',
          date: '2020-05',
          locator: 'coastal adaptation section — PDF fetched, quote verbatim',
        },
        {
          label: 'EEA Briefing 18/2025',
          url: 'https://www.eea.europa.eu/en/analysis/publications/costs-and-benefits-of-adaptation-actions-in-europe',
          date: '2026-01-12',
          locator: '$10.50 per $1 figure — fetched',
        },
      ],
    },
  },
  {
    id: 'plan',
    dimension: 'The plan that is not there yet',
    gap: {
      claim:
        'The European Climate Adaptation Plan — the Commission\'s flagship answer — was promised for the second half of 2026 and had not been published when this summer\'s bills arrived. The Board\'s February 2026 report already concluded that "adaptation efforts to date remain insufficient to prevent avoidable impacts and to manage escalating climate risks", recommending planning against 2.8–3.3 °C of warming by 2100.',
      sources: [
        {
          label: 'Climate-ADAPT, European Climate Adaptation Plan page',
          url: 'https://climate-adapt.eea.europa.eu/en/eu-policy/eu-adaptation-policy/european-climate-adaptation-plan',
          date: '2026',
          locator: '"the policy package will be presented during the 2nd half of 2026" — fetched',
        },
        {
          label: 'ESABCC adaptation report',
          url: 'https://climate-advisory-board.europa.eu/reports-and-publications/strengthening-resilience-to-climate-change-recommendations-for-an-effective-eu-adaptation-policy-framework',
          date: '2026-02-17',
          locator: 'quote verbatim from the fetched page',
        },
      ],
    },
    steelman: {
      claim:
        'Where plans exist, they save lives: France\'s post-2003 heat plan cut the 2006 heatwave toll to ~2,065 deaths against ~6,452 predicted on the 2003 temperature–mortality relationship — roughly 4,400 deaths avoided. The 2023 mortality study likewise estimates present-century adaptation cut that year\'s burden by ~45 % of what it would otherwise have been (the toll "would have been ~80 % higher").',
      sources: [
        {
          label: 'Fouillet et al., International Journal of Epidemiology (2008)',
          url: 'https://pubmed.ncbi.nlm.nih.gov/18194962/',
          date: '2008',
          locator: 'abstract figures verbatim — fetched',
        },
        {
          label: 'ISGlobal 2023 mortality study, Nature Medicine (2024)',
          url: 'https://www.nature.com/articles/s41591-024-03186-1',
          date: '2024-08',
          locator: 'adaptation counterfactual — snippet',
        },
      ],
    },
  },
  {
    id: 'response',
    dimension: 'Crisis response capacity',
    gap: {
      claim:
        'Even the largest-ever pre-season deployment was outrun: seven Civil Protection Mechanism activations for fires by early August, and a Commission official\'s own words from the fire line — "These fires are out of capacity". The European Forest Institute argues suppression-heavy budgets should move to 50-50 with prevention.',
      sources: [
        {
          label: 'Euronews, "What tools does the EU have to fight wildfires? Are they enough?"',
          url: 'https://www.euronews.com/my-europe/2026/08/04/what-tools-does-the-eu-have-to-fight-wildfires-are-they-enough',
          date: '2026-08-04',
          locator: 'quotes — fetched',
        },
        {
          label: 'Commission UCPM wildfire page',
          url: 'https://civil-protection-humanitarian-aid.ec.europa.eu/what/civil-protection/wildfires_en',
          date: '2026-08-03',
          locator: 'seven 2026 activations — fetched',
        },
      ],
    },
    steelman: {
      claim:
        'The capacity itself is real and growing: 22 firefighting aircraft and 5 helicopters staged across 12 countries, 777 pre-positioned firefighters from 14 nations — the largest ever — and a €600m-class permanent rescEU fleet with deliveries completing by 2030.',
      sources: [
        {
          label: 'Commission ECHO news, "EU deploys largest ever wildfire response for 2026"',
          url: 'https://civil-protection-humanitarian-aid.ec.europa.eu/news-stories/news/eu-deploys-largest-ever-wildfire-response-2026-summer-2026-06-02_en',
          date: '2026-06-02',
          locator: 'fleet and pre-positioning figures — fetched',
        },
        {
          label: 'Euronews on the permanent fleet',
          url: 'https://www.euronews.com/my-europe/2026/08/04/what-tools-does-the-eu-have-to-fight-wildfires-are-they-enough',
          date: '2026-08-04',
          locator: '12 planes + 5 helicopters by 2030 — fetched',
        },
      ],
    },
  },
];
