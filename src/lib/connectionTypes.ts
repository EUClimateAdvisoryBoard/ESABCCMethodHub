/**
 * Canonical definitions for the six connection types that describe legislative
 * interdependencies between EU climate policies.
 *
 * A "connection" is a directed, typed relationship between a source policy and
 * a target policy. Each connection is backed by:
 *   - a `connection_type` (see below) describing the legal / semantic nature
 *     of the link;
 *   - a prose `description` explaining the substantive rationale;
 *   - optional article references (`articles_source`, `articles_target`)
 *     pointing at the specific provisions that establish the link.
 *
 * A connection is made only when both (a) there is a concrete legal or
 * operational linkage that can be evidenced in the text of the policies
 * involved, and (b) that linkage falls into one of the six types below. The
 * `criteria` field on each type states the test a connection must pass to
 * qualify for that label.
 */
export type ConnectionTypeId =
  | 'amends'
  | 'implements'
  | 'references'
  | 'complements'
  | 'repeals'
  | 'is_part_of';

export interface ConnectionTypeDef {
  id: ConnectionTypeId;
  label: string;
  /** Short one-line gloss suitable for badges / tooltips. */
  summary: string;
  /** Paragraph-level definition of what the type means. */
  definition: string;
  /** The test a connection must pass to qualify for this type. */
  criteria: string;
  /**
   * Whether the direction source → target is semantically meaningful.
   * `directed` types (e.g. amends, implements, repeals, is_part_of) should
   * not be reversed without changing their meaning. `symmetric` types
   * (references, complements) can read either way but are stored directionally
   * for consistency.
   */
  directionality: 'directed' | 'symmetric';
  /** Example sentence illustrating usage. */
  example: string;
  /** Stroke colour used in the D3 network graph. */
  color: string;
  /** SVG stroke-dasharray for this link type (`'0'` = solid). */
  dash: string;
  /** Tailwind classes used by the policy detail page badge. */
  badge: { bg: string; text: string; border: string };
}

export const CONNECTION_TYPES: Record<ConnectionTypeId, ConnectionTypeDef> = {
  amends: {
    id: 'amends',
    label: 'Amends',
    summary: 'Source legally modifies target.',
    definition:
      'The source policy introduces binding changes to the text of the target policy — adding, deleting, or replacing articles, annexes, or definitions. After adoption the amended target reads as modified by the source.',
    criteria:
      'Use only when the source instrument carries legal force to alter the target (e.g. a revising regulation or directive) and the amendments are explicitly set out in its operative articles.',
    directionality: 'directed',
    example: 'Fit for 55 amends the EU ETS Directive (Art. 9, Art. 10a).',
    color: '#E07A5F',
    dash: '0',
    badge: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
  },
  implements: {
    id: 'implements',
    label: 'Implements',
    summary: 'Source operationalises a target framework.',
    definition:
      'The source policy puts into effect obligations, targets, or governance arrangements established by the target. Implementation may be through transposition, delegated/implementing acts, national plans, or sector-specific measures that deliver the target\'s objectives.',
    criteria:
      'Use when the source explicitly delivers an obligation, target, or procedure mandated by the target policy, and the target would remain inert without this or similar measures.',
    directionality: 'directed',
    example:
      'The Methane Regulation implements the EU Climate Law\'s climate-neutrality objective for the energy sector.',
    color: '#3D405B',
    dash: '0',
    badge: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200' },
  },
  references: {
    id: 'references',
    label: 'References',
    summary: 'Source cites target as authority or cross-reference.',
    definition:
      'The source policy cites the target for definitions, methodology, scope, or procedural rules but does not modify it. The link is informational or procedural rather than substantive.',
    criteria:
      'Use when the source contains an explicit cross-reference (recital or article) to the target without altering it and without operationalising a specific obligation.',
    directionality: 'symmetric',
    example:
      'The Climate Law references the Governance Regulation as the monitoring framework for NECPs.',
    color: '#81B29A',
    dash: '8,5',
    badge: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' },
  },
  complements: {
    id: 'complements',
    label: 'Complements',
    summary: 'Policies reinforce one another without legal dependency.',
    definition:
      'Two policies address adjacent or overlapping objectives through distinct instruments; together they produce a more complete regulatory outcome, but neither modifies nor strictly depends on the other.',
    criteria:
      'Use when the two instruments share a coherent policy objective and each contributes a distinct mechanism, but there is no amendment, implementation, or repeal relationship.',
    directionality: 'symmetric',
    example:
      'The Social Climate Fund complements the ETS2 by recycling auction revenues to vulnerable households.',
    color: '#7F8C8D',
    dash: '4,4',
    badge: { bg: 'bg-slate-50', text: 'text-slate-600', border: 'border-slate-200' },
  },
  repeals: {
    id: 'repeals',
    label: 'Repeals',
    summary: 'Source revokes target in whole or part.',
    definition:
      'The source policy formally repeals the target, removing it from the body of EU law. A repeal may be full (target ceases to apply entirely) or partial (specific articles are revoked).',
    criteria:
      'Use only when the source explicitly repeals the target (or provisions thereof) in its operative articles. Implicit obsolescence does not qualify.',
    directionality: 'directed',
    example: 'The recast Energy Efficiency Directive repeals the 2012 EED.',
    color: '#E74C3C',
    dash: '0',
    badge: { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' },
  },
  is_part_of: {
    id: 'is_part_of',
    label: 'Is part of',
    summary: 'Source belongs to a broader package or strategy.',
    definition:
      'The source policy is a constituent element of a larger legislative package, strategy, or programme represented by the target — for example an individual regulation within the Fit for 55 package, or an initiative under the European Green Deal.',
    criteria:
      'Use when the target explicitly encompasses the source (e.g. a Commission communication announcing the source as part of its delivery) or the source\'s recitals identify it as part of that package.',
    directionality: 'directed',
    example: 'The CBAM Regulation is part of the Fit for 55 package.',
    color: '#5C6B73',
    dash: '2,4',
    badge: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
  },
};

export const CONNECTION_TYPE_LIST: ConnectionTypeDef[] = [
  CONNECTION_TYPES.amends,
  CONNECTION_TYPES.implements,
  CONNECTION_TYPES.references,
  CONNECTION_TYPES.complements,
  CONNECTION_TYPES.repeals,
  CONNECTION_TYPES.is_part_of,
];

export function getConnectionType(id: string): ConnectionTypeDef | undefined {
  return CONNECTION_TYPES[id as ConnectionTypeId];
}
