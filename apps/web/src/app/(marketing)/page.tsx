'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { HeroSection } from './components/HeroSection';
import { HowItWorksSection } from './components/HowItWorksSection';
import { PlansSection } from './components/PlansSection';
import { FeaturesSection } from './components/FeaturesSection';
import { TestimonialsSection } from './components/TestimonialsSection';

const GO_API_BASE = process.env.NEXT_PUBLIC_GO_API_URL || '';

async function fetchPlans(): Promise<Plan[]> {
  try {
    const res = await fetch(`${GO_API_BASE}/api/v1/plans`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : (data.data || []);
  } catch {
    return [];
  }
}

async function fetchTestimonials(): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${GO_API_BASE}/api/v1/testimonials`, { cache: 'no-store' });
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

  useEffect(() => {
    Promise.all([fetchPlans(), fetchTestimonials()]).then(
      ([plansData, testimonialsData]) => {
        setPlans(plansData);
        setTestimonials(testimonialsData);
        setLoading(false);
      }
    );
  }, []);

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
              <a href="#planes" className="px-4 py-2 rounded-lg bg-brand-primary text-white text-sm font-medium hover:bg-brand-primary/90">
                Empezar gratis
              </a>
            </div>
            <div className="flex items-center gap-2">
              <button className="px-3 py-2 rounded-lg bg-surface-1 border border-surface-2 text-white hover:bg-surface-2 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4.354 4.354 0 00-4.353 4.353c0 .756.216 1.506.598 2.157c.116.792.26 1.603.465 2.31l1.108 1.108c.931.931 2.07 1.418 3.292 1.418 1.175 0 2.356-.476 3.292-1.418l1.108-1.108c.2-.704.344-1.523.465-2.31a10.6 10.6 0 00.598-2.157c0-2.462-1.014-4.712-2.652-6.383a10.6 10.6 0 00-4.06-2.65c-1.026-.527-2.2-.872-3.435-.872-1.23 0-2.408.347-3.435.872a10.6 10.6 0 00-4.06 2.65c-1.637 1.67-2.652 3.92-2.652 6.383zM15.12 13.437l1.635 1.635a1.5 1.5 0 012.122.632c.664-.041 1.235-.528 1.414-1.215l.227-1.08c.063-.302.063-.624 0-.947l-.227-1.08c-.179-.685-.75-1.172-1.414-1.215l-1.635-1.635a1.5 1.5 0 012.122.632c-.664.041-1.235-.528 1.414-1.215l.227 1.08c.063.302.063.624 0 .947l.227 1.08c-.179-.685-.75-1.172-1.414-1.215zM12 2l1.414 1.414L12 4.828l-1.414-1.414L12 2zm0 12l1.414 1.414L12 7.242l-1.414-1.414L12 2zm0 12l1.414 1.414L12 10.414l-1.414-1.414L12 5.414z" /></svg>
              </button>
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
        <div className="max-w-7xl mx-auto rounded-2xl border border-brand-primary/20 bg-brand-primary/5 p-8 md:p-12 text-center">
          <h2 className="text-2xl font-bold text-white mb-4">¿Listo para empezar?</h2>
          <p className="text-text-secondary mb-8">Únete a cientos de coaches que ya usan MR Training</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="#planes" className="flex-1 lg:flex-none px-6 py-4 rounded-xl bg-brand-primary text-white text-lg font-semibold hover:bg-brand-primary/90 transition-colors">
              Empezar gratis
            </Link>
            <a href="#como-funciona" className="flex-1 lg:flex-none px-6 py-4 rounded-lg border border-surface-2 text-white hover:bg-surface-2 transition-colors">
              Más información
            </a>
          </div>
        </div>
      </section>

      <footer className="py-12 px-4 sm:px-6 lg:px-8 border-t border-surface-2">
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
