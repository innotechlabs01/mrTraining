'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useUser } from '@clerk/nextjs';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { resolveRole, isSuperAdmin, fetchCoachSubscriptionStatus } from '@/app/(auth)/sign-up/signUpGuard';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { PlansSection } from './components/PlansSection';
import { FeaturesSection } from './components/FeaturesSection';
import { TestimonialsSection } from './components/TestimonialsSection';

const GO_API_BASE = process.env.NEXT_PUBLIC_GO_API_URL || '';

async function fetchPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${GO_API_BASE}/public/plans`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch {
    return [];
  }
}

async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${GO_API_BASE}/public/testimonials`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch {
    return [];
  }
}

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  max_athletes: number;
  max_sessions_per_week: number;
  is_active: boolean;
  coach_id: string;
  trm: number;
  features?: string[];
}

interface Testimonial {
  id: string;
  name: string;
  role: string;
  text: string;
  stars: number;
}

const NAV_LINKS = [
  { name: 'Planes', href: '#planes' },
  { name: 'Cómo funciona', href: '#como-funciona' },
  { name: 'Características', href: '#caracteristicas' },
  { name: 'Testimonios', href: '#testimonios' },
  { name: 'Contacto', href: '#contacto' },
];

export default function MarketingLandingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const { isSignedIn, isLoaded, sessionClaims, userId } = useAuth();
  const { user } = useUser();
  const [ctaDestination, setCtaDestination] = useState<string | null>(null);
  const [ctaChecking, setCtaChecking] = useState(false);

  useEffect(() => {
    Promise.all([fetchPlans(), fetchTestimonials()]).then(
      ([plansData, testimonialsData]) => {
        setPlans(plansData);
        setTestimonials(testimonialsData);
        setLoading(false);
      }
    );
  }, []);

  // Resuelve el destino del CTA según la sesión de Clerk (client-side,
  // sin flash del CTA de no-sesión antes de saber si hay sesión).
  useEffect(() => {
    if (!isLoaded) {
      setCtaDestination(null);
      return;
    }
    if (!isSignedIn) {
      setCtaDestination('/sign-up?trial=true');
      return;
    }

    const metadataRole = resolveRole(sessionClaims, user);
    const id = userId ?? user?.id;
    const isSuperAdminUser = isSuperAdmin(id, metadataRole);

    if (isSuperAdminUser || metadataRole === 'coach') {
      setCtaChecking(true);
      let cancelled = false;
      fetchCoachSubscriptionStatus().then((result) => {
        if (cancelled) return;
        setCtaChecking(false);
        setCtaDestination(
          result === 'paid'
            ? '/coach/plan'
            : '/payment/interstitial?plan=plan-seed-starter',
        );
      }).catch(() => {
        if (cancelled) return;
        setCtaChecking(false);
        setCtaDestination('/payment/interstitial?plan=plan-seed-starter');
      });
      return () => {
        cancelled = true;
      };
    }

    // Sin rol (atleta): se queda en la landing pública, sin redirección.
    setCtaDestination(null);
  }, [isLoaded, isSignedIn, sessionClaims, userId, user]);

  const ctaLoading = !isLoaded || ctaChecking;

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="bg-[#0a0a0a] text-text-primary min-h-screen font-sans">
      <nav className="fixed w-full z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-white/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-sm">
                M
              </div>
              <span className="text-xl font-bold text-white tracking-tight">
                MR<span className="text-brand-primary">Training</span>
              </span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              {NAV_LINKS.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => scrollToSection(link.href.slice(1))}
                  className="text-sm text-gray-400 hover:text-white transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </div>
            <div className="flex items-center gap-3">
              {isSignedIn ? (
                <Cta loading={ctaLoading} href={ctaDestination} className="whitespace-nowrap px-4 h-10">
                  Ir a mi Dashboard
                </Cta>
              ) : (
                <>
                  <Link
                    href="/sign-in"
                    className="text-sm font-medium text-gray-300 hover:text-white px-3 py-2 rounded-md transition-colors"
                  >
                    Iniciar sesión
                  </Link>
                  <Link
                    href="/sign-up?trial=true"
                    className="flex h-10 items-center justify-center px-4 rounded-md bg-brand-primary text-white text-sm font-semibold hover:bg-brand-primary/90 transition-colors whitespace-nowrap shadow-sm shadow-brand-primary/20"
                  >
                    Prueba gratis (7 días)
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      <HeroSection />
      <HowItWorksSection />
      <PlansSection plans={plans} loading={loading} />
      <FeaturesSection />
      <TestimonialsSection testimonials={testimonials} loading={loading} />
      <section id="contacto" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto rounded-lg border border-brand-primary/20 bg-brand-primary/5 p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">¿Listo para empezar?</h2>
          <p className="text-text-secondary mb-8">Únete a cientos de coaches que ya usan MR Training</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Cta loading={ctaLoading} href={ctaDestination} className="flex-1 lg:flex-none px-6 py-4 rounded-xl text-lg font-semibold">
              Comenzar prueba gratis de 7 días
            </Cta>
            <a href="#como-funciona" className="flex-1 lg:flex-none px-6 py-4 rounded-lg border border-surface-6 text-white hover:bg-surface-2 transition-colors">
              Más información
            </a>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-surface-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-brand-primary flex items-center justify-center text-white font-bold text-xs">
              M
            </div>
            <span className="text-sm font-bold text-white tracking-tight">
              MR<span className="text-brand-primary">Training</span>
            </span>
          </div>
          <div className="text-xs text-gray-400">
            © 2026 MR Training. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
}

/**
 * CTA condicional. Durante la resolución de la sesión muestra un spinner
 * (nunca el CTA de no-sesión, para evitar flash y redirección). Cuando no
 * hay destino (usuario sin rol), renderiza un botón no clickeable.
 */
function Cta({
  children,
  className,
  loading,
  href,
}: {
  children: React.ReactNode;
  className?: string;
  loading: boolean;
  href: string | null;
}) {
  if (loading) {
    return (
      <button
        type="button"
        disabled
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-md bg-surface-2 text-text-secondary cursor-not-allowed',
          className,
        )}
      >
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
      </button>
    );
  }
  if (!href) {
    return (
      <button
        type="button"
        className={cn(
          'flex h-12 w-full items-center justify-center gap-2 rounded-md bg-surface-2 text-text-secondary cursor-not-allowed',
          className,
        )}
      >
        {children}
      </button>
    );
  }
  return (
    <a href={href} className={cn('flex h-12 w-full items-center justify-center gap-2 rounded-md bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90 transition-colors', className)}>
      {children}
    </a>
  );
}
