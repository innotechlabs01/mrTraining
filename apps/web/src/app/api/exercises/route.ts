import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { goFetchServer } from '@/lib/api/go-client';

export const dynamic = 'force-dynamic'

interface GoExercise {
  id: string;
  slug: string;
  name: string;
  description?: string;
  mode: string;
  bodyPart?: string;
  muscleGroups?: string;
  equipment?: string;
  difficulty?: string;
  category?: string;
  instructions?: string;
  defaultSec?: number | null;
  videoUrl?: string;
  imageUrl?: string;
  isCustom: boolean;
  coachId?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface GoExercisesList {
  data: GoExercise[];
  total: number;
  page: number;
  limit: number;
}

// GET /api/exercises — the real exercise library: global rows plus this coach's customs.
export async function GET(req: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data, total, page, limit } = await goFetchServer<GoExercisesList>(
      '/api/v1/exercises',
      token,
    );
    return NextResponse.json({ exercises: data, total, page, limit }, { status: 200 });
  } catch (error) {
    console.error('Error listing exercise library:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/exercises — create a coach-scoped custom exercise.
export async function POST(req: Request) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const token = await getToken();
    if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => null);
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

    const created = await goFetchServer<GoExercise>('/api/v1/exercises', token, {
      method: 'POST',
      body: JSON.stringify({
        name,
        description: typeof body?.description === 'string' ? body.description : '',
        mode: ['reps', 'time', 'cardio'].includes(body?.mode) ? body.mode : 'reps',
        bodyPart: body?.bodyPart ?? undefined,
        muscleGroups: Array.isArray(body?.muscleGroups) ? body.muscleGroups : [],
        equipment: body?.equipment ?? undefined,
        difficulty: body?.difficulty ?? undefined,
        category: body?.category ?? undefined,
        instructions: Array.isArray(body?.instructions) ? body.instructions : [],
        videoUrl: typeof body?.videoUrl === 'string' ? body.videoUrl : undefined,
      }),
    });
    return NextResponse.json({ exercise: created }, { status: 201 });
  } catch (error) {
    console.error('Error creating custom exercise:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
