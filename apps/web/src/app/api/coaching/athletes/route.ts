import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    // TODO: Implement athletes fetch from DB
    return NextResponse.json([]);
  } catch (error) {
    console.error('Error fetching athletes:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    // TODO: Implement athlete creation in DB
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Error creating athlete:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}