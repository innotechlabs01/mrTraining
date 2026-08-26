import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getCommunityForums, getCommunityChallenges } from '@/lib/coaching-db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const [forums, challenges] = await Promise.all([
      getCommunityForums(),
      getCommunityChallenges(),
    ]);

    return NextResponse.json({ forums, challenges });
  } catch (error) {
    console.error('Error fetching community data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
