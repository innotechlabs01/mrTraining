import { test, expect } from '@playwright/test';
import { testUsers, getClerkToken } from '../helpers/api';

test.describe('Authentication Flow', () => {
  test('should redirect to sign-in when accessing protected route', async ({ page }) => {
    await page.goto('/coach');
    await expect(page.locator('text=Sign in, text=Iniciar sesión')).toBeVisible({ timeout: 10000 });
  });

  test('should sign in as coach', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"], input[type="email"]', testUsers[0].email);
    await page.fill('input[name="password"], input[type="password"]', testUsers[0].password);
    
    await page.click('button[type="submit"]:has-text("Sign in"), button[type="submit"]:has-text("Iniciar sesión")');
    
    await expect(page).toHaveURL(/\/coach/, { timeout: 15000 });
  });

  test('should sign in as athlete', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"], input[type="email"]', testUsers[1].email);
    await page.fill('input[name="password"], input[type="password"]', testUsers[1].password);
    
    await page.click('button[type="submit"]:has-text("Sign in"), button[type="submit"]:has-text("Iniciar sesión")');
    
    await expect(page).toHaveURL(/\/athlete|\/coach/, { timeout: 15000 });
  });

  test('should persist session after reload', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    await page.fill('input[name="email"], input[type="email"]', testUsers[0].email);
    await page.fill('input[name="password"], input[type="password"]', testUsers[0].password);
    await page.click('button[type="submit"]');
    
    await expect(page).toHaveURL(/\/coach/, { timeout: 15000 });
    
    await page.reload();
    await expect(page).toHaveURL(/\/coach/, { timeout: 10000 });
  });
});

test.describe('Role-based Access', () => {
  test('coach should access coach routes', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="email"]', testUsers[0].email);
    await page.fill('input[name="password"]', testUsers[0].password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/coach/, { timeout: 15000 });
    
    await page.goto('/coach/users');
    await expect(page.locator('text=Usuarios, text=Users')).toBeVisible({ timeout: 5000 });
  });

  test('should show coach navigation items', async ({ page }) => {
    await page.goto('/sign-in');
    await page.fill('input[name="email"]', testUsers[0].email);
    await page.fill('input[name="password"]', testUsers[0].password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/coach/, { timeout: 15000 });
    
    // Check sidebar navigation
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Training')).toBeVisible();
    await expect(page.locator('text=Comercial')).toBeVisible();
  });
});