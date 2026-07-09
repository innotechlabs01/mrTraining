'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <AuthShell title="Reset your password" subtitle="We'll send you a reset code">
      <ForgotPasswordForm
        onBack={() => router.push('/sign-in')}
      />
    </AuthShell>
  );
}
