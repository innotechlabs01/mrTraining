'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { SignUp } from '@clerk/nextjs';

function SignUpContent() {
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');

  const redirectUrl = plan
    ? `/dashboard?checkout=${plan}`
    : '/dashboard';

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignUp
        forceRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-surface-container border border-outline-variant/30 shadow-2xl',
            headerTitle: 'text-on-surface',
            headerSubtitle: 'text-muted-gray',
            socialButtonsBlockButton:
              'bg-surface-container-highest border-outline-variant/30 text-on-surface hover:bg-surface-bright',
            formFieldLabel: 'text-on-surface',
            formFieldInput:
              'bg-primary-container border-outline-variant text-on-surface rounded-md',
            dividerLine: 'bg-outline-variant',
            dividerText: 'text-muted-gray',
            formButtonPrimary: 'bg-electric-orange hover:brightness-110 rounded-md',
            footerActionLink: 'text-performance-blue hover:text-electric-orange',
          },
        }}
      />
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <div className="w-8 h-8 border-2 border-electric-orange border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  );
}
