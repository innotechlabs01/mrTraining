import { NextResponse } from 'next/server';
import { logger } from '@/shared/lib/logger';
import { getAdminPocketBase } from '@/infrastructure/database/pocketbase.client';

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get('paddle-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const event = JSON.parse(body);
    logger.info(`Paddle event: ${event.event_type}`, {
      eventId: event.event_id,
      eventType: event.event_type,
    });

    const pb = await getAdminPocketBase();

    switch (event.event_type) {
      case 'subscription.created':
      case 'subscription.updated': {
        const sub = event.data;
        const planSlug = sub.custom_data?.plan_slug ?? 'starter';

        const plans = await pb.collection('plans').getList(1, 1, {
          filter: `slug = "${planSlug}"`,
        });

        if (plans.items.length === 0) {
          logger.warn('Plan not found for slug', { planSlug });
          break;
        }

        const plan = plans.items[0];
        const customerEmail = sub.customer_email || sub.email || '';

        const users = await pb.collection('app_users').getList(1, 1, {
          filter: `email = "${customerEmail}"`,
        });

        if (users.items.length > 0) {
          const user = users.items[0];
          const existingSub = await pb.collection('subscriptions').getList(1, 1, {
            filter: `paddle_subscription_id = "${sub.id}"`,
          });

          const subData = {
            user_id: user.id,
            plan_id: plan.id,
            status: sub.status,
            paddle_subscription_id: sub.id,
            paddle_customer_id: sub.customer_id,
            current_period_start: sub.current_billing_period?.starts_at ?? sub.started_at ?? new Date().toISOString(),
            current_period_end: sub.current_billing_period?.ends_at ?? sub.next_billed_at ?? new Date().toISOString(),
          };

          if (existingSub.items.length > 0) {
            await pb.collection('subscriptions').update(existingSub.items[0].id, subData);
          } else {
            await pb.collection('subscriptions').create(subData);
          }

          const roleMap: Record<string, string> = { starter: 'member', elite: 'elite', pro: 'pro' };
          await pb.collection('app_users').update(user.id, {
            role: roleMap[planSlug] ?? 'member',
          });

          logger.info('Subscription synced', { planSlug, userId: user.id });
        } else {
          logger.warn('User not found for email', { email: customerEmail });
        }
        break;
      }

      case 'transaction.completed': {
        const tx = event.data;
        const subId = tx.subscription_id;

        if (subId) {
          const subs = await pb.collection('subscriptions').getList(1, 1, {
            filter: `paddle_subscription_id = "${subId}"`,
          });

          if (subs.items.length > 0) {
            const sub = subs.items[0];
            await pb.collection('payments').create({
              user_id: sub.user_id,
              subscription_id: sub.id,
              paddle_transaction_id: tx.id,
              amount: parseInt(tx.details?.totals?.total ?? '0') * 100,
              currency: tx.currency_code ?? 'USD',
              status: 'paid',
              paid_at: tx.billed_at ?? new Date().toISOString(),
            });
            logger.info('Payment recorded', { transactionId: tx.id });
          }
        }
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    logger.error('Paddle webhook error', { error: err.message });
    return new Response('Webhook error', { status: 400 });
  }
}
