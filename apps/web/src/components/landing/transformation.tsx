'use client';

import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { GripHorizontal } from 'lucide-react';

export function TransformationSection() {
  const [position, setPosition] = useState(50);
  const sectionRef = useRef<HTMLDivElement>(null);

  const handleDrag = (_: any, info: { delta: { x: number } }) => {
    const sectionWidth = sectionRef.current?.offsetWidth ?? 1000;
    const deltaPercent = (info.delta.x / sectionWidth) * 100;
    setPosition(prev => Math.min(90, Math.max(10, prev + deltaPercent)));
  };

  return (
    <section ref={sectionRef} className="relative min-h-[80vh] bg-surface-0 overflow-hidden">
      <div className="relative h-full">
        {/* Left panel: The Old Way */}
        <div
          className="absolute inset-0 bg-surface-2"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
        >
          <div className="section-container h-full flex items-center">
            <div className="max-w-lg">
              <p className="font-display text-overline text-text-tertiary uppercase tracking-[0.1em] mb-6">
                The Old Way
              </p>
              <h3 className="font-display font-bold text-h3 text-text-secondary mb-6">
                Juggling 5 apps and a spreadsheet.
              </h3>
              <ul className="space-y-4 text-body text-text-tertiary">
                <li className="flex items-start gap-3">
                  <span className="text-error mt-1">✕</span>
                  Workouts in one app, nutrition in another
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-error mt-1">✕</span>
                  Messages lost across WhatsApp, email, and SMS
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-error mt-1">✕</span>
                  Invoicing done manually every month
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-error mt-1">✕</span>
                  No way to see an athlete&apos;s full picture
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-error mt-1">✕</span>
                  Data scattered, insights impossible
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Right panel: With MR Training */}
        <div
          className="absolute inset-0 bg-surface-0"
          style={{ clipPath: `inset(0 0 0 ${position}%)` }}
        >
          <div className="section-container h-full flex items-center justify-end text-right">
            <div className="max-w-lg">
              <p className="font-display text-overline text-brand-primary uppercase tracking-[0.1em] mb-6">
                With MR Training
              </p>
              <h3 className="font-display font-bold text-h3 text-text-primary mb-6">
                One platform. Total clarity.
              </h3>
              <ul className="space-y-4 text-body text-text-secondary">
                <li className="flex items-start justify-end gap-3">
                  Everything in one place — training, nutrition, recovery
                  <span className="text-success mt-1">✓</span>
                </li>
                <li className="flex items-start justify-end gap-3">
                  Built-in messaging keeps communication organized
                  <span className="text-success mt-1">✓</span>
                </li>
                <li className="flex items-start justify-end gap-3">
                  Automated billing — get paid without lifting a finger
                  <span className="text-success mt-1">✓</span>
                </li>
                <li className="flex items-start justify-end gap-3">
                  Every metric, every athlete, one dashboard
                  <span className="text-success mt-1">✓</span>
                </li>
                <li className="flex items-start justify-end gap-3">
                  AI-powered insights surface what matters
                  <span className="text-success mt-1">✓</span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Draggable divider */}
        <motion.div
          className="absolute top-0 bottom-0 z-10 flex items-center cursor-ew-resize"
          style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
          drag="x"
          dragConstraints={sectionRef}
          dragElastic={0}
          onDrag={handleDrag}
        >
          <div className="w-1 h-full bg-brand-primary/40" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-primary shadow-lg shadow-brand-primary/30 flex items-center justify-center">
            <GripHorizontal className="w-5 h-5 text-white" />
          </div>
        </motion.div>
      </div>

      {/* Mobile: stacked version (visible below lg) */}
      <div className="lg:hidden section-container py-24">
        <SectionReveal>
          <div className="space-y-16">
            <div>
              <FadeInView>
                <p className="font-display text-overline text-text-tertiary uppercase tracking-[0.1em] mb-6">
                  The Old Way
                </p>
                <h3 className="font-display font-bold text-h3 text-text-secondary mb-6">
                  Juggling 5 apps and a spreadsheet.
                </h3>
                <ul className="space-y-3 text-body text-text-tertiary">
                  <li className="flex items-start gap-3">
                    <span className="text-error">✕</span> Fragmented tools, scattered data
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-error">✕</span> Manual admin, lost messages
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-error">✕</span> No single view of any athlete
                  </li>
                </ul>
              </FadeInView>
            </div>
            <div>
              <FadeInView delay={0.3}>
                <p className="font-display text-overline text-brand-primary uppercase tracking-[0.1em] mb-6">
                  With MR Training
                </p>
                <h3 className="font-display font-bold text-h3 text-text-primary mb-6">
                  One platform. Total clarity.
                </h3>
                <ul className="space-y-3 text-body text-text-secondary">
                  <li className="flex items-start gap-3">
                    <span className="text-success">✓</span> Everything in one place
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-success">✓</span> Built-in messaging & billing
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-success">✓</span> AI-powered insights
                  </li>
                </ul>
              </FadeInView>
            </div>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
