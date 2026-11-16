jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
  useSignUp: jest.fn(),
  useSignIn: jest.fn(),
  ClerkProvider: jest.fn(),
}));

import { destinationFor } from '@/app/(auth)/sign-in/destinationFor';

function searchParamsFrom(entries: [string, string][]): URLSearchParams {
  const params = new URLSearchParams();
  entries.forEach(([k, v]) => params.set(k, v));
  return params;
}

describe('destinationFor()', () => {
  describe('redirect_url wins over plan', () => {
    it('returns redirect_url when both redirect_url and plan are present', () => {
      const sp = searchParamsFrom([
        ['redirect_url', '/payment/success?checkout=abc'],
        ['plan', 'plan-seed-starter'],
      ]);
      expect(destinationFor(sp, false, 'coach')).toBe('/payment/success?checkout=abc');
    });
  });

  describe('plan without redirect_url', () => {
    it('resumes checkout at /payment/interstitial?plan=...', () => {
      const sp = searchParamsFrom([['plan', 'plan-seed-starter']]);
      expect(destinationFor(sp, false, 'coach')).toBe(
        '/payment/interstitial?plan=plan-seed-starter',
      );
    });

    it('encodes special characters in plan', () => {
      const sp = searchParamsFrom([['plan', 'plan a/b']]);
      expect(destinationFor(sp, false, 'coach')).toBe('/payment/interstitial?plan=plan%20a%2Fb');
    });

    it('falls back to role home when no plan and no redirect_url', () => {
      const sp = new URLSearchParams();
      expect(destinationFor(sp, false, 'coach')).toBe('/coach/plan');
      expect(destinationFor(sp, false, undefined)).toBe('/');
      expect(destinationFor(sp, true, undefined)).toBe('/admin/dashboard');
    });
  });

  describe('plan absent or empty', () => {
    it('falls back to role home when plan is absent', () => {
      const sp = new URLSearchParams();
      expect(destinationFor(sp, false, 'coach')).toBe('/coach/plan');
    });

    it('treats an empty plan as absent and falls back to role home', () => {
      const sp = searchParamsFrom([['plan', '']]);
      expect(destinationFor(sp, false, 'coach')).toBe('/coach/plan');
    });
  });

  describe('unknown-role fallback', () => {
    it('falls back to landing for a role that is neither coach nor super admin', () => {
      const sp = new URLSearchParams();
      expect(destinationFor(sp, false, 'athlete')).toBe('/');
      expect(destinationFor(sp, false, 'admin')).toBe('/');
    });
  });
});
