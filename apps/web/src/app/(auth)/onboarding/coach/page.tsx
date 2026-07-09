'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { CoachOnboarding } from '@/features/auth/components/CoachOnboarding';

export default function CoachOnboardingPage() {
  const router = useRouter();

  return (
    <AuthShell title="Set up your coaching profile" subtitle="Tell us about your coaching experience">
      <CoachOnboarding
        onComplete={() => router.push('/welcome-dashboard')}
        onSkip={() => router.push('/welcome-dashboard')}
      />
    </AuthShell>
  );
}
