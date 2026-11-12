'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { CheckCircle2, Loader2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { PlanSummaryCard } from '@/features/auth/components/PlanSummaryCard';
import { ErrorState } from '@/features/auth/components/ErrorState';
import { SignUpForm } from '@/features/auth/components/SignUpForm';
import { useSelectedPlan } from '@/features/auth/hooks/useSelectedPlan';

type ClaimStatus = 'checking' | 'needs-account' | 'claiming' | 'error';

export default function PaymentSuccessPage() {
  return (
    <AuthShell title="Pago confirmado" subtitle="Tu plan está activo">
      <Suspense fallback={null}>
        <PaymentSuccessContent />
      </Suspense>
    </AuthShell>
  );
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get('checkout');

  // Hybrid checkout: the payment was made before the account existed.
  if (checkoutId) {
    return <CheckoutClaim checkoutId={checkoutId} />;
  }
  return <SubscriptionPaymentSuccess />;
}

/**
 * CheckoutClaim finishes the hybrid checkout: it claims the paid checkout for
 * the authenticated user, or asks for the registration first when the buyer
 * has no account yet.
 */
function CheckoutClaim({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [status, setStatus] = useState<ClaimStatus>('checking');
  const [error, setError] = useState('');

  const claim = useCallback(async () => {
    setStatus('claiming');
    setError('');
    try {
      const res = await fetch(`/api/checkout/${encodeURIComponent(checkoutId)}/claim`, {
        method: 'POST',
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo activar tu plan');
      }

      const planId = data.plan_id ? `?plan=${encodeURIComponent(data.plan_id)}` : '';
      router.push(`/onboarding/coach${planId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo activar tu plan');
      setStatus('error');
    }
  }, [checkoutId, router]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setStatus('needs-account');
      return;
    }
    void claim();
  }, [isLoaded, isSignedIn, claim]);

  if (status === 'needs-account') {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <CheckCircle2 className="h-10 w-10 text-success" aria-hidden="true" />
          <p className="text-body-sm text-text-secondary">
            Tu pago está confirmado. Creá tu cuenta para activar el plan y empezar.
          </p>
        </div>
        <SignUpForm onSuccess={() => void claim()} />
      </div>
    );
  }

  if (status === 'error') {
    return <ErrorState message={error} onRetry={() => void claim()} />;
  }

  return (
    <div className="flex flex-col items-center gap-3 py-6 text-center" aria-live="polite">
      <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
      <p className="text-body-sm text-text-secondary">Activando tu plan...</p>
    </div>
  );
}

/**
 * SubscriptionPaymentSuccess is the flow where the account existed BEFORE the
 * payment: it waits for the provider webhook to confirm it.
 */
function SubscriptionPaymentSuccess() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const { plan } = useSelectedPlan(planId);
  const [status, setStatus] = useState<'checking' | 'approved' | 'pending' | 'failed'>('checking');

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

      {status === 'pending' && (
        <>
          <p className="text-body-sm text-text-secondary">
            Tu pago se está procesando. Te redirigimos al perfil en cuanto Wompi lo confirme.
          </p>
          <button
            type="button"
            onClick={goToProfile}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover active:scale-[0.98]"
          >
            Continuar al perfil
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
  );
}
