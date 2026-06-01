#!/usr/bin/env node
/**
 * Build a same-origin EU-27 GeoJSON from the world-atlas topojson that ships
 * in node_modules. Output is written to public/data/eu27-boundaries.geojson
 * and served by Next.js as a static asset, so the client doesn't need to
 * reach out to a CDN (which the site's CSP `connect-src` directive blocks).
 *
 * Run via `node scripts/build-eu27-geojson.mjs` — invoked from prebuild.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as topojsonClient from 'topojson-client';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

// 50m topology — ~740 KB, gives nicely detailed EU coastlines. Filter down
// to EU-27 by ISO numeric.
const SRC = path.join(root, 'node_modules/world-atlas/countries-50m.json');
const OUT_DIR = path.join(root, 'public/data');
const OUT = path.join(OUT_DIR, 'eu27-boundaries.geojson');

const EU_N3 = new Set([
  '040', // AT
  '056', // BE
  '100', // BG
  '196', // CY
  '203', // CZ
  '208', // DK
  '233', // EE
  '246', // FI
  '250', // FR
  '276', // DE
  '300', // GR
  '348', // HU
  '372', // IE
  '380', // IT
  '428', // LV
  '440', // LT
  '442', // LU
  '470', // MT
  '528', // NL
  '616', // PL
  '620', // PT
  '642', // RO
  '703', // SK
  '705', // SI
  '724', // ES
  '752', // SE
  '191', // HR
]);

if (!fs.existsSync(SRC)) {
  console.warn(`[eu27-geojson] world-atlas/countries-50m.json not found at ${SRC}; skipping.`);
  process.exit(0);
}

const topo = JSON.parse(fs.readFileSync(SRC, 'utf8'));
const fc = topojsonClient.feature(topo, topo.objects.countries);

const features = fc.features.filter(f => {
  const id = String(f.id ?? '').padStart(3, '0');
  return EU_N3.has(id);
}).map(f => ({
  ...f,
  // Normalise the id to a zero-padded 3-digit string for the client.
  id: String(f.id ?? '').padStart(3, '0'),
}));

const out = { type: 'FeatureCollection', features };

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out));
const bytes = fs.statSync(OUT).size;
console.log(`[eu27-geojson] wrote ${features.length} features (${(bytes / 1024).toFixed(1)} KB) → ${path.relative(root, OUT)}`);
