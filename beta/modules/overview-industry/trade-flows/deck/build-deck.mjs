import fs from 'node:fs';

const HERE = new URL('.', import.meta.url);
const MEDIA = new URL('./assets/', HERE);
const logoColor = 'data:image/png;base64,' + fs.readFileSync(new URL('esabcc-logo-color.png', MEDIA)).toString('base64');
const logoWhite = 'data:image/png;base64,' + fs.readFileSync(new URL('esabcc-logo-white.png', MEDIA)).toString('base64');

/* ------------------------------------------------------------------ data */
// Trade backbone, top divisions by 2023 extra-EU net balance (€ bn) — Eurostat ext_tec01
const TRADE = [
  ['C28', 'Machinery & equipment n.e.c.', 54.1, 219],
  ['C29', 'Motor vehicles & parts', 107, 268],
  ['C21', 'Pharmaceuticals', 63.8, 175],
  ['C20', 'Chemicals & chemical products', 54.5, 128],
  ['C30', 'Other transport equipment', 43.0, 106],
  ['C10', 'Food products', 52.7, 106],
  ['C25', 'Fabricated metal products', 24.7, 53.4],
  ['C27', 'Electrical equipment', 52.0, 75.6],
  ['C26', 'Computer, electronic & optical', 67.8, 90.0],
  ['C24', 'Basic metals', 79.6, 79.9],
];

// Import reliance x single-supplier concentration (EC/JRC criticality methodology), 0–100
// [label, nace, reliance, concentration, supplier, supplierClass]
const HOTSPOTS = [
  ['Rare-earth magnets (NdFeB)', 'C27 / C29', 100, 100, 'China', 'a'],
  ['Borate / boron', 'C20 / C23', 100, 98, 'Türkiye', 'b'],
  ['Magnesium (metal)', 'C24', 100, 93, 'China', 'a'],
  ['Niobium (steel micro-alloy)', 'C24', 100, 92, 'Brazil', 'c'],
  ['Gallium (chip feedstock)', 'C26', 100, 77, 'China', 'a'],
  ['Silicon metal', 'C20 / C24 / C26', 63, 76, 'China', 'a'],
  ['Platinum-group metals', 'C20 / C29', 100, 71, 'South Africa', 'd'],
  ['Lithium (battery)', 'C27 / C29', 100, 70, 'Chile', 'c'],
  ['Cobalt (battery)', 'C27 / C29', 76, 63, 'DR Congo', 'd'],
  ['Semiconductors (advanced logic)', 'C26', 90, 60, 'Taiwan', 'b'],
];

// Critical raw materials — dominant supplier's share of EU supply (%)
const MATERIALS = [
  ['Heavy rare earths', 100, 'China', 'a', 'Permanent magnets — motors, wind, EVs'],
  ['Borate / boron', 98, 'Türkiye', 'b', 'Glass, ceramics, agrochemicals'],
  ['Magnesium', 93, 'China', 'a', 'Aluminium alloying, die-casting'],
  ['Niobium', 92, 'Brazil', 'c', 'HSLA-steel micro-alloying'],
  ['Light rare earths', 85, 'China', 'a', 'NdFeB magnets, catalysts'],
  ['Gallium', 77, 'China', 'a', 'Semiconductors, LEDs, RF chips'],
  ['Silicon metal', 76, 'China', 'a', 'Alloys, silicones, PV / semis'],
  ['Platinum-group metals', 71, 'South Africa', 'd', 'Catalysts, electrolysers'],
  ['Lithium', 70, 'Chile', 'c', 'EV / grid batteries'],
  ['Tungsten', 68, 'China', 'a', 'Cutting tools, hard metals'],
];

// Manufactured / finished products — largest supplier's share (%)
const PRODUCTS = [
  ['Solar PV panels & cells', 98, 'China', 'a', 'Clean-tech'],
  ['Semiconductors (advanced logic)', 92, 'Taiwan', 'b', 'Electronics'],
  ['Portable computers / laptops', 90, 'China', 'a', 'Electronics'],
  ['Lithium-ion battery cells', 87, 'China', 'a', 'Clean-tech'],
  ['Natural rubber (tyre feedstock)', 65, 'SE Asia', 'c', 'Rubber & plastics'],
  ['Heat pumps (air-source)', 60, 'China', 'a', 'Clean-tech'],
  ['Active pharmaceutical ingredients', 45, 'China / India', 'a', 'Pharmaceuticals'],
  ['Apparel & clothing', 29, 'China', 'a', 'Consumer goods'],
];

const ENERGY = [
  ['57.3%', 'Net energy-import dependency', 'All C, esp. C19 / C20 / C24', 'Net imports as a share of gross available energy (2024). 62.5% at the 2022 peak.'],
  ['96.6%', 'Oil & petroleum products', 'C19 — refining', 'EU domestic crude output is marginal; the United States is now the largest crude supplier.'],
  ['85%', 'Natural gas', 'C20 — feedstock & process heat', '97.6% at the 2022 peak; Norwegian pipeline gas and US LNG account for most replacement volume.'],
  ['15%', 'Russian gas share of imports', 'C20 / C24', 'Recomposed from 45% (2021) to 24% (2022) to ~15% (2023) over a multi-year horizon.'],
];

const SUP = {
  a: 'var(--c-navy)', b: 'var(--c-purple)', c: 'var(--c-green)', d: 'var(--c-orange)',
};
const SUP_NAME = { a: 'China', b: 'Taiwan / Türkiye', c: 'Latin America / SE Asia', d: 'Africa' };

const eur = (v) => (Math.abs(v) >= 100 ? Math.round(v) : v.toFixed(1));
const net = (imp, exp) => Math.round(exp - imp);

/* ------------------------------------------------------------- fragments */

function tradeRows() {
  const maxImp = Math.max(...TRADE.map((d) => d[2]));
  const maxExp = Math.max(...TRADE.map((d) => d[3]));
  const scale = 100 / (maxImp + maxExp); // % of track
  return TRADE.map(([code, label, imp, exp], i) => {
    const impPct = imp * scale;
    const expPct = exp * scale;
    const n = net(imp, exp);
    return `
      <div class="trow" style="--d:${i * 45}ms">
        <div class="trow-label"><span class="tcode">${code}</span> ${label}
          <span class="tnet">+€${n} bn net</span></div>
        <div class="tbars">
          <div class="tbar-left"><span class="tval">€${eur(imp)}</span><i class="bar imp" style="--w:${impPct}%"></i></div>
          <div class="tbar-right"><i class="bar exp" style="--w:${expPct}%"></i><span class="tval">€${eur(exp)}</span></div>
        </div>
      </div>`;
  }).join('');
}

function meterRows(rows, twoMeters) {
  return rows.map((r, i) => {
    if (twoMeters) {
      const [label, nace, rel, conc, sup, cls] = r;
      return `
      <tr style="--d:${i * 45}ms">
        <td class="m-name">${label}<span class="m-sub">${nace}</span></td>
        <td class="m-cell"><div class="meter"><i style="--w:${rel}%;background:var(--teal)"></i></div><span class="m-pct">${rel}%</span></td>
        <td class="m-cell"><div class="meter"><i style="--w:${conc}%;background:${SUP[cls]}"></i></div><span class="m-pct">${conc}%</span></td>
        <td class="m-sup" style="color:${SUP[cls]}">${sup}</td>
      </tr>`;
    }
    const [label, share, sup, cls, use] = r;
    return `
      <tr style="--d:${i * 45}ms">
        <td class="m-name">${label}<span class="m-sub">${use}</span></td>
        <td class="m-cell wide"><div class="meter"><i style="--w:${share}%;background:${SUP[cls]}"></i></div><span class="m-pct">${share}%</span></td>
        <td class="m-sup" style="color:${SUP[cls]}">${sup}</td>
      </tr>`;
  }).join('');
}

function productRows() {
  return PRODUCTS.map((r, i) => {
    const [label, share, sup, cls, cat] = r;
    return `
      <div class="prow" style="--d:${i * 45}ms">
        <div class="p-name">${label}<span class="p-cat">${cat}</span></div>
        <div class="p-track"><i class="bar" style="--w:${share}%;background:${SUP[cls]}"></i></div>
        <div class="p-pct">${share}%</div>
        <div class="p-sup" style="color:${SUP[cls]}">${sup}</div>
      </div>`;
  }).join('');
}

function energyCards() {
  return ENERGY.map((e, i) => `
    <div class="ecard" style="--d:${i * 90}ms">
      <div class="efig">${e[0]}</div>
      <div class="elabel">${e[1]}</div>
      <div class="enace">${e[2]}</div>
      <div class="enote">${e[3]}</div>
    </div>`).join('');
}

const supplierLegend = `
  <div class="legend">
    <span><i style="background:var(--c-navy)"></i>China</span>
    <span><i style="background:var(--c-purple)"></i>Taiwan · Türkiye</span>
    <span><i style="background:var(--c-green)"></i>Latin America · SE Asia</span>
    <span><i style="background:var(--c-orange)"></i>Sub-Saharan Africa</span>
  </div>`;

const logoMark = (white) => `<img class="logo-mark" src="${white ? logoWhite : logoColor}" alt="European Scientific Advisory Board on Climate Change">`;

const point = (n, title, body, teal) =>
  `<div class="point"><span class="pn${teal ? ' n' : ''}">${n}</span><div class="pt"><h3>${title}</h3><p>${body}</p></div></div>`;

/* -------------------------------------------------------------- slides */
const slides = [];

// 1 — Cover
slides.push(`
<section class="slide cover" data-label="Cover">
  <div class="cover-grid"></div>
  <div class="cover-top anim">
    <div class="brandline"><span>ESABCC</span><i class="pulse"></i><span>Method Hub · Overview Industry</span></div>
    <div class="brandline r">Status quo · Reference year 2023</div>
  </div>
  <div class="cover-body">
    <div class="cover-lead">
      <div class="kicker anim"><i class="rule"></i>Trade flows & input dependencies</div>
      <h1 class="anim">EU manufacturing:<br>the <em>trade balance</em> and the<br>inputs behind it.</h1>
      <p class="cover-lede anim">An input–output reading of EU-27 manufacturing trade (NACE Rev. 2 Section&nbsp;C,
        divisions&nbsp;10–33): a large export surplus, and the imported inputs on which it depends —
        with what the pattern implies for <b>competitiveness</b> and <b>geopolitical resilience</b>.</p>
    </div>
    <div class="cover-figs anim">
      ${[['+€674 bn', 'Extra-EU manufacturing trade surplus'],
         ['22.4%', 'Foreign value added in exports'],
         ['19.2%', 'Imported intermediate inputs'],
         ['24.4%', 'China share of extra-EU imports']]
        .map(([v, l]) => `<div class="cfig"><div class="cfig-v">${v}</div><div class="cfig-l">${l}</div></div>`).join('')}
    </div>
  </div>
  <div class="cover-foot anim">
    ${logoMark(false)}
    <div class="cover-foot-r">
      <span>Eurostat · FIGARO · European Commission (DG GROW / DG ENER / JRC)</span>
      <span class="muted">11 slides · a neutral, source-linked status assessment</span>
    </div>
  </div>
</section>`);

// 2 — State of play (headline figures)
slides.push(`
<section class="slide" data-label="State of play">
  ${kick('01', 'The state of play', 'Four figures, read together')}
  <h2 class="s-title anim">A surplus on the <em>output</em> side, reliance on the <em>input</em> side.</h2>
  <p class="s-lede anim">EU manufacturing runs a large external surplus in high-value branches. The same account shows that a
    material share of export value, and of the inputs behind it, originates outside the Union.</p>
  <div class="stat-grid anim-children">
    ${[['+€674 bn', 'Extra-EU trade surplus', 'NACE C exported €1 650 bn and imported €976 bn outside the EU in 2023 (+€843 bn in 2024 as the energy-import bill declined).', 'teal'],
       ['22.4%', 'Foreign value added in exports', 'Of every €100 of extra-EU manufacturing exports, ~€22 is value added created abroad and embedded through imported inputs (FIGARO, 2023).', 'navy'],
       ['19.2%', 'Imported intermediate inputs', 'EU-27 manufacturing consumed ~€6.2 tn of intermediate inputs in 2023; €1 196 bn of it imported (use table, basic prices).', 'purple'],
       ['24.4%', 'China share of extra-EU imports', 'Largest single origin of extra-EU imports of manufactured products (FIGARO, 2023) — more concentrated in specific inputs.', 'orange']]
      .map(([v, l, d, c]) => `<div class="stat s-${c}"><div class="stat-v">${v}</div><div class="stat-l">${l}</div><div class="stat-d">${d}</div></div>`).join('')}
  </div>
  ${src('Eurostat ext_tec01; FIGARO application datasets; EU-27 use table at basic prices (2023).')}
</section>`);

// 3 — Trade backbone
slides.push(`
<section class="slide cream" data-label="Trade backbone">
  ${kick('02', 'Trade backbone · Eurostat ext_tec01', 'Where the EU sells and buys')}
  <h2 class="s-title anim">Extra-EU <em>imports</em> and <em>exports</em>, by division.</h2>
  <p class="s-lede anim">Top Section C divisions by net trade balance, € bn, 2023. The surplus concentrates in machinery,
    vehicles, pharmaceuticals and chemicals — capital- and research-intensive branches.</p>
  <div class="trade anim">
    <div class="trade-head"><span class="lg imp">◂ Imports (extra-EU)</span><span class="lg exp">Exports (extra-EU) ▸</span></div>
    ${tradeRows()}
  </div>
  ${src('Eurostat ext_tec01 (EU-27, enterprise-based attribution, € bn current prices). Section C 2023: exports €1 650 bn · imports €976 bn.')}
</section>`);

// 4 — Import dependency board
slides.push(`
<section class="slide" data-label="Input dependencies">
  ${kick('03', 'Input dependencies', 'Reliance and supplier concentration')}
  <h2 class="s-title anim">Where import reliance and supplier concentration <em>coincide</em>.</h2>
  <p class="s-lede anim">Two independent measures — the share of EU demand met by imports, and the largest supplier's share of
    that supply. Materials high on both are the focus of the Critical Raw Materials Act and CBAM.</p>
  <table class="mtable anim">
    <thead><tr><th>Material</th><th>Import reliance</th><th>Supplier concentration</th><th>Largest supplier</th></tr></thead>
    <tbody>${meterRows(HOTSPOTS, true)}</tbody>
  </table>
  ${src('EC/JRC criticality studies; Eurostat CRM trade; SWD(2021) 352. EC criticality methodology — reported as the source\'s assessment, not customs arithmetic.')}
</section>`);

// 5 — Critical raw materials
slides.push(`
<section class="slide white" data-label="Raw materials">
  ${kick('04', 'Critical raw materials · CRMA', 'Dominant supplier share of EU supply')}
  <h2 class="s-title anim">The <em>feedstocks</em> the EU consumes but produces little of.</h2>
  <p class="s-lede anim">For several strategic materials a single country supplies most of EU demand — spanning magnets,
    batteries, semiconductors and steel micro-alloying. Bars show the dominant supplier's share of EU supply (EC/JRC).</p>
  <table class="mtable single anim">
    <thead><tr><th>Material</th><th>Dominant supplier share of EU supply</th><th>Supplier</th></tr></thead>
    <tbody>${meterRows(MATERIALS, false)}</tbody>
  </table>
  ${src('EC (DG GROW) critical raw materials; Eurostat CRM trade; CRMA Reg. (EU) 2024/1252. Supplier share = share of EU supply.')}
</section>`);

// 6 — Manufactured products
slides.push(`
<section class="slide cream" data-label="Manufactured goods">
  ${kick('05', 'Manufactured products', 'The finished-goods dimension')}
  <h2 class="s-title anim">Import reliance also runs through <em>finished goods.</em></h2>
  <p class="s-lede anim">Beyond raw materials, several manufactured products — clean-tech equipment, electronics, medicines — are
    sourced predominantly from one origin. Bars show the largest supplier's share of extra-EU supply.</p>
  <div class="prod anim">${productRows()}</div>
  ${src('Eurostat green-trade & China-trade statistics; ACEA; IEA; peer-reviewed pharmaceutical-API study. Share basis varies by row.')}
</section>`);

// 7 — Energy & feedstock
slides.push(`
<section class="slide" data-label="Energy & feedstock">
  ${kick('06', 'Energy & feedstock', 'The input side of refining & chemicals')}
  <h2 class="s-title anim">Refining and chemicals run on <em>imported</em> energy and feedstock.</h2>
  <p class="s-lede anim">The 2022 supply shock was absorbed over a multi-year horizon through supplier diversification; the structural
    level of energy-import dependency remains high.</p>
  <div class="ecards anim-children">${energyCards()}</div>
  <div class="eband anim">
    <div class="eband-t">Supplier recomposition, not reduced dependency</div>
    <p>Russian gas moved from 45% of EU gas imports (2021) to ~15% (2023); Norwegian pipeline gas and US LNG supplied
       most of the replacement volume, and the United States became the largest crude supplier after the December 2022
       embargo. Aggregate import dependency was maintained while the supplier mix changed.</p>
  </div>
  ${src('Eurostat nrg_ind_id (net imports / gross available energy); European Commission (DG ENER) gas-supply figures.')}
</section>`);

// 8 — Competitiveness
slides.push(`
<section class="slide blue" data-label="Competitiveness">
  ${kick('07', 'Implication · Competitiveness', 'What the pattern implies', true)}
  <h2 class="s-title anim">For EU <em>competitiveness</em>: strength in output, exposure in inputs.</h2>
  <div class="two-col anim-children">
    ${point('A', 'Revealed strength in high-value branches', 'The €674 bn surplus concentrates in machinery, motor vehicles, pharmaceuticals and chemicals — capital- and R&amp;D-intensive segments where the EU holds comparative advantage and price-setting capacity.')}
    ${point('B', 'Competitiveness is partly imported', 'With ~22% foreign value added in exports and 19% of intermediate inputs imported, input cost and availability transmit directly to output competitiveness — a channel that widened with the post-2022 energy-price gap for energy-intensive branches (C19, C20, C24).')}
    ${point('C', 'Value capture in the transition technologies', 'The EU competes strongly in deploying clean technologies, while much of the equipment itself — solar modules, battery cells, heat pumps — is imported. Where manufacturing value is captured is an open question for the value chains on which future competitiveness rests.')}
    ${point('D', 'Concentration as a cost and lead-time variable', 'Single-supplier concentration in magnets, chips and battery materials introduces price-pass-through and lead-time sensitivity into precisely the inputs that scale with electrification and digitalisation.')}
  </div>
  ${src('Synthesis of the trade, input–output and dependency layers above. Framing consistent with EC competitiveness and Draghi-report analysis.', true)}
</section>`);

// 9 — Geopolitical resilience
slides.push(`
<section class="slide" data-label="Resilience">
  ${kick('08', 'Implication · Geopolitical resilience', 'What the pattern implies')}
  <h2 class="s-title anim">For <em>geopolitical resilience</em>: reliance is high, adjustment is demonstrable.</h2>
  <div class="two-col anim-children">
    ${point('A', 'Continuity depends on few origins', 'For several strategic materials one country supplies most of EU demand, so supply continuity is sensitive to the bilateral relationship and policy environment of a small set of origin countries.', true)}
    ${point('B', 'Concentration is an active policy variable', 'Export controls on gallium and germanium (2023) show that supplier concentration can be adjusted by policy, not only by markets — relevant to semiconductors, magnets and battery materials.', true)}
    ${point('C', 'The energy case is a resilience precedent', 'The recomposition of gas supply after 2022 indicates that diversification at scale is feasible over a multi-year horizon when policy, infrastructure and procurement align — while confirming that structural dependency persists where no domestic substitute exists.', true)}
    ${point('D', 'An emerging instrument set', 'The Critical Raw Materials Act, the Net-Zero Industry Act, the Chips Act and CBAM map directly onto the reliance pattern; resilience turns on diversification, recycling and circularity, stockpiling and partner agreements.', true)}
  </div>
  ${src('CRMA Reg. (EU) 2024/1252; SWD(2021) 352; EC (DG ENER) energy-security assessments; Eurostat.')}
</section>`);

// 10 — Status quo synthesis
slides.push(`
<section class="slide cream" data-label="Status quo">
  ${kick('09', 'Status quo', 'The current-state assessment')}
  <h2 class="s-title anim">Status quo: a <em>competitive</em> exporter with a <em>concentrated</em> input base.</h2>
  <div class="sq anim-children">
    <div class="sq-item"><span class="sq-k">Output</span><p>A structural extra-EU surplus (+€674 bn, 2023; +€843 bn, 2024), led by machinery, vehicles, pharmaceuticals and chemicals.</p></div>
    <div class="sq-item"><span class="sq-k">Inputs</span><p>~22% of export value and ~19% of intermediate inputs are imported; several strategic materials and finished goods are sourced predominantly from a single origin.</p></div>
    <div class="sq-item"><span class="sq-k">Energy</span><p>Import dependency remains high (~57% net); the post-2022 shock was absorbed by changing the supplier mix rather than reducing reliance.</p></div>
    <div class="sq-item"><span class="sq-k">Competitiveness</span><p>Strength in high-value output coexists with input-side exposure that transmits cost and lead-time risk into the transition technologies.</p></div>
    <div class="sq-item"><span class="sq-k">Resilience</span><p>High single-origin reliance, alongside demonstrated capacity to diversify over multi-year horizons and an emerging EU instrument set (CRMA, NZIA, Chips Act, CBAM).</p></div>
  </div>
  ${src('Composite of the layers above. All figures are source-linked on the Method Hub and in the .xlsx handover workbook.')}
</section>`);

// 11 — Sources & method
slides.push(`
<section class="slide white" data-label="Sources & method">
  ${kick('10', 'Sources & method', 'Three data layers, every figure sourced')}
  <h2 class="s-title anim">How to read this — and where the numbers come from.</h2>
  <div class="layers anim-children">
    <div class="layer"><span class="ln" style="background:var(--teal)"></span>
      <h3>Layer 1 — trade backbone</h3>
      <p>Eurostat ext_tec01 (EU-27, 2023–2024): extra- and intra-EU imports and exports by the NACE activity of the trading enterprise. All 24 Section C divisions.</p></div>
    <div class="layer"><span class="ln" style="background:var(--c-navy)"></span>
      <h3>Layer 2 — input–output layer</h3>
      <p>EU-27 use table at basic prices (naio_10_cp1610) and FIGARO application datasets (naio_10_fgti / fgte / fgfoee): imported-input mix, import origins, export destinations and foreign value added, 2023.</p></div>
    <div class="layer"><span class="ln" style="background:var(--c-orange)"></span>
      <h3>Layer 3 — dependency layer</h3>
      <p>Curated, reported "as stated by source": CRMA / EC-JRC critical-raw-material shares, SWD(2021) 352 strategic dependencies, energy nrg_ind_id and named per-sector inputs — not derivable from official statistics at this granularity.</p></div>
  </div>
  <div class="repro anim">Reproducible: the statistical layers regenerate from the public Eurostat API. This deck presents the same figures the Method Hub renders and the .xlsx handover workbook contains.</div>
  ${src('Eurostat · FIGARO · European Commission (DG GROW / DG ENER / JRC) · CRMA Reg. (EU) 2024/1252 · SWD(2021) 352.')}
</section>`);

/* ---------------------------------------------------------- helpers used above */
function kick(num, label, sub, invert) {
  return `<div class="s-kicker anim"><span class="num">§ ${num}</span><span>${label}</span><i class="dot"></i><span class="sub">${sub}</span></div>`;
}
function src(text, invert) {
  return `<div class="s-src${invert ? ' inv' : ''}">${text}</div>`;
}

/* ------------------------------------------------------------------ page */
const CSS = fs.readFileSync(new URL('./deck.css', import.meta.url), 'utf8');
const JS = fs.readFileSync(new URL('./deck.js', import.meta.url), 'utf8');

const html = `<div class="deck">
  <div class="progress"><i id="prog"></i></div>
  ${slides.join('\n')}
  <nav class="dots" id="dots"></nav>
  <div class="counter"><span id="cur">01</span> / <span id="tot">${String(slides.length).padStart(2, '0')}</span></div>
  <div class="hint" id="hint">Use ↑ ↓ or scroll · press <b>F</b> for fullscreen</div>
</div>
<style>${CSS}</style>
<script>${JS}</script>`;

const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width,initial-scale=1">\n<title>EU manufacturing \u2014 trade & dependency status \u00b7 ESABCC Method Hub</title>\n<meta name="description" content="A status-quo reading of EU-27 manufacturing trade, input dependencies, and the implications for competitiveness and geopolitical resilience.">\n<style>html,body{margin:0;background:#1A1A1A}</style>\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
const out = new URL('../../../../../public/decks/eu-industry-trade-status.html', import.meta.url);
fs.writeFileSync(out, doc);
console.log('wrote', out.pathname, doc.length, 'bytes ·', slides.length, 'slides');
