/**
 * PDF text extraction endpoint — M·01.
 * -------------------------------------
 * POST /api/references/extract-text
 *   Body: { referenceId: string }
 *   OR multipart/form-data with a `file` field (standalone extraction)
 *
 * Extracts plain text from a PDF using pdfjs-dist (already a project
 * dependency) and returns it. When called with a referenceId, also
 * persists the extracted text to the `pdf_full_text` column on the
 * `references` table (if Supabase is configured) so subsequent
 * searches can match against it.
 *
 * Called automatically after PDF upload by the client, and available
 * as a manual backfill via the admin retention route.
 */
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

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

export async function POST(request: NextRequest) {
  const contentType = request.headers.get('content-type') || '';

  // ── Path A: JSON body with referenceId → fetch PDF from storage, extract, persist ──
  if (contentType.includes('application/json')) {
    const body = await request.json();
    const { referenceId } = body;
    if (!referenceId) {
      return NextResponse.json({ error: 'referenceId is required' }, { status: 400 });
    }

    let supabaseModule;
    try {
      supabaseModule = await import('@/lib/supabase-server');
    } catch {
      return NextResponse.json(
        { error: 'Supabase not configured — cannot fetch PDF by reference' },
        { status: 503 },
      );
    }

    const admin = supabaseModule.createAdminClient();

    // Look up the reference to get its pdf_url
    const { data: ref, error: refErr } = await admin
      .from('references')
      .select('id, pdf_url, title')
      .eq('id', referenceId)
      .maybeSingle();

    if (refErr || !ref) {
      return NextResponse.json({ error: 'Reference not found' }, { status: 404 });
    }
    if (!ref.pdf_url) {
      return NextResponse.json({ error: 'No PDF attached to this reference' }, { status: 404 });
    }

    // Fetch the PDF bytes
    let pdfBytes: ArrayBuffer;
    try {
      const resp = await fetch(ref.pdf_url, {
        headers: { 'User-Agent': 'ESABCC-ReferenceManager/1.0' },
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      pdfBytes = await resp.arrayBuffer();
    } catch (err) {
      return NextResponse.json(
        { error: 'Failed to fetch PDF', detail: String(err) },
        { status: 502 },
      );
    }

    let text: string;
    try {
      text = await extractTextFromPdfBytes(pdfBytes);
    } catch (err) {
      return NextResponse.json(
        { error: 'PDF text extraction failed', detail: String(err) },
        { status: 422 },
      );
    }

    // Persist to the references table
    const { error: updateErr } = await admin
      .from('references')
      .update({ pdf_full_text: text })
      .eq('id', referenceId);

    if (updateErr) {
      // Non-fatal — the column may not exist yet (pre-migration).
      // Still return the text so the caller can use it.
      console.warn('Could not persist pdf_full_text:', updateErr.message);
    }

    return NextResponse.json({
      referenceId,
      characters: text.length,
      preview: text.slice(0, 500),
    });
  }

  // ── Path B: multipart file upload → extract and return (no persist) ──
  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: 'file field is required' }, { status: 400 });
    }

    const pdfBytes = await file.arrayBuffer();
    let text: string;
    try {
      text = await extractTextFromPdfBytes(pdfBytes);
    } catch (err) {
      return NextResponse.json(
        { error: 'PDF text extraction failed', detail: String(err) },
        { status: 422 },
      );
    }

    return NextResponse.json({
      characters: text.length,
      text,
      preview: text.slice(0, 500),
    });
  }

  return NextResponse.json(
    { error: 'Unsupported content type. Use application/json or multipart/form-data.' },
    { status: 415 },
  );
}
