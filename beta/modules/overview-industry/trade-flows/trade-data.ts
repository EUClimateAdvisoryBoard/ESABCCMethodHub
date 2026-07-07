/**
 * Overview Industry — Trade flows (data model + seed data).
 * ---------------------------------------------------------
 * An input–output view of EU-27 manufacturing trade: for every NACE Rev. 2
 * Section C division (10–33) it maps
 *   • OUTPUT  → where EU manufacturing sells (intra-EU vs extra-EU, exports),
 *   • INPUT   → what it must import and from where (feedstocks, materials,
 *               intermediate goods), and
 *   • RISK    → the high-dependency hotspots where imports are both large and
 *               concentrated in a single supplier (the carbon-leakage / CBAM /
 *               critical-raw-materials front line).
 *
 * SCOPE (hard): NACE Rev. 2.1 **Section C — Manufacturing**, divisions 10–33,
 * matching the Clean Tech sub-page. The 24-division trade backbone
 * (`DIVISION_TRADE`) is REAL, live Eurostat data — extra-EU and intra-EU
 * imports and exports by NACE activity, EU-27 aggregate, 2023 — pulled from the
 * Eurostat dissemination API (dataset `ext_tec01`, "Trade by NACE Rev. 2
 * activity and enterprise size class", sizeclas = TOTAL). Trade is attributed
 * to the NACE activity of the trading enterprise (trade-by-enterprise-
 * characteristics), which is why e.g. C19 (refined petroleum) captures the bulk
 * of imported energy carriers handled by refiners/traders.
 *
 * SOURCING RULE (hard): every figure carries a real, working source link.
 * Nothing is invented. The trade backbone is Eurostat; import-dependency and
 * supplier-concentration figures are drawn from the European Commission / JRC
 * strategic-dependencies reviews, the Critical Raw Materials Act (Reg. (EU)
 * 2024/1252), OECD TiVA / Eurostat FIGARO (foreign value added) and Eurostat
 * energy statistics. Partner shares and material concentrations are attributed
 * to the specific source they came from and should be read as "as reported by
 * <source>", not as a single settled number.
 *
 * Reuses the `Source` / `Sourced` primitives from the Clean Tech catalogue so
 * the two sub-pages share one evidence model.
 */

import type { Source } from '../cleantech-catalogue';
export type { Source } from '../cleantech-catalogue';

/* ------------------------------------------------------------ trade branches */

/**
 * Coarse trade grouping for colour-coding the figure. Broader than the Clean
 * Tech emission branches because trade covers all 24 Section C divisions, not
 * only the energy-intensive ones.
 */
export type TradeBranch =
  | 'Metals'
  | 'Non-metallic minerals'
  | 'Chemicals, pharma & refining'
  | 'Electronics & electrical'
  | 'Machinery & transport equipment'
  | 'Consumer & light manufacturing';

export const TRADE_BRANCH_COLORS: Record<TradeBranch, string> = {
  Metals: '#3D5265',
  'Non-metallic minerals': '#B83230',
  'Chemicals, pharma & refining': '#6667AB',
  'Electronics & electrical': '#00928F',
  'Machinery & transport equipment': '#004B7F',
  'Consumer & light manufacturing': '#FF9933',
};

/* ----------------------------------------------------- per-division trade row */

export interface PartnerShare {
  /** Partner country / region, e.g. 'China', 'United States', 'United Kingdom'. */
  region: string;
  /** Approximate share of the flow, %. */
  pct: number;
}

export interface DivisionTrade {
  /** NACE Rev. 2 division code, e.g. 'C24'. */
  code: string;
  /** Short label. */
  label: string;
  branch: TradeBranch;
  /** Extra-EU imports, € bn (Eurostat ext_tec01, EU-27, 2023). */
  impExt: number;
  /** Extra-EU exports, € bn. */
  expExt: number;
  /** Intra-EU imports (member-state cross-border), € bn. */
  impInt: number;
  /** Intra-EU exports, € bn. */
  expInt: number;
  /** One-line characterisation of the trade / dependency story. */
  note: string;
  /** Top extra-EU import partners (share of extra-EU imports of the product). */
  importPartners?: PartnerShare[];
  /** Top extra-EU export destinations. */
  exportPartners?: PartnerShare[];
  /** Provenance / basis for the partner shares, when not the Eurostat backbone. */
  partnerNote?: string;
  partnerSrc?: Source;
}

/* shared sources ----------------------------------------------------------- */

export const EUROSTAT_TEC: Source = {
  org: 'Eurostat',
  title: 'Trade by NACE Rev. 2 activity and enterprise size class (ext_tec01)',
  url: 'https://ec.europa.eu/eurostat/databrowser/view/ext_tec01/default/table?lang=en',
  year: '2023',
};

export const EUROSTAT_TRADE_SE: Source = {
  org: 'Eurostat (Statistics Explained)',
  title: 'International trade in goods',
  url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_goods',
  year: '2024',
};

/**
 * REAL Eurostat backbone — EU-27 extra-EU & intra-EU imports/exports by NACE
 * Rev. 2 Section C division, 2023, € bn. Pulled live from the Eurostat
 * dissemination API (`ext_tec01`, geo = EU, sizeclas = TOTAL, unit = THS_EUR).
 * Partner shares are added per division from COMEXT / DG TRADE (see `partnerSrc`).
 */
export const DIVISION_TRADE: DivisionTrade[] = [
  { code: 'C10', label: 'Food products', branch: 'Consumer & light manufacturing',
    impExt: 52.7, expExt: 105.7, impInt: 146.9, expInt: 210.7,
    note: 'Large net exporter; imports are agri-commodities (cocoa, coffee, fish, oilseeds) the EU cannot grow.' },
  { code: 'C11', label: 'Beverages', branch: 'Consumer & light manufacturing',
    impExt: 4.1, expExt: 22.7, impInt: 19.3, expInt: 19.1,
    note: 'Strong surplus — wine & spirits are premium EU exports; little import dependency.' },
  { code: 'C12', label: 'Tobacco products', branch: 'Consumer & light manufacturing',
    impExt: 1.8, expExt: 2.4, impInt: 4.1, expInt: 3.1,
    note: 'Small, roughly balanced; raw-leaf imports from Brazil, US, Africa.' },
  { code: 'C13', label: 'Textiles', branch: 'Consumer & light manufacturing',
    impExt: 8.5, expExt: 12.6, impInt: 13.9, expInt: 24.0,
    note: 'Import-exposed on yarn & fabric; China and Turkey dominate extra-EU supply.' },
  { code: 'C14', label: 'Wearing apparel', branch: 'Consumer & light manufacturing',
    impExt: 14.8, expExt: 14.2, impInt: 8.3, expInt: 21.0,
    note: 'Net importer of finished garments — China, Bangladesh, Turkey; a classic offshored value chain.' },
  { code: 'C15', label: 'Leather & footwear', branch: 'Consumer & light manufacturing',
    impExt: 5.5, expExt: 9.8, impInt: 7.5, expInt: 15.7,
    note: 'Finished footwear imported from Asia; EU keeps a luxury-goods export edge.' },
  { code: 'C16', label: 'Wood & cork products', branch: 'Consumer & light manufacturing',
    impExt: 2.8, expExt: 12.5, impInt: 17.6, expInt: 27.5,
    note: 'Mostly intra-EU; net exporter, low extra-EU import reliance.' },
  { code: 'C17', label: 'Paper & paper products', branch: 'Consumer & light manufacturing',
    impExt: 7.1, expExt: 16.2, impInt: 30.7, expInt: 44.1,
    note: 'Net exporter but dependent on imported market pulp (Brazil, US, Nordics) and recovered fibre.' },
  { code: 'C18', label: 'Printing & recorded media', branch: 'Consumer & light manufacturing',
    impExt: 1.3, expExt: 2.7, impInt: 6.5, expInt: 6.5,
    note: 'Small, service-like; overwhelmingly intra-EU.' },
  { code: 'C19', label: 'Coke & refined petroleum', branch: 'Chemicals, pharma & refining',
    impExt: 218.4, expExt: 56.6, impInt: 63.8, expInt: 85.9,
    note: 'Largest single import bill in manufacturing — imported crude & refined fuels; the EU energy-dependency front line.' },
  { code: 'C20', label: 'Chemicals & chemical products', branch: 'Chemicals, pharma & refining',
    impExt: 54.5, expExt: 128.4, impInt: 92.2, expInt: 172.0,
    note: 'Net exporter of specialty chemicals, but base-chemical feedstock (naphtha, gas, phosphate, potash) is imported.' },
  { code: 'C21', label: 'Pharmaceuticals', branch: 'Chemicals, pharma & refining',
    impExt: 63.8, expExt: 174.6, impInt: 68.5, expInt: 110.7,
    note: "Manufacturing's biggest surplus — but active ingredients (APIs) and precursors lean heavily on India & China." },
  { code: 'C22', label: 'Rubber & plastics', branch: 'Chemicals, pharma & refining',
    impExt: 22.0, expExt: 41.6, impInt: 68.1, expInt: 105.8,
    note: 'Net exporter; natural rubber fully imported (SE Asia), plastics resins partly imported.' },
  { code: 'C23', label: 'Non-metallic minerals (cement, glass, ceramics)', branch: 'Non-metallic minerals',
    impExt: 7.7, expExt: 22.8, impInt: 25.0, expInt: 41.0,
    note: 'Bulky, mostly local; but CBAM-exposed (cement) and reliant on imported magnesia, graphite, borates.' },
  { code: 'C24', label: 'Basic metals', branch: 'Metals',
    impExt: 62.9, expExt: 67.0, impInt: 83.4, expInt: 153.4,
    note: 'Roughly balanced trade but deeply input-dependent — iron ore, coking coal, ferro-alloys, primary aluminium; CBAM core.' },
  { code: 'C25', label: 'Fabricated metal products', branch: 'Metals',
    impExt: 24.7, expExt: 53.4, impInt: 75.2, expInt: 129.6,
    note: 'Net exporter; downstream of basic metals, so inherits their input risk.' },
  { code: 'C26', label: 'Computer, electronic & optical', branch: 'Electronics & electrical',
    impExt: 67.8, expExt: 90.0, impInt: 42.7, expInt: 76.3,
    note: 'Semiconductor & electronics dependency — chips from Taiwan/Korea/China; a strategic-autonomy priority.' },
  { code: 'C27', label: 'Electrical equipment', branch: 'Electronics & electrical',
    impExt: 52.0, expExt: 75.6, impInt: 82.8, expInt: 124.3,
    note: 'Net exporter, but batteries and rare-earth permanent magnets are China-concentrated inputs.' },
  { code: 'C28', label: 'Machinery & equipment n.e.c.', branch: 'Machinery & transport equipment',
    impExt: 54.1, expExt: 219.1, impInt: 105.3, expInt: 196.2,
    note: "Europe's export champion — a €165 bn extra-EU surplus; capital goods to the world." },
  { code: 'C29', label: 'Motor vehicles & parts', branch: 'Machinery & transport equipment',
    impExt: 107.4, expExt: 267.5, impInt: 320.4, expInt: 363.4,
    note: 'Huge two-way trade; strong surplus, but exposed on batteries, magnets and chips for the EV transition.' },
  { code: 'C30', label: 'Other transport equipment (aero, rail, ships)', branch: 'Machinery & transport equipment',
    impExt: 43.0, expExt: 106.1, impInt: 30.4, expInt: 55.3,
    note: 'Aerospace-led surplus; titanium and specialty inputs are the dependency.' },
  { code: 'C31', label: 'Furniture', branch: 'Consumer & light manufacturing',
    impExt: 2.3, expExt: 11.8, impInt: 10.1, expInt: 25.1,
    note: 'Net exporter; modest extra-EU import reliance (China for low-end).' },
  { code: 'C32', label: 'Other manufacturing (medical, instruments, jewellery)', branch: 'Consumer & light manufacturing',
    impExt: 22.2, expExt: 47.4, impInt: 20.6, expInt: 39.4,
    note: 'Includes medical devices (surplus) and jewellery; mixed dependency.' },
  { code: 'C33', label: 'Repair & installation of machinery', branch: 'Machinery & transport equipment',
    impExt: 25.8, expExt: 19.7, impInt: 18.5, expInt: 7.7,
    note: 'Service-like; one of the few manufacturing divisions in extra-EU deficit.' },
];

export const DIVISION_TRADE_TOTAL = {
  impExt: 975.7,
  expExt: 1649.9,
  impInt: 1397.1,
  expInt: 2018.4,
} as const;

/* --------------------------------------------------------- partner shares */

/**
 * Extra-EU partner shares. Eurostat publishes NO partner breakdown at NACE-
 * division level, so these are the finest published alternative — extra-EU
 * partner shares by SITC section (`ext_lt_main*`, indicators PC_IMP_PART /
 * PC_EXP_PART, 2024) — mapped to the divisions each section covers. They are a
 * PROXY: read as "the product group this division belongs to", not the division
 * exactly. Division-specific skews are noted where they are strong (e.g. apparel
 * and furniture imports are far more China-weighted than the group average).
 */
export interface PartnerGroup {
  key: string;
  sitc: string;
  covers: string[];
  importPartners: PartnerShare[];
  exportPartners: PartnerShare[];
  src: Source;
}

const P_SRC = (ds: string, title: string): Source => ({
  org: 'Eurostat',
  title: `${title} — extra-EU partner shares (${ds})`,
  url: `https://ec.europa.eu/eurostat/databrowser/view/${ds}/default/table?lang=en`,
  year: '2024',
});

export const PARTNER_GROUPS: PartnerGroup[] = [
  { key: 'agri', sitc: 'SITC 0+1', covers: ['C10', 'C11', 'C12'],
    importPartners: [{ region: 'United Kingdom', pct: 10 }, { region: 'Brazil', pct: 9 }, { region: 'Norway', pct: 6 }, { region: 'United States', pct: 5 }],
    exportPartners: [{ region: 'United Kingdom', pct: 24 }, { region: 'United States', pct: 12 }, { region: 'China', pct: 5 }, { region: 'Switzerland', pct: 5 }],
    src: P_SRC('ext_lt_mainagri', 'Food, drink & tobacco') },
  { key: 'fuels', sitc: 'SITC 3', covers: ['C19'],
    importPartners: [{ region: 'United States', pct: 16 }, { region: 'Norway', pct: 11 }, { region: 'Kazakhstan', pct: 7 }, { region: 'Saudi Arabia', pct: 6 }],
    exportPartners: [{ region: 'United Kingdom', pct: 11 }, { region: 'United States', pct: 9 }, { region: 'Switzerland', pct: 6 }, { region: 'Ukraine', pct: 5 }],
    src: P_SRC('ext_lt_mainmine', 'Mineral fuels') },
  { key: 'chem', sitc: 'SITC 5', covers: ['C20', 'C21'],
    importPartners: [{ region: 'United States', pct: 24 }, { region: 'Switzerland', pct: 20 }, { region: 'China', pct: 14 }, { region: 'United Kingdom', pct: 9 }],
    exportPartners: [{ region: 'United States', pct: 31 }, { region: 'Switzerland', pct: 11 }, { region: 'United Kingdom', pct: 8 }, { region: 'China', pct: 6 }],
    src: P_SRC('ext_lt_mainchem', 'Chemicals') },
  { key: 'manu', sitc: 'SITC 6+8', covers: ['C13', 'C14', 'C15', 'C16', 'C17', 'C18', 'C22', 'C23', 'C24', 'C25', 'C31', 'C32'],
    importPartners: [{ region: 'China', pct: 31 }, { region: 'United States', pct: 8 }, { region: 'Türkiye', pct: 7 }, { region: 'United Kingdom', pct: 6 }],
    exportPartners: [{ region: 'United States', pct: 19 }, { region: 'United Kingdom', pct: 14 }, { region: 'Switzerland', pct: 9 }, { region: 'China', pct: 8 }],
    src: P_SRC('ext_lt_mainmanu', 'Other manufactured goods') },
  { key: 'mach', sitc: 'SITC 7', covers: ['C26', 'C27', 'C28', 'C29', 'C30'],
    importPartners: [{ region: 'China', pct: 36 }, { region: 'United States', pct: 13 }, { region: 'United Kingdom', pct: 7 }, { region: 'Japan', pct: 5 }],
    exportPartners: [{ region: 'United States', pct: 21 }, { region: 'United Kingdom', pct: 13 }, { region: 'China', pct: 11 }, { region: 'Türkiye', pct: 5 }],
    src: P_SRC('ext_lt_mainmach', 'Machinery & transport equipment') },
];

/** Division-specific caveats where the group proxy understates a known skew. */
export const PARTNER_SKEW_NOTES: Record<string, string> = {
  C14: 'Apparel imports specifically are far more concentrated in China, Bangladesh, Türkiye and India than the group average.',
  C19: 'Reflects the post-2022 shift away from Russia toward the US, Norway, Kazakhstan and the Middle East.',
  C21: 'Pharmaceuticals skew even more heavily to the US, Switzerland and the UK on both sides than the chemicals group.',
  C24: 'Metals imports (iron/steel, non-ferrous) lean more on China, Türkiye, India and — pre-2022 — Russia.',
  C26: 'Electronics imports are even more weighted to China, Taiwan and South Korea than the machinery group.',
  C29: 'Car imports are rising fast from China (EVs); exports go mainly to the US, UK and China.',
  C31: 'Furniture imports are dominated by China well beyond the group average.',
};

/** Resolve the partner group covering a division (undefined for C33). */
export function partnersFor(code: string): PartnerGroup | undefined {
  return PARTNER_GROUPS.find((g) => g.covers.includes(code));
}

/* ----------------------------------------------------- critical raw materials */

export interface CriticalMaterial {
  material: string;
  /** Strategic Raw Material under the CRMA (Annex I), vs merely Critical (Annex II). */
  strategic: boolean;
  /** EU import reliance, % (share of demand met by imports); null where not cleanly published. */
  euImportReliance: number | null;
  topSupplier: string;
  /** Dominant supplier's share of EU supply, %; null where obscured in trade codes. */
  supplierShare: number | null;
  usedIn: string;
  note: string;
  src: Source;
}

/**
 * Critical & strategic raw materials the EU manufactures with but barely
 * produces. Framing: Critical Raw Materials Act, Reg. (EU) 2024/1252 — 34
 * critical + 17 strategic raw materials. `supplierShare` is the EC/JRC
 * "share of EU supply" (sourcing stage) unless the source says otherwise; that
 * differs from customs trade shares, which the source notes cross-check.
 */
export const CRITICAL_MATERIALS: CriticalMaterial[] = [
  { material: 'Heavy rare earths (HREE)', strategic: true, euImportReliance: 100, topSupplier: 'China', supplierShare: 100, usedIn: 'Permanent magnets — motors, wind, EVs (C27, C28, C29)', note: 'China 100% of EU supply; no EU separation/magnet capacity at scale', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Light rare earths (LREE)', strategic: true, euImportReliance: 100, topSupplier: 'China', supplierShare: 85, usedIn: 'NdFeB magnets, catalysts (C27, C29)', note: 'China ~85% of LREE sourcing; ~98% of EU rare-earth supply overall', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Magnesium (metal)', strategic: true, euImportReliance: 100, topSupplier: 'China', supplierShare: 93, usedIn: 'Aluminium alloying, die-casting (C24, C29)', note: 'EC ~93% (Eurostat trade 92%); negligible EU primary output', src: { org: 'European Commission', title: 'COM(2020) 474 — Critical Raw Materials Resilience', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52020DC0474', year: '2020' } },
  { material: 'Borate / boron', strategic: true, euImportReliance: 100, topSupplier: 'Türkiye', supplierShare: 98, usedIn: 'Glass, ceramics, agrochemicals, magnets (C20, C23)', note: 'Türkiye 98–99% of EU supply — the reserve base is Turkish', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Cobalt', strategic: true, euImportReliance: 76, topSupplier: 'DR Congo (mining)', supplierShare: 63, usedIn: 'Batteries, superalloys (C27, C29, C20)', note: 'DRC ~63% of global mine supply; ~60% refined in China', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Natural graphite', strategic: true, euImportReliance: 100, topSupplier: 'China', supplierShare: 47, usedIn: 'Li-ion battery anodes, refractories (C27, C29)', note: 'EC ~47% EU supply; China dominant in spherical/processed graphite', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Gallium', strategic: true, euImportReliance: 100, topSupplier: 'China', supplierShare: 71, usedIn: 'Semiconductors, LEDs, GaN/RF chips (C26)', note: 'China ~71% of EU imports, ~80–90% of global refined; export-controlled since 2023', src: { org: 'Eurostat', title: 'International trade in critical raw materials', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_critical_raw_materials', year: '2025' } },
  { material: 'Germanium', strategic: true, euImportReliance: 100, topSupplier: 'China', supplierShare: 45, usedIn: 'Fibre optics, IR optics, semiconductors (C26, C27)', note: 'China ~45% of EU imports, ~80% global; export-controlled since 2023', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Lithium', strategic: true, euImportReliance: 100, topSupplier: 'Chile', supplierShare: 70, usedIn: 'EV / grid batteries (C27, C29)', note: 'Chile ~70% of EU lithium carbonate imports; battery-grade refining in China', src: { org: 'Eurostat', title: 'International trade in critical raw materials', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_critical_raw_materials', year: '2025' } },
  { material: 'Platinum-group metals', strategic: true, euImportReliance: 100, topSupplier: 'South Africa', supplierShare: 71, usedIn: 'Autocatalysts, electrolysers, glass (C20, C29)', note: 'South Africa 71% of EU platinum; higher for Ir/Rh/Ru', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Tungsten', strategic: true, euImportReliance: null, topSupplier: 'China', supplierShare: 68, usedIn: 'Cutting tools, hard metals, defence (C25, C28)', note: 'China ~68% of EU ferro-tungsten; EU retains some primary/recycled capacity', src: { org: 'Eurostat', title: 'International trade in critical raw materials', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_critical_raw_materials', year: '2025' } },
  { material: 'Niobium', strategic: false, euImportReliance: 100, topSupplier: 'Brazil', supplierShare: 92, usedIn: 'HSLA-steel micro-alloying, superalloys (C24, C30)', note: 'Brazil ~92% of global supply; no EU production', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Silicon metal', strategic: true, euImportReliance: 63, topSupplier: 'China', supplierShare: 76, usedIn: 'Aluminium alloys, silicones, PV/semis (C20, C24, C26)', note: 'China dominant globally; EU keeps some smelter capacity', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { material: 'Scandium', strategic: false, euImportReliance: 100, topSupplier: 'China', supplierShare: 66, usedIn: 'Al-Sc aerospace alloys, SOFCs (C24, C30)', note: 'China ~66% of EU supply; very thin global market', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
];

/* --------------------------------------------------- energy / feedstock reliance */

export interface EnergyDependency {
  item: string;
  naceRelevance: string;
  /** Import dependency, %; null where no single clean figure exists. */
  dependencyPct: number | null;
  year: string;
  note: string;
  src: Source;
}

/**
 * Energy & feedstock import dependency — the input side of C19 (refining) and
 * C20 (chemicals). Overall EU net energy-import dependency peaked at 62.5% in
 * 2022 and was ~57% in 2024; oil and gas per-fuel dependency both exceed 90%.
 */
export const ENERGY_FEEDSTOCK_DEPENDENCY: EnergyDependency[] = [
  { item: 'Overall net energy-import dependency', naceRelevance: 'All C (esp. C19, C20, C24)', dependencyPct: 57, year: '2024', note: 'Peaked 62.5% in 2022; ~57% in 2024 — nearly 60% of needs met by net imports', src: { org: 'Eurostat', title: 'Energy in Europe — imports dependency', url: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/wdn-20260318-1', year: '2026' } },
  { item: 'Crude oil & petroleum products', naceRelevance: 'C19 (refining)', dependencyPct: 97, year: '2023', note: 'Approx. >95%; EU domestic crude marginal. Oil ≈ 67% of EU energy imports; USA now top crude/products supplier (~16%)', src: { org: 'Eurostat', title: 'Energy production and imports', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php/Energy_production_and_imports', year: '2024' } },
  { item: 'Natural gas', naceRelevance: 'C20 (feedstock & process heat)', dependencyPct: 90, year: '2023', note: 'Approx. >90% after Groningen closure. Norway ~30%, USA ~19%, Russia ~15% (2023)', src: { org: 'Eurostat', title: 'Energy production and imports', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php/Energy_production_and_imports', year: '2024' } },
  { item: 'Russian gas share of EU gas imports', naceRelevance: 'C20, C24', dependencyPct: 15, year: '2023', note: 'Fell 45% (2021) → 24% (2022) → ~15% (2023) after the supply shock', src: { org: 'European Commission (DG ENER)', title: 'EU energy security and gas supplies', url: 'https://energy.ec.europa.eu/news/focus-eu-energy-security-and-gas-supplies-2024-02-15_en', year: '2024' } },
];

/* ------------------------------------------------------- strategic dependencies */

export interface StrategicDependency {
  family: string;
  naceDivision: string;
  ecosystem: string;
  euImportReliance: number | null;
  topSupplier: string;
  supplierShare: number | null;
  vulnerability: string;
  src: Source;
}

/**
 * EU strategic dependencies at product/family level. Source: EC SWD(2021) 352,
 * which mapped 137 products in sensitive ecosystems where the EU is highly
 * import-dependent (~6% of extra-EU goods imports); 34 judged "highly
 * vulnerable"; 99 of the 137 sit in the energy-intensive ecosystem.
 */
export const STRATEGIC_DEPENDENCIES: StrategicDependency[] = [
  { family: 'Rare-earth magnets (NdFeB)', naceDivision: 'C27/C29', ecosystem: 'Energy-intensive / raw materials', euImportReliance: 100, topSupplier: 'China', supplierShare: 98, vulnerability: 'Heavy REE 100% from China, magnets ~98%; no EU magnet-making at scale, very low substitutability', src: { org: 'European Commission', title: 'SWD(2021) 352 — Strategic dependencies and capacities', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52021SC0352', year: '2021' } },
  { family: 'Magnesium (metal)', naceDivision: 'C24', ecosystem: 'Energy-intensive industries', euImportReliance: 100, topSupplier: 'China', supplierShare: 93, vulnerability: 'Near-zero EU primary production; essential aluminium alloying agent; single-country concentration', src: { org: 'European Commission', title: 'SWD(2021) 352 — Strategic dependencies and capacities', url: 'https://commission.europa.eu/system/files/2021-05/swd-strategic-dependencies-capacities_en.pdf', year: '2021' } },
  { family: 'Active pharmaceutical ingredients (APIs)', naceDivision: 'C21', ecosystem: 'Health', euImportReliance: null, topSupplier: 'China / India', supplierShare: null, vulnerability: 'High offshore concentration of fine-chemical/API synthesis; flagged sensitive-ecosystem dependency (not per-product quantified in the SWD)', src: { org: 'European Commission', title: 'SWD(2021) 352 — Strategic dependencies and capacities', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52021SC0352', year: '2021' } },
  { family: 'Semiconductors / integrated circuits', naceDivision: 'C26', ecosystem: 'Digital', euImportReliance: null, topSupplier: 'Taiwan / East Asia', supplierShare: null, vulnerability: 'Advanced-node fabrication concentrated in East Asia; critical digital-transition dependency', src: { org: 'European Commission', title: 'SWD(2021) 352 — Strategic dependencies and capacities', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52021SC0352', year: '2021' } },
  { family: 'Borates / boron', naceDivision: 'C20/C23', ecosystem: 'Energy-intensive industries', euImportReliance: 100, topSupplier: 'Türkiye', supplierShare: 98, vulnerability: 'Turkey holds dominant global reserves; almost no EU alternative; glass, ceramics, agrochemicals', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { family: 'Platinum-group metals', naceDivision: 'C20/C29', ecosystem: 'Energy-intensive / mobility', euImportReliance: 100, topSupplier: 'South Africa', supplierShare: 71, vulnerability: 'South Africa 71% of EU platinum (more for Ir/Rh/Ru); catalysts, autocatalysts, electrolysers; no EU mining', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
];

/* -------------------------------------------------------------- risk quadrant */

export interface RiskHotspot {
  label: string;
  naceDivision: string;
  /** 0–1: share of EU demand met by imports. */
  importReliance: number;
  /** 0–1: single largest supplier's share (concentration / HHI proxy). */
  supplierConcentration: number;
  supplier: string;
  src: Source;
}

/**
 * The high-risk matrix that drives the risk-quadrant chart. Two 0–1 axes:
 * import reliance × supplier concentration. The top-right corner (high on
 * both) is where a single foreign supplier can choke an EU value chain —
 * derived from the critical-materials, strategic-dependency and energy
 * datasets above.
 */
export const RISK_HOTSPOTS: RiskHotspot[] = [
  { label: 'Rare-earth magnets (NdFeB)', naceDivision: 'C27/C29', importReliance: 1.0, supplierConcentration: 1.0, supplier: 'China', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Magnesium metal', naceDivision: 'C24', importReliance: 1.0, supplierConcentration: 0.93, supplier: 'China', src: { org: 'European Commission', title: 'COM(2020) 474 — Critical Raw Materials Resilience', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:52020DC0474', year: '2020' } },
  { label: 'Borate / boron', naceDivision: 'C20/C23', importReliance: 1.0, supplierConcentration: 0.98, supplier: 'Türkiye', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Niobium (steel micro-alloy)', naceDivision: 'C24', importReliance: 1.0, supplierConcentration: 0.92, supplier: 'Brazil', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Silicon metal', naceDivision: 'C20/C24/C26', importReliance: 0.63, supplierConcentration: 0.76, supplier: 'China', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Gallium (chip feedstock)', naceDivision: 'C26', importReliance: 1.0, supplierConcentration: 0.71, supplier: 'China', src: { org: 'Eurostat', title: 'International trade in critical raw materials', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_critical_raw_materials', year: '2025' } },
  { label: 'Platinum-group metals', naceDivision: 'C20/C29', importReliance: 1.0, supplierConcentration: 0.71, supplier: 'South Africa', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Lithium (battery)', naceDivision: 'C27/C29', importReliance: 1.0, supplierConcentration: 0.70, supplier: 'Chile', src: { org: 'Eurostat', title: 'International trade in critical raw materials', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=International_trade_in_critical_raw_materials', year: '2025' } },
  { label: 'Cobalt (batteries)', naceDivision: 'C27/C29', importReliance: 0.76, supplierConcentration: 0.63, supplier: 'DR Congo (mine)', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Natural graphite (anodes)', naceDivision: 'C27/C29', importReliance: 1.0, supplierConcentration: 0.47, supplier: 'China', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Germanium', naceDivision: 'C26/C27', importReliance: 1.0, supplierConcentration: 0.45, supplier: 'China', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Semiconductors (advanced logic)', naceDivision: 'C26', importReliance: 0.90, supplierConcentration: 0.60, supplier: 'Taiwan', src: { org: 'European Commission', title: 'SWD(2021) 352 — Strategic dependencies', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52021SC0352', year: '2021' } },
  { label: 'Titanium metal (aerospace)', naceDivision: 'C30/C25', importReliance: 1.0, supplierConcentration: 0.50, supplier: 'China / mixed', src: { org: 'European Commission', title: 'Critical Raw Materials Act — Reg. (EU) 2024/1252', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1252', year: '2024' } },
  { label: 'Crude oil / refined feedstock', naceDivision: 'C19', importReliance: 0.97, supplierConcentration: 0.16, supplier: 'USA (crude/products)', src: { org: 'Eurostat', title: 'Energy production and imports', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php/Energy_production_and_imports', year: '2024' } },
  { label: 'Natural gas (chemicals feedstock)', naceDivision: 'C20', importReliance: 0.90, supplierConcentration: 0.30, supplier: 'Norway', src: { org: 'Eurostat', title: 'Energy production and imports', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php/Energy_production_and_imports', year: '2024' } },
];

export interface HeadlineFact {
  label: string;
  value: string;
  detail: string;
  src: Source;
}

/** Headline, evidenced facts for the summary strip. */
export const HEADLINE_FACTS: HeadlineFact[] = [
  { label: 'Extra-EU manufacturing trade surplus', value: '+€674 bn', detail: 'NACE C exported €1,650 bn and imported €976 bn outside the EU in 2023 — a large aggregate surplus that masks acute input dependencies.', src: EUROSTAT_TEC },
  { label: 'Net energy-import dependency', value: '~57%', detail: 'Nearly 60% of EU energy needs are met by net imports (62.5% peak in 2022) — the input risk behind refining (C19) and chemicals (C20).', src: { org: 'Eurostat', title: 'Energy in Europe — imports dependency', url: 'https://ec.europa.eu/eurostat/web/products-eurostat-news/w/wdn-20260318-1', year: '2026' } },
  { label: 'Strategic raw materials China-dominated', value: '9 of 14', detail: 'Of the concentrated critical materials mapped here, most are sourced overwhelmingly from a single country — usually China (rare earths, magnesium, gallium, germanium, graphite, silicon…).', src: { org: 'European Commission (DG GROW)', title: 'Critical raw materials', url: 'https://single-market-economy.ec.europa.eu/sectors/raw-materials/areas-specific-interest/critical-raw-materials_en', year: '2023' } },
  { label: 'Highly import-dependent products', value: '137', detail: 'The Commission mapped 137 products (≈6% of extra-EU goods imports) where the EU is highly dependent; 34 are "highly vulnerable"; 99 sit in the energy-intensive ecosystem.', src: { org: 'European Commission', title: 'SWD(2021) 352 — Strategic dependencies and capacities', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52021SC0352', year: '2021' } },
];

export const CRMA_SOURCE: Source = {
  org: 'European Union',
  title: 'Critical Raw Materials Act — Regulation (EU) 2024/1252',
  url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32024R1252',
  year: '2024',
};

export const SWD_2021_352: Source = {
  org: 'European Commission',
  title: 'SWD(2021) 352 — Strategic dependencies and capacities',
  url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=celex%3A52021SC0352',
  year: '2021',
};

/* ---------------------------------------------- input–output: foreign content */

export interface SectorFva {
  code: string;
  label: string;
  /** Foreign value-added share of gross exports, % (EU-27 as one economy). */
  foreignValueAddedPct: number;
  /** True where read off OECD Fig. 3a (±~3pp) rather than stated numerically. */
  fvaApprox: boolean;
  fvaNote: string;
  fvaSrc: Source;
}

const OECD_TIVA_EU: Source = {
  org: 'OECD TiVA (2023 ed., ICIO)',
  title: 'GVC indicators for the European Union (data year 2020)',
  url: 'https://www.oecd.org/content/dam/oecd/en/topics/policy-sub-issues/trade-in-value-added/tiva-2023-EU27_2020.pdf',
  year: '2020',
};

/**
 * Foreign value-added share of gross exports, EU manufacturing sectors.
 * FRAMING (important): OECD TiVA treats EU-27 as a SINGLE economy, so intra-EU
 * inputs count as domestic — these are the cleanest official EU aggregate, and
 * are lower than member-state import-content figures would be. Only the TOTAL,
 * C19 and C24 are stated numerically in the OECD note; the rest are read off
 * Figure 3a (±~3pp, `fvaApprox`).
 */
export const SECTOR_IO_FVA: SectorFva[] = [
  { code: 'C19', label: 'Coke & refined petroleum', foreignValueAddedPct: 49.9, fvaApprox: false, fvaNote: 'Highest foreign content of any EU industry — crude oil is a fully imported input', fvaSrc: OECD_TIVA_EU },
  { code: 'C24', label: 'Basic metals', foreignValueAddedPct: 24.2, fvaApprox: false, fvaNote: 'Highest FVA among metals; import content via ore, ferro-alloys and energy', fvaSrc: OECD_TIVA_EU },
  { code: 'C26', label: 'Computer, electronic & optical', foreignValueAddedPct: 22, fvaApprox: true, fvaNote: 'High import content via semiconductors and components', fvaSrc: OECD_TIVA_EU },
  { code: 'C20', label: 'Chemicals', foreignValueAddedPct: 20, fvaApprox: true, fvaNote: 'Also the single largest source of foreign content in total EU exports', fvaSrc: OECD_TIVA_EU },
  { code: 'C27', label: 'Electrical equipment', foreignValueAddedPct: 19, fvaApprox: true, fvaNote: 'Import content via magnets, semiconductors, copper', fvaSrc: OECD_TIVA_EU },
  { code: 'C29', label: 'Motor vehicles', foreignValueAddedPct: 18, fvaApprox: true, fvaNote: 'Foreign content eased slightly 2022→2023 (FIGARO automotive study)', fvaSrc: OECD_TIVA_EU },
  { code: 'C28', label: 'Machinery & equipment n.e.c.', foreignValueAddedPct: 16, fvaApprox: true, fvaNote: 'Around the EU manufacturing average', fvaSrc: OECD_TIVA_EU },
  { code: 'C17', label: 'Paper & paper products', foreignValueAddedPct: 16, fvaApprox: true, fvaNote: 'Largely EU-sourced wood and recovered fibre lower import content', fvaSrc: OECD_TIVA_EU },
  { code: 'C23', label: 'Other non-metallic minerals', foreignValueAddedPct: 14, fvaApprox: true, fvaNote: 'Bulky inputs mostly domestic; critical exceptions (graphite, magnesia, borates) imported', fvaSrc: OECD_TIVA_EU },
  { code: 'C10', label: 'Food products', foreignValueAddedPct: 14, fvaApprox: true, fvaNote: 'Comparatively low import dependence; below EU manufacturing average', fvaSrc: OECD_TIVA_EU },
];

export const FVA_TOTAL_EU = {
  pct: 15.8,
  note: 'EU foreign content of exports rose from 15.0% (2008) to 15.8% (2020); OECD average 26.7%.',
  src: OECD_TIVA_EU,
} as const;

/* --------------------------------------- input–output: critical imported inputs */

export interface SectorInput {
  name: string;
  suppliers: string;
  src: Source;
}
export interface SectorInputs {
  code: string;
  label: string;
  inputs: SectorInput[];
}

const IO_S = {
  crm2023: { org: 'European Commission (RMIS)', title: 'Study on the Critical Raw Materials for the EU 2023', url: 'https://rmis.jrc.ec.europa.eu/analysis/criticality/crm_list', year: '2023' } as Source,
  eurostatEnergy: { org: 'Eurostat (Statistics Explained)', title: 'EU imports of energy products — latest developments', url: 'https://ec.europa.eu/eurostat/statistics-explained/index.php?title=EU_imports_of_energy_products_-_latest_developments', year: '2024' } as Source,
  eurlexFert: { org: 'European Commission', title: 'Ensuring availability and affordability of fertilisers (COM/2022/590)', url: 'https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:52022DC0590(01)', year: '2022' } as Source,
  cokingJRC: { org: 'JRC (RMIS)', title: 'Coking coal — supply-security briefing', url: 'https://rmis.jrc.ec.europa.eu/uploads/2200629_JRC129975_briefing_coking_coal.pdf', year: '2022' } as Source,
  scrreenAlu: { org: 'SCRREEN / EC', title: 'Aluminium and Bauxite CRM factsheet', url: 'https://scrreen.eu/wp-content/uploads/2023/01/ALUMINIUM-AND-BAUXITE_CRM_2020_Factsheets_critical_Final.pdf', year: '2020' } as Source,
  ironExports: { org: "World's Top Exports", title: 'Iron-ore exports by country', url: 'https://www.worldstopexports.com/iron-ore-exports-country/', year: '2024' } as Source,
  cepi: { org: 'CEPI', title: 'Key Statistics 2023 — European pulp & paper industry', url: 'https://www.cepi.org/wp-content/uploads/2024/09/Key-Statistics-2023-FINAL-2.pdf', year: '2023' } as Source,
  acea: { org: 'ACEA', title: 'EU battery supply chain and import reliance', url: 'https://www.acea.auto/files/ACEA_Fact_sheet-EU_battery_supply_chain_and_import_reliance.pdf', year: '2024' } as Source,
  iai: { org: 'Istituto Affari Internazionali (IAI)', title: 'Beyond the European Chips Act — EU supply-chain dependencies', url: 'https://www.iai.it/en/publications/c41/beyond-european-chips-act-eu-supply-chain-dependencies-china-taiwan-and-united', year: '2023' } as Source,
  ieaMagnets: { org: 'IEA', title: "China's share in rare-earth magnet production, 2024", url: 'https://www.iea.org/data-and-statistics/charts/china-s-share-in-rare-earth-magnet-production-2024', year: '2024' } as Source,
  dgAgri: { org: 'European Commission (DG AGRI)', title: 'Agri-food trade statistical factsheet — extra-EU', url: 'https://agriculture.ec.europa.eu/data-and-analysis/markets/trade/trade-statistics_en', year: '2024' } as Source,
};

/**
 * Critical imported intermediate inputs by sector — the granular, upstream side
 * of the input–output picture: what each EU manufacturing division must import
 * and from where. Supplier shares are "as reported by" each source.
 */
export const SECTOR_IO_INPUTS: SectorInputs[] = [
  { code: 'C24', label: 'Basic metals', inputs: [
    { name: 'Iron ore', suppliers: 'Brazil, Canada, South Africa, Ukraine (EU mines almost none)', src: IO_S.ironExports },
    { name: 'Coking / metallurgical coal', suppliers: 'Australia, USA, Canada, Mozambique, Colombia (Russia halted since Aug 2022)', src: IO_S.cokingJRC },
    { name: 'Ferro-alloys / manganese ore', suppliers: 'South Africa, Gabon', src: IO_S.crm2023 },
    { name: 'Nickel', suppliers: 'Indonesia, Russia, Philippines, Canada', src: IO_S.crm2023 },
    { name: 'Primary aluminium', suppliers: 'Russia (~33%), Mozambique (~17%), Iceland (~14%)', src: IO_S.scrreenAlu },
    { name: 'Bauxite / alumina', suppliers: 'Guinea (~70%), Brazil (~14%), Sierra Leone (~10%)', src: IO_S.scrreenAlu },
  ] },
  { code: 'C20', label: 'Chemicals', inputs: [
    { name: 'Natural gas (ammonia feedstock & energy)', suppliers: 'Norway (pipeline), US LNG, Algeria', src: IO_S.eurostatEnergy },
    { name: 'Naphtha / crude-derived feedstock', suppliers: 'Derived from imported crude oil (see C19)', src: IO_S.eurostatEnergy },
    { name: 'Phosphate rock', suppliers: 'Morocco (~28%), Russia (~23%); EU imports ~68% of phosphate nutrient', src: IO_S.eurlexFert },
    { name: 'Potash', suppliers: 'Russia + Belarus (~64% combined), Canada; EU imports ~85% of potash nutrient', src: IO_S.eurlexFert },
  ] },
  { code: 'C19', label: 'Coke & refined petroleum', inputs: [
    { name: 'Crude oil', suppliers: 'USA (~18%), Norway (~14–16%), Kazakhstan (~9%), Saudi Arabia, Libya, Nigeria, Iraq (Russia embargoed Dec 2022)', src: IO_S.eurostatEnergy },
  ] },
  { code: 'C23', label: 'Other non-metallic minerals', inputs: [
    { name: 'Natural graphite', suppliers: 'China (dominant supplier of EU imports)', src: IO_S.crm2023 },
    { name: 'Magnesite / magnesia (refractories)', suppliers: 'China (~90%+ of supply)', src: IO_S.crm2023 },
    { name: 'Borates', suppliers: 'Türkiye (~98%)', src: IO_S.crm2023 },
    { name: 'Feldspar', suppliers: 'Türkiye (leading supplier)', src: IO_S.crm2023 },
  ] },
  { code: 'C26', label: 'Computer, electronic & optical', inputs: [
    { name: 'Semiconductors / chips', suppliers: 'Taiwan (>60% of market; TSMC >90% of high-end), South Korea, China, Malaysia (assembly/test)', src: IO_S.iai },
    { name: 'Rare-earth elements', suppliers: 'China (~70% of EU imports; ~100% of heavy REEs)', src: IO_S.crm2023 },
    { name: 'Silicon metal', suppliers: 'China (leading global producer)', src: IO_S.crm2023 },
  ] },
  { code: 'C27', label: 'Electrical equipment', inputs: [
    { name: 'Permanent magnets / rare earths (NdFeB)', suppliers: 'China (~94% of magnet production)', src: IO_S.ieaMagnets },
    { name: 'Semiconductors', suppliers: 'Taiwan, South Korea', src: IO_S.iai },
    { name: 'Copper (wiring / windings)', suppliers: 'Chile, Peru (concentrate); refined imports', src: IO_S.crm2023 },
  ] },
  { code: 'C29', label: 'Motor vehicles', inputs: [
    { name: 'Li-ion battery cells & materials', suppliers: 'China (>85% of EU battery imports, 2024), South Korea', src: IO_S.acea },
    { name: 'Permanent magnets / rare earths (traction motors)', suppliers: 'China (~94% of magnets)', src: IO_S.ieaMagnets },
    { name: 'Automotive semiconductors', suppliers: 'Taiwan, plus EU/US designers', src: IO_S.iai },
  ] },
  { code: 'C28', label: 'Machinery & equipment n.e.c.', inputs: [
    { name: 'Semiconductors / electronic controls', suppliers: 'Taiwan, South Korea', src: IO_S.iai },
    { name: 'Rare-earth magnets (motors)', suppliers: 'China', src: IO_S.ieaMagnets },
    { name: 'Basic & fabricated metals', suppliers: 'Partly imported via C24 upstream', src: IO_S.scrreenAlu },
  ] },
  { code: 'C17', label: 'Paper & paper products', inputs: [
    { name: 'Wood / pulp fibre', suppliers: '~94% EU-grown; imported market pulp mainly Brazil, USA, Canada', src: IO_S.cepi },
    { name: 'Recovered paper', suppliers: '~96% sourced within the EU', src: IO_S.cepi },
  ] },
  { code: 'C10', label: 'Food products', inputs: [
    { name: 'Oilseeds / protein feed (soy)', suppliers: 'Brazil, USA, Argentina', src: IO_S.dgAgri },
    { name: 'Tropical commodities (palm oil, coffee, cocoa)', suppliers: 'Indonesia/Malaysia (palm), West Africa & Latin America (cocoa, coffee)', src: IO_S.dgAgri },
  ] },
];
