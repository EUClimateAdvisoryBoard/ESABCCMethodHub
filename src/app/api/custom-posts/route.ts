import { NextRequest, NextResponse } from 'next/server';
import {
  addCustomPost,
  deleteCustomPost,
  getCustomPosts,
  updateCustomPost,
  findCustomPost,
  isPersistent,
  CustomPostItem,
} from '@/lib/custom-posts-store';

/**
 * Custom (internal) posts API
 *
 * Durable backend for the "Share a New Item" form on the Secretariat News
 * Feed. Replaces the browser-only `localStorage['nf-custom-items']` storage
 * so posts survive cold starts, redeployments, and browser changes — and
 * are visible to the whole team, not just the author's device.
 *
 *   GET    /api/custom-posts           → list all custom posts
 *   POST   /api/custom-posts           → create a new custom post
 *   PATCH  /api/custom-posts           → patch a single field (e.g. aiSummary)
 *                                        body: { id, ...partial }
 */

const MAX_TITLE_LEN = 500;
const MAX_SUMMARY_LEN = 20000;
const MAX_URL_LEN = 2000;
const MAX_TAGS = 30;
const VALID_TYPES: CustomPostItem['type'][] = [
  'article', 'paper', 'press_release', 'report', 'internal_note',
];

function clampString(v: unknown, max: number): string {
  if (typeof v !== 'string') return '';
  return v.slice(0, max);
}

function clampTags(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  const out: string[] = [];
  for (const t of v) {
    if (typeof t !== 'string') continue;
    const trimmed = t.trim().slice(0, 50);
    if (trimmed) out.push(trimmed);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export async function GET() {
  const items = await getCustomPosts();
  return NextResponse.json({
    items,
    total: items.length,
    persistent: isPersistent(),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const title = clampString(body.title, MAX_TITLE_LEN).trim();
    const summary = clampString(body.summary, MAX_SUMMARY_LEN).trim();
    if (!title || !summary) {
      return NextResponse.json(
        { error: 'title and summary are required' },
        { status: 400 },
      );
    }

    const now = new Date().toISOString().split('T')[0];
    const type = VALID_TYPES.includes(body.type) ? body.type : 'internal_note';
    const providedId = typeof body.id === 'string' ? body.id : '';
    const id = providedId.startsWith('nf-custom-')
      ? providedId
      : `nf-custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const item: CustomPostItem = {
      id,
      title,
      summary,
      aiSummary: typeof body.aiSummary === 'string' ? body.aiSummary : undefined,
      source: 'internal',
      sourceLabel: clampString(body.sourceLabel, 200) || 'ESABCC Secretariat',
      url: clampString(body.url, MAX_URL_LEN),
      publishedDate: clampString(body.publishedDate, 32) || now,
      addedDate: clampString(body.addedDate, 32) || now,
      addedBy: clampString(body.addedBy, 200) || 'User',
      authorId: typeof body.authorId === 'string' ? body.authorId : undefined,
      type,
      tags: clampTags(body.tags),
      isExternal: false,
    };

    await addCustomPost(item);

    return NextResponse.json({
      status: 'created',
      item,
      persistent: isPersistent(),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to create custom post: ${message}` },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const id = typeof body.id === 'string' ? body.id : '';
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const existing = await findCustomPost(id);
    if (!existing) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const patch: Partial<CustomPostItem> = {};
    if (typeof body.aiSummary === 'string') patch.aiSummary = body.aiSummary;
    if (typeof body.title === 'string') patch.title = clampString(body.title, MAX_TITLE_LEN);
    if (typeof body.summary === 'string') patch.summary = clampString(body.summary, MAX_SUMMARY_LEN);
    if (typeof body.url === 'string') patch.url = clampString(body.url, MAX_URL_LEN);
    if (Array.isArray(body.tags)) patch.tags = clampTags(body.tags);
    if (VALID_TYPES.includes(body.type)) patch.type = body.type;

    const updated = await updateCustomPost(id, patch);
    return NextResponse.json({ status: 'updated', item: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to update custom post: ${message}` },
      { status: 500 },
    );
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

    const ok = await deleteCustomPost(id);
    if (!ok) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({ status: 'deleted', id });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { error: `Failed to delete custom post: ${message}` },
      { status: 500 },
    );
  }
}
