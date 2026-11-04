import { NextResponse } from 'next/server';
import { goFetch } from '@/lib/api/go-client';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { name, email, message } = (body ?? {}) as {
    name?: unknown;
    email?: unknown;
    message?: unknown;
  };

  if (
    typeof name !== 'string' ||
    !name.trim() ||
    typeof email !== 'string' ||
    !email.trim() ||
    typeof message !== 'string' ||
    !message.trim()
  ) {
    return NextResponse.json({ error: 'name, email and message are required' }, { status: 400 });
  }

  // Best-effort persistence via Go API (POST /public/landing/contact).
  // Replaces direct SQL via landing-contacts.ts (lib/db). Never fail the UX
  // because the Go API is unreachable.
  try {
    await goFetch<{ ok?: boolean }>('/public/landing/contact', {
      method: 'POST',
      auth: false,
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim(),
        message: message.trim(),
      }),
    });
  } catch {
    // Best-effort: swallow errors so the contact form UX never breaks.
  }

  return NextResponse.json({ ok: true });
}
