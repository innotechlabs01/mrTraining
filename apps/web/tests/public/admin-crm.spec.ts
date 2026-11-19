import { test, expect } from '@playwright/test';

const BASE = 'http://localhost:3000';

test.describe('Admin CRM — páginas y redirects', () => {
  test('las rutas de /admin/* redirigen a /sign-in sin sesión', async ({ page }) => {
    for (const route of ['/admin/dashboard', '/admin/plans', '/admin/settings', '/admin/coaches', '/admin/tickets']) {
      await page.goto(BASE + route, { waitUntil: 'domcontentloaded' });
      expect(page.url()).toContain('/sign-in');
    }
  });

  test('la página de sign-in carga y tiene formulario', async ({ page }) => {
    await page.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    await expect(page.locator('input[type="email"], input[type="text"], button').first()).toBeVisible();
  });

  test('la página pública de inicio carga', async ({ page }) => {
    const res = await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
    expect(res?.status()).toBe(200);
  });

  test('no hay errores de JS de la app en sign-in', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    await page.goto(BASE + '/sign-in', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);
    const appErrors = errors.filter((e) => !e.includes('Clerk') && !e.includes('devtools') && !e.includes('React DevTools'));
    expect(appErrors.length).toBe(0);
  });
});
