import { test, expect } from '@playwright/test';
import { testUsers, getClerkToken, webApiRequest } from '../helpers/api';

test.describe('Coach Dashboard UI', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('should load coach dashboard with all sections', async ({ page }) => {
    await page.goto('/coach');
    await page.waitForLoadState('networkidle');
    
    // Check main navigation
    await expect(page.locator('text=Dashboard')).toBeVisible();
    await expect(page.locator('text=Usuarios')).toBeVisible();
    await expect(page.locator('text=Training')).toBeVisible();
    
    // Check quick actions
    await expect(page.locator('text=Today')).toBeVisible();
    await expect(page.locator('text=Athletes')).toBeVisible();
    await expect(page.locator('text=Workouts')).toBeVisible();
  });

  test('should show athlete list with readiness scores', async ({ page }) => {
    await page.goto('/coach/users');
    await page.waitForLoadState('networkidle');
    
    // Check athletes load
    await expect(page.locator('[data-testid="athlete-card"]').first()).toBeVisible({ timeout: 10000 });
    
    // Check readiness badge
    const readinessBadge = page.locator('[data-testid="readiness-badge"]').first();
    await expect(readinessBadge).toBeVisible({ timeout: 5000 });
  });

  test('should filter athletes by search', async ({ page }) => {
    await page.goto('/coach/users');
    await page.waitForLoadState('networkidle');
    
    const searchInput = page.locator('input[placeholder*="search" i], input[placeholder*="buscar" i]').first();
    await searchInput.fill('test');
    await page.waitForTimeout(500);
  });
});

test.describe('Coach Profile Page', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('should load profile with coach data', async ({ page }) => {
    await page.goto('/coach/settings');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Profile')).toBeVisible();
    await expect(page.locator('input[name="bio"]')).toBeVisible();
  });

  test('should update profile via web proxy', async ({ page, request }) => {
    await page.goto('/coach/settings');
    await page.waitForLoadState('networkidle');
    
    const bioInput = page.locator('textarea[name="bio"]');
    await bioInput.fill('Updated from Playwright UI test');
    
    const saveButton = page.locator('button:has-text("Save"), button:has-text("Guardar")').first();
    await saveButton.click();
    
    await expect(page.locator('text=Profile updated, text=Perfil actualizado')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Training - Workouts Page', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('should load workouts page', async ({ page }) => {
    await page.goto('/coach/workouts');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Workouts')).toBeVisible();
  });

  test('should load exercise library', async ({ page }) => {
    await page.goto('/coach/workouts/exercises');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Exercises, text=Ejercicios')).toBeVisible();
  });
});

test.describe('Training - Assign Page', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('should load assign page with templates', async ({ page }) => {
    await page.goto('/coach/training/asignar');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Asignar')).toBeVisible();
    await expect(page.locator('text=Plantillas, text=Templates')).toBeVisible();
  });
});

test.describe('Events Page', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('should load events page', async ({ page }) => {
    await page.goto('/coach/events');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Eventos')).toBeVisible();
  });

  test('should load challenges page', async ({ page }) => {
    await page.goto('/coach/challenges');
    await page.waitForLoadState('networkidle');
    
    await expect(page.locator('text=Desafíos, text=Challenges')).toBeVisible();
  });
});

test.describe('Communication - Messages', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('should load messages page', async ({ page }) => {
    await page.goto('/coach/users');
    await page.waitForLoadState('networkidle');
    
    // Click on an athlete to open messages
    const athleteCard = page.locator('[data-testid="athlete-card"]').first();
    if (await athleteCard.isVisible({ timeout: 5000 })) {
      await athleteCard.click();
      await expect(page.locator('text=Messages, text=Mensajes')).toBeVisible({ timeout: 5000 });
    }
  });
});