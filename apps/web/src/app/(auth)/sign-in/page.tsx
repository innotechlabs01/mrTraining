'use client';

import { Suspense, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { useI18n } from '@/features/shared/hooks/useI18n';

const SUPER_ADMIN_IDS = (process.env.NEXT_PUBLIC_SUPER_ADMIN_CLERK_IDS || '').split(',').filter(Boolean);

export default function SignInPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded, sessionClaims, userId } = useAuth();
  const { user } = useUser();
  const { t } = useI18n('common');

  /**
   * Resolves where a signed-in user belongs.
   *
   * The role comes from the Clerk PUBLIC metadata, which only the Go API
   * writes — the client cannot forge it. A coach that has not finished the
   * activation flow yet is sent to the onboarding instead of the dashboard.
   */
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    // sessionClaims are on the session token, so they are available as soon
    // as the session exists. The `user` object can still be loading and was
    // what stalled this redirect after POST /sign-in.
    const claims = sessionClaims as { publicMetadata?: Record<string, unknown> } | null | undefined;
    const metadataRole = (claims?.publicMetadata?.role ??
      (user?.publicMetadata as Record<string, unknown> | undefined)?.role) as string | undefined;
    const id = userId ?? user?.id;
    const isSuperAdmin = (id !== undefined && SUPER_ADMIN_IDS.includes(id)) || metadataRole === 'super_admin';

    if (isSuperAdmin) {
      router.replace('/admin/dashboard');
      return;
    }

    if (metadataRole === 'coach') {
      router.replace('/coach/plan');
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
    router.replace('/');
  }, [isLoaded, isSignedIn, sessionClaims, userId, user, router]);

  // NOTE: SignInForm calls this the instant attemptFirstFactor() completes —
  // Clerk's session state (and sessionClaims) may not have propagated yet, so
  // reading roles here can be stale. We only act when the role is unambiguous;
  // otherwise the effect above routes once isSignedIn flips.
  const handleSuccess = () => {
    const claims = sessionClaims as { publicMetadata?: Record<string, unknown> } | null | undefined;
    const metadataRole = (claims?.publicMetadata?.role ??
      (user?.publicMetadata as Record<string, unknown> | undefined)?.role) as string | undefined;
    const id = userId ?? user?.id;
    const isSuperAdmin = (id !== undefined && SUPER_ADMIN_IDS.includes(id)) || metadataRole === 'super_admin';

    if (isSuperAdmin) {
      router.push('/admin/dashboard');
    } else if (metadataRole === 'coach') {
      router.push('/coach/plan');
    }
    // Unknown role: do nothing, let the effect decide.
  };

  // An already signed-in user never sees the sign-in form: they are routed to
  // their own home. The "Ya tienes una sesión activa" error is gone.
  if (isLoaded && isSignedIn) {
    return (
      <AuthShell title={t('welcome')} subtitle={t('signInSubtitle')}>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-brand-primary"></div>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t('welcome')} subtitle={t('signInSubtitle')}>
      <Suspense fallback={null}>
        <SignInForm
          onSuccess={handleSuccess}
          onForgotPassword={() => router.push('/forgot-password')}
        />
      </Suspense>
    </AuthShell>
  );
}
