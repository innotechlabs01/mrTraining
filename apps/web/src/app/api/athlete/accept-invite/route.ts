import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  getCoachByCode,
  linkCoachAthlete,
  createAthleteProfile,
  getUserById,
  createUser,
  getAthleteProfileById,
} from '@/lib/coach-isolation-db';

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Coach code is required' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();
    const coach = await getCoachByCode(normalizedCode);
    if (!coach) {
      return NextResponse.json({ error: 'Invalid or inactive coach code' }, { status: 404 });
    }

    const coachData = coach as Record<string, unknown>;
    const coachId = coachData.id as string;

    // Get Clerk user info for email
    const existingUser = await getUserById(userId);
    const email = existingUser
      ? (existingUser as Record<string, unknown>).email as string
      : userId;

    // Create user record if not exists
    if (!existingUser) {
      await createUser({
        id: userId,
        email,
        name: email,
        role: 'athlete',
      });
    }

    // Create athlete profile if not exists
    const existingProfile = await getAthleteProfileById(userId);
    if (!existingProfile) {
      await createAthleteProfile({
        id: userId,
        email,
        name: email,
      });
    }

    // Link coach and athlete
    await linkCoachAthlete(coachId, userId);

    return NextResponse.json({
      success: true,
      coachName: coachData.name,
    });
  } catch (error) {
    console.error('Error accepting invite:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
