'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SectionReveal, FadeInView } from './animation-primitives';
import { Check, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const plans = [
  {
    name: 'Starter',
    desc: 'For independent coaches getting started.',
    monthly: 29,
    annual: 19,
    features: [
      'Up to 20 athletes',
      'Core training builder',
      'Basic performance analytics',
      'Mobile app access',
      'Email support',
    ],
    cta: 'Start free trial',
    highlight: false,
  },
  {
    name: 'Pro',
    desc: 'For growing teams who need more power.',
    monthly: 79,
    annual: 59,
    features: [
      'Unlimited athletes',
      'AI-powered program generation',
      'Advanced analytics & anomaly detection',
      'Event & competition management',
      'Nutrition & wellness modules',
      'Priority support',
    ],
    cta: 'Start free trial',
    highlight: true,
  },
  {
    name: 'Elite',
    desc: 'For academies and organizations.',
    monthly: 199,
    annual: 149,
    features: [
      'Everything in Pro',
      'Multi-coach collaboration',
      'Custom branding & white-label',
      'API & integrations',
      'Dedicated account manager',
      'SLA & SSO',
    ],
    cta: 'Contact sales',
    highlight: false,
  },
];

export function PricingSection() {
  const [annual, setAnnual] = useState(false);

  return (
    <section id="pricing" className="relative py-24 lg:py-32 bg-surface-2 overflow-hidden">
      <div className="section-container">
        <SectionReveal>
          <div className="text-center mb-16">
            <FadeInView>
              <p className="font-display font-semibold text-overline text-brand-primary mb-3">
                PRICING
              </p>
              <h2 className="font-display font-bold text-h2 lg:text-h1 text-text-primary mb-4">
                Simple, transparent pricing.
              </h2>
              <p className="text-body-lg text-text-tertiary max-w-2xl mx-auto mb-8">
                Start free. Upgrade when you grow. No hidden fees, no surprises.
              </p>
            </FadeInView>

            <div className="flex items-center justify-center gap-4">
              <span className={cn('text-body-sm', !annual ? 'text-text-primary' : 'text-text-tertiary')}>
                Monthly
              </span>
              <button
                className={cn(
                  'relative w-14 h-7 rounded-full transition-colors duration-300',
                  annual ? 'bg-brand-primary' : 'bg-surface-5'
                )}
                onClick={() => setAnnual(!annual)}
              >
                <motion.div
                  className="absolute top-1 left-1 w-5 h-5 rounded-full bg-white"
                  animate={{ x: annual ? 28 : 0 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
              </button>
              <span className={cn('text-body-sm', annual ? 'text-text-primary' : 'text-text-tertiary')}>
                Annual
                <span className="text-brand-primary ml-1 font-semibold">Save 25%</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-5xl mx-auto">
            {plans.map((plan, i) => (
              <motion.div
                key={plan.name}
                initial={{ opacity: 0, y: 48 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-64px' }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
                className={cn(
                  'relative rounded-xl border p-6 lg:p-8 transition-all duration-300',
                  plan.highlight
                    ? 'bg-surface-4 border-brand-primary shadow-lg shadow-brand-primary/10'
                    : 'bg-surface-3 border-surface-6 hover:border-surface-5'
                )}
                whileHover={{ y: -4 }}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-brand-primary text-body-sm font-semibold text-white">
                    Most Popular
                  </div>
                )}

                <div className="mb-6">
                  <h3 className="font-display font-bold text-h4 text-text-primary mb-1">{plan.name}</h3>
                  <p className="text-body-sm text-text-tertiary mb-4">{plan.desc}</p>
                  <div className="flex items-baseline gap-1">
                    <span className="font-display font-bold text-h1 text-text-primary">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={annual ? 'annual' : 'monthly'}
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -12 }}
                          transition={{ duration: 0.2 }}
                        >
                          ${annual ? plan.annual : plan.monthly}
                        </motion.span>
                      </AnimatePresence>
                    </span>
                    <span className="text-body text-text-tertiary">/mo</span>
                  </div>
                </div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-start gap-3 text-body-sm text-text-secondary">
                      <Check className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                <motion.a
                  href="#cta"
                  className={cn(
                    'flex items-center justify-center gap-2 w-full py-3 rounded-lg font-semibold text-body-sm transition-all duration-300',
                    plan.highlight
                      ? 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                      : 'bg-surface-5 text-text-primary hover:bg-surface-4 border border-surface-6'
                  )}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {plan.cta}
                  <ArrowRight className="w-4 h-4" />
                </motion.a>
              </motion.div>
            ))}
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}