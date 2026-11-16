import { test as setup, expect } from '@playwright/test';

/**
 * Clerk mock authentication for Playwright E2E.
 *
 * Per Clerk's Playwright testing guide, instead of clicking through the
 * Device Trust / email-code sign-in UI in every test, we create a session
 * directly via the Clerk Backend API and inject the `__session` cookie.
 * This gives the Next.js middleware + ClerkProvider an authenticated
 * session without touching the sign-in form.
 *
 * The coach user is pre-provisioned in the Clerk dev instance.
 */
const COACH_CLERK_USER_ID =
  process.env.E2E_COACH_CLERK_USER_ID || 'user_3KTNABTDQC8kDXc0i5kZpUDXHLI';
const CLERK_SECRET_KEY =
  process.env.CLERK_SECRET_KEY || 'sk_test_oH7uHCXGIt1Fbl7KzSMp95qo24sFjM1Rbsum1b7jAp';
const CLERK_API_URL = 'https://api.clerk.com/v1';

setup('create coach Clerk session (mock auth)', async ({ page }) => {
  // 1. Create a Clerk session for the coach user via the Backend API.
  const sessionRes = await page.request.post(`${CLERK_API_URL}/sessions`, {
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    data: JSON.stringify({ user_id: COACH_CLERK_USER_ID }),
  });
  expect(sessionRes.ok(), `Clerk session creation failed: ${await sessionRes.text()}`).toBeTruthy();
  const session = await sessionRes.json();

  // 2. Mint a session token (JWT) for that session.
  const tokenRes = await page.request.post(`${CLERK_API_URL}/sessions/${session.id}/tokens`, {
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  expect(tokenRes.ok(), `Clerk token creation failed: ${await tokenRes.text()}`).toBeTruthy();
  const { jwt } = await tokenRes.json();

  // 3. Inject the __session cookie so the Next.js middleware and Clerk
  //    frontend see an authenticated session on the very first request.
  await page.context().addCookies([
    {
      name: '__session',
      value: jwt,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      sameSite: 'Lax',
    },
  ]);

  // 4. Seed the cookie on the target domain so SSR middleware reads it.
  await page.goto('http://localhost:3000');

  // 5. Persist the authenticated storage state for the dependent test project.
  await page.context().storageState({ path: '.auth/coach.json' });
});
