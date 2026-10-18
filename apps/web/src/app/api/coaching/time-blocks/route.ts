import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getTimeBlocks, saveTimeBlocks } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const blocks = await getTimeBlocks(userId);
    return NextResponse.json(blocks);
  } catch (error) {
    console.error('Error fetching time blocks:', error);
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
    const blocks = Array.isArray(body) ? body : (body?.blocks ?? []);
    if (!Array.isArray(blocks)) {
      return NextResponse.json({ error: 'blocks array is required' }, { status: 400 });
    }
    await saveTimeBlocks(userId, blocks);
    return NextResponse.json({ success: true, data: blocks });
  } catch (error) {
    console.error('Error saving time blocks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
