import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { PocketBaseUserRepository } from '@/infrastructure/database/pocketbase.user-repo';
import { SyncUserUseCase } from '@/application/auth/sync-user.use-case';
import { env } from '@/shared/config/env';
import { logger } from '@/shared/lib/logger';

export async function POST(req: Request) {
  const headerPayload = await headers();
  const svixId = headerPayload.get('svix-id');
  const svixTimestamp = headerPayload.get('svix-timestamp');
  const svixSignature = headerPayload.get('svix-signature');

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(env.CLERK_WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent;
  } catch (err) {
    logger.error('Invalid Clerk webhook signature');
    return new Response('Invalid signature', { status: 400 });
  }

  if (evt.type !== 'user.created' && evt.type !== 'user.updated') {
    return new Response('OK', { status: 200 });
  }

  try {
    const { id, email_addresses, first_name, last_name, image_url } = evt.data;
    const primaryEmail = email_addresses?.[0]?.email_address;
    const fullName = [first_name, last_name].filter(Boolean).join(' ') || primaryEmail || 'User';

    if (!primaryEmail) {
      logger.error('No email found for user', { clerkId: id });
      return new Response('No email', { status: 400 });
    }

    const repo = new PocketBaseUserRepository();
    const syncUser = new SyncUserUseCase(repo);

    const result = await syncUser.execute({
      clerkId: id,
      email: primaryEmail,
      fullName,
      avatarUrl: image_url || undefined,
    });

    if (result.isFailure) {
      logger.error('Failed to sync user', { error: result.error.message });
      return new Response('Sync failed', { status: 500 });
    }

    return new Response('OK', { status: 200 });
  } catch (error: any) {
    logger.error('Webhook handler error', { error: error.message });
    return new Response('Internal error', { status: 500 });
  }
}
