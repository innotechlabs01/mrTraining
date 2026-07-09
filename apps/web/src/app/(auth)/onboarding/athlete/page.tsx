'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { AthleteOnboarding } from '@/features/auth/components/AthleteOnboarding';

export default function AthleteOnboardingPage() {
  const router = useRouter();

  return (
    <AuthShell title="Set up your athlete profile" subtitle="Help us personalize your training">
      <AthleteOnboarding
        onComplete={() => router.push('/welcome-dashboard')}
        onSkip={() => router.push('/welcome-dashboard')}
      />
    </AuthShell>
  );
}
