'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Users } from 'lucide-react';

const events = [
  {
    name: 'Spring Open Tournament',
    sport: 'Tennis',
    date: 'Apr 10–12, 2026',
    location: 'City Tennis Center',
    registered: 48,
    image: 'from-brand-primary/20 to-brand-primary/5',
  },
  {
    name: 'Elite Training Camp',
    sport: 'Multi-Sport',
    date: 'Jul 5–12, 2026',
    location: 'Mountain Performance Center',
    registered: 24,
    image: 'from-brand-secondary/20 to-brand-secondary/5',
  },
];

export function EventsSection() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-surface-1">
        <div className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      <div className="section-container relative z-10">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Competitions. Camps. Meetups.{' '}
                <span className="text-brand-primary">All in one place.</span>
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto">
                Registration, waivers, scheduling, and results — built in, not bolted on.
              </p>
            </FadeInView>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {events.map((event, i) => (
              <FadeInView key={event.name} delay={i * 0.2}>
                <motion.div
                  className="group relative glass-card rounded-xl p-6 transition-all duration-300"
                  whileHover={{ y: -4 }}
                >
                  <div className={`absolute inset-0 rounded-xl bg-gradient-to-br ${event.image} opacity-0 group-hover:opacity-100 transition-opacity duration-500`} />
                  <div className="relative z-10">
                    <span className="font-display text-overline text-brand-primary uppercase tracking-[0.1em]">
                      {event.sport}
                    </span>
                    <h3 className="font-display font-bold text-h3 text-text-primary mt-2 mb-4">
                      {event.name}
                    </h3>
                    <div className="space-y-3 text-body-sm text-text-secondary">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-brand-primary" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-brand-primary" />
                        {event.location}
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-brand-primary" />
                        {event.registered} Registered
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <a
                        href="/sign-up"
                        className="text-body-sm font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors"
                      >
                        Register Now →
                      </a>
                    </div>
                  </div>
                </motion.div>
              </FadeInView>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}
