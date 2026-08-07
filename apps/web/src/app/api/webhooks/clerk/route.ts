import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getDB, generateUniqueCoachCode } from '@/lib/coach-isolation-db';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';
const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';

async function setClerkMetadata(userId: string, metadata: Record<string, unknown>) {
  if (!clerkSecretKey) return;
  try {
    await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_metadata: metadata }),
    });
  } catch (err) {
    console.error('Failed to set Clerk metadata:', err);
  }
}

export async function POST(req: Request) {
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 });
  }

  const payload = await req.text();
  const header = {
    'svix-id': req.headers.get('svix-id')!,
    'svix-timestamp': req.headers.get('svix-timestamp')!,
    'svix-signature': req.headers.get('svix-signature')!,
  };

  let evt: { type: string; data: Record<string, unknown> };
  try {
    const wh = new Webhook(webhookSecret);
    evt = wh.verify(payload, header) as { type: string; data: Record<string, unknown> };
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  const db = getDB();

  if (evt.type === 'user.created') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = (email_addresses as Array<{ email_address: string }>)[0]?.email_address ?? '';
    const name = `${(first_name as string) ?? ''} ${(last_name as string) ?? ''}`.trim() || email;
    const avatar = (image_url as string) ?? '';

    const existing = await db.execute({
      sql: 'SELECT id FROM users WHERE id = ?',
      args: [id as string],
    });

    if (existing.rows.length === 0) {
      const coachCode = await generateUniqueCoachCode();

      await db.execute({
        sql: `INSERT INTO users (id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, 'coach')`,
        args: [id as string, email, name, avatar],
      });

      await db.execute({
        sql: `INSERT INTO coaches (id, email, name, avatar_url, coach_code) VALUES (?, ?, ?, ?, ?)`,
        args: [id as string, email, name, avatar, coachCode],
      });

      await setClerkMetadata(id as string, { role: 'coach', coachCode });
    }
  }

  if (evt.type === 'user.updated') {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const email = (email_addresses as Array<{ email_address: string }>)[0]?.email_address ?? '';
    const name = `${(first_name as string) ?? ''} ${(last_name as string) ?? ''}`.trim() || email;
    const avatar = (image_url as string) ?? '';

    await db.execute({
      sql: `UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [email, name, avatar, id as string],
    });

    await db.execute({
      sql: `UPDATE coaches SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
      args: [email, name, avatar, id as string],
    });
  }

  if (evt.type === 'user.deleted') {
    const { id } = evt.data;
    await db.execute({
      sql: `UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
      args: [id as string],
    });
    await db.execute({
      sql: `UPDATE coaches SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
      args: [id as string],
    });
  }

  return NextResponse.json({ received: true });
}
