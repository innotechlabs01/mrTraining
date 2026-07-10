'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { Logo } from './logo';
import { useLang } from './i18n';
import {
  Dumbbell, Apple, Heart, Users, Trophy,
  CreditCard, Brain, BarChart3, Users2, MessageCircle,
} from 'lucide-react';

const modules = [
  { id: 'training', icon: Dumbbell, label: 'Training', orbit: 0, angle: 0, color: 'text-brand-primary' },
  { id: 'nutrition', icon: Apple, label: 'Nutrition', orbit: 0, angle: 36, color: 'text-ember-text' },
  { id: 'recovery', icon: Heart, label: 'Recovery', orbit: 0, angle: 72, color: 'text-violet-accent' },
  { id: 'community', icon: Users, label: 'Community', orbit: 0, angle: 108, color: 'text-brand-secondary' },
  { id: 'events', icon: Trophy, label: 'Events', orbit: 0, angle: 144, color: 'text-coral-accent' },
  { id: 'payments', icon: CreditCard, label: 'Payments', orbit: 0, angle: 180, color: 'text-success' },
  { id: 'ai', icon: Brain, label: 'AI', orbit: 0, angle: 216, color: 'text-brand-secondary' },
  { id: 'analytics', icon: BarChart3, label: 'Analytics', orbit: 0, angle: 252, color: 'text-teal-accent' },
  { id: 'crm', icon: Users2, label: 'CRM', orbit: 0, angle: 288, color: 'text-warning' },
  { id: 'communications', icon: MessageCircle, label: 'Comms', orbit: 0, angle: 324, color: 'text-brand-primary' },
];

export function FeaturesSection() {
  const { txt } = useLang();
  const [activeModule, setActiveModule] = useState<string | null>(null);
  const orbitRadius = 160;

  const moduleDetails: Record<string, { title: string; description: string; features: string[] }> = {
    training: {
      title: txt('Entrenamiento multideporte', 'Multi-Sport Training'),
      description: txt('Periodización drag-and-drop para cada deporte. Construye una vez, reutiliza siempre.', 'Drag-and-drop periodization for every sport. Build once, reuse forever.'),
      features: [txt('Builder con IA', 'Builder with AI'), txt('Librería de plantillas', 'Template library'), 'Gym · Running · Tenis · Natación · Ciclismo · CrossFit'],
    },
    nutrition: {
      title: txt('Nutrición', 'Nutrition Planning'),
      description: txt('Planes que se adaptan a tu carga, dieta y objetivos.', 'Meal plans that adapt to training load, dietary needs, and goals.'),
      features: [txt('Macros y micros', 'Macro & micronutrients'), txt('Escáner de código de barras', 'Barcode scanner'), txt('Hidratación', 'Hydration')],
    },
    recovery: {
      title: txt('Recuperación', 'Recovery Management'),
      description: txt('Sueño, HRV y readiness en un solo lugar. Evita el sobreentrenamiento.', 'Sleep, HRV, readiness — all in one place. Prevent overtraining before it happens.'),
      features: [txt('Wearables', 'Wearable integration'), txt('Readiness score', 'Readiness scoring'), txt('Rehab', 'Injury rehab')],
    },
    community: {
      title: txt('Comunidad', 'Community & Social'),
      description: txt('Entrenar en equipo te mantiene en el juego.', 'Training is better together. Build the culture that keeps athletes coming back.'),
      features: [txt('Feed y retos', 'Activity feed & challenges'), txt('Rankings', 'Leaderboards'), txt('Grupos', 'Groups')],
    },
    events: {
      title: txt('Eventos', 'Events & Competitions'),
      description: txt('Torneos, campamentos y meetups con registro y resultados.', 'Tournaments, camps, meetups — registration, waivers, and results built in.'),
      features: [txt('Registro online', 'Online registration'), txt('Pagos', 'Payment collection'), txt('Resultados', 'Results')],
    },
    payments: {
      title: txt('Pagos', 'Payments & Billing'),
      description: txt('Suscripciones e facturas automáticas. Cobra sin pensar.', 'Automated subscriptions, invoicing, and payouts. Get paid without thinking about it.'),
      features: [txt('Suscripciones', 'Subscriptions'), txt('Facturación', 'Invoicing'), txt('Multimoneda', 'Multi-currency')],
    },
    ai: {
      title: txt('Motor IA', 'AI Engine'),
      description: txt('Tu compañero IA: genera, analiza y predice. Tú al mando.', 'Your AI teammate — generates, analyzes, predicts. Always with you in control.'),
      features: [txt('Genera entrenos', 'Workout generation'), txt('Insights', 'Performance insights'), txt('Alertas', 'Anomaly alerts')],
    },
    analytics: {
      title: txt('Analítica', 'Analytics & Reports'),
      description: txt('Convierte datos en decisiones. Dashboards que importan.', 'Turn data into decisions. Dashboards that show what matters.'),
      features: [txt('Dashboards', 'Dashboards'), txt('Reportes', 'Custom reports'), txt('Benchmarks', 'Benchmarks')],
    },
    crm: {
      title: txt('CRM de atletas', 'Athlete CRM'),
      description: txt('Gestiona tu roster. Sabes quién necesita atención hoy.', 'Manage your entire roster. Know who needs attention today.'),
      features: [txt('Ciclo de vida', 'Lifecycle tracking'), txt('Check-ins', 'Auto check-ins'), txt('Metas', 'Goal setting')],
    },
    communications: {
      title: txt('Comunicación', 'Communications'),
      description: txt('Mensajes, broadcasts y notificaciones en contexto.', 'Messaging, broadcasts, and notifications — all in context.'),
      features: [txt('Mensajería', 'In-app messaging'), txt('Push y email', 'Push & email'), txt('Anuncios', 'Broadcasts')],
    },
  };

  return (
    <section id="features" className="relative py-24 lg:py-32 bg-surface-2 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4">
                {txt('Todo lo que necesitas.', 'Everything you need.')}{' '}
                <span className="text-gradient-fire">{txt('Nada de más.', 'Nothing you don’t.')}</span>
              </h2>
            </FadeInView>
          </div>
        </SectionReveal>

        {/* Orbit Map — Desktop */}
        <div className="hidden lg:block">
          <div className="relative w-full max-w-[500px] h-[500px] mx-auto">
            {[140, 190, 240].map((r, i) => (
              <div
                key={i}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-surface-6/50"
                style={{ width: r * 2, height: r * 2 }}
              />
            ))}

            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
              <motion.div
                animate={{ scale: [1, 1.05, 1] }}
                transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              >
                <div className="w-20 h-20 rounded-full bg-surface-3 border border-brand-primary/40 flex items-center justify-center fire-glow">
                  <Logo monogramOnly size="lg" />
                </div>
              </motion.div>
            </div>

            {modules.map((mod, i) => {
              const angle = (i / modules.length) * Math.PI * 2 - Math.PI / 2;
              const x = Math.cos(angle) * orbitRadius;
              const y = Math.sin(angle) * orbitRadius;

              return (
                <motion.button
                  key={mod.id}
                  className="absolute z-20 flex flex-col items-center gap-1 group"
                  style={{
                    left: `calc(50% + ${x}px)`,
                    top: `calc(50% + ${y}px)`,
                    transform: 'translate(-50%, -50%)',
                  }}
                  initial={{ opacity: 0, scale: 0 }}
                  whileInView={{
                    opacity: 1,
                    scale: 1,
                    transition: { delay: i * 0.05, type: 'spring' },
                  }}
                  whileHover={{ scale: 1.15 }}
                  onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
                  viewport={{ once: true }}
                >
                  <div
                    className={`w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300 ${
                      activeModule === mod.id
                        ? 'bg-brand-primary/20 border border-brand-primary'
                        : 'bg-surface-3 border border-surface-6 group-hover:border-brand-primary/30'
                    }`}
                  >
                    <mod.icon className={`w-5 h-5 ${mod.color}`} />
                  </div>
                  <span className="text-caption text-text-tertiary group-hover:text-text-secondary transition-colors whitespace-nowrap">
                    {mod.label}
                  </span>
                </motion.button>
              );
            })}
          </div>

          <AnimatePresence>
            {activeModule && moduleDetails[activeModule] && (
              <motion.div
                className="max-w-lg mx-auto mt-8 p-6 rounded-lg bg-surface-3 border border-brand-primary/20"
                initial={{ opacity: 0, y: 16, height: 0 }}
                animate={{ opacity: 1, y: 0, height: 'auto' }}
                exit={{ opacity: 0, y: -8, height: 0 }}
                transition={{ duration: 0.3 }}
              >
                <h4 className="font-display font-semibold text-h4 text-text-primary mb-2">
                  {moduleDetails[activeModule].title}
                </h4>
                <p className="text-body-sm text-text-secondary mb-4">
                  {moduleDetails[activeModule].description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {moduleDetails[activeModule].features.map((f) => (
                    <span
                      key={f}
                      className="px-3 py-1 text-caption rounded-full bg-surface-4 border border-surface-6 text-text-secondary"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Mobile: Card grid */}
        <div className="lg:hidden grid grid-cols-2 gap-3">
          {modules.slice(0, 8).map((mod, i) => (
            <motion.button
              key={mod.id}
              className={`flex flex-col items-center gap-2 p-4 rounded-lg border transition-all ${
                activeModule === mod.id
                  ? 'bg-surface-3 border-brand-primary/30'
                  : 'bg-surface-2 border-surface-6'
              }`}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              viewport={{ once: true }}
              onClick={() => setActiveModule(activeModule === mod.id ? null : mod.id)}
            >
              <mod.icon className={`w-6 h-6 ${mod.color}`} />
              <span className="text-caption text-text-secondary">{mod.label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
