import { NextRequest, NextResponse } from 'next/server';
import { analyzeProgress, ProgressDataPoint } from '@/features/progress/services/analytics';

export async function POST(request: NextRequest) {
  try {
    const body: { data: ProgressDataPoint[] } = await request.json();

    if (!body.data || !Array.isArray(body.data) || body.data.length < 2) {
      return NextResponse.json(
        { error: 'Invalid input. Required: data array with at least 2 points' },
        { status: 400 }
      );
    }

    const result = analyzeProgress(body.data);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    console.error('Analytics API Error:', error);
    return NextResponse.json(
      { error: 'Failed to analyze progress data' },
      { status: 500 }
    );
  }
}
