/**
 * EU policies as citable reference-manager entries.
 * -------------------------------------------------
 * The tracked policy corpus (`@/data/policies`) lives outside the reference
 * library, so until now a Board author could cite a journal paper from Word
 * but not the European Climate Law. This module maps every tracked policy
 * onto the flat reference shape `/api/references` serves, making each policy
 * a first-class, citable entry for the Word add-in:
 *
 *   - id            `policy-<policyId>` (reserved prefix, never collides with
 *                    `doi-*` / `custom-*` / static ids),
 *   - type          `legislation`,
 *   - tags          carries the `project:EU policies` project tag, so the
 *                    add-in's existing Project dropdown gets an "EU policies"
 *                    view listing the whole corpus, plus the policy domain.
 *
 * Entries are derived once per process from the bundled corpus — policies
 * are versioned in code, so there is nothing to re-fetch at runtime.
 */
import { policies } from '@/data/policies';
import type { Policy } from '@/lib/types';
import { toProjectTag } from './projects';

/** Reserved id prefix for policy entries in the flat reference list. */
export const POLICY_REF_PREFIX = 'policy-';

/** Project-tag name under which all policies appear in the project facet. */
export const POLICY_PROJECT_NAME = 'EU policies';

/** Flat reference shape served by /api/references (see FlatRef there). */
export interface PolicyFlatRef {
  id: string;
  authors: string;
  year: string;
  title: string;
  journal: string | null;
  volume: string | null;
  issue: string | null;
  pages: string | null;
  doi: string | null;
  url: string | null;
  type: string;
  fullCitation: string;
  tags: string[];
}

/** Adopting institution by instrument type — good enough for a citation
 *  label without per-act research. */
function policyAuthors(p: Policy): string {
  switch (p.document_type) {
    case 'communication':
    case 'strategy':
      return 'European Commission';
    default:
      return 'European Union';
  }
}

/** Publication year: adoption date first, then the CELEX year segment
 *  (`32021R1119` → `2021`). */
export function policyYear(p: { adoption_date?: string | null; celex_number?: string | null }): string {
  if (p.adoption_date && /^\d{4}/.test(p.adoption_date)) return p.adoption_date.slice(0, 4);
  const m = (p.celex_number || '').match(/^[0-9C]?(\d{4})/);
  return m ? m[1] : '';
}

function buildFullCitation(p: Policy, authors: string, year: string): string {
  let cite = `${authors}${year ? ` (${year})` : ''}. ${p.title}.`;
  if (p.celex_number) cite += ` CELEX ${p.celex_number}.`;
  if (p.eurlex_url) cite += ` ${p.eurlex_url}`;
  return cite;
}

function toFlatRef(p: Policy): PolicyFlatRef {
  const authors = policyAuthors(p);
  const year = policyYear(p);
  const tags = [toProjectTag(POLICY_PROJECT_NAME), 'EU policy'];
  if (p.domain) tags.push(p.domain);
  return {
    id: `${POLICY_REF_PREFIX}${p.id}`,
    authors,
    year,
    title: p.title,
    journal: null,
    volume: null,
    issue: null,
    pages: null,
    doi: null,
    url: p.eurlex_url || null,
    type: 'legislation',
    fullCitation: buildFullCitation(p, authors, year),
    tags,
  };
}

let cache: PolicyFlatRef[] | null = null;

/** Every tracked EU policy as a flat, citable reference entry. */
export function getPolicyFlatRefs(): PolicyFlatRef[] {
  if (!cache) cache = policies.map(toFlatRef);
  return cache;
}

/** Look up a policy entry by flat-reference id (`policy-<policyId>`),
 *  underlying policy id, or CELEX number. */
export function findPolicyFlatRef(idOrCelex: string): PolicyFlatRef | null {
  if (!idOrCelex) return null;
  const wanted = idOrCelex.startsWith(POLICY_REF_PREFIX) ? idOrCelex : `${POLICY_REF_PREFIX}${idOrCelex}`;
  const byId = getPolicyFlatRefs().find(r => r.id === wanted);
  if (byId) return byId;
  const policy = policies.find(p => p.celex_number && p.celex_number === idOrCelex);
  return policy ? getPolicyFlatRefs().find(r => r.id === `${POLICY_REF_PREFIX}${policy.id}`) ?? null : null;
}
