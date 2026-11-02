import { smartClient as apiClient } from '@infrastructure/api/client';

/**
 * MercadoPago membership checkout.
 *
 * Server creates a preference from the athlete's CURRENT membership plan
 * (price set by the coach on the web dashboard). The browser flow opens MP,
 * the webhook records the payment and extends the membership period.
 */
export type MembershipPreference = {
  membershipId: string;
  planName: string;
  initPoint: string;
  total: number;
  currency: string;
};

export async function createMembershipPreference(): Promise<MembershipPreference> {
  const { data } = await apiClient.post('/payments/membership/preference');
  const payload = (data as any)?.data ?? data;
  return payload as MembershipPreference;
}
