'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { CoachOnboarding } from '@/features/auth/components/CoachOnboarding';

export default function CoachOnboardingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  // The profile is saved by the onboarding itself; the only thing left to do
  // is to land the coach in the coach area — never in the public landing.
  const handleComplete = () => {
    router.push('/coach/plan');
  };

  return (
    <AuthShell title="Configura tu perfil" subtitle="Cuéntanos sobre tu experiencia como coach">
      <CoachOnboarding
        selectedPlan={plan || undefined}
        onComplete={handleComplete}
        onSkip={() => router.push('/coach/plan')}
      />
    </AuthShell>
  );
}
