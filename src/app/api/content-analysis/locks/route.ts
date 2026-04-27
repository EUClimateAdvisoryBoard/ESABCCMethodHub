import { NextRequest, NextResponse } from 'next/server';
import {
  acquireLock,
  getLock,
  heartbeatLock,
  listLocks,
  releaseLock,
  STALE_AFTER_SECONDS,
} from '@/lib/content-analysis/locks-store';

/**
 * Project-locks API for the content-analysis workbench.
 *
 *   GET    /api/content-analysis/locks             → list every active lock
 *   GET    /api/content-analysis/locks?projectId=… → fetch one
 *   POST   /api/content-analysis/locks             → acquire (steals if stale)
 *                                                    body: { projectId, holderName }
 *   PATCH  /api/content-analysis/locks             → heartbeat
 *                                                    body: { projectId }
 *   DELETE /api/content-analysis/locks?projectId=… → release
 *
 * The holder identity comes from the X-MH-Client-Id header — a stable
 * uuid the client persists in localStorage. When OIDC lands, swap that
 * header read for `session.user.sub` and the rest of this file
 * stays the same.
 */

const MAX_NAME_LEN = 80;

function readHolderId(req: NextRequest): string | null {
  const id = req.headers.get('x-mh-client-id');
  if (!id || typeof id !== 'string') return null;
  // Tight: only allow ASCII identifier characters so the column doesn't
  // become a free-text vector.
  if (!/^[a-zA-Z0-9._:-]{6,80}$/.test(id)) return null;
  return id;
}

function clampName(v: unknown): string {
  if (typeof v !== 'string') return 'Anonymous editor';
  const trimmed = v.trim().slice(0, MAX_NAME_LEN);
  return trimmed || 'Anonymous editor';
}

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get('projectId');
  if (projectId) {
    const lock = await getLock(projectId);
    return NextResponse.json({ lock, staleAfterSeconds: STALE_AFTER_SECONDS });
  }
  const items = await listLocks();
  return NextResponse.json({ items, staleAfterSeconds: STALE_AFTER_SECONDS });
}

export async function POST(req: NextRequest) {
  try {
    const holderId = readHolderId(req);
    if (!holderId) {
      return NextResponse.json(
        { error: 'X-MH-Client-Id header is required.' },
        { status: 400 },
      );
    }
    const body = await req.json();
    const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
    }
    const result = await acquireLock({
      projectId,
      holderId,
      holderName: clampName(body?.holderName),
    });
    return NextResponse.json({
      ok: result.ok,
      lock: result.lock,
      stolen: result.stolen,
      staleAfterSeconds: STALE_AFTER_SECONDS,
    }, { status: result.ok ? 200 : 409 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `acquire failed: ${message}` }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const holderId = readHolderId(req);
    if (!holderId) {
      return NextResponse.json({ error: 'X-MH-Client-Id header is required.' }, { status: 400 });
    }
    const body = await req.json();
    const projectId = typeof body?.projectId === 'string' ? body.projectId : '';
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
    }
    const result = await heartbeatLock(projectId, holderId);
    return NextResponse.json(
      {
        ok: result.ok,
        lock: result.lock,
        hijacked: result.hijacked,
        staleAfterSeconds: STALE_AFTER_SECONDS,
      },
      { status: result.ok ? 200 : 409 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `heartbeat failed: ${message}` }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const holderId = readHolderId(req);
    if (!holderId) {
      return NextResponse.json({ error: 'X-MH-Client-Id header is required.' }, { status: 400 });
    }
    let projectId = req.nextUrl.searchParams.get('projectId') || '';
    if (!projectId) {
      try {
        const body = (await req.json()) as { projectId?: unknown };
        if (typeof body.projectId === 'string') projectId = body.projectId;
      } catch { /* no body */ }
    }
    if (!projectId) {
      return NextResponse.json({ error: 'projectId is required.' }, { status: 400 });
    }
    const ok = await releaseLock(projectId, holderId);
    return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: `release failed: ${message}` }, { status: 500 });
  }
}
