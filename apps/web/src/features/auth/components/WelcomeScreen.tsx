'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { cn } from '@/lib/utils';
import { SocialButton } from './SocialButton';

interface WelcomeScreenProps {
  onSignIn: () => void;
  onSignUp: () => void;
}

export function WelcomeScreen({ onSignIn, onSignUp }: WelcomeScreenProps) {
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);
  const { signIn, isLoaded: signInLoaded } = useSignIn();
  const { signUp, isLoaded: signUpLoaded } = useSignUp();

  const handleOAuth = async (strategy: 'oauth_google' | 'oauth_apple') => {
    if (!signInLoaded || !signUpLoaded) return;
    setOauthLoading(strategy);
    try {
      await signIn!.authenticateWithRedirect({
        strategy,
        redirectUrl: '/role-selection',
        redirectUrlComplete: '/role-selection',
      });
    } catch {
      setOauthLoading(null);
    }
  };

  const isLoading = !signInLoaded || !signUpLoaded;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-6"
    >
      <div className="text-center mb-2">
        <h2 className="text-h3 font-display text-text-primary mb-2">
          Welcome to MR Training
        </h2>
        <p className="text-body-sm text-text-secondary">
          The unified coaching platform for modern athletes and coaches.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <SocialButton
          provider="google"
          onClick={() => handleOAuth('oauth_google')}
          isLoading={oauthLoading === 'oauth_google'}
        />
        <SocialButton
          provider="apple"
          onClick={() => handleOAuth('oauth_apple')}
          isLoading={oauthLoading === 'oauth_apple'}
        />
      </div>

      <div className="relative flex items-center gap-3">
        <div className="flex-1 h-px bg-surface-6" />
        <span className="text-caption text-text-secondary uppercase tracking-wider">
          or
        </span>
        <div className="flex-1 h-px bg-surface-6" />
      </div>

      <div className="flex flex-col gap-3">
        <button
          onClick={onSignUp}
          disabled={isLoading}
          className={cn(
            'w-full h-12 rounded-md font-semibold text-body-sm transition-all duration-200',
            'bg-brand-primary text-white',
            'hover:bg-brand-primary-hover active:scale-[0.98]',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading...
            </span>
          ) : (
            'Create Account'
          )}
        </button>

        <p className="text-body-sm text-text-secondary text-center">
          Already have an account?{' '}
          <button
            onClick={onSignIn}
            disabled={isLoading}
            className="text-brand-primary hover:text-brand-primary-light transition-colors font-medium"
          >
            Sign in
          </button>
        </p>
      </div>

      <p className="text-caption text-text-secondary text-center leading-relaxed">
        By continuing, you agree to our{' '}
        <a href="/terms" className="text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors">
          Terms
        </a>{' '}
        and{' '}
        <a href="/privacy" className="text-text-secondary hover:text-text-primary underline underline-offset-2 transition-colors">
          Privacy Policy
        </a>
      </p>
    </motion.div>
  );
}
