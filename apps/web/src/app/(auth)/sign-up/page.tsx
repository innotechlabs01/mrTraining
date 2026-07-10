'use client';

import { Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignUpForm } from '@/features/auth/components/SignUpForm';

export default function SignUpPage() {
  const router = useRouter();

  return (
    <AuthShell title="Create your account" subtitle="Join MR Training today">
      <Suspense fallback={null}>
        <SignUpForm
          onSuccess={() => router.push('/role-selection')}
          onBack={() => router.push('/')}
        />
      </Suspense>
    </AuthShell>
  );
}
