'use client';

import { Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignUpForm } from '@/features/auth/components/SignUpForm';

export default function SignUpPage() {
  const router = useRouter();

  return (
    <AuthShell title="Create your account" subtitle="Join MR Training today">
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

  return (
    <SignUpForm
      role="coach"
      onSuccess={() => router.push(plan ? '/coach/plan' : '/coach')}
      onBack={() => router.push('/')}
    />
  );
}
