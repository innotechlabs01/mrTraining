import { initializePaddle, getPaddleInstance } from '@paddle/paddle-js';
import type { Paddle } from '@paddle/paddle-js';

let paddleInstance: Paddle | null = null;

export async function initPaddle(token: string): Promise<Paddle | null> {
  if (paddleInstance) return paddleInstance;

  paddleInstance = (await initializePaddle({
    environment: (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox',
    token,
  })) ?? null;

  return paddleInstance;
}

export async function openCheckout(input: {
  priceId: string;
  customerEmail: string;
}): Promise<void> {
  const paddle = paddleInstance ?? getPaddleInstance();
  if (!paddle) throw new Error('Paddle not initialized');

  paddle.Checkout.open({
    items: [{ priceId: input.priceId, quantity: 1 }],
    customer: { email: input.customerEmail },
  });
}
