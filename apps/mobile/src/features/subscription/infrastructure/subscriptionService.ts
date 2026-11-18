/**
 * Subscription API service.
 *
 * Consumes the Go API (single source of truth) and validates every response
 * with Zod before returning domain models. Never returns raw API shapes to
 * callers.
 */

import { isAxiosError } from 'axios';

import { apiClient } from '@/infrastructure/api/client';
import {
  MembershipStatusSchema,
  SubscriptionSchema,
  type MembershipStatusDto,
  type MembershipSummaryDto,
  type SubscriptionDto,
} from './subscriptionSchemas';
import type {
  MembershipStatus,
  MembershipSummary,
  Subscription,
} from '../domain/subscription';

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

function mapMembershipSummary(dto: MembershipSummaryDto): MembershipSummary {
  return {
    id: dto.id,
    planName: dto.planName,
    planPrice: dto.planPrice,
    billingPeriod: dto.billingPeriod,
    currentPeriodStart: dto.currentPeriodStart,
    currentPeriodEnd: dto.currentPeriodEnd,
    paymentDueDate: dto.paymentDueDate,
    athleteId: dto.athleteId,
    coachId: dto.coachId,
  };
}

function mapMembershipStatus(dto: MembershipStatusDto): MembershipStatus {
  return {
    hasActiveMembership: dto.hasActiveMembership,
    status: dto.status,
    isInGracePeriod: dto.isInGracePeriod,
    daysRemaining: dto.daysRemaining,
    expiresAt: dto.expiresAt,
    membership: dto.membership ? mapMembershipSummary(dto.membership) : null,
    membershipId: dto.membershipId,
    coachPlanLimitExceeded: dto.coachPlanLimitExceeded,
    coachPlanMaxAthletes: dto.coachPlanMaxAthletes,
    coachAthletesCount: dto.coachAthletesCount,
    coachPlanName: dto.coachPlanName,
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
  try {
    const { data } = await apiClient.get<SubscriptionDto>('/subscriptions/me');
    const parsed = SubscriptionSchema.parse(data);
    return mapSubscription(parsed);
  } catch (error) {
    // No subscription row is a valid state, not a gate error.
    if (isAxiosError(error) && error.response?.status === 404) {
      return null;
    }
    throw error;
  }
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
