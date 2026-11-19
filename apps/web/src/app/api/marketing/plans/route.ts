import { NextResponse } from 'next/server';
import { goFetch } from '@/lib/api/go-client';

export async function GET() {
  try {
    const res = await goFetch<{ data?: unknown[] }>('/public/plans', {
      auth: false,
    });
    const plans: unknown[] = Array.isArray(res) ? res : (res?.data ?? []);
    return NextResponse.json(plans);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
