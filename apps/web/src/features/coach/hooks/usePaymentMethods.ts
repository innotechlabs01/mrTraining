'use client';

import { useState, useEffect, useCallback } from 'react';
import type { PaymentMethod } from '@/features/coach/types';

const STORAGE_KEY = 'mr-training-payment-methods';

function uid() {
  return `pm-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export interface NewPaymentMethodInput {
  bank: string;
  holder: string;
  accountType: PaymentMethod['accountType'];
  accountNumber: string;
  clabe: string;
  notes?: string;
}

export function usePaymentMethods() {
  const [methods, setMethods] = useState<PaymentMethod[]>([]);

  useEffect(() => {
    load();
  }, []);

  const load = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setMethods(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  const persist = useCallback((next: PaymentMethod[]) => {
    setMethods(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }, []);

  const addMethod = useCallback(
    (input: NewPaymentMethodInput) => {
      const method: PaymentMethod = { id: uid(), ...input };
      persist([...methods, method]);
      return method;
    },
    [methods, persist],
  );

  const updateMethod = useCallback(
    (id: string, patch: Partial<PaymentMethod>) => {
      persist(methods.map((m) => (m.id === id ? { ...m, ...patch } : m)));
    },
    [methods, persist],
  );

  const removeMethod = useCallback(
    (id: string) => {
      persist(methods.filter((m) => m.id !== id));
    },
    [methods, persist],
  );

  return { methods, addMethod, updateMethod, removeMethod };
}
