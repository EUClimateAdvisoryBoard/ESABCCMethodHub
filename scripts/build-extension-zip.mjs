#!/usr/bin/env node
/**
 * Build the browser extension into a zip the dashboard can offer as a
 * download. Runs in `npm run build` via package.json's prebuild hook.
 *
 * Input:  browser-extension/ (source tree)
 * Output: public/esabcc-capture.zip
 */

import { readdirSync, readFileSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const ROOT = join(__dirname, '..');
const SRC = join(ROOT, 'browser-extension');
const OUT_DIR = join(ROOT, 'public');
const OUT_FILE = join(OUT_DIR, 'esabcc-capture.zip');

function walk(dir) {
  const out = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full));
    } else {
      out.push(full);
    }
  }
  return out;
}

async function build() {
  const files = walk(SRC);
  const zip = new JSZip();
  for (const abs of files) {
    const rel = relative(SRC, abs).split('\\').join('/');
    zip.file(rel, readFileSync(abs));
  }
  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 },
  });
  mkdirSync(OUT_DIR, { recursive: true });
  writeFileSync(OUT_FILE, buffer);
  console.log(`Wrote ${relative(ROOT, OUT_FILE)} (${buffer.length} bytes, ${files.length} files)`);
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
