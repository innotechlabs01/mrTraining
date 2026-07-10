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
    img: 'https://images.unsplash.com/photo-1554068865-24cecd4e34b8?w=800&q=85',
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
    img: 'https://images.unsplash.com/photo-1521295121783-8a321d551ad2?w=800&q=85',
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
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4 tracking-wide">
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
                  className="relative group rounded-xl overflow-hidden border border-surface-6 hover:border-brand-primary/40 transition-all duration-500"
                  style={{ minHeight: '340px' }}
                  whileHover={{ y: -4 }}
                >
                  <img src={event.img} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <div className="absolute inset-0 bg-gradient-to-t from-surface-0 via-surface-0/70 to-surface-0/30" />
                  <div className="absolute inset-0 bg-gradient-to-b from-brand-primary/5 to-transparent" />
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ boxShadow: 'inset 0 0 40px rgba(255,107,0,0.15)' }} />
                  <div className="relative z-10 p-6 flex flex-col justify-end h-full min-h-[340px]">
                    <span className="font-display text-overline text-brand-primary uppercase tracking-[0.12em] font-bold">
                      {txt(event.sportEs, event.sportEn)}
                    </span>
                    <h3 className="font-display font-bold text-h3 text-text-primary mt-2 mb-4 drop-shadow-lg">
                      {txt(event.nameEs, event.nameEn)}
                    </h3>
                    <div className="space-y-2 text-body-sm text-text-secondary/90">
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
                    <div className="mt-5 pt-4 border-t border-white/10">
                      <a href="/sign-in" className="text-body-sm font-bold text-brand-primary hover:text-brand-primary-hover transition-colors uppercase tracking-wider">
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
