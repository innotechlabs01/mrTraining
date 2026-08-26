import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { joinChallenge } from '@/lib/coaching-db';

export const dynamic = 'force-dynamic';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const result = await joinChallenge(id, userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error joining challenge:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
