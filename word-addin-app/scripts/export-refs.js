/**
 * Export references from ../src/data/references.ts to data/references.json
 *
 * Usage: node scripts/export-refs.js
 */

const fs = require('fs');
const path = require('path');

const srcPath = path.resolve(__dirname, '../../src/data/references.ts');
const outPath = path.resolve(__dirname, '../data/references.json');

if (!fs.existsSync(srcPath)) {
  console.error('Source file not found:', srcPath);
  process.exit(1);
}

const src = fs.readFileSync(srcPath, 'utf-8');

// Extract the array portion from the TypeScript source.
// The array starts after "export const references: Reference[] = [" and ends at the final "];".
const arrayStartMarker = 'export const references: Reference[] = [';
const startIdx = src.indexOf(arrayStartMarker);
if (startIdx === -1) {
  console.error('Could not locate the references array in the source file.');
  process.exit(1);
}

// Find the content starting from the opening bracket
const fromBracket = src.substring(startIdx + arrayStartMarker.length - 1); // include the '['

// We need to find the matching closing bracket.
let depth = 0;
let endIdx = -1;
for (let i = 0; i < fromBracket.length; i++) {
  if (fromBracket[i] === '[') depth++;
  else if (fromBracket[i] === ']') {
    depth--;
    if (depth === 0) {
      endIdx = i;
      break;
    }
  }
}

if (endIdx === -1) {
  console.error('Could not find end of references array.');
  process.exit(1);
}

const arrayStr = fromBracket.substring(0, endIdx + 1);

// The TS source uses single-quoted strings and may have trailing commas.
// We'll evaluate it safely by converting to valid JSON-like structure.
// Strategy: use a Function constructor (no eval) to parse the JS object literal array.
let references;
try {
  // Wrap in a function that returns the array
  const fn = new Function('return ' + arrayStr);
  references = fn();
} catch (e) {
  console.error('Failed to parse references array:', e.message);
  console.error('Attempting fallback regex-based extraction...');

  // Fallback: extract objects using regex
  references = [];
  const objRegex = /\{[^}]*id:\s*'([^']*)'[^}]*\}/gs;
  // This simple regex won't work for nested objects. Use a bracket-matching approach instead.
  let objDepth = 0;
  let objStart = -1;
  for (let i = 0; i < arrayStr.length; i++) {
    if (arrayStr[i] === '{') {
      if (objDepth === 0) objStart = i;
      objDepth++;
    } else if (arrayStr[i] === '}') {
      objDepth--;
      if (objDepth === 0 && objStart !== -1) {
        const objStr = arrayStr.substring(objStart, i + 1);
        try {
          const fn2 = new Function('return ' + objStr);
          references.push(fn2());
        } catch (e2) {
          // skip malformed entries
        }
        objStart = -1;
      }
    }
  }
}

// Ensure output directory exists
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

fs.writeFileSync(outPath, JSON.stringify(references, null, 2), 'utf-8');
console.log(`Exported ${references.length} references to ${outPath}`);
