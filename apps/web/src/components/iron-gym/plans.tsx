'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Users, CalendarRange } from 'lucide-react';
import type { PlanDiscount } from '@/features/coach/types';
import { usePlans } from '@/features/coach/hooks/usePlans';
import { isPlanDiscountActive, getPlanDiscountedPrice, formatDiscountLabel } from '@/features/coach/utils/planDiscount';
import { PaymentModal } from './payment-modal';

const TRAINING_MODE_LABEL: Record<string, string> = {
  virtual: 'Virtual',
  presencial: 'Presencial',
  hibrido: 'Híbrido',
  running: 'Running',
};

const TRAINING_MODE_STYLE: Record<string, string> = {
  presencial: 'bg-green-500/10 text-green-400',
  virtual: 'bg-blue-500/10 text-blue-400',
  hibrido: 'bg-purple-500/10 text-purple-400',
  running: 'bg-amber-500/10 text-amber-400',
};

export function IronGymPlans() {
  const { plans } = usePlans();
  const [billing, setBilling] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [selected, setSelected] = useState<{
    name: string;
    price: number;
    period: string;
    discount: PlanDiscount | null;
  } | null>(null);

  const visiblePlans = plans.filter((p) => p.billingPeriod === billing);

  return (
    <section id="planes" className="bg-white py-24">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-[#9e9e9e] font-medium text-lg">Planes y Precios</p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-4xl lg:text-5xl font-bold text-[#424242] mt-1"
          >
            Entrena con un plan
          </motion.h2>
        </div>

        <div className="flex items-center justify-center mb-10">
          <div className="inline-flex items-center rounded-lg border border-gray-200 p-1 bg-white">
            <button
              onClick={() => setBilling('monthly')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                billing === 'monthly' ? 'bg-[#212121] text-white' : 'text-[#424242]'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setBilling('quarterly')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                billing === 'quarterly' ? 'bg-[#212121] text-white' : 'text-[#424242]'
              }`}
            >
              Trimestral
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`px-4 py-2 rounded-md text-sm font-semibold transition-colors ${
                billing === 'yearly' ? 'bg-[#212121] text-white' : 'text-[#424242]'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {visiblePlans.map((plan, i) => {
            const period = plan.billingPeriod === 'yearly' ? '/año' : '/mes';
            const discountActive = isPlanDiscountActive(plan);
            const finalPrice = getPlanDiscountedPrice(plan);
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className={`rounded-xl p-8 flex flex-col ${
                  plan.isActive
                    ? 'bg-[#212121] text-white shadow-xl'
                    : 'bg-white text-[#424242] border border-gray-200'
                }`}
              >
                <h3
                  className={`text-lg font-medium ${
                    plan.isActive ? 'text-[#fafafa]' : 'text-[#757575]'
                  }`}
                >
                  {plan.name}
                  {discountActive && (
                    <span className="ml-2 align-middle px-2 py-0.5 rounded-full bg-brand-primary text-[10px] font-bold text-white">
                      {formatDiscountLabel(plan)}
                    </span>
                  )}
                </h3>
                <p className={`mt-2 text-sm ${plan.isActive ? 'text-[#e0e0e0]' : 'text-[#9e9e9e]'}`}>
                  {plan.description}
                </p>

                <div className="mt-4 flex items-baseline gap-2">
                  <span
                    className={`text-4xl font-bold ${
                      plan.isActive ? 'text-white' : 'text-[#424242]'
                    }`}
                  >
                    ${finalPrice}
                  </span>
                  {discountActive && (
                    <span
                      className={`text-lg ${
                        plan.isActive ? 'text-white/40' : 'text-[#bdbdbd]'
                      } line-through`}
                    >
                      ${plan.price}
                    </span>
                  )}
                  <span
                    className={`text-sm ${plan.isActive ? 'text-white/80' : 'text-[#757575]'}`}
                  >
                    {period}
                  </span>
                </div>

                <ul className="mt-6 space-y-3 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-3 text-sm">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          plan.isActive ? 'text-white' : 'text-[#757575]'
                        }`}
                      />
                      <span className={plan.isActive ? 'text-[#e0e0e0]' : 'text-[#757575]'}>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 pt-4 border-t border-white/10 space-y-2">
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <Users size={12} />
                    {plan.maxAthletes} atletas máx
                  </div>
                  <div className="flex items-center gap-2 text-xs text-white/40">
                    <CalendarRange size={12} />
                    {plan.maxSessionsPerWeek} sesiones/sem
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {plan.trainingMode.map((m) => (
                      <span
                        key={m}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                          TRAINING_MODE_STYLE[m] ?? 'bg-white/10 text-white/60'
                        }`}
                      >
                        {TRAINING_MODE_LABEL[m] ?? m}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => setSelected({ name: plan.name, price: plan.price, period, discount: plan.discount ?? null })}
                  className={`mt-6 w-full py-3 rounded-md font-semibold text-sm transition-colors ${
                    plan.isActive
                      ? 'bg-white text-[#212121] hover:bg-gray-100'
                      : 'bg-[#212121] text-white hover:bg-[#424242]'
                  }`}
                >
                  Elegir Plan
                </button>
              </motion.div>
            );
          })}
        </div>
      </div>

      {selected && (
        <PaymentModal open onClose={() => setSelected(null)} plan={selected} />
      )}
    </section>
  );
}
