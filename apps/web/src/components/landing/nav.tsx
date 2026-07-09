'use client';

import { useState, useEffect } from 'react';
import { motion, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { scrollY } = useScroll();
  let lastScrollY = 0;

  useMotionValueEvent(scrollY, 'change', (current: number) => {
    setScrolled(current > window.innerHeight * 0.4);
    if (current > lastScrollY && current > 100) {
      setHidden(true);
    } else {
      setHidden(false);
    }
    lastScrollY = current;
  });

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  return (
    <>
      <motion.header
        className={cn(
          'fixed top-0 left-0 right-0 z-50 transition-colors duration-500',
          scrolled
            ? 'bg-surface-0/80 backdrop-blur-xl border-b border-surface-6'
            : 'bg-transparent'
        )}
        initial={{ y: 0 }}
        animate={{ y: hidden ? -80 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <nav className="section-container flex items-center justify-between h-16">
          <a href="#" aria-label="MR Training Home">
            <Logo />
          </a>

          <div className="hidden md:flex items-center gap-6">
            <a
              href="#features"
              className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Features
            </a>
            <a
              href="#pricing"
              className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Pricing
            </a>
            <a
              href="#faq"
              className="text-body-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              FAQ
            </a>
            <a
              href="/sign-in"
              className="text-body-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
            >
              Sign In
            </a>
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center h-10 px-5 text-body-sm font-semibold rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover active:bg-brand-primary-pressed transition-colors"
            >
              Get Started
            </a>
          </div>

          <button
            className="md:hidden p-2 text-text-secondary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </motion.header>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-surface-0 md:hidden">
          <div className="flex flex-col items-center justify-center h-full gap-8">
            <a href="#features" className="text-h3 text-text-primary" onClick={() => setMobileOpen(false)}>Features</a>
            <a href="#pricing" className="text-h3 text-text-primary" onClick={() => setMobileOpen(false)}>Pricing</a>
            <a href="#faq" className="text-h3 text-text-primary" onClick={() => setMobileOpen(false)}>FAQ</a>
            <a href="/sign-in" className="text-h3 text-text-secondary" onClick={() => setMobileOpen(false)}>Sign In</a>
            <a
              href="/sign-up"
              className="inline-flex items-center justify-center h-12 px-8 text-body font-semibold rounded-sm bg-brand-primary text-text-inverse"
              onClick={() => setMobileOpen(false)}
            >
              Get Started
            </a>
          </div>
        </div>
      )}
    </>
  );
}
