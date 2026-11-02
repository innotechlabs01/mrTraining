import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      athleteCount: 0,
      sessionCount: 0,
      completedSessions: 0,
      completedSessionNames: [],
      messageCount: 0,
      notesCount: 0,
      highlights: [],
      aiRecommendation: '',
      tomorrowPreview: { athleteCount: 0, sessionCount: 0, suggestedFocus: '' },
    });
  } catch (error) {
    console.error('Error fetching daily summary:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}