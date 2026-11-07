import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface GoPurchaseResult {
  id: string;
  total: number;
  quantity: number;
  productId: string;
}

// POST /api/athlete/store/purchase — purchase a product (Go resolves athlete↔coach link + stock).
export async function POST(req: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
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

    const purchase = await goFetchServer<GoPurchaseResult>('/api/v1/athlete/store/purchase', token, {
      method: 'POST',
      body: JSON.stringify({ productId, quantity }),
    });

    return NextResponse.json({ id: purchase.id, total: purchase.total, quantity: purchase.quantity, productId: purchase.productId });
  } catch (error) {
    console.error('Error creating athlete purchase:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
