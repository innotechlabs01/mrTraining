import { NextResponse } from 'next/server';
import { normalizeProgress, ProgressResult } from '@/features/progress/services/normalization';
import { withAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (_userId, request) => {
  const body: ProgressResult = await request.json();

  if (!body || !body.gym || !body.running) {
    return NextResponse.json(
      { error: 'Invalid input. Required: gym, running, tennis, swimming, cycling, crossfit metrics' },
      { status: 400 }
    );
  }

  const result = normalizeProgress(body);

  return NextResponse.json({ success: true, data: result });
});
