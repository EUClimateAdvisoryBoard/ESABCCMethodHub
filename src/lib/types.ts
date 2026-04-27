/**
 * Shared TypeScript types used across the M·04 Policy Navigator surfaces.
 * -----------------------------------------------------------------------
 * Kept deliberately small and free of runtime imports so any file can
 * `import type { … }` without pulling in a dependency graph.
 *
 * If a type is needed by only one module (e.g. just the network graph),
 * keep it next to that module. Only hoist into this file when two or
 * more call sites need it.
 */
export interface Policy {
  id: string;
  title: string;
  short_title: string;
  celex_number: string | null;
  document_type: 'regulation' | 'directive' | 'decision' | 'communication' | 'strategy';
  domain: string;
  status: 'in_force' | 'proposed' | 'amended' | 'repealed';
  adoption_date: string | null;
  entry_into_force: string | null;
  summary: string;
  eurlex_url: string;
  full_text?: string;
  last_updated: string;
}

export interface PolicyConnection {
  id: number;
  source_policy_id: string;
  target_policy_id: string;
  connection_type: 'amends' | 'implements' | 'references' | 'complements' | 'repeals' | 'is_part_of';
  description: string;
  articles_source: string | null;
  articles_target: string | null;
}

export interface Citation {
  id: number;
  policy_id: string;
  cited_policy_id: string;
  cited_policy_title: string;
  article_number: string;
  text_excerpt: string;
  char_start: number;
  char_end: number;
}

export interface Annotation {
  id: string;
  policy_id: string;
  tag: string;
  text_excerpt: string;
  char_start: number;
  char_end: number;
  note: string;
  created_at: string;
}

export interface TagDef {
  name: string;
  color: string;
  description: string;
}

export interface GraphNode {
  id: string;
  title: string;
  short_title: string;
  domain: string;
  status: string;
  document_type: string;
  connections: number;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface GraphLink {
  source: string | GraphNode;
  target: string | GraphNode;
  connection_type: string;
  description: string;
  /**
   * Human-review state, surfaced so the graph can visually distinguish
   * signed-off links from ones still awaiting approval. Absent means the
   * link comes from a source that does not track approvals.
   */
  review_status?: 'unverified' | 'verified' | 'rejected' | 'needs_review';
}
