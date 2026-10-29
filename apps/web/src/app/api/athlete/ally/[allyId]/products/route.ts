import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getDB } from '@/lib/coach-isolation-db';

export const dynamic = 'force-dynamic';

interface AllyProduct {
  id: string;
  ally_id: string;
  name: string;
  description: string;
  image_url?: string;
  price_cents: number;
  currency: string;
  stock: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ allyId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { allyId } = await params;

    const db = getDB();

    // Verify the athlete has access to this ally via their coach relationship
    const coachResult = await db.execute({
      sql: `SELECT coach_id FROM coach_athlete_links WHERE athlete_id = ? AND status = 'active' LIMIT 1`,
      args: [userId],
    });

    if (coachResult.rows.length === 0) {
      return NextResponse.json({ error: 'No active coach link' }, { status: 403 });
    }

    const coachId = (coachResult.rows[0] as Record<string, unknown>).coach_id as string;

    // Verify the ally belongs to this coach via an active relationship
    const relResult = await db.execute({
      sql: `
        SELECT r.id FROM coach_ally_relationships r
        WHERE r.coach_id = ? AND r.ally_id = ? AND r.status = 'active'
        LIMIT 1
      `,
      args: [coachId, allyId],
    });

    if (relResult.rows.length === 0) {
      return NextResponse.json({ error: 'Ally not found or not accessible' }, { status: 404 });
    }

    // List active products of this ally
    const productsResult = await db.execute({
      sql: `
        SELECT id, ally_id, name, description, image_url, price_cents, currency,
               stock, active, created_at, updated_at
        FROM ally_products
        WHERE ally_id = ? AND active = 1
        ORDER BY name COLLATE NOCASE
      `,
      args: [allyId],
    });

    const products: AllyProduct[] = (productsResult.rows as Record<string, unknown>[]).map(
      (row) => ({
        id: row.id as string,
        ally_id: row.ally_id as string,
        name: row.name as string,
        description: row.description as string,
        image_url: (row.image_url as string) || undefined,
        price_cents: (row.price_cents as number) || 0,
        currency: row.currency as string,
        stock: (row.stock as number) || 0,
        active: (row.active as number) === 1,
        created_at: row.created_at as string,
        updated_at: row.updated_at as string,
      }),
    );

    return NextResponse.json(products);
  } catch (error) {
    console.error('Error fetching ally products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
