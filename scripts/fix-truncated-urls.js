#!/usr/bin/env node
/**
 * Fix truncated URLs in references.ts
 *
 * Many url fields were truncated during PDF extraction (they end with a hyphen).
 * The fullCitation field often contains the full URL (with spaces at line breaks).
 * This script extracts the URL from fullCitation, removes spurious spaces, and
 * patches the url field in references.ts.
 */

const fs = require('fs');
const path = require('path');

const REF_FILE = path.join(__dirname, '..', 'src', 'data', 'references.ts');

let content = fs.readFileSync(REF_FILE, 'utf-8');

// Match truncated URL entries: url field ending with a hyphen before the closing quote
const truncatedPattern = /url: '(https:\/\/[^']*-)'/g;

let fixCount = 0;
let nullCount = 0;
let noMatchCount = 0;

// For each reference block, find ones with truncated URLs and try to fix
// We'll work with the whole file as text and process each reference entry

// Strategy: find each `url: 'https://...-'` and look at the corresponding fullCitation
// in the same reference block to extract the real URL

// Split content into reference blocks
const blocks = content.split(/(?=\{\s*\n\s*id: 'ref-)/);

const fixedBlocks = blocks.map(block => {
  // Check if this block has a truncated URL
  const urlMatch = block.match(/url: '(https:\/\/[^']*-)'/);
  if (!urlMatch) return block;

  const truncatedUrl = urlMatch[1];

  // Extract URL from fullCitation
  // Pattern: (https://...) at the end, or https://... followed by ).
  const citationMatch = block.match(/fullCitation: ['"`][\s\S]*?(https?:\/\/[\s\S]*?)(?:\)\s*[.'"`]|['"`]\s*,?\s*$)/m);

  if (!citationMatch) {
    noMatchCount++;
    return block;
  }

  let fullUrl = citationMatch[1]
    // Remove spaces that were line breaks in the PDF
    .replace(/\s+/g, '')
    // Remove trailing punctuation
    .replace(/[).,;'"`]+$/, '')
    // Remove any trailing parenthesis content
    .replace(/\).*$/, '');

  // Validate it starts with the truncated part (minus the trailing hyphen issue)
  // The truncated URL might be a prefix of the full URL
  const truncatedBase = truncatedUrl.replace(/-$/, '');

  if (fullUrl.startsWith(truncatedBase) || fullUrl.includes(truncatedBase.split('//')[1]?.split('/')[0] || 'NOMATCH')) {
    // Replace the truncated URL with the fixed one
    block = block.replace(
      `url: '${truncatedUrl}'`,
      `url: '${fullUrl}'`
    );
    fixCount++;
  } else {
    // If we can't match, set to null rather than keep broken URL
    block = block.replace(
      `url: '${truncatedUrl}'`,
      `url: null`
    );
    nullCount++;
  }

  return block;
});

content = fixedBlocks.join('');
fs.writeFileSync(REF_FILE, content, 'utf-8');

console.log(`Fixed ${fixCount} truncated URLs`);
console.log(`Set ${nullCount} to null (couldn't extract full URL)`);
console.log(`${noMatchCount} had no fullCitation URL to extract`);
