'use client';

import { SectionReveal, FadeInView } from './animation-primitives';
import { motion } from 'framer-motion';
import { CalendarDays, MapPin, Users } from 'lucide-react';
import { useLang } from './i18n';

const events = [
  {
    nameEs: 'Torneo Abril Open',
    nameEn: 'Spring Open Tournament',
    sportEs: 'Tenis',
    sportEn: 'Tennis',
    date: 'Abr 10–12, 2026',
    locationEs: 'City Tennis Center',
    locationEn: 'City Tennis Center',
    registered: 48,
  },
  {
    nameEs: 'Campamento Élite',
    nameEn: 'Elite Training Camp',
    sportEs: 'Multideporte',
    sportEn: 'Multi-Sport',
    date: 'Jul 5–12, 2026',
    locationEs: 'Mountain Performance Center',
    locationEn: 'Mountain Performance Center',
    registered: 24,
  },
];

export function EventsSection() {
  const { txt } = useLang();
  return (
    <section id="eventos" className="relative py-24 lg:py-32 overflow-hidden bg-surface-1">
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-ember/10 rounded-full blur-[128px] animate-fire-flicker" />
      <div className="grain" />
      <div className="section-container relative z-10">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4">
                {txt('Competencias. Campamentos. Meetups.', 'Competitions. Camps. Meetups.')}{' '}
                <span className="text-gradient-fire">{txt('Todo en uno.', 'All in one place.')}</span>
              </h2>
            </FadeInView>
            <FadeInView delay={0.1}>
              <p className="text-body-lg text-text-secondary max-w-xl mx-auto">
                {txt('Registro, waivers, agenda y resultados incluidos. No atornillados.', 'Registration, waivers, scheduling, and results — built in, not bolted on.')}
              </p>
            </FadeInView>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {events.map((event, i) => (
              <FadeInView key={event.nameEn} delay={i * 0.2}>
                <motion.div
                  className="group relative glass-card rounded-xl p-6 transition-all duration-300 border border-surface-6 hover:border-brand-primary/30"
                  whileHover={{ y: -4 }}
                >
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-brand-primary/20 to-brand-ember/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="relative z-10">
                    <span className="font-display text-overline text-brand-primary uppercase tracking-[0.1em]">
                      {txt(event.sportEs, event.sportEn)}
                    </span>
                    <h3 className="font-display font-bold text-h3 text-text-primary mt-2 mb-4">
                      {txt(event.nameEs, event.nameEn)}
                    </h3>
                    <div className="space-y-3 text-body-sm text-text-secondary">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-brand-primary" />
                        {event.date}
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-brand-primary" />
                        {txt(event.locationEs, event.locationEn)}
                      </div>
                      <div className="flex items-center gap-3">
                        <Users className="w-4 h-4 text-brand-primary" />
                        {event.registered} {txt('Inscritos', 'Registered')}
                      </div>
                    </div>
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <a
                        href="/sign-up"
                        className="text-body-sm font-semibold text-brand-primary hover:text-brand-primary-hover transition-colors uppercase"
                      >
                        {txt('Inscríbete →', 'Register Now →')}
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
