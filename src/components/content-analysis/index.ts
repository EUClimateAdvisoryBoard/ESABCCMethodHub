/**
 * Content Analysis — public UI surface.
 *
 * The embeddable building blocks of the qualitative-coding workbench, for
 * host modules (e.g. the Project Workspace) that compose Content Analysis
 * into their own layout. Importing from this barrel rather than reaching
 * into individual component files keeps the module's public component set
 * explicit; anything not listed here is internal.
 *
 * `PdfDocumentView` is intentionally *not* re-exported as a component: hosts
 * load it via `next/dynamic` (it touches `window` on mount), so only its
 * public selection types are surfaced here.
 *
 * The data/store side of the surface lives in
 * `@/lib/content-analysis/service`.
 */
export { default as DocumentSummaryPanel } from './DocumentSummaryPanel';
export { default as GuidedSession } from './GuidedSession';
export { default as CodeSystemTree } from './CodeSystemTree';
export { default as DocumentList } from './DocumentList';
export { default as OverallTagPicker } from './OverallTagPicker';
export { default as AnnotatedDocumentView } from './AnnotatedDocumentView';
export { default as SegmentsList } from './SegmentsList';
export { default as GeneralNotesPanel, type PendingNoteSelection } from './GeneralNotesPanel';
export { default as WorkspaceAnalysis, type AnalysisTab } from './WorkspaceAnalysis';
export { default as WorkspaceChapterView } from './WorkspaceChapterView';
export { default as FloatingCodeToolbar, type ToolbarSelection } from './FloatingCodeToolbar';
export { default as CodeEditorModal, type CodeEditorPayload, type CodeEditorResult } from './CodeEditorModal';
export type { PdfTextSelection, PdfRegionCapture } from './PdfDocumentView';
