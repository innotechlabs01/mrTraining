import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCoachAvailability, saveCoachAvailability } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const availability = await getCoachAvailability(userId);
    return NextResponse.json(availability);
  } catch (error) {
    console.error('Error fetching coach availability:', error);
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
    if (!Array.isArray(body)) {
      return NextResponse.json({ error: 'Expected an array of slots' }, { status: 400 });
    }
    const slots = body.map((s: { dayOfWeek?: number; startTime?: string; endTime?: string }) => ({
      dayOfWeek: Number(s?.dayOfWeek),
      startTime: String(s?.startTime ?? ''),
      endTime: String(s?.endTime ?? ''),
    }));
    if (slots.some((s) => !Number.isFinite(s.dayOfWeek) || !s.startTime || !s.endTime)) {
      return NextResponse.json({ error: 'Invalid slot' }, { status: 400 });
    }
    await saveCoachAvailability(userId, slots);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving coach availability:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
