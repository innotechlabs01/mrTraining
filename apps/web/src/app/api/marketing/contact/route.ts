import { NextResponse } from 'next/server';
import { insertLandingContact } from '@/lib/landing-contacts';

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

  // Best-effort persistence: never fail the UX because Turso is unreachable.
  await insertLandingContact({ name: name.trim(), email: email.trim(), message: message.trim() });

  return NextResponse.json({ ok: true });
}