'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Loader2, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { PlanSummaryCard } from '@/features/auth/components/PlanSummaryCard';
import { ErrorState } from '@/features/auth/components/ErrorState';
import { useSelectedPlan } from '@/features/auth/hooks/useSelectedPlan';
import { useAuth, useUser } from '@clerk/nextjs';

type Phase = 'activating' | 'ready' | 'error';

export default function PaymentInterstitialPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const { plan } = useSelectedPlan(planId);
  const { isSignedIn, isLoaded, sessionClaims, userId } = useAuth();
  const { user } = useUser();

  const [phase, setPhase] = useState<Phase>('activating');
  const [error, setError] = useState('');
  const [isPaying, setIsPaying] = useState(false);

  /**
   * Extrae el rol de la sesión desde los claims públicos de Clerk.
   */
  function resolveRole(sessionClaims: unknown, user: unknown): string | undefined {
    const claims = sessionClaims as { publicMetadata?: Record<string, unknown> } | null | undefined;
    return (
      (claims?.publicMetadata?.role ??
        (user as { publicMetadata?: Record<string, unknown> } | undefined)?.publicMetadata?.role) as
      | string
      | undefined
    );
  }

  /**
   * Consulta el estado de la suscripción. active/trial = pagado, cualquier
   * otro estado = pago pendiente.
   */
  async function checkSubscriptionStatus(): Promise<'paid' | 'pending'> {
    try {
      const res = await fetch('/api/coach/subscription/status', { cache: 'no-store' });
      if (!res.ok) return 'pending';
      const data = await res.json().catch(() => ({}));
      const status = data.status as string | undefined;
      return status === 'active' || status === 'trial' ? 'paid' : 'pending';
    } catch {
      return 'pending';
    }
  }

  useEffect(() => {
    if (!isLoaded) return;

    const metadataRole = resolveRole(sessionClaims, user);

    // Ya hay sesión activa.
    if (isSignedIn) {
      if (metadataRole === 'coach') {
        void checkSubscriptionStatus().then((result) => {
          if (result === 'paid') {
            // Suscripción confirmada: salta directamente al onboarding.
            router.replace(
              planId ? `/onboarding/coach?plan=${encodeURIComponent(planId)}` : '/onboarding/coach',
            );
          } else {
            // Pago pendiente: mostrar el flujo de pago (sin re-activar).
            setPhase('ready');
          }
        });
      } else {
        // Sesión activa pero sin rol de coach: no aplica este flujo.
        setPhase('ready');
      }
      return;
    }

    // No hay sesión: flujo actual (activar cuenta, luego pagar).
    let cancelled = false;

    fetch('/api/coach/activate', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'No se pudo activar la cuenta');
        }
        return res.json();
      })
      .then(() => {
        if (!cancelled) setPhase('ready');
      })
      .catch((err: Error) => {
        if (cancelled) return;
        setError(err.message);
        setPhase('error');
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, sessionClaims, userId, user, planId, router]);

  const handlePay = () => {
    if (!planId) {
      setError('No hay un plan seleccionado.');
      setPhase('error');
      return;
    }
    setIsPaying(true);
    // The checkout route creates the subscription and redirects to Wompi.
    router.push(`/api/coach/subscription/checkout?planId=${encodeURIComponent(planId)}`);
  };

  const handleRetryActivation = () => {
    setPhase('activating');
    setError('');
    fetch('/api/coach/activate', { method: 'POST' })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error ?? 'No se pudo activar la cuenta');
        }
        return res.json();
      })
      .then(() => setPhase('ready'))
      .catch((err: Error) => {
        setError(err.message);
        setPhase('error');
      });
  };

  return (
    <AuthShell title="Confirma tu pago" subtitle="Tu cuenta ya está creada">
      <div className="flex flex-col gap-6">
        <PlanSummaryCard plan={plan} />

        {phase === 'activating' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-primary" aria-hidden="true" />
            <p className="text-body-sm text-text-secondary">Activando tu cuenta de coach...</p>
          </div>
        )}

        {phase === 'error' && (
          <ErrorState message={error || 'No se pudo activar la cuenta'} onRetry={handleRetryActivation} />
        )}

        {phase === 'ready' && (
          <>
            <p className="text-body-sm text-text-secondary">
              Tu cuenta de coach está creada. El último paso es activar tu plan con un pago.
            </p>

            <button
              type="button"
              onClick={handlePay}
              disabled={isPaying || !planId}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
            >
              {isPaying ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
              ) : (
                <ShieldCheck className="h-5 w-5" aria-hidden="true" />
              )}
              Pagar y activar plan
            </button>

            <button
              type="button"
              onClick={() => router.push('/sign-in?plan=' + encodeURIComponent(planId ?? ''))}
              className="flex items-center justify-center gap-1.5 text-body-sm text-text-secondary transition-colors duration-200 hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Volver al inicio
            </button>
          </>
        )}
      </div>
    </AuthShell>
  );
}
