import { test as setup, expect } from '@playwright/test';
import { testUsers, getClerkTokenViaBackend } from '../helpers/api';
import fs from 'fs';

const COACH_AUTH_FILE = '.auth/coach.json';
const ATHLETE_AUTH_FILE = '.auth/athlete.json';

setup('authenticate as coach', async ({ page }) => {
  setup.setTimeout(60_000);
  setup.skip(fs.existsSync(COACH_AUTH_FILE), `${COACH_AUTH_FILE} already exists`);
  
  // Get JWT via Clerk Backend API (bypasses Device Trust rate limits)
  const token = await getClerkTokenViaBackend(testUsers[0]);
  
  // Navigate to the app first
  await page.goto('http://localhost:3000');
  
  // Set the Clerk session cookie manually using the session ID from the JWT
  // The JWT payload contains the session ID (sid claim)
  const payload = JSON.parse(atob(token.split('.')[1]));
  const sessionId = payload.sid;
  
  if (sessionId) {
    await page.context().addCookies([{
      name: '__session',
      value: sessionId,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);
  }
  
  // Also set the token in localStorage for the test endpoint
  await page.evaluate((t) => localStorage.setItem('mr-training-auth-token', t), token);
  
  // Navigate to coach dashboard to verify auth works
  await page.goto('http://localhost:3000/coach');
  await expect(page).toHaveURL(/\/coach/);
  
  // Save storage state for subsequent tests
  await page.context().storageState({ path: COACH_AUTH_FILE });
  console.log('Coach authenticated via Backend API, token:', token.substring(0, 20) + '...');
});

setup('authenticate as athlete', async ({ page }) => {
  setup.setTimeout(60_000);
  setup.skip(fs.existsSync(ATHLETE_AUTH_FILE), `${ATHLETE_AUTH_FILE} already exists`);
  
  // Get JWT via Clerk Backend API
  const token = await getClerkTokenViaBackend(testUsers[1]);
  
  await page.goto('http://localhost:3000');
  
  const payload = JSON.parse(atob(token.split('.')[1]));
  const sessionId = payload.sid;
  
  if (sessionId) {
    await page.context().addCookies([{
      name: '__session',
      value: sessionId,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);
  }
  
  await page.evaluate((t) => localStorage.setItem('mr-training-auth-token', t), token);
  
  await page.goto('http://localhost:3000/coach');
  await expect(page).toHaveURL(/\/coach/);
  
  await page.context().storageState({ path: ATHLETE_AUTH_FILE });
  console.log('Athlete authenticated via Backend API');
});