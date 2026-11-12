import { chromium } from '@playwright/test';

const URL = 'http://localhost:3000';
(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  console.log('=== Going to landing page ===');
  await page.goto(URL);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(3000);
  
  console.log('=== URL:', page.url(), '===');
  
  // Check for styles
  const stylesheets = await page.locator('link[rel="stylesheet"]').count();
  console.log('Stylesheets:', stylesheets);
  
  // Check for inline styles
  const styleTags = await page.locator('style').count();
  console.log('Style tags:', styleTags);
  
  // Check computed styles of body
  const bodyStyles = await page.evaluate(() => {
    const body = document.body;
    const computed = window.getComputedStyle(body);
    return {
      backgroundColor: computed.backgroundColor,
      color: computed.color,
      fontFamily: computed.fontFamily,
      minHeight: computed.minHeight,
    };
  });
  console.log('Body computed styles:', JSON.stringify(bodyStyles, null, 2));
  
  // Check hero section
  const hero = await page.locator('section').first();
  if (await hero.count()) {
    const heroStyles = await hero.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        backgroundColor: computed.backgroundColor,
        padding: computed.padding,
        minHeight: computed.minHeight,
      };
    });
    console.log('Hero styles:', JSON.stringify(heroStyles, null, 2));
  }
  
  // Check if Tailwind classes are working
  const hasBrandPrimary = await page.locator('[class*="brand-primary"]').count();
  console.log('Elements with brand-primary class:', hasBrandPrimary);
  
  // Check for any errors in console
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  
  // Take screenshot
  await page.screenshot({ path: 'landing-check.png', fullPage: true });
  console.log('Screenshot saved to landing-check.png');
  
  // Get HTML of body
  const bodyHTML = await page.locator('body').innerHTML();
  console.log('Body HTML (first 2000 chars):');
  console.log(bodyHTML.slice(0, 2000));
  
  await browser.close();
})();