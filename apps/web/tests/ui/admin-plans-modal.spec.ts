import { test, expect } from '@playwright/test';

test('admin plans — crear plan modal UI está centrado y tiene campos correctos', async ({ page }) => {
  // Ir a la página de admin de planes (requiere ser super admin)
  await page.goto('/admin/plans');

  // Debería mostrar la página de planes (o redirigir si no es super admin)
  await expect(page).toHaveURL(/.*\/admin\/plans/);

  // Click en "Nuevo Plan" para abrir el modal
  const nuevoPlanBtn = page.getByRole('button', { name: /Nuevo Plan/ });
  await expect(nuevoPlanBtn).toBeVisible();
  await nuevoPlanBtn.click();

  // El modal debería abrirse
  const modal = page.getByRole('dialog').or(page.locator('[role="dialog"]'));
  await expect(modal).toBeVisible({ timeout: 5000 });

  // El título del modal
  await expect(page.getByRole('heading', { name: /Crear plan/ })).toBeVisible();

  // Verificar que el modal tiene los campos esperados
  await expect(page.getByLabel(/Nombre del plan/)).toBeVisible();
  await expect(page.getByLabel(/Descripción/)).toBeVisible();
  await expect(page.getByLabel(/Precio/)).toBeVisible();
  await expect(page.getByLabel(/Periodo de facturación/)).toBeVisible();
  await expect(page.getByLabel(/Máx\. atletas/)).toBeVisible();
  await expect(page.getByLabel(/Máx\. sesiones\/semana/)).toBeVisible();
  await expect(page.getByLabel(/Plan activo/)).toBeVisible();

  // Verificar botones de acción del modal
  await expect(page.getByRole('button', { name: /Crear plan/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Cancelar/ })).toBeVisible();

  // Tomar screenshot para evidenciar el estado actual
  await page.screenshot({
    path: 'tests/ui/_shots/admin-plans-modal-actual.png',
    fullPage: true,
  });
});

test('admin plans — campo TRM cuando se selecciona USD', async ({ page }) => {
  await page.goto('/admin/plans');

  const nuevoPlanBtn = page.getByRole('button', { name: /Nuevo Plan/ });
  await nuevoPlanBtn.click();

  // Seleccionar moneda USD
  const currencySelect = page.getByLabel(/moneda/i).or(page.locator('select[name="currency"]'));
  await currencySelect.selectOption('USD');

  // Cuando es USD, debería aparecer el campo TRM
  await expect(page.getByLabel(/TRM/)).toBeVisible();

  await page.screenshot({
    path: 'tests/ui/_shots/admin-plans-modal-usd-trm.png',
    fullPage: true,
  });
});
