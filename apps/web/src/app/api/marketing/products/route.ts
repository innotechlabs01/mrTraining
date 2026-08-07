import { NextResponse } from 'next/server';
import { getPublicProducts } from '@/lib/coaching-db';
import type { Product } from '@/features/coach/types';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const coachSlug = searchParams.get('coach') || 'default';
  const category = searchParams.get('category');

  try {
    const products = await getPublicProducts(coachSlug) as Product[];
    const filtered = category ? products.filter((p: Product) => p.category === category) : products;
    return NextResponse.json(filtered);
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}
