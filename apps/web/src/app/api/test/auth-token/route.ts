import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId, getToken } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getToken?.();
    
    if (!token) {
      return NextResponse.json({ error: 'No token available' }, { status: 401 });
    }

    return NextResponse.json({ token, userId });
  } catch (error) {
    console.error('Error getting auth token:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}