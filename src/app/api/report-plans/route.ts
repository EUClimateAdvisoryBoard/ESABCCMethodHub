import { NextRequest, NextResponse } from 'next/server';
import {
  ensureSeedLoaded,
  getPlans,
  hasGitHubToken,
  persistToGitHub,
} from '@/lib/report-plans/plan-store';
import type { ReportPlan, ReportSection } from '@/lib/report-plans/types';
import { DEFAULT_SECTIONS } from '@/lib/report-plans/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function uid(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function defaultSections(): ReportSection[] {
  return DEFAULT_SECTIONS.map(s => ({
    id: uid('sec'),
    title: s.title,
    description: s.description,
    referenceIds: [],
  }));
}

// GET – list all plans (metadata only, sections/refs omitted for speed)
export async function GET() {
  await ensureSeedLoaded();
  const store = getPlans();
  const summaries = store.map(p => ({
    id: p.id,
    name: p.name,
    description: p.description || '',
    sectionCount: p.sections?.length || 0,
    referenceCount: p.references?.length || 0,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
  }));
  return NextResponse.json({
    count: summaries.length,
    plans: summaries,
    persistence: hasGitHubToken() ? 'github' : 'memory-only',
  });
}

// POST – create a new plan
export async function POST(request: NextRequest) {
  await ensureSeedLoaded();
  const store = getPlans();

  let body: Partial<ReportPlan>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const name = (body.name || '').trim();
  if (!name) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const now = new Date().toISOString();
  const plan: ReportPlan = {
    id: body.id || uid('plan'),
    name,
    description: body.description || '',
    sections: body.sections && body.sections.length > 0 ? body.sections : defaultSections(),
    references: body.references || [],
    createdAt: now,
    updatedAt: now,
  };
  store.unshift(plan);

  let persisted = true;
  let persistError: string | undefined;
  if (hasGitHubToken()) {
    const result = await persistToGitHub(store);
    persisted = result.ok;
    persistError = result.error;
    if (!persisted) {
      const i = store.findIndex(p => p.id === plan.id);
      if (i >= 0) store.splice(i, 1);
    }
  }

  return NextResponse.json(
    { plan, persisted, persistError, persistence: hasGitHubToken() ? 'github' : 'memory-only' },
    { status: persisted ? 201 : 500 },
  );
}
