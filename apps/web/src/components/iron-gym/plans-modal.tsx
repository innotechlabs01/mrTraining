'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X, Check } from 'lucide-react';

export const PLANS = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$0',
    period: '/mo',
    cta: 'Get started',
    features: [
      '1 athlete profile',
      'Basic training plans',
      'Community access',
      'Progress tracking',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: '$19',
    period: '/mo',
    cta: 'Start free trial',
    highlight: true,
    features: [
      'Unlimited training plans',
      'Nutrition & meal plans',
      'Performance analytics',
      'Priority support',
    ],
  },
  {
    id: 'elite',
    name: 'Elite',
    price: 'Custom',
    period: '',
    cta: 'Contact sales',
    features: [
      'Everything in Pro',
      '1:1 personal coaching',
      'Custom programs',
      'Team management',
    ],
  },
];

export function PlansModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative z-10 w-full max-w-4xl bg-[#121212] border border-brand-primary/30 rounded-2xl p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          aria-label="Close"
        >
          <X className="w-6 h-6" />
        </button>

        <h3 className="text-2xl font-black text-white text-center mb-2">Choose your plan</h3>
        <p className="text-center text-white/60 mb-8">Pick a plan to get started with MR Training</p>

        <div className="grid md:grid-cols-3 gap-6">
          {PLANS.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-xl border p-6 flex flex-col ${
                plan.highlight
                  ? 'border-brand-primary bg-brand-primary/5'
                  : 'border-white/10 bg-black/40'
              }`}
            >
              <h4 className="text-lg font-bold text-white">{plan.name}</h4>
              <div className="my-3">
                <span className="text-3xl font-black text-brand-primary">{plan.price}</span>
                {plan.period && <span className="text-white/60 text-sm ml-1">{plan.period}</span>}
              </div>
              <ul className="space-y-2 mb-6 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/70">
                    <Check className="w-4 h-4 text-brand-primary mt-0.5 shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={() => router.push(`/sign-in?plan=${plan.id}`)}
                className={`w-full py-3 rounded-md font-semibold transition-colors ${
                  plan.highlight
                    ? 'bg-brand-primary text-white hover:bg-brand-primary-hover'
                    : 'border border-white/20 text-white hover:bg-white/10'
                }`}
              >
                {plan.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function PlansCTA({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      <PlansModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
