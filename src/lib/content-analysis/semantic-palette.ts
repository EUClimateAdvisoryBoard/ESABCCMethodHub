// ---------------------------------------------------------------------------
// Semantic palette helper for the Content-Analysis code tree (M·05 #3).
//
// Maps a top-level (root) code name to a hue family so the user can
// recognise a code group by colour alone:
//
//   governance / institutions     → teal      (calm, structural)
//   finance / economic            → amber     (money)
//   mitigation / decarbonisation  → green     (reduce / clean)
//   adaptation / resilience       → blue      (water, sky)
//   energy / power                → orange    (heat, generation)
//   transport / mobility          → indigo
//   industry / manufacturing      → magenta
//   social / equity / justice     → rose
//   land / agriculture / lulucf   → olive
//
// Within a hue family, depth in the tree maps to saturation: root is
// the deepest, descendants get progressively lighter so the parent is
// always visually anchoring.
//
// The matcher works on case-insensitive substring; if no rule matches,
// returns null and the caller falls back to the existing rotating
// DEFAULT_CODE_COLORS palette.
// ---------------------------------------------------------------------------

export type SemanticHueFamily =
  | 'governance' | 'finance' | 'mitigation' | 'adaptation'
  | 'energy' | 'transport' | 'industry' | 'social' | 'land';

interface FamilySpec {
  family: SemanticHueFamily;
  /** ⟨depth⟩ → hex colour. depth 0 = root, 1+ = descendants. */
  shades: string[];
  /** Lower-cased substrings that classify a root-code name into this family. */
  match: RegExp;
}

const FAMILIES: FamilySpec[] = [
  {
    family: 'governance',
    shades: ['#00665A', '#00928F', '#74CBC8', '#AEDFE8'],
    match: /\b(governance|institut|coordinat|review|process|stakeholder|legal|legitim)\b/i,
  },
  {
    family: 'finance',
    shades: ['#D17B00', '#E89F2D', '#F2BD5C', '#F8DAA0'],
    match: /\b(financ|investment|cost|funding|budget|economic|market|tax|fiscal)\b/i,
  },
  {
    family: 'mitigation',
    shades: ['#1F7A3A', '#2DA45A', '#65C28A', '#A6DDB7'],
    match: /\b(mitigat|decarbon|emission|reduc|carbon\s+pric|cdr|removal|net.?zero)\b/i,
  },
  {
    family: 'adaptation',
    shades: ['#004B7F', '#0065A4', '#478EA5', '#75C9DB'],
    match: /\b(adapt|resilien|risk|vulnerab|impact|climat\s+chang)\b/i,
  },
  {
    family: 'energy',
    shades: ['#B86A00', '#FF9933', '#FFB969', '#FFD9B0'],
    match: /\b(energ|power|electricity|heat|grid|renewabl|fossil|nuclear|hydrogen)\b/i,
  },
  {
    family: 'transport',
    shades: ['#3E3F8C', '#6667AB', '#8E8FC6', '#C0C1E0'],
    match: /\b(transport|mobility|vehicl|aviation|shipp|maritime|rail|road)\b/i,
  },
  {
    family: 'industry',
    shades: ['#7C2A8E', '#A530B8', '#C36ACD', '#E1AEE6'],
    match: /\b(industry|industrial|manufactur|cement|steel|chemical|process)\b/i,
  },
  {
    family: 'social',
    shades: ['#A33060', '#C77DBA', '#E0A8C9', '#F0CBD9'],
    match: /\b(social|equity|justice|just\s+transition|gender|inclusion|labour|labor|employ|housing|poverty)\b/i,
  },
  {
    family: 'land',
    shades: ['#5C5A1A', '#94A348', '#BFC97C', '#DEE3B0'],
    match: /\b(land|lulucf|agricultur|forest|soil|biodivers|nature|food|crop)\b/i,
  },
];

/** Resolve a root code's name to a hue family, or null if no rule fires. */
export function familyForRootName(name: string): SemanticHueFamily | null {
  for (const f of FAMILIES) {
    if (f.match.test(name)) return f.family;
  }
  return null;
}

/**
 * Pick a colour for a new code based on the name of its root ancestor and
 * the depth at which it lives in the tree. Returns null when the root
 * doesn't classify into any known family — caller falls back to the
 * rotating DEFAULT_CODE_COLORS palette.
 */
export function semanticColorFor(rootName: string, depth: number): string | null {
  const fam = familyForRootName(rootName);
  if (!fam) return null;
  const spec = FAMILIES.find(f => f.family === fam)!;
  const idx = Math.min(depth, spec.shades.length - 1);
  return spec.shades[idx];
}
