import { Suspense } from 'react';
import { Metadata } from 'next';
import { InvitePageClient } from './InvitePageClient';

export const metadata: Metadata = {
  title: 'Únete a MR Training',
  description: 'Únete al equipo de tu coach en MR Training',
};

export default function InvitePage() {
  return (
    <Suspense fallback={null}>
      <InvitePageClient />
    </Suspense>
  );
}
