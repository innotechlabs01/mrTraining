import { chromium } from '@playwright/test';

const URL = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(`${URL}/sign-in`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: /coach/i }).first().click();
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'e2e.coach.test@mrtraining.dev');
  await page.keyboard.press('Enter');
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', 'e2e-password-2026');
  await page.keyboard.press('Enter');

  // Clerk Device Trust: new devices get an email-code second factor.
  // Dev limiter may 429 the code send; retry via the in-page Try Again button.
  const codeInput = page.locator('input[autocomplete="one-time-code"]');
  for (let i = 0; i < 8; i++) {
    const visible = await codeInput.count().catch(() => 0);
    if (visible > 0) break;
    const tryAgain = page.getByRole('button', { name: /try again/i });
    if (await tryAgain.count()) {
      console.log('attempt', i, '- clicking Try Again (rate limited)');
      await tryAgain.first().click().catch(() => {});
      await page.waitForTimeout(60000);
    } else if (i < 7) {
      await page.waitForTimeout(20000);
    }
  }

  if (await codeInput.count()) {
    console.log('code input visible — filling 424242');
    await codeInput.fill('424242');
    await page.keyboard.press('Enter');
    try {
      await page.waitForURL(/\/coach/, { timeout: 30000 });
    } catch {}
  }

  console.log('URL:', page.url());
  if (page.url().includes('/coach')) {
    await page.context().storageState({ path: '.auth/coach.json' });
    console.log('saved .auth/coach.json');
    // verify test token endpoint
    const r = await page.request.get(`${URL}/api/test/auth-token`);
    console.log('auth-token:', r.status(), (await r.text()).slice(0, 80));
  } else {
    const show = page.getByRole('button', { name: /(Show|Hide) Errors/i });
    if (await show.count()) await show.first().click().catch(() => {});
    const alerts = await page.locator('[role="alert"]').allInnerTexts();
    console.log('NOT logged in. alerts:', JSON.stringify(alerts));
  }
  await browser.close();
})();
