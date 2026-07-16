'use client';
/**
 * PDF slide deck for the Trade Flows sub-module.
 * ----------------------------------------------
 * A one-click, landscape 16:9 presentation that lifts the current status of
 * EU-27 manufacturing straight out of the same data files the module renders
 * (trade-data.ts + eurostat-io.generated.ts) — the headline figures and the
 * most important dynamics, in the order you would brief them:
 *
 *   1. Cover                    — title, reference year, the four headline figures.
 *   2. Headline figures         — the surplus / FVA / imported-inputs / China strip.
 *   3. Trade backbone           — imports-vs-exports diverging bars, top divisions (2023).
 *   4. Import-dependency board   — reliance × single-supplier concentration hotspots.
 *   5. Critical raw materials   — who controls the feedstocks (China's grip highlighted).
 *   6. Manufactured products    — solar, batteries, chips, APIs… the finished-goods side.
 *   7. Energy dependency        — the C19/C20 input side and the Russian-gas unwind.
 *   8. What this means          — five take-aways.
 *   9. Sources & method         — datasets, reproducibility, provenance.
 *
 * Uses jsPDF (project dep). The doc-building is separated from the browser
 * `saveAs` (mirroring export.ts's writeBuffer/saveAs split) so the deck can be
 * generated and inspected outside the browser.
 */
import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import {
  DIVISION_TRADE,
  SECTION_C_TEC,
  REFERENCE_YEAR,
  HEADLINE_FACTS,
  CRITICAL_MATERIALS,
  PRODUCT_DEPENDENCIES,
  ENERGY_FEEDSTOCK_DEPENDENCY,
  RISK_HOTSPOTS,
  TRADE_BRANCH_COLORS,
  type DivisionTrade,
  type TradeBranch,
} from './trade-data';

/* ---------------------------------------------------------------- geometry */

const W = 960;
const H = 540;
const MARGIN = 44;
const HEADER_H = 60;
const FOOTER_Y = H - 26;

/* ------------------------------------------------------------ brand palette */

type RGB = [number, number, number];
const hex = (h: string): RGB => {
  const s = h.replace('#', '');
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};

const NAVY: RGB = hex('#004B7F');
const TEAL: RGB = hex('#007B6C');
const ORANGE: RGB = hex('#FF9933');
const VIOLET: RGB = hex('#6667AB');
const RED: RGB = hex('#B83230');
const GREY: RGB = hex('#54728C');
const INK: RGB = hex('#1E2A36');
const MUTED: RGB = hex('#5B6B7A');
const FAINT: RGB = hex('#8A98A6');
const RULE: RGB = hex('#D8DEE4');
const PANEL: RGB = hex('#F3F5F7');
const WHITE: RGB = [255, 255, 255];

/* The six accent colours, cycled for the cover chips / section headers. */
const ACCENTS: RGB[] = [NAVY, TEAL, VIOLET, ORANGE, RED, GREY];

/* Colour a supplier country for the dependency boards. China gets the alarm
 * colour because single-country concentration on China is the headline risk. */
const supplierColor = (name: string): RGB => {
  const n = name.toLowerCase();
  if (n.includes('china')) return RED;
  if (n.includes('taiwan')) return VIOLET;
  if (n.includes('türkiye') || n.includes('turkiye') || n.includes('turkey')) return ORANGE;
  if (n.includes('south africa')) return TEAL;
  return GREY;
};

/* -------------------------------------------------- WinAnsi text sanitiser */

/**
 * jsPDF's standard fonts use WinAnsi (CP1252) encoding. A glyph outside it —
 * most commonly the "→" arrow that appears in the live Eurostat notes — is
 * measured as ~zero width (so `splitTextToSize` under-wraps and the line spills
 * off the page) and does not render. We sanitise every drawn string: map the
 * common maths/arrow glyphs to ASCII, keep the CP1252 high-range typographics
 * (€ – — ' ' " " • … ™ …), and drop anything else above U+00FF. Because this
 * runs on *display*, the underlying source data (trade-data.ts) is untouched.
 */
const CP1252_HIGH = new Set(
  [0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030, 0x0160, 0x2039, 0x0152, 0x017d,
    0x2018, 0x2019, 0x201c, 0x201d, 0x2022, 0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178],
);
const GLYPH_MAP: Record<string, string> = {
  '→': '->', '➔': '->', '←': '<-', '↔': '<->', '⇒': '=>', '≤': '<=', '≥': '>=', '≈': '~', '≠': '!=',
};
function winAnsi(s: string): string {
  let out = '';
  for (const ch of s) {
    const code = ch.codePointAt(0)!;
    if (code <= 0xff || CP1252_HIGH.has(code)) out += ch;
    else if (GLYPH_MAP[ch] !== undefined) out += GLYPH_MAP[ch];
    // else: unmappable high glyph — drop it rather than corrupt line widths
  }
  return out;
}

/* --------------------------------------------------------------- doc helper */

class Deck {
  doc: jsPDF;
  page = 0;

  constructor() {
    this.doc = new jsPDF({ unit: 'pt', format: [W, H], orientation: 'landscape' });
    this.doc.setFont('helvetica', 'normal');
  }

  private fill(c: RGB) {
    this.doc.setFillColor(c[0], c[1], c[2]);
  }
  private stroke(c: RGB) {
    this.doc.setDrawColor(c[0], c[1], c[2]);
  }
  private ink(c: RGB) {
    this.doc.setTextColor(c[0], c[1], c[2]);
  }

  /** New page painted white; returns the doc for chaining. */
  newPage(first = false) {
    if (!first) this.doc.addPage([W, H], 'landscape');
    this.page += 1;
    this.fill(WHITE);
    this.doc.rect(0, 0, W, H, 'F');
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, r = 0) {
    this.fill(c);
    if (r > 0) this.doc.roundedRect(x, y, w, h, r, r, 'F');
    else this.doc.rect(x, y, w, h, 'F');
  }

  outline(x: number, y: number, w: number, h: number, c: RGB, r = 0, lw = 1) {
    this.stroke(c);
    this.doc.setLineWidth(lw);
    if (r > 0) this.doc.roundedRect(x, y, w, h, r, r, 'S');
    else this.doc.rect(x, y, w, h, 'S');
  }

  line(x1: number, y1: number, x2: number, y2: number, c: RGB, lw = 1) {
    this.stroke(c);
    this.doc.setLineWidth(lw);
    this.doc.line(x1, y1, x2, y2);
  }

  /**
   * Draw text. `align` maps to jsPDF align; baseline defaults to 'top' so `y`
   * is the top of the cap. Returns the y just below the drawn block.
   */
  text(
    s: string,
    x: number,
    y: number,
    opts: {
      size?: number;
      color?: RGB;
      bold?: boolean;
      align?: 'left' | 'center' | 'right';
      baseline?: 'top' | 'middle' | 'alphabetic';
      maxWidth?: number;
      lineGap?: number;
    } = {},
  ): number {
    const { size = 11, color = INK, bold = false, align = 'left', baseline = 'top', maxWidth, lineGap = 3 } = opts;
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    this.ink(color);
    const safe = winAnsi(s);
    const lines = maxWidth ? (this.doc.splitTextToSize(safe, maxWidth) as string[]) : [safe];
    const lh = size + lineGap;
    lines.forEach((ln, i) => {
      this.doc.text(ln, x, y + i * lh, { align, baseline });
    });
    return y + lines.length * lh;
  }

  /* Standard slide chrome: an accent header band + a footer rule. Returns the
   * content-area top y. */
  chrome(kicker: string, title: string, accent: RGB): number {
    this.rect(0, 0, W, HEADER_H, accent);
    this.rect(0, HEADER_H, W, 3, [accent[0], accent[1], accent[2]]);
    this.text(kicker.toUpperCase(), MARGIN, 12, { size: 8.5, color: WHITE, bold: true });
    this.text(title, MARGIN, 26, { size: 20, color: WHITE, bold: true, maxWidth: W - 2 * MARGIN });
    // footer
    this.line(MARGIN, FOOTER_Y, W - MARGIN, FOOTER_Y, RULE, 0.8);
    this.text('ESABCC MethodHub · Overview Industry · Trade flows', MARGIN, FOOTER_Y + 6, {
      size: 7.5,
      color: FAINT,
    });
    this.text(`${this.page}`, W - MARGIN, FOOTER_Y + 6, { size: 7.5, color: FAINT, align: 'right' });
    return HEADER_H + 26;
  }

  /** Trim a string to a single line that fits `maxWidth`, adding an ellipsis. */
  ellipsize(s: string, maxWidth: number, size: number, bold = false): string {
    this.doc.setFont('helvetica', bold ? 'bold' : 'normal');
    this.doc.setFontSize(size);
    const safe = winAnsi(s);
    if (this.doc.getTextWidth(safe) <= maxWidth) return safe;
    let lo = 0;
    let hi = safe.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (this.doc.getTextWidth(safe.slice(0, mid) + '…') <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return safe.slice(0, lo).trimEnd() + '…';
  }

  /** Small source citation line, bottom-left above the footer. */
  sourceline(s: string) {
    this.text(s, MARGIN, FOOTER_Y - 14, { size: 7.5, color: FAINT, maxWidth: W - 2 * MARGIN });
  }
}

/* ------------------------------------------------------------- number fmt */

const bn = (v: number): string => (Math.abs(v) >= 100 ? `${Math.round(v)}` : `${(Math.round(v * 10) / 10).toFixed(1)}`);
const eur = (v: number): string => `€${bn(v)}`;
const bal = (d: DivisionTrade, y = REFERENCE_YEAR) => d.flows[y].expExt - d.flows[y].impExt;

/* ================================================================= SLIDES */

/* ---- 1 · Cover -------------------------------------------------------- */
function cover(dk: Deck, today: string) {
  dk.newPage(true);
  // full navy field
  dk.rect(0, 0, W, H, NAVY);
  // accent ribbon
  dk.rect(0, 0, 10, H, ORANGE);
  dk.text('EU CLIMATE ADVISORY BOARD · METHODHUB', MARGIN, 70, { size: 10, color: hex('#9FC3E0'), bold: true });
  dk.text('EU manufacturing — trade & dependency status', MARGIN, 96, {
    size: 40,
    color: WHITE,
    bold: true,
    maxWidth: W - 2 * MARGIN,
  });
  dk.text(
    'An input–output reading of EU-27 manufacturing trade (NACE Rev. 2 Section C, divisions 10–33): a record export surplus, and the acute import dependencies it masks.',
    MARGIN,
    186,
    { size: 14, color: hex('#CFE0EE'), maxWidth: 760, lineGap: 5 },
  );

  // headline figure chips from the live HEADLINE_FACTS
  const chipY = 300;
  const chipW = (W - 2 * MARGIN - 3 * 16) / 4;
  HEADLINE_FACTS.slice(0, 4).forEach((f, i) => {
    const x = MARGIN + i * (chipW + 16);
    // bright accents that read on the navy chip (plain ACCENTS[0]=navy would vanish)
    const coverAccents: RGB[] = [hex('#5AA0D8'), TEAL, VIOLET, ORANGE];
    dk.rect(x, chipY, chipW, 132, hex('#0A5A94'), 8);
    dk.rect(x, chipY, 5, 132, coverAccents[i], 0);
    dk.text(f.value, x + 16, chipY + 18, { size: 30, color: WHITE, bold: true });
    dk.text(f.label, x + 16, chipY + 60, { size: 10.5, color: hex('#CFE0EE'), bold: true, maxWidth: chipW - 28 });
  });

  dk.text(`Reference year ${REFERENCE_YEAR} · compiled ${today}`, MARGIN, 470, { size: 10, color: hex('#9FC3E0') });
  dk.text('Every figure sourced to Eurostat, FIGARO and the EC/JRC dependency reviews.', MARGIN, 488, {
    size: 9,
    color: hex('#7FA8CC'),
  });
}

/* ---- 2 · Headline figures -------------------------------------------- */
function headlineFigures(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('The state of play', 'Four figures that frame EU manufacturing trade', NAVY);
  dk.text(
    'The trade account is in large surplus — but the input side tells the dependency story. Read the four together.',
    MARGIN,
    top,
    { size: 11, color: MUTED, maxWidth: W - 2 * MARGIN },
  );

  const gy = top + 34;
  const cardW = (W - 2 * MARGIN - 16) / 2;
  const cardH = 150;
  HEADLINE_FACTS.slice(0, 4).forEach((f, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = MARGIN + col * (cardW + 16);
    const y = gy + row * (cardH + 16);
    const accent = ACCENTS[i];
    dk.rect(x, y, cardW, cardH, PANEL, 10);
    dk.rect(x, y, 6, cardH, accent, 0);
    dk.text(f.value, x + 22, y + 20, { size: 40, color: accent, bold: true });
    dk.text(f.label, x + 22, y + 74, { size: 13, color: INK, bold: true, maxWidth: cardW - 40 });
    dk.text(f.detail, x + 22, y + 98, { size: 9.5, color: MUTED, maxWidth: cardW - 40, lineGap: 3 });
  });
  dk.sourceline('Sources: Eurostat ext_tec01; FIGARO application datasets; EU-27 use table at basic prices (2023).');
}

/* ---- 3 · Trade backbone: imports vs exports -------------------------- */
function tradeBackbone(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('Trade backbone · Eurostat ext_tec01', 'Imports vs exports — where the EU sells and buys', NAVY);
  dk.text(
    `Extra-EU imports (red) vs exports (coloured by branch), € bn, ${REFERENCE_YEAR}. Top divisions by net trade balance.`,
    MARGIN,
    top,
    { size: 10.5, color: MUTED, maxWidth: W - 2 * MARGIN },
  );

  const rows = [...DIVISION_TRADE].sort((a, b) => bal(b) - bal(a)).slice(0, 10);
  const maxImp = Math.max(...rows.map((d) => d.flows[REFERENCE_YEAR].impExt));
  const maxExp = Math.max(...rows.map((d) => d.flows[REFERENCE_YEAR].expExt));

  const labelW = 176;
  const chartX = MARGIN + labelW;
  const chartW = W - MARGIN - chartX - 8;
  const gap = 34; // space reserved for the centre divider labels
  const scale = (chartW - gap) / (maxImp + maxExp);
  const divider = chartX + maxImp * scale + gap / 2;

  const y0 = top + 40;
  const rowH = 34;
  const barH = 15;

  // legend
  dk.rect(divider - 150, top + 18, 9, 9, RED, 2);
  dk.text('Imports (extra-EU)', divider - 137, top + 19, { size: 8.5, color: MUTED });
  dk.rect(divider + 20, top + 18, 9, 9, NAVY, 2);
  dk.text('Exports (extra-EU, by branch)', divider + 33, top + 19, { size: 8.5, color: MUTED });

  // centre divider
  dk.line(divider, y0 - 6, divider, y0 + rows.length * rowH - rowH + barH + 6, RULE, 1);

  rows.forEach((d, i) => {
    const f = d.flows[REFERENCE_YEAR];
    const cy = y0 + i * rowH;
    const barTop = cy + (rowH - barH) / 2 - 4;
    const branch = TRADE_BRANCH_COLORS[d.branch] ? (hex(TRADE_BRANCH_COLORS[d.branch]) as RGB) : NAVY;

    // label block (single line, ellipsised so it never collides with the net sub-line)
    dk.text(dk.ellipsize(`${d.code} · ${d.label}`, labelW - 8, 9, true), MARGIN, cy + 2, {
      size: 9,
      color: INK,
      bold: true,
    });
    const nb = bal(d);
    dk.text(`${nb >= 0 ? '+' : '−'}${eur(Math.abs(nb))} bn net`, MARGIN, cy + 15, { size: 7.5, color: nb >= 0 ? TEAL : RED });

    // imports bar (leftward from divider)
    const impW = f.impExt * scale;
    dk.rect(divider - impW, barTop, impW, barH, RED, 2);
    dk.text(eur(f.impExt), divider - impW - 4, barTop + barH / 2, {
      size: 8,
      color: MUTED,
      align: 'right',
      baseline: 'middle',
    });

    // exports bar (rightward from divider)
    const expW = f.expExt * scale;
    dk.rect(divider, barTop, expW, barH, branch, 2);
    dk.text(eur(f.expExt), divider + expW + 4, barTop + barH / 2, {
      size: 8,
      color: MUTED,
      align: 'left',
      baseline: 'middle',
    });
  });

  // Section C total callout
  const c = SECTION_C_TEC[REFERENCE_YEAR];
  const surplus = Math.round(c.expExt - c.impExt);
  dk.text(
    `Section C total (${REFERENCE_YEAR}): exports ${eur(c.expExt)} bn · imports ${eur(c.impExt)} bn · surplus +€${surplus} bn.`,
    MARGIN,
    FOOTER_Y - 26,
    { size: 8.5, color: INK, bold: true },
  );
  dk.sourceline('Source: Eurostat ext_tec01 (EU-27, enterprise-based attribution, € bn current prices).');
}

/* ---- 4 · Import-dependency board ------------------------------------- */
function dependencyBoard(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('Import-dependency map', 'Where one supplier can choke a value chain', RED);
  dk.text(
    'Import reliance × single-largest-supplier share. The rows highest on both are the front line for CBAM, the CRMA and strategic autonomy. EC/JRC criticality figures — "as reported by".',
    MARGIN,
    top,
    { size: 10.5, color: MUTED, maxWidth: W - 2 * MARGIN },
  );

  const rows = [...RISK_HOTSPOTS]
    .sort((a, b) => b.importReliance * b.supplierConcentration - a.importReliance * a.supplierConcentration)
    .slice(0, 11);

  const y0 = top + 42;
  const rowH = 27;
  const cLabel = MARGIN;
  const cNace = 250;
  const meterX = 320;
  const meterW = 150;
  const concX = 500;
  const concW = 150;
  const cSupplier = 680;

  // column heads
  dk.text('Dependency', cLabel, y0 - 18, { size: 8, color: FAINT, bold: true });
  dk.text('NACE', cNace, y0 - 18, { size: 8, color: FAINT, bold: true });
  dk.text('Import reliance', meterX, y0 - 18, { size: 8, color: FAINT, bold: true });
  dk.text('Supplier concentration', concX, y0 - 18, { size: 8, color: FAINT, bold: true });
  dk.text('Dominant supplier', cSupplier, y0 - 18, { size: 8, color: FAINT, bold: true });

  rows.forEach((r, i) => {
    const cy = y0 + i * rowH;
    if (i % 2 === 0) dk.rect(MARGIN - 6, cy - 4, W - 2 * MARGIN + 12, rowH - 2, PANEL, 3);
    dk.text(r.label, cLabel, cy + 4, { size: 9, color: INK, bold: true, maxWidth: cNace - cLabel - 6 });
    dk.text(r.naceDivision, cNace, cy + 4, { size: 8.5, color: MUTED });

    const relPct = Math.round(r.importReliance * 100);
    dk.rect(meterX, cy + 3, meterW, 9, hex('#E3E7EB'), 2);
    dk.rect(meterX, cy + 3, meterW * r.importReliance, 9, GREY, 2);
    dk.text(`${relPct}%`, meterX + meterW + 6, cy + 7, { size: 8, color: MUTED, baseline: 'middle' });

    const concPct = Math.round(r.supplierConcentration * 100);
    const sc = supplierColor(r.supplier);
    dk.rect(concX, cy + 3, concW, 9, hex('#E3E7EB'), 2);
    dk.rect(concX, cy + 3, concW * r.supplierConcentration, 9, sc, 2);
    dk.text(`${concPct}%`, concX + concW + 6, cy + 7, { size: 8, color: MUTED, baseline: 'middle' });

    dk.text(r.supplier, cSupplier, cy + 4, { size: 8.5, color: sc, bold: true, maxWidth: W - MARGIN - cSupplier });
  });
  dk.sourceline('Sources: EC/JRC criticality studies; Eurostat CRM trade; SWD(2021) 352. Read as the source\'s assessment, not customs arithmetic.');
}

/* ---- 5 · Critical raw materials -------------------------------------- */
function criticalMaterials(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('Critical raw materials · CRMA', 'Who controls the feedstocks', RED);
  const chinaTop = CRITICAL_MATERIALS.filter((m) => m.topSupplier.toLowerCase().includes('china')).length;
  dk.text(
    `The EU imports the raw materials it manufactures with but barely produces. China is the top supplier for ${chinaTop} of the ${CRITICAL_MATERIALS.length} tracked materials. Bars show the dominant supplier's share of EU supply.`,
    MARGIN,
    top,
    { size: 10.5, color: MUTED, maxWidth: W - 2 * MARGIN },
  );

  const rows = CRITICAL_MATERIALS.filter((m) => m.supplierShare != null)
    .sort((a, b) => (b.supplierShare ?? 0) - (a.supplierShare ?? 0))
    .slice(0, 12);

  const y0 = top + 40;
  const rowH = 28;
  const labelX = MARGIN;
  const barX = 300;
  const barMax = W - MARGIN - 150 - barX;

  rows.forEach((m, i) => {
    const cy = y0 + i * rowH;
    const sc = supplierColor(m.topSupplier);
    dk.text(m.material, labelX, cy + 2, { size: 9.5, color: INK, bold: true, maxWidth: barX - labelX - 10 });
    dk.text(m.usedIn.replace(/\s*\([^)]*\)\s*$/, ''), labelX, cy + 15, {
      size: 7,
      color: FAINT,
      maxWidth: barX - labelX - 10,
    });
    const share = m.supplierShare ?? 0;
    dk.rect(barX, cy + 2, barMax, 12, hex('#E3E7EB'), 2);
    dk.rect(barX, cy + 2, barMax * (share / 100), 12, sc, 2);
    dk.text(`${share}%`, barX + barMax * (share / 100) + 6, cy + 8, { size: 8.5, color: INK, bold: true, baseline: 'middle' });
    dk.text(m.topSupplier, W - MARGIN, cy + 8, { size: 8.5, color: sc, bold: true, align: 'right', baseline: 'middle' });
  });
  dk.sourceline('Source: EC (DG GROW) critical raw materials; Eurostat CRM trade; CRMA Reg. (EU) 2024/1252. Supplier share = share of EU supply.');
}

/* ---- 6 · Manufactured-product dependencies --------------------------- */
function productDependencies(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('Not just raw materials', 'The finished-goods the EU imports', VIOLET);
  dk.text(
    'The dependency runs downstream too: clean-tech kit, electronics, medicines and consumer goods where one origin dominates extra-EU supply. Bars show the largest supplier\'s share.',
    MARGIN,
    top,
    { size: 10.5, color: MUTED, maxWidth: W - 2 * MARGIN },
  );

  const rows = PRODUCT_DEPENDENCIES.filter((p) => p.supplierShare != null)
    .sort((a, b) => (b.supplierShare ?? 0) - (a.supplierShare ?? 0))
    .slice(0, 10);

  const y0 = top + 38;
  const cardH = 33;
  rows.forEach((p, i) => {
    const cy = y0 + i * cardH;
    const sc = supplierColor(p.topSupplier);
    dk.text(p.product, MARGIN, cy + 2, { size: 9.5, color: INK, bold: true, maxWidth: 250 });
    dk.text(`${p.naceDivision} · ${p.category}`, MARGIN, cy + 15, { size: 7, color: FAINT, maxWidth: 250 });

    const barX = 320;
    const barMax = 320;
    const share = p.supplierShare ?? 0;
    dk.rect(barX, cy + 3, barMax, 12, hex('#E3E7EB'), 2);
    dk.rect(barX, cy + 3, barMax * (share / 100), 12, sc, 2);
    dk.text(`${share}%`, barX + barMax * (share / 100) + 6, cy + 9, { size: 8.5, color: INK, bold: true, baseline: 'middle' });
    dk.text(`${p.topSupplier}`, barX + barMax + 60, cy + 9, { size: 8.5, color: sc, bold: true, baseline: 'middle' });
  });
  dk.sourceline('Sources: Eurostat green-trade & China-trade statistics; ACEA; IEA; peer-reviewed pharma-API study. Share basis varies by row (see workbook).');
}

/* ---- 7 · Energy dependency ------------------------------------------- */
function energyDependency(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('Energy & feedstock', 'The input side of refining and chemicals', ORANGE);
  dk.text(
    'C19 (refining) and C20 (chemicals) run on imported energy and feedstock. The EU absorbed the 2022 shock but the structural reliance remains.',
    MARGIN,
    top,
    { size: 10.5, color: MUTED, maxWidth: W - 2 * MARGIN },
  );

  const rows = ENERGY_FEEDSTOCK_DEPENDENCY.filter((e) => e.dependencyPct != null);
  const y0 = top + 40;
  const cardW = (W - 2 * MARGIN - 3 * 14) / 4;
  rows.slice(0, 4).forEach((e, i) => {
    const x = MARGIN + i * (cardW + 14);
    dk.rect(x, y0, cardW, 150, PANEL, 8);
    dk.rect(x, y0, 5, 150, ORANGE, 0);
    dk.text(`${e.dependencyPct}%`, x + 16, y0 + 16, { size: 30, color: ORANGE, bold: true });
    dk.text(e.item, x + 16, y0 + 58, { size: 10, color: INK, bold: true, maxWidth: cardW - 28 });
    dk.text(e.naceRelevance, x + 16, y0 + 88, { size: 7.5, color: FAINT, maxWidth: cardW - 28 });
    dk.text(e.note, x + 16, y0 + 104, { size: 7.5, color: MUTED, maxWidth: cardW - 28, lineGap: 2 });
  });

  // Russian-gas unwind highlight
  const yb = y0 + 172;
  dk.rect(MARGIN, yb, W - 2 * MARGIN, 66, hex('#FBEEE0'), 8);
  dk.text('The Russian-gas unwind', MARGIN + 18, yb + 14, { size: 11, color: hex('#7A4400'), bold: true });
  dk.text(
    'Russian gas fell from 45% of EU gas imports (2021) → 24% (2022) → ~15% (2023). Norwegian pipeline gas and US LNG replaced most of the volume; the USA is now the top crude supplier after the December 2022 embargo.',
    MARGIN + 18,
    yb + 32,
    { size: 9, color: hex('#7A4400'), maxWidth: W - 2 * MARGIN - 36 },
  );
  dk.sourceline('Sources: Eurostat nrg_ind_id (net imports / gross available energy, live); EC (DG ENER) gas-supply figures.');
}

/* ---- 8 · Take-aways --------------------------------------------------- */
function takeaways(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('What this means', 'Five dynamics to carry forward', TEAL);

  const c = SECTION_C_TEC[REFERENCE_YEAR];
  const surplus = Math.round(c.expExt - c.impExt);
  const items: [string, string][] = [
    [
      'A record surplus that masks the input side',
      `NACE C ran a +€${surplus} bn extra-EU surplus in ${REFERENCE_YEAR}, yet ${HEADLINE_FACTS[1].value} of every export euro is foreign value added and ${HEADLINE_FACTS[2].value} of intermediate inputs are imported. The headline hides the exposure.`,
    ],
    [
      'The transition inputs are China-concentrated',
      'Magnets, batteries, solar cells, gallium and graphite all trace back to China as the dominant single supplier — the green and digital build-out imports its critical inputs.',
    ],
    [
      'Raw-material reliance is near-total',
      'Heavy rare earths, magnesium, borates, platinum-group metals, niobium and lithium sit at ~100% import reliance with one dominant supplier — no EU fallback at scale.',
    ],
    [
      'Finished clean-tech is imported too',
      'It is not only ores: solar panels (~98% China), battery cells (~87% China) and heat pumps (~60% China) are imported as finished goods, and those shares are rising.',
    ],
    [
      'Energy shock absorbed, dependence structural',
      'Net energy-import dependency remains high and Russian gas fell to ~15% of imports — the acute crisis eased, but refining and chemicals still run on imported feedstock.',
    ],
  ];

  let y = top + 14;
  items.forEach(([h, b], i) => {
    const accent = ACCENTS[i % ACCENTS.length];
    dk.rect(MARGIN, y + 2, 26, 26, accent, 6);
    dk.text(`${i + 1}`, MARGIN + 13, y + 15, { size: 13, color: WHITE, bold: true, align: 'center', baseline: 'middle' });
    dk.text(h, MARGIN + 40, y, { size: 12.5, color: INK, bold: true, maxWidth: W - MARGIN - (MARGIN + 40) });
    dk.text(b, MARGIN + 40, y + 18, { size: 9.5, color: MUTED, maxWidth: W - MARGIN - (MARGIN + 40), lineGap: 3 });
    y += 76;
  });
}

/* ---- 9 · Sources & method -------------------------------------------- */
function sources(dk: Deck) {
  dk.newPage();
  const top = dk.chrome('Sources & method', 'Three data layers, every figure sourced', GREY);
  dk.text(
    'The module keeps three layers apart on purpose. Nothing is invented; each figure carries a working source link on the live MethodHub page and in the .xlsx handover workbook.',
    MARGIN,
    top,
    { size: 10.5, color: MUTED, maxWidth: W - 2 * MARGIN },
  );

  const layers: [string, RGB, string][] = [
    ['Layer 1 — trade backbone', NAVY, 'Eurostat ext_tec01 (EU-27, 2023 + 2024): extra-/intra-EU imports & exports by the NACE activity of the trading enterprise. All 24 Section C divisions.'],
    ['Layer 2 — input–output layer', TEAL, 'EU-27 use table at basic prices (naio_10_cp1610) + FIGARO application datasets (naio_10_fgti / fgte / fgfoee): imported-input mix, import origins, export destinations and foreign value added, 2023.'],
    ['Layer 3 — dependency layer', RED, 'Curated "as reported by <source>": CRMA / EC-JRC critical-raw-material shares, SWD(2021) 352 strategic dependencies, energy nrg_ind_id and named per-sector inputs. Not derivable from official statistics at this granularity.'],
  ];
  let y = top + 34;
  layers.forEach(([h, c, b]) => {
    dk.rect(MARGIN, y, 6, 52, c, 0);
    dk.text(h, MARGIN + 18, y, { size: 11.5, color: INK, bold: true });
    dk.text(b, MARGIN + 18, y + 17, { size: 9, color: MUTED, maxWidth: W - 2 * MARGIN - 24, lineGap: 3 });
    y += 66;
  });

  dk.rect(MARGIN, y + 4, W - 2 * MARGIN, 54, PANEL, 8);
  dk.text('Reproducible & live', MARGIN + 16, y + 16, { size: 10.5, color: INK, bold: true });
  dk.text(
    'node scripts/fetch-trade-flows-io-data.mjs regenerates every statistical number from the public Eurostat API; node scripts/fetch-figaro-io-dataset.mjs re-imports the full FIGARO table. This deck is generated from the same trade-data.ts + eurostat-io.generated.ts the module renders.',
    MARGIN + 16,
    y + 32,
    { size: 8.5, color: MUTED, maxWidth: W - 2 * MARGIN - 32 },
  );
  dk.sourceline('Eurostat · FIGARO · European Commission (DG GROW / DG ENER / JRC) · CRMA Reg. (EU) 2024/1252 · SWD(2021) 352.');
}

/* ================================================================= build */

/** Build the deck and return the jsPDF document (browser-agnostic). */
export function buildTradeFlowsSlideshow(today = new Date().toISOString().slice(0, 10)): jsPDF {
  const dk = new Deck();
  dk.doc.setProperties({
    title: 'EU manufacturing — trade & dependency status',
    subject: 'Overview Industry · Trade flows',
    author: 'ESABCC MethodHub',
    creator: 'ESABCC MethodHub — Overview Industry / Trade Flows',
  });
  cover(dk, today);
  headlineFigures(dk);
  tradeBackbone(dk);
  dependencyBoard(dk);
  criticalMaterials(dk);
  productDependencies(dk);
  energyDependency(dk);
  takeaways(dk);
  sources(dk);
  return dk.doc;
}

/** Total slide count — page.tsx renders this in its button caption. */
export const SLIDE_COUNT = 9;

/** Browser entry: build the deck and trigger a download. */
export async function exportTradeFlowsSlideshow(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const doc = buildTradeFlowsSlideshow(today);
  const blob = doc.output('blob');
  saveAs(blob, `eu-industry-trade-status-${today}.pdf`);
}
