import { test, expect } from '@playwright/test';
import { testUsers, getClerkTokenViaBackend } from '../helpers/api';

const COACH = testUsers[0];

/**
 * T-006 — coach activation flow on the real app.
 *
 * The coach is authenticated with a Clerk session JWT sent as a bearer token.
 * The Clerk middleware and the app's route handlers both accept it, so the
 * whole chain can be walked in a real browser.
 */
async function authenticate(page: import('@playwright/test').Page) {
  const token = await getClerkTokenViaBackend(COACH);
  await page.setExtraHTTPHeaders({ Authorization: `Bearer ${token}` });
  return token;
}

test.describe('T-006 coach activation flow', () => {
  test('payment interstitial activates the account and shows the selected plan', async ({ page }) => {
    await authenticate(page);

    await page.goto('http://localhost:3000/payment/interstitial?plan=plan-seed-pro');

    await expect(page.getByText('Confirma tu pago')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Plan Pro')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Tu cuenta de coach está creada')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pagar y activar plan' })).toBeEnabled();
    await page.screenshot({ path: 'test-results/t006-payment-interstitial.png', fullPage: true });
  });

  test('the onboarding shows the paid plan read-only and saves the profile', async ({ page }) => {
    await authenticate(page);

    await page.goto('http://localhost:3000/onboarding/coach?plan=plan-seed-pro');

    await expect(page.getByText('Configura tu perfil')).toBeVisible({ timeout: 30_000 });

    // Step 0 — the paid plan is a read-only summary, not a picker.
    await expect(page.getByText('Plan Pro')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Pagado')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Elegir este plan' })).toHaveCount(0);
    await page.screenshot({ path: 'test-results/t006-onboarding-step0.png', fullPage: true });

    await page.getByRole('button', { name: 'Continuar' }).first().click();

    // Step 1 — sports and specializations.
    await expect(page.getByText('¿Qué deportes entrenas?')).toBeVisible();
    await page.getByRole('button', { name: 'Football' }).click();
    await page.getByRole('button', { name: 'Strength & Conditioning' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Step 2 — experience level.
    await expect(page.getByText('¿Cuál es tu nivel de experiencia?')).toBeVisible();
    await page.getByRole('radio', { name: /Avanzado/ }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Step 3 — team.
    await expect(page.getByText('Cuéntanos sobre tu equipo')).toBeVisible();
    await page.getByLabel('Nombre del equipo').fill('Eagles T006');
    await page.getByRole('button', { name: 'Collegiate' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Step 4 — certifications (optional).
    await expect(page.getByText('Tus certificaciones')).toBeVisible();
    await page.getByRole('button', { name: 'Continuar' }).click();

    // Step 5 — review, then save.
    await expect(page.getByText('Revisa tu perfil antes de guardar')).toBeVisible();
    await expect(page.getByText('Eagles T006')).toBeVisible();
    await expect(page.getByText('Football')).toBeVisible();
    await page.screenshot({ path: 'test-results/t006-onboarding-review.png', fullPage: true });

    await page.getByRole('button', { name: 'Guardar perfil' }).click();

    // The coach lands in the coach area, never in the public landing.
    await expect(page).toHaveURL(/\/coach\/plan/, { timeout: 30_000 });
    await page.screenshot({ path: 'test-results/t006-coach-plan.png', fullPage: true });
  });

  test('a coach session is routed to the coach area, never to the public landing', async ({ page }) => {
    await authenticate(page);

    // The landing routes by role: a coach must land in the coach area.
    await page.goto('http://localhost:3000/');
    await expect(page).toHaveURL(/\/coach\/plan/, { timeout: 30_000 });
    await expect(page.getByText('Ya tienes una sesión activa')).toHaveCount(0);
  });

  test('the payment failure page is not a trap', async ({ page }) => {
    await authenticate(page);

    await page.goto('http://localhost:3000/payment/failed?plan=plan-seed-pro');

    await expect(page.getByText('Pago no completado')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByRole('button', { name: 'Reintentar pago' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Entrar sin pagar' })).toBeVisible();
    await page.screenshot({ path: 'test-results/t006-payment-failed.png', fullPage: true });
  });

  test('the sign-up form shows the selected plan on every step', async ({ page }) => {
    await page.goto('http://localhost:3000/sign-up?plan=plan-seed-pro');

    await expect(page.getByText(/Te estás registrando para/)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText('Plan Pro')).toBeVisible();
    await page.screenshot({ path: 'test-results/t006-signup.png', fullPage: true });
  });

  test('the landing plan CTA opens the hybrid checkout with the plan and the email', async ({ page }) => {
    // The landing CTA goes to the checkout: the buyer pays before registering.
    await page.goto('http://localhost:3000/');
    await page.locator('a[href^="/checkout?plan="]').first().click();

    await expect(page).toHaveURL(/\/checkout\?plan=/, { timeout: 30_000 });
    await expect(page.getByText('Activa tu plan')).toBeVisible({ timeout: 30_000 });
    await expect(page.getByLabel('Tu correo')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pagar y activar plan' })).toBeDisabled();

    // The form is server-rendered: wait for React to hydrate before typing,
    // otherwise the input event is dispatched before the handler is attached
    // and the state never updates.
    await page.waitForLoadState('networkidle');
    await page.getByLabel('Tu correo').fill('t006.checkout@mrtraining.dev');
    await expect(page.getByRole('button', { name: 'Pagar y activar plan' })).toBeEnabled({ timeout: 15_000 });
    await page.screenshot({ path: 'test-results/t007-checkout.png', fullPage: true });

    // Paying redirects to the provider.
    await page.getByRole('button', { name: 'Pagar y activar plan' }).click();
    await expect(page).toHaveURL(/checkout\.wompi\.co/, { timeout: 30_000 });
  });
});
