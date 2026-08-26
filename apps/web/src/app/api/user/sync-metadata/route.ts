import { NextResponse } from 'next/server';
import { getDB, generateUniqueCoachCode } from '@/lib/coach-isolation-db';
import { withAuth } from '@/lib/auth-middleware';

const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';

export const POST = withAuth(async (userId) => {
  if (!clerkSecretKey) {
    return NextResponse.json({ error: 'Clerk not configured' }, { status: 500 });
  }

  const db = getDB();

  const coachResult = await db.execute({
    sql: 'SELECT coach_code FROM coaches WHERE id = ?',
    args: [userId],
  });

  let coachCode = coachResult.rows[0]?.coach_code as string | undefined;

  if (!coachCode) {
    coachCode = await generateUniqueCoachCode();
    await db.execute({
      sql: 'UPDATE coaches SET coach_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
      args: [coachCode, userId],
    });
  }

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
});
