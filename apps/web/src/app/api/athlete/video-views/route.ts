import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, startVideoView, updateVideoView } from '@/lib/coaching-db';

// POST /api/athlete/video-views — start or update a video view session.
// Body: { exerciseId, action: 'start'|'progress'|'complete', viewId?, positionSec?, totalDurationSec? }
export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const exerciseId = body?.exerciseId;
    const action = body?.action;

    if (!exerciseId || !['start', 'progress', 'complete'].includes(action)) {
      return NextResponse.json({ error: 'exerciseId and action (start|progress|complete) are required' }, { status: 400 });
    }

    if (action === 'start') {
      const viewId = await startVideoView(exerciseId, athlete.id);
      return NextResponse.json({ viewId }, { status: 201 });
    }

    // progress or complete — requires viewId
    const viewId = body?.viewId;
    if (!viewId) return NextResponse.json({ error: 'viewId is required for progress/complete' }, { status: 400 });

    const positionSec = Number(body?.positionSec ?? 0);
    const totalDurationSec = Number(body?.totalDurationSec ?? 0);
    const isComplete = action === 'complete' || (totalDurationSec > 0 && positionSec / totalDurationSec >= 0.9);

    await updateVideoView(viewId, positionSec, totalDurationSec, isComplete);
    return NextResponse.json({ ok: true, completed: isComplete }, { status: 200 });
  } catch (error) {
    console.error('Error tracking video view:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
