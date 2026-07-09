'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const faqs = [
  {
    q: 'What is MR Training?',
    a: 'MR Training is a unified coaching platform that combines training program design, athlete performance analytics, AI-powered coaching insights, event management, nutrition tracking, and team communication into one seamless experience. No more juggling spreadsheets, apps, and whiteboards.',
  },
  {
    q: 'How does the AI coaching work?',
    a: 'Our AI analyzes training load, performance trends, recovery data, and athlete feedback to generate personalized program adjustments. It detects overtraining patterns before injuries happen, suggests optimal rest periods, and can auto-generate entire training blocks based on your coaching philosophy and athlete goals.',
  },
  {
    q: 'Can I import my existing athletes and programs?',
    a: 'Absolutely. We support bulk CSV/JSON import for athlete profiles, training history, and performance data. Most coaches have their full program library migrated within an hour. Our onboarding team will guide you through the process step by step.',
  },
  {
    q: 'Is there a mobile app for athletes?',
    a: 'Yes. Athletes get a companion mobile app where they can view their daily training plan, log workouts, track nutrition, communicate with their coach, and see real-time progress. Available on iOS and Android.',
  },
  {
    q: 'Can I try before committing?',
    a: 'Yes — start with a 14-day free trial on any plan. No credit card required for Starter. For Pro and Elite, we require a card but you can cancel anytime within the trial period for a full refund.',
  },
  {
    q: 'How does multi-coach collaboration work?',
    a: 'Elite plan includes full multi-coach support. Share athlete profiles, co-author programs, assign specific coaches to specific athletes or groups, and maintain a shared coaching notes feed. Permissions are granular — you control who sees what.',
  },
  {
    q: 'What kind of support do you offer?',
    a: 'Starter gets email support with <24h response. Pro gets priority with <4h response. Elite gets a dedicated account manager, phone/video support, and guaranteed <1h critical response. All plans have access to our knowledge base and community forum.',
  },
  {
    q: 'Is my data secure?',
    a: 'Yes. We use 256-bit encryption at rest and TLS 1.3 in transit. Our infrastructure is SOC 2 compliant, hosted on AWS with daily backups. We never share or sell your data. See our privacy policy for full details.',
  },
];

export function FAQSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  return (
    <section id="faq" className="relative py-24 lg:py-32 bg-surface-0 overflow-hidden">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <p className="font-display font-semibold text-overline text-brand-primary mb-3">
                FAQ
              </p>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Questions? We have answers.
              </h2>
              <p className="text-body-lg text-text-tertiary max-w-2xl mx-auto">
                Everything you need to know about MR Training.
              </p>
            </FadeInView>
          </div>

          <div className="max-w-3xl mx-auto space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.04, duration: 0.3 }}
                className={cn(
                  'rounded-xl border transition-colors duration-300',
                  openIndex === i
                    ? 'bg-surface-2 border-surface-6'
                    : 'bg-surface-1 border-surface-4 hover:border-surface-5'
                )}
              >
                <button
                  className="w-full flex items-center justify-between gap-4 p-5 text-left"
                  onClick={() => setOpenIndex(openIndex === i ? null : i)}
                >
                  <span className="font-display font-semibold text-body text-text-primary">
                    {faq.q}
                  </span>
                  <motion.div
                    animate={{ rotate: openIndex === i ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="shrink-0"
                  >
                    <ChevronDown className="w-5 h-5 text-text-tertiary" />
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
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}