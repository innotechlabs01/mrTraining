'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { MFAForm } from '@/features/auth/components/MFAForm';

export default function MFAPage() {
  const router = useRouter();

  return (
    <AuthShell title="Two-factor authentication" subtitle="Enter your verification code">
      <MFAForm
        onSuccess={() => router.push('/athlete/today')}
        onBack={() => router.push('/sign-in')}
      />
    </AuthShell>
  );
}
