jest.mock('@clerk/nextjs', () => ({
  useAuth: jest.fn(),
  useUser: jest.fn(),
  useSignUp: jest.fn(),
  useSignIn: jest.fn(),
}));

import { signUpGuardDestination, isSubscriptionSkipped } from '@/app/(auth)/sign-up/signUpGuard';

describe('signUpGuardDestination()', () => {
  describe('super admin', () => {
    it('redirects to /admin/dashboard regardless of role or plan', () => {
      expect(signUpGuardDestination(true, 'coach', 'paid', 'plan-x')).toBe('/admin/dashboard');
      expect(signUpGuardDestination(true, undefined, 'pending', null)).toBe('/admin/dashboard');
      expect(signUpGuardDestination(true, 'coach', null, null)).toBe('/admin/dashboard');
    });
  });

  describe('coach', () => {
    it('redirects paid coach to /coach/plan', () => {
      expect(signUpGuardDestination(false, 'coach', 'paid', 'plan-x')).toBe('/coach/plan');
    });

    it('redirects omitted coach directly to /coach/plan regardless of subscription check', () => {
      expect(signUpGuardDestination(false, 'coach', null, 'plan-x', true)).toBe('/coach/plan');
      expect(signUpGuardDestination(false, 'coach', 'pending', 'plan-x', true)).toBe('/coach/plan');
    });

    it('redirects pending coach to /payment/interstitial?plan=...', () => {
      expect(
        signUpGuardDestination(false, 'coach', 'pending', 'plan-seed-starter'),
      ).toBe('/payment/interstitial?plan=plan-seed-starter');
    });

    it('redirects pending coach without plan to /payment/interstitial', () => {
      expect(signUpGuardDestination(false, 'coach', 'pending', null)).toBe('/payment/interstitial');
    });

    it('encodes special characters in plan', () => {
      expect(
        signUpGuardDestination(false, 'coach', 'pending', 'plan a/b'),
      ).toBe('/payment/interstitial?plan=plan%20a%2Fb');
    });

    it('returns null while subscription status is being checked', () => {
      expect(signUpGuardDestination(false, 'coach', null, 'plan-x')).toBeNull();
    });
  });

  describe('isSubscriptionSkipped()', () => {
    it('returns true when skip_subscription is set in publicMetadata', () => {
      const claims = {
        publicMetadata: {
          membership_status: { skip_subscription: true },
        },
      };
      expect(isSubscriptionSkipped(claims, null)).toBe(true);
    });

    it('returns false when skip_subscription is false or missing', () => {
      expect(isSubscriptionSkipped(null, null)).toBe(false);
      expect(isSubscriptionSkipped({ publicMetadata: {} }, null)).toBe(false);
      expect(
        isSubscriptionSkipped({ publicMetadata: { membership_status: { skip_subscription: false } } }, null),
      ).toBe(false);
    });
  });

  describe('no role', () => {
    it('redirects to landing /', () => {
      expect(signUpGuardDestination(false, undefined, null, null)).toBe('/');
      expect(signUpGuardDestination(false, 'athlete', null, null)).toBe('/');
    });
  });
});
