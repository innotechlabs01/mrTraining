'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignUpForm } from '@/features/auth/components/SignUpForm';

export default function SignUpPage() {
  return (
    <AuthShell title="Crea tu cuenta" subtitle="Únete a MR Training hoy">
      <Suspense fallback={null}>
        <SignUpFormWrapper />
      </Suspense>
    </AuthShell>
  );
}

function SignUpFormWrapper() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  // After the account exists the coach still has to pay: the payment is the
  // step that activates the plan, and the profile onboarding happens after
  // the payment is confirmed.
  return (
    <SignUpForm
      onSuccess={() =>
        router.push(plan ? `/payment/interstitial?plan=${encodeURIComponent(plan)}` : '/payment/interstitial')
      }
      onBack={() => router.push('/')}
    />
  );
}
