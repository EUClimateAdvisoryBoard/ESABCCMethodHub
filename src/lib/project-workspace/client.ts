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
  refreshIndicator(id: string) {
    return send<{
      ok: boolean;
      source: string;
      pointsFetched: number;
      points: { year: number; value: number }[];
    }>(`${BASE}/indicators/${id}/refresh`, 'POST');
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
};
