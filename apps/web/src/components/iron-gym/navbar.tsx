'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dumbbell, Menu, X } from 'lucide-react';

const mainLinks = [
  { label: 'Home', href: '#home' },
  { label: 'Sobre MAO', href: '#about' },
  { label: 'Asesoría Online', href: '/planes' },
  { label: 'Planes', href: '/planes' },
  { label: 'Testimonios', href: '#testimonials' },
  { label: 'Contacto', href: '#contact-us' },
];

export function IronGymNavbar() {
  const router = useRouter();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const handleAnchorClick = (href: string) => {
    if (href.startsWith('#')) {
      const element = document.querySelector(href);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      router.push(href);
    }
    setMobileOpen(false);
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-colors duration-300 ${
        scrolled
          ? 'bg-[#0A0A0A]/80 backdrop-blur-md border-b border-white/5'
          : 'bg-transparent'
      }`}
    >
      <nav className="max-w-7xl mx-auto h-[72px] md:h-[88px] px-4 md:px-6 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 text-white">
          <Dumbbell className="w-7 h-7 md:w-8 md:h-8 text-brand-primary" />
          <span className="text-lg md:text-xl font-bold tracking-tight">
            MR<span className="text-brand-primary">Training</span>
          </span>
        </a>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-8">
          {mainLinks.map((l) => (
            <a
              key={l.label}
              onClick={(e) => {
                e.preventDefault();
                handleAnchorClick(l.href);
              }}
              className="text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white cursor-pointer"
            >
              {l.label}
            </a>
          ))}

          <a
            href="#contact-us"
            onClick={(e) => {
              e.preventDefault();
              handleAnchorClick('#contact-us');
            }}
            className="text-sm font-medium transition-colors text-[#9e9e9e] hover:text-white cursor-pointer"
          >
            Contact
          </a>
        </div>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
            <button
             onClick={() => router.push('/sign-in')}
             className="px-5 py-3 rounded-md border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
           >
             Iniciar sesión
           </button>
          <a
            href="#contact-us"
            onClick={(e) => {
              e.preventDefault();
              handleAnchorClick('#contact-us');
            }}
            className="px-6 py-3 rounded-md bg-white text-[#212121] text-sm font-semibold hover:bg-gray-100 transition-colors"
          >
            Get Started
          </a>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden text-white p-2"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
        >
          {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </nav>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 top-[72px] bg-[#0A0A0A] z-49 overflow-y-auto">
          <div className="flex flex-col px-6 py-8 gap-1">
            {mainLinks.map((l) => (
              <a
                key={l.label}
                href={l.href}
                onClick={(e) => { e.preventDefault(); handleAnchorClick(l.href); }}
                className="text-lg font-semibold text-white py-3 border-b border-white/10"
              >
                {l.label}
              </a>
            ))}

            <a
              href="#contact-us"
              onClick={(e) => { e.preventDefault(); handleAnchorClick('#contact-us'); }}
              className="text-lg font-semibold text-white py-3 border-b border-white/10"
            >
              Contact
            </a>

            <div className="flex flex-col gap-3 mt-6">
              <button
                onClick={() => { router.push('/sign-in'); setMobileOpen(false); }}
                className="w-full px-5 py-3 rounded-md border border-white/30 text-white text-sm font-semibold hover:bg-white/10 transition-colors"
              >
               Iniciar sesión
              </button>
              <a
                href="#contact-us"
                onClick={(e) => { e.preventDefault(); handleAnchorClick('#contact-us'); }}
                className="w-full px-6 py-3 rounded-md bg-white text-[#212121] text-sm font-semibold hover:bg-gray-100 transition-colors text-center"
              >
                Get Started
              </a>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}