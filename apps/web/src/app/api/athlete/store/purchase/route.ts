import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProducts, saveSale } from '@/lib/db';
import { getDB } from '@/lib/coach-isolation-db';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const productId = typeof body.productId === 'string' ? body.productId.trim() : '';
    const quantityRaw = body.quantity;
    const quantity = typeof quantityRaw === 'number' ? quantityRaw : Number(quantityRaw);

    if (!productId) {
      return NextResponse.json({ error: 'productId is required' }, { status: 400 });
    }
    if (!Number.isInteger(quantity) || quantity <= 0) {
      return NextResponse.json({ error: 'quantity must be a positive integer' }, { status: 400 });
    }

    // Resolve coach for this athlete
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
      console.error('Error resolving coach for purchase:', err);
    }

    // Allow coachId override for testing (e.g. no link in local DB)
    const overrideCoachId = typeof body.coachId === 'string' ? body.coachId.trim() : '';
    if (!coachId && overrideCoachId) {
      coachId = overrideCoachId;
    }

    if (!coachId) {
      return NextResponse.json({ error: 'No coach linked to athlete' }, { status: 400 });
    }

    // Validate stock via getProducts
    const products = await getProducts(coachId);
    const product = (products as Array<Record<string, unknown>>).find((p) => p.id === productId);

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const stock = (product.stock as number) ?? 0;
    if (stock < quantity) {
      return NextResponse.json({ error: 'Insufficient stock', stock }, { status: 400 });
    }

    const unitPrice = (product.price as number) ?? 0;
    const unitReceived = (product as Record<string, unknown>).received as number | undefined;
    const brand = (product.brand as string) || '';
    const productName = (product.name as string) || '';

    const total = unitPrice * quantity;
    const date = new Date().toISOString().split('T')[0];

    const saleId = await saveSale(coachId, {
      productId,
      productName,
      brand,
      quantity,
      unitPrice,
      unitReceived: unitReceived ?? unitPrice,
      total,
      date,
      athleteId: userId,
    });

    return NextResponse.json({ id: saleId, total, quantity, productId });
  } catch (error) {
    console.error('Error creating athlete purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
