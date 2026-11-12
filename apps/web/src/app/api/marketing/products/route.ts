import { NextResponse } from 'next/server';
import { goFetch } from '@/lib/api/go-client';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  try {
    const res = await goFetch<{ data?: unknown[] }>('/public/products', {
      auth: false,
    });
    const products: unknown[] = Array.isArray(res) ? res : (res?.data ?? []);
    const filtered = category
      ? products.filter((p) => (p as { category?: string })?.category === category)
      : products;
    return NextResponse.json(filtered);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
