import { smartClient as apiClient } from '@infrastructure/api/client';

export interface PaymentMediumAvailability {
  id: string;
  name: string;
  status: string;
  operational: boolean;
}

export interface PaymentAvailability {
  gate_known: boolean;
  checked_at: string;
  overall_indicator: string;
  overall_description: string;
  checkout_allowed: boolean;
  reason: string;
  degraded: boolean;
  api_operational: boolean;
  checkout_operational: boolean;
  media: PaymentMediumAvailability[];
  unresolved_incidents: number;
  fail_closed: boolean;
  api_status: string;
  checkout_status: string;
}

export async function getPaymentAvailability(): Promise<PaymentAvailability> {
  const { data } = await apiClient.get('/payments/availability');
  const payload = (data as any)?.data ?? data;
  return payload as PaymentAvailability;
}

export const paymentAvailabilityService = {
  get: getPaymentAvailability,
  getPaymentAvailability,
};

export const isMediumOperational = (
  availability: PaymentAvailability | null | undefined,
  medium: string,
): boolean => {
  if (!availability) return true;
  const match = (availability.media ?? []).find((m) => m.id === medium || m.name === medium);
  return match ? match.operational : true;
};

export const isCheckoutBlocked = (
  availability: PaymentAvailability | null | undefined,
): boolean => {
  if (!availability) return false;
  return !!availability.fail_closed || !availability.checkout_allowed;
};