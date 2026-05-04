import type { Policy } from './types';

export type PolicyType = 'legislation' | 'package' | 'plan';

export const POLICY_TYPE_META: Record<PolicyType, { label: string; color: string; description: string }> = {
  legislation: {
    label: 'Legislation',
    color: '#0065A4',
    description: 'Individual binding legal acts (regulations, directives, decisions)',
  },
  package: {
    label: 'Package',
    color: '#7C3AED',
    description: 'Umbrella bundles grouping multiple legislative acts',
  },
  plan: {
    label: 'Policy & Plan',
    color: '#B45309',
    description: 'Non-binding strategies, communications and action plans',
  },
};

const PACKAGE_IDS = new Set(['fit-for-55']);

/**
 * Derives the high-level policy category for a Policy object.
 * Packages are identified by a fixed ID set; communications and strategies
 * are treated as plans; everything else is individual legislation.
 */
export function getPolicyType(policy: Pick<Policy, 'id' | 'document_type'>): PolicyType {
  if (PACKAGE_IDS.has(policy.id)) return 'package';
  if (policy.document_type === 'communication' || policy.document_type === 'strategy') return 'plan';
  return 'legislation';
}
