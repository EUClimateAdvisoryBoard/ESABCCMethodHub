/**
 * Browser-side fetch helpers for the Project Workspace API.
 * --------------------------------------------------------
 * Every write goes through these helpers so authorisation tokens
 * are handled in one place. Reads are server-rendered, so there is
 * intentionally no client read helper for entities that the page
 * already passes in as props.
 */
'use client';

import { supabase } from '@/lib/supabase';
import type { IndicatorSheetLayout } from '@/lib/project-workspace/indicator-sheet';

async function authHeader(): Promise<Record<string, string>> {
  if (!supabase) return {};
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { authorization: `Bearer ${token}` } : {};
}

async function send<T>(
  url: string,
  method: 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  body?: unknown
): Promise<T> {
  const res = await fetch(url, {
    method,
    headers: { 'content-type': 'application/json', ...(await authHeader()) },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    throw new Error(`${res.status} ${txt || res.statusText}`);
  }
  return (await res.json()) as T;
}

const BASE = '/api/project-workspace';

export interface IndicatorImportSummary {
  ok: boolean;
  indicatorsProcessed: number;
  summary: {
    id: string;
    metadataUpdated: boolean;
    pointsWritten: number;
    pointsDeleted: number;
    warnings: string[];
  }[];
  warnings: string[];
  errors: string[];
}

export const pwApi = {
  createProject(body: { id?: string; name: string; description?: string }) {
    return send<{ project: { id: string; name: string; description: string } }>(
      `${BASE}/projects`,
      'POST',
      body
    );
  },
  createModule(projectId: string, body: { id?: string; kind: string; name: string; description?: string }) {
    return send(`${BASE}/projects/${projectId}/modules`, 'POST', body);
  },
  createIndicator(body: {
    projectId: string;
    name: string;
    category: string;
    unit: string;
    description?: string;
    source?: string;
    sourceUrl?: string;
    direction?: 'up' | 'down';
    targetValue?: number;
    targetYear?: number;
  }) {
    return send<{ indicator: { id: string } }>(`${BASE}/indicators`, 'POST', body);
  },
  patchIndicator(id: string, body: Record<string, unknown>) {
    return send(`${BASE}/indicators/${id}`, 'PATCH', body);
  },
  deleteIndicator(id: string) {
    return send(`${BASE}/indicators/${id}`, 'DELETE');
  },
  upsertPoint(body: { indicatorId: string; year: number; value: number }) {
    return send(`${BASE}/indicator-points`, 'POST', body);
  },
  deletePoint(indicatorId: string, year: number) {
    return send(
      `${BASE}/indicator-points?indicatorId=${encodeURIComponent(indicatorId)}&year=${year}`,
      'DELETE'
    );
  },
  patchRecommendation(id: string, body: Record<string, unknown>) {
    return send(`${BASE}/recommendations/${id}`, 'PATCH', body);
  },
  createRecommendation(body: {
    projectId: string;
    id?: string;
    area?: string;
    title: string;
    summary?: string;
    status?: 'not-addressed' | 'in-progress' | 'partially' | 'addressed';
    reportId?: string;
    reportLabel?: string;
    reportUrl?: string;
  }) {
    return send<{ recommendation: { id: string } }>(`${BASE}/recommendations`, 'POST', body);
  },
  deleteRecommendation(id: string) {
    return send(`${BASE}/recommendations/${id}`, 'DELETE');
  },
  addRecommendationEvent(body: {
    recommendationId: string;
    occurredAt: string;
    note: string;
    sourceUrl?: string;
  }) {
    return send<{ event: { id: string } }>(`${BASE}/recommendation-events`, 'POST', body);
  },
  deleteRecommendationEvent(id: string) {
    return send(`${BASE}/recommendation-events?id=${encodeURIComponent(id)}`, 'DELETE');
  },
  upsertMemberStateCell(body: {
    projectId: string;
    countryCode: string;
    sectorId: string;
    status?: string;
    note?: string;
  }) {
    return send(`${BASE}/member-state-cells`, 'PUT', body);
  },
  createPolicyAnnotation(body: {
    projectId: string;
    policyId: string;
    kind: 'approve' | 'disapprove' | 'fact-check' | 'edit' | 'comment';
    field?: string;
    value?: string;
  }) {
    return send<{ annotation: { id: string } }>(`${BASE}/policy-annotations`, 'POST', body);
  },
  patchPolicyAnnotation(id: string, body: Record<string, unknown>) {
    return send(`${BASE}/policy-annotations/${id}`, 'PATCH', body);
  },
  /** Promote (or un-promote) a "Suggested edit" annotation into the canonical policy view. */
  promotePolicyAnnotation(id: string, promote: boolean) {
    return send<{ annotation: { id: string; promoted_at: string | null } }>(
      `${BASE}/policy-annotations/${id}`,
      'PATCH',
      { promote }
    );
  },
  deletePolicyAnnotation(id: string) {
    return send(`${BASE}/policy-annotations/${id}`, 'DELETE');
  },
  /** Download the whole indicator database as an .xlsx workbook (one tab per indicator). */
  async downloadIndicatorsWorkbook(projectId: string): Promise<Blob> {
    const res = await fetch(
      `${BASE}/indicators/export?projectId=${encodeURIComponent(projectId)}`,
      { headers: { ...(await authHeader()) } }
    );
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${res.status} ${txt || res.statusText}`);
    }
    return res.blob();
  },
  /** Upload an edited workbook to update indicators, their series and helper columns. */
  async importIndicatorsWorkbook(projectId: string, file: File): Promise<IndicatorImportSummary> {
    const fd = new FormData();
    fd.append('projectId', projectId);
    fd.append('file', file);
    // Note: do NOT set content-type — the browser must add the multipart boundary.
    const res = await fetch(`${BASE}/indicators/import`, {
      method: 'POST',
      headers: { ...(await authHeader()) },
      body: fd,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => '');
      throw new Error(`${res.status} ${txt || res.statusText}`);
    }
    return (await res.json()) as IndicatorImportSummary;
  },
  /** Save the full in-app data grid for one indicator (series + helper columns). */
  saveIndicatorSheet(
    id: string,
    body: { layout: IndicatorSheetLayout; points: { year: number; value: number }[]; source?: string }
  ) {
    return send<{ ok: boolean; points: { year: number; value: number }[] }>(
      `${BASE}/indicators/${id}/sheet`,
      'PUT',
      body
    );
  },
  refreshIndicator(id: string) {
    return send<{
      ok: boolean;
      source: string;
      pointsFetched: number;
      points: { year: number; value: number }[];
    }>(`${BASE}/indicators/${id}/refresh`, 'POST');
  },
  /** Version history / audit log for one indicator (newest first). */
  async listIndicatorRevisions(id: string): Promise<IndicatorRevision[]> {
    const res = await fetch(`${BASE}/indicators/${id}/revisions`, {
      headers: { ...(await authHeader()) },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { revisions?: IndicatorRevision[] };
    return json.revisions ?? [];
  },
  /** Restore an indicator to a previously-archived version. */
  restoreIndicatorRevision(id: string, revisionId: number) {
    return send<{ ok: boolean; points: { year: number; value: number }[] }>(
      `${BASE}/indicators/${id}/revisions/restore`,
      'POST',
      { revisionId }
    );
  },
  forkPolicyCodes(body: { projectId: string; policyId: string }) {
    return send(`${BASE}/policy-codes`, 'POST', { ...body, action: 'fork' });
  },
  toggleMasterPolicyCode(body: {
    projectId: string;
    policyId: string;
    codeId: string;
    removed: boolean;
  }) {
    return send<{ code: { id: string; removed: boolean } }>(
      `${BASE}/policy-codes`,
      'POST',
      { ...body, action: 'toggle-master' }
    );
  },
  addCustomPolicyCode(body: {
    projectId: string;
    policyId: string;
    label: string;
    color?: string;
    parentCodeId?: string | null;
  }) {
    return send<{
      code: {
        id: string;
        code_id: string;
        label: string;
        color: string;
        parent_code_id: string | null;
        source: 'master' | 'custom';
        removed: boolean;
        created_at: string;
      };
    }>(`${BASE}/policy-codes`, 'POST', { ...body, action: 'add-custom' });
  },
  patchPolicyCode(
    id: string,
    body: { label?: string; color?: string; parentCodeId?: string | null; removed?: boolean }
  ) {
    return send(`${BASE}/policy-codes/${id}`, 'PATCH', body);
  },
  deletePolicyCode(id: string) {
    return send(`${BASE}/policy-codes/${id}`, 'DELETE');
  },
  saveCustomContent(projectId: string, moduleId: string, content: string) {
    return send(`${BASE}/custom-module-content`, 'PUT', {
      projectId,
      moduleId,
      content,
    });
  },

  // ── Collaboration: comments, @mentions, verifications ────────────────────
  /** All taggable people (id + display name) for the @mention picker. */
  async listPeople(): Promise<{ id: string; name: string }[]> {
    const res = await fetch(`${BASE}/people`, { headers: { ...(await authHeader()) } });
    if (!res.ok) return [];
    const json = (await res.json()) as { people?: { id: string; name: string }[] };
    return json.people ?? [];
  },
  async listComments(
    projectId: string,
    target?: { kind: string; id: string }
  ): Promise<WorkspaceComment[]> {
    const qs = new URLSearchParams({ projectId });
    if (target) {
      qs.set('kind', target.kind);
      qs.set('id', target.id);
    }
    const res = await fetch(`${BASE}/comments?${qs.toString()}`, {
      headers: { ...(await authHeader()) },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { comments?: WorkspaceComment[] };
    return json.comments ?? [];
  },
  createComment(body: {
    projectId: string;
    targetKind: string;
    targetId: string;
    body: string;
    parentId?: string | null;
    mentions?: string[];
  }) {
    return send<{ comment: WorkspaceComment }>(`${BASE}/comments`, 'POST', body);
  },
  patchComment(id: string, body: { body?: string; resolved?: boolean }) {
    return send<{ comment: WorkspaceComment }>(`${BASE}/comments/${id}`, 'PATCH', body);
  },
  deleteComment(id: string) {
    return send(`${BASE}/comments/${id}`, 'DELETE');
  },
  async listVerifications(
    projectId: string,
    target?: { kind: string; id: string }
  ): Promise<WorkspaceVerification[]> {
    const qs = new URLSearchParams({ projectId });
    if (target) {
      qs.set('kind', target.kind);
      qs.set('id', target.id);
    }
    const res = await fetch(`${BASE}/verifications?${qs.toString()}`, {
      headers: { ...(await authHeader()) },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { verifications?: WorkspaceVerification[] };
    return json.verifications ?? [];
  },
  setVerification(body: {
    projectId: string;
    targetKind: string;
    targetId: string;
    status: 'verified' | 'disputed';
    note?: string;
  }) {
    return send<{ verification: WorkspaceVerification }>(`${BASE}/verifications`, 'PUT', body);
  },
  clearVerification(projectId: string, target: { kind: string; id: string }) {
    const qs = new URLSearchParams({ projectId, kind: target.kind, id: target.id });
    return send(`${BASE}/verifications?${qs.toString()}`, 'DELETE');
  },
};

/**
 * Client-side mirror of the server `IndicatorRevision` shape (see
 * indicator-revisions.ts, which is `server-only` and can't be imported here).
 */
export type IndicatorRevisionAction =
  | 'create'
  | 'edit-sheet'
  | 'import'
  | 'refresh'
  | 'point-upsert'
  | 'point-delete'
  | 'metadata'
  | 'restore'
  | 'delete';

export interface IndicatorRevision {
  id: number;
  indicatorId: string;
  projectId: string;
  action: IndicatorRevisionAction;
  summary: string;
  changedBy: string | null;
  changedByName: string;
  changedAt: string;
  snapshot: {
    metadata: Record<string, unknown> | null;
    points: { year: number; value: number }[];
    layout: unknown | null;
  } | null;
}

/** Human-readable labels, kept in sync with REVISION_ACTION_LABELS server-side. */
export const REVISION_ACTION_LABELS: Record<IndicatorRevisionAction, string> = {
  create: 'Created',
  'edit-sheet': 'Edited data / calc grid',
  import: 'Imported from Excel',
  refresh: 'Refreshed from source',
  'point-upsert': 'Edited a data point',
  'point-delete': 'Removed a data point',
  metadata: 'Edited details',
  restore: 'Restored a previous version',
  delete: 'Deleted indicator',
};

/** Mirror of the server `WorkspaceComment` shape (see collaboration.ts). */
export interface WorkspaceComment {
  id: string;
  projectId: string;
  targetKind: string;
  targetId: string;
  parentId: string | null;
  body: string;
  mentions: string[];
  resolved: boolean;
  createdBy: string | null;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

/** Mirror of the server `WorkspaceVerification` shape. */
export interface WorkspaceVerification {
  projectId: string;
  targetKind: string;
  targetId: string;
  userId: string;
  status: 'verified' | 'disputed';
  note: string;
  userName: string;
  updatedAt: string;
}
