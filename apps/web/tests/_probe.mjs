import { chromium } from '@playwright/test';
const WEB = 'http://localhost:3000';

async function attempt(page, email, pw) {
  return page.evaluate(async ({ email, pw }) => {
    const C = window.Clerk;
    const r = {};
    try {
      const si = await C.client.signIn.create({ identifier: email });
      r.hasPassword = (si.supportedFirstFactors || []).some(f => f.strategy === 'password');
      const a = await si.attemptFirstFactor({ strategy: 'password', password: pw });
      r.status = a.status;
      r.msg = a.message || null;
      r.errCode = (a.errors && a.errors[0] && a.errors[0].code) || null;
      r.errMsg = (a.errors && a.errors[0] && a.errors[0].long_message) || null;
      r.createdSession = a.createdSessionId || null;
      r.second = (a.supportedSecondFactors || []).map(f => f.strategy);
      r.firstVerif = a.firstFactorVerification ? a.firstFactorVerification.strategy : null;
    } catch (e) {
      r.threw = String(e && e.message || e).slice(0, 300);
      if (e.errors) r.errors = JSON.stringify(e.errors).slice(0, 600);
    }
    return r;
  }, { email, pw });
}

const b = await chromium.launch();
const c = await b.newContext();
const p = await c.newPage();
await p.goto(WEB + '/sign-in', { waitUntil: 'domcontentloaded' });
await p.waitForTimeout(5000);
for (const [email, pw] of [
  ['e2e.coach.test@mrtraining.dev', 'e2e-password-2026'],
  ['anthonyrivera51@gmail.com', 'WRONG'],
]) {
  console.log(email, JSON.stringify(await attempt(p, email, pw), null, 1));
}
await b.close();
