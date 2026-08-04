/**
 * Free-floating policy citations.
 * --------------------------------
 * Every tracked EU policy is exposed as a synthetic, library-agnostic
 * `Reference` so it can be rendered, cited, and exported through the
 * Reference Manager exactly like any other source. This is what gives
 * the corpus a "universal citation" surface — the same id flows
 * through Policy Navigator, Content Analysis, Policy Clock, and the
 * Reference Manager.
 *
 * The references generated here:
 *   - share their `id` with `Policy.id` (the universal policy id),
 *   - sit in the special `__policy_citations__` library so the UI can
 *     style them as official policy citations,
 *   - carry an `official-citation` tag for filtering.
 *
 * Citation strings follow the EU institutional style (Interinstitutional
 * Style Guide, §3.4):
 *
 *   Regulation (EU) 2021/1119 of the European Parliament and of the
 *   Council of 30 June 2021 establishing the framework for achieving
 *   climate neutrality (European Climate Law) [OJ L 243, 9.7.2021].
 */
import type { Policy } from './types';
import type { Reference, CSLItem } from './references/types';
import { policies as defaultPolicies } from '@/data/policies';

export const POLICY_CITATION_LIBRARY_ID = '__policy_citations__';
export const POLICY_CITATION_TAG = 'official-citation';

const DOC_TYPE_LABEL: Record<Policy['document_type'], string> = {
  regulation: 'Regulation',
  directive: 'Directive',
  decision: 'Decision',
  communication: 'Communication',
  strategy: 'Strategy',
};

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

function formatPolicyDate(iso: string | null): string | null {
  if (!iso) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const year = m[1];
  const month = MONTH_NAMES[parseInt(m[2], 10) - 1];
  const day = parseInt(m[3], 10);
  if (!month) return null;
  return `${day} ${month} ${year}`;
}

/**
 * Build the official citation string in EU institutional style.
 * Falls back gracefully if the policy is missing fields.
 */
export function formatOfficialPolicyCitation(policy: Policy): string {
  const docLabel = DOC_TYPE_LABEL[policy.document_type] || 'Act';
  const adopted = formatPolicyDate(policy.adoption_date);
  const head = adopted
    ? `${docLabel} of ${adopted}`
    : docLabel;
  const ref = policy.celex_number ? ` [CELEX:${policy.celex_number}]` : '';
  return `${head}, ${policy.title}${ref}.`;
}

/**
 * Adoption year for the citation date-parts. Falls back to the
 * `last_updated` year, then "n.d." sentinel of `null`.
 */
function citationYear(policy: Policy): number | null {
  const src = policy.adoption_date || policy.entry_into_force || policy.last_updated;
  if (!src) return null;
  const m = /^(\d{4})/.exec(src);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Convert a Policy into a CSL-JSON item. Item type is `legislation`
 * which the existing reference list already understands.
 */
export function policyToCSLItem(policy: Policy): CSLItem {
  const issuedYear = citationYear(policy);
  const item: CSLItem = {
    id: policy.id,
    type: 'legislation',
    title: policy.title,
    'container-title': policy.celex_number ? `OJ — CELEX:${policy.celex_number}` : 'Official Journal of the European Union',
    publisher: 'European Union',
    'publisher-place': 'Brussels',
    URL: policy.eurlex_url,
    abstract: policy.summary,
    number: policy.celex_number || undefined,
    genre: DOC_TYPE_LABEL[policy.document_type] || policy.document_type,
  };
  if (issuedYear) {
    const m = /^\d{4}-(\d{2})-(\d{2})/.exec(policy.adoption_date || '');
    item.issued = m
      ? { 'date-parts': [[issuedYear, parseInt(m[1], 10), parseInt(m[2], 10)]] }
      : { 'date-parts': [[issuedYear]] };
  }
  return item;
}

/**
 * Convert a Policy into a Reference Manager entry. The id mirrors the
 * universal policy id so a `?policy=<id>` deep link from any other
 * module resolves directly.
 */
export function policyToReference(policy: Policy): Reference {
  const csl = policyToCSLItem(policy);
  const citationKey = policy.celex_number || policy.id;
  const updatedAt = policy.last_updated || policy.adoption_date || new Date().toISOString();
  const baseTags = [POLICY_CITATION_TAG, 'eu-policy', policy.domain];
  if (policy.document_type) baseTags.push(policy.document_type);
  return {
    id: policy.id,
    library_id: POLICY_CITATION_LIBRARY_ID,
    csl_json: csl,
    item_type: 'legislation',
    title: policy.title,
    authors: [{ family: 'European Union', literal: 'European Union' }],
    year: citationYear(policy),
    doi: null,
    abstract: policy.summary || null,
    container_title: csl['container-title'] || null,
    citation_key: citationKey,
    tags: Array.from(new Set(baseTags)),
    notes: formatOfficialPolicyCitation(policy),
    pdf_url: null,
    pdf_full_text: null,
    funding: null,
    created_at: updatedAt,
    updated_at: updatedAt,
    created_by: null,
  };
}

/**
 * Materialise the entire policy corpus as Reference Manager entries.
 * Pure / cheap: O(n) over the in-memory policy list.
 */
export function getPolicyCitationsAsReferences(policies: Policy[] = defaultPolicies): Reference[] {
  return policies.map(policyToReference);
}

/** Quickly resolve a single citation by policy id. */
export function getPolicyCitationById(
  id: string,
  policies: Policy[] = defaultPolicies,
): Reference | null {
  const policy = policies.find(p => p.id === id);
  return policy ? policyToReference(policy) : null;
}

export function isPolicyCitation(ref: Reference): boolean {
  return ref.library_id === POLICY_CITATION_LIBRARY_ID
    || (ref.tags?.includes(POLICY_CITATION_TAG) ?? false);
}
