/**
 * Generic chart image export.
 * ---------------------------
 * Downloads any chart container — a Chart.js `<canvas>` or a vector
 * `<svg>` (d3 / Leaflet) — as PNG, JPG, or SVG, so every chart in the
 * Project Workspace exposes the same one-click download options without
 * each module re-implementing the rasterisation dance.
 *
 * A 1-line provenance footer (see `buildExportProvenance`) is baked into
 * the artefact so a downloaded figure stays attributable once it leaves
 * the app.
 *
 * This is the workspace-facing sibling of
 * `src/components/charts/exportUtils.ts` (which the Scenario Explorer
 * uses); the rasterisation logic is intentionally similar but generalised
 * to accept a JPG target and any container element.
 */
'use client';

import { saveAs } from 'file-saver';

export type ChartImageFormat = 'png' | 'jpg' | 'svg';

const FOOTER_FONT = '11px "Segoe UI", system-ui, sans-serif';
const FOOTER_PADDING = 8;
const FOOTER_HEIGHT = 22;
const FOOTER_COLOR = '#54728C';
const JPG_QUALITY = 0.95;

/** Build a short, presentation-ready provenance line for a download. */
export function buildExportProvenance(parts: (string | null | undefined)[]): string {
  const today = new Date().toISOString().slice(0, 10);
  const cleaned = parts.filter((p): p is string => !!p && p.trim().length > 0);
  return ['ESABCC MethodHub', ...cleaned, `exported ${today}`].join(' · ');
}

function withFooterCanvas(src: HTMLCanvasElement, footer: string | undefined): HTMLCanvasElement {
  if (!footer) return src;
  const out = document.createElement('canvas');
  out.width = src.width;
  out.height = src.height + FOOTER_HEIGHT;
  const ctx = out.getContext('2d');
  if (!ctx) return src;
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(0, 0, out.width, out.height);
  ctx.drawImage(src, 0, 0);
  ctx.font = FOOTER_FONT;
  ctx.fillStyle = FOOTER_COLOR;
  ctx.textBaseline = 'middle';
  ctx.fillText(footer, FOOTER_PADDING, src.height + FOOTER_HEIGHT / 2);
  return out;
}

function saveCanvas(
  canvas: HTMLCanvasElement,
  filename: string,
  format: 'png' | 'jpg',
  footer?: string
) {
  // JPG has no alpha — flatten onto white first so transparent chart
  // backgrounds don't turn black.
  let base = canvas;
  if (format === 'jpg') {
    const flat = document.createElement('canvas');
    flat.width = canvas.width;
    flat.height = canvas.height;
    const fctx = flat.getContext('2d');
    if (fctx) {
      fctx.fillStyle = '#FFFFFF';
      fctx.fillRect(0, 0, flat.width, flat.height);
      fctx.drawImage(canvas, 0, 0);
      base = flat;
    }
  }
  const out = withFooterCanvas(base, footer);
  const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
  out.toBlob(
    blob => {
      if (blob) saveAs(blob, `${filename}.${format}`);
    },
    mime,
    format === 'jpg' ? JPG_QUALITY : undefined
  );
}

/** Rasterise a vector `<svg>` to a 2×-scaled canvas, then hand off to `saveCanvas`. */
function rasterizeSvg(
  svg: SVGSVGElement,
  filename: string,
  format: 'png' | 'jpg',
  footer?: string
) {
  const data = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const w = img.width || svg.clientWidth || 800;
    const h = img.height || svg.clientHeight || 400;
    const c = document.createElement('canvas');
    c.width = w * 2;
    c.height = h * 2;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      ctx.drawImage(img, 0, 0);
      saveCanvas(c, filename, format, footer);
    }
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

function saveSvg(container: HTMLElement, filename: string, footer?: string) {
  const canvas = container.querySelector('canvas');
  const svg = container.querySelector('svg');
  let w = 800;
  let h = 400;
  let fragment = '';
  if (svg) {
    w = svg.viewBox?.baseVal?.width || svg.clientWidth || svg.getBoundingClientRect().width || 800;
    h = svg.viewBox?.baseVal?.height || svg.clientHeight || svg.getBoundingClientRect().height || 400;
    fragment = new XMLSerializer().serializeToString(svg);
  } else if (canvas) {
    // Chart.js renders to a raster canvas — embed it as an <image> so the
    // produced .svg still opens, just without true vector paths.
    w = canvas.width;
    h = canvas.height;
    fragment = `<image href="${canvas.toDataURL('image/png')}" width="${w}" height="${h}"/>`;
  } else {
    return;
  }
  const total = footer ? h + FOOTER_HEIGHT : h;
  const footerEl = footer
    ? `<text x="${FOOTER_PADDING}" y="${h + FOOTER_HEIGHT / 2 + 4}" font-family="Segoe UI, system-ui, sans-serif" font-size="11" fill="${FOOTER_COLOR}">${escapeXml(
        footer
      )}</text>`
    : '';
  const doc = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${total}"><rect x="0" y="0" width="${w}" height="${total}" fill="#FFFFFF"/><g>${fragment}</g>${footerEl}</svg>`;
  saveAs(new Blob([doc], { type: 'image/svg+xml;charset=utf-8' }), `${filename}.svg`);
}

/**
 * Download the chart inside `container` in the requested format.
 * Resolves a `<canvas>` first (Chart.js), else a `<svg>` (d3 / Leaflet).
 */
export function downloadChartImage(
  container: HTMLElement,
  filename: string,
  format: ChartImageFormat,
  footer?: string
) {
  if (format === 'svg') {
    saveSvg(container, filename, footer);
    return;
  }
  const canvas = container.querySelector('canvas');
  if (canvas) {
    saveCanvas(canvas, filename, format, footer);
    return;
  }
  const svg = container.querySelector('svg');
  if (svg) {
    rasterizeSvg(svg as SVGSVGElement, filename, format, footer);
  }
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
