import { chromium } from '@playwright/test';

const URL = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text().slice(0, 200));
  });
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  console.log('=== Step 1: Go to landing page ===');
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  console.log('=== Clicking "Elegir plan" on first plan ===');
  const firstPlanButton = page.locator('#planes .grid > div').first().locator('a:has-text("Elegir plan")');
  await firstPlanButton.first().click();
  await page.waitForTimeout(3000);
  
  console.log('After click URL:', page.url());
  
  // Check if on sign-up page
  if (page.url().includes('/sign-up')) {
    console.log('=== On sign-up page ===');
    
    // Fill sign-up form
    console.log('=== Filling sign-up form ===');
    await page.fill('input[type="email"]', 'test-coach-' + Date.now() + '@example.com');
    await page.fill('input[type="password"]', 'TestPassword123!');
    await page.fill('input[name="fullName"]', 'Test Coach');
    
    // Click sign up
    await page.click('button[type="submit"]:has-text("Sign up"), button[type="submit"]:has-text("Crear cuenta")');
    await page.waitForTimeout(10000);
    
    console.log('After sign-up URL:', page.url());
    
    // Check if redirected to onboarding
    if (page.url().includes('/onboarding/coach')) {
      console.log('=== On onboarding page ===');
      console.log('URL:', page.url());
      
      const planParam = new URL(page.url()).searchParams.get('plan');
      console.log('Plan param:', planParam);
    }
  }
  
  await page.waitForTimeout(60000);
  await browser.close();
})();