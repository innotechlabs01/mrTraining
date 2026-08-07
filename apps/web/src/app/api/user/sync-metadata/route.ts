import { NextResponse } from 'next/server';
import { getDB } from '@/lib/coach-isolation-db';

const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';

export async function POST(req: Request) {
  if (!clerkSecretKey) {
    return NextResponse.json({ error: 'Clerk not configured' }, { status: 500 });
  }

  const { userId } = await req.json();
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 });
  }

  const db = getDB();

  const coachResult = await db.execute({
    sql: 'SELECT coach_code FROM coaches WHERE id = ?',
    args: [userId],
  });

  const coachCode = coachResult.rows[0]?.coach_code as string | undefined;

  const metadata: Record<string, string> = { role: 'coach' };
  if (coachCode) metadata.coachCode = coachCode;

  const res = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${clerkSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ public_metadata: metadata }),
  });

  if (!res.ok) {
    const err = await res.text();
    return NextResponse.json({ error: err }, { status: 500 });
  }

  return NextResponse.json({ ok: true, metadata });
}
