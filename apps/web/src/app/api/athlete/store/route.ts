import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getPublicProducts } from '@/lib/db';
import { getDB } from '@/lib/coach-isolation-db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(req.url);
    const overrideCoachId = url.searchParams.get('coachId');

    let coachId: string | null = null;

    try {
      const db = getDB();
      const result = await db.execute({
        sql: `SELECT coach_id FROM coach_athlete_links WHERE athlete_id = ? AND status = 'active' LIMIT 1`,
        args: [userId],
      });
      if (result.rows.length > 0) {
        coachId = (result.rows[0] as Record<string, unknown>).coach_id as string;
      }
    } catch (err) {
      console.error('Error resolving coach for athlete store:', err);
    }

    if (!coachId && overrideCoachId) {
      coachId = overrideCoachId;
    }

    if (!coachId) {
      return NextResponse.json([]);
    }

    const products = await getPublicProducts(coachId);
    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching athlete store:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
