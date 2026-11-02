import { NextResponse } from 'next/server';
import { getAllPublicPlans } from '@/lib/db';

export async function GET() {
  try {
    const plans = await getAllPublicPlans();
    return NextResponse.json(plans);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
