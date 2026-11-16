/**
 * Where to land after the sign-in.
 *
 * An internal `redirect_url` wins (that is how the payment flow keeps the
 * plan context). When there is no `redirect_url` but a `plan` query param
 * (sent from sign-up's `form_identifier_exists` redirect), resume checkout
 * at `/payment/interstitial?plan=...`. Otherwise the user goes to the home
 * of their role.
 *
 * Extracted as a pure function so it can be unit-tested independently of the
 * component.
 */
export function destinationFor(
  searchParams: URLSearchParams,
  isSuperAdmin: boolean,
  role?: string,
): string {
  const redirect = searchParams.get('redirect_url');
  if (redirect) {
    let target = redirect;
    // Accept both relative paths (/payment/success?checkout=...) and same-origin
    // absolute URLs (http://localhost:3000/payment/success?checkout=...).
    // Absolute URLs are reduced to pathname + search so we never navigate
    // off-site and the checkout query param is preserved.
    try {
      const u = new URL(redirect);
      if (u.origin === window.location.origin) {
        target = u.pathname + u.search;
      } else {
        target = '';
      }
    } catch {
      // Not an absolute URL: keep as-is when it is a relative path.
    }
    if (target.startsWith('/') && !target.startsWith('//')) {
      return target;
    }
  }
  // No redirect_url: el plan traído desde sign-up reanuda el checkout.
  const plan = searchParams.get('plan');
  if (plan) {
    return `/payment/interstitial?plan=${encodeURIComponent(plan)}`;
  }
  if (isSuperAdmin) return '/admin/dashboard';
  if (role === 'coach') return '/coach/plan';
  return '/';
}
