'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { ArrowRight, Flame } from 'lucide-react';
import { useLang } from './i18n';

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
}

export function FinalCTACSection() {
  const { txt } = useLang();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = 40;
    particlesRef.current = Array.from({ length: count }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.5 + 0.1,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
    }));

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        p.x += p.speedX;
        p.y += p.speedY;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 107, 0, ${p.opacity})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <section id="cta" className="relative py-32 lg:py-48 bg-surface-0 overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-primary/15 rounded-full blur-[200px] animate-fire-flicker" />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
      <div className="grain" />

      <div className="section-container relative z-10">
        <SectionReveal>
          <div className="max-w-3xl mx-auto text-center">
            <FadeInView>
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/30 text-brand-primary text-body-sm font-semibold mb-6 uppercase"
                whileHover={{ scale: 1.05 }}
              >
                <Flame className="w-4 h-4" />
                {txt('Empieza gratis 14 días', 'Start your 14-day free trial')}
              </motion.div>
            </FadeInView>

            <FadeInView delay={0.1}>
              <h2 className="font-display font-black text-h1 lg:text-[5rem] leading-[0.95] text-text-primary mb-6 uppercase">
                {txt('Tu mejor versión', 'Your best version')}
                <br />
                <span className="text-gradient-fire">{txt('te está esperando', 'is waiting')}</span>
              </h2>
            </FadeInView>

            <FadeInView delay={0.2}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto mb-10">
                {txt('Únete a miles de coaches y atletas que ya hicieron el cambio. Sin tarjeta.', 'Join thousands of coaches and athletes who already made the switch. No credit card required.')}
              </p>
            </FadeInView>

            <FadeInView delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.a
                  href="/sign-up"
                  className="inline-flex items-center gap-2 px-10 py-4 rounded-sm bg-brand-primary text-text-inverse font-bold text-body uppercase animate-glow-pulse"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  {txt('Empieza gratis', 'Start free')}
                  <ArrowRight className="w-5 h-5" />
                </motion.a>
              </div>
            </FadeInView>

            <FadeInView delay={0.4}>
              <p className="text-body-sm text-text-tertiary mt-6">
                {txt('Prueba 14 días · Cancela cuando quieras · Sin tarjeta en Starter', 'Free 14-day trial · Cancel anytime · No card for Starter')}
              </p>
            </FadeInView>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
