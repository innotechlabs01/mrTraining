/**
 * Subscription API service.
 *
 * Consumes the Go API (single source of truth) and validates every response
 * with Zod before returning domain models. Never returns raw API shapes to
 * callers.
 */

import { apiClient } from '@/infrastructure/api/client';
import {
  MembershipStatusSchema,
  SubscriptionSchema,
  type MembershipStatusDto,
  type SubscriptionDto,
} from './subscriptionSchemas';
import type { MembershipStatus, Subscription } from '../domain/subscription';

function mapSubscription(dto: SubscriptionDto): Subscription {
  return {
    id: dto.id,
    athleteId: dto.athlete_id,
    coachId: dto.coach_id,
    planId: dto.plan_id,
    planName: dto.plan_name,
    planPrice: dto.plan_price,
    currency: dto.currency,
    billingPeriod: dto.billing_period as Subscription['billingPeriod'],
    status: dto.status,
    cancelAtPeriodEnd: dto.cancel_at_period_end,
    currentPeriodStart: dto.current_period_start ?? '',
    currentPeriodEnd: dto.current_period_end ?? '',
    gracePeriodDays: dto.grace_period_days,
    paymentDueDate: dto.payment_due_date ?? '',
    createdAt: dto.created_at ?? '',
    updatedAt: dto.updated_at ?? '',
  };
}

function mapMembershipStatus(dto: MembershipStatusDto): MembershipStatus {
  return {
    hasActiveMembership: dto.has_active_membership,
    status: dto.status,
    isInGracePeriod: dto.is_in_grace_period,
    daysRemaining: dto.days_remaining,
    expiresAt: dto.expires_at,
    membership: dto.membership ? mapSubscription(dto.membership) : null,
    membershipId: dto.membership_id,
  };
}

/**
 * Fetch the authenticated athlete's current subscription.
 * GET /api/v1/subscriptions/me
 *
 * Returns null when the athlete has no subscription on record.
 * Throws a Zod error if the response shape is invalid.
 */
export async function getMySubscription(): Promise<Subscription | null> {
  const { data } = await apiClient.get<SubscriptionDto>('/subscriptions/me');
  const parsed = SubscriptionSchema.parse(data);
  return mapSubscription(parsed);
}

/**
 * Fetch the athlete's membership gate status.
 * GET /api/v1/athletes/membership/status
 *
 * Always returns 200 (never 404) even when no membership exists.
 */
export async function getMembershipStatus(): Promise<MembershipStatus> {
  const { data } = await apiClient.get<MembershipStatusDto>(
    '/athletes/membership/status',
  );
  const parsed = MembershipStatusSchema.parse(data);
  return mapMembershipStatus(parsed);
}

/**
 * Create a subscription checkout for the given plan.
 * POST /api/v1/subscriptions
 *
 * Returns the MercadoPago checkout URL and reference for the browser flow.
 */
export async function subscribe(planId: string): Promise<{
  checkoutUrl: string;
  reference: string;
}> {
  const { data } = await apiClient.post<{
    checkout_url: string;
    reference: string;
  }>('/subscriptions', { plan_id: planId });
  return { checkoutUrl: data.checkout_url, reference: data.reference };
}
