/**
 * Newton Media spreadsheet import.
 *
 * Newton Media is a paid press-monitoring service; the ESABCC receives a
 * weekly export as .xlsx. It covers print, broadcast and paywalled outlets
 * that no RSS or alert feed reaches, so it is the other half of the coverage
 * pool alongside the alert feeds.
 *
 * Rows land in the same `media_articles` table as feed coverage, tagged
 * `discovery_source = 'newton'`, so every dashboard lens spans both sources
 * without special-casing.
 *
 * ── Export quirks this handles ────────────────────────────────────────────
 *  * `Original Internet Source` arrives as an Excel formula string,
 *    `=HYPERLINK("https://…")`, not a bare URL.
 *  * Numeric columns arrive as strings, sometimes with thousands separators
 *    or a decimal comma depending on the exporting locale.
 *  * `Topic Hierarchy` is "ESABCC > Germany" — the country sits after the
 *    last separator.
 *  * `Sentiment` is "Unknown" for almost every row rather than empty.
 *  * Column order is not stable between exports, so columns are located by
 *    header name.
 */

import ExcelJS from 'exceljs';

export interface NewtonArticle {
  article_code: string;
  url: string | null;
  title: string;
  summary: string;
  full_text: string | null;
  source_name: string;
  outlet_domain: string | null;
  country: string | null;
  language: string | null;
  author: string | null;
  media_type: string | null;
  published_at: string | null;
  estimated_reach: number;
  sentiment: string | null;
  /** Newton's advertising-value equivalent, kept for reporting. */
  ave: number | null;
}

export interface NewtonImportResult {
  articles: NewtonArticle[];
  /** Rows skipped, with the reason, so an operator can see what was dropped. */
  skipped: { row: number; reason: string }[];
  /** Header names found in the sheet, for diagnostics on a format change. */
  headers: string[];
}

/* ------------------------------------------------------------------ */
/*  Cell helpers                                                       */
/* ------------------------------------------------------------------ */

/**
 * Read a cell as text.
 *
 * ExcelJS returns rich text, formula and hyperlink cells as objects rather
 * than strings; flatten all of them to plain text.
 */
function cellText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value instanceof Date) return value.toISOString();

  const obj = value as Record<string, unknown>;
  if (typeof obj.text === 'string') return obj.text.trim();
  if (typeof obj.result === 'string') return obj.result.trim();
  if (typeof obj.hyperlink === 'string') return obj.hyperlink.trim();
  if (Array.isArray(obj.richText)) {
    return obj.richText
      .map((part) => String((part as { text?: string }).text ?? ''))
      .join('')
      .trim();
  }
  if (typeof obj.formula === 'string' && obj.result !== undefined) {
    return String(obj.result).trim();
  }
  return '';
}

/**
 * Pull the URL out of a Newton link cell.
 *
 * These arrive as `=HYPERLINK("https://…")` — sometimes as a formula object
 * with that text, sometimes as the literal string. Both are handled, as is a
 * bare URL, since the format has changed between exports before.
 */
export function extractHyperlink(value: unknown): string | null {
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.hyperlink === 'string' && obj.hyperlink.startsWith('http')) {
      return obj.hyperlink;
    }
  }
  const text = cellText(value);
  if (!text) return null;

  const formula = text.match(/HYPERLINK\(\s*["']([^"']+)["']/i);
  if (formula) return formula[1];

  const bare = text.match(/https?:\/\/\S+/);
  return bare ? bare[0].replace(/[),"']+$/, '') : null;
}

/**
 * Parse a Newton numeric cell.
 *
 * Values arrive as strings and the locale varies: "1 234,56", "1,234.56" and
 * "212010" all appear. Separators are stripped and the decimal mark inferred
 * from which symbol appears last.
 */
export function parseNumber(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  const text = cellText(value);
  if (!text) return null;

  const cleaned = text.replace(/[\s ]/g, '');
  const lastComma = cleaned.lastIndexOf(',');
  const lastDot = cleaned.lastIndexOf('.');

  let normalised: string;
  if (lastComma > lastDot) {
    // Decimal comma: strip dots as thousands separators, comma becomes dot.
    normalised = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    // Decimal dot (or no decimals): strip commas as thousands separators.
    normalised = cleaned.replace(/,/g, '');
  }

  const n = Number(normalised);
  return Number.isFinite(n) ? n : null;
}

/** Parse a Newton date cell to ISO, or null when unparseable. */
export function parseDate(value: unknown): string | null {
  if (value instanceof Date) return value.toISOString();
  const text = cellText(value);
  if (!text) return null;

  // "2026-03-24 00:00:00" — treated as UTC. Newton exports without a zone,
  // and a date-only value shifting a day either way would move articles
  // between weeks in the timeline.
  const iso = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (iso) {
    const [, y, m, d, hh = '00', mm = '00', ss = '00'] = iso;
    return new Date(
      Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm), Number(ss)),
    ).toISOString();
  }

  // "24.03.2026" / "24/03/2026" — day-first, the European convention Newton
  // uses. Never month-first: reading 03/04 as March 4th rather than April 3rd
  // would silently misdate a whole quarter of the rows.
  const euro = text.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})/);
  if (euro) {
    const [, d, m, y] = euro;
    return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d))).toISOString();
  }

  const parsed = Date.parse(text);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null;
}

/** "ESABCC > Germany" -> "Germany". */
export function countryFromTopicHierarchy(value: string): string | null {
  if (!value) return null;
  const parts = value.split('>').map((p) => p.trim()).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1] : null;
}

function domainFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/*  Header mapping                                                     */
/* ------------------------------------------------------------------ */

/**
 * Header aliases per logical field. Newton's column set differs between
 * export profiles, so each field lists every header seen, in priority order.
 */
const HEADER_ALIASES: Record<string, string[]> = {
  article_code: ['article code', 'articlecode', 'code'],
  published_at: ['publish date', 'published', 'date'],
  title: ['title', 'headline'],
  topic: ['topic'],
  topic_hierarchy: ['topic hierarchy'],
  source: ['source', 'media', 'medium'],
  source_country: ['source country', 'country'],
  media_type: ['mediatype', 'media type'],
  author: ['author'],
  summary: ['summary', 'abstract'],
  full_text: ['fulltext', 'full text', 'text'],
  sentiment: ['sentiment'],
  url: ['original internet source', 'url', 'link', 'internet source'],
  ave: ['ave'],
  reach: ['article readership', 'reach', 'readership', 'ru/day', 'monthly visits'],
};

/** Locate each logical field's column index from the header row. */
export function mapHeaders(headers: string[]): Record<string, number> {
  const normalised = headers.map((h) => (h ?? '').toString().trim().toLowerCase());
  const map: Record<string, number> = {};

  for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
    for (const alias of aliases) {
      const idx = normalised.indexOf(alias);
      if (idx !== -1) {
        map[field] = idx;
        break;
      }
    }
  }
  return map;
}

/* ------------------------------------------------------------------ */
/*  Parser                                                             */
/* ------------------------------------------------------------------ */

/**
 * Parse a Newton Media .xlsx export into article records.
 *
 * Rows without a usable title are skipped rather than stored as blanks, and
 * every skip is reported so a format change surfaces as "280 of 301 rows
 * skipped: no title" instead of a quietly short import.
 */
export async function parseNewtonWorkbook(
  buffer: ArrayBuffer,
): Promise<NewtonImportResult> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sheet = workbook.worksheets[0];
  if (!sheet) {
    return { articles: [], skipped: [], headers: [] };
  }

  const headerRow = sheet.getRow(1);
  const headers: string[] = [];
  headerRow.eachCell({ includeEmpty: true }, (cell, col) => {
    headers[col - 1] = cellText(cell.value);
  });

  const cols = mapHeaders(headers);
  const articles: NewtonArticle[] = [];
  const skipped: { row: number; reason: string }[] = [];

  // Newton sometimes exports the same article once per matched topic. Keep
  // the first occurrence and merge nothing — the rows are identical apart
  // from the topic, which we take from the first anyway.
  const seenCodes = new Set<string>();

  const at = (row: ExcelJS.Row, field: string): unknown =>
    cols[field] === undefined ? null : row.getCell(cols[field] + 1).value;

  for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);

    const title = cellText(at(row, 'title'));
    if (!title) {
      // Trailing blank rows are normal in these exports; don't report them.
      const anyContent = cellText(at(row, 'article_code')) || cellText(at(row, 'source'));
      if (anyContent) skipped.push({ row: rowNumber, reason: 'no title' });
      continue;
    }

    const articleCode = cellText(at(row, 'article_code'));
    if (articleCode && seenCodes.has(articleCode)) {
      skipped.push({ row: rowNumber, reason: 'duplicate article code' });
      continue;
    }
    if (articleCode) seenCodes.add(articleCode);

    const url = extractHyperlink(at(row, 'url'));
    const source = cellText(at(row, 'source'));

    // Country: the explicit column first, then the topic hierarchy tail.
    const countryRaw =
      cellText(at(row, 'source_country')) ||
      countryFromTopicHierarchy(cellText(at(row, 'topic_hierarchy'))) ||
      cellText(at(row, 'topic'));

    const sentimentRaw = cellText(at(row, 'sentiment'));

    articles.push({
      article_code: articleCode,
      url,
      title,
      summary: cellText(at(row, 'summary')).slice(0, 2000),
      full_text: cellText(at(row, 'full_text')) || null,
      source_name: source,
      // Newton's `Source` is usually already a domain ("caneurope.org"), so
      // fall back to it when the row has no usable link.
      outlet_domain: domainFromUrl(url) ?? (source.includes('.') ? source.toLowerCase() : null),
      country: countryRaw || null,
      language: null,
      author: cellText(at(row, 'author')) || null,
      media_type: cellText(at(row, 'media_type')) || null,
      published_at: parseDate(at(row, 'published_at')),
      estimated_reach: Math.max(0, Math.round(parseNumber(at(row, 'reach')) ?? 0)),
      // Newton writes "Unknown" rather than leaving the cell empty; store
      // null so the dashboard can tell "not scored" from a real reading.
      sentiment:
        sentimentRaw && sentimentRaw.toLowerCase() !== 'unknown' ? sentimentRaw : null,
      ave: parseNumber(at(row, 'ave')),
    });
  }

  return { articles, skipped, headers };
}
