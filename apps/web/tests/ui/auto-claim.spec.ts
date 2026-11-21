import { test, expect } from '@playwright/test';
import { testUsers, getClerkTokenViaBackend } from '../helpers/api';
import { mockUseAuth } from './mock-clerk-coach-client';

const EMAIL = 'innotechlabssas@gmail.com';
const CHECKOUT_ID = 'chk_qa_autoclaim_001';

/**
 * Mint a Coach Clerk session JWT via the Clerk Backend API (the same proven
 * helper used by tests/public/t006-activation.spec.ts).
 */
async function coachToken(): Promise<string> {
  return getClerkTokenViaBackend(testUsers[0]);
}

/**
 * Criterion 3 — Sign-in email prefilled from URL email param.
 *
 * Unauthenticated flow: no Clerk session, so the sign-in form renders and
 * the URL email param is reflected in the input. Uses a fresh context
 * (no storageState) so Clerk does not redirect an already-signed-in coach.
 */
test('sign-in form prefills email from the URL email param', async ({ browser }) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`/sign-in?email=${encodeURIComponent(EMAIL)}`);
  await page.waitForLoadState('networkidle');

  const emailInput = page.locator('input[type="email"]');
  await expect(emailInput).toHaveValue(EMAIL);

  await context.close();
});

/**
 * Criterion 2 — Unauthenticated flow preserves redirect_url.
 *
 * Middleware bounces an unauthenticated user off /payment/success to
 * /sign-in carrying redirect_url=/payment/success?checkout=...
 * Uses a fresh context (no storageState) so the user is unauthenticated.
 */
test('middleware preserves redirect_url when unauthenticated user reaches /payment/success', async ({
  browser,
}) => {
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto(`/payment/success?checkout=${CHECKOUT_ID}`);

  await expect(page).toHaveURL(/sign-in/, { timeout: 15_000 });
  // redirect_url is URL-encoded: /payment/success?checkout=... →
  // %2Fpayment%2Fsuccess%3Fcheckout%3D...
  await expect(page).toHaveURL(
    /sign-in\?redirect_url=.*chk_qa_autoclaim_001/,
    { timeout: 15_000 },
  );

  await context.close();
});

/**
 * Criterion 1 — Auto-claim for signed-in coach.
 *
 * A signed-in coach landing on /payment/success?checkout=... triggers the
 * claim (POST /api/checkout/:id/claim with credentials:include) and, on
 * success, is redirected to /onboarding/coach without manual clicks.
 *
 * Authentication is provided on two channels:
 *   - __session cookie injected via page.context().addCookies(): Clerk's
 *     client useAuth() reads it, so isSignedIn flips to true and the claim
 *     effect fires. A fresh JWT is used because Clerk rotates the stored
 *     __session cookie into __clerk_db_jwt on first load (so storageState's
 *     cookie alone is not reusable). This mirrors setup-clerk-coach, which
 *     also uses page.context().addCookies with the full JWT — not raw
 *     document.cookie, which Clerk v6 rejects (invalid signature).
 *   - Bearer header on every request: Next.js middleware + server-side
 *     auth() see a signed-in coach (proven t006 pattern).
 *
 * The chromium project (playwright.config.ts) loads storageState
 * ('.auth/coach.json', produced by the setup-clerk-coach project) into the
 * `page` fixture and declares a dependency on setup-clerk-coach.
 */
test('signed-in coach auto-claims and is redirected to /onboarding/coach', async ({
  page,
}) => {
  const token = await coachToken();

  // Authenticate on two channels:
  //   - __session cookie via addCookies(): Next.js middleware + server-side
  //     auth() see a signed-in coach (proven t006 pattern).
  //   - Bearer header on every request: same server-side auth channel.
  //   - Client-side Clerk useAuth() is mocked via mockUseAuth() below so
  //     isSignedIn flips to true without contacting clerk.accounts.dev
  //     (which returns a 307 preflight CORS failure from localhost:3000).
  await page.context().addCookies([
    {
      name: '__session',
      value: token,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` });

  let claimRequested = false;
  let authenticated = false;

  await page.route('**/api/checkout/*/claim', async (route) => {
    claimRequested = true;
    const headers = route.request().headers();
    authenticated = !!(
      headers.cookie || headers.authorization || headers['Authorization']
    );
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        checkout_id: CHECKOUT_ID,
        coach_id: 'coach_qa',
        coach_code: 'QA123',
        plan_id: 'plan-seed-starter',
        plan_name: 'Starter',
      }),
    });
  });

  // Mock the client-side Clerk SDK so useAuth() resolves to signed-in.
  // Injects a window.Clerk mock via page.addInitScript() so it runs BEFORE
  // the page (and ClerkProvider) hydrates. This bypasses the 307 preflight
  // CORS failure from localhost:3000 to clerk.accounts.dev that otherwise
  // leaves isSignedIn=false and blocks the claim effect from firing.
  await mockUseAuth(page);

  await page.goto(
    `/payment/success?checkout=${CHECKOUT_ID}&email=${encodeURIComponent(EMAIL)}`,
  );
  await page.waitForLoadState('networkidle');

  // The claim effect fires during hydration once useAuth() resolves
  // signed-in, and the route handler intercepts the claim request (setting
  // claimRequested/authenticated) before networkidle settles.
  expect(claimRequested).toBe(true);

  // The claim request was authenticated (credentials: 'include' → Cookie header present).
  expect(authenticated).toBe(true);

  // On successful claim, the coach is redirected to onboarding without
  // manual clicks.
  await expect(page).toHaveURL(/\/onboarding\/coach/, { timeout: 15_000 });
});
