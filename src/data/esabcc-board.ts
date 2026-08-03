/**
 * ESABCC board members, for attributing media coverage to individuals.
 *
 * Names and aliases are derived from the `board_quote` keyword rows seeded in
 * `supabase/migrations/005_expand_media_keywords.sql`, which is the only
 * board-member list the repository holds.
 *
 * ── Why aliases are split in two ──────────────────────────────────────────
 * Surnames differ enormously in how safely they can be matched on their own.
 * "Vacchiano" or "Anger-Kraavi" in a climate article is almost certainly the
 * board member. "Nilsson" and "Persson" are among the most common surnames in
 * Sweden, and "Persson climate" would attribute every Swedish climate story
 * mentioning any Persson to Åsa Persson.
 *
 * So each member has:
 *   - `aliases`         — distinctive enough to attribute on their own.
 *   - `contextAliases`  — only attributed when the article also shows board
 *                         context (ESABCC, "advisory board", etc.).
 *
 * `country` is populated only where the keyword rows or a stated affiliation
 * support it, and left null otherwise rather than guessed — this is
 * biographical data about real people, and a wrong country is worse than a
 * blank one. Fill the gaps from the official membership list when convenient.
 */

export interface BoardMember {
  slug: string;
  name: string;
  /** Matched on their own. */
  aliases: string[];
  /** Matched only alongside board context — see BOARD_CONTEXT_TERMS. */
  contextAliases: string[];
  /** ISO-3166 alpha-2, or null when not evidenced by the data in this repo. */
  country: string | null;
  affiliation: string | null;
}

/**
 * Terms that establish an article is about the board, used to qualify an
 * ambiguous surname match.
 */
export const BOARD_CONTEXT_TERMS = [
  'esabcc',
  'european scientific advisory board',
  'scientific advisory board on climate change',
  'advisory board on climate change',
  'climate advisory board',
  'klimabeirat',
  'wissenschaftlicher beirat',
  'conseil scientifique',
  'comité scientifique',
  'klimaatadviesraad',
  'consiglio scientifico',
  'consejo asesor',
  'klimatpolitiska rådet',
];

export const BOARD_MEMBERS: BoardMember[] = [
  {
    slug: 'anger-kraavi',
    name: 'Annela Anger-Kraavi',
    aliases: ['Annela Anger-Kraavi', 'Anger-Kraavi'],
    contextAliases: [],
    country: null,
    affiliation: null,
  },
  {
    slug: 'cartalis',
    name: 'Constantinos Cartalis',
    aliases: ['Constantinos Cartalis', 'Cartalis', 'Κωνσταντίνος Καρτάλης', 'Καρτάλης'],
    contextAliases: [],
    country: 'GR',
    affiliation: null,
  },
  {
    slug: 'dessai',
    name: 'Suraje Dessai',
    aliases: ['Suraje Dessai', 'Dessai'],
    contextAliases: [],
    country: null,
    affiliation: null,
  },
  {
    slug: 'diaz-anadon',
    name: 'Laura Díaz Anadón',
    aliases: ['Laura Díaz Anadón', 'Laura Diaz Anadon', 'Díaz Anadón', 'Diaz Anadon'],
    contextAliases: [],
    country: null,
    affiliation: null,
  },
  {
    slug: 'edenhofer',
    name: 'Ottmar Edenhofer',
    aliases: ['Ottmar Edenhofer', 'Edenhofer'],
    contextAliases: [],
    country: 'DE',
    affiliation: 'PIK / TU Berlin',
  },
  {
    slug: 'eory',
    name: 'Vera Eory',
    aliases: ['Vera Eory', 'Eory'],
    contextAliases: [],
    country: null,
    affiliation: null,
  },
  {
    slug: 'kitzing',
    name: 'Lena Kitzing',
    aliases: ['Lena Kitzing', 'Kitzing'],
    contextAliases: [],
    country: 'DK',
    affiliation: null,
  },
  {
    slug: 'kulovesi',
    name: 'Kati Kulovesi',
    aliases: ['Kati Kulovesi', 'Kulovesi'],
    contextAliases: [],
    country: 'FI',
    affiliation: null,
  },
  {
    // "Nilsson" alone is one of the most common Swedish surnames.
    slug: 'nilsson',
    name: 'Lars J Nilsson',
    aliases: ['Lars J Nilsson', 'Lars J. Nilsson', 'Lars Nilsson'],
    contextAliases: ['Nilsson'],
    country: 'SE',
    affiliation: null,
  },
  {
    // Same reasoning as Nilsson.
    slug: 'persson',
    name: 'Åsa Persson',
    aliases: ['Åsa Persson', 'Asa Persson'],
    contextAliases: ['Persson'],
    country: 'SE',
    affiliation: null,
  },
  {
    slug: 'riahi',
    name: 'Keywan Riahi',
    aliases: ['Keywan Riahi', 'Riahi'],
    contextAliases: [],
    country: null,
    affiliation: 'IIASA',
  },
  {
    slug: 'soussana',
    name: 'Jean-François Soussana',
    aliases: ['Jean-François Soussana', 'Jean-Francois Soussana', 'Soussana'],
    contextAliases: [],
    country: 'FR',
    affiliation: 'INRAE',
  },
  {
    slug: 'vacchiano',
    name: 'Giorgio Vacchiano',
    aliases: ['Giorgio Vacchiano', 'Vacchiano'],
    contextAliases: [],
    country: 'IT',
    affiliation: null,
  },
  {
    slug: 'van-vuuren',
    name: 'Detlef van Vuuren',
    aliases: ['Detlef van Vuuren', 'van Vuuren'],
    contextAliases: [],
    country: 'NL',
    affiliation: 'PBL',
  },
  {
    slug: 'zommers',
    name: 'Zinta Zommers',
    aliases: ['Zinta Zommers', 'Zommers'],
    contextAliases: [],
    country: null,
    affiliation: null,
  },
];

export const BOARD_MEMBER_BY_SLUG: Record<string, BoardMember> =
  BOARD_MEMBERS.reduce(
    (acc, m) => {
      acc[m.slug] = m;
      return acc;
    },
    {} as Record<string, BoardMember>,
  );
