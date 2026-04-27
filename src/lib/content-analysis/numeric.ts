// ---------------------------------------------------------------------------
// Numeric extraction helpers for mixed-methods workflows.
//
// Reviewers asked: "If we wanted to extract numbers from documents/budgets
// and create our own tables, can we do that in the platform?" Yes — the
// answer is to overlay structured numeric metadata on top of the existing
// CodedSegment, so a number ends up tagged qualitatively (under whatever
// code) AND carries value/unit/year/label fields ready for export.
//
// This module is the parser layer: turn a verbatim text snippet into a
// best-effort {value, unit, year} guess that pre-fills the extraction
// dialog. The user can always edit afterwards.
// ---------------------------------------------------------------------------

import type { NumericExtraction } from './types';

/** Parse a number out of a free-text snippet, normalising European decimal
 *  separators and handling magnitude suffixes ("3.4 bn", "55%"). Returns
 *  NaN if no number can be salvaged. */
export function parseNumberFromText(text: string): number {
  // Pull the first number-shaped token. Accepts "3,4", "3.4", "3 400", and
  // ranges like "55–60" (returns 55 — the user can edit if they wanted 60).
  const m = text.match(/-?\d{1,3}(?:[ .,]\d{3})*(?:[.,]\d+)?/);
  if (!m) return NaN;
  const raw = m[0];
  // Heuristic: if a comma appears as the last separator and there's at
  // most one, treat it as a decimal mark (European). Otherwise commas are
  // thousands separators.
  const lastDot = raw.lastIndexOf('.');
  const lastComma = raw.lastIndexOf(',');
  let normalized: string;
  if (lastComma > lastDot) {
    // Comma is the decimal — strip dots/spaces, replace last comma with dot.
    normalized = raw.replace(/[ .]/g, '').replace(/,/, '.');
  } else {
    // Dot is the decimal — strip commas/spaces.
    normalized = raw.replace(/[ ,]/g, '');
  }
  const v = Number(normalized);
  // Magnitude suffix multipliers ("3.4 bn EUR" → 3.4 × 10^9).
  const lower = text.toLowerCase();
  if (Number.isFinite(v)) {
    if (/\bbn|billion\b/.test(lower)) return v * 1e9;
    if (/\bmn|mln|million\b/.test(lower)) return v * 1e6;
    if (/\bk\b|\bthousand\b/.test(lower)) return v * 1e3;
  }
  return v;
}

const UNIT_PATTERNS: Array<{ rx: RegExp; unit: string }> = [
  { rx: /€\s*(?:bn|billion)|eur(?:o)?\s*(?:bn|billion)|billion\s*eur/i, unit: 'EUR bn' },
  { rx: /€\s*(?:mn|million)|eur(?:o)?\s*(?:mn|million)|million\s*eur/i, unit: 'EUR mn' },
  { rx: /€\s*\d|eur(?:o)?\b/i, unit: 'EUR' },
  { rx: /\$\s*\d|usd\b|us\s*dollars?/i, unit: 'USD' },
  { rx: /%/, unit: '%' },
  { rx: /\bgw\b/i, unit: 'GW' },
  { rx: /\bmw\b/i, unit: 'MW' },
  { rx: /\btwh\b/i, unit: 'TWh' },
  { rx: /\bgwh\b/i, unit: 'GWh' },
  { rx: /\bmt\b|megatonn?es?/i, unit: 'Mt' },
  { rx: /\bgt\b|gigatonn?es?/i, unit: 'Gt' },
  { rx: /\bco2\s*eq?|co₂\s*eq?/i, unit: 'CO₂eq' },
  { rx: /\bha\b|hectares?/i, unit: 'ha' },
  { rx: /\bkm²|sq\.?\s*km|square\s*kilom/i, unit: 'km²' },
];

export function guessUnit(text: string): string | undefined {
  for (const p of UNIT_PATTERNS) if (p.rx.test(text)) return p.unit;
  return undefined;
}

const YEAR_PATTERNS = [
  /\b(19|20)\d{2}\s*[–-]\s*(19|20)?\d{2}\b/, // 2021–2027 / 2021-27
  /\b(19|20)\d{2}\b/,                         // 2030
  /\bby\s+(19|20)\d{2}\b/i,
];

export function guessYear(text: string): string | undefined {
  for (const rx of YEAR_PATTERNS) {
    const m = text.match(rx);
    if (m) return m[0].replace(/^by\s+/i, '');
  }
  return undefined;
}

/** Best-effort extraction from a verbatim snippet. Always returns an
 *  object — but value may be NaN if no number was found. The caller
 *  should fall back to manual entry in that case. */
export function guessNumericExtraction(text: string): NumericExtraction {
  return {
    value: parseNumberFromText(text),
    unit: guessUnit(text),
    year: guessYear(text),
    label: undefined,
  };
}

/** Format a number for display in tables — keeps it compact even when
 *  multiplied by magnitude suffixes (3.4 bn → "3.40e9" looks bad, so we
 *  use significant figures for big numbers and plain digits for small). */
export function formatNumeric(value: number, unit?: string): string {
  if (!Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  let body: string;
  if (abs >= 1e9) body = (value / 1e9).toFixed(2).replace(/\.?0+$/, '') + ' bn';
  else if (abs >= 1e6) body = (value / 1e6).toFixed(2).replace(/\.?0+$/, '') + ' mn';
  else if (abs >= 1e3) body = value.toLocaleString('en-GB');
  else body = value.toString();
  return unit ? `${body} ${unit}` : body;
}
