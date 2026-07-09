'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignInForm } from '@/features/auth/components/SignInForm';

export default function SignInPage() {
  const router = useRouter();

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your MR Training account">
      <SignInForm
        onSuccess={() => router.push('/athlete/today')}
        onForgotPassword={() => router.push('/forgot-password')}
        onBack={() => router.push('/')}
      />
    </AuthShell>
  );
}
