/**
 * Persistent store for externally contributed scenario data submissions.
 *
 * Primary backend: Supabase table `public.scenario_submissions` (see
 * `supabase/migrations/003_scenario_submissions.sql`) plus the
 * `scenario-submissions` storage bucket for the raw uploaded files.
 *
 * Fallback: in-memory global array, used only when Supabase env vars are
 * missing (e.g. local dev without `.env.local`).
 */

import { getServerSupabase } from './supabase-server';

export type ReviewStatus =
  | 'pending'
  | 'under_review'
  | 'accepted'
  | 'rejected'
  | 'needs_changes';

export interface ScenarioSubmission {
  id: string;
  callSlug: string;
  submitterName: string;
  submitterEmail: string;
  institution: string;
  modelName: string;
  scenarioName: string;
  description: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  storagePath: string | null;
  publicUrl: string | null;
  rowCount: number | null;
  headers: string[];
  missingColumns: string[];
  yearColumns: string[];
  validationOk: boolean;
  validationNotes: string;
  reviewStatus: ReviewStatus;
  reviewNotes: string;
  apiKey: string;
  createdAt: string;
  reviewedAt: string | null;
}

interface DbRow {
  id: string;
  call_slug: string | null;
  submitter_name: string;
  submitter_email: string;
  institution: string;
  model_name: string;
  scenario_name: string;
  description: string;
  file_name: string;
  file_size: number;
  file_type: string;
  storage_path: string | null;
  public_url: string | null;
  row_count: number | null;
  headers: string[] | null;
  missing_columns: string[] | null;
  year_columns: string[] | null;
  validation_ok: boolean;
  validation_notes: string | null;
  review_status: ReviewStatus;
  review_notes: string;
  api_key: string | null;
  created_at: string;
  reviewed_at: string | null;
}

const BUCKET = 'scenario-submissions';
const MAX_ITEMS = 1000;

interface GlobalCache {
  __scenarioSubmissions?: ScenarioSubmission[];
}
const g = globalThis as unknown as GlobalCache;
if (!g.__scenarioSubmissions) g.__scenarioSubmissions = [];

function rowToItem(r: DbRow): ScenarioSubmission {
  return {
    id: r.id,
    callSlug: r.call_slug || '',
    submitterName: r.submitter_name,
    submitterEmail: r.submitter_email,
    institution: r.institution,
    modelName: r.model_name,
    scenarioName: r.scenario_name,
    description: r.description,
    fileName: r.file_name,
    fileSize: r.file_size,
    fileType: r.file_type,
    storagePath: r.storage_path,
    publicUrl: r.public_url,
    rowCount: r.row_count,
    headers: r.headers || [],
    missingColumns: r.missing_columns || [],
    yearColumns: r.year_columns || [],
    validationOk: r.validation_ok,
    validationNotes: r.validation_notes || '',
    reviewStatus: r.review_status,
    reviewNotes: r.review_notes || '',
    apiKey: r.api_key || '',
    createdAt: r.created_at,
    reviewedAt: r.reviewed_at,
  };
}

function itemToRow(it: ScenarioSubmission): DbRow {
  return {
    id: it.id,
    call_slug: it.callSlug || null,
    submitter_name: it.submitterName,
    submitter_email: it.submitterEmail,
    institution: it.institution,
    model_name: it.modelName,
    scenario_name: it.scenarioName,
    description: it.description,
    file_name: it.fileName,
    file_size: it.fileSize,
    file_type: it.fileType,
    storage_path: it.storagePath,
    public_url: it.publicUrl,
    row_count: it.rowCount,
    headers: it.headers,
    missing_columns: it.missingColumns,
    year_columns: it.yearColumns,
    validation_ok: it.validationOk,
    validation_notes: it.validationNotes,
    review_status: it.reviewStatus,
    review_notes: it.reviewNotes,
    api_key: it.apiKey || null,
    created_at: it.createdAt,
    reviewed_at: it.reviewedAt,
  };
}

export async function uploadSubmissionFile(
  id: string,
  file: File,
): Promise<{ storagePath: string | null; publicUrl: string | null; error?: string }> {
  const sb = getServerSupabase();
  if (!sb) return { storagePath: null, publicUrl: null };

  const safeName = file.name.replace(/[^A-Za-z0-9._-]/g, '_').slice(0, 120);
  const storagePath = `${id}/${safeName}`;

  const { error } = await sb.storage.from(BUCKET).upload(storagePath, file, {
    contentType: file.type || 'application/octet-stream',
    upsert: true,
    cacheControl: '3600',
  });
  if (error) {
    return { storagePath: null, publicUrl: null, error: error.message };
  }
  const { data } = sb.storage.from(BUCKET).getPublicUrl(storagePath);
  return { storagePath, publicUrl: data.publicUrl };
}

export async function addSubmission(item: ScenarioSubmission): Promise<void> {
  const sb = getServerSupabase();
  if (sb) {
    const { error } = await sb.from('scenario_submissions').insert(itemToRow(item));
    if (!error) return;
    console.error(
      'scenario_submissions insert failed, falling back to memory:',
      error.message,
    );
  }
  const items = g.__scenarioSubmissions!;
  items.unshift(item);
  if (items.length > MAX_ITEMS) items.length = MAX_ITEMS;
}

export async function listSubmissions(
  filter?: { status?: ReviewStatus; callSlug?: string },
): Promise<ScenarioSubmission[]> {
  const sb = getServerSupabase();
  if (sb) {
    let q = sb
      .from('scenario_submissions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(MAX_ITEMS);
    if (filter?.status) q = q.eq('review_status', filter.status);
    if (filter?.callSlug) q = q.eq('call_slug', filter.callSlug);
    const { data, error } = await q;
    if (!error && data) return (data as DbRow[]).map(rowToItem);
    if (error) {
      console.error(
        'scenario_submissions select failed, falling back to memory:',
        error.message,
      );
    }
  }
  let items = g.__scenarioSubmissions!.slice();
  if (filter?.status) items = items.filter((i) => i.reviewStatus === filter.status);
  if (filter?.callSlug) items = items.filter((i) => i.callSlug === filter.callSlug);
  return items;
}

export async function updateSubmissionReview(
  id: string,
  patch: { reviewStatus?: ReviewStatus; reviewNotes?: string },
): Promise<boolean> {
  const sb = getServerSupabase();
  if (sb) {
    const dbPatch: Record<string, unknown> = { reviewed_at: new Date().toISOString() };
    if (patch.reviewStatus !== undefined) dbPatch.review_status = patch.reviewStatus;
    if (patch.reviewNotes !== undefined) dbPatch.review_notes = patch.reviewNotes;
    const { error } = await sb
      .from('scenario_submissions')
      .update(dbPatch)
      .eq('id', id);
    if (!error) return true;
    console.error(
      'scenario_submissions update failed, trying memory:',
      error.message,
    );
  }
  const it = g.__scenarioSubmissions!.find((i) => i.id === id);
  if (!it) return false;
  if (patch.reviewStatus !== undefined) it.reviewStatus = patch.reviewStatus;
  if (patch.reviewNotes !== undefined) it.reviewNotes = patch.reviewNotes;
  it.reviewedAt = new Date().toISOString();
  return true;
}
