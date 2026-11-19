'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignUpForm } from '@/features/auth/components/SignUpForm';
import { resolveRole, signUpGuardDestination, SUPER_ADMIN_IDS, isSubscriptionSkipped } from './signUpGuard';

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <AuthShell title="Crea tu cuenta" subtitle="Únete a MR Training hoy">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-primary" aria-hidden="true" />
          </div>
        </AuthShell>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}

function SignUpContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSignedIn, isLoaded, sessionClaims, userId } = useAuth();
  const { user } = useUser();
  const plan = searchParams.get('plan');
  const isTrial = searchParams.get('trial') === 'true' || searchParams.get('trial') === '1' || !plan;

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const metadataRole = resolveRole(sessionClaims, user);
    const id = userId ?? user?.id;
    const isSuperAdmin =
      (id !== undefined && SUPER_ADMIN_IDS.includes(id)) || metadataRole === 'super_admin';

    const isSkipped = isSubscriptionSkipped(sessionClaims, user);

    if (isSuperAdmin || metadataRole !== 'coach' || isSkipped) {
      // Super admin, coach con membresía omitida o sin rol: destino inmediato (sin consulta de suscripción).
      const dest = signUpGuardDestination(isSuperAdmin, metadataRole, isSkipped ? 'paid' : null, plan, isSkipped);
      if (dest) router.replace(dest);
      return;
    }

    // Coach: hay que consultar el estado de la suscripción antes de decidir.
    let cancelled = false;
    fetch('/api/coach/subscription/status', { cache: 'no-store' })
      .then(async (res) => {
        if (!res.ok) return 'pending';
        const data = await res.json().catch(() => ({}));
        const status = data.status as string | undefined;
        return status === 'active' || status === 'trial' || status === 'approved' || status === 'omitted' ? 'paid' : 'pending';
      })
      .then((status) => {
        if (cancelled) return;
        const subStatus: 'paid' | 'pending' | null =
          status === 'paid' ? 'paid' : status === 'pending' ? 'pending' : null;
        const dest = signUpGuardDestination(false, 'coach', subStatus, plan);
        if (dest) router.replace(dest);
      })
      .catch(() => {
        if (cancelled) return;
        const dest = signUpGuardDestination(false, 'coach', 'pending', plan);
        if (dest) router.replace(dest);
      });

    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, sessionClaims, userId, user, plan, router]);

  const title = isTrial ? 'Prueba gratis de 7 días' : 'Crea tu cuenta';
  const subtitle = isTrial
    ? 'Acceso completo para gestionar tus atletas. Sin tarjeta de crédito.'
    : 'Únete a MR Training hoy';

  // Durante la resolución de la sesión de Clerk y mientras el guardia se
  // resuelve, nunca se muestra el formulario ni una pantalla vacía.
  if (!isLoaded || (isLoaded && isSignedIn)) {
    return (
      <AuthShell title={title} subtitle={subtitle}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-brand-primary" aria-hidden="true" />
        </div>
      </AuthShell>
    );
  }

  const handleSuccess = async () => {
    if (isTrial) {
      try {
        await fetch('/api/coach/activate', { method: 'POST' });
        await fetch('/api/coach/subscription/trial', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: plan || 'plan-seed-starter' }),
        });
        router.push('/onboarding/coach');
      } catch {
        router.push('/coach/plan');
      }
    } else {
      router.push(plan ? `/payment/interstitial?plan=${encodeURIComponent(plan)}` : '/payment/interstitial');
    }
  };

  return (
    <AuthShell title={title} subtitle={subtitle}>
      <SignUpForm onSuccess={handleSuccess} onBack={() => router.push('/')} />
    </AuthShell>
  );
}
