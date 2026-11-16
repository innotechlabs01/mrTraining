'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { useI18n } from '@/features/shared/hooks/useI18n';
import { resolveRole, isSuperAdmin } from '@/app/(auth)/sign-up/signUpGuard';
import { destinationFor } from './destinationFor';

export default function SignInPage() {
  const { t } = useI18n('common');

  return (
    <AuthShell title={t('welcome')} subtitle={t('signInSubtitle')}>
      <Suspense fallback={null}>
        <SignInContent />
      </Suspense>
    </AuthShell>
  );
}

function SignInContent() {
  const router = useRouter();
  const { isSignedIn, isLoaded, sessionClaims, userId } = useAuth();
  const { user } = useUser();
  const searchParams = useSearchParams();

  /**
   * Resolves where a signed-in user belongs.
   *
   * The role comes from the Clerk PUBLIC metadata, which only the Go API
   * writes — the client cannot forge it.
   */
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    const metadataRole = resolveRole(sessionClaims, user);
    const id = userId ?? user?.id;
    const isSuperAdminUser = isSuperAdmin(id, metadataRole);

    if (isSuperAdminUser) {
      router.replace(destinationFor(searchParams, true, metadataRole));
      return;
    }

    if (metadataRole === 'coach') {
      router.replace(destinationFor(searchParams, false, metadataRole));
      return;
    }

    if (!user) {
      // Role still undetermined and the user object has not arrived yet —
      // keep waiting instead of guessing. The effect re-runs once `user`
      // loads.
      return;
    }

    // Athletes live on mobile and users without a role belong on the public
    // landing. Never /coach or /sign-in: the middleware bounces both back.
    router.replace(destinationFor(searchParams, false, metadataRole));
  }, [isLoaded, isSignedIn, sessionClaims, userId, user, router, searchParams]);

  // NOTE: SignInForm calls this the instant attemptFirstFactor() completes —
  // Clerk's session state (and sessionClaims) may not have propagated yet, so
  // reading roles here can be stale. We only act when the role is unambiguous;
  // otherwise the effect above routes once isSignedIn flips.
  const handleSuccess = () => {
    const metadataRole = resolveRole(sessionClaims, user);
    const id = userId ?? user?.id;
    const isSuperAdminUser = isSuperAdmin(id, metadataRole);

    if (isSuperAdminUser) {
      router.push(destinationFor(searchParams, true, metadataRole));
    } else if (metadataRole === 'coach') {
      router.push(destinationFor(searchParams, false, metadataRole));
    }
    // Unknown role: do nothing, let the effect decide.
  };

  // An already signed-in user never sees the sign-in form: they are routed to
  // their own home. The "Ya tienes una sesión activa" error is gone.
  if (isLoaded && isSignedIn) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
      </div>
    );
  }

  return (
    <SignInForm
      onSuccess={handleSuccess}
      onForgotPassword={() => router.push('/forgot-password')}
    />
  );
}
