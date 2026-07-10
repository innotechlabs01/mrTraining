'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence, useScroll, useMotionValueEvent } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { Logo } from './logo';
import { cn } from '@/lib/utils';
import { useLang } from './i18n';

export function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { lang, setLang, txt } = useLang();
  const { scrollY } = useScroll();
  const lastScrollY = useRef(0);

  useMotionValueEvent(scrollY, 'change', (current: number) => {
    setScrolled(current > window.innerHeight * 0.4);
    if (current > lastScrollY.current && current > 100) setHidden(true);
    else setHidden(false);
    lastScrollY.current = current;
  });

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? 'hidden' : '';
  }, [mobileOpen]);

  const links = [
    { href: '#deportes', label: txt('Deportes', 'Sports') },
    { href: '#precios', label: txt('Precios', 'Pricing') },
    { href: '#retos', label: txt('Retos', 'Challenges') },
    { href: '#eventos', label: txt('Eventos', 'Events') },
  ];

  return (
    <>
      <motion.header
        className={cn('fixed top-0 left-0 right-0 z-50 transition-colors duration-500 border-b border-brand-primary/10', scrolled ? 'bg-surface-0/80 backdrop-blur-xl border-white/5' : 'bg-transparent')}
        initial={{ y: 0 }}
        animate={{ y: hidden ? -80 : 0 }}
        transition={{ duration: 0.3 }}
      >
        <nav className="section-container flex items-center justify-between h-16">
          <a href="#" aria-label="MR Training Home"><Logo /></a>

          <div className="hidden md:flex items-center gap-6">
            {links.map((l) => (
              <a key={l.href} href={l.href} className="text-body-sm text-text-secondary hover:text-text-primary transition-colors">{l.label}</a>
            ))}
            <button
              onClick={() => setLang(lang === 'es' ? 'en' : 'es')}
              className="text-body-sm font-semibold text-text-secondary hover:text-brand-primary transition-colors border border-white/10 rounded-md px-2 py-1"
              aria-label={txt('Cambiar idioma', 'Toggle language')}
            >
              {lang === 'es' ? 'EN' : 'ES'}
            </button>
            <a href="/sign-in" className="inline-flex items-center justify-center h-10 px-5 text-body-sm font-semibold rounded-sm bg-brand-primary text-text-inverse hover:bg-brand-primary-hover active:bg-brand-primary-pressed transition-colors animate-glow-pulse fire-border-glow">
              {txt('Entrenar gratis', 'Train free')}
            </a>
          </div>

          <button className="md:hidden p-2 text-text-secondary" onClick={() => setMobileOpen(!mobileOpen)} aria-label={txt('Abrir menú', 'Toggle menu')}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </nav>
      </motion.header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 bg-surface-0 border border-brand-primary/20 fire-border-glow md:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <motion.div
              className="flex flex-col items-center justify-center h-full gap-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.2, delay: 0.05 }}
            >
              {links.map((l) => (
                <a key={l.href} href={l.href} className="text-h3 text-text-primary" onClick={() => setMobileOpen(false)}>{l.label}</a>
              ))}
              <button
                onClick={() => { setLang(lang === 'es' ? 'en' : 'es'); setMobileOpen(false); }}
                className="text-h3 text-text-secondary border border-white/10 rounded-md px-4 py-2"
              >
                {txt('Idioma: Español', 'Language: English')}
              </button>
              <a href="/sign-in" className="inline-flex items-center justify-center h-12 px-8 text-body font-semibold rounded-sm bg-brand-primary text-text-inverse" onClick={() => setMobileOpen(false)}>
                {txt('Entrenar gratis', 'Train free')}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
