'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@clerk/nextjs';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { motion } from 'framer-motion';
import { ClipboardList } from 'lucide-react';
import { useI18n } from '@/features/shared/hooks/useI18n';
import { cn } from '@/lib/utils';

const ROLES = [
  { id: 'coach', label: 'Coach', icon: ClipboardList, desc: 'Manage athletes & create programs' },
];

export default function SignInPage() {
  const router = useRouter();
  const { isSignedIn, isLoaded } = useAuth();
  const [role, setRole] = useState<string | null>(null);
  const { t } = useI18n('common');

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace('/coach');
    }
  }, [isLoaded, isSignedIn, router]);

  const handleSuccess = () => {
    router.push('/coach');
  };

  return (
    <AuthShell title={t('welcome')} subtitle={t('signInSubtitle')}>
      <Suspense fallback={null}>
        {!role ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary text-center mb-2">{t('auth.iAm')}</p>
            <div className="grid grid-col-6 gap-3">
              {ROLES.map((r) => (
                <motion.button
                  key={r.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    'flex flex-col items-center gap-3 p-5 rounded-xl border border-surface-3 bg-surface-1 hover:bg-surface-2 transition-colors text-center',
                    role === r.id && 'border-brand-primary bg-brand-primary/5',
                  )}
                >
                  <r.icon size={28} className="text-brand-primary" />
                  <span className="text-sm font-semibold text-text-primary">{r.label}</span>
                  <span className="text-xs text-text-secondary">{r.desc}</span>
                </motion.button>
              ))}
            </div>
          </div>
        ) : (
          <SignInForm
            onSuccess={handleSuccess}
            onForgotPassword={() => router.push('/forgot-password')}
            onBack={() => setRole(null)}
            role={role}
          />
        )}
      </Suspense>
    </AuthShell>
  );
}