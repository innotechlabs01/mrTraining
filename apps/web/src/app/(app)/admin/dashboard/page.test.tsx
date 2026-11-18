import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import AdminDashboardPage from './page';

const mockGetToken = jest.fn();
const mockUseUser = jest.fn();
const mockUseAuth = jest.fn();

const mockRouter = { push: jest.fn(), replace: jest.fn() };

jest.mock('@clerk/nextjs', () => ({
  useUser: () => mockUseUser(),
  useAuth: () => mockUseAuth(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  usePathname: () => '/',
  useSearchParams: () => new URLSearchParams(),
}));

const g = globalThis as any;
g.fetch = jest.fn();
const mockFetch = g.fetch as jest.MockedFunction<typeof fetch>;
g.IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: ReturnType<typeof createRoot>;
let coachesData: Record<string, unknown>[];

function renderPage() {
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(<AdminDashboardPage />);
  });
}

async function flushLoaded() {
  await act(async () => {
    for (let i = 0; i < 12; i++) await Promise.resolve();
  });
}

function revenueStatValue(): string | null {
  const titleEl = Array.from(
    container.querySelectorAll('p'),
  ).find((p) => p.textContent === 'Ingresos mes (planes)');
  if (!titleEl) return null;
  const ps = titleEl.parentElement?.querySelectorAll('p');
  return ps?.[1]?.textContent ?? null;
}

beforeEach(() => {
  jest.clearAllMocks();
  coachesData = [];
  mockGetToken.mockResolvedValue('fake-token');
  mockUseAuth.mockReturnValue({ getToken: mockGetToken });
  mockUseUser.mockReturnValue({
    user: { id: 'clerk-user-1', publicMetadata: { role: 'super_admin' } },
  });
  mockFetch.mockImplementation((_url: RequestInfo | URL) => {
    const u = String(_url);
    if (u.includes('/admin/coaches')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => coachesData,
      } as Response);
    }
    if (u.includes('/admin/revenue')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ today: 0, this_month: 0, this_year: 0, total: 0, by_month: [] }),
      } as Response);
    }
    if (u.includes('/admin/dashboard')) {
      return Promise.resolve({
        ok: true,
        status: 200,
        json: async () => ({ coaches_count: 1, active_coaches_count: 1 }),
      } as Response);
    }
    return Promise.resolve({ ok: true, status: 200, json: async () => null } as Response);
  });
});

afterEach(() => {
  root.unmount();
  document.body.removeChild(container);
});

describe('AdminDashboardPage — nota de ingresos pendientes', () => {
  it('muestra "ingresos pendientes de confirmación" cuando revenue es 0 pero coaches tienen revenue_month > 0', async () => {
    coachesData = [
      { id: 'c1', coach_id: 'c1', name: 'A', email: 'a@test.com', revenue_month: 100000 },
    ];

    renderPage();
    await flushLoaded();

    expect(revenueStatValue()).toBe('ingresos pendientes de confirmación');
  });

  it('muestra $0 cuando revenue es 0 y no hay revenue_month en coaches', async () => {
    coachesData = [
      { id: 'c1', coach_id: 'c1', name: 'A', email: 'a@test.com', revenue_month: 0 },
    ];

    renderPage();
    await flushLoaded();

    expect(revenueStatValue()).toBe('$0');
  });
});
