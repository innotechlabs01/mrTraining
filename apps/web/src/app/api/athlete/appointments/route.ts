import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, getAthleteAppointments, createAthleteAppointment } from '@/lib/db';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    const appointments = await getAthleteAppointments(athlete.id);
    return NextResponse.json({ appointments });
  } catch (error) {
    console.error('Error fetching athlete appointments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) {
      return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });
    }

    const body = await request.json();
    const { date, startTime, endTime, notes } = body;

    if (!date || !startTime || !endTime) {
      return NextResponse.json({ error: 'date, startTime, and endTime are required' }, { status: 400 });
    }

    const appointmentId = await createAthleteAppointment({
      coachId: athlete.coachId,
      athleteId: athlete.id,
      athleteName: athlete.name,
      date,
      startTime,
      endTime,
      notes,
    });

    return NextResponse.json({ id: appointmentId, status: 'scheduled' });
  } catch (error) {
    console.error('Error creating athlete appointment:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
