'use client';

// ---------------------------------------------------------------------------
// Overall (document-level) tags for the Content Analysis workbench.
//
// The workbench distinguishes TWO categories of tag:
//
//   1. In-text tags  — codes pinned to a passage (a `CodedSegment`). These are
//      the highlights an analyst makes inside a document.
//   2. Overall tags  — codes that describe the WHOLE document, the coloured
//      dots shown on each corpus card. Policy documents ship an AI-assigned
//      baseline (`AnalysisDocument.aiCodeIds`, see policy-master-tags.ts);
//      scientific & grey literature, which arrive live from the reference
//      manager, only ever had a single placeholder tag. This hook lets an
//      analyst curate that overall-tag set by hand for any document.
//
// Persistence mirrors the per-workspace corpus (`ca:ws-corpus:*`): client-side
// localStorage during the beta, JSON-friendly so a future server store can take
// over without touching the UI. Overall tags describe the document itself, so
// they are stored globally (one set per document id) rather than per project.
// ---------------------------------------------------------------------------

import { useCallback, useEffect, useState } from 'react';
import type { AnalysisDocument } from './types';

const STORAGE_KEY = 'ca:overall-tags';

/** Per-document override of the overall-tag set, keyed by document id. A
 *  document with no entry falls back to its AI baseline (`aiCodeIds`). */
type OverallTagMap = Record<string, string[]>;

/** The overall tags actually in effect for a document: the analyst's manual
 *  override when present, otherwise the AI baseline shipped on the document. */
export function effectiveOverallTags(
  doc: Pick<AnalysisDocument, 'aiCodeIds'>,
  override: string[] | undefined,
): string[] {
  return override ?? doc.aiCodeIds ?? [];
}

export interface OverallTagsApi {
  /** True once the persisted map has been read from storage. */
  loaded: boolean;
  /** Manual override for a document, or `undefined` when untouched. */
  getOverride: (docId: string) => string[] | undefined;
  /** Toggle a single overall tag on a document. `baseline` seeds the set the
   *  first time a document is touched, so unchecking an AI tag works too. */
  toggleTag: (docId: string, codeId: string, baseline: string[]) => void;
  /** Replace a document's whole overall-tag set. */
  setTags: (docId: string, codeIds: string[]) => void;
}

export function useOverallTags(): OverallTagsApi {
  const [map, setMap] = useState<OverallTagMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setMap(JSON.parse(raw) as OverallTagMap);
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    } catch {
      /* quota — ignore */
    }
  }, [map, loaded]);

  const getOverride = useCallback((docId: string): string[] | undefined => map[docId], [map]);

  const toggleTag = useCallback((docId: string, codeId: string, baseline: string[]) => {
    setMap(prev => {
      const current = prev[docId] ?? baseline;
      const next = current.includes(codeId)
        ? current.filter(c => c !== codeId)
        : [...current, codeId];
      return { ...prev, [docId]: next };
    });
  }, []);

  const setTags = useCallback((docId: string, codeIds: string[]) => {
    setMap(prev => ({ ...prev, [docId]: codeIds }));
  }, []);

  return { loaded, getOverride, toggleTag, setTags };
}
