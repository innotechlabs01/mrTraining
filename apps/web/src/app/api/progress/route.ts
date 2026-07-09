import { NextResponse } from 'next/server';
import { calculateProgress, ProgressData } from '@/features/progress/services/progress-calculation';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const sport = searchParams.get('sport');
    const period = searchParams.get('period') || 'weekly';

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const data: ProgressData = { userId, sport: sport || undefined };
    const result = calculateProgress(data, period as 'weekly' | 'monthly' | 'yearly');

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Progress API Error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate progress' },
      { status: 500 }
    );
  }
}
