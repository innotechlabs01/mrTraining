import type { Plan } from '@/features/coach/types';

export function isPlanDiscountActive(plan: Plan, now: Date = new Date()): boolean {
  const d = plan.discount;
  if (!d || d.value <= 0) return false;
  const t = now.getTime();
  if (d.validFrom && t < new Date(d.validFrom).getTime()) return false;
  if (d.validUntil && t > new Date(d.validUntil).getTime()) return false;
  return true;
}

export function getPlanDiscountAmount(plan: Plan): number {
  const d = plan.discount;
  if (!d) return 0;
  if (d.type === 'percentage') return Math.round((plan.price * d.value) / 100);
  return Math.min(plan.price, d.value);
}

export function getPlanDiscountedPrice(plan: Plan): number {
  if (!isPlanDiscountActive(plan)) return plan.price;
  return Math.max(0, plan.price - getPlanDiscountAmount(plan));
}

export function formatDiscountLabel(plan: Plan): string | null {
  const d = plan.discount;
  if (!d) return null;
  if (d.type === 'percentage') return `${d.value}% OFF`;
  return `$${d.value} OFF`;
}
