/**
 * PDF text extraction backfill — M·01.
 * -------------------------------------
 * POST /api/references/extract-text/backfill
 *
 * Finds all references that have a pdf_url but no pdf_full_text yet,
 * and triggers text extraction for each. Processes sequentially with
 * a small delay to avoid overwhelming the PDF storage backend.
 *
 * Returns a summary of how many references were processed, succeeded,
 * and failed. Intended for one-time admin use after deploying
 * migration 038.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const BATCH_SIZE = 20;

async function extractTextFromPdfBytes(pdfBytes: ArrayBuffer): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(pdfBytes),
    useSystemFonts: true,
  });
  const doc = await loadingTask.promise;

  const pages: string[] = [];
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .filter((item: any) => 'str' in item)
      .map((item: any) => item.str)
      .join(' ');
    if (pageText.trim()) pages.push(pageText.trim());
  }
  doc.destroy();
  return pages.join('\n\n');
}

export async function POST(_request: NextRequest) {
  let supabaseModule;
  try {
    supabaseModule = await import('@/lib/supabase-server');
  } catch {
    return NextResponse.json(
      { error: 'Supabase not configured' },
      { status: 503 },
    );
  }

  const admin = supabaseModule.createAdminClient();

  // Find references with PDFs but no extracted text
  const { data: refs, error: listErr } = await admin
    .from('references')
    .select('id, pdf_url, title')
    .not('pdf_url', 'is', null)
    .is('pdf_full_text', null)
    .limit(BATCH_SIZE);

  if (listErr) {
    return NextResponse.json({ error: listErr.message }, { status: 500 });
  }

  if (!refs || refs.length === 0) {
    return NextResponse.json({
      message: 'No references need text extraction',
      processed: 0,
      succeeded: 0,
      failed: 0,
    });
  }

  const results: Array<{ id: string; title: string; ok: boolean; error?: string; chars?: number }> = [];

  for (const ref of refs) {
    try {
      const resp = await fetch(ref.pdf_url, {
        headers: { 'User-Agent': 'ESABCC-ReferenceManager/1.0' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const pdfBytes = await resp.arrayBuffer();
      const text = await extractTextFromPdfBytes(pdfBytes);

      const { error: updateErr } = await admin
        .from('references')
        .update({ pdf_full_text: text })
        .eq('id', ref.id);

      if (updateErr) throw new Error(updateErr.message);

      results.push({ id: ref.id, title: ref.title, ok: true, chars: text.length });
    } catch (err) {
      results.push({
        id: ref.id,
        title: ref.title,
        ok: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return NextResponse.json({
    message: `Processed ${results.length} references`,
    processed: results.length,
    succeeded: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    remaining: refs.length === BATCH_SIZE ? '(more may remain)' : 0,
    results,
  });
}
