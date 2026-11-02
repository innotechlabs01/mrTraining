/**
 * Subscription domain types.
 *
 * Pure TypeScript — zero framework imports. Models the athlete's subscription
 * lifecycle as returned by the Go API (/api/v1/subscriptions/me and
 * /api/v1/athletes/membership/status).
 */

export type SubscriptionStatus =
  | 'active'
  | 'trial'
  | 'past_due'
  | 'cancelled'
  | 'expired'
  | 'none';

/** A subscription whose status grants access to premium features. */
export const ACTIVE_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'active',
  'trial',
  'past_due',
];

export function hasActiveSubscription(status: SubscriptionStatus): boolean {
  return ACTIVE_SUBSCRIPTION_STATUSES.includes(status);
}

export interface Subscription {
  id: string;
  athleteId: string;
  coachId: string;
  planId: string;
  planName: string;
  planPrice: number;
  currency: string;
  billingPeriod: 'monthly' | 'yearly';
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  gracePeriodDays: number;
  paymentDueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipStatus {
  hasActiveMembership: boolean;
  status: SubscriptionStatus;
  isInGracePeriod: boolean;
  daysRemaining: number | null;
  expiresAt: string | null;
  membership: Subscription | null;
  membershipId: string;
}

/** Premium features that are gated behind an active subscription. */
export type PremiumFeatureId =
  | 'advanced_metrics'
  | 'specialized_workout_plans'
  | 'direct_messaging';

export interface PremiumFeature {
  id: PremiumFeatureId;
  title: string;
  description: string;
}

export const PREMIUM_FEATURES: PremiumFeature[] = [
  {
    id: 'advanced_metrics',
    title: 'Métricas avanzadas',
    description:
      'HRV, readiness score, carga aguda vs. crónica y tendencias de rendimiento para entrenar con precisión.',
  },
  {
    id: 'specialized_workout_plans',
    title: 'Planes de entrenamiento especializados',
    description:
      'Programas diseñados por tu coach para tu deporte, nivel y objetivos, con progresión semanal.',
  },
  {
    id: 'direct_messaging',
    title: 'Mensajería directa con tu coach',
    description:
    'Comunícate en tiempo real con tu entrenador para resolver dudas y ajustar tu plan.',
  },
];
