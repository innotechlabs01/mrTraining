'use client';

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useI18n } from '@/features/shared/hooks/useI18n';

interface SignInButtonProps {
  className?: string;
  onNavigate?: () => void;
}

export function SignInButton({ className = 'ig-btn ig-btn-solid', onNavigate }: SignInButtonProps) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const { t } = useI18n('common');

  const handleClick = () => {
    onNavigate?.();
    if (!isLoaded) {
      router.push('/sign-in');
      return;
    }
    router.push(isSignedIn ? '/coach' : '/sign-in');
  };

  return (
    <button type="button" className={className} onClick={handleClick}>
      {t('landing.signIn')}
    </button>
  );
}