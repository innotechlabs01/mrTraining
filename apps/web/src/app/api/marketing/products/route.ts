import { NextResponse } from 'next/server';
import { getAllPublicProducts } from '@/lib/db';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category');

  try {
    const products = await getAllPublicProducts();
    const filtered = category ? products.filter((p) => p.category === category) : products;
    return NextResponse.json(filtered);
  } catch (e) {
    return NextResponse.json([], { status: 200 });
  }
}
