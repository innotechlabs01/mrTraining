import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getAthleteByClerkId, listHealthDevices, upsertHealthDevice } from '@/lib/coaching-db';

// GET /api/athlete/health/devices — the athlete's connected wearables.
export async function GET() {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const devices = await listHealthDevices(athlete.id);
    return NextResponse.json({ devices }, { status: 200 });
  } catch (error) {
    console.error('Error listing health devices:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

const VALID_PLATFORMS = ['healthkit', 'healthconnect', 'garmin'] as const;

// POST /api/athlete/health/devices — register a device after native permissions are granted.
export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const athlete = await getAthleteByClerkId(userId);
    if (!athlete) return NextResponse.json({ error: 'Athlete profile not found' }, { status: 404 });

    const body = await req.json().catch(() => null);
    const platform = body?.platform;
    if (!platform || !VALID_PLATFORMS.includes(platform)) {
      return NextResponse.json(
        { error: `platform must be one of: ${VALID_PLATFORMS.join(', ')}` },
        { status: 400 },
      );
    }

    const device = await upsertHealthDevice(athlete.id, {
      platform,
      deviceName: typeof body?.deviceName === 'string' ? body.deviceName : '',
      deviceBrand: typeof body?.deviceBrand === 'string' ? body.deviceBrand : '',
    });
    return NextResponse.json({ device }, { status: 201 });
  } catch (error) {
    console.error('Error registering health device:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
