// ---------------------------------------------------------------------------
// Chapter (report-chapter / sector) tags for the Content Analysis workbench.
//
// A *chapter tag* answers "which report chapter / sector is this paper for?".
// It is a distinct dimension from the thematic overall tags: where overall
// tags describe what a document is ABOUT, a chapter tag records which sector
// chapter the analyst intends to use it in (Industry, Transport, Energy, …).
// This lets the lead filter the library and the workspace down to the papers
// they want to cite in a given chapter.
//
// Like custom overall tags (see custom-overall-tags.ts), a chapter tag is
// encoded SELF-DESCRIBINGLY into its own code id:
//
//     chapter:<color>:<name>      e.g.  chapter:#9C3B3B:Industry
//
// The id carries everything needed to render the tag, so chapter tags ride
// along in the existing, shared, durable `content_analysis_overall_tags` table
// with NO schema change — they are stored permanently and synced to every user
// exactly like overall tags, via the same `useOverallTags` store. They are kept
// in their own `chapter:` namespace so the UI can pick, filter and display them
// separately from thematic overall tags.
// ---------------------------------------------------------------------------

import type { CodeNode } from './types';

export const CHAPTER_TAG_PREFIX = 'chapter:';

/** Whether a code id refers to a chapter (report-chapter / sector) tag. */
export function isChapterTagId(id: string): boolean {
  return id.startsWith(CHAPTER_TAG_PREFIX);
}

/** Build the self-describing id for a chapter tag. */
export function formatChapterTagId(name: string, color: string): string {
  return `${CHAPTER_TAG_PREFIX}${color}:${name.trim()}`;
}

/** Palette for auto-colouring a freshly-coined chapter tag (one not in the
 *  seeded catalog below). */
const CHAPTER_TAG_PALETTE = [
  '#6667AB', '#0F766E', '#7C3AED', '#B45309', '#0891B2',
  '#BE185D', '#4D7C0F', '#1D4ED8', '#9333EA', '#0E7490',
];

/** Stable colour for a chapter name, so a coined chapter looks the same
 *  everywhere without storing the colour separately. */
export function chapterTagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return CHAPTER_TAG_PALETTE[Math.abs(hash) % CHAPTER_TAG_PALETTE.length];
}

/** Parse a chapter-tag id back into a CodeNode for rendering. Returns null for
 *  ids that aren't chapter tags (or are malformed). */
export function parseChapterTag(id: string): CodeNode | null {
  if (!isChapterTagId(id)) return null;
  const rest = id.slice(CHAPTER_TAG_PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep === -1) return null;
  const color = rest.slice(0, sep);
  const name = rest.slice(sep + 1).trim();
  if (!name) return null;
  return { id, parentId: null, name, color, scope: 'master', createdAt: '' };
}

/**
 * Seeded chapter catalog — the ESABCC report chapters / sectors, in report
 * order. The six sector chapters reuse the sector-framework palette so a
 * chapter tag reads with the same colour as its flow chart; the cross-cutting
 * and adaptation chapters get their own distinct hues. Analysts can still coin
 * additional chapters via the picker ("+ Create"), which land in the same
 * `chapter:` namespace.
 */
const CHAPTER_SEED: { name: string; color: string }[] = [
  { name: 'Energy', color: '#2F6E5B' },
  { name: 'Industry', color: '#9C3B3B' },
  { name: 'Transport', color: '#3D6E8C' },
  { name: 'Buildings', color: '#B5852F' },
  { name: 'Agriculture', color: '#5E8C3D' },
  { name: 'LULUCF', color: '#6B7B3A' },
  { name: 'Cross-cutting', color: '#6667AB' },
  { name: 'Adaptation', color: '#2E7D74' },
  // Sub-chapter tag for the Overview Industry → Clean Tech decarbonisation
  // catalogue (beta/modules/overview-industry). Kept distinct from the sector
  // "Industry" chapter so the clean-tech reading list can be filtered on its own.
  { name: 'Clean Tech', color: '#C2410C' },
];

/** The predefined chapter tags offered in every chapter picker / filter. */
export const CHAPTER_TAGS: CodeNode[] = CHAPTER_SEED.map(({ name, color }) => ({
  id: formatChapterTagId(name, color),
  parentId: null,
  name,
  color,
  scope: 'master',
  createdAt: '',
}));

/**
 * Split a list of overall-tag ids into chapter tags and everything else, so the
 * UI can render and filter the two dimensions independently while they share
 * one durable store.
 */
export function splitTagIds(ids: string[]): { chapters: string[]; others: string[] } {
  const chapters: string[] = [];
  const others: string[] = [];
  for (const id of ids) (isChapterTagId(id) ? chapters : others).push(id);
  return { chapters, others };
}
