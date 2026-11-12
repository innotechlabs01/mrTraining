'use client';

import { useCallback, useEffect, useState } from 'react';
import { paymentAvailabilityApi } from '../api/paymentAvailability';
import type { PaymentAvailability } from '../types/paymentAvailability';

export function usePaymentAvailability(enabled = true) {
  const [availability, setAvailability] = useState<PaymentAvailability | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const res = await paymentAvailabilityApi.get();
      setAvailability(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'availability_unavailable');
      setAvailability(null);
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => { void fetch(); }, [fetch]);

  const checkoutAllowed = loading
    ? false
    : availability
    ? availability.checkout_allowed && !availability.fail_closed
    : true;

  return { availability, loading, error, refetch: fetch, checkoutAllowed };
}