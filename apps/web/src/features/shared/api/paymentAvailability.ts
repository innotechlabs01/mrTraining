import { goFetch } from '@/lib/api/go-client';
import type { PaymentAvailability } from '../types/paymentAvailability';

export const paymentAvailabilityApi = {
  get: (auth = true): Promise<PaymentAvailability> =>
    goFetch<PaymentAvailability>('/api/v1/payments/availability', { auth }),

  getPaymentAvailability: (auth = true): Promise<PaymentAvailability> =>
    goFetch<PaymentAvailability>('/api/v1/payments/availability', { auth }),
};