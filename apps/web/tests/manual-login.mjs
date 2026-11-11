import { chromium } from '@playwright/test';

const URL = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== Step 1: Go to sign-in ===');
  await page.goto(`${URL}/sign-in`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  console.log('=== Step 2: Click Coach role ===');
  await page.getByRole('button', { name: /coach/i }).first().click();
  await page.waitForTimeout(1000);
  
  console.log('=== Step 3: Fill email ===');
  await page.waitForSelector('input[type="email"]', { timeout: 10000 });
  await page.fill('input[type="email"]', 'e2e.coach.test@mrtraining.dev');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(2000);
  
  console.log('=== Step 4: Fill password ===');
  await page.waitForSelector('input[type="password"]', { timeout: 10000 });
  await page.fill('input[type="password"]', 'e2e-password-2026');
  await page.waitForTimeout(500);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(3000);
  
  console.log('=== Current URL:', page.url(), '===');
  
  // Check for code input
  const codeInput = page.locator('input[autocomplete="one-time-code"]');
  const codeCount = await codeInput.count();
  console.log('=== Code input count:', codeCount, '===');
  
  if (codeCount > 0) {
    console.log('=== Filling code 424242 ===');
    await codeInput.fill('424242');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
    console.log('=== After code URL:', page.url(), '===');
  } else {
    // Check for error
    const showErrors = page.getByRole('button', { name: /(show|hide) errors/i });
    if (await showErrors.count()) {
      await showErrors.first().click();
      await page.waitForTimeout(500);
    }
    const alerts = await page.locator('[role="alert"]').allInnerTexts();
    console.log('=== ALERTS:', JSON.stringify(alerts), '===');
    
    // Also check for any error text on page
    const bodyText = await page.locator('body').innerText();
    console.log('=== BODY TEXT (first 1000 chars) ===');
    console.log(bodyText.slice(0, 1000));
  }
  
  console.log('=== Test complete - browser will stay open for 60s ===');
  await page.waitForTimeout(60000);
  await browser.close();
})();