'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLang } from './i18n';
import { FireParticles } from './fire-particles';

const faqs = [
  {
    qEs: '¿Qué es MR Training?',
    qEn: 'What is MR Training?',
    aEs: 'Plataforma de coaching unificada: diseño de planes, analítica, IA, eventos, nutrición y comunicación en un solo lugar. Sin hojas de cálculo ni apps sueltas.',
    aEn: 'MR Training is a unified coaching platform combining program design, analytics, AI insights, events, nutrition, and communication in one seamless experience. No more spreadsheets and scattered apps.',
  },
  {
    qEs: '¿Cómo funciona la IA?',
    qEn: 'How does the AI coaching work?',
    aEs: 'Analiza carga, tendencias, recuperación y feedback para ajustar planes. Detecta sobreentrenamiento antes de lesionarte y genera bloques completos según tus objetivos.',
    aEn: 'Our AI analyzes training load, trends, recovery, and feedback to generate personalized adjustments. It detects overtraining before injuries and can auto-generate training blocks.',
  },
  {
    qEs: '¿Puedo importar mis atletas y planes?',
    qEn: 'Can I import my existing athletes and programs?',
    aEs: 'Sí. Importación masiva CSV/JSON de perfiles e historial. La mayoría migra su librería en una hora, con ayuda de nuestro equipo.',
    aEn: 'Absolutely. Bulk CSV/JSON import for profiles and history. Most coaches migrate within an hour, guided by our onboarding team.',
  },
  {
    qEs: '¿Hay app para atletas?',
    qEn: 'Is there a mobile app for athletes?',
    aEs: 'Sí. App móvil para ver el plan diario, registrar entrenos, nutrición, hablar con el coach y ver progreso. iOS y Android.',
    aEn: 'Yes. Athletes get a companion app to view daily plans, log workouts, track nutrition, message their coach, and see progress. iOS and Android.',
  },
  {
    qEs: '¿Puedo probar antes?',
    qEn: 'Can I try before committing?',
    aEs: 'Sí: 14 días gratis en cualquier plan. Sin tarjeta en Starter. En Pro/Elite pedimos tarjeta pero cancelas y te devolvemos.',
    aEn: 'Yes — 14-day free trial on any plan. No card required for Starter. For Pro/Elite a card is required but you can cancel anytime for a full refund.',
  },
  {
    qEs: '¿Es seguro mis datos?',
    qEn: 'Is my data secure?',
    aEs: 'Sí. Encriptación 256-bit, TLS 1.3, SOC 2, backups diarios. Nunca compartimos ni vendemos tus datos.',
    aEn: 'Yes. 256-bit encryption at rest, TLS 1.3, SOC 2 compliant, daily backups. We never share or sell your data.',
  },
];

export function FAQSection() {
  const { txt } = useLang();
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-24 lg:py-32 bg-surface-0 overflow-hidden">
      <div className="grain" />
      <div className="section-container relative">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <p className="font-display font-semibold text-overline text-brand-primary mb-3">FAQ</p>
              <h2 className="font-display font-black text-h2 lg:text-h1 uppercase text-text-primary mb-4">
                {txt('Preguntas frecuentes.', 'Questions? We have answers.')}
              </h2>
              <p className="text-body-lg text-text-tertiary max-w-2xl mx-auto">
                {txt('Todo lo que necesitas saber.', 'Everything you need to know about MR Training.')}
              </p>
            </FadeInView>
          </div>

          <div className="max-w-3xl mx-auto space-y-3 fire-border-glow rounded-xl">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={cn('rounded-xl border transition-colors duration-300', openIndex === i ? 'bg-surface-2 border-brand-primary/40' : 'bg-surface-1 border-surface-4 hover:border-surface-5')}
              >
                <button
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="font-display font-semibold text-body text-text-primary">
                    {txt(faq.qEs, faq.qEn)}
                  </span>
                  <motion.div animate={{ rotate: openIndex === i ? 180 : 0 }} transition={{ duration: 0.2 }} className="shrink-0">
                    <ChevronDown className="w-5 h-5 text-brand-primary" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openIndex === i && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-body-sm text-text-tertiary leading-relaxed">
                        {txt(faq.aEs, faq.aEn)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      </div>
      <FireParticles count={15} speed={0.3} />
    </section>
  );
}
