'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { ForgotPasswordForm } from '@/features/auth/components/ForgotPasswordForm';

export default function ForgotPasswordPage() {
  const router = useRouter();

  return (
    <AuthShell title="Restablece tu contraseña" subtitle="Te enviaremos un código de restablecimiento">
      <ForgotPasswordForm
        onBack={() => router.push('/sign-in')}
      />
    </AuthShell>
  );
}
