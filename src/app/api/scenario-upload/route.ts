import { NextRequest, NextResponse } from 'next/server';
import {
  addSubmission,
  uploadSubmissionFile,
  ScenarioSubmission,
} from '@/lib/scenario-submissions-store';
import { hasServiceRole } from '@/lib/supabase-server';

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let key = 'esabcc_';
  for (let i = 0; i < 32; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

function generateSubmissionId(): string {
  return `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

const ALLOWED_EXTENSIONS = ['.csv', '.json', '.xlsx', '.xls'];
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const callSlug = (formData.get('callSlug') || formData.get('callId') || '').toString();
    const submitterEmail = (formData.get('email') || '').toString();
    const submitterName = (formData.get('name') || '').toString();
    const institution = (formData.get('institution') || '').toString();
    const modelName = (formData.get('model') || '').toString();
    const scenarioName = (formData.get('scenario') || '').toString();
    const description = (formData.get('description') || '').toString();

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided. Please upload a CSV, JSON, or Excel file.' },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: `File exceeds maximum size of 50MB. Your file: ${(file.size / (1024 * 1024)).toFixed(1)}MB`,
        },
        { status: 400 },
      );
    }

    const fileName = file.name.toLowerCase();
    const hasValidExtension = ALLOWED_EXTENSIONS.some((ext) => fileName.endsWith(ext));
    if (!hasValidExtension) {
      return NextResponse.json(
        { error: `Invalid file format. Accepted formats: ${ALLOWED_EXTENSIONS.join(', ')}` },
        { status: 400 },
      );
    }

    // Validate CSV column structure, JSON parseability.
    let headers: string[] = [];
    let rowCount: number | null = null;
    let missingColumns: string[] = [];
    let yearColumns: string[] = [];
    let validationOk = true;
    let validationNotes = '';

    if (fileName.endsWith('.csv')) {
      const text = await file.text();
      const lines = text.trim().split('\n');
      if (lines.length > 0) {
        headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        rowCount = lines.length - 1;
        const requiredColumns = ['model', 'scenario', 'variable', 'region', 'unit'];
        missingColumns = requiredColumns.filter((col) => !headers.includes(col));
        yearColumns = headers.filter((h) => /^\d{4}$/.test(h));

        if (missingColumns.length > 0 || yearColumns.length === 0) {
          validationOk = false;
          const parts: string[] = [];
          if (missingColumns.length > 0) {
            parts.push(`missing columns: ${missingColumns.join(', ')}`);
          }
          if (yearColumns.length === 0) {
            parts.push('no year columns found (e.g. 2020, 2025, ...)');
          }
          validationNotes = parts.join('; ');
          return NextResponse.json(
            {
              error: 'CSV validation failed',
              details: {
                missingColumns: missingColumns.length > 0 ? missingColumns : undefined,
                noYearColumns:
                  yearColumns.length === 0
                    ? 'No year columns found (e.g. 2020, 2025, ...)'
                    : undefined,
              },
            },
            { status: 422 },
          );
        }
      }
    }

    if (fileName.endsWith('.json')) {
      const text = await file.text();
      try {
        JSON.parse(text);
      } catch {
        return NextResponse.json(
          { error: 'Invalid JSON file. Please ensure the file contains valid JSON.' },
          { status: 422 },
        );
      }
    }

    const submissionId = generateSubmissionId();
    const apiKey = generateApiKey();

    // Store the raw file in Supabase Storage (best effort — falls through if
    // env vars missing and still records the metadata).
    const { storagePath, publicUrl, error: storageError } = await uploadSubmissionFile(
      submissionId,
      file,
    );
    if (storageError) {
      console.error('Scenario upload: storage write failed:', storageError);
    }

    const submission: ScenarioSubmission = {
      id: submissionId,
      callSlug,
      submitterName,
      submitterEmail,
      institution,
      modelName,
      scenarioName,
      description,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type || fileName.split('.').pop() || '',
      storagePath,
      publicUrl,
      rowCount,
      headers,
      missingColumns,
      yearColumns,
      validationOk,
      validationNotes,
      reviewStatus: 'pending',
      reviewNotes: '',
      apiKey,
      createdAt: new Date().toISOString(),
      reviewedAt: null,
    };

    await addSubmission(submission);

    return NextResponse.json({
      success: true,
      submission: {
        id: submission.id,
        apiKey: submission.apiKey,
        fileName: submission.fileName,
        fileSize: submission.fileSize,
        callSlug: submission.callSlug || 'unlinked',
        submitterEmail: submission.submitterEmail || 'anonymous',
        modelName: submission.modelName || 'unknown',
        scenarioName: submission.scenarioName || 'unknown',
        timestamp: submission.createdAt,
        validation: {
          ok: submission.validationOk,
          rowCount: submission.rowCount,
          headers: submission.headers,
          yearColumns: submission.yearColumns,
        },
        storedInDatabase: hasServiceRole() || !!storagePath,
        storagePath,
        publicUrl,
        status: 'received',
        message:
          'Submission received. The Secretariat will screen it and contact you at the email provided.',
      },
    });
  } catch (error) {
    console.error('Scenario upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error processing upload.' },
      { status: 500 },
    );
  }
}

export async function GET() {
  return NextResponse.json({
    service: 'ESABCC Scenario Data Upload',
    version: '2.0',
    acceptedFormats: ALLOWED_EXTENSIONS,
    maxFileSize: '50MB',
    requiredColumns: ['Model', 'Scenario', 'Variable', 'Region', 'Unit', '<year columns>'],
    shareableUploadUrl: '/scenarios/upload',
    documentation: '/scenarios/upload',
  });
}
