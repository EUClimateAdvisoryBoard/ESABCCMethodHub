/**
 * Method-figure renderer for the Trade Flows IO-model masterfile.
 * ---------------------------------------------------------------
 * renderMethodFigure() draws the method DIAGRAM as a PNG buffer with
 * @napi-rs/canvas (existing project dependency; DejaVu Sans from the system
 * fonts): the anatomy of the input–output table and the derivation pipeline
 * Z → A → L → applications, with the workbook sheet that holds each step.
 * A diagram is explanatory rather than data-driven, so an image is the right
 * medium here — the DATA figures are native Excel charts generated from the
 * sheet ranges by trade-flows-workbook-charts.mjs instead.
 *
 * Colours: chart palette validated for colour-vision deficiency
 * (deutan/protan/tritan ΔE and lightness/chroma/contrast checks) — see
 * PALETTE below.
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

