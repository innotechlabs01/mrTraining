import { chromium } from '@playwright/test';

const URL = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => console.log('CONSOLE:', msg.type(), msg.text().slice(0, 200)));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));
  
  console.log('=== Step 1: Go to landing page ===');
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  console.log('=== Landing page loaded ===');
  console.log('URL:', page.url());
  
  // Check for plan cards
  const planCards = await page.locator('#planes .grid > div').count();
  console.log('Plan cards found:', planCards);
  
  // Click "Elegir plan" on first plan
  console.log('=== Clicking "Elegir plan" on first plan ===');
  const firstPlanButton = page.locator('#planes .grid > div').first().locator('a:has-text("Elegir plan")');
  if (await firstPlanButton.count() > 0) {
    await firstPlanButton.first().click();
    await page.waitForTimeout(3000);
    console.log('After click URL:', page.url());
  } else {
    console.log('Button not found, checking HTML...');
    const html = await page.locator('#planes .grid > div').first().innerHTML();
    console.log('First plan HTML:', html.slice(0, 500));
  }
  
  // Check if redirected to sign-up
  if (page.url().includes('/sign-up')) {
    console.log('=== Redirected to sign-up page ===');
    console.log('URL:', page.url());
    
    // Check for plan parameter
    const planParam = new URL(page.url()).searchParams.get('plan');
    console.log('Plan param:', planParam);
  }
  
  await page.waitForTimeout(60000);
  await browser.close();
})();