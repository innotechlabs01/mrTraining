import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDB } from '@/lib/coach-isolation-db';

export const dynamic = 'force-dynamic';

interface AllySummary {
  relationship_id: string;
  coach_id: string;
  ally_id: string;
  legal_name: string;
  commercial_name: string;
  category: string;
  status: string;
}

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDB();

    // Resolve the coach linked to this athlete
    const coachResult = await db.execute({
      sql: `SELECT coach_id FROM coach_athlete_links WHERE athlete_id = ? AND status = 'active' LIMIT 1`,
      args: [userId],
    });

    if (coachResult.rows.length === 0) {
      return NextResponse.json([]);
    }

    const coachId = (coachResult.rows[0] as Record<string, unknown>).coach_id as string;

    // List allies of this coach (active relationships only)
    const alliesResult = await db.execute({
      sql: `
        SELECT r.id as relationship_id, r.coach_id, a.id as ally_id,
               a.legal_name, a.commercial_name, a.category, r.status
        FROM coach_ally_relationships r
        JOIN allies a ON a.id = r.ally_id
        WHERE r.coach_id = ? AND r.status = 'active' AND a.status = 'active'
        ORDER BY a.commercial_name COLLATE NOCASE
      `,
      args: [coachId],
    });

    const allies: AllySummary[] = (alliesResult.rows as Record<string, unknown>[]).map(
      (row) => ({
        relationship_id: row.relationship_id as string,
        coach_id: row.coach_id as string,
        ally_id: row.ally_id as string,
        legal_name: row.legal_name as string,
        commercial_name: row.commercial_name as string,
        category: row.category as string,
        status: row.status as string,
      }),
    );

    return NextResponse.json(allies);
  } catch (error) {
    console.error('Error fetching athlete allies:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
