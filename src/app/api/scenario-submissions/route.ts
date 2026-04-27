import { NextRequest, NextResponse } from 'next/server';
import {
  listSubmissions,
  updateSubmissionReview,
  ReviewStatus,
} from '@/lib/scenario-submissions-store';

const VALID_STATUSES: ReviewStatus[] = [
  'pending',
  'under_review',
  'accepted',
  'rejected',
  'needs_changes',
];

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const statusParam = url.searchParams.get('status') as ReviewStatus | null;
  const callSlug = url.searchParams.get('call') || undefined;
  const status =
    statusParam && VALID_STATUSES.includes(statusParam) ? statusParam : undefined;

  const items = await listSubmissions({ status, callSlug });
  return NextResponse.json({ submissions: items, count: items.length });
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, reviewStatus, reviewNotes } = body as {
      id?: string;
      reviewStatus?: ReviewStatus;
      reviewNotes?: string;
    };
    if (!id) {
      return NextResponse.json({ error: 'Missing submission id' }, { status: 400 });
    }
    if (reviewStatus && !VALID_STATUSES.includes(reviewStatus)) {
      return NextResponse.json(
        {
          error: `Invalid review status. Allowed: ${VALID_STATUSES.join(', ')}`,
        },
        { status: 400 },
      );
    }
    const ok = await updateSubmissionReview(id, { reviewStatus, reviewNotes });
    if (!ok) {
      return NextResponse.json({ error: 'Submission not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Scenario submissions PATCH error:', error);
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
}
