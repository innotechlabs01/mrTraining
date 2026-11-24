'use client';

import { useState } from 'react';
import Link from 'next/link';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billing_period: string;
  max_athletes: number;
  max_sessions_per_week: number;
  is_active: boolean;
  coach_id: string;
  trm: number;
  features?: string[];
}

export function PlansSection({ plans, loading }: { plans: Plan[]; loading: boolean }) {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  if (loading) {
    return (
      <section id="planes" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-20 text-text-secondary">Cargando planes...</div>
        </div>
      </section>
    );
  }

  return (
    <section id="planes" className="py-20 px-4 sm:px-6 lg:px-8 bg-[#0a0a0a]">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-brand-primary/10 text-brand-primary text-xs font-bold uppercase tracking-wider mb-4">
            Precios transparentes
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Elige tu plan</h2>
          <p className="mt-3 text-text-secondary text-base max-w-xl mx-auto">
            Escala tu negocio de coaching con herramientas profesionales de gestión y seguimiento.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="mt-8 flex items-center justify-center">
            <div className="inline-flex p-1 rounded-xl bg-surface-2 border border-surface-6">
              <button
                type="button"
                onClick={() => setBillingCycle('monthly')}
                className={`px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 ${
                  billingCycle === 'monthly'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Mensual
              </button>
              <button
                type="button"
                onClick={() => setBillingCycle('yearly')}
                className={`px-4 sm:px-5 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  billingCycle === 'yearly'
                    ? 'bg-brand-primary text-white shadow-md shadow-brand-primary/20'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Anual</span>
                <span className="text-[10px] font-extrabold uppercase tracking-wider bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Ahorra 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-10">
          {plans.map((plan) => {
            const isYearly = billingCycle === 'yearly';
            // 20% discount on monthly equivalent when annual is chosen
            const basePrice = plan.price;
            const displayedMonthly = isYearly ? Math.round(basePrice * 0.8) : basePrice;
            const annualTotal = Math.round(basePrice * 12 * 0.8);

            const formattedPrice = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: plan.currency || 'COP',
              maximumFractionDigits: 0,
            }).format(displayedMonthly);

            const formattedAnnual = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: plan.currency || 'COP',
              maximumFractionDigits: 0,
            }).format(annualTotal);

            const isPro = plan.id === 'plan-seed-pro';
            const isStarter = plan.id === 'plan-seed-starter';

            return (
              <div
                key={plan.id}
                className={`rounded-2xl border p-6 lg:p-8 flex flex-col relative overflow-hidden transition-all duration-200 ${
                  isPro
                    ? 'border-brand-primary/60 bg-surface-2/90 shadow-xl shadow-brand-primary/10 ring-1 ring-brand-primary/40'
                    : 'border-surface-6 bg-surface-2 hover:border-surface-6/80'
                }`}
              >
                {/* Badges */}
                {isPro && (
                  <div className="absolute top-0 right-0 bg-brand-primary text-white text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider shadow-sm">
                    Recomendado
                  </div>
                )}
                {!isPro && (
                  <div className="absolute top-0 right-0 bg-brand-primary/15 border-b border-l border-brand-primary/30 text-brand-primary text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wider">
                    7 días gratis
                  </div>
                )}

                <h3 className="text-xl font-bold text-white mb-2">{plan.name}</h3>
                
                <div className="flex items-baseline gap-1.5 mt-2 mb-1">
                  <span className="text-3xl lg:text-4xl font-extrabold text-white tracking-tight">{formattedPrice}</span>
                  <span className="text-sm font-medium text-gray-400">/ mes</span>
                </div>

                <div className="h-6 mb-4">
                  {isYearly ? (
                    <span className="text-xs text-brand-primary font-medium">
                      Facturado anualmente {formattedAnnual} (ahorras 20%)
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Facturación mensual estándar</span>
                  )}
                </div>

                <p className="text-sm text-gray-400 mb-6 leading-relaxed">{plan.description}</p>

                <div className="border-t border-white/5 my-2" />

                <ul className="space-y-3.5 mb-8 flex-1 mt-4">
                  {(plan.features || []).map((f, j) => (
                    <li key={j} className="flex items-start gap-2.5">
                      <span className="text-brand-primary font-bold text-xs mt-0.5">✓</span>
                      <span className="text-sm text-gray-300 leading-snug">{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-auto flex flex-col gap-2.5 pt-4 border-t border-surface-6/50">
                  <a
                    href={`/checkout?plan=${encodeURIComponent(plan.id)}&billing_period=${billingCycle}`}
                    className={`w-full py-3.5 rounded-xl text-sm font-semibold transition-all text-center block ${
                      isPro
                        ? 'bg-brand-primary text-white hover:bg-brand-primary/90 shadow-md shadow-brand-primary/20'
                        : 'bg-white/10 text-white hover:bg-white/15'
                    }`}
                  >
                    Adquirir plan
                  </a>
                  <Link
                    href={`/sign-up?trial=true&plan=${encodeURIComponent(plan.id)}`}
                    className="text-xs text-center text-gray-400 hover:text-white transition-colors py-1"
                  >
                    O prueba gratis por 7 días →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
