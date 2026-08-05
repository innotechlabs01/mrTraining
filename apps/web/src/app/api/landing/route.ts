import { NextRequest, NextResponse } from 'next/server';
import { getLandingContent, updateLandingContent } from '@/lib/landing';

export async function GET() {
  const data = await getLandingContent();
  return NextResponse.json(data);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const data = await updateLandingContent(body);
  return NextResponse.json(data);
}