'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Loader2, ShieldCheck } from 'lucide-react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { PlanSummaryCard } from '@/features/auth/components/PlanSummaryCard';
import { ErrorState } from '@/features/auth/components/ErrorState';
import { useSelectedPlan } from '@/features/auth/hooks/useSelectedPlan';

/**
 * Hybrid checkout: the payer chooses the plan and pays FIRST, and the
 * account is created right after the payment is confirmed.
 *
 * The email is asked here so the registration can continue without asking for
 * it again, and so a payment made without registering can be recovered.
 */
export default function CheckoutPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planId = searchParams.get('plan');
  const { plan } = useSelectedPlan(planId);

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handlePay = async () => {
    if (!planId) {
      setError('Elegí un plan para continuar.');
      return;
    }
    if (!email.trim()) {
      setError('Ingresá tu correo para continuar.');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error ?? 'No se pudo iniciar el pago');
      }

      if (data.recovered) {
        // The payment for this email is already done: continue with the
        // registration instead of charging again.
        router.push(`/payment/success?checkout=${encodeURIComponent(data.checkout_id)}&email=${encodeURIComponent(email.trim())}`);
        return;
      }

      if (!data.checkout_url) {
        throw new Error('No se pudo generar el link de pago');
      }
      window.location.href = data.checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar el pago');
      setIsLoading(false);
    }
  };

  return (
    <AuthShell title="Activa tu plan" subtitle="Un paso para empezar a entrenar">
      <div className="flex flex-col gap-6">
        <PlanSummaryCard plan={plan} />

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="checkout-email"
            className="text-caption font-semibold uppercase tracking-wider text-text-primary"
          >
            Tu correo
          </label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-text-secondary" aria-hidden="true" />
            <input
              id="checkout-email"
              type="email"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handlePay()}
              placeholder="tu@correo.com"
              autoComplete="email"
              autoFocus
              className="h-12 w-full rounded-md border border-surface-6 bg-surface-2 pl-10 pr-4 text-body-sm text-text-primary placeholder:text-text-secondary/50 transition-all duration-200 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/30"
            />
          </div>
          <p className="text-caption text-text-secondary">
            Después del pago te pedimos crear la cuenta con este correo.
          </p>
        </div>

        {error && <ErrorState message={error} onRetry={() => setError('')} />}

        <button
          type="button"
          onClick={handlePay}
          disabled={isLoading || !planId || !email.trim()}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-body-sm font-semibold text-white transition-all duration-200 hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]"
        >
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
          ) : (
            <ShieldCheck className="h-5 w-5" aria-hidden="true" />
          )}
          Pagar y activar plan
        </button>
      </div>
    </AuthShell>
  );
}
