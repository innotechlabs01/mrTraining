/**
 * Zod schemas for validating subscription API responses from the Go API.
 *
 * The Go API serializes fields in snake_case. These schemas validate the raw
 * wire shape and the service layer maps them to camelCase domain types.
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

export const MembershipStatusSchema = z.object({
  has_active_membership: z.boolean(),
  status: SubscriptionStatusSchema,
  is_in_grace_period: z.boolean(),
  days_remaining: z.number().int().nonnegative().nullable(),
  expires_at: z.string().nullable(),
  membership: z.lazy(() => SubscriptionSchema.nullable()),
  membership_id: z.string(),
});

export type SubscriptionDto = z.infer<typeof SubscriptionSchema>;
export type MembershipStatusDto = z.infer<typeof MembershipStatusSchema>;
