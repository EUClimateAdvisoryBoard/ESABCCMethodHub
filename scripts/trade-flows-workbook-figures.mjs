/**
 * Figure renderer for the Trade Flows IO-model masterfile.
 * --------------------------------------------------------
 * Renders the workbook's four figures as PNG buffers with @napi-rs/canvas
 * (existing project dependency; DejaVu Sans from the system fonts):
 *
 *   renderMethodFigure()        — the method diagram: anatomy of the
 *                                 input–output table and the derivation
 *                                 pipeline Z → A → L → applications, with the
 *                                 workbook sheet that holds each step.
 *   renderBalanceFigure(rows)   — diverging bars: extra-EU trade balance by
 *                                 Section C division (reference year).
 *   renderRiskMapFigure(points) — the import-dependency map: import reliance ×
 *                                 supplier concentration, raw materials vs
 *                                 manufactured products.
 *   renderImportContentFigure(rows) — top industries by the model's import
 *                                 content of final demand.
 *
 * The figures are SNAPSHOTS of the data at build time (Excel images cannot
 * recalculate); the live numbers stay in the sheets next to them. Colours:
 * chart palette validated for colour-vision deficiency (deutan/protan/tritan
 * ΔE and lightness/chroma/contrast checks) — see PALETTE below.
 */

import { createCanvas } from '@napi-rs/canvas';

/**
 * Chart series palette (colour-vision-deficiency checked; all pairs pass the
 * lightness band, chroma floor, CVD separation and 3:1 surface contrast):
 *   diverging poles  #00846C (surplus / teal) vs #B83230 (deficit / red),
 *   categorical pair #2B6E9F (raw material / blue) vs #D97A22 (product / orange),
 *   single series    #2B6E9F.
 */
const PALETTE = {
  surplus: '#00846C',
  deficit: '#B83230',
  material: '#2B6E9F',
  product: '#D97A22',
  single: '#2B6E9F',
  ink: '#25333F',
  muted: '#54728C',
  faint: '#8DA3B5',
  grid: '#E3E9EE',
  surface: '#FFFFFF',
  tintViolet: 'rgba(102,103,171,0.16)',
  tintTeal: 'rgba(0,132,108,0.14)',
  panel: '#F5F7F9',
};

const SANS = 'DejaVu Sans, sans-serif';
const SCALE = 2; // render @2x, place at half size in the sheet

function makeCanvas(w, h) {
  const canvas = createCanvas(w * SCALE, h * SCALE);
  const ctx = canvas.getContext('2d');
  ctx.scale(SCALE, SCALE);
  ctx.fillStyle = PALETTE.surface;
  ctx.fillRect(0, 0, w, h);
  ctx.textBaseline = 'middle';
  return { canvas, ctx };
}

function font(ctx, size, { bold = false, mono = false } = {}) {
  ctx.font = `${bold ? 'bold ' : ''}${size}px ${mono ? 'DejaVu Sans Mono, monospace' : SANS}`;
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function arrow(ctx, x1, y1, x2, y2, color = PALETTE.muted) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - 7 * Math.cos(a - 0.42), y2 - 7 * Math.sin(a - 0.42));
  ctx.lineTo(x2 - 7 * Math.cos(a + 0.42), y2 - 7 * Math.sin(a + 0.42));
  ctx.closePath();
  ctx.fill();
}

/* ------------------------------------------------------------ method figure */

export function renderMethodFigure() {
  const W = 1500;
  const H = 990;
  const { canvas, ctx } = makeCanvas(W, H);

  font(ctx, 19, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText('How the input–output model works — from the FIGARO table to every derived number', 28, 30);
  font(ctx, 12);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Panel A: what the table is. Panel B: what this workbook computes from it, and on which sheet each step lives.', 28, 54);

  /* ---------------- Panel A — anatomy of the IO table ---------------- */
  const ax = 28, ay = 84, aw = 700, ah = 470;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, ax, ay, aw, ah, 10);
  ctx.fill();
  font(ctx, 14, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('A · Anatomy of the input–output table', ax + 16, ay + 24);

  // tint legend (kept out of the schematic so nothing collides)
  ctx.fillStyle = 'rgba(102,103,171,0.45)';
  ctx.fillRect(ax + 16, ay + 40, 11, 11);
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('one column = one industry’s input recipe', ax + 32, ay + 46);
  ctx.fillStyle = 'rgba(0,132,108,0.45)';
  ctx.fillRect(ax + 300, ay + 40, 11, 11);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('one row = one product’s market', ax + 316, ay + 46);

  // geometry of the schematic blocks
  const zx = ax + 120, zy = ay + 88, zs = 242; // Z square
  const fw = 92, ew = 54, vh = 66, gap = 10;

  // Z block
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = PALETTE.faint;
  ctx.lineWidth = 1.4;
  roundRect(ctx, zx, zy, zs, zs, 4);
  ctx.fill();
  ctx.stroke();
  // highlighted column (recipe) and row (market)
  ctx.fillStyle = PALETTE.tintViolet;
  ctx.fillRect(zx + zs * 0.58, zy + 1, 30, zs - 2);
  ctx.fillStyle = PALETTE.tintTeal;
  ctx.fillRect(zx + 1, zy + zs * 0.32, zs - 2, 26);
  font(ctx, 13, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'center';
  ctx.fillText('Z', zx + zs / 2, zy + zs / 2 - 10);
  font(ctx, 10.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('intermediate use', zx + zs / 2, zy + zs / 2 + 10);
  ctx.fillText('64 × 64 industries, € m', zx + zs / 2, zy + zs / 2 + 26);

  // f block (final demand)
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, zx + zs + gap, zy, fw, zs, 4);
  ctx.fill();
  ctx.stroke();
  font(ctx, 12, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('f', zx + zs + gap + fw / 2, zy + zs / 2 - 10);
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('final demand', zx + zs + gap + fw / 2, zy + zs / 2 + 8);
  ctx.fillText('(5 columns)', zx + zs + gap + fw / 2, zy + zs / 2 + 22);

  // e block (exports)
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, zx + zs + gap + fw + gap, zy, ew, zs, 4);
  ctx.fill();
  ctx.stroke();
  font(ctx, 12, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('e', zx + zs + gap + fw + gap + ew / 2, zy + zs / 2 - 10);
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.save();
  ctx.translate(zx + zs + gap + fw + gap + ew / 2, zy + zs / 2 + 66);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('extra-EU exports', 0, 0);
  ctx.restore();

  // v block (value added)
  ctx.fillStyle = '#FFFFFF';
  roundRect(ctx, zx, zy + zs + gap, zs, vh, 4);
  ctx.fill();
  ctx.stroke();
  font(ctx, 12, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('v · value added', zx + zs / 2, zy + zs + gap + vh / 2 - 8);
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('wages · operating surplus · taxes (6 rows)', zx + zs / 2, zy + zs + gap + vh / 2 + 10);

  // x labels
  font(ctx, 11, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText('x — total output', zx + zs + gap + fw + gap + ew + 14, zy + zs + gap + vh / 2);
  arrow(ctx, zx + zs + gap + fw + gap + ew + 10, zy + zs + gap + vh / 2, zx + zs - 6, zy + zs + gap + vh / 2 + 1);

  // axis annotations
  font(ctx, 10.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.textAlign = 'center';
  ctx.save();
  ctx.translate(zx - 40, zy + zs / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('rows: each industry as a SELLER — who buys its product', 0, 0);
  ctx.restore();
  ctx.fillText('columns: each industry as a BUYER — its input recipe', zx + zs / 2, zy - 14);

  // identities
  font(ctx, 10.5, { mono: true });
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('column identity:  x_j = Σ_i Z(i,j) + v_j          (everything industry j pays for)', ax + 24, ay + ah - 52);
  ctx.fillText('row identity:     x_i = Σ_j Z_dom(i,j) + f_i + e_i (everything industry i sells)', ax + 24, ay + ah - 32);
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Both are checked per industry on the “IO model” sheet — the residual column should stay ≈ 0.', ax + 24, ay + ah - 12);

  /* ---------------- Panel A2 — domestic vs imported ---------------- */
  const bx = ax + aw + 20, by = ay, bw = W - bx - 28, bh = ah;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, bx, by, bw, bh, 10);
  ctx.fill();
  font(ctx, 14, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText('A2 · Every cell splits by origin (EU-27 as one economy)', bx + 16, by + 24);

  const sq = 132, sx = bx + 60, sy = by + 74;
  const block = (x, y, labelTop, labelMid, color) => {
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = PALETTE.faint;
    roundRect(ctx, x, y, sq, sq, 4);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = color;
    ctx.globalAlpha = 0.14;
    roundRect(ctx, x, y, sq, sq, 4);
    ctx.fill();
    ctx.globalAlpha = 1;
    font(ctx, 11.5, { bold: true });
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'center';
    ctx.fillText(labelTop, x + sq / 2, y + sq / 2 - 10);
    font(ctx, 9.5);
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(labelMid, x + sq / 2, y + sq / 2 + 10);
  };
  block(sx, sy, 'Z total', 'all origins', '#54728C');
  font(ctx, 16, { bold: true });
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('=', sx + sq + 26, sy + sq / 2);
  block(sx + sq + 52, sy, 'Z domestic', 'made in the EU', PALETTE.surplus);
  font(ctx, 16, { bold: true });
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('+', sx + 2 * (sq + 52) - 26, sy + sq / 2);
  block(sx + 2 * (sq + 52), sy, 'Z imported', 'from outside the EU', PALETTE.deficit);
  font(ctx, 10);
  ctx.fillStyle = PALETTE.muted;
  ctx.textAlign = 'left';
  const a2t = [
    'The FIGARO inter-country table records, for every input, WHERE it came from:',
    'the EU itself (23 named partner areas make up the rest). That split is what',
    'lets the model separate the domestic supply chain (A domestic → the Leontief',
    'inverse) from what each euro of production pulls in from abroad (A import →',
    'import requirements, import content, imports embodied in exports).',
  ];
  a2t.forEach((t, i) => ctx.fillText(t, bx + 24, sy + sq + 42 + i * 18));
  font(ctx, 9.5, { mono: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('sheets: “Z total” · “Z domestic” · “Z imported”', bx + 24, sy + sq + 42 + 5 * 18 + 8);

  /* ---------------- Panel B — derivation pipeline ---------------- */
  const py = ay + ah + 26;
  ctx.fillStyle = PALETTE.panel;
  roundRect(ctx, ax, py, W - 2 * 28, H - py - 24, 10);
  ctx.fill();
  font(ctx, 14, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('B · The derivation pipeline — every arrow is a live formula in this workbook', ax + 16, py + 24);

  const stepW = 252, stepH = 118, stepY = py + 56, stepGap = 38;
  const steps = [
    { title: 'Z, x', lines: ['the use matrices and', 'total output by industry'], sheet: 'Z sheets · IO model', formula: 'x_j = SUM(Z total col j)' },
    { title: 'A = Z ÷ x', lines: ['the recipe per euro:', 'inputs needed per € of output', '(domestic and imported)'], sheet: 'A domestic · A import', formula: 'a_ij = Z(i,j)/x_j' },
    { title: 'L = (I − A)⁻¹', lines: ['the Leontief inverse:', 'direct + indirect needs,', 'the whole chain summed', '= I + A + A² + A³ + …'], sheet: 'I minus A · Leontief inverse', formula: '{=MINVERSE(I−A)}' },
    { title: 'M = A_imp · L', lines: ['import requirements:', 'imports pulled in per €', 'of final demand,', 'through every chain'], sheet: 'Import requirements', formula: '{=MMULT(A_imp, L)}' },
    { title: 'Results', lines: ['output multipliers = Σ L', 'import content = Σ M', 'VA content = v′·L', 'imports in exports = m × e'], sheet: 'Multipliers · Dashboard', formula: 'check: imp + VA = 100 %' },
  ];
  steps.forEach((s, i) => {
    const x = ax + 24 + i * (stepW + stepGap);
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = PALETTE.faint;
    ctx.lineWidth = 1.4;
    roundRect(ctx, x, stepY, stepW, stepH, 8);
    ctx.fill();
    ctx.stroke();
    font(ctx, 13, { bold: true });
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'left';
    ctx.fillText(s.title, x + 14, stepY + 20);
    font(ctx, 10);
    ctx.fillStyle = PALETTE.muted;
    s.lines.forEach((t, k) => ctx.fillText(t, x + 14, stepY + 40 + k * 15));
    if (i < steps.length - 1) arrow(ctx, x + stepW + 4, stepY + stepH / 2, x + stepW + stepGap - 6, stepY + stepH / 2);
    font(ctx, 9, { mono: true });
    ctx.fillStyle = '#5B5CA0';
    ctx.fillText(s.sheet, x + 14, stepY + stepH + 16);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(s.formula, x + 14, stepY + stepH + 32);
  });

  // the ripple story
  const ry = stepY + stepH + 62;
  font(ctx, 12, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.fillText('Why the inverse? The ripple a euro of demand sets off:', ax + 24, ry);
  const ripple = [
    ['€1 of car demand', PALETTE.ink],
    ['→ steel, chips, plastics (direct inputs — that is A)', PALETTE.muted],
    ['→ iron ore, coke, electricity for the steel (A²)', PALETTE.muted],
    ['→ mining machinery, grid fuel for those (A³) … and so on.', PALETTE.muted],
    ['L adds the whole infinite chain into one number per industry pair — no simulation needed.', PALETTE.ink],
  ];
  font(ctx, 11);
  ripple.forEach(([t, c], i) => {
    ctx.fillStyle = c;
    ctx.fillText(t, ax + 24 + (i > 0 && i < 4 ? 26 : 0), ry + 22 + i * 18);
  });
  font(ctx, 10);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(
    'One strong assumption (proportionality): every euro of an industry’s output is taken to use the same recipe — no economies of scale, no substitution.',
    ax + 24, ry + 22 + 5 * 18 + 6,
  );

  return canvas.toBuffer('image/png');
}

/* ------------------------------------------------- diverging balance figure */

/** rows: [{ code, label, balance }] — € bn, reference year. */
export function renderBalanceFigure(rows, year) {
  const sorted = [...rows].sort((a, b) => b.balance - a.balance);
  const W = 1400;
  const rowH = 30;
  const top = 86, bottom = 56;
  const H = top + sorted.length * rowH + bottom;
  const { canvas, ctx } = makeCanvas(W, H);
  const labelW = 330, valueW = 84;
  const plotX = labelW, plotW = W - labelW - valueW - 30;
  const maxAbs = Math.max(...sorted.map((r) => Math.abs(r.balance)));
  const x0 = plotX + plotW * (maxAbs / (2 * maxAbs)); // zero centred
  const px = (v) => x0 + (v / maxAbs) * (plotW / 2 - 10);

  font(ctx, 18, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText(`Extra-EU trade balance by manufacturing division, ${year}`, 28, 28);
  font(ctx, 11.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('€ billion, current prices · exports − imports, enterprise attribution (Eurostat ext_tec01) · teal = surplus, red = deficit', 28, 52);

  // gridlines
  const step = maxAbs > 120 ? 50 : 25;
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.faint;
  ctx.textAlign = 'center';
  for (let v = -Math.floor(maxAbs / step) * step; v <= maxAbs; v += step) {
    const gx = px(v);
    ctx.beginPath();
    ctx.moveTo(gx, top - 8);
    ctx.lineTo(gx, H - bottom + 8);
    ctx.stroke();
    ctx.fillText(String(v), gx, H - bottom + 20);
  }
  // zero axis
  ctx.strokeStyle = PALETTE.faint;
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  ctx.moveTo(x0, top - 10);
  ctx.lineTo(x0, H - bottom + 10);
  ctx.stroke();

  sorted.forEach((r, i) => {
    const y = top + i * rowH;
    const barH = rowH - 8;
    const w = px(r.balance) - x0;
    ctx.fillStyle = r.balance >= 0 ? PALETTE.surplus : PALETTE.deficit;
    const bx2 = w >= 0 ? x0 : x0 + w;
    roundRect(ctx, bx2, y, Math.abs(w), barH, 3);
    ctx.fill();
    // label
    font(ctx, 10.5);
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'right';
    const lab = `${r.code} · ${r.label}`;
    ctx.fillText(lab.length > 46 ? `${lab.slice(0, 45)}…` : lab, plotX - 12, y + barH / 2);
    // value at bar end — inside the bar when a long negative bar would
    // otherwise collide with the row label
    font(ctx, 10.5, { bold: true });
    const valueText = `${r.balance >= 0 ? '+' : '−'}${Math.abs(r.balance).toFixed(0)}`;
    if (r.balance < 0 && px(r.balance) - ctx.measureText(valueText).width - 8 < plotX) {
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(valueText, px(r.balance) + 8, y + barH / 2);
    } else {
      ctx.fillStyle = PALETTE.muted;
      ctx.textAlign = r.balance >= 0 ? 'left' : 'right';
      ctx.fillText(valueText, r.balance >= 0 ? px(r.balance) + 6 : px(r.balance) - 6, y + barH / 2);
    }
  });
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.faint;
  ctx.textAlign = 'left';
  ctx.fillText('Snapshot rendered at build time from the Trade backbone sheet — the sheet itself stays live.', 28, H - 16);
  return canvas.toBuffer('image/png');
}

/* --------------------------------------------------------- risk map figure */

/** points: [{ label, kind ('Raw material'|'Product'), ir, conc, supplier }] — both axes 0–100. */
export function renderRiskMapFigure(points) {
  const W = 1280, H = 900;
  const { canvas, ctx } = makeCanvas(W, H);
  const m = { l: 90, r: 40, t: 96, b: 76 };
  const pw = W - m.l - m.r, ph = H - m.t - m.b;
  const px = (v) => m.l + (v / 100) * pw;
  const py = (v) => m.t + ph - (v / 100) * ph;

  font(ctx, 18, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText('The import-dependency map — where imports are large AND one supplier dominates', 28, 28);
  font(ctx, 11.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('EC/JRC criticality figures, “as reported by” each source (Risk map sheet) · top-right corner = single-supplier chokepoints', 28, 52);

  // legend
  const leg = [
    ['Critical raw material', PALETTE.material],
    ['Manufactured product', PALETTE.product],
  ];
  let lx = W - 480;
  leg.forEach(([t, c]) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(lx, 46, 6, 0, Math.PI * 2);
    ctx.fill();
    font(ctx, 11);
    ctx.fillStyle = PALETTE.ink;
    ctx.fillText(t, lx + 12, 46);
    lx += 14 + ctx.measureText(t).width + 40;
  });

  // chokepoint quadrant tint — named in the subtitle, so no in-plot caption
  // that could collide with the dense top-right point labels
  ctx.fillStyle = 'rgba(184,50,48,0.06)';
  ctx.fillRect(px(75), m.t, pw * 0.25, py(75) - m.t);

  // grid + axes
  ctx.textAlign = 'center';
  for (let v = 0; v <= 100; v += 25) {
    ctx.strokeStyle = PALETTE.grid;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px(v), m.t);
    ctx.lineTo(px(v), m.t + ph);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(m.l, py(v));
    ctx.lineTo(m.l + pw, py(v));
    ctx.stroke();
    font(ctx, 10);
    ctx.fillStyle = PALETTE.faint;
    ctx.fillText(String(v), px(v), m.t + ph + 18);
    ctx.textAlign = 'right';
    ctx.fillText(String(v), m.l - 10, py(v));
    ctx.textAlign = 'center';
  }
  font(ctx, 11.5, { bold: true });
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Import reliance — share of EU demand met by imports (%)', m.l + pw / 2, H - 26);
  ctx.save();
  ctx.translate(30, m.t + ph / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.fillText('Supplier concentration — largest supplier’s share (%)', 0, 0);
  ctx.restore();

  // points first (so labels never sit under a dot), then labels with
  // candidate-based placement: try right/left of the dot at increasing
  // vertical offsets, clamp to the canvas, and never overlap a placed label.
  const pts = points.map((pt) => ({ ...pt, x: px(pt.ir), y: py(pt.conc) }));
  pts.forEach((pt) => {
    ctx.fillStyle = pt.kind === 'Product' ? PALETTE.product : PALETTE.material;
    ctx.strokeStyle = PALETTE.surface;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  const placed = [];
  const overlaps = (x, y, w2) =>
    placed.some((p) => Math.abs(p.y - y) < 14 && x < p.x + p.w + 6 && x + w2 + 6 > p.x);
  font(ctx, 10);
  // label the rightmost/densest region first so crowded points get first pick
  [...pts].sort((a, b) => b.x - a.x || b.y - a.y).forEach((pt) => {
    const text = `${pt.label} (${pt.supplier})`;
    const w2 = ctx.measureText(text).width;
    const nearRightEdge = pt.x > m.l + pw * 0.8;
    const offsets = [0, 15, -15, 30, -30, 45, 60];
    const sides = nearRightEdge ? ['left', 'right'] : ['right', 'left'];
    let done = false;
    for (const dy of offsets) {
      for (const side of sides) {
        const lx2 = side === 'right' ? pt.x + 11 : pt.x - 11 - w2;
        const ly = pt.y + dy;
        if (lx2 < 4 || lx2 + w2 > W - 6 || ly < m.t - 24 || ly > m.t + ph + 20) continue;
        if (overlaps(lx2, ly, w2)) continue;
        ctx.textAlign = 'left';
        ctx.fillStyle = PALETTE.ink;
        ctx.fillText(text, lx2, ly);
        if (dy !== 0) {
          ctx.strokeStyle = PALETTE.faint;
          ctx.lineWidth = 0.8;
          ctx.beginPath();
          ctx.moveTo(pt.x + (side === 'right' ? 8 : -8), pt.y + Math.sign(dy) * 6);
          ctx.lineTo(side === 'right' ? lx2 - 2 : lx2 + w2 + 2, ly);
          ctx.stroke();
        }
        placed.push({ x: lx2, y: ly, w: w2 });
        done = true;
        break;
      }
      if (done) break;
    }
  });

  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.faint;
  ctx.textAlign = 'left';
  ctx.fillText('Snapshot rendered at build time from the Risk map sheet — the sheet itself stays live.', 28, H - 8);
  return canvas.toBuffer('image/png');
}

/* ------------------------------------------------ import-content bar figure */

/** rows: [{ code, label, value }] — model import content of final demand, %, pre-sorted. */
export function renderImportContentFigure(rows, year) {
  const W = 1280;
  const rowH = 34;
  const top = 86, bottom = 46;
  const H = top + rows.length * rowH + bottom;
  const { canvas, ctx } = makeCanvas(W, H);
  const labelW = 430;
  const plotW = W - labelW - 110;
  const maxV = Math.max(...rows.map((r) => r.value));

  font(ctx, 18, { bold: true });
  ctx.fillStyle = PALETTE.ink;
  ctx.textAlign = 'left';
  ctx.fillText(`Import content of final demand — the model's most import-exposed industries, ${year}`, 28, 28);
  font(ctx, 11.5);
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('Cents of every euro of final demand that end up as extra-EU imports, direct + indirect (Leontief derivation, Multipliers sheet)', 28, 52);

  for (let v = 0; v <= Math.ceil(maxV / 10) * 10; v += 10) {
    const gx = labelW + (v / maxV) * (plotW - 10);
    ctx.strokeStyle = PALETTE.grid;
    ctx.beginPath();
    ctx.moveTo(gx, top - 8);
    ctx.lineTo(gx, H - bottom + 4);
    ctx.stroke();
    font(ctx, 9.5);
    ctx.fillStyle = PALETTE.faint;
    ctx.textAlign = 'center';
    ctx.fillText(String(v), gx, H - bottom + 16);
  }

  rows.forEach((r, i) => {
    const y = top + i * rowH;
    const barH = rowH - 10;
    const w = (r.value / maxV) * (plotW - 10);
    ctx.fillStyle = PALETTE.single;
    roundRect(ctx, labelW, y, w, barH, 3);
    ctx.fill();
    font(ctx, 10.5);
    ctx.fillStyle = PALETTE.ink;
    ctx.textAlign = 'right';
    const lab = `${r.code} · ${r.label}`;
    ctx.fillText(lab.length > 60 ? `${lab.slice(0, 59)}…` : lab, labelW - 12, y + barH / 2);
    font(ctx, 10.5, { bold: true });
    ctx.fillStyle = PALETTE.muted;
    ctx.textAlign = 'left';
    ctx.fillText(`${r.value.toFixed(1)} %`, labelW + w + 8, y + barH / 2);
  });
  font(ctx, 9.5);
  ctx.fillStyle = PALETTE.faint;
  ctx.textAlign = 'left';
  ctx.fillText('Snapshot rendered at build time from the Multipliers sheet — the sheet itself stays live.', 28, H - 12);
  return canvas.toBuffer('image/png');
}
