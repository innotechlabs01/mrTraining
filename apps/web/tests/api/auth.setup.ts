import { test as setup, expect } from '@playwright/test';
import { testUsers, getClerkTokenViaBrowser } from '../helpers/api';

const COACH_AUTH_FILE = '.auth/coach.json';
const ATHLETE_AUTH_FILE = '.auth/athlete.json';

setup('authenticate as coach', async ({ page }) => {
  const token = await getClerkTokenViaBrowser(page, testUsers[0]);
  await page.context().storageState({ path: COACH_AUTH_FILE });
  console.log('Coach authenticated, token:', token.substring(0, 20) + '...');
});

setup('authenticate as athlete', async ({ page }) => {
  const token = await getClerkTokenViaBrowser(page, testUsers[1]);
  await page.context().storageState({ path: ATHLETE_AUTH_FILE });
  console.log('Athlete authenticated');
});