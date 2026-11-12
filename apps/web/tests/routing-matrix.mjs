import { chromium } from '@playwright/test';

const WEB = 'http://localhost:3000';
const CLERK = 'https://api.clerk.com/v1';
const SECRET = process.env.CLERK_SECRET_KEY || 'sk_test_oH7uHCXGIt1Fbl7KzSMp95qo24sFjM1Rbsum1b7jAp';

const USERS = {
  super_admin: 'user_3LrC94yrr3qS2XPXRJ17POYop2i',
  coach: 'user_3KTNABTDQC8kDXc0i5kZpUDXHLI',
  athlete: 'user_3KTNAbPRe6Sm7D86vv2XIhviyki',
};

const CASES = [
  ['super_admin', '/', '/admin/dashboard'],
  ['super_admin', '/coach', '/admin/dashboard'],
  ['super_admin', '/coach/users', '/admin/dashboard'],
  ['super_admin', '/admin/coaches', '/admin/coaches'],
  ['coach', '/', '/coach'],
  ['coach', '/admin', '/coach'],
  ['coach', '/coach/users', '/coach/users'],
  ['athlete', '/', '/'],
  ['athlete', '/coach', '/'],
  ['athlete', '/coach/users', '/'],
  ['athlete', '/admin', '/'],
];

const norm = (u) => {
  try {
    return new URL(u, WEB).pathname;
  } catch {
    return u;
  }
};

async function ensureNoRoleUser() {
  const email = 'e2e.norole.test@mrtraining.dev';
  const list = await fetch(`${CLERK}/users?limit=100`, {
    headers: { Authorization: `Bearer ${SECRET}` },
  }).then((r) => r.json());
  const existing = (Array.isArray(list) ? list : []).find((u) =>
    (u.email_addresses || []).some((e) => e.email_address === email)
  );
  if (existing) return existing.id;

  const created = await fetch(`${CLERK}/users`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email_address: [email],
      password: 'e2e-password-2026',
      public_metadata: {},
      private_metadata: {},
    }),
  });
  if (!created.ok) throw new Error(`create user ${created.status}: ${await created.text()}`);
  return (await created.json()).id;
}

/**
 * Clerk rejects a bare `__session` cookie ("dev-browser-missing" /
 * "session-token-and-uat-missing"). Seeding a real dev browser first and
 * pairing the token with `__client_uat` set to the token's own `iat`
 * ("session-token-iat-before-client-uat" otherwise) makes the middleware honor
 * the session — which is what lets us exercise the role gates directly.
 */
async function tokenFor(userId) {
  const s = await fetch(`${CLERK}/sessions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  }).then((r) => r.json());
  const t = await fetch(`${CLERK}/sessions/${s.id}/tokens`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${SECRET}`, 'Content-Type': 'application/json' },
  }).then((r) => r.json());
  const payload = JSON.parse(Buffer.from(t.jwt.split('.')[1], 'base64url').toString());
  return { jwt: t.jwt, iat: payload.iat };
}

(async () => {
  USERS.norole = await ensureNoRoleUser();
  CASES.push(['norole', '/', '/'], ['norole', '/coach', '/'], ['norole', '/admin', '/']);

  const browser = await chromium.launch();
  let pass = 0;
  let fail = 0;

  for (const [role, start, expected] of CASES) {
    const ctx = await browser.newContext();
    try {
      const { jwt, iat } = await tokenFor(USERS[role]);
      const page = await ctx.newPage();
      // Seed the Clerk dev browser cookie before injecting the session.
      await page.goto(`${WEB}/sign-in`, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(2500);
      await ctx.addCookies([
        { name: '__session', value: jwt, url: WEB },
        { name: '__client_uat', value: String(iat), url: WEB },
      ]);
      await page.goto(`${WEB}${start}`, { waitUntil: 'domcontentloaded', timeout: 30000 });

      let got = norm(page.url());
      for (let i = 0; i < 6 && got !== expected; i++) {
        await page.waitForTimeout(800);
        got = norm(page.url());
      }

      const ok = got === expected;
      ok ? pass++ : fail++;
      console.log(`${ok ? 'PASS' : 'FAIL'}  [${role}] ${start} -> ${got} (expected ${expected})`);
    } catch (e) {
      fail++;
      console.log(`ERROR [${role}] ${start}: ${e.message.split('\n')[0]}`);
    } finally {
      await ctx.close();
    }
  }

  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
