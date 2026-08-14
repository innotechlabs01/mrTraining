import { NextResponse } from 'next/server';
import { Webhook } from 'svix';
import { getDB, generateUniqueCoachCode } from '@/lib/coach-isolation-db';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';
const clerkSecretKey = process.env.CLERK_SECRET_KEY || '';

async function setClerkMetadata(userId: string, metadata: Record<string, unknown>) {
  if (!clerkSecretKey) {
    console.error('[Webhook] CLERK_SECRET_KEY not set, cannot update metadata');
    return;
  }
  try {
    const res = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ public_metadata: metadata }),
    });
    if (!res.ok) {
      const err = await res.text();
      console.error(`[Webhook] Failed to set Clerk metadata for ${userId}:`, err);
    }
  } catch (err) {
    console.error(`[Webhook] Failed to set Clerk metadata for ${userId}:`, err);
  }
}

async function ensureCoachSync(userId: string, email: string, name: string, avatar: string) {
  const db = getDB();

  // Check if user exists in DB
  const existing = await db.execute({
    sql: 'SELECT id FROM users WHERE id = ?',
    args: [userId],
  });

  if (existing.rows.length === 0) {
    // New user — create in DB + generate coachCode
    const coachCode = await generateUniqueCoachCode();

    await db.execute({
      sql: `INSERT INTO users (id, email, name, avatar_url, role) VALUES (?, ?, ?, ?, 'coach')`,
      args: [userId, email, name, avatar],
    });

    await db.execute({
      sql: `INSERT INTO coaches (id, email, name, avatar_url, coach_code) VALUES (?, ?, ?, ?, ?)`,
      args: [userId, email, name, avatar, coachCode],
    });

    await setClerkMetadata(userId, { role: 'coach', coachCode });
    console.log(`[Webhook] Created coach ${userId} with code ${coachCode}`);
  } else {
    // User exists — check if coachCode is in DB
    const coachResult = await db.execute({
      sql: 'SELECT coach_code FROM coaches WHERE id = ?',
      args: [userId],
    });

    let coachCode = coachResult.rows[0]?.coach_code as string | undefined;

    if (!coachCode) {
      // coachCode missing in DB — generate and save
      coachCode = await generateUniqueCoachCode();
      await db.execute({
        sql: 'UPDATE coaches SET coach_code = ?, updated_at = datetime(\'now\') WHERE id = ?',
        args: [coachCode, userId],
      });
      console.log(`[Webhook] Generated missing coachCode ${coachCode} for ${userId}`);
    }

    // Always ensure Clerk metadata has coachCode
    await setClerkMetadata(userId, { role: 'coach', coachCode });
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

  const { id, email_addresses, first_name, last_name, image_url } = evt.data;
  const email = (email_addresses as Array<{ email_address: string }>)[0]?.email_address ?? '';
  const name = `${(first_name as string) ?? ''} ${(last_name as string) ?? ''}`.trim() || email;
  const avatar = (image_url as string) ?? '';

  try {
    if (evt.type === 'user.created') {
      await ensureCoachSync(id as string, email, name, avatar);
    }

    if (evt.type === 'user.updated') {
      const db = getDB();

      await db.execute({
        sql: `UPDATE users SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [email, name, avatar, id as string],
      });

      await db.execute({
        sql: `UPDATE coaches SET email = ?, name = ?, avatar_url = ?, updated_at = datetime('now') WHERE id = ?`,
        args: [email, name, avatar, id as string],
      });

      // Re-sync coachCode on every update
      await ensureCoachSync(id as string, email, name, avatar);
    }

    if (evt.type === 'user.deleted') {
      const db = getDB();
      await db.execute({
        sql: `UPDATE users SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
        args: [id as string],
      });
      await db.execute({
        sql: `UPDATE coaches SET is_active = 0, updated_at = datetime('now') WHERE id = ?`,
        args: [id as string],
      });
    }
  } catch (err) {
    console.error(`[Webhook] Error processing ${evt.type} for ${id}:`, err);
    return NextResponse.json({ error: 'Processing error' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
