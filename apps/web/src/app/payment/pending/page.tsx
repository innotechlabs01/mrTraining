'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/components/AuthShell';

/**
 * /payment/pending waits for the payment provider to confirm the payment.
 *
 * The redirect the payer comes back with is NOT trusted: the status endpoint
 * is polled until the subscription reaches a terminal state.
 */
export default function PaymentPendingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async (current: number) => {
      try {
        const res = await fetch('/api/coach/subscription/status', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          const value = data.status ?? 'none';
          if (!cancelled && (value === 'active' || value === 'trial')) {
            router.replace(planId ? `/payment/success?plan=${encodeURIComponent(planId)}` : '/payment/success');
            return;
          }
          if (!cancelled && (value === 'cancelled' || value === 'expired')) {
            router.replace(planId ? `/payment/failed?plan=${encodeURIComponent(planId)}` : '/payment/failed');
            return;
          }
        }
      } catch {
        // Transient failure: keep polling.
      }

      if (current >= 30) {
        if (!cancelled) {
          router.replace(planId ? `/payment/failed?plan=${encodeURIComponent(planId)}` : '/payment/failed');
        }
        return;
      }
      timer = setTimeout(() => poll(current + 1), 2000);
    };

    poll(attempt + 1);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [planId, router]);

  return (
    <AuthShell title="Confirmando pago" subtitle="No cierres esta pestaña">
      <div className="flex flex-col items-center gap-3 py-6 text-center" aria-live="polite">
        <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
        <p className="text-body-sm text-text-secondary">
          Estamos confirmando tu pago con Wompi. No cierres esta pestaña.
        </p>
      </div>
    </AuthShell>
  );
}
