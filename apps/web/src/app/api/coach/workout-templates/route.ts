import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const GO = process.env.NEXT_PUBLIC_GO_API_URL || '';

// Shape returned by Go API: GET /api/v1/workout-templates (list) and
// GET/PUT/POST /api/v1/workout-templates/:id (single). All camelCase.
interface GoTemplateExercise {
  id: string;
  templateId: string;
  name: string;
  sets: number;
  reps: number;
  weightKg: number;
  restSeconds: number;
  sortOrder: number;
  notes: string;
  mode: string;
  phase: string;
  supersetGroup: string;
  bodyPart: string;
  muscleGroups: string;
  libraryExerciseId: string;
}

interface GoWorkoutTemplate {
  id: string;
  coachId: string;
  name: string;
  description: string;
  goal: string;
  estimatedDurationMinutes: number | null;
  createdAt: string;
  updatedAt: string;
  exercises: GoTemplateExercise[];
}

interface GoTemplatesList {
  data: GoWorkoutTemplate[];
  total: number;
  page: number;
  limit: number;
}

/**
 * Server-side fetch to the Go API, forwarding the Clerk bearer token.
 * Multi-tenant isolation is enforced by Go (Authenticate + TenantContext middleware
 * set `app.current_organization_id` for RLS from the JWT + X-Organization-ID).
 */
async function goFetch<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${GO}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init.headers as Record<string, string>),
    },
    cache: 'no-store',
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { error?: string }).error || `Go API error: ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// GET /api/coach/workout-templates — list the coach's templates.
// ?id= returns a single template (get).
export async function GET(req: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  if (id) {
    const template = await goFetch<GoWorkoutTemplate>(`/api/v1/workout-templates/${id}`, token);
    return NextResponse.json({ template }, { status: 200 });
  }

  const { data } = await goFetch<GoTemplatesList>('/api/v1/workout-templates', token);
  return NextResponse.json({ templates: data }, { status: 200 });
}

// POST /api/coach/workout-templates — create (or upsert when id provided).
export async function POST(req: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const template = await goFetch<GoWorkoutTemplate>('/api/v1/workout-templates', token, {
    method: 'POST',
    body: JSON.stringify({
      name,
      description: typeof body?.description === 'string' ? body.description : '',
      goal: typeof body?.goal === 'string' ? body.goal : '',
      estimatedDurationMinutes:
        body?.estimatedDurationMinutes == null ? null : Number(body.estimatedDurationMinutes),
      exercises: Array.isArray(body?.exercises) ? body.exercises : [],
    }),
  });
  return NextResponse.json({ id: template.id }, { status: 201 });
}

// PUT /api/coach/workout-templates — update (id via ?id= or body.id).
export async function PUT(req: Request) {
  const { userId, getToken } = await auth();
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = await getToken();
  if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const id = new URL(req.url).searchParams.get('id');
  const body = await req.json().catch(() => null);
  const templateId = id ?? (typeof body?.id === 'string' ? body.id : '');
  if (!templateId) return NextResponse.json({ error: 'template id is required' }, { status: 400 });

  await goFetch<GoWorkoutTemplate>(`/api/v1/workout-templates/${templateId}`, token, {
    method: 'PUT',
    body: JSON.stringify({
      name: typeof body?.name === 'string' ? body.name : '',
      description: typeof body?.description === 'string' ? body.description : '',
      goal: typeof body?.goal === 'string' ? body.goal : '',
      estimatedDurationMinutes:
        body?.estimatedDurationMinutes == null ? null : Number(body.estimatedDurationMinutes),
      exercises: Array.isArray(body?.exercises) ? body.exercises : [],
    }),
  });
  return NextResponse.json({ id: templateId }, { status: 200 });
}
