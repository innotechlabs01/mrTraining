import { test, expect, type APIRequestContext } from '@playwright/test';

const GO_API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:8080';
const WEB_API_URL = 'http://localhost:3000';

export interface TestUser {
  email: string;
  password: string;
  role: 'coach' | 'athlete';
}

export const testUsers: TestUser[] = [
  { email: 'coach@test.com', password: 'test123', role: 'coach' },
  { email: 'athlete@test.com', password: 'test123', role: 'athlete' },
];

/**
 * Get Clerk token by signing in via the sign-in page.
 * This uses Playwright's browser context to perform actual sign-in.
 */
export async function getClerkTokenViaBrowser(page: import('@playwright/test').Page, user: TestUser): Promise<string> {
  await page.goto(`${WEB_API_URL}/sign-in`);
  await page.waitForLoadState('networkidle');
  
  // Fill sign-in form
  await page.fill('input[name="identifier"], input[name="email"], input[type="email"]', user.email);
  await page.fill('input[name="password"], input[type="password"]', user.password);
  
  // Submit form
  await page.click('button[type="submit"]');
  
  // Wait for redirect to coach dashboard
  await page.waitForURL(/\/coach/, { timeout: 15000 });
  
  // Get the Clerk token from the browser
  const token = await page.evaluate(async () => {
    const clerk = (window as unknown as { Clerk?: { session?: { getToken: () => Promise<string | null> } } }).Clerk;
    if (clerk?.session?.getToken) {
      return await clerk.session.getToken();
    }
    return localStorage.getItem('mr-training-auth-token');
  });
  
  if (!token) {
    throw new Error('Failed to get Clerk token');
  }
  
  return token;
}

/**
 * Get Clerk token for API tests by using the test endpoint.
 * This requires the user to be already signed in via browser.
 */
export async function getClerkTokenViaAPI(request: APIRequestContext): Promise<string> {
  const response = await request.get(`${WEB_API_URL}/api/test/auth-token`);
  if (!response.ok()) {
    throw new Error(`Failed to get auth token: ${response.status()}`);
  }
  const data = await response.json();
  return data.token;
}

export async function createAuthenticatedContext(
  request: APIRequestContext,
  user: TestUser
): Promise<{ request: APIRequestContext; token: string }> {
  const token = await getClerkTokenViaAPI(request);
  const authenticatedRequest = request;
  return { request: authenticatedRequest, token };
}

export async function goApiRequest(
  request: APIRequestContext,
  token: string,
  method: string,
  path: string,
  data?: unknown
) {
  return request.fetch(`${GO_API_URL}/api/v1${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data,
  });
}

export async function webApiRequest(
  request: APIRequestContext,
  token: string,
  method: string,
  path: string,
  data?: unknown
) {
  return request.fetch(`${WEB_API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    data,
  });
}

export async function checkGoApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${GO_API_URL}/health`);
    return response.ok;
  } catch {
    return false;
  }
}

export async function checkWebApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${WEB_API_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}