'use client';

import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { InvitationScreen } from '@/features/auth/components/InvitationScreen';

export default function AthleteInvitePage() {
  const router = useRouter();

  return (
    <AuthShell title="Organization Invitation">
      <InvitationScreen
        type="athlete"
        inviterName="Your Coach"
        onAccept={() => router.push('/welcome-dashboard')}
        onDecline={() => router.push('/')}
      />
    </AuthShell>
  );
}
