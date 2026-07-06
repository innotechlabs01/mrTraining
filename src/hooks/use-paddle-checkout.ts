'use client';

import { useCallback, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { initializePaddle } from '@paddle/paddle-js';

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '';
const PADDLE_ENV = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox';

export function usePaddleCheckout() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);

  const openCheckout = useCallback(
    async (planSlug: string, priceId: string, email: string) => {
      setLoading(planSlug);

      const paddle = await initializePaddle({
        environment: PADDLE_ENV,
        token: PADDLE_CLIENT_TOKEN,
      });

      if (!paddle) {
        setLoading(null);
        throw new Error('Paddle failed to initialize');
      }

      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customer: { email },
        settings: {
          displayMode: 'overlay',
          theme: 'dark',
          locale: 'en',
        },
        customData: { plan_slug: planSlug },
      });

      setLoading(null);
    },
    [],
  );

  const handlePlanSelect = useCallback(
    (planSlug: string, priceId: string) => {
      if (!isLoaded) return;

      if (!isSignedIn) {
        router.push(`/sign-up?plan=${planSlug}`);
        return;
      }

      router.push(`/dashboard?checkout=${planSlug}`);
    },
    [isSignedIn, isLoaded, router],
  );

  return { openCheckout, handlePlanSelect, loading };
}
