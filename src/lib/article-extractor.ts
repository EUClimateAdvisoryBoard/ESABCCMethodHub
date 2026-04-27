/**
 * HTML → article-body extractor.
 * ------------------------------
 * Given a raw HTML page (EUR-Lex, news article, ESABCC report PDF
 * rendered to HTML), return a clean text body suitable for display
 * in the FullTextViewer or for ingestion into Content Analysis.
 *
 * Strategy:
 *   - Strip navigation, footnote-numbering chrome, cookie banners.
 *   - Prefer semantic anchors (`<main>`, `<article>`) when present.
 *   - Fall back to heuristic "biggest text block with the fewest
 *     links per paragraph" when the source is unstructured.
 *
 * The `ExtractResult` envelope carries a `label` tag (`eur-lex`,
 * `news`, `esabcc-report`, …) so downstream callers can apply a
 * source-specific post-processor if they need to. `found: false`
 * means the extractor gave up and the caller should fall back to
 * a raw-HTML render or a "failed to parse" placeholder.
 */
import type { Policy } from './types';

export interface ExtractResult {
  found: boolean;
  text: string;
  label: string;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Match next heading in a legal text. Article/Annex must be followed by
// whitespace and an em/en dash to distinguish a heading from body prose that
// happens to reference "Article N ...".
const END_HEADING = /^(Article\s+[\w-]+\s+[—–-]|CHAPTER\s+[IVX]+\b|ANNEX\s+\w+\s+[—–-]|Done at\b|Brussels,|This (Regulation|Directive) is addressed|This (Regulation|Directive) shall enter into force)/im;

export function extractArticleText(policy: Policy, ref: string): ExtractResult {
  const fullText = policy.full_text;
  const label = ref.trim();

  if (!fullText) {
    return {
      found: false,
      label,
      text: 'The full legal text for this policy is not stored locally. Use the EUR-Lex link below to view the authoritative version.',
    };
  }

  // ── Article: "Art. 4", "Art. 4(2)", "Art. 10a", "Art. 3g-3ge", "Art. 10a(1a)"
  const articleMatch = label.match(/^(?:Art\.?|Article)\s+([\w]+(?:-[\w]+)?)/i);
  if (articleMatch) {
    const rawNum = articleMatch[1];
    const firstNum = rawNum.split('-')[0];
    const pattern = new RegExp(`^Article\\s+${escapeRegex(firstNum)}\\b`, 'mi');
    const match = fullText.match(pattern);
    if (match && match.index !== undefined) {
      const start = match.index;
      const afterHeading = fullText.slice(start + match[0].length);
      const endMatch = afterHeading.match(END_HEADING);
      const end =
        endMatch && endMatch.index !== undefined
          ? start + match[0].length + endMatch.index
          : fullText.length;
      return { found: true, label, text: fullText.slice(start, end).trim() };
    }
    return {
      found: false,
      label,
      text: `Article ${rawNum} was referenced but could not be located in the stored text. View the authoritative version on EUR-Lex.`,
    };
  }

  // ── Section: "Section 2.1", "Section 2.1.1", "Section 3"
  const sectionMatch = label.match(/^Section\s+([\d.]+)/i);
  if (sectionMatch) {
    const num = sectionMatch[1].replace(/\.$/, '');
    const pattern = new RegExp(`^${escapeRegex(num)}\\.?\\s+\\S`, 'm');
    const match = fullText.match(pattern);
    if (match && match.index !== undefined) {
      const start = match.index;
      const afterHeading = fullText.slice(start + match[0].length);
      const endMatch = afterHeading.match(
        /^(\d+(?:\.\d+)*\.?\s+[A-Z]|[A-Z][A-Z\s,'—-]{8,}$|Brussels,|Done at )/m,
      );
      const end =
        endMatch && endMatch.index !== undefined
          ? start + match[0].length + endMatch.index
          : Math.min(fullText.length, start + 4000);
      return { found: true, label, text: fullText.slice(start, end).trim() };
    }
    return {
      found: false,
      label,
      text: `Section ${num} was referenced but could not be located in the stored text. View the authoritative version on EUR-Lex.`,
    };
  }

  // ── Annex: "Annex I", "Annex IIa", "Annex (Roadmap)"
  const annexMatch = label.match(/^Annex\s+(.+)$/i);
  if (annexMatch) {
    const id = annexMatch[1].replace(/^[\s(]+|[\s)]+$/g, '').trim();
    const idToken = id.split(/[\s,]/)[0];
    const pattern = new RegExp(`^ANNEX\\s+${escapeRegex(idToken)}\\b`, 'mi');
    const match = fullText.match(pattern);
    if (match && match.index !== undefined) {
      const start = match.index;
      const afterHeading = fullText.slice(start + match[0].length);
      const endMatch = afterHeading.match(/^(ANNEX\s+\w+\b|Done at |Brussels,)/mi);
      const end =
        endMatch && endMatch.index !== undefined
          ? start + match[0].length + endMatch.index
          : Math.min(fullText.length, start + 4000);
      return { found: true, label, text: fullText.slice(start, end).trim() };
    }
    return {
      found: false,
      label,
      text: `"${label}" was referenced but the annex could not be located in the stored text. View the authoritative version on EUR-Lex.`,
    };
  }

  // ── Recital: "Recital 3-5", "Recital 5", "Recital 1-3"
  const recitalMatch = label.match(/^Recital\s+(\d+)(?:\s*[-–]\s*(\d+))?/i);
  if (recitalMatch) {
    const from = parseInt(recitalMatch[1], 10);
    const to = recitalMatch[2] ? parseInt(recitalMatch[2], 10) : from;
    const blocks: string[] = [];
    for (let i = from; i <= to; i++) {
      const pattern = new RegExp(`^\\(${i}\\)\\s`, 'm');
      const match = fullText.match(pattern);
      if (match && match.index !== undefined) {
        const start = match.index;
        const afterHeading = fullText.slice(start + match[0].length);
        const endMatch = afterHeading.match(/^(\(\d+\)\s|CHAPTER\s+[IVX]+|Article\s+[\w-]+\b)/m);
        const end =
          endMatch && endMatch.index !== undefined
            ? start + match[0].length + endMatch.index
            : fullText.length;
        blocks.push(fullText.slice(start, end).trim());
      }
    }
    if (blocks.length > 0) {
      return { found: true, label, text: blocks.join('\n\n') };
    }
    return {
      found: false,
      label,
      text: `Recital ${from}${to !== from ? `–${to}` : ''} was referenced but could not be located in the stored text. View the authoritative version on EUR-Lex.`,
    };
  }

  // ── Fallback: try to literally locate the label at the start of a line
  const literalPattern = new RegExp(`^${escapeRegex(label)}\\b`, 'mi');
  const literal = fullText.match(literalPattern);
  if (literal && literal.index !== undefined) {
    const start = literal.index;
    const afterHeading = fullText.slice(start + literal[0].length);
    const endMatch = afterHeading.match(/\n\n/);
    const end =
      endMatch && endMatch.index !== undefined
        ? start + literal[0].length + endMatch.index + 2
        : Math.min(fullText.length, start + 1500);
    return { found: true, label, text: fullText.slice(start, end).trim() };
  }

  return {
    found: false,
    label,
    text: `No inline preview is available for "${label}". The reference is cited verbatim here — open the authoritative version on EUR-Lex to read it.`,
  };
}
