/**
 * Suggest a policy for a news article.
 *
 * Used by the M·03 ↔ M·04 bridge: given a news headline + description,
 * find the policy from `src/data/policies.ts` that most plausibly is
 * the topic of the article. The result is presented as a *suggestion*
 * the user approves — never auto-applied — so a soft heuristic is
 * acceptable.
 *
 * The scoring is deterministic and runs purely on tokens, with no LLM
 * dependency. We exploit the structure of the policy dataset:
 *
 *   • short_title is usually the canonical name press releases use
 *     ("CBAM", "Climate Law", "Methane Regulation").
 *   • celex_number is the unique act number, occasionally cited.
 *   • title carries every named fragment ("Regulation (EU) 2023/956 …").
 *
 * For each policy we compute three signals:
 *   1. Exact short_title hit (very strong — boost ×3).
 *   2. CELEX number hit (very strong — boost ×3).
 *   3. Token overlap with `title`/`summary` (weak — capped at 1).
 *
 * The top suggestion is returned together with a 0–1 confidence
 * score. Below `MIN_CONFIDENCE` we return null so the UI can show a
 * neutral state instead of a misleading guess.
 */

import { policies } from '@/data/policies';
import type { Policy } from '@/lib/types';

const MIN_CONFIDENCE = 0.35;

/** Words too generic to count toward overlap. */
const STOPWORDS = new Set([
  'the', 'and', 'for', 'with', 'from', 'that', 'this', 'into', 'over',
  'climate', 'eu', 'european', 'union', 'regulation', 'directive',
  'policy', 'commission', 'parliament', 'council',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 2 && !STOPWORDS.has(t));
}

function shortTitleVariants(p: Policy): string[] {
  // Multiple ways the press might refer to the policy. We try the
  // canonical short_title, the abbreviation form, and a "rule of last
  // resort" derived from the regulation type.
  const short = (p.short_title || '').toLowerCase().trim();
  if (!short) return [];
  const variants = new Set<string>();
  variants.add(short);
  // Acronym candidates: ETS, CBAM, RED, EED, etc. — pull capitals out
  // of the original short_title, or split on hyphens for things like
  // "Net-Zero Industry Act".
  const acronym = (p.short_title || '')
    .split(/[\s-]+/)
    .map(w => w[0])
    .filter(Boolean)
    .join('')
    .toLowerCase();
  if (acronym.length >= 3) variants.add(acronym);
  // The first noun phrase (e.g. "European Climate Law" → "climate law")
  // sometimes appears without the geographic qualifier.
  const stripped = short.replace(/^european\s+|^eu\s+/, '');
  if (stripped !== short) variants.add(stripped);
  return Array.from(variants);
}

function celexAsLooseToken(c: string | null): string | null {
  if (!c) return null;
  // CELEX numbers like 32023R0956 sometimes appear in press as
  // "Regulation (EU) 2023/956". Convert to the more common journalistic
  // form so we can substring-match either spelling.
  const m = c.match(/^[34](\d{4})[A-Z](\d{1,4})$/);
  if (!m) return c.toLowerCase();
  const [, year, num] = m;
  return `${year}/${num}`;
}

export interface PolicySuggestion {
  policyId: string;
  policy: Policy;
  /** 0–1 confidence score. */
  score: number;
  /** Why we picked this — short human-readable reasons. */
  reasons: string[];
}

export function suggestPoliciesForArticle(
  article: { title?: string; description?: string } | null | undefined,
  /** When set, only return suggestions strictly above this confidence; otherwise uses MIN_CONFIDENCE. */
  minConfidence?: number,
): PolicySuggestion[] {
  if (!article) return [];
  const haystack = `${article.title ?? ''}\n${article.description ?? ''}`.toLowerCase();
  if (!haystack.trim()) return [];
  const tokens = new Set(tokenize(haystack));
  const out: PolicySuggestion[] = [];

  for (const p of policies) {
    const reasons: string[] = [];
    let score = 0;

    // Signal 1 — short_title hit (any variant, substring).
    const variants = shortTitleVariants(p);
    for (const v of variants) {
      // Avoid two-character spurious hits ("eu" / "ai") by rejecting
      // anything below 3 chars; the variant builder already caps at 3.
      if (v.length >= 3 && haystack.includes(v)) {
        score = Math.max(score, 0.85);
        reasons.push(`mentions "${v}"`);
        break;
      }
    }

    // Signal 2 — CELEX / journalistic form ("2023/956").
    const celexLoose = celexAsLooseToken(p.celex_number);
    if (celexLoose && haystack.includes(celexLoose)) {
      score = Math.max(score, 0.95);
      reasons.push(`mentions ${celexLoose}`);
    }

    // Signal 3 — token overlap with the long title and summary.
    const policyTokens = new Set([
      ...tokenize(p.title || ''),
      ...tokenize(p.summary || ''),
    ]);
    let overlap = 0;
    let total = 0;
    for (const t of policyTokens) {
      total++;
      if (tokens.has(t)) overlap++;
    }
    const tokenScore = total > 0 ? Math.min(0.55, (overlap / Math.max(8, total)) * 1.4) : 0;
    if (tokenScore > 0.2) {
      reasons.push(`${overlap} shared keywords`);
    }
    score = Math.max(score, tokenScore);

    if (score >= (minConfidence ?? MIN_CONFIDENCE)) {
      out.push({ policyId: p.id, policy: p, score, reasons });
    }
  }

  return out.sort((a, b) => b.score - a.score).slice(0, 5);
}
