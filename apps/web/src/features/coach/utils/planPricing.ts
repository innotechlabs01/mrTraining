import type { Plan, PlanCurrency } from '@/features/coach/types';

const copFormatter = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 });

export function formatPlanPrice(amount: number, currency: PlanCurrency): string {
  const n = Math.round(amount);
  return `$${copFormatter.format(n)} ${currency}`;
}

export function formatTrm(value: number): string {
  return `$${copFormatter.format(Math.round(value))}`;
}

export function convertUsdToCop(usd: number, trm: number): number {
  return Math.round(usd * trm);
}

export function formatConversionPreview(finalPrice: number, trm: number): string | null {
  if (!(finalPrice > 0) || !(trm > 0)) return null;
  const cop = convertUsdToCop(finalPrice, trm);
  return `≈ $${copFormatter.format(cop)} COP al TRM de hoy (${formatTrm(trm)})`;
}

export interface PublishValidationInput {
  name: string;
  price: string;
  trainingMode: string[];
  features: string[];
}

export function validateForPublish(f: PublishValidationInput): string[] {
  const errors: string[] = [];
  if (!f.name.trim()) errors.push('Ingresa el nombre del plan');
  if (!(Number(f.price) > 0)) errors.push('Ingresa un precio válido');
  if (f.trainingMode.length === 0) errors.push('Selecciona al menos una modalidad');
  if (f.features.filter((x) => x.trim()).length === 0) errors.push('Agrega al menos una característica');
  return errors;
}

const PERIOD_LABELS: Record<Plan['billingPeriod'], string> = {
  monthly: 'mes',
  quarterly: 'trimestre',
  yearly: 'año',
};

export function periodLabel(period: Plan['billingPeriod']): string {
  return PERIOD_LABELS[period] ?? period;
}
