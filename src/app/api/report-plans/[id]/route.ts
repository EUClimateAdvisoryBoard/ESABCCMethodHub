import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSeedLoaded,
  getPlans,
  hasGitHubToken,
  persistToGitHub,
} from '@/lib/report-plans/plan-store';
import type { ReportPlan } from '@/lib/report-plans/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Ctx {
  params: { id: string };
}

// GET /api/report-plans/:id
export async function GET(_req: NextRequest, { params }: Ctx) {
  await ensureSeedLoaded();
  const store = getPlans();
  const plan = store.find(p => p.id === params.id);
  if (!plan) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  return NextResponse.json({ plan });
}

// PUT /api/report-plans/:id — replace entire plan body
export async function PUT(request: NextRequest, { params }: Ctx) {
  await ensureSeedLoaded();
  const store = getPlans();

  let body: Partial<ReportPlan>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const idx = store.findIndex(p => p.id === params.id);
  if (idx < 0) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  const previous = store[idx];
  const now = new Date().toISOString();
  const updated: ReportPlan = {
    id: previous.id,
    name: body.name ?? previous.name,
    description: body.description ?? previous.description ?? '',
    sections: body.sections ?? previous.sections,
    references: body.references ?? previous.references,
    createdAt: previous.createdAt,
    updatedAt: now,
  };
  store[idx] = updated;

  let persisted = true;
  let persistError: string | undefined;
  if (hasGitHubToken()) {
    const result = await persistToGitHub(store);
    persisted = result.ok;
    persistError = result.error;
    if (!persisted) store[idx] = previous;
  }

  return NextResponse.json(
    { plan: updated, persisted, persistError },
    { status: persisted ? 200 : 500 },
  );
}

// DELETE /api/report-plans/:id
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  await ensureSeedLoaded();
  const store = getPlans();
  const idx = store.findIndex(p => p.id === params.id);
  if (idx < 0) {
    return NextResponse.json({ error: 'Plan not found' }, { status: 404 });
  }
  const removed = store.splice(idx, 1)[0];

  let persisted = true;
  let persistError: string | undefined;
  if (hasGitHubToken()) {
    const result = await persistToGitHub(store);
    persisted = result.ok;
    persistError = result.error;
    if (!persisted) store.splice(idx, 0, removed);
  }

  return NextResponse.json(
    { id: params.id, persisted, persistError },
    { status: persisted ? 200 : 500 },
  );
}
