import { NextResponse } from 'next/server';
import { calculateProgress, ProgressData } from '@/features/progress/services/progress-calculation';
import { withAuth } from '@/lib/auth-middleware';

export const dynamic = 'force-dynamic';

export const GET = withAuth(async (userId, request) => {
  const { searchParams } = new URL(request.url);
  const sport = searchParams.get('sport');
  const period = searchParams.get('period') || 'weekly';

  const data: ProgressData = { userId, sport: sport || undefined };
  const result = calculateProgress(data, period as 'weekly' | 'monthly' | 'yearly');

  return NextResponse.json({ success: true, data: result });
});
