'use client';

import { useRouter } from 'next/navigation';
import { WelcomeDashboard } from '@/features/auth/components/WelcomeDashboard';
import { useUser } from '@clerk/nextjs';

export default function WelcomeDashboardPage() {
  const router = useRouter();
  const { user } = useUser();

  const handleGoToDashboard = () => {
      router.push('/coach/plan');
  };

  return (
    <WelcomeDashboard
      userName={user?.fullName ?? user?.firstName ?? ''}
      onGoToDashboard={handleGoToDashboard}
    />
  );
}
