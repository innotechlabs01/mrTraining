'use client';

import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function LandingPage() {
  const t = useTranslations('common');

  return (
    <main className="min-h-screen flex flex-col items-center justify-center bg-surface-0 p-8">
      <div className="max-w-4xl w-full text-center space-y-8">
        <header className="flex justify-end">
          <LanguageSwitcher />
        </header>
        
        <div className="space-y-6">
          <h1 className="text-5xl md:text-7xl font-display font-bold text-text-primary">
            MR Training
          </h1>
          <p className="text-xl md:text-2xl text-text-secondary max-w-2xl mx-auto">
            {t('landing.description')}
          </p>
          
          <div className="flex flex-wrap justify-center gap-4 pt-4">
            <Link
              href="/auth/sign-in"
              className="px-8 py-3 bg-primary text-white font-semibold rounded-lg hover:bg-primary/90 transition-colors"
            >
              {t('signIn')}
            </Link>
            <Link
              href="/auth/sign-up"
              className="px-8 py-3 border-2 border-primary text-primary font-semibold rounded-lg hover:bg-primary/10 transition-colors"
            >
              {t('getStarted')}
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16 max-w-4xl w-full">
          <FeatureCard
            icon="🤖"
            title={t('landing.aiPrograms')}
            description={t('landing.aiProgramsDesc')}
          />
          <FeatureCard
            icon="📊"
            title={t('landing.analytics')}
            description={t('landing.analyticsDesc')}
          />
          <FeatureCard
            icon="👥"
            title={t('landing.teamComm')}
            description={t('landing.teamCommDesc')}
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({ icon, title, description }: { icon: string; title: string; description: string }) {
  return (
    <div className="p-6 bg-surface-100 rounded-xl border border-border-light hover:border-primary/50 transition-colors">
      <span className="text-4xl mb-4 block">{icon}</span>
      <h3 className="text-xl font-semibold text-text-primary mb-2">{title}</h3>
      <p className="text-text-secondary">{description}</p>
    </div>
  );
}