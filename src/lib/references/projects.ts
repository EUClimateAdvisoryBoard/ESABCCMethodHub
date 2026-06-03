/**
 * Report / project tagging for references.
 * ----------------------------------------
 * A "project" is a Board report (or work-stream) that a reference was
 * added in the context of — e.g. "Policy Gap 2.0". We model projects as
 * a reserved namespace *inside the existing `tags[]` array* using a
 * `project:` prefix. This deliberately avoids a schema migration, so the
 * same model works everywhere references live:
 *
 *   - Supabase (`references.tags`),
 *   - the localStorage / API fallback store,
 *   - the static Word add-in dataset (`word-addin-app/data/references.json`),
 *   - and CSL `keyword` / BibTeX / RIS round-trips (project membership
 *     travels with the reference like any other tag).
 *
 * The library stays a single shared bibliography; a "project view" is
 * just a filter over the project tags. Example mapping:
 *
 *   tag  "project:Policy Gap 2.0"   ⇄   project name  "Policy Gap 2.0"
 */

export const PROJECT_TAG_PREFIX = 'project:';

/** A reference carries `tags`; that's all the helpers below need. */
interface TaggedReference {
  tags?: string[] | null;
}

/** True when a tag is a project tag (case-insensitive on the prefix). */
export function isProjectTag(tag: string): boolean {
  return (
    typeof tag === 'string' &&
    tag.trim().toLowerCase().startsWith(PROJECT_TAG_PREFIX)
  );
}

/** Build the stored tag for a project name: "Policy Gap 2.0" → "project:Policy Gap 2.0". */
export function toProjectTag(name: string): string {
  return `${PROJECT_TAG_PREFIX}${name.trim()}`;
}

/** Recover the human project name from a project tag. */
export function projectNameFromTag(tag: string): string {
  // The prefix is fixed-length; slicing keeps the original casing of the name.
  return tag.trim().slice(PROJECT_TAG_PREFIX.length).trim();
}

/**
 * Split a reference's `tags` into plain tags and project names.
 * Project names are returned without the `project:` prefix.
 */
export function splitTags(tags?: string[] | null): {
  plain: string[];
  projects: string[];
} {
  const plain: string[] = [];
  const projects: string[] = [];
  for (const raw of tags ?? []) {
    const tag = (raw || '').trim();
    if (!tag) continue;
    if (isProjectTag(tag)) {
      const name = projectNameFromTag(tag);
      if (name) projects.push(name);
    } else {
      plain.push(tag);
    }
  }
  return { plain, projects };
}

/** The project names a single reference belongs to. */
export function getReferenceProjects(ref: TaggedReference): string[] {
  return splitTags(ref.tags).projects;
}

/** True when a reference is tagged for `projectName` (case-insensitive). */
export function referenceInProject(
  ref: TaggedReference,
  projectName: string,
): boolean {
  const target = projectName.trim().toLowerCase();
  if (!target) return true;
  return getReferenceProjects(ref).some((p) => p.toLowerCase() === target);
}

/**
 * Recombine plain tags and project names back into a single `tags[]`,
 * de-duplicating both halves. This is what the reference forms persist.
 */
export function combineTags(plain: string[], projectNames: string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const push = (value: string) => {
    const v = value.trim();
    if (!v) return;
    const key = v.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(v);
  };
  for (const t of plain) push(t);
  for (const p of projectNames) push(toProjectTag(p));
  return out;
}

/** Parse a comma-separated free-text field into a clean list. */
export function parseCommaList(text: string): string[] {
  return text
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface ProjectSummary {
  /** Display name, e.g. "Policy Gap 2.0". */
  name: string;
  /** How many references carry this project tag. */
  count: number;
}

/**
 * Aggregate the distinct projects across a set of references, with counts.
 * Sorted by count (desc) then name (A→Z). Project names that differ only
 * in case are merged under the first spelling seen.
 */
export function aggregateProjects(refs: TaggedReference[]): ProjectSummary[] {
  const counts = new Map<string, { name: string; count: number }>();
  for (const ref of refs) {
    for (const name of getReferenceProjects(ref)) {
      const key = name.toLowerCase();
      const existing = counts.get(key);
      if (existing) existing.count += 1;
      else counts.set(key, { name, count: 1 });
    }
  }
  return [...counts.values()].sort(
    (a, b) => b.count - a.count || a.name.localeCompare(b.name),
  );
}
