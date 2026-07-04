import type { Plan } from '@/domain/entities';

export interface PlanDTO {
  id: string;
  name: string;
  slug: string;
  priceMonthly: number;
  priceAnnual: number | null;
  monthlyPriceFormatted: string;
  features: string[];
  isFeatured: boolean;
  sortOrder: number;
}

export function toPlanDTO(plan: Plan): PlanDTO {
  return {
    id: plan.id,
    name: plan.name,
    slug: plan.slug,
    priceMonthly: plan.priceMonthly,
    priceAnnual: plan.priceAnnual,
    monthlyPriceFormatted: plan.monthlyPriceFormatted,
    features: plan.features,
    isFeatured: plan.isFeatured,
    sortOrder: plan.sortOrder,
  };
}
