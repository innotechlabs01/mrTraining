'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence } from 'framer-motion';
import { SplashScreen } from '@/features/auth/components/SplashScreen';
import { WelcomeScreen } from '@/features/auth/components/WelcomeScreen';

export default function WelcomePage() {
  const [showSplash, setShowSplash] = useState(true);
  const router = useRouter();

  if (showSplash) {
    return (
      <AnimatePresence mode="wait">
        <SplashScreen onComplete={() => setShowSplash(false)} />
      </AnimatePresence>
    );
  }

  return (
    <WelcomeScreen
      onSignIn={() => router.push('/sign-in')}
      onSignUp={() => router.push('/sign-up')}
    />
  );
}
