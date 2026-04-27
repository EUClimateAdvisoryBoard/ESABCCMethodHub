/**
 * Policy Navigator — connection review state sync.
 * -------------------------------------------------
 * GET  /api/connections/state                 → { overrides, verifications, additions }
 * POST /api/connections/state  { op, ... }    → applies one mutation, returns same shape
 *
 * Backs the `useConnectionOverrides` hook (formerly localStorage-only).
 * Tables: `connection_overrides`, `connection_verifications`,
 * `connection_additions` (migration 019_connection_review_state.sql).
 *
 * Auth: every authenticated user can read and write — the review queue is a
 * shared editorial workflow, like a Notion table. RLS on the tables enforces
 * the "must be signed in" rule; we additionally check the bearer token here
 * so unauthenticated callers get a clean 401 instead of a silent empty read.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabase-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ── shared types — must mirror the client hook ───────────────────────────────
type VerificationStatus = 'unverified' | 'verified' | 'rejected' | 'needs_review';

interface OverrideRow {
  connection_id: number;
  connection_type: string | null;
  description: string | null;
  articles_source: string | null;
  articles_target: string | null;
  updated_at: string;
}
interface VerificationRow {
  connection_id: number;
  status: VerificationStatus;
  reviewer_name: string;
  reviewer_user_id: string | null;
  reviewer_note: string | null;
  reviewed_at: string;
}
interface AdditionRow {
  id: number;
  source_policy_id: string;
  target_policy_id: string;
  connection_type: string;
  description: string;
  articles_source: string | null;
  articles_target: string | null;
}

const VALID_STATUS: ReadonlySet<VerificationStatus> = new Set([
  'unverified', 'verified', 'rejected', 'needs_review',
]);

async function requireUser(req: NextRequest) {
  const supabase = getServerSupabase();
  if (!supabase) return { supabase: null, user: null, error: 'Supabase not configured.', status: 503 };
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return { supabase, user: null, error: 'Unauthorized.', status: 401 };
  const token = authHeader.replace(/^Bearer\s+/i, '');
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return { supabase, user: null, error: 'Unauthorized.', status: 401 };
  return { supabase, user, error: null as string | null, status: 200 };
}

async function loadAll(supabase: NonNullable<ReturnType<typeof getServerSupabase>>) {
  const [overridesRes, verificationsRes, additionsRes] = await Promise.all([
    supabase.from('connection_overrides').select('*'),
    supabase.from('connection_verifications').select('*'),
    supabase.from('connection_additions').select('*').order('added_at', { ascending: true }),
  ]);
  if (overridesRes.error) throw new Error(overridesRes.error.message);
  if (verificationsRes.error) throw new Error(verificationsRes.error.message);
  if (additionsRes.error) throw new Error(additionsRes.error.message);
  return {
    overrides: (overridesRes.data ?? []) as OverrideRow[],
    verifications: (verificationsRes.data ?? []) as VerificationRow[],
    additions: (additionsRes.data ?? []) as AdditionRow[],
  };
}

export async function GET(req: NextRequest) {
  const { supabase, error, status } = await requireUser(req);
  if (!supabase || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }
  try {
    const data = await loadAll(supabase);
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { supabase, user, error, status } = await requireUser(req);
  if (!supabase || !user || error) {
    return NextResponse.json({ error: error || 'Unauthorized.' }, { status });
  }

  let body: { op?: string; [k: string]: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const op = body.op;
  try {
    switch (op) {
      // ── verifications ────────────────────────────────────────────────────
      case 'setVerification': {
        const id = Number(body.id);
        const status = body.status as VerificationStatus;
        if (!Number.isFinite(id) || !VALID_STATUS.has(status)) {
          return NextResponse.json({ error: 'Invalid id or status.' }, { status: 400 });
        }
        const row: Partial<VerificationRow> = {
          connection_id: id,
          status,
          reviewer_name: typeof body.reviewerName === 'string' ? body.reviewerName : '',
          reviewer_user_id: user.id,
          reviewer_note: typeof body.reviewerNote === 'string' ? body.reviewerNote : null,
          reviewed_at: new Date().toISOString(),
        };
        const { error: upErr } = await supabase
          .from('connection_verifications')
          .upsert(row, { onConflict: 'connection_id' });
        if (upErr) throw new Error(upErr.message);
        break;
      }

      case 'bulkSetVerification': {
        const ids = Array.isArray(body.ids) ? body.ids.map(Number).filter(Number.isFinite) : [];
        const status = body.status as VerificationStatus;
        if (ids.length === 0 || !VALID_STATUS.has(status)) {
          return NextResponse.json({ error: 'Invalid ids or status.' }, { status: 400 });
        }
        const reviewedAt = new Date().toISOString();
        const rows = ids.map(id => ({
          connection_id: id,
          status,
          reviewer_name: typeof body.reviewerName === 'string' ? body.reviewerName : '',
          reviewer_user_id: user.id,
          reviewer_note: typeof body.reviewerNote === 'string' ? body.reviewerNote : null,
          reviewed_at: reviewedAt,
        }));
        const { error: upErr } = await supabase
          .from('connection_verifications')
          .upsert(rows, { onConflict: 'connection_id' });
        if (upErr) throw new Error(upErr.message);
        break;
      }

      case 'clearVerification': {
        const id = Number(body.id);
        if (!Number.isFinite(id)) {
          return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
        }
        const { error: delErr } = await supabase
          .from('connection_verifications')
          .delete()
          .eq('connection_id', id);
        if (delErr) throw new Error(delErr.message);
        break;
      }

      // ── overrides ────────────────────────────────────────────────────────
      case 'saveOverride': {
        const id = Number(body.id);
        const patch = (body.patch ?? {}) as Record<string, unknown>;
        if (!Number.isFinite(id)) {
          return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
        }
        const row: Partial<OverrideRow> = {
          connection_id: id,
          connection_type: typeof patch.connection_type === 'string' ? patch.connection_type : null,
          description: typeof patch.description === 'string' ? patch.description : null,
          articles_source:
            typeof patch.articles_source === 'string'
              ? patch.articles_source
              : patch.articles_source === null ? null : null,
          articles_target:
            typeof patch.articles_target === 'string'
              ? patch.articles_target
              : patch.articles_target === null ? null : null,
          updated_at: new Date().toISOString(),
        };
        const { error: upErr } = await supabase
          .from('connection_overrides')
          .upsert({ ...row, edited_by: user.id }, { onConflict: 'connection_id' });
        if (upErr) throw new Error(upErr.message);
        break;
      }

      case 'clearOverride': {
        const id = Number(body.id);
        if (!Number.isFinite(id)) {
          return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
        }
        const { error: delErr } = await supabase
          .from('connection_overrides')
          .delete()
          .eq('connection_id', id);
        if (delErr) throw new Error(delErr.message);
        break;
      }

      // ── additions ────────────────────────────────────────────────────────
      case 'addConnection': {
        const draft = (body.draft ?? {}) as Record<string, unknown>;
        if (
          typeof draft.source_policy_id !== 'string' ||
          typeof draft.target_policy_id !== 'string' ||
          typeof draft.connection_type !== 'string'
        ) {
          return NextResponse.json({ error: 'Missing connection fields.' }, { status: 400 });
        }
        const insertRow = {
          source_policy_id: draft.source_policy_id,
          target_policy_id: draft.target_policy_id,
          connection_type: draft.connection_type,
          description: typeof draft.description === 'string' ? draft.description : '',
          articles_source: typeof draft.articles_source === 'string' ? draft.articles_source : null,
          articles_target: typeof draft.articles_target === 'string' ? draft.articles_target : null,
          added_by: user.id,
        };
        const { data: created, error: insErr } = await supabase
          .from('connection_additions')
          .insert(insertRow)
          .select('*')
          .single();
        if (insErr) throw new Error(insErr.message);
        const all = await loadAll(supabase);
        return NextResponse.json({ ...all, created });
      }

      case 'updateAddedConnection': {
        const id = Number(body.id);
        const patch = (body.patch ?? {}) as Record<string, unknown>;
        if (!Number.isFinite(id)) {
          return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
        }
        const updates: Record<string, unknown> = {};
        for (const key of [
          'source_policy_id', 'target_policy_id', 'connection_type',
          'description', 'articles_source', 'articles_target',
        ]) {
          if (key in patch) updates[key] = patch[key];
        }
        const { error: upErr } = await supabase
          .from('connection_additions')
          .update(updates)
          .eq('id', id);
        if (upErr) throw new Error(upErr.message);
        break;
      }

      case 'deleteAddedConnection': {
        const id = Number(body.id);
        if (!Number.isFinite(id)) {
          return NextResponse.json({ error: 'Invalid id.' }, { status: 400 });
        }
        // Drop any verification record pointed at the deleted addition so
        // no dangling rows linger — mirrors the previous in-hook behaviour.
        const { error: delVerErr } = await supabase
          .from('connection_verifications')
          .delete()
          .eq('connection_id', id);
        if (delVerErr) throw new Error(delVerErr.message);
        const { error: delErr } = await supabase
          .from('connection_additions')
          .delete()
          .eq('id', id);
        if (delErr) throw new Error(delErr.message);
        break;
      }

      default:
        return NextResponse.json({ error: `Unknown op: ${op}` }, { status: 400 });
    }

    const all = await loadAll(supabase);
    return NextResponse.json(all);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
