'use client';

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
          {plans.map((plan) => (
            <div key={plan.id} className="rounded-xl border p-6 flex flex-col border-surface-6 bg-surface-2">
              <h3 className="text-lg font-bold text-white mb-2">{plan.name}</h3>
              <div className="flex items-baseline gap-1 mb-4">
                <span className="text-3xl font-bold text-white">{plan.price}</span>
                <span className="text-sm text-gray-400">{plan.currency}</span>
                <span className="text-sm text-gray-400">{plan.billing_period}</span>
              </div>
              <p className="text-sm text-gray-400 mb-6">{plan.description}</p>
              <ul className="space-y-3 mb-6">
                {(plan.features || []).map((f, j) => (
                  <div key={j} className="flex items-start gap-2">
                    <span className="text-sm text-gray-300">{f}</span>
                  </div>
                ))}
              </ul>
              <a
                href={`/checkout?plan=${encodeURIComponent(plan.id)}`}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-brand-primary text-white hover:bg-brand-primary/90 transition-colors text-center block"
              >
                Elegir plan
              </a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
