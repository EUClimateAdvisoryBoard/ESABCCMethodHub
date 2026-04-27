/**
 * Sanity-check the static connection dataset in src/data/policies.ts:
 *   - every source/target references an existing policy id
 *   - no duplicate (source, target, type) triples
 *   - every connection has a non-empty description
 *   - connection_type is one of the six defined types
 *
 * Run: `npx tsx scripts/validate-connections.ts`
 */
import { policies, connections } from '../src/data/policies';
import { CONNECTION_TYPES } from '../src/lib/connectionTypes';

const policyIds = new Set(policies.map(p => p.id));
const typeIds = new Set(Object.keys(CONNECTION_TYPES));
const errors: string[] = [];
const warnings: string[] = [];

const seenTriples = new Map<string, number>();
for (const c of connections) {
  if (!policyIds.has(c.source_policy_id)) {
    errors.push(`#${c.id}: source_policy_id "${c.source_policy_id}" not in policies.`);
  }
  if (!policyIds.has(c.target_policy_id)) {
    errors.push(`#${c.id}: target_policy_id "${c.target_policy_id}" not in policies.`);
  }
  if (!typeIds.has(c.connection_type)) {
    errors.push(`#${c.id}: connection_type "${c.connection_type}" is not a defined type.`);
  }
  if (c.source_policy_id === c.target_policy_id) {
    errors.push(`#${c.id}: self-loop on "${c.source_policy_id}".`);
  }
  if (!c.description || c.description.trim().length < 40) {
    warnings.push(`#${c.id}: description is missing or short (<40 chars).`);
  }
  const key = `${c.source_policy_id}→${c.target_policy_id}::${c.connection_type}`;
  if (seenTriples.has(key)) {
    errors.push(`#${c.id}: duplicates #${seenTriples.get(key)} (${key}).`);
  } else {
    seenTriples.set(key, c.id);
  }
}

console.log(`Policies: ${policies.length}`);
console.log(`Connections: ${connections.length}`);
console.log(`Unique (source,target,type) triples: ${seenTriples.size}`);
console.log(`Errors: ${errors.length}`);
console.log(`Warnings: ${warnings.length}`);

if (errors.length > 0) {
  console.log('\nERRORS:');
  errors.forEach(e => console.log(' - ' + e));
}
if (warnings.length > 0) {
  console.log('\nWARNINGS:');
  warnings.forEach(w => console.log(' - ' + w));
}

process.exit(errors.length > 0 ? 1 : 0);
