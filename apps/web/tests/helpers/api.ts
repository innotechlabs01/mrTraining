import { test, expect, type APIRequestContext } from '@playwright/test';

const GO_API_URL = process.env.NEXT_PUBLIC_GO_API_URL || 'http://localhost:9090';
const WEB_API_URL = 'http://localhost:3000';
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || 'sk_test_oH7uHCXGIt1Fbl7KzSMp95qo24sFjM1Rbsum1b7jAp';
const CLERK_API_URL = 'https://api.clerk.com/v1';

export interface TestUser {
  email: string;
  password: string;
  role: 'coach' | 'athlete';
  clerkUserId: string;
}

export const testUsers: TestUser[] = [
  { email: 'e2e.coach.test@mrtraining.dev', password: 'e2e-password-2026', role: 'coach', clerkUserId: 'user_3KTNABTDQC8kDXc0i5kZpUDXHLI' },
  { email: 'e2e.athlete.test@mrtraining.dev', password: 'e2e-password-2026', role: 'athlete', clerkUserId: 'user_3KTNAbPRe6Sm7D86vv2XIhviyki' },
];

/**
 * Get a Clerk session JWT using the Backend API.
 * This bypasses the Device Trust / email code flow entirely by creating
 * a session directly via the Clerk Backend API.
 * 
 * Requires CLERK_SECRET_KEY to be set (uses dev instance key by default).
 */
export async function getClerkTokenViaBackend(user: TestUser): Promise<string> {
  // 1. Create a new session for the user
  const sessionRes = await fetch(`${CLERK_API_URL}/sessions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: user.clerkUserId }),
  });
  
  if (!sessionRes.ok) {
    const err = await sessionRes.text();
    throw new Error(`Failed to create Clerk session: ${sessionRes.status} - ${err}`);
  }
  
  const session = await sessionRes.json();
  const sessionId = session.id;
  
  // 2. Create a token for that session
  const tokenRes = await fetch(`${CLERK_API_URL}/sessions/${sessionId}/tokens`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  
  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to create Clerk session token: ${tokenRes.status} - ${err}`);
  }
  
  const tokenData = await tokenRes.json();
  return tokenData.jwt;
}

/**
 * Get Clerk token for API tests using the Backend API.
 * This is the primary method for E2E tests - it bypasses Device Trust
 * rate limits and provides a valid JWT for API authentication.
 */
export async function getClerkToken(_request: APIRequestContext, user?: TestUser): Promise<string> {
  const targetUser = user || testUsers[0];
  return getClerkTokenViaBackend(targetUser);
}

/**
 * Create an authenticated API request context using Clerk Backend API JWT.
 * Use this for API tests that need to call protected endpoints.
 */
export async function createAuthenticatedContext(
  request: APIRequestContext,
  user?: TestUser
): Promise<{ request: APIRequestContext; token: string }> {
  const token = await getClerkToken(request, user);
  return { request, token };
}

/**
 * Get Clerk token by signing in via the sign-in page (legacy).
 * DEPRECATED: Use getClerkToken instead - it uses Backend API and avoids Device Trust rate limits.
 */
export async function getClerkTokenViaBrowser(page: import('@playwright/test').Page, user: TestUser): Promise<string> {
  return getClerkTokenViaBackend(user);
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