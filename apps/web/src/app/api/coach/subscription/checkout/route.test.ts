/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server';
import { GET } from './route';

jest.mock('@clerk/nextjs/server', () => ({
  auth: jest.fn(),
}));

import { auth } from '@clerk/nextjs/server';

const mockAuth = auth as jest.MockedFunction<typeof auth>;

describe('GET /api/coach/subscription/checkout', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it('redirects to checkout_url when Go API returns snake_case checkout_url', async () => {
    mockAuth.mockResolvedValue({
      userId: 'user_123',
      getToken: jest.fn().mockResolvedValue('clerk-jwt-token'),
    } as unknown as Awaited<ReturnType<typeof auth>>);

    const wompiUrl = 'https://checkout.wompi.co/l/test_abc123';
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ checkout_url: wompiUrl }),
    }) as unknown as typeof fetch;

    const req = new NextRequest('http://localhost:3000/api/coach/subscription/checkout?planId=plan_pro');
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(wompiUrl);
    expect(res.headers.get('cache-control')).toBe('private, no-store');
  });
});
