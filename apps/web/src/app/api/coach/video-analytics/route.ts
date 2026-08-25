import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getVideoAnalytics } from '@/lib/coaching-db';

export const dynamic = 'force-dynamic';

// GET /api/coach/video-analytics — aggregate view stats for all exercises with videos.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const analytics = await getVideoAnalytics(userId);
    return NextResponse.json({ analytics }, { status: 200 });
  } catch (error) {
    console.error('Error fetching video analytics:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
