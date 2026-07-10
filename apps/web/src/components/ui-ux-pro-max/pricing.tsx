'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: '$0',
    period: '/mo',
    description: 'Perfect for getting started',
    features: ['1 project', '3 reviewers', '7-day version history'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: '$19',
    period: '/mo',
    description: 'For professional teams',
    features: ['Unlimited projects', '15 reviewers', 'Full version history', 'CSS export', 'Priority support'],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'For large organizations',
    features: ['SSO / SAML', 'Audit logs', 'On-premise option', 'Dedicated support', 'Custom integrations'],
    cta: 'Contact sales',
    highlighted: false,
  },
];

export function PricingSection() {
  return (
    <section className="py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight mb-4"
          >
            Simple, transparent pricing
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-lg text-slate-500"
          >
            No hidden fees. No surprises.
          </motion.p>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border p-8 ${
                plan.highlighted
                  ? 'border-indigo-500 bg-white shadow-lg shadow-indigo-500/10'
                  : 'border-slate-200 bg-white shadow-sm'
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-indigo-600 text-white text-xs font-semibold">
                  Most popular
                </span>
              )}
              <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
              <div className="mb-1">
                <span className="text-4xl font-black text-slate-900">{plan.price}</span>
                {plan.period && <span className="text-slate-400 text-sm ml-1">{plan.period}</span>}
              </div>
              <p className="text-sm text-slate-500 mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-indigo-600 mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <a
                href="#"
                className={`block text-center py-2.5 rounded-lg font-semibold transition-colors ${
                  plan.highlighted
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                    : 'border border-slate-300 text-slate-700 hover:bg-slate-50'
                }`}
              >
                {plan.cta}
              </a>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
