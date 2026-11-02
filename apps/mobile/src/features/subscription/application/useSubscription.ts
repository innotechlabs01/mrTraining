/**
 * useSubscription — React Query hook for the athlete's subscription status.
 *
 * Fetches and caches the current subscription from the Go API. Provides a
 * `refetch` function so callers can refresh the status after login or when a
 * payment is confirmed.
 */

import { useQuery } from '@tanstack/react-query';
import { getMySubscription, getMembershipStatus } from '../infrastructure/subscriptionService';
import type { MembershipStatus, Subscription } from '../domain/subscription';

export type SubscriptionState =
  | { status: 'loading' }
  | {
      status: 'success';
      subscription: Subscription | null;
      membership: MembershipStatus;
      hasActive: boolean;
    }
  | { status: 'error'; error: Error };

type UseSubscriptionResult = SubscriptionState & { refetch: () => void };

const SUBSCRIPTION_QUERY_KEY = ['athlete-subscription'];
const MEMBERSHIP_QUERY_KEY = ['athlete-membership-status'];

/**
 * Returns the athlete's subscription state plus a refetch function.
 *
 * Call `refetch()` after sign-in or after a payment is confirmed to keep the
 * local status in sync with the backend.
 */
export function useSubscription(): UseSubscriptionResult {
  const subscriptionQuery = useQuery<Subscription | null>({
    queryKey: SUBSCRIPTION_QUERY_KEY,
    queryFn: getMySubscription,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  const membershipQuery = useQuery<MembershipStatus>({
    queryKey: MEMBERSHIP_QUERY_KEY,
    queryFn: getMembershipStatus,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 2,
  });

  const refetch = () => {
    void subscriptionQuery.refetch();
    void membershipQuery.refetch();
  };

  const isLoading =
    subscriptionQuery.isLoading || membershipQuery.isLoading;
  const isError =
    subscriptionQuery.isError || membershipQuery.isError;
  const error = subscriptionQuery.error ?? membershipQuery.error;

  if (isLoading) {
    return { status: 'loading', refetch };
  }

  if (isError) {
    return { status: 'error', error: error as Error, refetch };
  }

  const subscription = subscriptionQuery.data ?? null;
  const membership = membershipQuery.data;
  if (!membership) {
    return { status: 'error', error: new Error('Membership status unavailable'), refetch };
  }
  const hasActive = membership.hasActiveMembership;

  return {
    status: 'success',
    subscription,
    membership,
    hasActive,
    refetch,
  };
}
