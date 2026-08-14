import { NextRequest, NextResponse } from 'next/server';
import { normalizeProgress, ProgressResult } from '@/features/progress/services/normalization';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body: ProgressResult = await request.json();

    if (!body || !body.gym || !body.running) {
      return NextResponse.json(
        { error: 'Invalid input. Required: gym, running, tennis, swimming, cycling, crossfit metrics' },
        { status: 400 }
      );
    }

    const result = normalizeProgress(body);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Normalize API Error:', error);
    return NextResponse.json(
      { error: 'Failed to normalize progress data' },
      { status: 500 }
    );
  }
}
