'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { initializePaddle } from '@paddle/paddle-js';

const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN ?? '';
const PADDLE_ENV = (process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT as 'sandbox' | 'production') ?? 'sandbox';

const PLAN_PRICES: Record<string, { name: string; priceId: string }> = {
  starter: { name: 'Starter', priceId: 'pri_01kwqdq8xx7s4ptpp9gqyn9dms' },
  elite: { name: 'Elite', priceId: 'pri_01kwqdq945983ncpjpjndhvn0b' },
  pro: { name: 'Pro', priceId: 'pri_01kwqdq9a9hys36akt1yytyv1w' },
};

function DashboardContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const { user } = useUser();
  const [status, setStatus] = useState<'loading' | 'opening-checkout' | 'show-dashboard'>('loading');

  const planSlug = searchParams.get('checkout') || searchParams.get('plan');
  const checkoutSuccess = searchParams.get('checkout') === 'success';

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    const openCheckoutForPlan = async (slug: string) => {
      const plan = PLAN_PRICES[slug];
      if (!plan) {
        setStatus('show-dashboard');
        return;
      }

      setStatus('opening-checkout');
      const email = user?.primaryEmailAddress?.emailAddress ?? '';

      const paddle = await initializePaddle({
        environment: PADDLE_ENV,
        token: PADDLE_CLIENT_TOKEN,
      });

      if (!paddle) {
        setStatus('show-dashboard');
        return;
      }

      paddle.Checkout.open({
        items: [{ priceId: plan.priceId, quantity: 1 }],
        customer: { email },
        settings: { displayMode: 'overlay', theme: 'dark', locale: 'en' },
        customData: { plan_slug: slug },
      });
    };

    if (planSlug && PLAN_PRICES[planSlug]) {
      openCheckoutForPlan(planSlug);
    } else {
      setStatus('show-dashboard');
    }
  }, [isLoaded, isSignedIn, planSlug, user, router]);

  if (!isLoaded || status === 'loading') {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter py-24 text-center">
        <div className="w-8 h-8 border-2 border-electric-orange border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (status === 'opening-checkout') {
    return (
      <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter py-24 text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-electric-orange/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric-orange">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <h2 className="font-headline-md text-2xl font-bold text-white uppercase mb-4">Opening Checkout</h2>
        <p className="text-muted-gray">Complete your payment in the Paddle checkout window...</p>
      </div>
    );
  }

  return (
    <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter py-12">
      <h1 className="font-headline-lg text-3xl md:text-[40px] font-bold uppercase mb-8">Dashboard</h1>

      {checkoutSuccess && (
        <div className="glass-card p-8 mb-6 border-electric-orange/30 bg-electric-orange/5">
          <div className="flex items-center gap-4 mb-4">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-electric-orange">
              <path d="M9 12l2 2 4-4" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            <p className="text-electric-orange font-headline-md text-lg">Payment successful!</p>
          </div>
          <p className="text-muted-gray">
            Your subscription is being activated. This may take a few moments.
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="glass-card p-6 border-l-4 border-l-electric-orange">
          <h3 className="font-headline-md text-xl font-bold mb-2">Current Plan</h3>
          <p className="text-electric-orange text-2xl font-bold">Starter</p>
          <p className="text-muted-gray text-sm mt-2">Active</p>
        </div>
        <div className="glass-card p-6 border-l-4 border-l-performance-blue">
          <h3 className="font-headline-md text-xl font-bold mb-2">Workouts Completed</h3>
          <p className="text-performance-blue text-2xl font-bold">24</p>
          <p className="text-muted-gray text-sm mt-2">This month</p>
        </div>
        <div className="glass-card p-6">
          <h3 className="font-headline-md text-xl font-bold mb-2">Next Workout</h3>
          <p className="text-white text-xl font-bold">Upper Body Strength</p>
          <p className="text-muted-gray text-sm mt-2">Tomorrow, 7:00 AM</p>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-container-max mx-auto px-margin-mobile md:px-gutter py-24 text-center">
          <div className="w-8 h-8 border-2 border-electric-orange border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}
