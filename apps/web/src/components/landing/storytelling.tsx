'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { Logo } from './logo';

export function StorytellingSection() {
  return (
    <section id="storytelling" className="relative py-24 lg:py-32 bg-surface-0 overflow-hidden">
      <div className="section-container">
        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-center">
          {/* Visual column */}
          <div className="relative">
            <div className="relative aspect-[4/5] rounded-lg overflow-hidden bg-surface-2 border border-surface-6">
              {/* Abstract visual: fragmented tools dissolving into unity */}
              <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-2 to-surface-3">
                <div className="relative w-48 h-48">
                  {/* Fragmented shapes (old way) */}
                  <div className="absolute top-0 left-0 w-16 h-16 bg-surface-4 rounded-sm border border-surface-6 rotate-6 opacity-60" />
                  <div className="absolute top-2 right-4 w-14 h-14 bg-surface-4 rounded-sm border border-surface-6 -rotate-3 opacity-50" />
                  <div className="absolute top-12 left-8 w-20 h-12 bg-surface-4 rounded-sm border border-surface-6 rotate-12 opacity-55" />
                  <div className="absolute bottom-8 left-4 w-16 h-16 bg-surface-4 rounded-sm border border-surface-6 -rotate-6 opacity-60" />
                  <div className="absolute bottom-4 right-8 w-14 h-20 bg-surface-4 rounded-sm border border-surface-6 rotate-3 opacity-50" />
                  {/* Center beacon (MR Training) */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                    <Logo monogramOnly size="lg" />
                    <div className="absolute inset-0 bg-brand-primary/20 blur-xl rounded-full" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Text column */}
          <SectionReveal>
            <FadeInView>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-8">
                Coaching hasn&apos;t changed in&nbsp;30&nbsp;years.
              </h2>
            </FadeInView>
            <FadeInView delay={0.2}>
              <p className="text-body-lg text-text-secondary mb-6 leading-relaxed">
                While music went streaming, finance went digital, and healthcare went
                telemedicine — coaches are still running their businesses on
                spreadsheets, WhatsApp, and sticky notes.
              </p>
            </FadeInView>
            <FadeInView delay={0.4}>
              <p className="text-body-lg text-text-secondary mb-6 leading-relaxed">
                Athletes get scattered instructions across five different apps. Coaches
                burn out managing admin instead of coaching. The industry that demands
                peak human performance is stuck with tools from 1995.
              </p>
            </FadeInView>
            <FadeInView delay={0.6}>
              <p className="text-h3 font-semibold text-brand-primary">
                We&apos;re fixing that.
              </p>
            </FadeInView>
          </SectionReveal>
        </div>
      </div>
    </section>
  );
}
