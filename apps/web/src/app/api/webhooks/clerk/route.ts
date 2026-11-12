import { NextResponse } from 'next/server';
import { goFetch } from '@/lib/api/go-client';

const webhookSecret = process.env.CLERK_WEBHOOK_SECRET || '';

export const dynamic = 'force-dynamic';

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

  // Frontend (Next) signature verification before forwarding to Go.
  // Go re-verifies on its side (defence in depth) when CLERK_WEBHOOK_SECRET
  // is set; otherwise it trusts the forward from this proxy.
  try {
    const wh = new (await import('svix')).Webhook(webhookSecret);
    wh.verify(payload, header);
  } catch {
    return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
  }

  // Forward the raw Clerk webhook to the Go API. No DB writes happen here.
  try {
    const goResp = await goFetch<{ received?: boolean }>('/webhooks/clerk', {
      auth: false,
      method: 'POST',
      body: payload,
      headers: {
        'svix-id': req.headers.get('svix-id') ?? '',
        'svix-timestamp': req.headers.get('svix-timestamp') ?? '',
        'svix-signature': req.headers.get('svix-signature') ?? '',
      },
    });
    return NextResponse.json(goResp, { status: 200 });
  } catch {
    // Best-effort: never fail the Clerk webhook handshake.
    return NextResponse.json({ received: true }, { status: 200 });
  }
}
