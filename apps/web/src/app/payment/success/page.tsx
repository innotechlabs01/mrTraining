'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { PlanSummaryCard } from '@/features/auth/components/PlanSummaryCard';
import { useSelectedPlan } from '@/features/auth/hooks/useSelectedPlan';

type Status = 'checking' | 'approved' | 'failed';

/**
 * Confirms the payment through the API.
 *
 * The redirect the payer comes back with is NOT trusted: the subscription row
 * is created before the payment, so only the payment record (written by the
 * provider webhook) tells us whether the money arrived. While the payment is
 * still unconfirmed the user is handed over to /payment/pending, which keeps
 * polling.
 */
export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const { plan } = useSelectedPlan(planId);
  const [status, setStatus] = useState<Status>('checking');

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async (attempt: number) => {
      let value = 'pending';
      try {
        const res = await fetch('/api/coach/subscription/status', { cache: 'no-store' });
        if (res.ok) {
          const data = (await res.json()) as { status?: string };
          value = data.status ?? 'pending';
        }
      } catch {
        value = 'pending';
      }

      if (cancelled) return;

      if (value === 'approved') {
        setStatus('approved');
        return;
      }

      if (attempt >= 5) {
        // Still unconfirmed: hand over to the pending page, which keeps
        // polling and resolves to success or failure.
        router.replace(planId ? `/payment/pending?plan=${encodeURIComponent(planId)}` : '/payment/pending');
        return;
      }
      timer = setTimeout(() => poll(attempt + 1), 1500);
    };

    poll(1);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [planId, router]);

  const goToProfile = () => {
    router.push(planId ? `/onboarding/coach?plan=${encodeURIComponent(planId)}` : '/onboarding/coach');
  };

  return (
    <AuthShell title="Pago confirmado" subtitle="Tu plan está activo">
      <div className="flex flex-col gap-6">
        {status === 'checking' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center" aria-live="polite">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
            <p className="text-body-sm text-text-secondary">Confirmando tu pago...</p>
          </div>
        )}

        {status === 'approved' && (
          <>
            <div className="flex flex-col items-center gap-3 text-center">
              <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
              <p className="text-body-sm text-text-secondary">
                Pago recibido{plan ? `. Plan ${plan.name} activado.` : '. Tu plan está activo.'}
              </p>
            </div>

            <PlanSummaryCard plan={plan} paid />

            <p className="text-body-sm text-text-secondary">
              El siguiente paso es completar tu perfil de coach para comenzar a entrenar atletas.
            </p>

            <button
              type="button"
              onClick={goToProfile}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 active:scale-[0.98]"
            >
              Completar perfil
            </button>
          </>
        )}

        {status === 'failed' && (
          <>
            <p className="text-body-sm text-text-secondary">
              El pago no pudo confirmarse. Tu cuenta de coach sigue activa.
            </p>
            <button
              type="button"
              onClick={() =>
                router.push(planId ? `/payment/failed?plan=${encodeURIComponent(planId)}` : '/payment/failed')
              }
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover active:scale-[0.98]"
            >
              Ver opciones de pago
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
