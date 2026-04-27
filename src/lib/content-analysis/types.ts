// ---------------------------------------------------------------------------
// Content Analysis module — data model (beta).
//
// Follows a MAXQDA-style qualitative-coding workflow:
//   • a hierarchical code system sits alongside the documents,
//   • each coded segment pins a range of characters inside a document,
//   • segments can be filtered, exported and walked back to source text,
//   • "projects" carve a subset of the master corpus + codes into a scope.
//
// All persistence is client-side (localStorage) during the beta. Shapes
// are intentionally JSON-friendly so a future server store can take over
// without touching the UI.
// ---------------------------------------------------------------------------

/** Where a code lives in the hierarchy. Master codes are shared across
 *  every project; project codes are scoped to a single project. */
export type CodeScope = 'master' | 'project';

export interface CodeNode {
  id: string;
  parentId: string | null;
  name: string;
  description?: string;
  color: string;
  scope: CodeScope;
  /** Only set for `scope === 'project'`. */
  projectId?: string;
  createdAt: string;
}

/** Analytical angle a project is built for. Only "horizontal" has a real
 *  view in the beta; the others ship as placeholders. */
export type AnalysisMode = 'horizontal' | 'vertical' | 'longitudinal' | 'outcomes';

/** Document type attached at ingestion. Mirrors the policy taxonomy so
 *  vertical-coherence views can line up targets ↔ budgets ↔ plans. */
export type DocumentKind =
  | 'regulation'
  | 'directive'
  | 'decision'
  | 'communication'
  | 'strategy'
  | 'budget'
  | 'implementation'
  | 'report';

/** Heuristic structural role of a block, derived at ingestion time. */
export type BlockKind =
  | 'heading'
  | 'recital'
  | 'article'
  | 'paragraph'
  | 'footer'
  | 'table'
  | 'unknown';

/** A structurally-meaningful chunk of a document — a paragraph, a recital,
 *  an article body. Sourced from the ingestion pipeline and shipped with
 *  page + bounding-box coordinates so the PDF pane can render overlays. */
export interface Block {
  id: string;
  /** 1-indexed page in the source PDF. */
  page: number;
  /** Rendering order across the whole document, 0-indexed. */
  order: number;
  /** [x, y, w, h] per line in PDF user-space units (points). */
  bboxes: number[][];
  kind: BlockKind;
  text: string;
}

/** AI-generated classification of a document against one master code. */
export interface AiClassification {
  codeId: string;
  confidence: number;
  rationale: string;
  evidenceBlockIds: string[];
}

/** A frozen snapshot of a document's blocks + text at a point in time —
 *  captured whenever a new ingest / upload replaces the current body.
 *  Powers the longitudinal-analysis view so users can compare successive
 *  consolidated versions of the same CELEX. */
export interface DocumentVersion {
  id: string;
  /** ISO timestamp when this snapshot was archived. */
  capturedAt: string;
  /** Optional human-facing label — usually the adoption date of the
   *  version or the CELEX suffix (e.g. `2020-06-30`, `C(2024)1234`). */
  label?: string;
  /** Upstream source that produced this version ("eurlex-pdf",
   *  "eurlex-html", "fallback-text", "manual-upload"). */
  source?: string;
  /** Frozen blocks at the time of capture. */
  blocks: Block[];
  /** Frozen text at the time of capture. */
  text: string;
  /** Number of pages in the source PDF, if applicable. */
  pageCount?: number;
}

/** Where a document came from. Policies are the official EU corpus; a
 *  reference is a paper/report/third-party legislation promoted from the
 *  ESABCC reference library. Defaults to 'policy' on older snapshots. */
export type DocumentSourceKind = 'policy' | 'reference';

export interface AnalysisDocument {
  id: string;
  title: string;
  shortTitle: string;
  kind: DocumentKind;
  celexNumber: string | null;
  eurlexUrl: string | null;
  adoptionDate: string | null;
  /** Plain-text rendering of the document body, newline-preserving.
   *  Fallback when `blocks` is absent (pre-ingestion seed docs). */
  text: string;
  /** Master-level codes the AI pre-assigned at the whole-document level. */
  aiCodeIds: string[];
  /** Optional link to an earlier version (for longitudinal analysis). */
  supersedes?: string;
  /** Direct URL to the source PDF on EUR-Lex (set after ingestion). */
  pdfUrl?: string;
  /** Structured blocks, populated by the ingestion pipeline. */
  blocks?: Block[];
  /** Number of pages in the source PDF. */
  pageCount?: number;
  /** ISO timestamp of the last successful ingest. */
  ingestedAt?: string;
  /** How the current blocks / text were sourced. Only `eurlex-pdf` and
   *  `manual-upload` mean the PDF bytes were cached server-side — only
   *  those light up the PDF pane in the workbench. */
  ingestSource?: 'eurlex-pdf' | 'eurlex-html' | 'fallback-text' | 'manual-upload';
  /** Rich AI classifications against the current code system. */
  aiClassifications?: AiClassification[];
  /** ISO timestamp of the last AI pre-tagging run. */
  aiTaggedAt?: string;
  /** Frozen archives of past block/text states — captured before each
   *  re-ingest / re-upload so successive consolidated versions of the
   *  same act can be compared longitudinally. */
  versions?: DocumentVersion[];
  /** Source library (defaults to 'policy' when absent). */
  sourceKind?: DocumentSourceKind;
  /** Author/citation label for reference docs. */
  referenceAuthors?: string;
  /** Publication year for reference docs. */
  referenceYear?: string;
  /** DOI / external URL for reference docs. */
  referenceUrl?: string;
}

export interface CodedSegment {
  id: string;
  documentId: string;
  codeId: string;
  /** When set, `startChar`/`endChar` are offsets within this block's text.
   *  When absent (legacy), they are offsets against AnalysisDocument.text. */
  blockId?: string;
  /** Inclusive start / exclusive end. */
  startChar: number;
  endChar: number;
  text: string;
  note: string;
  /** Segments created inside a project are scoped to it; master-level
   *  segments have `projectId === null`. */
  projectId: string | null;
  createdAt: string;
}

/** An AI-suggested coded segment awaiting human review. Rendered in the
 *  workbench as "track changes" — the analyst clicks Accept to promote it
 *  to a real `CodedSegment`, or Reject to discard it. Suggestions are
 *  document-scoped rather than project-scoped; the project is picked up
 *  at acceptance time from the active workbench context. */
export interface CodeSuggestion {
  id: string;
  documentId: string;
  codeId: string;
  /** Anchor block inside the document (when blocks exist). */
  blockId?: string;
  /** Offsets within blockId's text (or the flat text when no blockId). */
  startChar: number;
  endChar: number;
  /** Verbatim quote from the document — used for fuzzy re-anchoring if
   *  the offsets drift between suggest and accept. */
  quote: string;
  /** One-line justification from the model (≤ 220 chars). */
  rationale: string;
  /** Model confidence in [0, 1]. */
  confidence: number;
  /** Provenance — which model, and when. */
  model?: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  mode: AnalysisMode;
  /** Master codes that define the project corpus (OR-filter: a document is
   *  in scope if any of its aiCodeIds match). Empty array ⇒ full corpus. */
  masterCodeSelection: string[];
  /** Explicit document allow-list. Empty ⇒ use masterCodeSelection only. */
  documentAllowList: string[];
  createdAt: string;
  updatedAt: string;
}

/** Everything the store persists. Versioned so we can migrate later. */
export interface ContentAnalysisSnapshot {
  version: 1;
  codes: CodeNode[];
  documents: AnalysisDocument[];
  segments: CodedSegment[];
  projects: Project[];
  /** Pending AI code suggestions awaiting human accept/reject. */
  suggestions: CodeSuggestion[];
}
