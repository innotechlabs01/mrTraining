'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { VerifyCodeForm } from '@/features/auth/components/VerifyCodeForm';

export default function VerifyPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  useEffect(() => {
    if (!email) {
      router.replace('/sign-up');
    }
  }, [email, router]);

  if (!email) return null;

  return (
    <AuthShell title="Verify your email">
      <VerifyCodeForm
        email={email}
        onBack={() => router.push('/sign-up')}
        onSuccess={() => router.push('/role-selection')}
      />
    </AuthShell>
  );
}
