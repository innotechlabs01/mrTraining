import { NextResponse } from 'next/server';
import { getCoachByCode } from '@/lib/coach-isolation-db';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get('code');
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();
    const coach = await getCoachByCode(normalizedCode);

    if (!coach) {
      return NextResponse.json({ error: 'Invalid or inactive coach code' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      coach: {
        id: coach.id,
        name: coach.name,
        email: coach.email,
      },
    });
  } catch (error) {
    console.error('Error validating code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { code } = await req.json();
    if (!code) {
      return NextResponse.json({ error: 'Code is required' }, { status: 400 });
    }

    const normalizedCode = code.toUpperCase().trim();
    const coach = await getCoachByCode(normalizedCode);

    if (!coach) {
      return NextResponse.json({ error: 'Invalid or inactive coach code' }, { status: 404 });
    }

    return NextResponse.json({
      valid: true,
      coachId: coach.id,
      coachName: coach.name,
      coach: {
        id: coach.id,
        name: coach.name,
        email: coach.email,
      },
    });
  } catch (error) {
    console.error('Error validating code:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
