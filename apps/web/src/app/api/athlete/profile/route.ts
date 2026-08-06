import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteProfileById, getAthleteCoaches } from '@/lib/coach-isolation-db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const profile = await getAthleteProfileById(userId);
    const coaches = await getAthleteCoaches(userId);

    return NextResponse.json({ profile, coaches });
  } catch (error) {
    console.error('Error fetching athlete profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
