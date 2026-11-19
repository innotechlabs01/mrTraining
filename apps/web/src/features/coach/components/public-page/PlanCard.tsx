import Link from 'next/link';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import type { PlanCatalogItem } from '@/features/coach/types';

interface PlanCardProps {
  plan: PlanCatalogItem;
  coachUsername: string;
}

export function PlanCard({ plan, coachUsername }: PlanCardProps) {
  const planSlug = plan.name.toLowerCase().replace(/\s+/g, '-');
  return (
    <Card className="border border-[var(--border)] bg-surface-1 rounded-lg p-0 overflow-hidden flex flex-col h-full group">
      <CardContent className="p-6 pt-5">
        <h3 className="text-h4 font-display text-[var(--text)] mb-2">{plan.name}</h3>
        <p className="text-body-sm text-[var(--text-secondary)] leading-relaxed mb-4 line-clamp-2">
          {plan.description}
        </p>
        <div className="flex items-baseline gap-2 mb-4">
          <span className="text-2xl font-display font-bold text-[var(--text)]">
            ${plan.price}
          </span>
          <span className="text-body-sm text-[var(--text-secondary)] ml-1">
            {plan.currency}
          </span>
          <span className="ml-auto text-caption text-[var(--text-muted)]">
            /{plan.duration}
          </span>
        </div>
        {plan.benefits && (
          <p className="text-xs text-[var(--text-secondary)] mb-4 line-clamp-3">
            {plan.benefits}
          </p>
        )}
      </CardContent>
      <CardFooter className="border-t border-[var(--border)] bg-surface-1 p-5">
        <Link
          href={`/sign-up?plan=${encodeURIComponent(planSlug)}&coach=${encodeURIComponent(coachUsername)}`}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                     bg-brand-primary text-[var(--bg)] font-display font-semibold text-body-sm
                     hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2
                     focus-visible:ring-brand-primary/50 focus-visible:ring-offset-2
                     transition-colors"
        >
          {plan.ctaText || 'Elegir plan'}
        </Link>
      </CardFooter>
    </Card>
  );
}
