'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { RoleSelector } from '@/features/auth/components/RoleSelector';

export default function RoleSelectionPage() {
  const router = useRouter();

  const handleSelect = (role: string) => {
    if (role === 'coach' || role === 'strength-coach') {
      router.push('/coach');
    } else {
      router.push(`/onboarding/${role}`);
    }
  };

  return (
    <AuthShell title="What brings you here?" subtitle="Tell us about yourself so we can personalize your experience">
      <RoleSelector
        onSelect={handleSelect}
        onSkip={() => router.push('/welcome-dashboard')}
      />
    </AuthShell>
  );
}
