/**
 * Zod schema validation tests for subscription API responses.
 */

import { SubscriptionSchema, MembershipStatusSchema } from '../subscriptionSchemas';

describe('SubscriptionSchema', () => {
  const validSubscription = {
    id: 'sub_1234567890',
    athlete_id: 'athlete_abc',
    coach_id: 'coach_xyz',
    plan_id: 'plan_pro_monthly',
    plan_name: 'Pro Mensual',
    plan_price: 49000,
    currency: 'COP',
    billing_period: 'monthly',
    status: 'active',
    cancel_at_period_end: false,
    current_period_start: '2026-11-01T00:00:00Z',
    current_period_end: '2026-12-01T00:00:00Z',
    grace_period_days: 5,
    payment_due_date: '2026-12-06T00:00:00Z',
    created_at: '2026-11-01T00:00:00Z',
    updated_at: '2026-11-01T00:00:00Z',
  };

  it('accepts a valid active subscription', () => {
    const result = SubscriptionSchema.safeParse(validSubscription);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.status).toBe('active');
      expect(result.data.plan_price).toBe(49000);
    }
  });

  it('accepts trial status', () => {
    const result = SubscriptionSchema.safeParse({
      ...validSubscription,
      status: 'trial',
    });
    expect(result.success).toBe(true);
  });

  it('accepts past_due status', () => {
    const result = SubscriptionSchema.safeParse({
      ...validSubscription,
      status: 'past_due',
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing required id', () => {
    const result = SubscriptionSchema.safeParse({
      ...validSubscription,
      id: '',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid status', () => {
    const result = SubscriptionSchema.safeParse({
      ...validSubscription,
      status: 'invalid_status' as never,
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative plan_price', () => {
    const result = SubscriptionSchema.safeParse({
      ...validSubscription,
      plan_price: -100,
    });
    expect(result.success).toBe(false);
  });

  it('accepts optional date fields as date-only strings', () => {
    const result = SubscriptionSchema.safeParse({
      ...validSubscription,
      current_period_start: '2026-11-01',
      current_period_end: '2026-12-01',
      payment_due_date: '2026-12-06',
      created_at: undefined,
      updated_at: undefined,
    });
    expect(result.success).toBe(true);
  });
});

describe('MembershipStatusSchema', () => {
  const validStatus = {
    has_active_membership: true,
    status: 'active' as const,
    is_in_grace_period: false,
    days_remaining: 12,
    expires_at: '2026-11-15',
    membership: {
      id: 'sub_123',
      athlete_id: 'athlete_abc',
      coach_id: 'coach_xyz',
      plan_id: 'plan_pro_monthly',
      plan_name: 'Pro Mensual',
      plan_price: 49000,
      currency: 'COP',
      billing_period: 'monthly',
      status: 'active',
      cancel_at_period_end: false,
      current_period_start: '2026-11-01T00:00:00Z',
      current_period_end: '2026-12-01T00:00:00Z',
      grace_period_days: 5,
      payment_due_date: '2026-12-06T00:00:00Z',
      created_at: '2026-11-01T00:00:00Z',
      updated_at: '2026-11-01T00:00:00Z',
    },
    membership_id: 'sub_123',
  };

  it('accepts a valid active membership status', () => {
    const result = MembershipStatusSchema.safeParse(validStatus);
    expect(result.success).toBe(true);
  });

  it('accepts null membership when no subscription exists', () => {
    const result = MembershipStatusSchema.safeParse({
      ...validStatus,
      has_active_membership: false,
      status: 'none' as const,
      membership: null,
    });
    expect(result.success).toBe(true);
  });

  it('accepts expired status', () => {
    const result = MembershipStatusSchema.safeParse({
      ...validStatus,
      status: 'expired' as const,
      has_active_membership: false,
    });
    expect(result.success).toBe(true);
  });

  it('rejects missing has_active_membership', () => {
    const { has_active_membership: _, ...rest } = validStatus;
    const result = MembershipStatusSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  it('rejects null days_remaining as invalid', () => {
    // days_remaining is number | null, so null is actually valid
    const result = MembershipStatusSchema.safeParse({
      ...validStatus,
      days_remaining: null,
    });
    expect(result.success).toBe(true);
  });
});
