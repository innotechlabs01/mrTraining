import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({
      brandName: 'MR Training',
      tagline: 'Your coaching platform',
      welcomeMessage: 'Welcome to MR Training',
      footerText: '© 2024 MR Training',
    });
  } catch (error) {
    console.error('Error fetching public page config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const body = await req.json();
    return NextResponse.json({ success: true, data: body });
  } catch (error) {
    console.error('Error updating public page config:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}