import { test, expect } from '@playwright/test';
import { checkGoApiHealth, checkWebApiHealth, testUsers, getClerkTokenViaAPI, goApiRequest } from '../helpers/api';

test.describe('API Health & Connectivity', () => {
  test('Go API should be healthy', async ({ request }) => {
    const healthy = await checkGoApiHealth();
    expect(healthy).toBeTruthy();
  });

  test('Web API should be healthy', async ({ request }) => {
    const healthy = await checkWebApiHealth();
    expect(healthy).toBeTruthy();
  });
});

test.describe('Go API - User Endpoints (Authenticated)', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkTokenViaAPI(request);
  });

  test('GET /users/me should return current user with coach profile', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'GET', '/users/me');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.user).toBeDefined();
    expect(data.coach).toBeDefined();
    expect(data.coach.id).toBeTruthy();
    expect(data.coach.email).toBeTruthy();
  });

  test('GET /coaches/me/athletes should return paginated list', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'GET', '/coaches/me/athletes');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.data).toBeDefined();
    expect(Array.isArray(data.data)).toBeTruthy();
    expect(data.total).toBeDefined();
    expect(data.page).toBe(1);
    expect(data.limit).toBeDefined();
  });

  test('GET /coaches/sales should return sales data', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'GET', '/coaches/sales');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /products should return products list', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'GET', '/products');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /events should return events list', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'GET', '/events');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });

  test('GET /workout-templates should return templates', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'GET', '/workout-templates');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.templates).toBeDefined();
    expect(Array.isArray(data.templates)).toBeTruthy();
  });
});

test.describe('Go API - Coach Profile', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkTokenViaAPI(request);
  });

  test('GET /coaches/me should return coach profile via /users/me', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'GET', '/users/me');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.coach).toBeDefined();
    expect(data.coach.specializations).toBeDefined();
    expect(Array.isArray(data.coach.specializations)).toBeTruthy();
  });

  test('PUT /coaches/me should update coach profile', async ({ request }) => {
    const response = await goApiRequest(request, coachToken, 'PUT', '/coaches/me', {
      bio: 'Updated bio from Playwright test',
      experienceYears: 10,
    });
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Go API - Unauthenticated Requests', () => {
  test('should reject requests without token', async ({ request }) => {
    const response = await goApiRequest(request, 'invalid-token', 'GET', '/users/me');
    expect(response.status()).toBe(401);
  });
});