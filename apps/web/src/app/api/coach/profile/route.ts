import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

const GO_API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';

export const dynamic = 'force-dynamic';

async function forwardToGoApi(path: string, options: RequestInit = {}) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the Clerk token to forward to Go API
  const token = await auth().then(a => a.getToken?.());
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${GO_API_URL}${path}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Go API error' }));
    return NextResponse.json({ error: error.error || `Go API error: ${response.status}` }, { status: response.status });
  }

  if (response.status === 204) {
    return NextResponse.json({ success: true });
  }

  return response.json();
}

export async function GET() {
  try {
    return await forwardToGoApi('/api/v1/users/me', { method: 'GET' });
  } catch (error) {
    console.error('Error fetching coach profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    return await forwardToGoApi('/api/v1/coaches/me', {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  } catch (error) {
    console.error('Error updating coach profile:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
