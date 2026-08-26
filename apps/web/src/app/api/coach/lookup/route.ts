import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth-middleware';

export const POST = withAuth(async (_userId, request) => {
  const { code } = await request.json();

  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 });
  }

  const users = await fetch(
    `${process.env.CLERK_API_URL || 'https://api.clerk.com/v1'}/users?email_address=${encodeURIComponent(code)}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.CLERK_SECRET_KEY}`,
      },
    }
  );

  if (!users.ok) {
    return NextResponse.json({ error: 'Failed to lookup coach' }, { status: 500 });
  }

  const usersData = await users.json();
  const coach = usersData.find(
    (u: { public_metadata: Record<string, unknown>; private_metadata: Record<string, unknown> }) =>
      u.public_metadata?.role === 'coach' || u.private_metadata?.role === 'coach'
  );

  if (!coach) {
    return NextResponse.json({ error: 'Coach not found' }, { status: 404 });
  }

  return NextResponse.json({ coachId: coach.id });
});