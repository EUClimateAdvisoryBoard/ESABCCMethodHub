// ---------------------------------------------------------------------------
// Custom overall (document-level) tags.
//
// The overall-tag picker normally draws from the seeded master taxonomy
// (master-code-catalog.ts). Analysts also need to coin a one-off tag that
// isn't in that list — e.g. a niche theme that only a handful of papers share.
//
// Rather than introduce a separate catalog table, a custom tag is encoded
// SELF-DESCRIBINGLY into its own code id:
//
//     custom:<color>:<name>          e.g.  custom:#22c55e:Nature-based jobs
//
// The id carries everything needed to render the tag (name + colour), so it
// resolves identically for every user and survives reloads with no extra
// storage — it rides along in the existing `content_analysis_overall_tags`
// table, whose `code_id` column is free-form text. Master tags keep their
// plain seed ids; only custom tags carry the `custom:` prefix.
// ---------------------------------------------------------------------------

import type { CodeNode } from './types';
import { getMasterCode } from './master-code-catalog';
import { isChapterTagId, parseChapterTag } from './chapter-tags';

export const CUSTOM_TAG_PREFIX = 'custom:';

/** Palette for auto-assigning a colour to a freshly-coined custom tag. Picked
 *  to read clearly as the small coloured dots used throughout the workbench. */
const CUSTOM_TAG_PALETTE = [
  '#2563eb', '#16a34a', '#db2777', '#d97706', '#7c3aed',
  '#0891b2', '#dc2626', '#65a30d', '#c026d3', '#0d9488',
];

/** Stable colour for a tag name, so the same custom tag looks the same
 *  everywhere it appears without needing to store the colour separately. */
export function customTagColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return CUSTOM_TAG_PALETTE[Math.abs(hash) % CUSTOM_TAG_PALETTE.length];
}

/** Whether a code id refers to a custom (analyst-coined) overall tag. */
export function isCustomTagId(id: string): boolean {
  return id.startsWith(CUSTOM_TAG_PREFIX);
}

/** Build the self-describing id for a custom tag. */
export function formatCustomTagId(name: string, color = customTagColor(name)): string {
  return `${CUSTOM_TAG_PREFIX}${color}:${name.trim()}`;
}

/** Parse a custom-tag id back into a CodeNode for rendering. Returns null for
 *  ids that aren't custom tags (or are malformed). */
export function parseCustomTag(id: string): CodeNode | null {
  if (!isCustomTagId(id)) return null;
  const rest = id.slice(CUSTOM_TAG_PREFIX.length);
  const sep = rest.indexOf(':');
  if (sep === -1) return null;
  const color = rest.slice(0, sep);
  const name = rest.slice(sep + 1).trim();
  if (!name) return null;
  return {
    id,
    parentId: null,
    name,
    color,
    scope: 'master',
    createdAt: '',
  };
}

/** Resolve any overall-tag id — chapter, custom or master — to a CodeNode, or
 *  null. Chapter and custom tags are self-describing ids; master tags resolve
 *  against the seeded catalog. */
export function resolveOverallTag(id: string): CodeNode | null {
  if (isChapterTagId(id)) return parseChapterTag(id);
  return isCustomTagId(id) ? parseCustomTag(id) : getMasterCode(id);
}
