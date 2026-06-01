/**
 * GET /api/project-workspace/indicators/export?projectId=…
 *
 * Streams the whole indicator database as a single .xlsx workbook: an
 * editable "Indicators" metadata sheet plus one data tab per indicator
 * (Year + Value + any stored helper columns). Edit it offline and POST it
 * back to /import to update the database.
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { listIndicators, listIndicatorSheets } from '@/lib/project-workspace/db';
import { buildIndicatorsWorkbook } from '@/lib/project-workspace/indicator-excel';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function token(req: NextRequest): string | null {
  const h = req.headers.get('authorization');
  return h?.startsWith('Bearer ') ? h.slice(7) : null;
}

export async function GET(req: NextRequest) {
  const t = token(req);
  if (!t) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });
  const sb = createServerClient(t);
  const { data: u } = await sb.auth.getUser();
  if (!u?.user) return NextResponse.json({ error: 'unauthorised' }, { status: 401 });

  const projectId = new URL(req.url).searchParams.get('projectId');
  if (!projectId) {
    return NextResponse.json({ error: 'projectId required' }, { status: 400 });
  }

  const [indicators, layouts] = await Promise.all([
    listIndicators(projectId),
    listIndicatorSheets(projectId),
  ]);
  if (indicators.length === 0) {
    return NextResponse.json({ error: 'no indicators for this project' }, { status: 404 });
  }

  const buffer = await buildIndicatorsWorkbook({
    projectName: projectId,
    indicators,
    layouts,
  });

  const date = new Date().toISOString().slice(0, 10);
  const filename = `indicator-database-${projectId}-${date}.xlsx`;
  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      'content-type':
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'content-disposition': `attachment; filename="${filename}"`,
      'cache-control': 'no-store',
    },
  });
}
