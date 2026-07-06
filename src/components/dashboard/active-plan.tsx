'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { PocketBaseSubscriptionRepository } from '@/infrastructure/database/pocketbase.subscription-repo';
import { PocketBasePlanRepository } from '@/infrastructure/database/pocketbase.plan-repo';
import type { Subscription, Plan } from '@/domain/entities';
import { cn } from '@/shared/lib/cn';

const subscriptionRepo = new PocketBaseSubscriptionRepository();
const planRepo = new PocketBasePlanRepository();

function SkeletonPulse() {
  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_30px_rgba(0,102,255,0.08)]">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-white/10 rounded w-1/3" />
        <div className="h-4 bg-white/10 rounded w-1/2" />
        <div className="h-12 bg-white/10 rounded-lg mt-6" />
        <div className="h-4 bg-white/10 rounded w-2/3 mt-4" />
      </div>
    </div>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  return (
    <div className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-500"
        style={{
          width: `${Math.min(100, Math.max(0, percentage))}%`,
          background: 'linear-gradient(90deg, #FF6B00 0%, #0066FF 100%)',
        }}
      />
    </div>
  );
}

export function ActivePlan() {
  const { userId } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchActivePlan() {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const subscriptionResult = await subscriptionRepo.findByUserId(userId);
        if (subscriptionResult.isFailure) {
          setError('Failed to load subscription');
          setLoading(false);
          return;
        }

        const sub = subscriptionResult.value;
        if (!sub || !sub.isActive) {
          setSubscription(null);
          setLoading(false);
          return;
        }

        setSubscription(sub);

        const planResult = await planRepo.findById(sub.planId);
        if (planResult.isSuccess) {
          setPlan(planResult.value);
        }
      } catch {
        setError('Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchActivePlan();
  }, [userId]);

  if (loading) {
    return <SkeletonPulse />;
  }

  if (error) {
    return (
      <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_30px_rgba(0,102,255,0.08)]">
        <p className="text-red-500 text-sm">{error}</p>
      </div>
    );
  }

  if (!subscription || !plan) {
    return (
      <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-8 shadow-[0_0_30px_rgba(0,102,255,0.08)] text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z"
            />
          </svg>
        </div>
        <h3 className="text-white font-semibold text-lg mb-1">No Active Plan</h3>
        <p className="text-gray-500 text-sm">Subscribe to unlock your personalized training program.</p>
      </div>
    );
  }

  const now = new Date();
  const periodStart = new Date(subscription.currentPeriodStart);
  const periodEnd = new Date(subscription.currentPeriodEnd);
  const totalDays = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.ceil((now.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const progressPercentage = totalDays > 0 ? (daysElapsed / totalDays) * 100 : 0;
  const daysRemaining = Math.max(0, totalDays - daysElapsed);

  return (
    <div className="bg-[#141618] border border-[rgba(0,102,255,0.2)] rounded-xl p-6 shadow-[0_0_30px_rgba(0,102,255,0.08)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{plan.name}</h3>
          <p className="text-gray-500 text-sm">{plan.monthlyPriceFormatted}/month</p>
        </div>
        <div className={cn(
          'px-3 py-1 rounded-full text-xs font-medium',
          subscription.status === 'active'
            ? 'bg-[#0066FF]/10 text-[#0066FF]'
            : 'bg-[#FF6B00]/10 text-[#FF6B00]'
        )}>
          {subscription.status === 'active' ? 'Active' : 'Trialing'}
        </div>
      </div>

      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-400 mb-2">
          <span>Progress</span>
          <span>{daysRemaining} days remaining</span>
        </div>
        <ProgressBar percentage={progressPercentage} />
      </div>

      <div className="bg-[#0F0F0F] rounded-lg p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FF6B00]/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-[#FF6B00]"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
              />
            </svg>
          </div>
          <div>
            <p className="text-white text-sm font-medium">Next billing date</p>
            <p className="text-gray-500 text-xs">
              {periodEnd.toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
