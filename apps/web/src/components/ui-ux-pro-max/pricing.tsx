'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const plans = [
  {
    name: 'Free',
    price: { monthly: '$0', yearly: '$0' },
    period: { monthly: '/mo', yearly: '/mo' },
    description: 'Perfect for getting started',
    features: ['1 project', '3 reviewers per project', '7-day version history', 'Basic CSS export'],
    cta: 'Get started',
    highlighted: false,
  },
  {
    name: 'Pro',
    price: { monthly: '$19', yearly: '$15' },
    period: { monthly: '/mo', yearly: '/mo' },
    description: 'For professional teams',
    features: [
      'Unlimited projects',
      '15 reviewers per project',
      'Full version history',
      'Advanced CSS export',
      'Priority support',
      'Custom review workflows',
    ],
    cta: 'Start free trial',
    highlighted: true,
  },
  {
    name: 'Enterprise',
    price: { monthly: 'Custom', yearly: 'Custom' },
    period: { monthly: '', yearly: '' },
    description: 'For large organizations',
    features: [
      'Unlimited everything',
      'SSO / SAML',
      'Audit logs',
      'On-premise option',
      'Dedicated success manager',
      'Custom integrations',
      'SLA guarantee',
    ],
    cta: 'Contact sales',
    highlighted: false,
  },
];

export function PricingSection() {
  const [yearly, setYearly] = useState(false);

  return (
    <section id="pricing" className="py-24 lg:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-12">
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

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-center justify-center gap-3 mb-12"
        >
          <span className={`text-sm font-medium ${!yearly ? 'text-slate-900' : 'text-slate-400'}`}>Monthly</span>
          <button
            onClick={() => setYearly(!yearly)}
            className={`relative w-12 h-6 rounded-full transition-colors ${yearly ? 'bg-indigo-600' : 'bg-slate-300'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${yearly ? 'translate-x-6' : ''}`}
            />
          </button>
          <span className={`text-sm font-medium ${yearly ? 'text-slate-900' : 'text-slate-400'}`}>
            Yearly
            <span className="ml-1 text-xs text-emerald-600 font-semibold">Save 20%</span>
          </span>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className={`relative rounded-xl border p-8 ${
                plan.highlighted
                  ? 'border-indigo-500 bg-white shadow-xl shadow-indigo-500/10 scale-[1.02] md:scale-105'
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
                <span className="text-4xl font-black text-slate-900">
                  {yearly ? plan.price.yearly : plan.price.monthly}
                </span>
                {plan.period.monthly && (
                  <span className="text-slate-400 text-sm ml-1">
                    {yearly ? plan.period.yearly : plan.period.monthly}
                  </span>
                )}
              </div>
              {yearly && plan.name === 'Pro' && (
                <p className="text-xs text-emerald-600 font-medium mb-1">Billed $180/year</p>
              )}
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
                className={`block text-center py-2.5 rounded-lg font-semibold transition-all ${
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
