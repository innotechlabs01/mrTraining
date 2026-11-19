import { isCheckoutBlocked, isMediumOperational, PaymentAvailability } from '../paymentAvailability';

describe('paymentAvailability helpers', () => {
  it('blocks on fail_closed', () => {
    const avail: Partial<PaymentAvailability> = { fail_closed: true, checkout_allowed: true, media: [] };
    expect(isCheckoutBlocked(avail as PaymentAvailability)).toBe(true);
  });
  it('respects medium', () => {
    const avail: PaymentAvailability = {
      gate_known: true,
      checked_at: '',
      overall_indicator: '',
      overall_description: '',
      checkout_allowed: true,
      reason: 'ok',
      degraded: false,
      api_operational: true,
      checkout_operational: true,
      media: [{ id: 'm1', name: 'PSE', status: 'operational', operational: false }],
      unresolved_incidents: 0,
      fail_closed: false,
      api_status: 'operational',
      checkout_status: 'operational',
    };
    expect(isMediumOperational(avail, 'PSE')).toBe(false);
  });
});