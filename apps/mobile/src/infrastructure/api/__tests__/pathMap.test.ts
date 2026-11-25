import { toGoApiPath } from '../client';

describe('GO_API_PATH_MAP / toGoApiPath', () => {
  it('maps /athlete/progress/summary to /progress/summary', () => {
    expect(toGoApiPath('/athlete/progress/summary')).toBe('/progress/summary');
  });

  it('preserves query strings when mapping /athlete/progress/summary', () => {
    expect(toGoApiPath('/athlete/progress/summary?start_date=2026-01-01')).toBe(
      '/progress/summary?start_date=2026-01-01',
    );
  });

  it('maps /athlete/membership to /memberships', () => {
    expect(toGoApiPath('/athlete/membership')).toBe('/memberships');
  });

  it('maps /athlete/membership/status to /athletes/membership/status without prefix hijacking', () => {
    expect(toGoApiPath('/athlete/membership/status')).toBe('/athletes/membership/status');
    expect(toGoApiPath('/athlete/membership/status?refresh=true')).toBe(
      '/athletes/membership/status?refresh=true',
    );
  });

  it('maps /athlete/membership/plans to /athletes/membership/plans without prefix hijacking', () => {
    expect(toGoApiPath('/athlete/membership/plans')).toBe('/athletes/membership/plans');
    expect(toGoApiPath('/athlete/membership/plans?active=true')).toBe(
      '/athletes/membership/plans?active=true',
    );
  });

  it('maps /athlete/membership/123/payments to /memberships/123/payments', () => {
    expect(toGoApiPath('/athlete/membership/123/payments')).toBe('/memberships/123/payments');
  });
});
