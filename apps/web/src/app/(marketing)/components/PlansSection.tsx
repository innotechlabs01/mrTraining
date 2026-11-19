'use client';

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
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-white">Elige tu plan</h2>
          <p className="mt-4 text-text-secondary">Planes diseñados para coaches en todas las etapas</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => {
            const formattedPrice = new Intl.NumberFormat('es-CO', {
              style: 'currency',
              currency: plan.currency || 'COP',
              maximumFractionDigits: 0,
            }).format(plan.price);

            const billingPeriodLabel =
              plan.billing_period === 'yearly' ? '/ año' : '/ mes';

            return (
              <div
                key={plan.id}
                className="rounded-xl border p-6 flex flex-col border-surface-6 bg-surface-2 relative overflow-hidden"
              >
                {plan.id === 'plan-seed-starter' && (
                  <div className="absolute top-0 right-0 bg-brand-primary/10 border-b border-l border-brand-primary/20 text-brand-primary text-[10px] font-bold px-2.5 py-1 rounded-bl-lg uppercase tracking-wider">
                    7 días gratis
                  </div>
                )}
                <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-3xl font-bold text-white">{formattedPrice}</span>
                  <span className="text-sm text-gray-400">{billingPeriodLabel}</span>
                </div>
                <p className="text-sm text-gray-400 mb-6">{plan.description}</p>
                <ul className="space-y-3 mb-6 flex-1">
                  {(plan.features || []).map((f, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <span className="text-brand-primary font-bold text-xs mt-1">✓</span>
                      <span className="text-sm text-gray-300">{f}</span>
                    </div>
                  ))}
                </ul>
                <div className="mt-auto flex flex-col gap-2 pt-4 border-t border-surface-6/50">
                  <a
                    href={`/checkout?plan=${encodeURIComponent(plan.id)}`}
                    className="w-full py-3 rounded-lg text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors text-center block"
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
