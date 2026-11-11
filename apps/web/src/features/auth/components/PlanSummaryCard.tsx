'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatPlanPrice, type SelectedPlan } from '@/features/auth/hooks/useSelectedPlan';

interface PlanSummaryCardProps {
  plan: SelectedPlan | null;
  /** Shows the "already paid" note when the plan is no longer editable. */
  paid?: boolean;
  className?: string;
}

/**
 * PlanSummaryCard shows the plan the coach chose.
 *
 * It is read-only on purpose: the plan is settled at the marketing step and,
 * once the payment is confirmed, the onboarding must not let the coach
 * change what they just paid for.
 */
export function PlanSummaryCard({ plan, paid = false, className }: PlanSummaryCardProps) {
  if (!plan) {
    return (
      <div
        className={cn(
          'rounded-lg border border-surface-6 bg-surface-2 p-4 text-body-sm text-text-secondary',
          className,
        )}
      >
        Plan no disponible
      </div>
    );
  }

  return (
    <div className={cn('rounded-lg border border-surface-6 bg-surface-2 p-4', className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-h4 font-display text-text-primary">{plan.name}</p>
          <p className="mt-1 text-body-sm text-text-secondary">{formatPlanPrice(plan)}</p>
        </div>
        {paid && (
          <span className="flex items-center gap-1.5 rounded-md bg-success/10 px-2.5 py-1 text-caption font-medium text-success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            Pagado
          </span>
        )}
      </div>
      {plan.description && (
        <p className="mt-2 text-caption text-text-secondary">{plan.description}</p>
      )}
    </div>
  );
}
