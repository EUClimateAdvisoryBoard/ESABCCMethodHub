/**
 * Server-safe comment-target helper.
 * ----------------------------------
 * `commentTarget` returns plain data-attributes that mark any element as
 * right-clickable for comments; they're read by WorkspaceCommentProvider's
 * context-menu handler, so the tag works on server-rendered markup that can't
 * take React props or hooks.
 *
 * This helper deliberately lives in its OWN module with **no `'use client'`
 * directive**. The project workspace page is a Server Component and spreads
 * `commentTarget(...)` onto its header, so the helper must be a real,
 * server-importable function. Exporting it from the `'use client'` provider
 * turned it into a *client reference* on the server — calling that reference
 * threw "commentTarget is not a function" and crashed the whole page.
 */

export interface CommentTarget {
  kind: string;
  id: string;
}

export function commentTarget(kind: string, id: string, label: string) {
  return {
    'data-comment-kind': kind,
    'data-comment-id': id,
    'data-comment-label': label,
  } as const;
}
