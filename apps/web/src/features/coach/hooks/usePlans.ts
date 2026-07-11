'use client';

import { useState, useEffect, useCallback } from 'react';
import { MOCK_PLANS } from '@/features/coach/data/_mocks';
import type { Plan } from '@/features/coach/types';

const STORAGE_KEY = 'mr-training-plans';

function loadPlans(): Plan[] {
  if (typeof window === 'undefined') return MOCK_PLANS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return MOCK_PLANS;
    const parsed = JSON.parse(raw) as Plan[];
    if (!Array.isArray(parsed) || parsed.length === 0) return MOCK_PLANS;
    return parsed;
  } catch {
    return MOCK_PLANS;
  }
}

export function usePlans() {
  const [plans, setPlans] = useState<Plan[]>(MOCK_PLANS);

  useEffect(() => {
    setPlans(loadPlans());
  }, []);

  const upsertPlan = useCallback((plan: Plan) => {
    setPlans((prev) => {
      const exists = prev.some((p) => p.id === plan.id);
      const next = exists ? prev.map((p) => (p.id === plan.id ? plan : p)) : [...prev, plan];
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore storage errors */
      }
      return next;
    });
  }, []);

  const resetPlans = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setPlans(MOCK_PLANS);
  }, []);

  return { plans, upsertPlan, resetPlans };
}
