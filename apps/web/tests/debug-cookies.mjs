import { chromium } from '@playwright/test';

const URL = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  // First, do a real login to see what cookies are set
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
  await page.keyboard.press('Enter');
  
  // Wait for either redirect or code input
  await page.waitForTimeout(10000);
  
  const codeInput = page.locator('input[autocomplete="one-time-code"]');
  const codeCount = await codeInput.count();
  
  if (codeCount > 0) {
    console.log('=== Filling code 424242 ===');
    await codeInput.fill('424242');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(5000);
  }
  
  console.log('=== Current URL:', page.url(), '===');
  
  // Get all cookies
  const cookies = await context.cookies();
  console.log('=== COOKIES ===');
  cookies.forEach(c => console.log(`  ${c.name}=${c.value.slice(0,50)}... (domain: ${c.domain}, path: ${c.path})`));
  
  // Get localStorage
  const localStorage = await page.evaluate(() => {
    const items: Record<string, string> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) items[key] = localStorage.getItem(key) || '';
    }
    return items;
  });
  console.log('=== LOCALSTORAGE ===');
  Object.entries(localStorage).forEach(([k,v]) => console.log(`  ${k}=${v.slice(0,80)}...`));
  
  console.log('=== Test complete - browser will stay open for 60s ===');
  await page.waitForTimeout(60000);
  await browser.close();
})();