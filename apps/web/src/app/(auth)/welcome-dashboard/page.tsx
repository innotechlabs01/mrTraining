'use client';

import { useRouter } from 'next/navigation';
import { WelcomeDashboard } from '@/features/auth/components/WelcomeDashboard';
import { useAuth } from '@/features/auth/contexts/MockAuthContext';

export default function WelcomeDashboardPage() {
  const router = useRouter();
  const { user } = useAuth();

  const handleGoToDashboard = () => {
      router.push('/coach/plan');
  };

  return (
    <WelcomeDashboard
      userName={user?.name}
      onGoToDashboard={handleGoToDashboard}
    />
  );
}
