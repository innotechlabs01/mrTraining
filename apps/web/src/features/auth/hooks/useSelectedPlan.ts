'use client';

import { useEffect, useState } from 'react';

/**
 * Plan shape returned by the public plans endpoint.
 * Kept local (and minimal) so the auth flow does not depend on the
 * marketing landing data module.
 */
export interface SelectedPlan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
}

/**
 * useSelectedPlan loads the platform plan the user picked and keeps it
 * available across the whole activation chain (sign-up → payment → onboarding).
 *
 * The plan id travels in the `plan` query param — the single canonical
 * carrier — so the user never loses the thread of what they chose.
 */
export function useSelectedPlan(planId: string | null): {
  plan: SelectedPlan | null;
  loading: boolean;
} {
  const [plan, setPlan] = useState<SelectedPlan | null>(null);
  const [loading, setLoading] = useState(Boolean(planId));

  useEffect(() => {
    if (!planId) {
      setPlan(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch('/api/marketing/plans')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        const list = Array.isArray(data)
          ? (data as SelectedPlan[])
          : ((data as { data?: SelectedPlan[] })?.data ?? []);
        setPlan(list.find((p) => p.id === planId) ?? null);
      })
      .catch(() => {
        if (!cancelled) setPlan(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [planId]);

  return { plan, loading };
}

/** Formats the plan price for display, e.g. "$59 USD / monthly". */
export function formatPlanPrice(plan: SelectedPlan): string {
  const period = plan.billing_period === 'yearly' ? 'año' : 'mes';
  return `$${plan.price} ${plan.currency} / ${period}`;
}
