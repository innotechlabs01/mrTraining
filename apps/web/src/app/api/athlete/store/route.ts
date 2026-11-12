import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface GoStoreProduct {
  id: string;
  coachId: string;
  name: string;
  brand?: string;
  price: number;
  stock: number;
  category?: string;
  description?: string;
  imageUrl?: string;
  createdAt: string;
  updatedAt: string;
}

// GET /api/athlete/store — athlete's linked-coach catalog (Go resolves the link).
export async function GET(req: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const products = await goFetchServer<GoStoreProduct[]>('/api/v1/athlete/store', token);
    return NextResponse.json(products, { status: 200 });
  } catch (error) {
    console.error('Error fetching athlete store:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
