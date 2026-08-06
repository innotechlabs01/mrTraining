import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoachById, updateCoach } from '@/lib/coach-isolation-db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const coach = await getCoachById(userId);
    if (!coach) {
      return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
    }

    return NextResponse.json({ coach });
  } catch (error) {
    console.error('Error fetching coach profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    await updateCoach(userId, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating coach profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
