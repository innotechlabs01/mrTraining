'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import type { CoachLandingResponse } from '@/features/coach/types';

interface CoachHeroProps {
  coach: CoachLandingResponse;
}

export function CoachHero({ coach }: CoachHeroProps) {
  const router = useRouter();
  return (
    <section className="pt-10 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <div className="lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
          <div className="flex flex-col items-center lg:items-start lg:text-left lg:mb-0 mb-10">
            <div
              className={`
                shrink-0 w-40 h-40 rounded-full border border-white/10
                bg-surface-2 overflow-hidden flex items-center justify-center
              `}
            >
              {coach.coachPhoto ? (
                <Image
                  src={coach.coachPhoto}
                  alt={`${coach.coachName} profile photo`}
                  width={160}
                  height={160}
                  className="object-cover"
                  priority
                  quality={85}
                />
              ) : (
                <span className="text-4xl font-display font-bold text-brand-primary">
                  {coach.coachName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <h1 className="mt-6 text-h1 font-display text-[var(--text)] leading-tight">
              {coach.coachName}
            </h1>
            {coach.specialities.length > 0 && (
              <p className="mt-2 text-body text-[var(--text-secondary)]">
                {coach.specialities.join(' · ')}
              </p>
            )}
          </div>

          <div className="space-y-6">
            <div className="border border-[var(--border)] bg-surface-1 rounded-lg p-6">
              <h2 className="text-h4 font-display text-[var(--text)] mb-4">
                Acerca de
              </h2>
              <p className="text-body text-[var(--text-secondary)] leading-relaxed max-w-40">
                {coach.biography ||
                  'Entrenador dedicado al alto rendimiento deportivo.'}
              </p>
            </div>

            {coach.services.length > 0 && (
              <div className="border border-[var(--border)] bg-surface-1 rounded-lg p-6">
                <h2 className="text-h4 font-display text-[var(--text)] mb-4">
                  Servicios
                </h2>
                <div className="flex flex-wrap gap-3">
                  {coach.services.map((service) => (
                    <Badge
                      key={service}
                      variant="outline"
                      className="text-xs px-3 py-1.5"
                    >
                      {service}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                router.push(`/sign-up?coach=${encodeURIComponent(coach.slug)}`);
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl
                         bg-brand-primary text-[var(--bg)] font-display font-semibold text-body
                         hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2
                         focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2
                         transition-colors"
            >
              {coach.ctaText || 'Comenzar práctica'}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
