'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { AuthShell } from '@/features/auth/components/AuthShell';

export default function PaymentFailedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');

  const interstitial = planId ? `/payment/interstitial?plan=${encodeURIComponent(planId)}` : '/payment/interstitial';

  return (
    <AuthShell title="Pago no completado" subtitle="Tu cuenta de coach sigue activa">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <AlertCircle className="h-10 w-10 text-error" aria-hidden="true" />
          <p className="text-body-sm text-text-secondary">
            El pago no se pudo completar. Tu cuenta de coach ya está creada. Puedes reintentar el pago
            o entrar sin pagar y activar tu plan más tarde.
          </p>
        </div>

        <button
          type="button"
          onClick={() => router.push(interstitial)}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 active:scale-[0.98]"
        >
          Reintentar pago
        </button>

        <button
          type="button"
          onClick={() =>
            router.push(
              planId
                ? `/sign-in?redirect_url=${encodeURIComponent(`/payment/failed?plan=${planId}`)}`
                : '/sign-in',
            )
          }
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md border border-surface-6 bg-transparent text-body-sm font-semibold text-text-primary transition-all duration-200 hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary active:scale-[0.98]"
        >
          Entrar sin pagar
        </button>
      </div>
    </AuthShell>
  );
}
