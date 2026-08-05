'use client';

import { Suspense, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AuthShell } from '@/features/auth/components/AuthShell';
import { SignInForm } from '@/features/auth/components/SignInForm';
import { motion } from 'framer-motion';
import { Dumbbell, ClipboardList } from 'lucide-react';
import { cn } from '@/lib/utils';

const ROLES = [
  { id: 'athlete', label: 'Athlete', icon: Dumbbell, desc: 'Track your training & follow programs' },
  { id: 'coach', label: 'Coach', icon: ClipboardList, desc: 'Manage athletes & create programs' },
];

export default function SignInPage() {
  const router = useRouter();
  const [role, setRole] = useState<string | null>(null);

  const handleSuccess = () => {
    if (role === 'coach') {
      router.push('/coach/plan');
    } else {
      router.push('/athlete/plan');
    }
  };

  return (
    <AuthShell title="Welcome back" subtitle="Sign in to your MR Training account">
      <Suspense fallback={null}>
        {!role ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-text-secondary text-center mb-2">I am a:</p>
            <div className="grid grid-cols-2 gap-3">
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
            <button
              onClick={() => setRole('athlete')}
              className="mt-2 text-xs text-text-muted hover:text-text-secondary transition-colors"
            >
              Skip & continue as Athlete
            </button>
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