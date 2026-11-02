import { NextResponse } from 'next/server';
import { analyzeProgress, ProgressDataPoint } from '@/features/progress/services/analytics';
import { withAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export const POST = withAuth(async (_userId, request) => {
  const body: { data: ProgressDataPoint[] } = await request.json();

  if (!body.data || !Array.isArray(body.data) || body.data.length < 2) {
    return NextResponse.json(
      { error: 'Invalid input. Required: data array with at least 2 points' },
      { status: 400 }
    );
  }

  const result = analyzeProgress(body.data);

  return NextResponse.json({ success: true, data: result });
});
