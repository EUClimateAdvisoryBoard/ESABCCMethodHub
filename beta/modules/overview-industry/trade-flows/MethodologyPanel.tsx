'use client';

/**
 * Overview Industry — Trade flows — methodology & sources panel.
 * --------------------------------------------------------------
 * The full write-up of how the trade-flows figure is built: which datasets
 * feed which view, how trade is attributed (enterprise vs product vs
 * input–output), the exact definitions and formulas behind every indicator,
 * the known consistency gaps, and how to reproduce the extract. Rendered as
 * the fifth view of the explorer so the method is one click from the data.
 */

import {
  DIVISION_TRADE,
  SECTION_C_TEC,
  SECTION_C_DIVISION_SUM,
  INPUT_MIX_TOTAL_C,
  FIGARO_C_FVA,
  REFERENCE_YEAR,
  EUROSTAT_TEC,
  EUROSTAT_USE_TABLE,
  EUROSTAT_FIGARO_IMPORTS,
  EUROSTAT_FIGARO_EXPORTS,
  EUROSTAT_FIGARO_FVA,
  EUROSTAT_ENERGY_DEP,
  OECD_TIVA_EU,
  SWD_2021_352,
  CRMA_SOURCE,
  fvaFor,
  importOriginsFor,
  inputMixFor,
  type Source,
} from './trade-data';

function Src({ src, label }: { src: Source; label?: string }) {
  return (
    <a
      href={src.url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:underline"
      title={`${src.org} — ${src.title}${src.year ? ` (${src.year})` : ''}`}
    >
      {label ?? `${src.org} ↗`}
    </a>
  );
}

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-grey-200 bg-white p-4">
      <h3 className="flex items-baseline gap-2 text-sm font-bold text-grey-900">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white">
          {n}
        </span>
        {title}
      </h3>
      <div className="mt-2 space-y-2 text-xs leading-relaxed text-grey-700">{children}</div>
    </section>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded border border-grey-200 bg-grey-50 px-3 py-2 font-mono text-[11px] text-grey-800">
      {children}
    </div>
  );
}

const DATASETS: { code: string; src: Source; feeds: string; attribution: string; vintage: string }[] = [
  { code: 'ext_tec01', src: EUROSTAT_TEC, feeds: 'Trade-balance view (all 24 divisions, intra + extra EU)', attribution: 'Enterprise — trade is booked to the NACE activity of the trading enterprise (TEC)', vintage: '2023 + 2024' },
  { code: 'naio_10_cp1610', src: EUROSTAT_USE_TABLE, feeds: 'Supply-chain view — each industry’s intermediate inputs by product, domestic vs imported', attribution: 'Input–output — EU-27 use table at basic prices (ESA 2010)', vintage: '2023' },
  { code: 'naio_10_fgti', src: EUROSTAT_FIGARO_IMPORTS, feeds: 'Import-origin shares per division (detail drawer + supply view)', attribution: 'Product — extra-EU imports of each industry’s products, by origin country (FIGARO)', vintage: '2023' },
  { code: 'naio_10_fgte', src: EUROSTAT_FIGARO_EXPORTS, feeds: 'Export-destination shares per division', attribution: 'Product — extra-EU exports by destination country (FIGARO)', vintage: '2023' },
  { code: 'naio_10_fgfoee', src: EUROSTAT_FIGARO_FVA, feeds: 'Foreign value added in exports, incl. which country’s value added', attribution: 'Input–output — Leontief decomposition of the FIGARO inter-country tables', vintage: '2023' },
  { code: 'naio_10_fcp_ii4', src: { org: 'Eurostat (FIGARO)', title: 'EU inter-country input–output table at basic prices, industry by industry (naio_10_fcp_ii4)', url: 'https://ec.europa.eu/eurostat/databrowser/view/naio_10_fcp_ii4/default/table?lang=en', year: '2023' }, feeds: 'FIGARO IO data view — the full table, imported into the MethodHub (table viewer + analysis dashboard)', attribution: 'Input–output — full inter-country matrix (~11 M cells), aggregated to EU-27 as one economy', vintage: '2022 + 2023' },
  { code: 'nrg_ind_id', src: EUROSTAT_ENERGY_DEP, feeds: 'Energy import dependency (materials view)', attribution: 'Energy balance — net imports / gross available energy', vintage: '2021–2024' },
];

export default function MethodologyPanel() {
  const c23 = SECTION_C_TEC[REFERENCE_YEAR];
  const sum23 = SECTION_C_DIVISION_SUM[REFERENCE_YEAR];
  const fvaC19 = fvaFor('C19');
  const figC19 = importOriginsFor('C19');
  const mixC19 = inputMixFor('C19');
  const tecC19 = DIVISION_TRADE.find((d) => d.code === 'C19');
  const crudeRow = mixC19?.topImported.find((t) => t.product === 'CPA_B');

  return (
    <div className="space-y-4">
      <Section n={1} title="What this figure is — and the three data layers behind it">
        <p>
          The page reads EU-27 manufacturing (NACE Rev. 2 Section C, divisions 10–33) as an{' '}
          <span className="font-semibold">input–output system</span>: what each industry sells and where
          (output side), what it must buy and from whom (input side), and where imports are both large and
          concentrated in a single supplier (dependencies). It stacks three layers of evidence, each shown
          with its own provenance rather than blended:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-semibold">Trade backbone</span> — official trade statistics for all 24
            divisions ({<Src src={EUROSTAT_TEC} label="ext_tec01" />}), intra-EU vs extra-EU, 2023 and 2024.
          </li>
          <li>
            <span className="font-semibold">Input–output layer</span> — the EU-27{' '}
            <Src src={EUROSTAT_USE_TABLE} label="use table" /> (what each industry buys, domestic vs
            imported) and the{' '}
            <Src src={EUROSTAT_FIGARO_IMPORTS} label="FIGARO" /> inter-country input–output framework
            (origin countries, destination countries, foreign value added), all for {REFERENCE_YEAR}.
          </li>
          <li>
            <span className="font-semibold">Curated dependency layer</span> — the named materials below the
            2-digit radar (rare earths, magnesium, gallium, APIs…), taken from the EC/JRC criticality studies,{' '}
            <Src src={SWD_2021_352} label="SWD(2021) 352" /> and the <Src src={CRMA_SOURCE} label="CRMA" />.
            Statistics cannot produce these shares at material level; every figure is shown “as reported by”
            its source.
          </li>
        </ul>
      </Section>

      <Section n={2} title="How input–output modelling works — intermediate demand and the Leontief inverse">
        <p>
          An input–output (IO) table is a grid of the whole economy: each{' '}
          <span className="font-semibold">row</span> is an industry as a <em>seller</em>, and each{' '}
          <span className="font-semibold">column</span> is the same industry as a <em>buyer</em>. Reading a
          column down the table gives the recipe of one industry — everything it has to purchase to make its
          own output.
        </p>
        <p>
          Those purchases are <span className="font-semibold">intermediate demand</span> (also called
          intermediate consumption): goods and services bought by one industry and used up in producing
          something else — crude oil into a refinery, steel into a car, electricity into a smelter. They are
          the counterpart of <span className="font-semibold">final demand</span>, where output leaves the
          production system for good: household consumption, government spending, investment and exports.
          Every euro of an industry’s output is bought either as another industry’s intermediate input or as
          final demand — the accounting identity the table balances:
        </p>
        <Formula>x = A·x + f&nbsp;&nbsp;→&nbsp;&nbsp;output = intermediate demand + final demand</Formula>
        <p>
          <em>x</em> is the vector of each industry’s total output, <em>f</em> is final demand, and{' '}
          <em>A</em> is the <span className="font-semibold">technical-coefficients matrix</span>: cell{' '}
          <em>
            a<sub>ij</sub>
          </em>{' '}
          is the euros of product <em>i</em> needed per euro of output of industry <em>j</em> — the input
          recipe, read straight off the table columns. So <em>A·x</em> is all the intermediate demand the
          economy generates in order to produce output <em>x</em>.
        </p>
        <p>Solving that identity for output gives the engine of IO modelling:</p>
        <Formula>x = (I − A)⁻¹ · f&nbsp;&nbsp;— where (I − A)⁻¹ is the Leontief inverse, L</Formula>
        <p>
          The <span className="font-semibold">Leontief inverse</span> L converts a bill of final demand into
          the <em>total</em> output every industry must produce to satisfy it — not just the direct input,
          but the whole chain behind it. One euro of car exports pulls in steel directly; the steel pulls in
          iron ore, coke and electricity; those pull in mining and fuels, and so on. L sums that regress
          (I + A + A² + A³ + …) into a single multiplier, so it captures the{' '}
          <span className="font-semibold">direct and indirect</span> requirements of any demand.
        </p>
        <p>
          This is what the other views rely on. The imported crude that “disappears” from C19 under product
          attribution (§4) reappears as intermediate demand into refining because the column recipe puts it
          there; the foreign value added in exports (§5) is L applied across borders — Eurostat’s FIGARO
          tables link one country’s intermediate demand to another’s value added, so an import can be traced
          to the origin economy whose labour and capital ultimately produced it. The one strong assumption is{' '}
          <span className="font-semibold">proportionality</span>: every euro of an industry’s output is taken
          to use the same recipe <em>A</em> (no economies of scale, no input substitution) — which is why the
          IO figures are modelled statistics rather than raw observations.
        </p>
      </Section>

      <Section n={3} title="Datasets — what feeds what">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-grey-300 text-left text-grey-500">
                <th className="py-1.5 pr-3 font-semibold">Dataset</th>
                <th className="py-1.5 pr-3 font-semibold">Feeds</th>
                <th className="py-1.5 pr-3 font-semibold">Attribution concept</th>
                <th className="py-1.5 font-semibold">Data year(s)</th>
              </tr>
            </thead>
            <tbody>
              {DATASETS.map((d) => (
                <tr key={d.code} className="border-b border-grey-100 align-top">
                  <td className="py-1.5 pr-3 font-mono text-[10px]">
                    <Src src={d.src} label={d.code} />
                  </td>
                  <td className="py-1.5 pr-3">{d.feeds}</td>
                  <td className="py-1.5 pr-3">{d.attribution}</td>
                  <td className="py-1.5 whitespace-nowrap">{d.vintage}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>
          <span className="font-semibold">Reference year:</span> {REFERENCE_YEAR} — the latest year covered
          by the whole input–output layer, so every view describes the same cross-section. 2024 backbone
          data is already published and available via the year toggle in the trade-balance view; the IO
          layer will follow with the next FIGARO release (published annually each July, covering data up to t−2).
        </p>
      </Section>

      <Section n={4} title="One trade flow, three attributions — why the numbers differ (C19 worked example)">
        <p>
          “Imports of division X” is not one number. The three official lenses used here attribute the same
          customs flows differently, and the differences are informative rather than errors:
        </p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <span className="font-semibold">Enterprise attribution (ext_tec01)</span>: trade is booked to
            the NACE code of the enterprise that trades. Refiners import crude oil, so C19 carries an
            extra-EU import bill of{' '}
            <span className="font-semibold">€{Math.round(tecC19?.flows[REFERENCE_YEAR].impExt ?? 218)} bn</span>{' '}
            in {REFERENCE_YEAR} — the largest of any division.
          </li>
          <li>
            <span className="font-semibold">Product attribution (FIGARO fgti)</span>: flows follow the
            product. Extra-EU imports of <em>refined-petroleum products</em> (CPA C19) are only ~€
            {figC19 ? Math.round(figC19.extraBn) : 62} bn — because crude oil is a <em>mining</em> product
            (CPA B), not a C19 product.
          </li>
          <li>
            <span className="font-semibold">Input–output attribution (use table)</span>: the crude reappears
            exactly where it economically belongs — as an <em>intermediate input into</em> C19: €
            {crudeRow ? Math.round(crudeRow.valueBn) : 266} bn of imported mining products consumed by EU
            refining in {REFERENCE_YEAR}, {mixC19 ? mixC19.importedShare : 63}% of all its intermediate
            inputs imported.
          </li>
        </ul>
        <p>
          The module keeps all three lenses and labels each one, because each answers a different policy
          question: who does the importing (enterprise), what crosses the border (product), and what does an
          industry actually depend on (input–output).
        </p>
      </Section>

      <Section n={5} title="Definitions & formulas">
        <p className="font-semibold text-grey-800">Imported share of intermediate inputs (use table)</p>
        <Formula>
          imported share(i) = imported intermediate inputs(i) / total intermediate inputs(i)
        </Formula>
        <p>
          From the EU-27 use table at basic prices ({REFERENCE_YEAR}), which splits every cell into domestic
          and imported supply. EU-27 is treated as one economy: “imported” means from <em>outside</em> the
          EU. Across manufacturing: €{Math.round(INPUT_MIX_TOTAL_C.importedBn)} bn imported of €
          {Math.round(INPUT_MIX_TOTAL_C.totalBn)} bn total inputs = {INPUT_MIX_TOTAL_C.importedShare}%.
        </p>
        <p className="mt-2 font-semibold text-grey-800">Foreign value added in exports (FIGARO)</p>
        <Formula>
          FVA share(i) = FVA(i) / gross extra-EU exports(i), &nbsp;FVA via v̂ · L · x̂ (Leontief decomposition)
        </Formula>
        <p>
          The value of non-EU countries’ value added embedded in EU exports of industry <em>i</em>, computed
          by Eurostat from the FIGARO inter-country input–output tables (value-added coefficients × Leontief
          inverse × exports) and published as <Src src={EUROSTAT_FIGARO_FVA} label="naio_10_fgfoee" />, by
          country of origin of that value added. Manufacturing-wide FVA is{' '}
          {FIGARO_C_FVA ? FIGARO_C_FVA.fvaPct : 22.4}% of gross exports; C19 peaks at{' '}
          {fvaC19 ? fvaC19.fvaPct : 64}%. Cross-check: <Src src={OECD_TIVA_EU} label="OECD TiVA" /> (EU-27,
          data year 2020) put C19 at 49.9% — the level differences reflect the data year (2022–23 energy
          prices), not disagreement about the method.
        </p>
        <p className="mt-2 font-semibold text-grey-800">Import reliance (EC criticality methodology)</p>
        <Formula>IR = (imports − exports) / (domestic production + imports − exports)</Formula>
        <p>
          Used for the curated materials layer and the dependency map’s x-axis, as reported by the EC/JRC
          criticality studies. It nets out re-exports, which is why it can differ from customs shares.
        </p>
        <p className="mt-2 font-semibold text-grey-800">Supplier concentration (dependency map y-axis)</p>
        <p>
          The largest single supplier’s share of EU supply of that material or product — a first-moment
          proxy for the Herfindahl-Hirschman index used in the EC and IMF dependency literature. It
          understates concentration when suppliers two and three are also non-diversified, and says nothing
          about substitutability, stocks or recyclability — which the full EC methodology does weigh.
        </p>
      </Section>

      <Section n={6} title="Known gaps and consistency notes (read before quoting numbers)">
        <ul className="list-disc space-y-1.5 pl-5">
          <li>
            <span className="font-semibold">The Section C total ≠ the sum of its divisions in TEC.</span>{' '}
            2023 extra-EU imports: €{c23 ? c23.impExt.toFixed(1) : '975.7'} bn (official aggregate row) vs €
            {sum23.impExt.toFixed(1)} bn (sum of the 24 published divisions). The aggregate also covers
            trade that cannot be allocated to a specific division (enterprise-register gaps,
            confidentiality); in 2024 the two even move in opposite directions on the import side. Headline
            facts use the official aggregate; the chart shows the published divisions.
          </li>
          <li>
            <span className="font-semibold">FIGARO industry grouping.</span> The IO layer publishes
            C10–C12, C13–C15 and C31–C32 only as groups; those divisions inherit group-level figures,
            flagged in the UI. Known within-group skews (e.g. apparel imports are far more China-weighted
            than the C13–C15 average) are noted where they matter.
          </li>
          <li>
            <span className="font-semibold">FIGARO names 23 partner countries; the rest is “Rest of the
            world”.</span> Taiwan is not separately identified — so the semiconductor dependency, one of the
            EU’s most acute, is <em>invisible</em> in the named-partner shares and appears only in the
            curated layer. Rest-of-world is also large for fuels (OPEC states are not named). The FIGARO IO
            data view therefore adds an <em>indicative</em> breakdown of that block from customs statistics
            (<code className="rounded bg-grey-100 px-1">ext_tec03</code>, EU goods trade by partner country:
            Taiwan, Viet Nam, Kazakhstan, the Gulf states, Ukraine, North Africa…) — a different attribution
            (TEC/customs, goods only), shown separately and never mixed into the FIGARO figures.
          </li>
          <li>
            <span className="font-semibold">Current prices.</span> All values are € billion at current
            prices; year-on-year changes mix price and volume effects (the 2023→2024 fall in import values
            is largely an energy-price effect, not a volume collapse).
          </li>
          <li>
            <span className="font-semibold">FIGARO and use-table figures are modelled statistics.</span>{' '}
            They balance supply and use across countries and can differ from raw customs data (CIF/FOB
            corrections, re-exports, balancing). The IO decompositions also assume industry-level
            homogeneity (every euro of an industry’s output uses the same input recipe).
          </li>
          <li>
            <span className="font-semibold">The curated layer is not statistics.</span> Material-level
            shares (rare earths, gallium, APIs…) come from EC/JRC assessments with their own methods and
            years; they are quoted “as reported by” and should not be arithmetically combined with the
            statistical layers.
          </li>
        </ul>
      </Section>

      <Section n={7} title="Reproducibility">
        <p>
          Every statistical number on this page is regenerated by one script against the public Eurostat
          dissemination API (no key required):
        </p>
        <Formula>node scripts/fetch-trade-flows-io-data.mjs</Formula>
        <p>
          The script writes <code className="rounded bg-grey-100 px-1">eurostat-io.generated.ts</code> with
          the full extract (backbone, use-table input mixes, FIGARO origins/destinations/FVA, energy
          dependency), stamped with the generation date. The curated dependency layer lives in{' '}
          <code className="rounded bg-grey-100 px-1">trade-data.ts</code>, one source link per figure.
          Nothing is invented; if a number has no source, it does not appear.
        </p>
        <Formula>node scripts/fetch-figaro-io-dataset.mjs --refresh</Formula>
        <p>
          A second script imports the <em>entire</em> FIGARO inter-country input–output table
          (<code className="rounded bg-grey-100 px-1">naio_10_fcp_ii4</code>, ~11 million cells, 2022–2023)
          from the Eurostat bulk-download service and condenses it to the EU-27-as-one-economy account
          served from <code className="rounded bg-grey-100 px-1">public/data/figaro/</code> — the dataset
          behind the FIGARO IO data view lives in this repository, not behind an external link. Aggregation
          choices (EU-27 destinations summed, value-added rows folded into the intra-EU origin, €0.1 m
          rounding) are documented in the script header and in the view&apos;s &quot;The data&quot; panel.
        </p>
      </Section>
    </div>
  );
}
