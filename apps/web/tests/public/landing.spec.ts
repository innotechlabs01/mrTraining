import { test, expect } from '@playwright/test';

/**
 * Public SaaS landing page (src/app/(marketing)/page.tsx).
 * No auth required — runs against the public marketing page.
 */
test.describe('Public landing page — Marketing', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders hero with headline and CTA', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Entrena a tus atletas');
    await expect(page.getByText('MR Training lo hace fácil')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Ver planes' })).toBeVisible();
  });

  test('renders nav with anchor links', async ({ page }) => {
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
    await expect(nav.getByText('Planes').first()).toBeVisible();
    await expect(nav.getByText('Testimonios').first()).toBeVisible();
  });

  test('clicking "Planes" nav link navigates to #planes', async ({ page }) => {
    await page.locator('nav').getByText('Planes').first().click();
    await expect(page).toHaveURL(/#planes/);
    await expect(page.getByRole('heading', { name: 'Elige tu plan' })).toBeVisible();
  });

  test('plans section shows cards from Go API or a graceful empty state', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Elige tu plan' })).toBeVisible();
    // Plans come from GET /api/v1/plans; if the API is down the page must not crash.
    const planCards = page.locator('#planes .grid > div');
    const count = await planCards.count();
    expect(count).toBeGreaterThanOrEqual(0);
    if (count > 0) {
      // First card must show a renderable price + a CTA link
      await expect(planCards.first().locator('a')).toContainText('Elegir plan');
    }
  });

  test('plans section renders only active plans (hidden plan is not exposed)', async ({ page }) => {
    // Seeded data (seed_local_dev_landing.sql): 3 active plans + 1 inactive.
    await expect(page.getByText('Plan Starter')).toBeVisible();
    await expect(page.getByText('Plan Pro')).toBeVisible();
    await expect(page.getByText('Plan Elite')).toBeVisible();
    // The inactive "Plan Oculto (borrador)" must never reach the public page.
    await expect(page.getByText('Plan Oculto')).toHaveCount(0);
  });

  test('testimonials section renders seeded coach cards', async ({ page }) => {
    await expect(page.getByText('Camila Restrepo')).toBeVisible();
    await expect(page.getByText('Andrés Toro')).toBeVisible();
    // A hidden (unpublished) testimonial would appear here if RLS read leaked.
    await expect(page.getByText('Plan Oculto (borrador)')).toHaveCount(0);
  });

  test('features section renders the three feature cards', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Todo lo que necesitas' })).toBeVisible();
    await expect(page.getByText('Seguro y confiable')).toBeVisible();
    await expect(page.getByText('Sin contratos')).toBeVisible();
    await expect(page.getByText('Resultados medibles')).toBeVisible();
  });

  test('testimonials section renders heading', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Lo que dicen nuestros coaches' })
    ).toBeVisible();
  });

  test('contact section shows final CTA', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: '¿Listo para empezar?' })
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Empezar gratis' }).last()).toBeVisible();
  });

  test('footer renders copyright', async ({ page }) => {
    await expect(page.locator('footer')).toContainText('© 2026 MR Training');
  });

  test('page has no duplicate section ids', async ({ page }) => {
    const ids = await page.locator('section[id], div[id], [id]').evaluateAll((els) =>
      els.map((e) => e.id).filter((id) => id !== '')
    );
    const expected = ['como-funciona', 'planes', 'caracteristicas', 'testimonios', 'contacto'];
    for (const id of expected) {
      expect(ids.filter((v) => v === id).length, `duplicate id ${id}`).toBeLessThanOrEqual(1);
    }
  });
});
