/**
 * POST /api/project-workspace/indicators/import   (multipart/form-data)
 *   fields: file (the .xlsx), projectId
 *
 * Parses an uploaded indicator-database workbook and applies it:
 *   • metadata edits on the "Indicators" sheet  → pw_indicators
 *   • each indicator tab's Year/Value rows       → pw_indicator_points
 *       (the tab is the source of truth for that series: years dropped from
 *        the tab are deleted; ≥1 valid row required before we touch anything)
 *   • each tab's helper columns + formulas       → pw_indicator_sheets.layout
 *
 * New indicators are NOT created here — unknown IDs are reported as warnings.
 * Returns a per-indicator summary so the UI can show what changed.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { parseIndicatorsWorkbook } from '@/lib/project-workspace/indicator-excel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
// Workbooks with many tabs can be a few MB; allow generous body parsing time.
export const maxDuration = 60;

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function POST(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: 'expected multipart/form-data' }, { status: 400 });
  }
  const projectId = String(form.get('projectId') ?? '');
  const file = form.get('file');
  if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: 'file required' }, { status: 400 });
  }

  // Known indicator IDs scope the import: we only update what already exists.
  const { data: rows, error: readErr } = await sb
    .from('pw_indicators')
    .select('id')
    .eq('project_id', projectId);
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 400 });
  const knownIds = new Set((rows ?? []).map(r => r.id));
  if (knownIds.size === 0) {
    return NextResponse.json({ error: 'no indicators for this project' }, { status: 404 });
  }

  const buf = await file.arrayBuffer();
  let parsed;
  try {
    parsed = await parseIndicatorsWorkbook(buf, knownIds);
  } catch (e) {
    return NextResponse.json(
      { error: `Could not read workbook: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  const summary: {
    id: string;
    metadataUpdated: boolean;
    pointsWritten: number;
    pointsDeleted: number;
    warnings: string[];
  }[] = [];
  const errors: string[] = [];

  for (const ind of parsed.indicators) {
    const item = {
      id: ind.id,
      metadataUpdated: false,
      pointsWritten: 0,
      pointsDeleted: 0,
      warnings: [...ind.warnings],
    };

    // 1) Metadata.
    const patch = metadataPatch(ind.metadata);
    if (Object.keys(patch).length > 0) {
      const { error } = await sb.from('pw_indicators').update(patch).eq('id', ind.id);
      if (error) item.warnings.push(`metadata: ${error.message}`);
      else item.metadataUpdated = true;
    }

    // 2) Points — only when the tab gave us at least one usable row.
    if (ind.points && ind.points.length > 0) {
      const years = ind.points.map(p => p.year);
      const { error: upErr } = await sb.from('pw_indicator_points').upsert(
        ind.points.map(p => ({ indicator_id: ind.id, year: p.year, value: p.value })),
        { onConflict: 'indicator_id,year' }
      );
      if (upErr) {
        item.warnings.push(`points: ${upErr.message}`);
      } else {
        item.pointsWritten = ind.points.length;
        // Drop years no longer present in the tab.
        const { data: removed, error: delErr } = await sb
          .from('pw_indicator_points')
          .delete()
          .eq('indicator_id', ind.id)
          .not('year', 'in', `(${years.join(',')})`)
          .select('year');
        if (delErr) item.warnings.push(`prune: ${delErr.message}`);
        else item.pointsDeleted = removed?.length ?? 0;
      }
    }

    // 3) Helper-column layout (preserved across round-trips).
    if (ind.layout) {
      const { error: sheetErr } = await sb.from('pw_indicator_sheets').upsert(
        { indicator_id: ind.id, layout: ind.layout, updated_by: u.user.id },
        { onConflict: 'indicator_id' }
      );
      if (sheetErr) item.warnings.push(`layout: ${sheetErr.message}`);
    }

    summary.push(item);
  }

  return NextResponse.json({
    ok: true,
    indicatorsProcessed: summary.length,
    summary,
    warnings: parsed.warnings,
    errors,
  });
}

function metadataPatch(m: {
  name?: string;
  category?: string;
  unit?: string;
  direction?: 'up' | 'down';
  targetValue?: number | null;
  targetYear?: number | null;
  source?: string;
  sourceUrl?: string;
  description?: string;
}): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (m.name) patch.name = m.name;
  if (m.category) patch.category = m.category;
  if (m.unit) patch.unit = m.unit;
  if (m.direction) patch.direction = m.direction;
  if (m.targetValue !== undefined) patch.target_value = m.targetValue;
  if (m.targetYear !== undefined) patch.target_year = m.targetYear;
  if (m.source !== undefined) patch.source = m.source;
  if (m.sourceUrl !== undefined) patch.source_url = m.sourceUrl;
  if (m.description !== undefined) patch.description = m.description;
  return patch;
}
