'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { initializePaddle } from '@paddle/paddle-js';
import { TodayWorkout } from '@/components/dashboard/today-workout';
import { PerformanceStats } from '@/components/dashboard/performance-stats';
import { ActivePlan } from '@/components/dashboard/active-plan';
import { BodyMetrics } from '@/components/dashboard/body-metrics';
import { WorkoutHistory } from '@/components/dashboard/workout-history';
import { NutritionTracker } from '@/components/dashboard/nutrition-tracker';
import { CommunityFeed } from '@/components/dashboard/community-feed';
import { CoachMessages } from '@/components/dashboard/coach-messages';

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
    if (!isSignedIn) { router.push('/sign-in'); return; }

    const openCheckoutForPlan = async (slug: string) => {
      const plan = PLAN_PRICES[slug];
      if (!plan) { setStatus('show-dashboard'); return; }
      setStatus('opening-checkout');
      const email = user?.primaryEmailAddress?.emailAddress ?? '';
      const paddle = await initializePaddle({ environment: PADDLE_ENV, token: PADDLE_CLIENT_TOKEN });
      if (!paddle) { setStatus('show-dashboard'); return; }
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
      <div className="flex items-center justify-center py-24">
        <div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (status === 'opening-checkout') {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 mb-6 rounded-full bg-[#FF6B00]/10 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
            <rect x="2" y="5" width="20" height="14" rx="2" />
            <line x1="2" y1="10" x2="22" y2="10" />
          </svg>
        </div>
        <h2 className="font-headline-md text-2xl font-bold text-white uppercase mb-4">Opening Checkout</h2>
        <p className="text-[#C4C7C7]">Complete your payment in the Paddle checkout window...</p>
      </div>
    );
  }

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-8">
      {checkoutSuccess && (
        <div className="bg-[#FF6B00]/10 border border-[#FF6B00]/30 rounded-xl p-6 flex items-center gap-4">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FF6B00" strokeWidth="2">
            <path d="M9 12l2 2 4-4" /><circle cx="12" cy="12" r="10" />
          </svg>
          <div>
            <p className="text-[#FF6B00] font-bold">Payment successful!</p>
            <p className="text-[#C4C7C7] text-sm">Your subscription is being activated.</p>
          </div>
        </div>
      )}

      <TodayWorkout />
      <PerformanceStats />
      <ActivePlan />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <BodyMetrics />
        <WorkoutHistory />
      </div>

      <NutritionTracker />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CommunityFeed />
        <CoachMessages />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" /></div>}>
      <DashboardContent />
    </Suspense>
  );
}
