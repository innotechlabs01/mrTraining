import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

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
  _params: { params: Promise<{ allyId: string }> },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { getToken } = await auth();
    const token = await getToken();
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Proxy to Go API: GET /api/v1/athlete/ally/products.
    // The Go handler resolves the ally server-side from the authenticated
    // athlete's coach link (replaces direct SQL via coach-isolation-db).
    const result = await goFetchServer<{ data: AllyProduct[] }>(
      `/api/v1/athlete/ally/products`,
      token,
    );

    return NextResponse.json(result.data);
  } catch (error) {
    console.error('Error fetching ally products:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
