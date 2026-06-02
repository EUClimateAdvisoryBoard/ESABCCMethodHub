import { NextRequest, NextResponse } from 'next/server';
import {
  deleteCode,
  getCodes,
  isPersistent,
  upsertCodes,
} from '@/lib/content-analysis-store';
import type { CodeNode } from '@/lib/content-analysis/types';

/**
 * Content-analysis codes API
 *
 * Durable backend for *user-created* codes (tags) — typically project-scoped
 * tags made at runtime in the workspace Content Analysis module. Master codes
 * are deterministic seed data and are NOT stored here.
 *
 * Persisting these makes the workspace lens feature work live: a tag created
 * in one project's context resolves (name + colour) for every other user, so a
 * coded segment under that tag never renders as an unknown code.
 *
 *   GET    /api/content-analysis/codes  → list all persisted codes
 *   POST   /api/content-analysis/codes  → upsert one or many codes
 *                                         body: { codes: CodeNode[] } | CodeNode
 *   DELETE /api/content-analysis/codes  → ?id=<id>  or body { id }
 */

const MAX_NAME_LEN = 200;
const MAX_DESC_LEN = 2000;
const MAX_BATCH = 500;

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function coerceCode(raw: unknown): CodeNode | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== 'string' || !r.id) return null;
  if (typeof r.name !== 'string' || !r.name) return null;
  const scope = r.scope === 'master' ? 'master' : 'project';
  return {
    id: r.id,
    parentId: typeof r.parentId === 'string' ? r.parentId : null,
    name: clampString(r.name, MAX_NAME_LEN),
    description: typeof r.description === 'string' ? clampString(r.description, MAX_DESC_LEN) : undefined,
    color: typeof r.color === 'string' ? r.color.slice(0, 32) : '#00928F',
    scope,
    projectId: typeof r.projectId === 'string' ? r.projectId : undefined,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
  };
}

export async function GET() {
  const items = await getCodes();
  return NextResponse.json({ items, total: items.length, persistent: isPersistent() });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawBatch: unknown[] = Array.isArray(body?.codes)
      ? body.codes
      : Array.isArray(body)
        ? body
        : [body];
    if (rawBatch.length > MAX_BATCH) {
      return NextResponse.json({ error: `Batch too large (max ${MAX_BATCH})` }, { status: 400 });
    }
    const codes: CodeNode[] = [];
    for (const raw of rawBatch) {
      const c = coerceCode(raw);
      if (c) codes.push(c);
    }
    if (codes.length === 0) {
      return NextResponse.json({ error: 'No valid codes' }, { status: 400 });
    }
    await upsertCodes(codes);
    return NextResponse.json({ status: 'ok', count: codes.length, persistent: isPersistent() });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to save codes: ${message}` }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    let id = request.nextUrl.searchParams.get('id') || '';
    if (!id) {
      try {
        const body = (await request.json()) as { id?: unknown };
        if (typeof body.id === 'string') id = body.id;
      } catch { /* no body */ }
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }
    const ok = await deleteCode(id);
    if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ status: 'deleted', id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `Failed to delete code: ${message}` }, { status: 500 });
  }
}
