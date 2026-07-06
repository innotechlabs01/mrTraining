'use client';

import { useState, Suspense } from 'react';
import { useSignIn } from '@clerk/nextjs';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showMFA, setShowMFA] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaError, setMfaError] = useState<string | null>(null);

  const { signIn, errors, fetchStatus } = useSignIn();
  const router = useRouter();
  const searchParams = useSearchParams();
  const plan = searchParams.get('plan');
  const redirectUrl = plan ? `/dashboard?checkout=${plan}` : '/dashboard';

  const finalizeSignIn = async () => {
    if (signIn.status !== 'complete') return;
    await signIn.finalize({
      navigate: ({ decorateUrl }) => {
        const url = decorateUrl(redirectUrl);
        if (url.startsWith('http')) {
          window.location.href = url;
        } else {
          router.push(url);
        }
      },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);

    if (!email || !password) {
      setGlobalError('Please enter your email and password.');
      return;
    }

    const result = await signIn.password({
      identifier: email,
      password,
    });

    if (result.error) {
      setGlobalError(result.error.message);
      return;
    }

    if (signIn.status === 'needs_second_factor') {
      setShowMFA(true);
      return;
    }

    await finalizeSignIn();
  };

  const handleSocialLogin = async (strategy: 'oauth_google' | 'oauth_github') => {
    const callbackUrl = `${window.location.origin}/login`;
    const { error } = await signIn.sso({
      strategy,
      redirectUrl,
      redirectCallbackUrl: callbackUrl,
    });
    if (error) {
      setGlobalError(error.message);
    }
  };

  const handleMFAVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setMfaError(null);

    const { error } = await signIn.mfa.verifyTOTP({ code: mfaCode });
    if (error) {
      setMfaError(error.message);
      return;
    }

    await finalizeSignIn();
  };

  const identifierError = errors?.fields?.identifier?.message;
  const passwordError = errors?.fields?.password?.message;

  if (showMFA) {
    return (
      <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel — Brand & Metrics */}
        <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-surface-container-lowest overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-electric-orange/5 via-transparent to-performance-blue/5" />
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-electric-orange/10 rounded-full blur-[120px]" />
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-performance-blue/10 rounded-full blur-[100px]" />

          <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
            <div>
              <h1 className="font-display-xl text-5xl xl:text-[64px] xl:leading-[72px] font-extrabold uppercase tracking-tight text-white mb-4">
                Apex<br />
                <span className="text-electric-orange">Performance</span>
              </h1>
              <p className="text-on-surface-variant font-body-lg max-w-sm">
                Elite training. Precision metrics. Engineered for those who refuse to plateau.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
                <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">Active Athletes</p>
                <p className="text-stats-number text-electric-orange font-extrabold">12.4K</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full w-3/4 bg-electric-orange rounded-full" />
                  </div>
                  <span className="text-xs text-performance-blue font-label-bold">+18%</span>
                </div>
              </div>
              <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
                <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">Avg VO2 Max</p>
                <p className="text-stats-number text-performance-blue font-extrabold">54.2</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full w-[85%] bg-performance-blue rounded-full" />
                  </div>
                  <span className="text-xs text-electric-orange font-label-bold">Elite</span>
                </div>
              </div>
              <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
                <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">Workouts Today</p>
                <p className="text-stats-number text-white font-extrabold">3,847</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full w-[62%] bg-gradient-to-r from-electric-orange to-performance-blue rounded-full" />
                  </div>
                  <span className="text-xs text-on-surface-variant font-label-bold">Live</span>
                </div>
              </div>
              <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
                <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">Recovery Rate</p>
                <p className="text-stats-number text-white font-extrabold">92%</p>
                <div className="flex items-center gap-2 mt-2">
                  <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full w-[92%] bg-electric-orange rounded-full" />
                  </div>
                  <span className="text-xs text-electric-orange font-label-bold">Optimal</span>
                </div>
              </div>
            </div>

            <p className="text-xs text-muted-gray font-body-md">&copy; 2026 Apex Performance. All metrics simulated.</p>
          </div>
        </div>

        {/* Right Panel — MFA Form */}
        <div className="flex-1 flex items-center justify-center px-margin-mobile py-12 lg:px-16 xl:px-24">
          <div className="w-full max-w-md">
            <div className="lg:hidden text-center mb-10">
              <h1 className="font-display-xl text-4xl font-extrabold uppercase tracking-tight text-white mb-2">
                Apex <span className="text-electric-orange">Performance</span>
              </h1>
              <p className="text-on-surface-variant text-sm">Two-factor authentication</p>
            </div>

            <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 lg:p-10">
              <h2 className="font-headline-md text-white uppercase mb-2">Verify Your Identity</h2>
              <p className="text-muted-gray font-body-md mb-8">
                Enter the verification code from your authenticator app.
              </p>

              <form className="space-y-6" onSubmit={handleMFAVerification}>
                <div>
                  <label htmlFor="mfa-code" className="block font-label-bold text-on-surface uppercase tracking-widest mb-2">
                    Authentication Code
                  </label>
                  <input
                    id="mfa-code"
                    type="text"
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value)}
                    placeholder="000000"
                    className="w-full px-4 py-3.5 bg-primary-container border border-outline-variant text-on-surface font-body-md rounded-md placeholder:text-muted-gray/50 focus:outline-none focus:border-electric-orange focus:ring-1 focus:ring-electric-orange/30 transition-all duration-200"
                  />
                  {mfaError && <p className="mt-2 text-sm text-error font-body-md">{mfaError}</p>}
                </div>

                <button
                  type="submit"
                  disabled={fetchStatus === 'fetching'}
                  className="w-full py-4 bg-electric-orange text-primary-container font-bold font-headline-md text-sm uppercase tracking-widest rounded-md hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-[0_0_30px_rgba(254,107,0,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {fetchStatus === 'fetching' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
                      Verifying...
                    </span>
                  ) : (
                    'Verify Identity'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowMFA(false); setMfaCode(''); setMfaError(null); }}
                  className="w-full text-center text-sm text-muted-gray hover:text-on-surface font-label-bold transition-colors"
                >
                  Back to sign in
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col lg:flex-row overflow-hidden">
      {/* Left Panel — Brand & Metrics */}
      <div className="hidden lg:flex lg:w-5/12 xl:w-1/2 relative bg-surface-container-lowest overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-electric-orange/5 via-transparent to-performance-blue/5" />
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-electric-orange/10 rounded-full blur-[120px]" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-performance-blue/10 rounded-full blur-[100px]" />

        <div className="relative z-10 flex flex-col justify-between w-full p-12 xl:p-16">
          {/* Brand */}
          <div>
            <h1 className="font-display-xl text-5xl xl:text-[64px] xl:leading-[72px] font-extrabold uppercase tracking-tight text-white mb-4">
              Apex<br />
              <span className="text-electric-orange">Performance</span>
            </h1>
            <p className="text-on-surface-variant font-body-lg max-w-sm">
              Elite training. Precision metrics. Engineered for those who refuse to plateau.
            </p>
          </div>

          {/* Live Metrics Widgets */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
              <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">
                Active Athletes
              </p>
              <p className="text-stats-number text-electric-orange font-extrabold">12.4K</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full w-3/4 bg-electric-orange rounded-full" />
                </div>
                <span className="text-xs text-performance-blue font-label-bold">+18%</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
              <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">
                Avg VO2 Max
              </p>
              <p className="text-stats-number text-performance-blue font-extrabold">54.2</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full w-[85%] bg-performance-blue rounded-full" />
                </div>
                <span className="text-xs text-electric-orange font-label-bold">Elite</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
              <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">
                Workouts Today
              </p>
              <p className="text-stats-number text-white font-extrabold">3,847</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full w-[62%] bg-gradient-to-r from-electric-orange to-performance-blue rounded-full" />
                </div>
                <span className="text-xs text-on-surface-variant font-label-bold">Live</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-lg p-5 border border-outline-variant/30">
              <p className="text-xs uppercase tracking-widest text-muted-gray font-label-bold mb-3">
                Recovery Rate
              </p>
              <p className="text-stats-number text-white font-extrabold">92%</p>
              <div className="flex items-center gap-2 mt-2">
                <div className="h-1 flex-1 bg-surface-container-highest rounded-full overflow-hidden">
                  <div className="h-full w-[92%] bg-electric-orange rounded-full" />
                </div>
                <span className="text-xs text-electric-orange font-label-bold">Optimal</span>
              </div>
            </div>
          </div>

          <p className="text-xs text-muted-gray font-body-md">
            &copy; 2026 Apex Performance. All metrics simulated.
          </p>
        </div>
      </div>

      {/* Right Panel — Login Form */}
      <div className="flex-1 flex items-center justify-center px-margin-mobile py-12 lg:px-16 xl:px-24">
        <div className="w-full max-w-md">
          {/* Mobile Brand (visible only on small screens) */}
          <div className="lg:hidden text-center mb-10">
            <h1 className="font-display-xl text-4xl font-extrabold uppercase tracking-tight text-white mb-2">
              Apex <span className="text-electric-orange">Performance</span>
            </h1>
            <p className="text-on-surface-variant text-sm">Log in to your command center</p>
          </div>

          <div className="bg-surface-container border border-outline-variant/30 rounded-xl p-8 lg:p-10">
            <h2 className="font-headline-md text-white uppercase mb-2">Welcome Back</h2>
            <p className="text-muted-gray font-body-md mb-8">
              Enter your credentials to access your performance dashboard.
            </p>

            {/* Global Error */}
            {globalError && (
              <div className="mb-6 p-4 bg-error-container/20 border border-error/30 rounded-lg">
                <p className="text-sm text-error font-body-md">{globalError}</p>
              </div>
            )}

            {/* Form */}
            <form className="space-y-6" onSubmit={handleEmailLogin}>
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="block font-label-bold text-on-surface uppercase tracking-widest mb-2"
                >
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="athlete@apexperformance.com"
                  disabled={fetchStatus === 'fetching'}
                  className="w-full px-4 py-3.5 bg-primary-container border border-outline-variant text-on-surface font-body-md rounded-md placeholder:text-muted-gray/50 focus:outline-none focus:border-electric-orange focus:ring-1 focus:ring-electric-orange/30 transition-all duration-200 disabled:opacity-50"
                />
                {identifierError && <p className="mt-1 text-sm text-error font-body-md">{identifierError}</p>}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="block font-label-bold text-on-surface uppercase tracking-widest mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  disabled={fetchStatus === 'fetching'}
                  className="w-full px-4 py-3.5 bg-primary-container border border-outline-variant text-on-surface font-body-md rounded-md placeholder:text-muted-gray/50 focus:outline-none focus:border-electric-orange focus:ring-1 focus:ring-electric-orange/30 transition-all duration-200 disabled:opacity-50"
                />
                {passwordError && <p className="mt-1 text-sm text-error font-body-md">{passwordError}</p>}
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-outline-variant bg-primary-container text-electric-orange focus:ring-electric-orange/30"
                  />
                  <span className="text-sm text-muted-gray font-body-md">Remember me</span>
                </label>
                <a href="#" className="text-sm text-electric-orange hover:text-performance-blue font-label-bold transition-colors">
                  Forgot password?
                </a>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={fetchStatus === 'fetching'}
                className="w-full py-4 bg-electric-orange text-primary-container font-bold font-headline-md text-sm uppercase tracking-widest rounded-md hover:brightness-110 active:scale-[0.98] transition-all duration-200 shadow-[0_0_30px_rgba(254,107,0,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {fetchStatus === 'fetching' ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-5 h-5 border-2 border-primary-container border-t-transparent rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : (
                  'Access Command Center'
                )}
              </button>

              {/* Divider */}
              <div className="relative my-8">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-outline-variant/40" />
                </div>
                <div className="relative flex justify-center">
                  <span className="px-4 bg-surface-container text-xs text-muted-gray font-label-bold uppercase tracking-widest">
                    Or continue with
                  </span>
                </div>
              </div>

              {/* Social Login Buttons */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => handleSocialLogin('oauth_google')}
                  disabled={fetchStatus === 'fetching'}
                  className="flex items-center justify-center gap-3 py-3 bg-surface-container-highest border border-outline-variant/30 rounded-md text-on-surface font-label-bold text-sm hover:bg-surface-container-high hover:border-performance-blue/50 transition-all duration-200 disabled:opacity-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => handleSocialLogin('oauth_github')}
                  disabled={fetchStatus === 'fetching'}
                  className="flex items-center justify-center gap-3 py-3 bg-surface-container-highest border border-outline-variant/30 rounded-md text-on-surface font-label-bold text-sm hover:bg-surface-container-high hover:border-electric-orange/50 transition-all duration-200 disabled:opacity-50"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="text-white">
                    <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>
            </form>

            {/* Sign Up Link */}
            <p className="text-center text-sm text-muted-gray font-body-md mt-8">
              Don&apos;t have an account?{' '}
              <Link
                href="/sign-up"
                className="text-performance-blue hover:text-electric-orange font-label-bold transition-colors"
              >
                Start your assessment
              </Link>
            </p>
          </div>

          {/* Back to landing */}
          <div className="text-center mt-8">
            <Link
              href="/"
              className="text-muted-gray hover:text-on-surface font-label-bold text-sm uppercase tracking-widest transition-colors inline-flex items-center gap-2"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-electric-orange border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginContent />
    </Suspense>
  );
}
