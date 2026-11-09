import { isCheckoutBlocked, isMediumOperational, PaymentAvailability } from '../paymentAvailability';

describe('paymentAvailability helpers', () => {
  it('blocks when fail_closed', () => {
    expect(isCheckoutBlocked({ fail_closed: true, checkout_allowed: true } as unknown as PaymentAvailability)).toBe(true);
  });
  it('blocks when checkout not allowed', () => {
    expect(isCheckoutBlocked({ fail_closed: false, checkout_allowed: false } as unknown as PaymentAvailability)).toBe(true);
  });
  it('allows when available', () => {
    expect(isCheckoutBlocked({ fail_closed: false, checkout_allowed: true } as unknown as PaymentAvailability)).toBe(false);
  });
  it('respects medium status', () => {
    const avail = { media: [{ id: 'm1', name: 'PSE', status: 'degraded', operational: false }] } as unknown as PaymentAvailability;
    expect(isMediumOperational(avail, 'PSE')).toBe(false);
    expect(isMediumOperational(avail, 'missing')).toBe(true);
  });
});