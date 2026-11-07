import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

interface LandingData {
  version: number;
  navLinks: string[];
  brand: Record<string, unknown>;
  stats: Array<{ value: string; label: string }>;
  reasons: Array<{ n?: string; title: string; copy: string }>;
  trainers: Array<{ name: string; seed?: string; photo?: string }>;
  testimonials: Array<{ quote: string; name: string; seed?: string; photo?: string }>;
  tienda: { title: string; copy: string };
  blog: { title: string; subtitle: string };
  plans: { title: string; subtitle: string };
  asesoria: { title: string; subtitle: string };
  updatedAt: string;
}

export async function GET() {
  try {
    // Public landing content — proxied to Go /public/landing (no auth needed).
    const data = await fetch(`${process.env.NEXT_PUBLIC_GO_API_URL || ''}/public/landing`, {
      cache: 'no-store',
    });
    if (!data.ok) {
      return NextResponse.json({ error: 'Failed to fetch landing content' }, { status: 502 });
    }
    const json = (await data.json()) as LandingData;
    return NextResponse.json(json);
  } catch (error) {
    console.error('Error fetching landing content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
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

    const body = await req.json();
    const data = await goFetchServer<LandingData>(`/api/v1/landing`, token, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error saving landing content:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
