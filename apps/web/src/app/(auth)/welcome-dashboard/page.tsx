'use client';

import { useRouter } from 'next/navigation';
import { WelcomeDashboard } from '@/features/auth/components/WelcomeDashboard';

export default function WelcomeDashboardPage() {
  const router = useRouter();

  return (
    <WelcomeDashboard
      onGoToDashboard={() => router.push('/coach')}
    />
  );
}
