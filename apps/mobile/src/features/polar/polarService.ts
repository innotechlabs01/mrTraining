import { smartClient as apiClient } from '@infrastructure/api/client';

export interface CheckoutResponse {
  url?: string;
  // other fields as needed
}

/** Create a Polar checkout session */
export const createCheckout = async (athleteID: string, membershipID: string): Promise<CheckoutResponse> => {
  const { data } = await apiClient.post<CheckoutResponse>('/polar/checkout', { athleteID, membershipID });
  return data;
};
