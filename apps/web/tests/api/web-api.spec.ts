import { test, expect } from '@playwright/test';
import { testUsers, getClerkToken, webApiRequest } from '../helpers/api';

test.describe('Web API - Coach Profile Proxy', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('GET /api/coach/profile should proxy to Go API', async ({ request }) => {
    const response = await webApiRequest(request, coachToken, 'GET', '/api/coach/profile');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.coach).toBeDefined();
    expect(data.coach.id).toBeTruthy();
  });

  test('PUT /api/coach/profile should proxy to Go API', async ({ request }) => {
    const response = await webApiRequest(request, coachToken, 'PUT', '/api/coach/profile', {
      bio: 'Updated via web proxy',
      instagramHandle: '@testcoach',
    });
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Web API - Coaching Endpoints', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  const coachingEndpoints = [
    { method: 'GET', path: '/api/coaching/time-blocks', expectArray: true },
    { method: 'GET', path: '/api/coaching/messages', expectArray: true },
    { method: 'GET', path: '/api/coaching/athletes', expectArray: true },
    { method: 'GET', path: '/api/coaching/events', expectArray: true },
    { method: 'GET', path: '/api/coaching/dashboard', expectObject: true },
    { method: 'GET', path: '/api/coaching/sessions', expectArray: true },
    { method: 'GET', path: '/api/coaching/plans', expectArray: true },
    { method: 'GET', path: '/api/coaching/ai-suggestions', expectArray: true },
    { method: 'GET', path: '/api/coaching/live-sessions', expectArray: true },
    { method: 'GET', path: '/api/coaching/payment-methods', expectArray: true },
    { method: 'GET', path: '/api/coaching/public-page', expectObject: true },
    { method: 'GET', path: '/api/coaching/memberships', expectArray: true },
    { method: 'GET', path: '/api/coaching/assigned-workouts', expectArray: true },
    { method: 'GET', path: '/api/coaching/tickets', expectArray: true },
    { method: 'GET', path: '/api/coaching/daily-summary', expectObject: true },
  ];

  for (const endpoint of coachingEndpoints) {
    test(`${endpoint.method} ${endpoint.path} should return 200`, async ({ request }) => {
      const response = await webApiRequest(request, coachToken, endpoint.method, endpoint.path);
      expect(response.ok()).toBeTruthy();
      
      const data = await response.json();
      if (endpoint.expectArray) {
        expect(Array.isArray(data)).toBeTruthy();
      }
      if (endpoint.expectObject) {
        expect(typeof data).toBe('object');
        expect(data).not.toBeNull();
      }
    });
  }

  test('POST /api/coaching/time-blocks should accept data', async ({ request }) => {
    const response = await webApiRequest(request, coachToken, 'POST', '/api/coaching/time-blocks', {
      title: 'Test Block',
      blockType: 'workout',
      startTime: '08:00',
      endTime: '09:00',
      recurrence: 'daily',
      color: '#FF6B00',
    });
    expect(response.ok()).toBeTruthy();
  });

  test('POST /api/coaching/messages should create thread', async ({ request }) => {
    const response = await webApiRequest(request, coachToken, 'PUT', '/api/coaching/messages', {
      athleteId: 'test-athlete-id',
      subject: 'Test Message',
    });
    expect(response.ok()).toBeTruthy();
  });
});

test.describe('Web API - Proxy to Go API', () => {
  let coachToken: string;

  test.beforeAll(async ({ request }) => {
    coachToken = await getClerkToken(request, testUsers[0]);
  });

  test('GET /api/v1/users/me via proxy should work', async ({ request }) => {
    const response = await webApiRequest(request, coachToken, 'GET', '/api/v1/users/me');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.coach).toBeDefined();
  });

  test('GET /api/v1/coaches/me/athletes via proxy should work', async ({ request }) => {
    const response = await webApiRequest(request, coachToken, 'GET', '/api/v1/coaches/me/athletes');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data.data).toBeDefined();
  });

  test('GET /api/v1/events via proxy should work', async ({ request }) => {
    const response = await webApiRequest(request, coachToken, 'GET', '/api/v1/events');
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(Array.isArray(data)).toBeTruthy();
  });
});