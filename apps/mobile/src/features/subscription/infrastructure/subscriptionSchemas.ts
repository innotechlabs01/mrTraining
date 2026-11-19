/**
 * Zod schemas for validating subscription API responses from the Go API.
 *
 * `/subscriptions/me` serializes snake_case fields. The membership status
 * endpoint returns camelCase (it is also consumed by the legacy mobile
 * membership screens), so its schema normalizes both shapes first.
 */

import { z } from 'zod';

export const SubscriptionStatusSchema = z.enum([
  'active',
  'trial',
  'past_due',
  'cancelled',
  'expired',
  'none',
]);

export const SubscriptionSchema = z.object({
  id: z.string().min(1),
  athlete_id: z.string().min(1),
  coach_id: z.string().min(1),
  plan_id: z.string().min(1),
  plan_name: z.string().min(1),
  plan_price: z.number().nonnegative(),
  currency: z.string().min(1),
  billing_period: z.string().min(1),
  status: SubscriptionStatusSchema,
  cancel_at_period_end: z.boolean(),
  current_period_start: z.string().datetime().or(z.string().date()).optional(),
  current_period_end: z.string().datetime().or(z.string().date()).optional(),
  grace_period_days: z.number().int().nonnegative(),
  payment_due_date: z.string().datetime().or(z.string().date()).optional(),
  created_at: z.string().datetime().or(z.string().date()).optional(),
  updated_at: z.string().datetime().or(z.string().date()).optional(),
});

const MembershipSummarySchema = z.object({
  id: z.string(),
  planName: z.string(),
  planPrice: z.number().nonnegative(),
  billingPeriod: z.string(),
  currentPeriodStart: z.string(),
  currentPeriodEnd: z.string(),
  paymentDueDate: z.string(),
  athleteId: z.string(),
  coachId: z.string(),
});

function asRecord(value: unknown): Record<string, unknown> | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function pick(
  record: Record<string, unknown>,
  camel: string,
  snake: string,
): unknown {
  return record[camel] ?? record[snake];
}

function normalizeMembershipSummary(value: unknown): unknown {
  const raw = asRecord(value);
  if (!raw) return value;
  return {
    id: raw.id,
    planName: pick(raw, 'planName', 'plan_name'),
    planPrice: pick(raw, 'planPrice', 'plan_price'),
    billingPeriod: pick(raw, 'billingPeriod', 'billing_period'),
    currentPeriodStart: pick(raw, 'currentPeriodStart', 'current_period_start') ?? '',
    currentPeriodEnd: pick(raw, 'currentPeriodEnd', 'current_period_end') ?? '',
    paymentDueDate: pick(raw, 'paymentDueDate', 'payment_due_date') ?? '',
    athleteId: pick(raw, 'athleteId', 'athlete_id') ?? '',
    coachId: pick(raw, 'coachId', 'coach_id') ?? '',
  };
}

function normalizeMembershipStatus(value: unknown): unknown {
  const raw = asRecord(value);
  if (!raw) return value;
  return {
    hasActiveMembership: pick(raw, 'hasActiveMembership', 'has_active_membership'),
    status: raw.status,
    isInGracePeriod: pick(raw, 'isInGracePeriod', 'is_in_grace_period'),
    daysRemaining: pick(raw, 'daysRemaining', 'days_remaining') ?? 0,
    expiresAt: pick(raw, 'expiresAt', 'expires_at') ?? null,
    membership:
      raw.membership === null || raw.membership === undefined
        ? null
        : normalizeMembershipSummary(raw.membership),
    membershipId: pick(raw, 'membershipId', 'membership_id') ?? '',
    coachPlanLimitExceeded:
      pick(raw, 'coachPlanLimitExceeded', 'coach_plan_limit_exceeded') ?? false,
    coachPlanMaxAthletes:
      pick(raw, 'coachPlanMaxAthletes', 'coach_plan_max_athletes') ?? 0,
    coachAthletesCount:
      pick(raw, 'coachAthletesCount', 'coach_athletes_count') ?? 0,
    coachPlanName: pick(raw, 'coachPlanName', 'coach_plan_name') ?? '',
  };
}

export const MembershipStatusSchema = z.preprocess(
  normalizeMembershipStatus,
  z.object({
    hasActiveMembership: z.boolean(),
    status: SubscriptionStatusSchema,
    isInGracePeriod: z.boolean(),
    daysRemaining: z.number().int().nonnegative().nullable(),
    expiresAt: z.string().nullable(),
    membership: MembershipSummarySchema.nullable(),
    membershipId: z.string(),
    coachPlanLimitExceeded: z.boolean(),
    coachPlanMaxAthletes: z.number().int().nonnegative(),
    coachAthletesCount: z.number().int().nonnegative(),
    coachPlanName: z.string(),
  }),
);

export type SubscriptionDto = z.infer<typeof SubscriptionSchema>;
export type MembershipSummaryDto = z.infer<typeof MembershipSummarySchema>;
export type MembershipStatusDto = z.infer<typeof MembershipStatusSchema>;
