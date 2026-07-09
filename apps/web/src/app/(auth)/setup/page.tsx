'use client';

import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { ProfileSetupForm } from '@/features/auth/components/ProfileSetupForm';

export default function SetupPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();

  return (
    <AuthShell title="Complete your profile" subtitle="Help others recognize you on MR Training">
      {isLoaded && (
        <ProfileSetupForm
          initialData={{
            firstName: user?.firstName ?? '',
            lastName: user?.lastName ?? '',
          }}
          onSubmit={() => router.push('/role-selection')}
        />
      )}
    </AuthShell>
  );
}
