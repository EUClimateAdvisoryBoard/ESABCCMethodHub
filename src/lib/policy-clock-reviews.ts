/**
 * Synthesised "review-due" events for the Policy Clock.
 * -----------------------------------------------------
 * Every tracked EU climate policy has — by treaty practice and by
 * explicit review clauses in most regulations — a periodic review
 * obligation on the Commission. Rather than hand-curating every one of
 * those review dates, we synthesise them from the policy corpus so the
 * Policy Clock always has the full set of forthcoming reviews on
 * display, each one carrying the universal `policyId` that lets the
 * timeline hop into the Policy Navigator, Content Analysis, and
 * Reference Manager.
 *
 * Heuristic:
 *   - Default review cadence is 5 years from the entry-into-force date
 *     (this matches Art. 30 of the Climate Law, Art. 21 ETS, Art. 30 CBAM
 *     and is the pattern across most Fit for 55 instruments).
 *   - Communications and strategies are not reviewed under this clause,
 *     so they are skipped.
 *   - Roll the review date forward in 5-year increments until it lands
 *     in the upcoming window.
 *   - If the policy already appears in a curated `revision` event for
 *     the same year, the synthetic one is suppressed by id de-duplication
 *     downstream.
 */
import { policies as defaultPolicies } from '@/data/policies';
import type { Policy } from './types';
import type { PolicyClockEvent } from '@/app/api/policy-clock/route';

const REVIEW_CADENCE_YEARS = 5;

function startISO(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function rollForward(baseISO: string, cadenceYears: number, todayISO: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(baseISO);
  if (!m) return null;
  let year = parseInt(m[1], 10);
  const month = parseInt(m[2], 10);
  const day = parseInt(m[3], 10);
  while (true) {
    year += cadenceYears;
    const candidate = `${year.toString().padStart(4, '0')}-${m[2]}-${m[3]}`;
    if (candidate > todayISO) {
      // sanity-check the constructed date
      const d = new Date(`${year}-${m[2]}-${m[3]}T00:00:00`);
      if (Number.isNaN(d.getTime())) return null;
      void month; void day;
      return candidate;
    }
    if (year > 2100) return null;
  }
}

const SKIP_TYPES = new Set<Policy['document_type']>(['communication', 'strategy']);

export function buildReviewDueEvents(
  policies: Policy[] = defaultPolicies,
  options: { todayISO?: string; horizonDays?: number } = {},
): PolicyClockEvent[] {
  const today = options.todayISO ?? startISO(new Date());
  const horizon = options.horizonDays ?? 365 * 5; // default 5y horizon
  const horizonEnd = startISO(new Date(Date.now() + horizon * 86400000));

  const events: PolicyClockEvent[] = [];
  for (const policy of policies) {
    if (SKIP_TYPES.has(policy.document_type)) continue;
    const base = policy.entry_into_force || policy.adoption_date;
    if (!base) continue;
    const reviewDate = rollForward(base, REVIEW_CADENCE_YEARS, today);
    if (!reviewDate) continue;
    if (reviewDate > horizonEnd) continue;

    events.push({
      id: `review-due-${policy.id}-${reviewDate}`,
      date: reviewDate,
      title: `Review due — ${policy.short_title}`,
      description:
        `Five-year review window for ${policy.short_title}. ` +
        `Commission review of ${policy.title} is due around this date. ` +
        `Synthesised from the policy's ${policy.entry_into_force ? 'entry-into-force' : 'adoption'} date; ` +
        `consult the act's review clause for the exact deadline.`,
      category: 'revision',
      source: policy.celex_number
        ? `Synthesised — CELEX:${policy.celex_number}`
        : 'Synthesised review window',
      sourceUrl: policy.eurlex_url,
      policyId: policy.id,
      importance: 'medium',
      tags: ['review-due', 'synthesised', policy.domain].filter(Boolean),
    });
  }
  return events;
}
