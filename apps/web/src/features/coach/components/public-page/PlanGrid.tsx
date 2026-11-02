import { EmptyState } from '@/components/ui/empty-state';
import { Inbox } from 'lucide-react';
import { PlanCard } from './PlanCard';
import type { PlanCatalogItem } from '@/features/coach/types';

interface PlanGridProps {
  plans: PlanCatalogItem[];
  coachUsername: string;
}

export function PlanGrid({ plans, coachUsername }: PlanGridProps) {
  const activePlans = plans.filter((p) => Boolean(p.id));

  if (activePlans.length === 0) {
    return (
      <section className="pt-12 pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <EmptyState
            icon={<Inbox className="w-12 h-12 text-[var(--text-muted)]" aria-hidden="true" />}
            title="Este coach aún no tiene planes publicados"
            description="Vuelve pronto para ver su catálogo de entrenamientos."
          />
        </div>
      </section>
    );
  }

  return (
    <section className="pt-12 pb-16 px-6">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-h3 font-display text-[var(--text)] mb-8">Planes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {activePlans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} coachUsername={coachUsername} />
          ))}
        </div>
      </div>
    </section>
  );
}
