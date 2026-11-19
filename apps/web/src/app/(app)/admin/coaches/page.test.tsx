import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AdminCoachesPage from './page';

const mockGetToken = jest.fn();
const mockUseUser = jest.fn();
const mockUseAuth = jest.fn();

jest.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
  useAuth: () => mockUseAuth(),
}));

const CLERK_ID_PATTERN = /user_/;

global.fetch = jest.fn();
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

const buildMockCoach = (overrides: Record<string, unknown> = {}) => ({
  id: 'coach-internal-id-123',
  coach_id: 'coach-internal-id-123',
  name: 'Coach Test',
  email: 'coach@test.com',
  skip_subscription: false,
  ...overrides,
});

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;

function renderPage() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<AdminCoachesPage />);
  });
}

async function flushLoaded() {
  await act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  mockGetToken.mockResolvedValue('fake-token');
  mockUseAuth.mockReturnValue({ getToken: mockGetToken });
  mockUseUser.mockReturnValue({
    user: { id: 'clerk-user-1', publicMetadata: { role: 'super_admin' } },
  });
  mockFetch.mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => [],
  } as Response);
});

afterEach(() => {
  root.unmount();
  document.body.removeChild(container);
});

describe('AdminCoachesPage — toggleSkipSubscription', () => {
  it('usa coach.coach_id (ID interno) en la URL, nunca coach.id (Clerk ID)', async () => {
    const coach = buildMockCoach({
      id: 'user_clerk_id_abc',
      coach_id: 'coach_internal_xyz',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [coach],
    } as Response);

    renderPage();
    await flushLoaded();

    const input = container.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).disabled).toBe(false);

    (input as HTMLInputElement).click();
    await flushLoaded();

    const calledUrl = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/skip-subscription'),
    )?.[0] as string;
    expect(calledUrl).toContain('/api/v1/admin/coaches/coach_internal_xyz/skip-subscription');
    expect(calledUrl).not.toMatch(CLERK_ID_PATTERN);
    expect(calledUrl).not.toContain('user_clerk_id_abc');
  });

  it('no envía la solicitud y deshabilita el toggle cuando coach.coach_id está vacío', async () => {
    const coach = buildMockCoach({
      id: 'user_clerk_id_abc',
      coach_id: '',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [coach],
    } as Response);

    renderPage();
    await flushLoaded();

    const input = container.querySelector('input[type="checkbox"]');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).disabled).toBe(true);

    expect(mockFetch).not.toHaveBeenCalledWith(
      expect.stringContaining('/skip-subscription'),
      expect.anything(),
    );
  });

  it('no construye una URL que contenga patrón de Clerk ID (user_...)', async () => {
    const coach = buildMockCoach({
      id: 'user_clerk_id_abc',
      coach_id: 'coach_internal_xyz',
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => [coach],
    } as Response);

    renderPage();
    await flushLoaded();

    const input = container.querySelector('input[type="checkbox"]');
    (input as HTMLInputElement).click();
    await flushLoaded();

    const calledUrl = mockFetch.mock.calls.find(([url]) =>
      String(url).includes('/skip-subscription'),
    )?.[0] as string;
    expect(calledUrl).not.toBeUndefined();
    expect(CLERK_ID_PATTERN.test(calledUrl)).toBe(false);
  });
});
