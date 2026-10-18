import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthletes, saveAthlete } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const athletes = await getAthletes(userId);
    return NextResponse.json(athletes);
  } catch (error) {
    console.error('Error fetching athletes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    const id = await saveAthlete(userId, body ?? {});
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error('Error creating athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
