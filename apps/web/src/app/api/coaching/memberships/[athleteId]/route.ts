import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { athleteId } = await params;
    return NextResponse.json({ athleteId, status: '' });
  } catch (error) {
    console.error('Error fetching membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { athleteId } = await params;
    return NextResponse.json({ success: true, athleteId });
  } catch (error) {
    console.error('Error cancelling membership:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}