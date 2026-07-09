'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { ArrowRight, Sparkles } from 'lucide-react';

interface Particle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speedX: number;
  speedY: number;
}

export function FinalCTASection() {
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
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      <div className="section-container relative z-10">
        <SectionReveal>
          <div className="max-w-3xl mx-auto text-center">
            <FadeInView>
              <motion.div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-primary/10 border border-brand-primary/20 text-brand-primary text-body-sm font-semibold mb-6"
                whileHover={{ scale: 1.05 }}
              >
                <Sparkles className="w-4 h-4" />
                Start your 14-day free trial
              </motion.div>
            </FadeInView>

            <FadeInView delay={0.1}>
              <h2 className="font-display font-bold text-h1 lg:text-[4rem] leading-tight text-text-primary mb-6">
                Ready to transform
                <br />
                <span className="text-gradient">how you coach?</span>
              </h2>
            </FadeInView>

            <FadeInView delay={0.2}>
              <p className="text-body-lg text-text-tertiary max-w-xl mx-auto mb-10">
                Join thousands of coaches and athletes who have already made the switch.
                No credit card required.
              </p>
            </FadeInView>

            <FadeInView delay={0.3}>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <motion.a
                  href="#"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-brand-primary text-white font-semibold text-body"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Start free trial
                  <ArrowRight className="w-5 h-5" />
                </motion.a>
                <motion.a
                  href="#"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-lg bg-surface-3 text-text-primary font-semibold text-body border border-surface-6 hover:bg-surface-4 transition-colors duration-300"
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.97 }}
                >
                  Talk to sales
                </motion.a>
              </div>
            </FadeInView>

            <FadeInView delay={0.4}>
              <p className="text-body-sm text-text-tertiary mt-6">
                Free 14-day trial &bull; Cancel anytime &bull; No credit card for Starter
              </p>
            </FadeInView>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}